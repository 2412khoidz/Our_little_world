-- Mission 04B-2 correctness: offer expiry commits, reservation lifecycle, server-owned movement position.

CREATE TABLE IF NOT EXISTS public.pet_nav_anchors (
  map_id text NOT NULL,
  target_id text NOT NULL,
  stand_tile_x integer NOT NULL,
  stand_tile_y integer NOT NULL,
  PRIMARY KEY (map_id, target_id)
);

INSERT INTO public.pet_nav_anchors (map_id, target_id, stand_tile_x, stand_tile_y)
VALUES
  ('home', 'food_bowl', 12, 10),
  ('home', 'water_bowl', 13, 10)
ON CONFLICT (map_id, target_id) DO NOTHING;

ALTER TABLE public.pet_living_action_instances
  ADD COLUMN IF NOT EXISTS origin_tile_x integer,
  ADD COLUMN IF NOT EXISTS origin_tile_y integer,
  ADD COLUMN IF NOT EXISTS authoritative_tile_x integer,
  ADD COLUMN IF NOT EXISTS authoritative_tile_y integer;

ALTER TABLE public.pet_food_offers DROP CONSTRAINT IF EXISTS pet_food_offers_status_check;
ALTER TABLE public.pet_food_offers ADD CONSTRAINT pet_food_offers_status_check
  CHECK (status IN ('pending', 'accepted', 'refused', 'deferred', 'cancelled', 'expired', 'consumed'));

CREATE OR REPLACE FUNCTION public._pet_living_authority_target_tile(
  p_map_id text, p_target text, OUT tile_x integer, OUT tile_y integer
)
RETURNS record
LANGUAGE sql STABLE
AS $$
  SELECT stand_tile_x, stand_tile_y
  FROM public.pet_nav_anchors
  WHERE map_id = p_map_id AND target_id = p_target;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_authority_target_tile(text, text) FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public._pet_living_authority_target_tile(text);

CREATE OR REPLACE FUNCTION public._pet_living_build_movement_plan(
  p_pet public.pets,
  p_action_id text,
  p_target_affordance_id text
)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_required text;
  v_goal record;
  v_steps integer;
  v_travel bigint;
  v_perform bigint;
  v_hash text;
  v_map text := COALESCE(p_pet.map_id, 'home');
