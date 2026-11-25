import type { CoupleEventPacket } from '../../shared/couple/coupleTypes';
import type { DevSanitizedWorldSnapshot } from '../../shared/devConsole/devConsoleTypes';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import type {
  MailboxSnapshot,
  OpenMailboxParams,
  SendMailboxParams,
} from '../../shared/mailbox/mailboxTypes';
import type {
  PetActionType,
  PetCareApplyResult,
  PetCareBowlSnapshot,
  PetInteractionResult,
  PetSnapshot,
} from '../../shared/pet/petTypes';
import type {
  StudyControlAction,
  StudyMode,
  StudySnapshot,
} from '../../shared/study/studyTypes';
import type {
  AvatarConfig,
  BackendMode,
  CinemaCommand,
  CinemaSyncState,
  CreatedInvite,
  DevIdentityInfo,
  FurniturePlacement,
  MapId,
  MovementPacket,
  MutationResult,
  PresencePayload,
  UserProfile,
  WorldInviteStatus,
  WorldMutationReason,
  WorldSnapshot,
} from '../../shared/types';

export interface AuthSessionUser {
  userId: string;
  email: string;
  displayLabel: string;
}

export type LocalPresetAccountId = 'partner-a' | 'partner-b' | 'outsider';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

export interface RealtimeHandlers {
  onPresenceChange: (presences: PresencePayload[]) => void;
  onMovement: (packet: MovementPacket) => void;
  onWorldMutated: (reason: WorldMutationReason) => void;
  onCoupleEvent?: (packet: CoupleEventPacket) => void;
  onConnectionChange: (status: ConnectionStatus) => void;
}

export interface RealtimeHandle {
  publishMovement: (packet: MovementPacket) => void;
  updatePresence: (presence: PresencePayload) => void;
  notifyWorldMutated: (reason: WorldMutationReason) => void;
  publishCoupleEvent?: (packet: CoupleEventPacket) => void;
  reconnect: () => Promise<void>;
  setSimulatedOffline?: (offline: boolean) => void;
  disconnect: () => Promise<void>;
}

export interface InventoryBackend {
  getInventory(worldId: string): Promise<MutationResult<InventorySnapshot>>;
  claimFreeKibble(worldId: string, idempotencyKey: string): Promise<MutationResult<InventorySnapshot>>;
  transferInventoryQuality(params: {
    worldId: string;
    fromScope: 'shared' | 'personal';
    toScope: 'shared' | 'personal';
    itemSku: string;
    quality: 'normal' | 'silver' | 'gold';
    qty: number;
    idempotencyKey: string;
  }): Promise<MutationResult<InventorySnapshot>>;
}

export interface PetBackend {
  getPetSnapshot(worldId: string): Promise<MutationResult<PetSnapshot | null>>;
  adoptOrRenamePet(params: {
    worldId: string;
    name: string;
    expectedVersion?: number | null;
    idempotencyKey: string;
  }): Promise<MutationResult<PetSnapshot>>;
  interactPet(params: {
    worldId: string;
    petId: string;
    action: PetActionType;
    expectedVersion: number;
    idempotencyKey: string;
  }): Promise<MutationResult<PetInteractionResult>>;
  getPetCareSnapshot(worldId: string): Promise<MutationResult<PetCareBowlSnapshot>>;
  applyPetCare(params: {
    worldId: string;
    petId: string;
    action: 'fill_food' | 'fill_water';
    expectedBowlVersion: number;
    ownerScope: string;
    itemSku: string;
    quality: 'normal' | 'silver' | 'gold';
    idempotencyKey: string;
  }): Promise<MutationResult<PetCareApplyResult>>;
}

export interface SpikeCinemaPacket {
  kind: 'state' | 'command' | 'ready' | 'ping' | 'pong';
  senderId: string;
  sentAtClientMs: number;
  serverNowMs?: number;
  ready?: boolean;
  command?: CinemaCommand;
  state?: CinemaSyncState;
}

export interface SpikeCinemaBus {
  subscribe: (onMessage: (pkt: SpikeCinemaPacket) => void) => () => void;
  send: (pkt: SpikeCinemaPacket) => void;
}

export interface StudyBackend {
  getStudySnapshot(worldId: string): Promise<MutationResult<StudySnapshot>>;
  startSession(params: {
    worldId: string;
    mode: StudyMode;
    focusMinutes: number;
    breakMinutes: number;
    idempotencyKey: string;
  }): Promise<MutationResult<StudySnapshot>>;
  controlSession(params: {
    worldId: string;
    sessionId: string;
    action: StudyControlAction;
    expectedVersion: number;
    idempotencyKey: string;
  }): Promise<MutationResult<StudySnapshot>>;
}

export interface MailboxBackend {
  listMailbox(worldId: string): Promise<MutationResult<MailboxSnapshot>>;
  sendLetterOrGift(
    params: SendMailboxParams,
  ): Promise<MutationResult<{ mailbox: MailboxSnapshot; inventory: InventorySnapshot }>>;
  openItem(
    params: OpenMailboxParams,
  ): Promise<MutationResult<{ openedId: string; mailbox: MailboxSnapshot; inventory: InventorySnapshot }>>;
}

