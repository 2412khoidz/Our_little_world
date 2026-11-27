import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DoorOpen, Hand, MessageCircle, PackageMinus, Sparkles, Store } from 'lucide-react';
import '../../ui/designSystem/gameUiTokens.css';
import { gameEventBus, type InteractionFramePayload } from '../../game/eventBus';
import {
  isEditableInputTarget,
  resolveContextualActions,
} from '../../shared/interaction/interactionResolver';
import { buildHotbarSlotsFromInventory } from '../../shared/interaction/inventoryHotbarAdapter';
import type { ContextualAction, ContextualResolution } from '../../shared/interaction/interactionTypes';
import type { FarmPlotView } from '../../shared/farming/farmSnapshotTypes';
import type { InventoryStackRef } from '../../shared/inventory/inventoryLayoutStore';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import type { MapId } from '../../shared/types';
import type { HudLayoutMode } from '../../shared/viewport/viewportPolicy';
import { ContextualPromptBadge } from '../../ui/components/ContextualPromptBadge';
import { GameHotbar } from '../../ui/components/GameHotbar';
import { HeldItemChip } from '../../ui/components/HeldItemChip';
import { executeMainGameContextAction } from './executeMainGameContextAction';
import { validateActionAgainstLatestFrame } from './interactionActionGate';
import { useHeldItemFromHotbar } from './useHeldItemFromHotbar';
import { isLivingPetLocalSimulationEnabled } from '../../shared/petLiving/mainGame/petLivingDevFlag';
import { isPetCareModeActive } from '../../shared/petLiving/petCare/petCareModeFlag';

function shortMobileActionLabel(action: ContextualAction): string {
  switch (action.code) {
    case 'till_plot':
      return 'Cuốc';
    case 'plant_crop':
      return 'Gieo';
    case 'water_crop':
      return 'Tưới';
    case 'harvest_crop':
      return 'Thu hoạch';
    case 'fertilize_plot':
      return 'Bón phân';
    case 'place_sprinkler':
      return 'Đặt vòi';
    case 'fill_water_pitcher':
      return 'Múc nước';
    case 'pour_water_bowl':
      return 'Rót nước';
    case 'fill_food_bowl':
      return 'Đổ hạt';
    case 'enter_pet_care':
      return 'Chăm mèo';
    case 'offer_food_pet':
      return 'Đưa ăn';
    case 'pet_cat':
      return 'Vuốt ve';
    case 'roll_toy':
      return 'Chơi';
    case 'put_away_held':
      return 'Cất';
    case 'open_farm_market':
      return 'Mua hàng';
    case 'open_shipping_bin':
      return 'Bán hàng';
    case 'open_donor_fishing':
    case 'open_donor_stream_fishing':
      return 'Câu cá';
    case 'open_donor_workshop':
      return 'Xưởng';
    case 'talk_npc':
      return 'Nói chuyện';
    case 'use_portal':
    case 'enter_home':
    case 'exit_home':
    case 'enter_barn_shop':
      return 'Đi vào';
    case 'sit_sofa':
    case 'sit_bench':
      return 'Ngồi';
    case 'lie_bed':
      return 'Nằm';
    case 'open_wardrobe':
      return 'Ngoại hình';
    case 'open_study':
      return 'Học bài';
    case 'open_mailbox':
      return 'Hộp thư';
    case 'open_photo_frame':
      return 'Album';
    default:
      return action.labelVi.length > 10 ? action.labelVi.slice(0, 9) + '…' : action.labelVi;
  }
}

