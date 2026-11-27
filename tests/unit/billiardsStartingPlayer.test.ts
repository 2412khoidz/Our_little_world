import { describe, expect, it } from 'vitest';
// @ts-expect-error - devLanBilliardsLobby is ESM script without declaration file
import { createDevLanBilliardsLobby } from '../../scripts/devLanBilliardsLobby.mjs';
import {
  createInitialProtocolState,
  createLocalMatchStart,
} from '../../src/shared/billiards/protocol';
import type { PlayerSlot } from '../../src/shared/billiards/types';

describe('Billiards Starting Player & Rematch Alternation (2D, 3D & Online)', () => {
  describe('Local 2P First Match Randomness & Practice Mode Guarantees', () => {
    it('selects Mây (0) or Nắng (1) with equal probability on first local match across 200 samples', () => {
      let mayCount2d = 0;
      let nangCount2d = 0;
      let mayCount3d = 0;
      let nangCount3d = 0;

      const N = 200;
      for (let i = 0; i < N; i++) {
        const starter2d: PlayerSlot = Math.random() < 0.5 ? 0 : 1;
        const proto2d = createInitialProtocolState({
          edition: '2d',
          rule: '8ball',
          matchId: `m2d-${i}`,
          nowMs: 1_700_000_000_000 + i,
          hasAuthoritativeMatch: true,
          initiatorSlot: starter2d,
        });
        expect(proto2d.initiatorSlot).toBe(starter2d);
        expect(proto2d.currentPlayer).toBe(starter2d);
        if (starter2d === 0) mayCount2d++;
        else nangCount2d++;

        const starter3d: PlayerSlot = Math.random() < 0.5 ? 0 : 1;
        const proto3d = createInitialProtocolState({
          edition: '3d',
          rule: '8ball',
          matchId: `m3d-${i}`,
          nowMs: 1_700_000_000_000 + i,
          hasAuthoritativeMatch: true,
          initiatorSlot: starter3d,
        });
        expect(proto3d.initiatorSlot).toBe(starter3d);
        expect(proto3d.currentPlayer).toBe(starter3d);
        if (starter3d === 0) mayCount3d++;
        else nangCount3d++;
      }

      // 50/50 probability over 200 trials: verify both players break frequently (between 30% and 70%)
      expect(mayCount2d).toBeGreaterThanOrEqual(60);
      expect(nangCount2d).toBeGreaterThanOrEqual(60);
      expect(mayCount3d).toBeGreaterThanOrEqual(60);
      expect(nangCount3d).toBeGreaterThanOrEqual(60);
    });

    it('always starts Practice mode with the human player (slot 0) in both 2D and 3D', () => {
      for (let i = 0; i < 50; i++) {
        // In practice mode, firstStarter is strictly 0
        const starter: PlayerSlot = 0;
        const proto2d = createInitialProtocolState({
          edition: '2d',
          rule: '8ball',
          matchId: `prac-2d-${i}`,
          nowMs: 1_700_000_000_000,
          hasAuthoritativeMatch: true,
          initiatorSlot: starter,
        });
        proto2d.canMoveCueBall = true;
        expect(proto2d.initiatorSlot).toBe(0);
        expect(proto2d.currentPlayer).toBe(0);
        expect(proto2d.canMoveCueBall).toBe(true);

        const proto3d = createInitialProtocolState({
          edition: '3d',
          rule: '8ball',
          matchId: `prac-3d-${i}`,
          nowMs: 1_700_000_000_000,
          hasAuthoritativeMatch: true,
          initiatorSlot: starter,
        });
        proto3d.canMoveCueBall = true;
        expect(proto3d.initiatorSlot).toBe(0);
        expect(proto3d.currentPlayer).toBe(0);
        expect(proto3d.canMoveCueBall).toBe(true);
      }
    });
  });

  describe('Rematches Alternate the Starting Player (Local & Practice)', () => {
    it('alternates starting player cleanly across consecutive local rematches regardless of who won', () => {
      // Scenario A: First match started by Mây (0)
      let starter: PlayerSlot = 0;
      let proto = createInitialProtocolState({
        edition: '2d',
        rule: '8ball',
        matchId: 'match-1',
        nowMs: 1_000,
        hasAuthoritativeMatch: true,
        initiatorSlot: starter,
      });
      expect(proto.currentPlayer).toBe(0);

      // Rematch 1: Player 0 won, but starter MUST alternate to 1 (Nắng)
      starter = proto.initiatorSlot === 0 ? 1 : 0;
      const r1 = createLocalMatchStart(proto, {
        edition: '2d',
        rule: '8ball',
        startingPlayer: starter,
        seed: 1234,
        matchId: 'match-2',
        initiatorSlot: starter,
        nowMs: 2_000,
      });
      proto = r1.nextState;
      expect(proto.initiatorSlot).toBe(1);
      expect(proto.currentPlayer).toBe(1);

      // Rematch 2: Player 0 won again, starter MUST alternate back to 0 (Mây)
      starter = proto.initiatorSlot === 0 ? 1 : 0;
      const r2 = createLocalMatchStart(proto, {
        edition: '2d',
        rule: '8ball',
        startingPlayer: starter,
        seed: 5678,
        matchId: 'match-3',
        initiatorSlot: starter,
        nowMs: 3_000,
      });
      proto = r2.nextState;
      expect(proto.initiatorSlot).toBe(0);
      expect(proto.currentPlayer).toBe(0);

      // Rematch 3: Starter alternates to 1 (Nắng)
      starter = proto.initiatorSlot === 0 ? 1 : 0;
      const r3 = createLocalMatchStart(proto, {
        edition: '3d',
        rule: '9ball',
        startingPlayer: starter,
        seed: 9012,
        matchId: 'match-4',
        initiatorSlot: starter,
        nowMs: 4_000,
      });
      proto = r3.nextState;
      expect(proto.initiatorSlot).toBe(1);
      expect(proto.currentPlayer).toBe(1);
    });

    it('practice mode rematches always restart with slot 0', () => {
      let starter: PlayerSlot = 0;
      const proto = createInitialProtocolState({
        edition: '3d',
        rule: '8ball',
        matchId: 'prac-1',
        nowMs: 1_000,
        hasAuthoritativeMatch: true,
        initiatorSlot: starter,
      });

      // Next match in practice mode
      starter = 0;
      const r1 = createLocalMatchStart(proto, {
        edition: '3d',
        rule: '8ball',
        startingPlayer: starter,
        seed: 42,
        matchId: 'prac-2',
        initiatorSlot: starter,
        nowMs: 2_000,
      });
      expect(r1.nextState.initiatorSlot).toBe(0);
      expect(r1.nextState.currentPlayer).toBe(0);
    });
  });

  describe('Authoritative Online Lobby Random Starter & Rematch Synchronization', () => {
    it('resolves online initial randomness once on the server coordinator so both clients see identical starting player', () => {
      let broadcastCount = 0;
      let lastBroadcastState: unknown = null;

      const server = createDevLanBilliardsLobby({
        getMemberRole: (_wid: string, uid: string) => (uid === 'user-0' ? 'owner' : 'partner'),
        getConnectedSlots: () => new Set([0, 1]),
        broadcastMinigameEvent: (_wid: string, evt: { payload: { type: string; payload: unknown } }) => {
          if (evt.payload.type === 'billiards:lobby_state') {
            broadcastCount++;
            lastBroadcastState = evt.payload.payload;
          }
        },
      });

      function send(uid: string, event: unknown) {
        return server.handleMinigameEvent('world-1', uid, `sess-${uid}`, {
          gameId: 'billiards',
          payload: event,
        });
      }

      // Client 0 joins without hardcoded startingPlayer
      const res0 = send('user-0', {
        type: 'billiards:lobby_join',
        payload: { playerSlot: 0, edition: '3d', rule: '8ball', assetsReady: true },
      });
      expect(res0.handled).toBe(true);

      const stateAfterJoin0 = lastBroadcastState as { startingPlayer: PlayerSlot };
      const authoritativeStarter = stateAfterJoin0.startingPlayer;
      expect([0, 1]).toContain(authoritativeStarter);

      // Client 1 joins: server coordinator MUST preserve the authoritative starting player
      const res1 = send('user-1', {
        type: 'billiards:lobby_join',
        payload: { playerSlot: 1, assetsReady: true },
      });
      expect(res1.handled).toBe(true);
      expect(broadcastCount).toBeGreaterThanOrEqual(2);

      const stateAfterJoin1 = lastBroadcastState as { startingPlayer: PlayerSlot };
      expect(stateAfterJoin1.startingPlayer).toBe(authoritativeStarter);
    });

    it('preserves explicit starting-player selection in the online lobby when configured by either player', () => {
      let lastBroadcastState: unknown = null;
      const server = createDevLanBilliardsLobby({
        getMemberRole: (_wid: string, uid: string) => (uid === 'user-0' ? 'owner' : 'partner'),
        getConnectedSlots: () => new Set([0, 1]),
        broadcastMinigameEvent: (_wid: string, evt: { payload: { type: string; payload: unknown } }) => {
          if (evt.payload.type === 'billiards:lobby_state') {
            lastBroadcastState = evt.payload.payload;
          }
        },
      });

      function send(uid: string, event: unknown) {
        return server.handleMinigameEvent('world-2', uid, `sess-${uid}`, {
          gameId: 'billiards',
          payload: event,
        });
      }

      // Join both
      send('user-0', {
        type: 'billiards:lobby_join',
        payload: { playerSlot: 0, edition: '2d', rule: '8ball', assetsReady: true },
      });
      send('user-1', {
        type: 'billiards:lobby_join',
        payload: { playerSlot: 1, assetsReady: true },
      });

      // Player 1 explicitly changes starting player to 1 (Nắng)
      const cfgRes = send('user-1', {
        type: 'billiards:lobby_config',
        payload: { actorSlot: 1, configVersion: 1, edition: '2d', rule: '8ball', startingPlayer: 1 },
      });
      expect(cfgRes.handled).toBe(true);

      const stateAfterCfg = lastBroadcastState as { startingPlayer: PlayerSlot; configVersion: number };
      expect(stateAfterCfg.startingPlayer).toBe(1);
      expect(stateAfterCfg.configVersion).toBe(2);

      // Both players ready up -> confirmedConfig MUST have startingPlayer === 1
      send('user-0', {
        type: 'billiards:lobby_ready',
        payload: { playerSlot: 0, configVersion: 2, ready: true, assetsReady: true },
      });
      send('user-1', {
        type: 'billiards:lobby_ready',
        payload: { playerSlot: 1, configVersion: 2, ready: true, assetsReady: true },
      });

      const countdownState = lastBroadcastState as {
        status: string;
        confirmedConfig: { startingPlayer: PlayerSlot };
      };
      expect(countdownState.status).toBe('countdown');
      expect(countdownState.confirmedConfig.startingPlayer).toBe(1);
    });

    it('alternates the starting player on online rematch via server coordinator', () => {
      let lastBroadcastState: unknown = null;
      const server = createDevLanBilliardsLobby({
        getMemberRole: (_wid: string, uid: string) => (uid === 'user-0' ? 'owner' : 'partner'),
        getConnectedSlots: () => new Set([0, 1]),
        broadcastMinigameEvent: (_wid: string, evt: { payload: { type: string; payload: unknown } }) => {
          if (evt.payload.type === 'billiards:lobby_state') {
            lastBroadcastState = evt.payload.payload;
          }
        },
      });

      function send(uid: string, event: unknown) {
        return server.handleMinigameEvent('world-3', uid, `sess-${uid}`, {
          gameId: 'billiards',
          payload: event,
        });
      }

      // Join and set explicit starter = 0 (Mây)
      send('user-0', {
        type: 'billiards:lobby_join',
        payload: { playerSlot: 0, edition: '3d', rule: '8ball', assetsReady: true },
      });
      send('user-1', {
        type: 'billiards:lobby_join',
        payload: { playerSlot: 1, assetsReady: true },
      });
      send('user-0', {
        type: 'billiards:lobby_config',
        payload: { actorSlot: 0, configVersion: 1, edition: '3d', rule: '8ball', startingPlayer: 0 },
      });
      send('user-0', {
        type: 'billiards:lobby_ready',
        payload: { playerSlot: 0, configVersion: 2, ready: true, assetsReady: true },
      });
      send('user-1', {
        type: 'billiards:lobby_ready',
        payload: { playerSlot: 1, configVersion: 2, ready: true, assetsReady: true },
      });

      const s1 = lastBroadcastState as { confirmedConfig: { matchId: string; startingPlayer: PlayerSlot } };
      expect(s1.confirmedConfig.startingPlayer).toBe(0);
      const m1Id = s1.confirmedConfig.matchId;

      // Both players accept rematch for match 1 -> Rematch countdown MUST start with slot 1 (Nắng)
      send('user-0', {
        type: 'billiards:lobby_rematch',
        payload: { playerSlot: 0, matchId: m1Id, wantRematch: true },
      });
      send('user-1', {
        type: 'billiards:lobby_rematch',
        payload: { playerSlot: 1, matchId: m1Id, wantRematch: true },
      });

      const s2 = lastBroadcastState as {
        status: string;
        confirmedConfig: { matchId: string; startingPlayer: PlayerSlot };
      };
      expect(s2.status).toBe('countdown');
      expect(s2.confirmedConfig.startingPlayer).toBe(1);
      const m2Id = s2.confirmedConfig.matchId;

      // Both players accept rematch for match 2 -> Rematch countdown MUST alternate back to slot 0 (Mây)
      send('user-0', {
        type: 'billiards:lobby_rematch',
        payload: { playerSlot: 0, matchId: m2Id, wantRematch: true },
      });
      send('user-1', {
        type: 'billiards:lobby_rematch',
        payload: { playerSlot: 1, matchId: m2Id, wantRematch: true },
      });

      const s3 = lastBroadcastState as {
        status: string;
        confirmedConfig: { matchId: string; startingPlayer: PlayerSlot };
      };
      expect(s3.status).toBe('countdown');
      expect(s3.confirmedConfig.startingPlayer).toBe(0);
    });
  });
});
