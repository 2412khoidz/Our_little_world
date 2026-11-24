import Phaser from 'phaser';
import { ART_ATLAS_PATH } from './atlasProfile';
import ids from './worldArtIds.json';
import extIds from './worldExtendedArtIds.json';

export const WORLD_ART_KEY = 'world-atlas';
export const WORLD_PROPS_KEY = 'world-props-atlas';
const WORLD_ART_MANIFEST = 'world-atlas-manifest';
const WORLD_PROPS_MANIFEST = 'world-props-manifest';

interface AtlasFrame {
  id: string;
  texture?: string;
  rect: { x: number; y: number; w: number; h: number };
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
}

export function preloadWorldAtlas(scene: Phaser.Scene): void {
  scene.load.image(WORLD_ART_KEY, ART_ATLAS_PATH + '/world.png');
  scene.load.json(WORLD_ART_MANIFEST, ART_ATLAS_PATH + '/manifest.json');
  scene.load.image(WORLD_PROPS_KEY, ART_ATLAS_PATH + '/world-props.png');
  scene.load.json(WORLD_PROPS_MANIFEST, ART_ATLAS_PATH + '/props-manifest.json');
}

export function registerWorldAtlas(scene: Phaser.Scene): void {
  if (scene.textures.exists(WORLD_ART_KEY)) {
    const manifest = scene.cache.json.get(WORLD_ART_MANIFEST) as { entries?: AtlasFrame[] } | undefined;
    if (Array.isArray(manifest?.entries)) {
      const sheet = scene.textures.get(WORLD_ART_KEY);
      const source = sheet.getSourceImage();
      sheet.setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const entry of manifest.entries) {
        if (entry.texture !== 'world' || sheet.has(entry.id)) continue;
        const { x, y, w, h } = entry.rect;
        if (
          ![x, y, w, h].every(Number.isInteger) ||
          w <= 0 ||
          h <= 0 ||
          x < 0 ||
          y < 0 ||
          x + w > source.width ||
          y + h > source.height
        ) {
          continue;
        }
        sheet.add(entry.id, 0, x, y, w, h);
      }
    }
  }

  if (scene.textures.exists(WORLD_PROPS_KEY)) {
    const propsManifest = scene.cache.json.get(WORLD_PROPS_MANIFEST) as { entries?: AtlasFrame[] } | undefined;
    if (Array.isArray(propsManifest?.entries)) {
      const sheet = scene.textures.get(WORLD_PROPS_KEY);
      const source = sheet.getSourceImage();
      sheet.setFilter(Phaser.Textures.FilterMode.NEAREST);

      for (const entry of propsManifest.entries) {
        const { x, y, w, h } = entry.rect;
        if (
          ![x, y, w, h].every(Number.isInteger) ||
          w <= 0 ||
          h <= 0 ||
          x < 0 ||
          y < 0 ||
          x + w > source.width ||
          y + h > source.height
        ) {
          continue;
        }
        if (entry.frameWidth && entry.frameHeight && entry.frameCount) {
          const cols = Math.max(1, Math.floor(w / entry.frameWidth));
          const rows = Math.max(1, Math.floor(h / entry.frameHeight));
          const cellLimit = Math.max(entry.frameCount, cols * rows);
          for (let i = 0; i < cellLimit; i += 1) {
            const fx = x + (i % cols) * entry.frameWidth;
            const fy = y + Math.floor(i / cols) * entry.frameHeight;
            const frameKey = `${entry.id}:${i}`;
            if (!sheet.has(frameKey) && fx + entry.frameWidth <= source.width && fy + entry.frameHeight <= source.height) {
              sheet.add(frameKey, 0, fx, fy, entry.frameWidth, entry.frameHeight);
            }
          }
        } else if (!sheet.has(entry.id)) {
          sheet.add(entry.id, 0, x, y, w, h);
        }
      }
      registerExtendedSheetAnimations(scene, sheet);
    }
  }
}

function registerExtendedSheetAnimations(scene: Phaser.Scene, sheet: Phaser.Textures.Texture): void {
  const mkLoop = (key: string, sheetId: string, indices: number[], frameRate: number) => {
    if (scene.anims.exists(key)) return;
    const frames = indices
      .map((i) => `${sheetId}:${i}`)
      .filter((f) => sheet.has(f))
      .map((frame) => ({ key: WORLD_PROPS_KEY, frame }));
    if (frames.length > 0) {
      scene.anims.create({ key, frames, frameRate, repeat: -1 });
    }
  };

  mkLoop('olw-fire', extIds.sheets.fire, [0, 1, 2, 3, 4, 5, 6, 7], 9);
  mkLoop('olw-water', extIds.sheets.water, [0, 1, 2, 3], 4);
  mkLoop('olw-duck', extIds.sheets.duck, [0, 1, 2, 3], 4);
  mkLoop('olw-frog', extIds.sheets.frog, [0, 1, 2, 0], 3.5);
  mkLoop('olw-chicken', extIds.sheets.chicken, [0, 1, 2, 3], 4);
  mkLoop('olw-sheep', extIds.sheets.sheep, [0, 1, 2, 3], 4.5);
  mkLoop('olw-windmill', extIds.sheets.windmill, [0, 1, 2, 3, 4, 5, 6, 7, 8], 7);

  // Free Pets Pack cat-orange 16 directional animations (12 cols per row)
  const catTagSpecs: Array<[string, number, number, number]> = [
    ['Happy_South', 0, 6, 12],
    ['Happy_East', 12, 6, 12],
    ['Happy_North', 24, 6, 12],
    ['Happy_West', 36, 6, 12],
    ['Idle_South', 48, 8, 10],
    ['Idle_East', 60, 8, 10],
    ['Idle_North', 72, 8, 10],
    ['Idle_West', 84, 8, 10],
    ['Sleep_South', 96, 12, 6],
    ['Sleep_East', 108, 12, 6],
    ['Sleep_North', 120, 12, 6],
    ['Sleep_West', 132, 12, 6],
    ['Walk_South', 144, 6, 11],
    ['Walk_East', 156, 6, 11],
    ['Walk_North', 168, 6, 11],
    ['Walk_West', 180, 6, 11],
  ];
  for (const [tag, start, count, rate] of catTagSpecs) {
    const indices = Array.from({ length: count }, (_, i) => start + i);
    mkLoop(`olw-cat-${tag}`, extIds.sheets.cat_orange, indices, rate);
    if (sheet.has(`${extIds.sheets.cat_orange_shadow}:0`)) {
      mkLoop(`olw-cat-shadow-${tag}`, extIds.sheets.cat_orange_shadow, indices, rate);
    }
  }
}

export function worldFurnitureFrame(scene: Phaser.Scene, sku: string): { key: string; frame: string } {
  const frame = (ids.furniture as Record<string, string>)[sku];
  if (frame && scene.textures.exists(WORLD_ART_KEY) && scene.textures.get(WORLD_ART_KEY).has(frame)) {
    return { key: WORLD_ART_KEY, frame };
  }
  return { key: 'furniture-cozy', frame: sku };
}
