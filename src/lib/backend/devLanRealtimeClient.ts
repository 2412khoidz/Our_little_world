import type { CoupleEventPacket } from '../../shared/couple/coupleTypes';
import type { DonorFishSessionView } from '../../shared/donor/donorFishSessionTypes';
import { ReconnectBackoff } from '../../shared/netcode/backoff';
import {
  createInitialNetworkDiagnostics,
  RttJitterTracker,
  sanitizeSessionShort,
  type NetworkConnectionStatus,
  type NetworkDiagnosticsState,
  type TransportKind,
} from '../../shared/netcode/diagnostics';
import type { MinigameEventEnvelope } from '../../shared/netcode/minigameContract';
import { BoundedOutboundQueue } from '../../shared/netcode/outboundQueue';
import type { ClientWsFrame, ServerWsFrame } from '../../shared/netcode/protocol';
import { selectLatestPresenceByUser } from '../../shared/realtime';
import type { PetCareSessionEventPacket } from '../../shared/petLiving/petCare/sharedPetCareTypes';
import type {
  MovementPacket,
  PresencePayload,
  WorldMutationReason,
} from '../../shared/types';
import type { RealtimeHandle, RealtimeHandlers } from './types';

const HEARTBEAT_INTERVAL_MS = 2_500;
const WATCHDOG_TIMEOUT_MS = 6_500;
const WATCHDOG_CHECK_INTERVAL_MS = 1_000;
const CONNECT_TIMEOUT_MS = 6_000;
const LIVENESS_PROBE_TIMEOUT_MS = 1_200;
const DIAGNOSTICS_EMIT_THROTTLE_MS = 350;

export interface DevLanRealtimeOptions {
  worldId: string;
  initialPresence: PresencePayload;
  handlers: RealtimeHandlers;
  wsFactory?: (url: string) => WebSocket;
  eventSourceFactory?: (url: string) => EventSource;
}

