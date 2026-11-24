/**
 * Othello / Reversi — friendly PvP, 8×8, standard opening position.
 *
 * Player index 0 ("A") is black (`1`) and moves first; index 1 ("B") is white
 * (`2`). Rule assumptions:
 * - A move must flip at least one opposing disc.
 * - When the next player has no legal move but the mover still does, the turn
 *   stays with the mover and `passed` becomes `true` (automatic pass, standard
 *   Reversi flow). The explicit `{ type: 'pass' }` action is accepted only when
 *   the current player truly has no legal move; it then hands over the turn or
 *   ends the game when both sides are stuck.
 * - The game ends when neither side has a legal move (which includes a full
 *   board) or when both sides pass. The winner is decided by disc count, and a
 *   tie is a draw (`winner: null` with `finished: true`).
 *
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

export const OTHELLO_SIZE = 8;
export const OTHELLO_CELL_COUNT = OTHELLO_SIZE * OTHELLO_SIZE;

export type OthelloDisc = 0 | 1 | 2;

export interface OthelloState {
  gameId: 'othello';
  /** 64 cells, row-major: 0 empty, 1 black (player A), 2 white (player B). */
  board: OthelloDisc[];
  turn: 0 | 1;
  players: [string, string];
  /** True when the side that was due to move had to skip (auto or explicit pass). */
  passed: boolean;
  finished: boolean;
  /** `null` while unfinished or on a draw. */
  winner: 0 | 1 | null;
  moves: number[];
}

export type OthelloAction = { type: 'place'; cell: number } | { type: 'pass' };

/** Row-major cell index for a grid coordinate. */
export function othelloCellIndex(column: number, row: number): number {
  return row * OTHELLO_SIZE + column;
}

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function discForTurn(turn: 0 | 1): 1 | 2 {
  return turn === 0 ? 1 : 2;
}

function opponentOf(disc: 1 | 2): 1 | 2 {
  return disc === 1 ? 2 : 1;
}

function isOnBoard(x: number, y: number): boolean {
  return x >= 0 && x < OTHELLO_SIZE && y >= 0 && y < OTHELLO_SIZE;
}

/** Standard opening: white d4/e5, black d5/e4. */
export function createInitialOthelloBoard(): OthelloDisc[] {
  const board = Array.from({ length: OTHELLO_CELL_COUNT }, () => 0 as OthelloDisc);
  board[othelloCellIndex(3, 3)] = 2;
  board[othelloCellIndex(4, 4)] = 2;
  board[othelloCellIndex(3, 4)] = 1;
  board[othelloCellIndex(4, 3)] = 1;
  return board;
}

/** Returns the indices of the opponent discs a hypothetical move would flip. */
function collectFlips(
  board: readonly OthelloDisc[],
  cell: number,
  disc: 1 | 2,
): number[] {
  const x = cell % OTHELLO_SIZE;
  const y = Math.floor(cell / OTHELLO_SIZE);
  const opponent = opponentOf(disc);
  const flips: number[] = [];

  for (const [dx, dy] of DIRECTIONS) {
    const line: number[] = [];
    let currentX = x + dx;
    let currentY = y + dy;
    while (isOnBoard(currentX, currentY)) {
      const index = currentY * OTHELLO_SIZE + currentX;
      const value = board[index] ?? 0;
      if (value === disc) {
        if (line.length > 0) {
          flips.push(...line);
        }
        break;
      }
      if (value !== opponent) {
        break;
      }
      line.push(index);
      currentX += dx;
      currentY += dy;
    }
  }
  return flips;
}

/** All legal placement cells for the side to move, sorted ascending. */
export function legalMoves(state: OthelloState): number[] {
  const disc = discForTurn(state.turn);
  const moves: number[] = [];
  for (let cell = 0; cell < OTHELLO_CELL_COUNT; cell += 1) {
    if (state.board[cell] !== 0) {
      continue;
    }
    if (collectFlips(state.board, cell, disc).length > 0) {
      moves.push(cell);
    }
  }
  return moves;
}

function hasAnyMove(board: readonly OthelloDisc[], disc: 1 | 2): boolean {
  for (let cell = 0; cell < OTHELLO_CELL_COUNT; cell += 1) {
    if (board[cell] === 0 && collectFlips(board, cell, disc).length > 0) {
      return true;
    }
  }
  return false;
}

