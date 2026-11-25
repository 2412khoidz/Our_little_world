-- Run after all migrations in an isolated local database.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true);
INSERT INTO auth.users (id) VALUES
  (current_setting('olw.test.owner')::uuid), (current_setting('olw.test.partner')::uuid);
DO $$
DECLARE
  w uuid; invite text; result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  w := public.create_couple_world('Quality fixture', 'Owner', '{}');
  SELECT invite_code INTO invite FROM public.create_world_invite(w, 24);
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
  PERFORM public.redeem_world_invite(invite, 'Partner', '{}');
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  ASSERT public._inventory_adjust_item(w, 'shared', 'gift_flower_bouquet', 2) = 2;
  ASSERT public._inventory_adjust_quality(w, 'shared', 'gift_flower_bouquet', 3, 'gold') = 3;
  BEGIN
    PERFORM public._inventory_adjust_quality(w, 'shared', 'gift_flower_bouquet', 1, 'silver');
    RAISE EXCEPTION 'Exceeded combined stack';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'STACK_FULL' THEN RAISE; END IF;
  END;
  ASSERT public._inventory_adjust_quality(w, 'shared', 'gift_flower_bouquet', -3, 'gold') = 0;
  ASSERT public._inventory_adjust_item(w, 'shared', 'gift_flower_bouquet', -1) = 1;
  ASSERT NOT has_function_privilege('authenticated', 'public._inventory_adjust_quality(uuid,text,text,integer,text)', 'EXECUTE');
  result := public.inventory_get(w);
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'items') i
                 WHERE i->>'itemSku' = 'gift_flower_bouquet' AND i->>'quality' = 'normal' AND (i->>'qty')::integer = 1);
  ASSERT EXISTS (SELECT 1 FROM public.item_catalog WHERE sku = 'seed_wheat');
END;
$$;
ROLLBACK;
