-- V0.1.5 Migration 2 (OLW-015-03): Living Pet MVP (`cat-orange`) & Offline Non-Lethal Catch-up
-- Follows PET_SIMULATION_SPEC.md integer math, 48h cap, FLOOR=30, and atomic world -> pet -> inventory locking.

CREATE TABLE IF NOT EXISTS public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL UNIQUE REFERENCES public.worlds(id) ON DELETE CASCADE,
  species text NOT NULL DEFAULT 'cat-orange' CHECK (species IN ('cat-orange')),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 24),
  vitals_jsonb jsonb NOT NULL DEFAULT '{"hunger":100,"energy":100,"fun":100}'::jsonb,
  emotion text NOT NULL DEFAULT 'happy' CHECK (emotion IN ('happy', 'cozy', 'sleepy', 'hungry')),
  map_id text NOT NULL DEFAULT 'home' CHECK (map_id IN ('home', 'garden')),
  anchor_tile_x integer NOT NULL DEFAULT 13,
  anchor_tile_y integer NOT NULL DEFAULT 9,
  last_fed_at_ms bigint,
  last_watered_at_ms bigint,
  last_petted_at_ms bigint,
  sim_state_at_ms bigint NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pet_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL CHECK (event_type IN ('adopt', 'rename', 'pet', 'feed', 'water')),
  delta_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (world_id, idempotency_key)
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pets_select_members ON public.pets;
CREATE POLICY pets_select_members
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (public.is_world_member(world_id));

DROP POLICY IF EXISTS pet_events_select_members ON public.pet_events;
CREATE POLICY pet_events_select_members
  ON public.pet_events
  FOR SELECT
  TO authenticated
  USING (public.is_world_member(world_id));

