import crypto from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { createDevLanBilliardsLobby } from './devLanBilliardsLobby.mjs';

const MAP_PIXEL_BOUNDS = new Map([
  ['home', { maxW: 16 * 16, maxH: 12 * 16 }],
  ['garden', { maxW: 18 * 16, maxH: 14 * 16 }],
  ['outdoor', { maxW: 64 * 16, maxH: 64 * 16 }],
  ['village', { maxW: 86 * 16, maxH: 48 * 16 }],
  ['farm', { maxW: 64 * 16, maxH: 44 * 16 }],
  ['forest', { maxW: 28 * 16, maxH: 40 * 16 }],
  ['beach', { maxW: 56 * 16, maxH: 36 * 16 }],
  ['shop', { maxW: 24 * 16, maxH: 18 * 16 }],
  ['shop_seed', { maxW: 24 * 16, maxH: 18 * 16 }],
  ['shop_tool', { maxW: 24 * 16, maxH: 18 * 16 }],
  ['shop_crop_market', { maxW: 24 * 16, maxH: 18 * 16 }],
  ['shop_town_hall', { maxW: 24 * 16, maxH: 18 * 16 }],
]);

const VALID_FACING = new Set(['up', 'down', 'left', 'right']);
const VALID_POSTURES = new Set([
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
]);
const VALID_MUTATION_REASONS = new Set([
  'furniture',
  'profile',
  'member',
  'inventory',
  'pet',
  'study',
  'mailbox',
  'farm',
]);

const PARTNER_B_DEV_ID = '22222222-2222-4222-8222-222222222222';

export function isValidMapId(mapId) {
  return MAP_PIXEL_BOUNDS.has(mapId);
}

export function isPositionWithinMapBounds(mapId, x, y) {
  const bounds = MAP_PIXEL_BOUNDS.get(mapId);
  if (!bounds) return false;
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= bounds.maxW && y <= bounds.maxH;
}

function sendWsJson(ws, frame) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(frame));
  } catch {
    // Ignore transient closed socket write
  }
}

function sendSseFrame(res, event, data) {
  if (!res || res.writableEnded || res.destroyed) return;
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Ignore write to closing SSE stream
  }
}

