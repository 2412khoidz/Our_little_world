import { useCallback, useEffect, useRef, useState } from 'react';
import { Fish, X } from 'lucide-react';
import {
  createChillReelReady,
  startChillReel,
  tickChillReel,
  type ChillReelState,
} from '../../shared/donor/chill-fishing/reelMinigame';
import { postDonorFishingResolve, postDonorFishingStart } from '../../lib/backend/donorDevLanClient';

interface ChillFishingModalProps {
  worldId: string;
  onClose: () => void;
  onInventoryRefresh: () => Promise<void>;
}

const DEMO_FISH = { reelBehavior: 'normal' as const, speed: 0.6 };

export function ChillFishingModal({ worldId, onClose, onInventoryRefresh }: ChillFishingModalProps) {
  const [phase, setPhase] = useState<'idle' | 'bite' | 'reeling' | 'done'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [reel, setReel] = useState<ChillReelState | null>(null);
  const holding = useRef(false);
  const raf = useRef<number | null>(null);
  const lastTs = useRef(0);

  const startCast = useCallback(async () => {
    const data = await postDonorFishingStart(worldId);
    setPreview(data.preview.name);
    setPhase('bite');
    setMessage('Có cá! Nhấn giữ để kéo dây…');
    window.setTimeout(() => {
      setReel(createChillReelReady(DEMO_FISH, 0.2));
      setPhase('reeling');
    }, 800);
  }, [worldId]);

  useEffect(() => {
    if (phase !== 'reeling' || !reel) return;
    const loop = (ts: number) => {
      if (!lastTs.current) lastTs.current = ts;
      const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      setReel((cur) => {
        if (!cur) return cur;
        let next = cur;
        if (cur.phase === 'reeling_ready') next = startChillReel(cur);
        next = { ...next, holding: holding.current };
        next = tickChillReel(next, dt, () => Math.random());
        if (next.phase === 'caught' || next.phase === 'escaped') {
          void (async () => {
            const resolved = await postDonorFishingResolve(worldId, Math.round(next.progress * 1000));
            setPhase('done');
            setMessage(
              resolved.escaped
                ? `${resolved.labelVi} tuột mất…`
                : `Bắt được ${resolved.labelVi}! (+${resolved.itemSku})`,
            );
            await onInventoryRefresh();
          })();
        }
        return next;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      lastTs.current = 0;
    };
  }, [phase, reel, worldId, onInventoryRefresh]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="donor-fishing-modal">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">
            <Fish size={18} /> Cầu câu (Chill + Meadowbrook)
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 13 }}>{preview ? `Đang thấy: ${preview}` : 'Quăng cần để bắt đầu.'}</p>
        {phase === 'idle' && (
          <button type="button" className="btn btn--primary" onClick={() => void startCast()}>
            Quăng cần
          </button>
        )}
        {phase === 'reeling' && reel && (
          <div
            onPointerDown={() => {
              holding.current = true;
            }}
            onPointerUp={() => {
              holding.current = false;
            }}
            onPointerLeave={() => {
              holding.current = false;
            }}
            style={{
              marginTop: 12,
              height: 28,
              borderRadius: 8,
              background: 'rgba(40,60,80,0.25)',
              position: 'relative',
              touchAction: 'none',
            }}
            data-testid="chill-reel-bar"
          >
            <div
              style={{
                position: 'absolute',
                left: `${reel.zonePos * 100}%`,
                width: `${reel.zoneW * 100}%`,
                top: 4,
                bottom: 4,
                borderRadius: 6,
                background: 'rgba(75,174,230,0.55)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${reel.fishPos * 100}%`,
                top: 6,
                width: 10,
                height: 10,
                marginLeft: -5,
                borderRadius: '50%',
                background: '#e07a5f',
              }}
            />
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