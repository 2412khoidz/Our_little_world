-- V0.1.5 Migration 1 (OLW-015-01): Minimum Inventory Foundation (K5) & Read-Only item_catalog
-- Keeps V0.1 migrations 20261124000100..0300 untouched and aligns cleanly with future V0.2.0 economy catalog.

CREATE TABLE IF NOT EXISTS public.item_catalog (
  sku text PRIMARY KEY,
  name_vi text NOT NULL,
  description_vi text NOT NULL DEFAULT '',
  purpose text NOT NULL CHECK (purpose IN ('pet_food', 'gift', 'stationery', 'keepsake', 'seed', 'crop', 'fish', 'dish', 'ingredient')),
  stack_limit integer NOT NULL CHECK (stack_limit BETWEEN 1 AND 999),
  tradeable boolean NOT NULL DEFAULT false
);

ALTER TABLE public.item_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS item_catalog_read_authenticated ON public.item_catalog;
CREATE POLICY item_catalog_read_authenticated
  ON public.item_catalog
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.item_catalog (sku, name_vi, description_vi, purpose, stack_limit, tradeable)
VALUES
  ('pet_kibble_basic', 'Hạt mèo cơ bản', 'Phần hạt ấm bụng miễn phí hằng ngày cho bé mèo cam.', 'pet_food', 10, false),
  ('gift_flower_bouquet', 'Bó hoa nhỏ dịu dàng', 'Món quà nhỏ giữ trong ngăn riêng để tạo bất ngờ cho người thương.', 'gift', 5, false),
  ('gift_strawberry_cake', 'Bánh dâu ngọt ngào', 'Miếng bánh dâu xinh xắn có thể gửi kèm thư tay.', 'gift', 5, false),
  ('gift_plush_cat', 'Thú bông mèo cam nhỏ', 'Gối ôm nho nhỏ mang hơi ấm căn nhà chung.', 'gift', 3, false),
  ('gift_star_jar', 'Hũ sao giấy kỷ niệm', 'Những ngôi sao giấy gấp tay lưu giữ lời chúc.', 'keepsake', 5, false),
  ('letter_stationery_pink', 'Giấy viết thư hoa anh đào', 'Bộ giấy thư màu phấn hồng cho những lời nhắn ấm áp.', 'stationery', 10, false)
ON CONFLICT (sku) DO UPDATE
SET name_vi = EXCLUDED.name_vi,
    description_vi = EXCLUDED.description_vi,
    purpose = EXCLUDED.purpose,
    stack_limit = EXCLUDED.stack_limit,
    tradeable = EXCLUDED.tradeable;

CREATE TABLE IF NOT EXISTS public.inventory_items (
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  owner_scope text NOT NULL CHECK (owner_scope = 'shared' OR owner_scope ~ '^user:[0-9a-f-]+$'),
  item_sku text NOT NULL REFERENCES public.item_catalog(sku),
  qty integer NOT NULL CHECK (qty > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, owner_scope, item_sku)
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_items_select_scoped ON public.inventory_items;
CREATE POLICY inventory_items_select_scoped
  ON public.inventory_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_world_member(world_id)
    AND (owner_scope = 'shared' OR owner_scope = ('user:' || auth.uid()::text))
  );

-- RPC-private idempotency replay table for V0.1.5+ (never grants client SELECT so private scopes/notes cannot leak)
CREATE TABLE IF NOT EXISTS public.v015_rpc_idempotency (
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, idempotency_key)
);

