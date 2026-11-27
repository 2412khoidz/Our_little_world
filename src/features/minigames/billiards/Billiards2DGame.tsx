import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Crosshair,
  Lock,
  Maximize2,
  Menu,
  Minimize2,
  RotateCcw,
  Smartphone,
  Unlock,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { chooseBotBallInHand2D, computeBotShot2D, type BotShotPlan } from '../../../shared/billiards/botAi';
import {
  BALL_COLORS,
  BALL_R,
  FIXED_STEP_DT,
  PLAY_B,
  PLAY_L,
  PLAY_R,
  PLAY_T,
  POCKETS,
  TABLE_H,
  TABLE_W,
  applyShotImpulse2D,
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
  BilliardsOrientation,
  BilliardsRule,
  PlayerSlot,
  ShotParams,
} from '../../../shared/billiards/types';
import type { BilliardsGameProps } from './billiardsGameProps';
import { BilliardsAvatarPortrait } from './BilliardsAvatarPortrait';
import { BilliardsTouchCameraSettings } from './BilliardsTouchCameraSettings';
import { billiardsSound } from './sound';
import {
  TOUCH_CUE_BALL_LIFT_PX,
  TOUCH_TAP_SLOP_PX,
  applyPinchZoomSensitivity,
  beginTapGesture,
  cancelTapGesture,
  completeTapGesture,
  computeDirectAimAngle2D,
  computeRelativeFineAimDelta2D,
  evaluatePowerPull,
  markTapMultiTouch,
  updateTapGesture,
  type TapGestureState,
} from './touchControls';
import {
  loadTouchPreferences,
  normalizeSensitivityMultipliers,
  subscribeTouchPreferences,
  type BilliardsTouchPreferences,
} from './touchPreferences';
import { useBilliardsKeyboard } from './useBilliardsKeyboard';
import { useFocusMode } from './useFocusMode';
import {
  clientToPhysics2D,
  isPortraitTableViewport,
  physicsToCanvasDims,
} from './viewportTransform';

const FELT_THEMES = [
  { name: 'Xanh 8-Pool', center: '#3ea4cf', edge: '#1b6d96' },
  { name: 'Xanh Cổ Điển', center: '#168a44', edge: '#075229' },
  { name: 'Đỏ Ấm Áp', center: '#a82222', edge: '#520d0d' },
] as const;

function makeMatchId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

interface AiPlanRuntime {
  plan: BotShotPlan;
  startAngle: number;
  elapsed: number;
  aimDuration: number;
  pullDuration: number;
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
  powerStartX: number;
  powerStartY: number;
  powerCancelled: boolean;
  tablePointerDown: boolean;
  touchGestureMoved: boolean;
  touchDownTimeMs: number;
  lastTouchPhysicsAngle: number | null;
  touchStartX: number;
  touchStartY: number;
  touchLastX: number;
  touchLastY: number;
  activePointerType: string;
  aiPlan: AiPlanRuntime | null;
  lastStartAtServerMs: number;
}

