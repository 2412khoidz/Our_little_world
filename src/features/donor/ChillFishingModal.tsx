import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fish, Volume2, VolumeX, X } from 'lucide-react';
import { gameAudio } from '../../game/audio/gameAudioManager';
import { gameEventBus } from '../../game/eventBus';
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
  type TidefallFishingPhase,
  type TidefallFishingState,
} from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import {
  stepSpectatorFishingState,
  type SpectatorFishingTarget,
} from '../../shared/donor/tidefall-phaser/tidefallFishingSpectator';
import type { DonorFishSessionView } from '../../shared/donor/donorFishSessionTypes';
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
  partnerAvatarConfig?: AvatarConfig;
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
  partnerAvatarConfig,
  onClose,
  onInventoryRefresh,
}: ChillFishingModalProps) {
  const spotDef = DONOR_FISHING_SPOTS[spotId];
  const pondSpot = TIDEFALL_POND_SPOTS.has(spotId);
  const spotCatalog = useMemo(
    () => (pondSpot ? tidefallFishForDonorSpot(spotId as 'meadow_pond' | 'gull_bay') : []),
    [pondSpot, spotId],
  );
  const [uiPhase, setUiPhase] = useState<TidefallFishingPhase>('idle');
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
  const [partnerAvatarCanvas, setPartnerAvatarCanvas] = useState<HTMLCanvasElement | null>(null);
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
  const partnerAvatarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeFishRef = useRef<TidefallFishEntry | null>(null);
  const spotRef = useRef(spotId);
  const fsmRef = useRef<TidefallFishingState>(createTidefallFishingIdle());
  const spectatorTargetRef = useRef<SpectatorFishingTarget | null>(null);
  const lastSseSyncAtRef = useRef(0);
  const previewRef = useRef(preview);
  const observeRef = useRef(observeMode);
  const partnerRef = useRef(observeMode || partnerFishingNear);
  const anglerRef = useRef(!observeMode);
  const raf = useRef<number | null>(null);
  const lastTs = useRef(0);
  const syncTs = useRef(0);
  const syncInFlight = useRef(false);
  const resolveGuard = useRef(false);

  useEffect(() => {
    previewRef.current = preview;
    observeRef.current = observeMode;
    partnerRef.current = observeMode || partnerFishingNear;
    anglerRef.current = !observeMode;
    artRef.current = art;
    frenzyArtRef.current = frenzyArt;
    avatarCanvasRef.current = localAvatarCanvas;
    partnerAvatarCanvasRef.current = partnerAvatarCanvas;
    activeFishRef.current = activeCatalogFish;
    spotRef.current = spotId;
  }, [
    preview,
    observeMode,
    partnerFishingNear,
    art,
    frenzyArt,
    localAvatarCanvas,
    partnerAvatarCanvas,
    activeCatalogFish,
    spotId,
  ]);

  useEffect(() => {
    if (!localAvatarConfig && !partnerAvatarConfig) return;
    let cancelled = false;
    void loadAvatarAtlas().then((img) => {
      if (cancelled || !img) return;
      if (localAvatarConfig) {
        setLocalAvatarCanvas(buildWorldAvatarCanvas(img, localAvatarConfig));
      }
      if (partnerAvatarConfig) {
        setPartnerAvatarCanvas(buildWorldAvatarCanvas(img, partnerAvatarConfig));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [localAvatarConfig, partnerAvatarConfig]);

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
    (session: DonorFishSessionView | null, viaSse = false) => {
      if (viaSse) {
        lastSseSyncAtRef.current = performance.now();
      }
      if (!session || Date.now() - session.updatedAtMs > 25_000) {
        setPartnerFishingNear(false);
        return;
      }
      if (localUserId && session.anglerUserId === localUserId) return;
      if (session.spotId !== spotId) {
        setPartnerFishingNear(false);
        return;
      }
      if (!observeRef.current && fsmRef.current.phase !== 'idle') {
        setPartnerFishingNear(session.phase !== 'idle');
        return;
      }
      if (session.phase === 'idle') {
        if (observeRef.current) {
          spectatorTargetRef.current = null;
          fsmRef.current = createTidefallFishingIdle();
          setUiPhase('idle');
          setObserveMode(false);
          setPartnerFishingNear(false);
          setPreview(null);
          setOutcomeVi(null);
          setCatchOutcome(null);
          setMessage(phaseMessageVi('idle', false, spotId));
        }
        return;
      }

      setPartnerFishingNear(true);
      setPreview(session.previewName);
      setObserveMode(true);
      const nextTarget: SpectatorFishingTarget = {
        phase: session.phase,
        progress: session.progressPermille / 1000,
        pointerNorm: session.pointerNorm,
        targetCenter: session.targetCenter,
        targetWidth: session.targetWidth,
        pointerDir: session.pointerDir,
        pointerSpeed: session.pointerSpeed,
      };
      spectatorTargetRef.current = nextTarget;
      if (fsmRef.current.phase === 'idle') {
        fsmRef.current = stepSpectatorFishingState(fsmRef.current, nextTarget, 0);
      }
      setUiPhase((prev) => (prev === session.phase ? prev : session.phase));
      if (session.phase === 'landed' || session.phase === 'escaped') {
        const fishName = session.labelVi || session.previewName || 'Cá';
        const outcomeText = session.escaped
          ? `Người thương hụt mất ${fishName}…`
          : `Người thương vừa câu được ${fishName}!`;
        setOutcomeVi(outcomeText);
        setMessage(outcomeText);
        if (session.spriteUrl && session.rarity) {
          setCatchOutcome({
            escaped: Boolean(session.escaped),
            labelVi: fishName,
            rarity: session.rarity,
            spriteUrl: session.spriteUrl,
          });
        }
      } else {
        setOutcomeVi(null);
        setCatchOutcome(null);
        setMessage(phaseMessageVi(session.phase, true, spotId));
      }
    },
    [spotId, localUserId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await fetchDonorFishingSession(worldId);
        if (!cancelled && session && session.phase !== 'idle' && session.phase !== 'landed' && session.phase !== 'escaped') {
          applySession(session, false);
        }
      } catch {
        /* observer optional */
      }
    })();

    const unsubSse = gameEventBus.on('evt:donor-fishing-sync', (session) => {
      applySession(session, true);
    });

    // Low-frequency fallback poll only when SSE push hasn't updated recently.
    const poll = window.setInterval(() => {
      if (performance.now() - lastSseSyncAtRef.current < 2000) return;
      void fetchDonorFishingSession(worldId)
        .then((session) => {
          applySession(session, false);
        })
        .catch(() => undefined);
    }, 2500);

    return () => {
      cancelled = true;
      unsubSse();
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
  }, [worldId, spotId, applySession]);

  const syncSession = useCallback(
    (state: TidefallFishingState, immediate = false) => {
      const now = performance.now();
      if (!immediate) {
        if (now - syncTs.current < 100 || syncInFlight.current) return;
      }
      syncTs.current = now;
      syncInFlight.current = true;
      void postDonorFishingSync(worldId, {
        spotId: spotId as SpotId,
        phase: state.phase,
        progressPermille: tidefallProgressPermille(state),
        pointerNorm: state.pointerNorm,
        targetCenter: state.targetCenter,
        targetWidth: state.targetWidth,
        pointerDir: state.pointerDir,
        pointerSpeed: state.pointerSpeed,
      })
        .catch(() => undefined)
        .finally(() => {
          syncInFlight.current = false;
        });
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
      const dt = Math.min(0.05, Math.max(0, (ts - lastTs.current) / 1000));
      lastTs.current = ts;
      if (!observeRef.current) {
        const cur = fsmRef.current;
        const next = tickTidefallFishing(cur, dt);
        fsmRef.current = next;
        if (next.phase !== cur.phase) {
          setUiPhase(next.phase);
          setMessage(phaseMessageVi(next.phase, false, spotId));
          if (next.phase === 'waiting' && cur.phase === 'casting') {
            playWaterSplash();
          } else if (next.phase === 'bite') {
            playBiteAlert();
          } else if (next.phase === 'escaped') {
            playEscapeSplash();
          }
          if (anglerRef.current && next.phase !== 'idle' && next.phase !== 'landed' && next.phase !== 'escaped') {
            syncSession(next, true);
          }
        } else if (anglerRef.current && next.phase !== 'idle' && next.phase !== 'landed' && next.phase !== 'escaped') {
          syncSession(next, false);
        }
        if (next.phase === 'landed' || next.phase === 'escaped') {
          void resolveCatch(next);
        }
      } else if (spectatorTargetRef.current) {
        fsmRef.current = stepSpectatorFishingState(fsmRef.current, spectatorTargetRef.current, dt);
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
              partnerAvatarCanvas: partnerAvatarCanvasRef.current,
              isObserver: observeRef.current,
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
    spectatorTargetRef.current = null;
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
      fsmRef.current = next;
      setUiPhase(next.phase);
      setMessage(phaseMessageVi(next.phase, false, spotId));
      playCastWhoosh();
      syncSession(next, true);
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
    const cur = fsmRef.current;
    let next = cur;
    if (cur.phase === 'bite') {
      playWaterSplash();
      next = tidefallHookStrike(cur);
    } else if (cur.phase === 'minigame') {
      playReelTick(isPointerInTidefallZone(cur));
      next = tidefallMinigameTap(cur);
    }
    if (next !== cur) {
      fsmRef.current = next;
      if (next.phase !== cur.phase) {
        setUiPhase(next.phase);
        setMessage(phaseMessageVi(next.phase, false, spotId));
      }
      if (next.phase === 'landed' || next.phase === 'escaped') {
        void resolveCatch(next);
      } else {
        syncSession(next, true);
      }
    }
  }, [observeMode, busy, spotId, resolveCatch, syncSession]);

  const showCast = uiPhase === 'idle' || uiPhase === 'landed' || uiPhase === 'escaped';
  const showHook = uiPhase === 'bite' && !observeMode;

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

        {activeCatalogFish && uiPhase !== 'idle' && (
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

        {(uiPhase === 'landed' || uiPhase === 'escaped') && catchOutcome && (
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
              {uiPhase === 'idle' ? 'Quăng cần' : 'Quăng lại'}
            </button>
          )}
          {showHook && (
            <button type="button" className="btn btn--primary" onClick={onCanvasTap} data-testid="tidefall-hook-btn">
              Gài móc!
            </button>
          )}
          {(uiPhase === 'landed' || uiPhase === 'escaped') && !busy && (
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
