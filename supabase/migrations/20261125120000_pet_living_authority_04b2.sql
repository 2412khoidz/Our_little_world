-- Mission 04B-2: server-authoritative living pet execution (lazy sim on RPC; no background worker).

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS personality_json jsonb NOT NULL DEFAULT '{"profileId":"mischievous_quyt"}'::jsonb,
  ADD COLUMN IF NOT EXISTS living_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS brain_state_json jsonb;

CREATE TABLE IF NOT EXISTS public.pet_living_action_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  action_id text NOT NULL CHECK (action_id IN ('eat_bowl', 'drink_water')),
  target_affordance_id text NOT NULL,
  status text NOT NULL DEFAULT 'moving'
    CHECK (status IN ('pending', 'moving', 'performing', 'completed', 'cancelled')),
  started_at_ms bigint NOT NULL,
  arrive_at_ms bigint NOT NULL,
  perform_until_ms bigint NOT NULL,
  movement_verified boolean NOT NULL DEFAULT false,
  animation_verified boolean NOT NULL DEFAULT false,
  completed_at_ms bigint,
  consumption_recorded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (world_id, id)
);
CREATE INDEX IF NOT EXISTS pet_living_action_active_idx
  ON public.pet_living_action_instances (world_id, pet_id)
  WHERE status IN ('pending', 'moving', 'performing');

CREATE TABLE IF NOT EXISTS public.pet_food_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES auth.users(id),
  item_sku text NOT NULL,
  quality text NOT NULL CHECK (quality IN ('normal', 'silver', 'gold')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'refused', 'deferred', 'cancelled', 'expired', 'consumed')),
  expires_at_ms bigint NOT NULL,
  created_at_ms bigint NOT NULL,
  responded_at_ms bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pet_food_offers_world_pet_idx ON public.pet_food_offers (world_id, pet_id);

CREATE TABLE IF NOT EXISTS public.pet_living_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  kind text NOT NULL,
  caregiver_id uuid,
  at_ms bigint NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pet_living_memory_world_idx ON public.pet_living_memory (world_id, at_ms DESC);

ALTER TABLE public.pet_living_action_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_food_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_living_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY pet_living_action_select ON public.pet_living_action_instances
  FOR SELECT TO authenticated USING (public.is_world_member(world_id));
CREATE POLICY pet_food_offers_select ON public.pet_food_offers
  FOR SELECT TO authenticated USING (public.is_world_member(world_id));
CREATE POLICY pet_living_memory_select ON public.pet_living_memory
  FOR SELECT TO authenticated USING (public.is_world_member(world_id));

REVOKE INSERT, UPDATE, DELETE ON public.pet_living_action_instances FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pet_food_offers FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pet_living_memory FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._pet_living_now_ms()
RETURNS bigint
LANGUAGE sql STABLE
AS $$ SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint; $$;

