-- Our Little World — Billiards Minigame Stats & Deterministic Replay History (v2 Hardened)
-- Enforces unique(world_id, match_id) idempotency + verifies caller, winner & loser belong to world_id.

CREATE TABLE IF NOT EXISTS public.billiards_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL CHECK (char_length(trim(match_id)) BETWEEN 1 AND 128),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  rule text NOT NULL CHECK (rule IN ('8ball', '9ball')),
  rack_seed bigint NOT NULL,
  winner_user_id uuid NOT NULL REFERENCES auth.users(id),
  loser_user_id uuid REFERENCES auth.users(id),
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 300),
  shots_json jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(shots_json) = 'array'),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billiards_matches_world_match_unique UNIQUE (world_id, match_id),
  CONSTRAINT billiards_distinct_players CHECK (loser_user_id IS NULL OR loser_user_id <> winner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_billiards_matches_world_created
  ON public.billiards_matches (world_id, created_at DESC);

ALTER TABLE public.billiards_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billiards_matches_select_members ON public.billiards_matches;
CREATE POLICY billiards_matches_select_members
  ON public.billiards_matches
  FOR SELECT
  TO authenticated
  USING (public.is_world_member(world_id));

REVOKE INSERT, UPDATE, DELETE ON public.billiards_matches FROM PUBLIC, anon, authenticated;

-- Atomic, idempotent RPC: prevents duplicate match inserts even if both clients report completion
CREATE OR REPLACE FUNCTION public.record_billiards_match(
  p_match_id text,
  p_world_id uuid,
  p_rule text,
  p_rack_seed bigint,
  p_winner_user_id uuid,
  p_loser_user_id uuid,
  p_reason text,
  p_shots_json jsonb,
  p_duration_seconds integer
)
RETURNS TABLE (
  user_id uuid,
  wins bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_match_id text := trim(coalesce(p_match_id, ''));
  v_shots jsonb := coalesce(p_shots_json, '[]'::jsonb);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF p_world_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Missing world_id';
  END IF;

  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF char_length(v_clean_match_id) < 1 OR char_length(v_clean_match_id) > 128 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid match_id';
  END IF;

  IF p_rule NOT IN ('8ball', '9ball') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid rule';
  END IF;

  IF p_winner_user_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Missing winner_user_id';
  END IF;

  IF p_loser_user_id IS NOT NULL AND p_loser_user_id = p_winner_user_id THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Winner and loser must be distinct';
  END IF;

  IF jsonb_typeof(v_shots) <> 'array' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: shots_json must be an array';
  END IF;

  PERFORM 1 FROM public.worlds w WHERE w.id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.world_members wm
    WHERE wm.world_id = p_world_id AND wm.user_id = p_winner_user_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_loser_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.world_members wm
    WHERE wm.world_id = p_world_id AND wm.user_id = p_loser_user_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.billiards_matches (
    match_id, world_id, rule, rack_seed, winner_user_id, loser_user_id, reason, shots_json, duration_seconds
  ) VALUES (
    v_clean_match_id,
    p_world_id,
    p_rule,
    p_rack_seed,
    p_winner_user_id,
    p_loser_user_id,
    left(coalesce(p_reason, ''), 300),
    v_shots,
    greatest(0, coalesce(p_duration_seconds, 0))
  )
  ON CONFLICT (world_id, match_id) DO NOTHING;

  RETURN QUERY
    SELECT m.winner_user_id AS user_id, count(*)::bigint AS wins
    FROM public.billiards_matches m
    WHERE m.world_id = p_world_id
    GROUP BY m.winner_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_billiards_stats(p_world_id uuid)
RETURNS TABLE (
  user_id uuid,
  wins bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF p_world_id IS NULL OR NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
    SELECT m.winner_user_id AS user_id, count(*)::bigint AS wins
    FROM public.billiards_matches m
    WHERE m.world_id = p_world_id
    GROUP BY m.winner_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.record_billiards_match(text, uuid, text, bigint, uuid, uuid, text, jsonb, integer),
  public.get_billiards_stats(uuid)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.record_billiards_match(text, uuid, text, bigint, uuid, uuid, text, jsonb, integer),
  public.get_billiards_stats(uuid)
TO authenticated;
