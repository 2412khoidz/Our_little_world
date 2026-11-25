-- Extend farm authority to full farmPlotContract grid (184 plots).

ALTER TABLE public.world_farm_worlds
  DROP CONSTRAINT IF EXISTS world_farm_worlds_plot_binding_check;

ALTER TABLE public.world_farm_worlds
  ALTER COLUMN plot_binding SET DEFAULT 'farm_main:0-119,farm_annex:0-63';

UPDATE public.world_farm_worlds
SET plot_binding = 'farm_main:0-119,farm_annex:0-63'
WHERE plot_binding = 'farm_main:0-23';

CREATE OR REPLACE FUNCTION public._farm_plot_count()
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$ SELECT 184; $$;

CREATE OR REPLACE FUNCTION public._farm_empty_plots()
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_plots jsonb := '[]'::jsonb; i integer;
BEGIN
  FOR i IN 0..(public._farm_plot_count() - 1) LOOP
    v_plots := v_plots || jsonb_build_array(jsonb_build_object('plotId', i, 'soil', 'empty'));
  END LOOP;
  RETURN v_plots;
END;
$$;

CREATE OR REPLACE FUNCTION public._farm_plot_tile(p_plot_index integer, OUT tile_x integer, OUT tile_y integer)
RETURNS record
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_local integer;
BEGIN
  tile_x := NULL; tile_y := NULL;
  IF p_plot_index IS NULL OR p_plot_index < 0 OR p_plot_index >= public._farm_plot_count() THEN RETURN; END IF;
  IF p_plot_index < 120 THEN
    v_local := p_plot_index;
    tile_x := 16 + (v_local % 12);
    tile_y := 10 + (v_local / 12);
  ELSE
    v_local := p_plot_index - 120;
    tile_x := 40 + (v_local % 8);
    tile_y := 28 + (v_local / 8);
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_plot_tile(integer) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_plot_on_contract_soil(p_plot_index integer)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_t record;
BEGIN
  SELECT * INTO v_t FROM public._farm_plot_tile(p_plot_index);
  IF v_t.tile_x IS NULL THEN RETURN false; END IF;
  IF v_t.tile_x >= 16 AND v_t.tile_x < 28 AND v_t.tile_y >= 10 AND v_t.tile_y < 20 THEN RETURN true; END IF;
  IF v_t.tile_x >= 40 AND v_t.tile_x < 48 AND v_t.tile_y >= 28 AND v_t.tile_y < 36 THEN RETURN true; END IF;
  RETURN false;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_plot_on_contract_soil(integer) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_expand_plots_if_needed(p_farm jsonb)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_plots jsonb; v_len integer; v_i integer; v_plot jsonb;
