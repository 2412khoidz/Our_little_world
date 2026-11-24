/**
 * Memory matching (Lật thẻ trí nhớ) — solo or 2-player alternating.
 *
 * - The deck is a deterministic permutation of duplicated symbol ids derived
 *   from the explicit `seed`; `initialState` never calls `Math.random()`.
 * - `{ type: 'flip' }` reveals one card. The second flip resolves the pair
 *   immediately: a match keeps the turn and scores for the current player, a
 *   mismatch hides both cards again and (in 2-player mode) passes the turn.
 * - Flipping an already revealed/matched card or attempting a third open card
 *   is rejected with `ILLEGAL_MOVE`.
 * - Solo (`players.length === 1`) is a co-op clear with `points: 0`; a 2-player
 *   game is won by collected pair count, ties are draws. `points` is always 0
 *   because economic rewards are server-side and out of scope.
 */

import { createRng, deriveSeed } from '../rng';
import {
  MinigameRuleError,
  assertGameActive,
  assertPlayerTurn,
  type MinigameDefinition,
  type MinigameOutcome,
} from './types';

export const MEMORY_PAIRS = 8;
export const MEMORY_CARD_COUNT = MEMORY_PAIRS * 2;

export interface MemoryState {
  gameId: 'memory';
  /** Symbol ids, each duplicated exactly twice. */
  deck: number[];
  revealed: boolean[];
  matched: boolean[];
  /** Pairs collected per player index; solo uses index 0 only. */
  collected: [number, number];
  turn: 0 | 1;
  players: string[];
  finished: boolean;
}

export type MemoryAction = { type: 'flip'; cell: number };

function validateMemoryPlayers(playerIds: readonly string[]): string[] {
  if (playerIds.length < 1 || playerIds.length > 2) {
    throw new MinigameRuleError(
      'INVALID_PLAYERS',
      'Ván lật thẻ cần 1 hoặc 2 người chơi.',
    );
  }
  if (playerIds.some((id) => id.trim() === '')) {
    throw new MinigameRuleError('INVALID_PLAYERS', 'Người chơi không hợp lệ.');
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new MinigameRuleError(
      'INVALID_PLAYERS',
      'Hai người chơi phải khác nhau.',
    );
  }
  return [...playerIds];
}

function buildDeck(seed: number): number[] {
  const rng = createRng(deriveSeed(seed, 'memory'));
  const cards: number[] = [];
  for (let symbol = 0; symbol < MEMORY_PAIRS; symbol += 1) {
    cards.push(symbol, symbol);
  }
  return rng.shuffle(cards);
}

function openCardIndices(state: MemoryState): number[] {
  const open: number[] = [];
  for (let index = 0; index < state.revealed.length; index += 1) {
    if (state.revealed[index] === true && state.matched[index] !== true) {
      open.push(index);
    }
  }
  return open;
}

function finishOutcome(state: MemoryState): MinigameOutcome {
  if (!state.finished) {
    return { outcome: 'incomplete', points: 0 };
  }
  if (state.players.length === 1) {
    return { outcome: 'coop_clear', points: 0 };
  }
  const [firstCollected, secondCollected] = state.collected;
  if (firstCollected > secondCollected) {
    return {
      outcome: 'win',
      winnerId: state.players[0]!,
      points: 0,
    };
  }
  if (secondCollected > firstCollected) {
    return {
      outcome: 'win',
      winnerId: state.players[1]!,
      points: 0,
    };
  }
  return { outcome: 'draw', points: 0 };
}

export const memoryGame: MinigameDefinition<MemoryState, MemoryAction> = {
  id: 'memory',
  mode: 'turn_based',
  minPlayers: 1,
  maxPlayers: 2,

  initialState: (seed: number, playerIds: readonly string[]): MemoryState => {
    const players = validateMemoryPlayers(playerIds);
    return {
      gameId: 'memory',
      deck: buildDeck(seed),
      revealed: Array.from({ length: MEMORY_CARD_COUNT }, () => false),
      matched: Array.from({ length: MEMORY_CARD_COUNT }, () => false),
      collected: [0, 0],
      turn: 0,
      players,
      finished: false,
    };
  },

  reduce: (
    state: MemoryState,
    action: MemoryAction,
    actorId: string,
    _nowMs: number,
  ): MemoryState => {
    assertGameActive(memoryGame.isFinished(state));
    assertPlayerTurn(state.players, actorId, state.turn);

    if (
      typeof action !== 'object' ||
      action === null ||
      action.type !== 'flip'
    ) {
      throw new MinigameRuleError(
        'INVALID_ACTION',
        'Hành động không hợp lệ cho ván lật thẻ.',
      );
    }

    const cell = action.cell;
    if (
      !Number.isInteger(cell) ||
      cell < 0 ||
      cell >= state.deck.length
    ) {
      throw new MinigameRuleError('ILLEGAL_MOVE', 'Thẻ không hợp lệ.');
    }
    if (state.revealed[cell] === true || state.matched[cell] === true) {
      throw new MinigameRuleError('ILLEGAL_MOVE', 'Thẻ này đã được lật.');
    }

    const alreadyOpen = openCardIndices(state);
    if (alreadyOpen.length >= 2) {
      throw new MinigameRuleError(
        'ILLEGAL_MOVE',
        'Chỉ được lật tối đa 2 thẻ mỗi lượt.',
      );
    }

    const revealed = state.revealed.slice();
    revealed[cell] = true;
    const open = [...alreadyOpen, cell];

    if (open.length < 2) {
      return { ...state, revealed };
    }

    const first = open[0]!;
    const second = open[1]!;
    if (state.deck[first] === state.deck[second]) {
      const matched = state.matched.slice();
      matched[first] = true;
      matched[second] = true;
      const collected: [number, number] = [
        state.collected[0],
        state.collected[1],
      ];
      collected[state.turn] += 1;
      return {
        ...state,
        revealed,
        matched,
        collected,
        finished: matched.every((value) => value === true),
      };
    }

    revealed[first] = false;
    revealed[second] = false;
    return {
      ...state,
      revealed,
      turn: state.players.length === 2
        ? ((state.turn === 0 ? 1 : 0) as 0 | 1)
        : 0,
    };
  },

  isFinished: (state: MemoryState): boolean => state.finished,

  // Friendly/casual mode: the client grants no currency. Always 0 points.
  computeScore: (state: MemoryState): MinigameOutcome => finishOutcome(state),
};
