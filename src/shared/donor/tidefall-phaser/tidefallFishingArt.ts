/** Donor sprite paths (MIT) — stateloop-connected/source-tidefall-phaser @ 6a77169 */

export const TIDEFALL_FISHING_ART = {
  beachTileset: '/assets/donor/tidefall-phaser/sprites/tileset/beach_tile_set.png',
  farmTerrain: '/assets/donor/tidefall-phaser/sprites/terrain/farm_terrain_correct.png',
  fishingUi: '/assets/donor/tidefall-phaser/sprites/ui/fishing_ui_1_all_sprites.png',
  bobberFloat: '/assets/donor/tidefall-phaser/sprites/animations/bobber/boober_red_floating_animation.png',
  bobberBite: '/assets/donor/tidefall-phaser/sprites/animations/bobber_bite/bobber_fish_bitting_animation.png',
  waterRipple: '/assets/donor/tidefall-phaser/sprites/animations/water_ripples_animation.png',
  fishShadow: '/assets/donor/tidefall-phaser/sprites/animations/fish_shadow_swim_animations/small_fish/animation.png',
} as const;

/** Spritesheet slices from `fishing_ui_1_all_sprites.png` (320×208). */
export const TIDEFALL_UI_SLICES = {
  panelNine: { x: 48, y: 16, w: 32, h: 16, margin: 8 },
  barTrack: { x: 8, y: 116, w: 112, h: 10 },
  barFill: { x: 8, y: 118, w: 112, h: 6 },
  marker: { x: 8, y: 52, w: 14, h: 14 },
} as const;

const TILE = 16;
const BOBBER_FRAME_W = 16;
const BOBBER_FLOAT_FRAMES = 6;
const RIPPLE_FRAMES = 6;
const SHADOW_FRAMES = 4;

export interface TidefallFishingArtBundle {
  readonly beach: HTMLImageElement;
  readonly farm: HTMLImageElement;
  readonly ui: HTMLImageElement;
  readonly bobberFloat: HTMLImageElement;
  readonly bobberBite: HTMLImageElement;
  readonly ripple: HTMLImageElement;
  readonly fishShadow: HTMLImageElement;
}

let loadPromise: Promise<TidefallFishingArtBundle> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Không tải được ảnh câu cá: ${src}`));
    img.src = src;
  });
}

export function loadTidefallFishingArt(): Promise<TidefallFishingArtBundle> {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    loadImage(TIDEFALL_FISHING_ART.beachTileset),
    loadImage(TIDEFALL_FISHING_ART.farmTerrain),
    loadImage(TIDEFALL_FISHING_ART.fishingUi),
    loadImage(TIDEFALL_FISHING_ART.bobberFloat),
    loadImage(TIDEFALL_FISHING_ART.bobberBite),
    loadImage(TIDEFALL_FISHING_ART.waterRipple),
    loadImage(TIDEFALL_FISHING_ART.fishShadow),
  ]).then(([beach, farm, ui, bobberFloat, bobberBite, ripple, fishShadow]) => ({
    beach,
    farm,
    ui,
    bobberFloat,
    bobberBite,
    ripple,
    fishShadow,
  }));
  return loadPromise;
}

export function bobberFrameIndex(elapsedMs: number, bite: boolean): number {
  const frames = bite ? 6 : BOBBER_FLOAT_FRAMES;
  const period = bite ? 90 : 140;
  return Math.floor(elapsedMs / period) % frames;
}

export function bobberFrameRect(elapsedMs: number, bite: boolean): { x: number; y: number; w: number; h: number } {
  const idx = bobberFrameIndex(elapsedMs, bite);
  const frameW = bite ? 32 : BOBBER_FRAME_W;
  const frameH = bite ? 16 : 16;
  return { x: idx * frameW, y: 0, w: frameW, h: frameH };
}

export function rippleFrameIndex(elapsedMs: number): number {
  return Math.floor(elapsedMs / 120) % RIPPLE_FRAMES;
}

export function fishShadowFrameIndex(elapsedMs: number): number {
  return Math.floor(elapsedMs / 180) % SHADOW_FRAMES;
}

export function drawTidefallTiles(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  tileCol: number,
  tileRow: number,
) {
  const sx = tileCol * TILE;
  const sy = tileRow * TILE;
  const cols = Math.ceil(dw / TILE);
  const rows = Math.ceil(dh / TILE);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tw = Math.min(TILE, dw - col * TILE);
      const th = Math.min(TILE, dh - row * TILE);
      ctx.drawImage(img, sx, sy, tw, th, dx + col * TILE, dy + row * TILE, tw, th);
    }
  }
}

export function drawNineSlicePanel(
  ctx: CanvasRenderingContext2D,
  ui: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const { x: sx, y: sy, w: sw, h: sh, margin } = TIDEFALL_UI_SLICES.panelNine;
  const m = margin;
  const pieces = [
    { dx: x, dy: y, dw: m, dh: m, sx, sy, sw: m, sh: m },
    { dx: x + m, dy: y, dw: w - 2 * m, dh: m, sx: sx + m, sy, sw: sw - 2 * m, sh: m },
    { dx: x + w - m, dy: y, dw: m, dh: m, sx: sx + sw - m, sy, sw: m, sh: m },
    { dx: x, dy: y + m, dw: m, dh: h - 2 * m, sx, sy: sy + m, sw: m, sh: sh - 2 * m },
    { dx: x + m, dy: y + m, dw: w - 2 * m, dh: h - 2 * m, sx: sx + m, sy: sy + m, sw: sw - 2 * m, sh: sh - 2 * m },
    { dx: x + w - m, dy: y + m, dw: m, dh: h - 2 * m, sx: sx + sw - m, sy: sy + m, sw: m, sh: sh - 2 * m },
    { dx: x, dy: y + h - m, dw: m, dh: m, sx, sy: sy + sh - m, sw: m, sh: m },
    { dx: x + m, dy: y + h - m, dw: w - 2 * m, dh: m, sx: sx + m, sy: sy + sh - m, sw: sw - 2 * m, sh: m },
    { dx: x + w - m, dy: y + h - m, dw: m, dh: m, sx: sx + sw - m, sy: sy + sh - m, sw: m, sh: m },
  ];
  for (const p of pieces) {
    if (p.dw <= 0 || p.dh <= 0) continue;
    ctx.drawImage(ui, p.sx, p.sy, p.sw, p.sh, p.dx, p.dy, p.dw, p.dh);
  }
}

export function drawStretchedSlice(
  ctx: CanvasRenderingContext2D,
  ui: HTMLImageElement,
  slice: { x: number; y: number; w: number; h: number },
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  ctx.drawImage(ui, slice.x, slice.y, slice.w, slice.h, dx, dy, dw, dh);
}