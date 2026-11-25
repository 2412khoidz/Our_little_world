-- Seed realistic pre-01000 state between "early" and "tail" migrations in run-local-sql-suite.
SET LOCAL plpgsql.check_asserts = on;

CREATE TABLE IF NOT EXISTS public.olw_upgrade_fixture (
  world_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  pet_id uuid,
  letter_id uuid,
  placement_id uuid
);

INSERT INTO auth.users (id)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_owner uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_partner uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_world uuid;
  v_invite text;
  v_pet uuid;
  v_letter uuid;
  v_place jsonb;
  v_placement uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  v_world := public.create_couple_world('Upgrade fixture', 'Owner', '{}');

  SELECT invite_code INTO v_invite FROM public.create_world_invite(v_world, 24);
  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  PERFORM public.redeem_world_invite(v_invite, 'Partner', '{}');

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM public._inventory_adjust_item(v_world, 'shared', 'pet_kibble_basic', 5);
  PERFORM public._inventory_adjust_item(v_world, 'user:' || v_owner::text, 'gift_flower_bouquet', 2);

  v_pet := (public.pet_adopt_or_rename(v_world, 'Quýt', NULL, 'upgrade-pet-adopt')->>'id')::uuid;

  v_place := public.place_furniture(v_world, 'home', 'lamp_floor', 6, 7, 1, 'upgrade-place-1');
  v_placement := (v_place #>> '{placement,id}')::uuid;

  INSERT INTO public.letters_and_gifts (
    world_id, sender_id, recipient_id, kind, subject, body,
    gift_item_sku, gift_qty, is_surprise, created_at
  ) VALUES (
    v_world, v_owner, v_partner, 'gift', 'Pre-upgrade gift', 'See you after migration',
    'gift_flower_bouquet', 1, true, now() - interval '1 hour'
  )
  RETURNING id INTO v_letter;

  INSERT INTO public.v015_rpc_idempotency (
    world_id, actor_id, action, idempotency_key, request_hash, response_jsonb
  ) VALUES (
    v_world,
    v_owner,
    'mailbox_send',
    'legacy-v1-send-key',
    encode(digest(
      jsonb_build_array(
        v_partner, 'Legacy', 'body', 'gift_flower_bouquet',
        1, 'user:' || v_owner::text, true
      )::text,
      'sha256'
    ), 'hex'),
    '{"mailbox":{"items":[]},"inventory":{}}'::jsonb
  );

  INSERT INTO public.mutation_idempotency (world_id, idempotency_key, action, result_payload)
  VALUES (v_world, 'upgrade-legacy-place', 'place', '{"layoutVersion":2}'::jsonb);

  INSERT INTO public.olw_upgrade_fixture (world_id, owner_id, partner_id, pet_id, letter_id, placement_id)
  VALUES (v_world, v_owner, v_partner, v_pet, v_letter, v_placement)
  ON CONFLICT (world_id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    partner_id = EXCLUDED.partner_id,
    pet_id = EXCLUDED.pet_id,
    letter_id = EXCLUDED.letter_id,
    placement_id = EXCLUDED.placement_id;
END;
$$;