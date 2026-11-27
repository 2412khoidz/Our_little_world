/**
 * Procedural 24x24 pixel-art spritesheets (3 frames: rest, blink, motion)
 * for all 7 cooperative livestock species (`chicken`, `duck`, `cow`, `goat`,
 * `sheep`, `rabbit`, `bee`).
 *
 * Frame design & palette adapted from `Shiz0id/webfarmville` @ c420bc2
 * (client/src/art/animals.ts, SPDX-License-Identifier: MIT).
 */
import Phaser from 'phaser';
import type { LivestockSpeciesId } from '../../shared/farming/livestock';

export function livestockTextureKey(species: LivestockSpeciesId, frame: 0 | 1 | 2): string {
  return `olw-proc-animal-${species}-f${frame}`;
}

function drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, blink: boolean): void {
  if (blink) {
    ctx.fillStyle = '#2b1d14';
    ctx.fillRect(x - 1, y, 3, 1);
    return;
  }
  ctx.fillStyle = '#2b1d14';
  ctx.fillRect(x, y - 1, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y - 1, 1, 1);
}

function paintSpeciesFrame(
  ctx: CanvasRenderingContext2D,
  species: LivestockSpeciesId,
  frame: 0 | 1 | 2,
): void {
  const blink = frame === 1;
  const move = frame === 2;
  ctx.clearRect(0, 0, 24, 24);

  // Ground shadow
  ctx.fillStyle = 'rgba(20, 30, 18, 0.25)';
  ctx.beginPath();
  ctx.ellipse(12, 21, 7, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (species) {
    case 'chicken': {
      ctx.fillStyle = '#d98a26';
      ctx.fillRect(10, 18, 1, 3);
      ctx.fillRect(14, 18, 1, 3);
      // body
      ctx.fillStyle = '#fff5e4';
      ctx.beginPath();
      ctx.ellipse(12, 14, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a2416';
      ctx.lineWidth = 1;
      ctx.stroke();
      // wing
      ctx.fillStyle = '#edd8bc';
      ctx.fillRect(11, move ? 11 : 12, 4, 3);
      // comb & beak
      ctx.fillStyle = '#d93838';
      ctx.fillRect(9, 6, 3, 2);
      ctx.fillStyle = '#f2a422';
      ctx.fillRect(5, 11, 2, 2);
      drawEye(ctx, 8, 10, blink);
      break;
    }
    case 'duck': {
      ctx.fillStyle = '#e89024';
      ctx.fillRect(10, 18, 1, 3);
      ctx.fillRect(14, 18, 1, 3);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(12, 14, 6, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // green head
      ctx.fillStyle = '#2d7a4c';
      ctx.beginPath();
      ctx.arc(8, 9, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // bill
      ctx.fillStyle = '#f5a623';
      ctx.fillRect(3, 9, 3, 2);
      // wing
      ctx.fillStyle = '#dbe4eb';
      ctx.fillRect(12, move ? 11 : 12, 4, 3);
      drawEye(ctx, 7, 8, blink);
      break;
    }
    case 'cow': {
      ctx.fillStyle = '#f7f5f0';
      ctx.fillRect(6, 10, 13, 8);
      ctx.strokeStyle = '#2b1d14';
      ctx.strokeRect(6, 10, 13, 8);
      // spots
      ctx.fillStyle = '#3a2c24';
      ctx.fillRect(11, 11, 4, 4);
      ctx.fillRect(15, 13, 3, 3);
      // legs
      ctx.fillStyle = '#f0ece4';
      ctx.fillRect(7, 18, 2, 3);
      ctx.fillRect(16, 18, 2, 3);
      // head & snout
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 8, 6, 6);
      ctx.fillStyle = '#f4b8c4';
      ctx.fillRect(2, 11, 4, 3);
      // horns & tail
      ctx.fillStyle = '#d4b888';
      ctx.fillRect(4, 6, 1, 2);
      ctx.fillRect(7, 6, 1, 2);
      ctx.fillStyle = '#3a2c24';
      ctx.fillRect(19, move ? 10 : 12, 2, 4);
      drawEye(ctx, 5, 9, blink);
      break;
    }
    case 'goat': {
      ctx.fillStyle = '#f0ead8';
      ctx.fillRect(7, 11, 11, 7);
      ctx.fillStyle = '#5a4636';
      ctx.fillRect(8, 18, 2, 3);
      ctx.fillRect(15, 18, 2, 3);
      // head + horns + beard
      ctx.fillStyle = '#f5f0e2';
      ctx.fillRect(4, 8, 5, 5);
      ctx.fillStyle = '#b59a72';
      ctx.fillRect(5, 5, 1, 3);
      ctx.fillRect(7, 5, 1, 3);
      ctx.fillRect(5, move ? 13 : 12, 2, 2);
      drawEye(ctx, 5, 9, blink);
      break;
    }
    case 'sheep': {
      ctx.fillStyle = '#5a4636';
      ctx.fillRect(8, 17, 2, 4);
      ctx.fillRect(14, 17, 2, 4);
      // fluffy wool circles
      ctx.fillStyle = '#faf6eb';
      for (const [cx, cy, r] of [[10, 12, 4], [14, 12, 4], [12, 15, 4], [12, 10, 4]] as const) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // face & ears
      ctx.fillStyle = '#3b2e26';
      ctx.fillRect(4, 9, 5, 5);
      ctx.fillRect(3, move ? 9 : 10, 2, 2);
      drawEye(ctx, 5, 11, blink);
      break;
    }
    case 'rabbit': {
      ctx.fillStyle = '#fff5f9';
      ctx.beginPath();
      ctx.ellipse(13, 14, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // ears
      ctx.fillStyle = '#fff0f5';
      ctx.fillRect(8, 4, 2, 5);
      ctx.fillRect(11, move ? 3 : 4, 2, 5);
      // tail
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 13, 2, 2);
      ctx.fillStyle = '#ff9cb8';
      ctx.fillRect(7, 12, 1, 1);
      drawEye(ctx, 9, 11, blink);
      break;
    }
    case 'bee': {
      // wooden hive box + hovering honeybee
      ctx.fillStyle = '#c88c42';
      ctx.fillRect(7, 11, 10, 9);
      ctx.fillStyle = '#8c5a24';
      ctx.fillRect(6, 10, 12, 2);
      ctx.fillRect(11, 15, 2, 3);
      // buzzing bee above hive
      const by = move ? 6 : 7;
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(11, by, 4, 3);
      ctx.fillStyle = '#2b1d14';
      ctx.fillRect(12, by, 1, 3);
      ctx.fillStyle = '#dff6ff';
      ctx.fillRect(12, by - 2, 2, 2);
      break;
    }
  }
}

export function ensureLivestockTextures(
  scene: Phaser.Scene,
  species: LivestockSpeciesId,
): void {
  for (const frame of [0, 1, 2] as const) {
    const key = livestockTextureKey(species, frame);
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) continue;
    paintSpeciesFrame(tex.getContext(), species, frame);
    tex.refresh();
  }
}
