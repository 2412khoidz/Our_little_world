#!/usr/bin/env node
/**
 * Donor vs OLW farming art contact sheet (Worker C evidence).
 * OUT=/path/farming-transplant-contact-sheet.png node scripts/build-farming-transplant-contact-sheet.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT =
  process.env.OUT ??
  path.join(ROOT, 'public/assets/donor/farming-transplant-contact-sheet-olw.png');

const rows = [
  ['Cabacos soil', 'public/assets/donor/cabacos-plantation/soil.png'],
  ['Cabacos hoe', 'public/assets/donor/cabacos-plantation/tools/hoe.png'],
  ['Cabacos watering', 'public/assets/donor/cabacos-plantation/tools/watering_can.png'],
  ['Cabacos wheat', 'public/assets/donor/cabacos-plantation/crops/wheat.png'],
  ['Cabacos need-water', 'public/assets/donor/cabacos-plantation/indicators/crop_need_water.png'],
  ['PyDew soil_water 1', 'public/assets/donor/pydew-farming/soil_water/1.png'],
  ['PyDew tomato 2', 'public/assets/donor/pydew-farming/fruit/tomato/2.png'],
];

const py = `
from PIL import Image, ImageDraw, ImageFont
import sys
out = sys.argv[1]
tiles = sys.argv[2:]
CELL = 80
PAD = 8
LABEL_H = 14
cols = 4
n = len(tiles) // 2
rows_n = (n + cols - 1) // cols
W = cols * (CELL + PAD) + PAD
H = rows_n * (CELL + LABEL_H + PAD) + PAD
canvas = Image.new('RGBA', (W, H), (32, 28, 24, 255))
draw = ImageDraw.Draw(canvas)
for i in range(n):
    label, p = tiles[i*2], tiles[i*2+1]
    col, row = i % cols, i // cols
    x0 = PAD + col * (CELL + PAD)
    y0 = PAD + row * (CELL + LABEL_H + PAD)
    im = Image.open(p).convert('RGBA')
    im.thumbnail((CELL, CELL), Image.Resampling.NEAREST)
    ox = x0 + (CELL - im.width) // 2
    oy = y0 + LABEL_H + (CELL - im.height) // 2
    canvas.paste(im, (ox, oy), im)
    draw.text((x0, y0), label[:18], fill=(220, 200, 160))
canvas.save(out)
print('wrote', out, W, H)
`;

const args = [OUT, ...rows.flatMap(([label, rel]) => [label, path.join(ROOT, rel)])];
for (const [, rel] of rows) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    console.error('Missing', rel);
    process.exit(1);
  }
}
execFileSync('python3', ['-c', py, ...args], { stdio: 'inherit' });