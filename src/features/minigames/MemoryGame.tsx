import { useState } from 'react';
import { memoryGame } from '../../shared/minigames';
import { MinigameShell } from './MinigameShell';
import {
  MINIGAME_PLAYER_IDS,
  MINIGAME_PLAYER_LABELS,
  playerLabel,
  useMinigame,
} from './useMinigame';

/** Eight cozy symbols; the deck only stores symbol ids. */
const MEMORY_SYMBOLS: readonly string[] = [
  '🌸',
  '🍀',
  '🍓',
  '☕',
  '🐱',
  '🌙',
  '🎀',
  '🕯️',
];

/**
 * Memory matching, two players alternating. The reducer resolves a pair on the
 * second flip (a match keeps the turn, a mismatch passes it); this component
 * only mirrors that state and shows a Vietnamese result hint.
 */
export function MemoryGame() {
  const { state, errorVi, finished, outcome, play, restart } =
    useMinigame(memoryGame, MINIGAME_PLAYER_IDS);
  const [hint, setHint] = useState<string | null>(null);

  const turnPlayerId = state.players[state.turn] ?? MINIGAME_PLAYER_LABELS[0];

  function handleFlip(cell: number): void {
    if (finished) return;
    const next = play({ type: 'flip', cell }, turnPlayerId);
    if (next === null) return;
    if (next.matched[cell] === true) {
      setHint('Khớp rồi, đi tiếp nhé!');
    } else if (next.revealed[cell] !== true) {
      setHint('Chưa khớp, đổi lượt nhé.');
    } else {
      setHint('Lật thêm một thẻ nữa.');
    }
  }

  function handleRestart(): void {
    setHint(null);
    restart();
  }

  return (
    <MinigameShell
      testId="memory-shell"
      title="Lật thẻ trí nhớ"
      subtitle="Hai bạn thay phiên lật 2 thẻ, ghép đúng cặp là được một cặp."
      turnLabel={finished ? null : `Lượt của ${playerLabel(turnPlayerId)}`}
      turnPlayerId={turnPlayerId}
      errorVi={errorVi}
      outcome={outcome}
      statusHint={hint}
      onRestart={handleRestart}
    >
      <div className="mn-counts">
        {MINIGAME_PLAYER_IDS.map((playerId, index) => (
          <span
            key={playerId}
            className="mn-count"
            data-testid={`memory-collected-${index}`}
          >
            {MINIGAME_PLAYER_LABELS[index] ?? playerLabel(playerId)}:{' '}
            {state.collected[index] ?? 0} cặp
          </span>
        ))}
      </div>

      <div
        className="mn-grid mn-grid--memory"
        role="group"
        aria-label="Bàn lật thẻ 4 × 4"
      >
        {state.deck.map((symbol, cell) => {
          const matched = state.matched[cell] === true;
          const faceUp = matched || state.revealed[cell] === true;
          const glyph = MEMORY_SYMBOLS[symbol] ?? '?';
          const classes = ['mn-card'];
          classes.push(faceUp ? 'mn-card--up' : 'mn-card--down');
          if (matched) classes.push('mn-card--matched');
          return (
            <button
              key={cell}
              type="button"
              className={classes.join(' ')}
              data-testid={`memory-card-${cell}`}
              data-face={faceUp ? 'up' : 'down'}
              data-matched={matched ? 'true' : 'false'}
              aria-label={
                faceUp
                  ? `Thẻ ${cell + 1}: ${glyph}`
                  : `Thẻ ${cell + 1} đang úp`
              }
              disabled={finished || matched}
              onClick={() => handleFlip(cell)}
            >
              <span aria-hidden="true">{faceUp ? glyph : '?'}</span>
            </button>
          );
        })}
      </div>
    </MinigameShell>
  );
}
