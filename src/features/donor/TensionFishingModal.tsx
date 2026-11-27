import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createTensionReelReady,
  tickTensionReel,
  tensionProgressPermille,
} from '../../shared/donor/canvas-games-fishing/tensionReelSim';
import { createTidefallFishingIdle } from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import { loadFishingFrenzyArt, type FishingFrenzyArtBundle } from '../../shared/donor/fishing-frenzy/fishingFrenzyArt';
import { resolveCanonicalFishByCritterId } from '../../shared/donor/fishing/canonicalFishRegistry';
import type { DonorFishingSpotId } from '../../lib/backend/donorDevLanClient';
import { postDonorFishingResolve, postDonorFishingStart, postDonorFishingSync } from '../../lib/backend/donorDevLanClient';
import { gameEventBus } from '../../game/eventBus';
import { buildWorldAvatarCanvas, loadAvatarAtlas } from '../../game/art/worldAvatarCanvas';
import type { AvatarConfig } from '../../shared/types';
import { CatchRevealCard, FishingFishArt, FishingModalFrame, type FishingCatchPresentation } from './FishingModalFrame';
import { drawTidefallFishingScene } from './tidefallFishingCanvas';
import { loadRanchFishingUiArt, type RanchFishingUiArt } from './ranchFishingUiArt';
import { playCastWhoosh, playCatchFanfare, playEscapeSplash } from './fishingAudio';

interface TensionFishingModalProps {
  worldId: string;
  spotId: DonorFishingSpotId;
  titleVi: string;
  localAvatarConfig?: AvatarConfig;
  onClose: () => void;
  onInventoryRefresh: () => Promise<void>;
  onSwitchMode?: () => void;
}

