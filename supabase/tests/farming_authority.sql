BEGIN;
SET LOCAL plpgsql.check_asserts = on;
SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true);
INSERT INTO auth.users (id) VALUES
  (current_setting('olw.test.owner')::uuid), (current_setting('olw.test.partner')::uuid);
DO $$
DECLARE w uuid; invite text; snap jsonb; res jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  w := public.create_couple_world('Farm SQL', 'Owner', '{}');
  SELECT invite_code INTO invite FROM public.create_world_invite(w, 24);
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
  PERFORM public.redeem_world_invite(invite, 'Partner', '{}');
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
  snap := public.farm_get_snapshot(w);
  ASSERT snap->>'contractVersion' = '1.0.1';
  ASSERT snap->>'plotBinding' = 'farm_main:0-119,farm_annex:0-63';
  ASSERT (snap->>'walletCoins')::integer = 50;
  res := public.farm_apply(w, 0, 'till', NULL, (snap->>'version')::integer, 'till-1');
  ASSERT res->'snapshot'->'farm'->'plots'->0->>'soil' = 'tilled';
  res := public.farm_apply(w, 0, 'plant', 'seed_wheat', (res->'snapshot'->>'version')::integer, 'plant-1');
  ASSERT res->'snapshot'->'farm'->'plots'->0->>'soil' = 'planted';
  res := public.farm_buy_seed(w, 'seed_carrot', 1, 'buy-1');
  ASSERT (res->>'walletCoins')::integer = 46;
END;
$$;
ROLLBACK;