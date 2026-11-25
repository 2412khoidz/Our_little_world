-- Pet authority regression: privileged checks run as owner; RPC calls as authenticated.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;

DO $$
BEGIN
  ASSERT has_function_privilege('authenticated', 'public.pet_care_apply(uuid,uuid,text,integer,text,text,text,text)', 'EXECUTE');
  ASSERT has_function_privilege('authenticated', 'public.pet_care_get_snapshot(uuid)', 'EXECUTE');
  ASSERT has_function_privilege('authenticated', 'public.pet_interact(uuid,uuid,text,integer,text)', 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated', 'public._inventory_adjust_quality(uuid,text,text,integer,text)', 'EXECUTE');
  ASSERT NOT has_function_privilege('anon', 'public.pet_care_apply(uuid,uuid,text,integer,text,text,text,text)', 'EXECUTE');
  ASSERT NOT has_function_privilege('anon', 'public.pet_interact(uuid,uuid,text,integer,text)', 'EXECUTE');
END;
$$;

SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true),
       set_config('olw.test.outsider', gen_random_uuid()::text, true);
INSERT INTO auth.users (id)
VALUES
  (current_setting('olw.test.owner')::uuid),
  (current_setting('olw.test.partner')::uuid),
  (current_setting('olw.test.outsider')::uuid);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  w uuid;
  pet_id uuid;
  snap jsonb;
  v_owner uuid := current_setting('olw.test.owner')::uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  w := public.create_couple_world('Authority fixture', 'Owner', '{}');
  PERFORM public.inventory_claim_free_kibble(w, 'auth-kibble');
  pet_id := (public.pet_adopt_or_rename(w, 'Cat', NULL, 'auth-adopt')->>'id')::uuid;

  BEGIN
    PERFORM public.pet_interact(w, pet_id, 'feed', 1, 'auth-feed-bypass');
    RAISE EXCEPTION 'legacy feed bypass accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'SERVER_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.pet_interact(w, pet_id, 'water', 1, 'auth-water-bypass');
    RAISE EXCEPTION 'legacy water bypass accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'SERVER_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.pet_care_apply(w, pet_id, 'eat_food', 1, NULL, NULL, NULL, 'auth-eat');
    RAISE EXCEPTION 'client eat accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'SERVER_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.pet_care_apply(w, pet_id, 'drink_water', 1, NULL, NULL, NULL, 'auth-drink');
    RAISE EXCEPTION 'client drink accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'SERVER_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.pet_care_apply(w, NULL, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'auth-null-pet');
    RAISE EXCEPTION 'null pet id accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT IN ('VALIDATION_ERROR', 'NOT_FOUND') THEN RAISE; END IF;
  END;

  snap := public.pet_care_get_snapshot(w);
  ASSERT (snap->>'version')::integer = 1;

  PERFORM public.pet_care_apply(w, pet_id, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'auth-fill');
  ASSERT public.pet_care_apply(w, pet_id, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'auth-fill')
    = public.pet_care_apply(w, pet_id, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'auth-fill');
  snap := public.pet_care_get_snapshot(w);
  ASSERT (snap->>'foodPortions')::integer = 1;
  ASSERT (snap->>'version')::integer = 2;

  BEGIN
    PERFORM public.pet_care_apply(w, pet_id, 'fill_food', 1, 'shared', 'pet_kibble_basic', 'normal', 'auth-other');
    RAISE EXCEPTION 'stale bowl version accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'VERSION_CONFLICT' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public._inventory_adjust_quality(w, 'shared', 'pet_kibble_basic', -1, 'normal');
    RAISE EXCEPTION 'client called internal helper';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  WHEN raise_exception THEN
    IF SQLERRM <> 'permission denied for function _inventory_adjust_quality' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', current_setting('olw.test.outsider'), true);
  BEGIN
    PERFORM public.pet_care_apply(w, pet_id, 'fill_food', 2, 'shared', 'pet_kibble_basic', 'normal', 'auth-outsider');
    RAISE EXCEPTION 'outsider fill accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK;