/**
 * Flat PNG of Cabacos east-coast beach slice (pre-Phaser) for OLWH-40 evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { encodePng } from './pixel-canvas.mjs';

const ROOT = path.resolve('public');
const OUT =
  process.env.OUT ||
  '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media/map-transplant-beach-donor.png';

const TW = 16;

function loadPng(rel) {
  const abs = path.join(ROOT, rel.replace(/^\//, ''));
  return PNG.sync.read(fs.readFileSync(abs));
}

function gidTile(tilesets, gid) {
  if (!gid) return null;
  let ts = null;
  for (let i = tilesets.length - 1; i >= 0; i -= 1) {
    if (gid >= tilesets[i].firstgid) {
      ts = tilesets[i];
      break;
    }
  }
  if (!ts) return null;
  const local = gid - ts.firstgid;
  const col = local % ts.columns;
  const row = Math.floor(local / ts.columns);
  return { ts, col, row, tw: ts.tilewidth, th: ts.tileheight };
}

function main() {
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/maps/beach.json'), 'utf8'));
  const w = map.width;
  const h = map.height;
  const textures = new Map();
  for (const ts of map.tilesets) {
    const rel = ts.image.startsWith('/') ? ts.image : `/${ts.image}`;
    textures.set(ts.name, { png: loadPng(rel), def: ts });
  }

  const rgba = Buffer.alloc(w * TW * h * TW * 4, 0);
  const layers = map.layers.filter((l) => l.type === 'tilelayer' && l.name !== 'Collision');
  for (const layer of layers) {
    if (layer.visible === false) continue;
    for (let ty = 0; ty < h; ty += 1) {
      for (let tx = 0; tx < w; tx += 1) {
        const gid = layer.data[ty * w + tx] ?? 0;
        const hit = gidTile(map.tilesets, gid);
        if (!hit) continue;
        const { png, def } = textures.get(hit.ts.name);
        const sx = hit.col * hit.tw;
        const sy = hit.row * hit.th;
        for (let py = 0; py < hit.th; py += 1) {
          for (let px = 0; px < hit.tw; px += 1) {
            const si = ((sy + py) * png.width + (sx + px)) << 2;
            const di = ((ty * TW + py) * w * TW + (tx * TW + px)) << 2;
            const a = png.data[si + 3];
            if (a === 0) continue;
            rgba[di] = png.data[si];
            rgba[di + 1] = png.data[si + 1];
            rgba[di + 2] = png.data[si + 2];
            rgba[di + 3] = a;
          }
        }
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, encodePng(w * TW, h * TW, rgba));
  console.log('Wrote', OUT);
}

main();