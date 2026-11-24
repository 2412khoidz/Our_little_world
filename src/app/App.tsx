import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gameEventBus, type GameDiagnosticsSnapshot } from '../game/eventBus';
import { getWorldBackend } from '../lib/backend';
import type {
  AuthSessionUser,
  ConnectionStatus,
  LocalPresetAccountId,
  RealtimeHandle,
} from '../lib/backend/types';
import { DEFAULT_AVATAR_PARTNER_A } from '../shared/avatar';
import { getCatalogItem } from '../shared/catalog';
import { getMapDefinition } from '../shared/maps';
import type {
  AvatarConfig,
  Direction,
  FurniturePlacement,
  MapId,
  PresencePayload,
  WorldSnapshot,
} from '../shared/types';
import { AvatarModal } from '../features/avatar/AvatarModal';
import { CoupleActionBar } from '../features/couple/CoupleActionBar';
import { PhotoFrameModal } from '../features/couple/PhotoFrameModal';
import { DecorateDrawer } from '../features/home/DecorateDrawer';
import { GameViewport } from '../features/home/GameViewport';
import { MenuModal } from '../features/home/MenuModal';
import { QuickNavBar } from '../features/home/QuickNavBar';
import { TopStatusBar } from '../features/home/TopStatusBar';
import { InventoryModal } from '../features/inventory/InventoryModal';
import { InviteModal } from '../features/pairing/InviteModal';
import { PetPanel } from '../features/pets/PetPanel';
import { isPetSoundMuted, playPetFeedbackChime, setPetSoundMuted } from '../features/pets/petAudio';
import { PomodoroPanel } from '../features/study/PomodoroPanel';
import { setStudyAmbientTrack, stopStudyAmbient, type AmbientTrack } from '../features/study/ambientAudio';
import { createHugInvite, validateInviteAcceptance } from '../shared/couple/coupleProtocol';
import {
  STATIC_PHOTO_PRESETS,
  type CoupleEmoteId,
  type CoupleEventPacket,
  type CoupleInvitePayload,
  type CouplePostureKind,
} from '../shared/couple/coupleTypes';
import { getSharedKibbleQty } from '../shared/inventory/inventoryRules';
import type { InventorySnapshot } from '../shared/inventory/inventoryTypes';
import type { PetActionType, PetSnapshot } from '../shared/pet/petTypes';
import { deriveStudySessionAt, formatDurationMmSs } from '../shared/study/pomodoro';
import type { StudyControlAction, StudyMode, StudySnapshot } from '../shared/study/studyTypes';
import { OnboardingScreen } from '../features/pairing/OnboardingScreen';
import { IosInstallModal } from '../features/pwa/IosInstallModal';
import { PwaStatusBanner } from '../features/pwa/PwaStatusBanner';

const DevSpikeLabModal = import.meta.env.DEV
  ? lazy(() =>
      import('../features/spike/SpikeLabModal').then((m) => ({
        default: m.SpikeLabModal,
      })),
    )
  : null;

const DevArtDemoShowcase = import.meta.env.DEV
  ? lazy(() =>
      import('../features/artDemos/ArtDemoShowcase').then((m) => ({
        default: m.ArtDemoShowcase,
      })),
    )
  : null;

function readDevArtDemoId(): 'A' | 'B' | 'C' | 'D' | 'E' | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('art-demo');
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase();
  if (normalized === 'B' || normalized === 'C' || normalized === 'D' || normalized === 'E') {
    return normalized;
  }
  return 'A';
}

function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function App() {
  const initialDevArtDemo = useMemo(() => readDevArtDemoId(), []);
  if (import.meta.env.DEV && DevArtDemoShowcase && initialDevArtDemo !== null) {
    return (
      <Suspense
        fallback={
          <main className="onboarding-page">
            <div className="cozy-card" style={{ textAlign: 'center' }}>
              <strong>Đang tải bản thử nghiệm mỹ thuật...</strong>
            </div>
          </main>
        }
      >
        <DevArtDemoShowcase initialDemoId={initialDevArtDemo} />
      </Suspense>
    );
  }

  return <MainCoupleApp />;
}

