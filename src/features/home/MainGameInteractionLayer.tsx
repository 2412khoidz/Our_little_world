import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../ui/designSystem/gameUiTokens.css';
import { gameEventBus } from '../../game/eventBus';
import {
  EMPTY_HELD_ITEM,
  isEditableInputTarget,
  resolveContextualActions,
  selectHotbarSlot,
} from '../../shared/interaction/interactionResolver';
import { buildHotbarSlotsFromInventory } from '../../shared/interaction/inventoryHotbarAdapter';
import type { ContextualResolution, HeldItemState } from '../../shared/interaction/interactionTypes';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import type { MapId } from '../../shared/types';
import { ContextualPromptBadge } from '../../ui/components/ContextualPromptBadge';
import { GameHotbar } from '../../ui/components/GameHotbar';
import { executeMainGameContextAction } from './executeMainGameContextAction';
import type { InteractionFramePayload } from '../../game/eventBus';

export interface MainGameInteractionLayerProps {
  enabled: boolean;
  currentMapId: MapId;
  inventorySnapshot: InventorySnapshot | null;
  petSnapshot: PetSnapshot | null;
  decorateActive: boolean;
  modalOpen: boolean;
  showJoystick: boolean;
  petCanFeed: boolean;
  onOpenInventory: () => void;
  onCloseTopModal: () => void;
  onFeedPetAuthoritative: () => Promise<void>;
  onPetPetAuthoritative: () => Promise<void>;
  onNotice: (message: string, isError?: boolean) => void;
}

export function MainGameInteractionLayer({
  enabled,
  currentMapId,
  inventorySnapshot,
  petSnapshot,
  decorateActive,
  modalOpen,
  showJoystick,
  petCanFeed,
  onOpenInventory,
  onCloseTopModal,
  onFeedPetAuthoritative,
  onPetPetAuthoritative,
  onNotice,
}: MainGameInteractionLayerProps) {
  const hotbarSlots = useMemo(
    () => buildHotbarSlotsFromInventory(inventorySnapshot),
    [inventorySnapshot],
  );
  const [heldSelection, setHeldSelection] = useState<HeldItemState>(EMPTY_HELD_ITEM);
  const heldItem = useMemo(() => {
    if (!heldSelection.itemSku || heldSelection.slotIndex === null) return EMPTY_HELD_ITEM;
    const slot = hotbarSlots.find((s) => s.slotIndex === heldSelection.slotIndex);
    if (!slot || slot.qty <= 0) return EMPTY_HELD_ITEM;
    return heldSelection;
  }, [heldSelection, hotbarSlots]);
  const [resolution, setResolution] = useState<ContextualResolution>({
    targetId: null,
    primary: null,
    secondary: null,
  });
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const heldRef = useRef(heldItem);

  useEffect(() => {
    heldRef.current = heldItem;
    gameEventBus.emit('cmd:sync-held-item', heldItem);
  }, [heldItem]);

  const showHud = enabled && !decorateActive && !modalOpen;

  const actionCtx = useMemo(
    () => ({
      mapId: currentMapId,
      heldItem,
      hasPet: Boolean(petSnapshot),
      petCanFeed,
      onOpenInventory,
      onFeedPetAuthoritative,
      onPetPetAuthoritative,
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
      onOpenInventory,
      onFeedPetAuthoritative,
      onPetPetAuthoritative,
      onNotice,
    ],
  );

  const executePrimary = useCallback(async () => {
    if (!resolution.primary) return;
    await executeMainGameContextAction(resolution.primary, actionCtx);
  }, [resolution.primary, actionCtx]);

  const executeSecondary = useCallback(async () => {
    if (resolution.secondary?.code === 'put_away_held') {
      setHeldSelection(EMPTY_HELD_ITEM);
      return;
    }
    if (resolution.secondary) {
      await executeMainGameContextAction(resolution.secondary, actionCtx);
    }
  }, [resolution.secondary, actionCtx]);

  useEffect(() => {
    const onFrame = (frame: InteractionFramePayload) => {
      const next = resolveContextualActions({
        playerX: frame.playerX,
        playerY: frame.playerY,
        facing: frame.facing,
        heldItem: heldRef.current,
        interactables: frame.interactables,
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
  }, []);

  useEffect(() => {
    if (!showHud) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (isEditableInputTarget(e.target)) return;

      if (e.code === 'Escape') {
        onCloseTopModal();
        setHeldSelection(EMPTY_HELD_ITEM);
        return;
      }
      if (e.code === 'KeyI') {
        e.preventDefault();
        onOpenInventory();
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
        setHeldSelection((cur) => selectHotbarSlot(hotbarSlots, cur, num - 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHud, executePrimary, executeSecondary, hotbarSlots, onOpenInventory, onCloseTopModal]);

  if (!showHud) return null;

  return (
    <>
      {showJoystick && (
        <div className="main-game-touch-actions" data-testid="main-game-touch-actions">
          <button
            type="button"
            className="olw-bookmark-tab main-game-touch-btn"
            data-testid="btn-touch-primary"
            aria-label="Hành động chính"
            onClick={() => void executePrimary()}
          >
            J
          </button>
          <button
            type="button"
            className="olw-bookmark-tab main-game-touch-btn"
            data-testid="btn-touch-secondary"
            aria-label="Hành động phụ"
            onClick={() => void executeSecondary()}
          >
            K
          </button>
        </div>
      )}

      <div className="main-game-interaction-stack" data-testid="main-game-interaction-hud">
        <ContextualPromptBadge
          resolution={resolution}
          unavailableToast={noticeText}
          onPrimary={() => void executePrimary()}
          onSecondary={() => void executeSecondary()}
        />
        <GameHotbar
          slots={hotbarSlots}
          heldItem={heldItem}
          onSelectSlot={(idx) => setHeldSelection((cur) => selectHotbarSlot(hotbarSlots, cur, idx))}
        />
      </div>
    </>
  );
}