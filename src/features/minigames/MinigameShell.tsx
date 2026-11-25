import { Volume2, VolumeX } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { MinigameOutcome } from '../../shared/minigames';
import { coupleDisplayFor } from './minigameCoupleDisplay';
import {
  isMinigameSoundMuted,
  setMinigameSoundMuted,
} from './minigameAudio';
import { MINIGAME_PLAYER_IDS } from './useMinigame';
import { outcomeText } from './useMinigame';

interface MinigameShellProps {
  title: string;
  subtitle: string;
  turnLabel: string | null;
  turnPlayerId: string | null;
  errorVi: string | null;
  outcome: MinigameOutcome;
  statusHint: string | null;
  onRestart: () => void;
  extraControls?: ReactNode;
  children: ReactNode;
  testId: string;
}

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
  const [muted, setMuted] = useState(() => isMinigameSoundMuted());

  return (
    <section className="mn-shell" data-testid={testId} aria-label={title}>
      <header className="mn-header">
        <div className="mn-header-row">
          <div>
            <h2 className="mn-title">{title}</h2>
            <p className="mn-subtitle">{subtitle}</p>
          </div>
          <div className="mn-header-tools">
            <a className="mn-btn mn-btn--ghost mn-btn--compact" href="/" data-testid="minigame-exit">
              Về nhà
            </a>
            <button
              type="button"
              className="mn-btn mn-btn--ghost mn-btn--compact mn-btn--icon"
              data-testid="minigame-mute"
              aria-pressed={muted}
              onClick={() => {
                const next = !muted;
                setMinigameSoundMuted(next);
                setMuted(next);
              }}
            >
              {muted ? (
                <VolumeX size={18} strokeWidth={2.2} aria-hidden />
              ) : (
                <Volume2 size={18} strokeWidth={2.2} aria-hidden />
              )}
              <span className="mn-sr-only">{muted ? 'Bật âm thanh' : 'Tắt âm thanh'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mn-couple-strip" data-testid="minigame-couple-strip">
        {MINIGAME_PLAYER_IDS.map((id) => {
          const d = coupleDisplayFor(id);
          const active = turnPlayerId === id && turnLabel !== null;
          return (
            <span
              key={id}
              className={`mn-couple-pill${active ? ' mn-couple-pill--active' : ''}`}
              data-testid={`minigame-player-${id}`}
            >
              <span className={`mn-couple-icon ${d.iconClass}`} aria-hidden="true" />
              {d.label}
            </span>
          );
        })}
      </div>

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

      <p className="mn-note">
        Chỉ để vui trong ván · {coupleDisplayFor(MINIGAME_PLAYER_IDS[0]).label} &{' '}
        {coupleDisplayFor(MINIGAME_PLAYER_IDS[1]).label} · không cộng thưởng.
      </p>
    </section>
  );
}