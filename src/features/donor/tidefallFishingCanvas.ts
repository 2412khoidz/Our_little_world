import { fishingReelMotion } from '../../shared/art/fishingReelMotion';
import type { FishingFrenzyArtBundle } from '../../shared/donor/fishing-frenzy/fishingFrenzyArt';
import { fisherImageForPhase } from '../../shared/donor/fishing-frenzy/fishingFrenzyArt';
import type { DonorFishingSpotId } from '../../shared/donor/donorFishingSpots';
import type { TidefallFishingState } from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import { isPointerInTidefallZone } from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import { fishShadowFrameIndex, rippleFrameIndex } from '../../shared/donor/tidefall-phaser/tidefallFishingArt';
import { fishingAtlasFrame, fishingStripForPhase, ranchFishingFrame } from '../../shared/art/ranchActionAtlas';
import type { RanchFishingUiArt } from './ranchFishingUiArt';

export interface FishingSceneRenderOptions {
  partnerPresent?: boolean;
  localAvatarCanvas?: HTMLCanvasElement | null;
  partnerAvatarCanvas?: HTMLCanvasElement | null;
  isObserver?: boolean;
  useTensionMeter?: boolean;
  reelHeld?: boolean;
}

interface BiomePalette {
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillNear: string;
  shoreGrass: string;
  shoreTrim: string;
  waterTop: string;
  waterMid: string;
  waterDeep: string;
  shimmer: string;
}

const BIOME_PALETTE: Record<DonorFishingSpotId, BiomePalette> = {
  meadow_pond: {
    skyTop: '#a4dcff',
    skyBottom: '#f9eac3',
    hillFar: '#7ab374',
    hillNear: '#589756',
    shoreGrass: '#70b458',
    shoreTrim: '#579243',
    waterTop: '#4aa3d2',
    waterMid: '#3782b6',
    waterDeep: '#255d8f',
    shimmer: '#b4ebff',
  },
  east_stream: {
    skyTop: '#90cbe8',
    skyBottom: '#dcefe5',
    hillFar: '#4c7b67',
    hillNear: '#355f4f',
    shoreGrass: '#5c9d5b',
    shoreTrim: '#407842',
    waterTop: '#47b4bd',
    waterMid: '#308fa0',
    waterDeep: '#1f6479',
    shimmer: '#cdf9fb',
  },
  gull_bay: {
    skyTop: '#7cc9f7',
    skyBottom: '#ffe6b8',
    hillFar: '#e0bd89',
    hillNear: '#79a870',
    shoreGrass: '#edd29c',
    shoreTrim: '#c7a467',
    waterTop: '#2e9fd8',
    waterMid: '#207bb6',
    waterDeep: '#145388',
    shimmer: '#ccf4ff',
  },
};

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
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

