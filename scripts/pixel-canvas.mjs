import fs from 'node:fs';
import zlib from 'node:zlib';

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

export function encodePng(width, height, rgba) {
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

export class PixelCanvas {
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
