/**
 * Raster vendored Tuxemon candidate maps for side-by-side visual compare (pngjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { execFileSync } from 'node:child_process';

const REPO = path.resolve(import.meta.dirname, '..');
const DONOR = path.join(REPO, 'public/maps/donor/tuxemon');
const OUT_DIR =
  process.env.OLW_STORE_MEDIA ??
  path.resolve('/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media');
const PY = path.join(REPO, 'scripts/lib/tuxemonTmxToOlwJson.py');
const CANDIDATES = [
  {
    tmx: 'dryadsgrove.tmx',
    slice: 'forest-portal-slice.dryadsgrove.json',
    slug: 'dryadsgrove',
    out: 'map-transplant-forest-tuxemon-dryadsgrove.png',
  },
  {
    tmx: 'tt_forest_route1.tmx',
    slice: 'forest-portal-slice.tt_forest_route1.json',
    slug: 'tt_forest_route1',
    out: 'map-transplant-forest-tuxemon-route1.png',
  },
];

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function blitTile(target, tw, th, px, py, tile, src, cols) {
  const col = tile % cols;
  const row = Math.floor(tile / cols);
  for (let y = 0; y < th; y += 1) {
    for (let x = 0; x < tw; x += 1) {
      const sx = col * tw + x;
      const sy = row * th + y;
      const si = (src.width * sy + sx) << 2;
      const dx = px + x;
      const dy = py + y;
      const di = (target.width * dy + dx) << 2;
      if (src.data[si + 3] === 0) continue;
      target.data[di] = src.data[si];
      target.data[di + 1] = src.data[si + 1];
      target.data[di + 2] = src.data[si + 2];
      target.data[di + 3] = 255;
    }
  }
}

function rasterForestJson(jsonPath, outPng) {
  const map = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const tw = map.tilewidth;
  const th = map.tileheight;
  const w = map.width;
  const h = map.height;
  const png = new PNG({ width: w * tw, height: h * th });
  png.data.fill(0);

  const tilesetCache = new Map();
  const stack = ['Ground', 'Vegetation', 'Water', 'Above Player'];
  for (const layerName of stack) {
    const layer = map.layers.find((l) => l.name === layerName && l.type === 'tilelayer');
    if (!layer?.data) continue;
    for (let i = 0; i < layer.data.length; i += 1) {
      let gid = layer.data[i];
      if (!gid) continue;
      const tx = i % w;
      const ty = Math.floor(i / w);
      let ts = map.tilesets[0];
      for (const candidate of map.tilesets) {
        if (gid >= candidate.firstgid) ts = candidate;
      }
      const local = gid - ts.firstgid;
      if (local < 0) continue;
      const imgKey = ts.image;
      if (!tilesetCache.has(imgKey)) {
        const rel = imgKey.replace(/^\/maps\/donor\/tuxemon\/gfx\/tilesets\//, '');
        tilesetCache.set(imgKey, readPng(path.join(DONOR, 'gfx/tilesets', rel)));
      }
      const src = tilesetCache.get(imgKey);
      blitTile(png, tw, th, tx * tw, ty * th, local, src, ts.columns);
    }
  }
  fs.mkdirSync(path.dirname(outPng), { recursive: true });
  fs.writeFileSync(outPng, PNG.sync.write(png));
}

function pickSlug(tmpDir) {
  let best = CANDIDATES[0];
  let bestArea = 0;
  for (const c of CANDIDATES) {
    const json = JSON.parse(fs.readFileSync(path.join(tmpDir, `${c.slug}.json`), 'utf8'));
    const area = json.width * json.height;
    if (area > bestArea) {
      bestArea = area;
      best = c;
    }
  }
  return best.slug;
}

function main() {
  const manifest = path.join(DONOR, 'MANIFEST.json');
  const tmpDir = path.join(REPO, '.tmp-forest-compare');
  fs.mkdirSync(tmpDir, { recursive: true });
  for (const c of CANDIDATES) {
    const outJson = path.join(tmpDir, `${c.slug}.json`);
    execFileSync('python3', [
      PY,
      '--tmx',
      path.join(DONOR, 'maps', c.tmx),
      '--slice',
      path.join(DONOR, c.slice),
      '--manifest',
      manifest,
      '--out',
      outJson,
      '--slug',
      c.slug,
    ]);
    rasterForestJson(outJson, path.join(OUT_DIR, c.out));
    console.log('Wrote', path.join(OUT_DIR, c.out));
  }
  const selected = pickSlug(tmpDir);
  fs.writeFileSync(
    path.join(DONOR, 'SELECTED_MAP.json'),
    JSON.stringify(
      {
        slug: selected,
        reason: 'larger_playable_area_after_visual_compare',
        comparedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log('Selected forest donor map:', selected);
}

main();