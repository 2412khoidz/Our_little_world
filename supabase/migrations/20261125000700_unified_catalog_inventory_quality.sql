-- Preserve existing quantities as normal quality, with a stack limit across tiers.
ALTER TABLE public.inventory_items ADD COLUMN quality text NOT NULL DEFAULT 'normal'
  CHECK (quality IN ('normal', 'silver', 'gold'));
ALTER TABLE public.inventory_items DROP CONSTRAINT inventory_items_pkey;
ALTER TABLE public.inventory_items ADD PRIMARY KEY (world_id, owner_scope, item_sku, quality);

-- Generated SQL preview. Review and commit as a migration only after migration history is resolved.
-- Economy catalog fingerprint: 7076075b
INSERT INTO public.item_catalog (sku, name_vi, description_vi, purpose, stack_limit, tradeable) VALUES
  ('pet_kibble_basic', 'Hạt mèo cơ bản', 'Phần hạt ấm bụng miễn phí hằng ngày cho bé mèo cam.', 'pet_food', 10, false),
  ('gift_flower_bouquet', 'Bó hoa nhỏ dịu dàng', 'Món quà nhỏ giữ trong ngăn riêng để tạo bất ngờ cho người thương.', 'gift', 5, false),
  ('gift_strawberry_cake', 'Bánh dâu ngọt ngào', 'Miếng bánh dâu xinh xắn có thể gửi kèm thư tay.', 'gift', 5, false),
  ('gift_plush_cat', 'Thú bông mèo cam nhỏ', 'Gối ôm nho nhỏ mang hơi ấm căn nhà chung.', 'gift', 3, false),
  ('gift_star_jar', 'Hũ sao giấy kỷ niệm', 'Những ngôi sao giấy gấp tay lưu giữ lời chúc.', 'keepsake', 5, false),
  ('letter_stationery_pink', 'Giấy viết thư hoa anh đào', 'Bộ giấy thư màu phấn hồng cho những lời nhắn ấm áp.', 'stationery', 10, false),
  ('seed_wheat', 'Hạt giống lúa mì', '', 'seed', 99, false),
  ('seed_carrot', 'Hạt giống cà rốt', '', 'seed', 99, false),
  ('seed_tomato', 'Hạt giống cà chua', '', 'seed', 99, false),
  ('seed_strawberry', 'Hạt giống dâu tây', '', 'seed', 99, false),
  ('seed_sunflower', 'Hạt giống hướng dương', '', 'seed', 99, false),
  ('seed_rose_pink', 'Hạt giống hồng phấn', '', 'seed', 99, false),
  ('seed_cabbage', 'Hạt giống bắp cải', '', 'seed', 99, false),
  ('wild_herb', 'Thảo mộc dại', '', 'ingredient', 999, false),
  ('wood_branch', 'Cành gỗ', '', 'ingredient', 999, false),
  ('bait_free_worm', 'Mồi giun miễn phí', '', 'ingredient', 999, false),
  ('bait_shrimp', 'Mồi tép', '', 'ingredient', 999, false),
  ('carp_pond', 'Cá chép ao', '', 'fish', 99, false),
  ('koi_pastel', 'Cá koi pastel', '', 'fish', 99, false),
  ('lotus_trout', 'Cá hồi sen', '', 'fish', 99, false),
  ('wheat', 'Lúa mì', '', 'crop', 99, false),
  ('carrot', 'Cà rốt', '', 'crop', 99, false),
  ('tomato', 'Cà chua', '', 'crop', 99, false),
  ('strawberry', 'Dâu tây', '', 'crop', 99, false),
  ('sunflower', 'Hướng dương', '', 'crop', 99, false),
  ('rose_pink', 'Hồng phấn', '', 'crop', 99, false),
  ('rose_sakura', 'Hồng anh đào', '', 'crop', 99, false),
  ('cabbage', 'Bắp cải', '', 'crop', 99, false),
  ('peach', 'Đào', '', 'crop', 999, false),
  ('sugar_pack', 'Gói đường', '', 'ingredient', 999, false),
  ('spice', 'Gia vị', '', 'ingredient', 999, false),
  ('ribbon', 'Ruy băng', '', 'ingredient', 999, false),
  ('flour', 'Bột mì', '', 'ingredient', 99, false),
  ('carrot_soup', 'Súp cà rốt', '', 'dish', 99, false),
  ('herb_carp', 'Cá chép thảo mộc', '', 'dish', 99, false),
  ('peach_tea', 'Trà đào', '', 'dish', 99, false),
  ('strawberry_tart', 'Bánh tart dâu', '', 'dish', 99, false),
  ('koinori_platter', 'Đĩa koi nori', '', 'dish', 99, false),
  ('sakura_bouquet', 'Bó hoa anh đào', '', 'crop', 99, false),
  ('wood_chair', 'Ghế gỗ', '', 'ingredient', 99, false)
