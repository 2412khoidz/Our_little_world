-- V0.1 Migration 2: Starter furniture catalog, placements, tile-level atomic occupancy, idempotency, and snapshot RPCs

CREATE TABLE IF NOT EXISTS public.furniture_catalog (
  sku text PRIMARY KEY,
  name_vi text NOT NULL,
  allowed_maps text[] NOT NULL,
  layer_slot text NOT NULL CHECK (layer_slot IN ('floor', 'object')),
  width_tiles integer NOT NULL CHECK (width_tiles BETWEEN 1 AND 4),
  height_tiles integer NOT NULL CHECK (height_tiles BETWEEN 1 AND 4),
  blocks_movement boolean NOT NULL DEFAULT true,
  starter_quantity integer NOT NULL CHECK (starter_quantity BETWEEN 1 AND 20)
);

ALTER TABLE public.furniture_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS furniture_catalog_read_all ON public.furniture_catalog;
CREATE POLICY furniture_catalog_read_all
  ON public.furniture_catalog
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.furniture_catalog (sku, name_vi, allowed_maps, layer_slot, width_tiles, height_tiles, blocks_movement, starter_quantity)
VALUES
  ('bed_cozy', 'Giường đôi ấm áp', ARRAY['home'], 'object', 2, 2, true, 1),
  ('wardrobe_oak', 'Tủ đồ gỗ sồi', ARRAY['home'], 'object', 1, 1, true, 1),
  ('bookshelf_warm', 'Kệ sách nhỏ', ARRAY['home'], 'object', 1, 1, true, 1),
  ('lamp_floor', 'Đèn đứng ánh vàng', ARRAY['home'], 'object', 1, 1, true, 2),
  ('sofa_cream', 'Ghế sofa kem', ARRAY['home'], 'object', 2, 1, true, 1),
  ('table_wood', 'Bàn gỗ uống trà', ARRAY['home'], 'object', 2, 1, true, 1),
  ('desk_study', 'Bàn học yên tĩnh', ARRAY['home'], 'object', 2, 1, true, 1),
  ('plant_monstera', 'Chậu cây xanh', ARRAY['home'], 'object', 1, 1, true, 3),
  ('rug_peach', 'Thảm đào dệt tay', ARRAY['home'], 'floor', 2, 2, false, 2),
  ('bench_garden', 'Ghế gỗ sân vườn', ARRAY['garden'], 'object', 2, 1, true, 2),
  ('lantern_garden', 'Đèn lồng đá vườn', ARRAY['garden'], 'object', 1, 1, true, 3),
  ('flowerpot_sakura', 'Chậu hoa anh đào', ARRAY['garden'], 'object', 1, 1, true, 3)
ON CONFLICT (sku) DO UPDATE
SET name_vi = EXCLUDED.name_vi,
    allowed_maps = EXCLUDED.allowed_maps,
    layer_slot = EXCLUDED.layer_slot,
    width_tiles = EXCLUDED.width_tiles,
    height_tiles = EXCLUDED.height_tiles,
    blocks_movement = EXCLUDED.blocks_movement,
    starter_quantity = EXCLUDED.starter_quantity;

CREATE TABLE IF NOT EXISTS public.furniture_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  map_id text NOT NULL CHECK (map_id IN ('home', 'garden')),
  sku text NOT NULL REFERENCES public.furniture_catalog(sku),
  layer_slot text NOT NULL CHECK (layer_slot IN ('floor', 'object')),
  tile_x integer NOT NULL,
  tile_y integer NOT NULL,
  width_tiles integer NOT NULL CHECK (width_tiles BETWEEN 1 AND 4),
  height_tiles integer NOT NULL CHECK (height_tiles BETWEEN 1 AND 4),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.furniture_placement_tiles (
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  map_id text NOT NULL CHECK (map_id IN ('home', 'garden')),
  layer_slot text NOT NULL CHECK (layer_slot IN ('floor', 'object')),
  tile_x integer NOT NULL,
  tile_y integer NOT NULL,
  placement_id uuid NOT NULL REFERENCES public.furniture_placements(id) ON DELETE CASCADE,
  PRIMARY KEY (world_id, map_id, layer_slot, tile_x, tile_y)
);

CREATE INDEX IF NOT EXISTS idx_furniture_placements_world
  ON public.furniture_placements (world_id, map_id);

CREATE TABLE IF NOT EXISTS public.mutation_idempotency (
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  action text NOT NULL,
  result_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, idempotency_key)
);

ALTER TABLE public.furniture_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.furniture_placement_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutation_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS furniture_placements_select_members ON public.furniture_placements;
CREATE POLICY furniture_placements_select_members
  ON public.furniture_placements
  FOR SELECT
  TO authenticated
  USING (public.is_world_member(world_id));

