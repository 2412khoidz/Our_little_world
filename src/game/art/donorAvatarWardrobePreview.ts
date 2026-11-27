import type { AvatarConfig, Direction } from '../../shared/types';
import { drawWardrobePreview, loadAvatarAtlas } from './worldAvatarCanvas';
import { selectRigForHairStyle } from './avatarPalette';

/** Same unified 4-row cozy human atlas + palette pipeline used by Phaser WorldScene. */
export function loadCozyWardrobeAvatarAtlas(): Promise<HTMLImageElement | null> {
  return loadAvatarAtlas();
}

export function drawCozyWardrobePreview(
  target: HTMLCanvasElement,
  atlas: HTMLImageElement | null,
  config: AvatarConfig,
  scale: number,
  rowKind = 0,
  direction: Direction = 'down',
  frameIndex = 0,
): void {
  drawWardrobePreview(target, atlas, config, scale, rowKind, direction, frameIndex);
  target.dataset.avatarRig = selectRigForHairStyle(config.hairStyle);
}

/** @deprecated kept for backwards imports */
export const loadDonorGameplayAvatarSheet = (_config: AvatarConfig) => loadAvatarAtlas();

/** @deprecated kept for backwards imports */
export const drawDonorWardrobePreview = drawCozyWardrobePreview;
