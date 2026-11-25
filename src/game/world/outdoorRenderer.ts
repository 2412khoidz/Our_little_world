import Phaser from 'phaser';
import { OUTDOOR_LANDMARKS, OUTDOOR_WORLD_SIZE_TILES } from '../../shared/world/outdoorZones';
import { TILE_SIZE } from '../../shared/maps';
import { WORLD_ART_KEY, WORLD_PROPS_KEY } from '../art/worldAtlas';
import artIds from '../art/worldArtIds.json';
import extIds from '../art/worldExtendedArtIds.json';
import {
  createAmbientMotes,
  placeSoftShadow,
  placeWarmLight,
  type FloatingMote,
} from '../artDemos/demoHelpers';

export type PropPlacer = (
  frameId: string,
  x: number,
  y: number,
  originX?: number,
  originY?: number,
  depth?: number,
) => Phaser.GameObjects.Image | null;

export interface OutdoorRenderOutput {
  motes: FloatingMote[];
  moteBounds: { x: number; y: number; w: number; h: number };
}

/** Mission 04D — unified outdoor renderer (hấp thụ WorldExpansionScene outdoor path). */
export function renderOutdoorWorld(
  scene: Phaser.Scene,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
  placeProp: PropPlacer,
): OutdoorRenderOutput {
  const size = OUTDOOR_WORLD_SIZE_TILES;
  const worldPx = size * TILE_SIZE;
  const art = scene.textures.exists(WORLD_ART_KEY) ? scene.textures.get(WORLD_ART_KEY) : null;
  const propsTex = scene.textures.exists(WORLD_PROPS_KEY) ? scene.textures.get(WORLD_PROPS_KEY) : null;

  const baseGrass = scene.add.rectangle(0, 0, worldPx, worldPx - 14 * TILE_SIZE, 0xb6c97a).setOrigin(0, 0).setDepth(0);
  const sand = scene.add.rectangle(0, (size - 14) * TILE_SIZE, worldPx, 6 * TILE_SIZE, 0xf2d9a2).setOrigin(0, 0).setDepth(0);
  const foam = scene.add.rectangle(0, (size - 8) * TILE_SIZE - 4, worldPx, 6, 0xfaf3df).setOrigin(0, 0).setDepth(1);
  const ocean = scene.add.rectangle(0, (size - 8) * TILE_SIZE, worldPx, 8 * TILE_SIZE, 0x6cb8d9).setOrigin(0, 0).setDepth(0);
  pushLayer(baseGrass);
  pushLayer(sand);
  pushLayer(foam);
  pushLayer(ocean);

  if (propsTex?.has(extIds.props.meadow_tile)) {
    for (let y = 0; y < (size - 14) * TILE_SIZE; y += 128) {
      for (let x = 0; x < worldPx; x += 128) {
        pushLayer(
          scene.add.image(x, y, WORLD_PROPS_KEY, extIds.props.meadow_tile).setOrigin(0, 0).setDepth(0.2),
        );
      }
    }
  }

  for (let tx = 0; tx < size; tx += 1) {
    if (propsTex?.has(extIds.props.shore_s)) {
      pushLayer(
        scene.add
          .image(tx * TILE_SIZE, (size - 14) * TILE_SIZE - 8, WORLD_PROPS_KEY, extIds.props.shore_s)
          .setOrigin(0, 0)
          .setDepth(0.8),
      );
    }
    if (scene.anims.exists('olw-water') && tx % 2 === 0) {
      const sea = scene.add
        .sprite(tx * TILE_SIZE + 8, (size - 7) * TILE_SIZE, WORLD_PROPS_KEY, `${extIds.sheets.water}:0`)
        .setDepth(1.2);
      sea.play('olw-water');
      pushLayer(sea);
    }
  }

  for (let ty = 2; ty < size - 15; ty += 4) {
    for (let tx = 2; tx < size - 2; tx += 4) {
      const h = Math.abs((tx * 73856093) ^ (ty * 19349663) ^ 4219);
      if (h % 9 === 0 && propsTex?.has(extIds.props.meadow_flora)) {
        pushLayer(
          scene.add.image(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, WORLD_PROPS_KEY, extIds.props.meadow_flora).setDepth(0.6),
        );
      } else if (h % 29 === 0 && propsTex?.has(extIds.props.sakura_petals)) {
        pushLayer(
          scene.add.image(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, WORLD_PROPS_KEY, extIds.props.sakura_petals).setDepth(0.6),
        );
      }
    }
  }

  const landmarks = OUTDOOR_LANDMARKS;
  const cottageLm = landmarks.find((l) => l.id === 'cottage')!;
  const pondLm = landmarks.find((l) => l.id === 'fishing_pond')!;
  const beachLm = landmarks.find((l) => l.id === 'beach')!;
  const squareLm = landmarks.find((l) => l.id === 'square')!;

  const ox = (cottageLm.tileX - 8) * TILE_SIZE;
  const oy = (cottageLm.tileY - 3) * TILE_SIZE;

  const drawOrganicTrail = (x1: number, y1: number, x2: number, y2: number) => {
    const steps = Math.max(4, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 14));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const wob = Math.sin(t * Math.PI * 2) * 10;
      const px = x1 + (x2 - x1) * t + wob * 0.4;
      const py = y1 + (y2 - y1) * t + wob * 0.25;
      pushLayer(scene.add.circle(px, py, 12, 0xc7a379, 0.9).setDepth(0.7));
      pushLayer(scene.add.circle(px, py, 9.5, 0xe0c49a, 1).setDepth(0.75));
    }
  };

  const trailTargets = landmarks.filter((lm) => !['cottage', 'farm', 'picnic', 'secret_nook'].includes(lm.id));
  for (const lm of trailTargets.slice(0, 6)) {
    drawOrganicTrail(ox + 136, oy + 120, lm.tileX * TILE_SIZE + 8, lm.tileY * TILE_SIZE + 8);
  }

  if (art?.has(artIds.background.garden)) {
    pushLayer(scene.add.image(ox, oy, WORLD_ART_KEY, artIds.background.garden).setOrigin(0, 0).setDepth(1));
  }

  for (const { frame, x, y, sw } of [
    { frame: artIds.scenery.cottage, x: ox + 8.5 * TILE_SIZE, y: oy + 48, sw: 48 },
    { frame: artIds.scenery.blossom, x: ox + 48, y: oy + 64, sw: 36 },
    { frame: artIds.scenery.blossom, x: ox + 240, y: oy + 64, sw: 36 },
  ]) {
    if (!art?.has(frame)) continue;
    pushLayer(placeSoftShadow(scene, x, y - 1, sw, 11, Math.round(y) - 10, 0.48));
    pushLayer(scene.add.image(x, y, WORLD_ART_KEY, frame).setOrigin(0.5, 1).setDepth(Math.round(y)));
  }
  pushLayer(placeWarmLight(scene, ox + 136, oy + 32, 34, 0xffd284, 0.28, 860));

  placeProp(extIds.props.planter_box, ox + 108, oy + 48, 0.5, 1, oy + 48);
  placeProp(extIds.props.planter_box, ox + 164, oy + 48, 0.5, 1, oy + 48);
  placeProp(extIds.props.mailbox_red, ox + 184, oy + 52, 0.5, 1, oy + 52);

  paintPond(scene, pushLayer, placeProp, ox + 5 * TILE_SIZE, oy + 9 * TILE_SIZE);
  placeProp(extIds.props.picnic_blanket, ox + 40, oy + 160, 0.5, 0.5, 3);
  placeProp(extIds.props.fence_3w, ox + 216, oy + 94, 0.5, 1, oy + 94);
  for (const sx of [200, 216, 232, 248]) {
    placeProp(extIds.props.sunflower, ox + sx, oy + 110, 0.5, 1, oy + 110);
  }
  placeProp(extIds.props.beehive, ox + 266, oy + 138, 0.5, 1, oy + 138);

  const opx = pondLm.tileX * TILE_SIZE;
  const opy = pondLm.tileY * TILE_SIZE;
  paintPond(scene, pushLayer, placeProp, opx - 3 * TILE_SIZE, opy - TILE_SIZE, 7, 3);
  placeProp(extIds.props.bridge_wood, opx - 8, opy, 0.5, 0.5, 4);
  placeProp(extIds.props.bridge_wood, opx + 8, opy, 0.5, 0.5, 4);

  for (let py = (size - 13) * TILE_SIZE; py <= (size - 6) * TILE_SIZE; py += TILE_SIZE) {
    placeProp(extIds.props.bridge_wood, beachLm.tileX * TILE_SIZE - 8, py, 0.5, 0.5, 3);
    placeProp(extIds.props.bridge_wood, beachLm.tileX * TILE_SIZE + 8, py, 0.5, 0.5, 3);
  }

  for (const lm of landmarks) {
    if (lm.id === 'cottage') continue;
    const lx = lm.tileX * TILE_SIZE;
    const ly = lm.tileY * TILE_SIZE;
    if (lm.biome === 'forest' || lm.biome === 'secret' || lm.biome === 'meadow') {
      placeProp(extIds.props.oak_tree, lx - 6, ly - 32, 0.5, 1, ly - 32);
    }
    if (lm.id === 'sunset_cliff' || lm.id === 'square') {
      if (art?.has(artIds.furniture.bench_garden)) {
        pushLayer(placeSoftShadow(scene, lx, ly - 2, 28, 7, ly - 6, 0.4));
        pushLayer(
          scene.add.image(lx, ly, WORLD_ART_KEY, artIds.furniture.bench_garden).setOrigin(0.5, 1).setDepth(ly),
        );
      }
    }
  }
  placeProp(extIds.props.beehive, squareLm.tileX * TILE_SIZE + 24, squareLm.tileY * TILE_SIZE - 10, 0.5, 1, squareLm.tileY * TILE_SIZE);

  // Forest ring along world edge (visual barrier — aligns with collision border)
  for (let tx = 2; tx < size - 2; tx += 8) {
    placeProp(extIds.props.oak_tree, tx * TILE_SIZE, TILE_SIZE * 1.5, 0.5, 1, TILE_SIZE * 2);
    placeProp(extIds.props.oak_tree, tx * TILE_SIZE, (size - 15) * TILE_SIZE, 0.5, 1, (size - 14) * TILE_SIZE);
  }
  for (let ty = 4; ty < size - 14; ty += 12) {
    placeProp(extIds.props.fence_3w, TILE_SIZE * 1.5, ty * TILE_SIZE, 0.5, 1, ty * TILE_SIZE);
    placeProp(extIds.props.fence_3w, (size - 2) * TILE_SIZE, ty * TILE_SIZE, 0.5, 1, ty * TILE_SIZE);
  }

  const moteBounds = { x: ox - 24, y: oy - 10, w: 336, h: 240 };
  const motes = createAmbientMotes(scene, moteBounds, 'petal', 16);
  return { motes, moteBounds };
}