ON CONFLICT (sku) DO UPDATE SET name_vi = EXCLUDED.name_vi, description_vi = EXCLUDED.description_vi, purpose = EXCLUDED.purpose, stack_limit = EXCLUDED.stack_limit, tradeable = EXCLUDED.tradeable;

CREATE OR REPLACE FUNCTION public._inventory_adjust_quality(
  p_world_id uuid,
  p_owner_scope text,
  p_item_sku text,
  p_delta integer,
  p_quality text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_stack_limit integer;
  v_current integer;
  v_total bigint;
  v_next bigint;
BEGIN
  IF p_quality NOT IN ('normal', 'silver', 'gold') OR p_quality IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
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
  WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku AND quality = p_quality
  FOR UPDATE;
  v_next := COALESCE(v_current, 0)::bigint + p_delta;

  IF v_next < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_ITEMS';
  END IF;
  SELECT COALESCE(sum(qty), 0) INTO v_total FROM public.inventory_items
  WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku;
  IF v_total + p_delta > v_stack_limit THEN
    RAISE EXCEPTION 'STACK_FULL';
  END IF;

  -- An excluded row is checked before upsert conflict handling. Write the
  -- final positive quantity only, or remove the row when the stack is empty.
  IF v_next = 0 THEN
    DELETE FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = p_owner_scope AND item_sku = p_item_sku AND quality = p_quality;
  ELSE
    INSERT INTO public.inventory_items (world_id, owner_scope, item_sku, qty, updated_at, quality)
    VALUES (p_world_id, p_owner_scope, p_item_sku, v_next::integer, now(), p_quality)
    ON CONFLICT (world_id, owner_scope, item_sku, quality) DO UPDATE
    SET qty = EXCLUDED.qty, updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN v_next::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public._inventory_adjust_item(
  p_world_id uuid, p_owner_scope text, p_item_sku text, p_delta integer
) RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT public._inventory_adjust_quality(p_world_id, p_owner_scope, p_item_sku, p_delta, 'normal');
$$;
REVOKE EXECUTE ON FUNCTION public._inventory_adjust_item(uuid, text, text, integer),
  public._inventory_adjust_quality(uuid, text, text, integer, text)
FROM PUBLIC, anon, authenticated, service_role;

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
  WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';

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
        'quality', i.quality,
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
  WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';

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

  v_req_hash := 'pet_interact:' || p_pet_id::text || ':' || p_action || ':' || p_expected_version::text;

  -- Lock order: world -> replay check -> pet row -> inventory
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

  IF p_action = 'feed' AND v_pet.last_fed_at_ms IS NOT NULL AND v_now_ms < v_pet.last_fed_at_ms + 60000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;
  IF p_action = 'pet' AND v_pet.last_petted_at_ms IS NOT NULL AND v_now_ms < v_pet.last_petted_at_ms + 15000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;
  IF p_action = 'water' AND v_pet.last_watered_at_ms IS NOT NULL AND v_now_ms < v_pet.last_watered_at_ms + 20000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;

  v_caught := public._pet_catchup_vitals(v_pet.vitals_jsonb, v_pet.sim_state_at_ms, v_now_ms);
  v_hunger := (v_caught->>'hunger')::integer;
  v_energy := (v_caught->>'energy')::integer;
  v_fun := (v_caught->>'fun')::integer;

  IF p_action = 'feed' THEN
    v_kibble_rem := public._inventory_adjust_item(p_world_id, 'shared', 'pet_kibble_basic', -1);
    v_hunger := LEAST(100, v_hunger + 30);
    v_energy := LEAST(100, v_energy + 3);
    v_fun := LEAST(100, v_fun + 5);
  ELSIF p_action = 'pet' THEN
    v_energy := LEAST(100, v_energy + 2);
    v_fun := LEAST(100, v_fun + 12);
    SELECT COALESCE(qty, 0) INTO v_kibble_rem
    FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  ELSE
    v_energy := LEAST(100, v_energy + 2);
    v_fun := LEAST(100, v_fun + 6);
    SELECT COALESCE(qty, 0) INTO v_kibble_rem
    FROM public.inventory_items
    WHERE world_id = p_world_id AND owner_scope = 'shared' AND item_sku = 'pet_kibble_basic' AND quality = 'normal';
  END IF;

  UPDATE public.pets
  SET vitals_jsonb = jsonb_build_object('hunger', v_hunger, 'energy', v_energy, 'fun', v_fun),
      emotion = public._pet_derive_mood(jsonb_build_object('hunger', v_hunger, 'energy', v_energy, 'fun', v_fun)),
      last_fed_at_ms = CASE WHEN p_action = 'feed' THEN v_now_ms ELSE last_fed_at_ms END,
      last_petted_at_ms = CASE WHEN p_action = 'pet' THEN v_now_ms ELSE last_petted_at_ms END,
      last_watered_at_ms = CASE WHEN p_action = 'water' THEN v_now_ms ELSE last_watered_at_ms END,
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
