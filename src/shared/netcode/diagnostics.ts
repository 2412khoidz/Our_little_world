import type { MapId } from '../types';

export type TransportKind = 'wss' | 'ws' | 'sse' | 'local' | 'supabase' | 'none';

export type NetworkConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

export interface NetworkDiagnosticsState {
  status: NetworkConnectionStatus;
  transport: TransportKind;
  rttMs: number | null;
  smoothedRttMs: number | null;
  jitterMs: number | null;
  lastPacketReceivedAtMonoMs: number | null;
  reconnectCount: number;
  playerCount: number;
  maxPlayers: number;
  localSessionShort: string;
  localMapId: MapId | null;
  remoteSessionShort: string | null;
  remoteMapId: MapId | null;
  remoteRenderedOnMap: boolean;
  stateVersion: number;
  outboundQueueSize: number;
}

export function sanitizeSessionShort(sessionId: string | null | undefined): string {
  const raw = String(sessionId ?? '').trim();
  if (/^[a-zA-Z0-9_-]{4}\.\.[a-zA-Z0-9_-]{4}$/.test(raw)) return raw;
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!clean) return 'none';
  if (clean.length <= 10) return clean;
  return `${clean.slice(0, 4)}..${clean.slice(-4)}`;
}

export function createInitialNetworkDiagnostics(
  overrides: Partial<NetworkDiagnosticsState> = {},
): NetworkDiagnosticsState {
  return {
    status: 'disconnected',
    transport: 'none',
    rttMs: null,
    smoothedRttMs: null,
    jitterMs: null,
    lastPacketReceivedAtMonoMs: null,
    reconnectCount: 0,
    playerCount: 0,
    maxPlayers: 2,
    localSessionShort: 'none',
    localMapId: null,
    remoteSessionShort: null,
    remoteMapId: null,
    remoteRenderedOnMap: false,
    stateVersion: 0,
    outboundQueueSize: 0,
    ...overrides,
  };
}

/**
 * Tracks application-level RTT (EWMA) and RFC 3550 interarrival jitter without relying on wall clocks.
 */
export class RttJitterTracker {
  private latestRttMs: number | null = null;
  private smoothedRttMs: number | null = null;
  private jitterMs: number | null = null;
  private previousSampleMs: number | null = null;

  recordSample(rttMs: number): void {
    if (!Number.isFinite(rttMs) || rttMs < 0) return;
    const sample = Math.max(0, rttMs);
    this.latestRttMs = sample;
    this.smoothedRttMs =
      this.smoothedRttMs === null ? sample : this.smoothedRttMs * 0.75 + sample * 0.25;
    if (this.previousSampleMs === null) {
      this.jitterMs = 0;
    } else {
      const diff = Math.abs(sample - this.previousSampleMs);
      const prevJ = this.jitterMs ?? 0;
      this.jitterMs = prevJ + (diff - prevJ) / 16;
    }
    this.previousSampleMs = sample;
  }

  getStats(): { rttMs: number | null; smoothedRttMs: number | null; jitterMs: number | null } {
    return {
      rttMs: this.latestRttMs !== null ? Math.round(this.latestRttMs) : null,
      smoothedRttMs: this.smoothedRttMs !== null ? Math.round(this.smoothedRttMs) : null,
      jitterMs: this.jitterMs !== null ? Math.round(this.jitterMs) : null,
    };
  }

  reset(): void {
    this.latestRttMs = null;
    this.smoothedRttMs = null;
    this.jitterMs = null;
    this.previousSampleMs = null;
  }
}
