import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { normalizeMapId } from '../shared/world/mapIdCompat';
import { resolveEnvHookForMapChange, resolveEnvHookForTravel } from '../shared/world/envInteractionHooks';
import type { SharedPetCarePatch } from '../shared/petLiving/petCare/sharedPetCareSession';
import type { PetCareSessionEventPacket } from '../shared/petLiving/petCare/sharedPetCareTypes';
import { isPetCareModeActive } from '../shared/petLiving/petCare/petCareModeFlag';
import { isExtendedWorldDevEnabled } from '../shared/worldIntegration/extendedWorldDevFlag';
import type {
  AvatarConfig,
  Direction,
  FurniturePlacement,
  MapId,
  PresencePayload,
  WorldSnapshot,
} from '../shared/types';
import { AvatarModal } from '../features/avatar/AvatarModal';
import { CoupleEmoteDock } from '../features/couple/CoupleEmoteDock';
import { PhotoFrameModal } from '../features/couple/PhotoFrameModal';
import { DecorateDrawer } from '../features/home/DecorateDrawer';
import { GameViewport } from '../features/home/GameViewport';
import { OutdoorWorldNavSheet } from '../features/home/OutdoorWorldNavSheet';
import {
  defaultDecorateMapId,
  isDecorateMapId,
  type DecorateMapId,
} from '../shared/decorate/decorateInteriorPolicy';
import { footprintForCatalog } from '../shared/decorate/decoratePlacementLoop';
import { MainGameInteractionLayer } from '../features/home/MainGameInteractionLayer';
import { LivingPetDevBanner } from '../features/home/LivingPetDevBanner';
import { ExtendedWorldDevBanner } from '../features/home/ExtendedWorldDevBanner';
import { registerLivingPetDevAcceptanceHooks } from '../shared/petLiving/mainGame/livingPetDevAcceptance';
import { consumeHandFoodInCare } from '../features/petCare/petCareHandFeedAuthority';
import { PetCareTouchOverlay } from '../features/petCare/PetCareTouchOverlay';
import { MenuModal } from '../features/home/MenuModal';
import { QuickNavBar } from '../features/home/QuickNavBar';
import { TopStatusBar } from '../features/home/TopStatusBar';
import { WorldClockHud } from '../features/home/WorldClockHud';
import {
  loadTimeOfDayMode,
  resolveWorldClockPresentation,
  saveTimeOfDayMode,
  type TimeOfDayMode,
} from '../shared/world/worldClock';
import { FarmEconomyPanel } from '../features/farming/FarmEconomyPanel';
import { farmContextFromWorldClock } from '../shared/farming/farmWorldClockBridge';
import { ChillFishingModal } from '../features/donor/ChillFishingModal';
import { TensionFishingModal } from '../features/donor/TensionFishingModal';
import { DonorWorkshopModal } from '../features/donor/DonorWorkshopModal';
import { isDonorLanPlayableMode, setDevLanDonorUiActive } from '../shared/donor/donorEconomyUiFlag';
import type { DonorFishingSpotId } from '../shared/donor/donorFishingSpots';
import { parseDonorFishingSpot } from '../shared/donor/donorFishingSpots';
import type { DonorWorkshopFocus } from '../shared/donor/donorWorkshopFocus';
import { getCropDefinition } from '../shared/farming/crops';
import type { FarmPlotView, FarmSnapshot } from '../shared/farming/farmSnapshotTypes';
import { InventoryModal } from '../features/inventory/InventoryModal';
import { buildHotbarSlotsFromInventory } from '../shared/interaction/inventoryHotbarAdapter';
import { MailboxModal } from '../features/mailbox/MailboxModal';
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
import { getSharedKibbleQty, PET_KIBBLE_BASIC_SKU } from '../shared/inventory/inventoryRules';
import type { InventorySnapshot } from '../shared/inventory/inventoryTypes';
import type { MailboxGiftSourceScope, MailboxSnapshot } from '../shared/mailbox/mailboxTypes';
import type { PetActionType, PetSnapshot } from '../shared/pet/petTypes';
import { getPetActionCooldownRemainingMs } from '../shared/pet/petNeeds';
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

const DevConsoleDrawer = import.meta.env.DEV
  ? lazy(() =>
      import('../features/devConsole/DevConsoleDrawer').then((m) => ({
        default: m.DevConsoleDrawer,
      })),
    )
  : null;

const DevV03PrototypesModal = import.meta.env.DEV
  ? lazy(() =>
      import('../features/devPrototypes/V03PrototypesModal').then((m) => ({
        default: m.V03PrototypesModal,
      })),
    )
  : null;

const DevPetArtSandbox = import.meta.env.DEV
  ? lazy(() => import('../features/sandboxes/PetArtSandbox').then((m) => ({ default: m.PetArtSandbox })))
  : null;

const DevUiVariantsSandbox = import.meta.env.DEV
  ? lazy(() => import('../features/sandboxes/UiVariantsSandbox').then((m) => ({ default: m.UiVariantsSandbox })))
  : null;

const DevWorldExpansionSandbox = import.meta.env.DEV
  ? lazy(() => import('../features/sandboxes/WorldExpansionSandbox').then((m) => ({ default: m.WorldExpansionSandbox })))
  : null;

const DevPetLabSandbox = import.meta.env.DEV
  ? lazy(() => import('../features/sandboxes/PetLabModal').then((m) => ({ default: m.PetLabModal })))
  : null;

const DevCombinedExperienceDemo = import.meta.env.DEV
  ? lazy(() => import('../features/sandboxes/CombinedExperienceDemo').then((m) => ({ default: m.CombinedExperienceDemo })))
  : null;

const donorPetCarePreview =
  import.meta.env.DEV ||
  import.meta.env.VITE_OLW_DONOR_PET_CARE === '1' ||
  import.meta.env.VITE_OLW_DONOR_PET_CARE === 'true';

const DevDonorPetThreeCare = donorPetCarePreview
  ? lazy(() => import('../features/sandboxes/DonorPetThreeCare').then((m) => ({ default: m.DonorPetThreeCare })))
  : null;

