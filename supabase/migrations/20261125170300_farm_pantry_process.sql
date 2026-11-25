-- Mission 06: barn pantry processing (Dev LAN parity).

CREATE OR REPLACE FUNCTION public.farm_process_pantry(
  p_world_id uuid, p_output_sku text, p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_output_sku IS NULL OR length(trim(p_output_sku)) = 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;

  IF p_output_sku = 'flour' THEN
    IF public._farm_shared_qty(p_world_id, 'wheat') < 2 THEN RAISE EXCEPTION 'INSUFFICIENT_ITEMS'; END IF;
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', 'wheat', -2, 'normal');
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', 'flour', 1, 'normal');
  ELSIF p_output_sku = 'strawberry_jam' THEN
    IF public._farm_shared_qty(p_world_id, 'strawberry') < 2 THEN RAISE EXCEPTION 'INSUFFICIENT_ITEMS'; END IF;
    IF public._farm_shared_qty(p_world_id, 'sugar_pack') < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_ITEMS'; END IF;
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', 'strawberry', -2, 'normal');
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', 'sugar_pack', -1, 'normal');
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', 'strawberry_jam', 1, 'normal');
  ELSIF p_output_sku = 'carrot_soup' THEN
    IF public._farm_shared_qty(p_world_id, 'carrot') < 2 THEN RAISE EXCEPTION 'INSUFFICIENT_ITEMS'; END IF;
    IF public._farm_shared_qty(p_world_id, 'wild_herb') < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_ITEMS'; END IF;
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', 'carrot', -2, 'normal');
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', 'wild_herb', -1, 'normal');
    PERFORM public._inventory_adjust_quality(p_world_id, 'shared', 'carrot_soup', 1, 'normal');
  ELSE
    RAISE EXCEPTION 'UNKNOWN_RECIPE';
  END IF;

  RETURN jsonb_build_object('outputSku', p_output_sku);
END;
$$;
GRANT EXECUTE ON FUNCTION public.farm_process_pantry(uuid, text, text) TO authenticated;