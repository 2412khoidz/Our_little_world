import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Menu, RotateCcw, Search, Volume2, VolumeX, X } from 'lucide-react';
import {
  BALL_COLORS,
  BALL_R,
  FIXED_STEP_DT,
  MAX_SPEED,
  MIN_SPEED_SHOT,
  PLAY_B,
  PLAY_L,
  PLAY_R,
  PLAY_T,
  POCKETS,
  TABLE_H,
  TABLE_W,
  cloneBalls,
  evaluateShotRules,
  findOpenCueSpot,
  isLegalTargetBall,
  isPositionValidForCue,
  quatRotateVec,
  stepBilliardsFixedTick,
} from '../../../shared/billiards/physicsEngine';
import {
  OPPONENT_TIMEOUT_GRACE_MS,
  TURN_DURATION_MS,
  applyRemoteSettled,
  applyRemoteSnapshot,
  applyRemoteStart,
  beginShotOnState,
  buildMatchSnapshot,
  createInitialProtocolState,
  createLocalMatchStart,
  createLocalShot,
  shouldAnswerStateRequest,
  validateRemoteAim,
  validateRemotePlaceCue,
  validateRemoteShot,
  type BilliardsProtocolState,
} from '../../../shared/billiards/protocol';
import type {
  BallGroup,
  BallState,
  BilliardsMatchPhase,
  BilliardsMatchResult,
  BilliardsPlayMode,
  BilliardsRule,
  BilliardsTransport,
  PlayerSlot,
  ShotParams,
} from '../../../shared/billiards/types';
import { billiardsSound } from './sound';
import { useBilliardsSync } from './useBilliardsSync';
import './billiards.css';

export interface BilliardsModalProps {
  open: boolean;
  onClose: () => void;
  playerNames?: [string, string];
  localPlayerSlot?: PlayerSlot;
  initialMode?: BilliardsPlayMode;
  initialScores?: [number, number];
  transport?: BilliardsTransport;
  /** Integrate with OLW global volume (0..1) */
  masterVolume?: number;
  /** Pause Phaser overworld render loop while billiards is open (keeps multiplayer presence alive) */
  onPauseOverworld?: () => void;
  /** Resume Phaser overworld render loop cleanly on exit */
  onResumeOverworld?: () => void;
  onMatchComplete?: (result: BilliardsMatchResult) => void;
}

const FELT_THEMES = [
  { name: 'Xanh 8-Pool', center: '#3ea4cf', edge: '#1b6d96' },
  { name: 'Xanh Cổ Điển', center: '#168a44', edge: '#075229' },
  { name: 'Đỏ Ấm Áp', center: '#a82222', edge: '#520d0d' },
] as const;

const HANDSHAKE_HOST_MS = 350;
const HANDSHAKE_GUEST_MS = 1000;

function makeMatchId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

interface BilliardsSimRuntime {
  proto: BilliardsProtocolState;
  replayActive: boolean;
  preReplayBalls: BallState[] | null;
  draggingCueBall: boolean;
  aimAngle: number;
  power: number;
  spinX: number;
  spinY: number;
  lastTickSec: number;
  accumulator: number;
  zoomTarget: number;
  zoomCurrent: number;
  zoomHoverHold: boolean;
  zoomFocusX: number;
  zoomFocusY: number;
  camX: number;
  camY: number;
  powerDragging: boolean;
  powerStartY: number;
  tablePointerDown: boolean;
}

function createSimRuntime(
  initialScores: [number, number],
  mode: BilliardsPlayMode,
): BilliardsSimRuntime {
  const now = Date.now();
  return {
    proto: createInitialProtocolState({
      rule: '8ball',
      seed: 20261126,
      matchId: makeMatchId(),
      initialScores,
      nowMs: now,
      hasAuthoritativeMatch: mode !== 'online',
      matchSeq: mode !== 'online' ? 1 : 0,
      initiatorSlot: 0,
    }),
    replayActive: false,
    preReplayBalls: null,
    draggingCueBall: false,
    aimAngle: 0,
    power: 0,
    spinX: 0,
    spinY: 0,
    lastTickSec: 30,
    accumulator: 0,
    zoomTarget: 1.0,
    zoomCurrent: 1.0,
    zoomHoverHold: false,
    zoomFocusX: TABLE_W / 2,
    zoomFocusY: TABLE_H / 2,
    camX: TABLE_W / 2,
    camY: TABLE_H / 2,
    powerDragging: false,
    powerStartY: 0,
    tablePointerDown: false,
  };
}

