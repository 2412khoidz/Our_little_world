import { useEffect, useRef, useState } from 'react';
import { gameEventBus, type NearbyInteractable } from '../../game/eventBus';
import type {
  FurniturePlacement,
  MapId,
  PresencePayload,
  WorldMember,
} from '../../shared/types';

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
  showJoystick: boolean;
  isModalOpen: boolean;
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
  showJoystick,
  isModalOpen,
  toast,
}: GameViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [nearby, setNearby] = useState<NearbyInteractable | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const joyDragRef = useRef<{ active: boolean; centerX: number; centerY: number }>({
    active: false,
    centerX: 0,
    centerY: 0,
  });

  // Dynamically import Phaser only when rendering game stage (keeps initial shell lean)
  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    let destroyed = false;
    let gameInstance: import('phaser').Game | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const unsubReady = gameEventBus.on('evt:scene-ready', () => {
      setSceneReady(true);
    });
    const unsubNearby = gameEventBus.on('evt:nearby-interactable', (item) => {
      setNearby(item);
    });

    void import('../../game/createGame').then(({ createWorldGame }) => {
      if (destroyed || !hostRef.current) return;
      const el = hostRef.current;
      gameInstance = createWorldGame(el);
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (!gameInstance || destroyed) return;
          if (el.clientWidth > 0 && el.clientHeight > 0) {
            gameInstance.scale.resize(el.clientWidth, el.clientHeight);
          }
        });
        resizeObserver.observe(el);
      }
    });

    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      unsubReady();
      unsubNearby();
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
    });
  }, [sceneReady, decorateActive, activeSku, selectedPlacementId]);

  useEffect(() => {
    if (!sceneReady) return;
    gameEventBus.emit('cmd:set-paused', { paused: isModalOpen });
  }, [sceneReady, isModalOpen]);

  function updateJoystickFromPointer(clientX: number, clientY: number) {
    const maxRadius = 32;
    const dx = clientX - joyDragRef.current.centerX;
    const dy = clientY - joyDragRef.current.centerY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const ox = dist > 0 ? Math.cos(angle) * clamped : 0;
    const oy = dist > 0 ? Math.sin(angle) * clamped : 0;
    setKnobOffset({ x: ox, y: oy });
    gameEventBus.emit('cmd:set-joystick', {
      vx: ox / maxRadius,
      vy: oy / maxRadius,
    });
  }

  function resetJoystick() {
    joyDragRef.current.active = false;
    setKnobOffset({ x: 0, y: 0 });
    gameEventBus.emit('cmd:set-joystick', { vx: 0, vy: 0 });
  }

  return (
    <div className="stage-area">
      <div
        ref={hostRef}
        className="game-canvas-host"
        data-testid="game-canvas-host"
        aria-label="Không gian trò chơi Our Little World"
      />

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

      {nearby && !decorateActive && (
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

      {showJoystick && !decorateActive && (
        <div
          className="joystick-zone"
          aria-label="Cần điều khiển di chuyển"
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            joyDragRef.current = {
              active: true,
              centerX: rect.left + rect.width / 2,
              centerY: rect.top + rect.height / 2,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
            updateJoystickFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!joyDragRef.current.active) return;
            updateJoystickFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={() => resetJoystick()}
          onPointerCancel={() => resetJoystick()}
        >
          <div
            className="joystick-knob"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
