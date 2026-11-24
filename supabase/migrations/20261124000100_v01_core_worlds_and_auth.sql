-- V0.1 Migration 1: Core accounts, couple worlds, strict 2-member cap, one-time hashed invites, and RLS

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL CHECK (char_length(trim(nickname)) BETWEEN 1 AND 32),
  avatar_config jsonb NOT NULL DEFAULT '{"skinTone":"warm","hairStyle":"short","hairColor":"espresso","outfitStyle":"sweater","outfitColor":"sage","accessory":"none"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.worlds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 48),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  layout_version integer NOT NULL DEFAULT 1 CHECK (layout_version >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.world_members (
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'partner')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.world_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_world_invites_world_active
  ON public.world_invites (world_id, expires_at)
  WHERE redeemed_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_world_member(p_world_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.world_members wm
    WHERE wm.world_id = p_world_id
      AND wm.user_id = auth.uid()
  );
$$;

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_self_or_partner ON public.profiles;
CREATE POLICY profiles_select_self_or_partner
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.world_members me
      JOIN public.world_members partner ON partner.world_id = me.world_id
      WHERE me.user_id = auth.uid()
        AND partner.user_id = public.profiles.user_id
    )
  );

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS worlds_select_members ON public.worlds;
CREATE POLICY worlds_select_members
  ON public.worlds
  FOR SELECT
  TO authenticated
  USING (public.is_world_member(id));

DROP POLICY IF EXISTS world_members_select_members ON public.world_members;
CREATE POLICY world_members_select_members
  ON public.world_members
  FOR SELECT
  TO authenticated
  USING (public.is_world_member(world_id));

-- world_invites intentionally has zero client policies: token hashes are never readable via PostgREST.

-- RPC: update profile safely
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_nickname text,
  p_avatar_config jsonb
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_nick text := trim(coalesce(p_nickname, ''));
  v_profile public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF char_length(v_clean_nick) < 1 OR char_length(v_clean_nick) > 32 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid nickname length';
  END IF;

  INSERT INTO public.profiles (user_id, nickname, avatar_config)
  VALUES (v_uid, v_clean_nick, coalesce(p_avatar_config, '{}'::jsonb))
  ON CONFLICT (user_id) DO UPDATE
    SET nickname = EXCLUDED.nickname,
        avatar_config = EXCLUDED.avatar_config,
        updated_at = now()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

-- RPC: create couple world (extended in migration 2 to seed default starter furniture)
CREATE OR REPLACE FUNCTION public.create_couple_world(
  p_name text,
  p_nickname text,
  p_avatar_config jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_name text := trim(coalesce(p_name, ''));
  v_world_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF char_length(v_clean_name) < 1 OR char_length(v_clean_name) > 48 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid world name';
  END IF;

  IF EXISTS (SELECT 1 FROM public.world_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'ALREADY_IN_WORLD';
  END IF;

  PERFORM public.update_my_profile(p_nickname, p_avatar_config);

  INSERT INTO public.worlds (name, created_by)
  VALUES (v_clean_name, v_uid)
  RETURNING id INTO v_world_id;

  INSERT INTO public.world_members (world_id, user_id, role)
  VALUES (v_world_id, v_uid, 'owner');

  RETURN v_world_id;
END;
$$;

-- RPC: create one-time invite (stores SHA-256 hash only)
CREATE OR REPLACE FUNCTION public.create_world_invite(
  p_world_id uuid,
  p_ttl_hours integer DEFAULT 48
)
RETURNS TABLE (invite_code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_member_count integer;
  v_raw_code text;
  v_hash text;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM 1 FROM public.worlds w WHERE w.id = p_world_id FOR UPDATE;

  SELECT count(*)::integer INTO v_member_count
  FROM public.world_members wm
  WHERE wm.world_id = p_world_id;

  IF v_member_count >= 2 THEN
    RAISE EXCEPTION 'WORLD_FULL';
  END IF;

  -- Revoke previous active invites for this world
  DELETE FROM public.world_invites wi
  WHERE wi.world_id = p_world_id
    AND wi.redeemed_at IS NULL;

  v_raw_code := 'OLW-' || upper(encode(gen_random_bytes(5), 'hex'));
  v_hash := encode(digest(v_raw_code, 'sha256'), 'hex');
  v_expires := now() + make_interval(hours => greatest(1, least(coalesce(p_ttl_hours, 48), 168)));

  INSERT INTO public.world_invites (world_id, created_by, token_hash, expires_at)
  VALUES (p_world_id, v_uid, v_hash, v_expires);

  invite_code := v_raw_code;
  expires_at := v_expires;
  RETURN NEXT;
END;
$$;

-- RPC: query active invite metadata without exposing token hash
CREATE OR REPLACE FUNCTION public.get_active_invite_status(p_world_id uuid)
RETURNS TABLE (has_active_invite boolean, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exp timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT wi.expires_at INTO v_exp
  FROM public.world_invites wi
  WHERE wi.world_id = p_world_id
    AND wi.redeemed_at IS NULL
    AND wi.expires_at > now()
  ORDER BY wi.created_at DESC
  LIMIT 1;

  has_active_invite := v_exp IS NOT NULL;
  expires_at := v_exp;
  RETURN NEXT;
END;
$$;

-- RPC: atomic one-time invite redemption enforcing strict max 2 members
CREATE OR REPLACE FUNCTION public.redeem_world_invite(
  p_invite_code text,
  p_nickname text,
  p_avatar_config jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_code text := upper(trim(coalesce(p_invite_code, '')));
  v_hash text;
  v_invite public.world_invites;
  v_member_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF char_length(v_clean_code) < 6 THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  IF EXISTS (SELECT 1 FROM public.world_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'ALREADY_IN_WORLD';
  END IF;

  v_hash := encode(digest(v_clean_code, 'sha256'), 'hex');

  SELECT * INTO v_invite
  FROM public.world_invites wi
  WHERE wi.token_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  IF v_invite.redeemed_at IS NOT NULL THEN
    RAISE EXCEPTION 'INVITE_USED';
  END IF;

  IF v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'INVITE_EXPIRED';
  END IF;

  PERFORM 1 FROM public.worlds w WHERE w.id = v_invite.world_id FOR UPDATE;

  SELECT count(*)::integer INTO v_member_count
  FROM public.world_members wm
  WHERE wm.world_id = v_invite.world_id;

  IF v_member_count >= 2 THEN
    RAISE EXCEPTION 'WORLD_FULL';
  END IF;

  PERFORM public.update_my_profile(p_nickname, p_avatar_config);

  INSERT INTO public.world_members (world_id, user_id, role)
  VALUES (v_invite.world_id, v_uid, 'partner');

  UPDATE public.world_invites
  SET redeemed_by = v_uid,
      redeemed_at = now()
  WHERE id = v_invite.id;

  RETURN v_invite.world_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_world_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_couple_world(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_world_invite(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_invite_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_world_invite(text, text, jsonb) TO authenticated;
