BEGIN;
SET LOCAL plpgsql.check_asserts = on;
SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true);
INSERT INTO auth.users (id) VALUES
  (current_setting('olw.test.owner')::uuid),
  (current_setting('olw.test.partner')::uuid);

DO $$
DECLARE
  w uuid;
  invite text;
  deep jsonb;
  res jsonb;
  farm_snap jsonb;
  ord_id text;
  job_id text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  w := public.create_couple_world('Deep Farm SQL', 'Owner', '{}');
  SELECT invite_code INTO invite FROM public.create_world_invite(w, 24);

  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
  PERFORM public.redeem_world_invite(invite, 'Partner', '{}');

  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  farm_snap := public.farm_get_snapshot(w);
  deep := public.farm_get_deep_snapshot(w);
  ASSERT (deep->>'walletCoins')::integer = 50;

  UPDATE public.world_farm_worlds SET coins = 1200 WHERE world_id = w;
  PERFORM public._inventory_adjust_quality(w, 'shared', 'seed_tulip_red', 2, 'normal');
  PERFORM public._inventory_adjust_quality(w, 'shared', 'sapling_peach', 1, 'normal');
  PERFORM public._inventory_adjust_quality(w, 'shared', 'fert_quality', 1, 'normal');
  PERFORM public._inventory_adjust_quality(w, 'shared', 'sprinkler_basic', 1, 'normal');
  PERFORM public._inventory_adjust_quality(w, 'shared', 'wheat', 1, 'silver');
  PERFORM public._inventory_adjust_quality(w, 'shared', 'wheat', 1, 'gold');

  -- Extended farm_apply (fertilizer & sprinkler)
  res := public.farm_apply(w, 0, 'till', NULL, (farm_snap->>'version')::integer, 'sql-till-0');
  res := public.farm_apply(w, 0, 'fertilize', NULL, (res->'snapshot'->>'version')::integer, 'sql-fert-0', 'fert_quality', NULL, NULL, true);
  ASSERT res->'snapshot'->'farm'->'plots'->0->>'fertilizer' = 'fert_quality';
  res := public.farm_apply(w, 1, 'place_sprinkler', NULL, (res->'snapshot'->>'version')::integer, 'sql-spr-1', NULL, 'sprinkler_basic', NULL, true);
  ASSERT res->'snapshot'->'farm'->'plots'->1->>'sprinkler' = 'sprinkler_basic';

  -- Owner plants flower bed
  res := public.farm_apply_deep_action(
    w,
    jsonb_build_object('kind', 'plant_flower', 'slotIndex', 0, 'flowerSku', 'tulip_red'),
    'deep-flower-1'
  );
  ASSERT res->'snapshot'->'flowerGarden'->'beds'->0->>'flowerSku' = 'tulip_red';

  -- Queue workshop flour (consumes 2 wheat) -> cancel refunds 2 wheat 100%
  res := public.farm_apply_deep_action(
    w,
    jsonb_build_object('kind', 'queue_workshop', 'workshopId', 'mill', 'recipeId', 'flour'),
    'deep-mill-q-1'
  );
  job_id := res->'snapshot'->'workshops'->'stations'->'mill'->'queue'->0->>'jobId';
  ASSERT job_id IS NOT NULL;
  ASSERT public._farm_shared_any_qty(w, 'wheat') = 0;

  res := public.farm_apply_deep_action(
    w,
    jsonb_build_object('kind', 'cancel_workshop', 'workshopId', 'mill', 'jobId', job_id),
    'deep-mill-c-1'
  );
  ASSERT public._farm_shared_any_qty(w, 'wheat') = 2;
  ASSERT public._farm_shared_qty(w, 'wheat', 'silver') = 1;
  ASSERT public._farm_shared_qty(w, 'wheat', 'gold') = 1;

  -- Partner adopts bee concurrently & replays idempotency key safely
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
  res := public.farm_apply_deep_action(
    w,
    jsonb_build_object('kind', 'adopt_livestock', 'speciesId', 'bee', 'nickname', 'Ong Mật'),
    'deep-bee-1'
  );
  ASSERT jsonb_array_length(res->'snapshot'->'livestock'->'animals') = 1;
  res := public.farm_apply_deep_action(
    w,
    jsonb_build_object('kind', 'adopt_livestock', 'speciesId', 'bee', 'nickname', 'Ong Mật'),
    'deep-bee-1'
  );
  ASSERT (res->>'idempotentReplay')::boolean = true;
  ASSERT (res->'snapshot'->>'walletCoins')::integer = 820;

  ord_id := res->'snapshot'->'orderBoard'->'orders'->0->>'orderId';
  ASSERT ord_id IS NOT NULL;
END;
$$;
ROLLBACK;
