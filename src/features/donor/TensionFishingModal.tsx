import { useCallback, useEffect, useRef, useState } from 'react';
import { Fish, X } from 'lucide-react';
import {
  createTensionReelReady,
  tickTensionReel,
  tensionProgressPermille,
} from '../../shared/donor/canvas-games-fishing/tensionReelSim';
import type { DonorFishingSpotId } from '../../lib/backend/donorDevLanClient';
import { postDonorFishingResolve, postDonorFishingStart } from '../../lib/backend/donorDevLanClient';

interface TensionFishingModalProps {
  worldId: string;
  spotId: DonorFishingSpotId;
  titleVi: string;
  onClose: () => void;
  onInventoryRefresh: () => Promise<void>;
}

export function TensionFishingModal({ worldId, spotId, titleVi, onClose, onInventoryRefresh }: TensionFishingModalProps) {
  const [phase, setPhase] = useState<'idle' | 'reeling' | 'done'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const holding = useRef(false);
  const reelRef = useRef(createTensionReelReady(0.35));
  const [reelUi, setReelUi] = useState({ tension: 0.5, progress: 0 });
  const raf = useRef<number | null>(null);
  const lastTs = useRef(0);

  const startCast = useCallback(async () => {
    const data = await postDonorFishingStart(worldId, spotId);
    setPreview(data.preview.name);
    reelRef.current = createTensionReelReady(0.35);
    setPhase('reeling');
    setMessage('Giữ để kéo — thả khi căng dây quá cao (canvas-games tension).');
  }, [worldId, spotId]);

  useEffect(() => {
    if (phase !== 'reeling') return;
    const loop = (ts: number) => {
      if (!lastTs.current) lastTs.current = ts;
      const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      reelRef.current = {
        ...tickTensionReel({ ...reelRef.current, holding: holding.current }, dt, () => Math.random()),
        holding: holding.current,
      };
      setReelUi({ tension: reelRef.current.reelTension, progress: reelRef.current.reelProgress });
      if (reelRef.current.phase === 'caught' || reelRef.current.phase === 'escaped') {
        void (async () => {
          const resolved = await postDonorFishingResolve(worldId, tensionProgressPermille(reelRef.current));
          setPhase('done');
          setMessage(
            resolved.escaped
              ? `${resolved.labelVi} tuột mất…`
              : `Bắt được ${resolved.labelVi}! (+${resolved.itemSku})`,
          );
          await onInventoryRefresh();
        })();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      lastTs.current = 0;
    };
  }, [phase, worldId, onInventoryRefresh]);

  const { tension, progress } = reelUi;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="donor-stream-fishing-modal">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">
            <Fish size={18} /> {titleVi}
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        {phase === 'idle' && (
          <button type="button" className="btn btn--primary" onClick={() => void startCast()}>
            Quăng cần
          </button>
        )}
        {preview && <p style={{ fontSize: 13 }}>Mồi thấy: {preview}</p>}
        {phase === 'reeling' && (
          <div
            style={{ marginTop: 12, touchAction: 'none' }}
            onPointerDown={() => {
              holding.current = true;
            }}
            onPointerUp={() => {
              holding.current = false;
            }}
            onPointerLeave={() => {
              holding.current = false;
            }}
            data-testid="tension-reel-bar"
          >
            <div style={{ fontSize: 12, marginBottom: 4 }}>Căng dây: {Math.round(tension * 100)}% · Tiến độ: {Math.round(progress * 100)}%</div>
            <div style={{ height: 12, borderRadius: 6, background: 'rgba(40,40,40,0.2)', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: `${tension * 100}%`,
                  top: 2,
                  width: 8,
                  height: 8,
                  marginLeft: -4,
                  borderRadius: '50%',
                  background: tension > 0.85 || tension < 0.15 ? '#c44' : '#4a9',
                }}
              />
            </div>
          </div>
        )}
        <p style={{ fontSize: 13, marginTop: 10 }}>{message}</p>
        {phase === 'done' && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
            Đóng
          </button>
        )}
      </div>
    </div>
  );
}