/** `[blackDiscs, whiteDiscs]`. */
export function othelloDiscCounts(
  board: readonly OthelloDisc[],
): readonly [number, number] {
  let black = 0;
  let white = 0;
  for (const value of board) {
    if (value === 1) {
      black += 1;
    } else if (value === 2) {
      white += 1;
    }
  }
  return [black, white];
}

/** Winner by disc count, `null` on a tie. */
export function othelloWinner(board: readonly OthelloDisc[]): 0 | 1 | null {
  const [black, white] = othelloDiscCounts(board);
  if (black > white) {
    return 0;
  }
  if (white > black) {
    return 1;
  }
  return null;
}

function afterPlacement(
  state: OthelloState,
  board: OthelloDisc[],
  cell: number,
): OthelloState {
  const moves = [...state.moves, cell];
  const opponent = (state.turn === 0 ? 1 : 0) as 0 | 1;

  if (hasAnyMove(board, discForTurn(opponent))) {
    return { ...state, board, moves, turn: opponent, passed: false };
  }
  if (hasAnyMove(board, discForTurn(state.turn))) {
    // Opponent auto-passes; the mover keeps the turn.
    return { ...state, board, moves, passed: true };
  }
  return {
    ...state,
    board,
    moves,
    finished: true,
    winner: othelloWinner(board),
    passed: true,
  };
}

function finishOutcome(state: OthelloState): MinigameOutcome {
  if (!state.finished) {
    return { outcome: 'incomplete', points: 0 };
  }
  const winner = othelloWinner(state.board);
  if (winner === null) {
    return { outcome: 'draw', points: 0 };
  }
  return { outcome: 'win', winnerId: state.players[winner], points: 0 };
}

export const othelloGame: MinigameDefinition<OthelloState, OthelloAction> = {
  id: 'othello',
  mode: 'friendly_pvp',
  minPlayers: 2,
  maxPlayers: 2,

  initialState: (_seed: number, playerIds: readonly string[]): OthelloState => {
    const players = validatePlayers(playerIds);
    return {
      gameId: 'othello',
      board: createInitialOthelloBoard(),
      turn: 0,
      players,
      passed: false,
      finished: false,
      winner: null,
      moves: [],
    };
  },

  reduce: (
    state: OthelloState,
    action: OthelloAction,
    actorId: string,
    _nowMs: number,
  ): OthelloState => {
    assertGameActive(othelloGame.isFinished(state));
    assertPlayerTurn(state.players, actorId, state.turn);

    if (
      typeof action !== 'object' ||
      action === null ||
      (action.type !== 'place' && action.type !== 'pass')
    ) {
      throw new MinigameRuleError(
        'INVALID_ACTION',
        'Hành động không hợp lệ cho ván Othello.',
      );
    }

    if (action.type === 'pass') {
      if (legalMoves(state).length > 0) {
        throw new MinigameRuleError(
          'ILLEGAL_MOVE',
          'Bạn vẫn còn nước đi hợp lệ, không thể bỏ lượt.',
        );
      }
      const other = (state.turn === 0 ? 1 : 0) as 0 | 1;
      if (hasAnyMove(state.board, discForTurn(other))) {
        return { ...state, turn: other, passed: true };
      }
      return {
        ...state,
        finished: true,
        winner: othelloWinner(state.board),
        passed: true,
      };
    }

    const cell = action.cell;
    if (
      !Number.isInteger(cell) ||
      cell < 0 ||
      cell >= OTHELLO_CELL_COUNT
    ) {
      throw new MinigameRuleError('ILLEGAL_MOVE', 'Ô đặt quân không hợp lệ.');
    }
    if (state.board[cell] !== 0) {
      throw new MinigameRuleError('ILLEGAL_MOVE', 'Ô này đã có quân.');
    }

    const disc = discForTurn(state.turn);
    const flips = collectFlips(state.board, cell, disc);
    if (flips.length === 0) {
      throw new MinigameRuleError(
        'ILLEGAL_MOVE',
        'Nước đi này không lật được quân nào.',
      );
    }

    const board = state.board.slice();
    board[cell] = disc;
    for (const flipCell of flips) {
      board[flipCell] = disc;
    }
    return afterPlacement(state, board, cell);
  },

  isFinished: (state: OthelloState): boolean => state.finished,

  // Friendly PvP: no currency/items are granted by the client. Always 0 points.
  computeScore: (state: OthelloState): MinigameOutcome => finishOutcome(state),
};
