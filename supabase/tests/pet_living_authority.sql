-- Mission 04B-2 authoritative consumption + security regressions.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;

SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true),
       set_config('olw.test.outsider', gen_random_uuid()::text, true);
INSERT INTO auth.users (id)
VALUES
  (current_setting('olw.test.owner')::uuid),
  (current_setting('olw.test.partner')::uuid),
  (current_setting('olw.test.outsider')::uuid);

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
  row public.pet_living_action_instances%ROWTYPE;
  qty_before integer;
  qty_after integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.outsider'), true);
  BEGIN
    PERFORM public.pet_living_get_snapshot(w);
    RAISE EXCEPTION 'outsider read living';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  PERFORM public.pet_care_apply(w, pet_id, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'la-fill');

  snap := public.pet_living_get_snapshot(w);
  BEGIN
    PERFORM public.pet_living_begin_action(
      w, pet_id, 'eat_bowl', 'sofa', (snap->>'livingVersion')::int, 'la-fake-target');
    RAISE EXCEPTION 'fake target allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'TARGET_MISMATCH' THEN RAISE; END IF;
  END;

  snap := public.pet_living_get_snapshot(w);
  inst := (public.pet_living_begin_action(
    w, pet_id, 'eat_bowl', 'food_bowl', (snap->>'livingVersion')::int, 'la-begin'
  )->>'instanceId')::uuid;

  BEGIN
    PERFORM public.pet_living_submit_proposal(w, inst, NULL, 'la-null');
    RAISE EXCEPTION 'null proposal accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'VALIDATION_ERROR' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-skip', NULL);
    RAISE EXCEPTION 'animation without movement accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'CONSUMPTION_NOT_AUTHORIZED' THEN RAISE; END IF;
  END;

  SELECT * INTO row FROM public.pet_living_action_instances WHERE id = inst;
  PERFORM pg_sleep(greatest(0.2, (row.arrive_at_ms - floor(extract(epoch FROM clock_timestamp()) * 1000))::numeric / 1000.0 + 0.1));

  BEGIN
    PERFORM public.pet_living_submit_proposal(
      w, inst, 'movement_ready', 'la-bad-proof', jsonb_build_object('standTileX', 1, 'standTileY', 1));
    RAISE EXCEPTION 'wrong stand tile accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'MOVEMENT_PROOF_INVALID' THEN RAISE; END IF;
  END;

  PERFORM public.pet_living_submit_proposal(
    w, inst, 'movement_ready', 'la-move',
    jsonb_build_object('standTileX', row.dest_tile_x, 'standTileY', row.dest_tile_y));

  PERFORM pg_sleep(greatest(0.2, (row.perform_until_ms - floor(extract(epoch FROM clock_timestamp()) * 1000))::numeric / 1000.0 + 0.1));

  PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish', NULL);
  ASSERT public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish', NULL)
    = public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish', NULL);

  snap := public.pet_living_get_snapshot(w);
  ASSERT (snap->'bowl'->>'foodPortions')::int = 0;
  ASSERT jsonb_array_length(snap->'recentMemory') >= 1;

  PERFORM public.pet_care_apply(w, pet_id, 'fill_water', (snap->'bowl'->>'version')::int, NULL, NULL, NULL, 'la-water');
  snap := public.pet_living_get_snapshot(w);
  inst := (public.pet_living_begin_action(
    w, pet_id, 'drink_water', 'water_bowl', (snap->>'livingVersion')::int, 'la-begin2'
  )->>'instanceId')::uuid;
  SELECT * INTO row FROM public.pet_living_action_instances WHERE id = inst;
  PERFORM pg_sleep(greatest(0.2, (row.arrive_at_ms - floor(extract(epoch FROM clock_timestamp()) * 1000))::numeric / 1000.0 + 0.1));
  PERFORM public.pet_living_submit_proposal(
    w, inst, 'movement_ready', 'la-move2',
    jsonb_build_object('standTileX', row.dest_tile_x, 'standTileY', row.dest_tile_y));
  PERFORM pg_sleep(greatest(0.2, (row.perform_until_ms - floor(extract(epoch FROM clock_timestamp()) * 1000))::numeric / 1000.0 + 0.1));
  PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish2a', NULL);
  snap := public.pet_living_get_snapshot(w);
  ASSERT (snap->'bowl'->>'waterVolume')::int = 90;
  PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish2b', NULL);
  snap := public.pet_living_get_snapshot(w);
  ASSERT (snap->'bowl'->>'waterVolume')::int = 90;

  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  SELECT qty INTO qty_before FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  inst := (public.pet_food_offer_create(
    w, pet_id, 'pet_kibble_basic', 'normal', 600, 'la-offer')::jsonb)->>'offerId';
  SELECT qty INTO qty_after FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  ASSERT qty_after = qty_before - 1;
  BEGIN
    PERFORM public.pet_food_offer_respond(w, inst::uuid, 'refuse', 'la-refuse');
    RAISE EXCEPTION 'client refuse allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'BRAIN_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  END;
  PERFORM public.pet_food_offer_evaluate(w, pet_id, 'la-eval');
  ASSERT (SELECT status FROM public.pet_food_offers WHERE id = inst::uuid) IN ('accepted', 'deferred', 'refused');
  PERFORM public.pet_food_offer_respond(w, inst::uuid, 'cancel', 'la-cancel');
  ASSERT (SELECT status FROM public.pet_food_offers WHERE id = inst::uuid) = 'cancelled';
  SELECT qty INTO qty_after FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  ASSERT qty_after = qty_before;

  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.outsider'), true);
  BEGIN
    PERFORM public.pet_living_submit_proposal(w, inst, 'movement_ready', 'la-out', jsonb_build_object('standTileX', 12, 'standTileY', 10));
    RAISE EXCEPTION 'outsider submit proposal';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
  END;
END;
$$;
RESET ROLE;
ROLLBACK;