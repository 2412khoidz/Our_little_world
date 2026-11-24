import Phaser from 'phaser';
import { ART_ATLAS_PATH } from './atlasProfile';
import ids from './worldArtIds.json';

export const WORLD_ART_KEY = 'world-atlas';
const WORLD_ART_MANIFEST = 'world-atlas-manifest';

interface AtlasFrame {
  id: string;
  texture: string;
  rect: { x: number; y: number; w: number; h: number };
}

export function preloadWorldAtlas(scene: Phaser.Scene): void {
  scene.load.image(WORLD_ART_KEY, ART_ATLAS_PATH + '/world.png');
  scene.load.json(WORLD_ART_MANIFEST, ART_ATLAS_PATH + '/manifest.json');
}

export function registerWorldAtlas(scene: Phaser.Scene): void {
  if (!scene.textures.exists(WORLD_ART_KEY)) return;
  const manifest = scene.cache.json.get(WORLD_ART_MANIFEST) as { entries?: AtlasFrame[] } | undefined;
  if (!Array.isArray(manifest?.entries)) return;
  const sheet = scene.textures.get(WORLD_ART_KEY);
  const source = sheet.getSourceImage();
  sheet.setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (const entry of manifest.entries) {
    if (entry.texture !== 'world' || sheet.has(entry.id)) continue;
    const { x, y, w, h } = entry.rect;
    if (![x, y, w, h].every(Number.isInteger) || w <= 0 || h <= 0 ||
        x < 0 || y < 0 || x + w > source.width || y + h > source.height) continue;
    sheet.add(entry.id, 0, x, y, w, h);
  }
}

export function worldFurnitureFrame(scene: Phaser.Scene, sku: string): { key: string; frame: string } {
  const frame = (ids.furniture as Record<string, string>)[sku];
  if (frame && scene.textures.exists(WORLD_ART_KEY) && scene.textures.get(WORLD_ART_KEY).has(frame)) {
    return { key: WORLD_ART_KEY, frame };
  }
  return { key: 'furniture-cozy', frame: sku };
}