export interface FarmBackend {
  getFarmSnapshot(worldId: string): Promise<MutationResult<import('../../shared/farming/farmSnapshotTypes').FarmSnapshot>>;
  applyFarm(params: {
    worldId: string;
    plotIndex: number;
    action: 'till' | 'plant' | 'water' | 'harvest';
    seedSku?: string | null;
    farmVersion?: number;
    idempotencyKey: string;
  }): Promise<
    MutationResult<{
      snapshot: import('../../shared/farming/farmSnapshotTypes').FarmSnapshot;
      harvested?: { sku: string; qty: number; quality: string }[];
    }>
  >;
  sellCrop(params: {
    worldId: string;
    sku: string;
    qty: number;
    quality?: 'normal' | 'silver' | 'gold';
    idempotencyKey: string;
  }): Promise<MutationResult<{ walletCoins: number }>>;
  buySeed(params: {
    worldId: string;
    seedSku: string;
    qty: number;
    idempotencyKey: string;
  }): Promise<MutationResult<{ walletCoins: number }>>;
  shipToBin(params: {
    worldId: string;
    lines: { sku: string; qty: number; quality?: 'normal' | 'silver' | 'gold' }[];
    idempotencyKey: string;
  }): Promise<MutationResult<{ walletCoins: number; totalCoins: number }>>;
  processPantry(params: {
    worldId: string;
    outputSku: string;
    idempotencyKey: string;
  }): Promise<MutationResult<{ outputSku: string }>>;
}

export interface DevConsoleBackend {
  spawnItem(params: {
    worldId: string;
    scope: 'shared' | 'personal';
    itemSku: string;
    qty: number;
  }): Promise<MutationResult<InventorySnapshot>>;
  setPetVitals(params: {
    worldId: string;
    hunger: number;
    energy: number;
    fun: number;
  }): Promise<MutationResult<PetSnapshot>>;
  advanceStudy(params: {
    worldId: string;
    sessionId: string;
    deltaSeconds: number;
  }): Promise<MutationResult<StudySnapshot>>;
  exportSnapshot(worldId: string): Promise<MutationResult<DevSanitizedWorldSnapshot>>;
  restoreSnapshot(
    worldId: string,
    snapshot: DevSanitizedWorldSnapshot,
  ): Promise<MutationResult<{ restored: true }>>;
}

export interface WorldBackend {
  readonly mode: BackendMode;

  getCurrentUser(): Promise<AuthSessionUser | null>;
  onAuthChange(cb: (user: AuthSessionUser | null) => void): () => void;

  signInWithPassword(email: string, password: string): Promise<MutationResult<AuthSessionUser>>;
  signUpWithPassword(
    email: string,
    password: string,
  ): Promise<MutationResult<{ user: AuthSessionUser | null; needsEmailVerification: boolean }>>;
  signInLocalPreset?(presetId: LocalPresetAccountId): Promise<MutationResult<AuthSessionUser>>;
  listDevIdentities?(): Promise<{
    identities: DevIdentityInfo[];
    worldExists: boolean;
    worldName: string | null;
    memberCount: number;
  }>;
  seedDevCoupleWorld?(): Promise<MutationResult<WorldSnapshot>>;
  resetDevWorld?(): Promise<MutationResult<{ reset: true }>>;
  signOut(): Promise<void>;

  getWorldSnapshot(): Promise<MutationResult<WorldSnapshot | null>>;
  createWorld(
    worldName: string,
    nickname: string,
    avatarConfig: AvatarConfig,
  ): Promise<MutationResult<WorldSnapshot>>;
  createInvite(worldId: string): Promise<MutationResult<CreatedInvite>>;
  getInviteStatus(worldId: string): Promise<MutationResult<WorldInviteStatus>>;
  redeemInvite(
    inviteCode: string,
    nickname: string,
    avatarConfig: AvatarConfig,
  ): Promise<MutationResult<WorldSnapshot>>;
  updateProfile(nickname: string, avatarConfig: AvatarConfig): Promise<MutationResult<UserProfile>>;

  placeFurniture(params: {
    worldId: string;
    mapId: MapId;
    sku: string;
    tileX: number;
    tileY: number;
    expectedLayoutVersion: number;
    idempotencyKey: string;
  }): Promise<MutationResult<{ layoutVersion: number; placement: FurniturePlacement }>>;

  moveFurniture(params: {
    worldId: string;
    placementId: string;
    tileX: number;
    tileY: number;
    expectedLayoutVersion: number;
    idempotencyKey: string;
  }): Promise<MutationResult<{ layoutVersion: number; placement: FurniturePlacement }>>;

  removeFurniture(params: {
    worldId: string;
    placementId: string;
    expectedLayoutVersion: number;
    idempotencyKey: string;
  }): Promise<MutationResult<{ layoutVersion: number; removedId: string }>>;

  connectWorldRealtime(
    worldId: string,
    initialPresence: PresencePayload,
    handlers: RealtimeHandlers,
  ): Promise<RealtimeHandle>;

  createSpikeCinemaBus(worldId: string, userId: string): SpikeCinemaBus;

  readonly inventory?: InventoryBackend;
  readonly farm?: FarmBackend;
  readonly pet?: PetBackend;
  readonly study?: StudyBackend;
  readonly mailbox?: MailboxBackend;
  readonly devConsole?: DevConsoleBackend;
}