BEGIN
  IF v_map <> 'home' THEN
    RAISE EXCEPTION 'MAP_NOT_SUPPORTED';
  END IF;
  IF p_action_id = 'eat_bowl' THEN v_required := 'food_bowl';
  ELSIF p_action_id = 'drink_water' THEN v_required := 'water_bowl';
  ELSE RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_target_affordance_id IS DISTINCT FROM v_required THEN
    RAISE EXCEPTION 'TARGET_MISMATCH';
  END IF;
  SELECT * INTO v_goal FROM public._pet_living_authority_target_tile(v_map, p_target_affordance_id);
  IF v_goal.tile_x IS NULL THEN RAISE EXCEPTION 'TARGET_UNKNOWN'; END IF;
  v_steps := public._pet_living_home_path_steps(p_pet.anchor_tile_x, p_pet.anchor_tile_y, v_goal.tile_x, v_goal.tile_y);
  IF v_steps < 0 THEN RAISE EXCEPTION 'TARGET_UNREACHABLE'; END IF;
  IF p_action_id = 'eat_bowl' THEN v_perform := 4200; ELSE v_perform := 3800; END IF;
  v_travel := LEAST(8000, GREATEST(400, v_steps * 420 + 900));
  v_hash := concat_ws(':', v_map, p_action_id, p_target_affordance_id, p_pet.anchor_tile_x, p_pet.anchor_tile_y, v_goal.tile_x, v_goal.tile_y, v_steps);
  RETURN jsonb_build_object(
    'mapId', v_map,
    'pathSteps', v_steps,
    'originTileX', p_pet.anchor_tile_x,
    'originTileY', p_pet.anchor_tile_y,
    'destTileX', v_goal.tile_x,
    'destTileY', v_goal.tile_y,
    'travelMs', v_travel,
    'performMs', v_perform,
    'planHash', v_hash,
    'furnitureCollisionMode', 'starter_static'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._pet_living_release_offer_inventory_by_id(p_offer_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_row public.pet_food_offers%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.pet_food_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_row.inventory_reserved AND v_row.reserved_owner_scope IS NOT NULL THEN
    PERFORM public._inventory_adjust_quality(
      v_row.world_id, v_row.reserved_owner_scope, v_row.item_sku, 1, v_row.quality);
    UPDATE public.pet_food_offers SET inventory_reserved = false WHERE id = p_offer_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_release_offer_inventory_by_id(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_expire_due_offers(p_world_id uuid, p_now bigint)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_row public.pet_food_offers%ROWTYPE;
  v_count integer := 0;
BEGIN
  FOR v_row IN
    SELECT * FROM public.pet_food_offers
    WHERE world_id = p_world_id
      AND status IN ('pending', 'accepted', 'deferred')
      AND expires_at_ms < p_now
    ORDER BY created_at_ms ASC
    FOR UPDATE
  LOOP
    PERFORM public._pet_living_release_offer_inventory_by_id(v_row.id);
    UPDATE public.pet_food_offers
    SET status = 'expired', responded_at_ms = p_now
    WHERE id = v_row.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_expire_due_offers(uuid, bigint) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_finalize_accepted_offer_for_fill(
  p_world_id uuid,
  p_actor uuid,
  p_scope text,
  p_sku text,
  p_quality text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_offer_id uuid;
BEGIN
  SELECT o.id INTO v_offer_id
  FROM public.pet_food_offers o
  WHERE o.world_id = p_world_id
    AND o.status = 'accepted'
    AND o.inventory_reserved = true
    AND o.caregiver_id = p_actor
    AND o.reserved_owner_scope = p_scope
    AND o.item_sku = p_sku
    AND o.quality = p_quality
  ORDER BY o.created_at_ms ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  IF v_offer_id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.pet_food_offers
  SET status = 'consumed', inventory_reserved = false, responded_at_ms = public._pet_living_now_ms()
  WHERE id = v_offer_id;
  RETURN v_offer_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_finalize_accepted_offer_for_fill(uuid, uuid, text, text, text)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_recover_stale_actions(p_world_id uuid, p_now bigint)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  UPDATE public.pet_living_action_instances i
  SET status = 'cancelled', completed_at_ms = p_now
  WHERE i.world_id = p_world_id
    AND i.status IN ('moving', 'performing')
    AND p_now > i.perform_until_ms + 180000
    AND i.id IN (
      SELECT id FROM public.pet_living_action_instances
      WHERE world_id = p_world_id
        AND status IN ('moving', 'performing')
        AND p_now > perform_until_ms + 180000
      FOR UPDATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.pet_care_apply(
  p_world_id uuid, p_pet_id uuid, p_action text, p_expected_version integer,
  p_scope text, p_sku text, p_quality text, p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pet public.pets%ROWTYPE;
  v_bowl public.pet_care_bowls%ROWTYPE;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_request text;
  v_result jsonb;
  v_now bigint := public._pet_living_now_ms();
  v_vitals jsonb;
  v_used_offer uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 OR
     p_action IS NULL OR p_action NOT IN ('fill_food', 'eat_food', 'fill_water', 'drink_water') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_action IN ('eat_food', 'drink_water') THEN
    RAISE EXCEPTION 'SERVER_AUTHORITY_REQUIRED';
  END IF;
  v_request := jsonb_build_array(p_pet_id, p_action, p_expected_version, p_scope, p_sku, p_quality)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  PERFORM public._pet_living_expire_due_offers(p_world_id, v_now);
  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'pet_care_apply' OR v_receipt.request_hash <> v_request THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id AND world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  INSERT INTO public.pet_care_bowls (world_id, pet_id)
  VALUES (p_world_id, p_pet_id) ON CONFLICT (world_id) DO NOTHING;
  SELECT * INTO v_bowl FROM public.pet_care_bowls WHERE world_id = p_world_id FOR UPDATE;
  IF v_bowl.pet_id <> p_pet_id THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p_expected_version IS NULL OR p_expected_version <> v_bowl.version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;

  IF p_action = 'fill_food' THEN
    IF p_scope IS NULL OR p_scope NOT IN ('shared', 'user:' || v_uid::text)
       OR p_sku IS DISTINCT FROM 'pet_kibble_basic' OR p_quality IS DISTINCT FROM 'normal' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR';
    END IF;
    IF v_bowl.food_portions >= 2 OR
       (v_bowl.food_portions > 0 AND (v_bowl.food_sku IS DISTINCT FROM p_sku OR v_bowl.food_quality IS DISTINCT FROM p_quality)) THEN
      RAISE EXCEPTION 'BOWL_FULL';
    END IF;
    v_used_offer := public._pet_living_finalize_accepted_offer_for_fill(p_world_id, v_uid, p_scope, p_sku, p_quality);
    IF v_used_offer IS NULL THEN
      PERFORM public._inventory_adjust_quality(p_world_id, p_scope, p_sku, -1, p_quality);
    END IF;
    UPDATE public.pet_care_bowls SET food_sku = p_sku, food_quality = p_quality,
      food_portions = food_portions + 1, version = version + 1 WHERE world_id = p_world_id RETURNING * INTO v_bowl;
  ELSIF p_action = 'fill_water' THEN
    IF v_bowl.water_volume >= 100 THEN RAISE EXCEPTION 'BOWL_FULL'; END IF;
    UPDATE public.pet_care_bowls SET water_volume = 100, version = version + 1
    WHERE world_id = p_world_id RETURNING * INTO v_bowl;
  ELSE
    RAISE EXCEPTION 'SERVER_AUTHORITY_REQUIRED';
  END IF;
  v_result := jsonb_build_object('bowl', to_jsonb(v_bowl), 'pet', public._pet_row_to_json(v_pet, v_now));
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_care_apply', p_idempotency_key, v_request, v_result);
  RETURN v_result;
END;
$$;

-- snapshot: expire offers + stale recovery (world row locked first)
CREATE OR REPLACE FUNCTION public.pet_living_get_snapshot(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
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
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  PERFORM public._pet_living_expire_due_offers(p_world_id, v_now);
  PERFORM public._pet_living_recover_stale_actions(p_world_id, v_now);
  SELECT * INTO v_pet FROM public.pets WHERE world_id = p_world_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('worldId', p_world_id, 'petId', NULL, 'serverNowMs', v_now);
  END IF;
  SELECT * INTO v_bowl FROM public.pet_care_bowls WHERE world_id = p_world_id;
  SELECT jsonb_build_object(
    'id', i.id, 'actionId', i.action_id, 'targetAffordanceId', i.target_affordance_id,
    'status', i.status, 'startedAtMs', i.started_at_ms, 'arriveAtMs', i.arrive_at_ms,
    'performUntilMs', i.perform_until_ms, 'movementVerified', i.movement_verified,
    'animationVerified', i.animation_verified, 'completedAtMs', i.completed_at_ms,
    'destTileX', i.dest_tile_x, 'destTileY', i.dest_tile_y,
    'originTileX', i.origin_tile_x, 'originTileY', i.origin_tile_y,
    'authoritativeTileX', i.authoritative_tile_x, 'authoritativeTileY', i.authoritative_tile_y,
    'pathSteps', i.path_steps
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
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_response IS NULL OR length(trim(p_response)) = 0 OR p_response <> 'cancel' THEN
    IF p_response <> 'cancel' THEN RAISE EXCEPTION 'BRAIN_AUTHORITY_REQUIRED'; END IF;
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  v_req := jsonb_build_array(p_offer_id, p_response)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  PERFORM public._pet_living_expire_due_offers(p_world_id, v_now);
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
  IF v_row.status = 'expired' THEN
    RETURN jsonb_build_object('offerExpired', true, 'snapshot', public.pet_living_get_snapshot(p_world_id));
  END IF;
  IF NOT (v_row.status IN ('pending', 'deferred', 'accepted')) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF v_now > v_row.expires_at_ms THEN
    PERFORM public._pet_living_release_offer_inventory_by_id(v_row.id);
    UPDATE public.pet_food_offers SET status = 'expired', responded_at_ms = v_now WHERE id = p_offer_id;
    INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
    VALUES (p_world_id, v_uid, 'pet_food_offer_respond', p_idempotency_key, v_req,
      jsonb_build_object('offerExpired', true, 'snapshot', public.pet_living_get_snapshot(p_world_id)));
    RETURN jsonb_build_object('offerExpired', true, 'snapshot', public.pet_living_get_snapshot(p_world_id));
  END IF;
  IF v_row.caregiver_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM public._pet_living_release_offer_inventory_by_id(v_row.id);
  UPDATE public.pet_food_offers SET status = 'cancelled', responded_at_ms = v_now WHERE id = p_offer_id;
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_food_offer_respond', p_idempotency_key, v_req,
    jsonb_build_object('snapshot', public.pet_living_get_snapshot(p_world_id)));
  RETURN jsonb_build_object('snapshot', public.pet_living_get_snapshot(p_world_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.pet_food_offer_evaluate(
  p_world_id uuid, p_pet_id uuid, p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now bigint := public._pet_living_now_ms();
  v_pet public.pets%ROWTYPE;
  v_offer public.pet_food_offers%ROWTYPE;
  v_vitals jsonb;
  v_hunger integer;
  v_req text;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_outcome text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  v_req := jsonb_build_array(p_pet_id)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  PERFORM public._pet_living_expire_due_offers(p_world_id, v_now);
  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'pet_food_offer_evaluate' OR v_receipt.request_hash <> v_req THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id AND world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO v_offer FROM public.pet_food_offers
  WHERE world_id = p_world_id AND pet_id = p_pet_id AND status = 'pending'
  ORDER BY created_at_ms ASC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('snapshot', public.pet_living_get_snapshot(p_world_id));
  END IF;
  IF v_now > v_offer.expires_at_ms OR v_offer.status = 'expired' THEN
    PERFORM public._pet_living_release_offer_inventory_by_id(v_offer.id);
    UPDATE public.pet_food_offers SET status = 'expired', responded_at_ms = v_now WHERE id = v_offer.id;
    INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
    VALUES (p_world_id, v_uid, 'pet_food_offer_evaluate', p_idempotency_key, v_req,
      jsonb_build_object('offerExpired', true, 'offerId', v_offer.id, 'snapshot', public.pet_living_get_snapshot(p_world_id)));
    RETURN jsonb_build_object('offerExpired', true, 'offerId', v_offer.id, 'snapshot', public.pet_living_get_snapshot(p_world_id));
  END IF;
  v_vitals := public._pet_catchup_vitals(v_pet.vitals_jsonb, v_pet.sim_state_at_ms, v_now);
  v_hunger := (v_vitals->>'hunger')::integer;
  IF v_hunger >= 88 THEN
    v_outcome := 'refused';
    PERFORM public._pet_living_release_offer_inventory_by_id(v_offer.id);
  ELSIF v_hunger <= 55 AND v_offer.item_sku = 'pet_kibble_basic' THEN
    v_outcome := 'accepted';
  ELSE
    v_outcome := 'deferred';
  END IF;
  UPDATE public.pet_food_offers SET status = v_outcome, responded_at_ms = v_now WHERE id = v_offer.id;
  PERFORM public._pet_living_append_memory(
    p_world_id, p_pet_id, 'food_offer_' || v_outcome, v_offer.caregiver_id,
    jsonb_build_object('offerId', v_offer.id, 'sku', v_offer.item_sku, 'quality', v_offer.quality),
    v_now);
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_food_offer_evaluate', p_idempotency_key, v_req,
    jsonb_build_object('outcome', v_outcome, 'offerId', v_offer.id, 'snapshot', public.pet_living_get_snapshot(p_world_id)));
  RETURN jsonb_build_object('outcome', v_outcome, 'offerId', v_offer.id, 'snapshot', public.pet_living_get_snapshot(p_world_id));
END;
$$;

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
  v_plan jsonb;
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
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  PERFORM public._pet_living_expire_due_offers(p_world_id, v_now);
  PERFORM public._pet_living_recover_stale_actions(p_world_id, v_now);
  v_req := jsonb_build_array(p_pet_id, p_action_id, p_target_affordance_id, p_expected_living_version)::text;
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
  v_plan := public._pet_living_build_movement_plan(v_pet, p_action_id, p_target_affordance_id);
  v_travel_ms := (v_plan->>'travelMs')::bigint;
  v_perform_ms := (v_plan->>'performMs')::bigint;
  v_instance := gen_random_uuid();
  INSERT INTO public.pet_living_action_instances (
    id, world_id, pet_id, action_id, target_affordance_id, status,
    started_at_ms, arrive_at_ms, perform_until_ms,
    dest_tile_x, dest_tile_y, path_steps, movement_plan_hash, movement_plan_json,
    origin_tile_x, origin_tile_y, authoritative_tile_x, authoritative_tile_y
  ) VALUES (
    v_instance, p_world_id, p_pet_id, p_action_id, p_target_affordance_id, 'moving',
    v_now, v_now + v_travel_ms, v_now + v_travel_ms + v_perform_ms,
    (v_plan->>'destTileX')::integer, (v_plan->>'destTileY')::integer,
    (v_plan->>'pathSteps')::integer, v_plan->>'planHash', v_plan,
    (v_plan->>'originTileX')::integer, (v_plan->>'originTileY')::integer,
    (v_plan->>'originTileX')::integer, (v_plan->>'originTileY')::integer
  );
  UPDATE public.pets SET living_version = living_version + 1 WHERE id = p_pet_id;
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_living_begin_action', p_idempotency_key, v_req,
    jsonb_build_object('instanceId', v_instance, 'movementPlan', v_plan, 'snapshot', public.pet_living_get_snapshot(p_world_id)));
  RETURN jsonb_build_object('instanceId', v_instance, 'movementPlan', v_plan, 'snapshot', public.pet_living_get_snapshot(p_world_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.pet_living_submit_proposal(
  p_world_id uuid,
  p_instance_id uuid,
  p_proposal text,
  p_idempotency_key text,
  p_proof jsonb DEFAULT NULL
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
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_proposal IS NULL OR length(btrim(p_proposal)) = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p_proposal NOT IN ('movement_ready', 'animation_finished') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_req := jsonb_build_array(p_instance_id, p_proposal)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  PERFORM public._pet_living_expire_due_offers(p_world_id, v_now);
  PERFORM public._pet_living_recover_stale_actions(p_world_id, v_now);
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
  IF v_row.status = 'cancelled' THEN RAISE EXCEPTION 'ACTION_STALE'; END IF;
  IF v_row.status = 'completed' AND v_row.consumption_recorded THEN
    v_result := jsonb_build_object('snapshot', public.pet_living_get_snapshot(p_world_id));
    INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
    VALUES (p_world_id, v_uid, 'pet_living_submit_proposal', p_idempotency_key, v_req, v_result);
    RETURN v_result;
  END IF;
  IF v_row.status NOT IN ('moving', 'performing') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;

  IF p_proposal = 'movement_ready' THEN
    IF v_row.dest_tile_x IS NULL OR v_row.movement_plan_hash IS NULL THEN
      RAISE EXCEPTION 'CONSUMPTION_NOT_AUTHORIZED';
    END IF;
    IF v_now < v_row.arrive_at_ms THEN RAISE EXCEPTION 'MOVEMENT_NOT_READY'; END IF;
    UPDATE public.pet_living_action_instances
    SET movement_verified = true, status = 'performing',
        authoritative_tile_x = v_row.dest_tile_x,
        authoritative_tile_y = v_row.dest_tile_y
    WHERE id = p_instance_id;
  ELSE
    IF NOT v_row.movement_verified OR v_now < v_row.perform_until_ms THEN
      RAISE EXCEPTION 'CONSUMPTION_NOT_AUTHORIZED';
    END IF;
    IF v_row.consumption_recorded THEN RAISE EXCEPTION 'ALREADY_CONSUMED'; END IF;
    IF v_row.authoritative_tile_x IS DISTINCT FROM v_row.dest_tile_x
       OR v_row.authoritative_tile_y IS DISTINCT FROM v_row.dest_tile_y THEN
      RAISE EXCEPTION 'CONSUMPTION_NOT_AUTHORIZED';
    END IF;
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