DROP POLICY IF EXISTS furniture_tiles_select_members ON public.furniture_placement_tiles;
CREATE POLICY furniture_tiles_select_members
  ON public.furniture_placement_tiles
  FOR SELECT
  TO authenticated
  USING (public.is_world_member(world_id));

DROP POLICY IF EXISTS mutation_idempotency_select_members ON public.mutation_idempotency;
CREATE POLICY mutation_idempotency_select_members
  ON public.mutation_idempotency
  FOR SELECT
  TO authenticated
  USING (public.is_world_member(world_id));

-- Helper: validate map bounds, static walls, and doorway no-place zones identically to src/shared/maps.ts
CREATE OR REPLACE FUNCTION public.assert_valid_map_footprint(
  p_map_id text,
  p_tile_x integer,
  p_tile_y integer,
  p_width integer,
  p_height integer
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_dx integer;
  v_dy integer;
  v_x integer;
  v_y integer;
BEGIN
  FOR v_dy IN 0..(p_height - 1) LOOP
    FOR v_dx IN 0..(p_width - 1) LOOP
      v_x := p_tile_x + v_dx;
      v_y := p_tile_y + v_dy;

      IF p_map_id = 'home' THEN
        IF v_x < 0 OR v_y < 0 OR v_x >= 16 OR v_y >= 12 THEN
          RAISE EXCEPTION 'OUT_OF_BOUNDS';
        END IF;
        IF v_y <= 2 OR v_x = 0 OR v_x = 15 OR (v_y = 11 AND v_x NOT IN (7, 8)) THEN
          RAISE EXCEPTION 'BLOCKED_TILE';
        END IF;
        IF (v_y >= 10 AND v_x IN (7, 8)) OR (v_y = 9 AND v_x IN (7, 8)) THEN
          RAISE EXCEPTION 'NO_PLACE_ZONE';
        END IF;
      ELSIF p_map_id = 'garden' THEN
        IF v_x < 0 OR v_y < 0 OR v_x >= 18 OR v_y >= 14 THEN
          RAISE EXCEPTION 'OUT_OF_BOUNDS';
        END IF;
        IF v_x = 0 OR v_x = 17 OR v_y = 0 OR v_y = 13
           OR (v_y = 1 AND v_x BETWEEN 7 AND 9)
           OR (v_y = 2 AND v_x IN (7, 9))
           OR (v_y = 3 AND v_x IN (2, 3, 14, 15)) THEN
          RAISE EXCEPTION 'BLOCKED_TILE';
        END IF;
        IF (v_y = 2 AND v_x = 8) OR (v_y = 3 AND v_x BETWEEN 7 AND 9) OR (v_y = 4 AND v_x = 8) THEN
          RAISE EXCEPTION 'NO_PLACE_ZONE';
        END IF;
      ELSE
        RAISE EXCEPTION 'WRONG_MAP';
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Helper: insert footprint tiles atomically
CREATE OR REPLACE FUNCTION public.insert_placement_tiles(
  p_world_id uuid,
  p_map_id text,
  p_layer_slot text,
  p_tile_x integer,
  p_tile_y integer,
  p_width integer,
  p_height integer,
  p_placement_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dx integer;
  v_dy integer;
BEGIN
  FOR v_dy IN 0..(p_height - 1) LOOP
    FOR v_dx IN 0..(p_width - 1) LOOP
      INSERT INTO public.furniture_placement_tiles (world_id, map_id, layer_slot, tile_x, tile_y, placement_id)
      VALUES (p_world_id, p_map_id, p_layer_slot, p_tile_x + v_dx, p_tile_y + v_dy, p_placement_id);
    END LOOP;
  END LOOP;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'TILE_OCCUPIED';
END;
$$;

-- Internal helper to seed starter furniture when a world is created
CREATE OR REPLACE FUNCTION public.seed_starter_furniture(p_world_id uuid, p_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_pid uuid;
  v_spec record;
BEGIN
  FOR v_spec IN
    SELECT * FROM (VALUES
      ('home', 'bed_cozy', 1, 3),
      ('home', 'wardrobe_oak', 3, 3),
      ('home', 'lamp_floor', 4, 3),
      ('home', 'bookshelf_warm', 10, 3),
      ('home', 'desk_study', 12, 3),
      ('home', 'plant_monstera', 14, 3),
      ('home', 'rug_peach', 5, 6),
      ('home', 'sofa_cream', 5, 5),
      ('home', 'table_wood', 10, 6),
      ('garden', 'bench_garden', 4, 6),
      ('garden', 'lantern_garden', 7, 5),
      ('garden', 'flowerpot_sakura', 11, 4)
    ) AS t(map_id, sku, tile_x, tile_y)
  LOOP
    SELECT * INTO v_item FROM public.furniture_catalog WHERE sku = v_spec.sku;
    INSERT INTO public.furniture_placements (
      world_id, map_id, sku, layer_slot, tile_x, tile_y, width_tiles, height_tiles, updated_by
    )
    VALUES (
      p_world_id, v_spec.map_id, v_spec.sku, v_item.layer_slot,
      v_spec.tile_x, v_spec.tile_y, v_item.width_tiles, v_item.height_tiles, p_owner_id
    )
    RETURNING id INTO v_pid;

    PERFORM public.insert_placement_tiles(
      p_world_id, v_spec.map_id, v_item.layer_slot,
      v_spec.tile_x, v_spec.tile_y, v_item.width_tiles, v_item.height_tiles, v_pid
    );
  END LOOP;
END;
$$;

-- Override create_couple_world to also seed starter furniture atomically
CREATE OR REPLACE FUNCTION public.create_couple_world(
  p_name text,
  p_nickname text,
  p_avatar_config jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_name text := trim(coalesce(p_name, ''));
  v_world_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF char_length(v_clean_name) < 1 OR char_length(v_clean_name) > 48 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid world name';
  END IF;

  IF EXISTS (SELECT 1 FROM public.world_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'ALREADY_IN_WORLD';
  END IF;

  PERFORM public.update_my_profile(p_nickname, p_avatar_config);

  INSERT INTO public.worlds (name, created_by)
  VALUES (v_clean_name, v_uid)
  RETURNING id INTO v_world_id;

  INSERT INTO public.world_members (world_id, user_id, role)
  VALUES (v_world_id, v_uid, 'owner');

  PERFORM public.seed_starter_furniture(v_world_id, v_uid);

  RETURN v_world_id;
END;
$$;

-- RPC: fetch full world snapshot (returns NULL if user is not yet in any world)
CREATE OR REPLACE FUNCTION public.get_world_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_world_id uuid;
  v_world jsonb;
  v_members jsonb;
  v_placements jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT wm.world_id INTO v_world_id
  FROM public.world_members wm
  WHERE wm.user_id = v_uid
  LIMIT 1;

  IF v_world_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'layoutVersion', w.layout_version,
    'createdAt', w.created_at
  ) INTO v_world
  FROM public.worlds w
  WHERE w.id = v_world_id;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'userId', wm.user_id,
      'role', wm.role,
      'nickname', coalesce(p.nickname, 'Bạn'),
      'avatarConfig', coalesce(p.avatar_config, '{}'::jsonb),
      'joinedAt', wm.joined_at
    ) ORDER BY wm.joined_at ASC
  ), '[]'::jsonb) INTO v_members
  FROM public.world_members wm
  LEFT JOIN public.profiles p ON p.user_id = wm.user_id
  WHERE wm.world_id = v_world_id;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
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
    ) ORDER BY fp.updated_at ASC, fp.id ASC
  ), '[]'::jsonb) INTO v_placements
  FROM public.furniture_placements fp
  WHERE fp.world_id = v_world_id;

  RETURN jsonb_build_object(
    'world', v_world,
    'members', v_members,
    'placements', v_placements
  );
END;
$$;

-- RPC: atomic place_furniture with idempotency and occupancy lock
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

  SELECT result_payload INTO v_cached
  FROM public.mutation_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
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

  INSERT INTO public.mutation_idempotency (world_id, idempotency_key, action, result_payload)
  VALUES (p_world_id, p_idempotency_key, 'place', v_result);

  RETURN v_result;
END;
$$;

-- RPC: atomic move_furniture
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

  SELECT result_payload INTO v_cached
  FROM public.mutation_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
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

  INSERT INTO public.mutation_idempotency (world_id, idempotency_key, action, result_payload)
  VALUES (p_world_id, p_idempotency_key, 'move', v_result);

  RETURN v_result;
END;
$$;

-- RPC: atomic remove_furniture
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

  SELECT result_payload INTO v_cached
  FROM public.mutation_idempotency
  WHERE world_id = p_world_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
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

  INSERT INTO public.mutation_idempotency (world_id, idempotency_key, action, result_payload)
  VALUES (p_world_id, p_idempotency_key, 'remove', v_result);

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_world_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_furniture(uuid, text, text, integer, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_furniture(uuid, uuid, integer, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_furniture(uuid, uuid, integer, text) TO authenticated;
