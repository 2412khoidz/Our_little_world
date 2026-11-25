import type { TidefallFishingState } from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import { isPointerInTidefallZone } from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';

/** Pixel-pond scene inspired by Tidefall bobber + bar minigame — canvas only. */
export function drawTidefallFishingScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: TidefallFishingState,
  previewName: string | null,
) {
  ctx.imageSmoothingEnabled = false;
  const waterTop = Math.floor(h * 0.52);

  const sky = ctx.createLinearGradient(0, 0, 0, waterTop);
  sky.addColorStop(0, '#5a8fd4');
  sky.addColorStop(1, '#9ec8e8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, waterTop);

  ctx.fillStyle = '#3d6d8e';
  ctx.fillRect(0, waterTop, w, h - waterTop);

  for (let i = 0; i < 5; i++) {
    const y = waterTop + 12 + i * 14;
    ctx.strokeStyle = `rgba(255,255,255,${0.08 - i * 0.012})`;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const wave = Math.sin(x * 0.05 + state.elapsedMs * 0.003 + i) * 2;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  const shoreH = Math.floor(h * 0.12);
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(0, waterTop - shoreH, w, shoreH);

  const bobberX = w * 0.5;
  const bobberBaseY = waterTop + 22;
  const bobberY = bobberBaseY + state.bobberDip * 28;
  if (state.phase !== 'idle') {
    ctx.fillStyle = state.hookFlash ? '#ffd166' : '#e63946';
    ctx.beginPath();
    ctx.arc(bobberX, bobberY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bobberX, bobberBaseY - 36);
    ctx.lineTo(bobberX, bobberY - 4);
    ctx.stroke();
  }

  if (previewName && state.phase !== 'idle') {
    ctx.fillStyle = '#1d3557';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Mồi: ${previewName}`, w / 2, 18);
  }

  if (state.phase === 'minigame' || state.phase === 'landed' || state.phase === 'escaped') {
    const barY = h - 44;
    const barPad = 16;
    const barW = w - barPad * 2;
    const barX = barPad;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(barX - 4, barY - 20, barW + 8, 40);

    ctx.fillStyle = '#334';
    ctx.fillRect(barX, barY, barW, 14);

    const tw = state.targetWidth * barW;
    const tcx = barX + state.targetCenter * barW;
    ctx.fillStyle = 'rgba(68,255,68,0.45)';
    ctx.fillRect(tcx - tw / 2, barY, tw, 14);

    const px = barX + state.pointerNorm * barW;
    ctx.fillStyle = isPointerInTidefallZone(state) ? '#57cc99' : '#e07a5f';
    ctx.beginPath();
    ctx.moveTo(px, barY - 6);
    ctx.lineTo(px - 6, barY + 4);
    ctx.lineTo(px + 6, barY + 4);
    ctx.closePath();
    ctx.fill();

    const progW = Math.max(2, state.progress * barW);
    ctx.fillStyle = '#4895ef';
    ctx.fillRect(barX, barY + 18, progW, 5);
  }
}