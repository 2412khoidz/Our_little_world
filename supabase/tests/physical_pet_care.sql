BEGIN;
SET LOCAL plpgsql.check_asserts = on;
SELECT set_config('olw.test.owner', gen_random_uuid()::text, true);
INSERT INTO auth.users (id) VALUES (current_setting('olw.test.owner')::uuid);
DO $$
DECLARE
  w uuid; pet_id uuid; result jsonb; repeated jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  w := public.create_couple_world('Pet care fixture', 'Owner', '{}');
  PERFORM public.inventory_claim_free_kibble(w, 'care-kibble');
  pet_id := (public.pet_adopt_or_rename(w, 'Cat', NULL, 'care-adopt')->>'id')::uuid;
  result := public.pet_care_apply(w, pet_id, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'care-fill');
  repeated := public.pet_care_apply(w, pet_id, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'care-fill');
  ASSERT result = repeated;
  ASSERT (result#>>'{bowl,food_portions}')::integer = 1;
  ASSERT (SELECT qty FROM public.inventory_items WHERE world_id = w AND item_sku = 'pet_kibble_basic' AND quality = 'normal') = 2;
  BEGIN
    PERFORM public.pet_care_apply(w, pet_id, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'care-other');
    RAISE EXCEPTION 'stale bowl accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'VERSION_CONFLICT' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.pet_care_apply(w, pet_id, 'eat_food', 2, NULL, NULL, NULL, 'care-full');
    RAISE EXCEPTION 'full pet ate food';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'PET_FULL' THEN RAISE; END IF;
  END;
  UPDATE public.pets SET vitals_jsonb = '{"hunger":50,"energy":100,"fun":100}'::jsonb WHERE id = pet_id;
  result := public.pet_care_apply(w, pet_id, 'eat_food', 2, NULL, NULL, NULL, 'care-eat');
  ASSERT result = public.pet_care_apply(w, pet_id, 'eat_food', 2, NULL, NULL, NULL, 'care-eat');
  ASSERT (result#>>'{bowl,food_portions}')::integer = 0;
  result := public.pet_care_apply(w, pet_id, 'fill_water', 3, NULL, NULL, NULL, 'care-water-fill');
  ASSERT (result#>>'{bowl,water_volume}')::integer = 100;
  result := public.pet_care_apply(w, pet_id, 'drink_water', 4, NULL, NULL, NULL, 'care-drink');
  ASSERT (result#>>'{bowl,water_volume}')::integer = 90;
  ASSERT NOT has_function_privilege('anon', 'public.pet_care_apply(uuid,uuid,text,integer,text,text,text,text)', 'EXECUTE');
END;
$$;
ROLLBACK;
