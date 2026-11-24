import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import ids from '../src/game/art/worldArtIds.json' with { type: 'json' };
import extIds from '../src/game/art/worldExtendedArtIds.json' with { type: 'json' };
import rig from '../src/game/art/avatarRig.json' with { type: 'json' };
import pets from './atlas-sources/free-pets-preview.json' with { type: 'json' };
import catSheetData from './atlas-sources/free-pets-cat-sheet.json' with { type: 'json' };
import { PixelCanvas, encodePng } from './pixel-canvas.mjs';
import { makeBlossom, makeCottage, makeGarden, makeHome, makeRig } from './unified-atlas-art.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const defaultOutput = path.join(root, 'public/assets/unified');
const cc0 = {
  pack: 'Our Little World Procedural', version: 'v0.1',
  license: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  credit: 'Our Little World',
};
const ccBy = {
  pack: 'Free Pets Pack', version: '16px top-down, SHA-256 pinned',
  license: 'CC-BY-4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  credit: 'Frakassets', sourceUrl: 'https://frakassets.itch.io/free-pets-pack',
};

// These source rectangles are part of the V0.1 starter catalog. The test checks both sides.
export const starterBounds = {
  bed_cozy: [0, 0, 32, 32], wardrobe_oak: [32, 0, 16, 32],
  bookshelf_warm: [48, 0, 16, 32], lamp_floor: [64, 0, 16, 32],
  sofa_cream: [80, 0, 32, 24], table_wood: [112, 0, 32, 24],
  desk_study: [144, 0, 32, 24], plant_monstera: [32, 32, 16, 24],
  rug_peach: [0, 32, 32, 32], bench_garden: [176, 0, 32, 24],
  lantern_garden: [48, 32, 16, 24], flowerpot_sakura: [64, 32, 16, 24],
};

// The starter PNG encoder writes only RGBA/8-bit/filter-0. Reject a changed format instead of guessing.
function readPngRgba(buffer) {
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const chunks = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    if (buffer.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      chunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }
  const packed = inflateSync(Buffer.concat(chunks));
  const canvas = new PixelCanvas(width, height);
  const pitch = width * 4 + 1;
  if (buffer[24] !== 8 || buffer[25] !== 6 || buffer[28] !== 0 || packed.length !== pitch * height) {
    throw new Error('Định dạng PNG không hợp lệ hoặc không phải RGBA 8-bit.');
  }
  for (let y = 0; y < height; y += 1) {
    if (packed[pitch * y] !== 0) throw new Error('Bộ PNG dùng bộ lọc chưa hỗ trợ.');
    packed.copy(canvas.buf, y * width * 4, y * pitch + 1, (y + 1) * pitch);
  }
  return canvas;
}

function copyPixels(source, target, x, y, w, h, destX = 0, destY = 0) {
  if (x < 0 || y < 0 || x + w > source.width || y + h > source.height ||
      destX + w > target.width || destY + h > target.height) {
    throw new Error('Khung sprite nằm ngoài ảnh nguồn hoặc atlas.');
  }
  for (let row = 0; row < h; row += 1) {
    const start = ((y + row) * source.width + x) * 4;
    source.buf.copy(target.buf, ((destY + row) * target.width + destX) * 4, start, start + w * 4);
  }
}

function furnitureSprite(source, bounds) {
  const [, , w, h] = bounds;
  const canvas = new PixelCanvas(w, h);
  copyPixels(source, canvas, ...bounds);
  for (let i = 0; i < canvas.buf.length; i += 4) {
    if (canvas.buf[i + 3] === 0) continue;
    const [r, g, b] = canvas.buf.subarray(i, i + 3);
    canvas.buf[i] = Math.round(r * 0.91 + 219 * 0.09);
    canvas.buf[i + 1] = Math.round(g * 0.91 + 181 * 0.09);
    canvas.buf[i + 2] = Math.round(b * 0.91 + 167 * 0.09);
  }
  return canvas;
}

