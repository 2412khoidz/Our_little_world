import { resolveContextualActions } from '../../shared/interaction/interactionResolver';
import type { FarmPlotView } from '../../shared/farming/farmSnapshotTypes';
import type { ContextualAction, ContextualResolution, HeldItemState, InteractionResolveInput } from '../../shared/interaction/interactionTypes';
import type { MapId } from '../../shared/types';
import type { InteractionFramePayload } from '../../game/eventBus';

export function isSameContextualAction(
  a: ContextualAction | null | undefined,
  b: ContextualAction | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.code !== b.code || a.targetId !== b.targetId || a.available !== b.available) return false;
  if (a.deepFarmIntent?.kind !== b.deepFarmIntent?.kind) return false;
  return a.deepFarmIntent?.kind !== 'feed_livestock' ||
    (b.deepFarmIntent?.kind === 'feed_livestock' && a.deepFarmIntent.feedSku === b.deepFarmIntent.feedSku);
}

/**
 * Returns false when the user pressed J/K on a stale prompt (map moved, left range, or prompt changed).
 */
export function validateActionAgainstLatestFrame(
  intended: ContextualResolution,
  frame: InteractionFramePayload | null,
  expectedMapId: MapId,
  heldItem: HeldItemState,
  which: 'primary' | 'secondary',
  farmPlotByIndex?: ReadonlyMap<number, FarmPlotView>,
  serverNowMs?: number,
  deepFarmActions?: InteractionResolveInput['deepFarmActions'],
  canUseHeldToy?: boolean,
): boolean {
  if (!frame || frame.mapId !== expectedMapId) return false;
  const fresh = resolveContextualActions({
    playerX: frame.playerX,
    playerY: frame.playerY,
    facing: frame.facing,
    heldItem,
    interactables: frame.interactables,
    economyPlayable: frame.economyPlayable ?? true,
    farmPlotByIndex,
    serverNowMs,
    deepFarmActions,
    canUseHeldToy,
  });
  const intendedAction = which === 'primary' ? intended.primary : intended.secondary;
  const freshAction = which === 'primary' ? fresh.primary : fresh.secondary;
  return isSameContextualAction(intendedAction, freshAction);
}