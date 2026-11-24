import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

export interface DevLanMiddleware {
  (req: IncomingMessage, res: ServerResponse, next?: () => void): Promise<void>;
  closeAll: () => void;
}

export function createDevLanHandler(options?: { stateFilePath?: string }): DevLanMiddleware;
export function devLanServerPlugin(options?: { stateFilePath?: string }): Plugin;
