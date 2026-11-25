/**
 * Queue end scheduling vendored from `shared/rules/actions/crafting.js#enqueue` @ 9b23e1a.
 */
import { cutMs } from './economyMulBp';

export interface QueueJob {
  readonly recipeId: string;
  readonly startMs: number;
  readonly endMs: number;
}

export function scheduleNextQueueJob(
  nowMs: number,
  previousEndMs: number | null,
  baseDurationMs: number,
  startCutBp = 0,
  slowDouble = false,
): { startMs: number; endMs: number; durationMs: number } {
  const startMs = Math.max(nowMs, previousEndMs ?? nowMs);
  const base = baseDurationMs * (slowDouble ? 2 : 1);
  const durationMs = cutMs(base, startCutBp);
  return { startMs, endMs: startMs + durationMs, durationMs };
}