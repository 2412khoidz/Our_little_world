import { useEffect, useRef } from 'react';
import { getPetFoodSpec } from '../../shared/petLiving/petFoodCatalog';
import type { CatAccessoryId, CatCoatVariantId } from '../../shared/petLiving/petVisualTypes';
import { renderLivingCatPreviewToCanvas } from '../../game/pet/petSpriteBuilder';

export interface PetNotebookProfile {
  name: string;
  variant: CatCoatVariantId;
  accessory: CatAccessoryId;
  adoptedDateLabel: string;
  personalityLabelVi: string;
  discoveredFavoriteFoodSkus: readonly string[];
  discoveredFavoriteToyVi: string | null;
  discoveredFavoriteSpotVi: string | null;
  recentMemoriesVi: readonly string[];
  subtleCareHintVi: string | null;
}

/**
 * Cozy family-member scrapbook page for the cat.
 * Intentionally omits numeric need meters, utility scores, and any caregiver affection ranking.
 */
export function PetNotebookPage({ profile }: { profile: PetNotebookProfile }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    renderLivingCatPreviewToCanvas(
      canvasRef.current,
      profile.variant,
      profile.accessory,
      'idle_south',
      0,
      4,
    );
  }, [profile.variant, profile.accessory]);

  return (
    <div data-testid="pet-notebook-page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        className="olw-polaroid"
        style={{ display: 'flex', gap: 12, alignItems: 'center' }}
      >
        <canvas
          ref={canvasRef}
          style={{
            imageRendering: 'pixelated',
            background: '#f7ead6',
            borderRadius: 8,
            border: '2px solid var(--ui-border-inner)',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{profile.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ui-ink-muted)' }}>
            Ngày về nhà: {profile.adoptedDateLabel}
          </div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>
            Tính cách quan sát được: <strong>{profile.personalityLabelVi}</strong>
          </div>
        </div>
      </div>

      {profile.subtleCareHintVi && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--ui-bg-inset)',
            fontSize: 12.5,
          }}
        >
          💭 {profile.subtleCareHintVi}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, fontSize: 12.5 }}>
        <div style={{ padding: 10, borderRadius: 10, background: 'var(--ui-bg-inset)' }}>
          <strong>Món đã khám phá:</strong>
          <div style={{ marginTop: 4 }}>
            {profile.discoveredFavoriteFoodSkus.length > 0
              ? profile.discoveredFavoriteFoodSkus
                  .map((s) => getPetFoodSpec(s)?.nameVi ?? s)
                  .join(', ')
              : '??? (hãy thử nhiều món nhé)'}
          </div>
        </div>

        <div style={{ padding: 10, borderRadius: 10, background: 'var(--ui-bg-inset)' }}>
          <strong>Đồ chơi &amp; Góc quen:</strong>
          <div style={{ marginTop: 4 }}>
            Đồ chơi: {profile.discoveredFavoriteToyVi ?? '??? (chưa rõ)'}
          </div>
          <div>Góc thích: {profile.discoveredFavoriteSpotVi ?? '??? (chưa rõ)'}</div>
        </div>
      </div>

      <div style={{ padding: 10, borderRadius: 10, background: 'var(--ui-bg-inset)', fontSize: 12.5 }}>
        <strong>Kỷ niệm nhỏ của bé:</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          {profile.recentMemoriesVi.map((m, idx) => (
            <li key={idx}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
