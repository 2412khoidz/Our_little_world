-- Worker K: canonical store-buy prices aligned with catalogConfig (safe merge, no reset).

CREATE OR REPLACE FUNCTION public._farm_store_buy_price(p_sku text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$ SELECT CASE p_sku
  WHEN 'seed_wheat' THEN 4
  WHEN 'seed_carrot' THEN 8
  WHEN 'seed_tomato' THEN 14
  WHEN 'seed_strawberry' THEN 22
  WHEN 'seed_sunflower' THEN 16
  WHEN 'seed_rose_pink' THEN 20
  WHEN 'seed_cabbage' THEN 26
  WHEN 'bait_shrimp' THEN 6
  WHEN 'sugar_pack' THEN 6
  WHEN 'spice' THEN 10
  WHEN 'ribbon' THEN 6
  ELSE 0 END; $$;

REVOKE EXECUTE ON FUNCTION public._farm_store_buy_price(text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._farm_seed_buy_price(p_seed_sku text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$ SELECT public._farm_store_buy_price(p_seed_sku); $$;

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
  IF p_qty IS NULL OR p_qty < 1 OR p_qty > 999 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_unit := public._farm_store_buy_price(p_seed_sku);
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