function readPet(key, packRoot, warn) {
  const { file, sha256, frame, rect, rgbaDeflate } = pets[key];
  const local = path.join(packRoot, file);
  if (!fs.existsSync(local)) {
    warn('Thiếu pack local cho ' + key + '. Dùng frame CC BY 4.0 đã đối chiếu và lưu trong repo.');
  } else if (createHash('sha256').update(fs.readFileSync(local)).digest('hex') !== sha256) {
    warn('Phiên bản local của ' + key + ' chưa được xác minh. Dùng frame CC BY 4.0 đã được đối chiếu.');
  }
  const pixels = new PixelCanvas(16, 16);
  const rgba = inflateSync(Buffer.from(rgbaDeflate, 'base64'));
  if (rgba.length !== pixels.buf.length) throw new Error('Kích thước preview thú cưng không hợp lệ.');
  rgba.copy(pixels.buf);
  return { pixels, source: { ...ccBy, file, sha256, frame, rect } };
}

export function validateAtlas(manifest, expectedIds) {
  const idsFound = new Set();
  const frames = [];
  for (const { id, texture, rect, anchor, source } of manifest.entries) {
    if (idsFound.has(id)) throw new Error('Semantic ID trùng: ' + id);
    idsFound.add(id);
    const sheet = manifest.textures[texture];
    const { x, y, w, h } = rect;
    if (!sheet || ![x, y, w, h].every(Number.isInteger) || w <= 0 || h <= 0 ||
        x < 0 || y < 0 || x + w > sheet.width || y + h > sheet.height ||
        ![anchor.ox, anchor.oy].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) {
      throw new Error('Khung sprite ngoài atlas hoặc neo không hợp lệ: ' + id);
    }
    if (frames.some((other) => other.texture === texture &&
        x < other.rect.x + other.rect.w && x + w > other.rect.x &&
        y < other.rect.y + other.rect.h && y + h > other.rect.y)) {
      throw new Error('Khung sprite ghi đè nhau: ' + id);
    }
    frames.push({ texture, rect });
    if (!['CC0-1.0', 'CC-BY-4.0'].includes(source.license) || !source.credit || !source.version) {
      throw new Error('Thiếu giấy phép phát hành: ' + id);
    }
  }
  if (expectedIds && (expectedIds.length !== idsFound.size || expectedIds.some((id) => !idsFound.has(id)))) {
    throw new Error('Atlas không đủ semantic ID V0.1.');
  }
}

const credits = `# Credits — Our Little World V0.1 / V0.1.5

- **Our Little World** — sàn, nhà/vườn, nội thất/môi trường procedural và ba rig tóc ngắn/bob/dài (gồm tư thế ngồi). [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Frakassets** — [Free Pets Pack](https://frakassets.itch.io/free-pets-pack), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Sheet 16×16 top-down của \`cat-orange\` (outline lit & shadow, 128 frames) và frame preview \`puppy-shiba\`. Đóng atlas lại, giữ nguyên pixel gốc.

## Tham chiếu Demo E

Cup Nooble (Sprout Lands Basic/Sorry), LimeZu (Modern Interiors Free), Amo-QAQ (Cozy Lands Basic) và Daniel Diggle (Sunnyside World) là nguồn tham chiếu mỹ thuật của Demo E. Atlas công khai dùng bản vẽ CC0 cho các nhóm này; bản Demo E nguyên gốc chỉ nằm trong profile private (\`public/assets/private-unified/\`).
`;

