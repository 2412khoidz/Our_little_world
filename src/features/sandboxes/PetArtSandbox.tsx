import { useEffect, useRef, useState } from 'react';
import {
  CAT_ACCESSORIES,
  CAT_VARIANTS,
  PET_ANIMATION_SPECS,
  type CatAccessoryId,
  type CatCoatVariantId,
  type PetAnimState,
} from '../../shared/petLiving/petVisualTypes';
import { renderLivingCatPreviewToCanvas } from '../../game/pet/petSpriteBuilder';

function LiveCatSpriteCanvas({
  variant,
  accessory,
  animState,
  zoom,
}: {
  variant: CatCoatVariantId;
  accessory: CatAccessoryId;
  animState: PetAnimState;
  zoom: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spec = PET_ANIMATION_SPECS.find((a) => a.key === animState) ?? PET_ANIMATION_SPECS[0]!;

  useEffect(() => {
    let frame = 0;
    const render = () => {
      if (canvasRef.current) {
        renderLivingCatPreviewToCanvas(canvasRef.current, variant, accessory, animState, frame, zoom);
      }
    };
    render();
    const id = window.setInterval(() => {
      frame = (frame + 1) % spec.frameCount;
      render();
    }, Math.max(80, Math.round(1000 / spec.fps)));
    return () => window.clearInterval(id);
  }, [variant, accessory, animState, spec.frameCount, spec.fps, zoom]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: 'pixelated',
        background: '#f4e4c9',
        borderRadius: 12,
        border: '2px solid #8b6246',
      }}
    />
  );
}

export function PetArtSandbox({ onExit }: { onExit?: () => void }) {
  const [selectedAnim, setSelectedAnim] = useState<PetAnimState>('idle_south');
  const [accessory, setAccessory] = useState<CatAccessoryId>('ribbon_rose');

  return (
    <main
      data-testid="pet-art-sandbox"
      style={{
        minHeight: '100vh',
        background: '#2b1e1a',
        color: '#fff6ea',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18 }}>Pet Art &amp; 16-State Animation Sandbox (Dev-Only)</h1>
          <div style={{ fontSize: 12.5, opacity: 0.85 }}>
            3 silhouette &amp; palette độc lập · Sprite gốc 24×24px không mờ vỡ · Tỉ lệ khớp avatar 16×24px Demo E
          </div>
        </div>
        {onExit && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={onExit}>
            Quay lại game
          </button>
        )}
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CAT_ACCESSORIES.map((acc) => (
          <button
            key={acc.id}
            type="button"
            className={`btn btn--sm ${accessory === acc.id ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setAccessory(acc.id)}
          >
            Phụ kiện: {acc.labelVi}
          </button>
        ))}
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {CAT_VARIANTS.map((v) => (
          <div
            key={v.id}
            style={{
              padding: 14,
              borderRadius: 14,
              background: '#fff7eb',
              color: '#3b2420',
              border: '3px solid #9c724d',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              textAlign: 'center',
            }}
          >
            <strong style={{ fontSize: 15 }}>
              {v.defaultNameVi} — {v.titleVi}
            </strong>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <LiveCatSpriteCanvas variant={v.id} accessory={accessory} animState={selectedAnim} zoom={4} />
              <LiveCatSpriteCanvas variant={v.id} accessory={accessory} animState={selectedAnim} zoom={2} />
            </div>
            <div style={{ fontSize: 12, color: '#64443b' }}>{v.silhouetteVi}</div>
          </div>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong style={{ fontSize: 13.5 }}>Chọn Animation để kiểm tra cả 3 mèo ({PET_ANIMATION_SPECS.length} tracks):</strong>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PET_ANIMATION_SPECS.map((spec) => (
            <button
              key={spec.key}
              type="button"
              className={`btn btn--sm ${selectedAnim === spec.key ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setSelectedAnim(spec.key)}
            >
              {spec.labelVi}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