function drawSkyAndShore(
  ctx: CanvasRenderingContext2D,
  w: number,
  waterTop: number,
  spotId: DonorFishingSpotId,
  elapsedMs: number,
): void {
  const pal = BIOME_PALETTE[spotId];
  const skyGrad = ctx.createLinearGradient(0, 0, 0, waterTop);
  skyGrad.addColorStop(0, pal.skyTop);
  skyGrad.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, waterTop + 2);

  // Soft pixel sun / warm glow
  const sunX = spotId === 'gull_bay' ? w * 0.78 : w * 0.82;
  const sunY = Math.round(waterTop * 0.34);
  ctx.fillStyle = 'rgba(255, 244, 198, 0.35)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff5cf';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 10, 0, Math.PI * 2);
  ctx.fill();

  // Gentle drifting pixel clouds
  const cloudShift = (elapsedMs * 0.008) % (w + 60);
  const drawCloud = (baseX: number, y: number, scale: number) => {
    const cx = ((baseX + cloudShift) % (w + 60)) - 30;
    ctx.fillStyle = 'rgba(255, 252, 244, 0.85)';
    ctx.fillRect(Math.round(cx), y, Math.round(28 * scale), Math.round(7 * scale));
    ctx.fillRect(Math.round(cx + 5 * scale), y - Math.round(4 * scale), Math.round(16 * scale), Math.round(5 * scale));
  };
  drawCloud(36, 16, 1);
  drawCloud(190, 26, 0.8);

  if (spotId === 'gull_bay') {
    // Distant sailboat silhouette gliding on the ocean horizon
    const boatX = w - 74 - Math.sin(elapsedMs * 0.0005) * 14;
    const boatY = waterTop - 5;
    ctx.fillStyle = '#9c5a3c';
    ctx.fillRect(Math.round(boatX), boatY, 22, 5);
    ctx.fillStyle = '#fff9ee';
    ctx.beginPath();
    ctx.moveTo(boatX + 10, boatY);
    ctx.lineTo(boatX + 10, boatY - 16);
    ctx.lineTo(boatX + 20, boatY - 2);
    ctx.closePath();
    ctx.fill();
  } else {
    // Rolling meadow / pine horizon hills
    ctx.fillStyle = pal.hillFar;
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath();
      ctx.ellipse(x + 24, waterTop - 2, 34, 16, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = pal.hillNear;
    for (let x = 14; x < w; x += 58) {
      ctx.beginPath();
      ctx.ellipse(x + 24, waterTop + 1, 28, 11, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    if (spotId === 'east_stream') {
      // Pine silhouettes along back bank
      for (const px of [158, 174, 242, 260, 316, 334]) {
        ctx.fillStyle = '#264b3c';
        ctx.beginPath();
        ctx.moveTo(px, waterTop - 22);
        ctx.lineTo(px - 8, waterTop - 3);
        ctx.lineTo(px + 8, waterTop - 3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Left mossy grass / sandy bank behind the wooden pier
  ctx.fillStyle = pal.shoreGrass;
  ctx.fillRect(0, waterTop - 16, 62, 22);
  ctx.fillStyle = pal.shoreTrim;
  ctx.fillRect(0, waterTop + 3, 62, 4);
}

const waterPatterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();

function drawLayeredWater(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  waterTop: number,
  spotId: DonorFishingSpotId,
  elapsedMs: number,
): void {
  const pal = BIOME_PALETTE[spotId];
  const waterGrad = ctx.createLinearGradient(0, waterTop, 0, h);
  waterGrad.addColorStop(0, pal.waterTop);
  waterGrad.addColorStop(0.5, pal.waterMid);
  waterGrad.addColorStop(1, pal.waterDeep);
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, waterTop, w, h - waterTop);

  // Horizon / shoreline foam band
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(0, waterTop, w, 2);

  // Subtle animated horizontal pixel wave glints
  ctx.fillStyle = pal.shimmer;
  for (let i = 0; i < 12; i += 1) {
    const rowY = waterTop + 10 + ((i * 11) % Math.max(24, h - waterTop - 18));
    const speed = 0.018 + (i % 3) * 0.008;
    const baseX = ((i * 47 + elapsedMs * speed) % (w + 30)) - 20;
    const len = 10 + (i % 4) * 5;
    ctx.globalAlpha = 0.25 + 0.16 * Math.sin(elapsedMs * 0.003 + i);
    ctx.fillRect(Math.round(baseX), Math.round(rowY), len, 2);
  }
  ctx.globalAlpha = 1;

  // Biome foreground touches (lily pads on meadow_pond, stepping stones on east_stream)
  if (spotId === 'meadow_pond') {
    for (const [lx, ly] of [
      [134, waterTop + 26],
      [318, waterTop + 44],
      [294, waterTop + 20],
    ] as const) {
      ctx.fillStyle = '#4f9c54';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 9, 4, 0, 0.3, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7cd179';
      ctx.fillRect(lx - 4, ly - 2, 5, 1);
    }
  } else if (spotId === 'east_stream') {
    for (const [rx, ry] of [
      [132, waterTop + 18],
      [322, waterTop + 34],
    ] as const) {
      ctx.fillStyle = '#6f7e86';
      ctx.beginPath();
      ctx.ellipse(rx, ry, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9aaab2';
      ctx.fillRect(rx - 5, ry - 3, 7, 2);
    }
  }
}

function drawWoodenPier(
  ctx: CanvasRenderingContext2D,
  waterTop: number,
  h: number,
): { pierTopY: number; pierEndX: number } {
  const pierTopY = waterTop - 10;
  const pierEndX = 112;

  // Support posts in water
  for (const postX of [24, 62, 100]) {
    ctx.fillStyle = '#5d3921';
    ctx.fillRect(postX, pierTopY + 12, 8, Math.min(34, h - pierTopY));
    ctx.fillStyle = '#7c4e2f';
    ctx.fillRect(postX + 1, pierTopY + 12, 3, Math.min(34, h - pierTopY));
    // Water foam collar around piling
    ctx.fillStyle = 'rgba(235, 250, 255, 0.5)';
    ctx.fillRect(postX - 2, waterTop + 14, 12, 2);
  }

  // Plank deck
  ctx.fillStyle = '#b67b4b';
  ctx.fillRect(0, pierTopY, pierEndX, 13);
  ctx.fillStyle = '#d39762';
  ctx.fillRect(0, pierTopY, pierEndX, 3);
  ctx.fillStyle = '#6d4123';
  ctx.fillRect(0, pierTopY + 11, pierEndX, 4);

  // Vertical plank seams
  ctx.fillStyle = '#7e4d29';
  for (let px = 8; px < pierEndX; px += 12) {
    ctx.fillRect(px, pierTopY + 1, 1, 10);
  }

  return { pierTopY, pierEndX };
}

function drawAnglersAndRod(
  ctx: CanvasRenderingContext2D,
  pierTopY: number,
  state: TidefallFishingState,
  bobberX: number,
  bobberY: number,
  frenzy: FishingFrenzyArtBundle | null | undefined,
  opts?: FishingSceneRenderOptions,
): void {
  const feetY = pierTopY + 2;
  const anglerX = 76;
  const anglerAvatar = opts?.isObserver
    ? (opts.partnerAvatarCanvas ?? opts?.localAvatarCanvas)
    : opts?.localAvatarCanvas;
  const companionAvatar = opts?.isObserver
    ? opts?.localAvatarCanvas
    : (opts?.partnerAvatarCanvas ?? opts?.localAvatarCanvas);

  // Partner sitting/standing companion on pier when co-op / observing
  if (opts?.partnerPresent) {
    const px = 42;
    ctx.fillStyle = 'rgba(24, 16, 12, 0.25)';
    ctx.beginPath();
    ctx.ellipse(px, feetY + 1, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (companionAvatar) {
      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.drawImage(companionAvatar, 0, 0, 16, 32, px - 15, feetY - 55, 30, 60);
      ctx.restore();
    } else if (frenzy?.fisherIdle) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(frenzy.fisherIdle, px - 22, feetY - 42, 44, 44);
      ctx.restore();
    }
    // Cozy heart above co-op anglers
    ctx.fillStyle = '#ff7ca0';
    ctx.fillRect(58, feetY - 46 + Math.round(Math.sin(state.elapsedMs * 0.005) * 2), 6, 5);
  }

  // Angler shadow
  ctx.fillStyle = 'rgba(24, 16, 12, 0.28)';
  ctx.beginPath();
  ctx.ellipse(anglerX + 2, feetY + 1, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  let handX = anglerX + 10;
  let handY = feetY - 14;

  if (anglerAvatar) {
    // Frame 0 facing right (`x=0, y=0, 16×32`) from Cozy Human V2 world avatar sheet!
    const bobOffset = state.phase === 'minigame' ? Math.sin(state.elapsedMs * 0.025) * 1.5 : 0;
    const drawW = 30;
    const drawH = 60;
    ctx.drawImage(
      anglerAvatar,
      0,
      0,
      16,
      32,
      anglerX - drawW / 2,
      feetY - drawH + 5 + bobOffset,
      drawW,
      drawH,
    );
    handX = anglerX + 8;
    handY = feetY - 14 + bobOffset;
  } else if (frenzy) {
    const img = fisherImageForPhase(frenzy, state.phase);
    const drawW = 46;
    const drawH = Math.round((img.naturalHeight / Math.max(1, img.naturalWidth)) * drawW);
    ctx.drawImage(img, anglerX - drawW / 2 + 2, feetY - drawH + 4, drawW, drawH);
    handX = anglerX + 14;
    handY = feetY - 16;
  }

  // Animated wooden fishing rod + curved fishing line
  const castingBack = state.phase === 'casting' && state.elapsedMs < 180;
  const reel = state.phase === 'minigame' ? fishingReelMotion(state.progress, state.elapsedMs, opts?.reelHeld) : null;
  const rodBend =
    state.phase === 'bite' || state.phase === 'minigame'
      ? reel ? 5 + reel.bend * 11 : 9 + Math.sin(state.elapsedMs * 0.028) * 3
      : state.phase === 'casting'
        ? -4
        : 0;
  const tipX = castingBack ? handX - 18 : handX + 36;
  const tipY = castingBack ? handY - 24 : handY - 26 + rodBend;

  ctx.strokeStyle = '#5c351c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.quadraticCurveTo(
    (handX + tipX) / 2,
    Math.min(handY, tipY) - 4 + rodBend * 0.4,
    tipX,
    tipY,
  );
  ctx.stroke();

  ctx.strokeStyle = '#d6a360';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(handX + 1, handY - 1);
  ctx.quadraticCurveTo(
    (handX + tipX) / 2,
    Math.min(handY, tipY) - 5 + rodBend * 0.4,
    tipX,
    tipY,
  );
  ctx.stroke();

  if (state.phase !== 'idle' && state.phase !== 'landed') {
    const sag = reel ? 9 - reel.bend * 8 : 10;
    ctx.strokeStyle = 'rgba(255, 252, 240, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo((tipX + bobberX) / 2, (tipY + bobberY) / 2 + sag, bobberX, bobberY - 3);
    ctx.stroke();
  }
}

function drawBobberAndWaterAction(
  ctx: CanvasRenderingContext2D,
  w: number,
  waterTop: number,
  state: TidefallFishingState,
  art: RanchFishingUiArt,
  reelHeld?: boolean,
): { bobberX: number; bobberY: number } {
  const restX = Math.round(w * 0.62);
  const restY = waterTop + 34;
  let bobberX = restX;
  let bobberY = restY + state.bobberDip * 18;

  if (state.phase === 'casting') {
    const t = Math.min(1, Math.max(0, state.elapsedMs / 520));
    bobberX = 116 + (restX - 116) * t;
    const arc = Math.sin(t * Math.PI) * 38;
    bobberY = (waterTop - 22) * (1 - t) + restY * t - arc;
    if (t > 0.85) {
      ctx.strokeStyle = 'rgba(235, 250, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(restX, restY + 3, (t - 0.85) * 90, (t - 0.85) * 32, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (state.phase !== 'idle') {
    if (state.phase === 'minigame') {
      const reel = fishingReelMotion(state.progress, state.elapsedMs, reelHeld);
      bobberX -= (restX - 122) * reel.lineShorten;
      bobberY -= reel.liftPx;
    }
    // Fish silhouette gently circling / approaching the bobber
    const angle = state.elapsedMs * 0.0022;
    const swimRadius = state.phase === 'bite' ? 6 : state.phase === 'minigame' ? 4 : 24;
    const sx = bobberX + Math.cos(angle) * swimRadius;
    const sy = bobberY + 11 + Math.sin(angle * 2) * 3;
    ctx.save();
    ctx.globalAlpha = state.phase === 'minigame' ? 0.55 : 0.36;
    const shadow = ranchFishingFrame(Math.sin(angle) < 0 ? 'fish_shadow_right' : 'fish_shadow_left', fishShadowFrameIndex(state.elapsedMs));
    ctx.drawImage(art.ranch, shadow.x, shadow.y, shadow.w, shadow.h, Math.round(sx - 16), Math.round(sy - 16), 32, 32);
    ctx.restore();

    const rippleIdx = rippleFrameIndex(state.elapsedMs);
    ctx.save();
    ctx.globalAlpha = state.phase === 'bite' ? 0.95 : 0.64;
    const ripple = ranchFishingFrame('water_ripple', rippleIdx);
    ctx.drawImage(art.ranch, ripple.x, ripple.y, ripple.w, ripple.h, Math.round(bobberX - 16), Math.round(bobberY - 12), 32, 28);
    ctx.restore();
  }

  const strip = fishingStripForPhase(state.hookFlash ? 'bite' : state.phase);
  if (strip) {
    const bob = fishingAtlasFrame(strip, state.elapsedMs);
    ctx.drawImage(art.ranch, bob.x, bob.y, bob.w, bob.h, Math.round(bobberX - 16), Math.round(bobberY - 16), 32, 32);

    if (state.phase === 'bite') {
      const pulse = 1 + Math.sin(state.elapsedMs * 0.025) * 0.14;
      ctx.save();
      ctx.translate(bobberX, bobberY - 26);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ffdf6b';
      ctx.strokeStyle = '#6f3e1d';
      ctx.lineWidth = 2;
      roundRectPath(ctx, -11, -13, 22, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a82217';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, -1);
      ctx.restore();
    }
  }

  return { bobberX, bobberY };
}

function drawHybridMinigameBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: TidefallFishingState,
): void {
  if (state.phase !== 'minigame' && state.phase !== 'landed' && state.phase !== 'escaped') return;

  const panelX = 12;
  const panelW = w - 24;
  const panelH = 44;
  const panelY = h - panelH - 8;

  // Brass & warm oak wood frame matching Kiln Harvest Hybrid UI
  ctx.save();
  ctx.fillStyle = '#5c351e';
  roundRectPath(ctx, panelX, panelY, panelW, panelH, 8);
  ctx.fill();

  ctx.fillStyle = '#b98249';
  roundRectPath(ctx, panelX + 2, panelY + 2, panelW - 4, panelH - 4, 6);
  ctx.fill();

  ctx.fillStyle = '#f6ebd2';
  roundRectPath(ctx, panelX + 5, panelY + 5, panelW - 10, panelH - 10, 4);
  ctx.fill();

  // Tension bar track
  const barX = panelX + 12;
  const barW = panelW - 24;
  const barY = panelY + 10;
  const barH = 14;

  ctx.fillStyle = '#1f3b54';
  roundRectPath(ctx, barX, barY, barW, barH, 4);
  ctx.fill();

  // Emerald sweet-spot target window
  const tw = Math.max(16, state.targetWidth * barW);
  const tx = Math.max(barX + 1, Math.min(barX + barW - tw - 1, barX + state.targetCenter * barW - tw / 2));
  ctx.fillStyle = '#47b972';
  roundRectPath(ctx, tx, barY + 2, tw, barH - 4, 3);
  ctx.fill();
  ctx.fillStyle = '#9cf0b6';
  ctx.fillRect(Math.round(tx + 2), barY + 3, Math.max(4, Math.round(tw - 4)), 2);

  // Moving pointer diamond / fish indicator
  const inZone = isPointerInTidefallZone(state);
  const px = barX + Math.max(0.02, Math.min(0.98, state.pointerNorm)) * barW;
  ctx.fillStyle = inZone ? '#ffd859' : '#ff6a64';
  ctx.strokeStyle = '#3b2110';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, barY - 3);
  ctx.lineTo(px + 6, barY + barH / 2);
  ctx.lineTo(px, barY + barH + 3);
  ctx.lineTo(px - 6, barY + barH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Catch progress bar below track
  const progY = barY + barH + 5;
  const progH = 7;
  ctx.fillStyle = '#755033';
  roundRectPath(ctx, barX, progY, barW, progH, 3);
  ctx.fill();
  const progW = Math.max(4, Math.min(barW, state.progress * barW));
  ctx.fillStyle = state.progress > 0.72 ? '#59c774' : '#f2bb49';
  roundRectPath(ctx, barX, progY, progW, progH, 3);
  ctx.fill();
  ctx.restore();
}

export function drawTidefallFishingScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: TidefallFishingState,
  art: RanchFishingUiArt,
  spotId: DonorFishingSpotId,
  frenzy?: FishingFrenzyArtBundle | null,
  opts?: FishingSceneRenderOptions,
): void {
  ctx.imageSmoothingEnabled = false;
  const waterTop = spotId === 'east_stream' ? Math.floor(h * 0.44) : Math.floor(h * 0.48);

  drawSkyAndShore(ctx, w, waterTop, spotId, state.elapsedMs);
  drawLayeredWater(ctx, w, h, waterTop, spotId, state.elapsedMs);
  let waterPattern = waterPatterns.get(ctx);
  if (!waterPattern) {
    waterPattern = ctx.createPattern(art.waterTile, 'repeat') ?? undefined;
    if (waterPattern) waterPatterns.set(ctx, waterPattern);
  }
  if (waterPattern) {
    ctx.save();
    ctx.fillStyle = waterPattern;
    ctx.globalAlpha = 0.42;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillRect(0, waterTop, w, h - waterTop);
    ctx.restore();
  }
  const { pierTopY } = drawWoodenPier(ctx, waterTop, h);
  const { bobberX, bobberY } = drawBobberAndWaterAction(ctx, w, waterTop, state, art, opts?.reelHeld);
  drawAnglersAndRod(ctx, pierTopY, state, bobberX, bobberY, frenzy, opts);
  if (!opts?.useTensionMeter) drawHybridMinigameBar(ctx, w, h, state);
}
