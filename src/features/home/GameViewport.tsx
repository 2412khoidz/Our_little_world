import { useEffect, useRef, useState } from 'react';
import { gameEventBus, type NearbyInteractable } from '../../game/eventBus';
import {
  LIVING_PET_TELEMETRY_TEST_ID,
  type LivingPetDevTelemetry,
} from '../../shared/petLiving/mainGame/livingPetDevTelemetry';
import { isLivingPetLocalSimulationEnabled } from '../../shared/petLiving/mainGame/petLivingDevFlag';
import type {
  FurniturePlacement,
  MapId,
  PresencePayload,
  WorldMember,
} from '../../shared/types';
import type { HudLayoutMode, JoystickMode } from '../../shared/viewport/viewportPolicy';
import { TouchJoystick } from './mobile/TouchJoystick';

interface GameViewportProps {
  worldId: string;
  localUserId: string;
  sessionId: string;
  currentMapId: MapId;
  members: WorldMember[];
  placements: FurniturePlacement[];
  presences: PresencePayload[];
  decorateActive: boolean;
  activeSku: string | null;
  selectedPlacementId: string | null;
  decoratePreviewRotated: boolean;
  decorateDevSandbox?: boolean;
  showJoystick: boolean;
  joystickMode?: JoystickMode;
  hudLayoutMode?: HudLayoutMode;
  petCareActive?: boolean;
  isModalOpen: boolean;
  animateUnderModal?: boolean;
  /** When true, legacy E/nearby button is hidden (main game J/K HUD). */
  contextualInteractionHud?: boolean;
  movementConnection: number | null;
  toast: { message: string; isError?: boolean } | null;
}

export function GameViewport({
  worldId,
  localUserId,
  sessionId,
  currentMapId,
  members,
  placements,
  presences,
  decorateActive,
  activeSku,
  selectedPlacementId,
  decoratePreviewRotated,
  decorateDevSandbox = false,
  showJoystick,
  joystickMode = 'fixed',
  hudLayoutMode = 'desktop',
  petCareActive = false,
  isModalOpen,
  animateUnderModal = false,
  contextualInteractionHud = false,
  movementConnection,
  toast,
}: GameViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [nearby, setNearby] = useState<NearbyInteractable | null>(null);
  const [livingPetTelemetry, setLivingPetTelemetry] = useState<LivingPetDevTelemetry | null>(null);

  // Dynamically import Phaser only when rendering game stage (keeps initial shell lean)
  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    let destroyed = false;
    let gameInstance: import('phaser').Game | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const syncGameSize = () => {
      if (!gameInstance || destroyed) return;
      const el = hostRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        gameInstance.scale.setParentSize(w, h);
        gameInstance.scale.resize(w, h);
        gameInstance.scale.refresh();
      }
    };

    const unsubReady = gameEventBus.on('evt:scene-ready', () => {
      setSceneReady(true);
    });
    const unsubNearby = gameEventBus.on('evt:nearby-interactable', (item) => {
      setNearby(item);
    });
    const unsubPetTel =
      import.meta.env.DEV && isLivingPetLocalSimulationEnabled()
        ? gameEventBus.on('evt:living-pet-dev-telemetry', (t) => {
            setLivingPetTelemetry(t);
          })
        : () => {};

    const onOrientationResize = () => {
      syncGameSize();
      window.setTimeout(syncGameSize, 100);
      window.setTimeout(syncGameSize, 260);
    };

    window.visualViewport?.addEventListener('resize', syncGameSize);
    window.addEventListener('orientationchange', onOrientationResize);

    void import('../../game/createGame').then(({ createWorldGame }) => {
      if (destroyed || !hostRef.current) return;
      const el = hostRef.current;
      gameInstance = createWorldGame(el);
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(syncGameSize);
        resizeObserver.observe(el);
      }
      syncGameSize();
    });

    return () => {
      destroyed = true;
      window.visualViewport?.removeEventListener('resize', syncGameSize);
      window.removeEventListener('orientationchange', onOrientationResize);
      resizeObserver?.disconnect();
      unsubReady();
      unsubNearby();
      unsubPetTel();
      gameInstance?.destroy(true);
    };
  }, []);

  // Push world state whenever scene becomes ready or state changes
  useEffect(() => {
    if (!sceneReady) return;
    gameEventBus.emit('cmd:sync-world', {
      worldId,
      localUserId,
      sessionId,
      members,
      placements,
    });
  }, [sceneReady, worldId, localUserId, sessionId, members, placements]);

  useEffect(() => {
    if (!sceneReady) return;
    gameEventBus.emit('cmd:set-map', { mapId: currentMapId });
  }, [sceneReady, currentMapId]);

  useEffect(() => {
    if (!sceneReady) return;
    gameEventBus.emit('cmd:remote-presence', presences);
  }, [sceneReady, presences]);

  useEffect(() => {
    if (!sceneReady) return;
    gameEventBus.emit('cmd:set-decorate', {
      active: decorateActive,
      activeSku,
      selectedPlacementId,
      previewRotated: decoratePreviewRotated,
      devSandbox: decorateDevSandbox,
    });
  }, [sceneReady, decorateActive, activeSku, selectedPlacementId, decoratePreviewRotated, decorateDevSandbox]);

  useEffect(() => {
    if (!sceneReady) return;
    gameEventBus.emit('cmd:set-paused', { paused: isModalOpen, keepAnimating: animateUnderModal });
  }, [sceneReady, isModalOpen, animateUnderModal]);

  useEffect(() => {
    if (!sceneReady) return;
    gameEventBus.emit('cmd:set-movement-connection', movementConnection);
  }, [sceneReady, movementConnection]);

  return (
    <div className="stage-area">
      <div
        ref={hostRef}
        className="game-canvas-host"
        data-testid="game-canvas-host"
        aria-label="Không gian trò chơi Our Little World"
      />

      {import.meta.env.DEV && livingPetTelemetry && livingPetTelemetry.visible && (
        <div
          data-testid={LIVING_PET_TELEMETRY_TEST_ID}
          data-visible={livingPetTelemetry.visible ? '1' : '0'}
          data-x={String(livingPetTelemetry.x)}
          data-y={String(livingPetTelemetry.y)}
          data-anim={livingPetTelemetry.animState}
          data-brain-phase={livingPetTelemetry.brainPhase}
          data-loco={livingPetTelemetry.locomotionKind}
          data-food-offer={livingPetTelemetry.foodOfferHandled ? '1' : '0'}
          aria-hidden
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
          }}
        />
      )}

      {!sceneReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff8ef',
            fontWeight: 700,
            pointerEvents: 'none',
          }}
        >
          Đang mở ngôi nhà nhỏ...
        </div>
      )}

      {toast && (
        <div className="stage-overlay-top">
          <div
            className={`toast-banner ${toast.isError ? 'toast-banner--error' : ''}`}
            role="status"
            data-testid="stage-toast"
          >
            {toast.message}
          </div>
        </div>
      )}

      {nearby && !decorateActive && !contextualInteractionHud && (
        <div className="nearby-action-wrap">
          <button
            type="button"
            className="nearby-action-btn"
            data-testid="btn-nearby-action"
            onClick={() => gameEventBus.emit('cmd:trigger-interact')}
          >
            {nearby.labelVi}
          </button>
        </div>
      )}

      <TouchJoystick
        visible={showJoystick}
        disabled={decorateActive || isModalOpen || petCareActive}
        mode={joystickMode}
        layoutMode={hudLayoutMode}
      />
    </div>
  );
}
