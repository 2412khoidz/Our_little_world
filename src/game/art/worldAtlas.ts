import Phaser from 'phaser';
import { getCatalogItem } from '../../shared/catalog';
import { ART_ATLAS_PATH } from './atlasProfile';
import ids from './worldArtIds.json';
import extIds from './worldExtendedArtIds.json';

export const WORLD_ART_KEY = 'world-atlas';
export const WORLD_PROPS_KEY = 'world-props-atlas';
export const SAKURA_POT_OVERRIDE_KEY = 'olw-sakura-pot-override';
export const BEACH_CRAB_SHEET_KEY = 'olw-crab-sheet';
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

  ensureSakuraPotOverrideTexture(scene);
  ensureBeachCrabTexture(scene);
}

/** Procedural CC0 4-frame 16x16 cozy coral beach crab spritesheet + animation. */
function ensureBeachCrabTexture(scene: Phaser.Scene): void {
  if (!scene.textures.exists(BEACH_CRAB_SHEET_KEY)) {
    const tex = scene.textures.createCanvas(BEACH_CRAB_SHEET_KEY, 64, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 64, 16);
    ctx.imageSmoothingEnabled = false;

    for (let f = 0; f < 4; f += 1) {
      const ox = f * 16;
      const clawLift = f % 2 === 0 ? 0 : -1;
      const legShift = f === 1 ? 1 : f === 3 ? -1 : 0;

      // Dark outline shell silhouette
      ctx.fillStyle = '#5c1f16';
      ctx.fillRect(ox + 4, 7, 8, 5);
      ctx.fillRect(ox + 3, 8, 10, 3);
      // Warm coral carapace
      ctx.fillStyle = '#e86843';
      ctx.fillRect(ox + 4, 8, 8, 3);
      ctx.fillStyle = '#ff9868';
      ctx.fillRect(ox + 5, 8, 5, 2);

      // Eyestalks & glossy eyes
      ctx.fillStyle = '#5c1f16';
      ctx.fillRect(ox + 5, 5, 2, 3);
      ctx.fillRect(ox + 9, 5, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox + 5, 5, 1, 1);
      ctx.fillRect(ox + 9, 5, 1, 1);

      // Pincers (subtle alternating snip motion)
      ctx.fillStyle = '#cf472c';
      ctx.fillRect(ox + 2, 6 + clawLift, 2, 2);
      ctx.fillRect(ox + 12, 6 - clawLift, 2, 2);
      ctx.fillStyle = '#ff9868';
      ctx.fillRect(ox + 2, 6 + clawLift, 1, 1);
      ctx.fillRect(ox + 13, 6 - clawLift, 1, 1);

      // Scuttling legs
      ctx.fillStyle = '#8b2f1f';
      ctx.fillRect(ox + 3, 11 + (legShift > 0 ? 1 : 0), 2, 2);
      ctx.fillRect(ox + 5, 12, 1, 2);
      ctx.fillRect(ox + 10, 12, 1, 2);
      ctx.fillRect(ox + 11, 11 + (legShift < 0 ? 1 : 0), 2, 2);
    }

    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    tex.refresh();
    for (let f = 0; f < 4; f += 1) {
      tex.add(f, 0, f * 16, 0, 16, 16);
    }
  }

  if (!scene.anims.exists('olw-crab')) {
    scene.anims.create({
      key: 'olw-crab',
      frames: [0, 1, 2, 3].map((frame) => ({ key: BEACH_CRAB_SHEET_KEY, frame })),
      frameRate: 6.5,
      repeat: -1,
    });
  }
}

/**
 * Ensures `flowerpot_sakura` always displays genuine pink cherry blossoms in a warm pot
 * across both public starter and private-unified atlases (never a mismatched blue/green flower).
 */
function ensureSakuraPotOverrideTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SAKURA_POT_OVERRIDE_KEY)) return;
  const tex = scene.textures.createCanvas(SAKURA_POT_OVERRIDE_KEY, 16, 24);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 16, 24);
  ctx.imageSmoothingEnabled = false;

  // Draw crisp terracotta pot body (bottom half y=13..22)
  ctx.fillStyle = '#3d2214';
  ctx.fillRect(4, 13, 8, 9);
  ctx.fillStyle = '#8b4d2b';
  ctx.fillRect(5, 14, 6, 7);
  ctx.fillStyle = '#b97349';
  ctx.fillRect(4, 12, 8, 3);
  ctx.fillStyle = '#d99567';
  ctx.fillRect(5, 12, 6, 2);

  // Stamp genuine pink sakura bush blossoms if available in props atlas, else crisp pastel pink canopy
  const bushSrc = scene.textures.exists(WORLD_PROPS_KEY) && scene.textures.get(WORLD_PROPS_KEY).has('prop.sakura_bush')
    ? scene.textures.get(WORLD_PROPS_KEY).get('prop.sakura_bush')
    : null;
  if (bushSrc) {
    const srcImg = scene.textures.get(WORLD_PROPS_KEY).getSourceImage() as CanvasImageSource;
    ctx.drawImage(
      srcImg,
      bushSrc.cutX,
      bushSrc.cutY,
      bushSrc.cutWidth,
      bushSrc.cutHeight,
      1,
      1,
      14,
      14,
    );
  } else {
    ctx.fillStyle = '#6f324c';
    ctx.fillRect(3, 3, 10, 9);
    ctx.fillStyle = '#f28eb2';
    ctx.fillRect(4, 4, 8, 7);
    ctx.fillStyle = '#ffc7dc';
    ctx.fillRect(5, 4, 5, 4);
    ctx.fillStyle = '#fff0f7';
    ctx.fillRect(6, 5, 2, 2);
  }

  tex.refresh();
  tex.add('flowerpot_sakura', 0, 0, 0, 16, 24);
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

export function worldFurnitureFrame(scene: Phaser.Scene, sku: string): { key: string; frame?: string } {
  if (sku === 'flowerpot_sakura') {
    ensureSakuraPotOverrideTexture(scene);
    if (scene.textures.exists(SAKURA_POT_OVERRIDE_KEY) && scene.textures.get(SAKURA_POT_OVERRIDE_KEY).has('flowerpot_sakura')) {
      return { key: SAKURA_POT_OVERRIDE_KEY, frame: 'flowerpot_sakura' };
    }
    return { key: 'furniture-cozy', frame: 'flowerpot_sakura' };
  }
  if (sku === 'bench_garden' && scene.textures.exists('donor-hollowmere-bench')) {
    scene.textures.get('donor-hollowmere-bench').setFilter(Phaser.Textures.FilterMode.NEAREST);
    return { key: 'donor-hollowmere-bench' };
  }
  const catalogItem = getCatalogItem(sku);
  if (
    catalogItem?.propsFrameId &&
    scene.textures.exists(WORLD_PROPS_KEY) &&
    scene.textures.get(WORLD_PROPS_KEY).has(catalogItem.propsFrameId)
  ) {
    return { key: WORLD_PROPS_KEY, frame: catalogItem.propsFrameId };
  }
  if (catalogItem?.donorTextureKey && scene.textures.exists(catalogItem.donorTextureKey)) {
    scene.textures.get(catalogItem.donorTextureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    return { key: catalogItem.donorTextureKey };
  }
  const frame = (ids.furniture as Record<string, string>)[sku];
  if (frame && scene.textures.exists(WORLD_ART_KEY) && scene.textures.get(WORLD_ART_KEY).has(frame)) {
    return { key: WORLD_ART_KEY, frame };
  }
  return { key: 'furniture-cozy', frame: sku };
}

export function applyWorldFurnitureDisplaySize(
  img: Phaser.GameObjects.Image,
  sku: string,
  widthTiles: number,
  heightTiles: number,
  tilePx: number,
): void {
  if (sku === 'bench_garden' && img.texture?.key === 'donor-hollowmere-bench') {
    img.setDisplaySize(widthTiles * tilePx + 2, heightTiles * tilePx + 1);
    return;
  }
  const catalogItem = getCatalogItem(sku);
  if (catalogItem?.donorTextureKey && img.texture?.key === catalogItem.donorTextureKey) {
    const texW = Math.max(1, img.width || widthTiles * tilePx);
    const texH = Math.max(1, img.height || heightTiles * tilePx);
    const targetW = widthTiles * tilePx;
    const scale = targetW / texW;
    img.setDisplaySize(Math.round(targetW), Math.max(tilePx, Math.round(texH * scale)));
    return;
  }
  img.setScale(1);
}
