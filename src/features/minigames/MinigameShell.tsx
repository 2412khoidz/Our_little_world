import type { ReactNode } from 'react';
import type { MinigameOutcome } from '../../shared/minigames';
import { outcomeText } from './useMinigame';

interface MinigameShellProps {
  /** Game title shown at the top of the panel. */
  title: string;
  /** Short Vietnamese subtitle explaining the mode. */
  subtitle: string;
  /** e.g. "Lượt của Người chơi 2"; `null` hides the turn pill. */
  turnLabel: string | null;
  /** Player id owning the turn, used only for the colored dot. */
  turnPlayerId: string | null;
  /** Localized invalid-move message (`MinigameRuleError.messageVi`). */
  errorVi: string | null;
  /** Result of `definition.computeScore(state)`; points are display-only. */
  outcome: MinigameOutcome;
  /** Extra one-line context (auto-pass notice, shot feedback, ...). */
  statusHint: string | null;
  onRestart: () => void;
  /** Game-specific controls rendered next to the restart button. */
  extraControls?: ReactNode;
  children: ReactNode;
  testId: string;
}

/**
 * Shared shell for every hot-seat mini-game:
 * title, turn indicator, localized invalid-move feedback, restart button and a
 * score line. The score line only mirrors `computeScore`; this UI never grants
 * currency, items or any economy value (friendly PvP per MINIGAME_DESIGN.md).
 */
export function MinigameShell({
  title,
  subtitle,
  turnLabel,
  turnPlayerId,
  errorVi,
  outcome,
  statusHint,
  onRestart,
  extraControls,
  children,
  testId,
}: MinigameShellProps) {
  return (
    <section className="mn-shell" data-testid={testId} aria-label={title}>
      <header className="mn-header">
        <h2 className="mn-title">{title}</h2>
        <p className="mn-subtitle">{subtitle}</p>
      </header>

      {turnLabel !== null ? (
        <p
          className="mn-turn"
          data-testid="minigame-turn"
          data-player={turnPlayerId ?? undefined}
        >
          <span className="mn-turn-dot" aria-hidden="true" />
          <span>{turnLabel}</span>
        </p>
      ) : null}

      {errorVi !== null ? (
        <p className="mn-error" role="alert" data-testid="minigame-error">
          {errorVi}
        </p>
      ) : null}

      {statusHint !== null ? (
        <p className="mn-hint" data-testid="minigame-hint">
          {statusHint}
        </p>
      ) : null}

      <div className="mn-status">
        <span className="mn-outcome" data-testid="minigame-outcome">
          {outcomeText(outcome)}
        </span>
        <span className="mn-score" data-testid="minigame-score">
          Điểm: {outcome.points}
        </span>
      </div>

      <div className="mn-controls">
        {extraControls}
        <button
          type="button"
          className="mn-btn mn-btn--ghost"
          data-testid="minigame-restart"
          onClick={onRestart}
        >
          Chơi lại
        </button>
      </div>

      <div className="mn-body">{children}</div>

      <p className="mn-note">Chỉ để vui trong ván, không cộng thưởng.</p>
    </section>
  );
}
