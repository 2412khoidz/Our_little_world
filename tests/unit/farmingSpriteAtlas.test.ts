import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import canonicalCatalog from '../../src/shared/catalog/canonicalCatalog.generated.json';
import {
  FARMING_SPRITE_ATLAS_META,
  getFarmingCropStageFrame,
  getFarmingItemSprite,
  getFarmingTreeFrame,
  getWorkshopMachineSprite,
  spriteBackgroundStyle,
} from '../../src/shared/art/farmingSpriteAtlas';
import { DEEP_FIELD_CROP_SKUS } from '../../src/shared/farming/deepCropSimulation';
import { FLOWER_SPECIES_CATALOG } from '../../src/shared/farming/flowerGenetics';
import { ORCHARD_TREE_DEFS } from '../../src/shared/farming/orchard';
import { WORKSHOP_DEFS } from '../../src/shared/farming/workshops';

const REPO_ROOT = path.resolve(__dirname, '../..');
const PUBLIC_FARMING_DIR = path.join(REPO_ROOT, 'public/assets/farming');

function readPngSize(filePath: string): { w: number; h: number } {
  const buf = fs.readFileSync(filePath);
  expect(buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  return {
    w: buf.readUInt32BE(16),
    h: buf.readUInt32BE(20),
  };
}

describe('Curated Farming Sprite Atlases (Checkpoint G)', () => {
  it('matches actual PNG IHDR dimensions and stays strictly in bounds for every atlas frame', () => {
    const atlasPairs = [
      ['items-16.png', 'items-16.json'],
      ['items-32.png', 'items-32.json'],
      ['crops-stages.png', 'crops-stages.json'],
      ['trees-orchard.png', 'trees-orchard.json'],
    ] as const;

    for (const [pngName, jsonName] of atlasPairs) {
      const pngDims = readPngSize(path.join(PUBLIC_FARMING_DIR, pngName));
      const doc = JSON.parse(fs.readFileSync(path.join(PUBLIC_FARMING_DIR, jsonName), 'utf8')) as {
        frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
        meta: { size: { w: number; h: number } };
      };
      expect(doc.meta.size).toEqual(pngDims);
      for (const [frameKey, entry] of Object.entries(doc.frames)) {
        const f = entry.frame;
        expect(f.w, `${pngName}:${frameKey}`).toBeGreaterThan(0);
        expect(f.h, `${pngName}:${frameKey}`).toBeGreaterThan(0);
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.w).toBeLessThanOrEqual(pngDims.w);
        expect(f.y + f.h).toBeLessThanOrEqual(pngDims.h);
      }
    }
  });

  it('covers 100% of canonical catalog SKUs, quality suffixes & computes valid background CSS', () => {
    const skus = (canonicalCatalog.items as Array<{ sku: string }>).map((i) => i.sku);
    expect(skus.length).toBeGreaterThanOrEqual(261);
    expect(FARMING_SPRITE_ATLAS_META.itemCount).toBe(skus.length);

    for (const sku of skus) {
      const sprite = getFarmingItemSprite(sku);
      expect(sprite, `missing packed sprite for ${sku}`).not.toBeNull();
      expect(sprite!.donor.length).toBeGreaterThan(0);
      expect(sprite!.x + sprite!.w).toBeLessThanOrEqual(sprite!.sheetW);
      expect(sprite!.y + sprite!.h).toBeLessThanOrEqual(sprite!.sheetH);
      const css = spriteBackgroundStyle(sprite!, 28);
      expect(css.width).toBeGreaterThan(0);
      expect(css.height).toBeGreaterThan(0);
    }

    // Strips quality tier suffix cleanly
    expect(getFarmingItemSprite('wheat:gold')?.x).toBe(getFarmingItemSprite('wheat')?.x);
  });

  it('provides 4 stage sprites for all field crops + flowers, all 12 trees & all 8 workshops', () => {
    for (const cropSku of DEEP_FIELD_CROP_SKUS) {
      for (let s = 0; s < 4; s += 1) {
        expect(getFarmingCropStageFrame(cropSku, s), `missing ${cropSku} stage ${s}`).not.toBeNull();
      }
    }
    for (const flower of FLOWER_SPECIES_CATALOG) {
      for (let s = 0; s < 4; s += 1) {
        expect(getFarmingCropStageFrame(flower.sku, s), `missing ${flower.sku} stage ${s}`).not.toBeNull();
      }
    }
    for (const tree of ORCHARD_TREE_DEFS) {
      for (const st of ['sapling', 'young', 'mature', 'fruiting'] as const) {
        expect(getFarmingTreeFrame(tree.treeId, st), `missing ${tree.treeId} ${st}`).not.toBeNull();
      }
    }
    for (const ws of WORKSHOP_DEFS) {
      expect(getWorkshopMachineSprite(ws.id), `missing workshop sprite ${ws.id}`).not.toBeNull();
    }
  });

  it('whitelists every generated file under public/assets/farming/ in production-public-files.json', () => {
    const whitelist = new Set(
      JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, 'scripts/production-public-files.json'), 'utf8'),
      ) as string[],
    );
    const files = fs.readdirSync(PUBLIC_FARMING_DIR);
    expect(files.length).toBe(9);
    for (const name of files) {
      expect(whitelist.has(`assets/farming/${name}`), `Missing whitelist entry for ${name}`).toBe(true);
    }
  });
});
