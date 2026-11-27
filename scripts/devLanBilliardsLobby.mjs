import crypto from 'node:crypto';

export const BILLIARDS_LOBBY_COUNTDOWN_MS = 2_500;
export const SERVER_LOBBY_SESSION_ID = 'server-lobby';

function makeEmptyPlayer() {
  return {
    joined: false,
    connected: false,
    ready: false,
    assetsReady: false,
    wantRematch: false,
  };
}

function makeLobbyRecord(worldId, nowMs) {
  return {
    worldId,
    lobbyId: `lobby-${worldId}`,
    configVersion: 1,
    status: 'idle',
    edition: '2d',
    rule: '8ball',
    startingPlayer: Math.random() < 0.5 ? 0 : 1,
    hasExplicitStartingPlayer: false,
    players: [makeEmptyPlayer(), makeEmptyPlayer()],
    confirmedConfig: null,
    activeMatchId: null,
    matchSeq: 0,
    scores: [0, 0],
    lastMatchSnapshot: null,
    endedMatchIds: new Set(),
    countdownTimer: null,
    lastInviteKey: null,
  };
}

function toWireLobbyState(rec, nowMs) {
  return {
    lobbyId: rec.lobbyId,
    configVersion: rec.configVersion,
    status: rec.status,
    edition: rec.edition,
    rule: rec.rule,
    startingPlayer: rec.startingPlayer,
    players: [{ ...rec.players[0] }, { ...rec.players[1] }],
    confirmedConfig: rec.confirmedConfig
      ? {
          ...rec.confirmedConfig,
          scores: [rec.confirmedConfig.scores[0], rec.confirmedConfig.scores[1]],
        }
      : null,
    activeMatchId: rec.activeMatchId,
    serverNowMs: nowMs,
  };
}

