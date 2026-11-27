BEGIN;
SET LOCAL plpgsql.check_asserts = on;
SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true);
INSERT INTO auth.users (id)
VALUES (current_setting('olw.test.owner')::uuid), (current_setting('olw.test.partner')::uuid);

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  w uuid;
  invite text;
  v_owner uuid := current_setting('olw.test.owner')::uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  w := public.create_couple_world('Transfer fixture', 'Owner', '{}');
  PERFORM set_config('olw.test.world', w::text, true);
  SELECT invite_code INTO invite FROM public.create_world_invite(w, 24);
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
  PERFORM public.redeem_world_invite(invite, 'Partner', '{}');
END;
$$;

RESET ROLE;
DO $$
DECLARE
  w uuid := current_setting('olw.test.world')::uuid;
BEGIN
  PERFORM public._inventory_adjust_quality(w, 'shared', 'gift_flower_bouquet', 2, 'silver');
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  w uuid := current_setting('olw.test.world')::uuid;
  snap jsonb;
  v_owner uuid := current_setting('olw.test.owner')::uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  snap := public.inventory_transfer_quality(
    w, 'shared', 'user:' || v_owner::text, 'gift_flower_bouquet', 'silver', 1, 'xfer-1');
  ASSERT snap = public.inventory_transfer_quality(
    w, 'shared', 'user:' || v_owner::text, 'gift_flower_bouquet', 'silver', 1, 'xfer-1');
  ASSERT EXISTS (
    SELECT 1 FROM jsonb_array_elements(snap->'items') i
    WHERE i->>'ownerScope' = 'user:' || v_owner::text
      AND i->>'itemSku' = 'gift_flower_bouquet'
      AND i->>'quality' = 'silver'
      AND (i->>'qty')::integer = 1
  );
END;
$$;
ROLLBACK;