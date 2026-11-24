import { useEffect, useRef, useState } from 'react';
import { createArtDemoGame } from '../../game/artDemos/createArtDemoGame';
import { ART_DEMO_METADATA, type ArtDemoId, type CameraPreset } from '../../game/artDemos/types';
import './artDemo.css';

interface ArtDemoShowcaseProps {
  initialDemoId: ArtDemoId;
}

const DEMO_ORDER: ArtDemoId[] = ['A', 'B', 'C', 'D', 'E'];
const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'overview', label: 'Toàn cảnh' },
  { id: 'interior', label: 'Trong nhà' },
  { id: 'garden', label: 'Ngoài vườn' },
];

export function ArtDemoShowcase({ initialDemoId }: ArtDemoShowcaseProps) {
  const [demoId, setDemoId] = useState<ArtDemoId>(initialDemoId);
  const [preset, setPreset] = useState<CameraPreset>(() => {
    const raw = new URLSearchParams(window.location.search).get('view');
    if (raw === 'interior' || raw === 'garden') return raw;
    return 'overview';
  });
  const [showNotes, setShowNotes] = useState(false);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const meta = ART_DEMO_METADATA[demoId];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const url = new URL(window.location.href);
    url.searchParams.set('art-demo', demoId);
    url.searchParams.set('view', preset);
    window.history.replaceState({}, '', url);

    const game = createArtDemoGame(host, demoId, preset);
    return () => {
      game.destroy(true);
    };
    // Intentionally recreate Phaser scene only on demoId change; preset updates camera live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', preset);
    window.history.replaceState({}, '', url);
    window.dispatchEvent(new CustomEvent('olw-art-demo-preset', { detail: { preset } }));
  }, [preset]);

  return (
    <div className="art-demo-showcase" data-testid="art-demo-showcase">
      <div className="art-demo-canvas-host" ref={hostRef} />

      <div className="art-demo-top-bar">
        <div className="art-demo-title-badge">
          <span className="art-demo-dot" style={{ background: meta.accentHex }} />
          <span className="art-demo-title-desktop">{meta.fullTitle}</span>
          <span className="art-demo-title-mobile">{meta.shortTitle}</span>
        </div>

        <nav className="art-demo-pill-group" aria-label="Chọn bản demo mỹ thuật">
          {DEMO_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={`art-demo-tab ${demoId === id ? 'art-demo-tab--active' : ''}`}
              onClick={() => setDemoId(id)}
            >
              {id === 'E' ? 'Demo E · Hợp nhất' : `Demo ${id}`}
            </button>
          ))}
        </nav>
      </div>

      <div className="art-demo-bottom-bar">
        <div className="art-demo-pill-group" role="group" aria-label="Góc nhìn">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`art-demo-tab ${preset === p.id ? 'art-demo-tab--active' : ''}`}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="art-demo-pill-group">
          <button
            type="button"
            className={`art-demo-tab ${showNotes ? 'art-demo-tab--active' : ''}`}
            onClick={() => setShowNotes((v) => !v)}
          >
            {showNotes ? 'Ẩn đánh giá' : 'Chi tiết & License'}
          </button>
        </div>
      </div>

      {showNotes && (
        <aside className="art-demo-info-drawer" aria-label="Thông tin gói asset">
          <h2>{meta.shortTitle}</h2>
          <p>{meta.subtitle}</p>
          <p>
            <strong>Giấy phép:</strong> {meta.licenseSummary}
          </p>
          <strong>Điểm mạnh:</strong>
          <ul>
            {meta.highlightsVi.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <strong>Thiếu ở bản miễn phí:</strong>
          <ul>
            {meta.gapsVi.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
