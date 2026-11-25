import type { FishingFrenzyArtBundle } from '../../shared/donor/fishing-frenzy/fishingFrenzyArt';
import { drawFishingFrenzyOverlays } from '../../shared/donor/fishing-frenzy/drawFishingFrenzyScene';
import type { TidefallFishEntry } from '../../shared/donor/tidefall-phaser/tidefallFishCatalog';
import type { DonorFishingSpotId } from '../../shared/donor/donorFishingSpots';
import type { TidefallFishingState } from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import { isPointerInTidefallZone } from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import {
  bobberFrameRect,
  drawNineSlicePanel,
  drawStretchedSlice,
  drawTidefallTiles,
  fishShadowFrameIndex,
  rippleFrameIndex,
  TIDEFALL_UI_SLICES,
  type TidefallFishingArtBundle,
} from '../../shared/donor/tidefall-phaser/tidefallFishingArt';

function drawBiomeBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  art: TidefallFishingArtBundle,
  spotId: DonorFishingSpotId,
) {
  const waterTop = spotId === 'east_stream' ? Math.floor(h * 0.38) : Math.floor(h * 0.5);
  const grassH = waterTop - Math.floor(h * 0.08);

  drawTidefallTiles(ctx, art.farm, 0, 0, w, grassH, 0, 0);
  if (spotId === 'meadow_pond') {
    drawTidefallTiles(ctx, art.farm, 0, grassH - 16, w, 20, 2, 1);
  }
  const sandH = Math.floor(h * 0.1);
  drawTidefallTiles(ctx, art.beach, 0, waterTop - sandH, w, sandH, 1, 0);
  drawTidefallTiles(ctx, art.beach, 0, waterTop, w, h - waterTop, 2, 1);
  if (spotId === 'east_stream') {
    drawTidefallTiles(ctx, art.beach, 0, waterTop + 24, w, h - waterTop - 24, 3, 2);
  }
}

/** Donor Tidefall art — no procedural fillRect scene pass. */
export function drawTidefallFishingScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: TidefallFishingState,
  previewName: string | null,
  art: TidefallFishingArtBundle,
  spotId: DonorFishingSpotId,
  frenzy?: FishingFrenzyArtBundle | null,
  catchFish?: TidefallFishEntry | null,
) {
  ctx.imageSmoothingEnabled = false;
  drawBiomeBackdrop(ctx, w, h, art, spotId);

  const waterTop = spotId === 'east_stream' ? Math.floor(h * 0.38) : Math.floor(h * 0.5);
  const bobberX = w * 0.5;
  const bobberBaseY = waterTop + 26;
  const bobberY = bobberBaseY + state.bobberDip * 22;

  if (state.phase !== 'idle') {
    const shadowIdx = fishShadowFrameIndex(state.elapsedMs);
    const shW = 16;
    ctx.drawImage(art.fishShadow, shadowIdx * shW, 0, shW, 16, bobberX - 20, bobberY + 10, 20, 10);
    ctx.drawImage(art.fishShadow, ((shadowIdx + 2) % 4) * shW, 0, shW, 16, bobberX + 14, bobberY + 14, 18, 9);

    const rippleIdx = rippleFrameIndex(state.elapsedMs);
    ctx.globalAlpha = 0.75;
    ctx.drawImage(art.ripple, rippleIdx * 16, 0, 16, 16, bobberX - 18, bobberY + 2, 36, 14);
    ctx.globalAlpha = 1;

    const bite = state.phase === 'bite' || state.hookFlash;
    const bob = bobberFrameRect(state.elapsedMs, bite);
    const bobImg = bite ? art.bobberBite : art.bobberFloat;
    ctx.drawImage(bobImg, bob.x, bob.y, bob.w, bob.h, bobberX - bob.w / 2, bobberY - bob.h / 2, bob.w * 1.5, bob.h * 1.5);

    ctx.strokeStyle = 'rgba(245,240,225,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bobberX, bobberBaseY - 30);
    ctx.lineTo(bobberX, bobberY - 4);
    ctx.stroke();
  }


  if (state.phase === 'minigame' || state.phase === 'landed' || state.phase === 'escaped') {
    const barPad = 12;
    const barW = w - barPad * 2;
    const panelX = barPad - 6;
    const panelY = h - 54;
    const panelW = barW + 12;
    const panelH = 46;
    drawNineSlicePanel(ctx, art.ui, panelX, panelY, panelW, panelH);

    const barY = h - 42;
    const barX = barPad;
    drawStretchedSlice(ctx, art.ui, TIDEFALL_UI_SLICES.barTrack, barX, barY, barW, 12);

    const tw = state.targetWidth * barW;
    const tcx = barX + state.targetCenter * barW;
    ctx.save();
    ctx.globalAlpha = 0.55;
    drawStretchedSlice(ctx, art.ui, TIDEFALL_UI_SLICES.barFill, tcx - tw / 2, barY + 2, tw, 8);
    ctx.restore();

    const px = barX + state.pointerNorm * barW;
    const marker = TIDEFALL_UI_SLICES.marker;
    ctx.save();
    if (!isPointerInTidefallZone(state)) ctx.filter = 'hue-rotate(320deg) saturate(1.4)';
    ctx.drawImage(art.ui, marker.x, marker.y, marker.w, marker.h, px - 7, barY - 5, 14, 14);
    ctx.restore();

    const progW = Math.max(4, state.progress * barW);
    drawStretchedSlice(ctx, art.ui, TIDEFALL_UI_SLICES.barFill, barX, barY + 14, progW, 6);
  }

  if (frenzy) {
    drawFishingFrenzyOverlays(ctx, w, h, state, frenzy, waterTop, bobberX, bobberY, catchFish ?? null, previewName);
  }
}