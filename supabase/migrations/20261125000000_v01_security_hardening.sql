-- V0.1 deployment hardening. Preserve the public RPC signatures and result shapes.

-- An owner and a partner are the only roles in V0.1. Enforce one of each at
-- the database boundary, including privileged writes outside the pairing RPC.
CREATE UNIQUE INDEX world_members_one_per_role
  ON public.world_members (world_id, role);

CREATE OR REPLACE FUNCTION public.redeem_world_invite(
  p_invite_code text,
  p_nickname text,
  p_avatar_config jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_code text := upper(trim(coalesce(p_invite_code, '')));
  v_hash text;
  v_world_id uuid;
  v_invite public.world_invites;
  v_member_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF char_length(v_clean_code) < 6 THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  IF EXISTS (SELECT 1 FROM public.world_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'ALREADY_IN_WORLD';
  END IF;

  v_hash := encode(digest(v_clean_code, 'sha256'), 'hex');

  -- Resolve the world without taking an invite row lock. Invite creation and
  -- rotation already lock the world before touching invite rows.
  SELECT wi.world_id INTO v_world_id
  FROM public.world_invites wi
  WHERE wi.token_hash = v_hash;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  PERFORM 1 FROM public.worlds w WHERE w.id = v_world_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  IF EXISTS (SELECT 1 FROM public.world_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'ALREADY_IN_WORLD';
  END IF;

  -- The token may have been rotated, used or expired while waiting for the lock.
  SELECT * INTO v_invite
  FROM public.world_invites wi
  WHERE wi.world_id = v_world_id AND wi.token_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  IF v_invite.redeemed_at IS NOT NULL THEN
    RAISE EXCEPTION 'INVITE_USED';
  END IF;

  IF v_invite.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'INVITE_EXPIRED';
  END IF;

  SELECT count(*)::integer INTO v_member_count
  FROM public.world_members wm
  WHERE wm.world_id = v_invite.world_id;

  IF v_member_count >= 2 THEN
    RAISE EXCEPTION 'WORLD_FULL';
  END IF;

  PERFORM public.update_my_profile(p_nickname, p_avatar_config);

  INSERT INTO public.world_members (world_id, user_id, role)
  VALUES (v_invite.world_id, v_uid, 'partner')
  ON CONFLICT (user_id) DO NOTHING;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ALREADY_IN_WORLD';
  END IF;

  UPDATE public.world_invites
  SET redeemed_by = v_uid,
      redeemed_at = now()
  WHERE id = v_invite.id;

  RETURN v_invite.world_id;
END;
$$;

-- Existing receipts lack the original caller and arguments. Keep them so
-- a stale key cannot replay a mutation, but refuse to return an unbound result.
ALTER TABLE public.mutation_idempotency
  ADD COLUMN actor_user_id uuid,
  ADD COLUMN request_payload jsonb;

DROP POLICY IF EXISTS mutation_idempotency_select_members ON public.mutation_idempotency;
REVOKE ALL ON TABLE public.mutation_idempotency FROM PUBLIC, anon, authenticated;

-- The caller owns the world row lock before reading or writing a receipt.
CREATE FUNCTION public.read_v01_furniture_receipt(
  p_world_id uuid,
  p_key text,
  p_actor uuid,
  p_action text,
  p_request jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_receipt public.mutation_idempotency;
BEGIN
  SELECT * INTO v_receipt
  FROM public.mutation_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_key;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_receipt.actor_user_id IS DISTINCT FROM p_actor
      OR v_receipt.action IS DISTINCT FROM p_action
      OR v_receipt.request_payload IS DISTINCT FROM p_request THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Idempotency key conflicts with an existing request';
  END IF;

  RETURN v_receipt.result_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.place_furniture(
  p_world_id uuid,
  p_map_id text,
  p_sku text,
  p_tile_x integer,
  p_tile_y integer,
  p_expected_layout_version integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cached jsonb;
  v_request jsonb;
  v_world public.worlds;
  v_item public.furniture_catalog;
  v_placed_count integer;
  v_pid uuid;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_world FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  v_request := jsonb_build_array(p_map_id, p_sku, p_tile_x, p_tile_y, p_expected_layout_version);
  v_cached := public.read_v01_furniture_receipt(p_world_id, p_idempotency_key, v_uid, 'place', v_request);
  IF v_cached IS NOT NULL THEN
    RETURN v_cached;
  END IF;

  IF p_expected_layout_version IS NOT NULL AND v_world.layout_version <> p_expected_layout_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  SELECT * INTO v_item FROM public.furniture_catalog WHERE sku = p_sku;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF NOT (p_map_id = ANY (v_item.allowed_maps)) THEN
    RAISE EXCEPTION 'WRONG_MAP';
  END IF;

  SELECT count(*)::integer INTO v_placed_count
  FROM public.furniture_placements
  WHERE world_id = p_world_id AND sku = p_sku;

  IF v_placed_count >= v_item.starter_quantity THEN
    RAISE EXCEPTION 'STOCK_EXCEEDED';
  END IF;

  PERFORM public.assert_valid_map_footprint(p_map_id, p_tile_x, p_tile_y, v_item.width_tiles, v_item.height_tiles);

  INSERT INTO public.furniture_placements (
    world_id, map_id, sku, layer_slot, tile_x, tile_y, width_tiles, height_tiles, updated_by
  )
  VALUES (
    p_world_id, p_map_id, p_sku, v_item.layer_slot,
    p_tile_x, p_tile_y, v_item.width_tiles, v_item.height_tiles, v_uid
  )
  RETURNING id INTO v_pid;

  PERFORM public.insert_placement_tiles(
    p_world_id, p_map_id, v_item.layer_slot,
    p_tile_x, p_tile_y, v_item.width_tiles, v_item.height_tiles, v_pid
  );

  UPDATE public.worlds
  SET layout_version = layout_version + 1
  WHERE id = p_world_id
  RETURNING layout_version INTO v_world.layout_version;

  v_result := jsonb_build_object(
    'layoutVersion', v_world.layout_version,
    'placement', (
      SELECT jsonb_build_object(
        'id', fp.id,
        'worldId', fp.world_id,
        'mapId', fp.map_id,
        'sku', fp.sku,
        'layerSlot', fp.layer_slot,
        'tileX', fp.tile_x,
        'tileY', fp.tile_y,
        'widthTiles', fp.width_tiles,
        'heightTiles', fp.height_tiles,
        'updatedBy', fp.updated_by,
        'updatedAt', fp.updated_at
      )
      FROM public.furniture_placements fp
      WHERE fp.id = v_pid
    )
  );

  INSERT INTO public.mutation_idempotency (world_id, idempotency_key, action, result_payload, actor_user_id, request_payload)
  VALUES (p_world_id, p_idempotency_key, 'place', v_result, v_uid, v_request);

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_furniture(
  p_world_id uuid,
  p_placement_id uuid,
  p_tile_x integer,
  p_tile_y integer,
  p_expected_layout_version integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cached jsonb;
  v_request jsonb;
  v_world public.worlds;
  v_existing public.furniture_placements;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_world FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  v_request := jsonb_build_array(p_placement_id, p_tile_x, p_tile_y, p_expected_layout_version);
  v_cached := public.read_v01_furniture_receipt(p_world_id, p_idempotency_key, v_uid, 'move', v_request);
  IF v_cached IS NOT NULL THEN
    RETURN v_cached;
  END IF;

  IF p_expected_layout_version IS NOT NULL AND v_world.layout_version <> p_expected_layout_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  SELECT * INTO v_existing
  FROM public.furniture_placements
  WHERE id = p_placement_id AND world_id = p_world_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  PERFORM public.assert_valid_map_footprint(
    v_existing.map_id, p_tile_x, p_tile_y, v_existing.width_tiles, v_existing.height_tiles
  );

  DELETE FROM public.furniture_placement_tiles WHERE placement_id = p_placement_id;

  PERFORM public.insert_placement_tiles(
    p_world_id, v_existing.map_id, v_existing.layer_slot,
    p_tile_x, p_tile_y, v_existing.width_tiles, v_existing.height_tiles, p_placement_id
  );

  UPDATE public.furniture_placements
  SET tile_x = p_tile_x,
      tile_y = p_tile_y,
      updated_by = v_uid,
      updated_at = now()
  WHERE id = p_placement_id;

  UPDATE public.worlds
  SET layout_version = layout_version + 1
  WHERE id = p_world_id
  RETURNING layout_version INTO v_world.layout_version;

  v_result := jsonb_build_object(
    'layoutVersion', v_world.layout_version,
    'placement', (
      SELECT jsonb_build_object(
        'id', fp.id,
        'worldId', fp.world_id,
        'mapId', fp.map_id,
        'sku', fp.sku,
        'layerSlot', fp.layer_slot,
        'tileX', fp.tile_x,
        'tileY', fp.tile_y,
        'widthTiles', fp.width_tiles,
        'heightTiles', fp.height_tiles,
        'updatedBy', fp.updated_by,
        'updatedAt', fp.updated_at
      )
      FROM public.furniture_placements fp
      WHERE fp.id = p_placement_id
    )
  );

  INSERT INTO public.mutation_idempotency (world_id, idempotency_key, action, result_payload, actor_user_id, request_payload)
  VALUES (p_world_id, p_idempotency_key, 'move', v_result, v_uid, v_request);

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_furniture(
  p_world_id uuid,
  p_placement_id uuid,
  p_expected_layout_version integer,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cached jsonb;
  v_request jsonb;
  v_world public.worlds;
  v_deleted_id uuid;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF NOT public.is_world_member(p_world_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_world FROM public.worlds WHERE id = p_world_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  v_request := jsonb_build_array(p_placement_id, p_expected_layout_version);
  v_cached := public.read_v01_furniture_receipt(p_world_id, p_idempotency_key, v_uid, 'remove', v_request);
  IF v_cached IS NOT NULL THEN
    RETURN v_cached;
  END IF;

  IF p_expected_layout_version IS NOT NULL AND v_world.layout_version <> p_expected_layout_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT';
  END IF;

  DELETE FROM public.furniture_placements
  WHERE id = p_placement_id AND world_id = p_world_id
  RETURNING id INTO v_deleted_id;

  IF v_deleted_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  UPDATE public.worlds
  SET layout_version = layout_version + 1
  WHERE id = p_world_id
  RETURNING layout_version INTO v_world.layout_version;

  v_result := jsonb_build_object(
    'layoutVersion', v_world.layout_version,
    'removedId', v_deleted_id
  );

  INSERT INTO public.mutation_idempotency (world_id, idempotency_key, action, result_payload, actor_user_id, request_payload)
  VALUES (p_world_id, p_idempotency_key, 'remove', v_result, v_uid, v_request);

  RETURN v_result;
END;
$$;

-- Explicitly revoke default and direct Supabase grants on V0.1 functions only.
REVOKE EXECUTE ON FUNCTION
  public.assert_valid_map_footprint(text, integer, integer, integer, integer),
  public.insert_placement_tiles(uuid, text, text, integer, integer, integer, integer, uuid),
  public.seed_starter_furniture(uuid, uuid),
  public.read_v01_furniture_receipt(uuid, text, uuid, text, jsonb)
FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION
  public.is_world_member(uuid),
  public.update_my_profile(text, jsonb),
  public.create_couple_world(text, text, jsonb),
  public.create_world_invite(uuid, integer),
  public.get_active_invite_status(uuid),
  public.redeem_world_invite(text, text, jsonb),
  public.get_world_snapshot(),
  public.place_furniture(uuid, text, text, integer, integer, integer, text),
  public.move_furniture(uuid, uuid, integer, integer, integer, text),
  public.remove_furniture(uuid, uuid, integer, text)
FROM PUBLIC, anon, authenticated, service_role;

-- is_world_member is required by the client-facing RLS policies.
GRANT EXECUTE ON FUNCTION
  public.is_world_member(uuid),
  public.update_my_profile(text, jsonb),
  public.create_couple_world(text, text, jsonb),
  public.create_world_invite(uuid, integer),
  public.get_active_invite_status(uuid),
  public.redeem_world_invite(text, text, jsonb),
  public.get_world_snapshot(),
  public.place_furniture(uuid, text, text, integer, integer, integer, text),
  public.move_furniture(uuid, uuid, integer, integer, integer, text),
  public.remove_furniture(uuid, uuid, integer, text)
TO authenticated;

-- Keep both existing V0.1 topic formats. Supabase Realtime Settings must
-- also disable public channel access before deployment.
DROP POLICY IF EXISTS realtime_world_select ON realtime.messages;
CREATE POLICY realtime_world_select
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension IN ('broadcast', 'presence')
    AND realtime.messages.topic = realtime.topic()
    AND EXISTS (
      SELECT 1
      FROM public.world_members wm
      WHERE wm.user_id = auth.uid()
        AND (
          realtime.topic() = ('world:' || wm.world_id::text)
          OR realtime.topic() = ('cinema-spike:' || wm.world_id::text)
        )
    )
  );

DROP POLICY IF EXISTS realtime_world_insert ON realtime.messages;
CREATE POLICY realtime_world_insert
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.messages.extension IN ('broadcast', 'presence')
    AND realtime.messages.topic = realtime.topic()
    AND EXISTS (
      SELECT 1
      FROM public.world_members wm
      WHERE wm.user_id = auth.uid()
        AND (
          realtime.topic() = ('world:' || wm.world_id::text)
          OR realtime.topic() = ('cinema-spike:' || wm.world_id::text)
        )
    )
  );