type DevSandboxKind =
  | 'pet-art'
  | 'ui-sandbox'
  | 'world-sandbox'
  | 'pet-lab'
  | 'experience-demo'
  | 'donor-pet-three'
  | 'donor-pet-care';

function readDevSandboxKind(): DevSandboxKind | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  if (q.has('pet-art')) return 'pet-art';
  if (q.has('ui-sandbox')) return 'ui-sandbox';
  if (q.has('world-sandbox')) return 'world-sandbox';
  if (q.has('pet-lab')) return 'pet-lab';
  if (q.has('experience-demo')) return 'experience-demo';
  if (q.has('donor-pet-three') || q.has('donor-pet-care')) return 'donor-pet-three';
  return null;
}

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
  const initialSandbox = useMemo(() => readDevSandboxKind(), []);
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

  if (import.meta.env.DEV && initialSandbox !== null) {
    const exitToHome = () => {
      window.location.href = '/';
    };
    return (
      <Suspense
        fallback={
          <main className="onboarding-page">
            <div className="cozy-card" style={{ textAlign: 'center' }}>
              <strong>Đang tải Sandbox trải nghiệm...</strong>
            </div>
          </main>
        }
      >
        {initialSandbox === 'pet-art' && DevPetArtSandbox && <DevPetArtSandbox onExit={exitToHome} />}
        {initialSandbox === 'ui-sandbox' && DevUiVariantsSandbox && <DevUiVariantsSandbox onExit={exitToHome} />}
        {initialSandbox === 'world-sandbox' && DevWorldExpansionSandbox && <DevWorldExpansionSandbox onExit={exitToHome} />}
        {initialSandbox === 'pet-lab' && DevPetLabSandbox && <DevPetLabSandbox onClose={exitToHome} />}
        {initialSandbox === 'experience-demo' && DevCombinedExperienceDemo && <DevCombinedExperienceDemo onExit={exitToHome} />}
        {initialSandbox === 'donor-pet-three' && DevDonorPetThreeCare && <DevDonorPetThreeCare onExit={exitToHome} />}
      </Suspense>
    );
  }

  return <MainCoupleApp />;
}

