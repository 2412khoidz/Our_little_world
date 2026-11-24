import type {
  Direction,
  FurniturePlacement,
  MapId,
  MovementPacket,
  PresencePayload,
  WorldMember,
} from '../shared/types';

export interface WorldSyncPayload {
  worldId: string;
  localUserId: string;
  sessionId: string;
  members: WorldMember[];
  placements: FurniturePlacement[];
}

export interface DecorateStatePayload {
  active: boolean;
  activeSku: string | null;
  selectedPlacementId: string | null;
}

export interface NearbyInteractable {
  kind: 'portal' | 'wardrobe' | 'study_preview' | 'cinema_preview';
  labelVi: string;
}

export interface GameDiagnosticsSnapshot {
  fps: number;
  renderer: 'WebGL' | 'Canvas';
  contextLost: boolean;
  zoom: number;
  mapId: MapId;
}

export interface GameEventMap {
  // React -> Phaser
  'cmd:sync-world': WorldSyncPayload;
  'cmd:set-map': { mapId: MapId; spawnTile?: { tileX: number; tileY: number } };
  'cmd:remote-movement': MovementPacket;
  'cmd:set-movement-connection': number | null;
  'cmd:remote-presence': PresencePayload[];
  'cmd:set-decorate': DecorateStatePayload;
  'cmd:set-joystick': { vx: number; vy: number };
  'cmd:trigger-interact': undefined;
  'cmd:set-paused': { paused: boolean };

  // Phaser -> React
  'evt:scene-ready': { mapId: MapId };
  'evt:local-movement': MovementPacket;
  'evt:local-tile-changed': { mapId: MapId; tileX: number; tileY: number; facing: Direction };
  'evt:request-map-change': { targetMapId: MapId; spawnX: number; spawnY: number };
  'evt:open-avatar-customizer': undefined;
  'evt:preview-notice': { title: string; body: string; version: string };
  'evt:decorate-place': { mapId: MapId; sku: string; tileX: number; tileY: number };
  'evt:decorate-move': { placementId: string; tileX: number; tileY: number };
  'evt:decorate-select': { placementId: string | null };
  'evt:nearby-interactable': NearbyInteractable | null;
  'evt:diagnostics': GameDiagnosticsSnapshot;
}

type Listener<T> = (payload: T) => void;

class TypedEventBus {
  private readonly listeners = new Map<keyof GameEventMap, Set<Listener<never>>>();

  on<K extends keyof GameEventMap>(event: K, fn: Listener<GameEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as Listener<never>);
    return () => {
      set?.delete(fn as Listener<never>);
    };
  }

  emit<K extends keyof GameEventMap>(
    event: K,
    ...args: GameEventMap[K] extends undefined ? [] : [GameEventMap[K]]
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;
    const payload = args[0] as GameEventMap[K];
    for (const fn of set) {
      (fn as Listener<GameEventMap[K]>)(payload);
    }
  }
}

export const gameEventBus = new TypedEventBus();
