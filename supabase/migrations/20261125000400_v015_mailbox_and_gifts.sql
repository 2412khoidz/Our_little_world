-- V0.1.5 Migration 4 (OLW-015-02): Private Mailbox, Love Letters & Surprise Gifts
-- Direct table SELECT is intentionally revoked so unopened surprise gifts/notes stay server-redacted until opened.

CREATE TABLE IF NOT EXISTS public.letters_and_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  recipient_id uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL CHECK (kind IN ('letter', 'gift')),
  subject text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  gift_item_sku text NULL REFERENCES public.item_catalog(sku),
  gift_qty integer NOT NULL DEFAULT 0 CHECK (gift_qty >= 0 AND gift_qty <= 10),
  is_surprise boolean NOT NULL DEFAULT false,
  opened_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_letters_and_gifts_recipient
  ON public.letters_and_gifts (world_id, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_letters_and_gifts_sender
  ON public.letters_and_gifts (world_id, sender_id, created_at DESC);

ALTER TABLE public.letters_and_gifts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.letters_and_gifts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._build_mailbox_snapshot(
  p_world_id uuid,
  p_viewer_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'worldId', p_world_id,
    'serverNowMs', floor(extract(epoch from now()) * 1000)::bigint,
    'unreadCount', (
      SELECT count(*)::integer
      FROM public.letters_and_gifts l
      WHERE l.world_id = p_world_id
        AND l.recipient_id = p_viewer_id
        AND l.opened_at IS NULL
    ),
    'items', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'worldId', l.world_id,
          'senderId', l.sender_id,
          'recipientId', l.recipient_id,
          'kind', l.kind,
          'subject', l.subject,
          'body', CASE WHEN l.recipient_id = p_viewer_id AND l.opened_at IS NULL AND l.is_surprise THEN NULL ELSE l.body END,
          'giftItemSku', CASE WHEN l.recipient_id = p_viewer_id AND l.opened_at IS NULL AND l.is_surprise THEN NULL ELSE l.gift_item_sku END,
          'giftQty', CASE WHEN l.recipient_id = p_viewer_id AND l.opened_at IS NULL AND l.is_surprise THEN 0 ELSE l.gift_qty END,
          'isSurprise', l.is_surprise,
          'openedAt', l.opened_at,
          'createdAt', l.created_at,
          'bodyRedacted', (l.recipient_id = p_viewer_id AND l.opened_at IS NULL AND l.is_surprise),
          'giftRedacted', (l.recipient_id = p_viewer_id AND l.opened_at IS NULL AND l.is_surprise AND l.kind = 'gift')
        )
        ORDER BY l.created_at DESC
      ), '[]'::jsonb)
      FROM public.letters_and_gifts l
      WHERE l.world_id = p_world_id
        AND (l.sender_id = p_viewer_id OR l.recipient_id = p_viewer_id)
    )
  );
$$;

REVOKE ALL ON FUNCTION public._build_mailbox_snapshot(uuid, uuid) FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION public.mailbox_list(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN public._build_mailbox_snapshot(p_world_id, v_uid);
END;
$$;

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
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_subject text := left(btrim(COALESCE(p_subject, '')), 60);
  v_body text := btrim(COALESCE(p_body, ''));
  v_kind text := CASE WHEN p_gift_item_sku IS NOT NULL AND btrim(p_gift_item_sku) <> '' THEN 'gift' ELSE 'letter' END;
  v_scope text;
  v_req_hash text;
  v_prior_hash text;
  v_prior_resp jsonb;
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
      'mailbox_send:' || p_recipient_id::text || ':' || v_subject || ':' || v_body || ':' || COALESCE(p_gift_item_sku, '') || ':' || p_gift_qty::text,
      'sha256'
    ), 'hex');
    SELECT request_hash, response_jsonb INTO v_prior_hash, v_prior_resp
    FROM public.v015_rpc_idempotency
    WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      IF v_prior_hash <> v_req_hash THEN
        RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
      END IF;
      RETURN v_prior_resp;
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
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.letters_and_gifts%ROWTYPE;
  v_req_hash text;
  v_prior_hash text;
  v_prior_resp jsonb;
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
    SELECT request_hash, response_jsonb INTO v_prior_hash, v_prior_resp
    FROM public.v015_rpc_idempotency
    WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      IF v_prior_hash <> v_req_hash THEN
        RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
      END IF;
      RETURN v_prior_resp;
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

GRANT EXECUTE ON FUNCTION public.mailbox_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mailbox_send_letter_or_gift(uuid, uuid, text, text, text, integer, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mailbox_open_item(uuid, uuid, text) TO authenticated;
