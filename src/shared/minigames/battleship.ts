/**
 * Battleship — friendly PvP, 10×10, standard five-ship fleet.
 *
 * - Both fleets are placed by the explicit, seeded RNG in `initialState`.
 *   Placement is deterministic for a given `(seed, player index)`, never
 *   overlaps, and does not enforce any "no touching" restriction (ships may sit
 *   next to each other, including diagonally).
 * - The authoritative state keeps each player's ships private. Clients must use
 *   `publicStateFor(state, viewerId)` (no ship coordinates at all) or
 *   `playerPrivateState(state, playerId)` (only that owner's fleet).
 * - `publicStateFor` exposes only: board size, both shot grids (0 unknown,
 *   1 miss, 2 hit), already-sunk ship ids/names/sizes, turn, finished/winner.
 * - Firing at a cell that was already shot, out of turn or after the game ends
 *   is rejected with a `MinigameRuleError`.
 * - `computeScore` always returns `points: 0` (server-side rewards only).
 */

import { createRng, deriveSeed } from '../rng';
import {
  MinigameRuleError,
  assertGameActive,
  assertKnownPlayer,
  assertPlayerTurn,
  validatePlayers,
  type MinigameDefinition,
  type MinigameOutcome,
} from './types';

export const BATTLESHIP_SIZE = 10;
export const BATTLESHIP_CELL_COUNT = BATTLESHIP_SIZE * BATTLESHIP_SIZE;

/** 0 = unknown, 1 = miss, 2 = hit. */
export type BattleshipShot = 0 | 1 | 2;

export interface BattleshipShipSpec {
  readonly id: string;
  readonly name: string;
  readonly size: number;
}

export const BATTLESHIP_FLEET_SPEC: readonly BattleshipShipSpec[] = [
  { id: 'carrier', name: 'Tàu sân bay', size: 5 },
  { id: 'battleship', name: 'Thiết giáp hạm', size: 4 },
  { id: 'cruiser', name: 'Tàu tuần dương', size: 3 },
  { id: 'submarine', name: 'Tàu ngầm', size: 3 },
  { id: 'destroyer', name: 'Tàu khu trục', size: 2 },
];

export interface BattleshipShip {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly cells: number[];
}

/** Per-player board. `ships` is private domain data and must not be projected. */
export interface BattleshipBoard {
  readonly playerId: string;
  readonly ships: BattleshipShip[];
  readonly shots: BattleshipShot[];
}

export interface BattleshipState {
  gameId: 'battleship';
  size: 10;
  players: [string, string];
  boards: [BattleshipBoard, BattleshipBoard];
  turn: 0 | 1;
  finished: boolean;
  winner: 0 | 1 | null;
  /** Flat list of every fired cell, useful for replay/audit. */
  firedCells: number[];
}

export type BattleshipAction = { type: 'fire'; cell: number };

/** Projection of a sunk ship: no coordinates are exposed. */
export interface BattleshipPublicShip {
  readonly id: string;
  readonly name: string;
  readonly size: number;
}

export interface BattleshipPublicBoard {
  readonly playerId: string;
  readonly shots: BattleshipShot[];
  readonly sunkShips: BattleshipPublicShip[];
}

/** Safe snapshot for a client. Contains no `ships` and no fleet coordinates. */
export interface BattleshipPublicState {
  gameId: 'battleship';
  size: 10;
  players: [string, string];
  turn: 0 | 1;
  finished: boolean;
  winnerId: string | null;
  boards: [BattleshipPublicBoard, BattleshipPublicBoard];
}

/** Owner-only snapshot (`playerPrivateState`). */
export interface BattleshipPrivateState {
  playerId: string;
  ships: BattleshipShip[];
  shots: BattleshipShot[];
  sunkShipIds: string[];
}

export function battleshipCellIndex(column: number, row: number): number {
  return row * BATTLESHIP_SIZE + column;
}

function emptyShots(): BattleshipShot[] {
  return Array.from({ length: BATTLESHIP_CELL_COUNT }, () => 0 as BattleshipShot);
}

