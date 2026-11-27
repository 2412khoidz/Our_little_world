interface QueuedEntry<T> {
  item: T;
  coalesceKey?: string;
  transient: boolean;
}

/**
 * Bounded outbound buffer that coalesces stale transient frames (e.g. movement/presence)
 * while preserving reliable gameplay events up to `maxSize`.
 */
export class BoundedOutboundQueue<T> {
  private readonly maxSize: number;
  private readonly entries: QueuedEntry<T>[] = [];
  private dropped = 0;

  constructor(maxSize = 64) {
    this.maxSize = Math.max(1, Math.floor(maxSize));
  }

  enqueue(item: T, coalesceKey?: string, transient = false): boolean {
    if (coalesceKey) {
      const existingIdx = this.entries.findIndex((e) => e.coalesceKey === coalesceKey);
      if (existingIdx >= 0) {
        this.entries[existingIdx] = { item, coalesceKey, transient };
        return true;
      }
    }

    if (this.entries.length >= this.maxSize) {
      const transientIdx = this.entries.findIndex((e) => e.transient);
      if (transientIdx >= 0) {
        this.entries.splice(transientIdx, 1);
        this.dropped += 1;
      } else if (transient) {
        this.dropped += 1;
        return false;
      } else {
        this.entries.shift();
        this.dropped += 1;
      }
    }

    this.entries.push({ item, coalesceKey, transient });
    return true;
  }

  drain(): T[] {
    if (this.entries.length === 0) return [];
    const out = this.entries.map((e) => e.item);
    this.entries.length = 0;
    return out;
  }

  size(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries.length = 0;
  }

  droppedCount(): number {
    return this.dropped;
  }
}