function MobileActionPixelIcon({ action }: { action: ContextualAction }) {
  switch (action.code) {
    case 'till_plot':
      return <img src="/assets/ui/hybrid/items/hoe_basic.png" alt="" width={24} height={24} draggable={false} style={{ imageRendering: 'pixelated' }} />;
    case 'water_crop':
    case 'fill_water_pitcher':
    case 'pour_water_bowl':
      return <img src="/assets/ui/hybrid/items/watering_can_basic.png" alt="" width={24} height={24} draggable={false} style={{ imageRendering: 'pixelated' }} />;
    case 'plant_crop':
    case 'fertilize_plot':
      return <img src="/assets/ui/hybrid/items/seed_pouch.png" alt="" width={24} height={24} draggable={false} style={{ imageRendering: 'pixelated' }} />;
    case 'harvest_crop':
      return <img src="/assets/ui/hybrid/items/wheat.png" alt="" width={24} height={24} draggable={false} style={{ imageRendering: 'pixelated' }} />;
    case 'enter_pet_care':
    case 'pet_cat':
    case 'offer_food_pet':
    case 'fill_food_bowl':
      return <img src="/assets/ui/hybrid/emotes/cat_happy.png" alt="" width={24} height={24} draggable={false} style={{ imageRendering: 'pixelated' }} />;
    case 'roll_toy':
      return <img src="/assets/ui/hybrid/emotes/star.png" alt="" width={22} height={22} draggable={false} style={{ imageRendering: 'pixelated' }} />;
    case 'open_donor_fishing':
    case 'open_donor_stream_fishing':
      return <img src="/assets/ui/hybrid/items/fishing_rod_basic.png" alt="" width={24} height={24} draggable={false} style={{ imageRendering: 'pixelated' }} />;
    case 'open_farm_market':
    case 'open_shipping_bin':
      return <Store size={20} strokeWidth={2.4} />;
    case 'talk_npc':
      return <MessageCircle size={20} strokeWidth={2.4} />;
    case 'use_portal':
    case 'enter_home':
    case 'exit_home':
    case 'enter_barn_shop':
      return <DoorOpen size={20} strokeWidth={2.4} />;
    case 'put_away_held':
      return <PackageMinus size={18} strokeWidth={2.4} />;
    case 'inspect_prop':
      return <Sparkles size={20} strokeWidth={2.4} />;
    default:
      return <Hand size={20} strokeWidth={2.4} />;
  }
}

export interface MainGameInteractionLayerProps {
  enabled: boolean;
  currentMapId: MapId;
  localUserId: string;
  inventorySnapshot: InventorySnapshot | null;
  petSnapshot: PetSnapshot | null;
  decorateActive: boolean;
  modalOpen: boolean;
  showJoystick: boolean;
  hudLayoutMode?: HudLayoutMode;
  hotbarSlotsPerPage?: 4 | 8;
  petCanFeed: boolean;
  /** True while authoritative pet/inventory mutation is in flight (blocks duplicate J/K). */
  interactionMutationBusy: boolean;
  onOpenInventory: () => void;
  onCloseTopModal: () => void;
  onFeedPetAuthoritative: () => Promise<void>;
  onPetPetAuthoritative: () => Promise<void>;
  onFarmApply?: (
    plotIndex: number,
    action: 'till' | 'plant' | 'water' | 'harvest' | 'fertilize' | 'place_sprinkler' | 'remove_sprinkler',
    seedSku?: string | null,
    opts?: {
      fertilizerSku?: import('../../shared/farming/farmSnapshotTypes').FarmApplyParams['fertilizerSku'];
      sprinklerSku?: import('../../shared/farming/farmSnapshotTypes').FarmApplyParams['sprinklerSku'];
      toolSku?: string | null;
    },
  ) => Promise<void>;
  onOpenFarmMarket?: (shopKind?: import('../../shared/shop/farmShopCatalog').FarmShopKind) => void;
  onOpenFarmShipping?: () => void;
  onOpenDonorFishing?: (spotId?: string) => void;
  onOpenDonorStreamFishing?: () => void;
  onOpenDonorWorkshop?: (focus?: import('../../shared/donor/donorWorkshopFocus').DonorWorkshopFocus) => void;
  donorLanPlayable?: boolean;
  farmPlotByIndex?: ReadonlyMap<number, FarmPlotView>;
  farmServerNowMs?: number;
  onNotice: (message: string, isError?: boolean) => void;
  /** Keeps hotbar + touch J above pet-care vignette. */
  petCareOverlayActive?: boolean;
  /** Live hotbar bindings projected from user's persistent inventory layout. */
  hotbarBindings?: ReadonlyArray<InventoryStackRef | null>;
}

