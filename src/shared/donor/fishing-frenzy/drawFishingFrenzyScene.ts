import type { TidefallFishingState } from '../tidefall-phaser/tidefallFishingFsm';
import type { TidefallFishEntry } from '../tidefall-phaser/tidefallFishCatalog';
import { tidefallFishRarityLabelVi } from '../tidefall-phaser/tidefallFishCatalog';
import type { FishingFrenzyArtBundle } from './fishingFrenzyArt';
import { fisherImageForPhase } from './fishingFrenzyArt';
import { FISHING_FRENZY_RARITY_BORDER } from './fishingFrenzyRarityUi';
import { fishingFrenzySpritePathForFish } from './fishingFrenzySpriteMap';
import { tidefallFishNameVi } from './fishingFrenzyFishVi';

function drawFisher(
  ctx: CanvasRenderingContext2D,
  bundle: FishingFrenzyArtBundle,
  state: TidefallFishingState,
  shoreY: number,
) {
  if (state.phase === 'idle') return;
  const img = fisherImageForPhase(bundle, state.phase);
  const w = 72;
  const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  const x = 8;
  const y = shoreY - h + 8;
  ctx.drawImage(img, x, y, w, h);
}

function drawFrenzyBobberMarker(
  ctx: CanvasRenderingContext2D,
  bundle: FishingFrenzyArtBundle,
  bobberX: number,
  bobberY: number,
  state: TidefallFishingState,
) {
  if (state.phase === 'idle' || state.phase === 'landed' || state.phase === 'escaped') return;
  const size = 12;
  ctx.drawImage(bundle.bobber, bobberX - size / 2, bobberY - size - 2, size, size);
}

function drawCatchReveal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bundle: FishingFrenzyArtBundle,
  fish: TidefallFishEntry | null,
  previewName: string | null,
  escaped: boolean,
) {
  if (!fish && !previewName) return;
  const rarity = fish?.rarity ?? 'common';
  const label = fish ? tidefallFishNameVi(fish.id, fish.name) : (previewName ?? 'Cá lạ');
  const spritePath = fish
    ? fishingFrenzySpritePathForFish(fish.id, { biome: fish.biome, rarity: fish.rarity })
    : fishingFrenzySpritePathForFish('unknown', { rarity });
  const sprite =
    bundle.fishSprites.get(spritePath) ??
    bundle.fishSprites.values().next().value ??
    bundle.bobber;

  const cardW = 140;
  const cardH = 72;
  const cx = w / 2;
  const cy = h * 0.34;
  const x = cx - cardW / 2;
  const y = cy - cardH / 2;
  const border = FISHING_FRENZY_RARITY_BORDER[rarity];

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = 'rgba(12, 28, 48, 0.78)';
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, cardW, cardH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;

  const fishW = 56;
  const fishH = 28;
  ctx.drawImage(sprite, cx - fishW / 2, y + 8, fishW, fishH);

  ctx.fillStyle = '#f5f0e5';
  ctx.textAlign = 'center';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(escaped ? `${label} tuột mất…` : `Bắt được ${label}`, cx, y + cardH - 22);
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = border;
  ctx.fillText(tidefallFishRarityLabelVi(rarity), cx, y + cardH - 8);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawFishingFrenzyOverlays(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: TidefallFishingState,
  bundle: FishingFrenzyArtBundle,
  waterTop: number,
  bobberX: number,
  bobberY: number,
  catchFish: TidefallFishEntry | null,
  previewName: string | null,
) {
  const shoreY = waterTop - 4;
  drawFisher(ctx, bundle, state, shoreY);
  drawFrenzyBobberMarker(ctx, bundle, bobberX, bobberY, state);
  if (state.phase === 'landed' || state.phase === 'escaped') {
    drawCatchReveal(ctx, w, h, bundle, catchFish, previewName, state.phase === 'escaped');
  }
}