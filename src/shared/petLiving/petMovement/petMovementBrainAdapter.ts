import type { PetActionIntent, PetBrainDecisionOutput } from '../petBrainContract04B';
import type { PetMovementWorldTarget } from './petMovementContract';
import { anchorToWorldTarget, findNavAnchor } from './petHomeNavLayout';
import type { AffordanceCandidate } from '../petPrimitivesAdapter';

/** Adapts brain tick output to movement executor input — does not mutate brain state. */
export function movementTargetFromAffordances(
  affordances: readonly AffordanceCandidate[],
): PetMovementWorldTarget[] {
  const byTarget = new Map<string, AffordanceCandidate>();
  for (const a of affordances) {
    if (!byTarget.has(a.targetId)) byTarget.set(a.targetId, a);
  }
  const out: PetMovementWorldTarget[] = [];
  for (const [targetId, cand] of byTarget) {
    const anchor = findNavAnchor(targetId);
    if (!anchor) continue;
    out.push(
      anchorToWorldTarget(anchor, cand.available, cand.reachable && cand.available),
    );
  }
  return out;
}

export function selectMovementIntent(
  brainOutput: Pick<PetBrainDecisionOutput, 'currentIntent' | 'phase'>,
): PetActionIntent | null {
  if (!brainOutput.currentIntent) return null;
  const phase = brainOutput.phase;
  if (phase === 'idle' && !brainOutput.currentIntent) return null;
  return brainOutput.currentIntent;
}

/**
 * Mission 04B-2 note: server should ignore client `movement_ready` / `animation_finished`
 * as proof of consumption; verify `intent.instanceId` against authoritative action ledger +
 * stationary anchor proximity recomputed from server placement snapshot.
 */
export const MOVEMENT_SERVER_VERIFICATION_HINT_VI =
  'Xác minh phía server: tái tạo blocked grid + anchor từ placements, so khớp instanceId với ledger hành động, không tin clientPosition làm hoàn tất tiêu thụ.';