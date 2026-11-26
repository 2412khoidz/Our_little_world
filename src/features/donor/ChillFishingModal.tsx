import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fish, Volume2, VolumeX, X } from 'lucide-react';
import { gameAudio } from '../../game/audio/gameAudioManager';
import type { AvatarConfig } from '../../shared/types';
import {
  beginTidefallCast,
  createTidefallFishingIdle,
  isPointerInTidefallZone,
  pickPersonality,
  tidefallHookStrike,
  tidefallMinigameTap,
  tidefallProgressPermille,
  tickTidefallFishing,
  type TidefallFishPersonality,
  type TidefallFishingState,
} from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import { DONOR_FISHING_SPOTS, type DonorFishingSpotId } from '../../shared/donor/donorFishingSpots';
import {
  fetchDonorFishingSession,
  postDonorFishingResolve,
  postDonorFishingStart,
  postDonorFishingSync,
  type DonorFishingSpotId as SpotId,
} from '../../lib/backend/donorDevLanClient';
import { loadTidefallFishingArt, type TidefallFishingArtBundle } from '../../shared/donor/tidefall-phaser/tidefallFishingArt';
import { loadFishingFrenzyArt, type FishingFrenzyArtBundle } from '../../shared/donor/fishing-frenzy/fishingFrenzyArt';
import { fishingFrenzySpritePathForFish } from '../../shared/donor/fishing-frenzy/fishingFrenzySpriteMap';
import { tidefallFishNameVi } from '../../shared/donor/fishing-frenzy/fishingFrenzyFishVi';
import { FISHING_FRENZY_RARITY_BORDER, fishingFrenzyRarityGlow } from '../../shared/donor/fishing-frenzy/fishingFrenzyRarityUi';
import { buildWorldAvatarCanvas, loadAvatarAtlas } from '../../game/art/worldAvatarCanvas';
import { drawTidefallFishingScene } from './tidefallFishingCanvas';
import { TidefallFishingFirstRun } from './TidefallFishingFirstRun';
import {
  isFishingAudioMuted,
  playBiteAlert,
  playCastWhoosh,
  playCatchFanfare,
  playEscapeSplash,
  playReelTick,
  playWaterSplash,
  setFishingAudioMuted,
} from './fishingAudio';
import {
  matchTidefallCatalogByPreviewName,
  tidefallFishForDonorSpot,
  tidefallFishRarityLabelVi,
  type TidefallFishEntry,
} from '../../shared/donor/tidefall-phaser/tidefallFishCatalog';

interface ChillFishingModalProps {
  worldId: string;
  spotId?: DonorFishingSpotId;
  localUserId?: string;
  localAvatarConfig?: AvatarConfig;
  onClose: () => void;
  onInventoryRefresh: () => Promise<void>;
}

function phaseMessageVi(phase: TidefallFishingState['phase'], observe: boolean, spotId: DonorFishingSpotId): string {
  if (observe) return 'Đang xem người thương câu cùng chỗ trên bến!';
  const water = spotId === 'east_stream' ? 'dòng suối' : spotId === 'gull_bay' ? 'làn nước biển' : 'mặt ao';
  switch (phase) {
    case 'idle':
      return `Chạm Quăng cần để thả phao xuống ${water}.`;
    case 'casting':
      return 'Vụt! Đang thả dây câu…';
    case 'waiting':
      return 'Chú ý mặt nước — chờ phao tụt xuống nhé.';
    case 'bite':
      return 'Cá đang cắn câu! Chạm Gài móc! ngay!';
    case 'minigame':
      return 'Chạm vào mặt nước mỗi khi thoi vàng đi vào vùng xanh!';
    case 'landed':
      return 'Kéo lên thành công!';
    case 'escaped':
      return 'Ôi, cá vẫy đuôi thoát mất rồi…';
    default:
      return '';
  }
}

