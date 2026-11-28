import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { gameAudio } from '../../game/audio/gameAudioManager';
import { gameEventBus } from '../../game/eventBus';
import type { AvatarConfig } from '../../shared/types';
import {
  beginTidefallCast,
  createTidefallFishingIdle,
  isPointerInTidefallZone,
  tidefallHookStrike,
  tidefallMinigameTap,
  tidefallProgressPermille,
  tickTidefallFishing,
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
import { loadRanchFishingUiArt, type RanchFishingUiArt } from './ranchFishingUiArt';
import { CatchRevealCard, FishingFishArt, FishingModalFrame, type FishingCatchPresentation } from './FishingModalFrame';
import { TensionFishingModal } from './TensionFishingModal';
import { speciesParamsForFish } from './tidefallSpeciesTuning';
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
  physicalSource?: import('../../shared/interaction/interactionTypes').HeldItemState['physicalSource'];
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
      return `Quăng cần xuống ${water}. Chạm gài móc rồi bấm theo nhịp vùng xanh.`;
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
        <FishingFishArt spriteUrl={fishingFrenzySpritePathForFish(fish.id, { biome: fish.biome, rarity: fish.rarity })} />
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

export function ChillFishingModal(props: ChillFishingModalProps) {
  const [tension, setTension] = useState(false);
  return tension && props.spotId === 'east_stream' ? (
    <TensionFishingModal
      worldId={props.worldId}
      physicalSource={props.physicalSource}
      spotId="east_stream"
      titleVi={DONOR_FISHING_SPOTS.east_stream.labelVi}
      localAvatarConfig={props.localAvatarConfig}
      onInventoryRefresh={props.onInventoryRefresh}
      onClose={props.onClose}
      onSwitchMode={() => setTension(false)}
    />
  ) : <ChillFishingGame {...props} onSwitchMode={props.spotId === 'east_stream' ? () => setTension(true) : undefined} />;
}

function ChillFishingGame({
  worldId,
  physicalSource,
  spotId = 'meadow_pond',
  localUserId,
  localAvatarConfig,
  partnerAvatarConfig,
  onClose,
  onInventoryRefresh,
  onSwitchMode,
}: ChillFishingModalProps & { onSwitchMode?: () => void }) {
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
  const [art, setArt] = useState<RanchFishingUiArt | null>(null);
  const [frenzyArt, setFrenzyArt] = useState<FishingFrenzyArtBundle | null>(null);
  const [localAvatarCanvas, setLocalAvatarCanvas] = useState<HTMLCanvasElement | null>(null);
  const [partnerAvatarCanvas, setPartnerAvatarCanvas] = useState<HTMLCanvasElement | null>(null);
  const [catchOutcome, setCatchOutcome] = useState<FishingCatchPresentation | null>(null);
  const [muted, setMuted] = useState(() => isFishingAudioMuted());

  const castIdRef = useRef<string | undefined>(undefined);
  const pendingCastRef = useRef<string | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const artRef = useRef<RanchFishingUiArt | null>(null);
  const frenzyArtRef = useRef<FishingFrenzyArtBundle | null>(null);
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const partnerAvatarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spotRef = useRef(spotId);
  const fsmRef = useRef<TidefallFishingState>(createTidefallFishingIdle());
  const spectatorTargetRef = useRef<SpectatorFishingTarget | null>(null);
  const lastSseSyncAtRef = useRef(0);
  const observeRef = useRef(observeMode);
  const partnerRef = useRef(observeMode || partnerFishingNear);
  const anglerRef = useRef(!observeMode);
  const raf = useRef<number | null>(null);
  const lastTs = useRef(0);
  const syncTs = useRef(0);
  const syncInFlight = useRef(false);
  const resolveGuard = useRef(false);
  const roundSeed = useRef<number | null>(null);
  const castPending = useRef(false);
  const [retryCatch, setRetryCatch] = useState(false);
  const inventoryRefresh = useRef(onInventoryRefresh);
  useEffect(() => { inventoryRefresh.current = onInventoryRefresh; }, [onInventoryRefresh]);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      gameEventBus.emit('cmd:fishing-visual', { spotId, phase: 'idle' });
    };
  }, [spotId]);

  useEffect(() => {
    if (observeMode || catchOutcome || uiPhase === 'landed' || uiPhase === 'escaped') return;
    gameEventBus.emit('cmd:fishing-visual', { spotId, phase: uiPhase });
  }, [spotId, uiPhase, observeMode, catchOutcome]);

  useEffect(() => {
    observeRef.current = observeMode;
    partnerRef.current = observeMode || partnerFishingNear;
    anglerRef.current = !observeMode;
    artRef.current = art;
    frenzyArtRef.current = frenzyArt;
    avatarCanvasRef.current = localAvatarCanvas;
    partnerAvatarCanvasRef.current = partnerAvatarCanvas;
    spotRef.current = spotId;
  }, [
    observeMode,
    partnerFishingNear,
    art,
    frenzyArt,
    localAvatarCanvas,
    partnerAvatarCanvas,
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
    void Promise.all([loadRanchFishingUiArt(), loadFishingFrenzyArt()])
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
  }, []);

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
      const ended = session.phase === 'landed' || session.phase === 'escaped';
      if ((ended && !observeRef.current) || castPending.current) return;
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
      if (ended) {
        observeRef.current = false;
        spectatorTargetRef.current = null;
        fsmRef.current = createTidefallFishingIdle();
        setObserveMode(false);
        setPartnerFishingNear(false);
        setUiPhase('idle');
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
          if (!cancelled) applySession(session, false);
        })
        .catch(() => undefined);
    }, 2500);

    return () => {
      cancelled = true;
      unsubSse();
      window.clearInterval(poll);
      if (roundSeed.current !== null && !observeRef.current) {
        void postDonorFishingSync(worldId, {
          spotId: spotId as SpotId,
          castId: castIdRef.current,
          phase: 'idle',
          roundSeed: roundSeed.current,
          progressPermille: 0,
          pointerNorm: 0.5,
        }).catch(() => undefined);
      }
    };
  }, [worldId, spotId, applySession]);

  const syncSession = useCallback(
    (state: TidefallFishingState, immediate = false) => {
      if (roundSeed.current === null) return;
      const now = performance.now();
      if (!immediate) {
        if (now - syncTs.current < 100 || syncInFlight.current) return;
      }
      syncTs.current = now;
      syncInFlight.current = true;
      void postDonorFishingSync(worldId, {
        spotId: spotId as SpotId,
        castId: castIdRef.current,
        phase: state.phase,
        roundSeed: roundSeed.current,
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
      if (resolveGuard.current || roundSeed.current === null) return;
      resolveGuard.current = true;
      setRetryCatch(false);
      setError(null);
      setBusy(true);
      try {
        const resolved = await postDonorFishingResolve(worldId, tidefallProgressPermille(state), roundSeed.current, castIdRef.current);
        if (!mounted.current) return;
        roundSeed.current = null;
        fsmRef.current = createTidefallFishingIdle();
        setUiPhase('idle');
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
        gameEventBus.emit('cmd:fishing-visual', { spotId, phase: resolved.escaped ? 'escaped' : 'landed', spriteUrl });
        setOutcomeVi(text);
        setMessage(text);
        if (resolved.escaped) {
          playEscapeSplash();
        } else {
          const rare = rarity === 'rare' || rarity === 'epic' || rarity === 'legendary';
          playCatchFanfare(rare);
          gameAudio.playStinger(rare ? 'rare' : 'fish');
        }
        void inventoryRefresh.current().catch(() => undefined);
      } catch {
        if (mounted.current) {
          setError('Chưa nhận được kết quả lượt câu.');
          setRetryCatch(true);
          gameEventBus.emit('cmd:fishing-visual', { spotId, phase: 'idle' });
        }
      } finally {
        setBusy(false);
      }
    },
    [worldId, spotId, activeCatalogFish],
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
            bundle,
            spotRef.current,
            frenzyArtRef.current,
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
    if (castPending.current || roundSeed.current !== null) return;
    castPending.current = true;
    fsmRef.current = createTidefallFishingIdle();
    setRetryCatch(false);
    setUiPhase('idle');
    setBusy(true);
    setError(null);
    setOutcomeVi(null);
    setCatchOutcome(null);
    setObserveMode(false);
    spectatorTargetRef.current = null;
    try {
      pendingCastRef.current ??= crypto.randomUUID();
      const data = await postDonorFishingStart(worldId, spotId as SpotId, physicalSource, pendingCastRef.current);
      pendingCastRef.current = undefined;
      castIdRef.current = data.castId;
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
      if (!(e instanceof TypeError)) pendingCastRef.current = undefined;
      const msg = e instanceof Error ? e.message : 'Không quăng được cần — kiểm tra mạng rồi thử lại.';
      setError(msg);
      setMessage(msg);
    } finally {
      castPending.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [worldId, spotId, syncSession, physicalSource]);

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
      if (next.phase === 'minigame') {
        gameEventBus.emit('cmd:fishing-visual', { spotId, phase: 'minigame', reelProgress: next.progress });
      }
      if (next.phase === 'landed' || next.phase === 'escaped') {
        void resolveCatch(next);
      } else {
        syncSession(next, true);
      }
    }
  }, [observeMode, busy, spotId, resolveCatch, syncSession]);

  function discardCatch() {
    const seed = roundSeed.current;
    roundSeed.current = null;
    fsmRef.current = createTidefallFishingIdle();
    if (seed !== null) {
      void postDonorFishingSync(worldId, { spotId, phase: 'idle', roundSeed: seed, progressPermille: 0, pointerNorm: 0.5 })
        .catch(() => undefined);
    }
    setRetryCatch(false);
    setError(null);
    setMessage(phaseMessageVi('idle', false, spotId));
    setUiPhase('idle');
  }

  const showCast = uiPhase === 'idle' || uiPhase === 'landed' || uiPhase === 'escaped';
  const showHook = uiPhase === 'bite' && !observeMode;

  return (
    <FishingModalFrame
      title={`${spotDef.labelVi.replace(/ \(.*\)/, '')} · Chill`}
      testId="donor-fishing-modal"
      onClose={onClose}
      controls={
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
      }
    >
      <div className="ranch-fishing__body">
        <canvas
          ref={canvasRef}
          width={360}
          height={210}
          className="ranch-fishing__canvas"
          data-interactive={!observeMode && (uiPhase === 'bite' || uiPhase === 'minigame')}
          data-testid="tidefall-fishing-canvas"
          onPointerDown={onCanvasTap}
        />
        <div className="ranch-fishing__side">
          {error && (
            <div className="cozy-alert" style={{ fontSize: 13 }} role="alert">
              {error}
            </div>
          )}

          {activeCatalogFish && uiPhase !== 'idle' && (
            <MotionTargetRow fish={activeCatalogFish} />
          )}

          {catchOutcome && (
            <CatchRevealCard
              rarity={catchOutcome.rarity}
              spriteUrl={catchOutcome.spriteUrl}
              escaped={catchOutcome.escaped}
              labelVi={catchOutcome.labelVi}
            />
          )}

          {!catchOutcome && <p className="ranch-fishing__status" data-testid="tidefall-fishing-message" aria-live="polite">
            {busy && (uiPhase === 'landed' || uiPhase === 'escaped') ? 'Đang ghi kết quả…' : outcomeVi ?? message}
          </p>}

          <div className="ranch-fishing__actions">
            {retryCatch && (
              <>
                <button type="button" className="btn btn--primary" onClick={() => {
                  resolveGuard.current = false;
                  void resolveCatch(fsmRef.current);
                }}>Thử nhận kết quả</button>
                <button type="button" className="btn btn--secondary" onClick={discardCatch}>Bỏ lượt</button>
              </>
            )}
            {showCast && !observeMode && !retryCatch && (
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy}
                onClick={() => void startCast()}
                data-testid="tidefall-cast-btn"
              >
                {catchOutcome ? 'Quăng lại' : 'Quăng cần'}
              </button>
            )}
            {showHook && (
              <button type="button" className="btn btn--primary" onClick={onCanvasTap} data-testid="tidefall-hook-btn">
                Gài móc!
              </button>
            )}
            {uiPhase === 'minigame' && !observeMode && (
              <button type="button" className="btn btn--primary" onClick={onCanvasTap}>Kéo dây</button>
            )}
            {showCast && !observeMode && !retryCatch && onSwitchMode && (
              <button type="button" className="btn btn--secondary" disabled={busy} onClick={onSwitchMode}>
                Tension · Giữ rồi thả
              </button>
            )}
            {catchOutcome && !busy && (
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => {
                setCatchOutcome(null);
                setOutcomeVi(null);
                setMessage(phaseMessageVi('idle', false, spotId));
              }}>
                Xong
              </button>
            )}
          </div>

          {uiPhase === 'idle' && !catchOutcome && !busy && <TidefallFishingFirstRun spotLabel={spotDef.labelVi} />}

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
    </FishingModalFrame>
  );
}
