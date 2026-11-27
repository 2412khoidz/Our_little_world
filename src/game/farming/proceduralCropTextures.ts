/**
 * Procedural Phaser CanvasTexture generator for all 40 field crops + 20 flowers +
 * 3 sprinklers + 4 fertilizers.
 *
 * Adapted directly from `fernforge-arcade/greens` (`src/engine/pixel.js` &
 * `src/engine/spritegen.js` genCrop @ 3f32fd8, SPDX-License-Identifier: MIT).
 * Textures are built lazily once per crop SKU+stage inside Phaser TextureManager —
 * zero pre-baked public PNG bloat, zero per-frame allocations.
 */
import Phaser from 'phaser';
import {
  getDeepCropDefinition,
  type CropVisualPalette,
  type FertilizerSku,
  type SprinklerSku,
} from '../../shared/farming/deepCropSimulation';

export function proceduralCropStageTextureKey(
  cropSku: string,
  stage: number,
  ready: boolean,
): string {
  const s = ready ? 3 : Math.max(0, Math.min(3, stage));
  return `olw-proc-crop-${cropSku}-s${s}`;
}

export function proceduralSprinklerTextureKey(sku: SprinklerSku): string {
  return `olw-proc-${sku}`;
}

export function proceduralFertilizerTextureKey(sku: FertilizerSku): string {
  return `olw-proc-badge-${sku}`;
}

function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n | 0;
}

function shade(hex: string, amount: number): string {
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

class TexturePx {
  private readonly img: ImageData;

  constructor(
    private readonly w: number,
    private readonly h: number,
    private readonly ctx: CanvasRenderingContext2D,
  ) {
    this.img = ctx.createImageData(w, h);
  }

  private rgb(hex: string): [number, number, number] {
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

  set(x: number, y: number, hex: string): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const [r, g, b] = this.rgb(hex);
    const idx = (iy * this.w + ix) * 4;
    this.img.data[idx] = r;
    this.img.data[idx + 1] = g;
    this.img.data[idx + 2] = b;
    this.img.data[idx + 3] = 255;
  }

  rect(x: number, y: number, w: number, h: number, hex: string): void {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) this.set(x + dx, y + dy, hex);
    }
  }

  vline(x: number, y: number, h: number, hex: string): void {
    this.rect(x, y, 1, h, hex);
  }

  hline(x: number, y: number, w: number, hex: string): void {
    this.rect(x, y, w, 1, hex);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, hex: string): void {
    const arx = Math.max(1, rx);
    const ary = Math.max(1, ry);
    for (let y = Math.floor(cy - ary); y <= Math.ceil(cy + ary); y += 1) {
      for (let x = Math.floor(cx - arx); x <= Math.ceil(cx + arx); x += 1) {
        const dx = (x - cx) / arx;
        const dy = (y - cy) / ary;
        if (dx * dx + dy * dy <= 1.05) this.set(x, y, hex);
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

  outline(hex = '#23381c'): void {
    const d = this.img.data;
    const copy = new Uint8ClampedArray(d);
    const [r, g, b] = this.rgb(hex);
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        const idx = (y * this.w + x) * 4;
        if ((copy[idx + 3] ?? 0) > 0) continue;
        const n =
          (x > 0 && (copy[(y * this.w + x - 1) * 4 + 3] ?? 0) > 0) ||
          (x + 1 < this.w && (copy[(y * this.w + x + 1) * 4 + 3] ?? 0) > 0) ||
          (y > 0 && (copy[((y - 1) * this.w + x) * 4 + 3] ?? 0) > 0) ||
          (y + 1 < this.h && (copy[((y + 1) * this.w + x) * 4 + 3] ?? 0) > 0);
        if (n) {
          d[idx] = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
          d[idx + 3] = 255;
        }
      }
    }
  }

  flush(): void {
    this.ctx.putImageData(this.img, 0, 0);
  }
}