export const BilliardsModal: React.FC<BilliardsModalProps> = ({
  open,
  onClose,
  playerNames = ['Minh Khôi', 'Hà Anh'],
  localPlayerSlot = 0,
  initialMode = 'local_pvp',
  initialScores = [0, 0],
  transport,
  masterVolume = 1,
  onPauseOverworld,
  onResumeOverworld,
  onMatchComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const powerSlotRef = useRef<HTMLDivElement | null>(null);
  const tableCacheRef = useRef<HTMLCanvasElement | null>(null);
  const cachedFeltIdxRef = useRef<number>(-1);
  const bannerTimerRef = useRef<number | null>(null);
  const handshakeTimerRef = useRef<number | null>(null);
  const reportedMatchIdsRef = useRef<Set<string>>(new Set());

  const mode = initialMode;

  const [rule, setRule] = useState<BilliardsRule>('8ball');
  const [phaseUi, setPhaseUi] = useState<BilliardsMatchPhase>('aim');
  const [feltIdx, setFeltIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [scores, setScores] = useState<[number, number]>(() => [initialScores[0], initialScores[1]]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerSlot>(0);
  const [groups, setGroups] = useState<[BallGroup, BallGroup]>([null, null]);
  const [returnedIds, setReturnedIds] = useState<number[]>([]);
  const [pocketedIds, setPocketedIds] = useState<number[]>([]);
  const [powerPct, setPowerPct] = useState(0);
  const [zoomLabel, setZoomLabel] = useState('1.0x');
  const [timeLeft, setTimeLeft] = useState(30);
  const [banner, setBanner] = useState<{ title: string; sub?: string } | null>(null);
  const [winner, setWinner] = useState<{ slot: PlayerSlot; reason: string } | null>(null);
  const [canMoveCue, setCanMoveCue] = useState(false);
  const [spin, setSpin] = useState({ x: 0, y: 0 });
  const [canReplay, setCanReplay] = useState(false);
  const [devDiag, setDevDiag] = useState(() => ({
    matchId: '',
    matchSeq: 0,
    stateVersion: 0,
    shotSeq: 0,
    shotCount: 0,
  }));

  // Lazy single-init simulation state (accessed only inside effects and event handlers)
  const simRef = useRef<BilliardsSimRuntime | null>(null);
  const initialScoresRef = useRef(initialScores);
  const modeRef = useRef(mode);

  const getSim = useCallback((): BilliardsSimRuntime => {
    if (simRef.current === null) {
      simRef.current = createSimRuntime(initialScoresRef.current, modeRef.current);
    }
    return simRef.current;
  }, []);

  // Latest-value refs so lifecycle & RAF effects stay completely stable across UI/volume updates
  const masterVolumeRef = useRef(masterVolume);
  const onPauseOverworldRef = useRef(onPauseOverworld);
  const onResumeOverworldRef = useRef(onResumeOverworld);
  const onMatchCompleteRef = useRef(onMatchComplete);
  const feltIdxRef = useRef(feltIdx);
  const showMenuRef = useRef(showMenu);
  const showSpinModalRef = useRef(showSpinModal);
  const playerNamesRef = useRef(playerNames);
  const localPlayerSlotRef = useRef(localPlayerSlot);
  const syncRef = useRef<ReturnType<typeof useBilliardsSync> | null>(null);

  useLayoutEffect(() => {
    initialScoresRef.current = initialScores;
    modeRef.current = mode;
    masterVolumeRef.current = masterVolume;
    onPauseOverworldRef.current = onPauseOverworld;
    onResumeOverworldRef.current = onResumeOverworld;
    onMatchCompleteRef.current = onMatchComplete;
    feltIdxRef.current = feltIdx;
    showMenuRef.current = showMenu;
    showSpinModalRef.current = showSpinModal;
    playerNamesRef.current = playerNames;
    localPlayerSlotRef.current = localPlayerSlot;
  });

  const clearBannerTimer = useCallback(() => {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
  }, []);

  const clearHandshakeTimer = useCallback(() => {
    if (handshakeTimerRef.current !== null) {
      window.clearTimeout(handshakeTimerRef.current);
      handshakeTimerRef.current = null;
    }
  }, []);

  const showTempBanner = useCallback(
    (title: string, sub?: string, ms = 2100) => {
      setBanner({ title, sub });
      clearBannerTimer();
      bannerTimerRef.current = window.setTimeout(() => {
        setBanner(null);
        bannerTimerRef.current = null;
      }, ms);
    },
    [clearBannerTimer],
  );

  const syncReactFromProto = useCallback(
    (proto: BilliardsProtocolState, replayActive = false) => {
      const pocketed = proto.balls
        .filter((b) => b.id !== 0 && b.pocketed)
        .map((b) => b.id);
      setRule(proto.rule);
      setPhaseUi(proto.phase);
      setGroups([proto.groups[0], proto.groups[1]]);
      setCurrentPlayer(proto.currentPlayer);
      setCanMoveCue(proto.canMoveCueBall);
      setReturnedIds([...proto.returnedIds]);
      setPocketedIds(pocketed);
      setScores([proto.scores[0], proto.scores[1]]);
      setWinner(proto.winner ? { ...proto.winner } : null);
      setCanReplay(!replayActive && proto.phase === 'aim' && proto.lastShotSnap !== null);
      const sec = Math.max(0, Math.ceil((proto.turnDeadlineMs - Date.now()) / 1000));
      getSim().lastTickSec = sec;
      setTimeLeft(sec);
      if (import.meta.env.DEV) {
        setDevDiag({
          matchId: proto.matchId,
          matchSeq: proto.matchSeq,
          stateVersion: proto.stateVersion,
          shotSeq: proto.nextShotSeq,
          shotCount: proto.shots.length,
        });
      }
    },
    [getSim],
  );

  const emitMatchCompleteOnce = useCallback((proto: BilliardsProtocolState) => {
    if (!proto.winner) return;
    if (reportedMatchIdsRef.current.has(proto.matchId)) return;
    reportedMatchIdsRef.current.add(proto.matchId);
    onMatchCompleteRef.current?.({
      matchId: proto.matchId,
      rule: proto.rule,
      winnerSlot: proto.winner.slot,
      reason: proto.winner.reason,
      rackSeed: proto.rackSeed,
      shots: proto.shots.map((s) => ({ ...s })),
      durationSeconds: Math.max(1, Math.round((Date.now() - proto.startedAtMs) / 1000)),
    });
  }, []);

  const cancelLocalReplay = useCallback((sim: BilliardsSimRuntime) => {
    if (!sim.replayActive) return;
    sim.replayActive = false;
    if (sim.preReplayBalls) {
      sim.proto.balls = sim.preReplayBalls;
      sim.preReplayBalls = null;
    }
    sim.accumulator = 0;
  }, []);

  // Hydrate persistent scores before the first in-session win is scored
  useEffect(() => {
    const sim = getSim();
    if (sim.proto.scoredMatchId !== null) return;
    const next0 = Math.max(sim.proto.scores[0], initialScores[0]);
    const next1 = Math.max(sim.proto.scores[1], initialScores[1]);
    if (next0 !== sim.proto.scores[0] || next1 !== sim.proto.scores[1]) {
      sim.proto.scores = [next0, next1];
      setScores([next0, next1]);
    }
  }, [getSim, initialScores]);

  // Pause Phaser overworld on open, resume & dispose timers/audio/cache on close/unmount (independent of volume!)
  useEffect(() => {
    if (!open) return;
    const sim = getSim();
    if (import.meta.env.DEV) {
      setDevDiag({
        matchId: sim.proto.matchId,
        matchSeq: sim.proto.matchSeq,
        stateVersion: sim.proto.stateVersion,
        shotSeq: sim.proto.nextShotSeq,
        shotCount: sim.proto.shots.length,
      });
    }
    billiardsSound.setMasterVolume(masterVolumeRef.current);
    onPauseOverworldRef.current?.();
    return () => {
      clearBannerTimer();
      clearHandshakeTimer();
      const curSim = simRef.current;
      if (curSim) {
        curSim.powerDragging = false;
        curSim.draggingCueBall = false;
        curSim.tablePointerDown = false;
        curSim.zoomHoverHold = false;
      }
      if (tableCacheRef.current) {
        tableCacheRef.current.width = 0;
        tableCacheRef.current.height = 0;
        tableCacheRef.current = null;
      }
      cachedFeltIdxRef.current = -1;
      billiardsSound.dispose();
      onResumeOverworldRef.current?.();
    };
  }, [clearBannerTimer, clearHandshakeTimer, getSim, open]);

  // Separate volume updates from pause/resume lifecycle
  useEffect(() => {
    billiardsSound.setMasterVolume(masterVolume);
  }, [masterVolume]);

  const applyShotKinematics = useCallback((sim: BilliardsSimRuntime, shot: ShotParams) => {
    const cue = sim.proto.balls.find((b) => b.id === 0);
    if (!cue || cue.pocketed) return;
    cue.x = shot.cueX;
    cue.y = shot.cueY;

    const speed = MIN_SPEED_SHOT + Math.pow(shot.power, 1.32) * (MAX_SPEED - MIN_SPEED_SHOT);
    const dx = Math.cos(shot.angle);
    const dy = Math.sin(shot.angle);
    cue.vx = dx * speed;
    cue.vy = dy * speed;
    if (shot.spinY > 0.02) {
      const f = 1.0 + shot.spinY * 1.4;
      cue.rollVx = dx * speed * f;
      cue.rollVy = dy * speed * f;
    } else if (shot.spinY < -0.02) {
      const f = shot.spinY * 2.2;
      cue.rollVx = dx * speed * f;
      cue.rollVy = dy * speed * f;
    } else {
      cue.rollVx = dx * speed * 0.14;
      cue.rollVy = dy * speed * 0.14;
    }
    cue.spinZ = shot.spinX * speed * 1.1;
    sim.power = 0;
    sim.accumulator = 0;
    setPowerPct(0);
    billiardsSound.playCue(shot.power);
  }, []);

  const launchLiveShot = useCallback(
    (shot: ShotParams) => {
      const sim = getSim();
      cancelLocalReplay(sim);
      sim.proto = beginShotOnState(sim.proto, shot);
      sim.draggingCueBall = false;
      sim.tablePointerDown = false;
      applyShotKinematics(sim, shot);
      syncReactFromProto(sim.proto, false);
    },
    [applyShotKinematics, cancelLocalReplay, getSim, syncReactFromProto],
  );

  const sync = useBilliardsSync({
    enabled: open && mode === 'online' && Boolean(transport),
    transport,
    localPlayerSlot,
    onRemoteStart: (payload, verifiedSenderSlot) => {
      const sim = getSim();
      cancelLocalReplay(sim);
      const res = applyRemoteStart(
        sim.proto,
        payload,
        localPlayerSlotRef.current,
        Date.now(),
        verifiedSenderSlot,
      );
      if (!res.accepted) {
        if (res.shouldRebroadcastAuthoritative) {
          const liveBalls =
            sim.replayActive && sim.preReplayBalls ? sim.preReplayBalls : sim.proto.balls;
          syncRef.current?.broadcastSnapshot(
            buildMatchSnapshot(sim.proto, localPlayerSlotRef.current, Date.now(), liveBalls),
          );
        }
        return;
      }
      clearHandshakeTimer();
      sim.proto = res.nextState;
      sim.aimAngle = 0;
      sim.power = 0;
      sim.spinX = 0;
      sim.spinY = 0;
      sim.accumulator = 0;
      sim.draggingCueBall = false;
      sim.powerDragging = false;
      sim.tablePointerDown = false;
      setSpin({ x: 0, y: 0 });
      setPowerPct(0);
      syncReactFromProto(sim.proto, false);
      showTempBanner(
        `${playerNamesRef.current[payload.startingPlayer]} khai cuộc!`,
        payload.rule === '8ball' ? '8-Ball Pool' : '9-Ball Pool',
        1700,
      );
    },
    onRemoteAim: (payload, verifiedSenderSlot) => {
      const sim = getSim();
      if (!validateRemoteAim(sim.proto, payload, localPlayerSlotRef.current, verifiedSenderSlot)) {
        return;
      }
      sim.aimAngle = payload.angle;
      sim.power = payload.power;
      setPowerPct(Math.round(payload.power * 100));
    },
    onRemoteShot: (shot, verifiedSenderSlot) => {
      const sim = getSim();
      cancelLocalReplay(sim);
      const check = validateRemoteShot(
        sim.proto,
        shot,
        localPlayerSlotRef.current,
        verifiedSenderSlot,
      );
      if (!check.ok) {
        if (check.shouldRequestSnapshot) {
          syncRef.current?.requestState(true);
        }
        return;
      }
      launchLiveShot(shot);
    },
    onRemotePlaceCue: (payload, verifiedSenderSlot) => {
      const sim = getSim();
      if (
        !validateRemotePlaceCue(sim.proto, payload, localPlayerSlotRef.current, verifiedSenderSlot)
      ) {
        return;
      }
      const cue = sim.proto.balls.find((b) => b.id === 0);
      if (cue) {
        cue.x = payload.x;
        cue.y = payload.y;
      }
    },
    onRemoteSettled: (settled, verifiedSenderSlot) => {
      const sim = getSim();
      cancelLocalReplay(sim);
      const res = applyRemoteSettled(
        sim.proto,
        settled,
        localPlayerSlotRef.current,
        Date.now(),
        verifiedSenderSlot,
      );
      if (!res.accepted) {
        if (res.shouldRequestSnapshot) {
          syncRef.current?.requestState(true);
        }
        return;
      }
      sim.proto = res.nextState;
      sim.accumulator = 0;
      sim.spinX = 0;
      sim.spinY = 0;
      sim.power = 0;
      setSpin({ x: 0, y: 0 });
      setPowerPct(0);
      syncReactFromProto(sim.proto, false);

      if (!res.alreadyProvisionallySettled) {
        if (settled.winner) {
          billiardsSound.playWin();
        } else if (settled.kind === 'turn_timeout' || settled.ballInHand) {
          billiardsSound.playFoul();
        }
        if (settled.bannerTitle) {
          showTempBanner(settled.bannerTitle, settled.bannerSub, 2100);
        }
      }

      if (sim.proto.winner) {
        emitMatchCompleteOnce(sim.proto);
      }
      if (res.shouldRequestSnapshot) {
        syncRef.current?.requestState(true);
      }
    },
    onStateRequested: (requester) => {
      const sim = getSim();
      const decision = shouldAnswerStateRequest(sim.proto, requester);
      if (decision.shouldRequestPeer) {
        syncRef.current?.requestState(true);
      }
      if (!decision.respond) return;
      const liveBalls =
        sim.replayActive && sim.preReplayBalls ? sim.preReplayBalls : sim.proto.balls;
      syncRef.current?.broadcastSnapshot(
        buildMatchSnapshot(sim.proto, localPlayerSlotRef.current, Date.now(), liveBalls),
      );
    },
    onRemoteSnapshot: (snap, verifiedSenderSlot) => {
      const sim = getSim();
      cancelLocalReplay(sim);
      const res = applyRemoteSnapshot(
        sim.proto,
        snap,
        localPlayerSlotRef.current,
        Date.now(),
        verifiedSenderSlot,
      );
      if (!res.accepted) return;
      clearHandshakeTimer();
      sim.proto = res.nextState;
      sim.accumulator = 0;
      sim.draggingCueBall = false;
      sim.powerDragging = false;
      sim.tablePointerDown = false;
      sim.power = 0;
      setPowerPct(0);
      syncReactFromProto(sim.proto, false);
      if (sim.proto.winner) {
        emitMatchCompleteOnce(sim.proto);
      }
    },
    getStateRequestPayload: () => {
      const proto = getSim().proto;
      return {
        requesterSlot: localPlayerSlotRef.current,
        currentMatchId: proto.hasAuthoritativeMatch ? proto.matchId : null,
        currentMatchSeq: proto.matchSeq,
        currentStateVersion: proto.stateVersion,
      };
    },
    needsSync: () => !getSim().proto.hasAuthoritativeMatch,
  });

  useLayoutEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  const startNewMatch = useCallback(
    (nextRule: BilliardsRule, starting: PlayerSlot, silentBanner = false) => {
      const sim = getSim();
      clearHandshakeTimer();
      cancelLocalReplay(sim);
      const now = Date.now();
      const seed = Math.floor(Math.random() * 1e9);
      const matchId = makeMatchId();
      const { nextState, startPayload } = createLocalMatchStart(sim.proto, {
        rule: nextRule,
        startingPlayer: starting,
        seed,
        matchId,
        initiatorSlot: modeRef.current === 'online' ? localPlayerSlotRef.current : 0,
        nowMs: now,
      });

      sim.proto = nextState;
      sim.aimAngle = 0;
      sim.power = 0;
      sim.spinX = 0;
      sim.spinY = 0;
      sim.accumulator = 0;
      sim.draggingCueBall = false;
      sim.powerDragging = false;
      sim.tablePointerDown = false;
      setSpin({ x: 0, y: 0 });
      setPowerPct(0);
      syncReactFromProto(sim.proto, false);

      if (!silentBanner) {
        showTempBanner(
          `${playerNamesRef.current[starting]} khai cuộc!`,
          nextRule === '8ball' ? '8-Ball Pool' : '9-Ball Pool',
          1700,
        );
      }

      if (modeRef.current === 'online') {
        sync.broadcastStart(startPayload);
      }
    },
    [cancelLocalReplay, clearHandshakeTimer, getSim, showTempBanner, sync, syncReactFromProto],
  );

  // Authoritative online match creation handshake (prevents duplicate/racing start states)
  useEffect(() => {
    if (!open || mode !== 'online') return;
    const sim = getSim();
    if (sim.proto.hasAuthoritativeMatch) return;

    clearHandshakeTimer();
    const delayMs = localPlayerSlot === 0 ? HANDSHAKE_HOST_MS : HANDSHAKE_GUEST_MS;
    handshakeTimerRef.current = window.setTimeout(() => {
      handshakeTimerRef.current = null;
      const currentSim = getSim();
      if (currentSim.proto.hasAuthoritativeMatch) return;
      startNewMatch(currentSim.proto.rule, 0, false);
    }, delayMs);

    return () => clearHandshakeTimer();
  }, [clearHandshakeTimer, getSim, localPlayerSlot, mode, open, startNewMatch]);

  // Escape closes inner popups first before closing modal
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showSpinModalRef.current) {
        e.stopPropagation();
        setShowSpinModal(false);
      } else if (showMenuRef.current) {
        e.stopPropagation();
        setShowMenu(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  const isLocalTurn = mode !== 'online' || currentPlayer === localPlayerSlot;

  const fireLocalShot = useCallback(() => {
    const sim = getSim();
    const created = createLocalShot(sim.proto, {
      angle: sim.aimAngle,
      power: sim.power,
      spinX: sim.spinX,
      spinY: sim.spinY,
      localPlayerSlot: localPlayerSlotRef.current,
      mode: modeRef.current,
    });
    if (!created.ok) {
      sim.power = 0;
      setPowerPct(0);
      return;
    }
    if (modeRef.current === 'online') {
      sync.broadcastShot(created.shot);
    }
    launchLiveShot(created.shot);
  }, [getSim, launchLiveShot, sync]);

  // Offscreen static table cache builder
  const ensureTableCache = useCallback((themeIdx: number): HTMLCanvasElement => {
    if (!tableCacheRef.current) {
      const c = document.createElement('canvas');
      c.width = TABLE_W;
      c.height = TABLE_H;
      tableCacheRef.current = c;
    }
    if (cachedFeltIdxRef.current === themeIdx) return tableCacheRef.current;
    cachedFeltIdxRef.current = themeIdx;
    const tCtx = tableCacheRef.current.getContext('2d');
    if (!tCtx) return tableCacheRef.current;

    const theme = FELT_THEMES[themeIdx] ?? FELT_THEMES[0];
    tCtx.clearRect(0, 0, TABLE_W, TABLE_H);

    // Mahogany wood rail frame
    tCtx.fillStyle = '#6e1d10';
    tCtx.beginPath();
    tCtx.roundRect(0, 0, TABLE_W, TABLE_H, 26);
    tCtx.fill();

    // Felt gradient + overhead billiard lamp sheen
    const feltGrad = tCtx.createRadialGradient(
      TABLE_W / 2,
      TABLE_H / 2,
      50,
      TABLE_W / 2,
      TABLE_H / 2,
      TABLE_W * 0.55,
    );
    feltGrad.addColorStop(0, theme.center);
    feltGrad.addColorStop(1, theme.edge);
    tCtx.fillStyle = feltGrad;
    tCtx.fillRect(PLAY_L, PLAY_T, PLAY_R - PLAY_L, PLAY_B - PLAY_T);

    tCtx.strokeStyle = 'rgba(0,0,0,0.36)';
    tCtx.lineWidth = 10;
    tCtx.strokeRect(PLAY_L + 3, PLAY_T + 3, PLAY_R - PLAY_L - 6, PLAY_B - PLAY_T - 6);

    const kx = PLAY_L + (PLAY_R - PLAY_L) * 0.25;
    tCtx.strokeStyle = 'rgba(255,255,255,0.22)';
    tCtx.lineWidth = 1.5;
    tCtx.beginPath();
    tCtx.moveTo(kx, PLAY_T);
    tCtx.lineTo(kx, PLAY_B);
    tCtx.stroke();

    for (const p of POCKETS) {
      tCtx.beginPath();
      tCtx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
      tCtx.fillStyle = '#cbd5e1';
      tCtx.fill();
      tCtx.beginPath();
      tCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      tCtx.fillStyle = '#090d16';
      tCtx.fill();
    }
    return tableCacheRef.current;
  }, []);

  // Main Fixed-Timestep 120Hz Physics + Render Loop (stabilized deps — never restarts on UI state changes)
  useEffect(() => {
    if (!open) return;
    let active = true;
    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      if (!active) return;
      const realDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const sim = getSim();
      const proto = sim.proto;
      const curMode = modeRef.current;
      const curLocalSlot = localPlayerSlotRef.current;
      const curNames = playerNamesRef.current;

      // Smooth PC Zoom camera
      const desiredZ = sim.zoomHoverHold ? Math.max(2.0, sim.zoomTarget) : sim.zoomTarget;
      const zAlpha = 1 - Math.exp(-10 * realDt);
      sim.zoomCurrent += (desiredZ - sim.zoomCurrent) * zAlpha;
      const hw = TABLE_W / 2 / sim.zoomCurrent;
      const hh = TABLE_H / 2 / sim.zoomCurrent;
      const tx =
        sim.zoomCurrent <= 1.01
          ? TABLE_W / 2
          : Math.max(hw, Math.min(TABLE_W - hw, sim.zoomFocusX));
      const ty =
        sim.zoomCurrent <= 1.01
          ? TABLE_H / 2
          : Math.max(hh, Math.min(TABLE_H - hh, sim.zoomFocusY));
      sim.camX += (tx - sim.camX) * zAlpha;
      sim.camY += (ty - sim.camY) * zAlpha;

      // Shared Turn Deadline Clock (UTC ms) — never pauses during online menu/spin modals
      const shouldTickClock =
        !sim.replayActive &&
        proto.phase === 'aim' &&
        proto.hasAuthoritativeMatch &&
        (curMode === 'online' || (!showMenuRef.current && !showSpinModalRef.current));

      if (shouldTickClock) {
        const remainingMs = proto.turnDeadlineMs - Date.now();
        const sec = Math.max(0, Math.ceil(remainingMs / 1000));
        if (sec !== sim.lastTickSec) {
          if (sec <= 5 && sec > 0) billiardsSound.playTick();
          sim.lastTickSec = sec;
          setTimeLeft(sec);
        }

        const isTimedOutAuthoritative =
          curMode !== 'online'
            ? remainingMs <= 0
            : proto.currentPlayer === curLocalSlot
              ? remainingMs <= 0
              : remainingMs <= -OPPONENT_TIMEOUT_GRACE_MS;

        if (isTimedOutAuthoritative) {
          const opp: PlayerSlot = proto.currentPlayer === 0 ? 1 : 0;
          const nextDeadline = Date.now() + TURN_DURATION_MS;
          const bannerTitle = 'Hết thời gian!';
          const bannerSub = `Đặt bi tự do — Lượt ${curNames[opp]}`;

          proto.currentPlayer = opp;
          proto.canMoveCueBall = true;
          proto.turnDeadlineMs = nextDeadline;
          proto.stateVersion += 1;
          proto.confirmedStateVersion = proto.stateVersion;
          proto.provisionalSettledShotIndex = null;
          sim.lastTickSec = 30;
          sim.draggingCueBall = false;
          sim.tablePointerDown = false;
          sim.power = 0;

          setPowerPct(0);
          setCurrentPlayer(opp);
          setCanMoveCue(true);
          setTimeLeft(30);
          billiardsSound.playFoul();
          showTempBanner(bannerTitle, bannerSub, 2200);
          if (import.meta.env.DEV) {
            setDevDiag({
              matchId: proto.matchId,
              matchSeq: proto.matchSeq,
              stateVersion: proto.stateVersion,
              shotSeq: proto.nextShotSeq,
              shotCount: proto.shots.length,
            });
          }

          if (curMode === 'online') {
            syncRef.current?.broadcastSettled({
              matchId: proto.matchId,
              matchSeq: proto.matchSeq,
              kind: 'turn_timeout',
              actorSlot: curLocalSlot,
              shotIndex: null,
              shot: null,
              stateVersion: proto.stateVersion,
              nextShotSeq: proto.nextShotSeq,
              balls: cloneBalls(proto.balls),
              groups: [proto.groups[0], proto.groups[1]],
              nextPlayer: opp,
              ballInHand: true,
              isBreakShot: proto.isBreakShot,
              turnDeadlineMs: nextDeadline,
              turnRemainingMs: TURN_DURATION_MS,
              returnedIds: [...proto.returnedIds],
              scores: [proto.scores[0], proto.scores[1]],
              winner: null,
              bannerTitle,
              bannerSub,
            });
          }
        }
      } else if (proto.phase === 'moving' || sim.replayActive) {
        const isRep = sim.replayActive;
        // Strict Fixed-Timestep Accumulator: 0.5x slow-mo feeds 0.5*realDt into the EXACT same FIXED_STEP_DT!
        sim.accumulator += isRep ? realDt * 0.5 : realDt;
        let stillMoving = true;
        let stepsRun = 0;
        while (sim.accumulator >= FIXED_STEP_DT && stepsRun < 12) {
          stillMoving = stepBilliardsFixedTick(proto.balls, {
            onFirstHit: (id) => {
              if (!isRep && proto.shotFirstHit === null) proto.shotFirstHit = id;
            },
            onPocket: (b) => {
              billiardsSound.playPocket();
              if (!isRep) {
                if (b.id === 0) proto.cueScratched = true;
                else {
                  proto.shotPocketed.push(b.id);
                  if (!proto.returnedIds.includes(b.id)) {
                    proto.returnedIds = [...proto.returnedIds, b.id];
                    setReturnedIds(proto.returnedIds);
                  }
                }
              }
            },
            onBallHit: (spd) => billiardsSound.playBallHit(spd),
            onCushion: (spd) => billiardsSound.playCushion(spd),
          });
          if (!isRep) {
            proto.inFlightTicks += 1;
          }
          sim.accumulator -= FIXED_STEP_DT;
          stepsRun++;
          if (!stillMoving) {
            sim.accumulator = 0;
            break;
          }
        }

        if (!stillMoving) {
          if (isRep) {
            sim.replayActive = false;
            if (sim.preReplayBalls) {
              proto.balls = sim.preReplayBalls;
              sim.preReplayBalls = null;
            }
            syncReactFromProto(proto, false);
          } else {
            const shooterSlot = proto.currentPlayer;
            const settledShotIndex = proto.activeShotIndex;
            const settledShot =
              proto.shots.find((s) => s.shotIndex === settledShotIndex) ??
              proto.lastShotSnap?.shot ??
              null;

            const outcome = evaluateShotRules({
              rule: proto.rule,
              balls: proto.balls,
              currentPlayer: shooterSlot,
              groups: proto.groups,
              isBreakShot: proto.isBreakShot,
              wasOnEightBeforeShot: proto.shotWasOnEight,
              firstHit: proto.shotFirstHit,
              pocketed: proto.shotPocketed,
              scratched: proto.cueScratched,
              playerNames: curNames,
            });
            proto.isBreakShot = false;
            sim.spinX = 0;
            sim.spinY = 0;
            setSpin({ x: 0, y: 0 });
            proto.groups = [outcome.groups[0], outcome.groups[1]];

            if (outcome.respotNine) {
              const b9 = proto.balls.find((b) => b.id === 9);
              if (b9) {
                b9.pocketed = false;
                b9.x = PLAY_L + (PLAY_R - PLAY_L) * 0.73;
                b9.y = TABLE_H / 2;
                b9.vx = 0;
                b9.vy = 0;
                b9.rollVx = 0;
                b9.rollVy = 0;
                b9.spinZ = 0;
              }
              proto.returnedIds = proto.returnedIds.filter((id) => id !== 9);
            }

            const nextDeadline = Date.now() + TURN_DURATION_MS;
            if (outcome.winner) {
              proto.phase = 'gameOver';
              proto.winner = { ...outcome.winner };
              proto.canMoveCueBall = false;
              if (proto.scoredMatchId !== proto.matchId) {
                proto.scoredMatchId = proto.matchId;
                proto.scores =
                  outcome.winner.slot === 0
                    ? [proto.scores[0] + 1, proto.scores[1]]
                    : [proto.scores[0], proto.scores[1] + 1];
              }
              billiardsSound.playWin();
              emitMatchCompleteOnce(proto);
            } else {
              proto.currentPlayer = outcome.nextPlayer;
              proto.phase = 'aim';
              proto.turnDeadlineMs = nextDeadline;
              proto.canMoveCueBall = outcome.ballInHand;
              if (outcome.ballInHand) {
                billiardsSound.playFoul();
                const cue = proto.balls.find((b) => b.id === 0);
                if (cue) {
                  const spot = findOpenCueSpot(proto.balls);
                  cue.pocketed = false;
                  cue.x = spot.x;
                  cue.y = spot.y;
                  cue.vx = 0;
                  cue.vy = 0;
                  cue.rollVx = 0;
                  cue.rollVy = 0;
                  cue.spinZ = 0;
                }
              }
              if (outcome.bannerTitle) {
                showTempBanner(outcome.bannerTitle, outcome.bannerSub, 2100);
              }
            }

            proto.stateVersion += 1;
            proto.preShotBalls = null;
            proto.inFlightTicks = 0;
            proto.activeShotIndex = -1;

            if (curMode !== 'online' || shooterSlot === curLocalSlot) {
              proto.confirmedStateVersion = proto.stateVersion;
              proto.provisionalSettledShotIndex = null;
            } else {
              proto.provisionalSettledShotIndex =
                settledShotIndex >= 0 ? settledShotIndex : null;
            }

            syncReactFromProto(proto, false);

            // Broadcast authoritative settled state from the shooting client
            if (curMode === 'online' && shooterSlot === curLocalSlot && settledShotIndex >= 0) {
              syncRef.current?.broadcastSettled({
                matchId: proto.matchId,
                matchSeq: proto.matchSeq,
                kind: 'shot_settled',
                actorSlot: curLocalSlot,
                shotIndex: settledShotIndex,
                shot: settledShot ? { ...settledShot } : null,
                stateVersion: proto.stateVersion,
                nextShotSeq: proto.nextShotSeq,
                balls: cloneBalls(proto.balls),
                groups: [proto.groups[0], proto.groups[1]],
                nextPlayer: outcome.winner ? proto.currentPlayer : outcome.nextPlayer,
                ballInHand: proto.canMoveCueBall,
                isBreakShot: false,
                turnDeadlineMs: nextDeadline,
                turnRemainingMs: TURN_DURATION_MS,
                returnedIds: [...proto.returnedIds],
                scores: [proto.scores[0], proto.scores[1]],
                winner: proto.winner ? { ...proto.winner } : null,
                foulMessage: outcome.foulMessage,
                bannerTitle: outcome.bannerTitle,
                bannerSub: outcome.bannerSub,
              });
            }
          }
        }
      }

      // Render using cached offscreen table canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const cachedTable = ensureTableCache(feltIdxRef.current);
        ctx.clearRect(0, 0, TABLE_W, TABLE_H);
        ctx.save();
        if (sim.zoomCurrent > 1.001) {
          ctx.translate(TABLE_W / 2, TABLE_H / 2);
          ctx.scale(sim.zoomCurrent, sim.zoomCurrent);
          ctx.translate(-sim.camX, -sim.camY);
        }

        ctx.drawImage(cachedTable, 0, 0);

        for (const b of proto.balls) {
          if (b.pocketed) continue;
          const ballColor = BALL_COLORS[b.id] ?? '#f8fafc';
          ctx.beginPath();
          ctx.arc(b.x + 2.5, b.y + 3, BALL_R, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.36)';
          ctx.fill();

          if (b.id > 8) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(b.x - BALL_R, b.y - BALL_R, BALL_R * 2, BALL_R * 2);
            const axis = quatRotateVec(b.q, 0, 1, 0);
            ctx.translate(b.x, b.y);
            ctx.rotate(Math.atan2(axis.x, -axis.y));
            ctx.fillStyle = ballColor;
            ctx.fillRect(-BALL_R * 1.4, -BALL_R * 0.56, BALL_R * 2.8, BALL_R * 1.12);
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
            ctx.fillStyle = ballColor;
            ctx.fill();
          }

          if (b.id !== 0) {
            const pole = quatRotateVec(b.q, 0, 0, 1);
            const vis = pole.z >= 0 ? pole : { x: -pole.x, y: -pole.y, z: -pole.z };
            if (vis.z > 0.18) {
              ctx.beginPath();
              ctx.arc(
                b.x + vis.x * BALL_R * 0.6,
                b.y + vis.y * BALL_R * 0.6,
                BALL_R * 0.44,
                0,
                Math.PI * 2,
              );
              ctx.fillStyle = '#f8fafc';
              ctx.fill();
              ctx.fillStyle = '#0f172a';
              ctx.font = '900 9px system-ui, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(
                String(b.id),
                b.x + vis.x * BALL_R * 0.6,
                b.y + vis.y * BALL_R * 0.6 + 0.5,
              );
            }
          }
        }

        const cue = proto.balls.find((b) => b.id === 0);
        if (cue && !cue.pocketed && proto.phase === 'aim' && !sim.replayActive && !sim.draggingCueBall) {
          const dx = Math.cos(sim.aimAngle);
          const dy = Math.sin(sim.aimAngle);
          let minT = Infinity;
          let hitBall: BallState | null = null;
          if (dx > 1e-6) minT = Math.min(minT, (PLAY_R - BALL_R - cue.x) / dx);
          else if (dx < -1e-6) minT = Math.min(minT, (PLAY_L + BALL_R - cue.x) / dx);
          if (dy > 1e-6) minT = Math.min(minT, (PLAY_B - BALL_R - cue.y) / dy);
          else if (dy < -1e-6) minT = Math.min(minT, (PLAY_T + BALL_R - cue.y) / dy);

          for (const b of proto.balls) {
            if (b.pocketed || b.id === 0) continue;
            const ocx = b.x - cue.x;
            const ocy = b.y - cue.y;
            const proj = ocx * dx + ocy * dy;
            if (proj <= 0) continue;
            const perpSq = ocx * ocx + ocy * ocy - proj * proj;
            if (perpSq < BALL_R * BALL_R * 4) {
              const t = proj - Math.sqrt(BALL_R * BALL_R * 4 - perpSq);
              if (t > 0 && t < minT) {
                minT = t;
                hitBall = b;
              }
            }
          }
          const gx = cue.x + dx * minT;
          const gy = cue.y + dy * minT;

          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(5,8,17,0.88)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(gx, gy);
          ctx.stroke();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(gx, gy);
          ctx.stroke();

          if (
            hitBall &&
            !isLegalTargetBall(
              proto.balls,
              proto.rule,
              proto.groups[proto.currentPlayer],
              proto.isBreakShot,
              hitBall.id,
            )
          ) {
            ctx.beginPath();
            ctx.arc(gx, gy, BALL_R * 0.96, 0, Math.PI * 2);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3.5;
            ctx.stroke();
            const d = BALL_R * 0.66;
            ctx.beginPath();
            ctx.moveTo(gx - d, gy - d);
            ctx.lineTo(gx + d, gy + d);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3.4;
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(gx, gy, BALL_R, 0, Math.PI * 2);
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2.2;
            ctx.stroke();
            if (hitBall) {
              const tdx = hitBall.x - gx;
              const tdy = hitBall.y - gy;
              const tLen = Math.hypot(tdx, tdy) || 1;
              ctx.strokeStyle = 'rgba(5,8,17,0.85)';
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.moveTo(hitBall.x, hitBall.y);
              ctx.lineTo(hitBall.x + (tdx / tLen) * 110, hitBall.y + (tdy / tLen) * 110);
              ctx.stroke();
              ctx.strokeStyle = '#4ade80';
              ctx.lineWidth = 2.6;
              ctx.beginPath();
              ctx.moveTo(hitBall.x, hitBall.y);
              ctx.lineTo(hitBall.x + (tdx / tLen) * 110, hitBall.y + (tdy / tLen) * 110);
              ctx.stroke();
            }
          }

          const pullback = 18 + sim.power * 90;
          ctx.save();
          ctx.translate(cue.x, cue.y);
          ctx.rotate(sim.aimAngle + Math.PI);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(pullback, -2.5, 5, 5);
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(pullback + 5, -3.2, 165, 6.4);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(pullback + 170, -4.5, 130, 9);
          ctx.restore();
        }

        if (proto.canMoveCueBall && cue) {
          ctx.beginPath();
          ctx.arc(cue.x, cue.y, BALL_R + 9, 0, Math.PI * 2);
          ctx.strokeStyle = '#86efac';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [emitMatchCompleteOnce, ensureTableCache, getSim, open, showTempBanner, syncReactFromProto]);

  if (!open) return null;

  const getTablePt = (clientX: number, clientY: number) => {
    const sim = getSim();
    const canvas = canvasRef.current;
    if (!canvas) return { x: TABLE_W / 2, y: TABLE_H / 2 };
    const rect = canvas.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * TABLE_W;
    const sy = ((clientY - rect.top) / rect.height) * TABLE_H;
    if (sim.zoomCurrent <= 1.001) return { x: sx, y: sy };
    return {
      x: (sx - TABLE_W / 2) / sim.zoomCurrent + sim.camX,
      y: (sy - TABLE_H / 2) / sim.zoomCurrent + sim.camY,
    };
  };

  const pocketedSet = new Set(pocketedIds);

  const renderSlots = (slot: PlayerSlot) => {
    const g = groups[slot];
    if (rule === '9ball') {
      let lowId: number | null = null;
      for (let id = 1; id <= 9; id++) {
        if (!pocketedSet.has(id)) {
          lowId = id;
          break;
        }
      }
      return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => {
        if (pocketedSet.has(id)) return <span key={id} className="olw-rack-slot" />;
        const hl = lowId === id && currentPlayer === slot ? ' olw-rack-slot--highlight' : '';
        return (
          <span key={id} style={{ background: BALL_COLORS[id] }} className={`olw-rack-slot${hl}`}>
            {id}
          </span>
        );
      });
    }
    if (!g) {
      return Array.from({ length: 7 }).map((_, idx) => <span key={idx} className="olw-rack-slot" />);
    }
    const ids = g === 'solid' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
    const remainingCount = ids.filter((id) => !pocketedSet.has(id)).length;
    if (remainingCount === 0) {
      return (
        <span
          style={{ background: '#0f172a', color: '#fff' }}
          className="olw-rack-slot olw-rack-slot--highlight"
        >
          8
        </span>
      );
    }
    return ids.map((id) => {
      if (pocketedSet.has(id)) return <span key={id} className="olw-rack-slot" />;
      return (
        <span key={id} style={{ background: BALL_COLORS[id] }} className="olw-rack-slot">
          {id}
        </span>
      );
    });
  };

  const timerDeg = Math.round((timeLeft / 30) * 360);
  const timerColor = timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f59e0b' : '#34d399';
  const cueTopPx = 6 + (powerPct / 100) * 195;

  return (
    <div
      className="olw-billiards-overlay"
      data-testid="billiards-modal"
      data-phase={phaseUi}
      data-rule={rule}
      data-current-player={String(currentPlayer)}
      {...(import.meta.env.DEV
        ? {
            'data-match-id': devDiag.matchId,
            'data-match-seq': String(devDiag.matchSeq),
            'data-state-version': String(devDiag.stateVersion),
            'data-shot-seq': String(devDiag.shotSeq),
            'data-shot-count': String(devDiag.shotCount),
          }
        : {})}
    >
      <header className="olw-billiards-header">
        <div className="olw-billiards-row">
          <button
            onClick={() => setShowMenu(true)}
            className="olw-billiards-btn-cozy olw-billiards-btn-cozy-sq"
            aria-label="Menu"
            data-testid="billiards-menu-btn"
          >
            <Menu size={18} />
          </button>
          <button
            onClick={() => {
              const sim = getSim();
              const steps = [1.0, 1.5, 2.0, 2.5];
              sim.zoomTarget = steps.find((v) => v > sim.zoomTarget + 0.05) ?? 1.0;
              setZoomLabel(`${sim.zoomTarget.toFixed(1)}x`);
            }}
            className="olw-billiards-pill"
          >
            <Search size={14} /> {zoomLabel}
          </button>
          <button
            disabled={!canReplay}
            data-testid="billiards-replay-btn"
            onClick={() => {
              const sim = getSim();
              if (!sim.proto.lastShotSnap || sim.proto.phase !== 'aim' || sim.replayActive) return;
              sim.preReplayBalls = cloneBalls(sim.proto.balls);
              sim.proto.balls = cloneBalls(sim.proto.lastShotSnap.balls);
              sim.replayActive = true;
              setCanReplay(false);
              applyShotKinematics(sim, sim.proto.lastShotSnap.shot);
            }}
            className="olw-billiards-pill olw-hide-sm"
          >
            <RotateCcw size={14} /> Replay
          </button>
        </div>

        <div className="olw-players-hud">
          <div className="olw-player-col olw-player-col--right">
            <div className="olw-player-name">{playerNames[0]}</div>
            <div className="olw-rack-row">{renderSlots(0)}</div>
          </div>
          <div
            className="olw-avatar-timer"
            data-testid={currentPlayer === 0 ? 'billiards-timer' : undefined}
            style={{
              background:
                currentPlayer === 0
                  ? `conic-gradient(${timerColor} ${timerDeg}deg, #2e2438 ${timerDeg}deg)`
                  : '#473d54',
            }}
          >
            <div className="olw-avatar-inner">🏡</div>
          </div>
          <div className="olw-score-box" data-testid="billiards-score">
            <div className="olw-score-rule">{rule === '8ball' ? '8-BALL' : '9-BALL'}</div>
            <div className="olw-score-val">
              {scores[0]} - {scores[1]}
            </div>
          </div>
          <div
            className="olw-avatar-timer"
            data-testid={currentPlayer === 1 ? 'billiards-timer' : undefined}
            style={{
              background:
                currentPlayer === 1
                  ? `conic-gradient(${timerColor} ${timerDeg}deg, #2e2438 ${timerDeg}deg)`
                  : '#473d54',
            }}
          >
            <div className="olw-avatar-inner">🌙</div>
          </div>
          <div className="olw-player-col olw-player-col--left">
            <div className="olw-player-name">{playerNames[1]}</div>
            <div className="olw-rack-row">{renderSlots(1)}</div>
          </div>
        </div>

        <div className="olw-billiards-row">
          <button
            onClick={() => setShowSpinModal(true)}
            title="Chỉnh Xoáy (Spin)"
            className="olw-spin-btn"
          >
            <span
              className="olw-spin-dot"
              style={{ left: `${50 + spin.x * 36}%`, top: `${50 - spin.y * 36}%` }}
            />
          </button>
          <button
            onClick={onClose}
            title="Quay về làng"
            aria-label="Quay về làng"
            data-testid="billiards-close"
            className="olw-billiards-pill olw-billiards-icon-btn"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <main className="olw-billiards-main">
        <div className="olw-power-col">
          <div
            ref={powerSlotRef}
            className="olw-power-slot"
            data-testid="billiards-power-slot"
            onPointerDown={(e) => {
              const sim = getSim();
              if (!isLocalTurn || sim.proto.phase !== 'aim' || sim.replayActive) return;
              if (mode === 'online' && !sim.proto.hasAuthoritativeMatch) return;
              billiardsSound.unlock();
              e.currentTarget.setPointerCapture(e.pointerId);
              sim.powerDragging = true;
              sim.powerStartY = e.clientY;
            }}
            onPointerMove={(e) => {
              const sim = getSim();
              if (!sim.powerDragging || !powerSlotRef.current) return;
              const h = powerSlotRef.current.clientHeight * 0.72;
              sim.power = Math.max(0, Math.min(1, (e.clientY - sim.powerStartY) / h));
              setPowerPct(Math.round(sim.power * 100));
              if (mode === 'online') {
                sync.broadcastAim({
                  matchId: sim.proto.matchId,
                  stateVersion: sim.proto.stateVersion,
                  playerSlot: sim.proto.currentPlayer,
                  angle: sim.aimAngle,
                  power: sim.power,
                });
              }
            }}
            onPointerUp={() => {
              const sim = getSim();
              if (!sim.powerDragging) return;
              sim.powerDragging = false;
              fireLocalShot();
            }}
            onPointerCancel={() => {
              const sim = getSim();
              if (!sim.powerDragging) return;
              sim.powerDragging = false;
              sim.power = 0;
              setPowerPct(0);
            }}
          >
            <div className="olw-power-fill" style={{ height: `${powerPct}%` }} />
            <div className="olw-power-cue" style={{ top: `${cueTopPx}px` }} />
          </div>
          <span className="olw-power-pct">{powerPct}%</span>
        </div>

        <div className="olw-stage-wrap">
          <canvas
            ref={canvasRef}
            width={TABLE_W}
            height={TABLE_H}
            className="olw-canvas"
            data-testid="billiards-canvas"
            onWheel={(e) => {
              e.preventDefault();
              const sim = getSim();
              const pt = getTablePt(e.clientX, e.clientY);
              sim.zoomFocusX = pt.x;
              sim.zoomFocusY = pt.y;
              sim.zoomTarget = Math.max(
                1.0,
                Math.min(2.5, +(sim.zoomTarget + (e.deltaY < 0 ? 0.25 : -0.25)).toFixed(2)),
              );
              setZoomLabel(`${sim.zoomTarget.toFixed(1)}x`);
            }}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              const sim = getSim();
              billiardsSound.unlock();
              if (e.button === 2) {
                sim.zoomHoverHold = true;
                setZoomLabel('Cận');
                return;
              }
              if (!isLocalTurn || sim.proto.phase !== 'aim' || sim.replayActive) return;
              if (mode === 'online' && !sim.proto.hasAuthoritativeMatch) return;
              const pt = getTablePt(e.clientX, e.clientY);
              const cue = sim.proto.balls.find((b) => b.id === 0);
              if (!cue) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              if (sim.proto.canMoveCueBall && Math.hypot(pt.x - cue.x, pt.y - cue.y) < BALL_R * 3.4) {
                sim.draggingCueBall = true;
                return;
              }
              sim.tablePointerDown = true;
              sim.aimAngle = Math.atan2(pt.y - cue.y, pt.x - cue.x);
              if (mode === 'online') {
                sync.broadcastAim({
                  matchId: sim.proto.matchId,
                  stateVersion: sim.proto.stateVersion,
                  playerSlot: sim.proto.currentPlayer,
                  angle: sim.aimAngle,
                  power: sim.power,
                });
              }
            }}
            onPointerMove={(e) => {
              const sim = getSim();
              const pt = getTablePt(e.clientX, e.clientY);
              if (sim.zoomTarget > 1.02 || sim.zoomHoverHold) {
                const rect = e.currentTarget.getBoundingClientRect();
                sim.zoomFocusX = ((e.clientX - rect.left) / rect.width) * TABLE_W;
                sim.zoomFocusY = ((e.clientY - rect.top) / rect.height) * TABLE_H;
              }
              const cue = sim.proto.balls.find((b) => b.id === 0);
              if (!cue) return;
              if (sim.draggingCueBall && sim.proto.canMoveCueBall) {
                const cx = Math.max(PLAY_L + BALL_R + 2, Math.min(PLAY_R - BALL_R - 2, pt.x));
                const cy = Math.max(PLAY_T + BALL_R + 2, Math.min(PLAY_B - BALL_R - 2, pt.y));
                if (isPositionValidForCue(sim.proto.balls, cx, cy)) {
                  cue.x = cx;
                  cue.y = cy;
                  if (mode === 'online') {
                    sync.broadcastPlaceCue({
                      matchId: sim.proto.matchId,
                      stateVersion: sim.proto.stateVersion,
                      playerSlot: sim.proto.currentPlayer,
                      x: cx,
                      y: cy,
                    });
                  }
                }
                return;
              }
              if (sim.tablePointerDown && isLocalTurn && sim.proto.phase === 'aim' && !sim.replayActive) {
                sim.aimAngle = Math.atan2(pt.y - cue.y, pt.x - cue.x);
                if (mode === 'online') {
                  sync.broadcastAim({
                    matchId: sim.proto.matchId,
                    stateVersion: sim.proto.stateVersion,
                    playerSlot: sim.proto.currentPlayer,
                    angle: sim.aimAngle,
                    power: sim.power,
                  });
                }
              }
            }}
            onPointerUp={(e) => {
              const sim = getSim();
              if (e.button === 2) {
                sim.zoomHoverHold = false;
                setZoomLabel(`${sim.zoomTarget.toFixed(1)}x`);
              }
              if (sim.draggingCueBall && sim.proto.canMoveCueBall && mode === 'online') {
                const cue = sim.proto.balls.find((b) => b.id === 0);
                if (cue) {
                  sync.broadcastPlaceCue(
                    {
                      matchId: sim.proto.matchId,
                      stateVersion: sim.proto.stateVersion,
                      playerSlot: sim.proto.currentPlayer,
                      x: cue.x,
                      y: cue.y,
                    },
                    true,
                  );
                }
              }
              sim.draggingCueBall = false;
              sim.tablePointerDown = false;
            }}
            onPointerCancel={() => {
              const sim = getSim();
              sim.zoomHoverHold = false;
              sim.draggingCueBall = false;
              sim.tablePointerDown = false;
            }}
          />

          {banner && (
            <div className="olw-banner-wrap">
              <div className="olw-banner-title">{banner.title}</div>
              {banner.sub && <div className="olw-banner-sub">{banner.sub}</div>}
            </div>
          )}

          {canMoveCue && isLocalTurn && (
            <div className="olw-hand-hint">
              ✋ Chạm giữ bi cái để kéo thả &amp; chỉnh lại thoải mái trước khi bắn
            </div>
          )}

          {winner && (
            <div
              className="olw-modal-backdrop"
              data-testid="billiards-winner-card"
              style={{ position: 'absolute', borderRadius: 16 }}
            >
              <div className="olw-modal-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>🏆</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  {playerNames[winner.slot]} chiến thắng!
                </div>
                <div style={{ fontSize: 12, color: '#fde68a' }}>{winner.reason}</div>
                <button
                  data-testid="billiards-next-match"
                  onClick={() => {
                    const nextStarter: PlayerSlot = winner.slot === 0 ? 1 : 0;
                    startNewMatch(rule, nextStarter);
                  }}
                  className="olw-billiards-btn-cozy"
                >
                  Đấu ván tiếp
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="olw-return-track">
          {returnedIds.map((id) => (
            <span key={id} style={{ background: BALL_COLORS[id] }} className="olw-return-ball">
              {id}
            </span>
          ))}
        </div>
      </main>

      {showMenu && (
        <div className="olw-modal-backdrop" onClick={() => setShowMenu(false)}>
          <div className="olw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="olw-modal-row">
              <span style={{ fontSize: 14, fontWeight: 900 }}>Quán Bi-a — Our Little World</span>
              <button
                onClick={() => setShowMenu(false)}
                className="olw-billiards-pill olw-billiards-icon-btn"
              >
                <X size={16} />
              </button>
            </div>
            <div className="olw-modal-row">
              <span>Thể thức</span>
              <div className="olw-billiards-row">
                <button
                  data-testid="billiards-rule-8ball"
                  onClick={() => {
                    setShowMenu(false);
                    startNewMatch('8ball', 0);
                  }}
                  className="olw-billiards-pill"
                >
                  8-Bi
                </button>
                <button
                  data-testid="billiards-rule-9ball"
                  onClick={() => {
                    setShowMenu(false);
                    startNewMatch('9ball', 0);
                  }}
                  className="olw-billiards-pill"
                >
                  9-Bi
                </button>
              </div>
            </div>
            <div className="olw-modal-row">
              <span>Màu nỉ bàn</span>
              <button
                onClick={() => setFeltIdx((i) => (i + 1) % FELT_THEMES.length)}
                className="olw-billiards-pill"
              >
                {(FELT_THEMES[feltIdx] ?? FELT_THEMES[0]).name}
              </button>
            </div>
            <div className="olw-modal-row">
              <span>Âm thanh</span>
              <button
                onClick={() => {
                  const next = !muted;
                  billiardsSound.setMuted(next);
                  setMuted(next);
                }}
                className="olw-billiards-pill"
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />} {muted ? 'Tắt' : 'Bật'}
              </button>
            </div>
            <button
              data-testid="billiards-new-match"
              onClick={() => {
                setShowMenu(false);
                startNewMatch(rule, 0);
              }}
              className="olw-billiards-btn-cozy"
            >
              Chơi ván mới
            </button>
          </div>
        </div>
      )}

      {showSpinModal && (
        <div className="olw-modal-backdrop" onClick={() => setShowSpinModal(false)}>
          <div
            className="olw-modal-card"
            style={{ alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: 14, fontWeight: 900 }}>Chỉnh Xoáy Bi Cái (Spin)</span>
            <div
              className="olw-spin-pad-big"
              onPointerDown={(e) => {
                const sim = getSim();
                const r = e.currentTarget.getBoundingClientRect();
                let nx = ((e.clientX - r.left) / r.width) * 2 - 1;
                let ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
                const m = Math.hypot(nx, ny);
                if (m > 0.84) {
                  nx = (nx / m) * 0.84;
                  ny = (ny / m) * 0.84;
                }
                sim.spinX = nx;
                sim.spinY = ny;
                setSpin({ x: nx, y: ny });
              }}
            >
              <span
                className="olw-spin-dot-big"
                style={{ left: `${50 + spin.x * 36}%`, top: `${50 - spin.y * 36}%` }}
              />
            </div>
            <div className="olw-billiards-row" style={{ width: '100%' }}>
              <button
                onClick={() => {
                  const sim = getSim();
                  sim.spinX = 0;
                  sim.spinY = 0;
                  setSpin({ x: 0, y: 0 });
                }}
                className="olw-billiards-pill"
                style={{ flex: 1 }}
              >
                Giữa tâm
              </button>
              <button
                onClick={() => setShowSpinModal(false)}
                className="olw-billiards-btn-cozy"
                style={{ flex: 1 }}
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BilliardsModal;