export function speciesParamsForFish(
  fish: TidefallFishEntry | null,
  rng: () => number,
): {
  personality: TidefallFishPersonality;
  targetWidth: number;
  pointerSpeed: number;
  targetDriftAmp: number;
  targetDriftFreq: number;
  speedSurgeAmp: number;
  hitGain: number;
  missPenalty: number;
  biteWindowMs: number;
} {
  if (!fish) {
    const fallbackP = pickPersonality(rng);
    return {
      personality: fallbackP,
      targetWidth: fallbackP === 'LEGENDARY' ? 0.19 : fallbackP === 'TIMID' ? 0.36 : 0.3,
      pointerSpeed: fallbackP === 'AGGRESSIVE' ? 1.48 : 1.25,
      targetDriftAmp: fallbackP === 'LEGENDARY' ? 0.16 : 0.05,
      targetDriftFreq: 1.5,
      speedSurgeAmp: fallbackP === 'LEGENDARY' ? 0.18 : 0,
      hitGain: 0.18,
      missPenalty: 0.11,
      biteWindowMs: 5200,
    };
  }
  switch (fish.rarity) {
    case 'legendary':
      return {
        personality: 'LEGENDARY',
        targetWidth: 0.17,
        pointerSpeed: 1.98,
        targetDriftAmp: 0.2,
        targetDriftFreq: 2.5,
        speedSurgeAmp: 0.22,
        hitGain: 0.13,
        missPenalty: 0.14,
        biteWindowMs: 3200,
      };
    case 'epic':
      return {
        personality: 'AGGRESSIVE',
        targetWidth: 0.21,
        pointerSpeed: 1.72,
        targetDriftAmp: 0.15,
        targetDriftFreq: 2.1,
        speedSurgeAmp: 0.14,
        hitGain: 0.15,
        missPenalty: 0.13,
        biteWindowMs: 3800,
      };
    case 'rare':
      return {
        personality: 'AGGRESSIVE',
        targetWidth: 0.25,
        pointerSpeed: 1.5,
        targetDriftAmp: 0.11,
        targetDriftFreq: 1.65,
        speedSurgeAmp: 0.08,
        hitGain: 0.16,
        missPenalty: 0.12,
        biteWindowMs: 4400,
      };
    case 'uncommon':
      return {
        personality: 'NORMAL',
        targetWidth: 0.31,
        pointerSpeed: 1.28,
        targetDriftAmp: 0.06,
        targetDriftFreq: 1.2,
        speedSurgeAmp: 0,
        hitGain: 0.19,
        missPenalty: 0.11,
        biteWindowMs: 5200,
      };
    default:
      return {
        personality: 'TIMID',
        targetWidth: 0.38,
        pointerSpeed: 1.06,
        targetDriftAmp: 0,
        targetDriftFreq: 1.0,
        speedSurgeAmp: 0,
        hitGain: 0.22,
        missPenalty: 0.09,
        biteWindowMs: 6000,
      };
  }
}

const TIDEFALL_POND_SPOTS = new Set<DonorFishingSpotId>(['meadow_pond', 'gull_bay']);

function MotionTargetRow({ fish }: { fish: TidefallFishEntry }) {
  const nameVi = tidefallFishNameVi(fish.id, fish.name);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        margin: '0 0 6px',
        padding: '4px 10px',
        borderRadius: 10,
        background: 'rgba(139, 90, 43, 0.12)',
        border: `1px solid ${FISHING_FRENZY_RARITY_BORDER[fish.rarity]}`,
        fontSize: 12,
      }}
      data-testid="tidefall-active-fish"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src={fishingFrenzySpritePathForFish(fish.id, { biome: fish.biome, rarity: fish.rarity })}
          alt=""
          width={42}
          height={24}
          style={{ imageRendering: 'pixelated' }}
        />
        <span>
          Bóng cá: <strong>{nameVi}</strong>
        </span>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#5c351e',
          padding: '2px 7px',
          borderRadius: 999,
          background: '#fff4dc',
        }}
      >
        {tidefallFishRarityLabelVi(fish.rarity)}
      </span>
    </div>
  );
}

