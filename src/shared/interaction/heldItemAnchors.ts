import type { Direction } from '../types';
import type { HeldItemState } from './interactionTypes';

export interface HeldItemHandTransform {
  offsetX: number;
  offsetY: number;
  depthDelta: number;
  flipX: boolean;
  rotation: number;
  scale: number;
  visible: boolean;
}

interface DirectionalHandAnchor {
  baseX: number;
  baseY: number;
  depthDelta: number;
  flipX: boolean;
  baseRot: number;
}

// Calibrated for 32x32 Cozy Human V2 sprites with origin (0.5, 0.88).
const HAND_ANCHORS: Readonly<Record<Direction, DirectionalHandAnchor>> = {
  down: { baseX: 4.2, baseY: -6.2, depthDelta: 2, flipX: false, baseRot: -0.06 },
  up: { baseX: -4.0, baseY: -7.0, depthDelta: -2, flipX: true, baseRot: 0.06 },
  left: { baseX: -4.6, baseY: -6.4, depthDelta: 2, flipX: true, baseRot: 0.1 },
  right: { baseX: 4.6, baseY: -6.4, depthDelta: 2, flipX: false, baseRot: -0.1 },
};

function baseScaleForHeldKind(itemKind: HeldItemState['itemKind'], itemSku: string | null): number {
  if (itemKind === 'tool') return 0.6;
  if (itemKind === 'water_pitcher') return 0.56;
  if (itemSku?.startsWith('seed_')) return 0.44;
  if (itemKind === 'toy') return 0.54;
  return 0.5;
}

/**
 * Pure TypeScript directional hand-anchor transform for carried items and tools.
 * Preserves accepted tool visibility invariant: tools stay hidden when idling or walking.
 */
export function resolveHeldItemHandTransform(params: {
  facing: Direction;
  itemKind: HeldItemState['itemKind'];
  itemSku: string | null;
  isMoving: boolean;
  timeMs: number;
  toolSwingActive: boolean;
}): HeldItemHandTransform {
  const { facing, itemKind, itemSku, isMoving, timeMs, toolSwingActive } = params;
  const anchor = HAND_ANCHORS[facing];

  if (itemKind === 'none' || (itemKind === 'tool' && !toolSwingActive)) {
    return {
      offsetX: anchor.baseX,
      offsetY: anchor.baseY,
      depthDelta: anchor.depthDelta,
      flipX: anchor.flipX,
      rotation: 0,
      scale: baseScaleForHeldKind(itemKind, itemSku),
      visible: false,
    };
  }

  let swayX = 0;
  let bobY = Math.sin(timeMs * 0.004) * 0.35;
  let rotDelta = 0;
  if (isMoving) {
    const stride = Math.sin(timeMs * 0.015);
    bobY = -Math.abs(stride) * 1.1;
    swayX = (facing === 'left' || facing === 'right' ? stride * 0.9 : stride * 0.35);
    rotDelta = stride * 0.06;
  }

  return {
    offsetX: anchor.baseX + swayX,
    offsetY: anchor.baseY + bobY,
    depthDelta: anchor.depthDelta,
    flipX: anchor.flipX,
    rotation: anchor.baseRot + rotDelta,
    scale: baseScaleForHeldKind(itemKind, itemSku),
    visible: true,
  };
}
