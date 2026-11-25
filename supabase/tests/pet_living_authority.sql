-- Mission 04B-2 authoritative consumption (no client eat/drink bypass).
BEGIN;
SET LOCAL plpgsql.check_asserts = on;

SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true);
INSERT INTO auth.users (id)
VALUES (current_setting('olw.test.owner')::uuid), (current_setting('olw.test.partner')::uuid);

DO $$
DECLARE w uuid; pet_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  w := public.create_couple_world('Living authority', 'Owner', '{}');
  PERFORM public.inventory_claim_free_kibble(w, 'la-kibble');
  pet_id := (public.pet_adopt_or_rename(w, 'Cat', NULL, 'la-adopt')->>'id')::uuid;
  PERFORM set_config('olw.test.w', w::text, true);
  PERFORM set_config('olw.test.pet', pet_id::text, true);
END;
$$;

RESET ROLE;
UPDATE public.pets
SET vitals_jsonb = '{"hunger":50,"energy":100,"fun":100}'::jsonb,
    sim_state_at_ms = floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint
WHERE id = current_setting('olw.test.pet')::uuid;

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  w uuid := current_setting('olw.test.w')::uuid;
  pet_id uuid := current_setting('olw.test.pet')::uuid;
  inst uuid;
  snap jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);

  PERFORM public.pet_care_apply(w, pet_id, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'la-fill');

  BEGIN
    PERFORM public.pet_care_apply(w, pet_id, 'eat_food', 1, NULL, NULL, NULL, 'la-eat-direct');
    RAISE EXCEPTION 'direct eat still allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'SERVER_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  END;

  snap := public.pet_living_get_snapshot(w);
  ASSERT (snap->'bowl'->>'foodPortions')::int = 1;

  inst := (public.pet_living_begin_action(
    w, pet_id, 'eat_bowl', 'food_bowl', (snap->>'livingVersion')::int, 'la-begin'
  )->>'instanceId')::uuid;

  BEGIN
    PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-skip-move');
    RAISE EXCEPTION 'animation without movement accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'CONSUMPTION_NOT_AUTHORIZED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.pet_living_submit_proposal(w, inst, 'movement_ready', 'la-move-early');
    RAISE EXCEPTION 'movement before server travel window';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'MOVEMENT_NOT_READY' THEN RAISE; END IF;
  END;

  PERFORM pg_sleep(1.5);
  PERFORM public.pet_living_submit_proposal(w, inst, 'movement_ready', 'la-move');
  PERFORM pg_sleep(3);
  PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish');
  ASSERT public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish')
    = public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish');

  snap := public.pet_living_get_snapshot(w);
  ASSERT (snap->'bowl'->>'foodPortions')::int = 0;
  ASSERT (snap->'pet'->'vitals'->>'hunger')::int > 70;
  ASSERT jsonb_array_length(snap->'recentMemory') >= 1;

  PERFORM public.pet_care_apply(w, pet_id, 'fill_water', (snap->'bowl'->>'version')::int, NULL, NULL, NULL, 'la-water');
  snap := public.pet_living_get_snapshot(w);
  inst := (public.pet_living_begin_action(
    w, pet_id, 'drink_water', 'water_bowl', (snap->>'livingVersion')::int, 'la-begin2'
  )->>'instanceId')::uuid;
  PERFORM pg_sleep(1.1);
  PERFORM public.pet_living_submit_proposal(w, inst, 'movement_ready', 'la-move2');
  PERFORM pg_sleep(2.3);
  PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish2a');
  snap := public.pet_living_get_snapshot(w);
  ASSERT (snap->'bowl'->>'waterVolume')::int = 90;
  PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish2b');
  snap := public.pet_living_get_snapshot(w);
  ASSERT (snap->'bowl'->>'waterVolume')::int = 90;

  inst := (public.pet_food_offer_create(
    w, pet_id, 'gift_flower_bouquet', 'normal', 600, 'la-offer')::jsonb)->>'offerId';
  PERFORM public.pet_food_offer_respond(w, inst::uuid, 'refuse', 'la-refuse');
  snap := public.pet_living_get_snapshot(w);
  ASSERT (SELECT status FROM public.pet_food_offers WHERE id = inst::uuid) = 'refused';
END;
$$;
RESET ROLE;
ROLLBACK;