ALTER TABLE public.v015_rpc_idempotency ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.world_daily_kibble_claims (
  world_id uuid PRIMARY KEY REFERENCES public.worlds(id) ON DELETE CASCADE,
  last_claimed_date date NOT NULL,
  last_claimed_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.world_daily_kibble_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS world_daily_kibble_read_members ON public.world_daily_kibble_claims;
CREATE POLICY world_daily_kibble_read_members
  ON public.world_daily_kibble_claims
  FOR SELECT
  TO authenticated
  USING (public.is_world_member(world_id));

-- Internal atomic inventory adjuster (revoked from client; called strictly by SECURITY DEFINER RPCs)
CREATE OR REPLACE FUNCTION public._inventory_adjust_item(
  p_world_id uuid,
  p_owner_scope text,
  p_item_sku text,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stack_limit integer;
  v_cur integer;
  v_next integer;
BEGIN
  IF p_owner_scope <> 'shared' AND p_owner_scope !~ '^user:[0-9a-f-]+$' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  SELECT stack_limit INTO v_stack_limit
  FROM public.item_catalog
  WHERE sku = p_item_sku;

  IF v_stack_limit IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT qty INTO v_cur
  FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku
  FOR UPDATE;

  v_cur := COALESCE(v_cur, 0);
  v_next := v_cur + p_delta;

  IF v_next < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_ITEMS';
  END IF;
  IF v_next > v_stack_limit THEN
    RAISE EXCEPTION 'STACK_FULL';
  END IF;

  IF v_next = 0 THEN
    DELETE FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku;
  ELSE
    INSERT INTO public.inventory_items (world_id, owner_scope, item_sku, qty, updated_at)
    VALUES (p_world_id, p_owner_scope, p_item_sku, v_next, now())
    ON CONFLICT (world_id, owner_scope, item_sku) DO UPDATE
    SET qty = v_next,
        updated_at = now();
  END IF;

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public._inventory_adjust_item(uuid, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._inventory_adjust_item(uuid, text, text, integer) FROM authenticated;

CREATE OR REPLACE FUNCTION public.inventory_get(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_last_claim date;
  v_kibble_qty integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT last_claimed_date INTO v_last_claim
  FROM public.world_daily_kibble_claims
  WHERE world_id = p_world_id;

  SELECT COALESCE(qty, 0) INTO v_kibble_qty
  FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic';

  RETURN jsonb_build_object(
    'worldId', p_world_id,
    'serverNowMs', floor(extract(epoch from now()) * 1000)::bigint,
    'serverDateUtc', to_char(v_today, 'YYYY-MM-DD'),
    'canClaimFreeKibble', (COALESCE(v_kibble_qty, 0) = 0 AND (v_last_claim IS NULL OR v_last_claim < v_today)),
    'catalog', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'sku', c.sku,
        'nameVi', c.name_vi,
        'descriptionVi', c.description_vi,
        'purpose', c.purpose,
        'stackLimit', c.stack_limit,
        'tradeable', c.tradeable
      ) ORDER BY c.sku), '[]'::jsonb)
      FROM public.item_catalog c
    ),
    'items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'worldId', i.world_id,
        'ownerScope', i.owner_scope,
        'itemSku', i.item_sku,
        'qty', i.qty,
        'updatedAt', i.updated_at
      ) ORDER BY i.owner_scope, i.item_sku), '[]'::jsonb)
      FROM public.inventory_items i
      WHERE i.world_id = p_world_id
        AND (i.owner_scope = 'shared' OR i.owner_scope = ('user:' || v_uid::text))
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.inventory_get(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.inventory_claim_free_kibble(
  p_world_id uuid,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_last_claim date;
  v_kibble_qty integer := 0;
  v_idem public.v015_rpc_idempotency%ROWTYPE;
  v_req_hash text := 'claim_free_kibble:' || p_world_id::text;
  v_res jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  -- Lock world row first per K5 concurrency invariant
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_idem
  FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_idem.actor_id <> v_uid OR v_idem.action <> 'claim_free_kibble' OR v_idem.request_hash <> v_req_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_idem.response_jsonb;
  END IF;

  SELECT COALESCE(qty, 0) INTO v_kibble_qty
  FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic';

  SELECT last_claimed_date INTO v_last_claim
  FROM public.world_daily_kibble_claims
  WHERE world_id = p_world_id;

  IF COALESCE(v_kibble_qty, 0) > 0 OR (v_last_claim IS NOT NULL AND v_last_claim >= v_today) THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;

  PERFORM public._inventory_adjust_item(p_world_id, 'shared', 'pet_kibble_basic', 3);

  INSERT INTO public.world_daily_kibble_claims (world_id, last_claimed_date, last_claimed_by, updated_at)
  VALUES (p_world_id, v_today, v_uid, now())
  ON CONFLICT (world_id) DO UPDATE
  SET last_claimed_date = v_today,
      last_claimed_by = v_uid,
      updated_at = now();

  v_res := public.inventory_get(p_world_id);

  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'claim_free_kibble', p_idempotency_key, v_req_hash, v_res);

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.inventory_claim_free_kibble(uuid, text) TO authenticated;
