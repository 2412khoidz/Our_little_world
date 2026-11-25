import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fish, X } from 'lucide-react';
import {
  beginTidefallCast,
  createTidefallFishingIdle,
  pickPersonality,
  pickWaitMs,
  tidefallHookStrike,
  tidefallMinigameTap,
  tidefallProgressPermille,
  tickTidefallFishing,
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
import { drawTidefallFishingScene } from './tidefallFishingCanvas';
import { TidefallFishingFirstRun } from './TidefallFishingFirstRun';
import {
  matchTidefallCatalogByPreviewName,
  tidefallFishForDonorSpot,
  tidefallFishRarityLabelVi,
  TIDEFALL_FISH_CATALOG,
  type TidefallFishEntry,
} from '../../shared/donor/tidefall-phaser/tidefallFishCatalog';

interface ChillFishingModalProps {
  worldId: string;
  spotId?: DonorFishingSpotId;
  onClose: () => void;
  onInventoryRefresh: () => Promise<void>;
}

function phaseMessageVi(phase: TidefallFishingState['phase'], observe: boolean, spotId: DonorFishingSpotId): string {
  if (observe) return 'Đang xem bạn câu cùng chỗ — hai người thấy cùng màn hình.';
  const water = spotId === 'east_stream' ? 'suối' : 'mặt nước';
  switch (phase) {
    case 'idle':
      return `Chạm Quăng cần để thả mồi xuống ${water}.`;
    case 'casting':
      return 'Đang quăng…';
    case 'waiting':
      return 'Chờ cá cắn — giữ yên cần.';
    case 'bite':
      return 'Có cá! Chạm Gài móc ngay!';
    case 'minigame':
      return 'Chạm khi vạch vàng trong vùng xanh để kéo cá.';
    case 'landed':
      return 'Đã lên cá!';
    case 'escaped':
      return 'Cá tuột mất…';
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
        gap: 8,
        margin: '0 0 6px',
        fontSize: 12,
      }}
      data-testid="tidefall-active-fish"
    >
      <img
        src={fishingFrenzySpritePathForFish(fish.id, { biome: fish.biome, rarity: fish.rarity })}
        alt=""
        width={48}
        height={28}
        style={{ imageRendering: 'pixelated' }}
      />
      <span>
        Mục tiêu: <strong>{nameVi}</strong> ({tidefallFishRarityLabelVi(fish.rarity)})
      </span>
    </div>
  );
}

function CatchRevealCard({
  fish,
  escaped,
  labelVi,
}: {
  fish: TidefallFishEntry;
  escaped: boolean;
  labelVi: string | null;
}) {
  const nameVi = labelVi ?? tidefallFishNameVi(fish.id, fish.name);
  return (
    <div
      data-testid="fishing-frenzy-catch-reveal"
      style={{
        marginTop: 8,
        padding: '10px 12px',
        borderRadius: 12,
        textAlign: 'center',
        border: `2px solid ${FISHING_FRENZY_RARITY_BORDER[fish.rarity]}`,
        boxShadow: fishingFrenzyRarityGlow(fish.rarity),
        background: 'var(--cozy-panel-muted, rgba(0,0,0,0.06))',
      }}
    >
      <img
        src={fishingFrenzySpritePathForFish(fish.id, { biome: fish.biome, rarity: fish.rarity })}
        alt=""
        width={72}
        height={40}
        style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto 6px' }}
      />
      <div style={{ fontWeight: 600, fontSize: 14 }}>{escaped ? `${nameVi} tuột mất…` : `Bắt được ${nameVi}!`}</div>
      <div style={{ fontSize: 11, opacity: 0.85 }}>{tidefallFishRarityLabelVi(fish.rarity)}</div>
    </div>
  );
}