function MainCoupleApp() {
  const backend = useMemo(() => getWorldBackend(), []);
  const sessionId = useMemo(() => makeSessionId(), []);

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [worldSnapshot, setWorldSnapshot] = useState<WorldSnapshot | null>(null);
  const [currentMapId, setCurrentMapId] = useState<MapId>('home');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [presences, setPresences] = useState<PresencePayload[]>([]);
  const [diagnostics, setDiagnostics] = useState<GameDiagnosticsSnapshot | null>(null);

  // Decorate UI state
  const [decorateActive, setDecorateActive] = useState(false);
  const [activeSku, setActiveSku] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);

  // Modals & settings
  const [activeModal, setActiveModal] = useState<
    null | 'invite' | 'avatar' | 'menu' | 'pwa' | 'spike' | 'inventory' | 'pet' | 'study' | 'photo'
  >(null);
  const [inventorySnapshot, setInventorySnapshot] = useState<InventorySnapshot | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [petSnapshot, setPetSnapshot] = useState<PetSnapshot | null>(null);
  const [petBusy, setPetBusy] = useState(false);
  const [petSoundMutedState, setPetSoundMutedState] = useState(() => isPetSoundMuted());
  const [studySnapshot, setStudySnapshot] = useState<StudySnapshot | null>(null);
  const [studyBusy, setStudyBusy] = useState(false);
  const [studySeat, setStudySeat] = useState<'left' | 'right'>('left');
  const [ambientTrack, setAmbientTrack] = useState<AmbientTrack>('none');
  const [studyClockTick, setStudyClockTick] = useState(0);
  const [localPosture, setLocalPosture] = useState<CouplePostureKind>('none');
  const [incomingHugInvite, setIncomingHugInvite] = useState<CoupleInvitePayload | null>(null);
  const [outgoingInviteExpiresAtMs, setOutgoingInviteExpiresAtMs] = useState<number | null>(null);
  const [coupleClockNowMs, setCoupleClockNowMs] = useState(() => Date.now());
  const [selectedPhotoPresetId, setSelectedPhotoPresetId] = useState<string>(
    STATIC_PHOTO_PRESETS[0]!.id,
  );
  const consumedInviteIdsRef = useRef<Set<string>>(new Set());
  const currentMapIdRef = useRef<MapId>(currentMapId);
  useEffect(() => {
    currentMapIdRef.current = currentMapId;
  }, [currentMapId]);
  const [previewNotice, setPreviewNotice] = useState<{
    title: string;
    body: string;
    version: string;
  } | null>(null);
  const [showJoystick, setShowJoystick] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  );
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const realtimeRef = useRef<RealtimeHandle | null>(null);
  const snapshotRef = useRef<WorldSnapshot | null>(null);
  useEffect(() => {
    snapshotRef.current = worldSnapshot;
  }, [worldSnapshot]);
  const localTileRef = useRef<{ mapId: MapId; tileX: number; tileY: number; facing: Direction }>({
    mapId: 'home',
    tileX: 8,
    tileY: 9,
    facing: 'down',
  });

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3600);
  }, []);

  const refreshWorldSnapshot = useCallback(async () => {
    const res = await backend.getWorldSnapshot();
    if (!res.ok) {
      showToast(res.message, true);
      return;
    }
    setWorldSnapshot(res.data);
  }, [backend, showToast]);

  const refreshInventorySnapshot = useCallback(
    async (explicitWorldId?: string) => {
      const targetWorldId = explicitWorldId ?? snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.inventory) return;
      setInventoryLoading(true);
      const res = await backend.inventory.getInventory(targetWorldId);
      setInventoryLoading(false);
      if (!res.ok) {
        showToast(res.message, true);
        return;
      }
      setInventorySnapshot(res.data);
    },
    [backend, showToast],
  );

  const handleClaimFreeKibble = useCallback(async () => {
    const targetWorldId = snapshotRef.current?.world.id;
    if (!targetWorldId || !backend.inventory) return;
    setInventoryLoading(true);
    const res = await backend.inventory.claimFreeKibble(
      targetWorldId,
      makeIdempotencyKey('claim-kibble'),
    );
    setInventoryLoading(false);
    if (!res.ok) {
      showToast(res.message, true);
      return;
    }
    setInventorySnapshot(res.data);
    realtimeRef.current?.notifyWorldMutated('inventory');
    showToast('Đã thêm 3 phần hạt mèo miễn phí vào túi chung!');
  }, [backend, showToast]);

  const refreshPetSnapshot = useCallback(
    async (explicitWorldId?: string) => {
      const targetWorldId = explicitWorldId ?? snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.pet) return;
      const res = await backend.pet.getPetSnapshot(targetWorldId);
      if (res.ok) {
        setPetSnapshot(res.data);
        gameEventBus.emit('cmd:sync-pet', res.data);
      }
    },
    [backend],
  );

  const handleAdoptOrRenamePet = useCallback(
    async (name: string) => {
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.pet) return;
      setPetBusy(true);
      const res = await backend.pet.adoptOrRenamePet({
        worldId: targetWorldId,
        name,
        expectedVersion: petSnapshot?.version ?? null,
        idempotencyKey: makeIdempotencyKey('pet-name'),
      });
      setPetBusy(false);
      if (!res.ok) {
        showToast(res.message, true);
        if (res.code === 'VERSION_CONFLICT') void refreshPetSnapshot(targetWorldId);
        return;
      }
      setPetSnapshot(res.data);
      gameEventBus.emit('cmd:sync-pet', res.data);
      realtimeRef.current?.notifyWorldMutated('pet');
      playPetFeedbackChime('adopt');
      showToast(`Đã cập nhật bé mèo "${res.data.name}"!`);
    },
    [backend, petSnapshot, refreshPetSnapshot, showToast],
  );

  const handleInteractPet = useCallback(
    async (action: PetActionType) => {
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.pet || !petSnapshot) return;
      setPetBusy(true);
      const res = await backend.pet.interactPet({
        worldId: targetWorldId,
        petId: petSnapshot.id,
        action,
        expectedVersion: petSnapshot.version,
        idempotencyKey: makeIdempotencyKey(`pet-${action}`),
      });
      setPetBusy(false);
      if (!res.ok) {
        showToast(res.message, true);
        if (res.code === 'VERSION_CONFLICT' || res.code === 'COOLDOWN_ACTIVE') {
          void refreshPetSnapshot(targetWorldId);
          void refreshInventorySnapshot(targetWorldId);
        }
        return;
      }
      setPetSnapshot(res.data.pet);
      gameEventBus.emit('cmd:sync-pet', res.data.pet);
      gameEventBus.emit('cmd:pet-reaction', { action });
      if (action === 'feed') {
        void refreshInventorySnapshot(targetWorldId);
        realtimeRef.current?.notifyWorldMutated('inventory');
      }
      realtimeRef.current?.notifyWorldMutated('pet');
      const studyActiveNow = Boolean(studySnapshot?.sharedSession || studySnapshot?.soloSession);
      playPetFeedbackChime(action, studyActiveNow);
      const msg =
        action === 'feed'
          ? `${res.data.pet.name} ăn hạt rất ngon!`
          : action === 'water'
            ? `${res.data.pet.name} đã uống nước mát!`
            : `${res.data.pet.name} đang rừ rừ vui sướng!`;
      showToast(msg);
    },
    [backend, petSnapshot, refreshInventorySnapshot, refreshPetSnapshot, showToast, studySnapshot],
  );

  const refreshStudySnapshot = useCallback(
    async (explicitWorldId?: string) => {
      const targetWorldId = explicitWorldId ?? snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.study) return;
      const res = await backend.study.getStudySnapshot(targetWorldId);
      if (res.ok) {
        setStudySnapshot(res.data);
        const active = Boolean(res.data.sharedSession || res.data.soloSession);
        gameEventBus.emit('cmd:set-study-pet-mode', { active });
      }
    },
    [backend],
  );

  const handleStartStudy = useCallback(
    async (mode: StudyMode, focusMinutes: number, breakMinutes: number) => {
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.study) return;
      setStudyBusy(true);
      const res = await backend.study.startSession({
        worldId: targetWorldId,
        mode,
        focusMinutes,
        breakMinutes,
        idempotencyKey: makeIdempotencyKey('study-start'),
      });
      setStudyBusy(false);
      if (!res.ok) {
        showToast(res.message, true);
        if (res.code === 'VERSION_CONFLICT') void refreshStudySnapshot(targetWorldId);
        return;
      }
      setStudySnapshot(res.data);
      gameEventBus.emit('cmd:set-study-pet-mode', { active: true });
      if (currentMapId === 'home') {
        gameEventBus.emit('cmd:seat-at-desk', { seat: studySeat });
      }
      if (mode === 'shared') realtimeRef.current?.notifyWorldMutated('study');
      showToast(mode === 'shared' ? 'Đã mở phiên học chung!' : 'Đã bắt đầu phiên học cá nhân.');
    },
    [backend, currentMapId, refreshStudySnapshot, showToast, studySeat],
  );

  const handleControlStudy = useCallback(
    async (sessionId: string, action: StudyControlAction, expectedVersion: number) => {
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.study) return;
      setStudyBusy(true);
      const res = await backend.study.controlSession({
        worldId: targetWorldId,
        sessionId,
        action,
        expectedVersion,
        idempotencyKey: makeIdempotencyKey(`study-${action}`),
      });
      setStudyBusy(false);
      if (!res.ok) {
        showToast(res.message, true);
        if (res.code === 'VERSION_CONFLICT') void refreshStudySnapshot(targetWorldId);
        return;
      }
      setStudySnapshot(res.data);
      const active = Boolean(res.data.sharedSession || res.data.soloSession);
      gameEventBus.emit('cmd:set-study-pet-mode', { active });
      realtimeRef.current?.notifyWorldMutated('study');
      if (action === 'finish') {
        stopStudyAmbient();
        setAmbientTrack('none');
      }
    },
    [backend, refreshStudySnapshot, showToast],
  );

  useEffect(() => {
    const activeSession = studySnapshot?.sharedSession ?? studySnapshot?.soloSession;
    if (!activeSession) return;
    const id = window.setInterval(() => setStudyClockTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [studySnapshot]);

  useEffect(() => () => stopStudyAmbient(), []);

  useEffect(() => {
    if (!incomingHugInvite && !outgoingInviteExpiresAtMs) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setCoupleClockNowMs(now);
      setIncomingHugInvite((prev) => (prev && now >= prev.expiresAtMs ? null : prev));
      setOutgoingInviteExpiresAtMs((prev) => (prev && now >= prev ? null : prev));
    }, 1000);
    return () => window.clearInterval(id);
  }, [incomingHugInvite, outgoingInviteExpiresAtMs]);

  const handleCoupleEvent = useCallback(
    (packet: CoupleEventPacket) => {
      if (!currentUser || packet.worldId !== snapshotRef.current?.world.id) return;
      if (packet.type === 'COUPLE_EMOTE') {
        if (packet.userId !== currentUser.userId) {
          gameEventBus.emit('cmd:spawn-emote', {
            userId: packet.userId,
            mapId: packet.mapId,
            emote: packet.emote,
          });
        }
        return;
      }
      if (packet.type === 'COUPLE_POSTURE') {
        if (packet.userId !== currentUser.userId) {
          gameEventBus.emit('cmd:sync-remote-posture', {
            userId: packet.userId,
            mapId: packet.mapId,
            posture: packet.posture,
            x: packet.x,
            y: packet.y,
            facing: packet.facing,
          });
        }
        return;
      }
      if (packet.type === 'COUPLE_INVITE') {
        if (
          packet.toUserId === currentUser.userId &&
          !consumedInviteIdsRef.current.has(packet.inviteId) &&
          Date.now() < packet.expiresAtMs
        ) {
          setCoupleClockNowMs(Date.now());
          setIncomingHugInvite(packet);
        }
        return;
      }
      if (packet.type === 'COUPLE_ACCEPT') {
        if (packet.toUserId === currentUser.userId || packet.fromUserId === currentUser.userId) {
          consumedInviteIdsRef.current.add(packet.inviteId);
          setOutgoingInviteExpiresAtMs(null);
          setIncomingHugInvite(null);
          if (currentMapIdRef.current === packet.mapId) {
            const isInviter = packet.toUserId === currentUser.userId;
            const targetX = packet.anchorX + (isInviter ? -7 : 7);
            const targetY = packet.anchorY;
            const targetFacing: Direction = isInviter ? 'right' : 'left';
            setLocalPosture('hug');
            gameEventBus.emit('cmd:apply-local-posture', {
              posture: 'hug',
              x: targetX,
              y: targetY,
              facing: targetFacing,
            });
            gameEventBus.emit('cmd:spawn-emote', {
              userId: currentUser.userId,
              mapId: packet.mapId,
              emote: 'hug_hearts',
              local: true,
            });
          }
          showToast('Hai người vừa ôm nhau một cái thật ấm ❤️');
        }
        return;
      }
      if (packet.type === 'COUPLE_DECLINE') {
        if (packet.toUserId === currentUser.userId) {
          setOutgoingInviteExpiresAtMs(null);
          showToast('Người thương hẹn ôm sau một lát nhé.');
        }
        return;
      }
      if (packet.type === 'COUPLE_END') {
        if (packet.userId !== currentUser.userId) {
          gameEventBus.emit('cmd:sync-remote-posture', {
            userId: packet.userId,
            mapId: currentMapIdRef.current,
            posture: 'none',
            x: 0,
            y: 0,
            facing: 'down',
          });
        }
      }
    },
    [currentUser, showToast],
  );
  const handleCoupleEventRef = useRef(handleCoupleEvent);
  useEffect(() => {
    handleCoupleEventRef.current = handleCoupleEvent;
  }, [handleCoupleEvent]);

  const handleSendEmote = useCallback(
    (emote: CoupleEmoteId) => {
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !currentUser) return;
      gameEventBus.emit('cmd:spawn-emote', {
        userId: currentUser.userId,
        mapId: currentMapId,
        emote,
        local: true,
      });
      realtimeRef.current?.publishCoupleEvent?.({
        type: 'COUPLE_EMOTE',
        worldId: targetWorldId,
        userId: currentUser.userId,
        mapId: currentMapId,
        emote,
        sentAtMs: Date.now(),
      });
    },
    [currentMapId, currentUser],
  );

  const handleRequestHug = useCallback(() => {
    const snap = snapshotRef.current;
    if (!snap || !currentUser) return;
    const partner = presences.find(
      (p) => p.userId !== currentUser.userId && p.mapId === currentMapId,
    );
    if (!partner) {
      showToast('Hãy vào cùng một phòng với người thương để ôm nhau nhé.', true);
      return;
    }
    const now = Date.now();
    const anchorX = Math.round(((localTileRef.current.tileX + 0.5) * 16 + (partner.tileX + 0.5) * 16) / 2);
    const anchorY = Math.round(((localTileRef.current.tileY + 1) * 16 + (partner.tileY + 1) * 16) / 2);
    const invite = createHugInvite({
      inviteId: makeIdempotencyKey('hug'),
      worldId: snap.world.id,
      fromUserId: currentUser.userId,
      fromSessionId: sessionId,
      toUserId: partner.userId,
      mapId: currentMapId,
      anchorX,
      anchorY,
      nowMs: now,
    });
    setCoupleClockNowMs(now);
    setOutgoingInviteExpiresAtMs(invite.expiresAtMs);
    realtimeRef.current?.publishCoupleEvent?.(invite);
    showToast('Đã gửi lời mời ôm nhau (15 giây)...');
  }, [currentMapId, currentUser, presences, sessionId, showToast]);

  const handleAcceptHug = useCallback(() => {
    if (!incomingHugInvite || !currentUser) return;
    const check = validateInviteAcceptance(
      incomingHugInvite,
      currentUser.userId,
      currentMapId,
      Date.now(),
      consumedInviteIdsRef.current,
    );
    if (!check.ok) {
      setIncomingHugInvite(null);
      showToast('Lời mời ôm đã hết hạn hoặc không còn ở cùng phòng.', true);
      return;
    }
    consumedInviteIdsRef.current.add(incomingHugInvite.inviteId);
    setIncomingHugInvite(null);
    realtimeRef.current?.publishCoupleEvent?.(check.accept);
    setLocalPosture('hug');
    gameEventBus.emit('cmd:apply-local-posture', {
      posture: 'hug',
      x: check.accept.anchorX + 7,
      y: check.accept.anchorY,
      facing: 'left',
    });
    gameEventBus.emit('cmd:spawn-emote', {
      userId: currentUser.userId,
      mapId: check.accept.mapId,
      emote: 'hug_hearts',
      local: true,
    });
  }, [currentMapId, currentUser, incomingHugInvite, showToast]);

  const handleDeclineHug = useCallback(() => {
    if (!incomingHugInvite || !currentUser) return;
    realtimeRef.current?.publishCoupleEvent?.({
      type: 'COUPLE_DECLINE',
      inviteId: incomingHugInvite.inviteId,
      worldId: incomingHugInvite.worldId,
      fromUserId: currentUser.userId,
      toUserId: incomingHugInvite.fromUserId,
    });
    setIncomingHugInvite(null);
  }, [currentUser, incomingHugInvite]);

  const handleStandUp = useCallback(() => {
    setLocalPosture('none');
    gameEventBus.emit('cmd:cancel-local-posture');
  }, []);

  // Initial auth bootstrap & subscription
  useEffect(() => {
    let active = true;
    void backend.getCurrentUser().then(async (user) => {
      if (!active) return;
      setCurrentUser(user);
      if (user) {
        const snapRes = await backend.getWorldSnapshot();
        if (active && snapRes.ok) {
          setWorldSnapshot(snapRes.data);
        }
      }
      setAuthReady(true);
    });

    const unsubAuth = backend.onAuthChange(async (user) => {
      if (!user) {
        setCurrentUser(null);
        setWorldSnapshot(null);
        setPresences([]);
        return;
      }
      const snapRes = await backend.getWorldSnapshot();
      setCurrentUser(user);
      setWorldSnapshot(snapRes.ok ? snapRes.data : null);
    });

    return () => {
      active = false;
      unsubAuth();
    };
  }, [backend]);

  const worldId = worldSnapshot?.world.id ?? null;
  const localMember = useMemo(
    () => worldSnapshot?.members.find((m) => m.userId === currentUser?.userId) ?? null,
    [worldSnapshot, currentUser],
  );
  const localMemberRef = useRef(localMember);
  useEffect(() => {
    localMemberRef.current = localMember;
  }, [localMember]);

  // Realtime connection lifecycle for the paired world
  useEffect(() => {
    const memberSnapshot = localMemberRef.current;
    if (!worldId || !currentUser || !memberSnapshot) return;

    let cancelled = false;
    const initialPresence: PresencePayload = {
      userId: currentUser.userId,
      sessionId,
      mapId: localTileRef.current.mapId,
      nickname: memberSnapshot.nickname,
      avatarConfig: memberSnapshot.avatarConfig,
      tileX: localTileRef.current.tileX,
      tileY: localTileRef.current.tileY,
      facing: localTileRef.current.facing,
      updatedAtMs: Date.now(),
    };

    void backend
      .connectWorldRealtime(worldId, initialPresence, {
        onPresenceChange: (list) => {
          setPresences(list);
        },
        onMovement: (packet) => {
          gameEventBus.emit('cmd:remote-movement', packet);
        },
        onWorldMutated: (reason) => {
          if (reason === 'inventory') {
            void refreshInventorySnapshot(worldId);
          } else if (reason === 'pet') {
            void refreshPetSnapshot(worldId);
          } else if (reason === 'study') {
            void refreshStudySnapshot(worldId);
          } else {
            void refreshWorldSnapshot();
          }
        },
        onConnectionChange: (status) => {
          setConnectionStatus(status);
        },
        onCoupleEvent: (packet) => {
          handleCoupleEventRef.current(packet);
        },
      })
      .then((handle) => {
        if (cancelled) {
          void handle.disconnect();
          return;
        }
        realtimeRef.current = handle;
        void refreshInventorySnapshot(worldId);
        void refreshPetSnapshot(worldId);
        void refreshStudySnapshot(worldId);
      });

    return () => {
      cancelled = true;
      const existing = realtimeRef.current;
      realtimeRef.current = null;
      if (existing) {
        void existing.disconnect();
      }
    };
  }, [backend, worldId, currentUser, sessionId, refreshWorldSnapshot, refreshInventorySnapshot, refreshPetSnapshot, refreshStudySnapshot]);

  // Keep presence metadata synchronized when map/avatar changes
  useEffect(() => {
    if (!realtimeRef.current || !currentUser || !localMember) return;
    realtimeRef.current.updatePresence({
      userId: currentUser.userId,
      sessionId,
      mapId: currentMapId,
      nickname: localMember.nickname,
      avatarConfig: localMember.avatarConfig,
      tileX: localTileRef.current.tileX,
      tileY: localTileRef.current.tileY,
      facing: localTileRef.current.facing,
      updatedAtMs: Date.now(),
    });
  }, [currentMapId, localMember, currentUser, sessionId]);

  // Visibility & network reconnect flow (crucial for iPhone Safari background/lock resume)
  const handleReconnectAndResync = useCallback(async () => {
    if (!realtimeRef.current || !snapshotRef.current) return;
    await realtimeRef.current.reconnect();
    await refreshWorldSnapshot();
  }, [refreshWorldSnapshot]);

  const handleSimulateOffline = useCallback((offline: boolean) => {
    realtimeRef.current?.setSimulatedOffline?.(offline);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden && snapshotRef.current) {
        void handleReconnectAndResync();
      }
    };
    const onOnline = () => {
      if (snapshotRef.current) {
        showToast('Đã kết nối lại — ngôi nhà đã được đồng bộ.');
        void handleReconnectAndResync();
      }
    };
    const onOffline = () => {
      setConnectionStatus('offline');
      showToast('Đang tạm mất mạng — ứng dụng sẽ tự kết nối lại khi có mạng.', true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [handleReconnectAndResync, showToast]);

  // Listen to Phaser events
  useEffect(() => {
    const unsubMove = gameEventBus.on('evt:local-movement', (pkt) => {
      realtimeRef.current?.publishMovement(pkt);
    });

    const unsubTile = gameEventBus.on('evt:local-tile-changed', (tile) => {
      localTileRef.current = tile;
    });

    const unsubMapReq = gameEventBus.on('evt:request-map-change', ({ targetMapId, spawnX, spawnY }) => {
      setDecorateActive(false);
      setActiveSku(null);
      setSelectedPlacementId(null);
      setCurrentMapId(targetMapId);
      gameEventBus.emit('cmd:set-map', {
        mapId: targetMapId,
        spawnTile: { tileX: spawnX, tileY: spawnY },
      });
    });

    const unsubAvatar = gameEventBus.on('evt:open-avatar-customizer', () => {
      setActiveModal('avatar');
    });

    const unsubPetPanel = gameEventBus.on('evt:open-pet-panel', () => {
      setActiveModal('pet');
      void refreshPetSnapshot();
      void refreshInventorySnapshot();
    });

    const unsubStudyPanel = gameEventBus.on('evt:open-study-panel', () => {
      setActiveModal('study');
      void refreshStudySnapshot();
      gameEventBus.emit('cmd:seat-at-desk', { seat: studySeat });
    });

    const unsubSceneReady = gameEventBus.on('evt:scene-ready', () => {
      void refreshPetSnapshot();
      void refreshStudySnapshot();
    });

    const unsubPreview = gameEventBus.on('evt:preview-notice', (notice) => {
      setPreviewNotice(notice);
    });

    const unsubSelect = gameEventBus.on('evt:decorate-select', ({ placementId }) => {
      setSelectedPlacementId(placementId);
    });

    const unsubDiag = gameEventBus.on('evt:diagnostics', (diag) => {
      setDiagnostics(diag);
    });

    const unsubPhoto = gameEventBus.on('evt:open-photo-frame', () => {
      setActiveModal('photo');
    });

    const unsubPosture = gameEventBus.on('evt:local-posture-changed', (evt) => {
      setLocalPosture(evt.posture);
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !currentUser) return;
      realtimeRef.current?.publishCoupleEvent?.({
        type: 'COUPLE_POSTURE',
        worldId: targetWorldId,
        userId: currentUser.userId,
        mapId: evt.mapId,
        posture: evt.posture,
        slotIndex: evt.slotIndex,
        x: evt.x,
        y: evt.y,
        facing: evt.facing,
      });
    });

    return () => {
      unsubMove();
      unsubTile();
      unsubMapReq();
      unsubAvatar();
      unsubPetPanel();
      unsubStudyPanel();
      unsubSceneReady();
      unsubPreview();
      unsubSelect();
      unsubDiag();
      unsubPhoto();
      unsubPosture();
    };
  }, [currentUser, refreshInventorySnapshot, refreshPetSnapshot, refreshStudySnapshot, studySeat]);

  // Atomic furniture mutations with optimistic UI + rollback
  const handlePlaceRequest = useCallback(
    async ({ mapId, sku, tileX, tileY }: { mapId: MapId; sku: string; tileX: number; tileY: number }) => {
      const snap = snapshotRef.current;
      if (!snap || !currentUser || mutationBusy) return;
      if (connectionStatus === 'offline') {
        showToast('Đang ngoại tuyến — không thể lưu trang trí lúc này.', true);
        return;
      }
      const item = getCatalogItem(sku);
      if (!item) return;

      const prevSnap = snap;
      const optimisticItem: FurniturePlacement = {
        id: `optimistic-${Date.now()}`,
        worldId: snap.world.id,
        mapId,
        sku,
        layerSlot: item.layerSlot,
        tileX,
        tileY,
        widthTiles: item.widthTiles,
        heightTiles: item.heightTiles,
        updatedBy: currentUser.userId,
        updatedAt: new Date().toISOString(),
      };

      setMutationBusy(true);
      setWorldSnapshot({
        ...snap,
        placements: [...snap.placements, optimisticItem],
      });

      const res = await backend.placeFurniture({
        worldId: snap.world.id,
        mapId,
        sku,
        tileX,
        tileY,
        expectedLayoutVersion: snap.world.layoutVersion,
        idempotencyKey: makeIdempotencyKey('place'),
      });
      setMutationBusy(false);

      if (!res.ok) {
        // Rollback optimistic placement and refetch latest state on conflict
        setWorldSnapshot(prevSnap);
        showToast(res.message, true);
        if (res.code === 'VERSION_CONFLICT' || res.code === 'TILE_OCCUPIED') {
          await refreshWorldSnapshot();
        }
        return;
      }

      setWorldSnapshot((cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          world: { ...cur.world, layoutVersion: res.data.layoutVersion },
          placements: cur.placements.map((p) =>
            p.id === optimisticItem.id ? res.data.placement : p,
          ),
        };
      });
      realtimeRef.current?.notifyWorldMutated('furniture');
      setActiveSku(null);
      showToast(`Đã đặt ${item.nameVi}`);
    },
    [backend, connectionStatus, currentUser, mutationBusy, refreshWorldSnapshot, showToast],
  );

  const handleMoveRequest = useCallback(
    async ({ placementId, tileX, tileY }: { placementId: string; tileX: number; tileY: number }) => {
      const snap = snapshotRef.current;
      if (!snap || !currentUser || mutationBusy) return;
      if (connectionStatus === 'offline') {
        showToast('Đang ngoại tuyến — không thể di chuyển đồ lúc này.', true);
        return;
      }
      const existing = snap.placements.find((p) => p.id === placementId);
      if (!existing) return;

      const prevSnap = snap;
      setMutationBusy(true);
      setWorldSnapshot({
        ...snap,
        placements: snap.placements.map((p) =>
          p.id === placementId ? { ...p, tileX, tileY } : p,
        ),
      });

      const res = await backend.moveFurniture({
        worldId: snap.world.id,
        placementId,
        tileX,
        tileY,
        expectedLayoutVersion: snap.world.layoutVersion,
        idempotencyKey: makeIdempotencyKey('move'),
      });
      setMutationBusy(false);

      if (!res.ok) {
        setWorldSnapshot(prevSnap);
        showToast(res.message, true);
        if (res.code === 'VERSION_CONFLICT' || res.code === 'TILE_OCCUPIED') {
          await refreshWorldSnapshot();
        }
        return;
      }

      setWorldSnapshot((cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          world: { ...cur.world, layoutVersion: res.data.layoutVersion },
          placements: cur.placements.map((p) =>
            p.id === placementId ? res.data.placement : p,
          ),
        };
      });
      realtimeRef.current?.notifyWorldMutated('furniture');
      setSelectedPlacementId(null);
      showToast('Đã di chuyển đồ đạc');
    },
    [backend, connectionStatus, currentUser, mutationBusy, refreshWorldSnapshot, showToast],
  );

  const handleRemovePlacement = useCallback(
    async (placementId: string) => {
      const snap = snapshotRef.current;
      if (!snap || mutationBusy) return;
      if (connectionStatus === 'offline') {
        showToast('Đang ngoại tuyến — không thể cất đồ lúc này.', true);
        return;
      }

      const prevSnap = snap;
      setMutationBusy(true);
      setWorldSnapshot({
        ...snap,
        placements: snap.placements.filter((p) => p.id !== placementId),
      });

      const res = await backend.removeFurniture({
        worldId: snap.world.id,
        placementId,
        expectedLayoutVersion: snap.world.layoutVersion,
        idempotencyKey: makeIdempotencyKey('remove'),
      });
      setMutationBusy(false);

      if (!res.ok) {
        setWorldSnapshot(prevSnap);
        showToast(res.message, true);
        await refreshWorldSnapshot();
        return;
      }

      setWorldSnapshot((cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          world: { ...cur.world, layoutVersion: res.data.layoutVersion },
          placements: cur.placements.filter((p) => p.id !== placementId),
        };
      });
      realtimeRef.current?.notifyWorldMutated('furniture');
      setSelectedPlacementId(null);
      showToast('Đã cất món đồ vào túi');
    },
    [backend, connectionStatus, mutationBusy, refreshWorldSnapshot, showToast],
  );

  useEffect(() => {
    const unsubPlace = gameEventBus.on('evt:decorate-place', (req) => {
      void handlePlaceRequest(req);
    });
    const unsubMove = gameEventBus.on('evt:decorate-move', (req) => {
      void handleMoveRequest(req);
    });
    return () => {
      unsubPlace();
      unsubMove();
    };
  }, [handlePlaceRequest, handleMoveRequest]);

  async function handleSaveAvatar(nickname: string, config: AvatarConfig): Promise<boolean> {
    const res = await backend.updateProfile(nickname, config);
    if (!res.ok) {
      showToast(res.message, true);
      return false;
    }
    await refreshWorldSnapshot();
    realtimeRef.current?.notifyWorldMutated('profile');
    showToast('Đã cập nhật ngoại hình');
    return true;
  }

  const handleQuickSwitchDev = useCallback(
    async (preset: LocalPresetAccountId) => {
      if (!import.meta.env.DEV) return;
      await backend.signInLocalPreset?.(preset);
    },
    [backend],
  );

  const handleResetDevWorld = useCallback(async () => {
    if (!import.meta.env.DEV || !backend.resetDevWorld) return;
    await backend.resetDevWorld();
    await backend.signOut();
  }, [backend]);

  function handleSelectMap(target: MapId) {
    setDecorateActive(false);
    setActiveSku(null);
    setSelectedPlacementId(null);
    setCurrentMapId(target);
    const def = getMapDefinition(target);
    gameEventBus.emit('cmd:set-map', {
      mapId: target,
      spawnTile: def.defaultSpawn,
    });
  }

  if (!authReady) {
    return (
      <main className="onboarding-page">
        <div className="cozy-card" style={{ textAlign: 'center' }}>
          <strong>Đang mở Our Little World...</strong>
        </div>
      </main>
    );
  }

  if (!currentUser || !worldSnapshot) {
    return (
      <>
        <PwaStatusBanner />
        <OnboardingScreen
          backend={backend}
          currentUser={currentUser}
          onEnterWorld={(snap) => setWorldSnapshot(snap)}
        />
      </>
    );
  }

  const isAnyModalOpen = activeModal !== null || previewNotice !== null;
  const activeFloatingStudy = studySnapshot?.sharedSession ?? studySnapshot?.soloSession ?? null;
  const derivedFloatingStudy = activeFloatingStudy
    ? deriveStudySessionAt(
        activeFloatingStudy,
        (studySnapshot?.serverNowMs ?? 0) + studyClockTick * 1000,
      )
    : null;

  return (
    <div className="app-shell">
      <PwaStatusBanner />

      <TopStatusBar
        worldName={worldSnapshot.world.name}
        currentMapId={currentMapId}
        backendMode={backend.mode}
        connectionStatus={connectionStatus}
        members={worldSnapshot.members}
        localUserId={currentUser.userId}
        presences={presences}
        onOpenInvite={() => setActiveModal('invite')}
      />

      {activeFloatingStudy && derivedFloatingStudy && derivedFloatingStudy.status !== 'completed' && (
        <button
          type="button"
          className="pill"
          data-testid="study-floating-pill"
          onClick={() => setActiveModal('study')}
          style={{
            position: 'fixed',
            top: 52,
            right: 12,
            zIndex: 25,
            background: 'rgba(40, 30, 36, 0.88)',
            borderColor: '#f4c158',
            color: '#fff8ef',
            cursor: 'pointer',
          }}
        >
          <span>
            {derivedFloatingStudy.phase === 'focus' ? 'Tập trung' : 'Nghỉ mắt'}{' '}
            {formatDurationMmSs(derivedFloatingStudy.remainingMs)}
          </span>
        </button>
      )}

      <GameViewport
        worldId={worldSnapshot.world.id}
        localUserId={currentUser.userId}
        sessionId={sessionId}
        currentMapId={currentMapId}
        members={worldSnapshot.members}
        placements={worldSnapshot.placements}
        presences={presences}
        decorateActive={decorateActive}
        activeSku={activeSku}
        selectedPlacementId={selectedPlacementId}
        showJoystick={showJoystick}
        isModalOpen={isAnyModalOpen}
        toast={toast}
      />

      {!decorateActive && !isAnyModalOpen && (
        <CoupleActionBar
          partnerOnlineSameRoom={presences.some(
            (p) => p.userId !== currentUser.userId && p.mapId === currentMapId,
          )}
          localPosture={localPosture}
          incomingInvite={incomingHugInvite}
          inviteRemainingSec={
            incomingHugInvite
              ? Math.max(0, Math.ceil((incomingHugInvite.expiresAtMs - coupleClockNowMs) / 1000))
              : 0
          }
          outgoingInviteActive={outgoingInviteExpiresAtMs !== null}
          onSendEmote={handleSendEmote}
          onRequestHug={handleRequestHug}
          onAcceptHug={handleAcceptHug}
          onDeclineHug={handleDeclineHug}
          onStandUp={handleStandUp}
        />
      )}

      {decorateActive ? (
        <DecorateDrawer
          currentMapId={currentMapId}
          placements={worldSnapshot.placements}
          activeSku={activeSku}
          selectedPlacementId={selectedPlacementId}
          busy={mutationBusy}
          onSelectSku={(sku) => {
            setSelectedPlacementId(null);
            setActiveSku(sku);
          }}
          onRemovePlacement={(id) => void handleRemovePlacement(id)}
          onClearSelection={() => setSelectedPlacementId(null)}
          onExit={() => {
            setDecorateActive(false);
            setActiveSku(null);
            setSelectedPlacementId(null);
          }}
        />
      ) : (
        <QuickNavBar
          currentMapId={currentMapId}
          decorateActive={decorateActive}
          onSelectMap={handleSelectMap}
          onToggleDecorate={() => {
            setDecorateActive(true);
            setActiveSku(null);
            setSelectedPlacementId(null);
          }}
          onOpenAvatar={() => setActiveModal('avatar')}
          onOpenMenu={() => setActiveModal('menu')}
        />
      )}

      {activeModal === 'invite' && (
        <InviteModal
          backend={backend}
          worldId={worldSnapshot.world.id}
          members={worldSnapshot.members}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'avatar' && (
        <AvatarModal
          initialNickname={localMember?.nickname ?? 'Bạn'}
          initialConfig={localMember?.avatarConfig ?? DEFAULT_AVATAR_PARTNER_A}
          onSave={handleSaveAvatar}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'menu' && (
        <MenuModal
          worldName={worldSnapshot.world.name}
          backendMode={backend.mode}
          showJoystick={showJoystick}
          onToggleJoystick={() => setShowJoystick((s) => !s)}
          onOpenInvite={() => setActiveModal('invite')}
          onOpenInventory={
            backend.inventory
              ? () => {
                  setActiveModal('inventory');
                  void refreshInventorySnapshot();
                }
              : undefined
          }
          onOpenPet={
            backend.pet
              ? () => {
                  setActiveModal('pet');
                  void refreshPetSnapshot();
                  void refreshInventorySnapshot();
                }
              : undefined
          }
          onOpenStudy={
            backend.study
              ? () => {
                  setActiveModal('study');
                  void refreshStudySnapshot();
                }
              : undefined
          }
          onOpenPwaGuide={() => setActiveModal('pwa')}
          onOpenSpikeLab={() => {
            if (import.meta.env.DEV) setActiveModal('spike');
          }}
          onQuickSwitchDev={
            import.meta.env.DEV && backend.mode === 'dev-lan'
              ? (preset) => void handleQuickSwitchDev(preset)
              : undefined
          }
          onResetDevWorld={
            import.meta.env.DEV && backend.mode === 'dev-lan'
              ? () => void handleResetDevWorld()
              : undefined
          }
          onSignOut={() => {
            setActiveModal(null);
            void backend.signOut();
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'pwa' && <IosInstallModal onClose={() => setActiveModal(null)} />}

      {activeModal === 'inventory' && backend.inventory && (
        <InventoryModal
          snapshot={inventorySnapshot}
          localUserId={currentUser.userId}
          loading={inventoryLoading}
          onClaimFreeKibble={handleClaimFreeKibble}
          onRefresh={() => refreshInventorySnapshot()}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'pet' && backend.pet && (
        <PetPanel
          pet={petSnapshot}
          kibbleCount={getSharedKibbleQty(inventorySnapshot?.items ?? [])}
          canClaimFreeKibble={Boolean(inventorySnapshot?.canClaimFreeKibble)}
          busy={petBusy}
          muted={petSoundMutedState}
          onToggleMute={() => {
            const next = !petSoundMutedState;
            setPetSoundMuted(next);
            setPetSoundMutedState(next);
          }}
          onAdoptOrRename={handleAdoptOrRenamePet}
          onInteract={handleInteractPet}
          onClaimFreeKibble={handleClaimFreeKibble}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'study' && backend.study && (
        <PomodoroPanel
          snapshot={studySnapshot}
          localUserId={currentUser.userId}
          members={worldSnapshot.members}
          busy={studyBusy}
          ambientTrack={ambientTrack}
          selectedSeat={studySeat}
          onSelectSeat={(seat) => {
            setStudySeat(seat);
            if (currentMapId === 'home') {
              gameEventBus.emit('cmd:seat-at-desk', { seat });
            }
          }}
          onChangeAmbient={(track) => setAmbientTrack(setStudyAmbientTrack(track))}
          onStartSession={handleStartStudy}
          onControlSession={handleControlStudy}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'photo' && (
        <PhotoFrameModal
          selectedPresetId={selectedPhotoPresetId}
          onSelectPreset={setSelectedPhotoPresetId}
          onClose={() => setActiveModal(null)}
        />
      )}

      {import.meta.env.DEV && DevSpikeLabModal && activeModal === 'spike' && (
        <Suspense fallback={null}>
          <DevSpikeLabModal
            backend={backend}
            worldId={worldSnapshot.world.id}
            localUserId={currentUser.userId}
            diagnostics={diagnostics}
            connectionStatus={connectionStatus}
            onSimulateOffline={
              backend.mode === 'dev-lan' || backend.mode === 'local-preview'
                ? handleSimulateOffline
                : undefined
            }
            onForceReconnect={handleReconnectAndResync}
            onClose={() => setActiveModal(null)}
          />
        </Suspense>
      )}

      {previewNotice && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={previewNotice.title}
        >
          <div className="modal-panel">
            <div className="modal-header">
              <h2 className="modal-title">{previewNotice.title}</h2>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setPreviewNotice(null)}
              >
                Đóng
              </button>
            </div>
            <div className="cozy-alert">
              <strong>{previewNotice.version} (Chưa mở)</strong>
              <p style={{ margin: '6px 0 0' }}>{previewNotice.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
