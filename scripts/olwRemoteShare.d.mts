export interface RemoteShareStatus {
  active: boolean;
  tunnelStatus: string;
  provider: string | null;
  shareUrl: string | null;
  publicShareUrl?: string | null;
  lanShareUrl: string | null;
  tunnelError: string | null;
  expiresAtMs: number | null;
  lastClientAtMs: number | null;
  proxyPort?: number;
  probePath?: string;
  sharePath?: string;
}

export function getRemoteShareStatus(): RemoteShareStatus;
export function stopRemoteShare(): Promise<boolean>;
export function startRemoteShare(options: {
  targetPort: number;
  tunnel?: boolean;
  refresh?: boolean;
  ttlMs?: number;
  interfaces?: unknown;
}): Promise<RemoteShareStatus>;
