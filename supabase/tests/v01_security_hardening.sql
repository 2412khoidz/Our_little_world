-- Run after the V0.1 migrations on a disposable local/Test database as its owner.
-- Synthetic records and memberships are rolled back. No real user accounts are needed.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;

DO $$
DECLARE
  v_signature text;
  v_role text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.assert_valid_map_footprint(text,integer,integer,integer,integer)',
    'public.insert_placement_tiles(uuid,text,text,integer,integer,integer,integer,uuid)',
    'public.seed_starter_furniture(uuid,uuid)',
    'public.read_v01_furniture_receipt(uuid,text,uuid,text,jsonb)'
  ] LOOP
    FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      ASSERT NOT has_function_privilege(v_role, v_signature, 'EXECUTE'), v_role || ' can invoke ' || v_signature;
    END LOOP;
  END LOOP;

  FOREACH v_signature IN ARRAY ARRAY[
    'public.is_world_member(uuid)',
    'public.update_my_profile(text,jsonb)',
    'public.create_couple_world(text,text,jsonb)',
    'public.create_world_invite(uuid,integer)',
    'public.get_active_invite_status(uuid)',
    'public.redeem_world_invite(text,text,jsonb)',
    'public.get_world_snapshot()',
    'public.place_furniture(uuid,text,text,integer,integer,integer,text)',
    'public.move_furniture(uuid,uuid,integer,integer,integer,text)',
    'public.remove_furniture(uuid,uuid,integer,text)'
  ] LOOP
    ASSERT     has_function_privilege('authenticated', v_signature, 'EXECUTE'), 'authenticated cannot invoke ' || v_signature;
    ASSERT NOT has_function_privilege('anon',          v_signature, 'EXECUTE'), 'anon can invoke ' || v_signature;
    ASSERT NOT has_function_privilege('service_role',  v_signature, 'EXECUTE'), 'service_role can invoke ' || v_signature;
  END LOOP;
END;
$$;

SELECT set_config('olw.test.owner', gen_random_uuid()::text, true),
       set_config('olw.test.partner', gen_random_uuid()::text, true),
       set_config('olw.test.outsider', gen_random_uuid()::text, true);
INSERT INTO auth.users (id)
VALUES (current_setting('olw.test.owner')::uuid),
       (current_setting('olw.test.partner')::uuid),
       (current_setting('olw.test.outsider')::uuid);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
SELECT set_config('olw.test.world', public.create_couple_world('Security fixture', 'Owner', '{}'::jsonb)::text, true);
SELECT set_config('olw.test.old_invite', invite_code, true)
FROM public.create_world_invite(current_setting('olw.test.world')::uuid, 24);
SELECT set_config('olw.test.invite', invite_code, true)
FROM public.create_world_invite(current_setting('olw.test.world')::uuid, 24);

SELECT set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
DO $$
DECLARE
  v_world uuid := current_setting('olw.test.world')::uuid;
BEGIN
  BEGIN
    PERFORM public.redeem_world_invite(current_setting('olw.test.old_invite'), 'Partner', '{}'::jsonb);
    RAISE EXCEPTION 'Rotated invite was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'INVITE_INVALID' THEN RAISE; END IF;
  END;
  ASSERT public.redeem_world_invite(current_setting('olw.test.invite'), 'Partner', '{}'::jsonb) = v_world;
  ASSERT (SELECT count(*) FROM public.world_members WHERE world_id = v_world) = 2;
END;
$$;

SELECT set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
DO $$
DECLARE
  v_world uuid := current_setting('olw.test.world')::uuid;
  v_first jsonb;
  v_retry jsonb;
  v_id uuid;
  v_move jsonb;
  v_removed jsonb;
