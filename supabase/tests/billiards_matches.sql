BEGIN;
SET LOCAL plpgsql.check_asserts = on;

DO $$
DECLARE
  v_signature text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.record_billiards_match(text,uuid,text,bigint,uuid,uuid,text,jsonb,integer)',
    'public.get_billiards_stats(uuid)'
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

DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  BEGIN
    PERFORM * FROM public.get_billiards_stats(gen_random_uuid());
    RAISE EXCEPTION 'Unauthenticated caller accessed stats';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'UNAUTHENTICATED' THEN RAISE; END IF;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', current_setting('olw.test.owner'), true);
SELECT set_config('olw.test.world', public.create_couple_world('Billiards Test', 'Owner', '{}'::jsonb)::text, true);
SELECT set_config('olw.test.invite', invite_code, true)
FROM public.create_world_invite(current_setting('olw.test.world')::uuid, 24);

SELECT set_config('request.jwt.claim.sub', current_setting('olw.test.partner'), true);
SELECT public.redeem_world_invite(current_setting('olw.test.invite'), 'Partner', '{}'::jsonb);

DO $$
DECLARE
  v_world uuid := current_setting('olw.test.world')::uuid;
  v_owner uuid := current_setting('olw.test.owner')::uuid;
  v_partner uuid := current_setting('olw.test.partner')::uuid;
  v_outsider uuid := current_setting('olw.test.outsider')::uuid;
  v_wins bigint;
  v_cnt integer;
BEGIN
  -- Owner records match 1
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  SELECT wins INTO v_wins
  FROM public.record_billiards_match(
    'match-001',
    v_world,
    '8ball',
    20261126,
    v_owner,
    v_partner,
    'Owner sunk 8-ball cleanly',
    '[{"shotIndex":0,"playerSlot":0}]'::jsonb,
    45
  )
  WHERE user_id = v_owner;
  ASSERT v_wins = 1;

  -- Partner reports the SAME match_id -> idempotent ON CONFLICT DO NOTHING
  PERFORM set_config('request.jwt.claim.sub', v_partner::text, true);
  SELECT wins INTO v_wins
  FROM public.record_billiards_match(
    'match-001',
    v_world,
    '8ball',
    20261126,
    v_owner,
    v_partner,
    'Duplicate client report',
    '[{"shotIndex":0,"playerSlot":0}]'::jsonb,
    45
  )
  WHERE user_id = v_owner;
  ASSERT v_wins = 1;

  SELECT count(*)::integer INTO v_cnt
  FROM public.billiards_matches
  WHERE world_id = v_world AND match_id = 'match-001';
  ASSERT v_cnt = 1;

  -- Direct insert must be blocked by RLS
  BEGIN
    INSERT INTO public.billiards_matches (match_id, world_id, rule, rack_seed, winner_user_id, loser_user_id)
    VALUES ('direct-insert', v_world, '8ball', 123, v_owner, v_partner);
    RAISE EXCEPTION 'Direct insert succeeded under RLS';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Reject distinct-player violation
  BEGIN
    PERFORM * FROM public.record_billiards_match('match-bad-pair', v_world, '8ball', 1, v_owner, v_owner, '', '[]'::jsonb, 10);
    RAISE EXCEPTION 'Same winner/loser accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'VALIDATION_ERROR%' THEN RAISE; END IF;
  END;

  -- Reject non-member winner/loser
  BEGIN
    PERFORM * FROM public.record_billiards_match('match-outsider-win', v_world, '9ball', 1, v_outsider, v_owner, '', '[]'::jsonb, 10);
    RAISE EXCEPTION 'Non-member winner accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
  END;

  -- Outsider cannot read or record
  PERFORM set_config('request.jwt.claim.sub', v_outsider::text, true);
  BEGIN
    PERFORM * FROM public.get_billiards_stats(v_world);
    RAISE EXCEPTION 'Outsider read stats';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM * FROM public.record_billiards_match('match-outsider-call', v_world, '8ball', 1, v_owner, v_partner, '', '[]'::jsonb, 10);
    RAISE EXCEPTION 'Outsider recorded match';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
  END;
END;
$$;

ROLLBACK;
