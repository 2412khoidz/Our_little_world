/**
 * Shared contract for the `src/shared/minigames/` domain module (V0.2.5).
 *
 * Scope and safety rules (docs/gameplay/MINIGAME_DESIGN.md section 3):
 * - Friendly PvP between exactly two trusted people: no long-term ranking,
 *   no betting, no asset loss, no unlock requirement.
 * - The client-side reducers NEVER award economic value. Every `computeScore`
 *   in this module returns `points: 0`; any reward is decided server-side by an
 *   idempotent ledger that is out of scope for this pure domain package.
 * - Pure TypeScript: no DOM, React, Phaser, Supabase, `Date.now()` or
 *   `Math.random()`. Randomness always arrives through an explicit `seed`
 *   (`src/shared/rng.ts`) and reducers receive `nowMs` explicitly.
 * - Reducers never mutate the input state and always return a new plain
 *   JSON-serializable object.
 */

/** Result of a finished (or unfinished) mini-game. `points` is always 0 here. */
export type MinigameOutcome =
  | { outcome: 'win'; winnerId: string; points: number }
  | { outcome: 'draw'; points: number }
  | { outcome: 'coop_clear'; points: number }
  | { outcome: 'incomplete'; points: number }
  | { outcome: 'cancel'; points: number };

/** Machine-readable rejection codes thrown by reducers and helpers. */
export type MinigameErrorCode =
  | 'NOT_YOUR_TURN'
  | 'ILLEGAL_MOVE'
  | 'GAME_FINISHED'
  | 'UNKNOWN_PLAYER'
  | 'INVALID_ACTION'
  | 'INVALID_PLAYERS'
  | 'UNKNOWN_GAME';

/**
 * Typed, user-presentable rule rejection. `messageVi` is safe to surface in the
 * Vietnamese UI; `code` is for tests and logging, not for players.
 */
export class MinigameRuleError extends Error {
  readonly code: MinigameErrorCode;
  readonly messageVi: string;

  constructor(code: MinigameErrorCode, messageVi: string) {
    super(messageVi);
    this.name = 'MinigameRuleError';
    this.code = code;
    this.messageVi = messageVi;
  }
}

/**
 * The single light-weight definition every mini-game implements.
 * `reduce` is pure: it must not mutate `state` or call `Date.now()`/`Math.random()`.
 */
export interface MinigameDefinition<TState, TAction> {
  readonly id: string;
  readonly mode: 'turn_based' | 'friendly_pvp' | 'realtime_coop';
  readonly minPlayers: 1 | 2;
  readonly maxPlayers: 2;
  readonly initialState: (seed: number, playerIds: readonly string[]) => TState;
  readonly reduce: (
    state: TState,
    action: TAction,
    actorId: string,
    nowMs: number,
  ) => TState;
  readonly isFinished: (state: TState) => boolean;
  readonly computeScore: (state: TState) => MinigameOutcome;
}

/**
 * Validates the friendly-PvP roster: exactly two distinct, non-empty ids.
 * Returns a fresh tuple so callers can safely store it in state.
 */
export function validatePlayers(playerIds: readonly string[]): [string, string] {
  if (playerIds.length !== 2) {
    throw new MinigameRuleError(
      'INVALID_PLAYERS',
      'Ván chơi cần đúng 2 người chơi.',
    );
  }
  const first = playerIds[0];
  const second = playerIds[1];
  if (
    first === undefined ||
    second === undefined ||
    first.trim() === '' ||
    second.trim() === ''
  ) {
    throw new MinigameRuleError(
      'INVALID_PLAYERS',
      'Người chơi không hợp lệ.',
    );
  }
  if (first === second) {
    throw new MinigameRuleError(
      'INVALID_PLAYERS',
      'Hai người chơi phải khác nhau.',
    );
  }
  return [first, second];
}

/** Throws `GAME_FINISHED` when a reducer is called after the game ended. */
export function assertGameActive(finished: boolean): void {
  if (finished) {
    throw new MinigameRuleError('GAME_FINISHED', 'Ván chơi đã kết thúc.');
  }
}

/** Returns the player index or throws `UNKNOWN_PLAYER` for a third person. */
export function assertKnownPlayer(
  players: readonly string[],
  actorId: string,
): number {
  const index = players.indexOf(actorId);
  if (index < 0) {
    throw new MinigameRuleError(
      'UNKNOWN_PLAYER',
      'Bạn không phải người chơi trong ván này.',
    );
  }
  return index;
}

/** Validates membership plus turn order; returns the actor index. */
export function assertPlayerTurn(
  players: readonly string[],
  actorId: string,
  turn: 0 | 1,
): number {
  const index = assertKnownPlayer(players, actorId);
  if (index !== turn) {
    throw new MinigameRuleError('NOT_YOUR_TURN', 'Chưa đến lượt của bạn.');
  }
  return index;
}