export function buildUnifiedAtlas({ output = defaultOutput, packRoot = path.join(root, 'asset-candidates/extracted/free-pets-pack'), warn = console.warn } = {}) {
  for (const pack of ['sprout-lands-basic', 'sprout-lands-sorry', 'modern-interiors-free', 'cozy-lands-basic', 'sunnyside-world']) {
    warn('Quyền phát hành atlas Web/PWA chưa được xác minh cho ' + pack + '. Atlas công khai dùng fallback CC0.');
  }
  const starter = readPngRgba(fs.readFileSync(path.join(root, 'public/assets/starter/furniture-cozy.png')));
  const world = new PixelCanvas(544, 304);
  const avatars = new PixelCanvas(rig.frameWidth * rig.frameCount * rig.directions.length, rig.frameHeight * 3 * rig.hairStyles.length);
  const textures = {
    world: { file: 'world.png', width: world.width, height: world.height },
    avatars: { file: 'avatars.png', width: avatars.width, height: avatars.height },
  };
  const entries = [];
  const topLeft = { ox: 0, oy: 0 };
  const bottomCenter = { ox: 0.5, oy: 1 };
  function place(id, pixels, texture, x, y, anchor, source = cc0) {
    copyPixels(pixels, texture === 'world' ? world : avatars, 0, 0, pixels.width, pixels.height, x, y);
    entries.push({ id, texture, rect: { x, y, w: pixels.width, h: pixels.height }, anchor, source });
  }
  place(ids.background.home, makeHome(256, 192), 'world', 0, 0, topLeft);
  place(ids.background.garden, makeGarden(288, 224), 'world', 256, 0, topLeft);
  let x = 0;
  for (const [sku, id] of Object.entries(ids.furniture)) {
    const pixels = furnitureSprite(starter, starterBounds[sku]);
    place(id, pixels, 'world', x, 224, { ox: 0, oy: 1 });
    x += pixels.width;
  }
  place(ids.scenery.blossom, makeBlossom(), 'world', 0, 256, bottomCenter);
  place(ids.scenery.cottage, makeCottage(), 'world', 44, 256, bottomCenter);
  for (const [index, [key, id]] of [['cat-orange', ids.pets.cat], ['puppy-shiba', ids.pets.shiba]].entries()) {
    const { pixels, source } = readPet(key, packRoot, warn);
    place(id, pixels, 'world', 104 + index * 16, 256, bottomCenter, source);
  }
  for (const [index, style] of rig.hairStyles.entries()) {
    place(ids.rigs[style], makeRig(style), 'avatars', 0, index * rig.frameHeight * 3, bottomCenter);
  }
  const manifest = { version: 1, tilePx: 16, textures, entries };
  validateAtlas(manifest, Object.values(ids).flatMap(Object.values));
  fs.mkdirSync(output, { recursive: true });
  for (const [name, canvas] of Object.entries({ world, avatars })) {
    fs.writeFileSync(path.join(output, textures[name].file), encodePng(canvas.width, canvas.height, canvas.buf));
  }
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'CREDITS.md'), credits);
  return manifest;
}

function makeCc0Prop(w, h, drawFn) {
  const c = new PixelCanvas(w, h);
  drawFn(c);
  return c;
}

