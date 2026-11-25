-- Align bowl-authority PET_FULL threshold with Mission 04C `pet_consume_hand_food` (hunger >= 92).
-- Hand-feed RPC name stays on migration 20261125001200 (shared contract with PR #13).

CREATE OR REPLACE FUNCTION public._pet_living_authority_consume_food(
  p_world_id uuid, p_pet_id uuid, p_caregiver uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_bowl public.pet_care_bowls%ROWTYPE;
  v_now bigint := public._pet_living_now_ms();
  v_vitals jsonb;
BEGIN
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id AND world_id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO v_bowl FROM public.pet_care_bowls WHERE world_id = p_world_id FOR UPDATE;
  IF v_bowl.food_portions = 0 THEN RAISE EXCEPTION 'BOWL_EMPTY'; END IF;
  IF v_pet.last_fed_at_ms IS NOT NULL AND v_now < v_pet.last_fed_at_ms + 60000 THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE';
  END IF;
  v_vitals := public._pet_catchup_vitals(v_pet.vitals_jsonb, v_pet.sim_state_at_ms, v_now);
  IF (v_vitals->>'hunger')::integer >= 92 THEN RAISE EXCEPTION 'PET_FULL'; END IF;
  v_vitals := jsonb_set(v_vitals, '{hunger}', to_jsonb(LEAST(100, (v_vitals->>'hunger')::integer + 28)));
  UPDATE public.pets SET vitals_jsonb = v_vitals, last_fed_at_ms = v_now, sim_state_at_ms = v_now,
    emotion = public._pet_derive_mood(v_vitals), version = version + 1, living_version = living_version + 1,
    updated_at = now() WHERE id = p_pet_id;
  UPDATE public.pet_care_bowls SET food_portions = food_portions - 1,
    food_sku = CASE WHEN food_portions = 1 THEN NULL ELSE food_sku END,
    food_quality = CASE WHEN food_portions = 1 THEN NULL ELSE food_quality END,
    version = version + 1 WHERE world_id = p_world_id;
  PERFORM public._pet_living_append_memory(
    p_world_id, p_pet_id, 'ate_bowl', p_caregiver,
    jsonb_build_object('sku', v_bowl.food_sku, 'quality', v_bowl.food_quality),
    v_now);
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pet_living_authority_consume_food(uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated, service_role;