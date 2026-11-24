import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const OUT_STARTER = path.join(ROOT, 'public', 'assets', 'starter');
const OUT_MAPS = path.join(ROOT, 'public', 'assets', 'maps');
const OUT_ICONS = path.join(ROOT, 'public', 'icons');
const MANIFEST_PATH = path.join(ROOT, 'public', 'assets', 'manifest.json');

fs.mkdirSync(OUT_STARTER, { recursive: true });
fs.mkdirSync(OUT_MAPS, { recursive: true });
fs.mkdirSync(OUT_ICONS, { recursive: true });

// --- Minimal pure-Node RGBA PNG encoder ---
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexToRgba(hex, alpha = 255) {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return [r, g, b, alpha];
}

class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buf = Buffer.alloc(width * height * 4, 0);
  }

  px(x, y, hex, alpha = 255) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const [r, g, b, a] = hexToRgba(hex, alpha);
    const idx = (iy * this.width + ix) * 4;
    if (a === 255 || this.buf[idx + 3] === 0) {
      this.buf[idx] = r;
      this.buf[idx + 1] = g;
      this.buf[idx + 2] = b;
      this.buf[idx + 3] = a;
      return;
    }
    const srcA = a / 255;
    const dstA = this.buf[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    this.buf[idx] = Math.round((r * srcA + this.buf[idx] * dstA * (1 - srcA)) / outA);
    this.buf[idx + 1] = Math.round((g * srcA + this.buf[idx + 1] * dstA * (1 - srcA)) / outA);
    this.buf[idx + 2] = Math.round((b * srcA + this.buf[idx + 2] * dstA * (1 - srcA)) / outA);
    this.buf[idx + 3] = Math.round(outA * 255);
  }

  rect(x, y, w, h, hex, alpha = 255) {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) {
        this.px(x + dx, y + dy, hex, alpha);
      }
    }
  }

  boxOutline(x, y, w, h, hex) {
    for (let dx = 0; dx < w; dx += 1) {
      this.px(x + dx, y, hex);
      this.px(x + dx, y + h - 1, hex);
    }
    for (let dy = 0; dy < h; dy += 1) {
      this.px(x, y + dy, hex);
      this.px(x + w - 1, y + dy, hex);
    }
  }

  circle(cx, cy, r, hex, alpha = 255) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (dx * dx + dy * dy <= r * r) {
          this.px(cx + dx, cy + dy, hex, alpha);
        }
      }
    }
  }

  save(filePath) {
    fs.writeFileSync(filePath, encodePng(this.width, this.height, this.buf));
  }
}

const PAL = {
  outline: '#4a3728',
  shadow: '#2b1d19',
  woodLight: '#e5be91',
  woodMid: '#d4a373',
  woodDark: '#b07d56',
  woodDeep: '#7d5338',
  wallTop: '#5c3f35',
  wallCream: '#faeedc',
  wallShade: '#ebd8bf',
  wallBase: '#9e6b4b',
  skyLight: '#c7ecff',
  skyMid: '#9ad4f5',
  peachLight: '#ffdfcc',
  peachMid: '#f2b89b',
  rose: '#e07a6f',
  roseDark: '#b85a50',
  sageLight: '#a9d696',
  sageMid: '#84b874',
  sageDark: '#5b8a51',
  sakuraLight: '#ffdbe6',
  sakuraMid: '#f7b2c7',
  sakuraDark: '#de839f',
  stoneLight: '#e9dfd1',
  stoneMid: '#cfc0ae',
  stoneDark: '#a29280',
  roofLight: '#dc7862',
  roofMid: '#bd5c49',
  roofDark: '#8f3f31',
  cream: '#fffaf2',
  goldLight: '#ffe796',
  goldMid: '#f4c158',
  teal: '#74a89e',
  leafLight: '#82c47d',
  leafDark: '#477e4c',
};

function drawWoodTile(c, ox, oy, variant) {
  c.rect(ox, oy, 16, 16, PAL.woodMid);
  for (let row = 0; row < 4; row += 1) {
    const py = oy + row * 4;
    c.rect(ox, py, 16, 1, row % 2 === 0 ? PAL.woodLight : PAL.woodMid);
    c.rect(ox, py + 3, 16, 1, PAL.woodDark);
    const seamX = (row * 5 + variant * 4) % 14 + 1;
    c.rect(ox + seamX, py, 1, 4, PAL.woodDark);
  }
  if (variant === 1) {
    c.px(ox + 3, oy + 5, PAL.woodLight);
    c.px(ox + 11, oy + 13, PAL.woodLight);
  }
  if (variant === 2) {
    c.px(ox + 6, oy + 9, PAL.woodDeep);
    c.px(ox + 7, oy + 9, PAL.woodDeep);
  }
}

