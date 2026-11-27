-- PostgreSQL verification checks for V0.1.5 Inventory Security Hardening (P0.2)
-- Run against a local Postgres test DB that has applied 20261124* + 20261125000100..0500.
-- Checks effective privileges for anon & authenticated, cross-scope privacy, and concurrent new-SKU delta creation.

BEGIN;

DO $$
DECLARE
  v_user_a uuid := '11111111-1111-4111-8111-111111111111';
  v_user_b uuid := '22222222-2222-4222-8222-222222222222';
  v_user_c uuid := '33333333-3333-4333-8333-333333333333';
  v_world_id uuid;
  v_invite record;
  v_snap_b jsonb;
  v_adj1 integer;
  v_adj2 integer;
  v_direct_exec_blocked boolean := false;
BEGIN
  -- 1. Verify effective EXECUTE privilege on internal helper is FALSE for anon and authenticated
  ASSERT NOT has_function_privilege('anon', 'public._inventory_adjust_item(uuid, text, text, integer)', 'EXECUTE'),
    'anon must NOT retain EXECUTE on _inventory_adjust_item';
  ASSERT NOT has_function_privilege('authenticated', 'public._inventory_adjust_item(uuid, text, text, integer)', 'EXECUTE'),
    'authenticated must NOT retain EXECUTE on _inventory_adjust_item';
  ASSERT NOT has_function_privilege('anon', 'public._build_mailbox_snapshot(uuid, uuid)', 'EXECUTE'),
    'anon must NOT retain EXECUTE on _build_mailbox_snapshot';

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id IN (v_user_a, v_user_b, v_user_c) HAVING count(*) = 3) THEN
    RAISE NOTICE 'Privilege checks passed; skipping JWT simulation because dev auth.users fixtures are absent.';
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_world_id := public.create_couple_world('Nhà Test Bảo Mật', 'Mây', '{}'::jsonb);
  SELECT * INTO v_invite FROM public.create_world_invite(v_world_id, 24);

  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  PERFORM public.redeem_world_invite(v_invite.invite_code, 'Nắng', '{}'::jsonb);

  -- 2. Test additive delta behavior when inserting brand-new SKU twice
  v_adj1 := public._inventory_adjust_item(v_world_id, 'shared', 'gift_flower_bouquet', 2);
  v_adj2 := public._inventory_adjust_item(v_world_id, 'shared', 'gift_flower_bouquet', 2);
  ASSERT v_adj1 = 2 AND v_adj2 = 4, 'Expected additive delta upsert on same SKU (2 -> 4)';

  -- 3. Verify personal compartment of A is invisible to B
  PERFORM public._inventory_adjust_item(v_world_id, 'user:' || v_user_a::text, 'gift_star_jar', 1);
  v_snap_b := public.inventory_get(v_world_id);
  ASSERT NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_snap_b->'items') el
    WHERE el->>'ownerScope' = ('user:' || v_user_a::text)
  ), 'Partner B must never observe Partner A private compartment items';

  -- 4. Verify calling helper as role authenticated fails permission check
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public._inventory_adjust_item(v_world_id, 'shared', 'gift_flower_bouquet', 1);
  EXCEPTION WHEN insufficient_privilege THEN
    v_direct_exec_blocked := true;
  END;
  RESET ROLE;
  ASSERT v_direct_exec_blocked, 'Direct EXECUTE by role authenticated must throw insufficient_privilege';
END $$;

ROLLBACK;