export function createDevLanRealtimeConnection({
  worldId,
  initialPresence,
  handlers,
  wsFactory = (url) => new WebSocket(url),
  eventSourceFactory = (url) => new EventSource(url),
}: DevLanRealtimeOptions): RealtimeHandle {
  let simulatedOffline = false;
  let browserOffline = typeof navigator !== 'undefined' ? navigator.onLine === false : false;
  let closedManually = false;
  let onlineDebounceTimer: number | null = null;
  let supersededByServer = false;
  let currentPresence: PresencePayload = initialPresence;

  let activeWs: WebSocket | null = null;
  let activeSse: EventSource | null = null;
  let usingSseFallback = false;
  let consecutiveWsFailures = 0;

  let connectionSeq = 0;
  let hasWelcomedOnce = false;
  let currentStatus: NetworkConnectionStatus = 'disconnected';
  let transport: TransportKind = 'none';
  let reconnectCount = 0;
  let stateVersion = 0;
  let playerCount = 0;
  let remoteSessionShort: string | null = null;
  let remoteMapId = null as NetworkDiagnosticsState['remoteMapId'];
  let lastPacketReceivedAtMonoMs: number | null = null;

  let connectTimer: number | null = null;
  let reconnectTimer: number | null = null;
  let heartbeatTimer: number | null = null;
  let watchdogTimer: number | null = null;
  let diagThrottleTimer: number | null = null;
  let lastDiagEmitMonoMs = -Infinity;

  const pendingProbeResolvers = new Set<(alive: boolean) => void>();

  const backoff = new ReconnectBackoff({ minMs: 300, maxMs: 5000, factor: 1.8, jitter: 0.4 });
  const outboundQueue = new BoundedOutboundQueue<ClientWsFrame>(64);
  const rttTracker = new RttJitterTracker();

  const resolveWsTransportKind = (): 'wss' | 'ws' =>
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';

  const snapshotDiagnostics = (): NetworkDiagnosticsState => {
    const rtt = rttTracker.getStats();
    return createInitialNetworkDiagnostics({
      status: currentStatus,
      transport,
      rttMs: rtt.rttMs,
      smoothedRttMs: rtt.smoothedRttMs,
      jitterMs: rtt.jitterMs,
      lastPacketReceivedAtMonoMs,
      reconnectCount,
      playerCount,
      maxPlayers: 2,
      localSessionShort: sanitizeSessionShort(currentPresence.sessionId),
      localMapId: currentPresence.mapId,
      remoteSessionShort,
      remoteMapId,
      remoteRenderedOnMap: false,
      stateVersion,
      outboundQueueSize: outboundQueue.size(),
    });
  };

  const emitDiagnosticsNow = () => {
    if (diagThrottleTimer !== null) {
      window.clearTimeout(diagThrottleTimer);
      diagThrottleTimer = null;
    }
    lastDiagEmitMonoMs = performance.now();
    handlers.onDiagnosticsChange?.(snapshotDiagnostics());
  };

  const scheduleDiagnosticsEmit = (immediate = false) => {
    if (!handlers.onDiagnosticsChange) return;
    if (immediate) {
      emitDiagnosticsNow();
      return;
    }
    const now = performance.now();
    const elapsed = now - lastDiagEmitMonoMs;
    if (elapsed >= DIAGNOSTICS_EMIT_THROTTLE_MS) {
      emitDiagnosticsNow();
      return;
    }
    if (diagThrottleTimer === null) {
      diagThrottleTimer = window.setTimeout(() => {
        diagThrottleTimer = null;
        emitDiagnosticsNow();
      }, DIAGNOSTICS_EMIT_THROTTLE_MS - elapsed);
    }
  };

  const setStatus = (next: NetworkConnectionStatus) => {
    const changed = currentStatus !== next;
    currentStatus = next;
    if (changed) {
      handlers.onConnectionChange(next);
      scheduleDiagnosticsEmit(true);
    }
  };

  const resolvePendingProbes = (alive: boolean) => {
    if (pendingProbeResolvers.size === 0) return;
    const list = Array.from(pendingProbeResolvers);
    pendingProbeResolvers.clear();
    for (const resolve of list) resolve(alive);
  };

  const clearTimers = () => {
    if (connectTimer !== null) {
      window.clearTimeout(connectTimer);
      connectTimer = null;
    }
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (heartbeatTimer !== null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (watchdogTimer !== null) {
      window.clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  };

  const closeActiveSockets = (intentionalClose = false) => {
    const ws = activeWs;
    activeWs = null;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(intentionalClose ? 1000 : 4000, intentionalClose ? 'client_disconnect' : 'client_reset');
        }
      } catch {
        // Ignore close failure
      }
    }
    const sse = activeSse;
    activeSse = null;
    if (sse) {
      sse.close();
    }
  };

  const updatePresenceDiagnostics = (presences: PresencePayload[]) => {
    const uniqueUsers = new Set(presences.map((p) => p.userId));
    playerCount = uniqueUsers.size;
    const remoteMap = selectLatestPresenceByUser(presences, currentPresence.userId);
    const partner = remoteMap.values().next().value as PresencePayload | undefined;
    remoteSessionShort = partner ? sanitizeSessionShort(partner.sessionId) : null;
    remoteMapId = partner ? partner.mapId : null;
  };

  const postRealtimeFallback = (kind: string, payload: unknown) => {
    if (simulatedOffline || browserOffline || closedManually) return;
    void fetch('/api/dev-lan/realtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentPresence.userId,
      },
      body: JSON.stringify({
        worldId,
        kind,
        sessionId: currentPresence.sessionId,
        payload,
      }),
    }).catch(() => {
      // Ignore transient fallback errors
    });
  };

  const sendWsFrame = (frame: ClientWsFrame, coalesceKey?: string, transient = false) => {
    if (simulatedOffline || browserOffline || closedManually) return;
    if (usingSseFallback) {
      if (frame.type === 'movement') postRealtimeFallback('movement', frame.packet);
      else if (frame.type === 'presence') postRealtimeFallback('presence', frame.presence);
      else if (frame.type === 'world_mutated') postRealtimeFallback('world_mutated', { reason: frame.reason });
      else if (frame.type === 'couple_event') postRealtimeFallback('couple_event', frame.packet);
      else if (frame.type === 'pet_care_session') postRealtimeFallback('pet_care_session', frame.packet);
      else if (frame.type === 'minigame_event') postRealtimeFallback('minigame_event', frame.packet);
      return;
    }

    if (currentStatus === 'connected' && activeWs && activeWs.readyState === WebSocket.OPEN) {
      try {
        activeWs.send(JSON.stringify(frame));
        return;
      } catch {
        // Fall through to queue
      }
    }

    outboundQueue.enqueue(frame, coalesceKey, transient);
    scheduleDiagnosticsEmit(false);
  };

  const flushOutboundQueue = () => {
    if (!activeWs || activeWs.readyState !== WebSocket.OPEN) return;
    const items = outboundQueue.drain();
    for (const item of items) {
      try {
        activeWs.send(JSON.stringify(item));
      } catch {
        outboundQueue.enqueue(item);
        break;
      }
    }
    scheduleDiagnosticsEmit(false);
  };

  const scheduleReconnect = (countReconnect = true) => {
    if (simulatedOffline || browserOffline || closedManually || supersededByServer) return;
    if (reconnectTimer !== null) return;
    if (countReconnect && hasWelcomedOnce) {
      reconnectCount += 1;
    }
    setStatus('reconnecting');
    const delayMs = backoff.nextDelayMs();
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      if (usingSseFallback) {
        openSseFallback();
      } else {
        openWebSocket();
      }
    }, delayMs);
  };

  const startHeartbeatsAndWatchdog = (ws: WebSocket) => {
    if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
    if (watchdogTimer !== null) window.clearInterval(watchdogTimer);

    const sendPing = () => {
      if (activeWs !== ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send(JSON.stringify({ type: 'ping', clientSentMonoMs: performance.now() } satisfies ClientWsFrame));
      } catch {
        // Watchdog/onclose will recover
      }
    };

    sendPing();
    heartbeatTimer = window.setInterval(sendPing, HEARTBEAT_INTERVAL_MS);

    watchdogTimer = window.setInterval(() => {
      if (activeWs !== ws || currentStatus !== 'connected') return;
      if (lastPacketReceivedAtMonoMs === null) return;
      const ageMs = performance.now() - lastPacketReceivedAtMonoMs;
      if (ageMs > WATCHDOG_TIMEOUT_MS) {
        clearTimers();
        closeActiveSockets(false);
        resolvePendingProbes(false);
        reconnectCount += 1;
        setStatus('reconnecting');
        openWebSocket();
      }
    }, WATCHDOG_CHECK_INTERVAL_MS);
  };

  const openSseFallback = () => {
    clearTimers();
    closeActiveSockets(false);
    if (simulatedOffline || browserOffline || closedManually || supersededByServer) return;

    usingSseFallback = true;
    transport = 'sse';
    setStatus(hasWelcomedOnce ? 'reconnecting' : 'connecting');

    const qs = new URLSearchParams({
      worldId,
      userId: currentPresence.userId,
      sessionId: currentPresence.sessionId,
      mapId: currentPresence.mapId,
      tileX: String(currentPresence.tileX),
      tileY: String(currentPresence.tileY),
      facing: currentPresence.facing,
    });
    if (typeof currentPresence.x === 'number' && Number.isFinite(currentPresence.x)) {
      qs.set('x', String(currentPresence.x));
    }
    if (typeof currentPresence.y === 'number' && Number.isFinite(currentPresence.y)) {
      qs.set('y', String(currentPresence.y));
    }

    const es = eventSourceFactory(`/api/dev-lan/events?${qs.toString()}`);
    activeSse = es;

    es.onopen = () => {
      if (activeSse !== es) return;
      const wasReconnect = hasWelcomedOnce;
      hasWelcomedOnce = true;
      backoff.reset();
      lastPacketReceivedAtMonoMs = performance.now();
      setStatus('connected');
      postRealtimeFallback('presence', currentPresence);
      handlers.onWelcomeResync?.({ stateVersion, isReconnect: wasReconnect });
    };

    const markPacket = () => {
      lastPacketReceivedAtMonoMs = performance.now();
      scheduleDiagnosticsEmit(false);
    };

    es.addEventListener('presence_sync', (ev) => {
      markPacket();
      const list = JSON.parse((ev as MessageEvent).data) as PresencePayload[];
      updatePresenceDiagnostics(list);
      handlers.onPresenceChange(list);
      scheduleDiagnosticsEmit(true);
    });

    es.addEventListener('movement', (ev) => {
      markPacket();
      handlers.onMovement(JSON.parse((ev as MessageEvent).data) as MovementPacket);
    });

    es.addEventListener('world_mutated', (ev) => {
      markPacket();
      const parsed = JSON.parse((ev as MessageEvent).data) as {
        reason?: WorldMutationReason;
        stateVersion?: number;
      };
      if (typeof parsed.stateVersion === 'number' && parsed.stateVersion > stateVersion) {
        stateVersion = parsed.stateVersion;
      }
      handlers.onWorldMutated(parsed.reason ?? 'furniture', { stateVersion: parsed.stateVersion });
      scheduleDiagnosticsEmit(true);
    });

    es.addEventListener('couple_event', (ev) => {
      markPacket();
      handlers.onCoupleEvent?.(JSON.parse((ev as MessageEvent).data) as CoupleEventPacket);
    });

    es.addEventListener('pet_care_session', (ev) => {
      markPacket();
      handlers.onPetCareSession?.(JSON.parse((ev as MessageEvent).data) as PetCareSessionEventPacket);
    });

    es.addEventListener('donor_fishing_sync', (ev) => {
      markPacket();
      handlers.onDonorFishingSync?.(JSON.parse((ev as MessageEvent).data) as DonorFishSessionView);
    });

    es.addEventListener('minigame_event', (ev) => {
      markPacket();
      handlers.onMinigameEvent?.(JSON.parse((ev as MessageEvent).data) as MinigameEventEnvelope);
    });

    es.addEventListener('world_reset', () => {
      markPacket();
      handlers.onWorldMutated('member');
    });

    es.onerror = () => {
      if (activeSse !== es) return;
      es.close();
      activeSse = null;
      scheduleReconnect(true);
    };
  };

  const openWebSocket = () => {
    if (onlineDebounceTimer !== null) {
      window.clearTimeout(onlineDebounceTimer);
      onlineDebounceTimer = null;
    }
    clearTimers();
    closeActiveSockets(false);
    if (simulatedOffline || browserOffline || closedManually || supersededByServer) return;

    usingSseFallback = false;
    transport = resolveWsTransportKind();
    setStatus(hasWelcomedOnce ? 'reconnecting' : 'connecting');

    if (typeof WebSocket === 'undefined') {
      openSseFallback();
      return;
    }

    connectionSeq += 1;
    const seqForConn = connectionSeq;
    const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
    const qs = new URLSearchParams({
      worldId,
      userId: currentPresence.userId,
      sessionId: currentPresence.sessionId,
      connectionSeq: String(seqForConn),
      mapId: currentPresence.mapId,
      tileX: String(currentPresence.tileX),
      tileY: String(currentPresence.tileY),
      facing: currentPresence.facing,
    });
    if (typeof currentPresence.x === 'number' && Number.isFinite(currentPresence.x)) {
      qs.set('x', String(currentPresence.x));
    }
    if (typeof currentPresence.y === 'number' && Number.isFinite(currentPresence.y)) {
      qs.set('y', String(currentPresence.y));
    }

    let ws: WebSocket;
    try {
      ws = wsFactory(`${proto}//${host}/api/dev-lan/ws?${qs.toString()}`);
    } catch {
      consecutiveWsFailures += 1;
      if (consecutiveWsFailures >= 2 && typeof EventSource !== 'undefined') {
        openSseFallback();
      } else {
        scheduleReconnect(true);
      }
      return;
    }
    activeWs = ws;
    let welcomedThisSocket = false;

    connectTimer = window.setTimeout(() => {
      if (activeWs !== ws || welcomedThisSocket) return;
      consecutiveWsFailures += 1;
      closeActiveSockets(false);
      if (consecutiveWsFailures >= 2 && typeof EventSource !== 'undefined') {
        openSseFallback();
      } else {
        scheduleReconnect(true);
      }
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (activeWs !== ws) return;
      lastPacketReceivedAtMonoMs = performance.now();
      const hello: ClientWsFrame = {
        type: 'hello',
        worldId,
        userId: currentPresence.userId,
        sessionId: currentPresence.sessionId,
        connectionSeq: seqForConn,
        presence: { ...currentPresence, updatedAtMs: Date.now() },
        lastStateVersion: stateVersion,
      };
      try {
        ws.send(JSON.stringify(hello));
      } catch {
        // onclose handles retry
      }
    };

    ws.onmessage = (ev) => {
      if (activeWs !== ws) return;
      lastPacketReceivedAtMonoMs = performance.now();
      resolvePendingProbes(true);

      let frame: ServerWsFrame;
      try {
        frame = JSON.parse(String(ev.data)) as ServerWsFrame;
      } catch {
        return;
      }
      if (!frame || typeof frame !== 'object') return;

      if (frame.type === 'welcome') {
        if (connectTimer !== null) {
          window.clearTimeout(connectTimer);
          connectTimer = null;
        }
        const isReconnect = hasWelcomedOnce;
        hasWelcomedOnce = true;
        welcomedThisSocket = true;
        consecutiveWsFailures = 0;
        backoff.reset();
        if (typeof frame.stateVersion === 'number') {
          stateVersion = frame.stateVersion;
        }
        updatePresenceDiagnostics(frame.presences);
        setStatus('connected');
        startHeartbeatsAndWatchdog(ws);
        handlers.onPresenceChange(frame.presences);
        for (const pkt of frame.latestMovements) {
          handlers.onMovement(pkt);
        }
        flushOutboundQueue();
        handlers.onWelcomeResync?.({
          stateVersion: frame.stateVersion,
          domainVersions: frame.domainVersions,
          isReconnect,
        });
        scheduleDiagnosticsEmit(true);
        return;
      }

      if (frame.type === 'pong') {
        const rttSample = performance.now() - frame.clientSentMonoMs;
        rttTracker.recordSample(rttSample);
        if (typeof frame.stateVersion === 'number' && frame.stateVersion > stateVersion) {
          stateVersion = frame.stateVersion;
        }
        scheduleDiagnosticsEmit(false);
        return;
      }

      if (frame.type === 'presence_sync') {
        if (typeof frame.stateVersion === 'number' && frame.stateVersion > stateVersion) {
          stateVersion = frame.stateVersion;
        }
        updatePresenceDiagnostics(frame.presences);
        handlers.onPresenceChange(frame.presences);
        scheduleDiagnosticsEmit(true);
        return;
      }

      if (frame.type === 'movement') {
        handlers.onMovement(frame.packet);
        scheduleDiagnosticsEmit(false);
        return;
      }

      if (frame.type === 'world_mutated') {
        if (typeof frame.stateVersion === 'number' && frame.stateVersion > stateVersion) {
          stateVersion = frame.stateVersion;
        }
        handlers.onWorldMutated(frame.reason, {
          stateVersion: frame.stateVersion,
          domainVersions: frame.domainVersions,
        });
        scheduleDiagnosticsEmit(true);
        return;
      }

      if (frame.type === 'couple_event') {
        handlers.onCoupleEvent?.(frame.packet);
        scheduleDiagnosticsEmit(false);
        return;
      }

      if (frame.type === 'pet_care_session') {
        handlers.onPetCareSession?.(frame.packet);
        scheduleDiagnosticsEmit(false);
        return;
      }

      if (frame.type === 'donor_fishing_sync') {
        handlers.onDonorFishingSync?.(frame.session);
        scheduleDiagnosticsEmit(false);
        return;
      }

      if (frame.type === 'minigame_event') {
        handlers.onMinigameEvent?.(frame.packet);
        scheduleDiagnosticsEmit(false);
        return;
      }

      if (frame.type === 'world_reset') {
        stateVersion = frame.stateVersion ?? 1;
        handlers.onWorldMutated('member', { stateVersion });
        scheduleDiagnosticsEmit(true);
        return;
      }

      if (frame.type === 'session_replaced') {
        supersededByServer = true;
        clearTimers();
        closeActiveSockets(true);
        setStatus('disconnected');
      }
    };

    ws.onerror = () => {
      if (activeWs !== ws) return;
      // onclose fires right after and handles reconnect/fallback
    };

    ws.onclose = (ev) => {
      if (activeWs !== ws) return;
      activeWs = null;
      clearTimers();
      resolvePendingProbes(false);

      if (ev.code === 4001) {
        supersededByServer = true;
        setStatus('disconnected');
        return;
      }

      if (simulatedOffline || browserOffline || closedManually) return;

      if (!welcomedThisSocket) {
        consecutiveWsFailures += 1;
        if (consecutiveWsFailures >= 2 && typeof EventSource !== 'undefined') {
          openSseFallback();
          return;
        }
      }
      scheduleReconnect(true);
    };
  };

  const onBrowserOffline = () => {
    browserOffline = true;
    if (onlineDebounceTimer !== null) {
      window.clearTimeout(onlineDebounceTimer);
      onlineDebounceTimer = null;
    }
    clearTimers();
    closeActiveSockets(false);
    resolvePendingProbes(false);
    setStatus('offline');
  };

  const onBrowserOnline = () => {
    browserOffline = false;
    if (simulatedOffline || closedManually || supersededByServer) return;
    if (onlineDebounceTimer !== null) {
      window.clearTimeout(onlineDebounceTimer);
    }
    onlineDebounceTimer = window.setTimeout(() => {
      onlineDebounceTimer = null;
      if (simulatedOffline || browserOffline || closedManually || supersededByServer) return;
      consecutiveWsFailures = 0;
      backoff.reset();
      if (hasWelcomedOnce) reconnectCount += 1;
      openWebSocket();
    }, 20);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('offline', onBrowserOffline);
    window.addEventListener('online', onBrowserOnline);
  }

  openWebSocket();

  return {
    publishMovement(packet) {
      currentPresence = {
        ...currentPresence,
        mapId: packet.mapId,
        facing: packet.facing,
        x: packet.x,
        y: packet.y,
        ...(packet.posture !== undefined ? { posture: packet.posture } : {}),
        ...(packet.heldItemSku !== undefined ? { heldItemSku: packet.heldItemSku } : {}),
        ...(packet.heldItemKind !== undefined ? { heldItemKind: packet.heldItemKind } : {}),
        ...(packet.heldIconId !== undefined ? { heldIconId: packet.heldIconId } : {}),
        ...(packet.heldPropsIconId !== undefined ? { heldPropsIconId: packet.heldPropsIconId } : {}),
        updatedAtMs: Date.now(),
      };
      sendWsFrame({ type: 'movement', packet }, 'movement', true);
    },
    updatePresence(presence) {
      currentPresence = presence;
      scheduleDiagnosticsEmit(false);
      sendWsFrame({ type: 'presence', presence }, 'presence', true);
    },
    notifyWorldMutated(reason) {
      sendWsFrame({ type: 'world_mutated', reason }, undefined, false);
    },
    publishCoupleEvent(packet) {
      sendWsFrame({ type: 'couple_event', packet }, undefined, false);
    },
    publishPetCareSession(packet) {
      sendWsFrame({ type: 'pet_care_session', packet }, undefined, false);
    },
    publishMinigameEvent(packet) {
      sendWsFrame({ type: 'minigame_event', packet }, undefined, false);
    },
    async probeLiveness() {
      if (simulatedOffline || browserOffline || closedManually) return false;
      const ws = activeWs;
      if (usingSseFallback || !ws || ws.readyState !== WebSocket.OPEN) {
        await this.reconnect();
        return false;
      }
      return new Promise<boolean>((resolve) => {
        let settled = false;
        const done = (alive: boolean) => {
          if (settled) return;
          settled = true;
          pendingProbeResolvers.delete(done);
          window.clearTimeout(timer);
          resolve(alive);
        };
        const timer = window.setTimeout(() => {
          if (settled) return;
          pendingProbeResolvers.delete(done);
          // Socket appears half-open after sleep/network switch: reconnect immediately.
          if (activeWs === ws) {
            reconnectCount += 1;
            backoff.reset();
            openWebSocket();
          }
          settled = true;
          resolve(false);
        }, LIVENESS_PROBE_TIMEOUT_MS);

        pendingProbeResolvers.add(done);
        try {
          ws.send(JSON.stringify({ type: 'ping', clientSentMonoMs: performance.now() } satisfies ClientWsFrame));
        } catch {
          done(false);
          void this.reconnect();
        }
      });
    },
    getDiagnostics() {
      return snapshotDiagnostics();
    },
    async reconnect() {
      if (onlineDebounceTimer !== null) {
        window.clearTimeout(onlineDebounceTimer);
        onlineDebounceTimer = null;
      }
      if (simulatedOffline || browserOffline) {
        setStatus('offline');
        return;
      }
      supersededByServer = false;
      consecutiveWsFailures = 0;
      usingSseFallback = false;
      backoff.reset();
      if (hasWelcomedOnce) reconnectCount += 1;
      openWebSocket();
    },
    setSimulatedOffline(offline: boolean) {
      simulatedOffline = offline;
      clearTimers();
      if (offline) {
        closeActiveSockets(false);
        resolvePendingProbes(false);
        setStatus('offline');
      } else {
        supersededByServer = false;
        consecutiveWsFailures = 0;
        backoff.reset();
        openWebSocket();
      }
    },
    async disconnect() {
      closedManually = true;
      if (onlineDebounceTimer !== null) {
        window.clearTimeout(onlineDebounceTimer);
        onlineDebounceTimer = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', onBrowserOffline);
        window.removeEventListener('online', onBrowserOnline);
      }
      clearTimers();
      if (diagThrottleTimer !== null) {
        window.clearTimeout(diagThrottleTimer);
        diagThrottleTimer = null;
      }
      closeActiveSockets(true);
      resolvePendingProbes(false);
      outboundQueue.clear();
      setStatus('disconnected');
    },
  };
}