function drawGrassTile(c, ox, oy, variant) {
  c.rect(ox, oy, 16, 16, PAL.sageMid);
  const tufts = [
    [2, 3],
    [10, 6],
    [5, 12],
    [13, 13],
  ];
  for (const [tx, ty] of tufts) {
    c.px(ox + tx, oy + ty, PAL.sageLight);
    c.px(ox + tx + 1, oy + ty + 1, PAL.sageDark);
  }
  if (variant === 1) {
    c.rect(ox + 7, oy + 2, 2, 1, PAL.sageLight);
    c.rect(ox + 1, oy + 10, 2, 1, PAL.sageLight);
  } else if (variant === 2) {
    // tiny clover
    c.px(ox + 4, oy + 7, PAL.sageLight);
    c.px(ox + 5, oy + 6, PAL.sageLight);
    c.px(ox + 6, oy + 7, PAL.sageLight);
    c.px(ox + 5, oy + 8, PAL.sageDark);
  } else if (variant === 3) {
    // tiny daisy flowers
    c.px(ox + 4, oy + 5, PAL.cream);
    c.px(ox + 5, oy + 4, PAL.cream);
    c.px(ox + 5, oy + 6, PAL.cream);
    c.px(ox + 6, oy + 5, PAL.cream);
    c.px(ox + 5, oy + 5, PAL.goldMid);

    c.px(ox + 11, oy + 11, PAL.cream);
    c.px(ox + 12, oy + 11, PAL.goldMid);
    c.px(ox + 13, oy + 11, PAL.cream);
  } else if (variant === 4) {
    // sakura petals on grass
    c.px(ox + 3, oy + 4, PAL.sakuraLight);
    c.px(ox + 4, oy + 4, PAL.sakuraMid);
    c.px(ox + 10, oy + 9, PAL.sakuraMid);
    c.px(ox + 11, oy + 10, PAL.sakuraLight);
    c.px(ox + 6, oy + 13, PAL.sakuraLight);
  }
}

