import {
  DEFAULT_AVATAR_PARTNER_A,
  DEFAULT_AVATAR_PARTNER_B,
  parseAvatarConfig,
} from '../../shared/avatar';
import { buildDefaultStarterPlacements, getCatalogItem } from '../../shared/catalog';
import { validatePlacement } from '../../shared/placement';
import type { BilliardsMatchRecordInput, BilliardsWinTally } from '../../shared/billiards/types';
import type { MinigameEventEnvelope } from '../../shared/netcode/minigameContract';
import type {
  AvatarConfig,
  FurniturePlacement,
  MovementPacket,
  PresencePayload,
  UserProfile,
  WorldInfo,
  WorldMember,
  WorldMutationReason,
  WorldSnapshot,
} from '../../shared/types';
import {
  applyDeepFarmMutation,
  createEmptyDeepFarmState,
  ensureFreshOrderBoard,
  projectDeepFarmSnapshot,
  type DeepFarmState,
} from '../../shared/farming/deepFarmState';
import { applyFarmShippingBinSale, type FarmShippingMeta } from '../../shared/farming/farmShipping';
import {
  FARM_STARTER_COINS,
  applyFarmAction,
  buildFarmSnapshot,
  buySeed,
  emptyFarm,
  sellCropLine,
} from '../../shared/farming/serverApply';
import type { Farm } from '../../shared/farming/types';
import { initializeWorldInventory, INVENTORY_STARTER_VERSION } from '../../shared/inventory/inventoryStarter.mjs';
import type { InventoryEntry } from '../../shared/inventory/inventoryTypes';
import type {
  AuthSessionUser,
  LocalPresetAccountId,
  RealtimeHandle,
  SpikeCinemaBus,
  SpikeCinemaPacket,
  WorldBackend,
} from './types';

const DB_STORAGE_KEY = 'olw:local-preview:db:v1';
const REALTIME_CHANNEL_NAME = 'olw:local-preview:realtime:v1';
const SPIKE_CINEMA_CHANNEL_PREFIX = 'olw:local-preview:cinema-spike:';

interface StoredInvite {
  id: string;
  worldId: string;
  tokenHash: string;
  expiresAt: string;
  redeemedBy: string | null;
  redeemedAt: string | null;
}

interface StoredIdempotencyRecord {
  worldId: string;
  key: string;
  result: unknown;
}

interface StoredBilliardsMatch {
  matchId: string;
  worldId: string;
  rule: '8ball' | '9ball';
  rackSeed: number;
  winnerUserId: string;
  loserUserId: string | null;
  reason: string;
  durationSeconds: number;
  createdAt: string;
}

interface LocalPreviewDb {
  profiles: Record<string, UserProfile>;
  worlds: Record<string, WorldInfo>;
  memberships: Record<string, Array<{ userId: string; role: 'owner' | 'partner'; joinedAt: string }>>;
  invites: StoredInvite[];
  placements: Record<string, FurniturePlacement[]>;
  idempotency: Record<string, StoredIdempotencyRecord>;
  billiardsMatches?: Record<string, StoredBilliardsMatch[]>;
  farms?: Record<string, { seed: number; version: number; farm: Farm }>;
  deepFarms?: Record<string, DeepFarmState>;
  wallets?: Record<string, { coins: number }>;
  inventories?: Record<string, InventoryEntry[]>;
  inventoryStarterVersions?: Record<string, number>;
  shippingBin?: Record<string, FarmShippingMeta>;
}

const PRESET_ACCOUNTS: Record<LocalPresetAccountId, AuthSessionUser & { defaultAvatar: AvatarConfig }> = {
  'partner-a': {
    userId: '11111111-1111-4111-8111-111111111111',
    email: 'an.local@ourlittleworld.test',
    displayLabel: 'An (Chủ nhà)',
    defaultAvatar: DEFAULT_AVATAR_PARTNER_A,
  },
  'partner-b': {
    userId: '22222222-2222-4222-8222-222222222222',
    email: 'binh.local@ourlittleworld.test',
    displayLabel: 'Bình (Người thương)',
    defaultAvatar: DEFAULT_AVATAR_PARTNER_B,
  },
  outsider: {
    userId: '33333333-3333-4333-8333-333333333333',
    email: 'khachla.local@ourlittleworld.test',
    displayLabel: 'Khách lạ (Test từ chối)',
    defaultAvatar: DEFAULT_AVATAR_PARTNER_A,
  },
};

function createEmptyDb(): LocalPreviewDb {
  return {
    profiles: {},
    worlds: {},
    memberships: {},
    invites: [],
    placements: {},
    idempotency: {},
  };
}

function initializePreviewInventory(db: LocalPreviewDb, worldId: string, nowIso: string, newWorld = false): boolean {
  db.inventoryStarterVersions ??= {};
  if ((db.inventoryStarterVersions[worldId] ?? 0) >= INVENTORY_STARTER_VERSION) return false;
  db.inventories ??= {};
  db.wallets ??= {};
  db.inventories[worldId] = initializeWorldInventory(db.inventories[worldId] ?? [], worldId, nowIso, newWorld);
  db.wallets[worldId] ??= { coins: FARM_STARTER_COINS };
  db.inventoryStarterVersions[worldId] = INVENTORY_STARTER_VERSION;
  return true;
}