function cellsFor(
  size: number,
  row: number,
  column: number,
  orientation: 'horizontal' | 'vertical',
): number[] {
  const cells: number[] = [];
  for (let offset = 0; offset < size; offset += 1) {
    const cellRow = orientation === 'vertical' ? row + offset : row;
    const cellColumn = orientation === 'horizontal' ? column + offset : column;
    cells.push(cellRow * BATTLESHIP_SIZE + cellColumn);
  }
  return cells;
}

function isFree(cells: readonly number[], occupied: ReadonlySet<number>): boolean {
  return cells.every((cell) => !occupied.has(cell));
}

function randomPlacement(
  rng: ReturnType<typeof createRng>,
  size: number,
  occupied: ReadonlySet<number>,
): number[] | null {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const horizontal = rng.chance(0.5);
    const cells = horizontal
      ? cellsFor(
          size,
          rng.int(0, BATTLESHIP_SIZE),
          rng.int(0, BATTLESHIP_SIZE - size + 1),
          'horizontal',
        )
      : cellsFor(
          size,
          rng.int(0, BATTLESHIP_SIZE - size + 1),
          rng.int(0, BATTLESHIP_SIZE),
          'vertical',
        );
    if (isFree(cells, occupied)) {
      return cells;
    }
  }
  return null;
}

function firstLegalPlacement(
  size: number,
  occupied: ReadonlySet<number>,
): number[] {
  for (let row = 0; row < BATTLESHIP_SIZE; row += 1) {
    for (let column = 0; column < BATTLESHIP_SIZE; column += 1) {
      if (column + size <= BATTLESHIP_SIZE) {
        const horizontal = cellsFor(size, row, column, 'horizontal');
        if (isFree(horizontal, occupied)) {
          return horizontal;
        }
      }
      if (row + size <= BATTLESHIP_SIZE) {
        const vertical = cellsFor(size, row, column, 'vertical');
        if (isFree(vertical, occupied)) {
          return vertical;
        }
      }
    }
  }
  throw new MinigameRuleError(
    'INVALID_ACTION',
    'Không thể xếp hạm đội cho ván này.',
  );
}

function placeFleet(seed: number, playerIndex: number): BattleshipShip[] {
  const rng = createRng(deriveSeed(seed, 'battleship', playerIndex));
  const occupied = new Set<number>();
  const ships: BattleshipShip[] = [];

  for (const spec of BATTLESHIP_FLEET_SPEC) {
    const cells =
      randomPlacement(rng, spec.size, occupied) ??
      firstLegalPlacement(spec.size, occupied);
    for (const cell of cells) {
      occupied.add(cell);
    }
    ships.push({
      id: spec.id,
      name: spec.name,
      size: spec.size,
      cells: [...cells].sort((left, right) => left - right),
    });
  }
  return ships;
}

function isShipSunk(board: BattleshipBoard, ship: BattleshipShip): boolean {
  return ship.cells.every((cell) => board.shots[cell] === 2);
}

function sunkShips(board: BattleshipBoard): BattleshipShip[] {
  return board.ships.filter((ship) => isShipSunk(board, ship));
}

function isFleetDestroyed(board: BattleshipBoard): boolean {
  return board.ships.every((ship) => isShipSunk(board, ship));
}

function toPublicBoard(board: BattleshipBoard): BattleshipPublicBoard {
  return {
    playerId: board.playerId,
    shots: [...board.shots],
    sunkShips: sunkShips(board).map((ship) => ({
      id: ship.id,
      name: ship.name,
      size: ship.size,
    })),
  };
}

/**
 * Privacy boundary: this is the ONLY snapshot a client may render for the
 * opponent. It deliberately omits every ship coordinate (both fleets), even
 * for sunk ships.
 */