function buildTileset() {
  const c = new PixelCanvas(256, 128);
  const tile = (col, row) => [col * 16, row * 16];

  // Row 0: Interior tiles
  drawWoodTile(c, ...tile(0, 0), 0);
  drawWoodTile(c, ...tile(1, 0), 1);
  drawWoodTile(c, ...tile(2, 0), 2);

  // (3, 0): Cream plaster wall middle
  {
    const [x, y] = tile(3, 0);
    c.rect(x, y, 16, 16, PAL.wallCream);
    c.rect(x, y + 14, 16, 2, PAL.wallShade);
    c.px(x + 4, y + 5, PAL.wallShade);
    c.px(x + 12, y + 9, PAL.wallShade);
  }
  // (4, 0): Plaster wall baseboard
  {
    const [x, y] = tile(4, 0);
    c.rect(x, y, 16, 10, PAL.wallCream);
    c.rect(x, y + 9, 16, 1, PAL.wallShade);
    c.rect(x, y + 10, 16, 1, PAL.woodLight);
    c.rect(x, y + 11, 16, 4, PAL.wallBase);
    c.rect(x, y + 15, 16, 1, PAL.outline);
  }
  // (5, 0): Wall top dark wood beam
  {
    const [x, y] = tile(5, 0);
    c.rect(x, y, 16, 16, PAL.wallTop);
    c.rect(x, y + 2, 16, 2, PAL.woodDeep);
    c.rect(x, y + 13, 16, 2, PAL.outline);
  }
  // (6, 0): Side wall timber pillar
  {
    const [x, y] = tile(6, 0);
    c.rect(x, y, 16, 16, PAL.wallTop);
    c.rect(x + 3, y, 10, 16, PAL.woodDeep);
    c.rect(x + 5, y, 2, 16, PAL.woodDark);
  }
  // (7, 0): Sunlit window
  {
    const [x, y] = tile(7, 0);
    c.rect(x, y, 16, 16, PAL.wallCream);
    c.rect(x + 2, y + 2, 12, 12, PAL.outline);
    c.rect(x + 3, y + 3, 10, 9, PAL.skyMid);
    c.rect(x + 3, y + 3, 10, 4, PAL.skyLight);
    c.px(x + 4, y + 4, PAL.cream);
    c.px(x + 5, y + 5, PAL.cream);
    // crossbars
    c.rect(x + 7, y + 3, 2, 9, PAL.woodLight);
    c.rect(x + 3, y + 7, 10, 1, PAL.woodLight);
    c.rect(x + 1, y + 13, 14, 2, PAL.woodMid);
  }
  // (8, 0): Cozy framed art on wall
  {
    const [x, y] = tile(8, 0);
    c.rect(x, y, 16, 16, PAL.wallCream);
    c.rect(x + 3, y + 3, 10, 9, PAL.outline);
    c.rect(x + 4, y + 4, 8, 7, PAL.woodLight);
    c.rect(x + 5, y + 5, 6, 5, PAL.skyLight);
    c.rect(x + 5, y + 8, 6, 2, PAL.sageMid);
    c.px(x + 8, y + 6, PAL.sakuraMid);
    c.px(x + 9, y + 6, PAL.sakuraMid);
  }
  // (9, 0): Doorway sunlit threshold
  {
    const [x, y] = tile(9, 0);
    c.rect(x, y, 16, 16, PAL.woodLight);
    c.rect(x + 1, y + 2, 14, 12, PAL.stoneLight);
    c.rect(x + 2, y + 4, 12, 8, PAL.goldLight);
    c.rect(x, y + 14, 16, 2, PAL.woodDark);
  }
  // (10, 0): Peach welcome doormat
  {
    const [x, y] = tile(10, 0);
    drawWoodTile(c, x, y, 0);
    c.rect(x + 1, y + 3, 14, 10, PAL.outline);
    c.rect(x + 2, y + 4, 12, 8, PAL.peachMid);
    c.rect(x + 3, y + 5, 10, 6, PAL.peachLight);
    c.px(x + 7, y + 7, PAL.rose);
    c.px(x + 8, y + 7, PAL.rose);
    c.px(x + 7, y + 8, PAL.rose);
    c.px(x + 8, y + 8, PAL.rose);
  }
  // (11, 0): Void
  c.rect(...tile(11, 0), 16, 16, '#2d2226');

  // Row 1: Garden tiles
  drawGrassTile(c, ...tile(0, 1), 0);
  drawGrassTile(c, ...tile(1, 1), 1);
  drawGrassTile(c, ...tile(2, 1), 2);
  drawGrassTile(c, ...tile(3, 1), 3);
  drawGrassTile(c, ...tile(4, 1), 4);

  // (5, 1) & (6, 1): Cobblestone path
  for (let variant = 0; variant < 2; variant += 1) {
    const [x, y] = tile(5 + variant, 1);
    c.rect(x, y, 16, 16, PAL.stoneDark);
    c.rect(x + 1, y + 1, 6, 6, PAL.stoneLight);
    c.rect(x + 8, y + 1, 7, 5, PAL.stoneMid);
    c.rect(x + 1, y + 8, 8, 7, PAL.stoneMid);
    c.rect(x + 10, y + 7, 5, 8, PAL.stoneLight);
    if (variant === 1) {
      c.px(x + 4, y + 4, PAL.cream);
      c.px(x + 12, y + 11, PAL.sageLight);
    }
  }
  // (7, 1): Wooden porch deck
  {
    const [x, y] = tile(7, 1);
    c.rect(x, y, 16, 16, PAL.woodMid);
    for (let col = 0; col < 4; col += 1) {
      c.rect(x + col * 4, y, 3, 15, PAL.woodLight);
      c.rect(x + col * 4 + 3, y, 1, 16, PAL.woodDeep);
    }
    c.rect(x, y + 15, 16, 1, PAL.outline);
  }
  // (8, 1): Picket fence horizontal
  {
    const [x, y] = tile(8, 1);
    drawGrassTile(c, x, y, 0);
    c.rect(x, y + 6, 16, 2, PAL.woodLight);
    c.rect(x, y + 11, 16, 2, PAL.woodMid);
    for (const px of [1, 6, 11]) {
      c.rect(x + px, y + 2, 4, 13, PAL.outline);
      c.rect(x + px + 1, y + 3, 2, 11, PAL.cream);
      c.px(x + px + 1, y + 2, PAL.cream);
    }
  }
  // (9, 1): Picket fence corner post
  {
    const [x, y] = tile(9, 1);
    drawGrassTile(c, x, y, 1);
    c.rect(x + 4, y + 1, 8, 14, PAL.outline);
    c.rect(x + 5, y + 2, 6, 12, PAL.woodLight);
    c.rect(x + 5, y + 2, 6, 2, PAL.cream);
  }
  // (10, 1): Flowering garden hedge
  {
    const [x, y] = tile(10, 1);
    drawGrassTile(c, x, y, 0);
    c.circle(x + 8, y + 9, 6, PAL.outline);
    c.circle(x + 8, y + 8, 5, PAL.sageDark);
    c.circle(x + 7, y + 7, 4, PAL.sageMid);
    c.circle(x + 6, y + 6, 2, PAL.sageLight);
    c.px(x + 5, y + 6, PAL.sakuraLight);
    c.px(x + 10, y + 8, PAL.sakuraMid);
    c.px(x + 8, y + 5, PAL.cream);
  }
  // (11, 1): Flowerbed tulips
  {
    const [x, y] = tile(11, 1);
    drawGrassTile(c, x, y, 0);
    c.rect(x + 1, y + 2, 14, 12, PAL.woodDeep);
    c.rect(x + 2, y + 3, 12, 10, PAL.outline);
    for (const fx of [4, 8, 11]) {
      c.rect(x + fx, y + 7, 1, 4, PAL.sageLight);
      c.rect(x + fx - 1, y + 5, 3, 2, fx === 8 ? PAL.goldMid : PAL.sakuraMid);
    }
  }

  // Row 2: Cottage roof & front + Sakura tree
  // (0..2, 2): Roof Left, Mid, Right
  for (let i = 0; i < 3; i += 1) {
    const [x, y] = tile(i, 2);
    c.rect(x, y + 2, 16, 14, PAL.roofMid);
    c.rect(x, y + 2, 16, 3, PAL.roofLight);
    c.rect(x, y + 14, 16, 2, PAL.roofDark);
    for (let sx = 0; sx < 16; sx += 4) {
      c.rect(x + sx, y + 6, 3, 3, PAL.roofLight);
      c.rect(x + sx + 1, y + 10, 3, 3, PAL.roofDark);
    }
    if (i === 0) c.rect(x, y + 2, 2, 14, PAL.outline);
    if (i === 2) c.rect(x + 14, y + 2, 2, 14, PAL.outline);
  }
  // (3, 2): Cottage front left (window)
  {
    const [x, y] = tile(3, 2);
    c.rect(x, y, 16, 16, PAL.wallCream);
    c.rect(x, y, 16, 1, PAL.outline);
    c.rect(x + 1, y, 1, 16, PAL.woodDeep);
    c.rect(x + 4, y + 3, 8, 7, PAL.outline);
    c.rect(x + 5, y + 4, 6, 5, PAL.goldLight);
    c.rect(x, y + 13, 16, 3, PAL.wallBase);
  }
  // (4, 2): Cottage front door
  {
    const [x, y] = tile(4, 2);
    c.rect(x, y, 16, 16, PAL.wallCream);
    c.rect(x + 3, y + 2, 10, 14, PAL.outline);
    c.rect(x + 4, y + 3, 8, 13, PAL.woodMid);
    c.rect(x + 5, y + 4, 6, 4, PAL.goldLight);
    c.px(x + 10, y + 10, PAL.goldMid);
  }
  // (5, 2): Cottage front right (window + flower box)
  {
    const [x, y] = tile(5, 2);
    c.rect(x, y, 16, 16, PAL.wallCream);
    c.rect(x, y, 16, 1, PAL.outline);
    c.rect(x + 14, y, 1, 16, PAL.woodDeep);
    c.rect(x + 4, y + 3, 8, 6, PAL.outline);
    c.rect(x + 5, y + 4, 6, 4, PAL.skyLight);
    c.rect(x + 3, y + 10, 10, 3, PAL.woodDark);
    c.px(x + 5, y + 9, PAL.sakuraMid);
    c.px(x + 8, y + 9, PAL.goldMid);
    c.px(x + 10, y + 9, PAL.sakuraLight);
    c.rect(x, y + 13, 16, 3, PAL.wallBase);
  }

  // (6..9, 2): Sakura Tree 2x2 (canopy + trunk)
  {
    // Top-left & top-right canopy
    const [lx, ly] = tile(6, 2);
    const [rx, ry] = tile(7, 2);
    c.circle(lx + 11, ly + 11, 8, PAL.sakuraDark);
    c.circle(rx + 4, ry + 11, 8, PAL.sakuraDark);
    c.circle(lx + 12, ly + 9, 7, PAL.sakuraMid);
    c.circle(rx + 4, ry + 9, 7, PAL.sakuraMid);
    c.circle(lx + 11, ly + 7, 5, PAL.sakuraLight);
    c.circle(rx + 5, ry + 7, 5, PAL.sakuraLight);
  }
  {
    // Bottom-left & bottom-right trunk + lower canopy
    const [lx, ly] = tile(8, 2);
    const [rx, ry] = tile(9, 2);
    c.rect(lx + 12, ly + 5, 4, 10, PAL.woodDeep);
    c.rect(rx, ry + 5, 4, 10, PAL.woodDark);
    c.rect(lx + 11, ly + 13, 5, 2, PAL.outline);
    c.rect(rx, ry + 13, 5, 2, PAL.outline);
    c.circle(lx + 10, ly + 4, 6, PAL.sakuraDark);
    c.circle(rx + 5, ry + 4, 6, PAL.sakuraDark);
    c.circle(lx + 10, ly + 3, 5, PAL.sakuraMid);
    c.circle(rx + 5, ry + 3, 5, PAL.sakuraMid);
    c.circle(lx + 12, ly + 2, 3, PAL.sakuraLight);
  }

  c.save(path.join(OUT_STARTER, 'tileset-cozy.png'));
}

