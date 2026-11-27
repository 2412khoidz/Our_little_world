import Phaser from 'phaser';
import type { MapId } from '../../shared/types';
import { TILE_SIZE } from '../../shared/maps';
import extIds from '../art/worldExtendedArtIds.json';
import { BEACH_CRAB_SHEET_KEY, SNAIL_SHEET_KEY, WORLD_PROPS_KEY } from '../art/worldAtlas';
import { createAmbientMotes, placeSoftShadow, placeWarmLight, type FloatingMote } from '../artDemos/demoHelpers';
import {
  createChickenActorState,
  createCrabActorState,
  createDuckActorState,
  createSheepActorState,
  createSnailActorState,
  type ChickenActorState,
  type CrabActorState,
  type DuckActorState,
  type SheepActorState,
  type SnailActorState,
} from '../../shared/world/emergentWorldBehavior';
import { getStaticZonePropSpecs } from '../../shared/world/zonePropColliders';

export interface AmbientChickenHandle {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  state: ChickenActorState;
  bubble?: Phaser.GameObjects.Text;
}

export interface AmbientDuckHandle {
  sprite: Phaser.GameObjects.Sprite;
  state: DuckActorState;
  lastRippleAtMs: number;
}

export interface AmbientSheepHandle {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  state: SheepActorState;
  bubble?: Phaser.GameObjects.Text;
}

export interface AmbientCrabHandle {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  state: CrabActorState;
}

export interface AmbientSnailHandle {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  state: SnailActorState;
}

type PlaceProp = (
  frameId: string,
  x: number,
  y: number,
  originX?: number,
  originY?: number,
  depth?: number,
) => Phaser.GameObjects.Image | null;

function pxAt(tx: number, ty: number, ox = 0.5, oy = 1): { x: number; y: number } {
  return { x: (tx + ox) * TILE_SIZE, y: (ty + oy) * TILE_SIZE };
}

function createAnimalBubble(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '7.5px',
      color: '#fff6e4',
      backgroundColor: '#2d1c22cc',
      padding: { x: 2.5, y: 1 },
      resolution: 4,
    })
    .setOrigin(0.5, 1)
    .setDepth(9440)
    .setVisible(false);
}

