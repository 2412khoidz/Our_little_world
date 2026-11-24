-- Run on a disposable SQL test database after the V0.1.5 forward fixes.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true);
INSERT INTO auth.users (id)
VALUES (current_setting('olw.test.owner')::uuid), (current_setting('olw.test.partner')::uuid);

DO $$
DECLARE
  v_owner uuid := current_setting('olw.test.owner')::uuid;
  v_world uuid;
  v_invite text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  v_world := public.create_couple_world('Debit fixture', 'Owner', '{}');
  PERFORM set_config('olw.test.world', v_world::text, true);
  SELECT invite_code INTO v_invite FROM public.create_world_invite(v_world, 24);
  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
  PERFORM public.redeem_world_invite(v_invite, 'Partner', '{}');
  ASSERT public._inventory_adjust_item(v_world, 'user:' || v_owner, 'gift_flower_bouquet', 1) = 1;
  BEGIN
    PERFORM public._inventory_adjust_item(v_world, 'shared', 'gift_flower_bouquet', -1);
    RAISE EXCEPTION 'Unexpected debit from an empty stack';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'INSUFFICIENT_ITEMS' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public._inventory_adjust_item(v_world, 'user:' || v_owner, 'gift_flower_bouquet', 2147483647);
    RAISE EXCEPTION 'Unexpected oversized stack';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'STACK_FULL' THEN RAISE; END IF;
  END;
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_owner uuid := current_setting('olw.test.owner')::uuid;
  v_partner uuid := current_setting('olw.test.partner')::uuid;
  v_world uuid := current_setting('olw.test.world')::uuid;
  v_pet uuid;
  v_letter uuid;
  v_feed jsonb;
  v_send jsonb;
  v_open jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM public.inventory_claim_free_kibble(v_world, 'debit-kibble');
  v_pet := (public.pet_adopt_or_rename(v_world, 'Test cat', NULL, 'debit-adopt')->>'id')::uuid;
  v_feed := public.pet_interact(v_world, v_pet, 'feed', 1, 'debit-feed');
  ASSERT (v_feed->>'kibbleRemaining')::integer = 2;
  ASSERT v_feed = public.pet_interact(v_world, v_pet, 'feed', 1, 'debit-feed');
  ASSERT (SELECT qty FROM public.inventory_items
          WHERE world_id = v_world AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic') = 2;

  v_send := public.mailbox_send_letter_or_gift(
    v_world, v_partner, 'Gift fixture', 'Hidden text', 'gift_flower_bouquet', 1, 'personal', true, 'debit-send');
  ASSERT v_send = public.mailbox_send_letter_or_gift(
    v_world, v_partner, 'Gift fixture', 'Hidden text', 'gift_flower_bouquet', 1, 'personal', true, 'debit-send');
  ASSERT NOT EXISTS (SELECT 1 FROM public.inventory_items
                     WHERE world_id = v_world AND owner_scope = 'user:' || v_owner AND item_sku = 'gift_flower_bouquet');
  v_letter := (v_send #>> '{mailbox,items,0,id}')::uuid;
  BEGIN
    PERFORM public.mailbox_send_letter_or_gift(
      v_world, v_partner, 'Gift fixture', 'Hidden text', 'gift_flower_bouquet', 1, 'personal', false, 'debit-send');
    RAISE EXCEPTION 'A changed surprise flag reused the receipt';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'IDEMPOTENCY_CONFLICT' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  ASSERT (public.mailbox_list(v_world) #>> '{items,0,giftRedacted}')::boolean;
  ASSERT public.mailbox_list(v_world) #>> '{items,0,body}' IS NULL;
  v_open := public.mailbox_open_item(v_world, v_letter, 'debit-open');
  ASSERT v_open = public.mailbox_open_item(v_world, v_letter, 'debit-open');
  ASSERT (SELECT qty FROM public.inventory_items
          WHERE world_id = v_world AND owner_scope = 'user:' || v_partner AND item_sku = 'gift_flower_bouquet') = 1;

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  BEGIN
    PERFORM public.mailbox_open_item(v_world, v_letter, 'debit-open');
    RAISE EXCEPTION 'A second actor saw the recipient receipt';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'IDEMPOTENCY_CONFLICT' THEN RAISE; END IF;
  END;
  ASSERT NOT EXISTS (SELECT 1 FROM public.inventory_items
                     WHERE world_id = v_world AND owner_scope = 'user:' || v_partner AND item_sku = 'gift_flower_bouquet');
END;
$$;
RESET ROLE;
ROLLBACK;
