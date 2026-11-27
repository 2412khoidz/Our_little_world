import React, { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  type Billiards3DQuality,
  type BilliardsEdition,
  type BilliardsLobbyState,
  type BilliardsMatchResult,
  type BilliardsPlayMode,
  type BilliardsRule,
  type BilliardsTransport,
  type BotDifficulty,
  type LobbyConfirmedConfig,
  type MatchSnapshot,
  type PlayerSlot,
} from '../../../shared/billiards/types';
import { BilliardsEntryMenu } from './BilliardsEntryMenu';
import { BilliardsOnlineLobby } from './BilliardsOnlineLobby';
import type { BilliardsMatchSyncHandlers } from './billiardsGameProps';
import {
  loadBilliardsLocalStats,
  recordBotMatchResult,
  recordLocal2pMatchResult,
  type BilliardsLocalStats,
} from './localStats';
import { billiardsSound } from './sound';
import { useBilliardsSync } from './useBilliardsSync';
import './billiards.css';

const Billiards2DGameLazy = lazy(() => import('./Billiards2DGame'));
const Billiards3DGameLazy = lazy(() => import('./Billiards3DGame'));

export interface BilliardsModalProps {
  open: boolean;
  onClose: () => void;
  playerNames?: [string, string];
  localPlayerSlot?: PlayerSlot;
  initialMode?: BilliardsPlayMode;
  initialScores?: [number, number];
  transport?: BilliardsTransport;
  hasPartner?: boolean;
  partnerOnline?: boolean;
  initialView?: 'entry' | 'lobby';
  skipEntryMenu?: boolean;
  /** Integrate with OLW global volume (0..1) */
  masterVolume?: number;
  /** Pause Phaser overworld render loop while billiards is open (keeps multiplayer presence alive) */
  onPauseOverworld?: () => void;
  /** Resume Phaser overworld render loop cleanly on exit */
  onResumeOverworld?: () => void;
  onMatchComplete?: (result: BilliardsMatchResult) => void;
}

type ModalView = 'entry' | 'lobby' | 'game2d' | 'game3d';

