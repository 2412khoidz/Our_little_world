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
  offer_id uuid;
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

  BEGIN
    PERFORM public.pet_living_submit_proposal(w, inst, 'movement_ready', 'la-move-early', NULL);
    RAISE EXCEPTION 'movement before server clock';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'MOVEMENT_NOT_READY' THEN RAISE; END IF;
  END;

  PERFORM pg_sleep(greatest(0.2, (row.arrive_at_ms - floor(extract(epoch FROM clock_timestamp()) * 1000))::numeric / 1000.0 + 0.1));
  PERFORM public.pet_living_submit_proposal(w, inst, 'movement_ready', 'la-move', NULL);

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
  PERFORM public.pet_living_submit_proposal(w, inst, 'movement_ready', 'la-move2', NULL);
  PERFORM pg_sleep(greatest(0.2, (row.perform_until_ms - floor(extract(epoch FROM clock_timestamp()) * 1000))::numeric / 1000.0 + 0.1));
  PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish2a', NULL);
  snap := public.pet_living_get_snapshot(w);
  ASSERT (snap->'bowl'->>'waterVolume')::int = 90;
  PERFORM public.pet_living_submit_proposal(w, inst, 'animation_finished', 'la-finish2b', NULL);
  snap := public.pet_living_get_snapshot(w);
  ASSERT (snap->'bowl'->>'waterVolume')::int = 90;

  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  RESET ROLE;
  PERFORM public._inventory_adjust_quality(w, 'shared', 'pet_kibble_basic', 4, 'normal');
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  SELECT qty INTO qty_before FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  offer_id := (public.pet_food_offer_create(
    w, pet_id, 'pet_kibble_basic', 'normal', 600, 'la-offer') ->> 'offerId')::uuid;
  SELECT qty INTO qty_after FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  ASSERT qty_after = qty_before - 1;
  BEGIN
    PERFORM public.pet_food_offer_respond(w, offer_id, 'refuse', 'la-refuse');
    RAISE EXCEPTION 'client refuse allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'BRAIN_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  END;
  PERFORM public.pet_food_offer_respond(w, offer_id, 'cancel', 'la-cancel');
  ASSERT (SELECT status FROM public.pet_food_offers WHERE id = offer_id) = 'cancelled';
  SELECT qty INTO qty_after FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  ASSERT qty_after = qty_before;
  offer_id := (public.pet_food_offer_create(
    w, pet_id, 'pet_kibble_basic', 'normal', 600, 'la-offer-eval') ->> 'offerId')::uuid;
  PERFORM public.pet_food_offer_evaluate(w, pet_id, 'la-eval');
  ASSERT (SELECT status FROM public.pet_food_offers WHERE id = offer_id) IN ('accepted', 'deferred', 'refused');

  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.outsider'), true);
  BEGIN
    PERFORM public.pet_living_submit_proposal(w, inst, 'movement_ready', 'la-out', NULL);
    RAISE EXCEPTION 'outsider submit proposal';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  SELECT qty INTO qty_before FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  offer_id := (public.pet_food_offer_create(
    w, pet_id, 'pet_kibble_basic', 'normal', 600, 'la-offer-exp') ->> 'offerId')::uuid;
  SELECT qty INTO qty_after FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  ASSERT qty_after = qty_before - 1;
  PERFORM set_config('olw.test.offer_pend', offer_id::text, true);

  SELECT qty INTO qty_before FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  offer_id := (public.pet_food_offer_create(
    w, pet_id, 'pet_kibble_basic', 'normal', 600, 'la-offer-acc') ->> 'offerId')::uuid;
  PERFORM set_config('olw.test.offer_acc', offer_id::text, true);
END;
$$;

RESET ROLE;
UPDATE public.pet_food_offers
SET status = 'accepted', inventory_reserved = true, responded_at_ms = floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint
WHERE id = current_setting('olw.test.offer_acc')::uuid;

RESET ROLE;
UPDATE public.pet_food_offers
SET expires_at_ms = floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint - 500
WHERE id = current_setting('olw.test.offer_pend')::uuid;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  w uuid := current_setting('olw.test.w')::uuid;
  qty_after integer;
  qty_before integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  SELECT qty INTO qty_before FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  PERFORM public.pet_living_get_snapshot(w);
  ASSERT (SELECT status FROM public.pet_food_offers WHERE id = current_setting('olw.test.offer_pend')::uuid) = 'expired';
  ASSERT (SELECT inventory_reserved FROM public.pet_food_offers WHERE id = current_setting('olw.test.offer_pend')::uuid) = false;
  SELECT qty INTO qty_after FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  ASSERT qty_after = qty_before + 1;
END;
$$;

RESET ROLE;
UPDATE public.pet_food_offers
SET expires_at_ms = floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint - 500
WHERE id = current_setting('olw.test.offer_acc')::uuid;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  w uuid := current_setting('olw.test.w')::uuid;
  qty_after integer;
  qty_before integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  SELECT qty INTO qty_before FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  PERFORM public.pet_living_get_snapshot(w);
  ASSERT (SELECT status FROM public.pet_food_offers WHERE id = current_setting('olw.test.offer_acc')::uuid) = 'expired';
  ASSERT (SELECT inventory_reserved FROM public.pet_food_offers WHERE id = current_setting('olw.test.offer_acc')::uuid) = false;
  SELECT qty INTO qty_after FROM public.inventory_items
  WHERE world_id = w AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  ASSERT qty_after = qty_before + 1;
END;
$$;
RESET ROLE;
ROLLBACK;