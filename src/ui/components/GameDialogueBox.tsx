import { useEffect, useRef } from 'react';
import type { CatAccessoryId, CatCoatVariantId } from '../../shared/petLiving/petVisualTypes';
import { renderLivingCatPreviewToCanvas } from '../../game/pet/petSpriteBuilder';

interface GameDialogueBoxProps {
  speakerName: string;
  text: string;
  catPortrait?: { variant: CatCoatVariantId; accessory: CatAccessoryId };
  actions?: Array<{ id: string; labelVi: string; primary?: boolean; onClick: () => void }>;
  onDismiss: () => void;
}

export function GameDialogueBox({
  speakerName,
  text,
  catPortrait,
  actions,
  onDismiss,
}: GameDialogueBoxProps) {
  const portraitRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (portraitRef.current && catPortrait) {
      renderLivingCatPreviewToCanvas(
        portraitRef.current,
        catPortrait.variant,
        catPortrait.accessory,
        'pet_purr',
        1,
        3,
      );
    }
  }, [catPortrait]);

  return (
    <div
      className="olw-game-window"
      data-testid="game-dialogue-box"
      style={{
        padding: '12px 14px',
        maxWidth: 460,
        width: 'calc(100vw - 24px)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}
    >
      {catPortrait && (
        <canvas
          ref={portraitRef}
          style={{
            imageRendering: 'pixelated',
            borderRadius: 10,
            border: '2px solid var(--ui-border-inner)',
            background: 'var(--ui-bg-inset)',
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ui-accent-primary-dark)' }}>
          {speakerName}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{text}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {actions?.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`olw-bookmark-tab ${a.primary ? 'olw-bookmark-tab--active' : ''}`}
              onClick={a.onClick}
              style={{ minHeight: 34, fontSize: 12 }}
            >
              {a.labelVi}
            </button>
          ))}
          <button
            type="button"
            className="olw-bookmark-tab"
            onClick={onDismiss}
            style={{ minHeight: 34, fontSize: 12 }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
