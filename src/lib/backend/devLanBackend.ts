import {
  DEFAULT_AVATAR_PARTNER_A,
  DEFAULT_AVATAR_PARTNER_B,
  parseAvatarConfig,
} from '../../shared/avatar';
import type { CoupleEventPacket } from '../../shared/couple/coupleTypes';
import type { DevSanitizedWorldSnapshot } from '../../shared/devConsole/devConsoleTypes';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import type { MailboxSnapshot } from '../../shared/mailbox/mailboxTypes';
import type { PetInteractionResult, PetSnapshot } from '../../shared/pet/petTypes';
import type { StudySnapshot } from '../../shared/study/studyTypes';
import type {
  AvatarConfig,
  CreatedInvite,
  DevIdentityInfo,
  FurniturePlacement,
  MovementPacket,
  MutationErrorCode,
  MutationResult,
  PresencePayload,
  UserProfile,
  WorldInviteStatus,
  WorldMutationReason,
  WorldSnapshot,
} from '../../shared/types';
import type {
  AuthSessionUser,
  LocalPresetAccountId,
  RealtimeHandle,
  RealtimeHandlers,
  SpikeCinemaBus,
  SpikeCinemaPacket,
  WorldBackend,
} from './types';

const SESSION_KEY = 'olw:dev-lan:session-user:v1';

const PRESET_META: Record<
  LocalPresetAccountId,
  AuthSessionUser & { defaultAvatar: AvatarConfig }
> = {
  'partner-a': {
    userId: '11111111-1111-4111-8111-111111111111',
    email: 'partner-a.dev@ourlittleworld.test',
    displayLabel: 'Mây (Chủ nhà)',
    defaultAvatar: DEFAULT_AVATAR_PARTNER_A,
  },
  'partner-b': {
    userId: '22222222-2222-4222-8222-222222222222',
    email: 'partner-b.dev@ourlittleworld.test',
    displayLabel: 'Nắng (Người thương)',
    defaultAvatar: DEFAULT_AVATAR_PARTNER_B,
  },
  outsider: {
    userId: '33333333-3333-4333-8333-333333333333',
    email: 'khachla.dev@ourlittleworld.test',
    displayLabel: 'Khách lạ (Test từ chối)',
    defaultAvatar: DEFAULT_AVATAR_PARTNER_A,
  },
};

function normalizeSnapshot(raw: WorldSnapshot | null): WorldSnapshot | null {
  if (!raw) return null;
  return {
    world: raw.world,
    members: (raw.members ?? []).map((m) => ({
      ...m,
      avatarConfig: parseAvatarConfig(m.avatarConfig),
    })),
    placements: raw.placements ?? [],
  };
}