CREATE OR REPLACE FUNCTION public._pet_living_append_memory(
  p_world_id uuid, p_pet_id uuid, p_kind text, p_caregiver uuid, p_payload jsonb, p_at_ms bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO public.pet_living_memory (world_id, pet_id, kind, caregiver_id, at_ms, payload)
  VALUES (p_world_id, p_pet_id, p_kind, p_caregiver, p_at_ms, COALESCE(p_payload, '{}'::jsonb));
  SELECT count(*) INTO v_count FROM public.pet_living_memory WHERE world_id = p_world_id;
  IF v_count > 64 THEN
    DELETE FROM public.pet_living_memory m
    WHERE m.world_id = p_world_id
      AND m.id IN (
        SELECT id FROM public.pet_living_memory
        WHERE world_id = p_world_id ORDER BY at_ms ASC LIMIT (v_count - 64)
      );
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_append_memory(uuid, uuid, text, uuid, jsonb, bigint)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_authority_consume_food(
  p_world_id uuid, p_pet_id uuid, p_caregiver uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_bowl public.pet_care_bowls%ROWTYPE;
  v_now bigint := public._pet_living_now_ms();
  v_vitals jsonb;
BEGIN
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id AND world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO v_bowl FROM public.pet_care_bowls WHERE world_id = p_world_id FOR UPDATE;
  IF v_bowl.food_portions = 0 THEN RAISE EXCEPTION 'BOWL_EMPTY'; END IF;
  IF v_pet.last_fed_at_ms IS NOT NULL AND v_now < v_pet.last_fed_at_ms + 60000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;
  v_vitals := public._pet_catchup_vitals(v_pet.vitals_jsonb, v_pet.sim_state_at_ms, v_now);
  IF (v_vitals->>'hunger')::integer >= 90 THEN RAISE EXCEPTION 'PET_FULL'; END IF;
  v_vitals := jsonb_set(v_vitals, '{hunger}', to_jsonb(LEAST(100, (v_vitals->>'hunger')::integer + 28)));
  UPDATE public.pets SET vitals_jsonb = v_vitals, last_fed_at_ms = v_now, sim_state_at_ms = v_now,
    emotion = public._pet_derive_mood(v_vitals), version = version + 1, living_version = living_version + 1,
    updated_at = now() WHERE id = p_pet_id;
  UPDATE public.pet_care_bowls SET food_portions = food_portions - 1,
    food_sku = CASE WHEN food_portions = 1 THEN NULL ELSE food_sku END,
    food_quality = CASE WHEN food_portions = 1 THEN NULL ELSE food_quality END,
    version = version + 1 WHERE world_id = p_world_id;
  PERFORM public._pet_living_append_memory(
    p_world_id, p_pet_id, 'ate_bowl', p_caregiver,
  jsonb_build_object('sku', v_bowl.food_sku, 'quality', v_bowl.food_quality),
    v_now);
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_authority_consume_food(uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_authority_consume_water(
  p_world_id uuid, p_pet_id uuid, p_caregiver uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_bowl public.pet_care_bowls%ROWTYPE;
  v_now bigint := public._pet_living_now_ms();
BEGIN
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id AND world_id = p_world_id FOR UPDATE;
  SELECT * INTO v_bowl FROM public.pet_care_bowls WHERE world_id = p_world_id FOR UPDATE;
  IF v_bowl.water_volume < 10 THEN RAISE EXCEPTION 'BOWL_EMPTY'; END IF;
  IF v_pet.last_watered_at_ms IS NOT NULL AND v_now < v_pet.last_watered_at_ms + 20000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;
  UPDATE public.pets SET last_watered_at_ms = v_now, version = version + 1, living_version = living_version + 1,
    updated_at = now() WHERE id = p_pet_id;
  UPDATE public.pet_care_bowls SET water_volume = water_volume - 10, version = version + 1
    WHERE world_id = p_world_id;
  PERFORM public._pet_living_append_memory(
    p_world_id, p_pet_id, 'drank_water', p_caregiver, '{}'::jsonb, v_now);
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_authority_consume_water(uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pet_living_get_snapshot(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now bigint := public._pet_living_now_ms();
  v_pet public.pets%ROWTYPE;
  v_bowl public.pet_care_bowls%ROWTYPE;
  v_action jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_pet FROM public.pets WHERE world_id = p_world_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('worldId', p_world_id, 'petId', NULL, 'serverNowMs', v_now);
  END IF;
  SELECT * INTO v_bowl FROM public.pet_care_bowls WHERE world_id = p_world_id;
  SELECT jsonb_build_object(
    'id', i.id, 'actionId', i.action_id, 'targetAffordanceId', i.target_affordance_id,
    'status', i.status, 'startedAtMs', i.started_at_ms, 'arriveAtMs', i.arrive_at_ms,
    'performUntilMs', i.perform_until_ms, 'movementVerified', i.movement_verified,
    'animationVerified', i.animation_verified, 'completedAtMs', i.completed_at_ms
  ) INTO v_action
  FROM public.pet_living_action_instances i
  WHERE i.world_id = p_world_id AND i.pet_id = v_pet.id
    AND i.status IN ('moving', 'performing')
  ORDER BY i.started_at_ms DESC LIMIT 1;

  RETURN jsonb_build_object(
    'worldId', p_world_id,
    'petId', v_pet.id,
    'livingVersion', v_pet.living_version,
    'serverNowMs', v_now,
    'personalityJson', v_pet.personality_json,
    'brainStateJson', v_pet.brain_state_json,
    'activeAction', v_action,
    'pendingOffers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id, 'caregiverId', o.caregiver_id, 'itemSku', o.item_sku, 'quality', o.quality,
        'status', o.status, 'expiresAtMs', o.expires_at_ms, 'createdAtMs', o.created_at_ms
      ) ORDER BY o.created_at_ms DESC)
      FROM public.pet_food_offers o
      WHERE o.world_id = p_world_id AND o.pet_id = v_pet.id AND o.status IN ('pending', 'accepted', 'deferred')
    ), '[]'::jsonb),
    'recentMemory', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id, 'kind', m.kind, 'caregiverId', m.caregiver_id, 'atMs', m.at_ms, 'payload', m.payload
      ) ORDER BY m.at_ms DESC)
      FROM (SELECT * FROM public.pet_living_memory WHERE world_id = p_world_id ORDER BY at_ms DESC LIMIT 16) m
    ), '[]'::jsonb),
    'bowl', jsonb_build_object(
      'version', COALESCE(v_bowl.version, 1),
      'foodPortions', COALESCE(v_bowl.food_portions, 0),
      'waterVolume', COALESCE(v_bowl.water_volume, 60),
      'foodSku', v_bowl.food_sku,
      'foodQuality', v_bowl.food_quality
    ),
    'pet', public._pet_row_to_json(v_pet, v_now)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.pet_living_get_snapshot(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.pet_living_get_snapshot(uuid) FROM PUBLIC, anon, service_role;

CREATE OR REPLACE FUNCTION public.pet_food_offer_create(
  p_world_id uuid, p_pet_id uuid, p_item_sku text, p_quality text,
  p_ttl_seconds integer, p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now bigint := public._pet_living_now_ms();
  v_offer_id uuid;
  v_req text;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_quality NOT IN ('normal', 'silver', 'gold') OR p_ttl_seconds IS NULL OR p_ttl_seconds < 30 OR p_ttl_seconds > 86400 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  v_req := jsonb_build_array(p_pet_id, p_item_sku, p_quality, p_ttl_seconds)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'pet_food_offer_create' OR v_receipt.request_hash <> v_req THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pets WHERE id = p_pet_id AND world_id = p_world_id) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  v_offer_id := gen_random_uuid();
  INSERT INTO public.pet_food_offers (id, world_id, pet_id, caregiver_id, item_sku, quality, expires_at_ms, created_at_ms)
  VALUES (v_offer_id, p_world_id, p_pet_id, v_uid, p_item_sku, p_quality, v_now + p_ttl_seconds * 1000, v_now);
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_food_offer_create', p_idempotency_key, v_req,
    jsonb_build_object('offerId', v_offer_id));
  RETURN jsonb_build_object('offerId', v_offer_id, 'snapshot', public.pet_living_get_snapshot(p_world_id));
