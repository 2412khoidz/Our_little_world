import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, Menu, RotateCcw, Search, Volume2, VolumeX, X } from 'lucide-react';
import { chooseBotBallInHand3D, computeBotShot3D, type BotShotPlan } from '../../../shared/billiards/botAi';
import {
  BALL_R_3D,
  FIXED_STEP_DT_3D,
  HALF_H_3D,
  HALF_W_3D,
  POCKETS_3D,
  RAIL_SEGMENTS_3D,
  applyShotImpulse3D,
  balls3DToWire,
  computeAimRay3D,
  evaluateShotRules3D,
  findOpenCueSpot3D,
  isLegalTargetBall3D,
  isPositionValidForCue3D,
  stepBilliards3DFixedTick,
  wireToBalls3D,
  type Ball3DState,
} from '../../../shared/billiards/physics3dEngine';
import { BALL_COLORS, cloneBalls } from '../../../shared/billiards/physicsEngine';
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
  Billiards3DQuality,
  BilliardsMatchPhase,
  BilliardsRule,
  PlayerSlot,
  ShotParams,
} from '../../../shared/billiards/types';
import type { BilliardsGameProps } from './billiardsGameProps';
import { billiardsSound } from './sound';
import { useBilliardsKeyboard } from './useBilliardsKeyboard';
import './billiards3d.css';

const FELT_THEMES_3D = [
  { name: 'Xanh 8-Pool', felt: 0x2688b5, rail: 0x1b6d96 },
  { name: 'Xanh Cổ Điển', felt: 0x136f3a, rail: 0x0f5a2f },
  { name: 'Đỏ Hoàng Gia', felt: 0x8b1c1c, rail: 0x6d1414 },
] as const;

const CAM_MODES_3D = [
  { id: 'follow' as const, label: '🎥 3D Gậy' },
  { id: 'top' as const, label: '🎥 Trên cao' },
  { id: 'orbit' as const, label: '🎥 Góc rộng' },
];

type ResolvedQuality = 'low' | 'medium' | 'high';

function resolve3DQuality(choice: Billiards3DQuality): ResolvedQuality {
  if (choice !== 'auto') return choice;
  if (typeof navigator === 'undefined') return 'medium';
  const ua = navigator.userAgent || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const cores = navigator.hardwareConcurrency || 4;
  if (isMobile) return cores <= 2 ? 'low' : 'medium';
  return cores <= 2 ? 'medium' : 'high';
}

function getQualityPreset(q: ResolvedQuality) {
  if (q === 'low') {
    return { maxDpr: 1.25, antialias: false, sphereSegW: 16, sphereSegH: 12, ballTexW: 128, ballTexH: 64, anisotropy: 1 };
  }
  if (q === 'medium') {
    return { maxDpr: 1.5, antialias: true, sphereSegW: 22, sphereSegH: 16, ballTexW: 256, ballTexH: 128, anisotropy: 2 };
  }
  return { maxDpr: 2, antialias: true, sphereSegW: 26, sphereSegH: 18, ballTexW: 256, ballTexH: 128, anisotropy: 4 };
}

