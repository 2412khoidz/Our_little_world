import type { PetActionCompletionEvent } from '../petBrainContract04B';
import type { PetFoodOfferIntent } from '../petBrainContract04B';
import type { PetMovementCompletionProposal } from '../petMovement/petMovementContract';

/** Mission 04B-3B — server validates proposals; no RPC until PR #10 lands. */
export interface PetAuthorityPort {
  readonly mode: 'noop' | 'server';
  submitMovementProposal(proposal: PetMovementCompletionProposal): void;
  submitBrainCompletion(completion: PetActionCompletionEvent): void;
  submitFoodOfferIntent(intent: PetFoodOfferIntent): void;
}

export class DevNoOpPetAuthorityPort implements PetAuthorityPort {
  readonly mode = 'noop' as const;
  private readonly seen = new Set<string>();

  submitMovementProposal(proposal: PetMovementCompletionProposal): void {
    const key = `${proposal.instanceId}:${proposal.kind}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
  }

  submitBrainCompletion(completion: PetActionCompletionEvent): void {
    const key = `brain:${completion.instanceId}:${completion.kind}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
  }

  submitFoodOfferIntent(_intent: PetFoodOfferIntent): void {
    /* presentation-only until 04B-3B */
  }
}

export function createMainGamePetAuthorityPort(): PetAuthorityPort {
  return new DevNoOpPetAuthorityPort();
}