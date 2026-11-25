-- Physical care foundation. All mutations are serialized by world then pet.
CREATE TABLE public.pet_care_bowls (
  world_id uuid PRIMARY KEY REFERENCES public.worlds(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  food_sku text REFERENCES public.item_catalog(sku),
  food_quality text CHECK (food_quality IN ('normal', 'silver', 'gold')),
  food_portions integer NOT NULL DEFAULT 0 CHECK (food_portions BETWEEN 0 AND 2),
  water_volume integer NOT NULL DEFAULT 60 CHECK (water_volume BETWEEN 0 AND 100),
  version integer NOT NULL DEFAULT 1,
  CHECK ((food_portions = 0 AND food_sku IS NULL AND food_quality IS NULL)
      OR (food_portions > 0 AND food_sku IS NOT NULL AND food_quality IS NOT NULL))
);
ALTER TABLE public.pet_care_bowls ENABLE ROW LEVEL SECURITY;
CREATE POLICY pet_care_bowls_select ON public.pet_care_bowls FOR SELECT TO authenticated
  USING (public.is_world_member(world_id));
REVOKE INSERT, UPDATE, DELETE ON public.pet_care_bowls FROM PUBLIC, anon, authenticated;

-- Receipt keys are shared with the existing V0.1.5 RPCs. No client time or RNG.
CREATE FUNCTION public.pet_care_apply(
  p_world_id uuid, p_pet_id uuid, p_action text, p_expected_version integer,
  p_scope text, p_sku text, p_quality text, p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pet public.pets%ROWTYPE;
  v_bowl public.pet_care_bowls%ROWTYPE;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_request text;
  v_result jsonb;
  v_now bigint := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_vitals jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 OR
     p_action IS NULL OR p_action NOT IN ('fill_food', 'eat_food', 'fill_water', 'drink_water') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  -- Consumption needs a server-owned simulation lifecycle. Client claims
  -- cannot establish that the cat reached the bowl and chose to consume.
  IF p_action IN ('eat_food', 'drink_water') THEN
    RAISE EXCEPTION 'SERVER_AUTHORITY_REQUIRED';
  END IF;
  v_request := jsonb_build_array(p_pet_id, p_action, p_expected_version, p_scope, p_sku, p_quality)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'pet_care_apply' OR v_receipt.request_hash <> v_request THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id AND world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  INSERT INTO public.pet_care_bowls (world_id, pet_id)
  VALUES (p_world_id, p_pet_id) ON CONFLICT (world_id) DO NOTHING;
  SELECT * INTO v_bowl FROM public.pet_care_bowls WHERE world_id = p_world_id FOR UPDATE;
  IF v_bowl.pet_id <> p_pet_id THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p_expected_version IS NULL OR p_expected_version <> v_bowl.version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;

  IF p_action = 'fill_food' THEN
    IF p_scope IS NULL OR p_scope NOT IN ('shared', 'user:' || v_uid::text)
       OR p_sku IS DISTINCT FROM 'pet_kibble_basic' OR p_quality IS DISTINCT FROM 'normal' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR';
    END IF;
    IF v_bowl.food_portions >= 2 OR
       (v_bowl.food_portions > 0 AND (v_bowl.food_sku IS DISTINCT FROM p_sku OR v_bowl.food_quality IS DISTINCT FROM p_quality)) THEN
      RAISE EXCEPTION 'BOWL_FULL';
    END IF;
    PERFORM public._inventory_adjust_quality(p_world_id, p_scope, p_sku, -1, p_quality);
    UPDATE public.pet_care_bowls SET food_sku = p_sku, food_quality = p_quality,
      food_portions = food_portions + 1, version = version + 1 WHERE world_id = p_world_id RETURNING * INTO v_bowl;
  ELSIF p_action = 'eat_food' THEN
    IF v_bowl.food_portions = 0 THEN RAISE EXCEPTION 'BOWL_EMPTY'; END IF;
    IF v_pet.last_fed_at_ms IS NOT NULL AND v_now < v_pet.last_fed_at_ms + 60000 THEN
      RAISE EXCEPTION 'COOLDOWN_ACTIVE';
    END IF;
    v_vitals := public._pet_catchup_vitals(v_pet.vitals_jsonb, v_pet.sim_state_at_ms, v_now);
    IF (v_vitals->>'hunger')::integer >= 90 THEN RAISE EXCEPTION 'PET_FULL'; END IF;
    v_vitals := jsonb_set(v_vitals, '{hunger}', to_jsonb(LEAST(100, (v_vitals->>'hunger')::integer + 28)));
    UPDATE public.pets SET vitals_jsonb = v_vitals, last_fed_at_ms = v_now,
      sim_state_at_ms = v_now, emotion = public._pet_derive_mood(v_vitals),
      version = version + 1, updated_at = now() WHERE id = p_pet_id RETURNING * INTO v_pet;
    UPDATE public.pet_care_bowls SET food_portions = food_portions - 1,
      food_sku = CASE WHEN food_portions = 1 THEN NULL ELSE food_sku END,
      food_quality = CASE WHEN food_portions = 1 THEN NULL ELSE food_quality END,
      version = version + 1 WHERE world_id = p_world_id RETURNING * INTO v_bowl;
  ELSIF p_action = 'fill_water' THEN
    IF v_bowl.water_volume >= 100 THEN RAISE EXCEPTION 'BOWL_FULL'; END IF;
    UPDATE public.pet_care_bowls SET water_volume = 100, version = version + 1
    WHERE world_id = p_world_id RETURNING * INTO v_bowl;
  ELSE
    IF v_bowl.water_volume < 10 THEN RAISE EXCEPTION 'BOWL_EMPTY'; END IF;
    IF v_pet.last_watered_at_ms IS NOT NULL AND v_now < v_pet.last_watered_at_ms + 20000 THEN
      RAISE EXCEPTION 'COOLDOWN_ACTIVE';
    END IF;
    UPDATE public.pets SET last_watered_at_ms = v_now, version = version + 1, updated_at = now()
    WHERE id = p_pet_id RETURNING * INTO v_pet;
    UPDATE public.pet_care_bowls SET water_volume = water_volume - 10, version = version + 1
    WHERE world_id = p_world_id RETURNING * INTO v_bowl;
  END IF;
  v_result := jsonb_build_object('bowl', to_jsonb(v_bowl), 'pet', public._pet_row_to_json(v_pet, v_now));
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_care_apply', p_idempotency_key, v_request, v_result);
  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pet_care_apply(uuid, uuid, text, integer, text, text, text, text)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pet_care_apply(uuid, uuid, text, integer, text, text, text, text)
TO authenticated;
