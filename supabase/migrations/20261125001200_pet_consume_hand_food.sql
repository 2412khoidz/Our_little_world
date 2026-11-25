-- Mission 04C / Foundation #10: authoritative hand-feed in pet care (inventory debit + vitals).
-- Canonical RPC `pet_consume_hand_food` — identical on PR #10 and PR #13; dedupe one file on integration merge.
CREATE OR REPLACE FUNCTION public.pet_consume_hand_food(
  p_world_id uuid,
  p_pet_id uuid,
  p_expected_version integer,
  p_scope text,
  p_sku text,
  p_quality text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pet public.pets%ROWTYPE;
  v_receipt public.v015_rpc_idempotency%ROWTYPE;
  v_req text;
  v_now bigint := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_vitals jsonb;
  v_hunger integer;
  v_energy integer;
  v_fun integer;
  v_bump integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_sku NOT IN ('pet_kibble_basic','fish_salmon_bite','fish_carp_grilled','cat_broth_warm','chicken_pumpkin_mash') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_scope IS NULL OR p_scope NOT IN ('shared', 'user:' || v_uid::text) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_quality IS NULL OR p_quality NOT IN ('normal', 'silver', 'gold') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  v_req := jsonb_build_array(p_pet_id, p_sku, p_quality, p_expected_version)::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_receipt FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_receipt.actor_id <> v_uid OR v_receipt.action <> 'pet_consume_hand_food' OR v_receipt.request_hash <> v_req THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_receipt.response_jsonb;
  END IF;

  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id AND world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_pet.version <> p_expected_version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;

  v_vitals := public._pet_catchup_vitals(v_pet.vitals_jsonb, v_pet.sim_state_at_ms, v_now);
  v_hunger := (v_vitals->>'hunger')::integer;
  v_energy := (v_vitals->>'energy')::integer;
  v_fun := (v_vitals->>'fun')::integer;

  IF v_hunger >= 92 THEN RAISE EXCEPTION 'PET_FULL'; END IF;

  PERFORM public._inventory_adjust_quality(p_world_id, p_scope, p_sku, -1, p_quality);

  v_bump := CASE
    WHEN p_sku = 'pet_kibble_basic' THEN 26
    WHEN p_sku LIKE 'fish%' THEN 30
    ELSE 22
  END;

  v_hunger := LEAST(100, v_hunger + v_bump);
  v_energy := LEAST(100, v_energy + 4);
  v_fun := LEAST(100, v_fun + 8);

  UPDATE public.pets SET
    vitals_jsonb = jsonb_build_object('hunger', v_hunger, 'energy', v_energy, 'fun', v_fun),
    emotion = public._pet_derive_mood(jsonb_build_object('hunger', v_hunger, 'energy', v_energy, 'fun', v_fun)),
    last_fed_at_ms = v_now,
    sim_state_at_ms = v_now,
    version = version + 1,
    updated_at = now()
  WHERE id = v_pet.id
  RETURNING * INTO v_pet;

  INSERT INTO public.pet_events (world_id, pet_id, actor_id, event_type, delta_jsonb, idempotency_key)
  VALUES (p_world_id, v_pet.id, v_uid, 'consume_hand_food', jsonb_build_object('sku', p_sku, 'quality', p_quality), p_idempotency_key);

  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'pet_consume_hand_food', p_idempotency_key, v_req,
    jsonb_build_object('pet', public._pet_row_to_json(v_pet, v_now), 'sku', p_sku, 'quality', p_quality));

  RETURN jsonb_build_object('pet', public._pet_row_to_json(v_pet, v_now), 'sku', p_sku, 'quality', p_quality);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pet_consume_hand_food(uuid, uuid, integer, text, text, text, text)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.pet_consume_hand_food(uuid, uuid, integer, text, text, text, text)
TO authenticated;