export function createDevLanBackend(): WorldBackend {
  const authListeners = new Set<(user: AuthSessionUser | null) => void>();

  function getStoredUser(): AuthSessionUser | null {
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthSessionUser;
    } catch {
      return null;
    }
  }

  function setStoredUser(user: AuthSessionUser | null): void {
    try {
      if (!user) window.sessionStorage.removeItem(SESSION_KEY);
      else window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage errors
    }
    for (const listener of authListeners) {
      listener(user);
    }
  }

  async function apiJson<T>(
    path: string,
    init?: RequestInit & { userId?: string },
  ): Promise<MutationResult<T>> {
    const uid = init?.userId ?? getStoredUser()?.userId ?? '';
    try {
      const res = await fetch(`/api/dev-lan${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(uid ? { 'x-dev-user-id': uid } : {}),
          ...(init?.headers ?? {}),
        },
      });
      const json = (await res.json()) as
        | { ok: true; data: T }
        | { ok: false; code?: MutationErrorCode; message?: string };
      if (!res.ok || !json.ok) {
        return {
          ok: false,
          code: (!json.ok && json.code) || 'NETWORK_ERROR',
          message: (!json.ok && json.message) || 'Không kết nối được tới máy chủ dev LAN.',
        };
      }
      return { ok: true, data: json.data };
    } catch {
      return {
        ok: false,
        code: 'NETWORK_ERROR',
        message: 'Không kết nối được tới máy chủ phát triển trên laptop.',
      };
    }
  }

  return {
    mode: 'dev-lan',

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
        return { ok: false, code: 'VALIDATION_ERROR', message: 'Email chưa đúng định dạng.' };
      }
      if (clean.includes('may') || clean.includes('khôi')) {
        return this.signInLocalPreset!('partner-a');
      }
      if (clean.includes('haanh') || clean.includes('ha_anh')) {
        return this.signInLocalPreset!('partner-b');
      }
      return this.signInLocalPreset!('outsider');
    },

    async signUpWithPassword(email) {
      const res = await this.signInWithPassword(email, 'dev-lan');
      if (!res.ok) return res;
      return { ok: true, data: { user: res.data, needsEmailVerification: false } };
    },

    async signInLocalPreset(presetId) {
      const meta = PRESET_META[presetId];
      const user: AuthSessionUser = {
        userId: meta.userId,
        email: meta.email,
        displayLabel: meta.displayLabel,
      };
      setStoredUser(user);
      return { ok: true, data: user };
    },

    async listDevIdentities() {
      const res = await apiJson<{
        identities: DevIdentityInfo[];
        worldExists: boolean;
        worldName: string | null;
        memberCount: number;
      }>('/identities');
      if (!res.ok) {
        return { identities: [], worldExists: false, worldName: null, memberCount: 0 };
      }
      return res.data;
    },

    async seedDevCoupleWorld() {
      const res = await apiJson<WorldSnapshot>('/seed-couple', { method: 'POST', body: '{}' });
      if (!res.ok) return res;
      return { ok: true, data: normalizeSnapshot(res.data)! };
    },

    async resetDevWorld() {
      return apiJson<{ reset: true }>('/reset', { method: 'POST', body: '{}' });
    },

    async signOut() {
      setStoredUser(null);
    },

    async getWorldSnapshot() {
      const user = getStoredUser();
      if (!user) {
        return { ok: false, code: 'UNAUTHENTICATED', message: 'Vui lòng chọn tài khoản trước.' };
      }
      const res = await apiJson<WorldSnapshot | null>('/world/snapshot');
      if (!res.ok) return res;
      return { ok: true, data: normalizeSnapshot(res.data) };
    },

    async createWorld(worldName, nickname, avatarConfig) {
      const res = await apiJson<WorldSnapshot>('/world/create', {
        method: 'POST',
        body: JSON.stringify({ worldName, nickname, avatarConfig }),
      });
      if (!res.ok) return res;
      return { ok: true, data: normalizeSnapshot(res.data)! };
    },

    async createInvite(worldId) {
      return apiJson<CreatedInvite>('/world/invite', {
        method: 'POST',
        body: JSON.stringify({ worldId }),
      });
    },

    async getInviteStatus(worldId) {
      return apiJson<WorldInviteStatus>(
        `/world/invite-status?worldId=${encodeURIComponent(worldId)}`,
      );
    },

    async redeemInvite(inviteCode, nickname, avatarConfig) {
      const res = await apiJson<WorldSnapshot>('/world/redeem', {
        method: 'POST',
        body: JSON.stringify({ inviteCode, nickname, avatarConfig }),
      });
      if (!res.ok) return res;
      return { ok: true, data: normalizeSnapshot(res.data)! };
    },

    async updateProfile(nickname, avatarConfig) {
      return apiJson<UserProfile>('/profile', {
        method: 'POST',
        body: JSON.stringify({ nickname, avatarConfig }),
      });
    },

    async placeFurniture(params) {
      return apiJson<{ layoutVersion: number; placement: FurniturePlacement }>('/furniture/place', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async moveFurniture(params) {
      return apiJson<{ layoutVersion: number; placement: FurniturePlacement }>('/furniture/move', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async removeFurniture(params) {
      return apiJson<{ layoutVersion: number; removedId: string }>('/furniture/remove', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async connectWorldRealtime(
      worldId,
      initialPresence,
      handlers: RealtimeHandlers,
    ): Promise<RealtimeHandle> {
      let simulatedOffline = false;
      let currentPresence = initialPresence;
      let source: EventSource | null = null;
      let closedManually = false;

      const postRealtime = (kind: string, payload: unknown) => {
        if (simulatedOffline) return;
        void fetch('/api/dev-lan/realtime', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-user-id': currentPresence.userId,
          },
          body: JSON.stringify({
            worldId,
            kind,
            sessionId: currentPresence.sessionId,
            payload,
          }),
        }).catch(() => {
          // Ignore transient network errors; SSE error handler triggers reconnect
        });
      };

      const openStream = () => {
        if (source) {
          source.close();
          source = null;
        }
        if (simulatedOffline || closedManually) return;
        handlers.onConnectionChange('connecting');

        const qs = new URLSearchParams({
          worldId,
          userId: currentPresence.userId,
          sessionId: currentPresence.sessionId,
          mapId: currentPresence.mapId,
          tileX: String(currentPresence.tileX),
          tileY: String(currentPresence.tileY),
          facing: currentPresence.facing,
        });

        const es = new EventSource(`/api/dev-lan/events?${qs.toString()}`);
        source = es;

        es.onopen = () => {
          handlers.onConnectionChange('connected');
        };

        es.addEventListener('presence_sync', (ev) => {
          const list = JSON.parse((ev as MessageEvent).data) as PresencePayload[];
          handlers.onPresenceChange(list);
        });

        es.addEventListener('movement', (ev) => {
          const pkt = JSON.parse((ev as MessageEvent).data) as MovementPacket;
          handlers.onMovement(pkt);
        });

        es.addEventListener('world_mutated', (ev) => {
          const parsed = JSON.parse((ev as MessageEvent).data) as {
            reason?: WorldMutationReason;
          };
          handlers.onWorldMutated(parsed.reason ?? 'furniture');
        });

        es.addEventListener('couple_event', (ev) => {
          const pkt = JSON.parse((ev as MessageEvent).data) as CoupleEventPacket;
          handlers.onCoupleEvent?.(pkt);
        });

        es.addEventListener('world_reset', () => {
          handlers.onWorldMutated('member');
        });

        es.onerror = () => {
          if (!simulatedOffline && !closedManually) {
            handlers.onConnectionChange('reconnecting');
          }
        };
      };

      openStream();

      return {
        publishMovement(packet) {
          postRealtime('movement', packet);
        },
        updatePresence(presence) {
          currentPresence = presence;
          postRealtime('presence', presence);
        },
        notifyWorldMutated(reason) {
          postRealtime('world_mutated', { reason });
        },
        publishCoupleEvent(packet) {
          postRealtime('couple_event', packet);
        },
        async reconnect() {
          if (simulatedOffline) {
            handlers.onConnectionChange('offline');
            return;
          }
          handlers.onConnectionChange('reconnecting');
          openStream();
        },
        setSimulatedOffline(offline: boolean) {
          simulatedOffline = offline;
          if (offline) {
            source?.close();
            source = null;
            handlers.onConnectionChange('offline');
          } else {
            openStream();
          }
        },
        async disconnect() {
          closedManually = true;
          source?.close();
          source = null;
          handlers.onConnectionChange('disconnected');
        },
      };
    },

    createSpikeCinemaBus(worldId: string, userId: string): SpikeCinemaBus {
      const spikeSessionId = `spike-${userId}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        subscribe(onMessage) {
          const qs = new URLSearchParams({
            worldId,
            userId,
            sessionId: spikeSessionId,
            mapId: 'home',
          });
          const es = new EventSource(`/api/dev-lan/events?${qs.toString()}`);
          es.addEventListener('spike_cinema', (ev) => {
            onMessage(JSON.parse((ev as MessageEvent).data) as SpikeCinemaPacket);
          });
          return () => {
            es.close();
          };
        },
        send(pkt) {
          void fetch('/api/dev-lan/realtime', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-dev-user-id': userId,
            },
            body: JSON.stringify({
              worldId,
              kind: 'spike_cinema',
              sessionId: spikeSessionId,
              payload: pkt,
            }),
          }).catch(() => {});
        },
      };
    },

    inventory: {
      async getInventory(worldId) {
        return apiJson<InventorySnapshot>(`/inventory?worldId=${encodeURIComponent(worldId)}`);
      },
      async claimFreeKibble(worldId, idempotencyKey) {
        return apiJson<InventorySnapshot>('/inventory/claim-free-kibble', {
          method: 'POST',
          body: JSON.stringify({ worldId, idempotencyKey }),
        });
      },
      async transferInventoryQuality(params) {
        return apiJson<InventorySnapshot>('/inventory/transfer-quality', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
    },

    pet: {
      async getPetSnapshot(worldId) {
        return apiJson<PetSnapshot | null>(`/pet?worldId=${encodeURIComponent(worldId)}`);
      },
      async adoptOrRenamePet(params) {
        return apiJson<PetSnapshot>('/pet/adopt-or-rename', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
      async interactPet(params) {
        return apiJson<PetInteractionResult>('/pet/interact', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
      async getPetCareSnapshot(worldId) {
        return apiJson<import('../../shared/pet/petTypes').PetCareBowlSnapshot>(
          `/pet/care?worldId=${encodeURIComponent(worldId)}`,
        );
      },
      async applyPetCare(params) {
        return apiJson<import('../../shared/pet/petTypes').PetCareApplyResult>('/pet/care/apply', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
    },

    study: {
      async getStudySnapshot(worldId) {
        return apiJson<StudySnapshot>(`/study?worldId=${encodeURIComponent(worldId)}`);
      },
      async startSession(params) {
        return apiJson<StudySnapshot>('/study/start', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
      async controlSession(params) {
        return apiJson<StudySnapshot>('/study/control', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
    },

    mailbox: {
      async listMailbox(worldId) {
        return apiJson<MailboxSnapshot>(`/mailbox?worldId=${encodeURIComponent(worldId)}`);
      },
      async sendLetterOrGift(params) {
        return apiJson<{ mailbox: MailboxSnapshot; inventory: InventorySnapshot }>('/mailbox/send', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
      async openItem(params) {
        return apiJson<{ openedId: string; mailbox: MailboxSnapshot; inventory: InventorySnapshot }>(
          '/mailbox/open',
          {
            method: 'POST',
            body: JSON.stringify(params),
          },
        );
      },
    },

    farm: {
      async getFarmSnapshot(worldId) {
        return apiJson<import('../../shared/farming/farmSnapshotTypes').FarmSnapshot>(
          `/farm?worldId=${encodeURIComponent(worldId)}`,
        );
      },
      async applyFarm(params) {
        return apiJson(`/farm/apply`, { method: 'POST', body: JSON.stringify(params) });
      },
      async sellCrop(params) {
        return apiJson(`/farm/sell`, { method: 'POST', body: JSON.stringify(params) });
      },
      async buySeed(params) {
        return apiJson(`/farm/buy-seed`, { method: 'POST', body: JSON.stringify(params) });
      },
    },

    devConsole: {
      async spawnItem(params) {
        return apiJson<InventorySnapshot>('/dev-console/spawn-item', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
      async setPetVitals(params) {
        return apiJson<PetSnapshot>('/dev-console/set-pet', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
      async advanceStudy(params) {
        return apiJson<StudySnapshot>('/dev-console/advance-study', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
      async exportSnapshot(worldId) {
        return apiJson<DevSanitizedWorldSnapshot>(
          `/dev-console/snapshot-export?worldId=${encodeURIComponent(worldId)}`,
        );
      },
      async restoreSnapshot(worldId, snapshot) {
        return apiJson<{ restored: true }>('/dev-console/snapshot-restore', {
          method: 'POST',
          body: JSON.stringify({ worldId, snapshot }),
        });
      },
    },
  };
}
