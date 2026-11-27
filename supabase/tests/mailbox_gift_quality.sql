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
  w := public.create_couple_world('Mailbox quality', 'Owner', '{}');
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
  v_owner uuid := current_setting('olw.test.owner')::uuid;
BEGIN
  PERFORM public._inventory_adjust_quality(w, 'user:' || v_owner::text, 'gift_flower_bouquet', 1, 'gold');
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  w uuid := current_setting('olw.test.world')::uuid;
  v_send jsonb;
  v_open jsonb;
  v_owner uuid := current_setting('olw.test.owner')::uuid;
  v_partner uuid := current_setting('olw.test.partner')::uuid;
  v_letter uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  v_send := public.mailbox_send_letter_or_gift(
    w, v_partner, 'Quà', 'Nội dung', 'gift_flower_bouquet', 1, 'personal', false, 'mq-send', 'gold');
  ASSERT v_send = public.mailbox_send_letter_or_gift(
    w, v_partner, 'Quà', 'Nội dung', 'gift_flower_bouquet', 1, 'personal', false, 'mq-send', 'gold');
  v_letter := (v_send #>> '{mailbox,items,0,id}')::uuid;

  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  v_open := public.mailbox_open_item(w, v_letter, 'mq-open');
  ASSERT (SELECT qty FROM public.inventory_items
          WHERE world_id = w AND owner_scope = 'user:' || v_partner AND item_sku = 'gift_flower_bouquet' AND quality = 'gold') = 1;
END;
$$;
ROLLBACK;