function buildFurnitureSheet() {
  const c = new PixelCanvas(256, 128);

  // 1. bed_cozy (0, 0, 32x32)
  {
    const x = 0;
    const y = 0;
    c.rect(x + 2, y + 3, 28, 27, PAL.shadow, 70);
    c.rect(x + 2, y + 2, 28, 26, PAL.outline);
    // headboard
    c.rect(x + 3, y + 3, 26, 7, PAL.woodMid);
    c.rect(x + 4, y + 4, 24, 2, PAL.woodLight);
    // pillows
    c.rect(x + 5, y + 9, 9, 5, PAL.cream);
    c.rect(x + 18, y + 9, 9, 5, PAL.cream);
    c.rect(x + 6, y + 10, 7, 3, PAL.peachLight);
    c.rect(x + 19, y + 10, 7, 3, PAL.peachLight);
    // quilt
    c.rect(x + 3, y + 14, 26, 12, PAL.rose);
    c.rect(x + 4, y + 15, 24, 3, PAL.peachLight);
    c.rect(x + 4, y + 18, 24, 7, PAL.peachMid);
    c.rect(x + 3, y + 25, 26, 2, PAL.woodDark);
  }

  // 2. wardrobe_oak (32, 0, 16x32)
  {
    const x = 32;
    const y = 0;
    c.rect(x + 1, y + 2, 14, 29, PAL.outline);
    c.rect(x + 2, y + 3, 12, 26, PAL.woodMid);
    c.rect(x + 2, y + 3, 12, 3, PAL.woodLight);
    c.rect(x + 3, y + 7, 4, 16, PAL.woodLight);
    c.rect(x + 9, y + 7, 4, 16, PAL.woodLight);
    c.rect(x + 7, y + 7, 2, 16, PAL.woodDark);
    c.px(x + 6, y + 14, PAL.goldMid);
    c.px(x + 9, y + 14, PAL.goldMid);
    c.rect(x + 3, y + 24, 10, 4, PAL.woodDark);
  }

  // 3. bookshelf_warm (48, 0, 16x32)
  {
    const x = 48;
    const y = 0;
    c.rect(x + 1, y + 2, 14, 29, PAL.outline);
    c.rect(x + 2, y + 3, 12, 27, PAL.woodDark);
    c.rect(x + 2, y + 3, 12, 2, PAL.woodLight);
    // 3 book shelves
    for (const sy of [6, 13, 20]) {
      c.rect(x + 3, sy, 10, 5, PAL.shadow);
      c.rect(x + 3, sy + 5, 10, 2, PAL.woodMid);
      c.rect(x + 3, sy + 1, 2, 4, PAL.rose);
      c.rect(x + 5, sy + 2, 2, 3, PAL.teal);
      c.rect(x + 7, sy + 1, 2, 4, PAL.goldMid);
      c.rect(x + 10, sy + 2, 2, 3, PAL.sakuraMid);
    }
  }

  // 4. lamp_floor (64, 0, 16x32)
  {
    const x = 64;
    const y = 0;
    c.rect(x + 4, y + 27, 8, 4, PAL.outline);
    c.rect(x + 5, y + 28, 6, 2, PAL.woodMid);
    c.rect(x + 7, y + 12, 2, 16, PAL.woodDark);
    // warm lampshade
    c.rect(x + 3, y + 3, 10, 9, PAL.outline);
    c.rect(x + 4, y + 4, 8, 7, PAL.goldLight);
    c.rect(x + 5, y + 5, 6, 4, PAL.cream);
    c.rect(x + 4, y + 10, 8, 1, PAL.goldMid);
  }

  // 5. sofa_cream (80, 0, 32x24)
  {
    const x = 80;
    const y = 0;
    c.rect(x + 1, y + 4, 30, 19, PAL.outline);
    c.rect(x + 2, y + 5, 28, 7, PAL.peachLight);
    c.rect(x + 2, y + 12, 28, 8, PAL.cream);
    // armrests
    c.rect(x + 2, y + 9, 4, 11, PAL.peachMid);
    c.rect(x + 26, y + 9, 4, 11, PAL.peachMid);
    // cushions
    c.rect(x + 7, y + 9, 5, 4, PAL.sakuraMid);
    c.rect(x + 20, y + 9, 5, 4, PAL.teal);
    c.rect(x + 3, y + 20, 4, 2, PAL.woodDeep);
    c.rect(x + 25, y + 20, 4, 2, PAL.woodDeep);
  }

  // 6. table_wood (112, 0, 32x24)
  {
    const x = 112;
    const y = 0;
    c.rect(x + 2, y + 6, 28, 11, PAL.outline);
    c.rect(x + 3, y + 7, 26, 9, PAL.woodLight);
    c.rect(x + 4, y + 8, 24, 7, PAL.woodMid);
    // runner & teacup
    c.rect(x + 12, y + 7, 8, 9, PAL.cream);
    c.rect(x + 14, y + 10, 4, 3, PAL.rose);
    // legs
    c.rect(x + 4, y + 17, 3, 6, PAL.woodDeep);
    c.rect(x + 25, y + 17, 3, 6, PAL.woodDeep);
  }

  // 7. desk_study (144, 0, 32x24)
  {
    const x = 144;
    const y = 0;
    c.rect(x + 2, y + 7, 28, 16, PAL.outline);
    c.rect(x + 3, y + 8, 26, 7, PAL.woodLight);
    c.rect(x + 3, y + 15, 7, 7, PAL.woodDark);
    c.rect(x + 22, y + 15, 7, 7, PAL.woodDark);
    // notebook + small lamp on desk
    c.rect(x + 12, y + 9, 8, 5, PAL.cream);
    c.rect(x + 13, y + 10, 6, 3, PAL.skyMid);
    c.rect(x + 5, y + 4, 4, 4, PAL.goldLight);
    c.rect(x + 6, y + 8, 2, 2, PAL.woodDeep);
  }

  // 8. bench_garden (176, 0, 32x24)
  {
    const x = 176;
    const y = 0;
    c.rect(x + 2, y + 5, 28, 16, PAL.outline);
    c.rect(x + 3, y + 6, 26, 5, PAL.woodMid);
    c.rect(x + 3, y + 12, 26, 5, PAL.woodLight);
    c.rect(x + 4, y + 17, 3, 5, PAL.woodDeep);
    c.rect(x + 25, y + 17, 3, 5, PAL.woodDeep);
  }

  // 9. rug_peach (0, 32, 32x32)
  {
    const x = 0;
    const y = 32;
    c.rect(x + 1, y + 2, 30, 28, PAL.roseDark);
    c.rect(x + 2, y + 3, 28, 26, PAL.peachMid);
    c.rect(x + 4, y + 5, 24, 22, PAL.peachLight);
    c.boxOutline(x + 6, y + 7, 20, 18, PAL.rose);
    // heart motif in center
    c.px(x + 14, y + 15, PAL.rose);
    c.px(x + 17, y + 15, PAL.rose);
    c.rect(x + 13, y + 16, 6, 2, PAL.rose);
    c.rect(x + 14, y + 18, 4, 1, PAL.rose);
    c.rect(x + 15, y + 19, 2, 1, PAL.rose);
  }

  // 10. plant_monstera (32, 32, 16x24)
  {
    const x = 32;
    const y = 32;
    c.circle(x + 8, y + 9, 6, PAL.outline);
    c.circle(x + 8, y + 9, 5, PAL.leafDark);
    c.circle(x + 6, y + 7, 3, PAL.leafLight);
    c.circle(x + 10, y + 8, 3, PAL.leafLight);
    c.rect(x + 4, y + 14, 8, 8, PAL.outline);
    c.rect(x + 5, y + 15, 6, 6, PAL.roofLight);
    c.rect(x + 4, y + 14, 8, 2, PAL.peachMid);
  }

  // 11. lantern_garden (48, 32, 16x24)
  {
    const x = 48;
    const y = 32;
    c.rect(x + 4, y + 2, 8, 20, PAL.outline);
    c.rect(x + 5, y + 3, 6, 3, PAL.stoneDark);
    c.rect(x + 5, y + 6, 6, 7, PAL.goldLight);
    c.rect(x + 6, y + 7, 4, 5, PAL.cream);
    c.rect(x + 5, y + 13, 6, 8, PAL.stoneMid);
  }

  // 12. flowerpot_sakura (64, 32, 16x24)
  {
    const x = 64;
    const y = 32;
    c.circle(x + 8, y + 8, 5, PAL.outline);
    c.circle(x + 8, y + 8, 4, PAL.sakuraMid);
    c.circle(x + 7, y + 6, 2, PAL.sakuraLight);
    c.px(x + 10, y + 9, PAL.sakuraLight);
    c.rect(x + 4, y + 13, 8, 9, PAL.outline);
    c.rect(x + 5, y + 14, 6, 7, PAL.woodMid);
    c.rect(x + 4, y + 13, 8, 2, PAL.woodLight);
  }

  c.save(path.join(OUT_STARTER, 'furniture-cozy.png'));
}

