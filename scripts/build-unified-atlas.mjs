import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import ids from '../src/game/art/worldArtIds.json' with { type: 'json' };
import rig from '../src/game/art/avatarRig.json' with { type: 'json' };
import pets from './atlas-sources/free-pets-preview.json' with { type: 'json' };
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
function readStarterRgba(buffer) {
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
    throw new Error('Định dạng PNG của bộ CC0 khởi đầu không hợp lệ.');
  }
  for (let y = 0; y < height; y += 1) {
    if (packed[pitch * y] !== 0) throw new Error('Bộ CC0 khởi đầu dùng bộ lọc PNG chưa hỗ trợ.');
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
  // Warm the procedural furniture to match the new palette. Alpha/footprints stay the same.
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
    if (!['CC0-1.0', 'CC-BY-4.0'].includes(source.license) || !source.credit || !source.version) {
      throw new Error('Thiếu giấy phép phát hành: ' + id);
    }
  }
  if (expectedIds && (expectedIds.length !== idsFound.size || expectedIds.some((id) => !idsFound.has(id)))) {
    throw new Error('Atlas không đủ semantic ID V0.1.');
  }
}

const credits = `# Credits — Our Little World V0.1

- **Our Little World** — sàn, nhà/vườn, nội thất procedural và ba rig tóc ngắn/bob/dài. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Frakassets** — [Free Pets Pack](https://frakassets.itch.io/free-pets-pack), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Hai frame cắt 16×16 từ lớp outline/lit của cat-orange Sleep South và puppy-shiba Idle South. Đóng atlas lại, không đổi pixel trong frame. Chỉ làm tư liệu kiểm chứng tỷ lệ preview tĩnh. SHA-256, vị trí nguồn và phiên bản nằm trong manifest.

## Tham chiếu Demo E

Cup Nooble (Sprout Lands Basic/Sorry), LimeZu (Modern Interiors Free), Amo-QAQ (Cozy Lands Basic) và Daniel Diggle (Sunnyside World) là nguồn tham chiếu mỹ thuật của Demo E. Atlas công khai dùng bản vẽ CC0 cho các nhóm này. Các pack tham chiếu, emote và sprite tính năng về sau không nằm trong atlas.
`;

export function buildUnifiedAtlas({ output = defaultOutput, packRoot = path.join(root, 'asset-candidates/extracted/free-pets-pack'), warn = console.warn } = {}) {
  for (const pack of ['sprout-lands-basic', 'sprout-lands-sorry', 'modern-interiors-free', 'cozy-lands-basic', 'sunnyside-world']) {
    warn('Quyền phát hành atlas Web/PWA chưa được xác minh cho ' + pack + '. Atlas công khai dùng fallback CC0.');
  }
  const starter = readStarterRgba(fs.readFileSync(path.join(root, 'public/assets/starter/furniture-cozy.png')));
  const world = new PixelCanvas(544, 272);
  const avatars = new PixelCanvas(rig.frameWidth * rig.frameCount * rig.directions.length, rig.frameHeight * 2 * rig.hairStyles.length);
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
    place(id, pixels, 'world', x, 192, { ox: 0, oy: 1 });
    x += pixels.width;
  }
  place(ids.scenery.blossom, makeBlossom(), 'world', 0, 224, bottomCenter);
  place(ids.scenery.cottage, makeCottage(), 'world', 44, 224, bottomCenter);
  for (const [index, [key, id]] of [['cat-orange', ids.pets.cat], ['puppy-shiba', ids.pets.shiba]].entries()) {
    const { pixels, source } = readPet(key, packRoot, warn);
    place(id, pixels, 'world', 104 + index * 16, 224, bottomCenter, source);
  }
  for (const [index, style] of rig.hairStyles.entries()) {
    place(ids.rigs[style], makeRig(style), 'avatars', 0, index * rig.frameHeight * 2, bottomCenter);
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
        registry: SEMANTIC_ASSETS, paths, ids, rigStyles: rig.hairStyles,
      }),
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    if (result.error) console.error('Cần Python và Pillow để tạo atlas riêng.', result.error.message);
    process.exit(result.status ?? 1);
  }
  const result = buildUnifiedAtlas();
  console.log('Atlas V0.1: ' + result.entries.length + ' semantic ID tại public/assets/unified/.');
}
