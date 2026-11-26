import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import type { Direction } from '../../shared/types';

export type DonorToolKind = 'hoe' | 'water' | 'axe' | 'rod' | 'plant' | 'harvest';

export interface DonorToolActionState {
  active: boolean;
  toolKind: DonorToolKind | null;
  facing: Direction;
  progress: number;
  targetTileX: number;
  targetTileY: number;
  targetWorldX: number;
  targetWorldY: number;
}

const DIRECTION_VECTORS: Record<Direction, readonly [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

const TOOL_DURATION_MS: Record<DonorToolKind, number> = {
  hoe: 340,
  water: 420,
  axe: 360,
  rod: 340,
  plant: 280,
  harvest: 320,
};

export function toolKindFromItemSku(
  itemSku: string | null | undefined,
  actionState: HeldItemState['temporaryActionState'] = 'none',
): DonorToolKind | null {
  if (actionState === 'pouring') return 'water';
  if (!itemSku) return null;
  if (itemSku.includes('hoe')) return 'hoe';
  if (itemSku.includes('water')) return 'water';
  if (itemSku.includes('axe')) return 'axe';
  if (itemSku.includes('rod')) return 'rod';
  return null;
}

/**
 * Transplanted from clear-code-projects/PyDew (`code/sprites.py` `Player.input/get_target_pos/animate`,
 * vendored at `vendor/pydew-remaster-upstream` @ `0efb7cc`): locks movement briefly during a swing/pour
 * and fires `onHit` at the mid-swing contact frame on the facing target tile.
 */
export class DonorPydewToolController {
  private active = false;
  private toolKind: DonorToolKind | null = null;
  private facing: Direction = 'down';
  private elapsedMs = 0;
  private durationMs = 340;
  private hitTriggered = false;
  private targetTileX = 0;
  private targetTileY = 0;
  private targetWorldX = 0;
  private targetWorldY = 0;
  private onHitCb: ((state: DonorToolActionState) => void) | null = null;

  trigger(
    toolKind: DonorToolKind,
    facing: Direction,
    playerX: number,
    playerY: number,
    tilePx: number,
    onHit?: (state: DonorToolActionState) => void,
  ): boolean {
    if (this.active) return false;
    const [dx, dy] = DIRECTION_VECTORS[facing];
    const targetWorldX = playerX + dx * tilePx * 0.85;
    const targetWorldY = playerY - 2 + dy * tilePx * 0.85;

    this.active = true;
    this.toolKind = toolKind;
    this.facing = facing;
    this.elapsedMs = 0;
    this.durationMs = TOOL_DURATION_MS[toolKind];
    this.hitTriggered = false;
    this.targetWorldX = targetWorldX;
    this.targetWorldY = targetWorldY;
    this.targetTileX = Math.floor(targetWorldX / Math.max(1, tilePx));
    this.targetTileY = Math.floor(targetWorldY / Math.max(1, tilePx));
    this.onHitCb = onHit ?? null;
    return true;
  }

  update(dtMs: number): void {
    if (!this.active) return;
    this.elapsedMs += Math.max(0, dtMs);
    const progress = Math.min(1, this.elapsedMs / Math.max(1, this.durationMs));
    if (!this.hitTriggered && progress >= 0.52) {
      this.hitTriggered = true;
      this.onHitCb?.(this.getState());
    }
    if (progress >= 1) {
      this.active = false;
      this.onHitCb = null;
    }
  }

  isMovementLocked(): boolean {
    return this.active;
  }

  cancel(): void {
    this.active = false;
    this.onHitCb = null;
  }

  getState(): DonorToolActionState {
    return {
      active: this.active,
      toolKind: this.toolKind,
      facing: this.facing,
      progress: this.active ? Math.min(1, this.elapsedMs / Math.max(1, this.durationMs)) : 0,
      targetTileX: this.targetTileX,
      targetTileY: this.targetTileY,
      targetWorldX: this.targetWorldX,
      targetWorldY: this.targetWorldY,
    };
  }
}