function makeTiledJson(name, width, height, layers) {
  return {
    compressionlevel: -1,
    height,
    infinite: false,
    layers,
    nextlayerid: layers.length + 1,
    nextobjectid: 1,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: 16,
    tilesets: [
      {
        columns: 16,
        firstgid: 1,
        image: '../starter/tileset-cozy.png',
        imageheight: 128,
        imagewidth: 256,
        margin: 0,
        name: 'tileset-cozy',
        spacing: 0,
        tilecount: 128,
        tileheight: 16,
        tilewidth: 16,
      },
    ],
    tilewidth: 16,
    type: 'map',
    version: '1.10',
    width,
    properties: [{ name: 'mapId', type: 'string', value: name }],
  };
}

function buildHomeMap() {
  const w = 16;
  const h = 12;
  const ground = new Array(w * h).fill(0);
  const walls = new Array(w * h).fill(0);
  const decor = new Array(w * h).fill(0);
  const idx = (x, y) => y * w + x;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (y === 0) {
        walls[idx(x, y)] = 6;
      } else if (y === 1) {
        if (x === 0 || x === 15) walls[idx(x, y)] = 7;
        else if (x === 3 || x === 7 || x === 12) walls[idx(x, y)] = 8;
        else if (x === 10) walls[idx(x, y)] = 9;
        else walls[idx(x, y)] = 4;
      } else if (y === 2) {
        walls[idx(x, y)] = x === 0 || x === 15 ? 7 : 5;
      } else if (y === 11) {
        if (x === 7 || x === 8) {
          ground[idx(x, y)] = 10;
        } else {
          walls[idx(x, y)] = 6;
        }
      } else if (x === 0 || x === 15) {
        walls[idx(x, y)] = 7;
      } else {
        ground[idx(x, y)] = 1 + ((x * 3 + y) % 3);
      }
    }
  }

  // Welcome doormat inside front door
  decor[idx(7, 10)] = 11;
  decor[idx(8, 10)] = 11;

  const map = makeTiledJson('home', w, h, [
    { id: 1, name: 'Ground', type: 'tilelayer', data: ground, height: h, width: w, opacity: 1, visible: true, x: 0, y: 0 },
    { id: 2, name: 'Walls', type: 'tilelayer', data: walls, height: h, width: w, opacity: 1, visible: true, x: 0, y: 0 },
    { id: 3, name: 'Decor', type: 'tilelayer', data: decor, height: h, width: w, opacity: 1, visible: true, x: 0, y: 0 },
  ]);

  fs.writeFileSync(path.join(OUT_MAPS, 'home.json'), JSON.stringify(map, null, 2));
}

function buildGardenMap() {
  const w = 18;
  const h = 14;
  const ground = new Array(w * h).fill(0);
  const walls = new Array(w * h).fill(0);
  const decor = new Array(w * h).fill(0);
  const idx = (x, y) => y * w + x;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      // Lush meadow base everywhere
      const gVariant = (x * 7 + y * 13) % 11 === 0 ? 20 : (x + y) % 5 === 0 ? 21 : 17 + ((x + y * 2) % 3);
      ground[idx(x, y)] = gVariant;

      // Perimeter fence & hedges
      if (y === 0 || y === 13) {
        walls[idx(x, y)] = x === 0 || x === 17 ? 26 : x % 4 === 0 ? 27 : 25;
      } else if (x === 0 || x === 17) {
        walls[idx(x, y)] = y % 3 === 0 ? 27 : 26;
      }
    }
  }

  // Cottage exterior (rows 1..2, cols 7..9)
  walls[idx(7, 1)] = 33;
  walls[idx(8, 1)] = 34;
  walls[idx(9, 1)] = 35;
  walls[idx(7, 2)] = 36;
  ground[idx(8, 2)] = 37; // Cottage door portal tile
  walls[idx(9, 2)] = 38;

  // Wooden porch landing & cobblestone path
  for (const px of [7, 8, 9]) {
    ground[idx(px, 3)] = 24;
  }
  for (let py = 4; py <= 10; py += 1) {
    ground[idx(8, py)] = py % 2 === 0 ? 22 : 23;
    ground[idx(9, py)] = py % 2 === 1 ? 22 : 23;
  }

  // Left & Right Sakura trees (2x2)
  decor[idx(2, 2)] = 39;
  decor[idx(3, 2)] = 40;
  walls[idx(2, 3)] = 41;
  walls[idx(3, 3)] = 42;

  decor[idx(14, 2)] = 39;
  decor[idx(15, 2)] = 40;
  walls[idx(14, 3)] = 41;
  walls[idx(15, 3)] = 42;

  // Flowerbeds in lower corners (decorative non-blocking or interior border)
  decor[idx(2, 11)] = 28;
  decor[idx(3, 11)] = 28;
  decor[idx(14, 11)] = 28;
  decor[idx(15, 11)] = 28;

  const map = makeTiledJson('garden', w, h, [
    { id: 1, name: 'Ground', type: 'tilelayer', data: ground, height: h, width: w, opacity: 1, visible: true, x: 0, y: 0 },
    { id: 2, name: 'Walls', type: 'tilelayer', data: walls, height: h, width: w, opacity: 1, visible: true, x: 0, y: 0 },
    { id: 3, name: 'Decor', type: 'tilelayer', data: decor, height: h, width: w, opacity: 1, visible: true, x: 0, y: 0 },
  ]);

  fs.writeFileSync(path.join(OUT_MAPS, 'garden.json'), JSON.stringify(map, null, 2));
}

