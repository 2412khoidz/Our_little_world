import type { ContextualResolution } from '../../shared/interaction/interactionTypes';

interface ContextualPromptBadgeProps {
  resolution: ContextualResolution;
  unavailableToast?: string | null;
  disabled?: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
}

export function ContextualPromptBadge({
  resolution,
  unavailableToast,
  disabled,
  onPrimary,
  onSecondary,
}: ContextualPromptBadgeProps) {
  if (!resolution.primary && !resolution.secondary && !unavailableToast) return null;

  return (
    <div
      data-testid="contextual-prompt-badge"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {unavailableToast && (
        <div
          className="olw-game-window"
          style={{
            padding: '5px 12px',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {unavailableToast}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {resolution.primary && (
          <button
            type="button"
            className="olw-game-window"
            data-testid="btn-context-primary"
            disabled={disabled}
            onClick={onPrimary}
            style={{
              padding: '7px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              opacity: resolution.primary.available ? 1 : 0.72,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span className="olw-keycap">{resolution.primary.keyHint}</span>
            <span>{resolution.primary.labelVi}</span>
          </button>
        )}

        {resolution.secondary && (
          <button
            type="button"
            className="olw-game-window"
            data-testid="btn-context-secondary"
            disabled={disabled}
            onClick={onSecondary}
            style={{
              padding: '7px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <span className="olw-keycap">{resolution.secondary.keyHint}</span>
            <span>{resolution.secondary.labelVi}</span>
          </button>
        )}
      </div>
    </div>
  );
}
