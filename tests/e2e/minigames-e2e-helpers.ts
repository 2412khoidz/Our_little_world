import {
  BATTLESHIP_SIZE,
  battleshipGame,
  caroCellIndex,
  legalMoves,
  memoryGame,
  othelloGame,
  playerPrivateState,
  type BattleshipState,
} from '../../src/shared/minigames';
import {
  MINIGAME_BASE_SEED,
  MINIGAME_PLAYER_IDS,
} from '../../src/features/minigames/useMinigame';

const P1 = MINIGAME_PLAYER_IDS[0];
const P2 = MINIGAME_PLAYER_IDS[1];

export function caroWinMoveCells(): number[] {
  const row0 = (column: number) => caroCellIndex(column, 0);
  const row1 = (column: number) => caroCellIndex(column, 1);
  return [
    row0(0),
    row1(0),
    row0(1),
    row1(1),
    row0(2),
    row1(2),
    row0(3),
    row1(3),
    row0(4),
  ];
}

export function findMatchingPair(deck: readonly number[]): readonly [number, number] {
  for (let first = 0; first < deck.length; first += 1) {
    for (let second = first + 1; second < deck.length; second += 1) {
      if (deck[first] === deck[second]) return [first, second];
    }
  }
  throw new Error('Memory deck has no pair');
}

export function findMismatch(deck: readonly number[]): readonly [number, number] {
  for (let second = 1; second < deck.length; second += 1) {
    if (deck[second] !== deck[0]) return [0, second];
  }
  throw new Error('Memory deck has no mismatch');
}

export function memoryAllPairs(seed = MINIGAME_BASE_SEED): readonly (readonly [number, number])[] {
  const deck = memoryGame.initialState(seed, MINIGAME_PLAYER_IDS).deck;
  const used = new Set<number>();
  const pairs: [number, number][] = [];
  for (let i = 0; i < deck.length; i += 1) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < deck.length; j += 1) {
      if (deck[i] === deck[j]) {
        pairs.push([i, j]);
        used.add(i);
        used.add(j);
        break;
      }
    }
  }
  return pairs;
}

export function shipCells(state: BattleshipState, playerId: string): number[] {
  const cells = playerPrivateState(state, playerId).ships.flatMap(
    (ship) => ship.cells,
  );
  return [...new Set(cells)].sort((a, b) => a - b);
}

export function battleshipFirePlan(
  seed = MINIGAME_BASE_SEED,
): {
  playerOneTargets: number[];
  playerTwoWater: number[];
} {
  const state = battleshipGame.initialState(seed, MINIGAME_PLAYER_IDS);
  const playerOneCells = new Set(shipCells(state, P1));
  const targets = shipCells(state, P2);
  const water: number[] = [];
  for (let cell = 0; cell < BATTLESHIP_SIZE * BATTLESHIP_SIZE; cell += 1) {
    if (!playerOneCells.has(cell)) water.push(cell);
  }
  return { playerOneTargets: targets, playerTwoWater: water };
}

export function othelloFirstLegalCell(): number {
  const state = othelloGame.initialState(
    MINIGAME_BASE_SEED,
    MINIGAME_PLAYER_IDS,
  );
  const moves = legalMoves(state);
  return moves[0] ?? 19;
}