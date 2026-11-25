import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../ui/designSystem/gameUiTokens.css';
import { gameEventBus, type InteractionFramePayload } from '../../game/eventBus';
import {
  isEditableInputTarget,
  resolveContextualActions,
} from '../../shared/interaction/interactionResolver';
import { buildHotbarSlotsFromInventory } from '../../shared/interaction/inventoryHotbarAdapter';
import type { ContextualResolution } from '../../shared/interaction/interactionTypes';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import type { MapId } from '../../shared/types';
import { ContextualPromptBadge } from '../../ui/components/ContextualPromptBadge';
import { GameHotbar } from '../../ui/components/GameHotbar';
import { executeMainGameContextAction } from './executeMainGameContextAction';
import { validateActionAgainstLatestFrame } from './interactionActionGate';
import { useHeldItemFromHotbar } from './useHeldItemFromHotbar';

export interface MainGameInteractionLayerProps {
  enabled: boolean;
  currentMapId: MapId;
  localUserId: string;
  inventorySnapshot: InventorySnapshot | null;
  petSnapshot: PetSnapshot | null;
  decorateActive: boolean;
  modalOpen: boolean;
  showJoystick: boolean;
  petCanFeed: boolean;
  /** True while authoritative pet/inventory mutation is in flight (blocks duplicate J/K). */
  interactionMutationBusy: boolean;
  onOpenInventory: () => void;
  onCloseTopModal: () => void;
  onFeedPetAuthoritative: () => Promise<void>;
  onPetPetAuthoritative: () => Promise<void>;
  onNotice: (message: string, isError?: boolean) => void;
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
  petCanFeed,
  interactionMutationBusy,
  onOpenInventory,
  onCloseTopModal,
  onFeedPetAuthoritative,
  onPetPetAuthoritative,
  onNotice,
}: MainGameInteractionLayerProps) {
  const hotbarSlots = useMemo(
    () => buildHotbarSlotsFromInventory(inventorySnapshot, localUserId),
    [inventorySnapshot, localUserId],
  );
  const { heldItem, selectSlot, clearHeld } = useHeldItemFromHotbar(hotbarSlots);

  const [resolution, setResolution] = useState<ContextualResolution>({
    targetId: null,
    primary: null,
    secondary: null,
  });
  const [noticeText, setNoticeText] = useState<string | null>(null);

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
    [showHud, interactionMutationBusy, actionCtx, clearHeld],
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
        selectSlot(num - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHud, modalOpen, executePrimary, executeSecondary, selectSlot, onOpenInventory, onCloseTopModal, clearHeld]);

  if (!showHud) return null;

  const inputsLocked = interactionMutationBusy || localActionBusy;

  return (
    <>
      {showJoystick && (
        <div className="main-game-touch-actions" data-testid="main-game-touch-actions">
          <button
            type="button"
            className="olw-bookmark-tab main-game-touch-btn"
            data-testid="btn-touch-primary"
            aria-label="Hành động chính"
            disabled={inputsLocked}
            onClick={() => void executePrimary()}
          >
            J
          </button>
          <button
            type="button"
            className="olw-bookmark-tab main-game-touch-btn"
            data-testid="btn-touch-secondary"
            aria-label="Hành động phụ"
            disabled={inputsLocked}
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
          onSelectSlot={selectSlot}
        />
      </div>
    </>
  );
}