export function createDevLanWsHub({
  isWorldMember,
  getMemberRole,
  getProfile,
  getWorldStateMeta,
  heartbeatIntervalMs = 5_000,
  maxMissedPongs = 2,
  disconnectGraceMs = 4_500,
  sseGraceMs = 2_500,
  sseKeepaliveMs = 8_000,
} = {}) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
  });

  /**
   * Authoritative rooms keyed by worldId:
   * - serverSeq: monotonic per room
   * - presenceSeq: monotonic per room
   * - slots: Map<sessionId, slot>
   * - lastMovementByUser: Map<userId, MovementPacket>
   * - lastSeqBySession: Map<sessionId, number>
   * - supersededConnectionIds: Set<string>
   * - latestConnectionSeqBySession: Map<sessionId, number>
   */
  const rooms = new Map();

  function getConnectedSlots(worldId) {
    const room = rooms.get(worldId);
    const out = new Set();
    if (!room) return out;
    for (const slot of room.slots.values()) {
      if (slot.closing || slot.superseded) continue;
      const role = getMemberRole ? getMemberRole(worldId, slot.userId) : slot.userId === PARTNER_B_DEV_ID ? 'partner' : 'owner';
      out.add(role === 'partner' ? 1 : 0);
    }
    return out;
  }

  const billiardsLobby = createDevLanBilliardsLobby({
    getMemberRole: getMemberRole ?? ((_worldId, uid) => (uid === PARTNER_B_DEV_ID ? 'partner' : 'owner')),
    getConnectedSlots,
    broadcastMinigameEvent: (worldId, packet, excludeSessionId = null) => {
      broadcastEvent(worldId, 'minigame_event', packet, excludeSessionId);
    },
  });

  function ensureRoom(worldId) {
    let room = rooms.get(worldId);
    if (!room) {
      room = {
        worldId,
        serverSeq: 0,
        presenceSeq: 0,
        slots: new Map(),
        lastMovementByUser: new Map(),
        lastSeqBySession: new Map(),
        supersededConnectionIds: new Set(),
        latestConnectionSeqBySession: new Map(),
      };
      rooms.set(worldId, room);
    }
    return room;
  }

  function nextServerSeq(room) {
    room.serverSeq += 1;
    return room.serverSeq;
  }

  function nextPresenceSeq(room) {
    room.presenceSeq += 1;
    return room.presenceSeq;
  }

  function sanitizePresence(room, userId, sessionId, raw, fallback) {
    const profile = getProfile(userId);
    const rawMap = String(raw?.mapId ?? fallback?.mapId ?? 'home');
    const mapId = isValidMapId(rawMap) ? rawMap : 'home';
    const facing = VALID_FACING.has(raw?.facing) ? raw.facing : fallback?.facing ?? 'down';
    const posture = VALID_POSTURES.has(raw?.posture) ? raw.posture : fallback?.posture ?? 'none';

    const hasPx =
      typeof raw?.x === 'number' &&
      typeof raw?.y === 'number' &&
      isPositionWithinMapBounds(mapId, raw.x, raw.y);
    const keepFallbackPx =
      !hasPx &&
      fallback &&
      fallback.mapId === mapId &&
      typeof fallback.x === 'number' &&
      typeof fallback.y === 'number';

    const x = hasPx ? raw.x : keepFallbackPx ? fallback.x : undefined;
    const y = hasPx ? raw.y : keepFallbackPx ? fallback.y : undefined;
    const tileX =
      typeof raw?.tileX === 'number' && Number.isFinite(raw.tileX)
        ? Math.floor(raw.tileX)
        : x !== undefined
          ? Math.floor(x / 16)
          : fallback?.tileX ?? 8;
    const tileY =
      typeof raw?.tileY === 'number' && Number.isFinite(raw.tileY)
        ? Math.floor(raw.tileY)
        : y !== undefined
          ? Math.floor(y / 16)
          : fallback?.tileY ?? 9;

    const heldItemSku =
      raw?.heldItemSku === null || typeof raw?.heldItemSku === 'string'
        ? raw.heldItemSku
        : fallback?.heldItemSku ?? null;
    const heldItemKind =
      typeof raw?.heldItemKind === 'string' ? raw.heldItemKind : fallback?.heldItemKind;
    const heldIconId =
      raw?.heldIconId === null || typeof raw?.heldIconId === 'string'
        ? raw.heldIconId
        : fallback?.heldIconId ?? null;
    const heldPropsIconId =
      raw?.heldPropsIconId === null || typeof raw?.heldPropsIconId === 'string'
        ? raw.heldPropsIconId
        : fallback?.heldPropsIconId ?? null;

    return {
      userId,
      sessionId,
      mapId,
      nickname: profile.nickname,
      avatarConfig: profile.avatarConfig,
      tileX,
      tileY,
      ...(x !== undefined && y !== undefined ? { x, y } : {}),
      facing,
      posture,
      ...(heldItemSku !== undefined ? { heldItemSku } : {}),
      ...(heldItemKind !== undefined ? { heldItemKind } : {}),
      ...(heldIconId !== undefined ? { heldIconId } : {}),
      ...(heldPropsIconId !== undefined ? { heldPropsIconId } : {}),
      updatedAtMs: Date.now(),
      presenceSeq: nextPresenceSeq(room),
    };
  }

  function buildAuthoritativePresences(worldId) {
    const room = rooms.get(worldId);
    if (!room) return [];
    const byUser = new Map();
    for (const slot of room.slots.values()) {
      if (!slot.presence) continue;
      const prev = byUser.get(slot.userId);
      if (
        !prev ||
        (prev.closing && !slot.closing) ||
        (prev.closing === slot.closing &&
          (slot.presence.presenceSeq ?? 0) >= (prev.presence.presenceSeq ?? 0))
      ) {
        byUser.set(slot.userId, slot);
      }
    }
    return Array.from(byUser.values()).map((s) => s.presence);
  }

  function buildReplayMovements(worldId, excludeUserId) {
    const room = rooms.get(worldId);
    if (!room) return [];
    const out = [];
    for (const [peerUserId, pkt] of room.lastMovementByUser.entries()) {
      if (peerUserId === excludeUserId) continue;
      out.push({ ...pkt, isSnapshotReplay: true });
    }
    return out;
  }

  function broadcastPresenceSync(worldId) {
    const room = rooms.get(worldId);
    if (!room) return;
    const list = buildAuthoritativePresences(worldId);
    const meta = getWorldStateMeta(worldId);
    const seq = nextServerSeq(room);
    for (const slot of room.slots.values()) {
      if (slot.closing || slot.superseded) continue;
      if (slot.transport === 'ws') {
        sendWsJson(slot.ws, {
          type: 'presence_sync',
          serverSeq: seq,
          stateVersion: meta.stateVersion,
          presences: list,
        });
      } else if (slot.transport === 'sse') {
        sendSseFrame(slot.res, 'presence_sync', list);
      }
    }
  }

  function broadcastEvent(worldId, event, data, excludeSessionId = null) {
    const room = rooms.get(worldId);
    if (!room) return;
    const meta = getWorldStateMeta(worldId);
    const seq = nextServerSeq(room);

    let wsFrame = null;
    if (event === 'movement') {
      wsFrame = { type: 'movement', serverSeq: seq, packet: data };
    } else if (event === 'world_mutated') {
      wsFrame = {
        type: 'world_mutated',
        serverSeq: seq,
        stateVersion: data?.stateVersion ?? meta.stateVersion,
        domainVersions: data?.domainVersions ?? meta.domainVersions,
        reason: data?.reason ?? 'furniture',
      };
    } else if (event === 'couple_event') {
      wsFrame = { type: 'couple_event', serverSeq: seq, packet: data };
    } else if (event === 'pet_care_session') {
      wsFrame = { type: 'pet_care_session', serverSeq: seq, packet: data };
    } else if (event === 'donor_fishing_sync') {
      wsFrame = { type: 'donor_fishing_sync', serverSeq: seq, session: data };
    } else if (event === 'minigame_event') {
      wsFrame = { type: 'minigame_event', serverSeq: seq, packet: data };
    } else if (event === 'world_reset') {
      wsFrame = { type: 'world_reset', serverSeq: seq, stateVersion: meta.stateVersion };
    }

    for (const slot of room.slots.values()) {
      if (slot.closing || slot.superseded) continue;
      if (excludeSessionId && slot.sessionId === excludeSessionId) continue;
      if (slot.transport === 'ws' && wsFrame) {
        sendWsJson(slot.ws, wsFrame);
      } else if (slot.transport === 'sse') {
        sendSseFrame(slot.res, event, data);
      }
    }
  }

  function sendWelcomeSnapshot(room, slot) {
    const meta = getWorldStateMeta(room.worldId);
    const presences = buildAuthoritativePresences(room.worldId);
    const latestMovements = buildReplayMovements(room.worldId, slot.userId);
    sendWsJson(slot.ws, {
      type: 'welcome',
      sessionId: slot.sessionId,
      connectionId: slot.connectionId,
      serverSeq: nextServerSeq(room),
      serverNowMs: Date.now(),
      stateVersion: meta.stateVersion,
      domainVersions: meta.domainVersions,
      presences,
      latestMovements,
    });
  }

  function clearSlotGraceTimer(slot) {
    if (slot?.graceTimer) {
      clearTimeout(slot.graceTimer);
      slot.graceTimer = null;
    }
    if (slot?.initialBroadcastTimer) {
      clearTimeout(slot.initialBroadcastTimer);
      slot.initialBroadcastTimer = null;
    }
  }

  function supersedeSlot(room, oldSlot, reason = 'replaced_by_newer_session') {
    if (!oldSlot) return;
    clearSlotGraceTimer(oldSlot);
    oldSlot.superseded = true;
    oldSlot.closing = true;
    room.supersededConnectionIds.add(oldSlot.connectionId);
    if (room.supersededConnectionIds.size > 128) {
      const first = room.supersededConnectionIds.values().next().value;
      if (first) room.supersededConnectionIds.delete(first);
    }
    if (oldSlot.transport === 'ws' && oldSlot.ws) {
      sendWsJson(oldSlot.ws, { type: 'session_replaced', reason });
      try {
        if (oldSlot.ws.readyState === WebSocket.OPEN || oldSlot.ws.readyState === WebSocket.CONNECTING) {
          oldSlot.ws.close(4001, reason);
        }
      } catch {
        oldSlot.ws.terminate?.();
      }
    } else if (oldSlot.transport === 'sse' && oldSlot.res) {
      try {
        oldSlot.res.end();
      } catch {
        // Ignore end error
      }
    }
  }

  function handleClientMovement(room, userId, sessionId, payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (payload.worldId !== room.worldId || payload.userId !== userId || payload.sessionId !== sessionId) {
      return false;
    }
    if (!isValidMapId(payload.mapId) || !isPositionWithinMapBounds(payload.mapId, payload.x, payload.y)) {
      return false;
    }
    if (!VALID_FACING.has(payload.facing) || !['idle', 'walk'].includes(payload.anim)) {
      return false;
    }
    const seq = Number(payload.seq);
    if (!Number.isInteger(seq) || seq < 0) return false;

    const prevSeq = room.lastSeqBySession.get(sessionId);
    if (prevSeq !== undefined && seq <= prevSeq) {
      return false;
    }
    room.lastSeqBySession.set(sessionId, seq);
    room.lastMovementByUser.set(userId, payload);

    const slot = room.slots.get(sessionId);
    let syncNeeded = false;
    if (slot && slot.userId === userId && slot.presence) {
      const prev = slot.presence;
      if (
        prev.mapId !== payload.mapId ||
        prev.posture !== (payload.posture ?? prev.posture) ||
        prev.heldItemSku !== (payload.heldItemSku !== undefined ? payload.heldItemSku : prev.heldItemSku)
      ) {
        syncNeeded = true;
      }
      slot.presence = {
        ...prev,
        mapId: payload.mapId,
        facing: payload.facing,
        x: payload.x,
        y: payload.y,
        tileX: Math.floor(payload.x / 16),
        tileY: Math.floor(payload.y / 16),
        ...(payload.posture !== undefined ? { posture: payload.posture } : {}),
        ...(payload.heldItemSku !== undefined ? { heldItemSku: payload.heldItemSku } : {}),
        ...(payload.heldItemKind !== undefined ? { heldItemKind: payload.heldItemKind } : {}),
        ...(payload.heldIconId !== undefined ? { heldIconId: payload.heldIconId } : {}),
        ...(payload.heldPropsIconId !== undefined ? { heldPropsIconId: payload.heldPropsIconId } : {}),
        updatedAtMs: Date.now(),
        presenceSeq: nextPresenceSeq(room),
      };
    }

    if (syncNeeded) {
      broadcastPresenceSync(room.worldId);
    }
    broadcastEvent(room.worldId, 'movement', payload, sessionId);
    return true;
  }

  function handleUpgrade(req, socket, head) {
    let reqUrl;
    try {
      reqUrl = new URL(req.url || '/', 'http://localhost');
    } catch {
      return false;
    }
    if (reqUrl.pathname !== '/api/dev-lan/ws') {
      return false;
    }

    const qWorldId = String(reqUrl.searchParams.get('worldId') ?? '').trim();
    const qUserId = String(reqUrl.searchParams.get('userId') ?? '').trim();
    const qSessionId = String(reqUrl.searchParams.get('sessionId') ?? '').trim();
    const isRemoteClient = req.headers['x-olw-remote-share'] === '1';

    if (!qWorldId || !qUserId || !qSessionId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return true;
    }
    if ((isRemoteClient && qUserId !== PARTNER_B_DEV_ID) || !isWorldMember(qWorldId, qUserId)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return true;
    }

    socket.setNoDelay?.(true);

    wss.handleUpgrade(req, socket, head, (ws) => {
      const room = ensureRoom(qWorldId);
      const connectionId = `conn-${crypto.randomUUID()}`;
      const existingSameSession = room.slots.get(qSessionId);
      const fallbackPresence =
        existingSameSession?.userId === qUserId ? existingSameSession.presence : null;

      // Supersede older slot on the same sessionId, plus any closing/grace slots on the same userId
      if (existingSameSession) {
        supersedeSlot(room, existingSameSession, 'replaced_by_reconnect');
        room.slots.delete(qSessionId);
      }
      for (const [sid, other] of room.slots.entries()) {
        if (other.userId === qUserId && other.closing) {
          clearSlotGraceTimer(other);
          room.slots.delete(sid);
        }
      }

      const rawConnSeq = Number(reqUrl.searchParams.get('connectionSeq') ?? 0);
      const prevConnSeq = room.latestConnectionSeqBySession.get(qSessionId) ?? 0;
      const connectionSeq = Number.isFinite(rawConnSeq) ? Math.max(prevConnSeq + 1, rawConnSeq) : prevConnSeq + 1;
      room.latestConnectionSeqBySession.set(qSessionId, connectionSeq);

      const qX = reqUrl.searchParams.get('x');
      const qY = reqUrl.searchParams.get('y');
      const initialPresence = sanitizePresence(
        room,
        qUserId,
        qSessionId,
        {
          mapId: reqUrl.searchParams.get('mapId') || 'home',
          tileX: Number(reqUrl.searchParams.get('tileX') ?? 8),
          tileY: Number(reqUrl.searchParams.get('tileY') ?? 9),
          ...(qX !== null ? { x: Number(qX) } : {}),
          ...(qY !== null ? { y: Number(qY) } : {}),
          facing: reqUrl.searchParams.get('facing') || 'down',
        },
        fallbackPresence,
      );

      const slot = {
        worldId: qWorldId,
        userId: qUserId,
        sessionId: qSessionId,
        connectionId,
        connectionSeq,
        transport: 'ws',
        ws,
        res: null,
        isAlive: true,
        missedPongs: 0,
        closing: false,
        superseded: false,
        helloReceived: false,
        presence: initialPresence,
        graceTimer: null,
        initialBroadcastTimer: null,
      };
      room.slots.set(qSessionId, slot);

      ws.on('pong', () => {
        slot.isAlive = true;
        slot.missedPongs = 0;
      });

      ws.on('message', (rawBuf) => {
        if (slot.superseded || room.supersededConnectionIds.has(connectionId)) {
          return;
        }
        slot.isAlive = true;
        slot.missedPongs = 0;

        let msg;
        try {
          msg = JSON.parse(String(rawBuf));
        } catch {
          return;
        }
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'ping') {
          const clientSentMonoMs = Number(msg.clientSentMonoMs);
          if (Number.isFinite(clientSentMonoMs) && clientSentMonoMs >= 0) {
            const meta = getWorldStateMeta(qWorldId);
            sendWsJson(ws, {
              type: 'pong',
              clientSentMonoMs,
              serverSeq: nextServerSeq(room),
              serverNowMs: Date.now(),
              stateVersion: meta.stateVersion,
            });
          }
          return;
        }

        if (msg.type === 'hello') {
          if (msg.worldId !== qWorldId || msg.userId !== qUserId || msg.sessionId !== qSessionId) {
            sendWsJson(ws, { type: 'error', code: 'FORBIDDEN', message: 'Phiên kết nối không khớp.' });
            return;
          }
          const helloSeq = Number(msg.connectionSeq ?? connectionSeq);
          const latestSeq = room.latestConnectionSeqBySession.get(qSessionId) ?? 0;
          if (Number.isFinite(helloSeq) && helloSeq < latestSeq) {
            ws.close(4001, 'stale_connection_seq');
            return;
          }
          if (Number.isFinite(helloSeq)) {
            slot.connectionSeq = helloSeq;
            room.latestConnectionSeqBySession.set(qSessionId, helloSeq);
          }
          slot.helloReceived = true;
          if (slot.initialBroadcastTimer) {
            clearTimeout(slot.initialBroadcastTimer);
            slot.initialBroadcastTimer = null;
          }
          if (msg.presence && typeof msg.presence === 'object') {
            slot.presence = sanitizePresence(room, qUserId, qSessionId, msg.presence, slot.presence);
          }
          sendWelcomeSnapshot(room, slot);
          broadcastPresenceSync(qWorldId);
          billiardsLobby.handleConnectionChange(qWorldId);
          return;
        }

        if (msg.type === 'resync_request') {
          sendWelcomeSnapshot(room, slot);
          return;
        }

        if (msg.type === 'presence' && msg.presence && typeof msg.presence === 'object') {
          slot.presence = sanitizePresence(room, qUserId, qSessionId, msg.presence, slot.presence);
          broadcastPresenceSync(qWorldId);
          return;
        }

        if (msg.type === 'movement' && msg.packet) {
          handleClientMovement(room, qUserId, qSessionId, msg.packet);
          return;
        }

        if (msg.type === 'world_mutated' && VALID_MUTATION_REASONS.has(msg.reason)) {
          broadcastEvent(qWorldId, 'world_mutated', { reason: msg.reason }, qSessionId);
          return;
        }

        if (msg.type === 'couple_event' && msg.packet && typeof msg.packet === 'object') {
          if (msg.packet.worldId === qWorldId) {
            broadcastEvent(qWorldId, 'couple_event', msg.packet, qSessionId);
          }
          return;
        }

        if (msg.type === 'pet_care_session' && msg.packet && typeof msg.packet === 'object') {
          if (msg.packet.worldId === qWorldId) {
            broadcastEvent(qWorldId, 'pet_care_session', msg.packet, qSessionId);
          }
          return;
        }

        if (msg.type === 'minigame_event' && msg.packet && typeof msg.packet === 'object') {
          if (msg.packet.worldId === qWorldId && msg.packet.actorUserId === qUserId) {
            const stamped = {
              ...msg.packet,
              worldId: qWorldId,
              actorUserId: qUserId,
              sessionId: qSessionId,
            };
            const lobbyRes = billiardsLobby.handleMinigameEvent(qWorldId, qUserId, qSessionId, stamped);
            if (lobbyRes.relayToPeer) {
              broadcastEvent(qWorldId, 'minigame_event', stamped, qSessionId);
            }
          }
        }
      });

      ws.on('close', (code) => {
        const cur = room.slots.get(qSessionId);
        if (!cur || cur.connectionId !== connectionId) return;
        if (cur.superseded) {
          room.slots.delete(qSessionId);
          return;
        }
        // Clean intentional close (1000) despawns immediately; abnormal drop enters reconnect grace.
        if (code === 1000) {
          clearSlotGraceTimer(cur);
          room.slots.delete(qSessionId);
          broadcastPresenceSync(qWorldId);
          billiardsLobby.handleConnectionChange(qWorldId);
          return;
        }
        cur.closing = true;
        clearSlotGraceTimer(cur);
        cur.graceTimer = setTimeout(() => {
          cur.graceTimer = null;
          const active = room.slots.get(qSessionId);
          if (active?.connectionId === connectionId && active.closing) {
            room.slots.delete(qSessionId);
            broadcastPresenceSync(qWorldId);
            billiardsLobby.handleConnectionChange(qWorldId);
          }
        }, disconnectGraceMs);
        cur.graceTimer.unref?.();
      });

      ws.on('error', () => {
        // Error is followed by close; handled by close listener
      });

      // Wait briefly for `hello` (exact coords/posture/heldItem) before broadcasting URL-derived initial presence,
      // avoiding a phantom partial presence frame when standard clients send `hello` right on open.
      slot.initialBroadcastTimer = setTimeout(() => {
        slot.initialBroadcastTimer = null;
        if (room.slots.get(qSessionId) === slot && !slot.helloReceived && !slot.closing && !slot.superseded) {
          broadcastPresenceSync(qWorldId);
        }
      }, 55);
      slot.initialBroadcastTimer.unref?.();
    });

    return true;
  }

  function handleSseStream(req, res, { worldId, userId, sessionId, reqUrl }) {
    const room = ensureRoom(worldId);
    const existing = room.slots.get(sessionId);
    const preserved = existing?.worldId === worldId && existing?.userId === userId ? existing.presence : null;

    if (existing) {
      clearSlotGraceTimer(existing);
      if (existing.transport === 'ws') {
        supersedeSlot(room, existing, 'replaced_by_sse');
      }
      room.slots.delete(sessionId);
    }

    const rawParamX = reqUrl.searchParams.get('x');
    const rawParamY = reqUrl.searchParams.get('y');
    const paramX = rawParamX !== null && Number.isFinite(Number(rawParamX)) ? Number(rawParamX) : undefined;
    const paramY = rawParamY !== null && Number.isFinite(Number(rawParamY)) ? Number(rawParamY) : undefined;
    const profile = getProfile(userId);
    const initialPresence = preserved
      ? {
          ...preserved,
          nickname: profile.nickname,
          avatarConfig: profile.avatarConfig,
          updatedAtMs: Date.now(),
          presenceSeq: nextPresenceSeq(room),
        }
      : sanitizePresence(
          room,
          userId,
          sessionId,
          {
            mapId: reqUrl.searchParams.get('mapId') || 'home',
            tileX: Number(reqUrl.searchParams.get('tileX') ?? 8) || 8,
            tileY: Number(reqUrl.searchParams.get('tileY') ?? 9) || 9,
            ...(paramX !== undefined && paramY !== undefined ? { x: paramX, y: paramY } : {}),
            facing: reqUrl.searchParams.get('facing') || 'down',
          },
          null,
        );

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.socket?.setNoDelay?.(true);
    res.flushHeaders?.();
    try {
      res.write('retry: 1500\n: connected\n\n');
    } catch {
      // Ignore write to already-closed stream
    }

    const connectionId = `sse-${crypto.randomUUID()}`;
    const slot = {
      worldId,
      userId,
      sessionId,
      connectionId,
      connectionSeq: 0,
      transport: 'sse',
      ws: null,
      res,
      isAlive: true,
      missedPongs: 0,
      closing: false,
      superseded: false,
      presence: initialPresence,
      graceTimer: null,
    };
    room.slots.set(sessionId, slot);

    broadcastPresenceSync(worldId);

    for (const pkt of buildReplayMovements(worldId, userId)) {
      sendSseFrame(res, 'movement', pkt);
    }

    req.on('close', () => {
      const cur = room.slots.get(sessionId);
      if (!cur || cur.connectionId !== connectionId) return;
      cur.closing = true;
      clearSlotGraceTimer(cur);
      cur.graceTimer = setTimeout(() => {
        cur.graceTimer = null;
        const active = room.slots.get(sessionId);
        if (active?.connectionId === connectionId && active.closing) {
          room.slots.delete(sessionId);
          broadcastPresenceSync(worldId);
        }
      }, sseGraceMs);
      cur.graceTimer.unref?.();
    });
  }

  function handleHttpRealtime(worldId, userId, sessionId, kind, payload) {
    const room = ensureRoom(worldId);
    if (kind === 'presence' && sessionId && payload) {
      const existing = room.slots.get(sessionId);
      const nextPresence = sanitizePresence(room, userId, sessionId, payload, existing?.presence ?? null);
      if (existing && existing.userId === userId) {
        existing.presence = nextPresence;
      } else {
        for (const s of room.slots.values()) {
          if (s.userId === userId) {
            s.presence = { ...nextPresence, sessionId: s.sessionId };
          }
        }
      }
      broadcastPresenceSync(worldId);
      return true;
    }

    if (kind === 'movement' && payload) {
      return handleClientMovement(room, userId, sessionId || payload.sessionId, payload);
    }

    if (kind === 'world_mutated') {
      broadcastEvent(worldId, 'world_mutated', payload ?? { reason: 'furniture' }, sessionId || null);
      return true;
    }

    if (kind === 'couple_event' && payload) {
      broadcastEvent(worldId, 'couple_event', payload, sessionId || null);
      return true;
    }

    if (kind === 'pet_care_session' && payload) {
      broadcastEvent(worldId, 'pet_care_session', payload, sessionId || null);
      return true;
    }

    if (kind === 'minigame_event' && payload && typeof payload === 'object') {
      const stamped = {
        ...payload,
        worldId,
        actorUserId: userId,
        sessionId: sessionId || payload.sessionId || '',
      };
      const lobbyRes = billiardsLobby.handleMinigameEvent(worldId, userId, sessionId || '', stamped);
      if (lobbyRes.relayToPeer) {
        broadcastEvent(worldId, 'minigame_event', stamped, sessionId || null);
      }
      return true;
    }

    if (kind === 'spike_cinema' && payload) {
      broadcastEvent(worldId, 'spike_cinema', payload, sessionId || null);
      return true;
    }

    return false;
  }

  function refreshUserProfile(worldId, userId) {
    const room = rooms.get(worldId);
    if (!room) return;
    const profile = getProfile(userId);
    for (const slot of room.slots.values()) {
      if (slot.userId === userId && slot.presence) {
        slot.presence = {
          ...slot.presence,
          nickname: profile.nickname,
          avatarConfig: profile.avatarConfig,
          updatedAtMs: Date.now(),
          presenceSeq: nextPresenceSeq(room),
        };
      }
    }
    broadcastPresenceSync(worldId);
  }

  function resetAllRooms(affectedWorldIds) {
    for (const wid of affectedWorldIds) {
      billiardsLobby.resetWorld(wid);
      broadcastEvent(wid, 'world_reset', { reset: true });
    }
    for (const room of rooms.values()) {
      for (const slot of room.slots.values()) {
        clearSlotGraceTimer(slot);
      }
      room.lastMovementByUser.clear();
      room.lastSeqBySession.clear();
    }
  }

  // Protocol-level WebSocket heartbeat (ws ping/pong) to prune dead half-open mobile sockets
  const wsHeartbeatTimer = setInterval(() => {
    for (const room of rooms.values()) {
      for (const slot of room.slots.values()) {
        if (slot.transport !== 'ws' || slot.closing || slot.superseded || !slot.ws) continue;
        if (slot.ws.readyState !== WebSocket.OPEN) continue;
        if (!slot.isAlive && slot.missedPongs >= maxMissedPongs) {
          try {
            slot.ws.terminate();
          } catch {
            // Ignore terminate error
          }
          continue;
        }
        slot.isAlive = false;
        slot.missedPongs += 1;
        try {
          slot.ws.ping();
        } catch {
          // Ignore ping error
        }
      }
    }
  }, heartbeatIntervalMs);
  wsHeartbeatTimer.unref?.();

  // Keepalive comments for SSE fallback streams
  const sseKeepaliveTimer = setInterval(() => {
    for (const room of rooms.values()) {
      for (const slot of room.slots.values()) {
        if (slot.transport !== 'sse' || slot.closing || !slot.res) continue;
        if (slot.res.writableEnded || slot.res.destroyed) continue;
        try {
          slot.res.write(': keepalive\n\n');
        } catch {
          // Ignore closing stream error
        }
      }
    }
  }, sseKeepaliveMs);
  sseKeepaliveTimer.unref?.();

  function closeAll() {
    billiardsLobby.closeAll();
    clearInterval(wsHeartbeatTimer);
    clearInterval(sseKeepaliveTimer);
    for (const room of rooms.values()) {
      for (const slot of room.slots.values()) {
        clearSlotGraceTimer(slot);
        if (slot.transport === 'ws' && slot.ws) {
          try {
            slot.ws.terminate();
          } catch {
            // Ignore
          }
        } else if (slot.transport === 'sse' && slot.res) {
          try {
            slot.res.end();
          } catch {
            // Ignore
          }
        }
      }
      room.slots.clear();
      room.lastMovementByUser.clear();
      room.lastSeqBySession.clear();
      room.supersededConnectionIds.clear();
      room.latestConnectionSeqBySession.clear();
    }
    rooms.clear();
    try {
      wss.close();
    } catch {
      // Ignore
    }
  }

  return {
    handleUpgrade,
    handleSseStream,
    handleHttpRealtime,
    broadcastPresenceSync,
    broadcastEvent,
    refreshUserProfile,
    resetAllRooms,
    closeAll,
    getBilliardsLobbyState(worldId) {
      return billiardsLobby.getLobbyDebugState(worldId);
    },
    getActivePlayerPosition(worldId, userId) {
      const room = rooms.get(worldId);
      if (!room || !Array.from(room.slots.values()).some((slot) => slot.userId === userId && !slot.closing)) return null;
      const present = buildAuthoritativePresences(worldId).find((entry) => entry.userId === userId);
      if (!present) return null;
      const slot = room.slots.get(present.sessionId);
      if (!slot || slot.closing || slot.superseded) return null;
      const packet = room.lastMovementByUser.get(userId);
      return packet?.mapId === present.mapId && packet.sessionId === present.sessionId
        ? { mapId: present.mapId, x: packet.x, y: packet.y, facing: packet.facing, connectionId: slot.connectionId }
        : { mapId: present.mapId };
    },
    getRoomDebugStats(worldId) {
      const room = rooms.get(worldId);
      if (!room) return null;
      return {
        worldId,
        serverSeq: room.serverSeq,
        slotCount: room.slots.size,
        activeSlots: Array.from(room.slots.values()).map((s) => ({
          userId: s.userId,
          sessionId: s.sessionId,
          transport: s.transport,
          closing: s.closing,
          mapId: s.presence?.mapId,
        })),
      };
    },
  };
}