export function MainGameInteractionLayer({
  enabled,
  currentMapId,
  localUserId,
  inventorySnapshot,
  petSnapshot,
  decorateActive,
  modalOpen,
  showJoystick,
  hudLayoutMode = 'desktop',
  hotbarSlotsPerPage = 8,
  petCanFeed,
  interactionMutationBusy,
  onOpenInventory,
  onCloseTopModal,
  onFeedPetAuthoritative,
  onPetPetAuthoritative,
  onFarmApply,
  onOpenFarmMarket,
  onOpenFarmShipping,
  onOpenDonorFishing,
  onOpenDonorStreamFishing,
  onOpenDonorWorkshop,
  donorLanPlayable = false,
  farmPlotByIndex,
  farmServerNowMs,
  onNotice,
  petCareOverlayActive = false,
  hotbarBindings,
}: MainGameInteractionLayerProps) {
  const {
    heldItem,
    waterFillBySku,
    selectSlot,
    clearHeld,
  } = useHeldItemFromHotbar(
    useMemo(
      () => buildHotbarSlotsFromInventory(inventorySnapshot, localUserId, hotbarBindings),
      [inventorySnapshot, localUserId, hotbarBindings],
    ),
  );
  const hotbarSlots = useMemo(
    () => buildHotbarSlotsFromInventory(inventorySnapshot, localUserId, hotbarBindings, waterFillBySku),
    [inventorySnapshot, localUserId, hotbarBindings, waterFillBySku],
  );

  const [resolution, setResolution] = useState<ContextualResolution>({
    targetId: null,
    primary: null,
    secondary: null,
  });
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [hotbarCompact, setHotbarCompact] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem('olw:hud-hotbar-compact:v1') === '1';
    } catch {
      return false;
    }
  });
  const [hotbarIdleDimmed, setHotbarIdleDimmed] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  const resetIdleTimerOnly = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      setHotbarIdleDimmed(true);
    }, 5500);
  }, []);

  const noteHotbarActivity = useCallback(() => {
    setHotbarIdleDimmed(false);
    resetIdleTimerOnly();
  }, [resetIdleTimerOnly]);

  const toggleHotbarCompact = useCallback(() => {
    setHotbarCompact((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('olw:hud-hotbar-compact:v1', next ? '1' : '0');
      } catch {
        // ignore storage restrictions
      }
      return next;
    });
    noteHotbarActivity();
  }, [noteHotbarActivity]);

  useEffect(() => {
    resetIdleTimerOnly();
    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimerOnly]);

  const heldRef = useRef(heldItem);
  const lastFrameRef = useRef<InteractionFramePayload | null>(null);
  const mapIdRef = useRef(currentMapId);
  const [localActionBusy, setLocalActionBusy] = useState(false);
  const actionInFlight = useRef(false);
  const resolutionRef = useRef(resolution);

  useEffect(() => {
    mapIdRef.current = currentMapId;
  }, [currentMapId]);

  useEffect(() => {
    resolutionRef.current = resolution;
  }, [resolution]);

  useEffect(() => {
    heldRef.current = heldItem;
    gameEventBus.emit('cmd:sync-held-item', heldItem);
  }, [heldItem]);

  const petCareHud = petCareOverlayActive || isPetCareModeActive();
  const showHud = enabled && !decorateActive && !modalOpen;
  const touchActions = (showJoystick || hudLayoutMode !== 'desktop') && !petCareHud;

  const livingPetSim = isLivingPetLocalSimulationEnabled();

  const actionCtx = useMemo(
    () => ({
      mapId: currentMapId,
      heldItem,
      hasPet: Boolean(petSnapshot),
      petCanFeed,
      livingPetLocalSimulation: livingPetSim,
      onOpenInventory,
      onFeedPetAuthoritative,
      onPetPetAuthoritative,
      onFarmApply,
      onOpenFarmMarket,
      onOpenFarmShipping,
      onOpenDonorFishing,
      onOpenDonorStreamFishing,
      onOpenDonorWorkshop,
      donorLanPlayable,
      onNotice: (msg: string, isError?: boolean) => {
        if (isError) onNotice(msg, true);
        else {
          setNoticeText(msg);
          window.setTimeout(() => setNoticeText((cur) => (cur === msg ? null : cur)), 2400);
        }
      },
    }),
    [
      currentMapId,
      heldItem,
      petSnapshot,
      petCanFeed,
      livingPetSim,
      onOpenInventory,
      onFeedPetAuthoritative,
      onPetPetAuthoritative,
      onFarmApply,
      onOpenFarmMarket,
      onOpenFarmShipping,
      onOpenDonorFishing,
      onOpenDonorStreamFishing,
      onOpenDonorWorkshop,
      donorLanPlayable,
      onNotice,
    ],
  );

  const runGatedAction = useCallback(
    async (which: 'primary' | 'secondary') => {
      if (!showHud || interactionMutationBusy || actionInFlight.current) return;

      const snap = resolutionRef.current;
      const action = which === 'primary' ? snap.primary : snap.secondary;
      if (!action) return;

      if (
        !validateActionAgainstLatestFrame(
          snap,
          lastFrameRef.current,
          mapIdRef.current,
          heldRef.current,
          which,
          farmPlotByIndex,
          farmServerNowMs,
        )
      ) {
        return;
      }

      actionInFlight.current = true;
      setLocalActionBusy(true);
      try {
        if (which === 'secondary' && action.code === 'put_away_held') {
          clearHeld();
          return;
        }
        await executeMainGameContextAction(action, actionCtx);
      } finally {
        actionInFlight.current = false;
        setLocalActionBusy(false);
      }
    },
    [showHud, interactionMutationBusy, actionCtx, clearHeld, farmPlotByIndex, farmServerNowMs],
  );

  const executePrimary = useCallback(() => void runGatedAction('primary'), [runGatedAction]);
  const executeSecondary = useCallback(() => void runGatedAction('secondary'), [runGatedAction]);

  useEffect(() => {
    const onFrame = (frame: InteractionFramePayload) => {
      lastFrameRef.current = frame;
      if (frame.mapId !== mapIdRef.current) {
        setResolution({ targetId: null, primary: null, secondary: null });
        return;
      }
      const next = resolveContextualActions({
        playerX: frame.playerX,
        playerY: frame.playerY,
        facing: frame.facing,
        heldItem: heldRef.current,
        interactables: frame.interactables,
        economyPlayable: frame.economyPlayable ?? donorLanPlayable,
        farmPlotByIndex,
        serverNowMs: farmServerNowMs,
      });
      setResolution((cur) =>
        cur.targetId === next.targetId &&
        cur.primary?.code === next.primary?.code &&
        cur.primary?.available === next.primary?.available &&
        cur.secondary?.code === next.secondary?.code
          ? cur
          : next,
      );
    };
    return gameEventBus.on('evt:interaction-frame', onFrame);
  }, [donorLanPlayable, farmPlotByIndex, farmServerNowMs]);

  useEffect(() => {
    return gameEventBus.on('evt:farm-plot-click-request', ({ plotId, action, seedSku }) => {
      if (!showHud || !onFarmApply || interactionMutationBusy || actionInFlight.current) return;
      actionInFlight.current = true;
      setLocalActionBusy(true);
      void Promise.resolve(onFarmApply(plotId, action, seedSku)).finally(() => {
        actionInFlight.current = false;
        setLocalActionBusy(false);
      });
    });
  }, [showHud, onFarmApply, interactionMutationBusy]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Escape') {
        if (modalOpen || !isEditableInputTarget(e.target)) {
          onCloseTopModal();
          clearHeld();
        }
        return;
      }
      if (!showHud || isEditableInputTarget(e.target)) return;
      if (e.code === 'KeyI') {
        e.preventDefault();
        onOpenInventory();
        return;
      }
      if (e.code === 'KeyH') {
        e.preventDefault();
        toggleHotbarCompact();
        return;
      }
      if (e.code === 'KeyJ') {
        e.preventDefault();
        void executePrimary();
        return;
      }
      if (e.code === 'KeyK') {
        e.preventDefault();
        void executeSecondary();
        return;
      }
      const num = Number(e.key);
      if (Number.isInteger(num) && num >= 1 && num <= 8) {
        e.preventDefault();
        noteHotbarActivity();
        selectSlot(num - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHud, modalOpen, executePrimary, executeSecondary, selectSlot, onOpenInventory, onCloseTopModal, clearHeld, toggleHotbarCompact, noteHotbarActivity]);

  if (!showHud) return null;

  const isMobileHud = hudLayoutMode !== 'desktop';
  const inputsLocked = interactionMutationBusy || localActionBusy;
  const mobileModeProp =
    hudLayoutMode === 'mobile-portrait'
      ? 'portrait'
      : hudLayoutMode === 'mobile-landscape'
        ? 'landscape'
        : null;

  return (
    <>
      {touchActions && (resolution.primary || resolution.secondary) && (
        <div
          className={`main-game-touch-actions ${petCareHud ? 'main-game-touch-actions--pet-care' : ''}`}
          data-testid="main-game-touch-actions"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {resolution.primary && (
            <button
              type="button"
              className={
                isMobileHud
                  ? 'olw-m-action-btn olw-m-action-btn--primary'
                  : 'main-game-touch-btn main-game-touch-btn--primary'
              }
              data-testid="btn-context-primary"
              data-touch-role="primary"
              aria-label={resolution.primary.labelVi}
              disabled={inputsLocked}
              style={{ opacity: resolution.primary.available ? 1 : 0.72 }}
              onClick={() => void executePrimary()}
            >
              {isMobileHud ? (
                <>
                  <MobileActionPixelIcon action={resolution.primary} />
                  <span className="olw-m-action-btn__caption">
                    {shortMobileActionLabel(resolution.primary)}
                  </span>
                </>
              ) : (
                <>
                  <span className="olw-keycap">{resolution.primary.keyHint}</span>
                  <span className="main-game-touch-btn__label">{resolution.primary.labelVi}</span>
                </>
              )}
            </button>
          )}
          {resolution.secondary && (
            <button
              type="button"
              className={
                isMobileHud
                  ? 'olw-m-action-btn olw-m-action-btn--secondary'
                  : 'main-game-touch-btn main-game-touch-btn--secondary'
              }
              data-testid="btn-context-secondary"
              data-touch-role="secondary"
              aria-label={resolution.secondary.labelVi}
              disabled={inputsLocked}
              onClick={() => void executeSecondary()}
            >
              {isMobileHud ? (
                <>
                  <MobileActionPixelIcon action={resolution.secondary} />
                  <span className="olw-m-action-btn__caption">
                    {shortMobileActionLabel(resolution.secondary)}
                  </span>
                </>
              ) : (
                <>
                  <span className="olw-keycap">{resolution.secondary.keyHint}</span>
                  <span className="main-game-touch-btn__label">{resolution.secondary.labelVi}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      <div
        className={`main-game-interaction-stack ${petCareHud ? 'main-game-interaction-stack--pet-care' : ''}`}
        data-testid="main-game-interaction-hud"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!petCareHud && !touchActions ? (
          <ContextualPromptBadge
            resolution={resolution}
            unavailableToast={noticeText}
            onPrimary={() => void executePrimary()}
            onSecondary={() => void executeSecondary()}
          />
        ) : !petCareHud && noticeText ? (
          <div
            className="olw-game-window"
            data-testid="interaction-notice-toast"
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 700,
              pointerEvents: 'auto',
            }}
          >
            {noticeText}
          </div>
        ) : null}
        {isMobileHud ? (
          heldItem.itemKind !== 'none' && heldItem.itemSku ? (
            <div className="olw-m-held-pill" data-testid="held-item-chip" role="status">
              <span>{heldItem.labelVi || heldItem.itemSku}</span>
              <button type="button" aria-label="Bỏ cầm" onClick={clearHeld}>
                ×
              </button>
            </div>
          ) : null
        ) : (
          <HeldItemChip heldItem={heldItem} onClear={clearHeld} />
        )}
        <GameHotbar
          slots={hotbarSlots}
          heldItem={heldItem}
          onSelectSlot={selectSlot}
          onOpenInventory={onOpenInventory}
          inventoryItemCount={inventorySnapshot?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0}
          touchFriendly={petCareHud}
          compact={!isMobileHud && hotbarCompact && !petCareHud}
          onToggleCompact={!isMobileHud && !petCareHud ? toggleHotbarCompact : undefined}
          idleDimmed={!isMobileHud && hotbarIdleDimmed && !petCareHud}
          onUserActivity={noteHotbarActivity}
          mobileMode={mobileModeProp}
          slotsPerPage={isMobileHud ? hotbarSlotsPerPage : 8}
          hideKeycaps={isMobileHud}
        />
      </div>
    </>
  );
}