function CatchRevealCard({
  rarity,
  spriteUrl,
  escaped,
  labelVi,
}: {
  rarity: import('../../shared/donor/tidefall-phaser/tidefallFishCatalog').TidefallFishRarity;
  spriteUrl: string;
  escaped: boolean;
  labelVi: string;
}) {
  return (
    <div
      data-testid="fishing-frenzy-catch-reveal"
      style={{
        marginTop: 8,
        padding: '10px 12px',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: `2px solid ${FISHING_FRENZY_RARITY_BORDER[rarity]}`,
        boxShadow: fishingFrenzyRarityGlow(rarity),
        background: escaped ? 'rgba(180, 90, 70, 0.12)' : 'rgba(255, 247, 224, 0.92)',
      }}
    >
      <img
        src={spriteUrl}
        alt=""
        width={64}
        height={36}
        style={{ imageRendering: 'pixelated', flexShrink: 0, filter: escaped ? 'grayscale(0.75) opacity(0.7)' : 'none' }}
      />
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#422614' }}>
          {escaped ? `${labelVi} tuột mất…` : `Tuyệt vời! Bắt được ${labelVi}`}
        </div>
        <div style={{ fontSize: 11.5, color: '#6b4428' }}>
          Độ hiếm: {tidefallFishRarityLabelVi(rarity)} · {escaped ? 'Thử quăng lại nhé!' : '+1 đã thêm vào túi chung'}
        </div>
      </div>
    </div>
  );
}

