import { useState } from 'react';
import {
  BATTLESHIP_CELL_COUNT,
  BATTLESHIP_SIZE,
  battleshipGame,
  playerPrivateState,
  publicStateFor,
} from '../../shared/minigames';
import { MinigameShell } from './MinigameShell';
import { MINIGAME_PLAYER_IDS, playerLabel, useMinigame } from './useMinigame';

function rowLabel(cell: number): string {
  return `hàng ${Math.floor(cell / BATTLESHIP_SIZE) + 1} cột ${
    (cell % BATTLESHIP_SIZE) + 1
  }`;
}

/**
 * Battleship hot-seat with an explicit pass-the-device privacy screen.
 *
 * Privacy contract:
 * - The opponent's ships are NEVER rendered. Everything about the enemy fleet
 *   comes from `publicStateFor(state, viewerId)`, which exposes shot grids and
 *   sunk ship names only — no coordinates.
 * - `playerPrivateState` is called exclusively for the current viewer's own
 *   board, so only that player's ship cells ever reach the DOM.
 * - Whenever the turn changes, the boards are hidden behind a "Chạm để xem bàn
 *   của bạn" gate and nothing is rendered until the next player admits
 *   themselves. The fire grid does not exist in the DOM while the gate is up.
 */
export function BattleshipGame() {
  const { state, errorVi, finished, outcome, play, restart } = useMinigame(
    battleshipGame,
    MINIGAME_PLAYER_IDS,
  );
  const [viewerId, setViewerId] = useState<string | null>(
    state.players[0],
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const turnPlayerId = state.players[state.turn];
  const gateOpen = !finished && viewerId !== turnPlayerId;
  // While gated nobody's board is shown; `viewer` is only the player who is
  // about to take over, and their projection is not rendered.
  const viewer = viewerId ?? turnPlayerId;

  const publicState = publicStateFor(state, viewer);
  const viewerIndex = publicState.boards[0].playerId === viewer ? 0 : 1;
  const ownPublicBoard = publicState.boards[viewerIndex];
  const enemyPublicBoard = publicState.boards[viewerIndex === 0 ? 1 : 0];
  const ownPrivate = playerPrivateState(state, viewer);
  const ownShipCells = new Set<number>(
    ownPrivate.ships.flatMap((ship) => ship.cells),
  );

  function handleFire(cell: number): void {
    if (gateOpen || finished) return;
    if ((enemyPublicBoard.shots[cell] ?? 0) !== 0) return;

    const sunkBefore = new Set(enemyPublicBoard.sunkShips.map((ship) => ship.id));
    const next = play({ type: 'fire', cell }, turnPlayerId);
    if (next === null) return;

    const nextPublic = publicStateFor(next, viewer);
    const nextViewerIndex =
      nextPublic.boards[0].playerId === viewer ? 0 : 1;
    const nextEnemy = nextPublic.boards[nextViewerIndex === 0 ? 1 : 0];
    const shot = nextEnemy.shots[cell] ?? 0;
    const newlySunk = nextEnemy.sunkShips.filter(
      (ship) => !sunkBefore.has(ship.id),
    );

    if (newlySunk.length > 0) {
      setFeedback(`Đã hạ ${newlySunk.map((ship) => ship.name).join(', ')}!`);
    } else if (shot === 2) {
      setFeedback('Trúng tàu!');
    } else {
      setFeedback('Trượt rồi.');
    }

    if (!battleshipGame.isFinished(next)) {
      setViewerId(null);
    }
  }

  function handleRestart(): void {
    setFeedback(null);
    setViewerId(state.players[0]);
    restart();
  }

  function handleReveal(): void {
    setFeedback(null);
    setViewerId(turnPlayerId);
  }

  return (
    <MinigameShell
      testId="battleship-shell"
      title="Bắn tàu"
      subtitle="Hai bạn thay phiên bắn vào vùng biển của nhau, ai hạ hết hạm đội trước là thắng."
      turnLabel={finished ? null : `Lượt của ${playerLabel(turnPlayerId)}`}
      turnPlayerId={turnPlayerId}
      errorVi={errorVi}
      outcome={outcome}
      statusHint={feedback}
      onRestart={handleRestart}
    >
      {gateOpen ? (
        <div
          className="mn-gate"
          data-testid="battleship-privacy"
          role="dialog"
          aria-modal="true"
          aria-label="Màn hình giữ riêng tư"
        >
          <div className="mn-gate-card">
            <p className="mn-gate-title">
              Lượt của {playerLabel(turnPlayerId)}
            </p>
            <p className="mn-gate-text">
              Bàn chơi đang được che lại để hai bạn không nhìn thấy hạm đội của
              nhau.
            </p>
            <button
              type="button"
              className="mn-btn mn-btn--primary mn-gate-btn"
              data-testid="battleship-reveal"
              onClick={handleReveal}
            >
              Chạm để xem bàn của bạn
            </button>
          </div>
        </div>
      ) : (
        <div className="mn-bs">
          {finished && state.winner !== null ? (
            <p className="mn-win" data-testid="battleship-win">
              {playerLabel(state.players[state.winner])} thắng!
            </p>
          ) : null}

          <section className="mn-bs-panel" aria-label="Hạm đội của bạn">
            <h3 className="mn-bs-title">Hạm đội của bạn</h3>
            <div
              className="mn-grid mn-grid--battleship"
              role="group"
              aria-label="Bàn hạm đội của bạn"
            >
              {Array.from({ length: BATTLESHIP_CELL_COUNT }, (_, cell) => {
                const isShip = ownShipCells.has(cell);
                const shot = ownPublicBoard.shots[cell] ?? 0;
                const classes = ['mn-cell', 'mn-cell--water'];
                if (isShip) classes.push('mn-cell--ship');
                if (shot === 2) classes.push('mn-cell--hit');
                if (shot === 1) classes.push('mn-cell--miss');
                return (
                  <div
                    key={cell}
                    className={classes.join(' ')}
                    data-testid={`battleship-own-${cell}`}
                    data-ship-owner={isShip ? 'self' : undefined}
                    data-shot={shot}
                    aria-label={
                      isShip
                        ? `Tàu của bạn ${rowLabel(cell)}`
                        : `Vùng biển của bạn ${rowLabel(cell)}`
                    }
                  >
                    {shot === 2 ? '✕' : null}
                    {shot === 1 ? '•' : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mn-bs-panel" aria-label="Vùng biển đối phương">
            <h3 className="mn-bs-title">Vùng biển đối phương</h3>
            <div
              className="mn-grid mn-grid--battleship"
              role="group"
              aria-label="Bàn bắn đối phương"
            >
              {Array.from({ length: BATTLESHIP_CELL_COUNT }, (_, cell) => {
                const shot = enemyPublicBoard.shots[cell] ?? 0;
                const classes = ['mn-cell', 'mn-cell--fire'];
                if (shot === 2) classes.push('mn-cell--hit');
                if (shot === 1) classes.push('mn-cell--miss');
                return (
                  <button
                    key={cell}
                    type="button"
                    className={classes.join(' ')}
                    data-testid={`battleship-fire-${cell}`}
                    data-shot={shot}
                    aria-label={`Ô bắn ${rowLabel(cell)}${
                      shot === 2 ? ', đã trúng' : shot === 1 ? ', đã trượt' : ''
                    }`}
                    disabled={finished || shot !== 0}
                    onClick={() => handleFire(cell)}
                  >
                    {shot === 2 ? '✕' : null}
                    {shot === 1 ? '•' : null}
                  </button>
                );
              })}
            </div>
          </section>

          {enemyPublicBoard.sunkShips.length > 0 ? (
            <p className="mn-sunk" data-testid="battleship-sunk">
              Đã hạ: {enemyPublicBoard.sunkShips.map((ship) => ship.name).join(', ')}
            </p>
          ) : null}
        </div>
      )}
    </MinigameShell>
  );
}
