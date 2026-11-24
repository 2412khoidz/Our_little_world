-- V0.1.5 — Preserve positive inventory rows and bind mailbox receipts.
-- Forward fix. The earlier migration files and public RPC signatures stay intact.

CREATE OR REPLACE FUNCTION public._inventory_adjust_item(
  p_world_id uuid,
  p_owner_scope text,
  p_item_sku text,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_stack_limit integer;
  v_current integer;
  v_next bigint;
BEGIN
  IF p_owner_scope IS NULL OR p_delta IS NULL
     OR (p_owner_scope <> 'shared' AND p_owner_scope !~ '^user:[0-9a-f-]+$') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT stack_limit INTO v_stack_limit FROM public.item_catalog WHERE sku = p_item_sku;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT qty INTO v_current
  FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku
  FOR UPDATE;
  v_next := COALESCE(v_current, 0)::bigint + p_delta;

  IF v_next < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_ITEMS';
  END IF;
  IF v_next > v_stack_limit THEN
    RAISE EXCEPTION 'STACK_FULL';
  END IF;

  -- An excluded row is checked before upsert conflict handling. Write the
  -- final positive quantity only, or remove the row when the stack is empty.
  IF v_next = 0 THEN
    DELETE FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku;
  ELSE
    INSERT INTO public.inventory_items (world_id, owner_scope, item_sku, qty, updated_at)
    VALUES (p_world_id, p_owner_scope, p_item_sku, v_next::integer, now())
    ON CONFLICT (world_id, owner_scope, item_sku) DO UPDATE
    SET qty = EXCLUDED.qty, updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN v_next::integer;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._inventory_adjust_item(uuid, text, text, integer)
FROM PUBLIC, anon, authenticated, service_role;

-- Return cached private data only to the actor who created the receipt.
-- Bind new send receipts to all semantic fields, including the scope and surprise.

CREATE OR REPLACE FUNCTION public.mailbox_send_letter_or_gift(
  p_world_id uuid,
  p_recipient_id uuid,
  p_subject text,
  p_body text,
  p_gift_item_sku text DEFAULT NULL,
  p_gift_qty integer DEFAULT 0,
  p_source_scope text DEFAULT 'shared',
  p_is_surprise boolean DEFAULT false,
  p_idempotency_key text DEFAULT ''
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_recipient_id = v_uid THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.world_members wm
    WHERE wm.world_id = p_world_id AND wm.user_id = p_recipient_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_body = '' OR char_length(v_body) > 500 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF v_subject = '' THEN
    v_subject := 'Thư nhỏ gửi bạn';
  END IF;

  IF v_kind = 'gift' THEN
    IF p_gift_qty < 1 OR p_gift_qty > 10 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR';
    END IF;
    IF p_source_scope NOT IN ('shared', 'personal') THEN
      RAISE EXCEPTION 'VALIDATION_ERROR';
    END IF;
    v_scope := CASE WHEN p_source_scope = 'shared' THEN 'shared' ELSE ('user:' || v_uid::text) END;
  END IF;

  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  IF p_idempotency_key <> '' THEN
    v_req_hash := encode(digest(
      jsonb_build_array(p_recipient_id, v_subject, v_body, p_gift_item_sku,
                        p_gift_qty, v_scope, COALESCE(p_is_surprise, false))::text,
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
    PERFORM public._inventory_adjust_item(p_world_id, v_scope, p_gift_item_sku, -p_gift_qty);
  END IF;

  INSERT INTO public.letters_and_gifts (
    world_id, sender_id, recipient_id, kind, subject, body, gift_item_sku, gift_qty, is_surprise
  ) VALUES (
    p_world_id,
    v_uid,
    p_recipient_id,
    v_kind,
    v_subject,
    v_body,
    CASE WHEN v_kind = 'gift' THEN p_gift_item_sku ELSE NULL END,
    CASE WHEN v_kind = 'gift' THEN p_gift_qty ELSE 0 END,
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_row.recipient_id <> v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_row.opened_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_OPENED';
  END IF;

  IF v_row.kind = 'gift' AND v_row.gift_item_sku IS NOT NULL AND v_row.gift_qty > 0 THEN
    -- Credits recipient personal compartment atomically; STACK_FULL aborts transaction cleanly so item stays unopened
    PERFORM public._inventory_adjust_item(p_world_id, 'user:' || v_uid::text, v_row.gift_item_sku, v_row.gift_qty);
  END IF;

  UPDATE public.letters_and_gifts
  SET opened_at = now()
  WHERE id = p_letter_id;

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

REVOKE EXECUTE ON FUNCTION
  public.mailbox_send_letter_or_gift(uuid, uuid, text, text, text, integer, text, boolean, text),
  public.mailbox_open_item(uuid, uuid, text)
FROM PUBLIC, anon, service_role;