export function ChillFishingModal({
  worldId,
  spotId = 'meadow_pond',
  localUserId,
  localAvatarConfig,
  onClose,
  onInventoryRefresh,
}: ChillFishingModalProps) {
  const spotDef = DONOR_FISHING_SPOTS[spotId];
  const pondSpot = TIDEFALL_POND_SPOTS.has(spotId);
  const spotCatalog = useMemo(
    () => (pondSpot ? tidefallFishForDonorSpot(spotId as 'meadow_pond' | 'gull_bay') : []),
    [pondSpot, spotId],
  );
  const [fsm, setFsm] = useState<TidefallFishingState>(() => createTidefallFishingIdle());
  const [preview, setPreview] = useState<string | null>(null);
  const activeCatalogFish = preview ? matchTidefallCatalogByPreviewName(preview) : null;
  const [message, setMessage] = useState(() => phaseMessageVi('idle', false, spotId));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [observeMode, setObserveMode] = useState(false);
  const [partnerFishingNear, setPartnerFishingNear] = useState(false);
  const [outcomeVi, setOutcomeVi] = useState<string | null>(null);
  const [art, setArt] = useState<TidefallFishingArtBundle | null>(null);
  const [frenzyArt, setFrenzyArt] = useState<FishingFrenzyArtBundle | null>(null);
  const [localAvatarCanvas, setLocalAvatarCanvas] = useState<HTMLCanvasElement | null>(null);
  const [catchOutcome, setCatchOutcome] = useState<{
    escaped: boolean;
    labelVi: string;
    rarity: import('../../shared/donor/tidefall-phaser/tidefallFishCatalog').TidefallFishRarity;
    spriteUrl: string;
  } | null>(null);
  const [muted, setMuted] = useState(() => isFishingAudioMuted());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const artRef = useRef<TidefallFishingArtBundle | null>(null);
  const frenzyArtRef = useRef<FishingFrenzyArtBundle | null>(null);
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeFishRef = useRef<TidefallFishEntry | null>(null);
  const spotRef = useRef(spotId);
  const fsmRef = useRef(fsm);
  const previewRef = useRef(preview);
  const observeRef = useRef(observeMode);
  const partnerRef = useRef(observeMode || partnerFishingNear);
  const anglerRef = useRef(!observeMode);
  const raf = useRef<number | null>(null);
  const lastTs = useRef(0);
  const syncTs = useRef(0);
  const resolveGuard = useRef(false);

  useEffect(() => {
    fsmRef.current = fsm;
    previewRef.current = preview;
    observeRef.current = observeMode;
    partnerRef.current = observeMode || partnerFishingNear;
    anglerRef.current = !observeMode;
    artRef.current = art;
    frenzyArtRef.current = frenzyArt;
    avatarCanvasRef.current = localAvatarCanvas;
    activeFishRef.current = activeCatalogFish;
    spotRef.current = spotId;
  }, [
    fsm,
    preview,
    observeMode,
    partnerFishingNear,
    art,
    frenzyArt,
    localAvatarCanvas,
    activeCatalogFish,
    spotId,
  ]);

  useEffect(() => {
    if (!localAvatarConfig) return;
    let cancelled = false;
    void loadAvatarAtlas().then((img) => {
      if (cancelled || !img) return;
      setLocalAvatarCanvas(buildWorldAvatarCanvas(img, localAvatarConfig));
    });
    return () => {
      cancelled = true;
    };
  }, [localAvatarConfig]);

  useEffect(() => {
    let cancelled = false;
    const spritePaths = new Set<string>([
      fishingFrenzySpritePathForFish('bass', { biome: 'lake', rarity: 'common' }),
    ]);
    for (const f of spotCatalog) {
      spritePaths.add(fishingFrenzySpritePathForFish(f.id, { biome: f.biome, rarity: f.rarity }));
    }
    void Promise.all([
      loadTidefallFishingArt(),
      loadFishingFrenzyArt([...spritePaths]),
    ])
      .then(([tidefall, frenzy]) => {
        if (!cancelled) {
          setArt(tidefall);
          setFrenzyArt(frenzy);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được họa câu cá.');
      });
    return () => {
      cancelled = true;
    };
  }, [spotCatalog]);

  const applySession = useCallback(
    (session: Awaited<ReturnType<typeof fetchDonorFishingSession>>) => {
      if (!session || session.spotId !== spotId) return;
      if (localUserId && session.anglerUserId === localUserId) return;
      if (Date.now() - session.updatedAtMs > 25_000) return;
      setPartnerFishingNear(true);
      setPreview(session.previewName);
      setObserveMode(true);
      setFsm((prev) => ({
        ...prev,
        phase: session.phase,
        progress: session.progressPermille / 1000,
        pointerNorm: session.pointerNorm,
        bobberDip: session.phase === 'bite' ? 0.3 : prev.bobberDip,
      }));
      setMessage(phaseMessageVi(session.phase, true, spotId));
    },
    [spotId, localUserId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await fetchDonorFishingSession(worldId);
        if (!cancelled && session && session.phase !== 'idle' && session.phase !== 'landed' && session.phase !== 'escaped') {
          applySession(session);
        }
      } catch {
        /* observer optional */
      }
    })();
    const poll = window.setInterval(() => {
      void fetchDonorFishingSession(worldId)
        .then((session) => {
          if (!session || session.phase === 'idle' || Date.now() - session.updatedAtMs > 25_000) {
            setPartnerFishingNear(false);
            return;
          }
          if (localUserId && session.anglerUserId === localUserId) return;
          if (!observeRef.current && fsmRef.current.phase !== 'idle') return;
          setPartnerFishingNear(session.spotId === spotId);
          applySession(session);
        })
        .catch(() => undefined);
    }, 650);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (!observeRef.current && fsmRef.current.phase !== 'idle') {
        void postDonorFishingSync(worldId, {
          spotId: spotId as SpotId,
          phase: 'idle',
          progressPermille: 0,
          pointerNorm: 0.5,
        }).catch(() => undefined);
      }
    };
  }, [worldId, spotId, localUserId, applySession]);

  const syncSession = useCallback(
    (state: TidefallFishingState) => {
      const now = performance.now();
      if (now - syncTs.current < 220) return;
      syncTs.current = now;
      void postDonorFishingSync(worldId, {
        spotId: spotId as SpotId,
        phase: state.phase,
        progressPermille: tidefallProgressPermille(state),
        pointerNorm: state.pointerNorm,
      }).catch(() => undefined);
    },
    [worldId, spotId],
  );

  const resolveCatch = useCallback(
    async (state: TidefallFishingState) => {
      if (state.phase !== 'landed' && state.phase !== 'escaped') return;
      if (resolveGuard.current) return;
      resolveGuard.current = true;
      setBusy(true);
      try {
        const resolved = await postDonorFishingResolve(worldId, tidefallProgressPermille(state));
        const fallbackLabel = activeCatalogFish
          ? tidefallFishNameVi(activeCatalogFish.id, activeCatalogFish.name)
          : 'Cá ao';
        const displayVi = resolved.labelVi || fallbackLabel;
        const rarity = resolved.rarity ?? activeCatalogFish?.rarity ?? 'common';
        const spriteUrl =
          resolved.spriteUrl ??
          (activeCatalogFish
            ? fishingFrenzySpritePathForFish(activeCatalogFish.id, {
                biome: activeCatalogFish.biome,
                rarity: activeCatalogFish.rarity,
              })
            : fishingFrenzySpritePathForFish('carp'));
        const text = resolved.escaped ? `${displayVi} tuột mất…` : `Bắt được ${displayVi}!`;
        setCatchOutcome({ escaped: resolved.escaped, labelVi: displayVi, rarity, spriteUrl });
        setOutcomeVi(text);
        setMessage(text);
        if (resolved.escaped) {
          playEscapeSplash();
        } else {
          const rare = rarity === 'rare' || rarity === 'epic' || rarity === 'legendary';
          playCatchFanfare(rare);
          gameAudio.playStinger(rare ? 'rare' : 'fish');
        }
        await onInventoryRefresh();
        void postDonorFishingSync(worldId, {
          spotId: spotId as SpotId,
          phase: 'idle',
          progressPermille: 0,
          pointerNorm: 0.5,
        }).catch(() => undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không lưu được cá vào túi — thử lại.');
        resolveGuard.current = false;
      } finally {
        setBusy(false);
      }
    },
    [worldId, spotId, activeCatalogFish, onInventoryRefresh],
  );

  useEffect(() => {
    const loop = (ts: number) => {
      if (!lastTs.current) lastTs.current = ts;
      const dt = Math.min(0.05, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      if (!observeRef.current) {
        setFsm((cur) => {
          const next = tickTidefallFishing(cur, dt);
          if (next.phase !== cur.phase) {
            setMessage(phaseMessageVi(next.phase, false, spotId));
            if (next.phase === 'waiting' && cur.phase === 'casting') {
              playWaterSplash();
            } else if (next.phase === 'bite') {
              playBiteAlert();
            } else if (next.phase === 'escaped') {
              playEscapeSplash();
            }
          }
          if (next.phase === 'landed' || next.phase === 'escaped') {
            void resolveCatch(next);
          } else if (anglerRef.current && next.phase !== 'idle') {
            syncSession(next);
          }
          return next;
        });
      }
      const canvas = canvasRef.current;
      const bundle = artRef.current;
      if (canvas && bundle) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawTidefallFishingScene(
            ctx,
            canvas.width,
            canvas.height,
            fsmRef.current,
            previewRef.current,
            bundle,
            spotRef.current,
            frenzyArtRef.current,
            activeFishRef.current,
            {
              partnerPresent: partnerRef.current,
              localAvatarCanvas: avatarCanvasRef.current,
            },
          );
        }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      lastTs.current = 0;
    };
  }, [syncSession, resolveCatch, spotId]);

  const startCast = useCallback(async () => {
    setBusy(true);
    setError(null);
    setOutcomeVi(null);
    setCatchOutcome(null);
    setObserveMode(false);
    resolveGuard.current = false;
    try {
      const data = await postDonorFishingStart(worldId, spotId as SpotId);
      setPreview(data.preview.name);
      const matched =
        matchTidefallCatalogByPreviewName(data.preview.critterId ?? data.preview.name) ??
        matchTidefallCatalogByPreviewName(data.preview.name);
      const resolvedEntry: TidefallFishEntry | null = matched
        ? {
            ...matched,
            rarity: data.preview.rarity ?? matched.rarity,
          }
        : data.preview.rarity
          ? {
              id: data.preview.critterId ?? 'carp',
              name: data.preview.name,
              rarity: data.preview.rarity,
              biome: spotId === 'gull_bay' ? 'sea' : spotId === 'east_stream' ? 'river' : 'lake',
              size: 'medium',
              difficulty: 1,
            }
          : null;
      let seedState = data.seed | 0 || 1;
      const rng = () => {
        seedState = (seedState * 1664525 + 1013904223) >>> 0;
        return (seedState & 0xffff_ffff) / 0x1_0000_0000;
      };
      const waitMs = 1350 + Math.floor(rng() * 1400);
      const tuning = speciesParamsForFish(resolvedEntry, rng);
      const next = beginTidefallCast(createTidefallFishingIdle(), {
        waitMs,
        targetWidth: tuning.targetWidth,
        pointerSpeed: tuning.pointerSpeed,
        personality: tuning.personality,
        targetDriftAmp: tuning.targetDriftAmp,
        targetDriftFreq: tuning.targetDriftFreq,
        speedSurgeAmp: tuning.speedSurgeAmp,
        hitGain: tuning.hitGain,
        missPenalty: tuning.missPenalty,
        biteWindowMs: tuning.biteWindowMs,
      });
      setFsm(next);
      setMessage(phaseMessageVi(next.phase, false, spotId));
      playCastWhoosh();
      syncSession(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không quăng được cần — kiểm tra mạng rồi thử lại.';
      setError(msg);
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }, [worldId, spotId, syncSession]);

  const onCanvasTap = useCallback(() => {
    if (observeMode || busy) return;
    setFsm((cur) => {
      if (cur.phase === 'bite') {
        playWaterSplash();
        return tidefallHookStrike(cur);
      }
      if (cur.phase === 'minigame') {
        playReelTick(isPointerInTidefallZone(cur));
        return tidefallMinigameTap(cur);
      }
      return cur;
    });
  }, [observeMode, busy]);

  const showCast = fsm.phase === 'idle' || fsm.phase === 'landed' || fsm.phase === 'escaped';
  const showHook = fsm.phase === 'bite' && !observeMode;

  return (
    <div className="modal-backdrop nuvora-inv-backdrop" role="dialog" aria-modal="true" data-testid="donor-fishing-modal">
      <div className="nuvora-desk cozy-fishing-panel" style={{ maxWidth: 'min(96vw, 460px)' }}>
        <div className="nuvora-desk__title-row">
          <h2 className="nuvora-desk__title">
            <Fish size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            {spotDef.labelVi.replace(/ \(.*\)/, '')}
          </h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              aria-label={muted ? 'Bật tiếng câu cá' : 'Tắt tiếng câu cá'}
              onClick={() => {
                const next = !muted;
                setFishingAudioMuted(next);
                setMuted(next);
              }}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
              <X size={16} />
            </button>
          </div>
        </div>

        <TidefallFishingFirstRun spotLabel={spotDef.labelVi.replace(/ \(.*\)/, '')} />

        {error && (
          <div className="cozy-alert" style={{ fontSize: 13 }} role="alert">
            {error}
          </div>
        )}

        {activeCatalogFish && fsm.phase !== 'idle' && (
          <MotionTargetRow fish={activeCatalogFish} />
        )}

        <canvas
          ref={canvasRef}
          width={360}
          height={210}
          className="cozy-fishing-canvas"
          style={{
            width: '100%',
            borderRadius: 12,
            border: '2px solid #6f421f',
            touchAction: 'none',
            cursor: observeMode ? 'default' : 'pointer',
            imageRendering: 'pixelated',
          }}
          data-testid="tidefall-fishing-canvas"
          onPointerDown={onCanvasTap}
        />

        {(fsm.phase === 'landed' || fsm.phase === 'escaped') && catchOutcome && (
          <CatchRevealCard
            rarity={catchOutcome.rarity}
            spriteUrl={catchOutcome.spriteUrl}
            escaped={catchOutcome.escaped}
            labelVi={catchOutcome.labelVi}
          />
        )}

        <p
          style={{ fontSize: 13, margin: '8px 0', color: '#462818', fontWeight: 600 }}
          data-testid="tidefall-fishing-message"
        >
          {outcomeVi ?? message}
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {showCast && !observeMode && (
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => void startCast()}
              data-testid="tidefall-cast-btn"
            >
              {fsm.phase === 'idle' ? 'Quăng cần' : 'Quăng lại'}
            </button>
          )}
          {showHook && (
            <button type="button" className="btn btn--primary" onClick={onCanvasTap} data-testid="tidefall-hook-btn">
              Gài móc!
            </button>
          )}
          {(fsm.phase === 'landed' || fsm.phase === 'escaped') && !busy && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
              Đóng
            </button>
          )}
        </div>

        {showCast && pondSpot && spotCatalog.length > 0 && (
          <details className="cozy-fishing-catalog-drawer" data-testid="tidefall-fish-catalog">
            <summary>Sách cá tại điểm câu ({spotCatalog.length} loài)</summary>
            <ul className="cozy-fishing-catalog-grid">
              {spotCatalog.slice(0, 12).map((f) => (
                <li
                  key={f.id}
                  style={{
                    borderColor: FISHING_FRENZY_RARITY_BORDER[f.rarity],
                    boxShadow: fishingFrenzyRarityGlow(f.rarity),
                  }}
                >
                  <img
                    src={fishingFrenzySpritePathForFish(f.id, { biome: f.biome, rarity: f.rarity })}
                    alt=""
                    width={36}
                    height={20}
                    style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                  />
                  <span>
                    <strong>{tidefallFishNameVi(f.id, f.name)}</strong>
                    <br />
                    <small>{tidefallFishRarityLabelVi(f.rarity)}</small>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
