import type Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';
import type { MapId } from '../../shared/types';
import { getMapDefinition } from '../../shared/maps';
import { getDemoEZoneLayout } from '../../shared/world/demoEZoneLayouts';
import extIds from '../art/worldExtendedArtIds.json';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';
import { isDemoEWorldZone } from './privateArtCapability';

type PlaceProp = (
  frameId: string,
  x: number,
  y: number,
  originX?: number,
  originY?: number,
  depth?: number,
) => Phaser.GameObjects.Image | null;

export function renderDemoEWorldZone(
  scene: Phaser.Scene,
  mapId: MapId,
  placeProp: PlaceProp,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (!isDemoEWorldZone(mapId)) return;
  const layout = getDemoEZoneLayout(mapId);
  if (!layout) return;

  const def = getMapDefinition(mapId);
  const w = def.widthTiles;
  const h = def.heightTiles;
  const groundId = layout.groundTileId ?? 'env.meadow_tile';
  const tex = scene.textures.exists(WORLD_PROPS_KEY) ? scene.textures.get(WORLD_PROPS_KEY) : null;
  const canGround = Boolean(tex?.has(groundId));

  if (canGround) {
    const groundFrame = tex!.get(groundId);
    const fw = groundFrame?.width ?? TILE_SIZE;
    const fh = groundFrame?.height ?? TILE_SIZE;
    const grassSheet = fw > TILE_SIZE && fh > TILE_SIZE;
    for (let ty = 0; ty < h; ty += 1) {
      for (let tx = 0; tx < w; tx += 1) {
        const variant = ((tx * 7 + ty * 13) % 3) as 0 | 1 | 2;
        const frame = tex!.has(`${groundId}:${variant}`) ? `${groundId}:${variant}` : groundId;
        if (!tex!.has(frame)) continue;
        const img = scene.add
          .image(tx * TILE_SIZE, ty * TILE_SIZE, WORLD_PROPS_KEY, frame)
          .setOrigin(0, 0)
          .setDepth(0);
        if (grassSheet) {
          const cols = Math.floor(fw / TILE_SIZE);
          const pick = (tx + ty * 3) % Math.max(1, cols);
          const cropX = (pick % cols) * TILE_SIZE;
          const cropY = Math.floor(pick / cols) * TILE_SIZE;
          img.setCrop(cropX, cropY, TILE_SIZE, TILE_SIZE).setDisplaySize(TILE_SIZE, TILE_SIZE);
          if (((tx + ty) % 9) === 0 && tex!.has(extIds.props.meadow_flora)) {
            const flora = scene.add
              .image(tx * TILE_SIZE, ty * TILE_SIZE, WORLD_PROPS_KEY, extIds.props.meadow_flora)
              .setOrigin(0, 0)
              .setDepth(0.2);
            pushLayer(flora);
          }
        }
        pushLayer(img);
      }
    }
  }

  for (const p of layout.props) {
    const ox = p.originX ?? 0.5;
    const oy = p.originY ?? 1;
    const x = (p.tileX + ox) * TILE_SIZE;
    const y = (p.tileY + oy) * TILE_SIZE;
    placeProp(p.propId, x, y, ox, oy, Math.round(y));
  }

  if (mapId === 'farm') {
    placeDemoEFarmAnimations(scene, pushLayer);
  }
}

function placeDemoEFarmAnimations(
  scene: Phaser.Scene,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (scene.textures.exists(WORLD_PROPS_KEY) && scene.anims.exists('olw-windmill')) {
    const wx = 59 * TILE_SIZE + 8;
    const wy = 4 * TILE_SIZE + 14;
    const windmill = scene.add
      .sprite(wx, wy, WORLD_PROPS_KEY, `${extIds.sheets.windmill}:0`)
      .setOrigin(0.5, 0.92)
      .setDepth(Math.round(wy));
    windmill.play('olw-windmill');
    pushLayer(windmill);
  }
  if (scene.textures.exists(WORLD_PROPS_KEY) && scene.anims.exists('olw-chicken')) {
    const cx = 11 * TILE_SIZE;
    const cy = 10 * TILE_SIZE;
    const chicken = scene.add
      .sprite(cx, cy, WORLD_PROPS_KEY, `${extIds.sheets.chicken}:0`)
      .setOrigin(0.5, 0.85)
      .setDepth(Math.round(cy));
    chicken.play('olw-chicken');
    pushLayer(chicken);
  }
}