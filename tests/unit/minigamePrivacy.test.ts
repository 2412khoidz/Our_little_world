/**
 * P5 — mini-game privacy and versioned session contract.
 */

import { describe, expect, it } from 'vitest';
import {
  assertNoPrivateFields,
  projectBattleshipForViewer,
  submitSessionAction,
  type SessionEnvelope,
} from '../../src/shared/minigames/privacy';
import { battleshipGame, playerPrivateState } from '../../src/shared/minigames/battleship';
import type { BattleshipState } from '../../src/shared/minigames/battleship';
import { caroGame } from '../../src/shared/minigames/caro';
import { createSession } from '../../src/shared/minigames/registry';

const P1 = 'player-one';
const P2 = 'player-two';

function battleshipEnvelope(): SessionEnvelope<BattleshipState> {
  const session = createSession('battleship', 7, [P1, P2]);
  return {
    sessionId: 'session-1',
    gameId: session.gameId,
    version: session.version,
    state: session.state as BattleshipState,
  };
}

function shipCellsOf(state: BattleshipState, viewer: string): number[] {
  const privateState = playerPrivateState(state, viewer);
  return privateState.ships.flatMap((ship) => ship.cells.map((cell) => cell));
}

describe('P5 — battleship projection', () => {
  it('never exposes the opponent fleet through the viewer projection', () => {
    const envelope = battleshipEnvelope();
    const opponentCells = shipCellsOf(envelope.state, P2);
    expect(opponentCells.length).toBeGreaterThan(0);

    const projection = projectBattleshipForViewer(envelope, {
      viewerId: P1,
      authenticated: true,
    });
    expect('ok' in projection).toBe(false);

    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain('"ships"');
    expect(serialized).not.toContain('"cells"');
    assertNoPrivateFields(projection);
  });

  it('rejects an unauthenticated viewer even with a valid player id', () => {
    const result = projectBattleshipForViewer(battleshipEnvelope(), {
      viewerId: P1,
      authenticated: false,
    });
    expect('ok' in result && result.ok === false).toBe(true);
    if (!('ok' in result) || result.ok !== false) return;
    expect(result.code).toBe('UNAUTHENTICATED_VIEWER');
  });

  it('rejects a viewer who is not a player of the session', () => {
    const result = projectBattleshipForViewer(battleshipEnvelope(), {
      viewerId: 'stranger',
      authenticated: true,
    });
    expect('ok' in result && result.ok === false).toBe(true);
    if (!('ok' in result) || result.ok !== false) return;
    expect(result.code).toBe('NOT_A_PLAYER');
  });
});

describe('P5 — versioned action submission', () => {
  it('rejects a stale version', () => {
    const envelope = battleshipEnvelope();
    const result = submitSessionAction(battleshipGame, envelope, {
      action: { type: 'fire', cell: 0 },
      actorId: P1,
      expectedVersion: 999,
      nowMs: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('STALE_VERSION');
  });

  it('rejects an out-of-turn move and a duplicate shot', () => {
    const envelope = battleshipEnvelope();
    const outOfTurn = submitSessionAction(battleshipGame, envelope, {
      action: { type: 'fire', cell: 0 },
      actorId: P2,
      expectedVersion: 1,
      nowMs: 0,
    });
    expect(outOfTurn.ok).toBe(false);

    const first = submitSessionAction(battleshipGame, envelope, {
      action: { type: 'fire', cell: 0 },
      actorId: P1,
      expectedVersion: 1,
      nowMs: 0,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.envelope.version).toBe(2);

    // Player 2 fires at a different board, so the same cell is still fresh there.
    const second = submitSessionAction(battleshipGame, first.envelope, {
      action: { type: 'fire', cell: 0 },
      actorId: P2,
      expectedVersion: 2,
      nowMs: 0,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    // Player 1 fires at the already-shot cell on player 2's board.
    const duplicate = submitSessionAction(battleshipGame, second.envelope, {
      action: { type: 'fire', cell: 0 },
      actorId: P1,
      expectedVersion: 3,
      nowMs: 0,
    });
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.code).toBe('RULE_VIOLATION');
  });
});

describe('P5 — Caro rule still needs an owner decision', () => {
  it('documents that a six-in-a-row currently wins (overline accepted)', () => {
    // OPEN DESIGN DECISION: the product spec has not chosen between "5 or more"
    // (overline wins) and "exactly 5" / two-ended blocking. The current reducer
    // accepts a six-in-a-row as a win; this test pins the behaviour so nobody
    // changes it silently before the owner decides.
    let state = caroGame.initialState(11, [P1, P2]);
    // 0,1,2,3 and 5,6 first: no five consecutive yet because of the gap at 4.
    // Filling 4 then creates SEVEN in a row, which the current rule accepts.
    const p1Cells = [0, 1, 2, 3, 5, 6];
    // P2 stones are spread far apart so P2 never wins first.
    const p2Cells = [15, 32, 49, 66, 83, 100];
    for (let index = 0; index < p1Cells.length; index += 1) {
      state = caroGame.reduce(state, { type: 'place', cell: p1Cells[index] as number }, P1, 0);
      state = caroGame.reduce(state, { type: 'place', cell: p2Cells[index] as number }, P2, 0);
    }
    state = caroGame.reduce(state, { type: 'place', cell: 4 }, P1, 0);
    expect(caroGame.isFinished(state)).toBe(true);
    expect(caroGame.computeScore(state).outcome).toBe('win');
  });
});
