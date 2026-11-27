import { z } from 'zod';
import type { CoupleEventPacket } from '../couple/coupleTypes';
import type { DonorFishSessionView } from '../donor/donorFishSessionTypes';
import { MAP_IDS } from '../maps';
import type { PetCareSessionEventPacket } from '../petLiving/petCare/sharedPetCareTypes';
import { LIVING_ITEM_ICONS } from '../petLiving/petVisualTypes';
import { movementPacketSchema } from '../realtime';
import type { MovementPacket, PresencePayload, WorldMutationReason } from '../types';
import { minigameEventEnvelopeSchema, type MinigameEventEnvelope } from './minigameContract';

export interface WorldDomainVersions {
  layoutVersion: number;
  farmVersion: number;
  petVersion: number;
  bowlVersion: number;
  inventoryVersion: number;
  studyVersion: number;
  mailboxVersion: number;
  petCareRevision: number;
}

export const WORLD_MUTATION_REASONS = [
  'furniture',
  'profile',
  'member',
  'inventory',
  'pet',
  'study',
  'mailbox',
  'farm',
] as const;

export const presencePayloadSchema = z.object({
  userId: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(128),
  mapId: z.enum(MAP_IDS),
  nickname: z.string().min(1).max(64),
  avatarConfig: z.any(),
  tileX: z.number().finite(),
  tileY: z.number().finite(),
  x: z.number().finite().min(0).max(10000).optional(),
  y: z.number().finite().min(0).max(10000).optional(),
  facing: z.enum(['down', 'up', 'left', 'right']),
  updatedAtMs: z.number().finite().nonnegative(),
  presenceSeq: z.number().int().nonnegative().optional(),
  posture: z
    .enum([
      'none',
      'sit_study',
      'sit_sofa',
      'sit_bench',
      'lie_bed',
      'hold_hands',
      'hug',
      'kiss',
      'lean_shoulder',
      'dance',
      'give_flower',
    ])
    .optional(),
  heldItemSku: z.string().max(128).nullable().optional(),
  heldItemKind: z.enum(['none', 'food', 'water_pitcher', 'toy', 'gift', 'tool']).optional(),
  heldIconId: z.enum(LIVING_ITEM_ICONS).nullable().optional(),
  heldPropsIconId: z.string().max(128).nullable().optional(),
});

export type ClientWsFrame =
  | {
      type: 'hello';
      worldId: string;
      userId: string;
      sessionId: string;
      connectionSeq: number;
      presence: PresencePayload;
      lastStateVersion?: number;
    }
  | {
      type: 'ping';
      clientSentMonoMs: number;
    }
  | {
      type: 'presence';
      presence: PresencePayload;
    }
  | {
      type: 'movement';
      packet: MovementPacket;
    }
  | {
      type: 'world_mutated';
      reason: WorldMutationReason;
    }
  | {
      type: 'couple_event';
      packet: CoupleEventPacket;
    }
  | {
      type: 'pet_care_session';
      packet: PetCareSessionEventPacket;
    }
  | {
      type: 'minigame_event';
      packet: MinigameEventEnvelope;
    }
  | {
      type: 'resync_request';
      lastStateVersion: number;
    };

export type ServerWsFrame =
  | {
      type: 'welcome';
      sessionId: string;
      connectionId: string;
      serverSeq: number;
      stateVersion: number;
      domainVersions: WorldDomainVersions;
      presences: PresencePayload[];
      latestMovements: MovementPacket[];
    }
  | {
      type: 'pong';
      clientSentMonoMs: number;
      serverSeq: number;
      stateVersion: number;
    }
  | {
      type: 'presence_sync';
      serverSeq: number;
      stateVersion: number;
      presences: PresencePayload[];
    }
  | {
      type: 'movement';
      serverSeq: number;
      packet: MovementPacket;
    }
  | {
      type: 'world_mutated';
      serverSeq: number;
      stateVersion: number;
      domainVersions?: Partial<WorldDomainVersions>;
      reason: WorldMutationReason;
    }
  | {
      type: 'couple_event';
      serverSeq: number;
      packet: CoupleEventPacket;
    }
  | {
      type: 'pet_care_session';
      serverSeq: number;
      packet: PetCareSessionEventPacket;
    }
  | {
      type: 'donor_fishing_sync';
      serverSeq: number;
      session: DonorFishSessionView;
    }
  | {
      type: 'minigame_event';
      serverSeq: number;
      packet: MinigameEventEnvelope;
    }
  | {
      type: 'world_reset';
      serverSeq: number;
      stateVersion: number;
    }
  | {
      type: 'session_replaced';
      reason: string;
    }
  | {
      type: 'error';
      code: string;
      message: string;
    };

export const clientWsFrameSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hello'),
    worldId: z.string().min(1).max(128),
    userId: z.string().min(1).max(128),
    sessionId: z.string().min(1).max(128),
    connectionSeq: z.number().int().nonnegative(),
    presence: presencePayloadSchema,
    lastStateVersion: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal('ping'),
    clientSentMonoMs: z.number().finite().nonnegative(),
  }),
  z.object({
    type: z.literal('presence'),
    presence: presencePayloadSchema,
  }),
  z.object({
    type: z.literal('movement'),
    packet: movementPacketSchema,
  }),
  z.object({
    type: z.literal('world_mutated'),
    reason: z.enum(WORLD_MUTATION_REASONS),
  }),
  z.object({
    type: z.literal('couple_event'),
    packet: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('pet_care_session'),
    packet: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('minigame_event'),
    packet: minigameEventEnvelopeSchema,
  }),
  z.object({
    type: z.literal('resync_request'),
    lastStateVersion: z.number().int().nonnegative(),
  }),
]);

export function parseClientWsFrame(raw: unknown): ClientWsFrame | null {
  const parsed = clientWsFrameSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data as ClientWsFrame;
}