export function createDevLanBilliardsLobby({
  getMemberRole,
  getConnectedSlots,
  broadcastMinigameEvent,
}) {
  const lobbiesByWorld = new Map();
  const roomsById = new Map();
  let seqCounter = 1;

  function ensureLobby(worldId, lobbyId = null) {
    if (lobbyId && roomsById.has(lobbyId)) {
      const r = roomsById.get(lobbyId);
      syncConnectedFromRoom(r);
      return r;
    }
    let rec = lobbiesByWorld.get(worldId);
    if (!rec) {
      rec = makeLobbyRecord(worldId, Date.now());
      lobbiesByWorld.set(worldId, rec);
      roomsById.set(rec.lobbyId, rec);
    }
    syncConnectedFromRoom(rec);
    return rec;
  }

  function syncConnectedFromRoom(rec) {
    const connected = getConnectedSlots ? getConnectedSlots(rec.worldId) : new Set([0, 1]);
    rec.players[0].connected = connected.has(0);
    rec.players[1].connected = connected.has(1);
  }

  function clearCountdownTimer(rec) {
    if (rec.countdownTimer) {
      clearTimeout(rec.countdownTimer);
      rec.countdownTimer = null;
    }
  }

  function emitLobbyState(rec, excludeSessionId = null) {
    const nowMs = Date.now();
    const state = toWireLobbyState(rec, nowMs);
    broadcastMinigameEvent(
      rec.worldId,
      {
        type: 'MINIGAME_EVENT',
        gameId: 'billiards',
        matchId: rec.activeMatchId || rec.lobbyId,
        worldId: rec.worldId,
        actorUserId: 'server',
        sessionId: SERVER_LOBBY_SESSION_ID,
        seq: seqCounter++,
        stateVersion: rec.configVersion,
        payload: {
          type: 'billiards:lobby_state',
          payload: state,
        },
      },
      excludeSessionId,
    );
  }

  function startCountdown(rec, startingPlayer, nowMs) {
    clearCountdownTimer(rec);
    rec.matchSeq = Math.max(1, rec.matchSeq + 1);
    const matchId = `m-${crypto.randomUUID()}`;
    const rackSeed = Math.floor(Math.random() * 1e9);
    const startAtServerMs = nowMs + BILLIARDS_LOBBY_COUNTDOWN_MS;

    rec.status = 'countdown';
    rec.activeMatchId = matchId;
    rec.confirmedConfig = {
      matchId,
      matchSeq: rec.matchSeq,
      edition: rec.edition,
      rule: rec.rule,
      rackSeed,
      startingPlayer,
      startAtServerMs,
      countdownMs: BILLIARDS_LOBBY_COUNTDOWN_MS,
      serverConfirmedAtMs: nowMs,
      scores: [rec.scores[0], rec.scores[1]],
    };

    rec.countdownTimer = setTimeout(() => {
      rec.countdownTimer = null;
      if (rec.status !== 'countdown' || !rec.confirmedConfig || rec.confirmedConfig.matchId !== matchId) {
        return;
      }
      rec.status = 'in_match';
      rec.players[0].wantRematch = false;
      rec.players[1].wantRematch = false;
      emitLobbyState(rec);
    }, BILLIARDS_LOBBY_COUNTDOWN_MS);
    rec.countdownTimer.unref?.();
  }

  function cancelCountdownToLobby(rec) {
    clearCountdownTimer(rec);
    if (rec.status === 'countdown') {
      rec.status = 'lobby';
      rec.confirmedConfig = null;
      rec.activeMatchId = null;
    }
  }

  function clearCountdownToLobby(rec) {
    cancelCountdownToLobby(rec);
  }

  function handleConnectionChange(worldId) {
    const rec = lobbiesByWorld.get(worldId);
    if (!rec) return;
    const prev0 = rec.players[0].connected;
    const prev1 = rec.players[1].connected;
    syncConnectedFromRoom(rec);

    if (prev0 === rec.players[0].connected && prev1 === rec.players[1].connected) {
      return;
    }

    if (rec.status === 'countdown' && (!rec.players[0].connected || !rec.players[1].connected)) {
      cancelCountdownToLobby(rec);
      if (!rec.players[0].connected) rec.players[0].ready = false;
      if (!rec.players[1].connected) rec.players[1].ready = false;
    } else if (rec.status === 'lobby') {
      if (!rec.players[0].connected) rec.players[0].ready = false;
      if (!rec.players[1].connected) rec.players[1].ready = false;
    }
    // Note: if rec.status === 'in_match', NEVER reset status or activeMatchId on disconnect!
    emitLobbyState(rec);
  }

  function slotFromUser(worldId, userId) {
    const role = getMemberRole ? getMemberRole(worldId, userId) : null;
    if (role === 'partner') return 1;
    if (role === 'owner') return 0;
    return null;
  }

  /**
   * Handles incoming minigame_event packets for gameId === 'billiards'.
   * Returns `{ handled: true, relayToPeer: boolean }`.
   */
  function handleMinigameEvent(worldId, userId, sessionId, packet) {
    try {
      if (!packet || packet.gameId !== 'billiards' || !packet.payload || typeof packet.payload !== 'object') {
        return { handled: false, relayToPeer: true };
      }
      const actorSlot = slotFromUser(worldId, userId);
      if (actorSlot === null) {
        return { handled: true, relayToPeer: false };
      }

      const evt = packet.payload;
      const type = evt.type;
      const p = evt.payload;
      if (!type || !p || typeof p !== 'object') {
        return { handled: false, relayToPeer: true };
      }

      const rec = ensureLobby(worldId, typeof p.lobbyId === 'string' ? p.lobbyId : null);
      const nowMs = Date.now();

    if (type === 'billiards:lobby_sync_request') {
      emitLobbyState(rec);
      return { handled: true, relayToPeer: false };
    }

    if (type === 'billiards:lobby_join') {
      const wasIdle = rec.status === 'idle';
      const other = rec.players[actorSlot === 0 ? 1 : 0];
      rec.players[actorSlot].joined = true;
      rec.players[actorSlot].connected = true;
      if (typeof p.assetsReady === 'boolean') {
        rec.players[actorSlot].assetsReady = p.assetsReady;
      }
      if (wasIdle && !other.joined) {
        if (p.edition === '2d' || p.edition === '3d') rec.edition = p.edition;
        if (p.rule === '8ball' || p.rule === '9ball') rec.rule = p.rule;
        if ((p.startingPlayer === 0 || p.startingPlayer === 1) && p.hasExplicitStartingPlayer) {
          rec.startingPlayer = p.startingPlayer;
          rec.hasExplicitStartingPlayer = true;
        }
      }
      if (rec.status === 'idle') rec.status = 'lobby';
      emitLobbyState(rec);
      return { handled: true, relayToPeer: false };
    }

    if (type === 'billiards:lobby_invite') {
      rec.players[actorSlot].joined = true;
      rec.players[actorSlot].connected = true;
      if (rec.status === 'idle') {
        if (p.edition === '2d' || p.edition === '3d') rec.edition = p.edition;
        if (p.rule === '8ball' || p.rule === '9ball') rec.rule = p.rule;
        rec.status = 'lobby';
      }
      emitLobbyState(rec);
      // Relay invite packet to peer so their overworld UI pops the invite toast
      return { handled: true, relayToPeer: true };
    }

    if (type === 'billiards:lobby_config') {
      if (rec.status === 'in_match') {
        emitLobbyState(rec);
        return { handled: true, relayToPeer: false };
      }
      if (!rec.players[actorSlot].joined || Number(p.configVersion) < rec.configVersion) {
        emitLobbyState(rec);
        return { handled: true, relayToPeer: false };
      }
      const nextEdition = p.edition === '3d' ? '3d' : '2d';
      const nextRule = p.rule === '9ball' ? '9ball' : '8ball';
      const nextStart = p.startingPlayer === 1 ? 1 : 0;
      const editionChanged = rec.edition !== nextEdition;
      cancelCountdownToLobby(rec);
      rec.configVersion += 1;
      rec.edition = nextEdition;
      rec.rule = nextRule;
      rec.startingPlayer = nextStart;
      rec.hasExplicitStartingPlayer = true;
      rec.status = 'lobby';
      for (const pl of rec.players) {
        pl.ready = false;
        pl.wantRematch = false;
        if (editionChanged) pl.assetsReady = false;
      }
      emitLobbyState(rec);
      return { handled: true, relayToPeer: false };
    }

    if (type === 'billiards:lobby_ready') {
      if (rec.status === 'in_match') {
        emitLobbyState(rec);
        return { handled: true, relayToPeer: false };
      }
      if (!rec.players[actorSlot].joined || Number(p.configVersion) !== rec.configVersion) {
        emitLobbyState(rec);
        return { handled: true, relayToPeer: false };
      }
      const assetsReady = Boolean(p.assetsReady);
      const wantReady = Boolean(p.ready) && assetsReady;
      rec.players[actorSlot].assetsReady = assetsReady;
      rec.players[actorSlot].ready = wantReady;
      rec.players[actorSlot].connected = true;

      if (!wantReady && rec.status === 'countdown') {
        cancelCountdownToLobby(rec);
        emitLobbyState(rec);
        return { handled: true, relayToPeer: false };
      }

      const p0 = rec.players[0];
      const p1 = rec.players[1];
      if (
        rec.status === 'lobby' &&
        p0.joined &&
        p0.connected &&
        p0.ready &&
        p0.assetsReady &&
        p1.joined &&
        p1.connected &&
        p1.ready &&
        p1.assetsReady
      ) {
        startCountdown(rec, rec.startingPlayer, nowMs);
      }
      emitLobbyState(rec);
      return { handled: true, relayToPeer: false };
    }

    if (type === 'billiards:lobby_leave') {
      if (p.reason === 'new_lobby') {
        cancelCountdownToLobby(rec);
        const oldRec = rec;
        const newRec = makeLobbyRecord(worldId, nowMs);
        newRec.lobbyId = `lobby-${worldId}-${crypto.randomUUID().slice(0, 8)}`;
        newRec.status = 'lobby';
        newRec.scores = [0, 0];
        newRec.matchSeq = 0;
        newRec.players[actorSlot].joined = true;
        newRec.players[actorSlot].connected = true;
        newRec.players[actorSlot === 0 ? 1 : 0].connected = oldRec.players[actorSlot === 0 ? 1 : 0].connected;
        lobbiesByWorld.set(worldId, newRec);
        roomsById.set(newRec.lobbyId, newRec);
        emitLobbyState(newRec);
        return { handled: true, relayToPeer: false };
      } else if (p.reason === 'cancel') {
        rec.players[actorSlot].ready = false;
        rec.players[actorSlot].wantRematch = false;
        cancelCountdownToLobby(rec);
      } else {
        rec.players[actorSlot].joined = false;
        rec.players[actorSlot].ready = false;
        rec.players[actorSlot].wantRematch = false;
        cancelCountdownToLobby(rec);
        if (!rec.players[0].joined && !rec.players[1].joined) {
          rec.status = 'idle';
          rec.confirmedConfig = null;
          rec.activeMatchId = null;
          rec.lastMatchSnapshot = null;
          rec.startingPlayer = Math.random() < 0.5 ? 0 : 1;
          rec.hasExplicitStartingPlayer = false;
        }
      }
      emitLobbyState(rec);
      return { handled: true, relayToPeer: false };
    }

    if (type === 'billiards:lobby_rematch') {
      const matchId = String(p.matchId ?? '');
      const isValidMatchRef =
        !matchId ||
        rec.activeMatchId === matchId ||
        rec.confirmedConfig?.matchId === matchId ||
        rec.endedMatchIds.has(matchId) ||
        rec.status === 'lobby';

      if (!isValidMatchRef) {
        emitLobbyState(rec);
        return { handled: true, relayToPeer: false };
      }

      // Guard against concurrent or duplicate rematch requests if already counting down for next match
      if (rec.status === 'countdown' && rec.confirmedConfig && rec.confirmedConfig.matchId !== matchId) {
        emitLobbyState(rec);
        return { handled: true, relayToPeer: false };
      }

      rec.players[actorSlot].joined = true;
      rec.players[actorSlot].connected = true;
      rec.players[actorSlot].wantRematch = Boolean(p.wantRematch);
      const p0 = rec.players[0];
      const p1 = rec.players[1];
      if (
        p0.connected &&
        p1.connected &&
        p0.wantRematch &&
        p1.wantRematch &&
        p0.assetsReady &&
        p1.assetsReady
      ) {
        const nextStarter = (rec.confirmedConfig?.startingPlayer ?? rec.startingPlayer) === 0 ? 1 : 0;
        rec.startingPlayer = nextStarter;
        rec.hasExplicitStartingPlayer = true;
        p0.wantRematch = false;
        p1.wantRematch = false;
        p0.ready = true;
        p1.ready = true;
        startCountdown(rec, nextStarter, nowMs);
      }
      emitLobbyState(rec);
      return { handled: true, relayToPeer: false };
    }

    // Track active match lifecycle & snapshot cache for reconnect recovery
    if (type === 'billiards:start') {
      clearCountdownTimer(rec);
      rec.status = 'in_match';
      rec.edition = p.edition === '3d' ? '3d' : '2d';
      rec.rule = p.rule === '9ball' ? '9ball' : '8ball';
      rec.activeMatchId = p.matchId ?? rec.activeMatchId;
      rec.matchSeq = Math.max(rec.matchSeq, Number(p.matchSeq) || 1);
      if (Array.isArray(p.scores) && p.scores.length === 2) {
        rec.scores = [
          Math.max(rec.scores[0], Number(p.scores[0]) || 0),
          Math.max(rec.scores[1], Number(p.scores[1]) || 0),
        ];
      }
      rec.players[actorSlot].joined = true;
      rec.players[actorSlot].connected = true;
      return { handled: true, relayToPeer: true };
    }

    if (type === 'billiards:settled') {
      if (p.winner) {
        rec.endedMatchIds.add(p.matchId);
        if (Array.isArray(p.scores) && p.scores.length === 2) {
          rec.scores = [Number(p.scores[0]) || 0, Number(p.scores[1]) || 0];
        }
        if (rec.activeMatchId === p.matchId || rec.status === 'in_match') {
          rec.activeMatchId = null;
          rec.status = 'lobby';
          for (const pl of rec.players) {
            pl.ready = false;
            pl.wantRematch = false;
          }
        }
        if (rec.lastMatchSnapshot && rec.lastMatchSnapshot.matchId === p.matchId) {
          rec.lastMatchSnapshot.winner = p.winner;
        }
        emitLobbyState(rec);
      }
      return { handled: true, relayToPeer: true };
    }

    if (type === 'billiards:state_snapshot') {
      if (
        !rec.lastMatchSnapshot ||
        (Number(p.matchSeq) || 0) > (Number(rec.lastMatchSnapshot.matchSeq) || 0) ||
        (p.matchId === rec.lastMatchSnapshot.matchId &&
          (Number(p.stateVersion) || 0) >= (Number(rec.lastMatchSnapshot.stateVersion) || 0))
      ) {
        rec.lastMatchSnapshot = p;
        if (p.winner) {
          rec.endedMatchIds.add(p.matchId);
          if (rec.activeMatchId === p.matchId || rec.status === 'in_match') {
            rec.activeMatchId = null;
            rec.status = 'lobby';
            for (const pl of rec.players) {
              pl.ready = false;
              pl.wantRematch = false;
            }
            emitLobbyState(rec);
          }
        } else if (rec.status === 'in_match' || rec.status === 'countdown') {
          rec.activeMatchId = p.matchId ?? rec.activeMatchId;
        }
      }
      return { handled: true, relayToPeer: true };
    }

    if (type === 'billiards:state_request') {
      // Relay to live peer AND if peer is disconnected while we have a cached snapshot, respond directly
      const otherSlot = actorSlot === 0 ? 1 : 0;
      const otherConnected = rec.players[otherSlot].connected;
      if (!otherConnected && rec.lastMatchSnapshot && rec.status === 'in_match') {
        const snap = rec.lastMatchSnapshot;
        if (
          !p.currentMatchId ||
          snap.matchId !== p.currentMatchId ||
          (Number(snap.stateVersion) || 0) > (Number(p.currentStateVersion) || 0)
        ) {
          broadcastMinigameEvent(
            worldId,
            {
              type: 'MINIGAME_EVENT',
              gameId: 'billiards',
              matchId: snap.matchId,
              worldId,
              actorUserId: 'server',
              sessionId: SERVER_LOBBY_SESSION_ID,
              seq: seqCounter++,
              stateVersion: Number(snap.stateVersion) || 0,
              payload: {
                type: 'billiards:state_snapshot',
                payload: snap,
              },
            },
            null,
          );
        }
      }
      return { handled: true, relayToPeer: true };
    }

      return { handled: false, relayToPeer: true };
    } catch (err) {
      console.error('[devLanBilliardsLobby] uncaught error in minigame event:', err);
      return { handled: true, relayToPeer: false };
    }
  }

  function resetWorld(worldId) {
    const rec = lobbiesByWorld.get(worldId);
    if (rec) {
      clearCountdownTimer(rec);
      lobbiesByWorld.delete(worldId);
      roomsById.delete(rec.lobbyId);
    }
  }

  function closeAll() {
    for (const rec of roomsById.values()) {
      clearCountdownTimer(rec);
    }
    for (const rec of lobbiesByWorld.values()) {
      clearCountdownTimer(rec);
    }
    roomsById.clear();
    lobbiesByWorld.clear();
  }

  return {
    handleMinigameEvent,
    handleConnectionChange,
    resetWorld,
    closeAll,
    getLobbyDebugState(worldId) {
      const rec = lobbiesByWorld.get(worldId);
      return rec ? toWireLobbyState(rec, Date.now()) : null;
    },
  };
}