function makeMatchId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `m3d_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function normalizeAngleDelta(target: number, start: number): number {
  let diff = target - start;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

interface StrikeAnim3D {
  shot: ShotParams;
  startPower: number;
  t: number;
  duration: number;
}

interface AiPlan3D {
  plan: BotShotPlan;
  startAngle: number;
  elapsed: number;
  aimDuration: number;
  pullDuration: number;
}

interface Sim3DRuntime {
  proto: BilliardsProtocolState;
  balls3D: Ball3DState[];
  replayActive: boolean;
  preReplayWireBalls: ReturnType<typeof balls3DToWire> | null;
  strikeAnim: StrikeAnim3D | null;
  aiPlan: AiPlan3D | null;
  aimAngle: number;
  power: number;
  spinX: number;
  spinY: number;
  elevationDeg: number;
  lastTickSec: number;
  accumulator: number;
  draggingCueBall: boolean;
  powerDragging: boolean;
  powerStartY: number;
  pointerDown: boolean;
  lastPointerX: number;
  lastPointerY: number;
  orbitYaw: number;
  orbitPitch: number;
  zoomLevel: number;
  hoverZoomActive: boolean;
  hoverWorldPt: { x: number; z: number } | null;
}

function createSim3DRuntime(props: BilliardsGameProps): Sim3DRuntime {
  const now = Date.now();
  const cfg = props.confirmedOnlineConfig;
  let proto: BilliardsProtocolState;

  if (cfg) {
    proto = createInitialProtocolState({
      edition: '3d',
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
    proto = createInitialProtocolState({
      edition: '3d',
      rule: props.initialRule,
      seed: Math.floor(Math.random() * 1e9),
      matchId: makeMatchId(),
      initialScores: [props.initialScores[0], props.initialScores[1]],
      nowMs: now,
      hasAuthoritativeMatch: props.mode !== 'online',
      matchSeq: props.mode !== 'online' ? 1 : 0,
      initiatorSlot: 0,
    });
  }

  if (props.recoveredSnapshot && props.recoveredSnapshot.edition === '3d') {
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
    balls3D: wireToBalls3D(proto.balls),
    replayActive: false,
    preReplayWireBalls: null,
    strikeAnim: null,
    aiPlan: null,
    aimAngle: 0,
    power: 0,
    spinX: 0,
    spinY: 0,
    elevationDeg: 0,
    lastTickSec: 30,
    accumulator: 0,
    draggingCueBall: false,
    powerDragging: false,
    powerStartY: 0,
    pointerDown: false,
    lastPointerX: 0,
    lastPointerY: 0,
    orbitYaw: 0.55,
    orbitPitch: 0.72,
    zoomLevel: 1.0,
    hoverZoomActive: false,
    hoverWorldPt: null,
  };
}

export const Billiards3DGame: React.FC<BilliardsGameProps> = (props) => {
  const {
    mode,
    botDifficulty,
    quality3d = 'auto',
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

  const stageHostRef = useRef<HTMLDivElement | null>(null);
  const powerSlotRef = useRef<HTMLDivElement | null>(null);
  const bannerTimerRef = useRef<number | null>(null);
  const fineAimIntervalRef = useRef<number | null>(null);
  const reportedMatchIdsRef = useRef<Set<string>>(new Set());

  const [initialBoot] = useState<Sim3DRuntime>(() => createSim3DRuntime(props));
  const simRef = useRef<Sim3DRuntime | null>(null);
  const getSim = useCallback((): Sim3DRuntime => {
    if (simRef.current === null) {
      simRef.current = initialBoot;
    }
    return simRef.current;
  }, [initialBoot]);

  const [rule, setRule] = useState<BilliardsRule>(initialBoot.proto.rule);
  const [phaseUi, setPhaseUi] = useState<BilliardsMatchPhase>(initialBoot.proto.phase);
  const [feltIdx, setFeltIdx] = useState(0);
  const [camIdx, setCamIdx] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [muted, setMuted] = useState(billiardsSound.muted);
  const [qualityChoice, setQualityChoice] = useState<Billiards3DQuality>(quality3d);
  const [showMenu, setShowMenu] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
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
  const [elevationDeg, setElevationDeg] = useState(0);
  const [spin, setSpin] = useState({ x: 0, y: 0 });
  const [spinDragging, setSpinDragging] = useState(false);
  const [banner, setBanner] = useState<{ title: string; sub?: string } | null>(null);
  const [winner, setWinner] = useState<{ slot: PlayerSlot; reason: string } | null>(
    initialBoot.proto.winner ? { ...initialBoot.proto.winner } : null,
  );
  const [canMoveCue, setCanMoveCue] = useState(initialBoot.proto.canMoveCueBall);
  const [canReplay, setCanReplay] = useState(
    initialBoot.proto.phase === 'aim' && initialBoot.proto.lastShotSnap !== null,
  );
  const [replayBadgeVisible, setReplayBadgeVisible] = useState(false);
  const [preStartWaitMs, setPreStartWaitMs] = useState(0);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [devDiag, setDevDiag] = useState(() => ({
    matchId: initialBoot.proto.matchId,
    matchSeq: initialBoot.proto.matchSeq,
    stateVersion: initialBoot.proto.stateVersion,
    shotSeq: initialBoot.proto.nextShotSeq,
    shotCount: initialBoot.proto.shots.length,
  }));

  const resolvedQuality = resolve3DQuality(qualityChoice);

  const modeRef = useRef(mode);
  const botDifficultyRef = useRef(botDifficulty);
  const feltIdxRef = useRef(feltIdx);
  const camIdxRef = useRef(camIdx);
  const showGuideRef = useRef(showGuide);
  const timerEnabledRef = useRef(timerEnabled);
  const showMenuRef = useRef(showMenu);
  const showSpinModalRef = useRef(showSpinModal);
  const playerNamesRef = useRef(playerNames);
  const localPlayerSlotRef = useRef(localPlayerSlot);
  const syncRef = useRef(sync);
  const onMatchCompleteRef = useRef(onMatchComplete);
  const feltUpdaterRef = useRef<((idx: number) => void) | null>(null);
  const tablePointResolverRef = useRef<((clientX: number, clientY: number) => { x: number; z: number } | null) | null>(null);

  useLayoutEffect(() => {
    modeRef.current = mode;
    botDifficultyRef.current = botDifficulty;
    feltIdxRef.current = feltIdx;
    camIdxRef.current = camIdx;
    showGuideRef.current = showGuide;
    timerEnabledRef.current = timerEnabled;
    showMenuRef.current = showMenu;
    showSpinModalRef.current = showSpinModal;
    playerNamesRef.current = playerNames;
    localPlayerSlotRef.current = localPlayerSlot;
    syncRef.current = sync;
    onMatchCompleteRef.current = onMatchComplete;
  });

  useEffect(() => {
    feltUpdaterRef.current?.(feltIdx);
  }, [feltIdx]);

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
      edition: '3d',
      mode: modeRef.current,
      rule: proto.rule,
      winnerSlot: proto.winner.slot,
      reason: proto.winner.reason,
      rackSeed: proto.rackSeed,
      shots: proto.shots.map((s) => ({ ...s })),
      durationSeconds: Math.max(1, Math.round((Date.now() - proto.startedAtMs) / 1000)),
    });
  }, []);

  const cancelLocalReplay = useCallback((sim: Sim3DRuntime) => {
    if (!sim.replayActive) return;
    sim.replayActive = false;
    setReplayBadgeVisible(false);
    if (sim.preReplayWireBalls) {
      sim.proto.balls = sim.preReplayWireBalls;
      sim.balls3D = wireToBalls3D(sim.preReplayWireBalls);
      sim.preReplayWireBalls = null;
    }
    sim.accumulator = 0;
  }, []);

  const scheduleAiTurnIfNeeded = useCallback((sim: Sim3DRuntime) => {
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

    const cue = sim.balls3D.find((b) => b.id === 0);
    if (!cue || cue.pocketed) return;

    if (sim.proto.canMoveCueBall) {
      const spot = chooseBotBallInHand3D(
        sim.balls3D,
        sim.proto.rule,
        sim.proto.groups[1],
        sim.proto.isBreakShot,
      );
      cue.x = spot.x;
      cue.z = spot.z;
      sim.proto.balls = balls3DToWire(sim.balls3D);
      sim.proto.canMoveCueBall = false;
      setCanMoveCue(false);
    }

    const plan = computeBotShot3D({
      balls: sim.balls3D,
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
      aimDuration: 0.6,
      pullDuration: 0.4,
    };
  }, []);

  const launchShotWithStrikeAnim = useCallback(
    (sim: Sim3DRuntime, shot: ShotParams) => {
      cancelLocalReplay(sim);
      sim.aiPlan = null;
      sim.proto = beginShotOnState(sim.proto, shot);
      sim.balls3D = wireToBalls3D(sim.proto.balls);
      sim.draggingCueBall = false;
      sim.pointerDown = false;
      sim.aimAngle = shot.angle;
      sim.strikeAnim = {
        shot,
        startPower: shot.power,
        t: 0,
        duration: 0.068,
      };
      syncReactFromProto(sim.proto, false);
    },
    [cancelLocalReplay, syncReactFromProto],
  );

  const fireLocalShot = useCallback(() => {
    const sim = getSim();
    // Sync wire cue position before validation
    sim.proto.balls = balls3DToWire(sim.balls3D);
    const effectiveMode =
      modeRef.current === 'ai' && sim.proto.currentPlayer === 1 ? 'ai' : modeRef.current;
    const created = createLocalShot(sim.proto, {
      angle: sim.aimAngle,
      power: sim.power,
      spinX: sim.spinX,
      spinY: sim.spinY,
      elevationDeg: sim.elevationDeg,
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
    launchShotWithStrikeAnim(sim, created.shot);
  }, [getSim, launchShotWithStrikeAnim]);

  const startNewMatch = useCallback(
    (nextRule: BilliardsRule, starting: PlayerSlot, silentBanner = false) => {
      const sim = getSim();
      cancelLocalReplay(sim);
      sim.aiPlan = null;
      sim.strikeAnim = null;
      const now = getServerNowMs();
      const seed = Math.floor(Math.random() * 1e9);
      const matchId = makeMatchId();
      const { nextState, startPayload } = createLocalMatchStart(sim.proto, {
        edition: '3d',
        rule: nextRule,
        startingPlayer: starting,
        seed,
        matchId,
        initiatorSlot: modeRef.current === 'online' ? localPlayerSlotRef.current : 0,
        nowMs: now,
      });

      sim.proto = nextState;
      sim.balls3D = wireToBalls3D(nextState.balls);
      sim.aimAngle = 0;
      sim.power = 0;
      sim.spinX = 0;
      sim.spinY = 0;
      sim.elevationDeg = 0;
      sim.accumulator = 0;
      sim.draggingCueBall = false;
      sim.powerDragging = false;
      sim.pointerDown = false;
      setSpin({ x: 0, y: 0 });
      setElevationDeg(0);
      setPowerPct(0);
      syncReactFromProto(sim.proto, false);

      if (!silentBanner) {
        showTempBanner(
          `${playerNamesRef.current[starting]} khai cuộc!`,
          nextRule === '8ball' ? '8-Ball 3D' : '9-Ball 3D',
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

  // Sync confirmedOnlineConfig updates (including synchronized online rematches)
  useEffect(() => {
    if (mode !== 'online' || !confirmedOnlineConfig) return;
    const sim = getSim();
    if (sim.proto.matchId === confirmedOnlineConfig.matchId) return;

    cancelLocalReplay(sim);
    sim.strikeAnim = null;
    const now = getServerNowMs();
    const { nextState } = createLocalMatchStart(sim.proto, {
      edition: '3d',
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
    sim.balls3D = wireToBalls3D(nextState.balls);
    sim.aimAngle = 0;
    sim.power = 0;
    sim.spinX = 0;
    sim.spinY = 0;
    sim.elevationDeg = 0;
    sim.accumulator = 0;
    setSpin({ x: 0, y: 0 });
    setElevationDeg(0);
    setPowerPct(0);
    syncReactFromProto(sim.proto, false);
    showTempBanner(
      `${playerNamesRef.current[confirmedOnlineConfig.startingPlayer]} khai cuộc!`,
      confirmedOnlineConfig.rule === '8ball' ? '8-Ball 3D Online' : '9-Ball 3D Online',
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
        if (payload.edition === '2d') return;
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
              sim.replayActive && sim.preReplayWireBalls
                ? sim.preReplayWireBalls
                : balls3DToWire(sim.balls3D);
            syncRef.current?.broadcastSnapshot(
              buildMatchSnapshot(sim.proto, localPlayerSlotRef.current, getServerNowMs(), liveBalls),
            );
          }
          return;
        }
        sim.proto = res.nextState;
        sim.balls3D = wireToBalls3D(sim.proto.balls);
        sim.strikeAnim = null;
        sim.aimAngle = 0;
        sim.power = 0;
        sim.spinX = 0;
        sim.spinY = 0;
        sim.elevationDeg = 0;
        sim.accumulator = 0;
        setSpin({ x: 0, y: 0 });
        setElevationDeg(0);
        setPowerPct(0);
        syncReactFromProto(sim.proto, false);
        showTempBanner(
          `${playerNamesRef.current[payload.startingPlayer]} khai cuộc!`,
          payload.rule === '8ball' ? '8-Ball 3D' : '9-Ball 3D',
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
        if (payload.elevationDeg !== undefined) {
          sim.elevationDeg = payload.elevationDeg;
          setElevationDeg(payload.elevationDeg);
        }
      },
      onRemoteShot: (shot, verifiedSenderSlot) => {
        const sim = getSim();
        cancelLocalReplay(sim);
        sim.proto.balls = balls3DToWire(sim.balls3D);
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
        sim.elevationDeg = shot.elevationDeg ?? 0;
        setElevationDeg(sim.elevationDeg);
        launchShotWithStrikeAnim(sim, shot);
      },
      onRemotePlaceCue: (payload, verifiedSenderSlot) => {
        const sim = getSim();
        sim.proto.balls = balls3DToWire(sim.balls3D);
        if (
          !validateRemotePlaceCue(sim.proto, payload, localPlayerSlotRef.current, verifiedSenderSlot)
        ) {
          return;
        }
        const cue3d = sim.balls3D.find((b) => b.id === 0);
        if (cue3d) {
          cue3d.x = payload.x;
          cue3d.z = payload.y;
          cue3d.y = BALL_R_3D;
        }
      },
      onRemoteSettled: (settled, verifiedSenderSlot) => {
        const sim = getSim();
        cancelLocalReplay(sim);
        sim.strikeAnim = null;
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
        sim.balls3D = wireToBalls3D(sim.proto.balls);
        sim.accumulator = 0;
        sim.spinX = 0;
        sim.spinY = 0;
        sim.elevationDeg = 0;
        sim.power = 0;
        setSpin({ x: 0, y: 0 });
        setElevationDeg(0);
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
        if (sim.proto.winner) emitMatchCompleteOnce(sim.proto);
        if (res.shouldRequestSnapshot) syncRef.current?.requestState(true);
      },
      onStateRequested: (requester) => {
        const sim = getSim();
        const decision = shouldAnswerStateRequest(sim.proto, requester);
        if (decision.shouldRequestPeer) syncRef.current?.requestState(true);
        if (!decision.respond) return;
        const liveBalls =
          sim.replayActive && sim.preReplayWireBalls
            ? sim.preReplayWireBalls
            : balls3DToWire(sim.balls3D);
        syncRef.current?.broadcastSnapshot(
          buildMatchSnapshot(sim.proto, localPlayerSlotRef.current, getServerNowMs(), liveBalls),
        );
      },
      onRemoteSnapshot: (snap, verifiedSenderSlot) => {
        if (snap.edition === '2d') return;
        const sim = getSim();
        cancelLocalReplay(sim);
        sim.strikeAnim = null;
        const res = applyRemoteSnapshot(
          sim.proto,
          snap,
          localPlayerSlotRef.current,
          getServerNowMs(),
          verifiedSenderSlot,
        );
        if (!res.accepted) return;
        sim.proto = res.nextState;
        sim.balls3D = wireToBalls3D(sim.proto.balls);
        sim.accumulator = 0;
        sim.draggingCueBall = false;
        sim.powerDragging = false;
        sim.pointerDown = false;
        sim.power = 0;
        setPowerPct(0);
        syncReactFromProto(sim.proto, false);
        if (sim.proto.winner) emitMatchCompleteOnce(sim.proto);
      },
    });
    return () => bindSyncHandlers(null);
  }, [
    bindSyncHandlers,
    cancelLocalReplay,
    emitMatchCompleteOnce,
    getServerNowMs,
    getSim,
    launchShotWithStrikeAnim,
    mode,
    showTempBanner,
    syncReactFromProto,
  ]);

  const isLocalTurn =
    mode === 'local_pvp'
      ? true
      : mode === 'ai'
        ? currentPlayer === 0
        : currentPlayer === localPlayerSlot;

  const canHumanInteractNow = useCallback(() => {
    const sim = getSim();
    if (sim.proto.phase !== 'aim' || sim.replayActive || sim.strikeAnim || sim.proto.winner) {
      return false;
    }
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
          elevationDeg: sim.elevationDeg,
        });
      }
    },
    onFireShot: fireLocalShot,
    onHoverZoomChange: (active) => {
      const sim = getSim();
      sim.hoverZoomActive = active;
      setZoomLabel(active ? 'Cận' : `${sim.zoomLevel.toFixed(1)}x`);
    },
  });

  const stepKeyboardRef = useRef(stepKeyboardControls);
  useLayoutEffect(() => {
    stepKeyboardRef.current = stepKeyboardControls;
  });

  // Main Three.js WebGL Stage + 3D Fixed-Timestep Simulation Loop
  useEffect(() => {
    const host = stageHostRef.current;
    if (!host) return;

    const preset = getQualityPreset(resolvedQuality);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.add(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.add(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      textures.add(t);
      return t;
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: preset.antialias,
        powerPreference: 'high-performance',
      });
    } catch {
      queueMicrotask(() =>
        setWebglError('Thiết bị không hỗ trợ WebGL 3D. Vui lòng chuyển sang phiên bản 2D.'),
      );
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxDpr));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('data-testid', 'billiards-canvas-3d');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1624);
    scene.fog = new THREE.FogExp2(0x0f1624, 0.1);

    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 30);

    // Warm cozy cottage billiard hall lighting (exact HTML donor lighting)
    scene.add(new THREE.HemisphereLight(0xfef3c7, 0x1e293b, 0.78));
    const lamp1 = new THREE.PointLight(0xfff7ed, 1.18, 8);
    lamp1.position.set(-0.6, 1.55, 0);
    scene.add(lamp1);
    const lamp2 = new THREE.PointLight(0xfff7ed, 1.18, 8);
    lamp2.position.set(0.6, 1.55, 0);
    scene.add(lamp2);
    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.35);
    rimLight.position.set(0, 2.2, 2.5);
    scene.add(rimLight);

    const createFeltTexture = (hexColor: number): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const g = c.getContext('2d');
      if (g) {
        g.fillStyle = '#' + hexColor.toString(16).padStart(6, '0');
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 3600; i++) {
          g.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)';
          g.fillRect(Math.random() * 256, Math.random() * 256, 2, 1);
        }
      }
      const tex = trackTex(new THREE.CanvasTexture(c));
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 3);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const contactShadowTex = (() => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d');
      if (g) {
        const grad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
        grad.addColorStop(0, 'rgba(0,0,0,0.58)');
        grad.addColorStop(0.55, 'rgba(0,0,0,0.28)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
      }
      return trackTex(new THREE.CanvasTexture(c));
    })();

    const createBallTexture = (id: number): THREE.CanvasTexture => {
      const w = preset.ballTexW;
      const h = preset.ballTexH;
      const scale = w / 256;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      if (g) {
        g.save();
        g.scale(scale, scale);
        if (id === 0) {
          g.fillStyle = '#f8fafc';
          g.fillRect(0, 0, 256, 128);
          g.fillStyle = '#e11d48';
          for (const [sx, sy] of [
            [64, 64],
            [192, 64],
            [128, 64],
            [0, 64],
            [128, 12],
            [128, 116],
          ] as const) {
            g.beginPath();
            g.arc(sx, sy, 5.5, 0, Math.PI * 2);
            g.fill();
          }
        } else if (id > 8) {
          g.fillStyle = '#f8fafc';
          g.fillRect(0, 0, 256, 128);
          g.fillStyle = BALL_COLORS[id] ?? '#2563eb';
          g.fillRect(0, 30, 256, 68);
        } else {
          g.fillStyle = BALL_COLORS[id] ?? '#facc15';
          g.fillRect(0, 0, 256, 128);
        }
        if (id !== 0) {
          for (const cx of [64, 192]) {
            g.beginPath();
            g.arc(cx, 64, 20, 0, Math.PI * 2);
            g.fillStyle = '#f8fafc';
            g.fill();
            g.fillStyle = '#0f172a';
            g.font = '900 22px system-ui, sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(String(id), cx, 65);
          }
        }
        g.restore();
      }
      const tex = trackTex(new THREE.CanvasTexture(c));
      tex.anisotropy = preset.anisotropy;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // Build 3D Mahogany Table
    const tableGroup = new THREE.Group();
    const initialTheme = FELT_THEMES_3D[feltIdxRef.current] ?? FELT_THEMES_3D[0];
    let feltTex = createFeltTexture(initialTheme.felt);

    const floorMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x131b2b, roughness: 0.95 }));
    const floor = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(14, 14)), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.82;
    tableGroup.add(floor);

    const woodMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x6e1f12, roughness: 0.38, metalness: 0.08 }),
    );
    const cabinet = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(HALF_W_3D * 2 + 0.16, 0.16, HALF_H_3D * 2 + 0.16)),
      woodMat,
    );
    cabinet.position.y = -0.095;
    tableGroup.add(cabinet);

    const legGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.72, 0.11));
    for (const lx of [-HALF_W_3D + 0.06, HALF_W_3D - 0.06]) {
      for (const lz of [-HALF_H_3D + 0.06, HALF_H_3D - 0.06]) {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(lx, -0.46, lz);
        tableGroup.add(leg);
      }
    }

    const feltMaterial = trackMat(
      new THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.86, metalness: 0.02 }),
    );
    const bed = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(HALF_W_3D * 2 + 0.06, 0.03, HALF_H_3D * 2 + 0.06)),
      feltMaterial,
    );
    bed.position.y = -0.015;
    tableGroup.add(bed);

    const lineMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }),
    );
    const baulkLine = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.004, HALF_H_3D * 2)),
      lineMat,
    );
    baulkLine.rotation.x = -Math.PI / 2;
    baulkLine.position.set(-HALF_W_3D * 0.5, 0.001, 0);
    tableGroup.add(baulkLine);

    const footSpot = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.009, 16)), lineMat);
    footSpot.rotation.x = -Math.PI / 2;
    footSpot.position.set(HALF_W_3D * 0.5, 0.001, 0);
    tableGroup.add(footSpot);

    const cushionMaterial = trackMat(
      new THREE.MeshStandardMaterial({ color: initialTheme.rail, roughness: 0.72 }),
    );
    const railH = 0.038;
    const railThick = 0.044;
    for (const seg of RAIL_SEGMENTS_3D) {
      if (seg.type === 'h') {
        const m = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(seg.x2 - seg.x1, railH, railThick)),
          cushionMaterial,
        );
        m.position.set((seg.x1 + seg.x2) / 2, railH / 2, seg.z - seg.nz * (railThick / 2));
        tableGroup.add(m);
      } else {
        const m = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(railThick, railH, seg.z2 - seg.z1)),
          cushionMaterial,
        );
        m.position.set(seg.x - seg.nx * (railThick / 2), railH / 2, (seg.z1 + seg.z2) / 2);
        tableGroup.add(m);
      }
    }

    const frameH = 0.048;
    const frameW = 0.095;
    const hFrameGeo = trackGeo(new THREE.BoxGeometry(HALF_W_3D * 2 + frameW * 2, frameH, frameW));
    const topFrame = new THREE.Mesh(hFrameGeo, woodMat);
    topFrame.position.set(0, frameH / 2 - 0.005, -HALF_H_3D - railThick - frameW / 2 + 0.01);
    tableGroup.add(topFrame);
    const botFrame = new THREE.Mesh(hFrameGeo, woodMat);
    botFrame.position.set(0, frameH / 2 - 0.005, HALF_H_3D + railThick + frameW / 2 - 0.01);
    tableGroup.add(botFrame);

    const vFrameGeo = trackGeo(new THREE.BoxGeometry(frameW, frameH, HALF_H_3D * 2 + railThick * 2));
    const leftFrame = new THREE.Mesh(vFrameGeo, woodMat);
    leftFrame.position.set(-HALF_W_3D - railThick - frameW / 2 + 0.01, frameH / 2 - 0.005, 0);
    tableGroup.add(leftFrame);
    const rightFrame = new THREE.Mesh(vFrameGeo, woodMat);
    rightFrame.position.set(HALF_W_3D + railThick + frameW / 2 - 0.01, frameH / 2 - 0.005, 0);
    tableGroup.add(rightFrame);

    const sightMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 }));
    const sightGeo = trackGeo(new THREE.CylinderGeometry(0.0065, 0.0065, 0.003, 12));
    for (const i of [-3, -2, -1, 1, 2, 3]) {
      for (const z of [-HALF_H_3D - 0.075, HALF_H_3D + 0.075]) {
        const s = new THREE.Mesh(sightGeo, sightMat);
        s.position.set((i / 4) * HALF_W_3D, frameH - 0.004, z);
        tableGroup.add(s);
      }
    }
    for (const j of [-1, 0, 1]) {
      for (const x of [-HALF_W_3D - 0.075, HALF_W_3D + 0.075]) {
        const s = new THREE.Mesh(sightGeo, sightMat);
        s.position.set(x, frameH - 0.004, (j / 2) * HALF_H_3D);
        tableGroup.add(s);
      }
    }

    const holeMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x030406 }));
    const chromeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.85 }),
    );
    for (const p of POCKETS_3D) {
      const hole = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(p.r, p.r, 0.06, 20)),
        holeMat,
      );
      hole.position.set(p.x, -0.02, p.z);
      tableGroup.add(hole);
      const rim = new THREE.Mesh(
        trackGeo(new THREE.RingGeometry(p.r, p.r + 0.018, 22)),
        chromeMat,
      );
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(p.x, 0.003, p.z);
      tableGroup.add(rim);
    }
    scene.add(tableGroup);

    feltUpdaterRef.current = (idx: number) => {
      const theme = FELT_THEMES_3D[idx] ?? FELT_THEMES_3D[0];
      const nextTex = createFeltTexture(theme.felt);
      feltMaterial.map = nextTex;
      feltMaterial.needsUpdate = true;
      textures.delete(feltTex);
      feltTex.dispose();
      feltTex = nextTex;
      cushionMaterial.color.setHex(theme.rail);
    };

    // 3D Cue Stick
    const cueGroup = new THREE.Group();
    const tip = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.006, 0.0065, 0.012, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8 })),
    );
    tip.rotation.z = Math.PI / 2;
    tip.position.x = -0.006;
    cueGroup.add(tip);

    const ferrule = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.0065, 0.007, 0.022, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc })),
    );
    ferrule.rotation.z = Math.PI / 2;
    ferrule.position.x = -0.023;
    cueGroup.add(ferrule);

    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.007, 0.011, 0.72, 14)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.35 })),
    );
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = -0.394;
    cueGroup.add(shaft);

    const butt = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.011, 0.015, 0.68, 14)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 })),
    );
    butt.rotation.z = Math.PI / 2;
    butt.position.x = -1.09;
    cueGroup.add(butt);
    scene.add(cueGroup);

    // 3D Ribbon Aim Guide
    const aimGroup = new THREE.Group();
    const makeBeam = (colorHex: number, width: number, opacity = 0.96) => {
      const g = new THREE.Group();
      const bg = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(1, width * 2.1)),
        trackMat(
          new THREE.MeshBasicMaterial({
            color: 0x050811,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: opacity * 0.85,
          }),
        ),
      );
      bg.rotation.x = -Math.PI / 2;
      g.add(bg);
      const fg = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(1, width)),
        trackMat(
          new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity,
          }),
        ),
      );
      fg.rotation.x = -Math.PI / 2;
      fg.position.y = 0.0008;
      g.add(fg);
      return g;
    };
    const positionBeam = (
      beam: THREE.Group,
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      y: number,
    ) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.002) {
        beam.visible = false;
        return;
      }
      beam.visible = true;
      beam.position.set((x1 + x2) * 0.5, y, (z1 + z2) * 0.5);
      beam.rotation.y = -Math.atan2(dz, dx);
      beam.scale.set(len, 1, 1);
    };

    const aimBeam = makeBeam(0xfacc15, 0.0058, 0.98);
    const objBeam = makeBeam(0x4ade80, 0.0062, 0.98);
    const cueDefBeam = makeBeam(0xfef08a, 0.0044, 0.78);
    aimGroup.add(aimBeam, objBeam, cueDefBeam);

    const ghostRing = new THREE.Group();
    const ghostBg = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(BALL_R_3D * 0.76, BALL_R_3D * 1.16, 32)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0x050811,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
    ghostBg.rotation.x = -Math.PI / 2;
    ghostRing.add(ghostBg);
    const ghostFg = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(BALL_R_3D * 0.84, BALL_R_3D * 1.08, 32)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.98,
        }),
      ),
    );
    ghostFg.rotation.x = -Math.PI / 2;
    ghostFg.position.y = 0.0008;
    ghostRing.add(ghostFg);
    aimGroup.add(ghostRing);

    const forbiddenGroup = new THREE.Group();
    const forbBgMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
    const forbRedMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide }));
    const forbOuter = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(BALL_R_3D * 0.78, BALL_R_3D * 1.24, 32)),
      forbBgMat,
    );
    forbOuter.rotation.x = -Math.PI / 2;
    forbiddenGroup.add(forbOuter);
    const forbRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(BALL_R_3D * 0.86, BALL_R_3D * 1.16, 32)),
      forbRedMat,
    );
    forbRing.rotation.x = -Math.PI / 2;
    forbRing.position.y = 0.001;
    forbiddenGroup.add(forbRing);
    const forbSlash = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(BALL_R_3D * 2.05, BALL_R_3D * 0.28)),
      forbRedMat,
    );
    forbSlash.rotation.x = -Math.PI / 2;
    forbSlash.rotation.z = Math.PI / 4;
    forbSlash.position.y = 0.002;
    forbiddenGroup.add(forbSlash);
    forbiddenGroup.visible = false;
    aimGroup.add(forbiddenGroup);
    scene.add(aimGroup);

    const handRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    );
    const handRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(BALL_R_3D * 1.2, BALL_R_3D * 1.48, 32)),
      handRingMat,
    );
    handRing.rotation.x = -Math.PI / 2;
    handRing.position.y = 0.005;
    handRing.visible = false;
    scene.add(handRing);

    // 16 Ball Meshes & Shadow Planes
    const ballGeo = trackGeo(new THREE.SphereGeometry(BALL_R_3D, preset.sphereSegW, preset.sphereSegH));
    const shadowGeo = trackGeo(new THREE.PlaneGeometry(BALL_R_3D * 2.5, BALL_R_3D * 2.5));
    const shadowMat = trackMat(
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false }),
    );
    const ballVisuals = new Map<number, { mesh: THREE.Mesh; shadow: THREE.Mesh }>();
    for (let id = 0; id <= 15; id++) {
      const tex = createBallTexture(id);
      const mat = trackMat(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.14, metalness: 0.05 }));
      const mesh = new THREE.Mesh(ballGeo, mat);
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      shadow.visible = false;
      scene.add(mesh);
      scene.add(shadow);
      ballVisuals.set(id, { mesh, shadow });
    }

    // Pre-allocated scratch objects (zero allocations in RAF loop)
    const camPos = new THREE.Vector3(-2.1, 1.1, 0);
    const camLook = new THREE.Vector3(0, 0, 0);
    const targetPos = new THREE.Vector3();
    const targetLook = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const ndcVec = new THREE.Vector2();
    const hitVec = new THREE.Vector3();
    const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BALL_R_3D);

    const resolveTableWorldPoint = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      ndcVec.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndcVec, camera);
      return raycaster.ray.intersectPlane(tablePlane, hitVec)
        ? { x: hitVec.x, z: hitVec.z }
        : null;
    };
    tablePointResolverRef.current = resolveTableWorldPoint;

    const handleResize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = Math.max(200, host.clientHeight || 420);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    handleResize();

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    window.addEventListener('resize', handleResize);

    // Stage Pointer Controls (Aim, Orbit, Ball-in-Hand Drag, Wheel/Hover Zoom)
    const dom = renderer.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const sim = getSim();
      const delta = e.deltaY < 0 ? 0.18 : -0.18;
      sim.zoomLevel = Math.max(0.7, Math.min(2.6, +(sim.zoomLevel + delta).toFixed(2)));
      const pt = resolveTableWorldPoint(e.clientX, e.clientY);
      if (pt) sim.hoverWorldPt = pt;
      setZoomLabel(sim.hoverZoomActive ? 'Cận' : `${sim.zoomLevel.toFixed(1)}x`);
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onPointerDown = (e: PointerEvent) => {
      const sim = getSim();
      billiardsSound.unlock();
      if (e.button === 2) {
        sim.hoverZoomActive = true;
        const pt = resolveTableWorldPoint(e.clientX, e.clientY);
        if (pt) sim.hoverWorldPt = pt;
        setZoomLabel('Cận');
        return;
      }
      dom.setPointerCapture(e.pointerId);
      sim.pointerDown = true;
      sim.lastPointerX = e.clientX;
      sim.lastPointerY = e.clientY;

      if (!canHumanInteractNow()) return;
      if (sim.proto.canMoveCueBall) {
        const pt = resolveTableWorldPoint(e.clientX, e.clientY);
        const cue = sim.balls3D.find((b) => b.id === 0);
        if (pt && cue && Math.hypot(pt.x - cue.x, pt.z - cue.z) < BALL_R_3D * 3.6) {
          sim.draggingCueBall = true;
          return;
        }
      }
      if ((CAM_MODES_3D[camIdxRef.current]?.id ?? 'follow') === 'top') {
        const pt = resolveTableWorldPoint(e.clientX, e.clientY);
        const cue = sim.balls3D.find((b) => b.id === 0);
        if (pt && cue) {
          sim.aimAngle = Math.atan2(pt.z - cue.z, pt.x - cue.x);
          if (modeRef.current === 'online') {
            syncRef.current?.broadcastAim({
              matchId: sim.proto.matchId,
              stateVersion: sim.proto.stateVersion,
              playerSlot: sim.proto.currentPlayer,
              angle: sim.aimAngle,
              power: sim.power,
            });
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const sim = getSim();
      if (sim.zoomLevel > 1.05 || sim.hoverZoomActive) {
        const pt = resolveTableWorldPoint(e.clientX, e.clientY);
        if (pt) sim.hoverWorldPt = pt;
      }
      if (sim.draggingCueBall && sim.proto.canMoveCueBall && canHumanInteractNow()) {
        const pt = resolveTableWorldPoint(e.clientX, e.clientY);
        if (pt) {
          const cx = Math.max(-HALF_W_3D + BALL_R_3D + 0.006, Math.min(HALF_W_3D - BALL_R_3D - 0.006, pt.x));
          const cz = Math.max(-HALF_H_3D + BALL_R_3D + 0.006, Math.min(HALF_H_3D - BALL_R_3D - 0.006, pt.z));
          const valid = isPositionValidForCue3D(sim.balls3D, cx, cz);
          handRing.position.set(cx, 0.005, cz);
          handRingMat.color.setHex(valid ? 0x34d399 : 0xef4444);
          if (valid) {
            const cue = sim.balls3D.find((b) => b.id === 0);
            if (cue) {
              cue.x = cx;
              cue.z = cz;
              if (modeRef.current === 'online') {
                syncRef.current?.broadcastPlaceCue({
                  matchId: sim.proto.matchId,
                  stateVersion: sim.proto.stateVersion,
                  playerSlot: sim.proto.currentPlayer,
                  x: cx,
                  y: cz,
                });
              }
            }
          }
        }
        return;
      }
      if (!sim.pointerDown) return;
      const dx = e.clientX - sim.lastPointerX;
      const dy = e.clientY - sim.lastPointerY;
      sim.lastPointerX = e.clientX;
      sim.lastPointerY = e.clientY;
      const camMode = CAM_MODES_3D[camIdxRef.current]?.id ?? 'follow';
      if (sim.proto.phase === 'aim' && canHumanInteractNow()) {
        if (camMode === 'top') {
          const pt = resolveTableWorldPoint(e.clientX, e.clientY);
          const cue = sim.balls3D.find((b) => b.id === 0);
          if (pt && cue) sim.aimAngle = Math.atan2(pt.z - cue.z, pt.x - cue.x);
        } else if (camMode === 'follow') {
          sim.aimAngle -= dx * 0.0042;
        } else {
          sim.aimAngle -= dx * 0.0045;
          sim.orbitPitch = Math.max(0.28, Math.min(1.25, sim.orbitPitch + dy * 0.004));
        }
        if (modeRef.current === 'online') {
          syncRef.current?.broadcastAim({
            matchId: sim.proto.matchId,
            stateVersion: sim.proto.stateVersion,
            playerSlot: sim.proto.currentPlayer,
            angle: sim.aimAngle,
            power: sim.power,
          });
        }
      } else {
        sim.orbitYaw += dx * 0.006;
        sim.orbitPitch = Math.max(0.22, Math.min(1.3, sim.orbitPitch + dy * 0.005));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const sim = getSim();
      if (e.button === 2 && sim.hoverZoomActive) {
        sim.hoverZoomActive = false;
        setZoomLabel(`${sim.zoomLevel.toFixed(1)}x`);
      }
      if (sim.draggingCueBall) {
        sim.draggingCueBall = false;
        const cue = sim.balls3D.find((b) => b.id === 0);
        if (cue) {
          handRing.position.set(cue.x, 0.005, cue.z);
          handRingMat.color.setHex(0x34d399);
          if (sim.proto.canMoveCueBall && modeRef.current === 'online') {
            syncRef.current?.broadcastPlaceCue(
              {
                matchId: sim.proto.matchId,
                stateVersion: sim.proto.stateVersion,
                playerSlot: sim.proto.currentPlayer,
                x: cue.x,
                y: cue.z,
              },
              true,
            );
          }
        }
      }
      sim.pointerDown = false;
    };

    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', onContextMenu);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);

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

      stepKeyboardRef.current(realDt);

      const serverNow = getServerNowMs();
      const waitLeft =
        curMode === 'online' && proto.startAtServerMs ? Math.max(0, proto.startAtServerMs - serverNow) : 0;
      setPreStartWaitMs(waitLeft > 0 ? waitLeft : 0);

      // AI thinking animation
      if (
        curMode === 'ai' &&
        proto.phase === 'aim' &&
        proto.currentPlayer === 1 &&
        sim.aiPlan &&
        !sim.replayActive &&
        !sim.strikeAnim
      ) {
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
          sim.elevationDeg = ai.plan.elevationDeg;
          sim.aiPlan = null;
          sim.proto.balls = balls3DToWire(sim.balls3D);
          const created = createLocalShot(proto, {
            angle: sim.aimAngle,
            power: sim.power,
            spinX: sim.spinX,
            spinY: sim.spinY,
            elevationDeg: sim.elevationDeg,
            localPlayerSlot: 1,
            mode: 'ai',
          });
          if (created.ok) {
            launchShotWithStrikeAnim(sim, created.shot);
          }
        }
      }

      // 0.068s cue forward strike animation before impulse
      if (sim.strikeAnim) {
        sim.strikeAnim.t += realDt;
        if (sim.strikeAnim.t >= sim.strikeAnim.duration) {
          const shot = sim.strikeAnim.shot;
          sim.strikeAnim = null;
          applyShotImpulse3D(sim.balls3D, {
            angle: shot.angle,
            power: shot.power,
            spinX: shot.spinX,
            spinY: shot.spinY,
            elevationDeg: shot.elevationDeg ?? 0,
            cueX: shot.cueX,
            cueZ: shot.cueY,
          });
          sim.power = 0;
          sim.accumulator = 0;
          setPowerPct(0);
          billiardsSound.playCue(shot.power);
        }
      } else if (proto.phase === 'moving' || sim.replayActive) {
        const isRep = sim.replayActive;
        sim.accumulator += isRep ? realDt * 0.5 : realDt;
        let stillMoving = true;
        let stepsRun = 0;
        while (sim.accumulator >= FIXED_STEP_DT_3D && stepsRun < 12) {
          stillMoving = stepBilliards3DFixedTick(sim.balls3D, {
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
            onBallHit: (spd) => billiardsSound.playBallHitMetric(spd),
            onCushion: (spd) => billiardsSound.playCushionMetric(spd),
          });
          if (!isRep) proto.inFlightTicks += 1;
          sim.accumulator -= FIXED_STEP_DT_3D;
          stepsRun++;
          if (!stillMoving) {
            sim.accumulator = 0;
            break;
          }
        }

        if (!stillMoving) {
          if (isRep) {
            sim.replayActive = false;
            setReplayBadgeVisible(false);
            if (sim.preReplayWireBalls) {
              proto.balls = sim.preReplayWireBalls;
              sim.balls3D = wireToBalls3D(sim.preReplayWireBalls);
              sim.preReplayWireBalls = null;
            }
            syncReactFromProto(proto, false);
          } else {
            const shooterSlot = proto.currentPlayer;
            const settledShotIndex = proto.activeShotIndex;
            const settledShot =
              proto.shots.find((s) => s.shotIndex === settledShotIndex) ??
              proto.lastShotSnap?.shot ??
              null;

            const outcome = evaluateShotRules3D({
              rule: proto.rule,
              balls: sim.balls3D,
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
            sim.elevationDeg = 0;
            setSpin({ x: 0, y: 0 });
            setElevationDeg(0);
            proto.groups = [outcome.groups[0], outcome.groups[1]];

            if (outcome.respotNine) {
              const b9 = sim.balls3D.find((b) => b.id === 9);
              if (b9) {
                b9.pocketed = false;
                b9.falling = false;
                b9.fallTarget = null;
                b9.x = HALF_W_3D * 0.5;
                b9.y = BALL_R_3D;
                b9.z = 0;
                b9.vx = 0;
                b9.vz = 0;
                b9.rollVx = 0;
                b9.rollVz = 0;
                b9.spinY = 0;
              }
              proto.returnedIds = proto.returnedIds.filter((id) => id !== 9);
            }

            const nextDeadline = getServerNowMs() + TURN_DURATION_MS;
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
            } else {
              proto.currentPlayer = outcome.nextPlayer;
              proto.phase = 'aim';
              proto.turnDeadlineMs = nextDeadline;
              proto.canMoveCueBall = outcome.ballInHand;
              if (outcome.ballInHand) {
                billiardsSound.playFoul();
                const cue3d = sim.balls3D.find((b) => b.id === 0);
                if (cue3d) {
                  const spot = findOpenCueSpot3D(sim.balls3D);
                  cue3d.pocketed = false;
                  cue3d.falling = false;
                  cue3d.fallTarget = null;
                  cue3d.x = spot.x;
                  cue3d.y = BALL_R_3D;
                  cue3d.z = spot.z;
                  cue3d.vx = 0;
                  cue3d.vz = 0;
                  cue3d.rollVx = 0;
                  cue3d.rollVz = 0;
                  cue3d.spinY = 0;
                }
              }
              if (outcome.bannerTitle) {
                showTempBanner(outcome.bannerTitle, outcome.bannerSub, 2100);
              }
            }

            proto.balls = balls3DToWire(sim.balls3D);
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
            if (proto.winner) emitMatchCompleteOnce(proto);

            if (curMode === 'online' && shooterSlot === curLocalSlot && settledShotIndex >= 0) {
              syncRef.current?.broadcastSettled({
                matchId: proto.matchId,
                matchSeq: proto.matchSeq,
                edition: '3d',
                kind: 'shot_settled',
                actorSlot: curLocalSlot,
                shotIndex: settledShotIndex,
                shot: settledShot ? { ...settledShot } : null,
                stateVersion: proto.stateVersion,
                nextShotSeq: proto.nextShotSeq,
                balls: balls3DToWire(sim.balls3D),
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
      } else if (
        !sim.replayActive &&
        proto.phase === 'aim' &&
        proto.hasAuthoritativeMatch &&
        waitLeft <= 0 &&
        (curMode === 'online' ||
          (timerEnabledRef.current && !showMenuRef.current && !showSpinModalRef.current))
      ) {
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
          proto.balls = balls3DToWire(sim.balls3D);
          sim.aiPlan = null;
          sim.lastTickSec = 30;
          sim.draggingCueBall = false;
          sim.pointerDown = false;
          sim.power = 0;

          setPowerPct(0);
          setCurrentPlayer(opp);
          setCanMoveCue(true);
          setTimeLeft(30);
          billiardsSound.playFoul();
          showTempBanner(bannerTitle, bannerSub, 2200);

          if (curMode === 'online') {
            syncRef.current?.broadcastSettled({
              matchId: proto.matchId,
              matchSeq: proto.matchSeq,
              edition: '3d',
              kind: 'turn_timeout',
              actorSlot: curLocalSlot,
              shotIndex: null,
              shot: null,
              stateVersion: proto.stateVersion,
              nextShotSeq: proto.nextShotSeq,
              balls: balls3DToWire(sim.balls3D),
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
      }

      // Sync 3D Ball Meshes & Shadows from sim.balls3D
      const activeIds = new Set<number>();
      for (const b of sim.balls3D) {
        activeIds.add(b.id);
        const vis = ballVisuals.get(b.id);
        if (!vis) continue;
        const showBall = !b.pocketed || b.falling;
        vis.mesh.visible = showBall;
        vis.shadow.visible = !b.pocketed;
        if (showBall) {
          vis.mesh.position.set(b.x, b.y, b.z);
          vis.mesh.quaternion.set(b.q.x, b.q.y, b.q.z, b.q.w);
          vis.shadow.position.set(b.x + 0.004, 0.0015, b.z + 0.005);
        }
      }
      for (const [id, vis] of ballVisuals.entries()) {
        if (!activeIds.has(id)) {
          vis.mesh.visible = false;
          vis.shadow.visible = false;
        }
      }

      // Update Cue Stick, 3D Aim Ribbon Guide & Hand Ring
      const cue3d = sim.balls3D.find((b) => b.id === 0);
      const showCue = Boolean(
        cue3d &&
          !cue3d.pocketed &&
          !sim.draggingCueBall &&
          (proto.phase === 'aim' || Boolean(sim.strikeAnim)) &&
          !sim.replayActive,
      );
      cueGroup.visible = showCue;
      if (showCue && cue3d) {
        let dispPower = sim.power;
        if (sim.strikeAnim) {
          const p = Math.min(1, sim.strikeAnim.t / sim.strikeAnim.duration);
          dispPower = sim.strikeAnim.startPower * (1 - p * p);
        }
        const pullback = BALL_R_3D + 0.015 + dispPower * 0.28;
        const elevRad = (sim.elevationDeg * Math.PI) / 180;
        const tiltAngle = 0.05 + elevRad;
        cueGroup.position.set(
          cue3d.x - Math.cos(sim.aimAngle) * pullback * Math.cos(tiltAngle),
          BALL_R_3D + 0.006 + pullback * Math.sin(tiltAngle),
          cue3d.z - Math.sin(sim.aimAngle) * pullback * Math.cos(tiltAngle),
        );
        cueGroup.rotation.order = 'YXZ';
        cueGroup.rotation.set(0, -sim.aimAngle, -tiltAngle);
      }

      const showGuideNow = Boolean(
        showGuideRef.current &&
          proto.phase === 'aim' &&
          !sim.strikeAnim &&
          !sim.replayActive &&
          !sim.draggingCueBall &&
          cue3d &&
          !cue3d.pocketed,
      );
      aimGroup.visible = showGuideNow;
      if (showGuideNow && cue3d) {
        const { gx, gz, hitBall, hitRail, dx, dz } = computeAimRay3D(
          sim.balls3D,
          cue3d,
          sim.aimAngle,
        );
        const y = 0.005;
        positionBeam(aimBeam, cue3d.x, cue3d.z, gx, gz, y);

        if (hitBall) {
          const legal = isLegalTargetBall3D(
            sim.balls3D,
            proto.rule,
            proto.groups[proto.currentPlayer],
            proto.isBreakShot,
            hitBall.id,
          );
          if (!legal) {
            ghostRing.visible = false;
            objBeam.visible = false;
            cueDefBeam.visible = false;
            forbiddenGroup.visible = true;
            forbiddenGroup.position.set(gx, y + 0.003, gz);
          } else {
            forbiddenGroup.visible = false;
            ghostRing.visible = true;
            ghostRing.position.set(gx, y + 0.001, gz);

            const tdx = hitBall.x - gx;
            const tdz = hitBall.z - gz;
            const tLen = Math.hypot(tdx, tdz) || 1;
            const tnx = tdx / tLen;
            const tnz = tdz / tLen;
            positionBeam(
              objBeam,
              hitBall.x,
              hitBall.z,
              hitBall.x + tnx * 0.38,
              hitBall.z + tnz * 0.38,
              y + 0.001,
            );

            const dot = dx * tnx + dz * tnz;
            const defX = dx - dot * tnx;
            const defZ = dz - dot * tnz;
            const defLen = Math.hypot(defX, defZ);
            if (defLen > 0.06) {
              positionBeam(
                cueDefBeam,
                gx,
                gz,
                gx + (defX / defLen) * 0.22,
                gz + (defZ / defLen) * 0.22,
                y + 0.0005,
              );
            } else {
              cueDefBeam.visible = false;
            }
          }
        } else {
          forbiddenGroup.visible = false;
          ghostRing.visible = true;
          ghostRing.position.set(gx, y + 0.001, gz);
          objBeam.visible = false;
          if (hitRail) {
            const rx = hitRail === 'v' ? -dx : dx;
            const rz = hitRail === 'h' ? -dz : dz;
            positionBeam(cueDefBeam, gx, gz, gx + rx * 0.32, gz + rz * 0.32, y + 0.0005);
          } else {
            cueDefBeam.visible = false;
          }
        }
      }

      if (proto.canMoveCueBall && cue3d && !cue3d.pocketed && proto.phase === 'aim') {
        handRing.visible = true;
        if (!sim.draggingCueBall) {
          handRing.position.set(cue3d.x, 0.005, cue3d.z);
          handRingMat.color.setHex(0x34d399);
        }
        const pulse = 1 + Math.sin(now * 0.008) * 0.1;
        handRing.scale.set(pulse, pulse, 1);
      } else {
        handRing.visible = false;
      }

      // Camera Update (Follow / Top / Orbit / Magnifier)
      const camMode = CAM_MODES_3D[camIdxRef.current]?.id ?? 'follow';
      const zFactor = 1 / Math.max(0.65, Math.min(2.8, sim.zoomLevel));
      if (
        sim.hoverZoomActive &&
        sim.hoverWorldPt &&
        proto.phase === 'aim' &&
        !sim.draggingCueBall
      ) {
        const hx = Math.max(-HALF_W_3D, Math.min(HALF_W_3D, sim.hoverWorldPt.x));
        const hz = Math.max(-HALF_H_3D, Math.min(HALF_H_3D, sim.hoverWorldPt.z));
        if (camMode === 'top') {
          targetPos.set(hx, 1.05, hz + 0.01);
          targetLook.set(hx, 0.02, hz);
        } else {
          targetPos.set(
            hx - Math.cos(sim.aimAngle) * 0.58,
            0.42,
            hz - Math.sin(sim.aimAngle) * 0.58,
          );
          targetLook.set(hx, 0.03, hz);
        }
      } else if (camMode === 'top' || sim.draggingCueBall) {
        const focusX =
          sim.zoomLevel > 1.05 && sim.hoverWorldPt && !sim.draggingCueBall
            ? Math.max(-HALF_W_3D * 0.85, Math.min(HALF_W_3D * 0.85, sim.hoverWorldPt.x)) * (1 - zFactor)
            : 0;
        const focusZ =
          sim.zoomLevel > 1.05 && sim.hoverWorldPt && !sim.draggingCueBall
            ? Math.max(-HALF_H_3D * 0.85, Math.min(HALF_H_3D * 0.85, sim.hoverWorldPt.z)) * (1 - zFactor)
            : 0;
        targetPos.set(focusX, 3.05 * zFactor, focusZ + 0.01);
        targetLook.set(focusX, 0, focusZ);
      } else if (
        camMode === 'follow' &&
        cue3d &&
        !cue3d.pocketed &&
        (proto.phase === 'aim' || Boolean(sim.strikeAnim))
      ) {
        targetPos.set(
          cue3d.x - Math.cos(sim.aimAngle) * 1.25 * zFactor,
          Math.max(0.24, 0.62 * zFactor),
          cue3d.z - Math.sin(sim.aimAngle) * 1.25 * zFactor,
        );
        targetLook.set(
          cue3d.x + Math.cos(sim.aimAngle) * 0.45,
          0.03,
          cue3d.z + Math.sin(sim.aimAngle) * 0.45,
        );
      } else {
        const r = 2.65 * zFactor;
        targetPos.set(
          Math.cos(sim.orbitYaw) * Math.cos(sim.orbitPitch) * r,
          Math.sin(sim.orbitPitch) * r + 0.1,
          Math.sin(sim.orbitYaw) * Math.cos(sim.orbitPitch) * r,
        );
        targetLook.set(0, 0, 0);
      }
      const alpha = 1 - Math.exp(-9 * realDt);
      camPos.lerp(targetPos, alpha);
      camLook.lerp(targetLook, alpha);
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      if (typeof document === 'undefined' || !document.hidden) {
        renderer.render(scene, camera);
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      feltUpdaterRef.current = null;
      tablePointResolverRef.current = null;
      dom.removeEventListener('webglcontextlost', onContextLost);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContextMenu);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', handleResize);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.renderLists?.dispose?.();
      renderer.dispose();
      if (dom.parentNode === host) host.removeChild(dom);
    };
  }, [
    canHumanInteractNow,
    emitMatchCompleteOnce,
    getServerNowMs,
    getSim,
    launchShotWithStrikeAnim,
    resolvedQuality,
    scheduleAiTurnIfNeeded,
    showTempBanner,
    syncReactFromProto,
  ]);

  useEffect(() => {
    const sim = getSim();
    if (sim.proto.shots.length === 0 && !sim.proto.winner) {
      showTempBanner(
        `${playerNamesRef.current[sim.proto.currentPlayer]} khai cuộc!`,
        sim.proto.rule === '8ball' ? '8-Ball 3D' : '9-Ball 3D',
        1600,
      );
      scheduleAiTurnIfNeeded(sim);
    }
    return () => {
      clearBannerTimer();
      stopFineAim();
    };
  }, [clearBannerTimer, getSim, scheduleAiTurnIfNeeded, showTempBanner, stopFineAim]);

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

  const handleElevationChange = (deg: number) => {
    const clamped = Math.max(0, Math.min(45, Number(deg) || 0));
    getSim().elevationDeg = clamped;
    setElevationDeg(clamped);
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
  const activeCam = CAM_MODES_3D[camIdx] ?? CAM_MODES_3D[0]!;
  const localWantRematch = Boolean(lobbyState?.players[localPlayerSlot]?.wantRematch);
  const peerWantRematch = Boolean(lobbyState?.players[localPlayerSlot === 0 ? 1 : 0]?.wantRematch);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      data-testid="billiards-3d-game"
      data-edition="3d"
      data-mode={mode}
      data-phase={phaseUi}
      data-rule={rule}
      data-camera-mode={activeCam.id}
      data-quality={resolvedQuality}
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
        <div className="olw-billiards-row">
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
            data-testid="billiards-3d-cam-btn"
            onClick={() => setCamIdx((i) => (i + 1) % CAM_MODES_3D.length)}
            className="olw-billiards-pill"
          >
            {activeCam.label}
          </button>
          <button
            type="button"
            onClick={() => {
              const sim = getSim();
              const steps = [1.0, 1.5, 2.1, 2.6];
              sim.zoomLevel = steps.find((v) => v > sim.zoomLevel + 0.05) ?? 1.0;
              setZoomLabel(`${sim.zoomLevel.toFixed(1)}x`);
            }}
            className="olw-billiards-pill olw-hide-sm"
          >
            <Search size={14} /> {zoomLabel}
          </button>
          <button
            type="button"
            disabled={!canReplay}
            data-testid="billiards-replay-btn"
            onClick={() => {
              const sim = getSim();
              if (!sim.proto.lastShotSnap || sim.proto.phase !== 'aim' || sim.replayActive) return;
              sim.preReplayWireBalls = balls3DToWire(sim.balls3D);
              sim.balls3D = wireToBalls3D(sim.proto.lastShotSnap.balls);
              sim.proto.balls = cloneBalls(sim.proto.lastShotSnap.balls);
              sim.replayActive = true;
              setReplayBadgeVisible(true);
              setCanReplay(false);
              const shot = sim.proto.lastShotSnap.shot;
              applyShotImpulse3D(sim.balls3D, {
                angle: shot.angle,
                power: shot.power,
                spinX: shot.spinX,
                spinY: shot.spinY,
                elevationDeg: shot.elevationDeg ?? 0,
                cueX: shot.cueX,
                cueZ: shot.cueY,
              });
              billiardsSound.playCue(shot.power);
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
                currentPlayer === 0 && (mode === 'online' || timerEnabled)
                  ? `conic-gradient(${timerColor} ${timerDeg}deg, #2e2438 ${timerDeg}deg)`
                  : currentPlayer === 0
                    ? '#34d399'
                    : '#473d54',
            }}
          >
            <div className="olw-avatar-inner">🏡</div>
          </div>
          <div className="olw-score-box" data-testid="billiards-score">
            <div className="olw-score-rule">
              {rule === '8ball' ? '8-BALL' : '9-BALL'} • 3D
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
            <div className="olw-avatar-inner">{mode === 'ai' ? '🤖' : '🌙'}</div>
          </div>
          <div className="olw-player-col olw-player-col--left">
            <div className="olw-player-name">{playerNames[1]}</div>
            <div className="olw-rack-row">{renderSlots(1)}</div>
          </div>
        </div>

        <div className="olw-billiards-row">
          <button
            type="button"
            onClick={() => setShowSpinModal(true)}
            title="Chỉnh Xoáy (Spin) & Nâng cơ"
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

      <main className="olw-3d-main" data-testid="billiards-3d-stage">
        {webglError ? (
          <div className="olw-3d-loading">
            <div>{webglError}</div>
            <button type="button" onClick={onExitToMenu} className="olw-billiards-btn-cozy">
              Quay lại chọn Bi-a 2D
            </button>
          </div>
        ) : (
          <div ref={stageHostRef} className="olw-3d-stage" />
        )}

        <div className="olw-3d-left-dock" onPointerDown={(e) => e.stopPropagation()}>
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
            className="olw-power-slot"
            data-testid="billiards-power-slot"
            onPointerDown={(e) => {
              const sim = getSim();
              if (!canHumanInteractNow()) return;
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
          <span className="olw-power-pct" data-testid="billiards-power-pct">
            {powerPct}%
          </span>
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

        <div className="olw-3d-right-dock" onPointerDown={(e) => e.stopPropagation()}>
          <div className="olw-return-track" title="Khay bi đã ăn">
            {returnedIds.map((id) => (
              <span key={id} style={{ background: BALL_COLORS[id] }} className="olw-return-ball">
                {id}
              </span>
            ))}
          </div>
        </div>

        <div className="olw-3d-elev-dock" onPointerDown={(e) => e.stopPropagation()}>
          <span>
            Nâng cơ: <strong style={{ color: '#fbbf24' }}>{elevationDeg}°</strong>
          </span>
          <input
            type="range"
            min={0}
            max={45}
            value={elevationDeg}
            data-testid="billiards-3d-elev-slider"
            onChange={(e) => handleElevationChange(Number(e.target.value))}
            onPointerUp={(e) => e.currentTarget.blur()}
            className="olw-3d-elev-slider"
          />
          <button
            type="button"
            onClick={() => handleElevationChange(0)}
            className="olw-billiards-pill"
            style={{ height: 24, padding: '0 7px', fontSize: 10 }}
          >
            0°
          </button>
        </div>

        {replayBadgeVisible && (
          <div className="olw-3d-replay-badge">● REPLAY SLOW-MO 0.5x</div>
        )}

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
            style={{ position: 'absolute' }}
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
                      const nextStarter: PlayerSlot = winner.slot === 0 ? 1 : 0;
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
      </main>

      {showMenu && (
        <div className="olw-modal-backdrop" onClick={() => setShowMenu(false)}>
          <div className="olw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="olw-modal-row">
              <span style={{ fontSize: 14, fontWeight: 900 }}>Quán Bi-a 3D — Cài đặt</span>
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
                      startNewMatch('8ball', 0);
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
                      startNewMatch('9ball', 0);
                    }}
                    className={`olw-billiards-pill${rule === '9ball' ? ' olw-billiards-pill--active' : ''}`}
                  >
                    9-Bi
                  </button>
                </div>
              </div>
            )}
            <div className="olw-modal-row">
              <span>Màu nỉ bàn</span>
              <button
                type="button"
                onClick={() => setFeltIdx((i) => (i + 1) % FELT_THEMES_3D.length)}
                className="olw-billiards-pill"
              >
                {(FELT_THEMES_3D[feltIdx] ?? FELT_THEMES_3D[0]).name}
              </button>
            </div>
            <div className="olw-modal-row">
              <span>Đồ họa 3D</span>
              <button
                type="button"
                onClick={() => {
                  const order: Billiards3DQuality[] = ['auto', 'low', 'medium', 'high'];
                  const next = order[(order.indexOf(qualityChoice) + 1) % order.length] ?? 'auto';
                  setQualityChoice(next);
                }}
                className="olw-billiards-pill"
              >
                {qualityChoice === 'auto'
                  ? `Tự động (${resolvedQuality})`
                  : qualityChoice === 'low'
                    ? 'Nhẹ'
                    : qualityChoice === 'medium'
                      ? 'Vừa'
                      : 'Cao'}
              </button>
            </div>
            <div className="olw-modal-row">
              <span>Tia ngắm</span>
              <button
                type="button"
                onClick={() => setShowGuide((g) => !g)}
                className="olw-billiards-pill"
              >
                {showGuide ? 'Bật' : 'Tắt'}
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
            {mode !== 'online' && (
              <button
                type="button"
                data-testid="billiards-new-match"
                onClick={() => {
                  setShowMenu(false);
                  startNewMatch(rule, 0);
                }}
                className="olw-billiards-btn-cozy"
              >
                Chơi ván mới
              </button>
            )}
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
            <span style={{ fontSize: 14, fontWeight: 900 }}>Chỉnh Xoáy (Spin) &amp; Nâng Cơ</span>
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
            <div style={{ width: '100%' }}>
              <div className="olw-modal-row" style={{ marginBottom: 4 }}>
                <span>Góc nâng cơ (Massé)</span>
                <strong style={{ color: '#fbbf24' }}>{elevationDeg}°</strong>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                value={elevationDeg}
                onChange={(e) => handleElevationChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#fbbf24' }}
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
                  handleElevationChange(0);
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

export default Billiards3DGame;
