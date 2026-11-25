import type { MutationResult } from '../../shared/types';
import type { SpikeCinemaBus, WorldBackend } from './types';

function unconfiguredError<T>(): MutationResult<T> {
  return {
    ok: false,
    code: 'UNAUTHENTICATED',
    message: 'Ứng dụng chưa được kết nối máy chủ. Vui lòng kiểm tra cấu hình Supabase.',
  };
}

export function createUnconfiguredBackend(): WorldBackend {
  return {
    mode: 'unconfigured',
    async getCurrentUser() {
      return null;
    },
    onAuthChange() {
      return () => {};
    },
    async signInWithPassword() {
      return unconfiguredError();
    },
    async signUpWithPassword() {
      return unconfiguredError();
    },
    async signOut() {},
    async getWorldSnapshot() {
      return unconfiguredError();
    },
    async createWorld() {
      return unconfiguredError();
    },
    async createInvite() {
      return unconfiguredError();
    },
    async getInviteStatus() {
      return unconfiguredError();
    },
    async redeemInvite() {
      return unconfiguredError();
    },
    async updateProfile() {
      return unconfiguredError();
    },
    async placeFurniture() {
      return unconfiguredError();
    },
    async moveFurniture() {
      return unconfiguredError();
    },
    async rotateFurniture() {
      return unconfiguredError();
    },
    async removeFurniture() {
      return unconfiguredError();
    },
    async connectWorldRealtime() {
      return {
        publishMovement() {},
        updatePresence() {},
        notifyWorldMutated() {},
        async reconnect() {},
        async disconnect() {},
      };
    },
    createSpikeCinemaBus(): SpikeCinemaBus {
      return {
        subscribe: () => () => {},
        send: () => {},
      };
    },
  };
}