function normalizeAngleDelta(target: number, start: number): number {
  let diff = target - start;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function createSimRuntime(props: BilliardsGameProps): BilliardsSimRuntime {
  const now = Date.now();
  const cfg = props.confirmedOnlineConfig;
  let proto: BilliardsProtocolState;

  if (cfg) {
    proto = createInitialProtocolState({
      edition: '2d',
      rule: cfg.rule,
      seed: cfg.rackSeed,
      matchId: cfg.matchId,
      initialScores: [cfg.scores[0], cfg.scores[1]],
      nowMs: now,
      startAtServerMs: cfg.startAtServerMs,
      hasAuthoritativeMatch: true,
      matchSeq: cfg.matchSeq,
      initiatorSlot: cfg.startingPlayer,
    });
    proto.currentPlayer = cfg.startingPlayer;
    proto.turnDeadlineMs = Math.max(now, cfg.startAtServerMs) + TURN_DURATION_MS;
  } else {
    const firstStarter: PlayerSlot =
      props.mode === 'local_pvp' ? (Math.random() < 0.5 ? 0 : 1) : 0;
    proto = createInitialProtocolState({
      edition: '2d',
      rule: props.initialRule,
      seed: Math.floor(Math.random() * 1e9),
      matchId: makeMatchId(),
      initialScores: [props.initialScores[0], props.initialScores[1]],
      nowMs: now,
      hasAuthoritativeMatch: props.mode !== 'online',
      matchSeq: props.mode !== 'online' ? 1 : 0,
      initiatorSlot: firstStarter,
    });
    proto.currentPlayer = firstStarter;
  }

  if (props.recoveredSnapshot && props.recoveredSnapshot.edition !== '3d') {
    const res = applyRemoteSnapshot(
      proto,
      props.recoveredSnapshot,
      props.localPlayerSlot,
      now,
    );
    if (res.accepted) {
      proto = res.nextState;
    }
  }

  return {
    proto,
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
    powerStartX: 0,
    powerStartY: 0,
    powerCancelled: false,
    tablePointerDown: false,
    touchGestureMoved: false,
    touchDownTimeMs: 0,
    lastTouchPhysicsAngle: null,
    touchStartX: 0,
    touchStartY: 0,
    touchLastX: 0,
    touchLastY: 0,
    activePointerType: 'mouse',
    aiPlan: null,
    lastStartAtServerMs: cfg?.startAtServerMs ?? 0,
  };
}

export const Billiards2DGame: React.FC<BilliardsGameProps> = (props) => {
  const {
    mode,
    botDifficulty,
    playerNames,
    localPlayerSlot,
    confirmedOnlineConfig,
    lobbyState,
    sync,
    bindSyncHandlers,
    onExitToMenu,
    onClose,
    onMatchComplete,
  } = props;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const powerSlotRef = useRef<HTMLDivElement | null>(null);
  const tableCacheRef = useRef<HTMLCanvasElement | null>(null);
  const cachedFeltIdxRef = useRef<number>(-1);
  const bannerTimerRef = useRef<number | null>(null);
  const fineAimIntervalRef = useRef<number | null>(null);
  const reportedMatchIdsRef = useRef<Set<string>>(new Set());
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchPrevDistRef = useRef<number | null>(null);
  const multiTouchLockRef = useRef<boolean>(false);
  const tapGestureRef = useRef<TapGestureState | null>(null);
  const cueStickImgRef = useRef<HTMLImageElement | null>(null);
  const [touchPrefs, setTouchPrefs] = useState<BilliardsTouchPreferences>(() => loadTouchPreferences());

  const [initialBoot] = useState<BilliardsSimRuntime>(() => {
    const boot = createSimRuntime(props);
    if (props.mode === 'practice') {
      boot.proto.canMoveCueBall = true;
    }
    return boot;
  });
  const simRef = useRef<BilliardsSimRuntime | null>(null);
  const getSim = useCallback((): BilliardsSimRuntime => {
    if (simRef.current === null) {
      simRef.current = initialBoot;
    }
    return simRef.current;
  }, [initialBoot]);

  const [rule, setRule] = useState<BilliardsRule>(initialBoot.proto.rule);
  const [phaseUi, setPhaseUi] = useState<BilliardsMatchPhase>(initialBoot.proto.phase);
  const [feltIdx, setFeltIdx] = useState(0);
  const [muted, setMuted] = useState(billiardsSound.muted);
  const [timerEnabled, setTimerEnabled] = useState(mode !== 'practice');
  const [showMenu, setShowMenu] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [orientationPref, setOrientationPref] = useState<BilliardsOrientation>('auto');
  const [isAutoPortrait, setIsAutoPortrait] = useState(() =>
    typeof window !== 'undefined' ? isPortraitTableViewport(window.innerWidth, window.innerHeight) : false,
  );
  const [aimLocked, setAimLocked] = useState(false);
  const [precisionMode, setPrecisionMode] = useState(false);
  const [powerCancelled, setPowerCancelled] = useState(false);
  const { isFullscreen, isFocusExpanded, toggleFocusOrFullscreen } = useFocusMode(rootRef);
  const [scores, setScores] = useState<[number, number]>([
    initialBoot.proto.scores[0],
    initialBoot.proto.scores[1],
  ]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerSlot>(initialBoot.proto.currentPlayer);
  const [groups, setGroups] = useState<[BallGroup, BallGroup]>([
    initialBoot.proto.groups[0],
    initialBoot.proto.groups[1],
  ]);
  const [returnedIds, setReturnedIds] = useState<number[]>([...initialBoot.proto.returnedIds]);
  const [pocketedIds, setPocketedIds] = useState<number[]>(() =>
    initialBoot.proto.balls.filter((b) => b.id !== 0 && b.pocketed).map((b) => b.id),
  );
  const [powerPct, setPowerPct] = useState(0);
  const [zoomLabel, setZoomLabel] = useState('1.0x');
  const [timeLeft, setTimeLeft] = useState(30);
  const [banner, setBanner] = useState<{ title: string; sub?: string } | null>(null);
  const [winner, setWinner] = useState<{ slot: PlayerSlot; reason: string } | null>(
    initialBoot.proto.winner ? { ...initialBoot.proto.winner } : null,
  );
  const [canMoveCue, setCanMoveCue] = useState(initialBoot.proto.canMoveCueBall);
  const [spin, setSpin] = useState({ x: 0, y: 0 });
  const [spinDragging, setSpinDragging] = useState(false);
  const [canReplay, setCanReplay] = useState(
    initialBoot.proto.phase === 'aim' && initialBoot.proto.lastShotSnap !== null,
  );
  const [preStartWaitMs, setPreStartWaitMs] = useState(0);
  const [devDiag, setDevDiag] = useState(() => ({
    matchId: initialBoot.proto.matchId,
    matchSeq: initialBoot.proto.matchSeq,
    stateVersion: initialBoot.proto.stateVersion,
    shotSeq: initialBoot.proto.nextShotSeq,
    shotCount: initialBoot.proto.shots.length,
  }));

  const portraitRotated =
    orientationPref === 'portrait'
      ? true
      : orientationPref === 'landscape'
        ? false
        : isAutoPortrait;

  const portraitRotatedRef = useRef(portraitRotated);
  const aimLockedRef = useRef(aimLocked);
  const precisionModeRef = useRef(precisionMode);
  const touchPrefsRef = useRef(touchPrefs);

  const modeRef = useRef(mode);
  const botDifficultyRef = useRef(botDifficulty);
  const feltIdxRef = useRef(feltIdx);
  const timerEnabledRef = useRef(timerEnabled);
  const showMenuRef = useRef(showMenu);
  const showSpinModalRef = useRef(showSpinModal);
  const playerNamesRef = useRef(playerNames);
  const localPlayerSlotRef = useRef(localPlayerSlot);
  const syncRef = useRef(sync);
  const onMatchCompleteRef = useRef(onMatchComplete);

  useLayoutEffect(() => {
    portraitRotatedRef.current = portraitRotated;
    aimLockedRef.current = aimLocked;
    precisionModeRef.current = precisionMode;
    touchPrefsRef.current = touchPrefs;
    modeRef.current = mode;
    botDifficultyRef.current = botDifficulty;
    feltIdxRef.current = feltIdx;
    timerEnabledRef.current = timerEnabled;
    showMenuRef.current = showMenu;
    showSpinModalRef.current = showSpinModal;
    playerNamesRef.current = playerNames;
    localPlayerSlotRef.current = localPlayerSlot;
    syncRef.current = sync;
    onMatchCompleteRef.current = onMatchComplete;
  });

  useEffect(() => {
    return subscribeTouchPreferences(() => setTouchPrefs(loadTouchPreferences()));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      setIsAutoPortrait(isPortraitTableViewport(window.innerWidth, window.innerHeight));
    };
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    if (typeof Image === 'undefined') return;
    const img = new Image();
    img.src = '/assets/billiards/cue-stick.png';
    cueStickImgRef.current = img;
    return () => {
      if (cueStickImgRef.current === img) {
        cueStickImgRef.current = null;
      }
    };
  }, []);

  const getServerNowMs = useCallback(() => {
    return syncRef.current?.getServerNowMs() ?? Date.now();
  }, []);

  const clearBannerTimer = useCallback(() => {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
  }, []);

  const stopFineAim = useCallback(() => {
    if (fineAimIntervalRef.current !== null) {
      window.clearInterval(fineAimIntervalRef.current);
      fineAimIntervalRef.current = null;
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
      const pocketed = proto.balls.filter((b) => b.id !== 0 && b.pocketed).map((b) => b.id);
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
      const sec = Math.max(0, Math.ceil((proto.turnDeadlineMs - getServerNowMs()) / 1000));
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
    [getServerNowMs, getSim],
  );

  const emitMatchCompleteOnce = useCallback((proto: BilliardsProtocolState) => {
    if (!proto.winner) return;
    if (reportedMatchIdsRef.current.has(proto.matchId)) return;
    reportedMatchIdsRef.current.add(proto.matchId);
    onMatchCompleteRef.current({
      matchId: proto.matchId,
      edition: '2d',
      mode: modeRef.current,
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

  const scheduleAiTurnIfNeeded = useCallback((sim: BilliardsSimRuntime) => {
    if (
      modeRef.current !== 'ai' ||
      sim.proto.phase !== 'aim' ||
      sim.proto.currentPlayer !== 1 ||
      sim.replayActive ||
      sim.proto.winner
    ) {
      sim.aiPlan = null;
      return;
    }
    if (sim.aiPlan) return;

    const cue = sim.proto.balls.find((b) => b.id === 0);
    if (!cue || cue.pocketed) return;

    if (sim.proto.canMoveCueBall) {
      const spot = chooseBotBallInHand2D(
        sim.proto.balls,
        sim.proto.rule,
        sim.proto.groups[1],
        sim.proto.isBreakShot,
      );
      cue.x = spot.x;
      cue.y = spot.y;
      sim.proto.canMoveCueBall = false;
      setCanMoveCue(false);
    }

    const plan = computeBotShot2D({
      balls: sim.proto.balls,
      rule: sim.proto.rule,
      botSlot: 1,
      groups: sim.proto.groups,
      isBreakShot: sim.proto.isBreakShot,
      canMoveCueBall: false,
      difficulty: botDifficultyRef.current,
    });

    sim.aiPlan = {
      plan,
      startAngle: sim.aimAngle,
      elapsed: 0,
      aimDuration: 0.55,
      pullDuration: 0.38,
    };
  }, []);

  const applyShotKinematics = useCallback((sim: BilliardsSimRuntime, shot: ShotParams) => {
    applyShotImpulse2D(sim.proto.balls, {
      angle: shot.angle,
      power: shot.power,
      spinX: shot.spinX,
      spinY: shot.spinY,
      cueX: shot.cueX,
      cueY: shot.cueY,
    });
    sim.power = 0;
    sim.accumulator = 0;
    setPowerPct(0);
    billiardsSound.playCue(shot.power);
  }, []);

  const launchLiveShot = useCallback(
    (shot: ShotParams) => {
      const sim = getSim();
      cancelLocalReplay(sim);
      sim.aiPlan = null;
      sim.proto = beginShotOnState(sim.proto, shot);
      sim.draggingCueBall = false;
      sim.tablePointerDown = false;
      applyShotKinematics(sim, shot);
      syncReactFromProto(sim.proto, false);
    },
    [applyShotKinematics, cancelLocalReplay, getSim, syncReactFromProto],
  );

  const fireLocalShot = useCallback(() => {
    const sim = getSim();
    const effectiveMode = modeRef.current === 'ai' && sim.proto.currentPlayer === 1 ? 'ai' : modeRef.current;
    const created = createLocalShot(sim.proto, {
      angle: sim.aimAngle,
      power: sim.power,
      spinX: sim.spinX,
      spinY: sim.spinY,
      elevationDeg: 0,
      localPlayerSlot: localPlayerSlotRef.current,
      mode: effectiveMode,
    });
    if (!created.ok) {
      sim.power = 0;
      setPowerPct(0);
      return;
    }
    if (modeRef.current === 'online') {
      syncRef.current?.broadcastShot(created.shot);
    }
    launchLiveShot(created.shot);
  }, [getSim, launchLiveShot]);

  const startNewMatch = useCallback(
    (nextRule: BilliardsRule, starting: PlayerSlot, silentBanner = false) => {
      const sim = getSim();
      cancelLocalReplay(sim);
      sim.aiPlan = null;
      const now = getServerNowMs();
      const seed = Math.floor(Math.random() * 1e9);
      const matchId = makeMatchId();
      const { nextState, startPayload } = createLocalMatchStart(sim.proto, {
        edition: '2d',
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
        syncRef.current?.broadcastStart(startPayload);
      } else {
        scheduleAiTurnIfNeeded(sim);
      }
    },
    [cancelLocalReplay, getServerNowMs, getSim, scheduleAiTurnIfNeeded, showTempBanner, syncReactFromProto],
  );

  // Sync confirmedOnlineConfig updates (including synchronized online rematches!)
  useEffect(() => {
    if (mode !== 'online' || !confirmedOnlineConfig) return;
    const sim = getSim();
    if (sim.proto.matchId === confirmedOnlineConfig.matchId) return;

    cancelLocalReplay(sim);
    const now = getServerNowMs();
    const { nextState } = createLocalMatchStart(sim.proto, {
      edition: '2d',
      rule: confirmedOnlineConfig.rule,
      startingPlayer: confirmedOnlineConfig.startingPlayer,
      seed: confirmedOnlineConfig.rackSeed,
      matchId: confirmedOnlineConfig.matchId,
      initiatorSlot: confirmedOnlineConfig.startingPlayer,
      nowMs: now,
      matchSeqOverride: confirmedOnlineConfig.matchSeq,
      startAtServerMs: confirmedOnlineConfig.startAtServerMs,
    });
    nextState.scores = [confirmedOnlineConfig.scores[0], confirmedOnlineConfig.scores[1]];
    nextState.turnDeadlineMs = Math.max(now, confirmedOnlineConfig.startAtServerMs) + TURN_DURATION_MS;
    sim.proto = nextState;
    sim.lastStartAtServerMs = confirmedOnlineConfig.startAtServerMs;
    sim.aimAngle = 0;
    sim.power = 0;
    sim.spinX = 0;
    sim.spinY = 0;
    sim.accumulator = 0;
    setSpin({ x: 0, y: 0 });
    setPowerPct(0);
    syncReactFromProto(sim.proto, false);
    showTempBanner(
      `${playerNamesRef.current[confirmedOnlineConfig.startingPlayer]} khai cuộc!`,
      confirmedOnlineConfig.rule === '8ball' ? '8-Ball Online' : '9-Ball Online',
      1700,
    );
  }, [
    cancelLocalReplay,
    confirmedOnlineConfig,
    getServerNowMs,
    getSim,
    mode,
    showTempBanner,
    syncReactFromProto,
  ]);

  // Register online match sync handlers with BilliardsModal
  useEffect(() => {
    if (mode !== 'online') {
      bindSyncHandlers(null);
      return;
    }
    bindSyncHandlers({
      onRemoteStart: (payload, verifiedSenderSlot) => {
        if (payload.edition === '3d') return;
        const sim = getSim();
        cancelLocalReplay(sim);
        const res = applyRemoteStart(
          sim.proto,
          payload,
          localPlayerSlotRef.current,
          getServerNowMs(),
          verifiedSenderSlot,
        );
        if (!res.accepted) {
          if (res.shouldRebroadcastAuthoritative) {
            const liveBalls =
              sim.replayActive && sim.preReplayBalls ? sim.preReplayBalls : sim.proto.balls;
            syncRef.current?.broadcastSnapshot(
              buildMatchSnapshot(sim.proto, localPlayerSlotRef.current, getServerNowMs(), liveBalls),
            );
          }
          return;
        }
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
        if (payload.spinX !== undefined && payload.spinY !== undefined) {
          sim.spinX = payload.spinX;
          sim.spinY = payload.spinY;
          setSpin({ x: payload.spinX, y: payload.spinY });
        }
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
          getServerNowMs(),
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
          buildMatchSnapshot(sim.proto, localPlayerSlotRef.current, getServerNowMs(), liveBalls),
        );
      },
      onRemoteSnapshot: (snap, verifiedSenderSlot) => {
        if (snap.edition === '3d') return;
        const sim = getSim();
        cancelLocalReplay(sim);
        const res = applyRemoteSnapshot(
          sim.proto,
          snap,
          localPlayerSlotRef.current,
          getServerNowMs(),
          verifiedSenderSlot,
        );
        if (!res.accepted) return;
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
    });
    return () => bindSyncHandlers(null);
  }, [
    bindSyncHandlers,
    cancelLocalReplay,
    emitMatchCompleteOnce,
    getServerNowMs,
    getSim,
    launchLiveShot,
    mode,
    showTempBanner,
    syncReactFromProto,
  ]);

  // Show initial opening banner & trigger AI if starting
  useEffect(() => {
    const sim = getSim();
    if (sim.proto.shots.length === 0 && !sim.proto.winner) {
      showTempBanner(
        `${playerNamesRef.current[sim.proto.currentPlayer]} khai cuộc!`,
        sim.proto.rule === '8ball' ? '8-Ball Pool' : '9-Ball Pool',
        1600,
      );
      scheduleAiTurnIfNeeded(sim);
    }
    return () => {
      clearBannerTimer();
      stopFineAim();
      if (tableCacheRef.current) {
        tableCacheRef.current.width = 0;
        tableCacheRef.current.height = 0;
        tableCacheRef.current = null;
      }
      cachedFeltIdxRef.current = -1;
    };
  }, [clearBannerTimer, getSim, scheduleAiTurnIfNeeded, showTempBanner, stopFineAim]);

  const isLocalTurn =
    mode === 'local_pvp'
      ? true
      : mode === 'ai'
        ? currentPlayer === 0
        : currentPlayer === localPlayerSlot;

  const canHumanInteractNow = useCallback(() => {
    const sim = getSim();
    if (sim.proto.phase !== 'aim' || sim.replayActive || sim.proto.winner) return false;
    if (showMenuRef.current || showSpinModalRef.current) return false;
    if (modeRef.current === 'ai' && sim.proto.currentPlayer !== 0) return false;
    if (modeRef.current === 'online') {
      if (!sim.proto.hasAuthoritativeMatch) return false;
      if (sim.proto.currentPlayer !== localPlayerSlotRef.current) return false;
      if (sim.proto.startAtServerMs && getServerNowMs() < sim.proto.startAtServerMs) return false;
    }
    return true;
  }, [getServerNowMs, getSim]);

  const { stepKeyboardControls } = useBilliardsKeyboard({
    active: true,
    canShootNow: () => canHumanInteractNow() && !getSim().powerDragging && !getSim().draggingCueBall,
    canAimNow: () => canHumanInteractNow() && !getSim().draggingCueBall,
    hasInnerModalOpen: () => showMenuRef.current || showSpinModalRef.current,
    onCloseInnerModal: () => {
      if (showSpinModalRef.current) setShowSpinModal(false);
      else if (showMenuRef.current) setShowMenu(false);
    },
    getAimAngle: () => getSim().aimAngle,
    setAimAngle: (a) => {
      getSim().aimAngle = a;
    },
    getPower: () => getSim().power,
    setPower: (p) => {
      getSim().power = p;
    },
    onPowerUiSync: (p) => {
      setPowerPct(Math.round(p * 100));
    },
    onAimPreviewSync: (angle, power) => {
      const sim = getSim();
      if (modeRef.current === 'online' && sim.proto.hasAuthoritativeMatch) {
        syncRef.current?.broadcastAim({
          matchId: sim.proto.matchId,
          stateVersion: sim.proto.stateVersion,
          playerSlot: sim.proto.currentPlayer,
          angle,
          power,
          spinX: sim.spinX,
          spinY: sim.spinY,
        });
      }
    },
    onFireShot: fireLocalShot,
    onHoverZoomChange: (active) => {
      const sim = getSim();
      sim.zoomHoverHold = active;
      setZoomLabel(active ? 'Cận' : `${sim.zoomTarget.toFixed(1)}x`);
    },
  });

  const stepKeyboardRef = useRef(stepKeyboardControls);
  useLayoutEffect(() => {
    stepKeyboardRef.current = stepKeyboardControls;
  });

  // Offscreen static table cache builder (realistic mahogany rails, brass corners/sights & leather pocket trim; preserves PLAY_L/R/T/B & POCKETS)
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

    // Rich mahogany timber frame
    const railGrad = tCtx.createLinearGradient(0, 0, TABLE_W, TABLE_H);
    railGrad.addColorStop(0, '#4c1d0d');
    railGrad.addColorStop(0.5, '#782e14');
    railGrad.addColorStop(1, '#3b1509');
    tCtx.fillStyle = railGrad;
    tCtx.beginPath();
    tCtx.roundRect(0, 0, TABLE_W, TABLE_H, 26);
    tCtx.fill();

    // Subtle timber grain streaks & warm edge bevel
    tCtx.save();
    tCtx.beginPath();
    tCtx.roundRect(0, 0, TABLE_W, TABLE_H, 26);
    tCtx.clip();
    tCtx.strokeStyle = 'rgba(255, 224, 178, 0.06)';
    tCtx.lineWidth = 2;
    for (let y = 8; y < TABLE_H; y += 11) {
      tCtx.beginPath();
      tCtx.moveTo(0, y);
      tCtx.bezierCurveTo(TABLE_W * 0.35, y + ((y % 22 === 0) ? 4 : -4), TABLE_W * 0.7, y - 3, TABLE_W, y);
      tCtx.stroke();
    }
    tCtx.restore();

    tCtx.strokeStyle = '#240b04';
    tCtx.lineWidth = 4;
    tCtx.beginPath();
    tCtx.roundRect(2, 2, TABLE_W - 4, TABLE_H - 4, 24);
    tCtx.stroke();

    // Felt cloth with gentle overhead table lamp vignette
    const feltGrad = tCtx.createRadialGradient(
      TABLE_W / 2,
      TABLE_H / 2,
      50,
      TABLE_W / 2,
      TABLE_H / 2,
      TABLE_W * 0.56,
    );
    feltGrad.addColorStop(0, theme.center);
    feltGrad.addColorStop(1, theme.edge);
    tCtx.fillStyle = feltGrad;
    tCtx.fillRect(PLAY_L, PLAY_T, PLAY_R - PLAY_L, PLAY_B - PLAY_T);

    // Inner cushion lip shadow
    tCtx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
    tCtx.lineWidth = 10;
    tCtx.strokeRect(PLAY_L + 3, PLAY_T + 3, PLAY_R - PLAY_L - 6, PLAY_B - PLAY_T - 6);

    tCtx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    tCtx.lineWidth = 1.5;
    tCtx.strokeRect(PLAY_L - 1, PLAY_T - 1, PLAY_R - PLAY_L + 2, PLAY_B - PLAY_T + 2);

    // Baulk line + foot spot
    const kx = PLAY_L + (PLAY_R - PLAY_L) * 0.25;
    tCtx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    tCtx.lineWidth = 1.5;
    tCtx.beginPath();
    tCtx.moveTo(kx, PLAY_T);
    tCtx.lineTo(kx, PLAY_B);
    tCtx.stroke();

    const fx = PLAY_L + (PLAY_R - PLAY_L) * 0.75;
    const fy = (PLAY_T + PLAY_B) / 2;
    tCtx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    tCtx.beginPath();
    tCtx.arc(fx, fy, 4, 0, Math.PI * 2);
    tCtx.fill();

    // Ivory/brass rail diamond sights (left/right & top/bottom segments)
    tCtx.fillStyle = '#fde68a';
    const topRailY = PLAY_T / 2;
    const botRailY = PLAY_B + (TABLE_H - PLAY_B) / 2;
    const halfSpan = (PLAY_R - PLAY_L) / 2;
    for (const segStart of [PLAY_L, PLAY_L + halfSpan]) {
      for (const f of [0.25, 0.5, 0.75]) {
        const dx = segStart + halfSpan * f;
        for (const dy of [topRailY, botRailY]) {
          tCtx.beginPath();
          tCtx.moveTo(dx, dy - 3.2);
          tCtx.lineTo(dx + 3.2, dy);
          tCtx.lineTo(dx, dy + 3.2);
          tCtx.lineTo(dx - 3.2, dy);
          tCtx.closePath();
          tCtx.fill();
        }
      }
    }
    const leftRailX = PLAY_L / 2;
    const rightRailX = PLAY_R + (TABLE_W - PLAY_R) / 2;
    for (const f of [0.25, 0.5, 0.75]) {
      const dy = PLAY_T + (PLAY_B - PLAY_T) * f;
      for (const dx of [leftRailX, rightRailX]) {
        tCtx.beginPath();
        tCtx.moveTo(dx, dy - 3.2);
        tCtx.lineTo(dx + 3.2, dy);
        tCtx.lineTo(dx, dy + 3.2);
        tCtx.lineTo(dx - 3.2, dy);
        tCtx.closePath();
        tCtx.fill();
      }
    }

    // Brass-trimmed leather pocket throats & deep pocket wells
    for (const p of POCKETS) {
      const pocketRim = tCtx.createRadialGradient(p.x - 4, p.y - 4, 2, p.x, p.y, p.r + 6);
      pocketRim.addColorStop(0, '#fcd34d');
      pocketRim.addColorStop(0.55, '#b45309');
      pocketRim.addColorStop(1, '#451a03');
      tCtx.beginPath();
      tCtx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
      tCtx.fillStyle = pocketRim;
      tCtx.fill();

      tCtx.beginPath();
      tCtx.arc(p.x, p.y, p.r + 1.5, 0, Math.PI * 2);
      tCtx.fillStyle = '#1c100b';
      tCtx.fill();

      tCtx.beginPath();
      tCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      tCtx.fillStyle = '#070a10';
      tCtx.fill();
    }
    return tableCacheRef.current;
  }, []);

  // Main Fixed-Timestep 120Hz Physics + AI + Keyboard + Render Loop
  useEffect(() => {
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

      // Keyboard continuous aim & Space oscillating power charge
      stepKeyboardRef.current(realDt);

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

      // Pre-start authoritative countdown gate in online mode
      const serverNow = getServerNowMs();
      const waitLeft =
        curMode === 'online' && proto.startAtServerMs ? Math.max(0, proto.startAtServerMs - serverNow) : 0;
      setPreStartWaitMs(waitLeft > 0 ? waitLeft : 0);

      // AI execution animation (smooth aim & pull -> genuine shot)
      if (curMode === 'ai' && proto.phase === 'aim' && proto.currentPlayer === 1 && sim.aiPlan && !sim.replayActive) {
        const ai = sim.aiPlan;
        ai.elapsed += realDt;
        if (ai.elapsed <= ai.aimDuration) {
          const prog = ai.elapsed / ai.aimDuration;
          const ease = 1 - Math.pow(1 - prog, 3);
          sim.aimAngle = ai.startAngle + normalizeAngleDelta(ai.plan.angle, ai.startAngle) * ease;
        } else if (ai.elapsed <= ai.aimDuration + ai.pullDuration) {
          const p = ai.plan.power * ((ai.elapsed - ai.aimDuration) / ai.pullDuration);
          sim.power = p;
          setPowerPct(Math.round(p * 100));
        } else {
          sim.aimAngle = ai.plan.angle;
          sim.power = ai.plan.power;
          sim.spinX = ai.plan.spinX;
          sim.spinY = ai.plan.spinY;
          sim.aiPlan = null;
          const created = createLocalShot(proto, {
            angle: sim.aimAngle,
            power: sim.power,
            spinX: sim.spinX,
            spinY: sim.spinY,
            elevationDeg: 0,
            localPlayerSlot: 1,
            mode: 'ai',
          });
          if (created.ok) {
            launchLiveShot(created.shot);
          }
        }
      }

      const shouldTickClock =
        !sim.replayActive &&
        proto.phase === 'aim' &&
        proto.hasAuthoritativeMatch &&
        curMode !== 'practice' &&
        waitLeft <= 0 &&
        (curMode === 'online' ||
          (timerEnabledRef.current && !showMenuRef.current && !showSpinModalRef.current));

      if (shouldTickClock) {
        const remainingMs = proto.turnDeadlineMs - serverNow;
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
          const nextDeadline = serverNow + TURN_DURATION_MS;
          const bannerTitle = 'Hết thời gian!';
          const bannerSub = `Đặt bi tự do — Lượt ${curNames[opp]}`;

          proto.currentPlayer = opp;
          proto.canMoveCueBall = true;
          proto.turnDeadlineMs = nextDeadline;
          proto.stateVersion += 1;
          proto.confirmedStateVersion = proto.stateVersion;
          proto.provisionalSettledShotIndex = null;
          sim.aiPlan = null;
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
              edition: '2d',
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
          } else {
            scheduleAiTurnIfNeeded(sim);
          }
        }
      } else if (proto.phase === 'moving' || sim.replayActive) {
        const isRep = sim.replayActive;
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
          if (!isRep) proto.inFlightTicks += 1;
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

            const nextDeadline = getServerNowMs() + TURN_DURATION_MS;
            if (curMode === 'practice') {
              proto.currentPlayer = 0;
              proto.phase = 'aim';
              proto.turnDeadlineMs = nextDeadline;
              proto.canMoveCueBall = true;
              const cue = proto.balls.find((b) => b.id === 0);
              if (cue && cue.pocketed) {
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
            } else if (outcome.winner) {
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

            if (curMode === 'online' && shooterSlot === curLocalSlot && settledShotIndex >= 0) {
              syncRef.current?.broadcastSettled({
                matchId: proto.matchId,
                matchSeq: proto.matchSeq,
                edition: '2d',
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
            } else if (curMode === 'ai' && !proto.winner) {
              scheduleAiTurnIfNeeded(sim);
            }
          }
        }
      }

      // Render using cached offscreen table canvas (with optional portrait -90deg CCW rotation)
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const isPort = portraitRotatedRef.current;
        const dims = physicsToCanvasDims(isPort);
        const cachedTable = ensureTableCache(feltIdxRef.current);
        ctx.clearRect(0, 0, dims.width, dims.height);
        ctx.save();
        if (isPort) {
          ctx.translate(0, TABLE_W);
          ctx.rotate(-Math.PI / 2);
        }
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
          ctx.arc(b.x + 2.5, b.y + 3.2, BALL_R, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.42)';
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

          // Glossy spherical shading + rim shadow (8 Ball Pool style depth)
          const gloss = ctx.createRadialGradient(
            b.x - BALL_R * 0.34,
            b.y - BALL_R * 0.36,
            BALL_R * 0.08,
            b.x,
            b.y,
            BALL_R,
          );
          gloss.addColorStop(0, 'rgba(255,255,255,0.62)');
          gloss.addColorStop(0.32, 'rgba(255,255,255,0.1)');
          gloss.addColorStop(0.78, 'rgba(0,0,0,0.06)');
          gloss.addColorStop(1, 'rgba(0,0,0,0.34)');
          ctx.beginPath();
          ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
          ctx.fillStyle = gloss;
          ctx.fill();

          if (b.id !== 0) {
            const pole = quatRotateVec(b.q, 0, 0, 1);
            const vis = pole.z >= 0 ? pole : { x: -pole.x, y: -pole.y, z: -pole.z };
            if (vis.z > 0.18) {
              const nx = b.x + vis.x * BALL_R * 0.6;
              const ny = b.y + vis.y * BALL_R * 0.6;
              ctx.beginPath();
              ctx.arc(nx, ny, BALL_R * 0.44, 0, Math.PI * 2);
              ctx.fillStyle = '#f8fafc';
              ctx.fill();
              ctx.save();
              ctx.translate(nx, ny);
              if (isPort) ctx.rotate(Math.PI / 2);
              ctx.fillStyle = '#0f172a';
              ctx.font = '900 9px system-ui, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(b.id), 0, 0.5);
              ctx.restore();
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
              const tnx = tdx / tLen;
              const tny = tdy / tLen;
              const impactCos = Math.max(0.15, dx * tnx + dy * tny);
              const objLen = 65 + impactCos * 95;
              ctx.strokeStyle = 'rgba(5,8,17,0.85)';
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.moveTo(hitBall.x, hitBall.y);
              ctx.lineTo(hitBall.x + tnx * objLen, hitBall.y + tny * objLen);
              ctx.stroke();
              ctx.strokeStyle = '#4ade80';
              ctx.lineWidth = 2.6;
              ctx.beginPath();
              ctx.moveTo(hitBall.x, hitBall.y);
              ctx.lineTo(hitBall.x + tnx * objLen, hitBall.y + tny * objLen);
              ctx.stroke();

              // Predicted post-impact cue ball deflection / tangent line (adjusted by top/back spin)
              const tangDot = dx * -tny + dy * tnx;
              const tx = tangDot >= 0 ? -tny : tny;
              const ty = tangDot >= 0 ? tnx : -tnx;
              const cutSin = Math.sqrt(Math.max(0, 1 - impactCos * impactCos));
              const spinShift = sim.spinY * 0.55;
              const defDirX = tx * cutSin + dx * (0.18 + spinShift);
              const defDirY = ty * cutSin + dy * (0.18 + spinShift);
              const defNorm = Math.hypot(defDirX, defDirY) || 1;
              const defLen = 42 + cutSin * 56;
              ctx.save();
              ctx.setLineDash([5, 4]);
              ctx.strokeStyle = 'rgba(56,189,248,0.88)';
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.moveTo(gx, gy);
              ctx.lineTo(gx + (defDirX / defNorm) * defLen, gy + (defDirY / defNorm) * defLen);
              ctx.stroke();
              ctx.restore();
            } else {
              // Rail rebound deflection hint
              const hitV = Math.abs(gx - (PLAY_L + BALL_R)) < 1.5 || Math.abs(gx - (PLAY_R - BALL_R)) < 1.5;
              const hitH = Math.abs(gy - (PLAY_T + BALL_R)) < 1.5 || Math.abs(gy - (PLAY_B - BALL_R)) < 1.5;
              if (hitV || hitH) {
                const rx = hitV ? -dx : dx;
                const ry = hitH ? -dy : dy;
                ctx.save();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = 'rgba(253,224,71,0.72)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(gx, gy);
                ctx.lineTo(gx + rx * 72, gy + ry * 72);
                ctx.stroke();
                ctx.restore();
              }
            }
          }

          const pullback = 18 + sim.power * 90;
          const cueImg = cueStickImgRef.current;
          ctx.save();
          ctx.translate(cue.x, cue.y);
          ctx.rotate(sim.aimAngle + Math.PI);
          // Soft cue drop shadow on felt
          ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
          ctx.beginPath();
          ctx.roundRect(pullback + 2, 2.5, 336, 6, 3);
          ctx.fill();
          if (cueImg && cueImg.complete && cueImg.naturalWidth > 0) {
            // cue-stick.png has butt on left (x=0) and tip on right (x=w); flip horizontally so tip sits at pullback
            ctx.save();
            ctx.translate(pullback + 340, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(cueImg, 0, -6.5, 340, 13);
            ctx.restore();
          } else {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(pullback, -2.5, 5, 5);
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(pullback + 5, -3.2, 165, 6.4);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(pullback + 170, -4.5, 130, 9);
          }
          ctx.restore();
        }

        if (import.meta.env.DEV && rootRef.current) {
          const deg = Math.round(((((sim.aimAngle * 180) / Math.PI) % 360) + 360) % 360);
          rootRef.current.setAttribute('data-aim-deg', String(deg));
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
  }, [
    emitMatchCompleteOnce,
    ensureTableCache,
    getServerNowMs,
    getSim,
    launchLiveShot,
    scheduleAiTurnIfNeeded,
    showTempBanner,
    syncReactFromProto,
  ]);

  const getTablePt = (clientX: number, clientY: number) => {
    const sim = getSim();
    const canvas = canvasRef.current;
    if (!canvas) return { x: TABLE_W / 2, y: TABLE_H / 2 };
    const rect = canvas.getBoundingClientRect();
    return clientToPhysics2D(
      clientX,
      clientY,
      rect,
      sim.zoomCurrent,
      sim.camX,
      sim.camY,
      portraitRotatedRef.current,
    );
  };

  const startFineAim = (deltaRad: number) => {
    const sim = getSim();
    if (!canHumanInteractNow()) return;
    sim.aimAngle += deltaRad;
    stopFineAim();
    fineAimIntervalRef.current = window.setInterval(() => {
      if (!canHumanInteractNow()) {
        stopFineAim();
        return;
      }
      const s = getSim();
      s.aimAngle += deltaRad;
      if (modeRef.current === 'online') {
        syncRef.current?.broadcastAim({
          matchId: s.proto.matchId,
          stateVersion: s.proto.stateVersion,
          playerSlot: s.proto.currentPlayer,
          angle: s.aimAngle,
          power: s.power,
        });
      }
    }, 26);
  };

  const updateSpinFromEvent = (el: HTMLDivElement, clientX: number, clientY: number) => {
    const sim = getSim();
    const r = el.getBoundingClientRect();
    let nx = ((clientX - r.left) / r.width) * 2 - 1;
    let ny = -(((clientY - r.top) / r.height) * 2 - 1);
    const m = Math.hypot(nx, ny);
    if (m > 0.84) {
      nx = (nx / m) * 0.84;
      ny = (ny / m) * 0.84;
    }
    sim.spinX = nx;
    sim.spinY = ny;
    setSpin({ x: nx, y: ny });
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

  const localWantRematch = Boolean(lobbyState?.players[localPlayerSlot]?.wantRematch);
  const peerWantRematch = Boolean(lobbyState?.players[localPlayerSlot === 0 ? 1 : 0]?.wantRematch);

  const canvasDims = physicsToCanvasDims(portraitRotated);

  return (
    <div
      ref={rootRef}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      className={isFocusExpanded ? 'olw-billiards-overlay--focus' : undefined}
      data-testid="billiards-2d-game"
      data-edition="2d"
      data-mode={mode}
      data-portrait={portraitRotated ? '1' : '0'}
      data-aim-locked={aimLocked ? '1' : '0'}
      data-phase={phaseUi}
      data-rule={rule}
      data-current-player={String(currentPlayer)}
      data-power-pct={String(powerPct)}
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
        <div className="olw-hud-actions">
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            className="olw-billiards-btn-cozy olw-billiards-btn-cozy-sq"
            aria-label="Menu"
            data-testid="billiards-menu-btn"
          >
            <Menu size={18} />
          </button>
          <button
            type="button"
            data-testid="billiards-aim-lock"
            onClick={() => setAimLocked((v) => !v)}
            title={aimLocked ? 'Mở khóa góc ngắm' : 'Khóa góc ngắm trước khi kéo lực'}
            className={`olw-billiards-pill${aimLocked ? ' olw-billiards-pill--active' : ''}`}
          >
            {aimLocked ? <Lock size={13} /> : <Unlock size={13} />}
            <span className="olw-hide-sm">{aimLocked ? 'Đã khóa' : 'Khóa góc'}</span>
          </button>
          <button
            type="button"
            data-testid="billiards-precision-btn"
            onClick={() => {
              const next = !precisionMode;
              setPrecisionMode(next);
              const sim = getSim();
              const cue = sim.proto.balls.find((b) => b.id === 0);
              if (next && sim.zoomTarget < 1.5 && cue) {
                sim.zoomFocusX = cue.x + Math.cos(sim.aimAngle) * 140;
                sim.zoomFocusY = cue.y + Math.sin(sim.aimAngle) * 140;
                sim.zoomTarget = 1.7;
                setZoomLabel('1.7x');
              } else if (!next && sim.zoomTarget > 1.05) {
                sim.zoomTarget = 1.0;
                setZoomLabel('1.0x');
              }
            }}
            title="Ngắm tinh (Precision)"
            className={`olw-billiards-pill${precisionMode ? ' olw-billiards-pill--active' : ''}`}
          >
            <Crosshair size={13} /> {zoomLabel}
          </button>
          <button
            type="button"
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
          <button
            type="button"
            data-testid="billiards-fullscreen-btn"
            onClick={toggleFocusOrFullscreen}
            title={isFullscreen || isFocusExpanded ? 'Thu nhỏ' : 'Chế độ tập trung / Toàn màn hình'}
            className={`olw-billiards-pill olw-billiards-icon-btn${isFullscreen || isFocusExpanded ? ' olw-billiards-pill--active' : ''}`}
          >
            {isFullscreen || isFocusExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
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
                currentPlayer === 0 && (mode === 'online' || timerEnabled)
                  ? `conic-gradient(${timerColor} ${timerDeg}deg, #2e2438 ${timerDeg}deg)`
                  : currentPlayer === 0
                    ? '#34d399'
                    : '#473d54',
            }}
          >
            <div className="olw-avatar-inner">
              <BilliardsAvatarPortrait slot={0} kind="human" size={34} />
            </div>
          </div>
          <div className="olw-score-box" data-testid="billiards-score">
            <div className="olw-score-rule">
              {rule === '8ball' ? '8-BALL' : '9-BALL'} • 2D
            </div>
            <div className="olw-score-val">
              {scores[0]} - {scores[1]}
            </div>
          </div>
          <div
            className="olw-avatar-timer"
            data-testid={currentPlayer === 1 ? 'billiards-timer' : undefined}
            style={{
              background:
                currentPlayer === 1 && (mode === 'online' || timerEnabled)
                  ? `conic-gradient(${timerColor} ${timerDeg}deg, #2e2438 ${timerDeg}deg)`
                  : currentPlayer === 1
                    ? '#34d399'
                    : '#473d54',
            }}
          >
            <div className="olw-avatar-inner">
              <BilliardsAvatarPortrait
                slot={1}
                kind={mode === 'ai' ? 'ai' : mode === 'practice' ? 'practice' : 'human'}
                size={34}
              />
            </div>
          </div>
          <div className="olw-player-col olw-player-col--left">
            <div className="olw-player-name">{mode === 'practice' ? 'Luyện tập' : playerNames[1]}</div>
            <div className="olw-rack-row">{renderSlots(1)}</div>
          </div>
        </div>

        <div className="olw-hud-right">
          <button
            type="button"
            onClick={() => setShowSpinModal(true)}
            title="Chỉnh Xoáy (Spin)"
            className="olw-spin-btn"
            data-testid="billiards-spin-btn"
          >
            <span
              className="olw-spin-dot"
              style={{ left: `${50 + spin.x * 36}%`, top: `${50 - spin.y * 36}%` }}
            />
          </button>
          <button
            type="button"
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

      <main className={`olw-billiards-main${portraitRotated ? ' olw-billiards-main--portrait' : ''}`}>
        <div className="olw-power-col">
          <button
            type="button"
            title="Xoay trái mịn (←)"
            data-testid="billiards-aim-left"
            className="olw-fine-aim-btn"
            onPointerDown={() => startFineAim(-0.006)}
            onPointerUp={stopFineAim}
            onPointerLeave={stopFineAim}
            onPointerCancel={stopFineAim}
          >
            ⟲
          </button>
          <div
            ref={powerSlotRef}
            className={`olw-power-slot${powerCancelled ? ' olw-power-slot--cancelled' : ''}`}
            data-testid="billiards-power-slot"
            onPointerDown={(e) => {
              const sim = getSim();
              if (!canHumanInteractNow()) return;
              billiardsSound.unlock();
              try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
              } catch {
                // Ignore synthetic events without active browser pointer
              }
              sim.powerDragging = true;
              sim.powerStartX = e.clientX;
              sim.powerStartY = e.clientY;
              sim.powerCancelled = false;
              setPowerCancelled(false);
            }}
            onPointerMove={(e) => {
              const sim = getSim();
              if (!sim.powerDragging || !powerSlotRef.current) return;
              const isTouch = e.pointerType === 'touch';
              if (isTouch) {
                const res = evaluatePowerPull({
                  startX: sim.powerStartX,
                  startY: sim.powerStartY,
                  curX: e.clientX,
                  curY: e.clientY,
                  trackHeight: powerSlotRef.current.clientHeight,
                });
                sim.power = res.power;
                sim.powerCancelled = res.cancelled;
                setPowerCancelled(res.cancelled);
                setPowerPct(res.cancelled ? 0 : Math.round(res.power * 100));
              } else {
                const h = powerSlotRef.current.clientHeight * 0.72;
                sim.power = Math.max(0, Math.min(1, (e.clientY - sim.powerStartY) / h));
                sim.powerCancelled = false;
                setPowerCancelled(false);
                setPowerPct(Math.round(sim.power * 100));
              }
              if (mode === 'online' && !sim.powerCancelled) {
                sync?.broadcastAim({
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
              if (sim.powerCancelled) {
                sim.power = 0;
                sim.powerCancelled = false;
                setPowerCancelled(false);
                setPowerPct(0);
                return;
              }
              fireLocalShot();
            }}
            onPointerCancel={() => {
              const sim = getSim();
              if (!sim.powerDragging) return;
              sim.powerDragging = false;
              sim.power = 0;
              sim.powerCancelled = false;
              setPowerCancelled(false);
              setPowerPct(0);
            }}
            onLostPointerCapture={() => {
              const sim = getSim();
              if (!sim.powerDragging) return;
              sim.powerDragging = false;
              sim.power = 0;
              sim.powerCancelled = false;
              setPowerCancelled(false);
              setPowerPct(0);
            }}
          >
            <div className="olw-power-fill" style={{ height: `${powerPct}%` }} />
            <div className="olw-power-cue" style={{ top: `${cueTopPx}px` }} />
          </div>
          {powerCancelled ? (
            <span className="olw-power-cancel-tag" data-testid="billiards-power-cancel-tag">
              Hủy
            </span>
          ) : (
            <span className="olw-power-pct" data-testid="billiards-power-pct">
              {powerPct}%
            </span>
          )}
          <button
            type="button"
            title="Xoay phải mịn (→)"
            data-testid="billiards-aim-right"
            className="olw-fine-aim-btn"
            onPointerDown={() => startFineAim(0.006)}
            onPointerUp={stopFineAim}
            onPointerLeave={stopFineAim}
            onPointerCancel={stopFineAim}
          >
            ⟳
          </button>
        </div>

        <div className="olw-stage-wrap">
          <canvas
            ref={canvasRef}
            width={canvasDims.width}
            height={canvasDims.height}
            className={`olw-canvas${portraitRotated ? ' olw-canvas--portrait' : ''}`}
            data-testid="billiards-canvas"
            onWheel={(e) => {
              e.preventDefault();
              const sim = getSim();
              const pt = getTablePt(e.clientX, e.clientY);
              sim.zoomFocusX = pt.x;
              sim.zoomFocusY = pt.y;
              sim.zoomTarget = Math.max(
                1.0,
                Math.min(2.5, sim.zoomTarget + (e.deltaY < 0 ? 0.25 : -0.25)),
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
              activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (activePointersRef.current.size >= 2) {
                multiTouchLockRef.current = true;
                markTapMultiTouch(tapGestureRef.current);
                const pts = [...activePointersRef.current.values()];
                pinchPrevDistRef.current = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
                sim.tablePointerDown = false;
                sim.draggingCueBall = false;
                sim.touchGestureMoved = false;
                sim.lastTouchPhysicsAngle = null;
                return;
              }
              if (multiTouchLockRef.current || !canHumanInteractNow()) return;
              const isTouch = e.pointerType === 'touch';
              sim.activePointerType = e.pointerType || 'mouse';
              const rawY = isTouch && sim.proto.canMoveCueBall ? e.clientY - TOUCH_CUE_BALL_LIFT_PX : e.clientY;
              const pt = getTablePt(e.clientX, rawY);
              const directPt = getTablePt(e.clientX, e.clientY);
              const cue = sim.proto.balls.find((b) => b.id === 0);
              if (!cue) return;
              try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
              } catch {
                // Ignore synthetic events
              }
              const hitRadius = isTouch ? BALL_R * 4.2 : BALL_R * 3.4;
              const isCueDrag =
                sim.proto.canMoveCueBall &&
                (Math.hypot(directPt.x - cue.x, directPt.y - cue.y) < hitRadius ||
                  Math.hypot(pt.x - cue.x, pt.y - cue.y) < hitRadius);
              tapGestureRef.current = beginTapGesture({
                pointerId: e.pointerId,
                pointerType: sim.activePointerType,
                clientX: e.clientX,
                clientY: e.clientY,
                timeMs: performance.now(),
                isBallInHandDrag: isCueDrag,
              });
              if (isCueDrag) {
                sim.draggingCueBall = true;
                return;
              }
              sim.tablePointerDown = true;
              sim.touchGestureMoved = false;
              sim.touchDownTimeMs = performance.now();
              sim.touchStartX = e.clientX;
              sim.touchStartY = e.clientY;
              sim.touchLastX = e.clientX;
              sim.touchLastY = e.clientY;
              const rect = canvasRef.current?.getBoundingClientRect();
              sim.lastTouchPhysicsAngle = rect
                ? computeDirectAimAngle2D({
                    clientX: e.clientX,
                    clientY: e.clientY,
                    rect,
                    cueX: cue.x,
                    cueY: cue.y,
                    zoomCurrent: sim.zoomCurrent,
                    camX: sim.camX,
                    camY: sim.camY,
                    portraitRotated: portraitRotatedRef.current,
                  })
                : null;

              // Desktop mouse aims directly on down when unlocked; locked cue preserves angle until dragged
              if (!isTouch && !aimLockedRef.current) {
                sim.aimAngle = Math.atan2(directPt.y - cue.y, directPt.x - cue.x);
                if (mode === 'online') {
                  sync?.broadcastAim({
                    matchId: sim.proto.matchId,
                    stateVersion: sim.proto.stateVersion,
                    playerSlot: sim.proto.currentPlayer,
                    angle: sim.aimAngle,
                    power: sim.power,
                  });
                }
              }
            }}
            onPointerMove={(e) => {
              const sim = getSim();
              if (activePointersRef.current.has(e.pointerId)) {
                activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              }
              updateTapGesture(tapGestureRef.current, e.pointerId, e.clientX, e.clientY);
              if (activePointersRef.current.size >= 2) {
                multiTouchLockRef.current = true;
                markTapMultiTouch(tapGestureRef.current);
                const pts = [...activePointersRef.current.values()];
                const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
                const prev = pinchPrevDistRef.current;
                pinchPrevDistRef.current = dist;
                if (prev && prev > 10) {
                  const midX = (pts[0]!.x + pts[1]!.x) * 0.5;
                  const midY = (pts[0]!.y + pts[1]!.y) * 0.5;
                  const midPt = getTablePt(midX, midY);
                  const { pinchZoomMul } = normalizeSensitivityMultipliers(touchPrefsRef.current);
                  sim.zoomFocusX = midPt.x;
                  sim.zoomFocusY = midPt.y;
                  sim.zoomTarget = applyPinchZoomSensitivity(
                    sim.zoomTarget,
                    dist / prev,
                    pinchZoomMul,
                    1.0,
                    2.8,
                  );
                  setZoomLabel(`${sim.zoomTarget.toFixed(1)}x`);
                }
                return;
              }
              if (multiTouchLockRef.current) return;

              const isTouch = e.pointerType === 'touch' || sim.activePointerType === 'touch';
              const pt = getTablePt(
                e.clientX,
                isTouch && sim.draggingCueBall ? e.clientY - TOUCH_CUE_BALL_LIFT_PX : e.clientY,
              );
              if (!isTouch && !sim.draggingCueBall && (sim.zoomTarget > 1.02 || sim.zoomHoverHold)) {
                const canvasEl = canvasRef.current;
                if (canvasEl) {
                  const raw = getTablePt(e.clientX, e.clientY);
                  sim.zoomFocusX = raw.x;
                  sim.zoomFocusY = raw.y;
                }
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
                    sync?.broadcastPlaceCue({
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
              if (sim.tablePointerDown && canHumanInteractNow()) {
                const totalMoved = Math.hypot(
                  e.clientX - sim.touchStartX,
                  e.clientY - sim.touchStartY,
                );
                if (isTouch) {
                  if (!sim.touchGestureMoved && totalMoved < TOUCH_TAP_SLOP_PX) {
                    return;
                  }
                  sim.touchGestureMoved = true;
                  sim.touchLastX = e.clientX;
                  sim.touchLastY = e.clientY;
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (rect) {
                    const directAngle = computeDirectAimAngle2D({
                      clientX: e.clientX,
                      clientY: e.clientY,
                      rect,
                      cueX: cue.x,
                      cueY: cue.y,
                      zoomCurrent: sim.zoomCurrent,
                      camX: sim.camX,
                      camY: sim.camY,
                      portraitRotated: portraitRotatedRef.current,
                    });
                    if (directAngle !== null) {
                      const { aimMul, lockedFineMul } = normalizeSensitivityMultipliers(
                        touchPrefsRef.current,
                      );
                      if (aimLockedRef.current) {
                        // Locked cue allows micro fine-adjustments at user's locked-cue sensitivity
                        if (sim.lastTouchPhysicsAngle !== null) {
                          sim.aimAngle += computeRelativeFineAimDelta2D({
                            prevPhysicsAngle: sim.lastTouchPhysicsAngle,
                            curPhysicsAngle: directAngle,
                            scale: 0.28 * lockedFineMul,
                          });
                        }
                      } else if (precisionModeRef.current) {
                        if (sim.lastTouchPhysicsAngle !== null) {
                          sim.aimAngle += computeRelativeFineAimDelta2D({
                            prevPhysicsAngle: sim.lastTouchPhysicsAngle,
                            curPhysicsAngle: directAngle,
                            scale: 0.28 * aimMul,
                          });
                        }
                      } else if (sim.lastTouchPhysicsAngle !== null) {
                        sim.aimAngle += computeRelativeFineAimDelta2D({
                          prevPhysicsAngle: sim.lastTouchPhysicsAngle,
                          curPhysicsAngle: directAngle,
                          scale: aimMul,
                        });
                      } else {
                        sim.aimAngle = directAngle;
                      }
                      sim.lastTouchPhysicsAngle = directAngle;
                    }
                  }
                } else if (aimLockedRef.current) {
                  if (totalMoved >= TOUCH_TAP_SLOP_PX) {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (rect) {
                      const directAngle = computeDirectAimAngle2D({
                        clientX: e.clientX,
                        clientY: e.clientY,
                        rect,
                        cueX: cue.x,
                        cueY: cue.y,
                        zoomCurrent: sim.zoomCurrent,
                        camX: sim.camX,
                        camY: sim.camY,
                        portraitRotated: portraitRotatedRef.current,
                      });
                      if (directAngle !== null) {
                        const { lockedFineMul } = normalizeSensitivityMultipliers(
                          touchPrefsRef.current,
                        );
                        if (sim.lastTouchPhysicsAngle !== null) {
                          sim.aimAngle += computeRelativeFineAimDelta2D({
                            prevPhysicsAngle: sim.lastTouchPhysicsAngle,
                            curPhysicsAngle: directAngle,
                            scale: 0.28 * lockedFineMul,
                          });
                        }
                        sim.lastTouchPhysicsAngle = directAngle;
                      }
                    }
                  }
                } else {
                  sim.aimAngle = Math.atan2(pt.y - cue.y, pt.x - cue.x);
                }
                if (mode === 'online') {
                  sync?.broadcastAim({
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
              const isTouch = e.pointerType === 'touch' || sim.activePointerType === 'touch';
              activePointersRef.current.delete(e.pointerId);
              if (activePointersRef.current.size < 2) {
                pinchPrevDistRef.current = null;
              }
              if (e.button === 2) {
                sim.zoomHoverHold = false;
                setZoomLabel(`${sim.zoomTarget.toFixed(1)}x`);
              }
              if (multiTouchLockRef.current) {
                cancelTapGesture(tapGestureRef.current);
                sim.draggingCueBall = false;
                sim.tablePointerDown = false;
                sim.touchGestureMoved = false;
                sim.lastTouchPhysicsAngle = null;
                if (activePointersRef.current.size === 0) {
                  multiTouchLockRef.current = false;
                  tapGestureRef.current = null;
                }
                return;
              }
              const validShortTap = completeTapGesture(tapGestureRef.current, {
                pointerId: e.pointerId,
                clientX: e.clientX,
                clientY: e.clientY,
                timeMs: performance.now(),
              });
              tapGestureRef.current = null;
              if (
                isTouch &&
                sim.tablePointerDown &&
                validShortTap &&
                !aimLockedRef.current &&
                canHumanInteractNow()
              ) {
                const rect = canvasRef.current?.getBoundingClientRect();
                const cue = sim.proto.balls.find((b) => b.id === 0);
                if (rect && cue) {
                  const tapAngle = computeDirectAimAngle2D({
                    clientX: e.clientX,
                    clientY: e.clientY,
                    rect,
                    cueX: cue.x,
                    cueY: cue.y,
                    zoomCurrent: sim.zoomCurrent,
                    camX: sim.camX,
                    camY: sim.camY,
                    portraitRotated: portraitRotatedRef.current,
                  });
                  if (tapAngle !== null) {
                    sim.aimAngle = tapAngle;
                    if (mode === 'online') {
                      sync?.broadcastAim({
                        matchId: sim.proto.matchId,
                        stateVersion: sim.proto.stateVersion,
                        playerSlot: sim.proto.currentPlayer,
                        angle: sim.aimAngle,
                        power: sim.power,
                      });
                    }
                  }
                }
              }
              if (sim.draggingCueBall && sim.proto.canMoveCueBall && mode === 'online') {
                const cue = sim.proto.balls.find((b) => b.id === 0);
                if (cue) {
                  sync?.broadcastPlaceCue(
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
              sim.touchGestureMoved = false;
              sim.lastTouchPhysicsAngle = null;
            }}
            onPointerCancel={(e) => {
              const sim = getSim();
              cancelTapGesture(tapGestureRef.current);
              tapGestureRef.current = null;
              activePointersRef.current.delete(e.pointerId);
              if (activePointersRef.current.size < 2) {
                pinchPrevDistRef.current = null;
              }
              if (activePointersRef.current.size === 0) {
                multiTouchLockRef.current = false;
              }
              sim.zoomHoverHold = false;
              sim.draggingCueBall = false;
              sim.tablePointerDown = false;
              sim.touchGestureMoved = false;
              sim.lastTouchPhysicsAngle = null;
            }}
            onLostPointerCapture={(e) => {
              const sim = getSim();
              cancelTapGesture(tapGestureRef.current);
              tapGestureRef.current = null;
              activePointersRef.current.delete(e.pointerId);
              if (activePointersRef.current.size < 2) {
                pinchPrevDistRef.current = null;
              }
              if (activePointersRef.current.size === 0) {
                multiTouchLockRef.current = false;
              }
              sim.draggingCueBall = false;
              sim.tablePointerDown = false;
              sim.touchGestureMoved = false;
              sim.lastTouchPhysicsAngle = null;
            }}
          />

          {preStartWaitMs > 0 && (
            <div className="olw-banner-wrap">
              <div className="olw-banner-title">
                Bắt đầu sau {Math.ceil(preStartWaitMs / 1000)}...
              </div>
              <div className="olw-banner-sub">Đang đồng bộ đồng hồ với máy chủ</div>
            </div>
          )}

          {preStartWaitMs <= 0 && banner && (
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
                {mode === 'online' && peerWantRematch && !localWantRematch && (
                  <div style={{ fontSize: 11.5, color: '#86efac', fontWeight: 700 }}>
                    {playerNames[localPlayerSlot === 0 ? 1 : 0]} đang muốn tái đấu!
                  </div>
                )}
                <div className="olw-billiards-row" style={{ justifyContent: 'center', gap: 8 }}>
                  <button
                    type="button"
                    data-testid="billiards-leave-table"
                    onClick={onExitToMenu}
                    className="olw-billiards-pill"
                  >
                    Rời bàn
                  </button>
                  <button
                    type="button"
                    data-testid="billiards-next-match"
                    disabled={mode === 'online' && localWantRematch}
                    onClick={() => {
                      if (mode === 'online') {
                        sync?.broadcastLobbyRematch({
                          playerSlot: localPlayerSlot,
                          matchId: getSim().proto.matchId,
                          wantRematch: true,
                        });
                      } else {
                        const nextStarter: PlayerSlot =
                          mode === 'practice' ? 0 : (getSim().proto.initiatorSlot === 0 ? 1 : 0);
                        startNewMatch(rule, nextStarter);
                      }
                    }}
                    className="olw-billiards-btn-cozy"
                  >
                    {mode === 'online'
                      ? lobbyState?.status === 'countdown'
                        ? 'Tái đấu bắt đầu ngay...'
                        : localWantRematch
                          ? 'Đang chờ người thương...'
                          : 'Đấu ván tiếp'
                      : 'Đấu ván tiếp'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`olw-return-track${portraitRotated ? ' olw-return-track--horizontal' : ''}`}>
          {returnedIds.map((id) => (
            <span key={id} style={{ background: BALL_COLORS[id] }} className="olw-return-ball">
              {id}
            </span>
          ))}
        </div>
      </main>

      <div className="olw-kbd-hint olw-hide-sm">
        Phím desktop: Giữ <strong>Space</strong> để căn lực &amp; thả để bắn • <strong>←/→</strong> xoay gậy (giữ <strong>Shift</strong> xoay chậm) • Giữ <strong>Z</strong> soi cận cảnh
      </div>

      {showMenu && (
        <div className="olw-modal-backdrop" onClick={() => setShowMenu(false)}>
          <div className="olw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="olw-modal-row">
              <span style={{ fontSize: 14, fontWeight: 900 }}>Quán Bi-a 2D — Cài đặt</span>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="olw-billiards-pill olw-billiards-icon-btn"
              >
                <X size={16} />
              </button>
            </div>
            {mode !== 'online' && (
              <div className="olw-modal-row">
                <span>Thể thức</span>
                <div className="olw-billiards-row">
                  <button
                    type="button"
                    data-testid="billiards-rule-8ball"
                    onClick={() => {
                      setShowMenu(false);
                      const nextStarter: PlayerSlot =
                        mode === 'practice' ? 0 : (getSim().proto.initiatorSlot === 0 ? 1 : 0);
                      startNewMatch('8ball', nextStarter);
                    }}
                    className={`olw-billiards-pill${rule === '8ball' ? ' olw-billiards-pill--active' : ''}`}
                  >
                    8-Bi
                  </button>
                  <button
                    type="button"
                    data-testid="billiards-rule-9ball"
                    onClick={() => {
                      setShowMenu(false);
                      const nextStarter: PlayerSlot =
                        mode === 'practice' ? 0 : (getSim().proto.initiatorSlot === 0 ? 1 : 0);
                      startNewMatch('9ball', nextStarter);
                    }}
                    className={`olw-billiards-pill${rule === '9ball' ? ' olw-billiards-pill--active' : ''}`}
                  >
                    9-Bi
                  </button>
                </div>
              </div>
            )}
            <div className="olw-modal-row">
              <span><Smartphone size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />Hướng bàn</span>
              <button
                type="button"
                data-testid="billiards-orientation-toggle"
                onClick={() => {
                  const order: BilliardsOrientation[] = ['auto', 'portrait', 'landscape'];
                  setOrientationPref(order[(order.indexOf(orientationPref) + 1) % order.length] ?? 'auto');
                }}
                className="olw-billiards-pill"
              >
                {orientationPref === 'auto'
                  ? `Tự động (${portraitRotated ? 'Dọc' : 'Ngang'})`
                  : orientationPref === 'portrait'
                    ? 'Dọc (8-Pool)'
                    : 'Ngang'}
              </button>
            </div>
            <div className="olw-modal-row">
              <span>Màu nỉ bàn</span>
              <button
                type="button"
                onClick={() => setFeltIdx((i) => (i + 1) % FELT_THEMES.length)}
                className="olw-billiards-pill"
              >
                {(FELT_THEMES[feltIdx] ?? FELT_THEMES[0]).name}
              </button>
            </div>
            {mode !== 'online' && (
              <div className="olw-modal-row">
                <span>Đồng hồ 30s</span>
                <button
                  type="button"
                  onClick={() => setTimerEnabled((v) => !v)}
                  className="olw-billiards-pill"
                >
                  {timerEnabled ? 'Bật' : 'Tắt'}
                </button>
              </div>
            )}
            <div className="olw-modal-row">
              <span>Âm thanh</span>
              <button
                type="button"
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
            <BilliardsTouchCameraSettings
              prefs={touchPrefs}
              onChange={setTouchPrefs}
              showCameraRotation={false}
              showShotCameraMode={false}
            />
            {mode !== 'online' && (
              <button
                type="button"
                data-testid="billiards-new-match"
                onClick={() => {
                  setShowMenu(false);
                  const nextStarter: PlayerSlot =
                    mode === 'practice' ? 0 : (getSim().proto.initiatorSlot === 0 ? 1 : 0);
                  startNewMatch(rule, nextStarter);
                }}
                className="olw-billiards-btn-cozy"
              >
                Chơi ván mới
              </button>
            )}
            <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
              Mẹo iPhone / Android: Bấm nút phóng to ở góc trên để vào chế độ tập trung. Nếu dùng iPhone, chọn <strong>Chia sẻ → Thêm vào Màn hình chính</strong> để ẩn thanh địa chỉ (lưu ý link Quick Tunnel thay đổi mỗi phiên host).
            </div>
            <button
              type="button"
              data-testid="billiards-exit-to-menu"
              onClick={() => {
                setShowMenu(false);
                onExitToMenu();
              }}
              className="olw-billiards-pill"
            >
              <ArrowLeft size={14} /> Rời bàn / Đổi chế độ
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
                e.currentTarget.setPointerCapture(e.pointerId);
                setSpinDragging(true);
                updateSpinFromEvent(e.currentTarget, e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!spinDragging) return;
                updateSpinFromEvent(e.currentTarget, e.clientX, e.clientY);
              }}
              onPointerUp={() => setSpinDragging(false)}
              onPointerCancel={() => setSpinDragging(false)}
            >
              <span
                className="olw-spin-dot-big"
                style={{ left: `${50 + spin.x * 36}%`, top: `${50 - spin.y * 36}%` }}
              />
            </div>
            <div className="olw-billiards-row" style={{ width: '100%' }}>
              <button
                type="button"
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
                type="button"
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

export default Billiards2DGame;
