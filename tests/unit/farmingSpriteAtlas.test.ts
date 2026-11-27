import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import canonicalCatalog from '../../src/shared/catalog/canonicalCatalog.generated.json';
import {
  FARMING_SPRITE_ATLAS_META,
  getAllLivestockAtlasSpecs,
  getFarmingCropStageFrame,
  getFarmingItemSprite,
  getFarmingTreeFrame,
  getLivestockAtlasSpec,
  getWorkshopMachineSprite,
  livestockAnimKey,
  spriteBackgroundStyle,
} from '../../src/shared/art/farmingSpriteAtlas';
import { DEEP_FIELD_CROP_SKUS } from '../../src/shared/farming/deepCropSimulation';
import { FLOWER_SPECIES_CATALOG } from '../../src/shared/farming/flowerGenetics';
import { LIVESTOCK_SPECIES_LIST } from '../../src/shared/farming/livestock';
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

function readPngRgba(filePath: string): { width: number; height: number; data: Buffer } {
  const buf = fs.readFileSync(filePath);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4;
  const rgba = Buffer.alloc(height * stride);
  const paeth = (a: number, b: number, c: number): number => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]!;
    const srcRow = y * (stride + 1) + 1;
    const dstRow = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const val = raw[srcRow + x]!;
      const left = x >= 4 ? rgba[dstRow + x - 4]! : 0;
      const up = y > 0 ? rgba[dstRow - stride + x]! : 0;
      const upLeft = x >= 4 && y > 0 ? rgba[dstRow - stride + x - 4]! : 0;
      let recon = val;
      if (filter === 1) recon = (val + left) & 0xff;
      else if (filter === 2) recon = (val + up) & 0xff;
      else if (filter === 3) recon = (val + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) recon = (val + paeth(left, up, upLeft)) & 0xff;
      rgba[dstRow + x] = recon;
    }
  }
  return { width, height, data: rgba };
}

describe('Curated Farming Sprite Atlases (Checkpoint G)', () => {
  it('matches actual PNG IHDR dimensions and stays strictly in bounds for every atlas frame', () => {
    const atlasPairs = [
      ['items-16.png', 'items-16.json'],
      ['items-32.png', 'items-32.json'],
      ['crops-stages.png', 'crops-stages.json'],
      ['trees-orchard.png', 'trees-orchard.json'],
      ['livestock-ranch.png', 'livestock-ranch.json'],
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

  it('gives every canonical SKU a distinct non-empty pixel sprite (no duplicate M3a hashes)', () => {
    const sheets = {
      items16: readPngRgba(path.join(PUBLIC_FARMING_DIR, 'items-16.png')),
      items32: readPngRgba(path.join(PUBLIC_FARMING_DIR, 'items-32.png')),
    };
    const skus = (canonicalCatalog.items as Array<{ sku: string }>).map((i) => i.sku);
    const hashes = new Map<string, string[]>();

    for (const sku of skus) {
      const sp = getFarmingItemSprite(sku)!;
      const png = sheets[sp.atlas];
      const hasher = crypto.createHash('sha256');
      let nonTransparent = 0;
      for (let py = sp.y; py < sp.y + sp.h; py += 1) {
        const rowStart = (py * png.width + sp.x) * 4;
        const rowEnd = rowStart + sp.w * 4;
        const slice = png.data.subarray(rowStart, rowEnd);
        hasher.update(slice);
        for (let i = 3; i < slice.length; i += 4) {
          if (slice[i]! > 0) nonTransparent += 1;
        }
      }
      expect(nonTransparent, `blank icon for ${sku}`).toBeGreaterThan(0);
      const digest = hasher.digest('hex');
      const existing = hashes.get(digest) ?? [];
      existing.push(sku);
      hashes.set(digest, existing);
    }

    const duplicates = [...hashes.values()].filter((group) => group.length > 1);
    expect(duplicates).toEqual([]);
  });

  it('provides animated donor frame mappings for all 7 livestock species', () => {
    const livestockJson = JSON.parse(
      fs.readFileSync(path.join(PUBLIC_FARMING_DIR, 'livestock-ranch.json'), 'utf8'),
    ) as { frames: Record<string, unknown> };
    expect(FARMING_SPRITE_ATLAS_META.livestockCount).toBe(7);
    expect(Object.keys(getAllLivestockAtlasSpecs())).toHaveLength(7);

    for (const def of LIVESTOCK_SPECIES_LIST) {
      const spec = getLivestockAtlasSpec(def.speciesId);
      expect(spec, `missing livestock spec for ${def.speciesId}`).not.toBeNull();
      expect(spec!.donor).toBe('FarmRanchLife');
      if (def.speciesId === 'bee') {
        expect(spec!.animations.hive).toEqual(['bee_hive_0']);
        expect(spec!.animations.swarm).toHaveLength(4);
      } else {
        for (const animName of ['idle_down', 'walk_down', 'walk_left', 'walk_right', 'walk_up', 'eat_down', 'sleep_left']) {
          const frames = spec!.animations[animName];
          expect(frames?.length, `${def.speciesId}:${animName}`).toBeGreaterThanOrEqual(1);
          expect(livestockAnimKey(def.speciesId, animName)).toBe(`olw-livestock-${def.speciesId}-${animName}`);
        }
      }
      for (const frameKeys of Object.values(spec!.animations)) {
        for (const key of frameKeys) {
          expect(livestockJson.frames[key], `missing atlas frame ${key}`).toBeDefined();
        }
      }
    }
  });

  it('whitelists every generated file under public/assets/farming/ in production-public-files.json', () => {
    const whitelist = new Set(
      JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, 'scripts/production-public-files.json'), 'utf8'),
      ) as string[],
    );
    const files = fs.readdirSync(PUBLIC_FARMING_DIR);
    expect(files.length).toBe(11);
    for (const name of files) {
      expect(whitelist.has(`assets/farming/${name}`), `Missing whitelist entry for ${name}`).toBe(true);
    }
  });
});
