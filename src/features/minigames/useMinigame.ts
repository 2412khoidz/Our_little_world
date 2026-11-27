import { useState } from 'react';
import {
  MinigameRuleError,
  type MinigameDefinition,
  type MinigameOutcome,
} from '../../shared/minigames';

/**
 * Local hot-seat identity. Both players share one device, so the UI only needs
 * two stable ids; they are never sent anywhere (this UI is offline-only).
 */
export const MINIGAME_PLAYER_IDS: readonly [string, string] = [
  'player-1',
  'player-2',
];

/** Generic display names, per the design brief ("Người chơi 1/2"). */
export const MINIGAME_PLAYER_LABELS: readonly [string, string] = [
  'Người chơi 1',
  'Người chơi 2',
];

/**
 * Fixed seed for locally created games. The pure reducers are deterministic for
 * this seed, which keeps the hot-seat demo reproducible and testable; this UI
 * never introduces nondeterministic randomness of its own.
 */
export const MINIGAME_BASE_SEED = 20250214;

/**
 * Reducers accept `nowMs` but the four mini-games never read it. Passing a
 * constant keeps the UI render deterministic; no timer ever drives game state.
 */
const FIXED_NOW_MS = 0;

/** Human label for a known player id (falls back to the raw id). */
export function playerLabel(playerId: string): string {
  const index = MINIGAME_PLAYER_IDS.indexOf(playerId);
  return MINIGAME_PLAYER_LABELS[index] ?? playerId;
}

/** Vietnamese summary of `computeScore`; never mentions or grants currency. */
export function outcomeText(outcome: MinigameOutcome): string {
  switch (outcome.outcome) {
    case 'win':
      return `${playerLabel(outcome.winnerId)} thắng!`;
    case 'draw':
      return 'Hòa nhau';
    case 'coop_clear':
      return 'Hoàn thành';
    case 'cancel':
      return 'Đã hủy ván';
    case 'incomplete':
      return 'Đang chơi';
  }
}

export interface MinigameController<TState, TAction> {
  readonly state: TState;
  /** Last friendly rule rejection; already localized for the player. */
  readonly errorVi: string | null;
  readonly finished: boolean;
  readonly outcome: MinigameOutcome;
  /** Applies an action; returns the next state, or `null` when it was rejected. */
  readonly play: (action: TAction, actorId: string) => TState | null;
  readonly restart: () => void;
}

function toErrorVi(error: unknown): string {
  if (error instanceof MinigameRuleError) {
    return error.messageVi;
  }
  return 'Nước đi chưa hợp lệ, thử lại nhé.';
}

/**
 * Thin React adapter over a pure `MinigameDefinition`: keeps the authoritative
 * state in a single `useState` and routes every move through `reduce`, never
 * re-implementing any rule. Invalid moves are caught and surfaced in Vietnamese.
 */
export function useMinigame<TState, TAction>(
  definition: MinigameDefinition<TState, TAction>,
  playerIds: readonly [string, string] = MINIGAME_PLAYER_IDS,
  baseSeed: number = MINIGAME_BASE_SEED,
): MinigameController<TState, TAction> {
  const [round, setRound] = useState(0);
  const [state, setState] = useState<TState>(() =>
    definition.initialState(baseSeed, playerIds),
  );
  const [errorVi, setErrorVi] = useState<string | null>(null);

  function play(action: TAction, actorId: string): TState | null {
    try {
      const next = definition.reduce(state, action, actorId, FIXED_NOW_MS);
      setState(next);
      setErrorVi(null);
      return next;
    } catch (error) {
      setErrorVi(toErrorVi(error));
      return null;
    }
  }

  function restart(): void {
    const nextRound = round + 1;
    setRound(nextRound);
    // A new round gets a new derived seed so seeded decks/fleets reshuffle.
    setState(
      definition.initialState(baseSeed + nextRound * 7919, playerIds),
    );
    setErrorVi(null);
  }

  return {
    state,
    errorVi,
    finished: definition.isFinished(state),
    outcome: definition.computeScore(state),
    play,
    restart,
  };
}