export function publicStateFor(
  state: BattleshipState,
  viewerId: string,
): BattleshipPublicState {
  assertKnownPlayer(state.players, viewerId);
  return {
    gameId: 'battleship',
    size: BATTLESHIP_SIZE,
    players: [...state.players] as [string, string],
    turn: state.turn,
    finished: state.finished,
    winnerId: state.winner === null ? null : state.players[state.winner],
    boards: [toPublicBoard(state.boards[0]), toPublicBoard(state.boards[1])],
  };
}

/** Owner-only fleet view. Any other id (including a third person) throws. */
export function playerPrivateState(
  state: BattleshipState,
  playerId: string,
): BattleshipPrivateState {
  const index = assertKnownPlayer(state.players, playerId);
  const boardIndex = index === 0 ? 0 : 1;
  const board = state.boards[boardIndex];
  return {
    playerId,
    ships: board.ships.map((ship) => ({
      ...ship,
      cells: [...ship.cells],
    })),
    shots: [...board.shots],
    sunkShipIds: sunkShips(board).map((ship) => ship.id),
  };
}

function finishOutcome(state: BattleshipState): MinigameOutcome {
  if (!state.finished) {
    return { outcome: 'incomplete', points: 0 };
  }
  if (state.winner === null) {
    return { outcome: 'draw', points: 0 };
  }
  return { outcome: 'win', winnerId: state.players[state.winner], points: 0 };
}

export const battleshipGame: MinigameDefinition<
  BattleshipState,
  BattleshipAction
> = {
  id: 'battleship',
  mode: 'friendly_pvp',
  minPlayers: 2,
  maxPlayers: 2,

  initialState: (
    seed: number,
    playerIds: readonly string[],
  ): BattleshipState => {
    const players = validatePlayers(playerIds);
    return {
      gameId: 'battleship',
      size: BATTLESHIP_SIZE,
      players,
      boards: [
        { playerId: players[0], ships: placeFleet(seed, 0), shots: emptyShots() },
        { playerId: players[1], ships: placeFleet(seed, 1), shots: emptyShots() },
      ],
      turn: 0,
      finished: false,
      winner: null,
      firedCells: [],
    };
  },

  reduce: (
    state: BattleshipState,
    action: BattleshipAction,
    actorId: string,
    _nowMs: number,
  ): BattleshipState => {
    assertGameActive(battleshipGame.isFinished(state));
    assertPlayerTurn(state.players, actorId, state.turn);

    if (
      typeof action !== 'object' ||
      action === null ||
      action.type !== 'fire'
    ) {
      throw new MinigameRuleError(
        'INVALID_ACTION',
        'Hành động không hợp lệ cho ván bắn tàu.',
      );
    }

    const cell = action.cell;
    if (
      !Number.isInteger(cell) ||
      cell < 0 ||
      cell >= BATTLESHIP_CELL_COUNT
    ) {
      throw new MinigameRuleError('ILLEGAL_MOVE', 'Ô bắn không hợp lệ.');
    }

    const targetIndex = state.turn === 0 ? 1 : 0;
    const target = state.boards[targetIndex];
    if (target.shots[cell] !== 0) {
      throw new MinigameRuleError('ILLEGAL_MOVE', 'Ô này đã bị bắn rồi.');
    }

    const hit = target.ships.some((ship) => ship.cells.includes(cell));
    const shots = [...target.shots];
    shots[cell] = hit ? 2 : 1;
    const updatedTarget: BattleshipBoard = { ...target, shots };
    const boards: [BattleshipBoard, BattleshipBoard] =
      targetIndex === 0
        ? [updatedTarget, state.boards[1]]
        : [state.boards[0], updatedTarget];

    const finished = isFleetDestroyed(updatedTarget);
    const winner = finished ? state.turn : null;

    return {
      ...state,
      boards,
      turn: finished
        ? state.turn
        : ((state.turn === 0 ? 1 : 0) as 0 | 1),
      finished,
      winner,
      firedCells: [...state.firedCells, cell],
    };
  },

  isFinished: (state: BattleshipState): boolean => state.finished,

  // Friendly PvP: the client grants no currency/items. Always 0 points.
  computeScore: (state: BattleshipState): MinigameOutcome =>
    finishOutcome(state),
};
