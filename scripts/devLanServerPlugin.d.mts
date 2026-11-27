import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Plugin } from 'vite';

export interface DevLanMiddleware {
  (req: IncomingMessage, res: ServerResponse, next?: () => void): Promise<void>;
  handleUpgrade: (req: IncomingMessage, socket: Duplex, head: Buffer) => boolean;
  getWorldStateMeta?: (worldId: string) => { stateVersion: number; domainVersions: Record<string, number> };
  getRoomDebugStats?: (worldId: string) => unknown;
  closeAll: () => void;
}

export function createDevLanHandler(options?: {
  stateFilePath?: string;
  getTryHandleFarmDevLan?: () => unknown;
  getTryHandleDonorDevLan?: () => unknown;
  wsOptions?: {
    heartbeatIntervalMs?: number;
    maxMissedPongs?: number;
    disconnectGraceMs?: number;
    sseGraceMs?: number;
    sseKeepaliveMs?: number;
  };
}): DevLanMiddleware;
export function devLanServerPlugin(options?: { stateFilePath?: string }): Plugin;