END;
$$;
GRANT EXECUTE ON FUNCTION public.pet_food_offer_create(uuid, uuid, text, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pet_food_offer_respond(
  p_world_id uuid, p_offer_id uuid, p_response text, p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now bigint := public._pet_living_now_ms();
  v_row public.pet_food_offers%ROWTYPE;
  v_req text;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF p_response NOT IN ('accept', 'refuse', 'defer', 'cancel') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_req := jsonb_build_array(p_offer_id, p_response)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'pet_food_offer_respond' OR v_receipt.request_hash <> v_req THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;
  SELECT * INTO v_row FROM public.pet_food_offers WHERE id = p_offer_id AND world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_row.status <> 'pending' AND v_row.status <> 'deferred' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF v_now > v_row.expires_at_ms THEN
    UPDATE public.pet_food_offers SET status = 'expired', responded_at_ms = v_now WHERE id = p_offer_id;
    RAISE EXCEPTION 'OFFER_EXPIRED';
  END IF;
  IF p_response = 'accept' THEN
    UPDATE public.pet_food_offers SET status = 'accepted', responded_at_ms = v_now WHERE id = p_offer_id;
  ELSIF p_response = 'refuse' THEN
    UPDATE public.pet_food_offers SET status = 'refused', responded_at_ms = v_now WHERE id = p_offer_id;
  ELSIF p_response = 'defer' THEN
    UPDATE public.pet_food_offers SET status = 'deferred', responded_at_ms = v_now WHERE id = p_offer_id;
  ELSE
    IF v_row.caregiver_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
    UPDATE public.pet_food_offers SET status = 'cancelled', responded_at_ms = v_now WHERE id = p_offer_id;
  END IF;
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_food_offer_respond', p_idempotency_key, v_req,
    jsonb_build_object('snapshot', public.pet_living_get_snapshot(p_world_id)));
  RETURN jsonb_build_object('snapshot', public.pet_living_get_snapshot(p_world_id));
END;
$$;
GRANT EXECUTE ON FUNCTION public.pet_food_offer_respond(uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pet_living_begin_action(
  p_world_id uuid, p_pet_id uuid, p_action_id text, p_target_affordance_id text,
  p_expected_living_version integer, p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now bigint := public._pet_living_now_ms();
  v_pet public.pets%ROWTYPE;
  v_bowl public.pet_care_bowls%ROWTYPE;
  v_travel_ms bigint;
  v_perform_ms bigint;
  v_instance uuid;
  v_req text;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_action_id NOT IN ('eat_bowl', 'drink_water') OR p_target_affordance_id IS NULL OR length(trim(p_target_affordance_id)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  v_req := jsonb_build_array(p_pet_id, p_action_id, p_target_affordance_id, p_expected_living_version)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'pet_living_begin_action' OR v_receipt.request_hash <> v_req THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id AND world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p_expected_living_version IS NULL OR p_expected_living_version <> v_pet.living_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.pet_living_action_instances
    WHERE world_id = p_world_id AND pet_id = p_pet_id AND status IN ('moving', 'performing')
  ) THEN
    RAISE EXCEPTION 'ACTION_IN_PROGRESS';
  END IF;
  SELECT * INTO v_bowl FROM public.pet_care_bowls WHERE world_id = p_world_id;
  IF p_action_id = 'eat_bowl' AND COALESCE(v_bowl.food_portions, 0) = 0 THEN RAISE EXCEPTION 'BOWL_EMPTY'; END IF;
  IF p_action_id = 'drink_water' AND COALESCE(v_bowl.water_volume, 0) < 10 THEN RAISE EXCEPTION 'BOWL_EMPTY'; END IF;
  IF p_action_id = 'eat_bowl' THEN v_travel_ms := 1400; v_perform_ms := 2800;
  ELSE v_travel_ms := 1000; v_perform_ms := 2200; END IF;
  v_instance := gen_random_uuid();
  INSERT INTO public.pet_living_action_instances (
    id, world_id, pet_id, action_id, target_affordance_id, status,
    started_at_ms, arrive_at_ms, perform_until_ms
  ) VALUES (
    v_instance, p_world_id, p_pet_id, p_action_id, p_target_affordance_id, 'moving',
    v_now, v_now + v_travel_ms, v_now + v_travel_ms + v_perform_ms
  );
  UPDATE public.pets SET living_version = living_version + 1 WHERE id = p_pet_id;
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_living_begin_action', p_idempotency_key, v_req,
    jsonb_build_object('instanceId', v_instance, 'snapshot', public.pet_living_get_snapshot(p_world_id)));
  RETURN jsonb_build_object('instanceId', v_instance, 'snapshot', public.pet_living_get_snapshot(p_world_id));
END;
$$;
GRANT EXECUTE ON FUNCTION public.pet_living_begin_action(uuid, uuid, text, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pet_living_submit_proposal(
  p_world_id uuid, p_instance_id uuid, p_proposal text, p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now bigint := public._pet_living_now_ms();
  v_row public.pet_living_action_instances%ROWTYPE;
  v_pet_id uuid;
  v_req text;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF p_proposal NOT IN ('movement_ready', 'animation_finished') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_req := jsonb_build_array(p_instance_id, p_proposal)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'pet_living_submit_proposal' OR v_receipt.request_hash <> v_req THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;
  SELECT * INTO v_row FROM public.pet_living_action_instances
  WHERE id = p_instance_id AND world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_row.status = 'completed' AND v_row.consumption_recorded THEN
    v_result := jsonb_build_object('snapshot', public.pet_living_get_snapshot(p_world_id));
    INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
    VALUES (p_world_id, v_uid, 'pet_living_submit_proposal', p_idempotency_key, v_req, v_result);
    RETURN v_result;
  END IF;
  IF v_row.status NOT IN ('moving', 'performing') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;

  IF p_proposal = 'movement_ready' THEN
    IF v_now < v_row.arrive_at_ms THEN RAISE EXCEPTION 'MOVEMENT_NOT_READY'; END IF;
    UPDATE public.pet_living_action_instances SET movement_verified = true, status = 'performing'
      WHERE id = p_instance_id;
  ELSE
    IF NOT v_row.movement_verified OR v_now < v_row.perform_until_ms THEN
      RAISE EXCEPTION 'CONSUMPTION_NOT_AUTHORIZED';
    END IF;
    IF v_row.consumption_recorded THEN RAISE EXCEPTION 'ALREADY_CONSUMED'; END IF;
    v_pet_id := v_row.pet_id;
    IF v_row.action_id = 'eat_bowl' THEN
      PERFORM public._pet_living_authority_consume_food(p_world_id, v_pet_id, v_uid);
    ELSE
      PERFORM public._pet_living_authority_consume_water(p_world_id, v_pet_id, v_uid);
    END IF;
    UPDATE public.pet_living_action_instances SET animation_verified = true, status = 'completed',
      consumption_recorded = true, completed_at_ms = v_now WHERE id = p_instance_id;
  END IF;

  v_result := jsonb_build_object('snapshot', public.pet_living_get_snapshot(p_world_id));
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_living_submit_proposal', p_idempotency_key, v_req, v_result);
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.pet_living_submit_proposal(uuid, uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public._pet_living_now_ms() FROM PUBLIC, anon, authenticated, service_role;