function drawCropStage(p: TexturePx, pal: CropVisualPalette, stage: number): void {
  const stages = 4;
  const s = Math.max(0, Math.min(stages - 1, stage));
  const t = s / (stages - 1);
  const stem = pal.stem || '#3c7a2e';

  if (s === 0) {
    p.set(8, 18, '#5a3b21');
    p.vline(8, 15, 3, stem);
    p.set(7, 15, pal.leaf);
    p.set(9, 15, pal.leaf);
    return;
  }

  const h = Math.round(2 + t * 11);
  const baseY = 19;
  p.rect(7, baseY - h, 2, h, stem);
  p.vline(7, baseY - h, h, shade(stem, -0.2));
  const top = baseY - h;

  if (pal.kind === 'leafy' || pal.kind === 'head') {
    const lr = 1 + Math.round(t * 4);
    p.ellipse(8, top + lr, lr + 1, lr, pal.leaf);
    p.ellipse(8, top + lr, lr, Math.max(1, lr - 1), pal.leaf2);
    if (s >= stages - 1 && (pal.heart || pal.fruit)) {
      p.ellipse(8, top + lr, 2, 2, pal.fruit || '#dff0a0');
    }
  } else if (pal.kind === 'root') {
    for (let i = 0; i < 4 + s * 2; i += 1) {
      const a = (i / (4 + s * 2)) * Math.PI - Math.PI;
      p.line(8, top, 8 + Math.cos(a) * (2 + t * 3), top - Math.abs(Math.sin(a)) * (2 + t * 4), pal.leaf);
    }
    if (s >= stages - 1) {
      p.ellipse(8, baseY - 2, 3, 2, pal.fruit || '#d2691e');
    }
  } else if (pal.kind === 'fruit' || pal.kind === 'vine') {
    for (let y = top + 1; y < baseY - 1; y += 3) {
      p.line(7, y, 4, y - 1, pal.leaf);
      p.line(9, y, 11, y - 1, pal.leaf);
    }
    p.ellipse(8, top, 2, 2, pal.leaf2);
    if (s >= stages - 2 && pal.fruit) {
      const fy = baseY - 4;
      const r = s >= stages - 1 ? 2 : 1;
      p.circle(6, fy, r, pal.fruit);
      p.circle(10, fy + 1, r, pal.fruit);
      if (pal.fruit2) {
        p.set(6, fy - 1, pal.fruit2);
        p.set(10, fy, pal.fruit2);
      }
    }
  } else if (pal.kind === 'flower') {
    for (let y = top + 1; y < baseY - 1; y += 4) {
      p.line(7, y, 5, y - 1, pal.leaf);
      p.line(9, y, 11, y - 1, pal.leaf);
    }
    if (s >= stages - 2) {
      const petals = pal.fruit || '#f48fb1';
      p.set(8, top - 2, petals);
      p.set(8, top + 2, petals);
      p.set(6, top, petals);
      p.set(10, top, petals);
      p.set(7, top - 1, petals);
      p.set(9, top - 1, petals);
      p.set(7, top + 1, petals);
      p.set(9, top + 1, petals);
      p.set(8, top, pal.fruit2 || '#ffe46b');
    }
  } else if (pal.kind === 'stalk') {
    p.rect(7, top, 2, h, stem);
    for (let y = top; y < baseY; y += 2) {
      p.set(6, y, pal.leaf);
      p.set(9, y, pal.leaf);
    }
    if (s >= stages - 1) {
      p.rect(6, Math.max(1, top - 1), 4, 4, pal.fruit || pal.leaf2);
      p.set(7, Math.max(1, top), pal.fruit2 || '#ffe46b');
    }
  }
}

export function ensureProceduralCropTexture(
  scene: Phaser.Scene,
  cropSku: string,
  stage: number,
  ready: boolean,
): string | null {
  const key = proceduralCropStageTextureKey(cropSku, stage, ready);
  if (scene.textures.exists(key)) return key;
  const def = getDeepCropDefinition(cropSku);
  if (!def) return null;

  const canvasTex = scene.textures.createCanvas(key, 16, 20);
  if (!canvasTex) return null;
  const ctx = canvasTex.getContext();
  const px = new TexturePx(16, 20, ctx);
  drawCropStage(px, def.palette, ready ? 3 : stage);
  px.outline('#23381c');
  px.flush();
  canvasTex.refresh();
  return key;
}

export function ensureSprinklerTexture(scene: Phaser.Scene, sku: SprinklerSku): string | null {
  const key = proceduralSprinklerTextureKey(sku);
  if (scene.textures.exists(key)) return key;
  const canvasTex = scene.textures.createCanvas(key, 16, 16);
  if (!canvasTex) return null;
  const px = new TexturePx(16, 16, canvasTex.getContext());
  const body =
    sku === 'sprinkler_iridium' ? '#7e57c2' : sku === 'sprinkler_quality' ? '#b0bec5' : '#c87542';
  px.rect(6, 7, 4, 7, body);
  px.rect(4, 6, 8, 2, shade(body, 0.2));
  px.set(3, 4, '#5ec8f2');
  px.set(12, 4, '#5ec8f2');
  px.set(2, 6, '#5ec8f2');
  px.set(13, 6, '#5ec8f2');
  px.outline('#1e2836');
  px.flush();
  canvasTex.refresh();
  return key;
}

export function ensureFertilizerBadgeTexture(
  scene: Phaser.Scene,
  sku: FertilizerSku,
): string | null {
  const key = proceduralFertilizerTextureKey(sku);
  if (scene.textures.exists(key)) return key;
  const canvasTex = scene.textures.createCanvas(key, 8, 8);
  if (!canvasTex) return null;
  const px = new TexturePx(8, 8, canvasTex.getContext());
  const color =
    sku === 'fert_deluxe'
      ? '#b388ff'
      : sku === 'fert_quality'
        ? '#ffd54f'
        : sku === 'fert_speed'
          ? '#4db6ac'
          : '#8d6e63';
  px.set(2, 5, color);
  px.set(5, 4, color);
  px.set(4, 6, color);
  px.set(3, 3, shade(color, 0.25));
  px.flush();
  canvasTex.refresh();
  return key;
}