function addHollowmereProp(
  scene: Phaser.Scene,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
  key: string,
  tx: number,
  ty: number,
  scale = 0.5,
  options?: { depthOffset?: number; shadowW?: number; originY?: number; bobAmp?: number },
): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(key)) return null;
  const x = (tx + 0.5) * TILE_SIZE;
  const y = (ty + 1) * TILE_SIZE;
  const oy = options?.originY ?? 1;
  const img = scene.add
    .image(Math.round(x), Math.round(y), key)
    .setOrigin(0.5, oy)
    .setScale(scale)
    .setDepth(Math.round(y + (options?.depthOffset ?? 0)));
  if (options?.shadowW) {
    pushLayer(placeSoftShadow(scene, x, y - 1, options.shadowW, Math.max(6, Math.round(options.shadowW * 0.3)), Math.round(y) - 2, 0.38));
  }
  if (options?.bobAmp) {
    scene.tweens.add({
      targets: img,
      y: img.y - options.bobAmp,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
  pushLayer(img);
  return img;
}

function spawnSnails(
  scene: Phaser.Scene,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
  prefix: string,
  specs: ReadonlyArray<readonly [number, number, 'x' | 'y', number]>,
  out: AmbientSnailHandle[],
): void {
  if (!scene.textures.exists(SNAIL_SHEET_KEY) || !scene.anims.exists('olw-snail')) return;
  for (const [idx, [tx, ty, axis, span]] of specs.entries()) {
    const homeX = tx * TILE_SIZE + 8;
    const homeY = ty * TILE_SIZE + 12;
    const shadow = placeSoftShadow(scene, homeX, homeY - 1, 8, 3, homeY - 2, 0.3);
    const sp = scene.add
      .sprite(homeX, homeY, SNAIL_SHEET_KEY, 0)
      .setOrigin(0.5, 0.9)
      .setScale(0.76)
      .setDepth(Math.round(homeY));
    sp.play('olw-snail');
    pushLayer(shadow);
    pushLayer(sp);
    out.push({
      sprite: sp,
      shadow,
      state: createSnailActorState(`${prefix}_snail_${idx}`, homeX, homeY, axis, span, idx * 1.5),
    });
  }
}

export interface ZoneAccentResult {
  motes: FloatingMote[];
  moteBounds?: { x: number; y: number; w: number; h: number };
  chickens?: AmbientChickenHandle[];
  ducks?: AmbientDuckHandle[];
  sheep?: AmbientSheepHandle[];
  crabs?: AmbientCrabHandle[];
  snails?: AmbientSnailHandle[];
}

export function applyTiledZoneAccents(
  mapId: MapId,
  worldWidthPx: number,
  worldHeightPx: number,
  place: PlaceProp,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
  scene: Phaser.Scene,
): ZoneAccentResult {
  const hasProps = scene.textures.exists(WORLD_PROPS_KEY);
  const chickens: AmbientChickenHandle[] = [];
  const ducks: AmbientDuckHandle[] = [];
  const sheep: AmbientSheepHandle[] = [];
  const crabs: AmbientCrabHandle[] = [];
  const snails: AmbientSnailHandle[] = [];

  for (const spec of getStaticZonePropSpecs(mapId)) {
    addHollowmereProp(scene, pushLayer, spec.textureKey, spec.tileX, spec.tileY, spec.scale, {
      shadowW: spec.shadowW,
      depthOffset: spec.depthOffset,
      bobAmp: spec.bobAmp,
    });
  }

  if (mapId === 'farm') {
    if (hasProps) {
      if (scene.anims.exists('olw-duck')) {
        // Verified Pond 0 water tiles: x=31..34, y=5..7; Pond 1 water tiles: x=50..53, y=8..10
        const farmPondDucks = [
          { id: 'farm_pond_duck_0', x: 32.3, y: 6.1, bounds: { minX: 31.4 * TILE_SIZE, maxX: 34.6 * TILE_SIZE, minY: 5.4 * TILE_SIZE, maxY: 7.4 * TILE_SIZE }, phase: 0.4 },
          { id: 'farm_pond_duck_1', x: 33.7, y: 6.9, bounds: { minX: 31.4 * TILE_SIZE, maxX: 34.6 * TILE_SIZE, minY: 5.4 * TILE_SIZE, maxY: 7.4 * TILE_SIZE }, phase: 1.9 },
          { id: 'farm_pond_duck_2', x: 51.3, y: 9.1, bounds: { minX: 50.4 * TILE_SIZE, maxX: 53.6 * TILE_SIZE, minY: 8.4 * TILE_SIZE, maxY: 10.4 * TILE_SIZE }, phase: 1.1 },
          { id: 'farm_pond_duck_3', x: 52.7, y: 9.8, bounds: { minX: 50.4 * TILE_SIZE, maxX: 53.6 * TILE_SIZE, minY: 8.4 * TILE_SIZE, maxY: 10.4 * TILE_SIZE }, phase: 2.7 },
        ] as const;
        for (const d of farmPondDucks) {
          const sx = d.x * TILE_SIZE;
          const sy = d.y * TILE_SIZE;
          const duck = scene.add
            .sprite(sx, sy, WORLD_PROPS_KEY, `${extIds.sheets.duck}:0`)
            .setOrigin(0.5, 0.8)
            .setDepth(Math.round(sy));
          duck.play('olw-duck');
          pushLayer(duck);
          ducks.push({
            sprite: duck,
            lastRippleAtMs: 0,
            state: createDuckActorState(d.id, sx, sy, d.bounds, d.phase),
          });
        }
      }
      if (scene.anims.exists('olw-chicken')) {
        for (const [idx, [cx, cy]] of (
          [
            [10, 14],
            [12, 16],
            [15, 24],
            [24, 25],
            [35, 17],
            [44, 19],
          ] as const
        ).entries()) {
          const homeX = cx * TILE_SIZE;
          const homeY = cy * TILE_SIZE;
          const shadow = placeSoftShadow(scene, homeX, homeY - 1, 10, 4, homeY - 2, 0.36);
          const ch = scene.add
            .sprite(homeX, homeY, WORLD_PROPS_KEY, `${extIds.sheets.chicken}:0`)
            .setOrigin(0.5, 0.85)
            .setDepth(Math.round(homeY));
          ch.play('olw-chicken');
          const bubble = createAnimalBubble(scene, homeX, homeY - 14);
          pushLayer(shadow);
          pushLayer(ch);
          pushLayer(bubble);
          chickens.push({
            sprite: ch,
            shadow,
            bubble,
            state: createChickenActorState(`farm_chicken_${idx}`, homeX, homeY, idx * 1.5),
          });
        }
      }
      if (scene.anims.exists('olw-sheep')) {
        // Real open green grass pastures away from plowed soil
        for (const [idx, [sx, sy]] of (
          [
            [37, 6],
            [42, 7],
            [46, 14],
            [55, 16],
          ] as const
        ).entries()) {
          const homeX = sx * TILE_SIZE;
          const homeY = sy * TILE_SIZE;
          const shadow = placeSoftShadow(scene, homeX, homeY - 1, 14, 5, homeY - 2, 0.36);
          const sp = scene.add
            .sprite(homeX, homeY, WORLD_PROPS_KEY, `${extIds.sheets.sheep}:0`)
            .setOrigin(0.5, 0.85)
            .setDepth(Math.round(homeY));
          sp.play('olw-sheep');
          const bubble = createAnimalBubble(scene, homeX, homeY - 18);
          pushLayer(shadow);
          pushLayer(sp);
          pushLayer(bubble);
          sheep.push({
            sprite: sp,
            shadow,
            bubble,
            state: createSheepActorState(`farm_sheep_${idx}`, homeX, homeY, idx * 1.9),
          });
        }
      }
      const p1 = pxAt(34.5, 16.5);
      place(extIds.props.picnic_blanket, p1.x, p1.y, 0.5, 0.5, 3);
      place(extIds.props.beehive, 40.5 * TILE_SIZE, 27 * TILE_SIZE, 0.5, 1, 27 * TILE_SIZE);
    }

    spawnSnails(
      scene,
      pushLayer,
      'farm',
      [
        [35, 8, 'x', 20],
        [51, 12, 'x', 18],
      ],
      snails,
    );

    pushLayer(placeWarmLight(scene, 13.5 * TILE_SIZE, 5.5 * TILE_SIZE, 36, 0xffd284, 0.22, 860));
    pushLayer(placeWarmLight(scene, 29.5 * TILE_SIZE, 20 * TILE_SIZE, 44, 0xffd896, 0.22, 860));

    const bounds = { x: 16, y: 16, w: worldWidthPx - 32, h: worldHeightPx - 32 };
    return {
      motes: createAmbientMotes(scene, bounds, 'petal', 16),
      moteBounds: bounds,
      chickens,
      ducks,
      sheep,
      snails,
    };
  }

  if (mapId === 'village') {
    for (const [lx, ly] of [[42, 28], [32, 24], [27, 36], [15, 33], [79, 25]] as const) {
      pushLayer(placeWarmLight(scene, (lx + 0.5) * TILE_SIZE, (ly + 0.5) * TILE_SIZE, 42, 0xffd584, 0.24, 860));
    }
    if (hasProps) {
      const pic = pxAt(47, 29);
      place(extIds.props.picnic_blanket, pic.x, pic.y, 0.5, 0.5, 3);
      if (scene.anims.exists('olw-duck')) {
        // Verified upper pond water tiles in village.json (x=36..43, y=9)
        const vDucks = [
          { id: 'village_pond_duck_0', x: 38.0, y: 9.2 },
          { id: 'village_pond_duck_1', x: 41.2, y: 9.4 },
        ] as const;
        for (const [idx, d] of vDucks.entries()) {
          const sx = d.x * TILE_SIZE;
          const sy = d.y * TILE_SIZE;
          const duck = scene.add
            .sprite(sx, sy, WORLD_PROPS_KEY, `${extIds.sheets.duck}:0`)
            .setOrigin(0.5, 0.8)
            .setDepth(Math.round(sy));
          duck.play('olw-duck');
          pushLayer(duck);
          ducks.push({
            sprite: duck,
            lastRippleAtMs: 0,
            state: createDuckActorState(
              d.id,
              sx,
              sy,
              {
                minX: 36.8 * TILE_SIZE,
                maxX: 43.0 * TILE_SIZE,
                minY: 8.9 * TILE_SIZE,
                maxY: 9.7 * TILE_SIZE,
              },
              idx * 2.1,
            ),
          });
        }
      }
      if (scene.anims.exists('olw-chicken')) {
        for (const [idx, [cx, cy]] of (
          [
            [23, 32],
            [24, 30],
            [47, 30],
            [52, 28],
          ] as const
        ).entries()) {
          const homeX = cx * TILE_SIZE;
          const homeY = cy * TILE_SIZE;
          const shadow = placeSoftShadow(scene, homeX, homeY - 1, 10, 4, homeY - 2, 0.34);
          const ch = scene.add
            .sprite(homeX, homeY, WORLD_PROPS_KEY, `${extIds.sheets.chicken}:0`)
            .setOrigin(0.5, 0.85)
            .setDepth(Math.round(homeY));
          ch.play('olw-chicken');
          const bubble = createAnimalBubble(scene, homeX, homeY - 14);
          pushLayer(shadow);
          pushLayer(ch);
          pushLayer(bubble);
          chickens.push({
            sprite: ch,
            shadow,
            bubble,
            state: createChickenActorState(`village_chicken_${idx}`, homeX, homeY, idx * 1.8),
          });
        }
      }
    }
    spawnSnails(
      scene,
      pushLayer,
      'village',
      [
        [46, 27, 'x', 18],
        [44, 13, 'x', 20],
      ],
      snails,
    );
    const bounds = { x: 24, y: 24, w: worldWidthPx - 48, h: worldHeightPx - 48 };
    return { motes: createAmbientMotes(scene, bounds, 'petal', 12), moteBounds: bounds, chickens, ducks, snails };
  }

  if (mapId === 'beach') {
    if (hasProps) {
      const pic = pxAt(15, 22);
      place(extIds.props.picnic_blanket, pic.x, pic.y, 0.5, 0.5, 3);
      place(extIds.props.picnic_basket, pic.x - 10, pic.y - 4, 0.5, 1, Math.round(pic.y));
      place(extIds.props.picnic_teacup, pic.x + 8, pic.y + 2, 0.5, 1, Math.round(pic.y));
    }

    if (scene.textures.exists(BEACH_CRAB_SHEET_KEY) && scene.anims.exists('olw-crab')) {
      const crabSpecs = [
        [24.4, 10, 'y', 24],
        [26.2, 12, 'y', 26],
        [25.2, 13, 'y', 22],
        [24.4, 18, 'y', 24],
        [23.2, 22, 'y', 24],
        [22.4, 26, 'y', 22],
      ] as const;
      for (const [idx, [tx, ty, axis, span]] of crabSpecs.entries()) {
        const homeX = tx * TILE_SIZE;
        const homeY = ty * TILE_SIZE;
        const shadow = placeSoftShadow(scene, homeX, homeY - 1, 9, 3.5, homeY - 2, 0.34);
        const crabSprite = scene.add
          .sprite(homeX, homeY, BEACH_CRAB_SHEET_KEY, 0)
          .setOrigin(0.5, 0.85)
          .setScale(0.78)
          .setDepth(Math.round(homeY));
        crabSprite.play('olw-crab');
        pushLayer(shadow);
        pushLayer(crabSprite);
        crabs.push({
          sprite: crabSprite,
          shadow,
          state: createCrabActorState(`beach_crab_${idx}`, homeX, homeY, axis, span, idx * 1.4),
        });
      }
    }

    spawnSnails(
      scene,
      pushLayer,
      'beach',
      [
        [19, 12, 'y', 20],
        [20, 19, 'x', 18],
        [19, 25, 'y', 18],
        [21, 28, 'x', 20],
      ],
      snails,
    );

    for (let i = 0; i < 14; i += 1) {
      const wx = (29 + (i * 5) % 24) * TILE_SIZE + 8;
      const wy = (8 + (i * 7) % 25) * TILE_SIZE + 8;
      const glint = scene.add.rectangle(wx, wy, 3, 1, 0xe8fbff, 0.72).setDepth(3.5);
      scene.tweens.add({
        targets: glint,
        alpha: { from: 0.15, to: 0.85 },
        scaleX: { from: 0.6, to: 1.5 },
        duration: 1100 + (i % 5) * 240,
        yoyo: true,
        repeat: -1,
        delay: i * 160,
      });
      pushLayer(glint);
    }

    pushLayer(placeWarmLight(scene, 14.5 * TILE_SIZE, 11.5 * TILE_SIZE, 48, 0xffd284, 0.24, 860));
    pushLayer(placeWarmLight(scene, 21.5 * TILE_SIZE, 16 * TILE_SIZE, 44, 0xffcb80, 0.22, 860));
    pushLayer(placeWarmLight(scene, 34.5 * TILE_SIZE, 16.5 * TILE_SIZE, 38, 0xffdf99, 0.24, 860));

    const bounds = { x: 16, y: 16, w: worldWidthPx - 32, h: worldHeightPx - 32 };
    return { motes: createAmbientMotes(scene, bounds, 'firefly', 14), moteBounds: bounds, crabs, snails };
  }

  if (mapId === 'forest') {
    spawnSnails(
      scene,
      pushLayer,
      'forest',
      [
        [12, 26, 'y', 20],
        [11, 18, 'x', 16],
        [15, 32, 'y', 18],
      ],
      snails,
    );
    pushLayer(placeWarmLight(scene, 21.5 * TILE_SIZE, 18 * TILE_SIZE, 40, 0xdcf79e, 0.2, 860));
    pushLayer(placeWarmLight(scene, 11.5 * TILE_SIZE, 22 * TILE_SIZE, 36, 0xffe49e, 0.18, 860));
    const bounds = { x: 16, y: 16, w: worldWidthPx - 32, h: worldHeightPx - 32 };
    return { motes: createAmbientMotes(scene, bounds, 'firefly', 18), moteBounds: bounds, snails };
  }

  return { motes: [] };
}
