import { useState } from 'react';
import {
  CARO_SIZE,
  CARO_WIN_LENGTH,
  caroGame,
  type CaroCell,
} from '../../shared/minigames';
import { CozyGameTable } from './CozyGameTable';
import { playMinigameChime } from './minigameAudio';
import { MinigameShell } from './MinigameShell';
import { MINIGAME_PLAYER_IDS, playerLabel, useMinigame } from './useMinigame';

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/**
 * Presentation-only helper: finds the winning run through the last placed
 * stone so the board can highlight it. Win detection itself lives in the pure
 * reducer; this only maps an existing win to cells for styling.
 */
function findWinningLine(
  board: readonly CaroCell[],
  lastMove: number | null,
): number[] {
  if (lastMove === null) return [];
  const disc = board[lastMove];
  if (disc !== 1 && disc !== 2) return [];

  const originX = lastMove % CARO_SIZE;
  const originY = Math.floor(lastMove / CARO_SIZE);

  for (const [dx, dy] of DIRECTIONS) {
    const line = [lastMove];
    for (const step of [1, -1] as const) {
      let currentX = originX + dx * step;
      let currentY = originY + dy * step;
      while (
        currentX >= 0 &&
        currentX < CARO_SIZE &&
        currentY >= 0 &&
        currentY < CARO_SIZE
      ) {
        const index = currentY * CARO_SIZE + currentX;
        if (board[index] !== disc) break;
        line.push(index);
        currentX += dx * step;
        currentY += dy * step;
      }
    }
    if (line.length >= CARO_WIN_LENGTH) {
      return line.sort((left, right) => left - right);
    }
  }
  return [];
}

/**
 * Caro 15×15 hot-seat board. Every tap is forwarded to `caroGame.reduce`; the
 * component never decides legality on its own.
 */
export function CaroGame() {
  const { state, errorVi, finished, outcome, play, restart } = useMinigame(
    caroGame,
    MINIGAME_PLAYER_IDS,
  );
  const [hoverCell, setHoverCell] = useState<number | null>(null);

  const lastMove = state.lastMove;
  const winningLine =
    finished && state.winner !== null
      ? findWinningLine(state.board, lastMove)
      : [];
  const winningCells = new Set(winningLine);
  const turnPlayerId = state.players[state.turn];

  function cellLabel(cell: number, value: CaroCell): string {
    const row = Math.floor(cell / CARO_SIZE) + 1;
    const column = (cell % CARO_SIZE) + 1;
    const base = `Ô hàng ${row} cột ${column}`;
    if (value === 1) {
      return `${base}, quân của ${playerLabel(state.players[0])}`;
    }
    if (value === 2) {
      return `${base}, quân của ${playerLabel(state.players[1])}`;
    }
    return base;
  }

  function handlePlace(cell: number): void {
    if (finished) return;
    const next = play({ type: 'place', cell }, turnPlayerId);
    if (next) playMinigameChime('place');
    if (next && next.winner !== null) playMinigameChime('win');
  }

  return (
    <MinigameShell
      testId="caro-shell"
      title="Caro 15 × 15"
      subtitle="Hai bạn thay phiên đặt quân, ai nối đủ 5 quân trước là thắng."
      turnLabel={finished ? null : `Lượt của ${playerLabel(turnPlayerId)}`}
      turnPlayerId={turnPlayerId}
      errorVi={errorVi}
      outcome={outcome}
      statusHint={null}
      onRestart={restart}
    >
      <CozyGameTable label="Bàn cờ Caro" testId="caro-table">
        <div
          className="mn-grid mn-grid--caro"
          role="group"
          aria-label="Bàn cờ Caro 15 × 15"
        >
          {state.board.map((value, cell) => {
            const classes = ['mn-cell', 'mn-cell--caro'];
            if (value === 1) classes.push('mn-cell--p1');
            if (value === 2) classes.push('mn-cell--p2');
            if (lastMove === cell) classes.push('mn-cell--last', 'mn-cell--pop');
            if (winningCells.has(cell)) classes.push('mn-cell--win');
            if (value === 0 && hoverCell === cell) classes.push('mn-cell--hover-ghost');
            return (
              <button
                key={cell}
                type="button"
                className={classes.join(' ')}
                data-testid={`caro-cell-${cell}`}
                data-owner={value}
                data-last={lastMove === cell ? 'true' : 'false'}
                data-winning={winningCells.has(cell) ? 'true' : 'false'}
                aria-label={cellLabel(cell, value)}
                disabled={finished}
                onMouseEnter={() => setHoverCell(cell)}
                onMouseLeave={() => setHoverCell((c) => (c === cell ? null : c))}
                onFocus={() => setHoverCell(cell)}
                onBlur={() => setHoverCell((c) => (c === cell ? null : c))}
                onClick={() => handlePlace(cell)}
              >
                {value !== 0 ? (
                  <span className="mn-stone" aria-hidden="true" />
                ) : hoverCell === cell ? (
                  <span className="mn-stone mn-stone--ghost" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      </CozyGameTable>
    </MinigameShell>
  );
}