BEGIN
  v_plots := COALESCE(p_farm->'plots', '[]'::jsonb);
  v_len := jsonb_array_length(v_plots);
  IF v_len >= public._farm_plot_count() THEN RETURN p_farm; END IF;
  FOR v_i IN v_len..(public._farm_plot_count() - 1) LOOP
    v_plots := v_plots || jsonb_build_array(jsonb_build_object('plotId', v_i, 'soil', 'empty'));
  END LOOP;
  RETURN jsonb_set(p_farm, '{plots}', v_plots);
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_expand_plots_if_needed(jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_ensure_row(p_world_id uuid)
RETURNS public.world_farm_worlds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_row public.world_farm_worlds%ROWTYPE; v_seed integer;
BEGIN
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  SELECT * INTO v_row FROM public.world_farm_worlds WHERE world_id = p_world_id;
  IF FOUND THEN
    v_row.farm_json := public._farm_expand_plots_if_needed(v_row.farm_json);
    UPDATE public.world_farm_worlds SET farm_json = v_row.farm_json WHERE world_id = p_world_id;
    RETURN v_row;
  END IF;
  v_seed := (random() * 2147483647)::integer;
  INSERT INTO public.world_farm_worlds (world_id, farm_seed, farm_json, coins, plot_binding)
  VALUES (
    p_world_id, v_seed,
    jsonb_build_object('seed', v_seed, 'plots', public._farm_empty_plots()),
    50, 'farm_main:0-119,farm_annex:0-63',
  )
  RETURNING * INTO v_row;
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'tool_hoe', 1);
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'tool_watering_can', 1);
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'water_pitcher', 1);
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'seed_wheat', 5);
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'seed_carrot', 2);
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.farm_apply(
  p_world_id uuid,
  p_plot_index integer,
  p_action text,
  p_seed_sku text,
  p_farm_version integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid(); v_row public.world_farm_worlds%ROWTYPE;
  v_now bigint := public._farm_now_ms();
  v_plots jsonb; v_plot jsonb; v_crop jsonb; v_new_plots jsonb := '[]'::jsonb;
  v_i integer; v_harvested jsonb := '[]'::jsonb; v_quality text; v_qty integer; v_sku text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_plot_index IS NULL OR p_plot_index < 0 OR p_plot_index >= public._farm_plot_count() THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF NOT public._farm_plot_on_contract_soil(p_plot_index) THEN RAISE EXCEPTION 'INVALID_PLOT'; END IF;
  v_row := public._farm_ensure_row(p_world_id);
  v_row.farm_json := public._farm_expand_plots_if_needed(v_row.farm_json);
  IF p_farm_version IS NOT NULL AND p_farm_version <> v_row.version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;
  v_plots := v_row.farm_json->'plots';
  FOR v_i IN 0..(public._farm_plot_count() - 1) LOOP
    v_plot := jsonb_array_element(v_plots, v_i);
    IF v_i = p_plot_index THEN
      IF p_action = 'till' THEN
        IF public._farm_shared_qty(p_world_id, 'tool_hoe') < 1 THEN RAISE EXCEPTION 'TOOL_REQUIRED'; END IF;
        IF v_plot->>'soil' <> 'empty' THEN
          IF v_plot->>'soil' = 'tilled' THEN RAISE EXCEPTION 'ALREADY_TILLED'; END IF;
          RAISE EXCEPTION 'PLOT_OCCUPIED';
        END IF;
        v_plot := jsonb_build_object('plotId', v_i, 'soil', 'tilled');
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
            'cropSku', v_sku, 'plantedAtMs', v_now, 'waterCount', 0, 'regrowRemaining', 0, 'isRegrowCycle', false
          )
        );
      ELSIF p_action = 'water' THEN
        IF public._farm_shared_qty(p_world_id, 'tool_watering_can') < 1
           AND public._farm_shared_qty(p_world_id, 'water_pitcher') < 1 THEN
          RAISE EXCEPTION 'TOOL_REQUIRED';
        END IF;
        IF v_plot->>'soil' <> 'planted' THEN RAISE EXCEPTION 'NO_CROP'; END IF;
        v_crop := v_plot->'crop';
        IF public._farm_crop_ready(v_crop, v_now) THEN RAISE EXCEPTION 'ALREADY_READY'; END IF;
        IF COALESCE((v_crop->>'waterCount')::integer, 0) >= 1 THEN RAISE EXCEPTION 'ALREADY_WATERED'; END IF;
        v_crop := jsonb_set(v_crop, '{waterCount}', to_jsonb(1));
        v_plot := jsonb_set(v_plot, '{crop}', v_crop);
      ELSIF p_action = 'harvest' THEN
        IF v_plot->>'soil' <> 'planted' THEN RAISE EXCEPTION 'NO_CROP'; END IF;
        v_crop := v_plot->'crop';
        IF NOT public._farm_crop_ready(v_crop, v_now) THEN RAISE EXCEPTION 'NOT_READY'; END IF;
        v_sku := v_crop->>'cropSku';
        v_quality := public._farm_roll_quality(v_row.farm_seed, v_i, v_now, COALESCE((v_crop->>'waterCount')::integer, 0));
        v_qty := public._farm_harvest_qty(v_sku);
        PERFORM public._inventory_adjust_quality(p_world_id, 'shared', v_sku, v_qty, v_quality);
        v_harvested := jsonb_build_array(jsonb_build_object('sku', v_sku, 'qty', v_qty, 'quality', v_quality));
        v_plot := jsonb_build_object('plotId', v_i, 'soil', 'empty');
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
  RETURN jsonb_build_object(
    'snapshot', public._farm_snapshot_json(p_world_id, v_row),
    'harvested', CASE WHEN jsonb_array_length(v_harvested) > 0 THEN v_harvested ELSE NULL END
  );
END;
$$;