export function TensionFishingModal({
  worldId, spotId, titleVi, localAvatarConfig, onClose, onInventoryRefresh, onSwitchMode,
}: TensionFishingModalProps) {
  const [phase, setPhase] = useState<'idle' | 'reeling' | 'done'>('idle');
  const [casting, setCasting] = useState(false);
  const [target, setTarget] = useState<{ name: string; spriteUrl: string } | null>(null);
  const [outcome, setOutcome] = useState<FishingCatchPresentation | null>(null);
  const [error, setError] = useState('');
  const [pulling, setPulling] = useState(false);
  const active = useRef(false);
  const ownsRound = useRef(false);
  const holding = useRef(false);
  const reel = useRef(createTensionReelReady(0.35));
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const tensionMeter = useRef<HTMLDivElement | null>(null);
  const progressMeter = useRef<HTMLProgressElement | null>(null);
  const art = useRef<RanchFishingUiArt | null>(null);
  const frenzy = useRef<FishingFrenzyArtBundle | null>(null);
  const avatar = useRef<HTMLCanvasElement | null>(null);
  const renderState = useRef(createTidefallFishingIdle());
  const refreshInventory = useRef(onInventoryRefresh);
  useEffect(() => { refreshInventory.current = onInventoryRefresh; }, [onInventoryRefresh]);

  useEffect(() => {
    active.current = true;
    void Promise.all([loadRanchFishingUiArt(), loadFishingFrenzyArt()])
      .then(([ranchArt, frenzyArt]) => {
        if (!active.current) return;
        art.current = ranchArt;
        frenzy.current = frenzyArt;
      })
      .catch(() => { if (active.current) setError('Chưa tải được hình ảnh câu cá.'); });
    return () => {
      active.current = false;
      holding.current = false;
      gameEventBus.emit('cmd:fishing-visual', { spotId, phase: 'idle' });
      if (ownsRound.current) {
        ownsRound.current = false;
        void postDonorFishingSync(worldId, { spotId, phase: 'idle', progressPermille: 0, pointerNorm: 0.5 })
          .catch(() => undefined);
      }
    };
  }, [spotId, worldId]);

  useEffect(() => {
    if (!localAvatarConfig) return;
    let cancelled = false;
    void loadAvatarAtlas().then((image) => {
      if (image && !cancelled) avatar.current = buildWorldAvatarCanvas(image, localAvatarConfig);
    });
    return () => { cancelled = true; };
  }, [localAvatarConfig]);

  const hold = useCallback((pressed: boolean) => {
    holding.current = pressed;
    setPulling(pressed);
  }, []);

  const startCast = async () => {
    setCasting(true);
    setError('');
    setOutcome(null);
    try {
      const { preview } = await postDonorFishingStart(worldId, spotId);
      if (!active.current) return;
      ownsRound.current = true;
      const fallback = resolveCanonicalFishByCritterId(preview.critterId ?? preview.name);
      setTarget({ name: preview.labelVi ?? fallback.labelVi, spriteUrl: preview.spriteUrl ?? fallback.spriteUrl });
      reel.current = createTensionReelReady(0.35);
      renderState.current = { ...createTidefallFishingIdle(), phase: 'casting' };
      gameEventBus.emit('cmd:fishing-visual', { spotId, phase: 'casting' });
      playCastWhoosh();
      setPhase('reeling');
    } catch {
      if (active.current) setError('Chưa quăng được cần. Thử lại nhé.');
    } finally {
      if (active.current) setCasting(false);
    }
  };

  useEffect(() => {
    let frame = 0;
    let lastTime: number | undefined;
    let resolving = false;
    const ctx = canvas.current?.getContext('2d');
    const resolve = async () => {
      resolving = true;
      hold(false);
      try {
        const result = await postDonorFishingResolve(worldId, tensionProgressPermille(reel.current));
        if (!active.current) return;
        ownsRound.current = false;
        const fallback = resolveCanonicalFishByCritterId(result.critterId ?? '');
        const spriteUrl = result.spriteUrl ?? fallback.spriteUrl;
        setOutcome({ escaped: result.escaped, labelVi: result.labelVi, rarity: result.rarity ?? fallback.rarity, spriteUrl });
        renderState.current = { ...renderState.current, phase: result.escaped ? 'escaped' : 'landed', elapsedMs: 0 };
        gameEventBus.emit('cmd:fishing-visual', {
          spotId, phase: result.escaped ? 'escaped' : 'landed', spriteUrl,
        });
        if (result.escaped) playEscapeSplash();
        else playCatchFanfare(['rare', 'epic', 'legendary'].includes(result.rarity ?? fallback.rarity));
        void refreshInventory.current().catch(() => undefined);
      } catch {
        if (!active.current) return;
        setError('Chưa lưu được kết quả. Thử quăng lại nhé.');
        gameEventBus.emit('cmd:fishing-visual', { spotId, phase: 'idle' });
      } finally {
        if (active.current) setPhase('done');
      }
    };
    const loop = (now: number) => {
      const elapsed = Math.min(50, now - (lastTime ?? now));
      lastTime = now;
      const visual = renderState.current;
      const elapsedMs = visual.elapsedMs + elapsed;
      if (phase === 'reeling' && !resolving) {
        reel.current = tickTensionReel({ ...reel.current, holding: holding.current }, elapsed / 1000, Math.random);
        const { reelTension, reelProgress, phase: reelPhase } = reel.current;
        if (tensionMeter.current) {
          tensionMeter.current.style.setProperty('--tension', `${reelTension * 100}%`);
          tensionMeter.current.setAttribute('aria-valuenow', String(Math.round(reelTension * 100)));
        }
        if (progressMeter.current) progressMeter.current.value = reelProgress;
        if (visual.phase === 'casting' && elapsedMs >= 520) {
          gameEventBus.emit('cmd:fishing-visual', { spotId, phase: 'reeling' });
          renderState.current = { ...visual, phase: 'minigame', elapsedMs: 0 };
        } else {
          renderState.current = { ...visual, elapsedMs, bobberDip: holding.current ? 0.1 + reelTension * 0.3 : 0 };
        }
        if (reelPhase === 'caught' || reelPhase === 'escaped') void resolve();
      } else {
        renderState.current = { ...visual, elapsedMs };
      }
      if (ctx && art.current) {
        drawTidefallFishingScene(ctx, 360, 210, renderState.current, art.current, spotId, frenzy.current, {
          localAvatarCanvas: avatar.current, useTensionMeter: true,
        });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase, spotId, worldId, hold]);

  return (
    <FishingModalFrame title={titleVi} testId="donor-stream-fishing-modal" onClose={onClose}>
      <div className="ranch-fishing__body">
        <canvas ref={canvas} width={360} height={210} className="ranch-fishing__canvas" />
        <div className="ranch-fishing__side">
          {error && <p className="cozy-alert" role="alert">{error}</p>}
          {phase === 'reeling' && target && (
            <div className="ranch-fishing__kit"><FishingFishArt spriteUrl={target.spriteUrl} /><strong>{target.name}</strong></div>
          )}
          {outcome && <CatchRevealCard {...outcome} />}
          {phase === 'reeling' ? (
            <>
              <div className="ranch-fishing__meter">
                <span>Độ căng dây</span>
                <div
                  ref={tensionMeter}
                  className="ranch-fishing__tension"
                  role="meter"
                  aria-label="Độ căng dây"
                  aria-valuenow={50}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
                <label htmlFor="ranch-reel-progress">Kéo cá lên</label>
                <progress ref={progressMeter} id="ranch-reel-progress" value={0} max={1} />
              </div>
              <div className="ranch-fishing__actions">
                <button
                  type="button"
                  className="btn btn--primary ranch-fishing__hold"
                  data-testid="tension-reel-bar"
                  aria-pressed={pulling}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    hold(true);
                  }}
                  onPointerUp={() => hold(false)}
                  onPointerCancel={() => hold(false)}
                  onLostPointerCapture={() => hold(false)}
                  onBlur={() => hold(false)}
                  onKeyDown={(event) => {
                    if (event.key !== ' ' && event.key !== 'Enter') return;
                    event.preventDefault();
                    hold(true);
                  }}
                  onKeyUp={(event) => {
                    if (event.key !== ' ' && event.key !== 'Enter') return;
                    event.preventDefault();
                    hold(false);
                  }}
                >{pulling ? 'Đang kéo…' : 'Giữ để kéo'}</button>
              </div>
              <p className="ranch-fishing__status">Giữ kim trong vùng xanh. Thả tay khi dây căng.</p>
            </>
          ) : (
            <>
              {!outcome && <p className="ranch-fishing__status">Giữ nút để kéo cá, thả tay để nới dây.</p>}
              <div className="ranch-fishing__actions">
                <button type="button" className="btn btn--primary" disabled={casting} onClick={() => void startCast()}>
                  {phase === 'done' ? 'Quăng lại' : 'Quăng cần'}
                </button>
                {onSwitchMode && (
                  <button type="button" className="btn btn--secondary" disabled={casting} onClick={onSwitchMode}>Câu theo nhịp</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </FishingModalFrame>
  );
}
