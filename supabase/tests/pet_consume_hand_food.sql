-- Depends on 20261125001200_pet_consume_hand_food.sql (same body as Mission 04C PR #13).
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true);
INSERT INTO auth.users (id) VALUES
  (current_setting('olw.test.owner')::uuid), (current_setting('olw.test.partner')::uuid);
DO $$
DECLARE
  w uuid;
  invite text;
  pet jsonb;
  pet_id uuid;
  v integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  w := public.create_couple_world('Hand feed', 'Owner', '{}');
  SELECT invite_code INTO invite FROM public.create_world_invite(w, 24);
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
  PERFORM public.redeem_world_invite(invite, 'Partner', '{}');
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  pet := public.pet_adopt_or_rename(w, 'Miu', null, 'adopt-1');
  pet_id := (pet->>'id')::uuid;
  v := (pet->>'version')::integer;
  UPDATE public.pets
  SET vitals_jsonb = jsonb_set(vitals_jsonb, '{hunger}', '70')
  WHERE id = pet_id;
  PERFORM public._inventory_adjust_item(w, 'shared', 'pet_kibble_basic', 2);
  pet := public.pet_consume_hand_food(w, pet_id, v, 'shared', 'pet_kibble_basic', 'normal', 'hf-1');
  ASSERT (pet->'pet'->'vitals'->>'hunger')::integer = 96;
  BEGIN
    PERFORM public.pet_consume_hand_food(w, pet_id, (pet->'pet'->>'version')::integer, 'shared', 'pet_kibble_basic', 'normal', 'hf-dup');
    RAISE EXCEPTION 'Should be full';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT IN ('PET_FULL', 'INSUFFICIENT_ITEMS') THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK;