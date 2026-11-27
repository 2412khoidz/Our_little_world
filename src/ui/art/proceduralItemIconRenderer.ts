/**
 * Procedural 16x16 crisp pixel-art item icon painter & dataURL memoizer.
 * Pixel grid & outline algorithm adapted from `fernforge-arcade/greens`
 * (src/engine/pixel.js & src/engine/spritegen.js @ 3f32fd8, SPDX-License-Identifier: MIT).
 */
import type { ProceduralIconSpec } from '../../shared/art/donorProceduralIconSpec';

function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n | 0;
}

export function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const factor = 1 + amount;
  const nr = clampByte(amount >= 0 ? r + (255 - r) * amount : r * factor);
  const ng = clampByte(amount >= 0 ? g + (255 - g) * amount : g * factor);
  const nb = clampByte(amount >= 0 ? b + (255 - b) * amount : b * factor);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/** Tiny RGBA pixel buffer ported from Greens `Px` class (pure canvas bitmap manipulation). */
export class PixelGridCanvas {
  readonly w: number;
  readonly h: number;
  readonly el: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly img: ImageData;

  constructor(w = 16, h = 16) {
    this.w = w;
    this.h = h;
    this.el = document.createElement('canvas');
    this.el.width = w;
    this.el.height = h;
    const ctx = this.el.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.ctx = ctx;
    this.img = ctx.createImageData(w, h);
  }

  private parseHex(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);
    return [
      parseInt(full.slice(0, 2), 16) || 0,
      parseInt(full.slice(2, 4), 16) || 0,
      parseInt(full.slice(4, 6), 16) || 0,
    ];
  }

  set(x: number, y: number, hex: string, alpha = 255): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const [r, g, b] = this.parseHex(hex);
    const idx = (iy * this.w + ix) * 4;
    this.img.data[idx] = r;
    this.img.data[idx + 1] = g;
    this.img.data[idx + 2] = b;
    this.img.data[idx + 3] = alpha;
  }

  rect(x: number, y: number, w: number, h: number, hex: string): void {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) {
        this.set(x + dx, y + dy, hex);
      }
    }
  }

  hline(x: number, y: number, w: number, hex: string): void {
    this.rect(x, y, w, 1, hex);
  }

  vline(x: number, y: number, h: number, hex: string): void {
    this.rect(x, y, 1, h, hex);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, hex: string): void {
    const arx = Math.max(1, rx);
    const ary = Math.max(1, ry);
    for (let y = Math.floor(cy - ary); y <= Math.ceil(cy + ary); y += 1) {
      for (let x = Math.floor(cx - arx); x <= Math.ceil(cx + arx); x += 1) {
        const dx = (x - cx) / arx;
        const dy = (y - cy) / ary;
        if (dx * dx + dy * dy <= 1.05) {
          this.set(x, y, hex);
        }
      }
    }
  }

  circle(cx: number, cy: number, r: number, hex: string): void {
    this.ellipse(cx, cy, r, r, hex);
  }

  line(x0: number, y0: number, x1: number, y1: number, hex: string): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      this.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, hex);
    }
  }

  outline(hex = '#222b1e'): void {
    const d = this.img.data;
    const copy = new Uint8ClampedArray(d);
    const [r, g, b] = this.parseHex(hex);
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        const idx = (y * this.w + x) * 4;
        if ((copy[idx + 3] ?? 0) > 0) continue;
        const neighborOpaque =
          (x > 0 && (copy[(y * this.w + x - 1) * 4 + 3] ?? 0) > 0) ||
          (x + 1 < this.w && (copy[(y * this.w + x + 1) * 4 + 3] ?? 0) > 0) ||
          (y > 0 && (copy[((y - 1) * this.w + x) * 4 + 3] ?? 0) > 0) ||
          (y + 1 < this.h && (copy[((y + 1) * this.w + x) * 4 + 3] ?? 0) > 0);
        if (neighborOpaque) {
          d[idx] = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
          d[idx + 3] = 255;
        }
      }
    }
  }

  toDataUrl(): string {
    this.ctx.putImageData(this.img, 0, 0);
    return this.el.toDataURL('image/png');
  }
}

export function drawProceduralItemSpec(p: PixelGridCanvas, spec: ProceduralIconSpec): void {
  const c1 = spec.primary;
  const c2 = spec.secondary ?? shadeHex(c1, -0.2);
  const c3 = spec.accent ?? shadeHex(c1, 0.25);

  switch (spec.shape) {
    case 'seed_packet': {
      p.rect(3, 2, 10, 12, '#efe2c2');
      p.hline(3, 2, 10, '#cbb48a');
      p.rect(4, 4, 8, 7, c1);
      p.circle(8, 8, 2, c2);
      p.set(7, 7, c3);
      break;
    }
    case 'leafy':
    case 'herb_bundle': {
      p.ellipse(8, 9, 4, 4, c1);
      p.ellipse(6, 7, 3, 2, c2);
      p.ellipse(10, 7, 3, 2, c2);
      p.vline(8, 10, 4, shadeHex(c2, -0.25));
      p.hline(7, 13, 2, '#9c6b3b');
      break;
    }
    case 'head': {
      p.circle(8, 9, 5, c2);
      p.circle(8, 8, 4, c1);
      p.set(6, 6, c3);
      p.set(7, 6, c3);
      break;
    }
    case 'root': {
      p.ellipse(8, 10, 3, 4, c1);
      p.vline(8, 13, 2, shadeHex(c1, -0.2));
      p.line(8, 6, 5, 3, c2);
      p.line(8, 6, 8, 2, c2);
      p.line(8, 6, 11, 3, c2);
      break;
    }
    case 'vine': {
      p.vline(5, 3, 10, c2);
      p.ellipse(9, 6, 3, 2, c1);
      p.ellipse(9, 10, 3, 2, c1);
      p.set(8, 5, c3);
      break;
    }
    case 'stalk': {
      p.rect(6, 4, 4, 9, c1);
      p.vline(6, 4, 9, c2);
      p.set(7, 3, c3);
      p.set(9, 3, c3);
      break;
    }
    case 'berry': {
      p.circle(6, 10, 3, c1);
      p.circle(10, 10, 3, c1);
      p.circle(8, 7, 3, shadeHex(c1, 0.1));
      p.hline(6, 4, 4, c2);
      p.set(7, 9, c3);
      break;
    }
    case 'round_fruit': {
      p.circle(8, 9, 5, c1);
      p.set(6, 6, c3);
      p.set(7, 6, c3);
      p.vline(8, 2, 3, '#6b4a2a');
      p.rect(9, 3, 3, 2, c2);
      break;
    }
    case 'orchard_sapling': {
      p.rect(7, 8, 2, 6, '#7a5230');
      p.circle(8, 6, 4, c2);
      p.set(6, 5, c1);
      p.set(10, 6, c1);
      p.hline(6, 13, 4, '#5a3b21');
      break;
    }
    case 'flower': {
      p.vline(8, 8, 6, c3);
      p.hline(6, 11, 2, c3);
      p.circle(8, 6, 3, c1);
      p.set(8, 6, c2);
      p.set(5, 6, c1);
      p.set(11, 6, c1);
      p.set(8, 3, c1);
      break;
    }
    case 'bouquet': {
      p.circle(6, 5, 2, c1);
      p.circle(10, 5, 2, c2);
      p.circle(8, 7, 2, c3);
      p.rect(5, 8, 6, 4, '#f0e2c8');
      p.hline(6, 10, 4, '#e0527a');
      p.rect(7, 12, 2, 2, '#5aa644');
      break;
    }
    case 'animal_egg': {
      p.ellipse(8, 9, 4, 5, c1);
      p.ellipse(8, 11, 3, 3, c2);
      p.set(6, 6, '#ffffff');
      break;
    }
    case 'animal_milk': {
      p.rect(5, 5, 6, 9, c1);
      p.rect(6, 3, 4, 2, c2);
      p.rect(5, 8, 6, 3, c2);
      break;
    }
    case 'animal_wool': {
      p.circle(6, 8, 3, c1);
      p.circle(10, 8, 3, c1);
      p.circle(8, 6, 3, c1);
      p.circle(8, 10, 3, c2);
      break;
    }
    case 'animal_honey': {
      p.rect(4, 6, 8, 8, c1);
      p.rect(5, 4, 6, 2, '#7a5230');
      p.hline(5, 8, 6, c2);
      p.set(6, 7, '#ffffff');
      break;
    }
    case 'animal_feather': {
      p.line(4, 13, 12, 3, '#f5f0e0');
      p.ellipse(9, 6, 3, 4, c1);
      p.set(10, 5, c2);
      break;
    }
    case 'animal_feed':
    case 'fertilizer': {
      p.rect(4, 4, 8, 10, c1);
      p.hline(5, 3, 6, shadeHex(c1, -0.25));
      p.circle(8, 9, 2, c2);
      p.set(8, 9, c3);
      break;
    }
    case 'sprinkler': {
      p.rect(6, 6, 4, 7, c1);
      p.rect(4, 5, 8, 2, c1);
      p.set(3, 3, c2);
      p.set(12, 3, c2);
      p.set(2, 6, c2);
      p.set(13, 6, c2);
      break;
    }
    case 'tool_can': {
      p.rect(5, 6, 7, 7, c1);
      p.hline(4, 4, 4, c2);
      p.line(2, 6, 5, 9, c1);
      p.set(2, 5, '#5ec8f2');
      p.rect(12, 7, 2, 4, c2);
      break;
    }
    case 'tool_hoe': {
      p.line(4, 12, 11, 5, c2);
      p.rect(9, 3, 4, 3, c1);
      break;
    }
    case 'tool_sickle': {
      p.line(4, 12, 7, 9, c2);
      p.ellipse(9, 6, 4, 3, c1);
      p.rect(6, 5, 3, 4, 'transparent');
      p.line(7, 9, 12, 5, c1);
      break;
    }
    case 'tool_basket': {
      p.rect(3, 7, 10, 6, c1);
      p.hline(4, 9, 8, c2);
      p.hline(5, 4, 6, c2);
      p.vline(5, 4, 3, c2);
      p.vline(10, 4, 3, c2);
      break;
    }
    case 'flour_sack': {
      p.rect(4, 4, 8, 10, c1);
      p.hline(5, 3, 6, c2);
      p.rect(5, 7, 6, 3, c2);
      p.set(7, 8, c3);
      break;
    }
    case 'bread_loaf': {
      p.ellipse(8, 9, 5, 4, c1);
      p.hline(5, 11, 6, c2);
      p.set(6, 7, '#fff2d0');
      p.set(9, 7, '#fff2d0');
      break;
    }
    case 'pie_slice': {
      p.rect(4, 7, 8, 6, c2);
      p.ellipse(8, 7, 5, 3, c1);
      p.set(8, 5, c3);
      break;
    }
    case 'jam_jar': {
      p.rect(5, 5, 6, 9, c1);
      p.rect(5, 3, 6, 2, '#d8c298');
      p.rect(6, 8, 4, 3, c2);
      break;
    }
    case 'cheese_wheel': {
      p.ellipse(8, 9, 5, 4, c1);
      p.set(6, 8, c2);
      p.set(10, 10, c2);
      break;
    }
    case 'butter_bar': {
      p.rect(3, 7, 10, 5, c1);
      p.hline(3, 11, 10, c2);
      break;
    }
    case 'yarn_spool': {
      p.circle(8, 8, 5, c1);
      p.line(5, 6, 11, 10, c2);
      p.line(5, 10, 11, 6, c2);
      break;
    }
    case 'cloth_bolt': {
      p.rect(3, 5, 10, 7, c1);
      p.hline(3, 8, 10, c2);
      p.vline(12, 5, 7, c2);
      break;
    }
    case 'candle': {
      p.rect(6, 6, 4, 8, c1);
      p.set(8, 4, '#ffd54f');
      p.set(8, 3, '#ff8a24');
      break;
    }
    case 'soap_bar': {
      p.rect(4, 6, 8, 6, c1);
      p.hline(5, 7, 6, '#ffffff');
      p.circle(11, 4, 1, '#d8f4ff');
      break;
    }
    case 'bowl_soup': {
      p.ellipse(8, 10, 5, 3, '#e8e4dc');
      p.ellipse(8, 8, 4, 2, c1);
      p.set(7, 8, c2);
      p.set(8, 4, '#ffffff');
      break;
    }
    case 'platter': {
      p.ellipse(8, 9, 6, 4, '#d8dee8');
      p.ellipse(8, 9, 4, 2, c1);
      p.set(7, 8, c2);
      p.set(10, 9, c3);
      break;
    }
    case 'cup_drink': {
      p.rect(5, 5, 6, 8, c1);
      p.hline(5, 5, 6, c2);
      p.rect(11, 7, 2, 4, c2);
      break;
    }
    case 'bottle_oil': {
      p.rect(5, 6, 6, 8, c1);
      p.rect(7, 3, 2, 3, c2);
      p.hline(6, 9, 4, c3);
      break;
    }
    case 'chocolate_bar': {
      p.rect(4, 5, 8, 8, c1);
      p.rect(4, 10, 8, 3, c2);
      p.hline(5, 7, 6, shadeHex(c1, 0.2));
      break;
    }
    case 'gift_box': {
      p.rect(4, 5, 8, 8, c1);
      p.hline(4, 8, 8, c2);
      p.vline(8, 5, 8, c2);
      p.hline(6, 3, 4, c3);
      break;
    }
    case 'fish': {
      p.ellipse(7, 8, 4, 3, c1);
      p.rect(11, 6, 3, 4, c2);
      p.set(5, 7, '#1d2738');
      p.set(8, 8, c3);
      break;
    }
  }
}

const DATA_URL_CACHE = new Map<string, string>();

export function renderProceduralItemIconDataUrl(
  sku: string,
  spec: ProceduralIconSpec,
): string | null {
  const key = `${sku}:${spec.shape}:${spec.primary}:${spec.secondary ?? ''}:${spec.accent ?? ''}`;
  const cached = DATA_URL_CACHE.get(key);
  if (cached) return cached;

  if (typeof document === 'undefined') {
    return null;
  }

  try {
    const grid = new PixelGridCanvas(16, 16);
    drawProceduralItemSpec(grid, spec);
    grid.outline('#1f2b1c');
    const url = grid.toDataUrl();
    DATA_URL_CACHE.set(key, url);
    return url;
  } catch {
    return null;
  }
}
