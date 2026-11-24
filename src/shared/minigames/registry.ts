/**
 * Static registry of mini-game definitions (V0.2.5).
 *
 * Adding a mini-game later only requires a new pure reducer module plus its
 * registration here; no backend router changes.
 */

import { battleshipGame } from './battleship';
import { caroGame } from './caro';
import { memoryGame } from './memory';
import { othelloGame } from './othello';
import {
  MinigameRuleError,
  type MinigameDefinition,
} from './types';

export const MINIGAME_IDS = ['caro', 'othello', 'battleship', 'memory'] as const;

export type MinigameId = (typeof MINIGAME_IDS)[number];

/**
 * Erases the concrete state/action generics behind one documented cast.
 * The registry is homogeneous; callers that need concrete types import the
 * per-game definitions (`caroGame`, `othelloGame`, ...) directly.
 */
function erase<TState, TAction>(
  definition: MinigameDefinition<TState, TAction>,
): MinigameDefinition<unknown, unknown> {
  return definition as unknown as MinigameDefinition<unknown, unknown>;
}

const DEFINITIONS: readonly MinigameDefinition<unknown, unknown>[] = [
  erase(caroGame),
  erase(othelloGame),
  erase(battleshipGame),
  erase(memoryGame),
];

export const MINIGAME_REGISTRY: ReadonlyMap<
  string,
  MinigameDefinition<unknown, unknown>
> = new Map(
  DEFINITIONS.map(
    (definition) => [definition.id, definition] as const,
  ),
);

export function getMinigame(
  id: string,
): MinigameDefinition<unknown, unknown> | undefined {
  return MINIGAME_REGISTRY.get(id);
}

/** Minimal session envelope for a fresh game (server adds persistence later). */
export interface MinigameSession {
  readonly gameId: MinigameId;
  readonly state: unknown;
  readonly version: 1;
}

export function createSession(
  gameId: string,
  seed: number,
  playerIds: readonly string[],
): MinigameSession {
  const definition = getMinigame(gameId);
  if (definition === undefined) {
    throw new MinigameRuleError(
      'UNKNOWN_GAME',
      `Không tìm thấy mini-game "${gameId}".`,
    );
  }
  return {
    gameId: gameId as MinigameId,
    state: definition.initialState(seed, playerIds),
    version: 1,
  };
}
