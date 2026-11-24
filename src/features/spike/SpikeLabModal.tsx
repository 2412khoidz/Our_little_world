import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RefreshCw, RotateCcw, Wifi, WifiOff, X } from 'lucide-react';
import type { GameDiagnosticsSnapshot } from '../../game/eventBus';
import type { ConnectionStatus, SpikeCinemaPacket, WorldBackend } from '../../lib/backend/types';
import {
  AntiEchoGuard,
  applyCinemaCommand,
  ClockOffsetEstimator,
  computeExpectedPosition,
  evaluateDriftCorrection,
} from '../../shared/cinemaSync';
import type { CinemaControlMode, CinemaSyncState, DriftDecision } from '../../shared/types';

interface SpikeLabModalProps {
  backend: WorldBackend;
  worldId: string;
  localUserId: string;
  diagnostics: GameDiagnosticsSnapshot | null;
  connectionStatus: ConnectionStatus;
  onSimulateOffline?: (offline: boolean) => void;
  onForceReconnect: () => Promise<void>;
  onClose: () => void;
}

const SAMPLE_VIDEO_URL = '/spike/sample-cozy-sync.mp4';

export function SpikeLabModal({
  backend,
  worldId,
  localUserId,
  diagnostics,
  connectionStatus,
  onSimulateOffline,
  onForceReconnect,
  onClose,
}: SpikeLabModalProps) {
  const [tab, setTab] = useState<'diag' | 'media'>('diag');
  const [simOffline, setSimOffline] = useState(connectionStatus === 'offline');
  const [bgSwitches, setBgSwitches] = useState(0);

  // Media Sync PoC state
  const [sourceType, setSourceType] = useState<'sample' | 'local' | 'url'>('sample');
  const [customUrl, setCustomUrl] = useState('');
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [mediaLabel, setMediaLabel] = useState('sample-cozy-sync.mp4 (H.264/AAC)');
  const [localReady, setLocalReady] = useState(false);
  const [peerReadyMap, setPeerReadyMap] = useState<Record<string, boolean>>({});
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [videoMeta, setVideoMeta] = useState<{ w: number; h: number; duration: number } | null>(null);
  const [bufferCount, setBufferCount] = useState(0);
  const [lastDrift, setLastDrift] = useState<DriftDecision>({ action: 'ignore', driftMs: 0 });
  const [clockStats, setClockStats] = useState<{ offsetMs: number; rttMs: number | null }>({
    offsetMs: 0,
    rttMs: null,
  });
  const [syncError, setSyncError] = useState<string | null>(null);

  const [syncState, setSyncState] = useState<CinemaSyncState>(() => ({
    sessionId: `spike-${worldId}`,
    mediaId: 'sample-cozy-sync.mp4',
    revision: 1,
    controllerId: localUserId,
    mode: 'both',
    status: 'paused',
    positionSec: 0,
    rate: 1,
    effectiveAtServerMs: Date.now(),
    updatedAtServerMs: Date.now(),
  }));

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const syncStateRef = useRef(syncState);
  useEffect(() => {
    syncStateRef.current = syncState;
  }, [syncState]);
  const busRef = useRef<ReturnType<WorldBackend['createSpikeCinemaBus']> | null>(null);
  const echoGuardRef = useRef(new AntiEchoGuard());
  const offsetEstRef = useRef(new ClockOffsetEstimator());

  const activeVideoSrc = useMemo(() => {
    if (sourceType === 'local' && localBlobUrl) return localBlobUrl;
    if (sourceType === 'url' && customUrl.trim()) return customUrl.trim();
    return SAMPLE_VIDEO_URL;
  }, [sourceType, localBlobUrl, customUrl]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setBgSwitches((c) => c + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    return () => {
      if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    };
  }, [localBlobUrl]);

  // Subscribe to Spike Cinema PoC channel
  useEffect(() => {
    const bus = backend.createSpikeCinemaBus(worldId, localUserId);
    busRef.current = bus;

    const unsub = bus.subscribe((pkt: SpikeCinemaPacket) => {
      if (pkt.senderId === localUserId) return;

      if (pkt.kind === 'ping') {
        bus.send({
          kind: 'pong',
          senderId: localUserId,
          sentAtClientMs: pkt.sentAtClientMs,
          serverNowMs: Date.now(),
          state: syncStateRef.current,
        });
      } else if (pkt.kind === 'pong' && pkt.serverNowMs !== undefined) {
        const offset = offsetEstRef.current.addSample({
          clientSendMs: pkt.sentAtClientMs,
          serverNowMs: pkt.serverNowMs,
          clientRecvMs: Date.now(),
        });
        setClockStats({ offsetMs: Math.round(offset), rttMs: offsetEstRef.current.getLatestRttMs() });
        if (pkt.state && pkt.state.revision > syncStateRef.current.revision) {
          setSyncState(pkt.state);
        }
      } else if (pkt.kind === 'ready') {
        setPeerReadyMap((prev) => ({ ...prev, [pkt.senderId]: Boolean(pkt.ready) }));
      } else if (pkt.kind === 'state' && pkt.state) {
        const incoming = pkt.state;
        if (incoming.revision > syncStateRef.current.revision) {
          setSyncState(incoming);
        }
      } else if (pkt.kind === 'command' && pkt.command) {
        const res = applyCinemaCommand(syncStateRef.current, pkt.command, Date.now());
        if (res.ok) {
          setSyncState(res.state);
          bus.send({
            kind: 'state',
            senderId: localUserId,
            sentAtClientMs: Date.now(),
            state: res.state,
          });
        }
      }
    });

    // Periodic RTT clock sync probe
    bus.send({ kind: 'ping', senderId: localUserId, sentAtClientMs: Date.now() });
    const pingTimer = window.setInterval(() => {
      bus.send({ kind: 'ping', senderId: localUserId, sentAtClientMs: Date.now() });
    }, 3000);

    return () => {
      window.clearInterval(pingTimer);
      unsub();
      busRef.current = null;
    };
  }, [backend, worldId, localUserId]);

  // Apply authoritative state to <video> and run periodic drift correction
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyAndCorrect = () => {
      const state = syncStateRef.current;
      const estimatedServerNow = offsetEstRef.current.getEstimatedServerNowMs(Date.now());
      const expectedSec = computeExpectedPosition(state, estimatedServerNow);
      const actualSec = video.currentTime || 0;
      const decision = evaluateDriftCorrection(actualSec, expectedSec, true);
      setLastDrift(decision);

      if (state.status === 'paused' || state.status === 'buffering') {
        if (!video.paused) {
          echoGuardRef.current.markProgrammaticChange(Date.now());
          video.pause();
        }
        if (Math.abs(actualSec - expectedSec) > 0.25 && video.readyState >= 1) {
          echoGuardRef.current.markProgrammaticChange(Date.now());
          video.currentTime = expectedSec;
        }
        if (video.playbackRate !== 1) video.playbackRate = 1;
        return;
      }

      if (state.status === 'playing') {
        if (decision.action === 'seek' && video.readyState >= 1) {
          echoGuardRef.current.markProgrammaticChange(Date.now());
          video.currentTime = decision.targetSec;
          video.playbackRate = 1;
        } else if (decision.action === 'rate') {
          video.playbackRate = decision.playbackRate;
        } else if (video.playbackRate !== 1) {
          video.playbackRate = 1;
        }

        if (video.paused) {
          echoGuardRef.current.markProgrammaticChange(Date.now());
          void video.play().then(
            () => setAutoplayBlocked(false),
            () => setAutoplayBlocked(true),
          );
        }
      }
    };

    applyAndCorrect();
    const timer = window.setInterval(applyAndCorrect, 600);
    return () => window.clearInterval(timer);
  }, [syncState]);

  function dispatchCinemaAction(
    action: 'play' | 'pause' | 'seek' | 'set_mode',
    opts?: { desiredPositionSec?: number; desiredMode?: CinemaControlMode },
  ) {
    setSyncError(null);
    const cmd = {
      commandId: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: localUserId,
      expectedRevision: syncState.revision,
      action,
      desiredPositionSec: opts?.desiredPositionSec,
      desiredMode: opts?.desiredMode,
    };

    const res = applyCinemaCommand(syncState, cmd, Date.now());
    if (!res.ok) {
      setSyncError(
        res.reason === 'FORBIDDEN'
          ? 'Chế độ hiện tại chỉ cho phép chủ phòng điều khiển.'
          : 'Lệch revision, đang đồng bộ trạng thái mới nhất.',
      );
      setSyncState(res.latestState);
      return;
    }

    setSyncState(res.state);
    busRef.current?.send({
      kind: 'state',
      senderId: localUserId,
      sentAtClientMs: Date.now(),
      state: res.state,
    });
  }

  function handleReadyToggle() {
    const next = !localReady;
    setLocalReady(next);
    busRef.current?.send({
      kind: 'ready',
      senderId: localUserId,
      sentAtClientMs: Date.now(),
      ready: next,
    });
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Spike 0 Lab">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">Spike 0 Lab (Cô lập khỏi V0.1)</h2>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`chip ${tab === 'diag' ? 'chip--selected' : ''}`}
            data-testid="spike-tab-diag"
            onClick={() => setTab('diag')}
          >
            Chẩn đoán Thiết bị & Mạng
          </button>
          <button
            type="button"
            className={`chip ${tab === 'media' ? 'chip--selected' : ''}`}
            data-testid="spike-tab-media"
            onClick={() => setTab('media')}
          >
            Video Sync PoC
          </button>
        </div>

        {tab === 'diag' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="stats-grid">
              <div className="stat-box">
                FPS / Renderer
                <strong>
                  {diagnostics ? `${diagnostics.fps} FPS (${diagnostics.renderer})` : 'Đang đo...'}
                </strong>
              </div>
              <div className="stat-box">
                Pixel Zoom / Context
                <strong>
                  {diagnostics
                    ? `${diagnostics.zoom}x • ${diagnostics.contextLost ? 'LOST' : 'OK'}`
                    : '—'}
                </strong>
              </div>
              <div className="stat-box">
                DPR (Native / Capped)
                <strong>
                  {window.devicePixelRatio.toFixed(2)} / {Math.min(window.devicePixelRatio || 1, 2)}
                </strong>
              </div>
              <div className="stat-box">
                Viewport & Hướng
                <strong>
                  {window.innerWidth}×{window.innerHeight}{' '}
                  {window.innerHeight >= window.innerWidth ? '(Dọc)' : '(Ngang)'}
                </strong>
              </div>
              <div className="stat-box">
                Chế độ PWA Standalone
                <strong>{isStandalone ? 'Có (Home Screen)' : 'Trình duyệt thường'}</strong>
              </div>
              <div className="stat-box">
                Số lần chuyển nền / Trạng thái
                <strong>
                  {bgSwitches} lần • {connectionStatus}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {onSimulateOffline && (
                <button
                  type="button"
                  className={`btn ${simOffline ? 'btn--sage' : 'btn--secondary'}`}
                  data-testid="btn-toggle-sim-offline"
                  onClick={() => {
                    const next = !simOffline;
                    setSimOffline(next);
                    onSimulateOffline(next);
                  }}
                >
                  {simOffline ? <Wifi size={16} /> : <WifiOff size={16} />}
                  {simOffline ? 'Khôi phục mạng giả lập' : 'Giả lập mất mạng'}
                </button>
              )}

              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void onForceReconnect()}
              >
                <RefreshCw size={16} /> Reconnect & Lấy Snapshot
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="cozy-alert">
              Thử nghiệm độc lập đồng bộ Play/Pause/Seek, Ready handshake và đo sai lệch thời gian.
              Mở tab thứ 2 vào cùng mục này để kiểm tra đồng bộ trực tiếp.
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                type="button"
                className={`chip ${sourceType === 'sample' ? 'chip--selected' : ''}`}
                onClick={() => {
                  setSourceType('sample');
                  setMediaLabel('sample-cozy-sync.mp4 (H.264/AAC)');
                }}
              >
                Video mẫu H.264
              </button>
              <label className={`chip ${sourceType === 'local' ? 'chip--selected' : ''}`}>
                Chọn file máy
                <input
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
                    const url = URL.createObjectURL(file);
                    setLocalBlobUrl(url);
                    setSourceType('local');
                    setMediaLabel(`${file.name} (${Math.round(file.size / 1024)} KB)`);
                  }}
                />
              </label>
              <button
                type="button"
                className={`chip ${sourceType === 'url' ? 'chip--selected' : ''}`}
                onClick={() => setSourceType('url')}
              >
                URL Private (Tailscale)
              </button>
            </div>

            {sourceType === 'url' && (
              <input
                className="input"
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  setMediaLabel(e.target.value || 'Custom URL');
                }}
                placeholder="https://may-windows.tailnet.ts.net/..."
              />
            )}

            <video
              ref={videoRef}
              src={activeVideoSrc}
              playsInline
              preload="auto"
              loop
              className="spike-video"
              data-testid="spike-video-player"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setVideoMeta({
                  w: v.videoWidth,
                  h: v.videoHeight,
                  duration: Math.round(v.duration * 10) / 10,
                });
              }}
              onWaiting={() => {
                setBufferCount((c) => c + 1);
              }}
              onPlay={() => {
                if (echoGuardRef.current.shouldIgnoreNativeEvent(Date.now())) return;
                // Avoid native autoplay loop triggering unsolicited command
              }}
            />

            {autoplayBlocked && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  void videoRef.current?.play().then(() => setAutoplayBlocked(false));
                }}
              >
                Trình duyệt chặn tự phát — Chạm để bật hình & tiếng
              </button>
            )}

            {syncError && <div className="cozy-alert cozy-alert--error">{syncError}</div>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className={`btn btn--sm ${localReady ? 'btn--sage' : 'btn--secondary'}`}
                data-testid="spike-btn-ready"
                onClick={handleReadyToggle}
              >
                {localReady ? 'Đã Sẵn Sàng ✓' : 'Bấm Sẵn Sàng'}
              </button>

              <button
                type="button"
                className="btn btn--primary btn--sm"
                data-testid="spike-btn-play"
                onClick={() =>
                  dispatchCinemaAction('play', {
                    desiredPositionSec: videoRef.current?.currentTime ?? syncState.positionSec,
                  })
                }
              >
                <Play size={15} /> Phát
              </button>

              <button
                type="button"
                className="btn btn--secondary btn--sm"
                data-testid="spike-btn-pause"
                onClick={() =>
                  dispatchCinemaAction('pause', {
                    desiredPositionSec: videoRef.current?.currentTime ?? syncState.positionSec,
                  })
                }
              >
                <Pause size={15} /> Tạm dừng
              </button>

              <button
                type="button"
                className="btn btn--secondary btn--sm"
                data-testid="spike-btn-seek-3"
                onClick={() => dispatchCinemaAction('seek', { desiredPositionSec: 3.0 })}
              >
                <RotateCcw size={15} /> Tua tới 3.0s
              </button>

              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() =>
                  dispatchCinemaAction('set_mode', {
                    desiredMode: syncState.mode === 'both' ? 'host_only' : 'both',
                  })
                }
              >
                Quyền: {syncState.mode === 'both' ? 'Cả hai' : 'Chỉ chủ phòng'}
              </button>
            </div>

            <div className="stats-grid" data-testid="spike-media-telemetry">
              <div className="stat-box">
                Nguồn & Độ phân giải
                <strong>
                  {mediaLabel} {videoMeta ? `(${videoMeta.w}×${videoMeta.h})` : ''}
                </strong>
              </div>
              <div className="stat-box">
                Revision / Trạng thái
                <strong>
                  rev #{syncState.revision} • {syncState.status}
                </strong>
              </div>
              <div className="stat-box">
                Drift / Sửa sai lệch
                <strong>
                  {lastDrift.driftMs} ms ({lastDrift.action})
                </strong>
              </div>
              <div className="stat-box">
                Clock Offset / RTT / Buffer
                <strong>
                  {clockStats.offsetMs} ms • {clockStats.rttMs ?? '—'} ms • buf {bufferCount}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              Peer Ready: {Object.entries(peerReadyMap).length === 0 ? 'Chưa có tab/máy thứ hai' : Object.entries(peerReadyMap).map(([id, r]) => `${id.slice(0, 6)}: ${r ? 'Ready' : 'Chờ'}`).join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
