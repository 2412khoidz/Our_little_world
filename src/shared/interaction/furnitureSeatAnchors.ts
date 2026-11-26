import type { Direction } from '../types';
import type { CouplePostureKind } from '../couple/coupleTypes';

export interface SharedPostureSeatAnchor {
  slot: 0 | 1;
  x: number;
  y: number;
  facing: Direction;
  depth: number;
}

/**
 * Canonical two-person seat anchors for couple-interactive furniture.
 * Preserves accepted `sofa_cream` and `bed_cozy` anchors while fixing `bench_garden`
 * so both partners sit side-by-side cleanly on the bench seat plank facing South.
 */
export function resolveSharedPostureSeat(
  kind: 'sofa_sit' | 'bench_sit' | 'bed_lie',
  placement: { tileX: number; tileY: number; widthTiles: number; heightTiles: number },
  slot: 0 | 1,
  tilePx = 16,
): SharedPostureSeatAnchor {
  const centerX = (placement.tileX + placement.widthTiles / 2) * tilePx;
  const footY = (placement.tileY + placement.heightTiles) * tilePx;
  const sideSign = slot === 0 ? -1 : 1;

  if (kind === 'bed_lie') {
    const y = (placement.tileY + 1.38) * tilePx;
    return {
      slot,
      x: centerX + sideSign * 6.4,
      y,
      facing: 'down',
      depth: Math.round(y) + 42,
    };
  }

  if (kind === 'bench_sit') {
    const y = footY - 4.5;
    return {
      slot,
      x: centerX + sideSign * 7.5,
      y,
      facing: 'down',
      depth: Math.round(footY) + 4,
    };
  }

  const y = footY - 5.5;
  return {
    slot,
    x: centerX + sideSign * 6.5,
    y,
    facing: 'down',
    depth: Math.round(y) + 42,
  };
}

export function postureKindForInteractiveFurniture(
  kind: 'sofa_sit' | 'bench_sit' | 'bed_lie',
): CouplePostureKind {
  if (kind === 'bed_lie') return 'lie_bed';
  if (kind === 'bench_sit') return 'sit_bench';
  return 'sit_sofa';
}
