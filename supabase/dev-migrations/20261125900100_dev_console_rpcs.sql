-- DEV-ONLY MIGRATION (NEVER apply to Supabase Production project!)
-- OLW-015-08 Developer Console K6 RPCs guarded strictly by dev_admins + worlds.is_test = true.

ALTER TABLE public.worlds
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.dev_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dev_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dev_admins FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._assert_dev_admin_test_world(p_world_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_test boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dev_admins d WHERE d.user_id = v_uid) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT w.is_test INTO v_is_test
  FROM public.worlds w
  WHERE w.id = p_world_id;
  IF v_is_test IS NOT TRUE THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._assert_dev_admin_test_world(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dev_spawn_item(
  p_world_id uuid,
  p_scope text,
  p_item_sku text,
  p_qty integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner_scope text;
BEGIN
  PERFORM public._assert_dev_admin_test_world(p_world_id);
  IF p_scope NOT IN ('shared', 'personal') OR p_qty < -100 OR p_qty > 100 OR p_qty = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  v_owner_scope := CASE WHEN p_scope = 'shared' THEN 'shared' ELSE ('user:' || v_uid::text) END;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  PERFORM public._inventory_adjust_item(p_world_id, v_owner_scope, p_item_sku, p_qty);

  RETURN public.inventory_get(p_world_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_set_pet_vitals(
  p_world_id uuid,
  p_hunger integer,
  p_energy integer,
  p_fun integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clamp_hunger integer := GREATEST(0, LEAST(100, p_hunger));
  v_clamp_energy integer := GREATEST(0, LEAST(100, p_energy));
  v_clamp_fun integer := GREATEST(0, LEAST(100, p_fun));
  v_emotion text;
  v_pet public.pets%ROWTYPE;
BEGIN
  PERFORM public._assert_dev_admin_test_world(p_world_id);
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_pet FROM public.pets WHERE world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  v_emotion := CASE
    WHEN v_clamp_hunger <= 42 THEN 'hungry'
    WHEN v_clamp_energy <= 45 THEN 'sleepy'
    WHEN v_clamp_fun >= 78 AND v_clamp_hunger >= 65 THEN 'happy'
    ELSE 'cozy'
  END;

  UPDATE public.pets
  SET vitals_jsonb = jsonb_build_object('hunger', v_clamp_hunger, 'energy', v_clamp_energy, 'fun', v_clamp_fun),
      emotion = v_emotion,
      sim_state_at_ms = floor(extract(epoch from now()) * 1000)::bigint,
      version = version + 1,
      updated_at = now()
  WHERE id = v_pet.id
  RETURNING * INTO v_pet;

  RETURN to_jsonb(v_pet);
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_advance_study_session(
  p_world_id uuid,
  p_session_id uuid,
  p_delta_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.study_sessions%ROWTYPE;
  v_delta_ms bigint := (p_delta_seconds::bigint * 1000);
BEGIN
  PERFORM public._assert_dev_admin_test_world(p_world_id);
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_row
  FROM public.study_sessions
  WHERE id = p_session_id AND world_id = p_world_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  UPDATE public.study_sessions
  SET started_at_ms = started_at_ms - v_delta_ms,
      ends_at_ms = ends_at_ms - v_delta_ms,
      remaining_ms = GREATEST(0, remaining_ms - v_delta_ms),
      version = version + 1,
      updated_at = now()
  WHERE id = p_session_id;

  RETURN public.study_get_snapshot(p_world_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_reset_test_world(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_dev_admin_test_world(p_world_id);
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  DELETE FROM public.study_sessions WHERE world_id = p_world_id;
  DELETE FROM public.pet_events WHERE world_id = p_world_id;
  DELETE FROM public.pets WHERE world_id = p_world_id;
  DELETE FROM public.letters_and_gifts WHERE world_id = p_world_id;
  DELETE FROM public.inventory_items WHERE world_id = p_world_id;
  DELETE FROM public.world_daily_kibble_claims WHERE world_id = p_world_id;
  DELETE FROM public.v015_rpc_idempotency WHERE world_id = p_world_id;

  RETURN jsonb_build_object('reset', true, 'worldId', p_world_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_spawn_item(uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_set_pet_vitals(uuid, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_advance_study_session(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_reset_test_world(uuid) TO authenticated;
