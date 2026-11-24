/**
 * P5 — mini-game privacy contract.
 *
 * The GPT review found that a session envelope carries both Battleship fleets and
 * that `playerPrivateState` trusts whatever player id the caller passes. This
 * module separates the server-side envelope from the per-viewer DTO and adds a
 * compare-and-swap action submission so a stale client cannot replay a move.
 *
 * Important: a player id is only trusted when the caller marks the viewer as
 * authenticated by the session layer. Passing a bare id is never enough.
 */

import { MinigameRuleError } from './types';
import type { MinigameDefinition } from './types';
import { publicStateFor as battleshipPublicState } from './battleship';
import type { BattleshipState } from './battleship';

export interface ViewerIdentity {
  readonly viewerId: string;
  /** Must be set by the authenticated session layer, never by the client. */
  readonly authenticated: boolean;
}

/** Server-side session envelope. Never send this to a client as-is. */
export interface SessionEnvelope<TState> {
  readonly sessionId: string;
  readonly gameId: string;
  readonly version: number;
  readonly state: TState;
}

export interface PublicSession<TState> {
  readonly sessionId: string;
  readonly gameId: string;
  readonly version: number;
  readonly viewerId: string;
  readonly state: TState;
}

export type ProjectionFailure = {
  readonly ok: false;
  readonly code: 'UNKNOWN_GAME' | 'UNAUTHENTICATED_VIEWER' | 'NOT_A_PLAYER';
  readonly messageVi: string;
};

export type ActionFailure = {
  readonly ok: false;
  readonly code: 'STALE_VERSION' | 'RULE_VIOLATION' | 'UNKNOWN_PLAYER' | 'UNKNOWN_GAME';
  readonly messageVi: string;
};

export type ActionSuccess<TState> = {
  readonly ok: true;
  readonly envelope: SessionEnvelope<TState>;
};

/** Viewer-scoped Battleship projection: no opponent ship coordinates leak. */
export function projectBattleshipForViewer(
  envelope: SessionEnvelope<BattleshipState>,
  viewer: ViewerIdentity,
): PublicSession<ReturnType<typeof battleshipPublicState>> | ProjectionFailure {
  if (envelope.gameId !== 'battleship') {
    return { ok: false, code: 'UNKNOWN_GAME', messageVi: 'Phiên không phải Bắn tàu.' };
  }
  if (!viewer.authenticated) {
    return {
      ok: false,
      code: 'UNAUTHENTICATED_VIEWER',
      messageVi: 'Danh tính người xem chưa được xác thực bởi phiên.',
    };
  }
  if (!envelope.state.players.includes(viewer.viewerId)) {
    return {
      ok: false,
      code: 'NOT_A_PLAYER',
      messageVi: 'Người xem không thuộc phiên chơi này.',
    };
  }
  return {
    sessionId: envelope.sessionId,
    gameId: envelope.gameId,
    version: envelope.version,
    viewerId: viewer.viewerId,
    state: battleshipPublicState(envelope.state, viewer.viewerId),
  };
}

/**
 * Compare-and-swap action submission. The reducer stays pure; this wrapper adds
 * the version guard and turns rule errors into structured failures.
 */
export function submitSessionAction<TState, TAction>(
  definition: MinigameDefinition<TState, TAction>,
  envelope: SessionEnvelope<TState>,
  input: {
    readonly action: TAction;
    readonly actorId: string;
    readonly expectedVersion: number;
    readonly nowMs: number;
  },
): ActionSuccess<TState> | ActionFailure {
  if (envelope.gameId !== definition.id) {
    return { ok: false, code: 'UNKNOWN_GAME', messageVi: 'Phiên không khớp mini-game.' };
  }
  if (input.expectedVersion !== envelope.version) {
    return {
      ok: false,
      code: 'STALE_VERSION',
      messageVi: `Phiên đã thay đổi: yêu cầu version ${input.expectedVersion}, hiện tại ${envelope.version}`,
    };
  }
  try {
    const state = definition.reduce(envelope.state, input.action, input.actorId, input.nowMs);
    return {
      ok: true,
      envelope: { ...envelope, version: envelope.version + 1, state },
    };
  } catch (error) {
    if (error instanceof MinigameRuleError) {
      return {
        ok: false,
        code: error.code === 'UNKNOWN_PLAYER' ? 'UNKNOWN_PLAYER' : 'RULE_VIOLATION',
        messageVi: error.messageVi,
      };
    }
    throw error;
  }
}

/** Fields that must never appear in a client-bound payload. */
export const PRIVATE_SESSION_KEYS = ['state.ships', 'ships', 'fleet', 'privateState'] as const;

/** Guard used by tests and adapters before publishing a payload. */
export function assertNoPrivateFields(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  if (/"ships"\s*:/.test(serialized) || /"fleet"\s*:/.test(serialized)) {
    throw new Error('Payload chứa dữ liệu hạm đội riêng tư');
  }
}
