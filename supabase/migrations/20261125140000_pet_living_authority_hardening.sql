-- Mission 04B-2 security hardening: membership, movement plan, offer inventory, stale recovery.

DROP FUNCTION IF EXISTS public.pet_living_submit_proposal(uuid, uuid, text, text);

ALTER TABLE public.pet_living_action_instances
  ADD COLUMN IF NOT EXISTS dest_tile_x integer,
  ADD COLUMN IF NOT EXISTS dest_tile_y integer,
  ADD COLUMN IF NOT EXISTS path_steps integer,
  ADD COLUMN IF NOT EXISTS movement_plan_hash text,
  ADD COLUMN IF NOT EXISTS movement_plan_json jsonb;

ALTER TABLE public.pet_food_offers
  ADD COLUMN IF NOT EXISTS reserved_owner_scope text,
  ADD COLUMN IF NOT EXISTS inventory_reserved boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public._pet_living_home_static_blocked(p_x integer, p_y integer)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_x < 0 OR p_y < 0 OR p_x >= 16 OR p_y >= 12 THEN RETURN true; END IF;
  IF p_y <= 2 THEN RETURN true; END IF;
  IF p_x = 0 OR p_x = 15 THEN RETURN true; END IF;
  IF p_y = 11 AND p_x NOT IN (7, 8) THEN RETURN true; END IF;
  RETURN false;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_home_static_blocked(integer, integer) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_home_path_steps(
  p_sx integer, p_sy integer, p_gx integer, p_gy integer
)
RETURNS integer
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_queue text[] := ARRAY[format('%s,%s', p_sx, p_sy)];
  v_came_from jsonb := '{}'::jsonb;
  v_head integer := 1;
  v_cur text;
  v_parts text[];
  v_cx integer; v_cy integer;
  v_nk text;
  v_nx integer; v_ny integer;
  v_dirs constant integer[][] := ARRAY[[0,1],[0,-1],[-1,0],[1,0]];
  v_d integer[];
  v_goal text := format('%s,%s', p_gx, p_gy);
  v_resolved_x integer := p_gx;
  v_resolved_y integer := p_gy;
  v_blocked_goal boolean;
BEGIN
  IF public._pet_living_home_static_blocked(p_gx, p_gy) THEN
    v_blocked_goal := true;
    IF public._pet_living_home_static_blocked(p_gx, p_gy + 1) = false THEN
      v_resolved_x := p_gx; v_resolved_y := p_gy + 1;
    ELSIF public._pet_living_home_static_blocked(p_gx, p_gy - 1) = false THEN
      v_resolved_x := p_gx; v_resolved_y := p_gy - 1;
    ELSIF public._pet_living_home_static_blocked(p_gx - 1, p_gy) = false THEN
      v_resolved_x := p_gx - 1; v_resolved_y := p_gy;
    ELSIF public._pet_living_home_static_blocked(p_gx + 1, p_gy) = false THEN
      v_resolved_x := p_gx + 1; v_resolved_y := p_gy;
    ELSE
      RETURN -1;
    END IF;
    v_goal := format('%s,%s', v_resolved_x, v_resolved_y);
  END IF;

  IF p_sx = v_resolved_x AND p_sy = v_resolved_y THEN RETURN 0; END IF;

  v_came_from := jsonb_set(v_came_from, ARRAY[format('%s,%s', p_sx, p_sy)], 'null'::jsonb, true);

  WHILE v_head <= array_length(v_queue, 1) LOOP
    v_cur := v_queue[v_head];
    v_head := v_head + 1;
  IF v_cur = v_goal THEN
      v_cx := v_resolved_x; v_cy := v_resolved_y;
      DECLARE v_steps integer := 0; v_from text;
      BEGIN
        WHILE NOT (v_cx = p_sx AND v_cy = p_sy) LOOP
          v_steps := v_steps + 1;
          v_from := v_came_from ->> format('%s,%s', v_cx, v_cy);
          EXIT WHEN v_from IS NULL;
          v_parts := string_to_array(v_from, ',');
          v_cx := v_parts[1]::integer;
          v_cy := v_parts[2]::integer;
        END LOOP;
        RETURN v_steps;
      END;
    END IF;
    v_parts := string_to_array(v_cur, ',');
    v_cx := v_parts[1]::integer;
    v_cy := v_parts[2]::integer;
    FOREACH v_d SLICE 1 IN ARRAY v_dirs LOOP
      v_nx := v_cx + v_d[1];
      v_ny := v_cy + v_d[2];
      v_nk := format('%s,%s', v_nx, v_ny);
      IF public._pet_living_home_static_blocked(v_nx, v_ny) THEN CONTINUE; END IF;
      IF v_came_from ? v_nk THEN CONTINUE; END IF;
      v_came_from := jsonb_set(v_came_from, ARRAY[v_nk], to_jsonb(v_cur), true);
      v_queue := array_append(v_queue, v_nk);
    END LOOP;
  END LOOP;
  RETURN -1;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_home_path_steps(integer, integer, integer, integer)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_authority_target_tile(p_target text, OUT tile_x integer, OUT tile_y integer)
