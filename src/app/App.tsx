import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gameEventBus, type GameDiagnosticsSnapshot } from '../game/eventBus';
import { gameAudio } from '../game/audio/gameAudioManager';
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
import {
  createSharedPetCareSession,
  mergeSharedPetCareSession,
  type SharedPetCarePatch,
  type SharedPetCareSession,
} from '../shared/petLiving/petCare/sharedPetCareSession';
import type { PetCareSessionEventPacket } from '../shared/petLiving/petCare/sharedPetCareTypes';
import { isPetCareModeActive, setPetCareModeActive } from '../shared/petLiving/petCare/petCareModeFlag';
import { isExtendedWorldDevEnabled } from '../shared/worldIntegration/extendedWorldDevFlag';
import type {
  AvatarConfig,
  Direction,
  FurniturePlacement,
  MapId,
  MovementPacket,
  PresencePayload,
  WorldSnapshot,
} from '../shared/types';
import { AvatarModal } from '../features/avatar/AvatarModal';
import { CoupleEmoteDock } from '../features/couple/CoupleEmoteDock';
import { ScrapbookAlbumModal } from '../features/couple/ScrapbookAlbumModal';
import { applyRemoteStickerToStoredAlbum } from '../features/couple/scrapbookAlbumStorage';
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
import { setLatestSharedPetCareSession } from '../game/pet/care/petCareBridgeState';
import { consumeHandFoodInCare } from '../features/petCare/petCareHandFeedAuthority';
import { PetCareTouchOverlay } from '../features/petCare/PetCareTouchOverlay';
import { MenuModal } from '../features/home/MenuModal';
import { MobileNavDrawer } from '../features/home/mobile/MobileNavDrawer';
import { MobileTopHud } from '../features/home/mobile/MobileTopHud';
import { QuickNavBar } from '../features/home/QuickNavBar';
import { TopStatusBar } from '../features/home/TopStatusBar';
import { WorldClockHud } from '../features/home/WorldClockHud';
import { GlobalViewportProvider, useGlobalViewport } from './viewport/GlobalViewportContext';
import {
  loadTimeOfDayMode,
  resolveWorldClockPresentation,
  saveTimeOfDayMode,
  type TimeOfDayMode,
} from '../shared/world/worldClock';
import { FarmEconomyPanel } from '../features/farming/FarmEconomyPanel';
import { FlowerAlbumOrchardModal } from '../features/farming/FlowerAlbumOrchardModal';
import { LivestockPanelModal } from '../features/farming/LivestockPanelModal';
import { OrderBoardModal } from '../features/farming/OrderBoardModal';
import { NpcDialogueOverlay } from '../features/npc/NpcDialogueOverlay';
import type { NpcDialogueActionKind } from '../shared/npc/npcDialogueRegistry';
import type { FarmShopKind } from '../shared/shop/farmShopCatalog';
import { farmContextFromWorldClock } from '../shared/farming/farmWorldClockBridge';
import type { DeepFarmActionParams, DeepFarmSnapshot } from '../shared/farming/deepFarmState';
import type { LivestockSpeciesId } from '../shared/farming/livestock';
import type { WorkshopId } from '../shared/farming/workshops';
import { ChillFishingModal } from '../features/donor/ChillFishingModal';
import { DonorWorkshopModal } from '../features/donor/DonorWorkshopModal';
import { isDonorLanPlayableMode, setDevLanDonorUiActive } from '../shared/donor/donorEconomyUiFlag';
import type { DonorFishingSpotId } from '../shared/donor/donorFishingSpots';
import { parseDonorFishingSpot } from '../shared/donor/donorFishingSpots';
import type { DonorWorkshopFocus } from '../shared/donor/donorWorkshopFocus';
import { getCropDefinition } from '../shared/farming/crops';
import type { FarmPlotView, FarmSnapshot } from '../shared/farming/farmSnapshotTypes';
import { InventoryModal } from '../features/inventory/InventoryModal';
import {
  loadInventoryLayout,
  reconcileInventoryLayout,
  saveInventoryLayout,
  type InventoryLayoutState,
} from '../shared/inventory/inventoryLayoutStore';
import { buildHotbarSlotsFromInventory } from '../shared/interaction/inventoryHotbarAdapter';
import { MailboxModal } from '../features/mailbox/MailboxModal';
import { InviteModal } from '../features/pairing/InviteModal';
import { PetPanel } from '../features/pets/PetPanel';
import { isPetSoundMuted, playPetFeedbackChime, setPetSoundMuted } from '../features/pets/petAudio';
import { PomodoroPanel } from '../features/study/PomodoroPanel';
import {
  resumeStudyAmbient,
  setStudyAmbientTrack,
  stopStudyAmbient,
  suspendStudyAmbient,
  type AmbientTrack,
} from '../features/study/ambientAudio';
import { LazyBilliardsModal } from '../features/minigames/billiards/LazyBilliardsModal';
import {
  BilliardsWireEventSchema,
  type BilliardsEdition,
  type BilliardsMatchResult,
  type BilliardsRule,
  type BilliardsTransport,
  type BilliardsTransportMeta,
  type BilliardsWireEvent,
  type PlayerSlot,
} from '../shared/billiards/types';
import {
  createCoupleInvite,
  getCoupleInteractionMeta,
  resolveCoupleAcceptPose,
  resolveInviteLocalExpiryMs,
  validateInviteAcceptance,
} from '../shared/couple/coupleProtocol';
import type { HeldItemState } from '../shared/interaction/interactionTypes';
import {
  createInitialNetworkDiagnostics,
  sanitizeSessionShort,
  type NetworkDiagnosticsState,
} from '../shared/netcode/diagnostics';
import {
  STATIC_PHOTO_PRESETS,
  isPairedCouplePosture,
  type CoupleEmoteId,
  type CoupleEventPacket,
  type CoupleInteractionKind,
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
import { getIslandZoneMeta } from '../shared/world/worldGraph';

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

const DevRemoteShareModal = import.meta.env.DEV
  ? lazy(() =>
      import('../features/couple/RemoteShareModal').then((m) => ({
        default: m.RemoteShareModal,
      })),
    )
  : null;

const DevNetworkDiagnosticsOverlay = import.meta.env.DEV
  ? lazy(() =>
      import('../features/network/NetworkDiagnosticsOverlay').then((m) => ({
        default: m.NetworkDiagnosticsOverlay,
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
  const appShellRef = useRef<HTMLDivElement | null>(null);
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

  return (
    <GlobalViewportProvider rootRef={appShellRef}>
      <MainCoupleApp appShellRef={appShellRef} />
    </GlobalViewportProvider>
  );
}

function MainCoupleApp({
  appShellRef,
}: {
  appShellRef: import('react').RefObject<HTMLDivElement | null>;
}) {
  const {
    layoutMode,
    hotbarStrategy,
    isFocusExpanded,
    joystickEnabled: showJoystick,
    joystickMode,
    toggleJoystickEnabled,
  } = useGlobalViewport();
  const backend = useMemo(() => getWorldBackend(), []);
  const sessionId = useMemo(() => makeSessionId(), []);
  const donorLanPlayable = isDonorLanPlayableMode(backend.mode);

  useEffect(() => {
    setDevLanDonorUiActive(backend.mode === 'dev-lan');
  }, [backend.mode]);

  const [authReady, setAuthReady] = useState(false);
  const [isRemoteClient, setIsRemoteClient] = useState(false);
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
  const [decorateSandboxUnlocked, setDecorateSandboxUnlocked] = useState(false);
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
    | 'deep_flowers'
    | 'deep_livestock'
    | 'deep_orders'
    | 'donor_workshop'
    | 'donor_fishing'
    | 'billiards'
    | 'dev_console'
    | 'v03_proto'
    | 'remote_share'
  >(null);
  const [inventorySnapshot, setInventorySnapshot] = useState<InventorySnapshot | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [heldHotbarIndex, setHeldHotbarIndex] = useState<number | null>(null);
  const [heldItemSku, setHeldItemSku] = useState<string | null>(null);
  const [waterFillBySku, setWaterFillBySku] = useState<Record<string, number>>({
    water_pitcher: 100,
    tool_watering_can: 100,
  });
  const [savedLayoutEntry, setSavedLayoutEntry] = useState<{
    key: string;
    layout: InventoryLayoutState;
  } | null>(null);
  const layoutWorldId = worldSnapshot?.world.id;
  const layoutUserId = currentUser?.userId;
  const layoutScopeKey =
    layoutWorldId && layoutUserId ? `${layoutWorldId}:${layoutUserId}` : null;
  const inventoryLayout = useMemo(() => {
    const rawBase =
      savedLayoutEntry && savedLayoutEntry.key === layoutScopeKey
        ? savedLayoutEntry.layout
        : layoutWorldId && layoutUserId
          ? loadInventoryLayout(layoutWorldId, layoutUserId)
          : null;
    return reconcileInventoryLayout(
      rawBase,
      inventorySnapshot,
      layoutUserId ?? '',
    );
  }, [savedLayoutEntry, layoutScopeKey, layoutWorldId, layoutUserId, inventorySnapshot]);

  const handleChangeInventoryLayout = useCallback(
    (next: InventoryLayoutState) => {
      if (!layoutUserId) return;
      const reconciled = reconcileInventoryLayout(next, inventorySnapshot, layoutUserId);
      if (layoutScopeKey) {
        setSavedLayoutEntry({ key: layoutScopeKey, layout: reconciled });
      }
      if (layoutWorldId) {
        saveInventoryLayout(layoutWorldId, layoutUserId, reconciled);
      }
    },
    [layoutUserId, inventorySnapshot, layoutScopeKey, layoutWorldId],
  );

  const inventoryHotbarSlots = useMemo(
    () =>
      buildHotbarSlotsFromInventory(
        inventorySnapshot,
        currentUser?.userId,
        inventoryLayout.hotbarBindings,
        waterFillBySku,
      ),
    [inventorySnapshot, currentUser?.userId, inventoryLayout.hotbarBindings, waterFillBySku],
  );
  const [farmWalletCoins, setFarmWalletCoins] = useState(0);
  const farmVersionRef = useRef(0);
  const [farmPlotByIndex, setFarmPlotByIndex] = useState<ReadonlyMap<number, FarmPlotView>>(new Map());
  const [farmClockAnchor, setFarmClockAnchor] = useState({ serverNowMs: 0, fetchedAtMs: 0 });
  const [farmServerNowMs, setFarmServerNowMs] = useState(0);
  const [farmBusy, setFarmBusy] = useState(false);
  const [farmShopKind, setFarmShopKind] = useState<FarmShopKind>('seed');
  const [deepFarmSnapshot, setDeepFarmSnapshot] = useState<DeepFarmSnapshot | null>(null);
  const deepFarmVersionRef = useRef(0);
  const [deepFarmBusy, setDeepFarmBusy] = useState(false);
  const [deepFarmStatusVi, setDeepFarmStatusVi] = useState<string | null>(null);
  const [zoneBanner, setZoneBanner] = useState<{
    nameVi: string;
    subtitleVi: string;
    id: number;
  } | null>(null);
  const zoneBannerTimerRef = useRef<number | null>(null);

  const announceZoneEntry = useCallback((mapId: MapId) => {
    const meta = getIslandZoneMeta(mapId);
    const id = Date.now();
    setZoneBanner({ nameVi: meta.nameVi, subtitleVi: meta.subtitleVi, id });
    if (mapId !== 'home') {
      try {
        const key = 'olw:discovered-zones:v1';
        const raw = window.localStorage.getItem(key);
        const visited = new Set<string>(raw ? (JSON.parse(raw) as string[]) : ['home']);
        if (!visited.has(mapId)) {
          visited.add(mapId);
          window.localStorage.setItem(key, JSON.stringify([...visited]));
          gameAudio.playStinger('area');
        }
      } catch {
        /* ignore storage limits */
      }
    }
    if (zoneBannerTimerRef.current !== null) {
      window.clearTimeout(zoneBannerTimerRef.current);
    }
    zoneBannerTimerRef.current = window.setTimeout(() => {
      setZoneBanner((cur) => (cur?.id === id ? null : cur));
      zoneBannerTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (zoneBannerTimerRef.current !== null) {
        window.clearTimeout(zoneBannerTimerRef.current);
      }
    };
  }, []);

  const applyFarmSnapshotToUi = useCallback(
    (
      snap: FarmSnapshot,
      highlight?: {
        plotId: number;
        action:
          | 'till'
          | 'water'
          | 'plant'
          | 'harvest'
          | 'fertilize'
          | 'place_sprinkler'
          | 'remove_sprinkler';
      },
    ) => {
      const fetchedAtMs = Date.now();
      setFarmClockAnchor({ serverNowMs: snap.serverNowMs, fetchedAtMs });
      setFarmServerNowMs(snap.serverNowMs);
      setFarmPlotByIndex(new Map(snap.plots.map((p) => [p.plotId, p])));
      gameEventBus.emit('cmd:sync-farm', {
        plots: snap.plots,
        serverNowMs: snap.serverNowMs,
        growthTimeScale: snap.growthTimeScale,
        highlightPlotId: highlight?.plotId,
        highlightAction: highlight?.action,
      });
    },
    [],
  );

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
  const localPostureRef = useRef<CouplePostureKind>('none');
  useEffect(() => {
    localPostureRef.current = localPosture;
  }, [localPosture]);
  const [incomingHugInvite, setIncomingHugInvite] = useState<CoupleInvitePayload | null>(null);
  const [outgoingInviteExpiresAtMs, setOutgoingInviteExpiresAtMs] = useState<number | null>(null);
  const [coupleClockNowMs, setCoupleClockNowMs] = useState(() => Date.now());
  const [worldClockNowMs, setWorldClockNowMs] = useState(() => Date.now());
  const [timeOfDayMode, setTimeOfDayMode] = useState<TimeOfDayMode>(() => loadTimeOfDayMode());
  const [selectedPhotoPresetId, setSelectedPhotoPresetId] = useState<string>(
    STATIC_PHOTO_PRESETS[0]!.id,
  );
  const [partnerScrapbookPage, setPartnerScrapbookPage] = useState<number | null>(null);
  const [partnerScrapbookUserId, setPartnerScrapbookUserId] = useState<string | null>(null);
  const [scrapbookStorageEpoch, setScrapbookStorageEpoch] = useState(0);
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
  const [activeNpcDialogue, setActiveNpcDialogue] = useState<{
    npcId: string;
    mapId: MapId;
    labelVi: string;
    role: string;
    fallbackDialogueVi: string;
  } | null>(null);
  useEffect(() => {
    gameEventBus.emit('cmd:set-active-npc-dialogue', {
      npcId: activeNpcDialogue?.npcId ?? null,
    });
  }, [activeNpcDialogue]);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const realtimeRef = useRef<RealtimeHandle | null>(null);
  const realtimeStatusRef = useRef<ConnectionStatus>('disconnected');
  const currentUserRef = useRef<AuthSessionUser | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const billiardsEventListenersRef = useRef<
    Set<(event: BilliardsWireEvent, meta?: BilliardsTransportMeta) => void>
  >(new Set());
  const billiardsConnListenersRef = useRef<Set<(status: ConnectionStatus) => void>>(new Set());
  const billiardsSeqRef = useRef(0);
  const billiardsReportedMatchesRef = useRef<Set<string>>(new Set());
  const [billiardsScores, setBilliardsScores] = useState<[number, number]>([0, 0]);
  const [billiardsInitialView, setBilliardsInitialView] = useState<'entry' | 'lobby'>('entry');
  const [billiardsInviteBanner, setBilliardsInviteBanner] = useState<{
    inviterName: string;
    edition: BilliardsEdition;
    rule: BilliardsRule;
  } | null>(null);
  const activeModalRef = useRef(activeModal);
  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [networkDiagnostics, setNetworkDiagnostics] = useState<NetworkDiagnosticsState>(() =>
    createInitialNetworkDiagnostics({ localSessionShort: sanitizeSessionShort(sessionId) }),
  );
  const remoteRenderStatusRef = useRef<{
    remoteCount: number;
    remoteVisibleOnCurrentMap: boolean;
    remoteMapId: MapId | null;
  }>({
    remoteCount: 0,
    remoteVisibleOnCurrentMap: false,
    remoteMapId: null,
  });
  const pendingRemoteMovementsRef = useRef<Map<string, MovementPacket>>(new Map());
  const hiddenAtMsRef = useRef<number | null>(null);
  const snapshotRef = useRef<WorldSnapshot | null>(null);
  useEffect(() => {
    snapshotRef.current = worldSnapshot;
  }, [worldSnapshot]);
  const worldStateVersionRef = useRef(0);
  const worldReqSeqRef = useRef(0);
  const farmReqSeqRef = useRef(0);
  const inventoryReqSeqRef = useRef(0);
  const petReqSeqRef = useRef(0);
  const lastPetVersionRef = useRef(0);
  const lastSnapshotWorldIdRef = useRef<string | null>(null);
  const publishPetCarePatchRef = useRef<(patch: SharedPetCarePatch) => Promise<void>>(async () => {});
  const sharedPetCareSessionRef = useRef<SharedPetCareSession | null>(null);
  const sceneReadyRef = useRef(false);
  const pendingEnterPetCareRef = useRef(false);
  const homeReturnTargetRef = useRef<{ mapId: 'village'; spawnX: number; spawnY: number } | null>(null);

  const localTileRef = useRef<{
    mapId: MapId;
    tileX: number;
    tileY: number;
    x?: number;
    y?: number;
    facing: Direction;
    posture?: CouplePostureKind;
    heldItem?: HeldItemState;
  }>({
    mapId: 'home',
    tileX: 8,
    tileY: 9,
    facing: 'down',
    posture: 'none',
  });

  const buildLocalPresence = useCallback(
    (member: { nickname: string; avatarConfig: AvatarConfig }, userId: string): PresencePayload => {
      const loc = localTileRef.current;
      const held = loc.heldItem;
      return {
        userId,
        sessionId,
        mapId: loc.mapId,
        nickname: member.nickname,
        avatarConfig: member.avatarConfig,
        tileX: loc.tileX,
        tileY: loc.tileY,
        ...(typeof loc.x === 'number' && typeof loc.y === 'number' ? { x: loc.x, y: loc.y } : {}),
        facing: loc.facing,
        posture: loc.posture ?? 'none',
        ...(held
          ? {
              heldItemSku: held.itemSku,
              heldItemKind: held.itemKind,
              heldIconId: held.iconId,
              heldPropsIconId: held.propsIconId ?? null,
            }
          : {}),
        updatedAtMs: Date.now(),
      };
    },
    [sessionId],
  );

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
    const reqSeq = ++worldReqSeqRef.current;
    const res = await backend.getWorldSnapshot();
    if (reqSeq !== worldReqSeqRef.current) return;
    if (!res.ok) {
      showToast(res.message, true);
      return;
    }
    const next = res.data;
    const prevWorld = snapshotRef.current?.world;
    if (
      next &&
      prevWorld &&
      next.world.id === prevWorld.id &&
      next.world.layoutVersion < prevWorld.layoutVersion &&
      (next.world.stateVersion ?? 0) < worldStateVersionRef.current
    ) {
      return;
    }
    if (next?.world.id !== lastSnapshotWorldIdRef.current) {
      lastSnapshotWorldIdRef.current = next?.world.id ?? null;
      worldStateVersionRef.current = next?.world.stateVersion ?? 0;
      farmVersionRef.current = 0;
      deepFarmVersionRef.current = 0;
      lastPetVersionRef.current = 0;
    } else if (typeof next?.world.stateVersion === 'number') {
      worldStateVersionRef.current = Math.max(worldStateVersionRef.current, next.world.stateVersion);
    }
    setWorldSnapshot(next);
  }, [backend, showToast]);

  const refreshInventorySnapshot = useCallback(
    async (explicitWorldId?: string) => {
      const targetWorldId = explicitWorldId ?? snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.inventory) return;
      const reqSeq = ++inventoryReqSeqRef.current;
      setInventoryLoading(true);
      const res = await backend.inventory.getInventory(targetWorldId);
      setInventoryLoading(false);
      if (reqSeq !== inventoryReqSeqRef.current) return;
      if (!res.ok) {
        showToast(res.message, true);
        return;
      }
      setInventorySnapshot(res.data);
    },
    [backend, showToast],
  );

  const applyDeepFarmSnapshotToUi = useCallback((deep: DeepFarmSnapshot) => {
    setDeepFarmSnapshot(deep);
    deepFarmVersionRef.current = deep.version;
    setFarmWalletCoins(deep.walletCoins);
    setFarmClockAnchor({ serverNowMs: deep.serverNowMs, fetchedAtMs: Date.now() });
    setFarmServerNowMs(deep.serverNowMs);
    gameEventBus.emit('cmd:sync-deep-farm', deep);
  }, []);

  const refreshDeepFarmSnapshot = useCallback(
    async (explicitWorldId?: string) => {
      const targetWorldId = explicitWorldId ?? snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.farm) return;
      const res = await backend.farm.getDeepFarmSnapshot(targetWorldId);
      if (res.ok && res.data) {
        applyDeepFarmSnapshotToUi(res.data);
      }
    },
    [applyDeepFarmSnapshotToUi, backend.farm],
  );

  const runDeepFarmAction = useCallback(
    async (action: DeepFarmActionParams) => {
      const targetWorldId = snapshotRef.current?.world.id;
      if (!targetWorldId || !backend.farm) return;
      setDeepFarmBusy(true);
      try {
        const res = await backend.farm.applyDeepFarmAction(action);
        if (!res.ok) {
          setDeepFarmStatusVi(res.message);
          showToast(res.message, true);
          if (res.code === 'VERSION_CONFLICT') {
            await refreshDeepFarmSnapshot(targetWorldId);
          }
          return;
        }
        applyDeepFarmSnapshotToUi(res.data.snapshot);
        setDeepFarmStatusVi(res.data.messageVi);
        showToast(res.data.messageVi);
        if (backend.inventory) {
          await refreshInventorySnapshot(targetWorldId);
        }
        realtimeRef.current?.notifyWorldMutated('farm');
        realtimeRef.current?.notifyWorldMutated('inventory');
      } finally {
        setDeepFarmBusy(false);
      }
    },
    [applyDeepFarmSnapshotToUi, backend.farm, backend.inventory, refreshDeepFarmSnapshot, refreshInventorySnapshot, showToast],
  );

  const refreshFarmWallet = useCallback(async () => {
    const targetWorldId = snapshotRef.current?.world.id;
    if (!targetWorldId || !backend.farm) return;
    const reqSeq = ++farmReqSeqRef.current;
    const res = await backend.farm.getFarmSnapshot(targetWorldId);
    if (reqSeq !== farmReqSeqRef.current) return;
    if (res.ok && res.data) {
      if (res.data.worldId === targetWorldId && res.data.version < farmVersionRef.current) {
        return;
      }
      setFarmWalletCoins(res.data.walletCoins);
      farmVersionRef.current = res.data.version;
      applyFarmSnapshotToUi(res.data);
      void refreshDeepFarmSnapshot(targetWorldId);
      if (backend.inventory) await refreshInventorySnapshot(targetWorldId);
    }
  }, [applyFarmSnapshotToUi, backend.farm, backend.inventory, refreshDeepFarmSnapshot, refreshInventorySnapshot]);

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
      const reqSeq = ++petReqSeqRef.current;
      const res = await backend.pet.getPetSnapshot(targetWorldId);
      if (reqSeq !== petReqSeqRef.current) return;
      if (res.ok) {
        if (res.data && res.data.worldId === targetWorldId && res.data.version < lastPetVersionRef.current) {
          return;
        }
        lastPetVersionRef.current = res.data?.version ?? 0;
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

  const activeFloatingStudy = studySnapshot?.sharedSession ?? studySnapshot?.soloSession ?? null;
  const derivedFloatingStudy = activeFloatingStudy
    ? deriveStudySessionAt(
        activeFloatingStudy,
        (studySnapshot?.serverNowMs ?? 0) + studyClockTick * 1000,
      )
    : null;
  const studySilencesGameMusic =
    activeModal === 'study' ||
    ambientTrack !== 'none' ||
    derivedFloatingStudy?.status === 'running';
  const studySilencesGameMusicRef = useRef(studySilencesGameMusic);

  useEffect(() => {
    studySilencesGameMusicRef.current = studySilencesGameMusic;
    gameAudio.setOverlayPaused(studySilencesGameMusic || activeModal === 'billiards');
    return () => {
      gameAudio.setOverlayPaused(false);
    };
  }, [activeModal, studySilencesGameMusic]);

  useEffect(() => () => stopStudyAmbient(), []);

  useEffect(() => registerLivingPetDevAcceptanceHooks(), []);

  useEffect(
    () =>
      gameEventBus.on('evt:pet-care-mode', ({ active }) => {
        if (active) pendingEnterPetCareRef.current = false;
        setPetCareMode(active);
      }),
    [],
  );

  useEffect(
    () =>
      gameEventBus.on('cmd:sync-held-item', (held) => {
        setHeldHotbarIndex(held.itemKind === 'none' ? null : held.slotIndex);
        setHeldItemSku(held.itemKind === 'none' ? null : (held.itemSku ?? null));
      }),
    [],
  );

  useEffect(
    () =>
      gameEventBus.on('evt:held-water-adjust', ({ level, itemSku }) => {
        const clamped = Math.max(0, Math.min(100, Math.round(level)));
        setWaterFillBySku((prev) => ({
          ...prev,
          [itemSku ?? 'water_pitcher']: clamped,
        }));
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
      if (packet.type === 'COUPLE_SCRAPBOOK') {
        if (packet.userId === currentUser.userId) return;
        if (packet.action === 'flip' && packet.pageIndex !== undefined) {
          setPartnerScrapbookUserId(packet.userId);
          setPartnerScrapbookPage(packet.pageIndex);
        }
        if (
          packet.action === 'sticker' &&
          packet.pageId &&
          packet.stickerEmoji &&
          snapshotRef.current?.world.id
        ) {
          applyRemoteStickerToStoredAlbum(snapshotRef.current.world.id, packet);
          setScrapbookStorageEpoch((n) => n + 1);
        }
        return;
      }
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
            phaseStartedAtMs: packet.phaseStartedAtMs,
            anchorX: packet.anchorX,
            anchorY: packet.anchorY,
          });
          if (packet.posture === 'none' && isPairedCouplePosture(localPostureRef.current)) {
            setLocalPosture('none');
            gameEventBus.emit('cmd:apply-local-posture', { posture: 'none' });
          }
        }
        return;
      }
      if (packet.type === 'COUPLE_INVITE') {
        if (
          packet.toUserId === currentUser.userId &&
          !consumedInviteIdsRef.current.has(packet.inviteId)
        ) {
          const nowLocal = Date.now();
          const localExpiresAtMs = resolveInviteLocalExpiryMs(packet.ttlMs, nowLocal);
          setCoupleClockNowMs(nowLocal);
          setIncomingHugInvite({ ...packet, expiresAtMs: localExpiresAtMs });
        }
        return;
      }
      if (packet.type === 'COUPLE_ACCEPT') {
        if (packet.toUserId === currentUser.userId || packet.fromUserId === currentUser.userId) {
          consumedInviteIdsRef.current.add(packet.inviteId);
          setOutgoingInviteExpiresAtMs(null);
          setIncomingHugInvite(null);
          const acceptKind: CoupleInteractionKind = packet.kind ?? 'hug';
          const meta = getCoupleInteractionMeta(acceptKind);
          const phaseStartedAtMs = packet.phaseStartedAtMs ?? packet.acceptedAtMs ?? Date.now();
          if (currentMapIdRef.current === packet.mapId) {
            const isInviter = packet.toUserId === currentUser.userId;
            const pose = resolveCoupleAcceptPose(acceptKind, packet.anchorX, packet.anchorY, isInviter);
            setLocalPosture(acceptKind);
            gameEventBus.emit('cmd:apply-local-posture', {
              posture: acceptKind,
              x: pose.x,
              y: pose.y,
              facing: pose.facing,
              phaseStartedAtMs,
              anchorX: packet.anchorX,
              anchorY: packet.anchorY,
            });
          }
          showToast(meta.acceptedToastVi);
        }
        return;
      }
      if (packet.type === 'COUPLE_DECLINE') {
        if (packet.toUserId === currentUser.userId) {
          setOutgoingInviteExpiresAtMs(null);
          showToast('Người thương hẹn lại sau một lát nhé.');
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
          if (isPairedCouplePosture(localPostureRef.current)) {
            setLocalPosture('none');
            gameEventBus.emit('cmd:apply-local-posture', { posture: 'none' });
          }
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

  const sendCoupleInvite = useCallback(
    (kind: CoupleInteractionKind) => {
      const snap = snapshotRef.current;
      if (!snap || !currentUser) return;
      const meta = getCoupleInteractionMeta(kind);
      const partner = presences.find(
        (p) => p.userId !== currentUser.userId && p.mapId === currentMapId,
      );
      if (!partner) {
        showToast(
          `Hãy vào cùng một phòng với người thương để ${meta.labelVi.toLowerCase()} nhé.`,
          true,
        );
        return;
      }
      const now = Date.now();
      const anchorX = Math.round(((localTileRef.current.tileX + 0.5) * 16 + (partner.tileX + 0.5) * 16) / 2);
      const anchorY = Math.round(((localTileRef.current.tileY + 1) * 16 + (partner.tileY + 1) * 16) / 2);
      const invite = createCoupleInvite({
        inviteId: makeIdempotencyKey(kind),
        kind,
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
      showToast(`Đã gửi lời mời ${meta.labelVi.toLowerCase()} (15 giây)...`);
    },
    [currentMapId, currentUser, presences, sessionId, showToast],
  );

  const handleRequestInteraction = useCallback(
    (kind: CoupleInteractionKind) => {
      sendCoupleInvite(kind);
    },
    [sendCoupleInvite],
  );

  const handleRequestHug = useCallback(() => {
    sendCoupleInvite('hug');
  }, [sendCoupleInvite]);

  const handleRequestHoldHands = useCallback(() => {
    sendCoupleInvite('hold_hands');
  }, [sendCoupleInvite]);

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
      showToast('Lời mời đã hết hạn hoặc không còn ở cùng phòng.', true);
      return;
    }
    const acceptKind = incomingHugInvite.kind;
    const pose = resolveCoupleAcceptPose(acceptKind, check.accept.anchorX, check.accept.anchorY, false);
    const phaseStartedAtMs = Date.now();
    consumedInviteIdsRef.current.add(incomingHugInvite.inviteId);
    setIncomingHugInvite(null);
    realtimeRef.current?.publishCoupleEvent?.({
      ...check.accept,
      phaseStartedAtMs,
    });
    setLocalPosture(acceptKind);
    gameEventBus.emit('cmd:apply-local-posture', {
      posture: acceptKind,
      x: pose.x,
      y: pose.y,
      facing: pose.facing,
      phaseStartedAtMs,
      anchorX: check.accept.anchorX,
      anchorY: check.accept.anchorY,
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
    const wasPaired = isPairedCouplePosture(localPostureRef.current);
    setLocalPosture('none');
    gameEventBus.emit('cmd:cancel-local-posture');
    const worldId = snapshotRef.current?.world.id;
    if (wasPaired && worldId && currentUser) {
      realtimeRef.current?.publishCoupleEvent?.({
        type: 'COUPLE_END',
        worldId,
        userId: currentUser.userId,
        reason: 'cancelled',
      });
    }
  }, [currentUser]);

  // Initial auth bootstrap & subscription
  useEffect(() => {
    let active = true;
    void (async () => {
      let user = await backend.getCurrentUser();
      if (!active) return;
      if (import.meta.env.DEV && backend.mode === 'dev-lan') {
        const currentUrl = typeof window !== 'undefined' ? new URL(window.location.href) : null;
        const urlHasRemote = currentUrl?.searchParams.get('remote-partner') === '1';
        if (urlHasRemote && currentUrl && typeof window !== 'undefined') {
          currentUrl.searchParams.delete('remote-partner');
          window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
        }
        const ctx = await backend.getDevClientContext?.();
        if (!active) return;
        if (ctx?.isRemoteClient || urlHasRemote) {
          setIsRemoteClient(true);
          const preset = ctx?.autoPartnerPreset ?? 'partner-b';
          if (backend.signInLocalPreset && user?.email !== 'partner-b.dev@ourlittleworld.test') {
            const signRes = await backend.signInLocalPreset(preset);
            if (active && signRes.ok) {
              user = signRes.data;
            }
          }
        }
      }
      if (!active) return;
      setCurrentUser(user);
      if (user) {
        const snapRes = await backend.getWorldSnapshot();
        if (active && snapRes.ok) {
          setWorldSnapshot(snapRes.data);
        }
      }
      if (active) setAuthReady(true);
    })();

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
      for (const listener of billiardsConnListenersRef.current) {
        listener(status);
      }
    };
    updateConnectionStatus('connecting');

    const initialPresence = buildLocalPresence(memberSnapshot, currentUser.userId);

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
          pendingRemoteMovementsRef.current.set(packet.userId, packet);
          if (sceneReadyRef.current) {
            gameEventBus.emit('cmd:remote-movement', packet);
          }
        },
        onDonorFishingSync: (session) => {
          gameEventBus.emit('evt:donor-fishing-sync', session);
        },
        onWorldMutated: (reason, meta) => {
          if (typeof meta?.stateVersion === 'number') {
            if (reason === 'member' && meta.stateVersion === 1) {
              worldStateVersionRef.current = 1;
              farmVersionRef.current = 0;
              deepFarmVersionRef.current = 0;
              lastPetVersionRef.current = 0;
            } else if (meta.stateVersion < worldStateVersionRef.current) {
              return;
            } else {
              worldStateVersionRef.current = Math.max(worldStateVersionRef.current, meta.stateVersion);
            }
          }
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
        onWelcomeResync: ({ stateVersion, isReconnect }) => {
          const prevVersion = worldStateVersionRef.current;
          if (stateVersion > worldStateVersionRef.current) {
            worldStateVersionRef.current = stateVersion;
          }
          if (isReconnect || stateVersion > prevVersion) {
            void refreshWorldSnapshot();
            void refreshFarmWallet();
            void refreshInventorySnapshot(worldId);
            void refreshPetSnapshot(worldId);
            void refreshStudySnapshot(worldId);
            void refreshMailboxSnapshot(worldId);
          }
        },
        onDiagnosticsChange: (diag) => {
          setNetworkDiagnostics({
            ...diag,
            localMapId: currentMapIdRef.current,
            remoteRenderedOnMap: remoteRenderStatusRef.current.remoteVisibleOnCurrentMap,
            stateVersion: Math.max(diag.stateVersion, worldStateVersionRef.current),
          });
          gameEventBus.emit('cmd:set-network-metrics', {
            rttMs: diag.rttMs,
            jitterMs: diag.jitterMs,
          });
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
            const curRev = sharedPetCareSessionRef.current?.revision ?? -1;
            if (packet.session.revision < curRev) return;
            sharedPetCareSessionRef.current = packet.session;
            setLatestSharedPetCareSession(packet.session);
            gameEventBus.emit('cmd:sync-shared-pet-care-session', packet.session);
          }
        },
        onMinigameEvent: (packet) => {
          if (packet.gameId !== 'billiards') return;
          if (packet.worldId !== worldId) return;
          if (packet.sessionId === sessionId) return;
          const parsed = BilliardsWireEventSchema.safeParse(packet.payload);
          if (!parsed.success) return;
          const isServerEvent = packet.sessionId === 'server-lobby';
          const members = snapshotRef.current?.members ?? [];
          const sender = isServerEvent ? null : members.find((m) => m.userId === packet.actorUserId);
          if (!isServerEvent && !sender) return;
          const verifiedSenderSlot: PlayerSlot | undefined = sender
            ? sender.role === 'partner'
              ? 1
              : 0
            : undefined;
          if (parsed.data.type === 'billiards:lobby_invite' && activeModalRef.current !== 'billiards') {
            setBilliardsInviteBanner({
              inviterName: parsed.data.payload.inviterName,
              edition: parsed.data.payload.edition,
              rule: parsed.data.payload.rule,
            });
          }
          for (const listener of billiardsEventListenersRef.current) {
            listener(
              parsed.data,
              verifiedSenderSlot !== undefined ? { verifiedSenderSlot } : undefined,
            );
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
        if (handle.getDiagnostics) {
          const diag = handle.getDiagnostics();
          setNetworkDiagnostics({
            ...diag,
            localMapId: currentMapIdRef.current,
            remoteRenderedOnMap: remoteRenderStatusRef.current.remoteVisibleOnCurrentMap,
            stateVersion: Math.max(diag.stateVersion, worldStateVersionRef.current),
          });
        }
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
  }, [
    backend,
    worldId,
    currentUser,
    sessionId,
    buildLocalPresence,
    refreshWorldSnapshot,
    refreshFarmWallet,
    refreshInventorySnapshot,
    refreshPetSnapshot,
    refreshStudySnapshot,
    refreshMailboxSnapshot,
  ]);

  // Refresh presence with the current pixel/tile/held-item state after reconnect, map or avatar changes.
  useEffect(() => {
    if (connectionStatus !== 'connected' || !realtimeRef.current || !currentUser || !localMember) return;
    localTileRef.current = { ...localTileRef.current, mapId: currentMapId };
    realtimeRef.current.updatePresence(buildLocalPresence(localMember, currentUser.userId));
  }, [connectionStatus, movementConnectionVersion, currentMapId, localMember, currentUser, buildLocalPresence]);

  useEffect(() => {
    for (const listener of billiardsConnListenersRef.current) {
      listener(connectionStatus);
    }
  }, [connectionStatus]);

  const billiardsTransport = useMemo<BilliardsTransport>(
    () => ({
      send(event: BilliardsWireEvent) {
        const wid = snapshotRef.current?.world.id;
        const uid = currentUserRef.current?.userId;
        if (!wid || !uid || !realtimeRef.current) return;
        const payloadObj = event.payload as Record<string, unknown>;
        const matchId =
          event.type === 'billiards:state_request'
            ? (typeof payloadObj.currentMatchId === 'string' && payloadObj.currentMatchId) || 'billiards'
            : typeof payloadObj.matchId === 'string' && payloadObj.matchId
              ? payloadObj.matchId
              : 'billiards-lobby';
        const stateVersion =
          event.type === 'billiards:start'
            ? 1
            : event.type === 'billiards:state_request'
              ? Number(payloadObj.currentStateVersion ?? 0)
              : typeof payloadObj.stateVersion === 'number'
                ? payloadObj.stateVersion
                : typeof payloadObj.configVersion === 'number'
                  ? payloadObj.configVersion
                  : 0;
        realtimeRef.current.publishMinigameEvent?.({
          type: 'MINIGAME_EVENT',
          gameId: 'billiards',
          matchId,
          worldId: wid,
          actorUserId: uid,
          sessionId,
          seq: ++billiardsSeqRef.current,
          stateVersion,
          payload: event,
        });
      },
      subscribe(handler) {
        billiardsEventListenersRef.current.add(handler);
        return () => {
          billiardsEventListenersRef.current.delete(handler);
        };
      },
      subscribeConnection(handler) {
        billiardsConnListenersRef.current.add(handler);
        return () => {
          billiardsConnListenersRef.current.delete(handler);
        };
      },
      getConnectionStatus() {
        return realtimeStatusRef.current;
      },
      getServerClockOffsetMs() {
        return realtimeRef.current?.getServerClockOffsetMs?.() ?? 0;
      },
      getRttMs() {
        return realtimeRef.current?.getRttMs?.() ?? null;
      },
    }),
    [sessionId],
  );

  const billiardsPlayers = useMemo(() => {
    const owner = worldSnapshot?.members.find((m) => m.role === 'owner') ?? null;
    const partner = worldSnapshot?.members.find((m) => m.role === 'partner') ?? null;
    const localSlot: PlayerSlot = partner && currentUser?.userId === partner.userId ? 1 : 0;
    const playerNames: [string, string] = [
      owner?.nickname ?? 'Chủ nhà',
      partner?.nickname ?? 'Người thương',
    ];
    const slotUserIds: [string | null, string | null] = [
      owner?.userId ?? null,
      partner?.userId ?? null,
    ];
    const initialMode: 'online' | 'local_pvp' = partner ? 'online' : 'local_pvp';
    return { localSlot, playerNames, slotUserIds, initialMode };
  }, [currentUser?.userId, worldSnapshot?.members]);

  useEffect(() => {
    if (activeModal !== 'billiards' || !worldId || !backend.billiards) return;
    let cancelled = false;
    void backend.billiards.getStats(worldId).then((res) => {
      if (cancelled || !res.ok) return;
      const u0 = billiardsPlayers.slotUserIds[0];
      const u1 = billiardsPlayers.slotUserIds[1];
      const s0 = u0 ? (res.data.tallies.find((t) => t.userId === u0)?.wins ?? 0) : 0;
      const s1 = u1 ? (res.data.tallies.find((t) => t.userId === u1)?.wins ?? 0) : 0;
      setBilliardsScores([s0, s1]);
    });
    return () => {
      cancelled = true;
    };
  }, [activeModal, backend.billiards, billiardsPlayers.slotUserIds, worldId]);

  const handlePauseOverworldForBilliards = useCallback(() => {
    gameAudio.setOverlayPaused(true);
    suspendStudyAmbient();
    gameEventBus.emit('cmd:set-render-suspended', { suspended: true });
  }, []);

  const handleOpenBilliards = useCallback(() => {
    setBilliardsInitialView('entry');
    setBilliardsInviteBanner(null);
    setActiveModal('billiards');
  }, []);

  const handleResumeOverworldForBilliards = useCallback(() => {
    gameEventBus.emit('cmd:set-render-suspended', { suspended: false });
    resumeStudyAmbient();
    gameAudio.setOverlayPaused(studySilencesGameMusicRef.current);
  }, []);

  const handleBilliardsMatchComplete = useCallback(
    async (result: BilliardsMatchResult) => {
      if (result.mode && result.mode !== 'online') return;
      const wid = snapshotRef.current?.world.id;
      if (!wid || !backend.billiards) return;
      if (billiardsReportedMatchesRef.current.has(result.matchId)) return;

      const winnerUserId = billiardsPlayers.slotUserIds[result.winnerSlot];
      if (!winnerUserId) return;
      const loserSlot: PlayerSlot = result.winnerSlot === 0 ? 1 : 0;
      const candidateLoser = billiardsPlayers.slotUserIds[loserSlot];
      const loserUserId =
        candidateLoser && candidateLoser !== winnerUserId ? candidateLoser : null;

      billiardsReportedMatchesRef.current.add(result.matchId);
      const res = await backend.billiards.recordMatch({
        worldId: wid,
        matchId: result.matchId,
        rule: result.rule,
        rackSeed: result.rackSeed,
        winnerUserId,
        loserUserId,
        reason: result.reason,
        shots: result.shots,
        durationSeconds: result.durationSeconds,
      });
      if (!res.ok) {
        billiardsReportedMatchesRef.current.delete(result.matchId);
        showToast(res.message, true);
        return;
      }
      const u0 = billiardsPlayers.slotUserIds[0];
      const u1 = billiardsPlayers.slotUserIds[1];
      const s0 = u0 ? (res.data.tallies.find((t) => t.userId === u0)?.wins ?? 0) : 0;
      const s1 = u1 ? (res.data.tallies.find((t) => t.userId === u1)?.wins ?? 0) : 0;
      setBilliardsScores([s0, s1]);
    },
    [backend.billiards, billiardsPlayers.slotUserIds, showToast],
  );

  // Visibility & network reconnect flow (crucial for iPhone Safari background/lock resume & Wi-Fi <-> 5G)
  const handleReconnectAndResync = useCallback(
    async (forceStreamReconnect = true, probeFirst = false) => {
      if (!realtimeRef.current || !snapshotRef.current) return;
      if (probeFirst && realtimeRef.current.probeLiveness) {
        const alive = await realtimeRef.current.probeLiveness();
        if (!alive) {
          await refreshWorldSnapshot();
          return;
        }
      }
      if (forceStreamReconnect || realtimeStatusRef.current !== 'connected') {
        await realtimeRef.current.reconnect();
      } else if (currentUser && localMemberRef.current) {
        realtimeRef.current.updatePresence(buildLocalPresence(localMemberRef.current, currentUser.userId));
        setMovementConnectionVersion((version) => version + 1);
      }
      await Promise.all([
        refreshWorldSnapshot(),
        refreshFarmWallet(),
        refreshInventorySnapshot(),
        refreshPetSnapshot(),
        refreshStudySnapshot(),
        refreshMailboxSnapshot(),
      ]);
    },
    [
      buildLocalPresence,
      currentUser,
      refreshWorldSnapshot,
      refreshFarmWallet,
      refreshInventorySnapshot,
      refreshPetSnapshot,
      refreshStudySnapshot,
      refreshMailboxSnapshot,
    ],
  );

  const handleSimulateOffline = useCallback((offline: boolean) => {
    realtimeRef.current?.setSimulatedOffline?.(offline);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtMsRef.current = Date.now();
        return;
      }
      if (snapshotRef.current) {
        const hiddenMs = hiddenAtMsRef.current !== null ? Date.now() - hiddenAtMsRef.current : 0;
        hiddenAtMsRef.current = null;
        void handleReconnectAndResync(hiddenMs >= 4000, hiddenMs >= 1500);
      }
    };
    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted && snapshotRef.current) {
        void handleReconnectAndResync(true);
      }
    };
    const onOnline = () => {
      if (snapshotRef.current) {
        showToast('Đã kết nối lại — ngôi nhà đã được đồng bộ.');
        void handleReconnectAndResync(true);
      }
    };
    const onOffline = () => {
      realtimeStatusRef.current = 'offline';
      setConnectionStatus('offline');
      showToast('Đang tạm mất mạng — ứng dụng sẽ tự kết nối lại khi có mạng.', true);
    };
    const onConnectionChange = () => {
      if (snapshotRef.current && !document.hidden) {
        void handleReconnectAndResync(false, true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const netConn = (navigator as Navigator & { connection?: EventTarget }).connection;
    netConn?.addEventListener?.('change', onConnectionChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      netConn?.removeEventListener?.('change', onConnectionChange);
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
      localTileRef.current = { ...localTileRef.current, ...tile };
    });

    const unsubPosSync = gameEventBus.on('evt:local-position-sync', (pos) => {
      localTileRef.current = pos;
    });

    const unsubRemoteRender = gameEventBus.on('evt:remote-render-status', (renderInfo) => {
      remoteRenderStatusRef.current = renderInfo;
      setNetworkDiagnostics((prev) =>
        prev.remoteRenderedOnMap === renderInfo.remoteVisibleOnCurrentMap
          ? prev
          : { ...prev, remoteRenderedOnMap: renderInfo.remoteVisibleOnCurrentMap },
      );
    });

    const unsubMapReq = gameEventBus.on('evt:request-map-change', ({ targetMapId, spawnX, spawnY, portalId }) => {
      setDecorateActive(false);
      setActiveSku(null);
      setSelectedPlacementId(null);
      const fromMapId = currentMapIdRef.current;
      let resolvedTargetMapId = targetMapId;
      let resolvedSpawnX = spawnX;
      let resolvedSpawnY = spawnY;

      if (fromMapId === 'village' && targetMapId === 'home') {
        homeReturnTargetRef.current = { mapId: 'village', spawnX: 41, spawnY: 31 };
      } else if (fromMapId === 'home' && targetMapId === 'garden' && homeReturnTargetRef.current) {
        resolvedTargetMapId = homeReturnTargetRef.current.mapId;
        resolvedSpawnX = homeReturnTargetRef.current.spawnX;
        resolvedSpawnY = homeReturnTargetRef.current.spawnY;
        homeReturnTargetRef.current = null;
      } else if (targetMapId === 'home') {
        homeReturnTargetRef.current = null;
      }

      const hook = resolveEnvHookForTravel(fromMapId, resolvedTargetMapId, portalId);
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
            toMapId: resolvedTargetMapId,
            atMs: Date.now(),
          });
        }
      }
      setCurrentMapId(resolvedTargetMapId);
      announceZoneEntry(resolvedTargetMapId);
      gameEventBus.emit('cmd:set-map', {
        mapId: resolvedTargetMapId,
        spawnTile: { tileX: resolvedSpawnX, tileY: resolvedSpawnY },
        portalId,
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
      sceneReadyRef.current = true;
      setCurrentMapId((prev) => (prev === mapId ? prev : mapId));
      for (const pkt of pendingRemoteMovementsRef.current.values()) {
        gameEventBus.emit('cmd:remote-movement', pkt);
      }
      void refreshPetSnapshot();
      void refreshStudySnapshot();
      void refreshMailboxSnapshot();
      if (pendingEnterPetCareRef.current || isPetCareModeActive()) {
        pendingEnterPetCareRef.current = false;
        window.setTimeout(() => {
          if (isPetCareModeActive()) {
            gameEventBus.emit('cmd:pet-care-mode', { active: true });
          }
        }, 60);
      }
    });

    const unsubPreview = gameEventBus.on('evt:preview-notice', (notice) => {
      setPreviewNotice(notice);
    });

    const unsubNpcDialogue = gameEventBus.on('evt:open-npc-dialogue', (dialogue) => {
      setActiveNpcDialogue(dialogue);
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
      unsubPosSync();
      unsubRemoteRender();
      unsubMapReq();
      unsubAvatar();
      unsubPetPanel();
      unsubStudyPanel();
      unsubSceneReady();
      unsubPreview();
      unsubNpcDialogue();
      unsubSelect();
      unsubDiag();
      unsubPhoto();
      unsubMailbox();
      unsubPosture();
      unsubHomeBowl();
    };
  }, [announceZoneEntry, currentUser, refreshInventorySnapshot, refreshMailboxSnapshot, refreshPetSnapshot, refreshStudySnapshot, studySeat]);

  useEffect(() => {
    publishPetCarePatchRef.current = async (patch) => {
      const worldId = snapshotRef.current?.world.id;
      if (!worldId || !currentUser) return;
      if (import.meta.env.DEV && backend.mode === 'dev-lan') {
        const res = await fetch('/api/dev-lan/pet-care/session/patch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user-id': currentUser.userId,
          },
          body: JSON.stringify({
            worldId,
            patch,
            idempotencyKey: makeIdempotencyKey('petcare'),
          }),
        });
        const j = await res.json().catch(() => null);
        if (j?.ok && j.data) {
          const curRev = sharedPetCareSessionRef.current?.revision ?? -1;
          if (j.data.revision >= curRev) {
            sharedPetCareSessionRef.current = j.data;
          }
        }
        return;
      }
      const base =
        sharedPetCareSessionRef.current ??
        createSharedPetCareSession(worldId, petSnapshot?.id ?? 'pet-1', patch.atMs);
      const next = mergeSharedPetCareSession(base, patch);
      sharedPetCareSessionRef.current = next;
      setLatestSharedPetCareSession(next);
      realtimeRef.current?.publishPetCareSession?.({
        type: 'PET_CARE_SESSION',
        worldId,
        session: next,
      });
    };
  }, [backend.mode, currentUser, petSnapshot?.id]);

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
    const unsubLocalPatch = gameEventBus.on('evt:pet-care-local-patch', (patch) => {
      if (!isPetCareModeActive()) return;
      void publishPetCarePatchRef.current(patch);
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
      if (payload.kind === 'offer_food') {
        if (payload.sku) {
          gameEventBus.emit('evt:pet-care-request-consume', {
            sku: payload.sku,
            quality: payload.quality ?? 'normal',
            ownerScope: payload.ownerScope ?? 'shared',
          });
        }
        void publishPetCarePatchRef.current({
          kind: 'feed',
          itemSku: payload.sku || 'pet_kibble_basic',
          actorUserId: currentUser.userId,
          atMs: Date.now(),
        });
      }
    });
    const unsubCareMode = gameEventBus.on('cmd:pet-care-mode', ({ active }) => {
      setPetCareModeActive(active);
      setPetCareMode(active);
      if (!active) {
        pendingEnterPetCareRef.current = false;
        return;
      }
      if (!sceneReadyRef.current) {
        pendingEnterPetCareRef.current = true;
      }
      if (sharedPetCareSessionRef.current) {
        gameEventBus.emit('cmd:sync-shared-pet-care-session', sharedPetCareSessionRef.current);
      }
      if (!import.meta.env.DEV || backend.mode !== 'dev-lan') return;
      const worldId = snapshotRef.current?.world.id;
      if (!worldId) return;
      void fetch(`/api/dev-lan/pet-care/session?worldId=${encodeURIComponent(worldId)}`, {
        headers: { 'x-dev-user-id': currentUser.userId },
      })
        .then((r) => r.json())
        .then((j) => {
          if (j?.ok && j.data) {
            sharedPetCareSessionRef.current = j.data;
            gameEventBus.emit('cmd:sync-shared-pet-care-session', j.data);
          }
        })
        .catch(() => undefined);
    });
    return () => {
      unsubStroke();
      unsubLocalPatch();
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
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setDiagnosticsOpen((cur) => !cur);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /** Dev-only stable camera jumps for Visual Quality Gate capture scripts (`?vqg-capture=1`). */
  useEffect(() => {
    if (!import.meta.env.DEV || !worldSnapshot || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('vqg-capture') !== '1') return;
    type VqgCaptureApi = {
      jump: (mapId: MapId, tileX: number, tileY: number) => void;
      openFishing: (spotId?: DonorFishingSpotId) => void;
      openFarmMarket: (shopKind?: FarmShopKind) => void;
      openFarmShipping: () => void;
    };
    const w = window as Window & { __OLW_VQG?: VqgCaptureApi };
    w.__OLW_VQG = {
      jump(mapId, tileX, tileY) {
        setDecorateActive(false);
        setActiveSku(null);
        setSelectedPlacementId(null);
        setCurrentMapId(mapId);
        gameEventBus.emit('cmd:set-map', {
          mapId,
          spawnTile: { tileX, tileY },
        });
      },
      openFishing(spotId = 'meadow_pond') {
        setDonorChillFishingSpot(parseDonorFishingSpot(spotId));
        setActiveModal('donor_fishing');
      },
      openFarmMarket(shopKind = 'seed') {
        void refreshFarmWallet();
        setFarmShopKind(shopKind);
        setActiveModal('farm_market');
      },
      openFarmShipping() {
        void refreshFarmWallet();
        setActiveModal('farm_shipping');
      },
    };
    return () => {
      delete w.__OLW_VQG;
    };
  }, [worldSnapshot, refreshFarmWallet]);

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
        devSandbox: Boolean(import.meta.env.DEV && decorateSandboxUnlocked),
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
    [backend, connectionStatus, currentUser, decorateSandboxUnlocked, mutationBusy, refreshWorldSnapshot, showToast],
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

  const activeNpcPartnerPresence =
    activeNpcDialogue && currentUser
      ? presences.find((p) => p.userId !== currentUser.userId && p.mapId === activeNpcDialogue.mapId)
      : undefined;
  const activeNpcPartnerMember =
    activeNpcDialogue && currentUser && worldSnapshot
      ? worldSnapshot.members.find((m) => m.userId !== currentUser.userId)
      : undefined;
  const activeNpcMapId = activeNpcDialogue?.mapId ?? currentMapId;
  const activeNpcIsNight = (worldClockPresentation?.lighting.night ?? 0) >= 0.45;
  const activeNpcWeatherKind = worldClockPresentation?.weather.kind ?? 'sunny';
  const activeNpcHasPet = Boolean(petSnapshot);
  const activeNpcPetName = petSnapshot?.name;
  const activeNpcPlayerNickname = localMember?.nickname ?? 'Bạn';
  const activeNpcPartnerInSameRoom = Boolean(activeNpcPartnerPresence);
  const activeNpcPartnerNickname =
    activeNpcPartnerPresence?.nickname ?? activeNpcPartnerMember?.nickname;

  const activeNpcContext = useMemo(
    () => ({
      mapId: activeNpcMapId,
      isNight: activeNpcIsNight,
      weatherKind: activeNpcWeatherKind,
      walletCoins: farmWalletCoins,
      hasPet: activeNpcHasPet,
      petName: activeNpcPetName,
      playerNickname: activeNpcPlayerNickname,
      partnerInSameRoom: activeNpcPartnerInSameRoom,
      partnerNickname: activeNpcPartnerNickname,
      heldItemSku,
    }),
    [
      activeNpcMapId,
      activeNpcIsNight,
      activeNpcWeatherKind,
      farmWalletCoins,
      activeNpcHasPet,
      activeNpcPetName,
      activeNpcPlayerNickname,
      activeNpcPartnerInSameRoom,
      activeNpcPartnerNickname,
      heldItemSku,
    ],
  );

  const handleCloseNpcDialogue = useCallback(() => {
    setActiveNpcDialogue(null);
  }, []);

  const handleNpcDialogueAction = useCallback(
    (action: NpcDialogueActionKind) => {
      setActiveNpcDialogue(null);
      if (action === 'open_seed_shop') {
        if (!backend.farm) {
          showToast('Tiệm hạt giống chỉ mở khi kết nối dữ liệu nông trại.');
          return;
        }
        void refreshFarmWallet();
        setFarmShopKind('seed');
        setActiveModal('farm_market');
      } else if (action === 'open_tool_shop') {
        if (!backend.farm) {
          showToast('Tiệm dụng cụ chỉ mở khi kết nối dữ liệu nông trại.');
          return;
        }
        void refreshFarmWallet();
        setFarmShopKind('tool');
        setActiveModal('farm_market');
      } else if (action === 'open_shipping') {
        if (!backend.farm) {
          showToast('Thùng gom nông sản chỉ mở khi có dữ liệu nông trại.');
          return;
        }
        void refreshFarmWallet();
        setActiveModal('farm_shipping');
      } else if (action === 'open_workshop') {
        if (!donorLanPlayable) {
          showToast('Xưởng bánh Hollow sẽ mở trên bản preview nông trại.');
          return;
        }
        setDonorWorkshopFocus('bakery');
        setActiveModal('donor_workshop');
      } else if (action === 'open_fishing_sea') {
        if (!donorLanPlayable) {
          showToast('Cầu câu Vịnh Hải Âu chỉ mở khi máy chủ nông trại/cá sẵn sàng.');
          return;
        }
        setDonorChillFishingSpot('gull_bay');
        setActiveModal('donor_fishing');
      } else if (action === 'open_pet_care') {
        if (backend.pet) {
          setActiveModal('pet');
          void refreshPetSnapshot();
          void refreshInventorySnapshot();
        }
      }
    },
    [
      backend.farm,
      backend.pet,
      donorLanPlayable,
      refreshFarmWallet,
      refreshInventorySnapshot,
      refreshPetSnapshot,
      showToast,
    ],
  );

  function handleSelectMap(target: MapId) {
    const mapId =
      isExtendedWorldDevEnabled() && target === 'outdoor' ? 'village' : target;
    homeReturnTargetRef.current = null;
    setDecorateActive(false);
    setActiveSku(null);
    setSelectedPlacementId(null);
    const fromMapId = currentMapIdRef.current;
    const hook = resolveEnvHookForMapChange(fromMapId, mapId);
    if (hook) {
      gameEventBus.emit('cmd:env-transition', hook);
    }
    setCurrentMapId(mapId);
    announceZoneEntry(mapId);
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
          isRemoteClient={isRemoteClient}
          onEnterWorld={(snap) => setWorldSnapshot(snap)}
        />
      </>
    );
  }

  const isAnyModalOpen = activeModal !== null || previewNotice !== null || activeNpcDialogue !== null;
  const kibbleCount = getSharedKibbleQty(inventorySnapshot?.items ?? []);
  const petFeedCooldownMs = petSnapshot
    ? getPetActionCooldownRemainingMs('feed', petSnapshot.lastFedAtMs, coupleClockNowMs)
    : 0;
  const petCanFeed = Boolean(petSnapshot) && kibbleCount > 0 && petFeedCooldownMs <= 0;

  const partnerMember =
    worldSnapshot.members.find((m) => m.userId !== currentUser.userId) ?? null;

  const isMobileHud = layoutMode !== 'desktop';

  return (
    <div
      ref={appShellRef}
      className="app-shell olw-game-ui"
      data-ui-variant="warm-pixel-cottage"
      data-hud-mode={layoutMode}
      data-focus-expanded={isFocusExpanded ? '1' : '0'}
    >
      <PwaStatusBanner />

      {!isMobileHud ? (
        <>
          <TopStatusBar
            worldName={worldSnapshot.world.name}
            currentMapId={currentMapId}
            backendMode={backend.mode}
            connectionStatus={connectionStatus}
            members={worldSnapshot.members}
            localUserId={currentUser.userId}
            presences={presences}
            onOpenInvite={() => setActiveModal('invite')}
            isRemoteClient={isRemoteClient}
            onOpenRemoteShare={
              import.meta.env.DEV && backend.mode === 'dev-lan' && !isRemoteClient
                ? () => setActiveModal('remote_share')
                : undefined
            }
            onToggleDiagnostics={
              import.meta.env.DEV ? () => setDiagnosticsOpen((cur) => !cur) : undefined
            }
          />

          {worldClockPresentation ? (
            <WorldClockHud
              presentation={worldClockPresentation}
              mode={timeOfDayMode}
              hidden={petCareMode || isAnyModalOpen || decorateActive}
              walletCoins={backend.farm ? farmWalletCoins : null}
              onModeChange={handleTimeOfDayModeChange}
            />
          ) : null}
        </>
      ) : (
        <MobileTopHud
          worldName={worldSnapshot.world.name}
          currentMapId={currentMapId}
          backendMode={backend.mode}
          connectionStatus={connectionStatus}
          members={worldSnapshot.members}
          localUserId={currentUser.userId}
          presences={presences}
          clockPresentation={worldClockPresentation}
          timeOfDayMode={timeOfDayMode}
          walletCoins={backend.farm ? farmWalletCoins : null}
          hidden={petCareMode || isAnyModalOpen || decorateActive}
          isRemoteClient={isRemoteClient}
          onTimeOfDayModeChange={handleTimeOfDayModeChange}
          onOpenMenu={() => setActiveModal('menu')}
          onOpenInvite={() => setActiveModal('invite')}
          onOpenOutdoorNav={() => setOutdoorNavOpen(true)}
          onOpenRemoteShare={
            import.meta.env.DEV && backend.mode === 'dev-lan' && !isRemoteClient
              ? () => setActiveModal('remote_share')
              : undefined
          }
          onToggleDiagnostics={
            import.meta.env.DEV ? () => setDiagnosticsOpen((cur) => !cur) : undefined
          }
        />
      )}

      {import.meta.env.DEV && DevNetworkDiagnosticsOverlay && diagnosticsOpen && (
        <Suspense fallback={null}>
          <DevNetworkDiagnosticsOverlay
            diagnostics={networkDiagnostics}
            onClose={() => setDiagnosticsOpen(false)}
          />
        </Suspense>
      )}

      {activeFloatingStudy && derivedFloatingStudy && derivedFloatingStudy.status !== 'completed' && (
        <button
          type="button"
          className="pill"
          data-testid="study-floating-pill"
          onClick={() => setActiveModal('study')}
          style={{
            position: 'fixed',
            top: isMobileHud ? 'calc(54px + var(--safe-top))' : 52,
            right: isMobileHud ? 'calc(8px + var(--safe-right))' : 12,
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

      {zoneBanner && !petCareMode && !isAnyModalOpen ? (
        <div className="zone-arrival-banner" data-testid="zone-arrival-banner" role="status">
          <strong>{zoneBanner.nameVi}</strong>
          <span>{zoneBanner.subtitleVi}</span>
        </div>
      ) : null}

      {!petCareMode && <LivingPetDevBanner />}
      {!petCareMode && <ExtendedWorldDevBanner />}

      <PetCareTouchOverlay
        active={petCareMode}
        petSnapshot={petSnapshot}
        localUserId={currentUser.userId}
        kibbleCount={kibbleCount}
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
        decorateDevSandbox={Boolean(import.meta.env.DEV && decorateSandboxUnlocked)}
        showJoystick={showJoystick}
        joystickMode={joystickMode}
        hudLayoutMode={layoutMode}
        petCareActive={petCareMode}
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
        hotbarBindings={inventoryLayout.hotbarBindings}
        petSnapshot={petSnapshot}
        decorateActive={decorateActive}
        modalOpen={isAnyModalOpen}
        showJoystick={showJoystick}
        hudLayoutMode={layoutMode}
        hotbarSlotsPerPage={hotbarStrategy.slotsPerPage}
        petCanFeed={petCanFeed}
        interactionMutationBusy={petBusy || farmBusy}
        onOpenInventory={() => {
          setActiveModal('inventory');
          void refreshInventorySnapshot();
        }}
        onCloseTopModal={() => {
          if (activeNpcDialogue) setActiveNpcDialogue(null);
          else if (activeModal) setActiveModal(null);
          else if (previewNotice) setPreviewNotice(null);
        }}
        onFeedPetAuthoritative={async () => {
          await handleInteractPet('feed');
        }}
        onPetPetAuthoritative={async () => {
          await handleInteractPet('pet');
        }}
        onFarmApply={backend.farm ? async (plotIndex, action, seedSku, opts) => {
          const targetWorldId = snapshotRef.current?.world.id;
          if (!targetWorldId) return;
          setFarmBusy(true);
          try {
            const res = await backend.farm!.applyFarm({
              worldId: targetWorldId,
              plotIndex,
              action,
              seedSku,
              fertilizerSku: opts?.fertilizerSku,
              sprinklerSku: opts?.sprinklerSku,
              toolSku: opts?.toolSku,
              useEnvironment: true,
              farmVersion: farmVersionRef.current,
              idempotencyKey: makeIdempotencyKey(`farm-${action}-${plotIndex}`),
            });
            if (!res.ok) {
              gameAudio.playSfx('fail', { volumeScale: 0.6 });
              showToast(res.message ?? 'Không thực hiện được.', true);
              if (res.code === 'VERSION_CONFLICT') await refreshFarmWallet();
              return;
            }
            setFarmWalletCoins(res.data.snapshot.walletCoins);
            farmVersionRef.current = res.data.snapshot.version;
            applyFarmSnapshotToUi(res.data.snapshot, { plotId: plotIndex, action });
            void refreshDeepFarmSnapshot(targetWorldId);
            await refreshInventorySnapshot();
            if (res.data.harvested?.length) {
              gameAudio.playStinger('item');
              showToast(
                `Thu hoạch: ${res.data.harvested
                  .map((h) => getCropDefinition(h.sku)?.nameVi ?? h.sku)
                  .join(', ')}`,
              );
            } else {
              showToast(
                action === 'till'
                  ? 'Đã cuốc xong.'
                  : action === 'plant'
                    ? 'Đã gieo hạt.'
                    : action === 'water'
                      ? 'Đã tưới.'
                      : action === 'fertilize'
                        ? 'Đã bón phân cho ô đất.'
                        : action === 'place_sprinkler'
                          ? 'Đã đặt vòi phun tự động.'
                          : action === 'remove_sprinkler'
                            ? 'Đã thu hồi vòi phun.'
                            : 'Xong.',
              );
            }
            realtimeRef.current?.notifyWorldMutated('farm');
            realtimeRef.current?.notifyWorldMutated('inventory');
          } finally {
            setFarmBusy(false);
          }
        } : undefined}
        onOpenFarmMarket={backend.farm
          ? (shopKind) => {
              void refreshFarmWallet();
              setFarmShopKind(shopKind ?? 'seed');
              setActiveModal('farm_market');
            }
          : undefined}
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
          donorLanPlayable && worldId
            ? () => {
                setDonorChillFishingSpot('east_stream');
                setActiveModal('donor_fishing');
              }
            : undefined
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
          hudLayoutMode={layoutMode}
          onSendEmote={handleSendEmote}
          onRequestHug={handleRequestHug}
          onRequestHoldHands={handleRequestHoldHands}
          onRequestInteraction={handleRequestInteraction}
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
          devSandboxUnlocked={Boolean(import.meta.env.DEV && decorateSandboxUnlocked)}
          onToggleDevSandbox={
            import.meta.env.DEV
              ? () => {
                  setDecorateSandboxUnlocked((prev) => {
                    const next = !prev;
                    if (!next && activeSku && getCatalogItem(activeSku)?.devSandboxOnly) {
                      setActiveSku(null);
                    }
                    return next;
                  });
                }
              : undefined
          }
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
      ) : !isMobileHud ? (
        <QuickNavBar
          hidden={petCareMode || activeNpcDialogue !== null}
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
              announceZoneEntry(target);
              const def = getMapDefinition(target);
              gameEventBus.emit('cmd:set-map', { mapId: target, spawnTile: def.defaultSpawn });
            }
          }}
          onOpenAvatar={() => setActiveModal('avatar')}
          onOpenMenu={() => setActiveModal('menu')}
        />
      ) : null}

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

      {activeModal === 'menu' && isMobileHud && (
        <MobileNavDrawer
          open
          worldName={worldSnapshot.world.name}
          currentMapId={currentMapId}
          decorateActive={decorateActive}
          backendMode={backend.mode}
          mailboxUnreadCount={mailboxSnapshot?.unreadCount ?? 0}
          isRemoteClient={isRemoteClient}
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
              announceZoneEntry(target);
              const def = getMapDefinition(target);
              gameEventBus.emit('cmd:set-map', { mapId: target, spawnTile: def.defaultSpawn });
            }
          }}
          onOpenAvatar={() => setActiveModal('avatar')}
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
          onOpenBilliards={handleOpenBilliards}
          onOpenFlowerOrchard={
            backend.farm && worldId
              ? () => {
                  setDeepFarmStatusVi(null);
                  void refreshDeepFarmSnapshot(worldId);
                  setActiveModal('deep_flowers');
                }
              : undefined
          }
          onOpenLivestock={
            backend.farm && worldId
              ? () => {
                  setDeepFarmStatusVi(null);
                  void refreshDeepFarmSnapshot(worldId);
                  setActiveModal('deep_livestock');
                }
              : undefined
          }
          onOpenDonorWorkshop={
            backend.farm && worldId
              ? () => {
                  setDonorWorkshopFocus(undefined);
                  void refreshDeepFarmSnapshot(worldId);
                  setActiveModal('donor_workshop');
                }
              : undefined
          }
          onOpenOrderBoard={
            backend.farm && worldId
              ? () => {
                  setDeepFarmStatusVi(null);
                  void refreshDeepFarmSnapshot(worldId);
                  setActiveModal('deep_orders');
                }
              : undefined
          }
          onOpenPwaGuide={() => setActiveModal('pwa')}
          onOpenSpikeLab={
            import.meta.env.DEV && !isRemoteClient ? () => setActiveModal('spike') : undefined
          }
          onOpenDevConsole={
            import.meta.env.DEV && !isRemoteClient && backend.devConsole
              ? () => setActiveModal('dev_console')
              : undefined
          }
          onOpenV03Prototypes={
            import.meta.env.DEV && !isRemoteClient ? () => setActiveModal('v03_proto') : undefined
          }
          onOpenDonorFishing={
            import.meta.env.DEV && backend.mode === 'dev-lan' && worldId
              ? () => setActiveModal('donor_fishing')
              : undefined
          }
          onQuickSwitchDev={
            import.meta.env.DEV && !isRemoteClient && backend.mode === 'dev-lan'
              ? (preset) => void handleQuickSwitchDev(preset)
              : undefined
          }
          onResetDevWorld={
            import.meta.env.DEV && !isRemoteClient && backend.mode === 'dev-lan'
              ? () => void handleResetDevWorld()
              : undefined
          }
          onOpenRemoteShare={
            import.meta.env.DEV && !isRemoteClient && backend.mode === 'dev-lan'
              ? () => setActiveModal('remote_share')
              : undefined
          }
          onSignOut={() => {
            setActiveModal(null);
            void backend.signOut();
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'menu' && !isMobileHud && (
        <MenuModal
          worldName={worldSnapshot.world.name}
          backendMode={backend.mode}
          showJoystick={showJoystick}
          onToggleJoystick={toggleJoystickEnabled}
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
            if (import.meta.env.DEV && !isRemoteClient) setActiveModal('spike');
          }}
          onOpenDevConsole={
            import.meta.env.DEV && !isRemoteClient && backend.devConsole
              ? () => setActiveModal('dev_console')
              : undefined
          }
          onOpenV03Prototypes={
            import.meta.env.DEV && !isRemoteClient ? () => setActiveModal('v03_proto') : undefined
          }
          onQuickSwitchDev={
            import.meta.env.DEV && !isRemoteClient && backend.mode === 'dev-lan'
              ? (preset) => void handleQuickSwitchDev(preset)
              : undefined
          }
          onResetDevWorld={
            import.meta.env.DEV && !isRemoteClient && backend.mode === 'dev-lan'
              ? () => void handleResetDevWorld()
              : undefined
          }
          onOpenRemoteShare={
            import.meta.env.DEV && !isRemoteClient && backend.mode === 'dev-lan'
              ? () => setActiveModal('remote_share')
              : undefined
          }
          isRemoteClient={isRemoteClient}
          onOpenDonorWorkshop={
            backend.farm && worldId
              ? () => {
                  setDonorWorkshopFocus(undefined);
                  void refreshDeepFarmSnapshot(worldId);
                  setActiveModal('donor_workshop');
                }
              : undefined
          }
          onOpenFlowerOrchard={
            backend.farm && worldId
              ? () => {
                  setDeepFarmStatusVi(null);
                  void refreshDeepFarmSnapshot(worldId);
                  setActiveModal('deep_flowers');
                }
              : undefined
          }
          onOpenLivestock={
            backend.farm && worldId
              ? () => {
                  setDeepFarmStatusVi(null);
                  void refreshDeepFarmSnapshot(worldId);
                  setActiveModal('deep_livestock');
                }
              : undefined
          }
          onOpenOrderBoard={
            backend.farm && worldId
              ? () => {
                  setDeepFarmStatusVi(null);
                  void refreshDeepFarmSnapshot(worldId);
                  setActiveModal('deep_orders');
                }
              : undefined
          }
          onOpenBilliards={handleOpenBilliards}
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
          layout={inventoryLayout}
          onChangeLayout={handleChangeInventoryLayout}
          localUserId={currentUser.userId}
          hotbarSlots={inventoryHotbarSlots}
          heldHotbarIndex={heldHotbarIndex}
          loading={inventoryLoading}
          touchMode={isMobileHud}
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
          onChangeAmbient={(track) => {
            const applied = setStudyAmbientTrack(track);
            setAmbientTrack(applied);
            if (applied === 'none') {
              stopStudyAmbient();
              gameAudio.setOverlayPaused(true);
            }
          }}
          onStartSession={handleStartStudy}
          onControlSession={handleControlStudy}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'photo' && currentUser && worldSnapshot && (
        <ScrapbookAlbumModal
          key={`scrapbook-${scrapbookStorageEpoch}`}
          worldId={worldSnapshot.world.id}
          localUserId={currentUser.userId}
          partnerPageIndex={partnerScrapbookPage}
          partnerUserId={partnerScrapbookUserId}
          selectedPresetId={selectedPhotoPresetId}
          onSelectPreset={setSelectedPhotoPresetId}
          onPublishScrapbook={(packet) => realtimeRef.current?.publishCoupleEvent?.(packet)}
          onClose={() => {
            setActiveModal(null);
            setPartnerScrapbookPage(null);
          }}
        />
      )}

      {(donorLanPlayable || Boolean(deepFarmSnapshot)) && activeModal === 'donor_workshop' && worldId && (
        <DonorWorkshopModal
          worldId={worldId}
          focusSection={donorWorkshopFocus}
          inventory={inventorySnapshot}
          legacyVillageEnabled={donorLanPlayable}
          onClose={() => {
            setActiveModal(null);
            setDonorWorkshopFocus(undefined);
          }}
          onInventoryRefresh={async () => refreshInventorySnapshot(worldId)}
          nowMs={farmServerNowMs || undefined}
          walletCoins={farmWalletCoins}
          inventoryItems={inventorySnapshot?.items ?? []}
          workshopsState={deepFarmSnapshot?.workshops ?? null}
          onQueueDeepRecipe={
            backend.farm && deepFarmSnapshot
              ? async (workshopId: WorkshopId, recipeId: string) =>
                  runDeepFarmAction({
                    kind: 'queue_workshop',
                    worldId,
                    workshopId,
                    recipeId,
                    expectedVersion: deepFarmVersionRef.current,
                    idempotencyKey: makeIdempotencyKey(`ws-q-${workshopId}-${recipeId}`),
                  })
              : undefined
          }
          onCollectDeepWorkshop={
            backend.farm && deepFarmSnapshot
              ? async (workshopId: WorkshopId) =>
                  runDeepFarmAction({
                    kind: 'collect_workshop',
                    worldId,
                    workshopId,
                    expectedVersion: deepFarmVersionRef.current,
                    idempotencyKey: makeIdempotencyKey(`ws-c-${workshopId}`),
                  })
              : undefined
          }
          onCancelDeepJob={
            backend.farm && deepFarmSnapshot
              ? async (workshopId: WorkshopId, jobId: string) =>
                  runDeepFarmAction({
                    kind: 'cancel_workshop',
                    worldId,
                    workshopId,
                    jobId,
                    expectedVersion: deepFarmVersionRef.current,
                    idempotencyKey: makeIdempotencyKey(`ws-x-${jobId}`),
                  })
              : undefined
          }
          onUpgradeDeepWorkshop={
            backend.farm && deepFarmSnapshot
              ? async (workshopId: WorkshopId) =>
                  runDeepFarmAction({
                    kind: 'upgrade_workshop',
                    worldId,
                    workshopId,
                    expectedVersion: deepFarmVersionRef.current,
                    idempotencyKey: makeIdempotencyKey(`ws-u-${workshopId}`),
                  })
              : undefined
          }
        />
      )}

      {deepFarmSnapshot && worldId && (
        <>
          <FlowerAlbumOrchardModal
            open={activeModal === 'deep_flowers'}
            onClose={() => setActiveModal(null)}
            nowMs={farmServerNowMs || deepFarmSnapshot.serverNowMs}
            inventory={inventorySnapshot?.items ?? []}
            flowerGarden={deepFarmSnapshot.flowerGarden}
            orchardViews={deepFarmSnapshot.orchardViews}
            busy={deepFarmBusy}
            statusMessage={deepFarmStatusVi}
            onPlantFlower={(slotIndex, flowerSku) => {
              void runDeepFarmAction({
                kind: 'plant_flower',
                worldId,
                slotIndex,
                flowerSku,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`fl-p-${slotIndex}`),
              });
            }}
            onWaterFlower={(slotIndex) => {
              void runDeepFarmAction({
                kind: 'water_flower',
                worldId,
                slotIndex,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`fl-w-${slotIndex}`),
              });
            }}
            onHarvestFlower={(slotIndex) => {
              void runDeepFarmAction({
                kind: 'harvest_flower',
                worldId,
                slotIndex,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`fl-h-${slotIndex}`),
              });
            }}
            onRunCrossbreed={() => {
              void runDeepFarmAction({
                kind: 'crossbreed_flowers',
                worldId,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey('fl-xb'),
              });
            }}
            onPlantSapling={(slotIndex, saplingSku) => {
              void runDeepFarmAction({
                kind: 'plant_tree',
                worldId,
                slotIndex,
                saplingSku,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`tr-p-${slotIndex}`),
              });
            }}
            onHarvestTree={(slotIndex) => {
              void runDeepFarmAction({
                kind: 'harvest_tree',
                worldId,
                slotIndex,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`tr-h-${slotIndex}`),
              });
            }}
            onUprootTree={(slotIndex) => {
              void runDeepFarmAction({
                kind: 'uproot_tree',
                worldId,
                slotIndex,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`tr-u-${slotIndex}`),
              });
            }}
          />

          <LivestockPanelModal
            open={activeModal === 'deep_livestock'}
            onClose={() => setActiveModal(null)}
            walletCoins={farmWalletCoins}
            inventory={inventorySnapshot?.items ?? []}
            animals={deepFarmSnapshot.projectedLivestock}
            busy={deepFarmBusy}
            statusMessage={deepFarmStatusVi}
            onAdopt={(speciesId: LivestockSpeciesId) => {
              void runDeepFarmAction({
                kind: 'adopt_livestock',
                worldId,
                speciesId,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`ls-a-${speciesId}`),
              });
            }}
            onFeed={(animalId, feedSku) => {
              void runDeepFarmAction({
                kind: 'feed_livestock',
                worldId,
                animalId,
                feedSku,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`ls-f-${animalId}`),
              });
            }}
            onPet={(animalId) => {
              void runDeepFarmAction({
                kind: 'pet_livestock',
                worldId,
                animalId,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`ls-p-${animalId}`),
              });
            }}
            onCollect={(animalId) => {
              void runDeepFarmAction({
                kind: 'collect_livestock',
                worldId,
                animalId,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`ls-c-${animalId}`),
              });
            }}
          />

          <OrderBoardModal
            open={activeModal === 'deep_orders'}
            onClose={() => setActiveModal(null)}
            nowMs={farmServerNowMs || deepFarmSnapshot.serverNowMs}
            board={deepFarmSnapshot.orderBoard}
            inventory={inventorySnapshot}
            walletCoins={farmWalletCoins}
            busy={deepFarmBusy}
            statusMessage={deepFarmStatusVi}
            onCompleteOrder={(orderId) => {
              void runDeepFarmAction({
                kind: 'complete_order',
                worldId,
                orderId,
                expectedVersion: deepFarmVersionRef.current,
                idempotencyKey: makeIdempotencyKey(`ord-${orderId}`),
              });
            }}
          />
        </>
      )}

      {donorLanPlayable && activeModal === 'donor_fishing' && worldId && (
        <ChillFishingModal
          worldId={worldId}
          spotId={donorChillFishingSpot}
          localUserId={currentUser.userId}
          localAvatarConfig={localMember?.avatarConfig}
          partnerAvatarConfig={partnerMember?.avatarConfig}
          onClose={() => setActiveModal(null)}
          onInventoryRefresh={async () => refreshInventorySnapshot(worldId)}
        />
      )}


      {(activeModal === 'farm_market' || activeModal === 'farm_shipping') && backend.farm && (
        <div className="modal-backdrop nuvora-inv-backdrop" role="presentation" onClick={() => setActiveModal(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <FarmEconomyPanel
              mode={activeModal === 'farm_market' ? 'shop' : 'shipping'}
              shopKind={farmShopKind}
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
                  gameAudio.playSfx('shop_sell');
                  gameAudio.playStinger('quest');
                  void refreshDeepFarmSnapshot(targetWorldId);
                  await refreshInventorySnapshot(targetWorldId);
                  showToast(`Đã gửi nông sản (+${res.data.totalCoins} xu).`);
                  realtimeRef.current?.notifyWorldMutated('farm');
                } finally {
                  setFarmBusy(false);
                }
              }}
              onBuyStoreItem={async (itemSku, qty) => {
                const targetWorldId = snapshotRef.current?.world.id;
                if (!targetWorldId) return;
                setFarmBusy(true);
                try {
                  const res = await backend.farm!.buySeed({
                    worldId: targetWorldId,
                    seedSku: itemSku,
                    qty,
                    idempotencyKey: makeIdempotencyKey('farm-buy'),
                  });
                  if (!res.ok) {
                    showToast(res.message, true);
                    return;
                  }
                  setFarmWalletCoins(res.data.walletCoins);
                  gameAudio.playSfx('shop_buy');
                  void refreshDeepFarmSnapshot(targetWorldId);
                  await refreshInventorySnapshot(targetWorldId);
                  showToast(
                    itemSku.startsWith('seed_') ? 'Đã mua hạt giống.' : 'Đã mua vật phẩm.',
                  );
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

      {billiardsInviteBanner && activeModal !== 'billiards' && (
        <div
          data-testid="billiards-invite-banner"
          style={{
            position: 'fixed',
            top: 66,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 55,
            background: 'rgba(31, 25, 42, 0.96)',
            border: '2px solid #fbbf24',
            borderRadius: 14,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#fef7ed',
            boxShadow: '0 10px 26px rgba(0,0,0,0.55)',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            🎱 {billiardsInviteBanner.inviterName} mời bạn chơi Bi-a{' '}
            {billiardsInviteBanner.edition.toUpperCase()} (
            {billiardsInviteBanner.rule === '8ball' ? '8-Bi' : '9-Bi'})
          </span>
          <button
            type="button"
            data-testid="billiards-invite-accept"
            onClick={() => {
              setBilliardsInitialView('lobby');
              setBilliardsInviteBanner(null);
              setActiveModal('billiards');
            }}
            style={{
              background: '#34d399',
              color: '#064e3b',
              border: 'none',
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Vào phòng Bi-a
          </button>
          <button
            type="button"
            aria-label="Bỏ qua lời mời"
            onClick={() => setBilliardsInviteBanner(null)}
            style={{
              background: 'transparent',
              color: '#cbd5e1',
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      <LazyBilliardsModal
        open={activeModal === 'billiards'}
        onClose={() => {
          setBilliardsInitialView('entry');
          setActiveModal(null);
        }}
        playerNames={billiardsPlayers.playerNames}
        localPlayerSlot={billiardsPlayers.localSlot}
        initialMode={billiardsPlayers.initialMode}
        initialScores={billiardsScores}
        transport={billiardsPlayers.slotUserIds[1] ? billiardsTransport : undefined}
        hasPartner={Boolean(billiardsPlayers.slotUserIds[1])}
        partnerOnline={networkDiagnostics.playerCount >= 2}
        initialView={billiardsInitialView}
        masterVolume={1}
        onPauseOverworld={handlePauseOverworldForBilliards}
        onResumeOverworld={handleResumeOverworldForBilliards}
        onMatchComplete={(res) => {
          void handleBilliardsMatchComplete(res);
        }}
      />

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

      {import.meta.env.DEV && DevRemoteShareModal && activeModal === 'remote_share' && !isRemoteClient && (
        <Suspense fallback={null}>
          <DevRemoteShareModal onClose={() => setActiveModal(null)} />
        </Suspense>
      )}

      {activeNpcDialogue && currentUser && worldSnapshot && (
        <NpcDialogueOverlay
          npcId={activeNpcDialogue.npcId}
          mapId={activeNpcDialogue.mapId}
          fallbackLabelVi={activeNpcDialogue.labelVi}
          fallbackRole={activeNpcDialogue.role}
          fallbackDialogueVi={activeNpcDialogue.fallbackDialogueVi}
          worldId={worldSnapshot.world.id}
          userId={currentUser.userId}
          context={activeNpcContext}
          onAction={handleNpcDialogueAction}
          onClose={handleCloseNpcDialogue}
        />
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
