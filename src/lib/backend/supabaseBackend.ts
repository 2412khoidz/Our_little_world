import { parseAvatarConfig } from '../../shared/avatar';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import type { PetInteractionResult, PetSnapshot } from '../../shared/pet/petTypes';
import type {
  CreatedInvite,
  FurniturePlacement,
  MovementPacket,
  MutationErrorCode,
  PresencePayload,
  UserProfile,
  WorldInviteStatus,
  WorldMutationReason,
  WorldSnapshot,
} from '../../shared/types';
import { getSupabaseClient } from '../supabase';
import type {
  AuthSessionUser,
  RealtimeHandle,
  SpikeCinemaBus,
  SpikeCinemaPacket,
  WorldBackend,
} from './types';

function mapSupabaseError(err: { message?: string; code?: string } | null): {
  code: MutationErrorCode;
  message: string;
} {
  const raw = err?.message ?? '';
  const map: Array<[string, MutationErrorCode, string]> = [
    ['UNAUTHENTICATED', 'UNAUTHENTICATED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
    ['FORBIDDEN', 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'],
    ['WORLD_FULL', 'WORLD_FULL', 'Ngôi nhà này đã đủ 2 thành viên — không thể thêm người thứ 3.'],
    ['ALREADY_IN_WORLD', 'ALREADY_IN_WORLD', 'Tài khoản này đã thuộc về một ngôi nhà.'],
    ['INVITE_INVALID', 'INVITE_INVALID', 'Mã mời không hợp lệ hoặc không tồn tại.'],
    ['INVITE_EXPIRED', 'INVITE_EXPIRED', 'Mã mời đã hết hạn.'],
    ['INVITE_USED', 'INVITE_USED', 'Mã mời này đã được sử dụng rồi.'],
    ['TILE_OCCUPIED', 'TILE_OCCUPIED', 'Ô này đã có món đồ khác chiếm chỗ.'],
    ['OUT_OF_BOUNDS', 'OUT_OF_BOUNDS', 'Vị trí đặt vượt ra ngoài bản đồ.'],
    ['BLOCKED_TILE', 'BLOCKED_TILE', 'Không thể đặt đồ lên tường hoặc vật cản.'],
    ['NO_PLACE_ZONE', 'NO_PLACE_ZONE', 'Cần chừa lối đi trước cửa ra vào.'],
    ['WRONG_MAP', 'WRONG_MAP', 'Món nội thất không thuộc khu vực này.'],
    ['STOCK_EXCEEDED', 'STOCK_EXCEEDED', 'Bạn đã dùng hết số lượng món đồ khởi đầu này.'],
    ['VERSION_CONFLICT', 'VERSION_CONFLICT', 'Dữ liệu vừa được người kia cập nhật. Đang đồng bộ lại...'],
    ['COOLDOWN_ACTIVE', 'COOLDOWN_ACTIVE', 'Hãy đợi thêm một chút trước khi thực hiện lại nhé.'],
    ['STACK_FULL', 'STACK_FULL', 'Ngăn túi chứa món đồ này đã đầy rồi.'],
    ['ALREADY_OPENED', 'ALREADY_OPENED', 'Lá thư hoặc món quà này đã được mở trước đó.'],
    ['INSUFFICIENT_ITEMS', 'INSUFFICIENT_ITEMS', 'Trong túi không đủ vật phẩm cần dùng.'],
    ['IDEMPOTENCY_CONFLICT', 'IDEMPOTENCY_CONFLICT', 'Yêu cầu bị trùng khóa nhưng khác nội dung.'],
    ['NOT_FOUND', 'NOT_FOUND', 'Không tìm thấy dữ liệu được yêu cầu.'],
    ['VALIDATION_ERROR', 'VALIDATION_ERROR', 'Dữ liệu nhập chưa hợp lệ.'],
  ];

  for (const [token, code, message] of map) {
    if (raw.includes(token)) {
      return { code, message };
    }
  }
  return { code: 'NETWORK_ERROR', message: raw || 'Không thể kết nối máy chủ.' };
}

function normalizeSnapshot(raw: unknown): WorldSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const snap = raw as WorldSnapshot;
  return {
    world: snap.world,
    members: (snap.members ?? []).map((m) => ({
      ...m,
      avatarConfig: parseAvatarConfig(m.avatarConfig),
    })),
    placements: snap.placements ?? [],
  };
}

export function createSupabaseBackend(): WorldBackend {
  const supabase = getSupabaseClient();

  function toAuthUser(u: { id: string; email?: string | null }): AuthSessionUser {
    const email = u.email ?? '';
    return {
      userId: u.id,
      email,
      displayLabel: email.split('@')[0] || 'Thành viên',
    };
  }

  return {
    mode: 'supabase',

    async getCurrentUser() {
      const { data } = await supabase.auth.getUser();
      return data.user ? toAuthUser(data.user) : null;
    },

    onAuthChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        cb(session?.user ? toAuthUser(session.user) : null);
      });
      return () => {
        data.subscription.unsubscribe();
      };
    },

    async signInWithPassword(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return {
          ok: false,
          code: 'UNAUTHENTICATED',
          message: error?.message ?? 'Đăng nhập thất bại.',
        };
      }
      return { ok: true, data: toAuthUser(data.user) };
    },

    async signUpWithPassword(email, password) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: error.message,
        };
      }
      return {
        ok: true,
        data: {
          user: data.user ? toAuthUser(data.user) : null,
          needsEmailVerification: Boolean(data.user && !data.session),
        },
      };
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    async getWorldSnapshot() {
      const { data, error } = await supabase.rpc('get_world_snapshot');
      if (error) {
        const mapped = mapSupabaseError(error);
        return { ok: false, ...mapped };
      }
      return { ok: true, data: normalizeSnapshot(data) };
    },

    async createWorld(worldName, nickname, avatarConfig) {
      const { error } = await supabase.rpc('create_couple_world', {
        p_name: worldName,
        p_nickname: nickname,
        p_avatar_config: avatarConfig,
      });
      if (error) {
        return { ok: false, ...mapSupabaseError(error) };
      }
      const snapRes = await this.getWorldSnapshot();
      if (!snapRes.ok || !snapRes.data) {
        return { ok: false, code: 'NOT_FOUND', message: 'Đã tạo nhà nhưng không đọc được snapshot.' };
      }
      return { ok: true, data: snapRes.data };
    },

    async createInvite(worldId) {
      const { data, error } = await supabase.rpc('create_world_invite', {
        p_world_id: worldId,
        p_ttl_hours: 48,
      });
      if (error) {
        return { ok: false, ...mapSupabaseError(error) };
      }
      const row = Array.isArray(data) ? data[0] : data;
      const invite: CreatedInvite = {
        inviteCode: row.invite_code,
        expiresAt: row.expires_at,
      };
      return { ok: true, data: invite };
    },

    async getInviteStatus(worldId) {
      const { data, error } = await supabase.rpc('get_active_invite_status', {
        p_world_id: worldId,
      });
      if (error) {
        return { ok: false, ...mapSupabaseError(error) };
      }
      const row = Array.isArray(data) ? data[0] : data;
      const status: WorldInviteStatus = {
        hasActiveInvite: Boolean(row?.has_active_invite),
        expiresAt: row?.expires_at ?? null,
      };
      return { ok: true, data: status };
    },

    async redeemInvite(inviteCode, nickname, avatarConfig) {
      const { error } = await supabase.rpc('redeem_world_invite', {
        p_invite_code: inviteCode,
        p_nickname: nickname,
        p_avatar_config: avatarConfig,
      });
      if (error) {
        return { ok: false, ...mapSupabaseError(error) };
      }
      const snapRes = await this.getWorldSnapshot();
      if (!snapRes.ok || !snapRes.data) {
        return { ok: false, code: 'NOT_FOUND', message: 'Không tải được dữ liệu nhà sau khi ghép cặp.' };
      }
      return { ok: true, data: snapRes.data };
    },

    async updateProfile(nickname, avatarConfig) {
      const { data, error } = await supabase.rpc('update_my_profile', {
        p_nickname: nickname,
        p_avatar_config: avatarConfig,
      });
      if (error || !data) {
        return { ok: false, ...mapSupabaseError(error) };
      }
      const profile: UserProfile = {
        userId: data.user_id,
        nickname: data.nickname,
        avatarConfig: parseAvatarConfig(data.avatar_config),
        updatedAt: data.updated_at,
      };
      return { ok: true, data: profile };
    },

    async placeFurniture(params) {
      const { data, error } = await supabase.rpc('place_furniture', {
        p_world_id: params.worldId,
        p_map_id: params.mapId,
        p_sku: params.sku,
        p_tile_x: params.tileX,
        p_tile_y: params.tileY,
        p_expected_layout_version: params.expectedLayoutVersion,
        p_idempotency_key: params.idempotencyKey,
      });
      if (error || !data) {
        return { ok: false, ...mapSupabaseError(error) };
      }
      return {
        ok: true,
        data: data as { layoutVersion: number; placement: FurniturePlacement },
      };
    },

    async moveFurniture(params) {
      const { data, error } = await supabase.rpc('move_furniture', {
        p_world_id: params.worldId,
        p_placement_id: params.placementId,
        p_tile_x: params.tileX,
        p_tile_y: params.tileY,
        p_expected_layout_version: params.expectedLayoutVersion,
        p_idempotency_key: params.idempotencyKey,
      });
      if (error || !data) {
        return { ok: false, ...mapSupabaseError(error) };
      }
      return {
        ok: true,
        data: data as { layoutVersion: number; placement: FurniturePlacement },
      };
    },

    async removeFurniture(params) {
      const { data, error } = await supabase.rpc('remove_furniture', {
        p_world_id: params.worldId,
        p_placement_id: params.placementId,
        p_expected_layout_version: params.expectedLayoutVersion,
        p_idempotency_key: params.idempotencyKey,
      });
      if (error || !data) {
        return { ok: false, ...mapSupabaseError(error) };
      }
      return {
        ok: true,
        data: data as { layoutVersion: number; removedId: string },
      };
    },

    async connectWorldRealtime(worldId, initialPresence, handlers): Promise<RealtimeHandle> {
      let currentPresence = initialPresence;
      let activeChannel: ReturnType<typeof supabase.channel> | null = null;

      const subscribeChannel = async () => {
        handlers.onConnectionChange('connecting');
        await supabase.realtime.setAuth();

        if (activeChannel) {
          await supabase.removeChannel(activeChannel);
        }

        const ch = supabase.channel(`world:${worldId}`, {
          config: {
            private: true,
            broadcast: { self: false },
            presence: { key: currentPresence.sessionId },
          },
        });

        ch.on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState<PresencePayload>();
          const flat: PresencePayload[] = [];
          for (const entries of Object.values(state)) {
            for (const item of entries) {
              flat.push(item);
            }
          }
          handlers.onPresenceChange(flat);
        });

        ch.on('broadcast', { event: 'movement' }, ({ payload }) => {
          handlers.onMovement(payload as MovementPacket);
        });

        ch.on('broadcast', { event: 'world_mutated' }, ({ payload }) => {
          const reason = (payload as { reason?: WorldMutationReason })?.reason ?? 'furniture';
          handlers.onWorldMutated(reason);
        });

        ch.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            handlers.onConnectionChange('connected');
            await ch.track(currentPresence);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            handlers.onConnectionChange('reconnecting');
          } else if (status === 'CLOSED') {
            handlers.onConnectionChange('disconnected');
          }
        });

        activeChannel = ch;
      };

      await subscribeChannel();

      return {
        publishMovement(packet) {
          if (!activeChannel) return;
          void activeChannel.send({
            type: 'broadcast',
            event: 'movement',
            payload: packet,
          });
        },
        updatePresence(presence) {
          currentPresence = presence;
          if (!activeChannel) return;
          void activeChannel.track(presence);
        },
        notifyWorldMutated(reason) {
          if (!activeChannel) return;
          void activeChannel.send({
            type: 'broadcast',
            event: 'world_mutated',
            payload: { reason },
          });
        },
        async reconnect() {
          handlers.onConnectionChange('reconnecting');
          await supabase.auth.refreshSession();
          await subscribeChannel();
        },
        async disconnect() {
          if (activeChannel) {
            await activeChannel.untrack();
            await supabase.removeChannel(activeChannel);
            activeChannel = null;
          }
          handlers.onConnectionChange('disconnected');
        },
      };
    },

    createSpikeCinemaBus(worldId: string): SpikeCinemaBus {
      const ch = supabase.channel(`cinema-spike:${worldId}`, {
        config: {
          private: true,
          broadcast: { self: false },
        },
      });
      return {
        subscribe(onMessage) {
          ch.on('broadcast', { event: 'spike_cinema' }, ({ payload }) => {
            onMessage(payload as SpikeCinemaPacket);
          });
          void supabase.realtime.setAuth().then(() => {
            ch.subscribe();
          });
          return () => {
            void supabase.removeChannel(ch);
          };
        },
        send(pkt) {
          void ch.send({
            type: 'broadcast',
            event: 'spike_cinema',
            payload: pkt,
          });
        },
      };
    },

    inventory: {
      async getInventory(worldId) {
        const { data, error } = await supabase.rpc('inventory_get', {
          p_world_id: worldId,
        });
        if (error || !data) {
          return { ok: false, ...mapSupabaseError(error) };
        }
        return { ok: true, data: data as InventorySnapshot };
      },
      async claimFreeKibble(worldId, idempotencyKey) {
        const { data, error } = await supabase.rpc('inventory_claim_free_kibble', {
          p_world_id: worldId,
          p_idempotency_key: idempotencyKey,
        });
        if (error || !data) {
          return { ok: false, ...mapSupabaseError(error) };
        }
        return { ok: true, data: data as InventorySnapshot };
      },
    },

    pet: {
      async getPetSnapshot(worldId) {
        const { data, error } = await supabase.rpc('pet_get_snapshot', {
          p_world_id: worldId,
        });
        if (error) {
          return { ok: false, ...mapSupabaseError(error) };
        }
        return { ok: true, data: (data as PetSnapshot | null) ?? null };
      },
      async adoptOrRenamePet(params) {
        const { data, error } = await supabase.rpc('pet_adopt_or_rename', {
          p_world_id: params.worldId,
          p_name: params.name,
          p_expected_version: params.expectedVersion ?? null,
          p_idempotency_key: params.idempotencyKey,
        });
        if (error || !data) {
          return { ok: false, ...mapSupabaseError(error) };
        }
        return { ok: true, data: data as PetSnapshot };
      },
      async interactPet(params) {
        const { data, error } = await supabase.rpc('pet_interact', {
          p_world_id: params.worldId,
          p_pet_id: params.petId,
          p_action: params.action,
          p_expected_version: params.expectedVersion,
          p_idempotency_key: params.idempotencyKey,
        });
        if (error || !data) {
          return { ok: false, ...mapSupabaseError(error) };
        }
        return { ok: true, data: data as PetInteractionResult };
      },
    },
  };
}
