import { z } from 'zod';

export interface MinigameEventEnvelope {
  type: 'MINIGAME_EVENT';
  gameId: string;
  matchId: string;
  worldId: string;
  actorUserId: string;
  sessionId: string;
  seq: number;
  stateVersion: number;
  idempotencyKey?: string;
  payload: unknown;
}

export const minigameEventEnvelopeSchema = z.object({
  type: z.literal('MINIGAME_EVENT'),
  gameId: z.string().min(1).max(64),
  matchId: z.string().min(1).max(128),
  worldId: z.string().min(1).max(128),
  actorUserId: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(128),
  seq: z.number().int().nonnegative(),
  stateVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(1).max(128).optional(),
  payload: z.unknown(),
});
