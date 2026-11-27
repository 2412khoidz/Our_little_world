/**
 * Caro (Gomoku) — friendly PvP, 15×15, exactly five (or more) in a row wins.
 *
 * Player index 0 ("A") plays disc `1` and moves first; index 1 ("B") plays `2`.
 * Reducer is pure and receives `nowMs` but never reads the clock.
 * `computeScore` always returns `points: 0` (server-side rewards only).
 */

import {
  MinigameRuleError,
  assertGameActive,
  assertPlayerTurn,
  validatePlayers,
  type MinigameDefinition,
  type MinigameOutcome,
} from './types';

export const CARO_SIZE = 15;
export const CARO_WIN_LENGTH = 5;
export const CARO_CELL_COUNT = CARO_SIZE * CARO_SIZE;

export type CaroCell = 0 | 1 | 2;

export interface CaroState {
  gameId: 'caro';
  /** 225 cells, row-major: 0 empty, 1 player A, 2 player B. */
  board: CaroCell[];
  turn: 0 | 1;
  players: [string, string];
  winner: 0 | 1 | null;
  draw: boolean;
  moves: number[];
  lastMove: number | null;
}

export type CaroAction = { type: 'place'; cell: number };

/** Row-major cell index for a grid coordinate. */
export function caroCellIndex(column: number, row: number): number {
  return row * CARO_SIZE + column;
}

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

function countInDirection(
  board: readonly CaroCell[],
  x: number,
  y: number,
  dx: number,
  dy: number,
  disc: CaroCell,
): number {
  let count = 0;
  let currentX = x + dx;
  let currentY = y + dy;
  while (
    currentX >= 0 &&
    currentX < CARO_SIZE &&
    currentY >= 0 &&
    currentY < CARO_SIZE
  ) {
    if (board[currentY * CARO_SIZE + currentX] !== disc) {
      break;
    }
    count += 1;
    currentX += dx;
    currentY += dy;
  }
  return count;
}

function hasWinningLine(
  board: readonly CaroCell[],
  cell: number,
  disc: CaroCell,
): boolean {
  const x = cell % CARO_SIZE;
  const y = Math.floor(cell / CARO_SIZE);
  for (const [dx, dy] of DIRECTIONS) {
    const run =
      1 +
      countInDirection(board, x, y, dx, dy, disc) +
      countInDirection(board, x, y, -dx, -dy, disc);
    if (run >= CARO_WIN_LENGTH) {
      return true;
    }
  }
  return false;
}

function emptyBoard(): CaroCell[] {
  return Array.from({ length: CARO_CELL_COUNT }, () => 0 as CaroCell);
}

function finishOutcome(state: CaroState): MinigameOutcome {
  if (state.winner !== null) {
    return { outcome: 'win', winnerId: state.players[state.winner], points: 0 };
  }
  if (state.draw) {
    return { outcome: 'draw', points: 0 };
  }
  return { outcome: 'incomplete', points: 0 };
}

export const caroGame: MinigameDefinition<CaroState, CaroAction> = {
  id: 'caro',
  mode: 'friendly_pvp',
  minPlayers: 2,
  maxPlayers: 2,

  initialState: (_seed: number, playerIds: readonly string[]): CaroState => {
    const players = validatePlayers(playerIds);
    return {
      gameId: 'caro',
      board: emptyBoard(),
      turn: 0,
      players,
      winner: null,
      draw: false,
      moves: [],
      lastMove: null,
    };
  },

  reduce: (
    state: CaroState,
    action: CaroAction,
    actorId: string,
    _nowMs: number,
  ): CaroState => {
    assertGameActive(caroGame.isFinished(state));
    const actorIndex = assertPlayerTurn(state.players, actorId, state.turn);

    if (
      typeof action !== 'object' ||
      action === null ||
      action.type !== 'place'
    ) {
      throw new MinigameRuleError(
        'INVALID_ACTION',
        'Hành động không hợp lệ cho ván Caro.',
      );
    }

    const cell = action.cell;
    if (!Number.isInteger(cell) || cell < 0 || cell >= CARO_CELL_COUNT) {
      throw new MinigameRuleError('ILLEGAL_MOVE', 'Ô đặt quân không hợp lệ.');
    }
    if (state.board[cell] !== 0) {
      throw new MinigameRuleError('ILLEGAL_MOVE', 'Ô này đã có quân.');
    }

    const disc: CaroCell = actorIndex === 0 ? 1 : 2;
    const board = state.board.slice();
    board[cell] = disc;
    const moves = [...state.moves, cell];
    const winner = hasWinningLine(board, cell, disc)
      ? (actorIndex as 0 | 1)
      : null;
    const draw = winner === null && board.every((value) => value !== 0);

    return {
      ...state,
      board,
      turn: state.turn === 0 ? 1 : 0,
      winner,
      draw,
      moves,
      lastMove: cell,
    };
  },

  isFinished: (state: CaroState): boolean =>
    state.winner !== null || state.draw,

  // Friendly PvP: the client never grants currency or items. Always 0 points.
  computeScore: (state: CaroState): MinigameOutcome => finishOutcome(state),
};