function readDb(): LocalPreviewDb {
  let db: LocalPreviewDb;
  try {
    const raw = window.localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) return createEmptyDb();
    db = JSON.parse(raw) as LocalPreviewDb;
  } catch {
    return createEmptyDb();
  }
  const nowIso = new Date().toISOString();
  let migrated = false;
  for (const worldId of Object.keys(db.worlds)) {
    if (initializePreviewInventory(db, worldId, nowIso)) migrated = true;
  }
  if (migrated) writeDb(db);
  return db;
}

function writeDb(db: LocalPreviewDb): void {
  window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
}

function simpleHashToken(code: string): string {
  // Deterministic non-reversible-looking hash tag for local preview invites
  let h1 = 0x811c9dc5;
  for (let i = 0; i < code.length; i += 1) {
    h1 ^= code.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return `local-fnv1a-${(h1 >>> 0).toString(16).padStart(8, '0')}-${code.length}`;
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'OLW-';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// Fallback bus for environments without BroadcastChannel (same-process tests)
const inProcessListeners = new Map<string, Set<(msg: unknown) => void>>();

function openBusChannel(name: string, onMessage: (msg: unknown) => void): {
  post: (msg: unknown) => void;
  close: () => void;
} {
  if (typeof BroadcastChannel !== 'undefined') {
    const bc = new BroadcastChannel(name);
    bc.onmessage = (event) => {
      onMessage(event.data);
    };
    return {
      post: (msg) => {
        bc.postMessage(msg);
      },
      close: () => {
        bc.close();
      },
    };
  }

  let set = inProcessListeners.get(name);
  if (!set) {
    set = new Set();
    inProcessListeners.set(name, set);
  }
  const handler = (msg: unknown) => onMessage(msg);
  set.add(handler);

  return {
    post: (msg) => {
      const listeners = inProcessListeners.get(name);
      if (!listeners) return;
      for (const fn of listeners) {
        if (fn !== handler) fn(msg);
      }
    },
    close: () => {
      inProcessListeners.get(name)?.delete(handler);
    },
  };
}

type LocalWireMessage =
  | { kind: 'presence'; worldId: string; presence: PresencePayload }
  | { kind: 'presence_leave'; worldId: string; sessionId: string }
  | { kind: 'movement'; worldId: string; packet: MovementPacket }
  | { kind: 'world_mutated'; worldId: string; reason: WorldMutationReason }
  | { kind: 'minigame_event'; worldId: string; sessionId: string; packet: MinigameEventEnvelope };

function findUserWorldId(db: LocalPreviewDb, userId: string): string | null {
  for (const [worldId, members] of Object.entries(db.memberships)) {
    if (members.some((m) => m.userId === userId)) {
      return worldId;
    }
  }
  return null;
}

function buildSnapshot(db: LocalPreviewDb, worldId: string): WorldSnapshot | null {
  const world = db.worlds[worldId];
  const rawMembers = db.memberships[worldId];
  if (!world || !rawMembers) return null;

  const members: WorldMember[] = rawMembers.map((m) => {
    const profile = db.profiles[m.userId];
    return {
      userId: m.userId,
      role: m.role,
      nickname: profile?.nickname ?? (m.role === 'owner' ? 'An' : 'Bình'),
      avatarConfig: parseAvatarConfig(
        profile?.avatarConfig,
        m.role === 'owner' ? DEFAULT_AVATAR_PARTNER_A : DEFAULT_AVATAR_PARTNER_B,
      ),
      joinedAt: m.joinedAt,
    };
  });

  const placements = [...(db.placements[worldId] ?? [])];
  return { world, members, placements };
}

export function createLocalPreviewBackend(sessionStorageKey = 'olw:local-preview:session-user'): WorldBackend {
  const authListeners = new Set<(user: AuthSessionUser | null) => void>();

  function getStoredUser(): AuthSessionUser | null {
    try {
      const raw = window.sessionStorage.getItem(sessionStorageKey);
      if (!raw) return null;
      return JSON.parse(raw) as AuthSessionUser;
    } catch {
      return null;
    }
  }

  function setStoredUser(user: AuthSessionUser | null): void {
    try {
      if (!user) {
        window.sessionStorage.removeItem(sessionStorageKey);
      } else {
        window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(user));
      }
    } catch {
      // Ignore storage failures in locked sandboxes
    }
    for (const listener of authListeners) {
      listener(user);
    }
  }

  function notifyWorldMutatedBroadcast(
    worldId: string,
    reason: WorldMutationReason,
  ): void {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(REALTIME_CHANNEL_NAME);
      bc.postMessage({ kind: 'world_mutated', worldId, reason } satisfies LocalWireMessage);
      bc.close();
      return;
    }
    const listeners = inProcessListeners.get(REALTIME_CHANNEL_NAME);
    if (listeners) {
      for (const fn of listeners) {
        fn({ kind: 'world_mutated', worldId, reason } satisfies LocalWireMessage);
      }
    }
  }

  return {
    mode: 'local-preview',

    async getCurrentUser() {
      return getStoredUser();
    },

    onAuthChange(cb) {
      authListeners.add(cb);
      return () => {
        authListeners.delete(cb);
      };
    },

    async signInWithPassword(email) {
      const clean = email.trim().toLowerCase();
      if (!clean.includes('@')) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Email không hợp lệ.' };
      }
      if (clean.includes('an')) return this.signInLocalPreset!('partner-a');
      if (clean.includes('binh') || clean.includes('bình')) {
        return this.signInLocalPreset!('partner-b');
      }
      const user: AuthSessionUser = {
        userId: `local-${simpleHashToken(clean)}`,
        email: clean,
        displayLabel: clean.split('@')[0] || 'Người chơi',
      };
      setStoredUser(user);
      return { ok: true, data: user };
    },

    async signUpWithPassword(email) {
      const res = await this.signInWithPassword(email, 'local-preview');
      if (!res.ok) return res;
      return { ok: true, data: { user: res.data, needsEmailVerification: false } };
    },

    async signInLocalPreset(presetId) {
      const preset = PRESET_ACCOUNTS[presetId];
      const user: AuthSessionUser = {
        userId: preset.userId,
        email: preset.email,
        displayLabel: preset.displayLabel,
      };
      const db = readDb();
      if (!db.profiles[preset.userId]) {
        db.profiles[preset.userId] = {
          userId: preset.userId,
          nickname:
            presetId === 'partner-a'
              ? 'An'
              : presetId === 'partner-b'
                ? 'Bình'
                : 'Khách lạ',
          avatarConfig: preset.defaultAvatar,
          updatedAt: new Date().toISOString(),
        };
        writeDb(db);
      }
      setStoredUser(user);
      return { ok: true, data: user };
    },

    async signOut() {
      setStoredUser(null);
    },

    async getWorldSnapshot() {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const db = readDb();
      const worldId = findUserWorldId(db, user.userId);
      if (!worldId) {
        return { ok: true, data: null };
      }
      return { ok: true, data: buildSnapshot(db, worldId) };
    },

    async createWorld(worldName, nickname, avatarConfig) {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const cleanName = worldName.trim();
      const cleanNick = nickname.trim();
      if (!cleanName || cleanName.length > 48 || !cleanNick || cleanNick.length > 32) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Tên nhà hoặc biệt danh không hợp lệ.' };
      }

      const db = readDb();
      if (findUserWorldId(db, user.userId)) {
        return {
          ok: false,
          code: 'ALREADY_IN_WORLD',
          message: 'Tài khoản này đã thuộc về một ngôi nhà rồi.',
        };
      }

      const nowIso = new Date().toISOString();
      const worldId = generateId('world');
      db.profiles[user.userId] = {
        userId: user.userId,
        nickname: cleanNick,
        avatarConfig: parseAvatarConfig(avatarConfig),
        updatedAt: nowIso,
      };
      db.worlds[worldId] = {
        id: worldId,
        name: cleanName,
        layoutVersion: 1,
        createdAt: nowIso,
      };
      db.memberships[worldId] = [{ userId: user.userId, role: 'owner', joinedAt: nowIso }];
      db.placements[worldId] = buildDefaultStarterPlacements(worldId, user.userId, nowIso);
      initializePreviewInventory(db, worldId, nowIso, true);
      writeDb(db);

      const snapshot = buildSnapshot(db, worldId)!;
      return { ok: true, data: snapshot };
    },

    async createInvite(worldId) {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const db = readDb();
      const members = db.memberships[worldId] ?? [];
      if (!members.some((m) => m.userId === user.userId)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
      }
      if (members.length >= 2) {
        return { ok: false, code: 'WORLD_FULL', message: 'Ngôi nhà đã đủ 2 thành viên.' };
      }

      // Remove unredeemed old invites for this world
      db.invites = db.invites.filter((i) => !(i.worldId === worldId && i.redeemedAt === null));

      const inviteCode = generateInviteCode();
      const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      db.invites.push({
        id: generateId('inv'),
        worldId,
        tokenHash: simpleHashToken(inviteCode),
        expiresAt,
        redeemedBy: null,
        redeemedAt: null,
      });
      writeDb(db);

      return { ok: true, data: { inviteCode, expiresAt } };
    },

    async getInviteStatus(worldId) {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const db = readDb();
      const members = db.memberships[worldId] ?? [];
      if (!members.some((m) => m.userId === user.userId)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền xem lời mời.' };
      }
      const now = Date.now();
      const active = db.invites.find(
        (i) => i.worldId === worldId && i.redeemedAt === null && Date.parse(i.expiresAt) > now,
      );
      return {
        ok: true,
        data: {
          hasActiveInvite: Boolean(active),
          expiresAt: active?.expiresAt ?? null,
        },
      };
    },

    async redeemInvite(inviteCode, nickname, avatarConfig) {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const cleanCode = inviteCode.trim().toUpperCase();
      const cleanNick = nickname.trim();
      if (!cleanCode || cleanCode.length < 6 || !cleanNick || cleanNick.length > 32) {
        return { ok: false, code: 'INVITE_INVALID', message: 'Mã mời hoặc biệt danh không hợp lệ.' };
      }

      const db = readDb();
      if (findUserWorldId(db, user.userId)) {
        return {
          ok: false,
          code: 'ALREADY_IN_WORLD',
          message: 'Tài khoản này đã thuộc về một ngôi nhà rồi.',
        };
      }

      const tokenHash = simpleHashToken(cleanCode);
      const invite = db.invites.find((i) => i.tokenHash === tokenHash);
      if (!invite) {
        return { ok: false, code: 'INVITE_INVALID', message: 'Mã mời không tồn tại hoặc sai.' };
      }
      if (invite.redeemedAt !== null) {
        return { ok: false, code: 'INVITE_USED', message: 'Mã mời này đã được sử dụng.' };
      }
      if (Date.parse(invite.expiresAt) <= Date.now()) {
        return { ok: false, code: 'INVITE_EXPIRED', message: 'Mã mời đã hết hạn.' };
      }

      const members = db.memberships[invite.worldId] ?? [];
      if (members.length >= 2) {
        return {
          ok: false,
          code: 'WORLD_FULL',
          message: 'Ngôi nhà này đã đủ 2 người — từ chối thành viên thứ 3.',
        };
      }

      const nowIso = new Date().toISOString();
      db.profiles[user.userId] = {
        userId: user.userId,
        nickname: cleanNick,
        avatarConfig: parseAvatarConfig(avatarConfig, DEFAULT_AVATAR_PARTNER_B),
        updatedAt: nowIso,
      };
      members.push({ userId: user.userId, role: 'partner', joinedAt: nowIso });
      db.memberships[invite.worldId] = members;
      invite.redeemedBy = user.userId;
      invite.redeemedAt = nowIso;
      writeDb(db);

      notifyWorldMutatedBroadcast(invite.worldId, 'member');
      return { ok: true, data: buildSnapshot(db, invite.worldId)! };
    },

    async updateProfile(nickname, avatarConfig) {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const cleanNick = nickname.trim();
      if (!cleanNick || cleanNick.length > 32) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Biệt danh cần từ 1–32 ký tự.' };
      }
      const db = readDb();
      const profile: UserProfile = {
        userId: user.userId,
        nickname: cleanNick,
        avatarConfig: parseAvatarConfig(avatarConfig),
        updatedAt: new Date().toISOString(),
      };
      db.profiles[user.userId] = profile;
      writeDb(db);

      const worldId = findUserWorldId(db, user.userId);
      if (worldId) {
        notifyWorldMutatedBroadcast(worldId, 'profile');
      }
      return { ok: true, data: profile };
    },

    async placeFurniture(params) {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const db = readDb();
      const members = db.memberships[params.worldId] ?? [];
      if (!members.some((m) => m.userId === user.userId)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
      }

      const world = db.worlds[params.worldId];
      if (!world) {
        return { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy ngôi nhà.' };
      }

      const idemKey = `${params.worldId}:${params.idempotencyKey}`;
      const existingIdem = db.idempotency[idemKey];
      if (existingIdem) {
        return {
          ok: true,
          data: existingIdem.result as { layoutVersion: number; placement: FurniturePlacement },
        };
      }

      if (world.layoutVersion !== params.expectedLayoutVersion) {
        return {
          ok: false,
          code: 'VERSION_CONFLICT',
          message: 'Bố cục nhà vừa được người kia cập nhật. Đang đồng bộ lại...',
        };
      }

      const placements = db.placements[params.worldId] ?? [];
      const catalogItem = getCatalogItem(params.sku)!;
      const footprint = params.rotated
        ? { widthTiles: catalogItem.heightTiles, heightTiles: catalogItem.widthTiles }
        : { widthTiles: catalogItem.widthTiles, heightTiles: catalogItem.heightTiles };

      const validation = validatePlacement({
        mapId: params.mapId,
        sku: params.sku,
        tileX: params.tileX,
        tileY: params.tileY,
        placements,
        footprintWidth: footprint.widthTiles,
        footprintHeight: footprint.heightTiles,
        devSandboxUnlimitedStock: Boolean(import.meta.env.DEV && params.devSandbox),
      });
      if (!validation.ok) {
        return { ok: false, code: validation.code, message: validation.message };
      }

      const newPlacement: FurniturePlacement = {
        id: generateId('furn'),
        worldId: params.worldId,
        mapId: params.mapId,
        sku: params.sku,
        layerSlot: catalogItem.layerSlot,
        tileX: params.tileX,
        tileY: params.tileY,
        widthTiles: footprint.widthTiles,
        heightTiles: footprint.heightTiles,
        updatedBy: user.userId,
        updatedAt: new Date().toISOString(),
      };

      db.placements[params.worldId] = [...placements, newPlacement];
      world.layoutVersion += 1;
      const result = { layoutVersion: world.layoutVersion, placement: newPlacement };
      db.idempotency[idemKey] = { worldId: params.worldId, key: params.idempotencyKey, result };
      writeDb(db);

      notifyWorldMutatedBroadcast(params.worldId, 'furniture');
      return { ok: true, data: result };
    },

    async moveFurniture(params) {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const db = readDb();
      const members = db.memberships[params.worldId] ?? [];
      if (!members.some((m) => m.userId === user.userId)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
      }

      const world = db.worlds[params.worldId];
      if (!world) {
        return { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy ngôi nhà.' };
      }

      const idemKey = `${params.worldId}:${params.idempotencyKey}`;
      const existingIdem = db.idempotency[idemKey];
      if (existingIdem) {
        return {
          ok: true,
          data: existingIdem.result as { layoutVersion: number; placement: FurniturePlacement },
        };
      }

      if (world.layoutVersion !== params.expectedLayoutVersion) {
        return {
          ok: false,
          code: 'VERSION_CONFLICT',
          message: 'Bố cục nhà vừa được người kia cập nhật. Đang đồng bộ lại...',
        };
      }

      const placements = db.placements[params.worldId] ?? [];
      const target = placements.find((p) => p.id === params.placementId);
      if (!target) {
        return { ok: false, code: 'NOT_FOUND', message: 'Món đồ này không còn ở trên sàn.' };
      }

      const validation = validatePlacement({
        mapId: target.mapId,
        sku: target.sku,
        tileX: params.tileX,
        tileY: params.tileY,
        placements,
        ignorePlacementId: target.id,
        footprintWidth: target.widthTiles,
        footprintHeight: target.heightTiles,
      });
      if (!validation.ok) {
        return { ok: false, code: validation.code, message: validation.message };
      }

      const updated: FurniturePlacement = {
        ...target,
        tileX: params.tileX,
        tileY: params.tileY,
        updatedBy: user.userId,
        updatedAt: new Date().toISOString(),
      };
      db.placements[params.worldId] = placements.map((p) => (p.id === target.id ? updated : p));
      world.layoutVersion += 1;
      const result = { layoutVersion: world.layoutVersion, placement: updated };
      db.idempotency[idemKey] = { worldId: params.worldId, key: params.idempotencyKey, result };
      writeDb(db);

      notifyWorldMutatedBroadcast(params.worldId, 'furniture');
      return { ok: true, data: result };
    },

    async rotateFurniture(params) {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const db = readDb();
      const members = db.memberships[params.worldId] ?? [];
      if (!members.some((m) => m.userId === user.userId)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
      }

      const world = db.worlds[params.worldId];
      if (!world) {
        return { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy ngôi nhà.' };
      }

      const idemKey = `${params.worldId}:${params.idempotencyKey}`;
      const existingIdem = db.idempotency[idemKey];
      if (existingIdem) {
        return {
          ok: true,
          data: existingIdem.result as { layoutVersion: number; placement: FurniturePlacement },
        };
      }

      if (world.layoutVersion !== params.expectedLayoutVersion) {
        return {
          ok: false,
          code: 'VERSION_CONFLICT',
          message: 'Bố cục nhà vừa được người kia cập nhật. Đang đồng bộ lại...',
        };
      }

      const placements = db.placements[params.worldId] ?? [];
      const target = placements.find((p) => p.id === params.placementId);
      if (!target) {
        return { ok: false, code: 'NOT_FOUND', message: 'Món đồ này không còn ở trên sàn.' };
      }

      if (target.widthTiles === target.heightTiles) {
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Món vuông này không cần xoay.' };
      }

      const validation = validatePlacement({
        mapId: target.mapId,
        sku: target.sku,
        tileX: target.tileX,
        tileY: target.tileY,
        placements,
        ignorePlacementId: target.id,
        footprintWidth: target.heightTiles,
        footprintHeight: target.widthTiles,
      });
      if (!validation.ok) {
        return { ok: false, code: validation.code, message: validation.message };
      }

      const updated: FurniturePlacement = {
        ...target,
        widthTiles: target.heightTiles,
        heightTiles: target.widthTiles,
        updatedBy: user.userId,
        updatedAt: new Date().toISOString(),
      };
      db.placements[params.worldId] = placements.map((p) => (p.id === target.id ? updated : p));
      world.layoutVersion += 1;
      const result = { layoutVersion: world.layoutVersion, placement: updated };
      db.idempotency[idemKey] = { worldId: params.worldId, key: params.idempotencyKey, result };
      writeDb(db);

      notifyWorldMutatedBroadcast(params.worldId, 'furniture');
      return { ok: true, data: result };
    },

    async removeFurniture(params) {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
      }
      const db = readDb();
      const members = db.memberships[params.worldId] ?? [];
      if (!members.some((m) => m.userId === user.userId)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
      }

      const world = db.worlds[params.worldId];
      if (!world) {
        return { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy ngôi nhà.' };
      }

      const idemKey = `${params.worldId}:${params.idempotencyKey}`;
      const existingIdem = db.idempotency[idemKey];
      if (existingIdem) {
        return {
          ok: true,
          data: existingIdem.result as { layoutVersion: number; removedId: string },
        };
      }

      if (world.layoutVersion !== params.expectedLayoutVersion) {
        return {
          ok: false,
          code: 'VERSION_CONFLICT',
          message: 'Bố cục nhà vừa được người kia cập nhật. Đang đồng bộ lại...',
        };
      }

      const placements = db.placements[params.worldId] ?? [];
      if (!placements.some((p) => p.id === params.placementId)) {
        return { ok: false, code: 'NOT_FOUND', message: 'Món đồ không còn tồn tại.' };
      }

      db.placements[params.worldId] = placements.filter((p) => p.id !== params.placementId);
      world.layoutVersion += 1;
      const result = { layoutVersion: world.layoutVersion, removedId: params.placementId };
      db.idempotency[idemKey] = { worldId: params.worldId, key: params.idempotencyKey, result };
      writeDb(db);

      notifyWorldMutatedBroadcast(params.worldId, 'furniture');
      return { ok: true, data: result };
    },

    async connectWorldRealtime(worldId, initialPresence, handlers): Promise<RealtimeHandle> {
      let simulatedOffline = false;
      let currentPresence = initialPresence;
      const peerPresences = new Map<string, PresencePayload>();

      const emitPresenceSnapshot = () => {
        const list = [currentPresence, ...Array.from(peerPresences.values())];
        handlers.onPresenceChange(list);
      };

      const channel = openBusChannel(REALTIME_CHANNEL_NAME, (raw) => {
        if (simulatedOffline) return;
        const msg = raw as LocalWireMessage;
        if (!msg || msg.worldId !== worldId) return;

        if (msg.kind === 'presence') {
          if (msg.presence.sessionId === currentPresence.sessionId) return;
          const isNewPeer = !peerPresences.has(msg.presence.sessionId);
          peerPresences.set(msg.presence.sessionId, msg.presence);
          emitPresenceSnapshot();
          if (isNewPeer) {
            // Reply with our current presence so newly joined peer discovers us immediately
            channel.post({
              kind: 'presence',
              worldId,
              presence: { ...currentPresence, updatedAtMs: Date.now() },
            } satisfies LocalWireMessage);
          }
        } else if (msg.kind === 'presence_leave') {
          if (peerPresences.delete(msg.sessionId)) {
            emitPresenceSnapshot();
          }
        } else if (msg.kind === 'movement') {
          if (msg.packet.sessionId !== currentPresence.sessionId) {
            handlers.onMovement(msg.packet);
          }
        } else if (msg.kind === 'world_mutated') {
          handlers.onWorldMutated(msg.reason);
        } else if (msg.kind === 'minigame_event') {
          if (msg.sessionId !== currentPresence.sessionId) {
            handlers.onMinigameEvent?.(msg.packet);
          }
        }
      });

      handlers.onConnectionChange('connected');
      emitPresenceSnapshot();
      channel.post({
        kind: 'presence',
        worldId,
        presence: currentPresence,
      } satisfies LocalWireMessage);

      // Periodic presence heartbeat for tab discovery & stale cleanup
      const heartbeatTimer = window.setInterval(() => {
        if (simulatedOffline) return;
        const now = Date.now();
        let removedAny = false;
        for (const [sid, p] of peerPresences.entries()) {
          if (now - p.updatedAtMs > 12000) {
            peerPresences.delete(sid);
            removedAny = true;
          }
        }
        if (removedAny) emitPresenceSnapshot();
        channel.post({
          kind: 'presence',
          worldId,
          presence: { ...currentPresence, updatedAtMs: now },
        } satisfies LocalWireMessage);
      }, 3000);

      const handleBeforeUnload = () => {
        channel.post({
          kind: 'presence_leave',
          worldId,
          sessionId: currentPresence.sessionId,
        } satisfies LocalWireMessage);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return {
        publishMovement(packet) {
          if (simulatedOffline) return;
          channel.post({ kind: 'movement', worldId, packet } satisfies LocalWireMessage);
        },
        updatePresence(presence) {
          currentPresence = presence;
          if (simulatedOffline) return;
          emitPresenceSnapshot();
          channel.post({ kind: 'presence', worldId, presence } satisfies LocalWireMessage);
        },
        notifyWorldMutated(reason) {
          if (simulatedOffline) return;
          channel.post({ kind: 'world_mutated', worldId, reason } satisfies LocalWireMessage);
        },
        publishMinigameEvent(packet) {
          if (simulatedOffline) return;
          channel.post({
            kind: 'minigame_event',
            worldId,
            sessionId: currentPresence.sessionId,
            packet,
          } satisfies LocalWireMessage);
        },
        async reconnect() {
          if (simulatedOffline) {
            handlers.onConnectionChange('offline');
            return;
          }
          handlers.onConnectionChange('reconnecting');
          peerPresences.clear();
          emitPresenceSnapshot();
          handlers.onConnectionChange('connected');
          channel.post({
            kind: 'presence',
            worldId,
            presence: { ...currentPresence, updatedAtMs: Date.now() },
          } satisfies LocalWireMessage);
        },
        setSimulatedOffline(offline: boolean) {
          simulatedOffline = offline;
          if (offline) {
            channel.post({
              kind: 'presence_leave',
              worldId,
              sessionId: currentPresence.sessionId,
            } satisfies LocalWireMessage);
            peerPresences.clear();
            handlers.onConnectionChange('offline');
          } else {
            handlers.onConnectionChange('reconnecting');
            handlers.onConnectionChange('connected');
            channel.post({
              kind: 'presence',
              worldId,
              presence: { ...currentPresence, updatedAtMs: Date.now() },
            } satisfies LocalWireMessage);
          }
        },
        async disconnect() {
          window.clearInterval(heartbeatTimer);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          channel.post({
            kind: 'presence_leave',
            worldId,
            sessionId: currentPresence.sessionId,
          } satisfies LocalWireMessage);
          channel.close();
          handlers.onConnectionChange('disconnected');
        },
      };
    },

    createSpikeCinemaBus(worldId: string): SpikeCinemaBus {
      const channelName = `${SPIKE_CINEMA_CHANNEL_PREFIX}${worldId}`;
      return {
        subscribe(onMessage) {
          const ch = openBusChannel(channelName, (raw) => {
            onMessage(raw as SpikeCinemaPacket);
          });
          return () => ch.close();
        },
        send(pkt) {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel(channelName);
            bc.postMessage(pkt);
            bc.close();
            return;
          }
          const listeners = inProcessListeners.get(channelName);
          if (listeners) {
            for (const fn of listeners) fn(pkt);
          }
        },
      };
    },

    farm: {
      async getFarmSnapshot(worldId) {
        const user = getStoredUser();
        if (!user) return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
        const db = readDb();
        if (!(db.memberships[worldId] ?? []).some((m) => m.userId === user.userId)) {
          return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
        }
        db.farms ??= {};
        db.wallets ??= {};
        db.inventories ??= {};
        const nowMs = Date.now();
        if (!db.farms[worldId]) {
          const seed = Math.floor(Math.random() * 0xffff_ffff);
          db.farms[worldId] = { seed, version: 1, farm: emptyFarm(seed) };
          writeDb(db);
        }
        const row = db.farms[worldId]!;
        const coins = db.wallets[worldId]?.coins ?? 0;
        return { ok: true, data: buildFarmSnapshot(worldId, row.version, row.farm, coins, nowMs) };
      },
      async applyFarm(params) {
        const user = getStoredUser();
        if (!user) return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
        const db = readDb();
        if (!(db.memberships[params.worldId] ?? []).some((m) => m.userId === user.userId)) {
          return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
        }
        db.farms ??= {};
        db.wallets ??= {};
        db.inventories ??= {};
        const nowMs = Date.now();
        const seed = Math.floor(Math.random() * 0xffff_ffff);
        const row = (db.farms[params.worldId] ??= { seed, version: 1, farm: emptyFarm(seed) });
        if (params.farmVersion !== undefined && params.farmVersion !== row.version) {
          return { ok: false, code: 'VERSION_CONFLICT', message: 'Nông trại vừa đổi (đồng bộ lại).' };
        }
        const items = db.inventories[params.worldId] ?? [];
        const coins = db.wallets[params.worldId]?.coins ?? FARM_STARTER_COINS;
        const applied = applyFarmAction({
          worldId: params.worldId,
          farm: row.farm,
          farmVersion: row.version,
          walletCoins: coins,
          inventoryItems: items,
          nowMs,
          params,
        });
        if (!applied.ok) return { ok: false, code: applied.code as never, message: applied.messageVi };
        row.farm = applied.farm;
        row.version += 1;
        db.inventories[params.worldId] = applied.inventory;
        db.wallets[params.worldId] = { coins: applied.walletCoins };
        writeDb(db);
        notifyWorldMutatedBroadcast(params.worldId, 'farm');
        return {
          ok: true,
          data: {
            snapshot: buildFarmSnapshot(params.worldId, row.version, row.farm, applied.walletCoins, nowMs),
            harvested: applied.harvested,
          },
        };
      },
      async sellCrop(params) {
        const user = getStoredUser();
        if (!user) return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
        const db = readDb();
        if (!(db.memberships[params.worldId] ?? []).some((m) => m.userId === user.userId)) {
          return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
        }
        const items = db.inventories?.[params.worldId] ?? [];
        const coins = db.wallets?.[params.worldId]?.coins ?? 0;
        const sold = sellCropLine(coins, items, params.sku, params.qty, params.quality ?? 'normal');
        if (!sold.ok) return { ok: false, code: sold.code as never, message: sold.messageVi };
        db.inventories ??= {};
        db.wallets ??= {};
        db.inventories[params.worldId] = sold.items;
        db.wallets[params.worldId] = { coins: sold.walletCoins };
        writeDb(db);
        notifyWorldMutatedBroadcast(params.worldId, 'farm');
        return { ok: true, data: { walletCoins: sold.walletCoins } };
      },
      async buySeed(params) {
        const user = getStoredUser();
        if (!user) return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
        const db = readDb();
        if (!(db.memberships[params.worldId] ?? []).some((m) => m.userId === user.userId)) {
          return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
        }
        const nowMs = Date.now();
        const items = db.inventories?.[params.worldId] ?? [];
        const coins = db.wallets?.[params.worldId]?.coins ?? FARM_STARTER_COINS;
        const bought = buySeed(params.worldId, coins, items, params.seedSku, params.qty, nowMs);
        if (!bought.ok) return { ok: false, code: bought.code as never, message: bought.messageVi };
        db.inventories ??= {};
        db.wallets ??= {};
        db.inventories[params.worldId] = bought.items;
        db.wallets[params.worldId] = { coins: bought.walletCoins };
        writeDb(db);
        notifyWorldMutatedBroadcast(params.worldId, 'inventory');
        return { ok: true, data: { walletCoins: bought.walletCoins } };
      },
      async shipToBin(params) {
        const user = getStoredUser();
        if (!user) return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
        const db = readDb();
        if (!(db.memberships[params.worldId] ?? []).some((m) => m.userId === user.userId)) {
          return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
        }
        const nowMs = Date.now();
        db.shippingBin ??= {};
        const meta = db.shippingBin[params.worldId] ?? {
          soldByGroup: {},
          dayIndex: Math.floor((nowMs + 25_200_000) / 86_400_000),
        };
        const items = db.inventories?.[params.worldId] ?? [];
        const coins = db.wallets?.[params.worldId]?.coins ?? 0;
        const shipped = applyFarmShippingBinSale(coins, items, meta, {
          lines: params.lines.map((l) => ({ sku: l.sku, qty: l.qty, quality: l.quality ?? 'normal' })),
          nowMs,
          idempotencyKey: params.idempotencyKey,
          actorId: user.userId,
        });
        if (!shipped.ok) return { ok: false, code: shipped.code as never, message: shipped.messageVi };
        db.inventories ??= {};
        db.wallets ??= {};
        db.inventories[params.worldId] = shipped.items;
        db.wallets[params.worldId] = { coins: shipped.walletCoins };
        db.shippingBin[params.worldId] = shipped.meta;
        writeDb(db);
        notifyWorldMutatedBroadcast(params.worldId, 'farm');
        return { ok: true, data: { walletCoins: shipped.walletCoins, totalCoins: shipped.totalCoins } };
      },
      async getDeepFarmSnapshot(worldId) {
        const user = getStoredUser();
        if (!user) return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
        const db = readDb();
        if (!(db.memberships[worldId] ?? []).some((m) => m.userId === user.userId)) {
          return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
        }
        const nowMs = Date.now();
        db.deepFarms ??= {};
        db.wallets ??= {};
        const seed = db.farms?.[worldId]?.seed ?? 42;
        let row = db.deepFarms[worldId];
        if (!row) {
          row = createEmptyDeepFarmState(seed, nowMs);
          db.deepFarms[worldId] = row;
          writeDb(db);
        } else {
          const board = ensureFreshOrderBoard(row, nowMs);
          if (board !== row.orderBoard) {
            row = { ...row, orderBoard: board };
            db.deepFarms[worldId] = row;
            writeDb(db);
          }
        }
        const coins = db.wallets[worldId]?.coins ?? FARM_STARTER_COINS;
        return { ok: true, data: projectDeepFarmSnapshot(worldId, row, coins, nowMs) };
      },
      async applyDeepFarmAction(params) {
        const user = getStoredUser();
        if (!user) return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
        const db = readDb();
        if (!(db.memberships[params.worldId] ?? []).some((m) => m.userId === user.userId)) {
          return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
        }
        const nowMs = Date.now();
        db.deepFarms ??= {};
        db.wallets ??= {};
        db.inventories ??= {};
        const seed = db.farms?.[params.worldId]?.seed ?? 42;
        const row = (db.deepFarms[params.worldId] ??= createEmptyDeepFarmState(seed, nowMs));
        const items = db.inventories[params.worldId] ?? [];
        const coins = db.wallets[params.worldId]?.coins ?? FARM_STARTER_COINS;
        const applied = applyDeepFarmMutation({
          worldId: params.worldId,
          actorId: user.userId,
          state: row,
          inventoryItems: items,
          walletCoins: coins,
          nowMs,
          params,
        });
        if (!applied.ok) return { ok: false, code: applied.code as never, message: applied.messageVi };
        db.deepFarms[params.worldId] = applied.state;
        db.inventories[params.worldId] = applied.inventory;
        db.wallets[params.worldId] = { coins: applied.walletCoins };
        writeDb(db);
        notifyWorldMutatedBroadcast(params.worldId, 'farm');
        return {
          ok: true,
          data: {
            snapshot: projectDeepFarmSnapshot(params.worldId, applied.state, applied.walletCoins, nowMs),
            messageVi: applied.messageVi,
            ...(applied.idempotentReplay ? { idempotentReplay: true } : {}),
            ...(applied.harvestedItems ? { harvestedItems: applied.harvestedItems } : {}),
            ...(applied.rewardCoins !== undefined ? { rewardCoins: applied.rewardCoins } : {}),
          },
        };
      },
    },

    billiards: {
      async getStats(worldId) {
        const user = getStoredUser();
        if (!user) {
          return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
        }
        const db = readDb();
        const members = db.memberships[worldId] ?? [];
        if (!members.some((m) => m.userId === user.userId)) {
          return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
        }
        const list = db.billiardsMatches?.[worldId] ?? [];
        const counts = new Map<string, number>();
        for (const m of list) {
          counts.set(m.winnerUserId, (counts.get(m.winnerUserId) ?? 0) + 1);
        }
        const tallies: BilliardsWinTally[] = Array.from(counts.entries()).map(([userId, wins]) => ({
          userId,
          wins,
        }));
        return { ok: true, data: { tallies, totalMatches: list.length } };
      },
      async recordMatch(params: BilliardsMatchRecordInput) {
        const user = getStoredUser();
        if (!user) {
          return { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' };
        }
        const db = readDb();
        const members = db.memberships[params.worldId] ?? [];
        if (!members.some((m) => m.userId === user.userId)) {
          return { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' };
        }
        db.billiardsMatches ??= {};
        const list = (db.billiardsMatches[params.worldId] ??= []);
        const exists = list.some((m) => m.matchId === params.matchId);
        let inserted = false;
        if (!exists) {
          list.push({
            matchId: params.matchId,
            worldId: params.worldId,
            rule: params.rule,
            rackSeed: params.rackSeed,
            winnerUserId: params.winnerUserId,
            loserUserId: params.loserUserId,
            reason: params.reason,
            durationSeconds: params.durationSeconds,
            createdAt: new Date().toISOString(),
          });
          inserted = true;
          writeDb(db);
        }
        const counts = new Map<string, number>();
        for (const m of list) {
          counts.set(m.winnerUserId, (counts.get(m.winnerUserId) ?? 0) + 1);
        }
        const tallies: BilliardsWinTally[] = Array.from(counts.entries()).map(([userId, wins]) => ({
          userId,
          wins,
        }));
        return { ok: true, data: { tallies, inserted } };
      },
    },
  };
}
