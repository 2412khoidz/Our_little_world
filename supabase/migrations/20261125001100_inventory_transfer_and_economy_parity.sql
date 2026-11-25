-- Quality transfer between scopes + economy saturation parity with TS ledgerMath.

CREATE OR REPLACE FUNCTION public._economy_saturation_mul_bp(
  p_unit_index integer,
  p_threshold integer DEFAULT 20,
  p_step_bp integer DEFAULT 250,
  p_floor_bp integer DEFAULT 7000
)
RETURNS integer
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF p_unit_index IS NULL OR p_unit_index < 0
     OR p_threshold IS NULL OR p_threshold < 0
     OR p_step_bp IS NULL OR p_step_bp < 0
     OR p_floor_bp IS NULL OR p_floor_bp < 0 OR p_floor_bp > 10000 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_unit_index < p_threshold THEN
    RETURN 10000;
  END IF;
  RETURN GREATEST(p_floor_bp, 10000 - p_step_bp * (p_unit_index - p_threshold + 1));
END;
$$;
REVOKE EXECUTE ON FUNCTION public._economy_saturation_mul_bp(integer, integer, integer, integer)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.inventory_transfer_quality(
  p_world_id uuid,
  p_from_scope text,
  p_to_scope text,
  p_item_sku text,
  p_quality text,
  p_qty integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req_hash text;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 OR p_qty IS NULL OR p_qty < 1 OR p_qty > 9999 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_quality IS NULL OR p_quality NOT IN ('normal', 'silver', 'gold') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_from_scope NOT IN ('shared', 'user:' || v_uid::text)
     OR p_to_scope NOT IN ('shared', 'user:' || v_uid::text) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_from_scope = p_to_scope THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  v_req_hash := jsonb_build_array(p_from_scope, p_to_scope, p_item_sku, p_quality, p_qty)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'inventory_transfer' OR v_receipt.request_hash <> v_req_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;

  PERFORM public._inventory_adjust_quality(p_world_id, p_from_scope, p_item_sku, -p_qty, p_quality);
  PERFORM public._inventory_adjust_quality(p_world_id, p_to_scope, p_item_sku, p_qty, p_quality);

  v_result := public.inventory_get(p_world_id);
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'inventory_transfer', p_idempotency_key, v_req_hash, v_result);
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.inventory_transfer_quality(
  uuid, text, text, text, text, integer, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.inventory_transfer_quality(
  uuid, text, text, text, text, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.pet_interact(uuid, uuid, text, integer, text)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.pet_interact(uuid, uuid, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public._build_mailbox_snapshot(p_world_id uuid, p_viewer_id uuid)
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
      WHERE l.world_id = p_world_id AND l.recipient_id = p_viewer_id AND l.opened_at IS NULL
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
          'giftQuality', CASE WHEN l.recipient_id = p_viewer_id AND l.opened_at IS NULL AND l.is_surprise THEN 'normal' ELSE l.gift_quality END,
          'isSurprise', l.is_surprise,
          'openedAt', l.opened_at,
          'createdAt', l.created_at,
          'bodyRedacted', (l.recipient_id = p_viewer_id AND l.opened_at IS NULL AND l.is_surprise),
          'giftRedacted', (l.recipient_id = p_viewer_id AND l.opened_at IS NULL AND l.is_surprise AND l.kind = 'gift')
        )
        ORDER BY l.created_at DESC
      ), '[]'::jsonb)
      FROM public.letters_and_gifts l
      WHERE l.world_id = p_world_id AND (l.sender_id = p_viewer_id OR l.recipient_id = p_viewer_id)
    )
  );
$$;