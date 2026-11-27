-- Store ingredient quality for new workshop jobs and refund the same tiers.
-- Jobs queued before this migration retain their historical normal-quality refund.
CREATE FUNCTION public._farm_debit_with_receipt(p_world_id uuid, p_sku text, p_qty integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_rem integer := p_qty;
  v_tier text;
  v_have integer;
  v_take integer;
  v_reserved jsonb := '[]'::jsonb;
BEGIN
  IF p_qty <= 0 THEN RETURN v_reserved; END IF;
  FOR v_tier IN SELECT unnest(ARRAY['normal', 'silver', 'gold']) LOOP
    EXIT WHEN v_rem <= 0;
    v_have := public._farm_shared_qty(p_world_id, p_sku, v_tier);
    IF v_have > 0 THEN
      v_take := LEAST(v_rem, v_have);
      PERFORM public._inventory_adjust_quality(p_world_id, 'shared', p_sku, -v_take, v_tier);
      v_reserved := v_reserved || jsonb_build_array(jsonb_build_object('sku', p_sku, 'qty', v_take, 'quality', v_tier));
      v_rem := v_rem - v_take;
    END IF;
  END LOOP;
  IF v_rem > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_ITEMS';
  END IF;
  RETURN v_reserved;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_debit_with_receipt(uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_debit_any_quality(p_world_id uuid, p_sku text, p_qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  PERFORM public._farm_debit_with_receipt(p_world_id, p_sku, p_qty);
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_debit_any_quality(uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;

-- Existing quantity predicates only need availability up to the integer ceiling.
CREATE OR REPLACE FUNCTION public._farm_shared_any_qty(p_world_id uuid, p_sku text)
RETURNS integer
LANGUAGE sql STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT LEAST(COALESCE(sum(qty), 0), 2147483647)::integer
  FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = p_sku;
$$;

CREATE OR REPLACE FUNCTION public.farm_apply(
  p_world_id uuid,
  p_plot_index integer,
  p_action text,
  p_seed_sku text,
  p_farm_version integer,
  p_idempotency_key text,
  p_fertilizer_sku text DEFAULT NULL,
  p_sprinkler_sku text DEFAULT NULL,
  p_tool_sku text DEFAULT NULL,
  p_use_environment boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.world_farm_worlds%ROWTYPE;
  v_now bigint := public._farm_now_ms();
  v_plots jsonb;
  v_plot jsonb;
  v_crop jsonb;
  v_new_plots jsonb := '[]'::jsonb;
  v_i integer;
  v_harvested jsonb := '[]'::jsonb;
  v_quality text;
  v_qty integer;
  v_sku text;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_req text;
  v_resp jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_plot_index IS NULL OR p_plot_index < 0 OR p_plot_index >= public._farm_plot_count() THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF NOT public._farm_plot_on_contract_soil(p_plot_index) THEN RAISE EXCEPTION 'INVALID_PLOT'; END IF;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  v_row := public._farm_ensure_row(p_world_id);
  v_row.farm_json := public._farm_expand_plots_if_needed(v_row.farm_json);

  v_req := md5(coalesce(p_action, '') || ':' || p_plot_index::text || ':' || coalesce(p_seed_sku, '') || ':' || coalesce(p_fertilizer_sku, '') || ':' || coalesce(p_sprinkler_sku, ''));
  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
    WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_receipt.response_jsonb;
    END IF;
  END IF;

  IF p_farm_version IS NOT NULL AND p_farm_version <> v_row.version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;

  v_plots := v_row.farm_json->'plots';
  FOR v_i IN 0..(public._farm_plot_count() - 1) LOOP
    v_plot := jsonb_array_element(v_plots, v_i);
    IF v_i = p_plot_index THEN
      IF p_action = 'till' THEN
        IF public._farm_shared_any_qty(p_world_id, 'tool_hoe') < 1
           AND (p_tool_sku IS NULL OR public._farm_shared_any_qty(p_world_id, p_tool_sku) < 1) THEN
          RAISE EXCEPTION 'TOOL_REQUIRED';
        END IF;
        IF v_plot->>'soil' <> 'empty' THEN
          IF v_plot->>'soil' = 'tilled' THEN RAISE EXCEPTION 'ALREADY_TILLED'; END IF;
          RAISE EXCEPTION 'PLOT_OCCUPIED';
        END IF;
        v_plot := jsonb_build_object('plotId', v_i, 'soil', 'tilled')
          || CASE WHEN v_plot ? 'fertilizer' THEN jsonb_build_object('fertilizer', v_plot->'fertilizer') ELSE '{}'::jsonb END
          || CASE WHEN v_plot ? 'sprinkler' THEN jsonb_build_object('sprinkler', v_plot->'sprinkler') ELSE '{}'::jsonb END;
      ELSIF p_action = 'plant' THEN
        IF p_seed_sku IS NULL OR length(trim(p_seed_sku)) = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
        v_sku := CASE WHEN p_seed_sku LIKE 'seed_%' THEN substring(p_seed_sku FROM 6) ELSE NULL END;
        IF v_sku IS NULL THEN RAISE EXCEPTION 'UNKNOWN_SEED'; END IF;
        IF v_plot->>'soil' <> 'tilled' THEN RAISE EXCEPTION 'SOIL_NOT_TILLED'; END IF;
        IF public._farm_shared_qty(p_world_id, p_seed_sku) < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_ITEMS'; END IF;
        PERFORM public._inventory_adjust_quality(p_world_id, 'shared', p_seed_sku, -1, 'normal');
        v_plot := jsonb_build_object(
          'plotId', v_i, 'soil', 'planted',
          'crop', jsonb_build_object(
            'cropSku', v_sku,
            'plantedAtMs', v_now,
            'waterCount', CASE WHEN v_plot ? 'sprinkler' THEN 1 ELSE 0 END,
            'regrowRemaining', 0,
            'isRegrowCycle', false,
            'fertilizer', v_plot->'fertilizer'
          )
        )
        || CASE WHEN v_plot ? 'fertilizer' THEN jsonb_build_object('fertilizer', v_plot->'fertilizer') ELSE '{}'::jsonb END
        || CASE WHEN v_plot ? 'sprinkler' THEN jsonb_build_object('sprinkler', v_plot->'sprinkler') ELSE '{}'::jsonb END;
      ELSIF p_action = 'water' THEN
        IF public._farm_shared_any_qty(p_world_id, 'tool_watering_can') < 1
           AND public._farm_shared_any_qty(p_world_id, 'water_pitcher') < 1
           AND (p_tool_sku IS NULL OR public._farm_shared_any_qty(p_world_id, p_tool_sku) < 1) THEN
          RAISE EXCEPTION 'TOOL_REQUIRED';
        END IF;
        IF v_plot->>'soil' <> 'planted' THEN RAISE EXCEPTION 'NO_CROP'; END IF;
        v_crop := v_plot->'crop';
        IF public._farm_crop_ready(v_crop, v_now) THEN RAISE EXCEPTION 'ALREADY_READY'; END IF;
        IF COALESCE((v_crop->>'waterCount')::integer, 0) >= 1 THEN RAISE EXCEPTION 'ALREADY_WATERED'; END IF;
        v_crop := jsonb_set(v_crop, '{waterCount}', to_jsonb(1));
        v_plot := jsonb_set(v_plot, '{crop}', v_crop);
      ELSIF p_action = 'fertilize' THEN
        IF p_fertilizer_sku IS NULL OR p_fertilizer_sku NOT IN ('fert_compost', 'fert_speed', 'fert_quality', 'fert_deluxe') THEN
          RAISE EXCEPTION 'UNKNOWN_FERTILIZER';
        END IF;
        IF v_plot->>'soil' = 'empty' THEN RAISE EXCEPTION 'SOIL_NOT_TILLED'; END IF;
        PERFORM public._farm_debit_any_quality(p_world_id, p_fertilizer_sku, 1);
        v_plot := jsonb_set(v_plot, '{fertilizer}', to_jsonb(p_fertilizer_sku), true);
        IF v_plot->>'soil' = 'planted' AND v_plot ? 'crop' THEN
          v_crop := jsonb_set(v_plot->'crop', '{fertilizer}', to_jsonb(p_fertilizer_sku), true);
          v_plot := jsonb_set(v_plot, '{crop}', v_crop, true);
        END IF;
      ELSIF p_action = 'place_sprinkler' THEN
        IF p_sprinkler_sku IS NULL OR p_sprinkler_sku NOT IN ('sprinkler_basic', 'sprinkler_quality', 'sprinkler_iridium') THEN
          RAISE EXCEPTION 'UNKNOWN_SPRINKLER';
        END IF;
        IF v_plot ? 'sprinkler' AND v_plot->>'sprinkler' IS NOT NULL THEN
          RAISE EXCEPTION 'SPRINKLER_EXISTS';
        END IF;
        PERFORM public._farm_debit_any_quality(p_world_id, p_sprinkler_sku, 1);
        v_plot := jsonb_set(v_plot, '{sprinkler}', to_jsonb(p_sprinkler_sku), true);
      ELSIF p_action = 'remove_sprinkler' THEN
        IF NOT (v_plot ? 'sprinkler') OR v_plot->>'sprinkler' IS NULL THEN
          RAISE EXCEPTION 'NO_SPRINKLER';
        END IF;
        PERFORM public._inventory_adjust_quality(p_world_id, 'shared', v_plot->>'sprinkler', 1, 'normal');
        v_plot := v_plot - 'sprinkler';
      ELSIF p_action = 'harvest' THEN
        IF v_plot->>'soil' <> 'planted' THEN RAISE EXCEPTION 'NO_CROP'; END IF;
        v_crop := v_plot->'crop';
        IF NOT public._farm_crop_ready(v_crop, v_now) THEN RAISE EXCEPTION 'NOT_READY'; END IF;
        v_sku := v_crop->>'cropSku';
        v_quality := public._farm_roll_quality(v_row.farm_seed, v_i, v_now, COALESCE((v_crop->>'waterCount')::integer, 0));
        v_qty := public._farm_harvest_qty(v_sku);
        PERFORM public._inventory_adjust_quality(p_world_id, 'shared', v_sku, v_qty, v_quality);
        v_harvested := jsonb_build_array(jsonb_build_object('sku', v_sku, 'qty', v_qty, 'quality', v_quality));
        v_plot := jsonb_build_object('plotId', v_i, 'soil', 'empty')
          || CASE WHEN v_plot ? 'sprinkler' THEN jsonb_build_object('sprinkler', v_plot->'sprinkler') ELSE '{}'::jsonb END;
      ELSE
        RAISE EXCEPTION 'VALIDATION_ERROR';
      END IF;
    END IF;
    v_new_plots := v_new_plots || jsonb_build_array(v_plot);
  END LOOP;

  v_row.farm_json := jsonb_set(v_row.farm_json, '{plots}', v_new_plots);
  v_row.version := v_row.version + 1;
  UPDATE public.world_farm_worlds SET farm_json = v_row.farm_json, version = v_row.version, updated_at = now()
  WHERE world_id = p_world_id;
  SELECT * INTO v_row FROM public.world_farm_worlds WHERE world_id = p_world_id;

  v_resp := jsonb_build_object(
    'snapshot', public._farm_snapshot_json(p_world_id, v_row),
    'harvested', CASE WHEN jsonb_array_length(v_harvested) > 0 THEN v_harvested ELSE NULL END
  );

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
    VALUES (p_world_id, v_uid, 'farm_apply', p_idempotency_key, v_req, v_resp)
    ON CONFLICT (world_id, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_resp;
END;
$$;

CREATE OR REPLACE FUNCTION public.farm_apply_deep_action(
  p_world_id uuid,
  p_action jsonb,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.world_farm_worlds%ROWTYPE;
  v_now bigint := public._farm_now_ms();
  v_kind text := COALESCE(p_action->>'kind', '');
  v_expected_ver integer := CASE WHEN p_action ? 'expectedVersion' AND p_action->>'expectedVersion' IS NOT NULL THEN (p_action->>'expectedVersion')::integer ELSE NULL END;
  v_deep jsonb;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_req text := md5(COALESCE(p_action::text, ''));
  v_msg text := 'Đã cập nhật trang trại.';
  v_resp jsonb;
  v_harvested jsonb := NULL;
  v_reward integer := NULL;
  v_slot integer;
  v_sku text;
  v_species text;
  v_animal_id text;
  v_ws_id text;
  v_cost integer;
  v_cycle_ms bigint;
  v_prod_sku text;
  v_arr jsonb;
  v_elem jsonb;
  v_i integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  v_row := public._farm_ensure_deep_state(p_world_id);
  v_deep := v_row.deep_state_json;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
    WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'farm_deep' OR v_receipt.request_hash <> v_req THEN
        RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
      END IF;
      RETURN v_receipt.response_jsonb || jsonb_build_object(
        'snapshot', public._deep_farm_snapshot_json(p_world_id, v_row, v_now),
        'idempotentReplay', true
      );
    END IF;
  END IF;

  IF v_expected_ver IS NOT NULL AND v_expected_ver <> (v_deep->>'version')::integer THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  IF v_kind = 'plant_flower' THEN
    v_slot := (p_action->>'slotIndex')::integer;
    v_sku := regexp_replace(COALESCE(p_action->>'flowerSku', ''), '^seed_', '');
    IF v_slot < 0 OR v_slot >= 40 THEN RAISE EXCEPTION 'INVALID_SLOT'; END IF;
    v_arr := v_deep->'flowerGarden'->'beds';
    IF jsonb_typeof(jsonb_array_element(v_arr, v_slot)) <> 'null' THEN RAISE EXCEPTION 'BED_OCCUPIED'; END IF;
    PERFORM public._farm_debit_any_quality(p_world_id, 'seed_' || v_sku, 1);
    v_arr := jsonb_set(v_arr, ARRAY[v_slot::text], jsonb_build_object(
      'slotIndex', v_slot, 'flowerSku', v_sku, 'plantedAtMs', v_now,
      'wateredPeriod', NULL, 'plantedBy', v_uid::text, 'hybrid', false
    ));
    v_deep := jsonb_set(v_deep, '{flowerGarden,beds}', v_arr);
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_deep->'flowerGarden'->'discovered') t WHERE t = v_sku) THEN
      v_deep := jsonb_set(v_deep, '{flowerGarden,discovered}', (v_deep->'flowerGarden'->'discovered') || jsonb_build_array(v_sku));
    END IF;
    v_msg := 'Đã trồng hoa xuống bồn.';

  ELSIF v_kind = 'water_flower' THEN
    v_slot := (p_action->>'slotIndex')::integer;
    v_arr := v_deep->'flowerGarden'->'beds';
    v_elem := jsonb_array_element(v_arr, v_slot);
    IF jsonb_typeof(v_elem) = 'null' THEN RAISE EXCEPTION 'EMPTY_BED'; END IF;
    v_elem := jsonb_set(v_elem, '{wateredPeriod}', to_jsonb(floor(v_now::numeric / 21600000)::bigint));
    v_deep := jsonb_set(v_deep, ARRAY['flowerGarden','beds',v_slot::text], v_elem);
    v_msg := 'Đã tưới bồn hoa.';

  ELSIF v_kind = 'harvest_flower' THEN
    v_slot := (p_action->>'slotIndex')::integer;
    v_arr := v_deep->'flowerGarden'->'beds';
    v_elem := jsonb_array_element(v_arr, v_slot);
    IF jsonb_typeof(v_elem) = 'null' THEN RAISE EXCEPTION 'EMPTY_BED'; END IF;
    v_sku := v_elem->>'flowerSku';
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', v_sku, 1, 'normal');
    v_arr := jsonb_set(v_arr, ARRAY[v_slot::text], 'null'::jsonb);
    v_deep := jsonb_set(v_deep, '{flowerGarden,beds}', v_arr);
    v_harvested := jsonb_build_array(jsonb_build_object('sku', v_sku, 'qty', 1, 'quality', 'normal'));
    v_msg := 'Đã hái hoa vào kho chung.';

  ELSIF v_kind = 'plant_tree' THEN
    v_slot := (p_action->>'slotIndex')::integer;
    v_sku := COALESCE(p_action->>'saplingSku', '');
    IF v_slot < 0 OR v_slot >= 12 THEN RAISE EXCEPTION 'INVALID_SLOT'; END IF;
    IF NOT (v_sku LIKE 'sapling_%') THEN RAISE EXCEPTION 'UNKNOWN_SAPLING'; END IF;
    IF jsonb_typeof(jsonb_array_element(v_deep->'orchard'->'slots', v_slot)) <> 'null' THEN RAISE EXCEPTION 'SLOT_OCCUPIED'; END IF;
    PERFORM public._farm_debit_any_quality(p_world_id, v_sku, 1);
    v_elem := jsonb_build_object(
      'slotIndex', v_slot, 'treeId', substring(v_sku FROM 9), 'plantedAtMs', v_now,
      'matureAtMs', v_now + 7200000, 'nextReadyAtMs', v_now + 7200000,
      'harvestsCount', 0, 'plantedBy', v_uid::text
    );
    v_deep := jsonb_set(v_deep, ARRAY['orchard','slots',v_slot::text], v_elem);
    v_msg := 'Đã trồng cây ăn quả lâu năm.';

  ELSIF v_kind = 'harvest_tree' THEN
    v_slot := (p_action->>'slotIndex')::integer;
    v_elem := jsonb_array_element(v_deep->'orchard'->'slots', v_slot);
    IF jsonb_typeof(v_elem) = 'null' THEN RAISE EXCEPTION 'NO_TREE'; END IF;
    IF v_now < (v_elem->>'nextReadyAtMs')::bigint THEN RAISE EXCEPTION 'NOT_READY'; END IF;
    v_sku := CASE WHEN v_elem->>'treeId' = 'cocoa' THEN 'cocoa_bean' ELSE v_elem->>'treeId' END;
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', v_sku, 3, 'normal');
    v_elem := jsonb_set(v_elem, '{nextReadyAtMs}', to_jsonb(v_now + 3600000));
    v_elem := jsonb_set(v_elem, '{harvestsCount}', to_jsonb(COALESCE((v_elem->>'harvestsCount')::integer, 0) + 1));
    v_deep := jsonb_set(v_deep, ARRAY['orchard','slots',v_slot::text], v_elem);
    v_harvested := jsonb_build_array(jsonb_build_object('sku', v_sku, 'qty', 3, 'quality', 'normal'));
    v_msg := 'Đã thu hoạch trái cây vào kho chung.';

  ELSIF v_kind = 'uproot_tree' THEN
    v_slot := (p_action->>'slotIndex')::integer;
    v_elem := jsonb_array_element(v_deep->'orchard'->'slots', v_slot);
    IF jsonb_typeof(v_elem) = 'null' THEN RAISE EXCEPTION 'NO_TREE'; END IF;
    v_sku := 'sapling_' || (v_elem->>'treeId');
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', v_sku, 1, 'normal');
    v_deep := jsonb_set(v_deep, ARRAY['orchard','slots',v_slot::text], 'null'::jsonb);
    v_msg := 'Đã bứng gọn cây non trả lại vào kho.';

  ELSIF v_kind = 'adopt_livestock' THEN
    v_species := COALESCE(p_action->>'speciesId', '');
    v_cost := CASE v_species
      WHEN 'chicken' THEN 150 WHEN 'duck' THEN 280 WHEN 'cow' THEN 420
      WHEN 'goat' THEN 520 WHEN 'sheep' THEN 560 WHEN 'rabbit' THEN 480
      WHEN 'bee' THEN 380 ELSE 0 END;
    v_cycle_ms := CASE v_species
      WHEN 'chicken' THEN 720000 WHEN 'duck' THEN 1500000 WHEN 'cow' THEN 2400000
      WHEN 'goat' THEN 2700000 WHEN 'sheep' THEN 3600000 WHEN 'rabbit' THEN 3000000
      ELSE 2100000 END;
    IF v_cost <= 0 THEN RAISE EXCEPTION 'UNKNOWN_SPECIES'; END IF;
    IF jsonb_array_length(v_deep->'livestock'->'animals') >= 14 THEN RAISE EXCEPTION 'BARN_FULL'; END IF;
    IF v_row.coins < v_cost THEN RAISE EXCEPTION 'INSUFFICIENT_FUNDS'; END IF;
    v_row.coins := v_row.coins - v_cost;
    v_i := COALESCE((v_deep->'livestock'->>'nextSeq')::integer, 1);
    v_animal_id := format('ls_%s_%s', v_species, v_i);
    v_elem := jsonb_build_object(
      'animalId', v_animal_id, 'speciesId', v_species,
      'nickname', COALESCE(NULLIF(trim(p_action->>'nickname'), ''), v_species || ' #' || v_i::text),
      'adoptedAtMs', v_now, 'adoptedBy', v_uid::text, 'happiness', 70, 'lastCareAtMs', v_now,
      'fedAtMs', CASE WHEN v_species = 'bee' THEN v_now ELSE NULL END,
      'readyAtMs', CASE WHEN v_species = 'bee' THEN v_now + v_cycle_ms ELSE NULL END,
      'deluxeFed', false, 'petCalendarDay', 0, 'petByActors', '[]'::jsonb, 'collectionsCount', 0
    );
    v_deep := jsonb_set(v_deep, '{livestock,animals}', (v_deep->'livestock'->'animals') || jsonb_build_array(v_elem));
    v_deep := jsonb_set(v_deep, '{livestock,nextSeq}', to_jsonb(v_i + 1));
    v_msg := 'Đã đón thêm vật nuôi mới.';

  ELSIF v_kind = 'feed_livestock' THEN
    v_animal_id := COALESCE(p_action->>'animalId', '');
    v_sku := COALESCE(p_action->>'feedSku', '');
    PERFORM public._farm_debit_any_quality(p_world_id, v_sku, 1);
    v_arr := '[]'::jsonb;
    FOR v_elem IN SELECT jsonb_array_elements(v_deep->'livestock'->'animals') LOOP
      IF v_elem->>'animalId' = v_animal_id THEN
        v_species := v_elem->>'speciesId';
        v_cycle_ms := CASE v_species WHEN 'chicken' THEN 720000 WHEN 'duck' THEN 1500000 WHEN 'cow' THEN 2400000 WHEN 'goat' THEN 2700000 WHEN 'sheep' THEN 3600000 ELSE 3000000 END;
        v_elem := v_elem || jsonb_build_object('fedAtMs', v_now, 'readyAtMs', v_now + v_cycle_ms, 'lastCareAtMs', v_now, 'deluxeFed', v_sku = 'feed_deluxe');
      END IF;
      v_arr := v_arr || jsonb_build_array(v_elem);
    END LOOP;
    v_deep := jsonb_set(v_deep, '{livestock,animals}', v_arr);
    v_msg := 'Đã cho vật nuôi ăn.';

  ELSIF v_kind = 'pet_livestock' THEN
    v_animal_id := COALESCE(p_action->>'animalId', '');
    v_arr := '[]'::jsonb;
    FOR v_elem IN SELECT jsonb_array_elements(v_deep->'livestock'->'animals') LOOP
      IF v_elem->>'animalId' = v_animal_id THEN
        v_elem := jsonb_set(v_elem, '{happiness}', to_jsonb(LEAST(100, GREATEST(30, COALESCE((v_elem->>'happiness')::integer, 70) + 12))));
        v_elem := jsonb_set(v_elem, '{lastCareAtMs}', to_jsonb(v_now));
      END IF;
      v_arr := v_arr || jsonb_build_array(v_elem);
    END LOOP;
    v_deep := jsonb_set(v_deep, '{livestock,animals}', v_arr);
    v_msg := 'Đã vuốt ve vật nuôi.';

  ELSIF v_kind = 'collect_livestock' THEN
    v_animal_id := COALESCE(p_action->>'animalId', '');
    v_arr := '[]'::jsonb;
    FOR v_elem IN SELECT jsonb_array_elements(v_deep->'livestock'->'animals') LOOP
      IF v_elem->>'animalId' = v_animal_id THEN
        IF v_elem->>'readyAtMs' IS NULL OR v_now < (v_elem->>'readyAtMs')::bigint THEN RAISE EXCEPTION 'NOT_READY'; END IF;
        v_species := v_elem->>'speciesId';
        v_prod_sku := CASE v_species
          WHEN 'chicken' THEN 'egg' WHEN 'duck' THEN 'duck_egg' WHEN 'cow' THEN 'milk'
          WHEN 'goat' THEN 'goat_milk' WHEN 'sheep' THEN 'wool' WHEN 'rabbit' THEN 'angora_wool'
          ELSE 'honey' END;
        PERFORM public._inventory_adjust_quality(p_world_id, 'shared', v_prod_sku, 2, 'normal');
        v_harvested := jsonb_build_array(jsonb_build_object('sku', v_prod_sku, 'qty', 2, 'quality', 'normal'));
        v_elem := v_elem || jsonb_build_object(
          'fedAtMs', CASE WHEN v_species = 'bee' THEN v_now ELSE NULL END,
          'readyAtMs', CASE WHEN v_species = 'bee' THEN v_now + 2100000 ELSE NULL END,
          'deluxeFed', false,
          'collectionsCount', COALESCE((v_elem->>'collectionsCount')::integer, 0) + 1
        );
      END IF;
      v_arr := v_arr || jsonb_build_array(v_elem);
    END LOOP;
    v_deep := jsonb_set(v_deep, '{livestock,animals}', v_arr);
    v_msg := 'Đã thu sản phẩm chuồng trại.';

  ELSIF v_kind = 'upgrade_workshop' THEN
    v_ws_id := COALESCE(p_action->>'workshopId', '');
    v_i := COALESCE((v_deep->'workshops'->'stations'->v_ws_id->>'level')::integer, 1);
    IF v_i >= 3 THEN RAISE EXCEPTION 'MAX_LEVEL'; END IF;
    v_cost := CASE WHEN v_i = 1 THEN 600 ELSE 1400 END;
    IF v_row.coins < v_cost THEN RAISE EXCEPTION 'INSUFFICIENT_FUNDS'; END IF;
    v_row.coins := v_row.coins - v_cost;
    v_deep := jsonb_set(v_deep, ARRAY['workshops','stations',v_ws_id,'level'], to_jsonb(v_i + 1));
    v_msg := format('Đã nâng cấp xưởng lên cấp %s.', v_i + 1);

  ELSIF v_kind = 'complete_order' THEN
    v_sku := COALESCE(p_action->>'orderId', '');
    IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_deep->'orderBoard'->'completedOrderIds') t WHERE t = v_sku) THEN
      RAISE EXCEPTION 'ORDER_ALREADY_COMPLETED';
    END IF;
    v_arr := '[]'::jsonb;
    FOR v_elem IN SELECT jsonb_array_elements(v_deep->'orderBoard'->'orders') LOOP
      IF jsonb_typeof(v_elem) <> 'null' AND v_elem->>'orderId' = v_sku THEN
        DECLARE v_line jsonb;
        BEGIN
          FOR v_line IN SELECT jsonb_array_elements(v_elem->'requirements') LOOP
            PERFORM public._farm_debit_any_quality(p_world_id, v_line->>'sku', (v_line->>'qty')::integer);
          END LOOP;
          v_reward := (v_elem->>'rewardCoins')::integer;
          v_row.coins := v_row.coins + v_reward;
          v_arr := v_arr || jsonb_build_array('null'::jsonb);
        END;
      ELSE
        v_arr := v_arr || jsonb_build_array(v_elem);
      END IF;
    END LOOP;
    IF v_reward IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
    v_deep := jsonb_set(v_deep, '{orderBoard,orders}', v_arr);
    v_deep := jsonb_set(v_deep, '{orderBoard,completedOrderIds}', (v_deep->'orderBoard'->'completedOrderIds') || jsonb_build_array(v_sku));
    v_msg := format('Hoàn thành đơn làng (+%s xu).', v_reward);

  ELSIF v_kind = 'crossbreed_flowers' THEN
    DECLARE
      v_period bigint := floor(GREATEST(0, v_now)::numeric / 21600000)::bigint;
      v_last_period text := v_deep->'flowerGarden'->>'lastBreedPeriod';
      v_beds jsonb := v_deep->'flowerGarden'->'beds';
      v_idx integer;
      v_b jsonb;
    BEGIN
      IF v_last_period IS NULL OR v_last_period::bigint < v_period THEN
        v_deep := jsonb_set(v_deep, '{flowerGarden,lastBreedPeriod}', to_jsonb(v_period), true);
        -- Deterministic bloom clone/sprout into first open neighbor when pair or lone flower sits watered
        FOR v_idx IN 0..38 LOOP
          v_b := jsonb_array_element(v_beds, v_idx);
          IF jsonb_typeof(v_b) <> 'null' AND v_b ? 'wateredPeriod' AND v_b->>'wateredPeriod' IS NOT NULL THEN
            IF jsonb_typeof(jsonb_array_element(v_beds, v_idx + 1)) = 'null' AND ((abs(v_row.farm_seed) + v_idx + v_period::integer) % 3 = 0) THEN
              v_sku := v_b->>'flowerSku';
              v_beds := jsonb_set(v_beds, ARRAY[(v_idx + 1)::text], jsonb_build_object(
                'slotIndex', v_idx + 1, 'flowerSku', v_sku, 'plantedAtMs', v_now,
                'wateredPeriod', NULL, 'plantedBy', 'hybrid-garden', 'hybrid', false
              ));
              v_deep := jsonb_set(v_deep, '{flowerGarden,beds}', v_beds);
              EXIT;
            END IF;
          END IF;
        END LOOP;
      END IF;
      v_msg := 'Đã đồng bộ nhịp thụ phấn vườn hoa.';
    END;

  ELSIF v_kind = 'queue_workshop' THEN
    DECLARE
      v_recipe public.workshop_recipes%ROWTYPE;
      v_lvl integer;
      v_cap integer;
      v_q jsonb;
      v_req_line jsonb;
      v_reserved jsonb := '[]'::jsonb;
      v_last_end bigint;
      v_start bigint;
      v_dur bigint;
      v_seq integer;
      v_job jsonb;
    BEGIN
      v_ws_id := COALESCE(p_action->>'workshopId', '');
      v_sku := COALESCE(p_action->>'recipeId', '');
      SELECT * INTO v_recipe FROM public.workshop_recipes WHERE recipe_id = v_sku AND workshop_id = v_ws_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'UNKNOWN_RECIPE'; END IF;
      v_lvl := COALESCE((v_deep->'workshops'->'stations'->v_ws_id->>'level')::integer, 1);
      v_cap := LEAST(CASE WHEN v_ws_id = 'feed_mill' THEN 8 ELSE 6 END, CASE WHEN v_ws_id = 'feed_mill' THEN 3 ELSE 2 END + (v_lvl - 1) * 2);
      v_q := COALESCE(v_deep->'workshops'->'stations'->v_ws_id->'queue', '[]'::jsonb);
      IF jsonb_array_length(v_q) >= v_cap THEN RAISE EXCEPTION 'QUEUE_FULL'; END IF;
      FOR v_req_line IN SELECT jsonb_array_elements(v_recipe.inputs) LOOP
        v_reserved := v_reserved || public._farm_debit_with_receipt(p_world_id, v_req_line->>'sku', (v_req_line->>'qty')::integer);
      END LOOP;
      IF jsonb_array_length(v_q) > 0 THEN
        v_last_end := ((v_q->(jsonb_array_length(v_q) - 1))->>'endMs')::bigint;
      ELSE
        v_last_end := v_now;
      END IF;
      v_start := GREATEST(v_now, v_last_end);
      v_dur := GREATEST(10000, round(v_recipe.craft_ms::numeric * CASE v_lvl WHEN 3 THEN 7000 WHEN 2 THEN 8500 ELSE 10000 END / 10000)::bigint);
      v_seq := COALESCE((v_deep->'workshops'->>'nextJobSeq')::integer, 1);
      v_job := jsonb_build_object(
        'jobId', format('job_%s_%s', v_ws_id, v_seq),
        'recipeId', v_recipe.recipe_id,
        'outputSku', v_recipe.output_sku,
        'outputQty', v_recipe.output_qty,
        'startMs', v_start,
        'endMs', v_start + v_dur,
        'startedBy', v_uid::text,
        'reservedInputs', v_reserved
      );
      v_deep := jsonb_set(v_deep, ARRAY['workshops','stations',v_ws_id,'queue'], v_q || jsonb_build_array(v_job));
      v_deep := jsonb_set(v_deep, '{workshops,nextJobSeq}', to_jsonb(v_seq + 1));
      v_msg := 'Đã đưa công thức vào hàng đợi xưởng.';
    END;

  ELSIF v_kind = 'cancel_workshop' THEN
    DECLARE
      v_job_id text := COALESCE(p_action->>'jobId', '');
      v_q jsonb;
      v_new_q jsonb := '[]'::jsonb;
      v_found boolean := false;
      v_recipe public.workshop_recipes%ROWTYPE;
      v_refund jsonb;
      v_cursor bigint := v_now;
      v_st bigint;
      v_en bigint;
      v_dur bigint;
    BEGIN
      v_ws_id := COALESCE(p_action->>'workshopId', '');
      v_q := COALESCE(v_deep->'workshops'->'stations'->v_ws_id->'queue', '[]'::jsonb);
      FOR v_elem IN SELECT jsonb_array_elements(v_q) LOOP
        IF NOT v_found AND v_elem->>'jobId' = v_job_id THEN
          IF v_now >= (v_elem->>'endMs')::bigint THEN RAISE EXCEPTION 'ALREADY_FINISHED'; END IF;
          v_found := true;
          SELECT * INTO v_recipe FROM public.workshop_recipes WHERE recipe_id = v_elem->>'recipeId';
          FOR v_refund IN SELECT jsonb_array_elements(COALESCE(v_elem->'reservedInputs', v_recipe.inputs, '[]'::jsonb)) LOOP
            PERFORM public._inventory_adjust_quality(
              p_world_id, 'shared', v_refund->>'sku', (v_refund->>'qty')::integer,
              COALESCE(v_refund->>'quality', 'normal')
            );
          END LOOP;
        ELSE
          v_st := (v_elem->>'startMs')::bigint;
          v_en := (v_elem->>'endMs')::bigint;
          IF v_st <= v_now THEN
            v_new_q := v_new_q || jsonb_build_array(v_elem);
            v_cursor := GREATEST(v_cursor, v_en);
          ELSE
            v_dur := GREATEST(10000, v_en - v_st);
            v_st := GREATEST(v_now, v_cursor);
            v_en := v_st + v_dur;
            v_new_q := v_new_q || jsonb_build_array(v_elem || jsonb_build_object('startMs', v_st, 'endMs', v_en));
            v_cursor := v_en;
          END IF;
        END IF;
      END LOOP;
      IF NOT v_found THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
      v_deep := jsonb_set(v_deep, ARRAY['workshops','stations',v_ws_id,'queue'], v_new_q);
      v_msg := 'Đã hủy đơn chế biến và hoàn lại nguyên liệu.';
    END;

  ELSIF v_kind = 'collect_workshop' THEN
    DECLARE
      v_q jsonb;
      v_kept jsonb := '[]'::jsonb;
      v_count integer := 0;
    BEGIN
      v_ws_id := COALESCE(p_action->>'workshopId', '');
      v_q := COALESCE(v_deep->'workshops'->'stations'->v_ws_id->'queue', '[]'::jsonb);
      v_harvested := '[]'::jsonb;
      FOR v_elem IN SELECT jsonb_array_elements(v_q) LOOP
        IF v_now >= (v_elem->>'endMs')::bigint THEN
          PERFORM public._inventory_adjust_quality(
            p_world_id, 'shared', v_elem->>'outputSku', (v_elem->>'outputQty')::integer, 'normal'
          );
          v_harvested := v_harvested || jsonb_build_array(jsonb_build_object(
            'sku', v_elem->>'outputSku', 'qty', (v_elem->>'outputQty')::integer, 'quality', 'normal'
          ));
          v_count := v_count + 1;
        ELSE
          v_kept := v_kept || jsonb_build_array(v_elem);
        END IF;
      END LOOP;
      IF v_count = 0 THEN RAISE EXCEPTION 'NONE_READY'; END IF;
      v_deep := jsonb_set(v_deep, ARRAY['workshops','stations',v_ws_id,'queue'], v_kept);
      v_msg := 'Đã nhận thành phẩm từ xưởng chế biến.';
    END;
  ELSE
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  v_deep := jsonb_set(v_deep, '{version}', to_jsonb(COALESCE((v_deep->>'version')::integer, 1) + 1));
  UPDATE public.world_farm_worlds
  SET deep_state_json = v_deep, coins = v_row.coins, updated_at = now()
  WHERE world_id = p_world_id
  RETURNING * INTO v_row;

  v_resp := jsonb_build_object(
    'snapshot', public._deep_farm_snapshot_json(p_world_id, v_row, v_now),
    'messageVi', v_msg
  );
  IF v_harvested IS NOT NULL THEN v_resp := v_resp || jsonb_build_object('harvestedItems', v_harvested); END IF;
  IF v_reward IS NOT NULL THEN v_resp := v_resp || jsonb_build_object('rewardCoins', v_reward); END IF;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
    VALUES (p_world_id, v_uid, 'farm_deep', p_idempotency_key, v_req, v_resp)
    ON CONFLICT (world_id, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_resp;
END;
$$;
GRANT EXECUTE ON FUNCTION public.farm_apply_deep_action(uuid, jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.farm_apply_deep_action(uuid, jsonb, text) FROM PUBLIC, anon, service_role;