RETURNS record
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    CASE p_target
      WHEN 'food_bowl' THEN 12
      WHEN 'water_bowl' THEN 13
      ELSE NULL
    END,
    CASE p_target
      WHEN 'food_bowl' THEN 10
      WHEN 'water_bowl' THEN 10
      ELSE NULL
    END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_authority_target_tile(text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_build_movement_plan(
  p_pet public.pets,
  p_action_id text,
  p_target_affordance_id text
)
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_required text;
  v_goal record;
  v_steps integer;
  v_travel bigint;
  v_perform bigint;
  v_hash text;
BEGIN
  IF p_pet.map_id IS DISTINCT FROM 'home' THEN
    RAISE EXCEPTION 'MAP_NOT_SUPPORTED';
  END IF;
  IF p_action_id = 'eat_bowl' THEN v_required := 'food_bowl';
  ELSIF p_action_id = 'drink_water' THEN v_required := 'water_bowl';
  ELSE RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_target_affordance_id IS DISTINCT FROM v_required THEN
    RAISE EXCEPTION 'TARGET_MISMATCH';
  END IF;
  SELECT * INTO v_goal FROM public._pet_living_authority_target_tile(p_target_affordance_id);
  IF v_goal.tile_x IS NULL THEN RAISE EXCEPTION 'TARGET_UNKNOWN'; END IF;
  v_steps := public._pet_living_home_path_steps(p_pet.anchor_tile_x, p_pet.anchor_tile_y, v_goal.tile_x, v_goal.tile_y);
  IF v_steps < 0 THEN RAISE EXCEPTION 'TARGET_UNREACHABLE'; END IF;
  IF p_action_id = 'eat_bowl' THEN v_perform := 4200; ELSE v_perform := 3800; END IF;
  v_travel := LEAST(8000, GREATEST(400, v_steps * 420 + 900));
  v_hash := concat_ws(':', p_action_id, p_target_affordance_id, p_pet.anchor_tile_x, p_pet.anchor_tile_y, v_goal.tile_x, v_goal.tile_y, v_steps);
  RETURN jsonb_build_object(
    'pathSteps', v_steps,
    'destTileX', v_goal.tile_x,
    'destTileY', v_goal.tile_y,
    'travelMs', v_travel,
    'performMs', v_perform,
    'planHash', v_hash
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_build_movement_plan(public.pets, text, text)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_recover_stale_actions(p_world_id uuid, p_now bigint)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  UPDATE public.pet_living_action_instances
  SET status = 'cancelled', completed_at_ms = p_now
  WHERE world_id = p_world_id
    AND status IN ('moving', 'performing')
    AND p_now > perform_until_ms + 180000;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_recover_stale_actions(uuid, bigint) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._pet_living_release_offer_inventory(p_offer public.pet_food_offers)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_offer.inventory_reserved AND COALESCE(p_offer.reserved_owner_scope, '') <> '' THEN
    PERFORM public._inventory_adjust_quality(
      p_offer.world_id, p_offer.reserved_owner_scope, p_offer.item_sku, 1, p_offer.quality);
    UPDATE public.pet_food_offers SET inventory_reserved = false WHERE id = p_offer.id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_release_offer_inventory(public.pet_food_offers)
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
    'destTileX', i.dest_tile_x, 'destTileY', i.dest_tile_y, 'pathSteps', i.path_steps
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
  v_scope text;
  v_shared_qty integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_quality NOT IN ('normal', 'silver', 'gold') OR p_ttl_seconds IS NULL OR p_ttl_seconds < 30 OR p_ttl_seconds > 86400 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_item_sku IS NULL OR length(trim(p_item_sku)) = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.item_catalog WHERE sku = p_item_sku) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
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
  SELECT COALESCE(SUM(qty), 0) INTO v_shared_qty
  FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = p_item_sku AND quality = p_quality;
  IF v_shared_qty > 0 THEN
    v_scope := 'shared';
  ELSIF EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = 'user:' || v_uid::text
      AND item_sku = p_item_sku AND quality = p_quality AND qty > 0
  ) THEN
    v_scope := 'user:' || v_uid::text;
  ELSE
    RAISE EXCEPTION 'INSUFFICIENT_ITEMS';
  END IF;
  PERFORM public._inventory_adjust_quality(p_world_id, v_scope, p_item_sku, -1, p_quality);
  v_offer_id := gen_random_uuid();
  INSERT INTO public.pet_food_offers (
    id, world_id, pet_id, caregiver_id, item_sku, quality, expires_at_ms, created_at_ms,
    reserved_owner_scope, inventory_reserved
  )
  VALUES (
    v_offer_id, p_world_id, p_pet_id, v_uid, p_item_sku, p_quality, v_now + p_ttl_seconds * 1000, v_now,
    v_scope, true
  );
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_food_offer_create', p_idempotency_key, v_req,
    jsonb_build_object('offerId', v_offer_id));
  RETURN jsonb_build_object('offerId', v_offer_id, 'snapshot', public.pet_living_get_snapshot(p_world_id));
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
  IF p_response IS NULL OR length(trim(p_response)) = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p_response NOT IN ('cancel') THEN RAISE EXCEPTION 'BRAIN_AUTHORITY_REQUIRED'; END IF;
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
  IF NOT (v_row.status IN ('pending', 'deferred', 'accepted')) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF v_now > v_row.expires_at_ms THEN
    PERFORM public._pet_living_release_offer_inventory(v_row);
    UPDATE public.pet_food_offers SET status = 'expired', responded_at_ms = v_now WHERE id = p_offer_id;
    RAISE EXCEPTION 'OFFER_EXPIRED';
  END IF;
  IF v_row.caregiver_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM public._pet_living_release_offer_inventory(v_row);
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
  IF v_now > v_offer.expires_at_ms THEN
    PERFORM public._pet_living_release_offer_inventory(v_offer);
    UPDATE public.pet_food_offers SET status = 'expired', responded_at_ms = v_now WHERE id = v_offer.id;
    RAISE EXCEPTION 'OFFER_EXPIRED';
  END IF;
  v_vitals := public._pet_catchup_vitals(v_pet.vitals_jsonb, v_pet.sim_state_at_ms, v_now);
  v_hunger := (v_vitals->>'hunger')::integer;
  IF v_hunger >= 88 THEN
    v_outcome := 'refused';
    PERFORM public._pet_living_release_offer_inventory(v_offer);
  ELSIF v_hunger <= 55 AND v_offer.item_sku = 'pet_kibble_basic' THEN
    v_outcome := 'accepted';
  ELSE
    v_outcome := 'deferred';
  END IF;
  UPDATE public.pet_food_offers
  SET status = v_outcome, responded_at_ms = v_now
  WHERE id = v_offer.id;
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
GRANT EXECUTE ON FUNCTION public.pet_food_offer_evaluate(uuid, uuid, text) TO authenticated;

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
  PERFORM public._pet_living_recover_stale_actions(p_world_id, v_now);
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
  v_plan := public._pet_living_build_movement_plan(v_pet, p_action_id, p_target_affordance_id);
  v_travel_ms := (v_plan->>'travelMs')::bigint;
  v_perform_ms := (v_plan->>'performMs')::bigint;
  v_instance := gen_random_uuid();
  INSERT INTO public.pet_living_action_instances (
    id, world_id, pet_id, action_id, target_affordance_id, status,
    started_at_ms, arrive_at_ms, perform_until_ms,
    dest_tile_x, dest_tile_y, path_steps, movement_plan_hash, movement_plan_json
  ) VALUES (
    v_instance, p_world_id, p_pet_id, p_action_id, p_target_affordance_id, 'moving',
    v_now, v_now + v_travel_ms, v_now + v_travel_ms + v_perform_ms,
    (v_plan->>'destTileX')::integer, (v_plan->>'destTileY')::integer,
    (v_plan->>'pathSteps')::integer, v_plan->>'planHash', v_plan
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
  v_stand_x integer;
  v_stand_y integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_proposal IS NULL OR length(btrim(p_proposal)) = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p_proposal NOT IN ('movement_ready', 'animation_finished') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_req := jsonb_build_array(p_instance_id, p_proposal, COALESCE(p_proof, '{}'::jsonb))::text;
  PERFORM public._pet_living_recover_stale_actions(p_world_id, v_now);
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
  IF v_row.status = 'cancelled' THEN RAISE EXCEPTION 'ACTION_STALE'; END IF;
  IF v_row.status = 'completed' AND v_row.consumption_recorded THEN
    v_result := jsonb_build_object('snapshot', public.pet_living_get_snapshot(p_world_id));
    INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
    VALUES (p_world_id, v_uid, 'pet_living_submit_proposal', p_idempotency_key, v_req, v_result);
    RETURN v_result;
  END IF;
  IF v_row.status NOT IN ('moving', 'performing') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;

  IF p_proposal = 'movement_ready' THEN
    IF v_row.dest_tile_x IS NULL OR v_row.dest_tile_y IS NULL THEN RAISE EXCEPTION 'CONSUMPTION_NOT_AUTHORIZED'; END IF;
    IF p_proof IS NULL OR p_proof->>'standTileX' IS NULL OR p_proof->>'standTileY' IS NULL THEN
      RAISE EXCEPTION 'MOVEMENT_PROOF_REQUIRED';
    END IF;
    v_stand_x := (p_proof->>'standTileX')::integer;
    v_stand_y := (p_proof->>'standTileY')::integer;
    IF v_stand_x IS DISTINCT FROM v_row.dest_tile_x OR v_stand_y IS DISTINCT FROM v_row.dest_tile_y THEN
      RAISE EXCEPTION 'MOVEMENT_PROOF_INVALID';
    END IF;
    IF v_now < v_row.arrive_at_ms THEN RAISE EXCEPTION 'MOVEMENT_NOT_READY'; END IF;
    UPDATE public.pet_living_action_instances SET movement_verified = true, status = 'performing'
      WHERE id = p_instance_id;
  ELSE
    IF NOT v_row.movement_verified OR v_now < v_row.perform_until_ms THEN
      RAISE EXCEPTION 'CONSUMPTION_NOT_AUTHORIZED';
    END IF;
    IF v_row.consumption_recorded THEN RAISE EXCEPTION 'ALREADY_CONSUMED'; END IF;
    IF v_row.dest_tile_x IS NULL THEN RAISE EXCEPTION 'CONSUMPTION_NOT_AUTHORIZED'; END IF;
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
GRANT EXECUTE ON FUNCTION public.pet_living_submit_proposal(uuid, uuid, text, text, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.pet_living_submit_proposal(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, service_role;