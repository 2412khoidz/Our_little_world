-- V0.1.5 Migration 3 (OLW-015-05): Silent Study Room & Server-Timestamped Pomodoro Co-Presence

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  mode text NOT NULL CHECK (mode IN ('solo', 'shared')),
  phase text NOT NULL CHECK (phase IN ('focus', 'break', 'completed')),
  status text NOT NULL CHECK (status IN ('running', 'paused', 'completed')),
  focus_minutes integer NOT NULL CHECK (focus_minutes BETWEEN 1 AND 180),
  break_minutes integer NOT NULL CHECK (break_minutes BETWEEN 0 AND 60),
  started_at_ms bigint NOT NULL,
  ends_at_ms bigint NOT NULL,
  remaining_ms bigint NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- At most 1 active shared session per world; at most 1 active solo session per user in a world
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_one_active_shared
  ON public.study_sessions (world_id)
  WHERE mode = 'shared' AND status IN ('running', 'paused');

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_one_active_solo
  ON public.study_sessions (world_id, owner_id)
  WHERE mode = 'solo' AND status IN ('running', 'paused');

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS study_sessions_select_scoped ON public.study_sessions;
CREATE POLICY study_sessions_select_scoped
  ON public.study_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.is_world_member(world_id)
    AND (mode = 'shared' OR owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public._study_project_session(
  p_row public.study_sessions,
  p_now_ms bigint
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_phase text := p_row.phase;
  v_status text := p_row.status;
  v_start bigint := p_row.started_at_ms;
  v_end bigint := p_row.ends_at_ms;
  v_rem bigint := p_row.remaining_ms;
  v_break_ms bigint := p_row.break_minutes::bigint * 60000;
BEGIN
  IF v_status = 'running' THEN
    IF v_phase = 'focus' THEN
      IF p_now_ms < v_end THEN
        v_rem := v_end - p_now_ms;
      ELSIF v_break_ms > 0 AND p_now_ms < v_end + v_break_ms THEN
        v_phase := 'break';
        v_start := v_end;
        v_end := v_end + v_break_ms;
        v_rem := v_end - p_now_ms;
      ELSE
        v_phase := 'completed';
        v_status := 'completed';
        v_rem := 0;
      END IF;
    ELSIF v_phase = 'break' THEN
      IF p_now_ms < v_end THEN
        v_rem := v_end - p_now_ms;
      ELSE
        v_phase := 'completed';
        v_status := 'completed';
        v_rem := 0;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', p_row.id,
    'worldId', p_row.world_id,
    'ownerId', p_row.owner_id,
    'mode', p_row.mode,
    'phase', v_phase,
    'status', v_status,
    'focusMinutes', p_row.focus_minutes,
    'breakMinutes', p_row.break_minutes,
    'startedAtMs', v_start,
    'endsAtMs', v_end,
    'remainingMs', GREATEST(0::bigint, v_rem),
    'version', p_row.version,
    'updatedAt', p_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.study_get_snapshot(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now_ms bigint := floor(extract(epoch from now()) * 1000)::bigint;
  v_shared public.study_sessions%ROWTYPE;
  v_solo public.study_sessions%ROWTYPE;
  v_shared_json jsonb := NULL;
  v_solo_json jsonb := NULL;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT * INTO v_shared
  FROM public.study_sessions
  WHERE world_id = p_world_id AND mode = 'shared' AND status IN ('running', 'paused')
  ORDER BY updated_at DESC LIMIT 1;
  IF FOUND THEN
    v_shared_json := public._study_project_session(v_shared, v_now_ms);
    IF (v_shared_json->>'status') = 'completed' THEN v_shared_json := NULL; END IF;
  END IF;

  SELECT * INTO v_solo
  FROM public.study_sessions
  WHERE world_id = p_world_id AND mode = 'solo' AND owner_id = v_uid AND status IN ('running', 'paused')
  ORDER BY updated_at DESC LIMIT 1;
  IF FOUND THEN
    v_solo_json := public._study_project_session(v_solo, v_now_ms);
    IF (v_solo_json->>'status') = 'completed' THEN v_solo_json := NULL; END IF;
  END IF;

  RETURN jsonb_build_object(
    'worldId', p_world_id,
    'serverNowMs', v_now_ms,
    'sharedSession', v_shared_json,
    'soloSession', v_solo_json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.study_get_snapshot(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_start_session(
  p_world_id uuid,
  p_mode text,
  p_focus_minutes integer,
  p_break_minutes integer,
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
  v_idem public.v015_rpc_idempotency%ROWTYPE;
  v_req_hash text;
  v_ends_ms bigint;
  v_res jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_mode NOT IN ('solo', 'shared')
     OR p_focus_minutes NOT BETWEEN 1 AND 180
     OR p_break_minutes NOT BETWEEN 0 AND 60
     OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  v_req_hash := 'study_start:' || p_mode || ':' || p_focus_minutes::text || ':' || p_break_minutes::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_idem
  FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_idem.actor_id <> v_uid OR v_idem.action <> 'study_start_session' OR v_idem.request_hash <> v_req_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_idem.response_jsonb;
  END IF;

  -- Close any expired prior active row of the matching mode before starting a fresh one
  UPDATE public.study_sessions
  SET status = 'completed', phase = 'completed', remaining_ms = 0, updated_at = now()
  WHERE world_id = p_world_id
    AND mode = p_mode
    AND status IN ('running', 'paused')
    AND (p_mode = 'shared' OR owner_id = v_uid)
    AND (status = 'running' AND (ends_at_ms + break_minutes::bigint * 60000) <= v_now_ms);

  IF EXISTS (
    SELECT 1 FROM public.study_sessions
    WHERE world_id = p_world_id
      AND mode = p_mode
      AND status IN ('running', 'paused')
      AND (p_mode = 'shared' OR owner_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  v_ends_ms := v_now_ms + (p_focus_minutes::bigint * 60000);
  INSERT INTO public.study_sessions (
    world_id, owner_id, mode, phase, status, focus_minutes, break_minutes, started_at_ms, ends_at_ms, remaining_ms, version
  )
  VALUES (
    p_world_id, v_uid, p_mode, 'focus', 'running', p_focus_minutes, p_break_minutes, v_now_ms, v_ends_ms, p_focus_minutes::bigint * 60000, 1
  );

  v_res := public.study_get_snapshot(p_world_id);
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'study_start_session', p_idempotency_key, v_req_hash, v_res);
  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.study_start_session(uuid, text, integer, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.study_control_session(
  p_world_id uuid,
  p_session_id uuid,
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
  v_row public.study_sessions%ROWTYPE;
  v_idem public.v015_rpc_idempotency%ROWTYPE;
  v_req_hash text;
  v_proj jsonb;
  v_next_rem bigint;
  v_res jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT public.is_world_member(p_world_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_action NOT IN ('pause', 'resume', 'finish') OR p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;

  v_req_hash := 'study_control:' || p_session_id::text || ':' || p_action || ':' || p_expected_version::text;
  PERFORM 1 FROM public.worlds WHERE id = p_world_id FOR UPDATE;

  SELECT * INTO v_idem
  FROM public.v015_rpc_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_idem.actor_id <> v_uid OR v_idem.action <> 'study_control_session' OR v_idem.request_hash <> v_req_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_idem.response_jsonb;
  END IF;

  SELECT * INTO v_row FROM public.study_sessions WHERE world_id = p_world_id AND id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_row.owner_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_row.version <> p_expected_version THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;

  v_proj := public._study_project_session(v_row, v_now_ms);
  v_next_rem := GREATEST(0::bigint, (v_proj->>'remainingMs')::bigint);

  IF p_action = 'finish' OR (v_proj->>'status') = 'completed' THEN
    UPDATE public.study_sessions
    SET phase = 'completed', status = 'completed', remaining_ms = 0, version = version + 1, updated_at = now()
    WHERE id = v_row.id;
  ELSIF p_action = 'pause' AND (v_proj->>'status') = 'running' THEN
    UPDATE public.study_sessions
    SET phase = (v_proj->>'phase'),
        started_at_ms = (v_proj->>'startedAtMs')::bigint,
        ends_at_ms = (v_proj->>'endsAtMs')::bigint,
        status = 'paused',
        remaining_ms = v_next_rem,
        version = version + 1,
        updated_at = now()
    WHERE id = v_row.id;
  ELSIF p_action = 'resume' AND v_row.status = 'paused' THEN
    UPDATE public.study_sessions
    SET status = 'running',
        started_at_ms = v_now_ms,
        ends_at_ms = v_now_ms + v_row.remaining_ms,
        version = version + 1,
        updated_at = now()
    WHERE id = v_row.id;
  END IF;

  v_res := public.study_get_snapshot(p_world_id);
  INSERT INTO public.v015_rpc_idempotency (world_id, actor_id, action, idempotency_key, request_hash, response_jsonb)
  VALUES (p_world_id, v_uid, 'study_control_session', p_idempotency_key, v_req_hash, v_res);
  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.study_control_session(uuid, uuid, text, integer, text) TO authenticated;
