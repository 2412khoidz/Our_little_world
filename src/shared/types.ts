export type MapId = 'home' | 'garden' | 'outdoor';

export type Direction = 'down' | 'up' | 'left' | 'right';

export type BackendMode = 'supabase' | 'dev-lan' | 'local-preview' | 'unconfigured';

export interface DevIdentityInfo {
  presetId: 'partner-a' | 'partner-b' | 'outsider';
  userId: string;
  email: string;
  nickname: string;
  roleLabel: string;
  inWorld: boolean;
  worldRole: 'owner' | 'partner' | null;
}

export interface AvatarConfig {
  skinTone: 'fair' | 'warm' | 'tan';
  hairStyle: 'short' | 'bob' | 'long';
  hairColor: 'espresso' | 'chestnut' | 'honey' | 'sakura';
  outfitStyle: 'sweater' | 'overall' | 'cardigan';
  outfitColor: 'rose' | 'sage' | 'cream' | 'sky';
  accessory: 'none' | 'glasses' | 'ribbon';
}

export interface UserProfile {
  userId: string;
  nickname: string;
  avatarConfig: AvatarConfig;
  updatedAt: string;
}

export interface WorldMember {
  userId: string;
  role: 'owner' | 'partner';
  nickname: string;
  avatarConfig: AvatarConfig;
  joinedAt: string;
}

export interface WorldInfo {
  id: string;
  name: string;
  layoutVersion: number;
  createdAt: string;
}

export interface WorldInviteStatus {
  hasActiveInvite: boolean;
  expiresAt: string | null;
}

export interface CreatedInvite {
  inviteCode: string;
  expiresAt: string;
}

export type FurnitureLayerSlot = 'floor' | 'object';

export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FurnitureCatalogItem {
  sku: string;
  nameVi: string;
  descriptionVi: string;
  allowedMaps: readonly MapId[];
  layerSlot: FurnitureLayerSlot;
  widthTiles: number;
  heightTiles: number;
  blocksMovement: boolean;
  starterQuantity: number;
  sprite: SpriteRect;
  interactTag?: 'wardrobe' | 'study_preview' | 'cinema_preview';
}

export interface FurniturePlacement {
  id: string;
  worldId: string;
  mapId: MapId;
  sku: string;
  layerSlot: FurnitureLayerSlot;
  tileX: number;
  tileY: number;
  widthTiles: number;
  heightTiles: number;
  updatedBy: string;
  updatedAt: string;
}

export interface WorldSnapshot {
  world: WorldInfo;
  members: WorldMember[];
  placements: FurniturePlacement[];
}

export interface PresencePayload {
  userId: string;
  sessionId: string;
  mapId: MapId;
  nickname: string;
  avatarConfig: AvatarConfig;
  tileX: number;
  tileY: number;
  facing: Direction;
  updatedAtMs: number;
}

export interface MovementPacket {
  worldId: string;
  userId: string;
  sessionId: string;
  mapId: MapId;
  seq: number;
  timestampMs: number;
  x: number;
  y: number;
  facing: Direction;
  anim: 'idle' | 'walk';
}

export type WorldMutationReason =
  | 'furniture'
  | 'profile'
  | 'member'
  | 'inventory'
  | 'pet'
  | 'study'
  | 'mailbox';

export type MutationErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'WORLD_FULL'
  | 'ALREADY_IN_WORLD'
  | 'INVITE_INVALID'
  | 'INVITE_EXPIRED'
  | 'INVITE_USED'
  | 'TILE_OCCUPIED'
  | 'OUT_OF_BOUNDS'
  | 'BLOCKED_TILE'
  | 'NO_PLACE_ZONE'
  | 'WRONG_MAP'
  | 'STOCK_EXCEEDED'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'COOLDOWN_ACTIVE'
  | 'STACK_FULL'
  | 'ALREADY_OPENED'
  | 'INSUFFICIENT_ITEMS'
  | 'IDEMPOTENCY_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'SERVER_AUTHORITY_REQUIRED'
  | 'BOWL_FULL'
  | 'BOWL_EMPTY'
  | 'NETWORK_ERROR';

export type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: MutationErrorCode; message: string };

// --- Spike 0 Cinema PoC Sync Types ---
export type CinemaPlaybackStatus = 'playing' | 'paused' | 'buffering' | 'ended';
export type CinemaControlMode = 'host_only' | 'both';

export interface CinemaSyncState {
  sessionId: string;
  mediaId: string;
  revision: number;
  controllerId: string;
  mode: CinemaControlMode;
  status: CinemaPlaybackStatus;
  positionSec: number;
  rate: number;
  effectiveAtServerMs: number;
  updatedAtServerMs: number;
}

export interface CinemaCommand {
  commandId: string;
  senderId: string;
  expectedRevision: number;
  action: 'play' | 'pause' | 'seek' | 'set_mode' | 'buffer_start' | 'buffer_ready';
  desiredPositionSec?: number;
  desiredMode?: CinemaControlMode;
}

export type DriftDecision =
  | { action: 'ignore'; driftMs: number }
  | { action: 'rate'; driftMs: number; playbackRate: number }
  | { action: 'seek'; driftMs: number; targetSec: number };
