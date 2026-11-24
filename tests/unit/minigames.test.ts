import { describe, expect, it } from 'vitest';
import {
  BATTLESHIP_CELL_COUNT,
  BATTLESHIP_FLEET_SPEC,
  CARO_CELL_COUNT,
  MINIGAME_IDS,
  MINIGAME_REGISTRY,
  MinigameRuleError,
  OTHELLO_CELL_COUNT,
  battleshipGame,
  caroCellIndex,
  caroGame,
  createSession,
  getMinigame,
  legalMoves,
  memoryGame,
  othelloCellIndex,
  othelloDiscCounts,
  othelloGame,
  playerPrivateState,
  publicStateFor,
  validatePlayers,
  type BattleshipAction,
  type BattleshipState,
  type CaroAction,
  type CaroCell,
  type CaroState,
  type MemoryState,
  type MinigameErrorCode,
  type MinigameOutcome,
  type OthelloDisc,
  type OthelloState,
} from '../../src/shared/minigames';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function expectRuleError(run: () => unknown, code: MinigameErrorCode): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(MinigameRuleError);
    expect((error as MinigameRuleError).code).toBe(code);
    return;
  }
  throw new Error(`Expected a MinigameRuleError with code ${code}`);
}

function expectNoEconomicReward(outcome: MinigameOutcome): void {
  expect(outcome.points).toBe(0);
  const unknownKeys = Object.keys(outcome).filter(
    (key) => key !== 'outcome' && key !== 'winnerId' && key !== 'points',
  );
  expect(unknownKeys).toEqual([]);
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }
    return keys;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