export function ChillFishingModal({ worldId, spotId = 'meadow_pond', onClose, onInventoryRefresh }: ChillFishingModalProps) {
  const spotDef = DONOR_FISHING_SPOTS[spotId];
  const pondSpot = TIDEFALL_POND_SPOTS.has(spotId);
  const spotCatalog = useMemo(
    () => (pondSpot ? tidefallFishForDonorSpot(spotId as 'meadow_pond' | 'gull_bay') : []),
    [pondSpot, spotId],
  );
  const [fsm, setFsm] = useState<TidefallFishingState>(() => createTidefallFishingIdle());
  const [preview, setPreview] = useState<string | null>(null);
  const activeCatalogFish = preview ? matchTidefallCatalogByPreviewName(preview) : null;
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [observeMode, setObserveMode] = useState(false);
  const [outcomeVi, setOutcomeVi] = useState<string | null>(null);
  const [art, setArt] = useState<TidefallFishingArtBundle | null>(null);
  const [frenzyArt, setFrenzyArt] = useState<FishingFrenzyArtBundle | null>(null);
  const [catchLabelVi, setCatchLabelVi] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const artRef = useRef<TidefallFishingArtBundle | null>(null);
  const frenzyArtRef = useRef<FishingFrenzyArtBundle | null>(null);
  const activeFishRef = useRef<TidefallFishEntry | null>(null);
  const spotRef = useRef(spotId);
  const fsmRef = useRef(fsm);
  const previewRef = useRef(preview);
  const observeRef = useRef(observeMode);
  const anglerRef = useRef(!observeMode);
  const raf = useRef<number | null>(null);
  const lastTs = useRef(0);
  const syncTs = useRef(0);
  const resolveGuard = useRef(false);

  useEffect(() => {
    fsmRef.current = fsm;
    previewRef.current = preview;
    observeRef.current = observeMode;
    anglerRef.current = !observeMode;
    artRef.current = art;
    frenzyArtRef.current = frenzyArt;
    activeFishRef.current = activeCatalogFish;
    spotRef.current = spotId;
  }, [fsm, preview, observeMode, art, frenzyArt, activeCatalogFish, spotId]);

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
      if (!session) return;
      if (session.spotId !== spotId) return;
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
    [spotId],
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
          if (!session || session.phase === 'idle') return;
          if (!observeRef.current && fsmRef.current.phase !== 'idle') return;
          applySession(session);
        })
        .catch(() => undefined);
    }, 600);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [worldId, applySession]);

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
        const displayVi = activeCatalogFish
          ? tidefallFishNameVi(activeCatalogFish.id, activeCatalogFish.name)
          : resolved.labelVi;
        const text = resolved.escaped ? `${displayVi} tuột mất…` : `Bắt được ${displayVi}!`;
        setCatchLabelVi(displayVi);
        setOutcomeVi(text);
        setMessage(text);
        await onInventoryRefresh();
        void postDonorFishingSync(worldId, { spotId: spotId as SpotId, phase: 'idle', progressPermille: 0, pointerNorm: 0.5 }).catch(
          () => undefined,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không lưu được cá vào túi — thử lại.');
        resolveGuard.current = false;
      } finally {
        setBusy(false);
      }
    },
    [worldId, spotId, onInventoryRefresh],
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
    setCatchLabelVi(null);
    setObserveMode(false);
    resolveGuard.current = false;
    try {
      const data = await postDonorFishingStart(worldId, spotId as SpotId);
      setPreview(data.preview.name);
      let seedState = data.seed | 0 || 1;
      const rng = () => {
        seedState = (seedState * 1664525 + 1013904223) >>> 0;
        return (seedState & 0xffff_ffff) / 0x1_0000_0000;
      };
      const waitMs = pickWaitMs(rng);
      const personality = pickPersonality(rng);
      const targetWidth = personality === 'LEGENDARY' ? 0.22 : personality === 'TIMID' ? 0.38 : 0.3;
      const next = beginTidefallCast(createTidefallFishingIdle(), {
        waitMs,
        targetWidth,
        pointerSpeed: personality === 'AGGRESSIVE' ? 1.55 : 1.35,
        personality,
      });
      setFsm(next);
      setMessage(phaseMessageVi(next.phase, false, spotId));
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
      if (cur.phase === 'bite') return tidefallHookStrike(cur);
      if (cur.phase === 'minigame') return tidefallMinigameTap(cur);
      return cur;
    });
  }, [observeMode, busy]);

  const showCast = fsm.phase === 'idle' || fsm.phase === 'landed' || fsm.phase === 'escaped';
  const showHook = fsm.phase === 'bite' && !observeMode;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="donor-fishing-modal">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">
            <Fish size={18} /> {spotDef.labelVi.replace(/ \(.*\)/, '')}
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <TidefallFishingFirstRun spotLabel={spotDef.labelVi.replace(/ \(.*\)/, '')} />
        {error && (
          <div className="cozy-alert" style={{ fontSize: 13 }} role="alert">
            {error}
          </div>
        )}
        {showCast && pondSpot && spotCatalog.length > 0 && (
          <div
            data-testid="tidefall-fish-catalog"
            style={{
              fontSize: 11,
              maxHeight: 88,
              overflowY: 'auto',
              marginBottom: 8,
              padding: '6px 8px',
              borderRadius: 8,
              background: 'var(--cozy-panel-muted, rgba(0,0,0,0.06))',
            }}
          >
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Cá có thể gặp tại đây ({spotCatalog.length})</p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 0,
                listStyle: 'none',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
                gap: 6,
              }}
            >
              {spotCatalog.slice(0, 12).map((f) => (
                <li
                  key={f.id}
                  style={{
                    breakInside: 'avoid',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    padding: '4px 6px',
                    borderRadius: 8,
                    border: `1px solid ${FISHING_FRENZY_RARITY_BORDER[f.rarity]}`,
                    boxShadow: fishingFrenzyRarityGlow(f.rarity),
                  }}
                >
                  <img
                    src={fishingFrenzySpritePathForFish(f.id, { biome: f.biome, rarity: f.rarity })}
                    alt=""
                    width={40}
                    height={22}
                    style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                  />
                  <span>
                    {tidefallFishNameVi(f.id, f.name)}
                    <br />
                    <span style={{ opacity: 0.8 }}>{tidefallFishRarityLabelVi(f.rarity)}</span>
                  </span>
                </li>
              ))}
            </ul>
            {TIDEFALL_FISH_CATALOG.length > spotCatalog.length && (
              <p style={{ margin: '6px 0 0', opacity: 0.75 }}>
                Tổng {TIDEFALL_FISH_CATALOG.length} loài trong sách câu (xem đủ ở các biome khác).
              </p>
            )}
          </div>
        )}
        {activeCatalogFish && fsm.phase !== 'idle' && (
          <MotionTargetRow fish={activeCatalogFish} />
        )}
        {(fsm.phase === 'landed' || fsm.phase === 'escaped') && activeCatalogFish && (
          <CatchRevealCard fish={activeCatalogFish} escaped={fsm.phase === 'escaped'} labelVi={catchLabelVi} />
        )}
        <canvas
          ref={canvasRef}
          width={304}
          height={168}
          style={{ width: '100%', borderRadius: 10, touchAction: 'none', cursor: observeMode ? 'default' : 'pointer' }}
          data-testid="tidefall-fishing-canvas"
          onPointerDown={onCanvasTap}
        />
        {showCast && !observeMode && (
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => void startCast()}
            data-testid="tidefall-cast-btn"
          >
            Quăng cần
          </button>
        )}
        {showHook && (
          <button type="button" className="btn btn--primary" onClick={onCanvasTap} data-testid="tidefall-hook-btn">
            Gài móc!
          </button>
        )}
        {observeMode && <p style={{ fontSize: 12, opacity: 0.85 }}>Chế độ xem đôi — cùng điểm câu với bạn.</p>}
        <p style={{ fontSize: 13, marginTop: 10 }} data-testid="tidefall-fishing-message">
          {outcomeVi ?? message}
        </p>
        {(fsm.phase === 'landed' || fsm.phase === 'escaped') && !busy && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
            Đóng
          </button>
        )}
      </div>
    </div>
  );
}