export function buildPropsAtlas({ output = defaultOutput, packRoot = path.join(root, 'asset-candidates/extracted/free-pets-pack') } = {}) {
  const sheet = new PixelCanvas(640, 448);
  const entries = [];
  let cx = 0;
  let cy = 0;
  let rowH = 0;
  function packItem(id, pixels, anchor, meta = {}) {
    if (cx + pixels.width > sheet.width) {
      cx = 0;
      cy += rowH + 2;
      rowH = 0;
    }
    if (cy + pixels.height > sheet.height) {
      throw new Error('world-props.png không đủ chỗ cho ' + id);
    }
    copyPixels(pixels, sheet, 0, 0, pixels.width, pixels.height, cx, cy);
    entries.push({ id, rect: { x: cx, y: cy, w: pixels.width, h: pixels.height }, anchor, source: cc0, ...meta });
    cx += pixels.width + 2;
    rowH = Math.max(rowH, pixels.height);
  }

  // CC0 fallback environmental & animated sheets for public dist/
  packItem(extIds.props.meadow_tile, makeCc0Prop(16, 16, (c) => { c.rect(0, 0, 16, 16, '#b8ca7d'); c.px(4, 6, '#c7d88e'); c.px(11, 12, '#acc070'); }), { ox: 0, oy: 0 });
  packItem(extIds.props.meadow_flora, makeCc0Prop(16, 16, (c) => { c.rect(0, 0, 16, 16, '#b8ca7d'); c.rect(6, 7, 3, 1, '#fff0cc'); c.rect(7, 6, 1, 3, '#fff0cc'); c.px(7, 7, '#e1a862'); }), { ox: 0, oy: 0 });
  packItem(extIds.props.fireplace_brick, makeCc0Prop(48, 48, (c) => { c.rect(18, 0, 12, 16, '#5c4a52'); c.rect(2, 16, 44, 30, '#a66b5c'); c.rect(6, 20, 36, 6, '#cfa078'); c.rect(14, 28, 20, 16, '#2d2026'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.tv_cinema_unit, makeCc0Prop(32, 24, (c) => { c.rect(2, 4, 28, 16, '#43384a'); c.rect(4, 6, 24, 11, '#7999b3'); c.rect(12, 20, 8, 4, '#8c5e4c'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.kitchen_fridge, makeCc0Prop(16, 32, (c) => { c.rect(1, 2, 14, 29, '#c7d2d9'); c.rect(2, 3, 12, 11, '#e6eef2'); c.rect(2, 16, 12, 13, '#d7e2e8'); c.rect(11, 8, 1, 3, '#72828f'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.kitchen_counter_fruit, makeCc0Prop(32, 24, (c) => { c.rect(0, 4, 32, 20, '#8f5d47'); c.rect(1, 5, 30, 8, '#e3be96'); c.circle(8, 8, 3, '#6da862'); c.circle(22, 8, 3, '#df6d6d'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.dining_chair_right, makeCc0Prop(16, 20, (c) => { c.rect(3, 4, 3, 15, '#8c5a44'); c.rect(3, 12, 9, 4, '#c78c66'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.dining_chair_left, makeCc0Prop(16, 20, (c) => { c.rect(10, 4, 3, 15, '#8c5a44'); c.rect(4, 12, 9, 4, '#c78c66'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.bookshelf_wide, makeCc0Prop(48, 32, (c) => { c.rect(0, 0, 48, 32, '#8c5843'); c.rect(2, 4, 44, 10, '#4f352f'); c.rect(2, 18, 44, 10, '#4f352f'); c.rect(4, 6, 4, 8, '#7ea86e'); c.rect(10, 6, 4, 8, '#d46e68'); c.rect(16, 6, 4, 8, '#e6b868'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.study_chair, makeCc0Prop(16, 20, (c) => { c.rect(4, 4, 8, 10, '#c78c66'); c.rect(4, 14, 2, 5, '#70493b'); c.rect(10, 14, 2, 5, '#70493b'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.rug_coral, makeCc0Prop(24, 16, (c) => { c.rect(0, 0, 24, 16, '#df9da8'); c.rect(2, 2, 20, 12, '#f2bcc5'); }), { ox: 0.5, oy: 0.5 });
  packItem(extIds.props.pet_bowl_food, makeCc0Prop(16, 16, (c) => { c.rect(4, 9, 8, 5, '#6885a6'); c.rect(5, 8, 6, 2, '#9e623c'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.pet_bowl_water, makeCc0Prop(16, 16, (c) => { c.rect(4, 9, 8, 5, '#5982c2'); c.rect(5, 9, 6, 2, '#8cc8eb'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.photo_frame, makeCc0Prop(16, 16, (c) => { c.rect(2, 2, 12, 12, '#8c5843'); c.rect(3, 3, 10, 10, '#ffe8d6'); c.circle(6, 7, 2, '#e38798'); c.circle(10, 7, 2, '#739eb8'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.oak_tree, makeCc0Prop(32, 32, (c) => { c.rect(13, 18, 6, 13, '#885956'); c.circle(16, 12, 11, '#7ea862'); c.circle(14, 10, 8, '#9dc476'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.apple_tree, makeCc0Prop(32, 32, (c) => { c.rect(13, 18, 6, 13, '#885956'); c.circle(16, 12, 11, '#7ea862'); c.circle(12, 10, 2, '#df6962'); c.circle(20, 13, 2, '#df6962'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.peach_tree, makeCc0Prop(32, 32, (c) => { c.rect(13, 18, 6, 13, '#885956'); c.circle(16, 12, 11, '#e8a2b2'); c.circle(14, 10, 7, '#f7c5d0'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.sakura_bush, makeCc0Prop(16, 16, (c) => { c.circle(8, 9, 6, '#df9da8'); c.circle(7, 7, 4, '#f5c2cd'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.sakura_petals, makeCc0Prop(16, 16, (c) => { c.px(3, 5, '#ffc4d6'); c.px(9, 10, '#ffc4d6'); c.px(12, 4, '#ffe0ea'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.planter_box, makeCc0Prop(32, 16, (c) => { c.rect(1, 7, 30, 8, '#8f5d47'); c.rect(3, 5, 26, 4, '#79a35f'); c.px(7, 5, '#ffd7e2'); c.px(16, 6, '#fff0cc'); c.px(24, 5, '#ffd7e2'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.mailbox_red, makeCc0Prop(16, 32, (c) => { c.rect(7, 16, 2, 14, '#7a4d3c'); c.rect(3, 5, 10, 12, '#c74c4c'); c.rect(4, 10, 8, 2, '#ffe0c2'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.picnic_blanket, makeCc0Prop(48, 48, (c) => { for (let y = 0; y < 48; y += 8) for (let x = 0; x < 48; x += 8) c.rect(x, y, 8, 8, ((x + y) / 8) % 2 === 0 ? '#f2b8c6' : '#ffeef2'); }), { ox: 0.5, oy: 0.5 });
  packItem(extIds.props.picnic_basket, makeCc0Prop(16, 16, (c) => { c.rect(3, 6, 10, 8, '#ba8858'); c.rect(4, 3, 8, 3, '#8f5f3a'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.picnic_tart, makeCc0Prop(16, 16, (c) => { c.circle(8, 11, 4, '#ffe8cf'); c.circle(8, 10, 2, '#df5d73'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.picnic_teacup, makeCc0Prop(16, 16, (c) => { c.rect(5, 9, 6, 5, '#d9eef5'); c.rect(6, 10, 4, 1, '#98b888'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.bridge_wood, makeCc0Prop(16, 48, (c) => { c.rect(1, 0, 14, 48, '#a8744e'); for (let y = 2; y < 48; y += 6) c.rect(1, y, 14, 1, '#7a4f34'); }), { ox: 0.5, oy: 0.5 });
  packItem(extIds.props.water_lotus, makeCc0Prop(16, 16, (c) => { c.circle(8, 9, 5, '#72a866'); c.circle(8, 7, 3, '#f7b2c4'); }), { ox: 0.5, oy: 0.5 });
  packItem(extIds.props.water_lily, makeCc0Prop(16, 16, (c) => { c.circle(8, 9, 5, '#72a866'); }), { ox: 0.5, oy: 0.5 });
  packItem(extIds.props.water_reed_a, makeCc0Prop(16, 16, (c) => { c.rect(6, 5, 1, 10, '#6a9453'); c.rect(9, 7, 1, 8, '#7ea862'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.water_reed_b, makeCc0Prop(16, 16, (c) => { c.rect(7, 4, 1, 11, '#6a9453'); c.rect(10, 8, 1, 7, '#7ea862'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.fence_3w, makeCc0Prop(48, 16, (c) => { c.rect(0, 6, 48, 3, '#b88558'); c.rect(2, 2, 4, 13, '#8f5f3a'); c.rect(22, 2, 4, 13, '#8f5f3a'); c.rect(42, 2, 4, 13, '#8f5f3a'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.fence_1w, makeCc0Prop(16, 16, (c) => { c.rect(0, 6, 16, 3, '#b88558'); c.rect(6, 2, 4, 13, '#8f5f3a'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.beehive, makeCc0Prop(24, 24, (c) => { c.rect(4, 6, 16, 14, '#e6d8ad'); c.rect(3, 5, 18, 4, '#c7b887'); c.rect(10, 14, 4, 5, '#47362b'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.sunflower, makeCc0Prop(16, 16, (c) => { c.rect(7, 8, 2, 7, '#649451'); c.circle(8, 5, 4, '#ffd24c'); c.circle(8, 5, 2, '#6e472f'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.tomato, makeCc0Prop(16, 16, (c) => { c.rect(7, 7, 2, 8, '#5f8e4d'); c.circle(6, 9, 2, '#e05b52'); c.circle(10, 11, 2, '#e05b52'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.corn, makeCc0Prop(16, 16, (c) => { c.rect(7, 4, 2, 11, '#5f8e4d'); c.rect(6, 6, 4, 5, '#f2cc5a'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.radish, makeCc0Prop(16, 16, (c) => { c.rect(6, 5, 4, 4, '#6fa656'); c.circle(8, 12, 3, '#e8788e'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.beetroot, makeCc0Prop(16, 16, (c) => { c.rect(6, 5, 4, 4, '#5e944d'); c.circle(8, 12, 3, '#a6476d'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.cabbage, makeCc0Prop(16, 16, (c) => { c.circle(8, 11, 4, '#7ebc7a'); c.circle(8, 11, 2, '#a8d9a2'); }), { ox: 0.5, oy: 1 });
  packItem(extIds.props.side_cottage, makeCottage(), { ox: 0.5, oy: 1 });
  for (const shore of ['shore_n', 'shore_s', 'shore_w', 'shore_e', 'shore_nw', 'shore_ne', 'shore_sw', 'shore_se']) {
    packItem(extIds.props[shore], makeCc0Prop(16, 16, (c) => { c.rect(0, 0, 16, 16, '#87c4b8'); c.rect(0, 0, 16, 3, '#b8ca7d'); }), { ox: 0, oy: 0 });
  }

  // Animated strips (4 frames each 16x16)
  packItem(extIds.sheets.fire, makeCc0Prop(64, 16, (c) => {
    for (let f = 0; f < 4; f += 1) { c.circle(f * 16 + 8, 10 - (f % 2), 4, '#ff9d3b'); c.circle(f * 16 + 8, 11, 2, '#ffe073'); }
  }), { ox: 0.5, oy: 1 }, { frameWidth: 16, frameHeight: 16, frameCount: 4 });
  packItem(extIds.sheets.water, makeCc0Prop(64, 16, (c) => {
    for (let f = 0; f < 4; f += 1) { c.rect(f * 16, 0, 16, 16, '#7ec2c9'); c.rect(f * 16 + 2 + f * 2, 6, 5, 1, '#bdebf0'); }
  }), { ox: 0, oy: 0 }, { frameWidth: 16, frameHeight: 16, frameCount: 4 });
  packItem(extIds.sheets.duck, makeCc0Prop(64, 16, (c) => {
    for (let f = 0; f < 4; f += 1) { c.circle(f * 16 + 8, 10 + (f % 2), 3, '#ffffff'); c.rect(f * 16 + 10, 9, 2, 1, '#f29f3d'); }
  }), { ox: 0.5, oy: 0.8 }, { frameWidth: 16, frameHeight: 16, frameCount: 4 });
  packItem(extIds.sheets.frog, makeCc0Prop(48, 16, (c) => {
    for (let f = 0; f < 3; f += 1) c.circle(f * 16 + 8, 11 - (f === 1 ? 2 : 0), 3, '#72b85f');
  }), { ox: 0.5, oy: 0.8 }, { frameWidth: 16, frameHeight: 16, frameCount: 3 });
  packItem(extIds.sheets.chicken, makeCc0Prop(64, 16, (c) => {
    for (let f = 0; f < 4; f += 1) { c.circle(f * 16 + 8, 11 - (f % 2), 3, '#fff6e8'); c.px(f * 16 + 8, 7, '#e05852'); }
  }), { ox: 0.5, oy: 0.85 }, { frameWidth: 16, frameHeight: 16, frameCount: 4 });
  packItem(extIds.sheets.sheep, makeCc0Prop(64, 16, (c) => {
    for (let f = 0; f < 4; f += 1) { c.circle(f * 16 + 8, 10, 5, '#f5efe6'); c.rect(f * 16 + 11, 9, 3, 3, '#5c4d49'); }
  }), { ox: 0.5, oy: 0.85 }, { frameWidth: 16, frameHeight: 16, frameCount: 4 });

  // Full CC BY 4.0 Free Pets Pack cat-orange spritesheet + shadow (SHA-256 pinned in repo)
  const catY = Math.max(192, cy + rowH + 2);
  for (const [colOffset, [entryId, spec]] of [
    [0, [extIds.sheets.cat_orange, catSheetData.lit]],
    [192, [extIds.sheets.cat_orange_shadow, catSheetData.shadow]],
  ]) {
    const localFile = path.join(packRoot, spec.file);
    if (fs.existsSync(localFile) && createHash('sha256').update(fs.readFileSync(localFile)).digest('hex') !== spec.sha256) {
      throw new Error('SHA-256 không khớp cho ' + spec.file);
    }
    const pixels = new PixelCanvas(spec.width, spec.height);
    const rgba = inflateSync(Buffer.from(spec.rgbaDeflate, 'base64'));
    rgba.copy(pixels.buf);
    copyPixels(pixels, sheet, 0, 0, spec.width, spec.height, colOffset, catY);
    entries.push({
      id: entryId,
      rect: { x: colOffset, y: catY, w: spec.width, h: spec.height },
      anchor: { ox: 0.5, oy: 0.85 },
      frameWidth: 16,
      frameHeight: 16,
      frameCount: 128,
      source: { ...ccBy, file: spec.file, sha256: spec.sha256 },
    });
  }

  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'world-props.png'), encodePng(sheet.width, sheet.height, sheet.buf));
  fs.writeFileSync(
    path.join(output, 'props-manifest.json'),
    JSON.stringify({ version: 1, texture: { file: 'world-props.png', width: sheet.width, height: sheet.height }, entries }, null, 2) + '\n',
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--private')) {
    const ts = (await import('typescript')).default;
    const registryFile = path.join(root, 'src/game/artDemos/semanticAssetRegistry.ts');
    const registrySource = fs.readFileSync(registryFile, 'utf8');
    const { outputText } = ts.transpileModule(registrySource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    const { SEMANTIC_ASSETS } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
    const paths = JSON.parse(fs.readFileSync(path.join(root, 'scripts/atlas-sources/demo-e-textures.json'), 'utf8'));
    const result = spawnSync('python', ['-X', 'utf8', path.join(root, 'scripts/build-private-atlas.py')], {
      input: JSON.stringify({
        output: path.join(root, 'public/assets/private-unified'),
        fallback: defaultOutput,
        sources: path.join(root, 'asset-candidates/extracted'),
        registry: SEMANTIC_ASSETS, paths, ids, extIds, rigStyles: rig.hairStyles,
      }),
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    if (result.error) console.error('Cần Python và Pillow để tạo atlas riêng.', result.error.message);
    process.exit(result.status ?? 1);
  }
  const result = buildUnifiedAtlas();
  buildPropsAtlas();
  console.log('Atlas V0.1: ' + result.entries.length + ' semantic ID tại public/assets/unified/.');
}
