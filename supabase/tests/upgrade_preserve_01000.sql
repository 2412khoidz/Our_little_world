-- Post-upgrade preservation checks (requires upgrade_pre_01000_seed.sql + tail migrations).
BEGIN;
SET LOCAL plpgsql.check_asserts = on;

DO $$
DECLARE
  v_world uuid;
  v_owner uuid;
  v_partner uuid;
  v_pet uuid;
BEGIN
  SELECT world_id, owner_id, partner_id, pet_id
  INTO v_world, v_owner, v_partner, v_pet
  FROM public.olw_upgrade_fixture
  LIMIT 1;
  ASSERT v_world IS NOT NULL, 'olw_upgrade_fixture missing — run upgrade seed before tail migrations';

  ASSERT (SELECT count(*) FROM public.world_members WHERE world_id = v_world) = 2;
  ASSERT (SELECT gift_quality FROM public.letters_and_gifts WHERE world_id = v_world LIMIT 1) = 'normal';

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  ASSERT (
    SELECT COALESCE((elem->>'qty')::int, 0)
    FROM jsonb_array_elements(public.inventory_get(v_world)->'items') elem
    WHERE elem->>'ownerScope' = 'shared' AND elem->>'itemSku' = 'pet_kibble_basic'
  ) = 5;

  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  ASSERT (public.mailbox_list(v_world) #>> '{items,0,giftRedacted}')::boolean;
  ASSERT public.mailbox_list(v_world) #>> '{items,0,giftQuality}' = 'normal';

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  BEGIN
    PERFORM public.pet_interact(v_world, v_pet, 'feed', 1, 'upgrade-feed-blocked');
    RAISE EXCEPTION 'legacy feed not blocked after upgrade';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'SERVER_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.mailbox_send_letter_or_gift(
      v_world, v_partner, 'Legacy', 'body', 'gift_flower_bouquet',
      1, 'personal', true, 'legacy-v1-send-key', 'normal');
    RAISE EXCEPTION 'v1 idempotency receipt accepted v2 hash';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'IDEMPOTENCY_CONFLICT' THEN RAISE; END IF;
  END;

  ASSERT EXISTS (SELECT 1 FROM public.furniture_placements WHERE world_id = v_world);
END;
$$;
RESET ROLE;
ROLLBACK;