BEGIN
  v_first := public.place_furniture(v_world, 'home', 'lamp_floor', 8, 5, 1, 'place-1');
  v_retry := public.place_furniture(v_world, 'home', 'lamp_floor', 8, 5, 1, 'place-1');
  ASSERT v_first = v_retry;
  v_id := (v_first #>> '{placement,id}')::uuid;

  BEGIN
    PERFORM public.place_furniture(v_world, 'home', 'lamp_floor', 9, 5, 1, 'place-1');
    RAISE EXCEPTION 'Key was accepted with changed arguments';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'VALIDATION_ERROR: Idempotency key conflicts with an existing request' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.move_furniture(v_world, v_id, 9, 5, 2, 'place-1');
    RAISE EXCEPTION 'Key was accepted for a different operation';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'VALIDATION_ERROR: Idempotency key conflicts with an existing request' THEN RAISE; END IF;
  END;

  v_move := public.move_furniture(v_world, v_id, 9, 5, 2, 'move-1');
  ASSERT v_move = public.move_furniture(v_world, v_id, 9, 5, 2, 'move-1');
  ASSERT (v_move #>> '{placement,tileX}')::integer = 9;
  v_removed := public.remove_furniture(v_world, v_id, 3, 'remove-1');
  ASSERT v_removed = public.remove_furniture(v_world, v_id, 3, 'remove-1');
  ASSERT (SELECT layout_version FROM public.worlds WHERE id = v_world) = 4;

  BEGIN
    PERFORM public.create_world_invite(v_world, 24);
    RAISE EXCEPTION 'Third slot could be invited';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'WORLD_FULL' THEN RAISE; END IF;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
DO $$
DECLARE
  v_world uuid := current_setting('olw.test.world')::uuid;
BEGIN
  BEGIN
    PERFORM public.place_furniture(v_world, 'home', 'lamp_floor', 8, 5, 1, 'place-1');
    RAISE EXCEPTION 'Key was accepted for a different actor';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'VALIDATION_ERROR: Idempotency key conflicts with an existing request' THEN RAISE; END IF;
  END;
  ASSERT NOT has_table_privilege(current_user, 'public.mutation_idempotency', 'SELECT');
END;
$$;

SELECT set_config('request.jwt.claim.sub', current_setting('olw.test.outsider'), true);
DO $$
DECLARE
  v_world uuid := current_setting('olw.test.world')::uuid;
BEGIN
  ASSERT public.get_world_snapshot() IS NULL;
  ASSERT NOT public.is_world_member(v_world);
  ASSERT NOT EXISTS (SELECT 1 FROM public.worlds WHERE id = v_world);
  ASSERT NOT EXISTS (SELECT 1 FROM public.world_members WHERE world_id = v_world);
  ASSERT NOT EXISTS (SELECT 1 FROM public.world_invites WHERE world_id = v_world);
  ASSERT NOT EXISTS (SELECT 1 FROM public.furniture_placements WHERE world_id = v_world);
  ASSERT NOT EXISTS (SELECT 1 FROM public.furniture_placement_tiles WHERE world_id = v_world);
  BEGIN
    PERFORM public.place_furniture(v_world, 'home', 'lamp_floor', 8, 5, 4, 'outsider');
    RAISE EXCEPTION 'Outsider mutation was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
  END;
END;
$$;

RESET ROLE;
DO $$
DECLARE
  v_world uuid := current_setting('olw.test.world')::uuid;
BEGIN
  BEGIN
    INSERT INTO public.world_members (world_id, user_id, role)
    VALUES (v_world, current_setting('olw.test.outsider')::uuid, 'partner');
    RAISE EXCEPTION 'Database accepted a second partner role';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- Simulate a receipt from a database upgraded in place.
  INSERT INTO public.mutation_idempotency (world_id, idempotency_key, action, result_payload)
  VALUES (v_world, 'legacy-place', 'place', '{"layoutVersion":2}'::jsonb);
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
DO $$
DECLARE
  v_world uuid := current_setting('olw.test.world')::uuid;
BEGIN
  BEGIN
    PERFORM public.place_furniture(v_world, 'home', 'lamp_floor', 8, 5, 4, 'legacy-place');
    RAISE EXCEPTION 'An unbound legacy receipt was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'VALIDATION_ERROR: Idempotency key conflicts with an existing request' THEN RAISE; END IF;
  END;
  ASSERT (SELECT layout_version FROM public.worlds WHERE id = v_world) = 4;
END;
$$;

RESET ROLE;
SELECT set_config('olw.test.topic', 'world:' || current_setting('olw.test.world'), true);
SELECT set_config('olw.test.other_topic', 'world:' || gen_random_uuid()::text, true);
SELECT set_config('olw.test.event', gen_random_uuid()::text, true);

-- Model the authorization probes that Supabase Realtime evaluates under RLS.
INSERT INTO realtime.messages (topic, extension, event)
VALUES (current_setting('olw.test.topic'), 'broadcast', current_setting('olw.test.event')),
       (current_setting('olw.test.topic'), 'presence', current_setting('olw.test.event')),
       (current_setting('olw.test.other_topic'), 'broadcast', current_setting('olw.test.event'));

SET LOCAL ROLE authenticated;
SELECT set_config('realtime.topic', current_setting('olw.test.topic'), true);
DO $$
DECLARE
  v_event text := current_setting('olw.test.event');
  v_topic text;
BEGIN
  FOREACH v_topic IN ARRAY ARRAY[current_setting('olw.test.topic'), 'cinema-spike:' || current_setting('olw.test.world')] LOOP
    PERFORM set_config('realtime.topic', v_topic, true);
    INSERT INTO realtime.messages (topic, extension, event)
    VALUES (v_topic, 'broadcast', v_event), (v_topic, 'presence', v_event);
  END LOOP;

  PERFORM set_config('realtime.topic', current_setting('olw.test.topic'), true);
  ASSERT (SELECT count(*) FROM realtime.messages WHERE event = v_event) = 4, 'Member leaked across topics or lost access';
  BEGIN
    INSERT INTO realtime.messages (topic, extension, event)
    VALUES (current_setting('olw.test.other_topic'), 'broadcast', v_event);
    RAISE EXCEPTION 'Member can publish to a different topic';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO realtime.messages (topic, extension, event)
    VALUES (current_setting('olw.test.topic'), 'persistence', v_event);
    RAISE EXCEPTION 'Member can publish an unsupported extension';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', current_setting('olw.test.outsider'), true);
DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM realtime.messages WHERE event = current_setting('olw.test.event'));
  BEGIN
    INSERT INTO realtime.messages (topic, extension)
    VALUES (current_setting('olw.test.topic'), 'presence');
    RAISE EXCEPTION 'Outsider can publish presence';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM realtime.messages WHERE event = current_setting('olw.test.event'));
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;

RESET ROLE;
ROLLBACK;