function buildPwaIcons() {
  // Draw crisp 16x16 cottage icon and upscale nearest-neighbor to 32, 180, 192, 512
  const base = new PixelCanvas(16, 16);
  base.rect(0, 0, 16, 16, '#2d2226');
  base.rect(1, 1, 14, 14, '#fff2e2');
  // sky & meadow
  base.rect(2, 2, 12, 9, '#d6eefb');
  base.rect(2, 11, 12, 3, '#84b874');
  // cottage roof
  for (let i = 0; i < 4; i += 1) {
    base.rect(4 - i, 7 - (3 - i), 8 + i * 2, 1, i === 0 ? '#dc7862' : '#bd5c49');
  }
  base.rect(3, 7, 10, 1, '#8f3f31');
  // cottage body & warm door
  base.rect(4, 8, 8, 5, '#faeedc');
  base.rect(7, 9, 2, 4, '#b07d56');
  base.px(5, 9, '#ffe796');
  base.px(10, 9, '#ffe796');
  // tiny heart above roof
  base.px(7, 2, '#e07a6f');
  base.px(9, 2, '#e07a6f');
  base.rect(7, 3, 3, 1, '#e07a6f');
  base.px(8, 4, '#e07a6f');

  const scaleAndSave = (size, filename) => {
    const out = new PixelCanvas(size, size);
    const scale = size / 16;
    for (let y = 0; y < size; y += 1) {
      const sy = Math.min(15, Math.floor(y / scale));
      for (let x = 0; x < size; x += 1) {
        const sx = Math.min(15, Math.floor(x / scale));
        const sIdx = (sy * 16 + sx) * 4;
        const dIdx = (y * size + x) * 4;
        out.buf[dIdx] = base.buf[sIdx];
        out.buf[dIdx + 1] = base.buf[sIdx + 1];
        out.buf[dIdx + 2] = base.buf[sIdx + 2];
        out.buf[dIdx + 3] = base.buf[sIdx + 3];
      }
    }
    out.save(path.join(OUT_ICONS, filename));
  };

  scaleAndSave(32, 'favicon-32x32.png');
  scaleAndSave(180, 'apple-touch-icon-180x180.png');
  scaleAndSave(192, 'pwa-192x192.png');
  scaleAndSave(512, 'pwa-512x512.png');
}

