/**
 * Exponential backoff with symmetric jitter, adapted from socketio/socket.io `backo2.ts`.
 */
export interface ReconnectBackoffOptions {
  minMs?: number;
  maxMs?: number;
  factor?: number;
  jitter?: number;
  rng?: () => number;
}

export class ReconnectBackoff {
  private readonly minMs: number;
  private readonly maxMs: number;
  private readonly factor: number;
  private readonly jitter: number;
  private readonly rng: () => number;
  private attempts = 0;

  constructor(options: ReconnectBackoffOptions = {}) {
    this.minMs = Math.max(10, Math.round(options.minMs ?? 300));
    this.maxMs = Math.max(this.minMs, Math.round(options.maxMs ?? 5000));
    this.factor = Math.max(1, options.factor ?? 1.8);
    this.jitter = options.jitter !== undefined && options.jitter > 0 && options.jitter <= 1 ? options.jitter : 0.4;
    this.rng = options.rng ?? Math.random;
  }

  nextDelayMs(): number {
    const raw = this.minMs * Math.pow(this.factor, this.attempts);
    this.attempts += 1;
    let ms = raw;
    if (this.jitter > 0 && Number.isFinite(raw)) {
      const rand = Math.max(0, Math.min(0.999999, this.rng()));
      const deviation = (rand * 2 - 1) * this.jitter * raw;
      ms = raw + deviation;
    }
    if (!Number.isFinite(ms)) return this.maxMs;
    return Math.max(this.minMs, Math.min(this.maxMs, Math.round(ms)));
  }

  reset(): void {
    this.attempts = 0;
  }

  getAttempts(): number {
    return this.attempts;
  }
}
