import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BattleshipGame } from '../../src/features/minigames/BattleshipGame';
import { CaroGame } from '../../src/features/minigames/CaroGame';
import { MemoryGame } from '../../src/features/minigames/MemoryGame';
import { MinigameDemo } from '../../src/features/minigames/MinigameDemo';
import { OthelloGame } from '../../src/features/minigames/OthelloGame';
import {
  MINIGAME_BASE_SEED,
  MINIGAME_PLAYER_IDS,
} from '../../src/features/minigames/useMinigame';
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

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const PLAYER_ONE = MINIGAME_PLAYER_IDS[0];
const PLAYER_TWO = MINIGAME_PLAYER_IDS[1];

/** Raw sources of the mini-game UI, used by the economy-guard test. */
const MINIGAME_SOURCES = import.meta.glob(
  '../../src/features/minigames/*.{ts,tsx}',
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

/** Unique ship cells of one player, read through the owner-only projection. */
function shipCells(state: BattleshipState, playerId: string): number[] {
  const cells = playerPrivateState(state, playerId).ships.flatMap(
    (ship) => ship.cells,
  );
  return [...new Set(cells)].sort((left, right) => left - right);
}

/** Label used by the own-fleet board for a ship cell. */
function shipLabel(cell: number): string {
  return `Tàu của bạn hàng ${
    Math.floor(cell / BATTLESHIP_SIZE) + 1
  } cột ${(cell % BATTLESHIP_SIZE) + 1}`;
}

function findMatchingPair(deck: readonly number[]): readonly [number, number] {
  for (let first = 0; first < deck.length; first += 1) {
    for (let second = first + 1; second < deck.length; second += 1) {
      if (deck[first] === deck[second]) return [first, second];
    }
  }
  throw new Error('Bộ bài không có cặp nào.');
}

function findMismatch(deck: readonly number[]): readonly [number, number] {
  for (let second = 1; second < deck.length; second += 1) {
    if (deck[second] !== deck[0]) return [0, second];
  }
  throw new Error('Bộ bài không có hai thẻ khác nhau.');
}

afterEach(() => {
  cleanup();
});

/* ------------------------------------------------------------------ */
/* Caro                                                               */
/* ------------------------------------------------------------------ */

describe('Caro UI', () => {
  it('renders an empty 15×15 board and player 1 to move', () => {
    render(<CaroGame />);

    expect(screen.getAllByTestId(/^caro-cell-/)).toHaveLength(15 * 15);
    expect(screen.getByTestId('caro-cell-0')).toHaveAttribute('data-owner', '0');
    expect(screen.getByTestId('caro-cell-224')).toHaveAttribute(
      'data-owner',
      '0',
    );
    expect(screen.getByTestId('minigame-turn')).toHaveTextContent(
      'Lượt của Người chơi 1',
    );
    expect(screen.queryByTestId('minigame-error')).toBeNull();
  });

  it('places a stone and switches the turn', () => {
    render(<CaroGame />);

    fireEvent.click(screen.getByTestId('caro-cell-112'));

    expect(screen.getByTestId('caro-cell-112')).toHaveAttribute(
      'data-owner',
      '1',
    );
    expect(screen.getByTestId('caro-cell-112')).toHaveAttribute(
      'data-last',
      'true',
    );
    expect(screen.getByTestId('minigame-turn')).toHaveTextContent(
      'Lượt của Người chơi 2',
    );
  });

  it('rejects a second stone on the same cell without changing the board', () => {
    render(<CaroGame />);

    const cell = screen.getByTestId('caro-cell-0');
    fireEvent.click(cell);
    fireEvent.click(cell);

    expect(screen.getByTestId('minigame-error')).toHaveTextContent(
      'Ô này đã có quân.',
    );
    expect(cell).toHaveAttribute('data-owner', '1');
    const playerTwoStones = screen
      .getAllByTestId(/^caro-cell-/)
      .filter((boardCell) => boardCell.getAttribute('data-owner') === '2');
    expect(playerTwoStones).toHaveLength(0);
    expect(screen.getByTestId('minigame-turn')).toHaveTextContent(
      'Lượt của Người chơi 2',
    );
  });

  it('shows the win state with the winning line and restarts empty', () => {
    render(<CaroGame />);

    const firstRow = (column: number) => caroCellIndex(column, 0);
    const secondRow = (column: number) => caroCellIndex(column, 1);
    const moves = [
      firstRow(0),
      secondRow(0),
      firstRow(1),
      secondRow(1),
      firstRow(2),
      secondRow(2),
      firstRow(3),
      secondRow(3),
      firstRow(4),
    ];
    for (const move of moves) {
      fireEvent.click(screen.getByTestId(`caro-cell-${move}`));
    }

    expect(screen.getByTestId('minigame-outcome')).toHaveTextContent(
      'Người chơi 1 thắng!',
    );
    expect(screen.queryByTestId('minigame-turn')).toBeNull();
    for (let column = 0; column < 5; column += 1) {
      expect(
        screen.getByTestId(`caro-cell-${firstRow(column)}`),
      ).toHaveAttribute('data-winning', 'true');
    }

    fireEvent.click(screen.getByTestId('minigame-restart'));

    expect(
      screen
        .getAllByTestId(/^caro-cell-/)
        .filter((boardCell) => boardCell.getAttribute('data-owner') !== '0'),
    ).toHaveLength(0);
    expect(screen.getByTestId('minigame-turn')).toHaveTextContent(
      'Lượt của Người chơi 1',
    );
    expect(screen.queryByTestId('minigame-error')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Othello                                                            */
/* ------------------------------------------------------------------ */

describe('Othello UI', () => {
  it('starts with four discs and flips discs on a legal move', () => {
    render(<OthelloGame />);

    expect(screen.getAllByTestId(/^othello-cell-/)).toHaveLength(8 * 8);
    expect(screen.getByTestId('othello-count-black')).toHaveTextContent(': 2');
    expect(screen.getByTestId('othello-count-white')).toHaveTextContent(': 2');
    expect(screen.queryByTestId('othello-pass')).toBeNull();

    const state = othelloGame.initialState(0, MINIGAME_PLAYER_IDS);
    const legal = legalMoves(state);
    const firstLegal = legal[0] ?? 0;
    const legalHints = screen
      .getAllByTestId(/^othello-cell-/)
      .filter((cell) => cell.getAttribute('data-legal') === 'true');
    expect(legalHints).toHaveLength(legal.length);

    fireEvent.click(screen.getByTestId(`othello-cell-${firstLegal}`));

    expect(screen.getByTestId('othello-count-black')).toHaveTextContent(': 4');
    expect(screen.getByTestId('othello-count-white')).toHaveTextContent(': 1');
    expect(screen.getByTestId('minigame-turn')).toHaveTextContent(
      'Lượt của Người chơi 2',
    );
    expect(screen.queryByTestId('minigame-error')).toBeNull();
  });

  it('shows a Vietnamese message for an illegal move', () => {
    render(<OthelloGame />);

    const state = othelloGame.initialState(0, MINIGAME_PLAYER_IDS);
    expect(legalMoves(state)).not.toContain(0);

    fireEvent.click(screen.getByTestId('othello-cell-0'));

    expect(screen.getByTestId('minigame-error')).toHaveTextContent(
      'Nước đi này không lật được quân nào.',
    );
    expect(screen.getByTestId('othello-count-black')).toHaveTextContent(': 2');
    expect(screen.getByTestId('othello-cell-0')).toHaveAttribute(
      'data-owner',
      '0',
    );
  });
});

/* ------------------------------------------------------------------ */
/* Memory                                                             */
/* ------------------------------------------------------------------ */

describe('Memory UI', () => {
  it('keeps the turn after flipping two matching cards', () => {
    render(<MemoryGame />);

    expect(screen.getAllByTestId(/^memory-card-/)).toHaveLength(16);
    const deck = memoryGame.initialState(
      MINIGAME_BASE_SEED,
      MINIGAME_PLAYER_IDS,
    ).deck;
    const [first, second] = findMatchingPair(deck);

    fireEvent.click(screen.getByTestId(`memory-card-${first}`));
    expect(screen.getByTestId(`memory-card-${first}`)).toHaveAttribute(
      'data-face',
      'up',
    );
    expect(screen.getByTestId('minigame-turn')).toHaveTextContent(
      'Người chơi 1',
    );

    fireEvent.click(screen.getByTestId(`memory-card-${second}`));

    expect(screen.getByTestId(`memory-card-${first}`)).toHaveAttribute(
      'data-matched',
      'true',
    );
    expect(screen.getByTestId(`memory-card-${second}`)).toHaveAttribute(
      'data-matched',
      'true',
    );
    expect(screen.getByTestId('memory-collected-0')).toHaveTextContent(
      '1 cặp',
    );
    expect(screen.getByTestId('memory-collected-1')).toHaveTextContent(
      '0 cặp',
    );
    expect(screen.getByTestId('minigame-turn')).toHaveTextContent(
      'Lượt của Người chơi 1',
    );
  });

  it('passes the turn after flipping two different cards', () => {
    render(<MemoryGame />);

    const deck = memoryGame.initialState(
      MINIGAME_BASE_SEED,
      MINIGAME_PLAYER_IDS,
    ).deck;
    const [first, second] = findMismatch(deck);

    fireEvent.click(screen.getByTestId(`memory-card-${first}`));
    expect(screen.getByTestId(`memory-card-${first}`)).toHaveAttribute(
      'data-face',
      'up',
    );

    fireEvent.click(screen.getByTestId(`memory-card-${second}`));

    expect(screen.getByTestId(`memory-card-${first}`)).toHaveAttribute(
      'data-face',
      'down',
    );
    expect(screen.getByTestId(`memory-card-${second}`)).toHaveAttribute(
      'data-face',
      'down',
    );
    expect(screen.getByTestId('minigame-turn')).toHaveTextContent(
      'Lượt của Người chơi 2',
    );
    expect(screen.getByTestId('memory-collected-1')).toHaveTextContent(
      '0 cặp',
    );
  });
});

/* ------------------------------------------------------------------ */
/* Battleship                                                         */
/* ------------------------------------------------------------------ */

describe('Battleship privacy', () => {
  it('never renders the opponent fleet before the privacy gate', () => {
    render(<BattleshipGame />);

    expect(screen.queryByTestId('battleship-privacy')).toBeNull();

    const state = battleshipGame.initialState(
      MINIGAME_BASE_SEED,
      MINIGAME_PLAYER_IDS,
    );
    const ownCells = new Set(shipCells(state, PLAYER_ONE));
    const leaked = shipCells(state, PLAYER_TWO).filter(
      (cell) => !ownCells.has(cell),
    );
    expect(leaked.length).toBeGreaterThan(0);
    for (const cell of leaked) {
      expect(screen.queryByLabelText(shipLabel(cell))).toBeNull();
    }

    // Exactly the viewer's own fleet (5 + 4 + 3 + 3 + 2 = 17 cells) is drawn.
    expect(document.querySelectorAll('[data-ship-owner="self"]')).toHaveLength(
      17,
    );
    // The fire grid never carries a ship marker.
    for (const cell of shipCells(state, PLAYER_TWO).slice(0, 5)) {
      expect(
        screen.getByTestId(`battleship-fire-${cell}`),
      ).not.toHaveAttribute('data-ship-owner');
    }
  });

  it('hides the boards behind the gate and blocks firing until dismissed', () => {
    render(<BattleshipGame />);

    fireEvent.click(screen.getByTestId('battleship-fire-0'));

    expect(screen.getByTestId('battleship-privacy')).toBeInTheDocument();
    expect(screen.getByTestId('battleship-reveal')).toHaveTextContent(
      'Chạm để xem bàn của bạn',
    );
    // Nothing of either fleet is rendered while the device is being passed.
    expect(screen.queryAllByLabelText(/^Tàu của bạn /)).toHaveLength(0);
    expect(screen.queryByTestId('battleship-fire-1')).toBeNull();
    expect(screen.queryByTestId('battleship-own-0')).toBeNull();

    fireEvent.click(screen.getByTestId('battleship-reveal'));

    expect(screen.queryByTestId('battleship-privacy')).toBeNull();
    expect(screen.getByTestId('minigame-turn')).toHaveTextContent(
      'Lượt của Người chơi 2',
    );

    const state = battleshipGame.initialState(
      MINIGAME_BASE_SEED,
      MINIGAME_PLAYER_IDS,
    );
    const playerTwoCells = new Set(shipCells(state, PLAYER_TWO));
    const leakedAfterGate = shipCells(state, PLAYER_ONE).filter(
      (cell) => !playerTwoCells.has(cell),
    );
    expect(leakedAfterGate.length).toBeGreaterThan(0);
    for (const cell of leakedAfterGate) {
      expect(screen.queryByLabelText(shipLabel(cell))).toBeNull();
    }
    expect(document.querySelectorAll('[data-ship-owner="self"]')).toHaveLength(
      17,
    );
    expect(
      screen.getByLabelText(shipLabel([...playerTwoCells][0] ?? 0)),
    ).toBeInTheDocument();
  });

  it('shows the win screen once a fleet is destroyed', () => {
    render(<BattleshipGame />);

    const state = battleshipGame.initialState(
      MINIGAME_BASE_SEED,
      MINIGAME_PLAYER_IDS,
    );
    const playerOneCells = new Set(shipCells(state, PLAYER_ONE));
    const targets = shipCells(state, PLAYER_TWO);
    const water: number[] = [];
    for (let cell = 0; cell < BATTLESHIP_SIZE * BATTLESHIP_SIZE; cell += 1) {
      if (!playerOneCells.has(cell)) water.push(cell);
    }

    let targetIndex = 0;
    let waterIndex = 0;
    let guard = 0;
    while (screen.queryByTestId('battleship-win') === null && guard < 80) {
      guard += 1;
      if (screen.queryByTestId('battleship-privacy') !== null) {
        fireEvent.click(screen.getByTestId('battleship-reveal'));
      }
      const turnText = screen.getByTestId('minigame-turn').textContent ?? '';
      if (turnText.includes('Người chơi 1')) {
        const cell = targets[targetIndex];
        expect(cell).toBeDefined();
        targetIndex += 1;
        fireEvent.click(screen.getByTestId(`battleship-fire-${cell}`));
      } else {
        const cell = water[waterIndex];
        expect(cell).toBeDefined();
        waterIndex += 1;
        fireEvent.click(screen.getByTestId(`battleship-fire-${cell}`));
      }
    }

    expect(screen.getByTestId('battleship-win')).toHaveTextContent(
      'Người chơi 1 thắng!',
    );
    expect(screen.getByTestId('minigame-outcome')).toHaveTextContent(
      'Người chơi 1 thắng!',
    );
  });
});

/* ------------------------------------------------------------------ */
/* Economy guard                                                      */
/* ------------------------------------------------------------------ */

describe('friendly PvP economy guard', () => {
  it('shows 0 points for every game and never mentions currency', () => {
    render(<MinigameDemo />);

    for (const tab of ['caro', 'othello', 'memory', 'battleship'] as const) {
      fireEvent.click(screen.getByTestId(`minigame-tab-${tab}`));
      const score = screen.getByTestId('minigame-score');
      expect(score).toHaveTextContent('Điểm: 0');
      expect(score.textContent ?? '').not.toMatch(/xu/i);
      expect(document.body.textContent ?? '').not.toMatch(/\bxu\b/i);
      expect(document.querySelector('[data-currency]')).toBeNull();
      expect(screen.queryByRole('img', { name: /coin/i })).toBeNull();
    }
  });

  it('does not import any economy/ledger module or persistence API', () => {
    const entries = Object.entries(MINIGAME_SOURCES);
    expect(entries.length).toBeGreaterThanOrEqual(6);
    for (const [path, source] of entries) {
      expect(source, path).not.toMatch(/from\s+'[^']*(economy|ledger)/i);
      expect(source, path).not.toMatch(/\b(localStorage|sessionStorage)\b/);
      expect(source, path).not.toMatch(/\bfetch\s*\(/);
      expect(source, path).not.toMatch(/\bMath\.random\b/);
    }
  });
});
