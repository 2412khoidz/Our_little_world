import type { HeldItemState, InteractableTarget } from '../shared/interaction/interactionTypes';
import type { CoupleEmoteId, CouplePostureKind } from '../shared/couple/coupleTypes';
import type { PetActionType, PetSnapshot } from '../shared/pet/petTypes';
import type { PetFoodOfferInput } from '../shared/petLiving/petBrainContract04B';
import type { LivingPetDevTelemetry } from '../shared/petLiving/mainGame/livingPetDevTelemetry';
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
  kind:
    | 'portal'
    | 'wardrobe'
    | 'study_room'
    | 'cinema_preview'
    | 'pet'
    | 'sofa_sit'
    | 'bench_sit'
    | 'bed_lie'
    | 'photo_frame'
    | 'mailbox'
    | 'npc_talk';
  labelVi: string;
}

export interface InteractionFramePayload {
  mapId: MapId;
  playerX: number;
  playerY: number;
  facing: Direction;
  interactables: readonly InteractableTarget[];
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
  'cmd:sync-pet': PetSnapshot | null;
  'cmd:pet-reaction': { action: PetActionType };
  'cmd:set-study-pet-mode': { active: boolean };
  'cmd:seat-at-desk': { seat: 'left' | 'right' | null };
  'cmd:apply-local-posture': {
    posture: CouplePostureKind;
    x?: number;
    y?: number;
    facing?: Direction;
  };
  'cmd:cancel-local-posture': undefined;
  'cmd:sync-remote-posture': {
    userId: string;
    mapId: MapId;
    posture: CouplePostureKind;
    x: number;
    y: number;
    facing: Direction;
  };
  'cmd:spawn-emote': {
    userId: string;
    mapId: MapId;
    emote: CoupleEmoteId | 'hug_hearts';
    local?: boolean;
  };
  'cmd:sync-mailbox-unread': { unreadCount: number };
  'cmd:sync-held-item': HeldItemState;
  /** DEV living-pet local simulation — presentation only, no consumption. */
  'cmd:pet-local-food-offer': PetFoodOfferInput;
  'cmd:pet-care-mode': { active: boolean };
  'cmd:pet-care-stroke': { zone: 'head' | 'chin' | 'back'; strokeIndex: number };
  'cmd:pet-care-action': {
    kind: 'toy_yarn' | 'toy_box' | 'offer_food' | 'brush' | 'pour_water' | 'call' | 'observe';
    sku?: string;
    quality?: 'normal' | 'silver' | 'gold';
    ownerScope?: string;
  };
  /** React shell → authoritative inventory + vitals (dev LAN / Supabase). */
  'evt:pet-care-request-consume': {
    sku: string;
    quality: 'normal' | 'silver' | 'gold';
    ownerScope: string;
  };
  'evt:pet-care-mode': { active: boolean };
  'evt:pet-care-session-goals': { count: number; total: number; labelsVi: string[] };
  'evt:pet-care-stroke-done': { zone: 'head' | 'chin' | 'back' | 'belly' };
  'evt:pet-care-refuse': { squeak: 'refuse' | 'purr' | 'mrow' | 'chirp' };

  // Phaser -> React
  'evt:scene-ready': { mapId: MapId };
  'evt:local-movement': MovementPacket;
  'evt:local-tile-changed': { mapId: MapId; tileX: number; tileY: number; facing: Direction };
  'evt:request-map-change': { targetMapId: MapId; spawnX: number; spawnY: number };
  'evt:open-avatar-customizer': undefined;
  'evt:open-pet-panel': undefined;
  'evt:open-study-panel': undefined;
  'evt:open-photo-frame': undefined;
  'evt:open-mailbox': undefined;
  'evt:local-posture-changed': {
    posture: CouplePostureKind;
    slotIndex: number;
    x: number;
    y: number;
    facing: Direction;
    mapId: MapId;
  };
  'evt:request-couple-posture': {
    kind: 'sofa_sit' | 'bench_sit' | 'bed_lie';
  };
  'evt:preview-notice': { title: string; body: string; version: string };
  'evt:decorate-place': { mapId: MapId; sku: string; tileX: number; tileY: number };
  'evt:decorate-move': { placementId: string; tileX: number; tileY: number };
  'evt:decorate-select': { placementId: string | null };
  'evt:nearby-interactable': NearbyInteractable | null;
  'evt:interaction-frame': InteractionFramePayload;
  'evt:diagnostics': GameDiagnosticsSnapshot;
  /** DEV living-pet acceptance — sampled ~2 Hz from WorldScene. */
  'evt:living-pet-dev-telemetry': LivingPetDevTelemetry;
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