function MainCoupleApp() {
  const backend = useMemo(() => getWorldBackend(), []);
  const sessionId = useMemo(() => makeSessionId(), []);
  const donorLanPlayable = isDonorLanPlayableMode(backend.mode);

  useEffect(() => {
    setDevLanDonorUiActive(backend.mode === 'dev-lan');
  }, [backend.mode]);

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [worldSnapshot, setWorldSnapshot] = useState<WorldSnapshot | null>(null);
  const [currentMapId, setCurrentMapId] = useState<MapId>(() => {
    if (typeof window === 'undefined') return 'home';
    const q = new URLSearchParams(window.location.search);
    const deep = normalizeMapId(q.get('map'));
    if (deep === 'outdoor' && isExtendedWorldDevEnabled()) return 'village';
    if (
      (deep === 'village' || deep === 'farm' || deep === 'forest' || deep === 'beach' || deep === 'shop') &&
      isExtendedWorldDevEnabled()
    ) {
      return deep;
    }
    if (deep === 'garden' || deep === 'home') return deep;
    return 'home';
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [movementConnectionVersion, setMovementConnectionVersion] = useState(0);
  const [presences, setPresences] = useState<PresencePayload[]>([]);
  const [diagnostics, setDiagnostics] = useState<GameDiagnosticsSnapshot | null>(null);

  // Decorate UI state
  const [decorateActive, setDecorateActive] = useState(false);
  const [activeSku, setActiveSku] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [decoratePreviewRotated, setDecoratePreviewRotated] = useState(false);
  const [outdoorNavOpen, setOutdoorNavOpen] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);

  // Modals & settings
  const [activeModal, setActiveModal] = useState<
    | null
    | 'invite'
    | 'avatar'
    | 'menu'
    | 'pwa'
    | 'spike'
    | 'inventory'
    | 'pet'
    | 'study'
    | 'photo'
    | 'mailbox'
    | 'farm_market'
    | 'farm_shipping'
    | 'donor_workshop'
    | 'donor_fishing'
    | 'donor_stream_fishing'
    | 'dev_console'
    | 'v03_proto'
  >(null);
  const [inventorySnapshot, setInventorySnapshot] = useState<InventorySnapshot | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [heldHotbarIndex, setHeldHotbarIndex] = useState<number | null>(null);
  const inventoryHotbarSlots = useMemo(
    () => buildHotbarSlotsFromInventory(inventorySnapshot, currentUser?.userId),
    [inventorySnapshot, currentUser?.userId],
  );
  const [farmWalletCoins, setFarmWalletCoins] = useState(0);
  const farmVersionRef = useRef(0);
  const [farmPlotByIndex, setFarmPlotByIndex] = useState<ReadonlyMap<number, FarmPlotView>>(new Map());
  const [farmClockAnchor, setFarmClockAnchor] = useState({ serverNowMs: 0, fetchedAtMs: 0 });
  const [farmServerNowMs, setFarmServerNowMs] = useState(0);
  const [farmBusy, setFarmBusy] = useState(false);

  const applyFarmSnapshotToUi = useCallback((snap: FarmSnapshot, highlightPlotId?: number) => {
    const fetchedAtMs = Date.now();
    setFarmClockAnchor({ serverNowMs: snap.serverNowMs, fetchedAtMs });
    setFarmServerNowMs(snap.serverNowMs);
    setFarmPlotByIndex(new Map(snap.plots.map((p) => [p.plotId, p])));
    gameEventBus.emit('cmd:sync-farm', {
      plots: snap.plots,
      serverNowMs: snap.serverNowMs,
      growthTimeScale: snap.growthTimeScale,
      highlightPlotId,
    });
  }, []);

  useEffect(() => {
    if (currentMapId !== 'farm' || !backend.farm) return;
    const tick = () => {
      setFarmServerNowMs(farmClockAnchor.serverNowMs + (Date.now() - farmClockAnchor.fetchedAtMs));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentMapId, backend.farm, farmClockAnchor]);
  const [donorChillFishingSpot, setDonorChillFishingSpot] = useState<DonorFishingSpotId>('meadow_pond');
  const [donorWorkshopFocus, setDonorWorkshopFocus] = useState<DonorWorkshopFocus | undefined>(undefined);
  const [mailboxSnapshot, setMailboxSnapshot] = useState<MailboxSnapshot | null>(null);
  const [mailboxBusy, setMailboxBusy] = useState(false);
  const [petSnapshot, setPetSnapshot] = useState<PetSnapshot | null>(null);
  const [petCareMode, setPetCareMode] = useState(false);
  const [petCareBowlVersion, setPetCareBowlVersion] = useState(1);
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
  const [worldClockNowMs, setWorldClockNowMs] = useState(() => Date.now());
  const [timeOfDayMode, setTimeOfDayMode] = useState<TimeOfDayMode>(() => loadTimeOfDayMode());
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
  const realtimeStatusRef = useRef<ConnectionStatus>('disconnected');
  const snapshotRef = useRef<WorldSnapshot | null>(null);
  useEffect(() => {
    snapshotRef.current = worldSnapshot;
  }, [worldSnapshot]);
  const publishPetCarePatchRef = useRef<(patch: SharedPetCarePatch) => Promise<void>>(async () => {});

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

  useLayoutEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('vqg-capture') !== '1') return;
    type VqgWindow = Window & {
      __OLW_VQG?: { jump: (mapId: MapId, tileX: number, tileY: number) => void };
    };
    const w = window as VqgWindow;
    w.__OLW_VQG = {
      jump: (mapId, tileX, tileY) => {
        setCurrentMapId(mapId);
        gameEventBus.emit('cmd:set-map', { mapId, spawnTile: { tileX, tileY } });
      },
    };
    return () => {
      delete w.__OLW_VQG;
    };
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

  const refreshFarmWallet = useCallback(async () => {
    const targetWorldId = snapshotRef.current?.world.id;
    if (!targetWorldId || !backend.farm) return;
    const res = await backend.farm.getFarmSnapshot(targetWorldId);
    if (res.ok && res.data) {
      setFarmWalletCoins(res.data.walletCoins);
      farmVersionRef.current = res.data.version;
      applyFarmSnapshotToUi(res.data);
      if (backend.inventory) await refreshInventorySnapshot(targetWorldId);
    }
  }, [applyFarmSnapshotToUi, backend.farm, backend.inventory, refreshInventorySnapshot]);

  useEffect(() => {
    if ((currentMapId === 'farm' || currentMapId === 'garden') && backend.farm) {
      void refreshFarmWallet();
    }
  }, [currentMapId, backend.farm, refreshFarmWallet]);

  useEffect(() => {
    const wid = worldSnapshot?.world.id;
    if (!wid || !backend.farm) return;
    void refreshFarmWallet();
  }, [worldSnapshot?.world.id, backend.farm, refreshFarmWallet]);

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

  const refreshPetCareBowl = useCallback(
    async (explicitWorldId?: string) => {
      const targetWorldId = explicitWorldId ?? snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.pet) return;
      const res = await backend.pet.getPetCareSnapshot(targetWorldId);
      if (res.ok) {
        setPetCareBowlVersion(res.data.version);
      }
    },
    [backend],
  );

  const refreshPetSnapshot = useCallback(
    async (explicitWorldId?: string) => {
      const targetWorldId = explicitWorldId ?? snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.pet) return;
      const res = await backend.pet.getPetSnapshot(targetWorldId);
      if (res.ok) {
        setPetSnapshot(res.data);
        gameEventBus.emit('cmd:sync-pet', res.data);
      }
      void refreshPetCareBowl(targetWorldId);
    },
    [backend, refreshPetCareBowl],
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

      if (action === 'feed' || action === 'water') {
        const careAction = action === 'feed' ? 'fill_food' : 'fill_water';
        const res = await backend.pet.applyPetCare({
          worldId: targetWorldId,
          petId: petSnapshot.id,
          action: careAction,
          expectedBowlVersion: petCareBowlVersion,
          ownerScope: 'shared',
          itemSku: PET_KIBBLE_BASIC_SKU,
          quality: 'normal',
          idempotencyKey: makeIdempotencyKey(`pet-care-${careAction}`),
        });
        setPetBusy(false);
        if (!res.ok) {
          showToast(res.message, true);
          if (res.code === 'VERSION_CONFLICT' || res.code === 'BOWL_FULL') {
            void refreshPetSnapshot(targetWorldId);
            void refreshInventorySnapshot(targetWorldId);
          }
          return;
        }
        setPetCareBowlVersion(res.data.bowl.version);
        if (res.data.pet) {
          setPetSnapshot(res.data.pet);
          gameEventBus.emit('cmd:sync-pet', res.data.pet);
        }
        gameEventBus.emit('cmd:pet-reaction', { action });
        void refreshInventorySnapshot(targetWorldId);
        realtimeRef.current?.notifyWorldMutated('inventory');
        realtimeRef.current?.notifyWorldMutated('pet');
        showToast(
          action === 'feed'
            ? 'Đã cho thức ăn vào bát — bé sẽ tự ăn khi đói (Mission 04).'
            : 'Đã làm đầy bát nước.',
        );
        const studyActiveNow = Boolean(studySnapshot?.sharedSession || studySnapshot?.soloSession);
        if (!studyActiveNow) playPetFeedbackChime(action);
        return;
      }

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
      realtimeRef.current?.notifyWorldMutated('pet');
      const studyActiveNow = Boolean(studySnapshot?.sharedSession || studySnapshot?.soloSession);
      playPetFeedbackChime(action, studyActiveNow);
      showToast(`${res.data.pet.name} đang rừ rừ vui sướng!`);
    },
    [
      backend,
      petCareBowlVersion,
      petSnapshot,
      refreshInventorySnapshot,
      refreshPetSnapshot,
      showToast,
      studySnapshot,
    ],
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

  const refreshMailboxSnapshot = useCallback(
    async (explicitWorldId?: string) => {
      const targetWorldId = explicitWorldId ?? snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.mailbox) return;
      const res = await backend.mailbox.listMailbox(targetWorldId);
      if (res.ok) {
        setMailboxSnapshot(res.data);
        gameEventBus.emit('cmd:sync-mailbox-unread', { unreadCount: res.data.unreadCount });
      }
    },
    [backend],
  );

  const handleSendMailbox = useCallback(
    async (params: {
      recipientId: string;
      subject: string;
      body: string;
      giftItemSku: string | null;
      giftQty: number;
      giftQuality: 'normal' | 'silver' | 'gold';
      sourceScope: MailboxGiftSourceScope;
      isSurprise: boolean;
    }): Promise<boolean> => {
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.mailbox) return false;
      setMailboxBusy(true);
      const res = await backend.mailbox.sendLetterOrGift({
        worldId: targetWorldId,
        ...params,
        idempotencyKey: makeIdempotencyKey('mail-send'),
      });
      setMailboxBusy(false);
      if (!res.ok) {
        showToast(res.message, true);
        return false;
      }
      setMailboxSnapshot(res.data.mailbox);
      setInventorySnapshot(res.data.inventory);
      gameEventBus.emit('cmd:sync-mailbox-unread', { unreadCount: res.data.mailbox.unreadCount });
      realtimeRef.current?.notifyWorldMutated('mailbox');
      if (params.giftItemSku) realtimeRef.current?.notifyWorldMutated('inventory');
      showToast(params.giftItemSku ? 'Đã gửi quà bất ngờ vào hòm thư!' : 'Đã thả thư vào hòm thư chung!');
      return true;
    },
    [backend, showToast],
  );

  const handleOpenMailboxItem = useCallback(
    async (letterId: string) => {
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.mailbox) return;
      setMailboxBusy(true);
      const res = await backend.mailbox.openItem({
        worldId: targetWorldId,
        letterId,
        idempotencyKey: makeIdempotencyKey('mail-open'),
      });
      setMailboxBusy(false);
      if (!res.ok) {
        showToast(res.message, true);
        return;
      }
      setMailboxSnapshot(res.data.mailbox);
      setInventorySnapshot(res.data.inventory);
      gameEventBus.emit('cmd:sync-mailbox-unread', { unreadCount: res.data.mailbox.unreadCount });
      realtimeRef.current?.notifyWorldMutated('mailbox');
      showToast('Đã mở thư! Kiểm tra ngăn riêng trong túi nếu có quà kèm nhé.');
    },
    [backend, showToast],
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

  useEffect(() => registerLivingPetDevAcceptanceHooks(), []);

  useEffect(
    () => gameEventBus.on('evt:pet-care-mode', ({ active }) => setPetCareMode(active)),
    [],
  );

  useEffect(
    () =>
      gameEventBus.on('cmd:sync-held-item', (held) => {
        setHeldHotbarIndex(held.itemKind === 'none' ? null : held.slotIndex);
      }),
    [],
  );

  useEffect(
    () =>
      gameEventBus.on('evt:pet-care-request-consume', ({ sku, quality, ownerScope }) => {
        const targetWorldId = snapshotRef.current?.world.id;
        if (!targetWorldId || !petSnapshot) return;
        void (async () => {
          setPetBusy(true);
          const outcome = await consumeHandFoodInCare(backend, {
            worldId: targetWorldId,
            petId: petSnapshot.id,
            expectedVersion: petSnapshot.version,
            ownerScope,
            itemSku: sku,
            quality,
            idempotencyKey: makeIdempotencyKey(`pet-care-consume-${sku}`),
          });
          setPetBusy(false);
          if (outcome.status === 'dev_presentation') {
            showToast('Bé ngửi món (mô phỏng DEV — chưa trừ kho).', true);
            return;
          }
          if (outcome.status === 'error') {
            showToast(outcome.message, true);
            if (outcome.code === 'VERSION_CONFLICT') {
              void refreshPetSnapshot(targetWorldId);
              void refreshInventorySnapshot(targetWorldId);
            }
            return;
          }
          setPetSnapshot(outcome.pet);
          gameEventBus.emit('cmd:sync-pet', outcome.pet);
          gameEventBus.emit('cmd:pet-reaction', { action: 'feed' });
          void refreshInventorySnapshot(targetWorldId);
          realtimeRef.current?.notifyWorldMutated('inventory');
          realtimeRef.current?.notifyWorldMutated('pet');
          showToast(`${outcome.pet.name} đã ăn món nhé!`);
          playPetFeedbackChime('feed');
        })();
      }),
    [backend, petSnapshot, refreshInventorySnapshot, refreshPetSnapshot, showToast],
  );

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
      if (packet.type === 'COUPLE_HOME_BOWL') {
        if (packet.userId !== currentUser.userId) {
          gameEventBus.emit('cmd:sync-partner-home-bowl', {
            foodEmpty: packet.foodEmpty,
            foodFull: packet.foodFull,
            waterEmpty: packet.waterEmpty,
            waterFull: packet.waterFull,
          });
        }
        return;
      }
      if (packet.type === 'COUPLE_ENV_TRANSITION') {
        if (packet.userId !== currentUser.userId) {
          gameEventBus.emit('cmd:play-partner-env-transition', {
            userId: packet.userId,
            mapId: packet.mapId,
            kind: packet.kind,
            hookId: packet.hookId,
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
    let latestStatus: ConnectionStatus = 'connecting';
    const updateConnectionStatus = (status: ConnectionStatus) => {
      if (status === 'connected' && realtimeStatusRef.current !== status) {
        setMovementConnectionVersion((version) => version + 1);
      }
      realtimeStatusRef.current = status;
      setConnectionStatus(status);
    };
    updateConnectionStatus('connecting');

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
          setPresences(
            list.map((p) => ({
              ...p,
              mapId: normalizeMapId(p.mapId) ?? p.mapId,
            })),
          );
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
          } else if (reason === 'mailbox') {
            void refreshMailboxSnapshot(worldId);
          } else if (reason === 'farm') {
            void refreshFarmWallet();
            void refreshInventorySnapshot(worldId);
          } else {
            void refreshWorldSnapshot();
          }
        },
        onConnectionChange: (status) => {
          if (cancelled) return;
          latestStatus = status;
          if (realtimeRef.current) updateConnectionStatus(status);
        },
        onCoupleEvent: (packet) => {
          handleCoupleEventRef.current(packet);
        },
        onPetCareSession: (packet: PetCareSessionEventPacket) => {
          if (packet.type === 'PET_CARE_SESSION') {
            gameEventBus.emit('cmd:sync-shared-pet-care-session', packet.session);
          }
        },
      })
      .then((handle) => {
        if (cancelled) {
          void handle.disconnect();
          return;
        }
        realtimeRef.current = handle;
        updateConnectionStatus(latestStatus);
        void refreshInventorySnapshot(worldId);
        void refreshPetSnapshot(worldId);
        void refreshStudySnapshot(worldId);
        void refreshMailboxSnapshot(worldId);
      });

    return () => {
      cancelled = true;
      const existing = realtimeRef.current;
      realtimeRef.current = null;
      realtimeStatusRef.current = 'disconnected';
      if (existing) {
        void existing.disconnect();
      }
    };
  }, [backend, worldId, currentUser, sessionId, refreshWorldSnapshot, refreshInventorySnapshot, refreshPetSnapshot, refreshStudySnapshot, refreshMailboxSnapshot]);

  // Refresh presence with the current tile after reconnect, map or avatar changes.
  useEffect(() => {
    if (connectionStatus !== 'connected' || !realtimeRef.current || !currentUser || !localMember) return;
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
  }, [connectionStatus, movementConnectionVersion, currentMapId, localMember, currentUser, sessionId]);

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
      realtimeStatusRef.current = 'offline';
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
      if (realtimeStatusRef.current === 'connected') {
        realtimeRef.current?.publishMovement(pkt);
      }
    });

    const unsubTile = gameEventBus.on('evt:local-tile-changed', (tile) => {
      localTileRef.current = tile;
    });

    const unsubMapReq = gameEventBus.on('evt:request-map-change', ({ targetMapId, spawnX, spawnY, portalId }) => {
      setDecorateActive(false);
      setActiveSku(null);
      setSelectedPlacementId(null);
      const fromMapId = currentMapIdRef.current;
      const hook = resolveEnvHookForTravel(fromMapId, targetMapId, portalId);
      if (hook) {
        gameEventBus.emit('cmd:env-transition', hook);
        const targetWorldId = snapshotRef.current?.world.id;
        if (targetWorldId && currentUser) {
          realtimeRef.current?.publishCoupleEvent?.({
            type: 'COUPLE_ENV_TRANSITION',
            worldId: targetWorldId,
            userId: currentUser.userId,
            mapId: fromMapId,
            kind: hook.kind,
            hookId: hook.hookId,
            toMapId: targetMapId,
            atMs: Date.now(),
          });
        }
      }
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

    const unsubSceneReady = gameEventBus.on('evt:scene-ready', ({ mapId }) => {
      setCurrentMapId((prev) => (prev === mapId ? prev : mapId));
      void refreshPetSnapshot();
      void refreshStudySnapshot();
      void refreshMailboxSnapshot();
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

    const unsubMailbox = gameEventBus.on('evt:open-mailbox', () => {
      setActiveModal('mailbox');
      void refreshMailboxSnapshot();
      void refreshInventorySnapshot();
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

    const unsubHomeBowl = gameEventBus.on('evt:local-home-bowl-changed', (bowls) => {
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !currentUser) return;
      if (currentMapIdRef.current !== 'home') return;
      realtimeRef.current?.publishCoupleEvent?.({
        type: 'COUPLE_HOME_BOWL',
        worldId: targetWorldId,
        userId: currentUser.userId,
        foodEmpty: bowls.foodEmpty,
        foodFull: bowls.foodFull,
        waterEmpty: bowls.waterEmpty,
        waterFull: bowls.waterFull,
        atMs: Date.now(),
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
      unsubMailbox();
      unsubPosture();
      unsubHomeBowl();
    };
  }, [currentUser, refreshInventorySnapshot, refreshMailboxSnapshot, refreshPetSnapshot, refreshStudySnapshot, studySeat]);

  useEffect(() => {
    publishPetCarePatchRef.current = async (patch) => {
      const worldId = snapshotRef.current?.world.id;
      if (!worldId || !currentUser || backend.mode !== 'dev-lan') return;
      await fetch('/api/dev-lan/pet-care/session/patch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': currentUser.userId,
        },
        body: JSON.stringify({ worldId, patch }),
      });
    };
  }, [backend.mode, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubStroke = gameEventBus.on('evt:pet-care-stroke-done', ({ zone }) => {
      if (!isPetCareModeActive()) return;
      void publishPetCarePatchRef.current({
        kind: 'stroke',
        zone,
        actorUserId: currentUser.userId,
        atMs: Date.now(),
      });
    });
    const unsubAction = gameEventBus.on('cmd:pet-care-action', (payload) => {
      if (!isPetCareModeActive()) return;
      if (payload.kind === 'brush') {
        void publishPetCarePatchRef.current({
          kind: 'brush',
          actorUserId: currentUser.userId,
          atMs: Date.now(),
        });
      }
      if (payload.kind === 'offer_food' && payload.sku) {
        void publishPetCarePatchRef.current({
          kind: 'feed',
          itemSku: payload.sku,
          actorUserId: currentUser.userId,
          atMs: Date.now(),
        });
      }
    });
    const unsubCareMode = gameEventBus.on('cmd:pet-care-mode', ({ active }) => {
      if (!active || backend.mode !== 'dev-lan') return;
      const worldId = snapshotRef.current?.world.id;
      if (!worldId) return;
      void fetch(`/api/dev-lan/pet-care/session?worldId=${encodeURIComponent(worldId)}`, {
        headers: { 'x-dev-user-id': currentUser.userId },
      })
        .then((r) => r.json())
        .then((j) => {
          if (j?.ok && j.data) gameEventBus.emit('cmd:sync-shared-pet-care-session', j.data);
        })
        .catch(() => undefined);
    });
    return () => {
      unsubStroke();
      unsubAction();
      unsubCareMode();
    };
  }, [backend.mode, currentUser]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveModal((cur) => (cur === 'dev_console' ? null : 'dev_console'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Atomic furniture mutations with optimistic UI + rollback
  const handlePlaceRequest = useCallback(
    async ({
      mapId,
      sku,
      tileX,
      tileY,
      rotated,
    }: {
      mapId: MapId;
      sku: string;
      tileX: number;
      tileY: number;
      rotated?: boolean;
    }) => {
      const snap = snapshotRef.current;
      if (!snap || !currentUser || mutationBusy) return;
      if (!isDecorateMapId(mapId)) {
        showToast('Chỉ có thể trang trí trong nhà hoặc khu vườn.', true);
        return;
      }
      if (connectionStatus === 'offline') {
        showToast('Đang ngoại tuyến — không thể lưu trang trí lúc này.', true);
        return;
      }
      const item = getCatalogItem(sku);
      if (!item) return;
      const footprint = footprintForCatalog(item, rotated === true);

      const prevSnap = snap;
      const optimisticItem: FurniturePlacement = {
        id: `optimistic-${Date.now()}`,
        worldId: snap.world.id,
        mapId,
        sku,
        layerSlot: item.layerSlot,
        tileX,
        tileY,
        widthTiles: footprint.widthTiles,
        heightTiles: footprint.heightTiles,
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
        rotated: rotated === true,
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
      setDecoratePreviewRotated(false);
      showToast(`Đã đặt ${item.nameVi}`);
    },
    [backend, connectionStatus, currentUser, mutationBusy, refreshWorldSnapshot, showToast],
  );

  const handleRotatePlacement = useCallback(
    async (placementId: string) => {
      const snap = snapshotRef.current;
      if (!snap || mutationBusy) return;
      if (connectionStatus === 'offline') {
        showToast('Đang ngoại tuyến — không thể xoay đồ lúc này.', true);
        return;
      }
      const existing = snap.placements.find((p) => p.id === placementId);
      if (!existing) return;

      const prevSnap = snap;
      const rotated: FurniturePlacement = {
        ...existing,
        widthTiles: existing.heightTiles,
        heightTiles: existing.widthTiles,
      };
      setMutationBusy(true);
      setWorldSnapshot({
        ...snap,
        placements: snap.placements.map((p) => (p.id === placementId ? rotated : p)),
      });

      const res = await backend.rotateFurniture({
        worldId: snap.world.id,
        placementId,
        expectedLayoutVersion: snap.world.layoutVersion,
        idempotencyKey: makeIdempotencyKey('rotate'),
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
          placements: cur.placements.map((p) => (p.id === placementId ? res.data.placement : p)),
        };
      });
      realtimeRef.current?.notifyWorldMutated('furniture');
      showToast('Đã xoay món đồ');
    },
    [backend, connectionStatus, mutationBusy, refreshWorldSnapshot, showToast],
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

  const worldClockPresentation = useMemo(() => {
    if (!worldSnapshot) return null;
    const created = Date.parse(worldSnapshot.world.createdAt);
    const worldCreatedAtMs = Number.isFinite(created) ? created : worldClockNowMs;
    return resolveWorldClockPresentation({
      nowMs: worldClockNowMs,
      worldId: worldSnapshot.world.id,
      worldCreatedAtMs,
      mode: timeOfDayMode,
    });
  }, [worldSnapshot, worldClockNowMs, timeOfDayMode]);

  const farmClockContext = useMemo(
    () => (worldClockPresentation ? farmContextFromWorldClock(worldClockPresentation) : null),
    [worldClockPresentation],
  );

  useEffect(() => {
    if (!worldSnapshot) return;
    const id = window.setInterval(() => setWorldClockNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [worldSnapshot]);

  useEffect(() => {
    if (!worldClockPresentation) return;
    gameEventBus.emit('cmd:sync-world-clock', worldClockPresentation);
  }, [worldClockPresentation]);

  const handleTimeOfDayModeChange = useCallback((mode: TimeOfDayMode) => {
    setTimeOfDayMode(mode);
    saveTimeOfDayMode(mode);
  }, []);

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
    const mapId =
      isExtendedWorldDevEnabled() && target === 'outdoor' ? 'village' : target;
    setDecorateActive(false);
    setActiveSku(null);
    setSelectedPlacementId(null);
    const fromMapId = currentMapIdRef.current;
    const hook = resolveEnvHookForMapChange(fromMapId, mapId);
    if (hook) {
      gameEventBus.emit('cmd:env-transition', hook);
    }
    setCurrentMapId(mapId);
    const def = getMapDefinition(mapId);
    gameEventBus.emit('cmd:set-map', {
      mapId,
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
  const kibbleCount = getSharedKibbleQty(inventorySnapshot?.items ?? []);
  const petFeedCooldownMs = petSnapshot
    ? getPetActionCooldownRemainingMs('feed', petSnapshot.lastFedAtMs, coupleClockNowMs)
    : 0;
  const petCanFeed = Boolean(petSnapshot) && kibbleCount > 0 && petFeedCooldownMs <= 0;
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

      {worldClockPresentation ? (
        <WorldClockHud
          presentation={worldClockPresentation}
          mode={timeOfDayMode}
          hidden={petCareMode || isAnyModalOpen || decorateActive}
          onModeChange={handleTimeOfDayModeChange}
        />
      ) : null}

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

      {!petCareMode && <LivingPetDevBanner />}
      {!petCareMode && <ExtendedWorldDevBanner />}

      <PetCareTouchOverlay
        active={petCareMode}
        onExit={() => gameEventBus.emit('cmd:pet-care-mode', { active: false })}
      />

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
        decoratePreviewRotated={decoratePreviewRotated}
        showJoystick={showJoystick}
        movementConnection={connectionStatus === 'connected' ? movementConnectionVersion : null}
        isModalOpen={isAnyModalOpen}
        contextualInteractionHud
        toast={toast}
      />

      <MainGameInteractionLayer
        localUserId={currentUser.userId}
        key={currentMapId}
        petCareOverlayActive={petCareMode}
        enabled={Boolean(backend.inventory)}
        currentMapId={currentMapId}
        inventorySnapshot={inventorySnapshot}
        petSnapshot={petSnapshot}
        decorateActive={decorateActive}
        modalOpen={isAnyModalOpen}
        showJoystick={showJoystick}
        petCanFeed={petCanFeed}
        interactionMutationBusy={petBusy || farmBusy}
        onOpenInventory={() => {
          setActiveModal('inventory');
          void refreshInventorySnapshot();
        }}
        onCloseTopModal={() => {
          if (activeModal) setActiveModal(null);
          else if (previewNotice) setPreviewNotice(null);
        }}
        onFeedPetAuthoritative={async () => {
          await handleInteractPet('feed');
        }}
        onPetPetAuthoritative={async () => {
          await handleInteractPet('pet');
        }}
        onFarmApply={backend.farm ? async (plotIndex, action, seedSku) => {
          const targetWorldId = snapshotRef.current?.world.id;
          if (!targetWorldId) return;
          setFarmBusy(true);
          try {
            const res = await backend.farm!.applyFarm({
              worldId: targetWorldId,
              plotIndex,
              action,
              seedSku,
              farmVersion: farmVersionRef.current,
              idempotencyKey: makeIdempotencyKey(`farm-${action}-${plotIndex}`),
            });
            if (!res.ok) {
              showToast(res.message ?? 'Không thực hiện được.', true);
              if (res.code === 'VERSION_CONFLICT') await refreshFarmWallet();
              return;
            }
            setFarmWalletCoins(res.data.snapshot.walletCoins);
            farmVersionRef.current = res.data.snapshot.version;
            applyFarmSnapshotToUi(res.data.snapshot, action === 'till' ? plotIndex : undefined);
            await refreshInventorySnapshot();
            if (res.data.harvested?.length) {
              showToast(
                `Thu hoạch: ${res.data.harvested
                  .map((h) => getCropDefinition(h.sku)?.nameVi ?? h.sku)
                  .join(', ')}`,
              );
            } else {
              showToast(action === 'till' ? 'Đã cuốc xong.' : action === 'plant' ? 'Đã gieo hạt.' : action === 'water' ? 'Đã tưới.' : 'Xong.');
            }
            realtimeRef.current?.notifyWorldMutated('farm');
            realtimeRef.current?.notifyWorldMutated('inventory');
          } finally {
            setFarmBusy(false);
          }
        } : undefined}
        onOpenFarmMarket={backend.farm ? () => {
          void refreshFarmWallet();
          setActiveModal('farm_market');
        } : undefined}
        onOpenFarmShipping={backend.farm ? () => {
          void refreshFarmWallet();
          setActiveModal('farm_shipping');
        } : undefined}
        onOpenDonorFishing={
          donorLanPlayable && worldId
            ? (spotId) => {
                setDonorChillFishingSpot(parseDonorFishingSpot(spotId));
                setActiveModal('donor_fishing');
              }
            : undefined
        }
        onOpenDonorStreamFishing={
          donorLanPlayable && worldId ? () => setActiveModal('donor_stream_fishing') : undefined
        }
        onOpenDonorWorkshop={
          donorLanPlayable && worldId
            ? (focus) => {
                setDonorWorkshopFocus(focus);
                setActiveModal('donor_workshop');
              }
            : undefined
        }
        donorLanPlayable={donorLanPlayable}
        farmPlotByIndex={farmPlotByIndex}
        farmServerNowMs={farmServerNowMs}
        onNotice={(message, isError) => showToast(message, isError)}
      />

      {!decorateActive && !isAnyModalOpen && !petCareMode && (
        <CoupleEmoteDock
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
          previewRotated={decoratePreviewRotated}
          busy={mutationBusy}
          onSelectDecorateMap={(mapId: DecorateMapId) => {
            if (currentMapId !== mapId) handleSelectMap(mapId);
          }}
          onSelectSku={(sku) => {
            setSelectedPlacementId(null);
            setActiveSku(sku);
            setDecoratePreviewRotated(false);
          }}
          onRemovePlacement={(id) => void handleRemovePlacement(id)}
          onClearSelection={() => setSelectedPlacementId(null)}
          onRotatePreview={() => {
            setDecoratePreviewRotated((prev) => {
              const next = !prev;
              gameEventBus.emit('evt:decorate-rotate-preview', { rotated: next });
              return next;
            });
          }}
          onRotatePlacement={(id) => void handleRotatePlacement(id)}
          onExit={() => {
            setDecorateActive(false);
            setActiveSku(null);
            setSelectedPlacementId(null);
            setDecoratePreviewRotated(false);
          }}
        />
      ) : (
        <QuickNavBar
          hidden={petCareMode}
          currentMapId={currentMapId}
          decorateActive={decorateActive}
          onSelectMap={handleSelectMap}
          onOpenOutdoorNav={() => setOutdoorNavOpen(true)}
          onToggleDecorate={() => {
            const target = defaultDecorateMapId(currentMapId);
            setDecorateActive(true);
            setActiveSku(null);
            setSelectedPlacementId(null);
            setDecoratePreviewRotated(false);
            if (currentMapId !== target) {
              setCurrentMapId(target);
              const def = getMapDefinition(target);
              gameEventBus.emit('cmd:set-map', { mapId: target, spawnTile: def.defaultSpawn });
            }
          }}
          onOpenAvatar={() => setActiveModal('avatar')}
          onOpenMenu={() => setActiveModal('menu')}
        />
      )}

      <OutdoorWorldNavSheet
        open={outdoorNavOpen}
        currentMapId={currentMapId}
        onClose={() => setOutdoorNavOpen(false)}
        onSelectMap={handleSelectMap}
      />

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
          onOpenMailbox={
            backend.mailbox
              ? () => {
                  setActiveModal('mailbox');
                  void refreshMailboxSnapshot();
                  void refreshInventorySnapshot();
                }
              : undefined
          }
          mailboxUnreadCount={mailboxSnapshot?.unreadCount ?? 0}
          onOpenPwaGuide={() => setActiveModal('pwa')}
          onOpenSpikeLab={() => {
            if (import.meta.env.DEV) setActiveModal('spike');
          }}
          onOpenDevConsole={
            import.meta.env.DEV && backend.devConsole
              ? () => setActiveModal('dev_console')
              : undefined
          }
          onOpenV03Prototypes={
            import.meta.env.DEV ? () => setActiveModal('v03_proto') : undefined
          }
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
          onOpenDonorWorkshop={
            import.meta.env.DEV && backend.mode === 'dev-lan' && worldId
              ? () => setActiveModal('donor_workshop')
              : undefined
          }
          onOpenDonorFishing={
            import.meta.env.DEV && backend.mode === 'dev-lan' && worldId
              ? () => setActiveModal('donor_fishing')
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

      {activeModal === 'inventory' && backend.inventory && currentUser && (
        <InventoryModal
          snapshot={inventorySnapshot}
          localUserId={currentUser.userId}
          hotbarSlots={inventoryHotbarSlots}
          heldHotbarIndex={heldHotbarIndex}
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

      {donorLanPlayable && activeModal === 'donor_workshop' && worldId && (
        <DonorWorkshopModal
          worldId={worldId}
          focusSection={donorWorkshopFocus}
          onClose={() => {
            setActiveModal(null);
            setDonorWorkshopFocus(undefined);
          }}
          onInventoryRefresh={async () => refreshInventorySnapshot(worldId)}
        />
      )}

      {donorLanPlayable && activeModal === 'donor_fishing' && worldId && (
        <ChillFishingModal
          worldId={worldId}
          spotId={donorChillFishingSpot}
          onClose={() => setActiveModal(null)}
          onInventoryRefresh={async () => refreshInventorySnapshot(worldId)}
        />
      )}

      {donorLanPlayable && activeModal === 'donor_stream_fishing' && worldId && (
        <TensionFishingModal
          worldId={worldId}
          spotId="east_stream"
          titleVi="Suối phía Đông"
          onClose={() => setActiveModal(null)}
          onInventoryRefresh={async () => refreshInventorySnapshot(worldId)}
        />
      )}

      {(activeModal === 'farm_market' || activeModal === 'farm_shipping') && backend.farm && (
        <div className="modal-backdrop" role="presentation" onClick={() => setActiveModal(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <FarmEconomyPanel
              mode={activeModal === 'farm_market' ? 'shop' : 'shipping'}
              walletCoins={farmWalletCoins}
              inventory={inventorySnapshot}
              busy={farmBusy}
              farmClockContext={farmClockContext}
              onClose={() => setActiveModal(null)}
              onShip={async (sku, qty, quality) => {
                const targetWorldId = snapshotRef.current?.world.id;
                if (!targetWorldId) return;
                setFarmBusy(true);
                try {
                  const res = await backend.farm!.shipToBin({
                    worldId: targetWorldId,
                    lines: [{ sku, qty, quality }],
                    idempotencyKey: makeIdempotencyKey('farm-ship'),
                  });
                  if (!res.ok) {
                    showToast(res.message, true);
                    return;
                  }
                  setFarmWalletCoins(res.data.walletCoins);
                  await refreshInventorySnapshot(targetWorldId);
                  showToast(`Đã gửi nông sản (+${res.data.totalCoins} xu).`);
                  realtimeRef.current?.notifyWorldMutated('farm');
                } finally {
                  setFarmBusy(false);
                }
              }}
              onBuySeed={async (seedSku, qty) => {
                const targetWorldId = snapshotRef.current?.world.id;
                if (!targetWorldId) return;
                setFarmBusy(true);
                try {
                  const res = await backend.farm!.buySeed({
                    worldId: targetWorldId,
                    seedSku,
                    qty,
                    idempotencyKey: makeIdempotencyKey('farm-buy'),
                  });
                  if (!res.ok) {
                    showToast(res.message, true);
                    return;
                  }
                  setFarmWalletCoins(res.data.walletCoins);
                  await refreshInventorySnapshot(targetWorldId);
                  showToast('Đã mua hạt giống.');
                  realtimeRef.current?.notifyWorldMutated('inventory');
                } finally {
                  setFarmBusy(false);
                }
              }}
            />
          </div>
        </div>
      )}

      {activeModal === 'mailbox' && backend.mailbox && (
        <MailboxModal
          snapshot={mailboxSnapshot}
          inventory={inventorySnapshot}
          localUserId={currentUser.userId}
          members={worldSnapshot.members}
          busy={mailboxBusy}
          onSend={handleSendMailbox}
          onOpenItem={handleOpenMailboxItem}
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

      {import.meta.env.DEV && DevConsoleDrawer && activeModal === 'dev_console' && backend.devConsole && (
        <Suspense fallback={null}>
          <DevConsoleDrawer
            devConsole={backend.devConsole}
            worldId={worldSnapshot.world.id}
            catalog={inventorySnapshot?.catalog ?? []}
            pet={petSnapshot}
            studySnapshot={studySnapshot}
            onRefreshAll={async () => {
              await Promise.all([
                refreshWorldSnapshot(),
                refreshInventorySnapshot(worldSnapshot.world.id),
                refreshPetSnapshot(worldSnapshot.world.id),
                refreshStudySnapshot(worldSnapshot.world.id),
              ]);
            }}
            onJumpMap={handleSelectMap}
            onToast={showToast}
            onClose={() => setActiveModal(null)}
          />
        </Suspense>
      )}

      {import.meta.env.DEV && DevV03PrototypesModal && activeModal === 'v03_proto' && (
        <Suspense fallback={null}>
          <DevV03PrototypesModal onClose={() => setActiveModal(null)} />
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
