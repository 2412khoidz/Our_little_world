-- Catalog stack_limit is the presentation cell size. The ledger stores the full
-- aggregate per (world, scope, SKU, quality) using the PostgreSQL integer ceiling.
CREATE OR REPLACE FUNCTION public._inventory_adjust_quality(
  p_world_id uuid,
  p_owner_scope text,
  p_item_sku text,
  p_delta integer,
  p_quality text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_current integer;
  v_next bigint;
BEGIN
  IF p_quality NOT IN ('normal', 'silver', 'gold') OR p_quality IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_owner_scope IS NULL OR p_delta IS NULL
     OR (p_owner_scope <> 'shared' AND p_owner_scope !~ '^user:[0-9a-f-]+$') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  PERFORM 1 FROM public.item_catalog WHERE sku = p_item_sku;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT qty INTO v_current
  FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku AND quality = p_quality
  FOR UPDATE;
  v_next := COALESCE(v_current, 0)::bigint + p_delta;

  IF v_next < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_ITEMS';
  END IF;
  IF v_next > 2147483647 THEN
    RAISE EXCEPTION 'STACK_FULL';
  END IF;

  -- An excluded row is checked before upsert conflict handling. Write the
  -- final positive quantity only, or remove the row when the stack is empty.
  IF v_next = 0 THEN
    DELETE FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku AND quality = p_quality;
  ELSE
    INSERT INTO public.inventory_items (world_id, owner_scope, item_sku, qty, updated_at, quality)
    VALUES (p_world_id, p_owner_scope, p_item_sku, v_next::integer, now(), p_quality)
    ON CONFLICT (world_id, owner_scope, item_sku, quality) DO UPDATE
    SET qty = EXCLUDED.qty, updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN v_next::integer;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._inventory_adjust_quality(uuid, text, text, integer, text)
FROM PUBLIC, anon, authenticated, service_role;

-- Farm initialization keeps its existing wallet and is independent of the starter pack.
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
    UPDATE public.world_farm_worlds SET farm_json = v_row.farm_json
    WHERE world_id = p_world_id AND farm_json IS DISTINCT FROM v_row.farm_json;
    RETURN v_row;
  END IF;
  v_seed := (random() * 2147483647)::integer;
  INSERT INTO public.world_farm_worlds (world_id, farm_seed, farm_json, coins, plot_binding)
  VALUES (
    p_world_id, v_seed,
    jsonb_build_object('seed', v_seed, 'plots', public._farm_empty_plots()),
    50, 'farm_main:0-119,farm_annex:0-63'
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._farm_ensure_row(uuid)
FROM PUBLIC, anon, authenticated, service_role;

-- Preserve the compatibility catalog used by the live Dev LAN starter pack.
INSERT INTO public.item_catalog (sku, name_vi, description_vi, purpose, stack_limit, tradeable, category, icon_id, quality_tiers)
VALUES
  ('rod_basic', 'Cần câu cơ bản', 'Dùng để câu cá bên bờ nước.', 'tool', 1, false, 'tool', 'rod_basic', '["normal"]'),
  ('fish_salmon_bite', 'Cá hồi mềm', 'Món cá mềm cho bé mèo.', 'pet_food', 5, false, 'pet_food', 'fish_salmon_bite', '["normal","silver","gold"]'),
  ('toy_yarn', 'Cuộn len', 'Đồ chơi cho bé mèo.', 'keepsake', 3, false, 'keepsake', 'toy_yarn', '["normal"]'),
  ('toy_cardboard_box', 'Hộp giấy', 'Hộp để bé mèo chui vào chơi.', 'keepsake', 2, false, 'keepsake', 'toy_cardboard_box', '["normal"]')
ON CONFLICT (sku) DO NOTHING;

UPDATE public.item_catalog SET purpose = 'tool', category = 'tool'
WHERE sku IN ('tool_hoe', 'tool_watering_can', 'water_pitcher');

-- Migration v1: existing worlds keep every owned unit and receive only missing tools.
INSERT INTO public.inventory_items (world_id, owner_scope, item_sku, qty, quality)
SELECT w.id, 'shared', tools.sku, 1, 'normal'
FROM public.worlds w
CROSS JOIN (VALUES ('tool_hoe'), ('tool_watering_can'), ('water_pitcher'), ('rod_basic')) tools(sku)
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_items i
  WHERE i.world_id = w.id AND i.owner_scope = 'shared' AND i.item_sku = tools.sku
)
ON CONFLICT (world_id, owner_scope, item_sku, quality) DO NOTHING;

-- New worlds get the starter pack exactly once in the world creation transaction.
CREATE FUNCTION public._inventory_seed_new_world()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  INSERT INTO public.inventory_items (world_id, owner_scope, item_sku, qty, quality)
  SELECT NEW.id, 'shared', sku, qty, quality
  FROM (VALUES
    ('tool_hoe', 1, 'normal'), ('tool_watering_can', 1, 'normal'),
    ('water_pitcher', 1, 'normal'), ('rod_basic', 1, 'normal'),
    ('seed_wheat', 5, 'normal'), ('seed_carrot', 2, 'normal'), ('bait_free_worm', 10, 'normal'),
    ('fish_salmon_bite', 2, 'silver'), ('toy_yarn', 1, 'normal'), ('toy_cardboard_box', 1, 'normal')
  ) starter(sku, qty, quality);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._inventory_seed_new_world()
FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER inventory_seed_new_world
AFTER INSERT ON public.worlds
FOR EACH ROW EXECUTE FUNCTION public._inventory_seed_new_world();


-- The hand-feed receipt event must be accepted in the same transaction as its debit.
ALTER TABLE public.pet_events DROP CONSTRAINT IF EXISTS pet_events_event_type_check;
ALTER TABLE public.pet_events ADD CONSTRAINT pet_events_event_type_check
  CHECK (event_type IN ('adopt', 'rename', 'pet', 'feed', 'water', 'consume_hand_food'));
