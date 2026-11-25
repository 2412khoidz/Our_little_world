-- Mission 02.5: block client-authoritative pet consumption on legacy RPCs;
-- expose read-only care bowl snapshot; quality-aware mailbox gifts.

ALTER TABLE public.letters_and_gifts
  ADD COLUMN IF NOT EXISTS gift_quality text NOT NULL DEFAULT 'normal'
  CHECK (gift_quality IN ('normal', 'silver', 'gold'));

CREATE OR REPLACE FUNCTION public.pet_care_get_snapshot(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bowl public.pet_care_bowls%ROWTYPE;
  v_pet_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT id INTO v_pet_id FROM public.pets WHERE world_id = p_world_id LIMIT 1;
  IF v_pet_id IS NULL THEN
    RETURN jsonb_build_object(
      'worldId', p_world_id,
      'petId', NULL,
      'version', 1,
      'foodPortions', 0,
      'waterVolume', 60,
      'foodSku', NULL,
      'foodQuality', NULL
    );
  END IF;

  SELECT * INTO v_bowl FROM public.pet_care_bowls WHERE world_id = p_world_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'worldId', p_world_id,
      'petId', v_pet_id,
      'version', 1,
      'foodPortions', 0,
      'waterVolume', 60,
      'foodSku', NULL,
      'foodQuality', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'worldId', p_world_id,
    'petId', v_bowl.pet_id,
    'version', v_bowl.version,
    'foodPortions', v_bowl.food_portions,
    'waterVolume', v_bowl.water_volume,
    'foodSku', v_bowl.food_sku,
    'foodQuality', v_bowl.food_quality
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pet_care_get_snapshot(uuid)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.pet_care_get_snapshot(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.pet_interact(
  p_world_id uuid,
  p_pet_id uuid,
  p_action text,
  p_expected_version integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now_ms bigint := floor(extract(epoch from now()) * 1000)::bigint;
  v_pet public.pets%ROWTYPE;
  v_idem public.v015_rpc_idempotency%ROWTYPE;
  v_req_hash text;
  v_caught jsonb;
  v_hunger integer;
  v_energy integer;
  v_fun integer;
  v_kibble_rem integer := 0;
  v_res jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_action NOT IN ('pet', 'feed', 'water') OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  -- Affection petting remains player intent; consumption must use fill_* + server eat/drink.
  IF p_action IN ('feed', 'water') THEN
    RAISE EXCEPTION 'SERVER_AUTHORITY_REQUIRED';
  END IF;

  v_req_hash := 'pet_interact:' || p_pet_id::text || ':' || p_action || ':' || p_expected_version::text;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_idem
  FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_idem.actor_id <> v_uid OR v_idem.action <> 'pet_interact' OR v_idem.request_hash <> v_req_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_idem.response_jsonb;
  END IF;

  SELECT * INTO v_pet FROM public.pets WHERE world_id = p_world_id AND id = p_pet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_pet.version <> p_expected_version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;

  IF p_action = 'pet' AND v_pet.last_petted_at_ms IS NOT NULL AND v_now_ms < v_pet.last_petted_at_ms + 15000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;

  v_caught := public._pet_catchup_vitals(v_pet.vitals_jsonb, v_pet.sim_state_at_ms, v_now_ms);
  v_hunger := (v_caught->>'hunger')::integer;
  v_energy := (v_caught->>'energy')::integer;
  v_fun := (v_caught->>'fun')::integer;

  v_energy := LEAST(100, v_energy + 2);
  v_fun := LEAST(100, v_fun + 12);
  SELECT COALESCE(qty, 0) INTO v_kibble_rem
  FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';

  UPDATE public.pets
  SET vitals_jsonb = jsonb_build_object('hunger', v_hunger, 'energy', v_energy, 'fun', v_fun),
      emotion = public._pet_derive_mood(jsonb_build_object('hunger', v_hunger, 'energy', v_energy, 'fun', v_fun)),
      last_petted_at_ms = v_now_ms,
      sim_state_at_ms = v_now_ms,
      version = version + 1,
      updated_at = now()
  WHERE id = v_pet.id
  RETURNING * INTO v_pet;

  INSERT INTO public.pet_events (world_id, pet_id, actor_id, event_type, delta_jsonb, idempotency_key)
  VALUES (p_world_id, v_pet.id, v_uid, p_action, v_pet.vitals_jsonb, p_idempotency_key);

  v_res := jsonb_build_object(
    'pet', public._pet_row_to_json(v_pet, v_now_ms),
    'action', p_action,
    'kibbleRemaining', COALESCE(v_kibble_rem, 0)
  );

  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_interact', p_idempotency_key, v_req_hash, v_res);
  RETURN v_res;
END;
$$;

-- Mailbox send idempotency hash v2 includes gift_quality (default normal).
-- Receipts created before migration 01000 used a 9-arg digest without quality;
-- retries with the same key must use the same payload or receive IDEMPOTENCY_CONFLICT.

DROP FUNCTION IF EXISTS public.mailbox_send_letter_or_gift(
  uuid, uuid, text, text, text, integer, text, boolean, text);

CREATE OR REPLACE FUNCTION public.mailbox_send_letter_or_gift(
  p_world_id uuid,
  p_recipient_id uuid,
  p_subject text,
  p_body text,
  p_gift_item_sku text DEFAULT NULL,
  p_gift_qty integer DEFAULT 0,
  p_source_scope text DEFAULT 'shared',
  p_is_surprise boolean DEFAULT false,
  p_idempotency_key text DEFAULT '',
  p_gift_quality text DEFAULT 'normal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_subject text := left(btrim(COALESCE(p_subject, '')), 60);
  v_body text := btrim(COALESCE(p_body, ''));
  v_kind text := CASE WHEN p_gift_item_sku IS NOT NULL AND btrim(p_gift_item_sku) <> '' THEN 'gift' ELSE 'letter' END;
  v_scope text;
  v_req_hash text;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_result jsonb;
  v_quality text := COALESCE(NULLIF(btrim(p_gift_quality), ''), 'normal');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_recipient_id = v_uid THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.world_members wm
    WHERE wm.world_id = p_world_id AND wm.user_id = p_recipient_id
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_body = '' OR char_length(v_body) > 500 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF v_subject = '' THEN v_subject := 'Thư nhỏ gửi bạn'; END IF;
  IF v_quality NOT IN ('normal', 'silver', 'gold') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;

  IF v_kind = 'gift' THEN
    IF p_gift_qty < 1 OR p_gift_qty > 10 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
    IF p_source_scope NOT IN ('shared', 'personal') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
    v_scope := CASE WHEN p_source_scope = 'shared' THEN 'shared' ELSE ('user:' || v_uid::text) END;
  END IF;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  IF p_idempotency_key <> '' THEN
    v_req_hash := encode(digest(
      jsonb_build_array(p_recipient_id, v_subject, v_body, p_gift_item_sku,
                        p_gift_qty, v_scope, COALESCE(p_is_surprise, false), v_quality)::text,
      'sha256'
    ), 'hex');
    SELECT * INTO v_receipt
    FROM public.v015_rpc_idempotency
    WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      IF v_receipt.actor_id <> v_uid
          OR v_receipt.action <> 'mailbox_send'
          OR v_receipt.request_hash <> v_req_hash THEN
        RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
      END IF;
      RETURN v_receipt.response_jsonb;
    END IF;
  END IF;

  IF v_kind = 'gift' THEN
    PERFORM public._inventory_adjust_quality(p_world_id, v_scope, p_gift_item_sku, -p_gift_qty, v_quality);
  END IF;

  INSERT INTO public.letters_and_gifts (
    world_id, sender_id, recipient_id, kind, subject, body, gift_item_sku, gift_qty, gift_quality, is_surprise
  ) VALUES (
    p_world_id,
    v_uid,
    p_recipient_id,
    v_kind,
    v_subject,
    v_body,
    CASE WHEN v_kind = 'gift' THEN p_gift_item_sku ELSE NULL END,
    CASE WHEN v_kind = 'gift' THEN p_gift_qty ELSE 0 END,
    CASE WHEN v_kind = 'gift' THEN v_quality ELSE 'normal' END,
    COALESCE(p_is_surprise, false)
  );

  v_result := jsonb_build_object(
    'mailbox', public._build_mailbox_snapshot(p_world_id, v_uid),
    'inventory', public.inventory_get(p_world_id)
  );

  IF p_idempotency_key <> '' THEN
    INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
    VALUES (p_world_id, v_uid, 'mailbox_send', p_idempotency_key, v_req_hash, v_result);
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mailbox_open_item(
  p_world_id uuid,
  p_letter_id uuid,
  p_idempotency_key text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.letters_and_gifts%ROWTYPE;
  v_req_hash text;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  IF p_idempotency_key <> '' THEN
    v_req_hash := encode(digest('mailbox_open:' || p_letter_id::text, 'sha256'), 'hex');
    SELECT * INTO v_receipt
    FROM public.v015_rpc_idempotency
    WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      IF v_receipt.actor_id <> v_uid
          OR v_receipt.action <> 'mailbox_open'
          OR v_receipt.request_hash <> v_req_hash THEN
        RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
      END IF;
      RETURN v_receipt.response_jsonb;
    END IF;
  END IF;

  SELECT * INTO v_row
  FROM public.letters_and_gifts
  WHERE id = p_letter_id AND world_id = p_world_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_row.recipient_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_row.opened_at IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_OPENED'; END IF;

  IF v_row.kind = 'gift' AND v_row.gift_item_sku IS NOT NULL AND v_row.gift_qty > 0 THEN
    PERFORM public._inventory_adjust_quality(
      p_world_id, 'user:' || v_uid::text, v_row.gift_item_sku, v_row.gift_qty, v_row.gift_quality);
  END IF;

  UPDATE public.letters_and_gifts SET opened_at = now() WHERE id = p_letter_id;

  v_result := jsonb_build_object(
    'openedId', p_letter_id,
    'mailbox', public._build_mailbox_snapshot(p_world_id, v_uid),
    'inventory', public.inventory_get(p_world_id)
  );

  IF p_idempotency_key <> '' THEN
    INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
    VALUES (p_world_id, v_uid, 'mailbox_open', p_idempotency_key, v_req_hash, v_result);
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mailbox_send_letter_or_gift(
  uuid, uuid, text, text, text, integer, text, boolean, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.mailbox_send_letter_or_gift(
  uuid, uuid, text, text, text, integer, text, boolean, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mailbox_open_item(uuid, uuid, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.mailbox_open_item(uuid, uuid, text) TO authenticated;