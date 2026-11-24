import {
  OTHELLO_SIZE,
  legalMoves,
  othelloDiscCounts,
  othelloGame,
  type OthelloDisc,
} from '../../shared/minigames';
import { MinigameShell } from './MinigameShell';
import { MINIGAME_PLAYER_IDS, playerLabel, useMinigame } from './useMinigame';

/**
 * Othello hot-seat board. Legal-move hints and disc counts come from the pure
 * module helpers; the component only renders them.
 */
export function OthelloGame() {
  const { state, errorVi, finished, outcome, play, restart } = useMinigame(
    othelloGame,
    MINIGAME_PLAYER_IDS,
  );

  const turnPlayerId = state.players[state.turn];
  const legal = legalMoves(state);
  const legalCells = new Set(legal);
  const [blackCount, whiteCount] = othelloDiscCounts(state.board);
  const mustPass = !finished && legal.length === 0;

  function cellLabel(cell: number, value: OthelloDisc): string {
    const row = Math.floor(cell / OTHELLO_SIZE) + 1;
    const column = (cell % OTHELLO_SIZE) + 1;
    const base = `Ô hàng ${row} cột ${column}`;
    if (value === 1) return `${base}, quân đen`;
    if (value === 2) return `${base}, quân trắng`;
    if (legalCells.has(cell)) return `${base}, nước đi hợp lệ`;
    return base;
  }

  function handlePlace(cell: number): void {
    if (finished) return;
    play({ type: 'place', cell }, turnPlayerId);
  }

  function handlePass(): void {
    if (finished) return;
    play({ type: 'pass' }, turnPlayerId);
  }

  const statusHint =
    !finished && state.passed
      ? `Đối phương không có nước đi, ${playerLabel(turnPlayerId)} đi tiếp.`
      : null;

  return (
    <MinigameShell
      testId="othello-shell"
      title="Othello"
      subtitle="Chạm vào chấm gợi ý để đặt quân và lật quân của đối phương."
      turnLabel={finished ? null : `Lượt của ${playerLabel(turnPlayerId)}`}
      turnPlayerId={turnPlayerId}
      errorVi={errorVi}
      outcome={outcome}
      statusHint={statusHint}
      onRestart={restart}
      extraControls={
        mustPass ? (
          <button
            type="button"
            className="mn-btn mn-btn--primary"
            data-testid="othello-pass"
            onClick={handlePass}
          >
            Bỏ lượt
          </button>
        ) : null
      }
    >
      <div className="mn-counts">
        <span className="mn-count" data-testid="othello-count-black">
          Đen · {playerLabel(state.players[0])}: {blackCount}
        </span>
        <span className="mn-count" data-testid="othello-count-white">
          Trắng · {playerLabel(state.players[1])}: {whiteCount}
        </span>
      </div>

      <div
        className="mn-grid mn-grid--othello"
        role="group"
        aria-label="Bàn cờ Othello 8 × 8"
      >
        {state.board.map((value, cell) => {
          const classes = ['mn-cell', 'mn-cell--othello'];
          if (value === 1) classes.push('mn-cell--black');
          if (value === 2) classes.push('mn-cell--white');
          if (legalCells.has(cell)) classes.push('mn-cell--legal');
          return (
            <button
              key={cell}
              type="button"
              className={classes.join(' ')}
              data-testid={`othello-cell-${cell}`}
              data-owner={value}
              data-legal={legalCells.has(cell) ? 'true' : 'false'}
              aria-label={cellLabel(cell, value)}
              disabled={finished}
              onClick={() => handlePlace(cell)}
            >
              {value === 1 ? (
                <span className="mn-disc mn-disc--black" aria-hidden="true" />
              ) : null}
              {value === 2 ? (
                <span className="mn-disc mn-disc--white" aria-hidden="true" />
              ) : null}
              {value === 0 && legalCells.has(cell) ? (
                <span className="mn-legal-dot" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
    </MinigameShell>
  );
}