function probeWebGLSupport(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 2;
    const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

const BilliardsModalInner: React.FC<BilliardsModalProps> = ({
  onClose,
  playerNames = ['Minh Khôi', 'Hà Anh'],
  localPlayerSlot = 0,
  initialMode = 'local_pvp',
  initialScores = [0, 0],
  transport,
  hasPartner,
  partnerOnline = false,
  initialView = 'entry',
  skipEntryMenu = false,
  onMatchComplete,
}) => {
  const effectiveHasPartner = hasPartner ?? Boolean(transport);
  const [view, setView] = useState<ModalView>(() =>
    skipEntryMenu ? 'game2d' : initialView === 'lobby' && effectiveHasPartner ? 'lobby' : 'entry',
  );
  const [edition, setEdition] = useState<BilliardsEdition>('2d');
  const [mode, setMode] = useState<BilliardsPlayMode>(() =>
    initialMode === 'online' && !effectiveHasPartner ? 'local_pvp' : initialMode,
  );
  const [rule, setRule] = useState<BilliardsRule>('8ball');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium');
  const [quality3d, setQuality3d] = useState<Billiards3DQuality>('auto');
  const [localStats, setLocalStats] = useState<BilliardsLocalStats>(() => loadBilliardsLocalStats());
  const [lobbyState, setLobbyState] = useState<BilliardsLobbyState | null>(null);
  const [confirmedOnlineConfig, setConfirmedOnlineConfig] = useState<LobbyConfirmedConfig | null>(null);
  const [recoveredSnapshot, setRecoveredSnapshot] = useState<MatchSnapshot | null>(null);
  const [loadedAssetEdition, setLoadedAssetEdition] = useState<BilliardsEdition | null>(null);
  const [assetErrorEdition, setAssetErrorEdition] = useState<BilliardsEdition | null>(null);
  const [inviteSentAtMs, setInviteSentAtMs] = useState<number | null>(null);

  const matchHandlersRef = useRef<BilliardsMatchSyncHandlers | null>(null);
  const recoveredSnapshotRef = useRef<MatchSnapshot | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const scheduledCountdownMatchIdRef = useRef<string | null>(null);
  const activeCountdownMatchIdRef = useRef<string | null>(null);
  const onMatchCompleteRef = useRef(onMatchComplete);
  const localPlayerSlotRef = useRef(localPlayerSlot);
  const viewRef = useRef(view);

  useLayoutEffect(() => {
    onMatchCompleteRef.current = onMatchComplete;
    localPlayerSlotRef.current = localPlayerSlot;
    viewRef.current = view;
    recoveredSnapshotRef.current = recoveredSnapshot;
  });

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    scheduledCountdownMatchIdRef.current = null;
  }, []);

  useEffect(() => () => clearCountdownTimer(), [clearCountdownTimer]);

  const bindSyncHandlers = useCallback((handlers: BilliardsMatchSyncHandlers | null) => {
    matchHandlersRef.current = handlers;
  }, []);

  const sync = useBilliardsSync({
    enabled: Boolean(transport),
    transport,
    localPlayerSlot,
    onRemoteStart: (payload, verifiedSenderSlot) => {
      matchHandlersRef.current?.onRemoteStart(payload, verifiedSenderSlot);
    },
    onRemoteAim: (payload, verifiedSenderSlot) => {
      matchHandlersRef.current?.onRemoteAim(payload, verifiedSenderSlot);
    },
    onRemoteShot: (payload, verifiedSenderSlot) => {
      matchHandlersRef.current?.onRemoteShot(payload, verifiedSenderSlot);
    },
    onRemotePlaceCue: (payload, verifiedSenderSlot) => {
      matchHandlersRef.current?.onRemotePlaceCue(payload, verifiedSenderSlot);
    },
    onRemoteSettled: (payload, verifiedSenderSlot) => {
      matchHandlersRef.current?.onRemoteSettled(payload, verifiedSenderSlot);
    },
    onStateRequested: (payload, verifiedSenderSlot) => {
      matchHandlersRef.current?.onStateRequested(payload, verifiedSenderSlot);
    },
    onRemoteSnapshot: (snapshot, verifiedSenderSlot) => {
      setRecoveredSnapshot(snapshot);
      matchHandlersRef.current?.onRemoteSnapshot(snapshot, verifiedSenderSlot);
    },
    onLobbyState: (nextLobby) => {
      setLobbyState(nextLobby);
      if (nextLobby.confirmedConfig) {
        setConfirmedOnlineConfig(nextLobby.confirmedConfig);
      }
      if (nextLobby.status === 'countdown' && nextLobby.confirmedConfig) {
        activeCountdownMatchIdRef.current = nextLobby.confirmedConfig.matchId;
      } else if (nextLobby.status === 'lobby' || nextLobby.status === 'idle') {
        activeCountdownMatchIdRef.current = null;
      } else if (
        nextLobby.status === 'in_match' &&
        viewRef.current === 'lobby' &&
        nextLobby.activeMatchId &&
        nextLobby.activeMatchId === activeCountdownMatchIdRef.current
      ) {
        // Countdown initiated while local player was actively in this lobby just completed on server
        activeCountdownMatchIdRef.current = null;
        const cfg = nextLobby.confirmedConfig;
        const targetEdition = cfg?.edition ?? nextLobby.edition;
        setMode('online');
        setEdition(targetEdition);
        setRule(cfg?.rule ?? nextLobby.rule);
        setView(targetEdition === '3d' ? 'game3d' : 'game2d');
      }
    },
    getStateRequestPayload: () => ({
      requesterSlot: localPlayerSlotRef.current,
      currentMatchId: recoveredSnapshotRef.current?.matchId ?? null,
      currentMatchSeq: recoveredSnapshotRef.current?.matchSeq ?? 0,
      currentStateVersion: recoveredSnapshotRef.current?.stateVersion ?? 0,
    }),
    needsSync: () => viewRef.current !== 'game2d' && viewRef.current !== 'game3d',
  });

  const lobbyEdition = lobbyState?.edition ?? edition;
  const assetsReady = loadedAssetEdition === lobbyEdition;
  const assetStatusText =
    assetErrorEdition === lobbyEdition
      ? 'Thiết bị chưa hỗ trợ WebGL 3D — hãy chọn bản 2D'
      : assetsReady
        ? `Đã tải xong bàn ${lobbyEdition.toUpperCase()}`
        : lobbyEdition === '3d'
          ? 'Đang tải bàn Bi-a 3D & Three.js...'
          : 'Đang tải bàn Bi-a 2D...';

  // Preload selected edition assets while in Online Lobby (Asset-loading readiness gate)
  useEffect(() => {
    if (view !== 'lobby') return;
    let cancelled = false;
    const loader =
      lobbyEdition === '3d'
        ? import('./Billiards3DGame').then(() => {
            if (!probeWebGLSupport()) {
              throw new Error('WEBGL_UNSUPPORTED');
            }
          })
        : import('./Billiards2DGame').then(() => undefined);

    loader
      .then(() => {
        if (cancelled) return;
        setAssetErrorEdition(null);
        setLoadedAssetEdition(lobbyEdition);
        sync.broadcastLobbyJoin({
          playerSlot: localPlayerSlot,
          edition: lobbyEdition,
          rule: lobbyState?.rule ?? rule,
          assetsReady: true,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAssetErrorEdition(lobbyEdition);
        setLoadedAssetEdition(null);
        sync.broadcastLobbyJoin({
          playerSlot: localPlayerSlot,
          edition: lobbyEdition,
          rule: lobbyState?.rule ?? rule,
          assetsReady: false,
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyEdition, view]);

  // Synchronized countdown timer transition
  useEffect(() => {
    if (!lobbyState || (view !== 'lobby' && view !== 'game2d' && view !== 'game3d')) {
      clearCountdownTimer();
      return;
    }
    if (lobbyState.status === 'lobby' || lobbyState.status === 'idle') {
      clearCountdownTimer();
      return;
    }
    if (lobbyState.status !== 'countdown' || !lobbyState.confirmedConfig) {
      return;
    }

    const cfg = lobbyState.confirmedConfig;
    if (scheduledCountdownMatchIdRef.current === cfg.matchId) {
      return;
    }
    clearCountdownTimer();
    scheduledCountdownMatchIdRef.current = cfg.matchId;
    const delayMs = Math.max(0, cfg.startAtServerMs - sync.getServerNowMs());
    countdownTimerRef.current = window.setTimeout(() => {
      countdownTimerRef.current = null;
      scheduledCountdownMatchIdRef.current = null;
      activeCountdownMatchIdRef.current = null;
      setConfirmedOnlineConfig(cfg);
      setMode('online');
      setEdition(cfg.edition);
      setRule(cfg.rule);
      setView(cfg.edition === '3d' ? 'game3d' : 'game2d');
    }, delayMs);
  }, [clearCountdownTimer, lobbyState, sync, view]);

  const handleGameMatchComplete = useCallback(
    (result: BilliardsMatchResult) => {
      if (result.mode === 'online') {
        onMatchCompleteRef.current?.(result);
      } else if (result.mode === 'local_pvp') {
        setLocalStats(recordLocal2pMatchResult(result.winnerSlot));
      } else if (result.mode === 'ai') {
        setLocalStats(recordBotMatchResult(botDifficulty, result.winnerSlot));
      }
    },
    [botDifficulty],
  );

  const handleLaunchFromMenu = () => {
    setConfirmedOnlineConfig(null);
    setRecoveredSnapshot(null);
    if (mode === 'online') {
      setView('lobby');
      sync.broadcastLobbyJoin({
        playerSlot: localPlayerSlot,
        edition,
        rule,
        assetsReady: false,
      });
      sync.requestLobbySync();
      return;
    }
    setView(edition === '3d' ? 'game3d' : 'game2d');
  };

  const handleResumeOnline = () => {
    setMode('online');
    if (lobbyState?.status === 'in_match') {
      const targetEdition = recoveredSnapshot?.edition ?? lobbyState.edition;
      setEdition(targetEdition);
      setRule(recoveredSnapshot?.rule ?? lobbyState.rule);
      if (lobbyState.confirmedConfig) {
        setConfirmedOnlineConfig(lobbyState.confirmedConfig);
      }
      setView(targetEdition === '3d' ? 'game3d' : 'game2d');
      sync.requestState(true);
    } else {
      setView('lobby');
      sync.broadcastLobbyJoin({
        playerSlot: localPlayerSlot,
        edition,
        rule,
        assetsReady: false,
      });
      sync.requestLobbySync();
    }
  };

  const handleResetToNewLobby = () => {
    setConfirmedOnlineConfig(null);
    setRecoveredSnapshot(null);
    sync.broadcastLobbyLeave({ playerSlot: localPlayerSlot, reason: 'new_lobby' });
    sync.broadcastLobbyJoin({
      playerSlot: localPlayerSlot,
      edition,
      rule,
      assetsReady: false,
    });
  };

  const handleExitToMenu = () => {
    if (mode === 'online') {
      sync.broadcastLobbyLeave({ playerSlot: localPlayerSlot, reason: 'leave' });
    }
    setView('entry');
  };

  const handleCloseModal = () => {
    if (view === 'lobby') {
      sync.broadcastLobbyLeave({ playerSlot: localPlayerSlot, reason: 'leave' });
    }
    onClose();
  };

  const effectiveNames: [string, string] =
    mode === 'ai'
      ? [
          playerNames[0],
          `Bot (${botDifficulty === 'easy' ? 'Dễ' : botDifficulty === 'medium' ? 'Vừa' : 'Cao thủ'})`,
        ]
      : playerNames;

  return (
    <div className="olw-billiards-overlay" data-testid="billiards-modal">
      {view === 'entry' && (
        <BilliardsEntryMenu
          edition={edition}
          mode={mode}
          rule={rule}
          botDifficulty={botDifficulty}
          quality3d={quality3d}
          hasPartner={effectiveHasPartner}
          partnerOnline={partnerOnline}
          playerNames={playerNames}
          onlineScores={initialScores}
          localStats={localStats}
          lobbyState={lobbyState}
          onEditionChange={setEdition}
          onModeChange={setMode}
          onRuleChange={setRule}
          onBotDifficultyChange={setBotDifficulty}
          onQuality3dChange={setQuality3d}
          onLaunch={handleLaunchFromMenu}
          onResumeOnlineMatch={handleResumeOnline}
          onClose={handleCloseModal}
        />
      )}

      {view === 'lobby' && (
        <BilliardsOnlineLobby
          localPlayerSlot={localPlayerSlot}
          playerNames={playerNames}
          lobbyState={lobbyState}
          assetsReady={assetsReady}
          assetStatusText={assetStatusText}
          inviteSentAtMs={inviteSentAtMs}
          getServerNowMs={sync.getServerNowMs}
          getRttMs={sync.getRttMs}
          onInvitePartner={() => {
            setInviteSentAtMs(Date.now());
            sync.broadcastLobbyInvite({
              inviterSlot: localPlayerSlot,
              inviterName: playerNames[localPlayerSlot],
              edition: lobbyState?.edition ?? edition,
              rule: lobbyState?.rule ?? rule,
              sentAtMs: Date.now(),
            });
          }}
          onChangeConfig={(nextEdition, nextRule, nextStarter) => {
            setEdition(nextEdition);
            setRule(nextRule);
            sync.broadcastLobbyConfig({
              actorSlot: localPlayerSlot,
              configVersion: lobbyState?.configVersion ?? 1,
              edition: nextEdition,
              rule: nextRule,
              startingPlayer: nextStarter,
            });
          }}
          onToggleReady={(ready) => {
            sync.broadcastLobbyReady({
              playerSlot: localPlayerSlot,
              configVersion: lobbyState?.configVersion ?? 1,
              ready,
              assetsReady,
            });
          }}
          onCancelCountdown={() => {
            sync.broadcastLobbyLeave({ playerSlot: localPlayerSlot, reason: 'cancel' });
          }}
          onResumeActiveMatch={handleResumeOnline}
          onResetToNewLobby={handleResetToNewLobby}
          onLeaveLobby={() => {
            sync.broadcastLobbyLeave({ playerSlot: localPlayerSlot, reason: 'leave' });
            setView('entry');
          }}
          onClose={handleCloseModal}
        />
      )}

      {view === 'game2d' && (
        <Suspense fallback={<div className="olw-3d-loading">Đang tải bàn Bi-a 2D...</div>}>
          <Billiards2DGameLazy
            mode={mode}
            initialRule={rule}
            botDifficulty={botDifficulty}
            playerNames={effectiveNames}
            localPlayerSlot={localPlayerSlot}
            initialScores={mode === 'online' ? initialScores : [0, 0]}
            confirmedOnlineConfig={mode === 'online' ? confirmedOnlineConfig : null}
            recoveredSnapshot={mode === 'online' ? recoveredSnapshot : null}
            lobbyState={lobbyState}
            sync={mode === 'online' ? sync : null}
            bindSyncHandlers={bindSyncHandlers}
            onExitToMenu={handleExitToMenu}
            onClose={handleCloseModal}
            onMatchComplete={handleGameMatchComplete}
          />
        </Suspense>
      )}

      {view === 'game3d' && (
        <Suspense fallback={<div className="olw-3d-loading">Đang tải bàn Bi-a 3D...</div>}>
          <Billiards3DGameLazy
            mode={mode}
            initialRule={rule}
            botDifficulty={botDifficulty}
            quality3d={quality3d}
            playerNames={effectiveNames}
            localPlayerSlot={localPlayerSlot}
            initialScores={mode === 'online' ? initialScores : [0, 0]}
            confirmedOnlineConfig={mode === 'online' ? confirmedOnlineConfig : null}
            recoveredSnapshot={mode === 'online' ? recoveredSnapshot : null}
            lobbyState={lobbyState}
            sync={mode === 'online' ? sync : null}
            bindSyncHandlers={bindSyncHandlers}
            onExitToMenu={handleExitToMenu}
            onClose={handleCloseModal}
            onMatchComplete={handleGameMatchComplete}
          />
        </Suspense>
      )}
    </div>
  );
};

export const BilliardsModal: React.FC<BilliardsModalProps> = (props) => {
  const { open, masterVolume = 1, onPauseOverworld, onResumeOverworld } = props;
  const masterVolumeRef = useRef(masterVolume);
  const onPauseOverworldRef = useRef(onPauseOverworld);
  const onResumeOverworldRef = useRef(onResumeOverworld);

  useLayoutEffect(() => {
    masterVolumeRef.current = masterVolume;
    onPauseOverworldRef.current = onPauseOverworld;
    onResumeOverworldRef.current = onResumeOverworld;
  });

  // Pause Phaser overworld on open, resume & dispose audio on close/unmount (independent of volume/view)
  useEffect(() => {
    if (!open) return;
    billiardsSound.setMasterVolume(masterVolumeRef.current);
    onPauseOverworldRef.current?.();
    return () => {
      billiardsSound.dispose();
      onResumeOverworldRef.current?.();
    };
  }, [open]);

  useEffect(() => {
    billiardsSound.setMasterVolume(masterVolume);
  }, [masterVolume]);

  if (!open) return null;
  return <BilliardsModalInner {...props} />;
};

export default BilliardsModal;