function collectNumberArrays(
  value: unknown,
  out: number[][] = [],
): number[][] {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((entry) => typeof entry === 'number')) {
      out.push(value as number[]);
      return out;
    }
    for (const item of value) {
      collectNumberArrays(item, out);
    }
    return out;
  }
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) {
      collectNumberArrays(child, out);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Shared contract: validatePlayers                                  */
/* ------------------------------------------------------------------ */

describe('shared minigame contract', () => {
  it('validatePlayers accepts exactly two distinct non-empty ids', () => {
    expect(validatePlayers(['alice', 'bob'])).toEqual(['alice', 'bob']);
  });

  it('validatePlayers rejects wrong counts, duplicates and blank ids', () => {
    expectRuleError(() => validatePlayers(['alice']), 'INVALID_PLAYERS');
    expectRuleError(
      () => validatePlayers(['alice', 'bob', 'carol']),
      'INVALID_PLAYERS',
    );
    expectRuleError(() => validatePlayers(['alice', 'alice']), 'INVALID_PLAYERS');
    expectRuleError(() => validatePlayers(['', 'bob']), 'INVALID_PLAYERS');
  });

  it('exposes a typed rejection error with a Vietnamese message', () => {
    const error = new MinigameRuleError('NOT_YOUR_TURN', 'Chưa đến lượt.');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MinigameRuleError');
    expect(error.code).toBe('NOT_YOUR_TURN');
    expect(error.messageVi).toBe('Chưa đến lượt.');
  });
});

/* ------------------------------------------------------------------ */
/* Caro                                                               */
/* ------------------------------------------------------------------ */

function caroPlay(
  moves: ReadonlyArray<readonly [number, string]>,
): CaroState {
  let state = caroGame.initialState(11, ['alice', 'bob']);
  for (const [cell, player] of moves) {
    state = caroGame.reduce(state, { type: 'place', cell }, player, 0);
  }
  return state;
}

describe('caro', () => {
  it('creates an empty 15x15 board with Alice moving first', () => {
    const state = caroGame.initialState(123, ['alice', 'bob']);
    expect(state.gameId).toBe('caro');
    expect(state.board).toHaveLength(CARO_CELL_COUNT);
    expect(state.board.every((cell) => cell === 0)).toBe(true);
    expect(state.players).toEqual(['alice', 'bob']);
    expect(state.turn).toBe(0);
    expect(state.winner).toBeNull();
    expect(state.draw).toBe(false);
    expect(state.lastMove).toBeNull();
  });

  it('rejects an off-turn move', () => {
    const state = caroGame.initialState(1, ['alice', 'bob']);
    expectRuleError(
      () => caroGame.reduce(state, { type: 'place', cell: 0 }, 'bob', 0),
      'NOT_YOUR_TURN',
    );
  });

  it('rejects a third player', () => {
    const state = caroGame.initialState(1, ['alice', 'bob']);
    expectRuleError(
      () => caroGame.reduce(state, { type: 'place', cell: 0 }, 'carol', 0),
      'UNKNOWN_PLAYER',
    );
  });

  it('rejects an occupied cell', () => {
    const state = caroPlay([[0, 'alice']]);
    expectRuleError(
      () => caroGame.reduce(state, { type: 'place', cell: 0 }, 'bob', 0),
      'ILLEGAL_MOVE',
    );
  });

  it('rejects invalid cell indices and malformed actions', () => {
    const state = caroGame.initialState(1, ['alice', 'bob']);
    expectRuleError(
      () => caroGame.reduce(state, { type: 'place', cell: -1 }, 'alice', 0),
      'ILLEGAL_MOVE',
    );
    expectRuleError(
      () => caroGame.reduce(state, { type: 'place', cell: 225 }, 'alice', 0),
      'ILLEGAL_MOVE',
    );
    expectRuleError(
      () => caroGame.reduce(state, { type: 'place', cell: 1.5 }, 'alice', 0),
      'ILLEGAL_MOVE',
    );
    expectRuleError(
      () =>
        caroGame.reduce(
          state,
          { type: 'nope' } as unknown as CaroAction,
          'alice',
          0,
        ),
      'INVALID_ACTION',
    );
  });

  it('detects a horizontal five-in-a-row', () => {
    const state = caroPlay([
      [0, 'alice'],
      [5, 'bob'],
      [1, 'alice'],
      [6, 'bob'],
      [2, 'alice'],
      [7, 'bob'],
      [3, 'alice'],
      [110, 'bob'],
      [4, 'alice'],
    ]);
    expect(state.winner).toBe(0);
    expect(caroGame.isFinished(state)).toBe(true);
    expect(caroGame.computeScore(state)).toEqual({
      outcome: 'win',
      winnerId: 'alice',
      points: 0,
    });
    expectNoEconomicReward(caroGame.computeScore(state));
  });

  it('detects a vertical five-in-a-row', () => {
    const state = caroPlay([
      [0, 'alice'],
      [1, 'bob'],
      [15, 'alice'],
      [2, 'bob'],
      [30, 'alice'],
      [3, 'bob'],
      [45, 'alice'],
      [4, 'bob'],
      [60, 'alice'],
    ]);
    expect(state.winner).toBe(0);
    expect(caroGame.computeScore(state).outcome).toBe('win');
  });

  it('detects five-in-a-row on both diagonals', () => {
    const mainDiagonal = caroPlay([
      [0, 'alice'],
      [1, 'bob'],
      [16, 'alice'],
      [2, 'bob'],
      [32, 'alice'],
      [3, 'bob'],
      [48, 'alice'],
      [5, 'bob'],
      [64, 'alice'],
    ]);
    expect(mainDiagonal.winner).toBe(0);

    const antiDiagonal = caroPlay([
      [60, 'alice'],
      [0, 'bob'],
      [46, 'alice'],
      [1, 'bob'],
      [32, 'alice'],
      [2, 'bob'],
      [18, 'alice'],
      [3, 'bob'],
      [4, 'alice'],
    ]);
    expect(antiDiagonal.winner).toBe(0);
  });

  it('ends in a draw when the board fills without a line', () => {
    const board: CaroCell[] = [];
    for (let row = 0; row < 15; row += 1) {
      for (let column = 0; column < 15; column += 1) {
        const index = caroCellIndex(column, row);
        const disc = (column + 2 * row) % 8 < 4 ? 1 : 2;
        board.push(index === CARO_CELL_COUNT - 1 ? 0 : (disc as CaroCell));
      }
    }
    const crafted: CaroState = {
      gameId: 'caro',
      board,
      turn: 0,
      players: ['alice', 'bob'],
      winner: null,
      draw: false,
      moves: [],
      lastMove: null,
    };
    const finished = caroGame.reduce(
      crafted,
      { type: 'place', cell: CARO_CELL_COUNT - 1 },
      'alice',
      0,
    );
    expect(finished.winner).toBeNull();
    expect(finished.draw).toBe(true);
    expect(caroGame.isFinished(finished)).toBe(true);
    expect(caroGame.computeScore(finished)).toEqual({
      outcome: 'draw',
      points: 0,
    });
  });

  it('rejects any move after the game is finished', () => {
    const state = caroPlay([
      [0, 'alice'],
      [5, 'bob'],
      [1, 'alice'],
      [6, 'bob'],
      [2, 'alice'],
      [7, 'bob'],
      [3, 'alice'],
      [110, 'bob'],
      [4, 'alice'],
    ]);
    expectRuleError(
      () => caroGame.reduce(state, { type: 'place', cell: 200 }, 'bob', 0),
      'GAME_FINISHED',
    );
  });

  it('replays the same move list into an identical state', () => {
    const sequence: ReadonlyArray<readonly [number, string]> = [
      [112, 'alice'],
      [113, 'bob'],
      [127, 'alice'],
      [128, 'bob'],
      [97, 'alice'],
      [98, 'bob'],
    ];
    const first = caroPlay(sequence);
    const second = caroPlay(sequence);
    expect(second).toEqual(first);
  });

  it('round-trips through JSON', () => {
    const state = caroPlay([
      [112, 'alice'],
      [113, 'bob'],
      [127, 'alice'],
    ]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

/* ------------------------------------------------------------------ */
/* Othello                                                            */
/* ------------------------------------------------------------------ */

function othelloFromDiscs(
  discs: ReadonlyArray<readonly [number, number, OthelloDisc]>,
  turn: 0 | 1 = 0,
): OthelloState {
  const board = Array.from(
    { length: OTHELLO_CELL_COUNT },
    () => 0 as OthelloDisc,
  );
  for (const [column, row, disc] of discs) {
    board[othelloCellIndex(column, row)] = disc;
  }
  return {
    gameId: 'othello',
    board,
    turn,
    players: ['alice', 'bob'],
    passed: false,
    finished: false,
    winner: null,
    moves: [],
  };
}

function othelloFullBoard(blackCells: number, turn: 0 | 1): OthelloState {
  const board = Array.from(
    { length: OTHELLO_CELL_COUNT },
    (_, index) => (index < blackCells ? 1 : 2) as OthelloDisc,
  );
  return {
    gameId: 'othello',
    board,
    turn,
    players: ['alice', 'bob'],
    passed: false,
    finished: false,
    winner: null,
    moves: [],
  };
}

describe('othello', () => {
  it('starts from the standard four-disc opening position', () => {
    const state = othelloGame.initialState(1, ['alice', 'bob']);
    expect(state.board).toHaveLength(OTHELLO_CELL_COUNT);
    expect(state.board[othelloCellIndex(3, 3)]).toBe(2);
    expect(state.board[othelloCellIndex(4, 4)]).toBe(2);
    expect(state.board[othelloCellIndex(3, 4)]).toBe(1);
    expect(state.board[othelloCellIndex(4, 3)]).toBe(1);
    expect(othelloDiscCounts(state.board)).toEqual([2, 2]);
    expect(state.turn).toBe(0);
    expect(state.passed).toBe(false);
    expect(state.finished).toBe(false);
  });

  it('lists the standard four legal moves for black at the start', () => {
    const state = othelloGame.initialState(1, ['alice', 'bob']);
    expect(legalMoves(state)).toEqual([19, 26, 37, 44]);
  });

  it('flips discs around the placed stone', () => {
    const state = othelloGame.initialState(1, ['alice', 'bob']);
    const next = othelloGame.reduce(
      state,
      { type: 'place', cell: 19 },
      'alice',
      0,
    );
    expect(next.board[othelloCellIndex(3, 3)]).toBe(1);
    expect(othelloDiscCounts(next.board)).toEqual([4, 1]);
    expect(next.turn).toBe(1);
    expect(next.moves).toEqual([19]);
  });

  it('rejects a placement that flips nothing and occupied cells', () => {
    const state = othelloGame.initialState(1, ['alice', 'bob']);
    expectRuleError(
      () => othelloGame.reduce(state, { type: 'place', cell: 0 }, 'alice', 0),
      'ILLEGAL_MOVE',
    );
    expectRuleError(
      () => othelloGame.reduce(state, { type: 'place', cell: 27 }, 'alice', 0),
      'ILLEGAL_MOVE',
    );
  });

  it('rejects off-turn, unknown and pass-with-moves actions', () => {
    const state = othelloGame.initialState(1, ['alice', 'bob']);
    expectRuleError(
      () => othelloGame.reduce(state, { type: 'place', cell: 19 }, 'bob', 0),
      'NOT_YOUR_TURN',
    );
    expectRuleError(
      () => othelloGame.reduce(state, { type: 'place', cell: 19 }, 'carol', 0),
      'UNKNOWN_PLAYER',
    );
    expectRuleError(
      () => othelloGame.reduce(state, { type: 'pass' }, 'alice', 0),
      'ILLEGAL_MOVE',
    );
  });

  it('auto-passes the opponent and keeps the turn when they cannot move', () => {
    const crafted = othelloFromDiscs([
      [0, 0, 1],
      [1, 0, 2],
      [0, 1, 1],
      [1, 1, 1],
      [2, 1, 1],
      [3, 1, 1],
      [4, 1, 1],
      [5, 1, 2],
    ]);
    const next = othelloGame.reduce(
      crafted,
      { type: 'place', cell: othelloCellIndex(2, 0) },
      'alice',
      0,
    );
    expect(next.passed).toBe(true);
    expect(next.finished).toBe(false);
    expect(next.turn).toBe(0);
    expect(next.board[othelloCellIndex(1, 0)]).toBe(1);
  });

  it('ends the game when both sides cannot move and scores by disc count', () => {
    const allBlack = othelloFullBoard(OTHELLO_CELL_COUNT, 1);
    const finished = othelloGame.reduce(
      allBlack,
      { type: 'pass' },
      'bob',
      0,
    );
    expect(finished.finished).toBe(true);
    expect(finished.winner).toBe(0);
    expect(othelloGame.isFinished(finished)).toBe(true);
    expect(othelloGame.computeScore(finished)).toEqual({
      outcome: 'win',
      winnerId: 'alice',
      points: 0,
    });
    expectNoEconomicReward(othelloGame.computeScore(finished));
  });

  it('reports a draw when the final disc count is tied', () => {
    const tied = othelloFullBoard(32, 0);
    const finished = othelloGame.reduce(tied, { type: 'pass' }, 'alice', 0);
    expect(finished.finished).toBe(true);
    expect(finished.winner).toBeNull();
    expect(othelloGame.computeScore(finished)).toEqual({
      outcome: 'draw',
      points: 0,
    });
  });

  it('replays the same action list into an identical state', () => {
    const play = (): OthelloState => {
      let state = othelloGame.initialState(21, ['alice', 'bob']);
      for (let ply = 0; ply < 8; ply += 1) {
        if (state.finished) {
          break;
        }
        const moves = legalMoves(state);
        if (moves.length === 0) {
          break;
        }
        const actor = state.turn === 0 ? 'alice' : 'bob';
        state = othelloGame.reduce(
          state,
          { type: 'place', cell: moves[0]! },
          actor,
          0,
        );
      }
      return state;
    };
    expect(play()).toEqual(play());
  });

  it('round-trips through JSON', () => {
    const state = othelloGame.initialState(1, ['alice', 'bob']);
    const next = othelloGame.reduce(
      state,
      { type: 'place', cell: 19 },
      'alice',
      0,
    );
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
  });
});

/* ------------------------------------------------------------------ */
/* Battleship                                                         */
/* ------------------------------------------------------------------ */

function fleetCells(state: BattleshipState, playerIndex: 0 | 1): number[] {
  return state.boards[playerIndex].ships.flatMap((ship) => ship.cells);
}

describe('battleship', () => {
  it('places the same seeded fleet deterministically and differs across seeds', () => {
    const first = battleshipGame.initialState(42, ['alice', 'bob']);
    const second = battleshipGame.initialState(42, ['alice', 'bob']);
    expect(second).toEqual(first);

    const other = battleshipGame.initialState(43, ['alice', 'bob']);
    expect(other.boards[0].ships).not.toEqual(first.boards[0].ships);
    expect(other.boards[1].ships).not.toEqual(first.boards[1].ships);
  });

  it('places all five ships without overlap and inside the board', () => {
    const state = battleshipGame.initialState(7, ['alice', 'bob']);
    for (const playerIndex of [0, 1] as const) {
      const ships = state.boards[playerIndex].ships;
      expect(ships.map((ship) => ship.id)).toEqual(
        BATTLESHIP_FLEET_SPEC.map((ship) => ship.id),
      );
      for (const ship of ships) {
        expect(ship.cells).toHaveLength(ship.size);
        expect(
          ship.cells.every(
            (cell) => cell >= 0 && cell < BATTLESHIP_CELL_COUNT,
          ),
        ).toBe(true);
      }
      const cells = fleetCells(state, playerIndex);
      // Standard fleet totals 17 cells: 5 + 4 + 3 + 3 + 2.
      expect(new Set(cells).size).toBe(17);
      expect(state.boards[playerIndex].shots).toHaveLength(
        BATTLESHIP_CELL_COUNT,
      );
      expect(state.boards[playerIndex].shots.every((cell) => cell === 0)).toBe(
        true,
      );
    }
  });

  it('rejects off-turn, duplicate and malformed fire actions', () => {
    let state = battleshipGame.initialState(42, ['alice', 'bob']);
    expectRuleError(
      () => battleshipGame.reduce(state, { type: 'fire', cell: 0 }, 'bob', 0),
      'NOT_YOUR_TURN',
    );
    expectRuleError(
      () =>
        battleshipGame.reduce(state, { type: 'fire', cell: 0 }, 'carol', 0),
      'UNKNOWN_PLAYER',
    );
    expectRuleError(
      () =>
        battleshipGame.reduce(
          state,
          { type: 'nope' } as unknown as BattleshipAction,
          'alice',
          0,
        ),
      'INVALID_ACTION',
    );
    expectRuleError(
      () =>
        battleshipGame.reduce(
          state,
          { type: 'fire', cell: BATTLESHIP_CELL_COUNT },
          'alice',
          0,
        ),
      'ILLEGAL_MOVE',
    );
    expectRuleError(
      () => battleshipGame.reduce(state, { type: 'fire', cell: -1 }, 'alice', 0),
      'ILLEGAL_MOVE',
    );
    expectRuleError(
      () => battleshipGame.reduce(state, { type: 'fire', cell: 1.5 }, 'alice', 0),
      'ILLEGAL_MOVE',
    );

    const target = playerPrivateState(state, 'bob').ships[0]!.cells[0]!;
    const aCells = new Set(fleetCells(state, 0));
    const safe = Array.from(
      { length: BATTLESHIP_CELL_COUNT },
      (_, cell) => cell,
    ).find((cell) => !aCells.has(cell))!;
    state = battleshipGame.reduce(
      state,
      { type: 'fire', cell: target },
      'alice',
      0,
    );
    state = battleshipGame.reduce(
      state,
      { type: 'fire', cell: safe },
      'bob',
      0,
    );
    expectRuleError(
      () => battleshipGame.reduce(state, { type: 'fire', cell: target }, 'alice', 0),
      'ILLEGAL_MOVE',
    );
  });

  it('marks hits, alternates turns and reports sunk ships', () => {
    let state = battleshipGame.initialState(42, ['alice', 'bob']);
    const carrier = playerPrivateState(state, 'bob').ships.find(
      (ship) => ship.id === 'carrier',
    )!;
    const aCells = new Set(fleetCells(state, 0));
    const safeShots = Array.from(
      { length: BATTLESHIP_CELL_COUNT },
      (_, cell) => cell,
    ).filter((cell) => !aCells.has(cell));
    let safeIndex = 0;

    for (const cell of carrier.cells) {
      state = battleshipGame.reduce(
        state,
        { type: 'fire', cell },
        'alice',
        0,
      );
      const publicState = publicStateFor(state, 'alice');
      if (cell === carrier.cells[carrier.cells.length - 1]) {
        expect(publicState.boards[1].sunkShips.map((ship) => ship.id)).toContain(
          'carrier',
        );
      } else {
        expect(publicState.boards[1].sunkShips).toEqual([]);
      }
      if (state.finished) {
        break;
      }
      state = battleshipGame.reduce(
        state,
        { type: 'fire', cell: safeShots[safeIndex]! },
        'bob',
        0,
      );
      safeIndex += 1;
    }

    expect(state.finished).toBe(false);
    expect(state.boards[1].shots[carrier.cells[0]!]).toBe(2);
  });

  it('finishes when the whole fleet is sunk and awards nothing', () => {
    let state = battleshipGame.initialState(42, ['alice', 'bob']);
    const targetCells = playerPrivateState(state, 'bob').ships.flatMap(
      (ship) => ship.cells,
    );
    const aCells = new Set(fleetCells(state, 0));
    const safeShots = Array.from(
      { length: BATTLESHIP_CELL_COUNT },
      (_, cell) => cell,
    ).filter((cell) => !aCells.has(cell));
    let safeIndex = 0;

    for (const cell of targetCells) {
      state = battleshipGame.reduce(
        state,
        { type: 'fire', cell },
        'alice',
        0,
      );
      if (state.finished) {
        break;
      }
      state = battleshipGame.reduce(
        state,
        { type: 'fire', cell: safeShots[safeIndex]! },
        'bob',
        0,
      );
      safeIndex += 1;
    }

    expect(state.finished).toBe(true);
    expect(state.winner).toBe(0);
    expect(battleshipGame.isFinished(state)).toBe(true);
    expect(battleshipGame.computeScore(state)).toEqual({
      outcome: 'win',
      winnerId: 'alice',
      points: 0,
    });
    expectNoEconomicReward(battleshipGame.computeScore(state));

    const publicState = publicStateFor(state, 'alice');
    expect(publicState.finished).toBe(true);
    expect(publicState.winnerId).toBe('alice');
    expect(publicState.boards[1].sunkShips).toHaveLength(5);
  });

  it('never leaks opponent ship coordinates through the public projection', () => {
    const state = battleshipGame.initialState(42, ['alice', 'bob']);
    const publicState = publicStateFor(state, 'alice');
    const opponentShips = playerPrivateState(state, 'bob').ships;

    const keys = collectKeys(publicState);
    for (const forbidden of ['ships', 'cells', 'x', 'y', 'shipCells']) {
      expect(keys.has(forbidden)).toBe(false);
    }
    expect('ships' in publicState.boards[1]).toBe(false);
    expect('ships' in publicState.boards[0]).toBe(false);

    expect(publicState.boards[1].sunkShips).toEqual([]);
    expect(publicState.boards[0].sunkShips).toEqual([]);

    const numericArrays = collectNumberArrays(publicState);
    expect(numericArrays).toHaveLength(2);
    for (const array of numericArrays) {
      expect(array).toHaveLength(BATTLESHIP_CELL_COUNT);
      expect(
        array.every((value) => value === 0 || value === 1 || value === 2),
      ).toBe(true);
    }
    for (const ship of opponentShips) {
      const leaked = numericArrays.some(
        (array) =>
          array.length === ship.cells.length &&
          array.every((value, index) => value === ship.cells[index]),
      );
      expect(leaked).toBe(false);
    }

    const publicBoard = publicState.boards[1] as unknown as Record<
      string,
      unknown
    >;
    expect(Object.keys(publicBoard).sort()).toEqual([
      'playerId',
      'shots',
      'sunkShips',
    ]);
  });

  it('exposes the private fleet only to its owner', () => {
    const state = battleshipGame.initialState(42, ['alice', 'bob']);
    const privateAlice = playerPrivateState(state, 'alice');
    expect(privateAlice.playerId).toBe('alice');
    expect(privateAlice.ships).toHaveLength(5);
    expect(privateAlice.shots).toHaveLength(BATTLESHIP_CELL_COUNT);

    expectRuleError(
      () => playerPrivateState(state, 'carol'),
      'UNKNOWN_PLAYER',
    );
    expectRuleError(() => publicStateFor(state, 'carol'), 'UNKNOWN_PLAYER');
  });

  it('round-trips state and projection through JSON', () => {
    let state = battleshipGame.initialState(42, ['alice', 'bob']);
    const target = playerPrivateState(state, 'bob').ships[0]!.cells[0]!;
    state = battleshipGame.reduce(
      state,
      { type: 'fire', cell: target },
      'alice',
      0,
    );
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    const projection = publicStateFor(state, 'bob');
    expect(JSON.parse(JSON.stringify(projection))).toEqual(projection);
  });
});

/* ------------------------------------------------------------------ */
/* Memory matching                                                    */
/* ------------------------------------------------------------------ */

function memoryPair(state: MemoryState, same: boolean): [number, number] {
  for (let first = 0; first < state.deck.length; first += 1) {
    for (let second = first + 1; second < state.deck.length; second += 1) {
      if ((state.deck[first] === state.deck[second]) === same) {
        return [first, second];
      }
    }
  }
  throw new Error('No matching pair shape found in the deck');
}

function clearMemory(state: MemoryState, player: string): MemoryState {
  let current = state;
  let guard = 0;
  while (!memoryGame.isFinished(current) && guard < 100) {
    guard += 1;
    const first = current.deck.findIndex(
      (_symbol, index) => !current.matched[index],
    );
    if (first < 0) {
      throw new Error('No unmatched card left');
    }
    const symbol = current.deck[first]!;
    const second = current.deck.findIndex(
      (value, index) =>
        index > first && !current.matched[index] && value === symbol,
    );
    if (second <= first) {
      throw new Error('No mate found for the card');
    }
    current = memoryGame.reduce(
      current,
      { type: 'flip', cell: first },
      player,
      0,
    );
    current = memoryGame.reduce(
      current,
      { type: 'flip', cell: second },
      player,
      0,
    );
  }
  return current;
}

describe('memory', () => {
  it('builds the same deterministic deck for the same seed and differs across seeds', () => {
    const first = memoryGame.initialState(7, ['alice', 'bob']);
    const second = memoryGame.initialState(7, ['alice', 'bob']);
    expect(second.deck).toEqual(first.deck);
    expect(first.deck).toHaveLength(16);
    expect([...first.deck].sort((left, right) => left - right)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7,
    ]);

    const other = memoryGame.initialState(8, ['alice', 'bob']);
    expect(other.deck).not.toEqual(first.deck);
  });

  it('rejects flipping an already revealed or matched card', () => {
    let state = memoryGame.initialState(7, ['alice', 'bob']);
    state = memoryGame.reduce(state, { type: 'flip', cell: 0 }, 'alice', 0);
    expectRuleError(
      () => memoryGame.reduce(state, { type: 'flip', cell: 0 }, 'alice', 0),
      'ILLEGAL_MOVE',
    );

    const [first, second] = memoryPair(
      memoryGame.initialState(7, ['alice', 'bob']),
      true,
    );
    let matchedState = memoryGame.initialState(7, ['alice', 'bob']);
    matchedState = memoryGame.reduce(
      matchedState,
      { type: 'flip', cell: first },
      'alice',
      0,
    );
    matchedState = memoryGame.reduce(
      matchedState,
      { type: 'flip', cell: second },
      'alice',
      0,
    );
    expect(matchedState.matched[first]).toBe(true);
    expectRuleError(
      () =>
        memoryGame.reduce(
          matchedState,
          { type: 'flip', cell: first },
          'alice',
          0,
        ),
      'ILLEGAL_MOVE',
    );
  });

  it('rejects a third simultaneous flip', () => {
    const base = memoryGame.initialState(7, ['alice', 'bob']);
    const crafted: MemoryState = {
      ...base,
      revealed: base.revealed.map((_revealed, index) => index < 2),
    };
    expectRuleError(
      () => memoryGame.reduce(crafted, { type: 'flip', cell: 2 }, 'alice', 0),
      'ILLEGAL_MOVE',
    );
  });

  it('keeps the turn after a match and passes it after a mismatch', () => {
    const matchDeck = memoryGame.initialState(7, ['alice', 'bob']);
    const [matchFirst, matchSecond] = memoryPair(matchDeck, true);
    let matched = matchDeck;
    matched = memoryGame.reduce(
      matched,
      { type: 'flip', cell: matchFirst },
      'alice',
      0,
    );
    matched = memoryGame.reduce(
      matched,
      { type: 'flip', cell: matchSecond },
      'alice',
      0,
    );
    expect(matched.collected).toEqual([1, 0]);
    expect(matched.turn).toBe(0);
    expect(matched.matched[matchFirst]).toBe(true);
    expect(matched.matched[matchSecond]).toBe(true);

    const mismatchDeck = memoryGame.initialState(7, ['alice', 'bob']);
    const [mismatchFirst, mismatchSecond] = memoryPair(mismatchDeck, false);
    let mismatched = mismatchDeck;
    mismatched = memoryGame.reduce(
      mismatched,
      { type: 'flip', cell: mismatchFirst },
      'alice',
      0,
    );
    mismatched = memoryGame.reduce(
      mismatched,
      { type: 'flip', cell: mismatchSecond },
      'alice',
      0,
    );
    expect(mismatched.collected).toEqual([0, 0]);
    expect(mismatched.turn).toBe(1);
    expect(mismatched.revealed[mismatchFirst]).toBe(false);
    expect(mismatched.revealed[mismatchSecond]).toBe(false);
  });

  it('rejects off-turn and unknown players', () => {
    const state = memoryGame.initialState(7, ['alice', 'bob']);
    expectRuleError(
      () => memoryGame.reduce(state, { type: 'flip', cell: 0 }, 'bob', 0),
      'NOT_YOUR_TURN',
    );
    expectRuleError(
      () => memoryGame.reduce(state, { type: 'flip', cell: 0 }, 'carol', 0),
      'UNKNOWN_PLAYER',
    );
  });

  it('finishes with a two-player winner and zero points', () => {
    const finished = clearMemory(
      memoryGame.initialState(7, ['alice', 'bob']),
      'alice',
    );
    expect(memoryGame.isFinished(finished)).toBe(true);
    expect(finished.finished).toBe(true);
    expect(finished.collected).toEqual([8, 0]);
    expect(memoryGame.computeScore(finished)).toEqual({
      outcome: 'win',
      winnerId: 'alice',
      points: 0,
    });
    expectNoEconomicReward(memoryGame.computeScore(finished));
  });

  it('awards a solo clear and rejects a second player in solo mode', () => {
    expect(memoryGame.minPlayers).toBe(1);
    const solo = memoryGame.initialState(5, ['solo']);
    expect(solo.players).toEqual(['solo']);
    expectRuleError(
      () => memoryGame.reduce(solo, { type: 'flip', cell: 0 }, 'bob', 0),
      'UNKNOWN_PLAYER',
    );
    const finished = clearMemory(solo, 'solo');
    expect(memoryGame.computeScore(finished)).toEqual({
      outcome: 'coop_clear',
      points: 0,
    });
    expectNoEconomicReward(memoryGame.computeScore(finished));
  });

  it('rejects flipping a card after the game is finished', () => {
    const finished = clearMemory(
      memoryGame.initialState(7, ['alice', 'bob']),
      'alice',
    );
    expectRuleError(
      () => memoryGame.reduce(finished, { type: 'flip', cell: 0 }, 'alice', 0),
      'GAME_FINISHED',
    );
  });

  it('round-trips through JSON mid-game', () => {
    const [first, second] = memoryPair(
      memoryGame.initialState(7, ['alice', 'bob']),
      false,
    );
    let state = memoryGame.initialState(7, ['alice', 'bob']);
    state = memoryGame.reduce(state, { type: 'flip', cell: first }, 'alice', 0);
    state = memoryGame.reduce(state, { type: 'flip', cell: second }, 'alice', 0);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

/* ------------------------------------------------------------------ */
/* Registry and session helper                                        */
/* ------------------------------------------------------------------ */

describe('minigame registry', () => {
  it('registers the four V0.2.5+ definitions behind stable ids', () => {
    expect(MINIGAME_IDS).toEqual(['caro', 'othello', 'battleship', 'memory']);
    expect(MINIGAME_REGISTRY.size).toBe(4);
    for (const id of MINIGAME_IDS) {
      expect(getMinigame(id)).toBeDefined();
      expect(getMinigame(id)!.id).toBe(id);
    }
    expect(getMinigame('caro')).toBe(caroGame);
    expect(getMinigame('unknown-game')).toBeUndefined();
  });

  it('creates a versioned session envelope and rejects unknown games', () => {
    const session = createSession('caro', 5, ['alice', 'bob']);
    expect(session.gameId).toBe('caro');
    expect(session.version).toBe(1);
    expect(session.state).toEqual(caroGame.initialState(5, ['alice', 'bob']));
    expectRuleError(
      () => createSession('unknown-game', 5, ['alice', 'bob']),
      'UNKNOWN_GAME',
    );
  });

  it('never derives economic value from any computeScore', () => {
    for (const id of MINIGAME_IDS) {
      const definition = getMinigame(id)!;
      const playerIds = definition.minPlayers === 1 ? ['solo'] : ['alice', 'bob'];
      const state = definition.initialState(3, playerIds);
      const outcome = definition.computeScore(state);
      expect(outcome.outcome).toBe('incomplete');
      expectNoEconomicReward(outcome);
    }
  });

  it('forwards invalid player rosters to the games', () => {
    expectRuleError(
      () => caroGame.initialState(1, ['alice']),
      'INVALID_PLAYERS',
    );
    expectRuleError(
      () => battleshipGame.initialState(1, ['alice', 'alice']),
      'INVALID_PLAYERS',
    );
    expectRuleError(
      () => othelloGame.initialState(1, []),
      'INVALID_PLAYERS',
    );
  });
});