function writeManifest() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/generate-starter-assets.mjs',
    tileSizePx: 16,
    perspective: '3/4 top-down RPG',
    assets: [
      {
        path: 'public/assets/starter/tileset-cozy.png',
        role: 'Starter home & garden 16x16 tileset',
        author: 'Our Little World (Procedural Starter)',
        license: 'CC0-1.0',
        attributionRequired: false,
        redistributable: true,
        replaceable: true,
      },
      {
        path: 'public/assets/starter/furniture-cozy.png',
        role: 'Starter 12-item interior & garden furniture sprite sheet',
        author: 'Our Little World (Procedural Starter)',
        license: 'CC0-1.0',
        attributionRequired: false,
        redistributable: true,
        replaceable: true,
      },
      {
        path: 'public/assets/maps/home.json',
        role: 'Home room Tiled JSON map (16x12 tiles)',
        author: 'Our Little World',
        license: 'CC0-1.0',
        attributionRequired: false,
        redistributable: true,
        replaceable: true,
      },
      {
        path: 'public/assets/maps/garden.json',
        role: 'Garden Tiled JSON map (18x14 tiles)',
        author: 'Our Little World',
        license: 'CC0-1.0',
        attributionRequired: false,
        redistributable: true,
        replaceable: true,
      },
      {
        path: 'public/icons/*',
        role: 'PWA & iOS Safari icons',
        author: 'Our Little World',
        license: 'CC0-1.0',
        attributionRequired: false,
        redistributable: true,
        replaceable: true,
      },
    ],
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

buildTileset();
buildFurnitureSheet();
buildHomeMap();
buildGardenMap();
buildPwaIcons();
writeManifest();
console.log('Generated starter pixel art assets, Tiled maps, PWA icons, and manifest.json.');