CREATE OR REPLACE FUNCTION public._pet_catchup_vitals(
  p_vitals jsonb,
  p_sim_state_at_ms bigint,
  p_now_ms bigint
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_elapsed bigint := LEAST(172800000::bigint, GREATEST(0::bigint, p_now_ms - p_sim_state_at_ms));
  v_hunger integer := COALESCE((p_vitals->>'hunger')::integer, 100);
  v_energy integer := COALESCE((p_vitals->>'energy')::integer, 100);
  v_fun integer := COALESCE((p_vitals->>'fun')::integer, 100);
BEGIN
  v_hunger := GREATEST(30, LEAST(100, v_hunger - ((v_elapsed * 2) / 3600000)::integer));
  v_energy := GREATEST(30, LEAST(100, v_energy - (v_elapsed / 3600000)::integer));
  IF v_elapsed >= 28800000::bigint THEN
    v_energy := GREATEST(v_energy, 50);
  END IF;
  v_fun := GREATEST(30, LEAST(100, v_fun - (v_elapsed / 3600000)::integer));
  RETURN jsonb_build_object('hunger', v_hunger, 'energy', v_energy, 'fun', v_fun);
END;
$$;

CREATE OR REPLACE FUNCTION public._pet_derive_mood(p_vitals jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_hunger integer := COALESCE((p_vitals->>'hunger')::integer, 100);
  v_energy integer := COALESCE((p_vitals->>'energy')::integer, 100);
  v_fun integer := COALESCE((p_vitals->>'fun')::integer, 100);
BEGIN
  IF v_hunger <= 42 THEN RETURN 'hungry'; END IF;
  IF v_energy <= 45 THEN RETURN 'sleepy'; END IF;
  IF v_fun >= 78 AND v_hunger >= 65 THEN RETURN 'happy'; END IF;
  RETURN 'cozy';
END;
$$;

CREATE OR REPLACE FUNCTION public._pet_row_to_json(p_pet public.pets, p_now_ms bigint)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_vitals jsonb := public._pet_catchup_vitals(p_pet.vitals_jsonb, p_pet.sim_state_at_ms, p_now_ms);
  v_mood text := public._pet_derive_mood(v_vitals);
BEGIN
  RETURN jsonb_build_object(
    'id', p_pet.id,
    'worldId', p_pet.world_id,
    'species', p_pet.species,
    'name', p_pet.name,
    'vitals', v_vitals,
    'emotion', v_mood,
    'mapId', p_pet.map_id,
    'anchorTileX', p_pet.anchor_tile_x,
    'anchorTileY', p_pet.anchor_tile_y,
    'lastFedAtMs', p_pet.last_fed_at_ms,
    'lastWateredAtMs', p_pet.last_watered_at_ms,
    'lastPettedAtMs', p_pet.last_petted_at_ms,
    'simStateAtMs', p_pet.sim_state_at_ms,
    'version', p_pet.version,
    'updatedAt', p_pet.updated_at,
    'serverNowMs', p_now_ms
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pet_get_snapshot(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pet public.pets%ROWTYPE;
  v_now_ms bigint := floor(extract(epoch from now()) * 1000)::bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT * INTO v_pet FROM public.pets WHERE world_id = p_world_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN public._pet_row_to_json(v_pet, v_now_ms);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pet_get_snapshot(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.pet_adopt_or_rename(
  p_world_id uuid,
  p_name text,
  p_expected_version integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean text := trim(COALESCE(p_name, ''));
  v_now_ms bigint := floor(extract(epoch from now()) * 1000)::bigint;
  v_pet public.pets%ROWTYPE;
  v_idem public.v015_rpc_idempotency%ROWTYPE;
  v_req_hash text := 'pet_adopt_or_rename:' || v_clean || ':' || COALESCE(p_expected_version::text, 'none');
  v_res jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF char_length(v_clean) < 1 OR char_length(v_clean) > 24 OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_idem
  FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_idem.actor_id <> v_uid OR v_idem.action <> 'pet_adopt_or_rename' OR v_idem.request_hash <> v_req_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_idem.response_jsonb;
  END IF;

  SELECT * INTO v_pet FROM public.pets WHERE world_id = p_world_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.pets (world_id, species, name, vitals_jsonb, emotion, map_id, anchor_tile_x, anchor_tile_y, sim_state_at_ms, version)
    VALUES (p_world_id, 'cat-orange', v_clean, '{"hunger":100,"energy":100,"fun":100}'::jsonb, 'happy', 'home', 13, 9, v_now_ms, 1)
    RETURNING * INTO v_pet;

    INSERT INTO public.pet_events (world_id, pet_id, actor_id, event_type, delta_jsonb, idempotency_key)
    VALUES (p_world_id, v_pet.id, v_uid, 'adopt', jsonb_build_object('name', v_clean), p_idempotency_key);
  ELSE
    IF p_expected_version IS NULL OR v_pet.version <> p_expected_version THEN
      RAISE EXCEPTION 'VERSION_CONFLICT';
    END IF;

    UPDATE public.pets
    SET name = v_clean,
        version = version + 1,
        updated_at = now()
    WHERE id = v_pet.id
    RETURNING * INTO v_pet;

    INSERT INTO public.pet_events (world_id, pet_id, actor_id, event_type, delta_jsonb, idempotency_key)
    VALUES (p_world_id, v_pet.id, v_uid, 'rename', jsonb_build_object('name', v_clean), p_idempotency_key);
  END IF;

  v_res := public._pet_row_to_json(v_pet, v_now_ms);
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_adopt_or_rename', p_idempotency_key, v_req_hash, v_res);
  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pet_adopt_or_rename(uuid, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pet_interact(
  p_world_id uuid,
  p_pet_id uuid,
  p_action text,
  p_expected_version integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now_ms bigint := floor(extract(epoch from now()) * 1000)::bigint;
  v_pet public.pets%ROWTYPE;
  v_idem public.v015_rpc_idempotency%ROWTYPE;
  v_req_hash text;
  v_caught jsonb;
  v_hunger integer;
  v_energy integer;
  v_fun integer;
  v_kibble_rem integer := 0;
  v_res jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_action NOT IN ('pet', 'feed', 'water') OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  v_req_hash := 'pet_interact:' || p_pet_id::text || ':' || p_action || ':' || p_expected_version::text;

  -- Lock order: world -> replay check -> pet row -> inventory
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_idem
  FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_idem.actor_id <> v_uid OR v_idem.action <> 'pet_interact' OR v_idem.request_hash <> v_req_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_idem.response_jsonb;
  END IF;

  SELECT * INTO v_pet FROM public.pets WHERE world_id = p_world_id AND id = p_pet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_pet.version <> p_expected_version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;

  IF p_action = 'feed' AND v_pet.last_fed_at_ms IS NOT NULL AND v_now_ms < v_pet.last_fed_at_ms + 60000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;
  IF p_action = 'pet' AND v_pet.last_petted_at_ms IS NOT NULL AND v_now_ms < v_pet.last_petted_at_ms + 15000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;
  IF p_action = 'water' AND v_pet.last_watered_at_ms IS NOT NULL AND v_now_ms < v_pet.last_watered_at_ms + 20000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;

  v_caught := public._pet_catchup_vitals(v_pet.vitals_jsonb, v_pet.sim_state_at_ms, v_now_ms);
  v_hunger := (v_caught->>'hunger')::integer;
  v_energy := (v_caught->>'energy')::integer;
  v_fun := (v_caught->>'fun')::integer;

  IF p_action = 'feed' THEN
    v_kibble_rem := public._inventory_adjust_item(p_world_id, 'shared', 'pet_kibble_basic', -1);
    v_hunger := LEAST(100, v_hunger + 30);
    v_energy := LEAST(100, v_energy + 3);
    v_fun := LEAST(100, v_fun + 5);
  ELSIF p_action = 'pet' THEN
    v_energy := LEAST(100, v_energy + 2);
    v_fun := LEAST(100, v_fun + 12);
    SELECT COALESCE(qty, 0) INTO v_kibble_rem
    FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic';
  ELSE
    v_energy := LEAST(100, v_energy + 2);
    v_fun := LEAST(100, v_fun + 6);
    SELECT COALESCE(qty, 0) INTO v_kibble_rem
    FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic';
  END IF;

  UPDATE public.pets
  SET vitals_jsonb = jsonb_build_object('hunger', v_hunger, 'energy', v_energy, 'fun', v_fun),
      emotion = public._pet_derive_mood(jsonb_build_object('hunger', v_hunger, 'energy', v_energy, 'fun', v_fun)),
      last_fed_at_ms = CASE WHEN p_action = 'feed' THEN v_now_ms ELSE last_fed_at_ms END,
      last_petted_at_ms = CASE WHEN p_action = 'pet' THEN v_now_ms ELSE last_petted_at_ms END,
      last_watered_at_ms = CASE WHEN p_action = 'water' THEN v_now_ms ELSE last_watered_at_ms END,
      sim_state_at_ms = v_now_ms,
      version = version + 1,
      updated_at = now()
  WHERE id = v_pet.id
  RETURNING * INTO v_pet;

  INSERT INTO public.pet_events (world_id, pet_id, actor_id, event_type, delta_jsonb, idempotency_key)
  VALUES (p_world_id, v_pet.id, v_uid, p_action, v_pet.vitals_jsonb, p_idempotency_key);

  v_res := jsonb_build_object(
    'pet', public._pet_row_to_json(v_pet, v_now_ms),
    'action', p_action,
    'kibbleRemaining', COALESCE(v_kibble_rem, 0)
  );

  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_interact', p_idempotency_key, v_req_hash, v_res);
  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pet_interact(uuid, uuid, text, integer, text) TO authenticated;
