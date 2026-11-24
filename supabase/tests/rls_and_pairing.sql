-- Executable verification checks for Postgres/Supabase dev environment:
-- Verifies 2-member cap, outsider RLS isolation, atomic furniture occupancy conflict, and idempotency.

BEGIN;

-- Test requires 3 auth users in auth.users (or run with simulated JWT claims in pgTAP/Supabase SQL runner)
DO $$
DECLARE
  v_user_a uuid := '11111111-1111-4111-8111-111111111111';
  v_user_b uuid := '22222222-2222-4222-8222-222222222222';
  v_user_c uuid := '33333333-3333-4333-8333-333333333333';
  v_world_id uuid;
  v_invite record;
  v_snap jsonb;
  v_res1 jsonb;
  v_res1_retry jsonb;
  v_conflict_caught boolean := false;
  v_outsider_caught boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id IN (v_user_a, v_user_b, v_user_c) HAVING count(*) = 3) THEN
    RAISE NOTICE 'Skipping SQL integration block: 3 dev users not found in auth.users.';
    RETURN;
  END IF;

  -- Simulate User A
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_world_id := public.create_couple_world('Nhà Test', 'An', '{}'::jsonb);
  SELECT * INTO v_invite FROM public.create_world_invite(v_world_id, 24);

  -- Simulate User B redeeming one-time invite
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  PERFORM public.redeem_world_invite(v_invite.invite_code, 'Bình', '{}'::jsonb);

  -- Simulate User C (outsider) trying to redeem same invite or read snapshot
  PERFORM set_config('request.jwt.claim.sub', v_user_c::text, true);
  BEGIN
    PERFORM public.redeem_world_invite(v_invite.invite_code, 'Kẻ lạ', '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    v_outsider_caught := true;
  END;
  ASSERT v_outsider_caught, 'Expected outsider invite redemption to fail';

  v_snap := public.get_world_snapshot();
  ASSERT v_snap IS NULL, 'Expected outsider snapshot to be NULL';

  -- Simulate User A placing a lamp at (8, 5)
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  v_res1 := public.place_furniture(v_world_id, 'home', 'lamp_floor', 8, 5, 1, 'idem-lamp-1');
  -- Retry same idempotency key returns identical result without error
  v_res1_retry := public.place_furniture(v_world_id, 'home', 'lamp_floor', 8, 5, 1, 'idem-lamp-1');
  ASSERT v_res1 = v_res1_retry, 'Expected idempotent retry to return identical payload';

  -- Simulate User B attempting to place plant on occupied tile (8, 5)
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  BEGIN
    PERFORM public.place_furniture(v_world_id, 'home', 'plant_monstera', 8, 5, 2, 'idem-plant-conflict');
  EXCEPTION WHEN OTHERS THEN
    v_conflict_caught := true;
  END;
  ASSERT v_conflict_caught, 'Expected TILE_OCCUPIED exception on overlapping tile';

  RAISE NOTICE 'All SQL pairing/RLS/occupancy assertions passed!';
END;
$$;

ROLLBACK;