function paintPond(
  scene: Phaser.Scene,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
  placeProp: PropPlacer,
  originX: number,
  originY: number,
  pw = 7,
  ph = 3,
): void {
  const shoreFrame = (dx: number, dy: number): string | null => {
    if (dx === 0 && dy === 0) return extIds.props.shore_nw;
    if (dx === pw - 1 && dy === 0) return extIds.props.shore_ne;
    if (dx === 0 && dy === ph - 1) return extIds.props.shore_sw;
    if (dx === pw - 1 && dy === ph - 1) return extIds.props.shore_se;
    if (dy === 0) return extIds.props.shore_n;
    if (dy === ph - 1) return extIds.props.shore_s;
    if (dx === 0) return extIds.props.shore_w;
    if (dx === pw - 1) return extIds.props.shore_e;
    return null;
  };
  for (let dy = 0; dy < ph; dy += 1) {
    for (let dx = 0; dx < pw; dx += 1) {
      const wx = originX + dx * TILE_SIZE;
      const wy = originY + dy * TILE_SIZE;
      if (scene.anims.exists('olw-water')) {
        const water = scene.add.sprite(wx, wy, WORLD_PROPS_KEY, `${extIds.sheets.water}:0`).setOrigin(0, 0).setDepth(2);
        water.play('olw-water');
        pushLayer(water);
      }
      const shore = shoreFrame(dx, dy);
      if (shore) placeProp(shore, wx, wy, 0, 0, 3);
    }
  }
  placeProp(extIds.props.bridge_wood, originX + 3.5 * TILE_SIZE, originY + 1.5 * TILE_SIZE, 0.5, 0.5, 4);
  placeProp(extIds.props.bridge_wood, originX + 4.5 * TILE_SIZE, originY + 1.5 * TILE_SIZE, 0.5, 0.5, 4);
}