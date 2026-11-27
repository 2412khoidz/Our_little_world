-- Mission 05: farm wallet + plot state + shop/shipping bin (Dev LAN parity slice).
-- Plot binding: farmPlotContract v1.0.0, indices 0..23 → farm_main_{n}.

INSERT INTO public.item_catalog (sku, name_vi, description_vi, purpose, stack_limit, tradeable) VALUES
  ('tool_hoe', 'Cuốc', '', 'ingredient', 1, false),
  ('tool_watering_can', 'Bình tưới', '', 'ingredient', 1, false),
  ('water_pitcher', 'Bình nước', '', 'ingredient', 1, false)
ON CONFLICT (sku) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.world_farm_worlds (
  world_id uuid PRIMARY KEY REFERENCES public.worlds(id) ON DELETE CASCADE,
  contract_version text NOT NULL DEFAULT '1.0.0' CHECK (contract_version = '1.0.0'),
  plot_binding text NOT NULL DEFAULT 'farm_main:0-23',
  farm_seed integer NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  farm_json jsonb NOT NULL,
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  shipping_day_index integer NOT NULL DEFAULT 0,
  shipping_sold_by_group jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.world_farm_worlds ENABLE ROW LEVEL SECURITY;

CREATE POLICY world_farm_worlds_select ON public.world_farm_worlds
  FOR SELECT TO authenticated
  USING (public.is_world_member(world_id));

REVOKE INSERT, UPDATE, DELETE ON public.world_farm_worlds FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._farm_now_ms()
RETURNS bigint
LANGUAGE sql STABLE
SET search_path = pg_catalog, pg_temp
AS $$ SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint; $$;
REVOKE EXECUTE ON FUNCTION public._farm_now_ms() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_vn_day_index(p_now_ms bigint)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT floor((p_now_ms + 25200000)::numeric / 86400000)::integer;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_vn_day_index(bigint) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_empty_plots()
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_plots jsonb := '[]'::jsonb; i integer;
BEGIN
  FOR i IN 0..23 LOOP
    v_plots := v_plots || jsonb_build_array(jsonb_build_object('plotId', i, 'soil', 'empty'));
  END LOOP;
  RETURN v_plots;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_empty_plots() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_shared_qty(p_world_id uuid, p_sku text, p_quality text DEFAULT 'normal')
RETURNS integer
LANGUAGE sql STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE(sum(qty), 0)::integer FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = p_sku AND quality = p_quality;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_shared_qty(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_quality_mul_bp(p_quality text)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE p_quality WHEN 'silver' THEN 12500 WHEN 'gold' THEN 15500 ELSE 10000 END; $$;
REVOKE EXECUTE ON FUNCTION public._farm_quality_mul_bp(text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_sell_unit_coins(p_sku text, p_quality text)
RETURNS integer
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_base integer;
BEGIN
  v_base := CASE p_sku
    WHEN 'wheat' THEN 8 WHEN 'carrot' THEN 15 WHEN 'tomato' THEN 13 WHEN 'strawberry' THEN 18
    WHEN 'sunflower' THEN 25 WHEN 'cabbage' THEN 16 WHEN 'rose_pink' THEN 30 ELSE 0 END;
  IF v_base <= 0 THEN RETURN 0; END IF;
  RETURN floor(v_base::numeric * public._farm_quality_mul_bp(p_quality) / 10000)::integer;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_sell_unit_coins(text, text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_seed_buy_price(p_seed_sku text)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE p_seed_sku
  WHEN 'seed_wheat' THEN 4 WHEN 'seed_carrot' THEN 8 WHEN 'seed_tomato' THEN 14
  WHEN 'seed_strawberry' THEN 22 WHEN 'seed_sunflower' THEN 16 WHEN 'seed_cabbage' THEN 26
  ELSE 0 END; $$;
REVOKE EXECUTE ON FUNCTION public._farm_seed_buy_price(text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_crop_grow_ms(p_crop text)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE p_crop
  WHEN 'wheat' THEN 300000 WHEN 'carrot' THEN 900000 WHEN 'tomato' THEN 2700000
  WHEN 'strawberry' THEN 5400000 WHEN 'sunflower' THEN 3600000 WHEN 'cabbage' THEN 7200000
  ELSE 300000 END; $$;

CREATE OR REPLACE FUNCTION public._farm_crop_from_seed(p_seed text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE WHEN p_seed LIKE 'seed_%' THEN substring(p_seed FROM 6) ELSE NULL END; $$;

CREATE OR REPLACE FUNCTION public._farm_harvest_qty(p_crop text)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE p_crop WHEN 'tomato' THEN 2 WHEN 'strawberry' THEN 2 ELSE 1 END; $$;

CREATE OR REPLACE FUNCTION public._farm_crop_ready(p_crop jsonb, p_now_ms bigint)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_sku text; v_planted bigint; v_water integer; v_grow integer; v_effective integer; v_elapsed bigint;
BEGIN
  IF p_crop IS NULL THEN RETURN false; END IF;
  v_sku := p_crop->>'cropSku';
  v_planted := (p_crop->>'plantedAtMs')::bigint;
  v_water := COALESCE((p_crop->>'waterCount')::integer, 0);
  v_grow := public._farm_crop_grow_ms(v_sku);
  v_effective := GREATEST(1, v_grow - LEAST(floor(v_grow * 0.25)::integer, v_water * floor(v_grow * 0.25)::integer));
  v_elapsed := p_now_ms - v_planted;
  RETURN v_elapsed >= v_effective;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_crop_ready(jsonb, bigint) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_roll_quality(p_seed integer, p_plot integer, p_now_ms bigint, p_water integer)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_roll integer; v_n integer; v_s integer; v_g integer;
BEGIN
  v_roll := abs(hashtext(p_seed::text || ':' || p_plot::text || ':' || (p_now_ms / 1000)::text)) % 100;
  IF p_water > 0 THEN v_n := 40; v_s := 40; v_g := 20; ELSE v_n := 70; v_s := 25; v_g := 5; END IF;
  IF v_roll < v_n THEN RETURN 'normal'; END IF;
  IF v_roll < v_n + v_s THEN RETURN 'silver'; END IF;
  RETURN 'gold';
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_roll_quality(integer, integer, bigint, integer) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_project_plot_views(p_farm jsonb, p_now_ms bigint)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE v_out jsonb := '[]'::jsonb; v_plot jsonb; v_crop jsonb; v_grow integer; v_effective integer; v_elapsed bigint; v_permille integer;
BEGIN
  FOR v_plot IN SELECT jsonb_array_elements(p_farm->'plots') LOOP
    v_crop := v_plot->'crop';
    IF v_plot->>'soil' = 'planted' AND v_crop IS NOT NULL THEN
      v_grow := public._farm_crop_grow_ms(v_crop->>'cropSku');
      v_effective := GREATEST(1, v_grow - LEAST(floor(v_grow * 0.25)::integer,
        COALESCE((v_crop->>'waterCount')::integer, 0) * floor(v_grow * 0.25)::integer));
      v_elapsed := GREATEST(0, p_now_ms - (v_crop->>'plantedAtMs')::bigint);
      v_permille := LEAST(1000, floor((v_elapsed::numeric * 1000) / v_effective)::integer);
    ELSE
      v_permille := 0;
    END IF;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'plotId', (v_plot->>'plotId')::integer,
      'soil', v_plot->>'soil',
      'cropSku', CASE WHEN v_plot->>'soil' = 'planted' THEN v_crop->>'cropSku' ELSE NULL END,
      'plantedAtMs', CASE WHEN v_plot->>'soil' = 'planted' THEN (v_crop->>'plantedAtMs')::bigint ELSE NULL END,
      'waterCount', COALESCE((v_crop->>'waterCount')::integer, 0),
      'growthPermille', v_permille,
      'ready', v_permille >= 1000
    ));
  END LOOP;
  RETURN v_out;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_project_plot_views(jsonb, bigint) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_snapshot_json(p_world_id uuid, p_row public.world_farm_worlds)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_now bigint := public._farm_now_ms();
BEGIN
  RETURN jsonb_build_object(
    'worldId', p_world_id,
    'version', p_row.version,
    'serverNowMs', v_now,
    'farm', p_row.farm_json,
    'plots', public._farm_project_plot_views(p_row.farm_json, v_now),
    'walletCoins', p_row.coins,
    'contractVersion', p_row.contract_version,
    'plotBinding', p_row.plot_binding
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_snapshot_json(uuid, public.world_farm_worlds) FROM PUBLIC, anon, authenticated, service_role;

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
  IF FOUND THEN RETURN v_row; END IF;
  v_seed := (random() * 2147483647)::integer;
  INSERT INTO public.world_farm_worlds (world_id, farm_seed, farm_json, coins)
  VALUES (p_world_id, v_seed, jsonb_build_object('seed', v_seed, 'plots', public._farm_empty_plots()), 50)
  RETURNING * INTO v_row;
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'tool_hoe', 1);
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'tool_watering_can', 1);
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'water_pitcher', 1);
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'seed_wheat', 5);
  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'seed_carrot', 2);
  RETURN v_row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._farm_ensure_row(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.farm_get_snapshot(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.world_farm_worlds%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  v_row := public._farm_ensure_row(p_world_id);
  RETURN public._farm_snapshot_json(p_world_id, v_row);
END;
$$;
GRANT EXECUTE ON FUNCTION public.farm_get_snapshot(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.farm_get_snapshot(uuid) FROM PUBLIC, anon, service_role;

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
  IF p_plot_index IS NULL OR p_plot_index < 0 OR p_plot_index > 23 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_row := public._farm_ensure_row(p_world_id);
  IF p_farm_version IS NOT NULL AND p_farm_version <> v_row.version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;
  v_plots := v_row.farm_json->'plots';
  FOR v_i IN 0..23 LOOP
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
        v_sku := public._farm_crop_from_seed(p_seed_sku);
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
GRANT EXECUTE ON FUNCTION public.farm_apply(uuid, integer, text, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.farm_buy_seed(
  p_world_id uuid, p_seed_sku text, p_qty integer, p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.world_farm_worlds%ROWTYPE; v_unit integer; v_total integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_qty IS NULL OR p_qty < 1 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_unit := public._farm_seed_buy_price(p_seed_sku);
  IF v_unit <= 0 THEN RAISE EXCEPTION 'NOT_FOR_SALE'; END IF;
  v_row := public._farm_ensure_row(p_world_id);
  v_total := v_unit * p_qty;
  IF v_row.coins < v_total THEN RAISE EXCEPTION 'INSUFFICIENT_FUNDS'; END IF;
  PERFORM public._inventory_adjust_quality(p_world_id, 'shared', p_seed_sku, p_qty, 'normal');
  UPDATE public.world_farm_worlds SET coins = coins - v_total, updated_at = now() WHERE world_id = p_world_id
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('walletCoins', v_row.coins);
END;
$$;
GRANT EXECUTE ON FUNCTION public.farm_buy_seed(uuid, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.farm_sell_crop(
  p_world_id uuid, p_sku text, p_qty integer, p_quality text, p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.world_farm_worlds%ROWTYPE; v_unit integer; v_coins integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_qty IS NULL OR p_qty < 1 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p_quality IS NULL OR p_quality NOT IN ('normal', 'silver', 'gold') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_unit := public._farm_sell_unit_coins(p_sku, p_quality);
  IF v_unit <= 0 THEN RAISE EXCEPTION 'NOT_SELLABLE'; END IF;
  IF public._farm_shared_qty(p_world_id, p_sku, p_quality) < p_qty THEN RAISE EXCEPTION 'INSUFFICIENT_ITEMS'; END IF;
  v_row := public._farm_ensure_row(p_world_id);
  PERFORM public._inventory_adjust_quality(p_world_id, 'shared', p_sku, -p_qty, p_quality);
  v_coins := v_unit * p_qty;
  UPDATE public.world_farm_worlds SET coins = coins + v_coins, updated_at = now() WHERE world_id = p_world_id
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('walletCoins', v_row.coins);
END;
$$;
GRANT EXECUTE ON FUNCTION public.farm_sell_crop(uuid, text, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.farm_ship_to_bin(
  p_world_id uuid, p_lines jsonb, p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid(); v_row public.world_farm_worlds%ROWTYPE;
  v_now bigint := public._farm_now_ms(); v_day integer; v_sold jsonb; v_line jsonb;
  v_sku text; v_qty integer; v_quality text; v_unit integer; v_total integer := 0; v_i integer;
  v_group text; v_start integer; v_sat_bp integer; v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_req text := 'farm_ship:' || p_world_id::text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_row := public._farm_ensure_row(p_world_id);
  v_day := public._farm_vn_day_index(v_now);
  IF v_row.shipping_day_index <> v_day THEN
    v_sold := '{}'::jsonb;
    UPDATE public.world_farm_worlds SET shipping_day_index = v_day, shipping_sold_by_group = v_sold WHERE world_id = p_world_id;
    v_row.shipping_sold_by_group := v_sold;
    v_row.shipping_day_index := v_day;
  ELSE
    v_sold := v_row.shipping_sold_by_group;
  END IF;
  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'farm_ship' OR v_receipt.request_hash <> v_req THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN RAISE EXCEPTION 'EMPTY_SALE'; END IF;
  FOR v_line IN SELECT jsonb_array_elements(p_lines) LOOP
    v_sku := v_line->>'sku'; v_qty := (v_line->>'qty')::integer;
    v_quality := COALESCE(v_line->>'quality', 'normal');
    IF v_qty IS NULL OR v_qty < 1 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
    v_group := CASE
      WHEN v_sku IN ('wheat') THEN 'grain' WHEN v_sku IN ('carrot','tomato','cabbage') THEN 'veg'
      WHEN v_sku IN ('strawberry','peach') THEN 'fruit' WHEN v_sku IN ('sunflower','rose_pink') THEN 'flower'
      ELSE 'crop' END;
    v_start := COALESCE((v_sold->>v_group)::integer, 0);
    FOR v_i IN 0..(v_qty - 1) LOOP
      v_sat_bp := public._economy_saturation_mul_bp(v_start + v_i);
      v_unit := floor(public._farm_sell_unit_coins(v_sku, v_quality)::numeric * v_sat_bp / 10000)::integer;
      v_total := v_total + v_unit;
    END LOOP;
    IF public._farm_shared_qty(p_world_id, v_sku, v_quality) < v_qty THEN RAISE EXCEPTION 'INSUFFICIENT_ITEMS'; END IF;
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', v_sku, -v_qty, v_quality);
    v_sold := jsonb_set(v_sold, ARRAY[v_group], to_jsonb(v_start + v_qty), true);
  END LOOP;
  UPDATE public.world_farm_worlds
  SET coins = coins + v_total, shipping_sold_by_group = v_sold, updated_at = now()
  WHERE world_id = p_world_id RETURNING * INTO v_row;
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'farm_ship', p_idempotency_key, v_req,
    jsonb_build_object('walletCoins', v_row.coins, 'totalCoins', v_total));
  RETURN jsonb_build_object('walletCoins', v_row.coins, 'totalCoins', v_total);
END;
$$;
GRANT EXECUTE ON FUNCTION public.farm_ship_to_bin(uuid, jsonb, text) TO authenticated;