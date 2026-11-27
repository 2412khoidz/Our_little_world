import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BilliardsWireEventSchema,
  type AimSyncPayload,
  type BilliardsTransport,
  type BilliardsWireEvent,
  type MatchSnapshot,
  type MatchStartPayload,
  type PlaceCuePayload,
  type PlayerSlot,
  type SettledStatePayload,
  type ShotParams,
  type StateRequestPayload,
} from '../../../shared/billiards/types';

export interface BilliardsSyncHandlers {
  onRemoteStart: (payload: MatchStartPayload, verifiedSenderSlot?: PlayerSlot) => void;
  onRemoteAim: (payload: AimSyncPayload, verifiedSenderSlot?: PlayerSlot) => void;
  onRemoteShot: (payload: ShotParams, verifiedSenderSlot?: PlayerSlot) => void;
  onRemotePlaceCue: (payload: PlaceCuePayload, verifiedSenderSlot?: PlayerSlot) => void;
  onRemoteSettled: (payload: SettledStatePayload, verifiedSenderSlot?: PlayerSlot) => void;
  onStateRequested: (payload: StateRequestPayload, verifiedSenderSlot?: PlayerSlot) => void;
  onRemoteSnapshot: (snapshot: MatchSnapshot, verifiedSenderSlot?: PlayerSlot) => void;
  getStateRequestPayload: () => StateRequestPayload;
  needsSync: () => boolean;
}

interface UseBilliardsSyncOptions extends BilliardsSyncHandlers {
  enabled: boolean;
  transport?: BilliardsTransport;
  localPlayerSlot: PlayerSlot;
}

const AIM_THROTTLE_MS = 100; // <= 10Hz to stay inside OLW's Supabase eventsPerSecond: 15 limit
const REQUEST_DEBOUNCE_MS = 250;
const RETRY_REQUEST_MS = 600;

export function useBilliardsSync(opts: UseBilliardsSyncOptions) {
  const { enabled, transport, localPlayerSlot } = opts;
  const handlersRef = useRef<BilliardsSyncHandlers>(opts);
  const enabledRef = useRef(enabled);
  const transportRef = useRef(transport);

  useLayoutEffect(() => {
    handlersRef.current = opts;
    enabledRef.current = enabled;
    transportRef.current = transport;
  });

  const lastAimSentRef = useRef(0);
  const lastCueSentRef = useRef(0);
  const lastRequestAtRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const sendEvent = useCallback(
    (evt: BilliardsWireEvent) => {
      if (!enabled || !transport) return;
      transport.send(evt);
    },
    [enabled, transport],
  );

  const requestState = useCallback(
    (force = false) => {
      if (!enabled || !transport) return;
      const now = Date.now();
      if (!force && now - lastRequestAtRef.current < REQUEST_DEBOUNCE_MS) return;
      lastRequestAtRef.current = now;

      transport.send({
        type: 'billiards:state_request',
        payload: handlersRef.current.getStateRequestPayload(),
      });

      clearRetryTimer();
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        if (!enabledRef.current || !transportRef.current) return;
        if (handlersRef.current.needsSync()) {
          transportRef.current.send({
            type: 'billiards:state_request',
            payload: handlersRef.current.getStateRequestPayload(),
          });
        }
      }, RETRY_REQUEST_MS);
    },
    [clearRetryTimer, enabled, transport],
  );

  useEffect(() => {
    if (!enabled || !transport) {
      clearRetryTimer();
      return;
    }

    const unsubEvents = transport.subscribe((raw, meta) => {
      const parsed = BilliardsWireEventSchema.safeParse(raw);
      if (!parsed.success) return;
      const evt = parsed.data;
      const h = handlersRef.current;
      const verifiedSlot = meta?.verifiedSenderSlot;

      switch (evt.type) {
        case 'billiards:start':
          clearRetryTimer();
          h.onRemoteStart(evt.payload, verifiedSlot);
          break;
        case 'billiards:aim':
          h.onRemoteAim(evt.payload, verifiedSlot);
          break;
        case 'billiards:shot':
          h.onRemoteShot(evt.payload, verifiedSlot);
          break;
        case 'billiards:place_cue':
          h.onRemotePlaceCue(evt.payload, verifiedSlot);
          break;
        case 'billiards:settled':
          h.onRemoteSettled(evt.payload, verifiedSlot);
          break;
        case 'billiards:state_request':
          if (evt.payload.requesterSlot === localPlayerSlot) return;
          if (verifiedSlot !== undefined && verifiedSlot !== evt.payload.requesterSlot) return;
          h.onStateRequested(evt.payload, verifiedSlot);
          break;
        case 'billiards:state_snapshot':
          clearRetryTimer();
          h.onRemoteSnapshot(evt.payload, verifiedSlot);
          break;
      }
    });

    const unsubConn = transport.subscribeConnection?.((status) => {
      if (status === 'connected') {
        requestState(true);
      }
    });

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        requestState(false);
      }
    };
    const handlePageShow = () => {
      requestState(false);
    };
    const handleOnline = () => {
      requestState(true);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', handlePageShow);
      window.addEventListener('online', handleOnline);
    }

    // Request active match state immediately when mounted on an open/connected channel
    const status = transport.getConnectionStatus?.();
    if (!status || status === 'connected') {
      requestState(true);
    }

    return () => {
      clearRetryTimer();
      unsubEvents();
      unsubConn?.();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pageshow', handlePageShow);
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [clearRetryTimer, enabled, localPlayerSlot, requestState, transport]);

  const broadcastStart = useCallback(
    (payload: MatchStartPayload) => {
      clearRetryTimer();
      sendEvent({ type: 'billiards:start', payload });
    },
    [clearRetryTimer, sendEvent],
  );

  const broadcastAim = useCallback(
    (payload: AimSyncPayload) => {
      const now = performance.now();
      if (now - lastAimSentRef.current < AIM_THROTTLE_MS) return;
      lastAimSentRef.current = now;
      sendEvent({ type: 'billiards:aim', payload });
    },
    [sendEvent],
  );

  const broadcastShot = useCallback(
    (payload: ShotParams) => {
      sendEvent({ type: 'billiards:shot', payload });
    },
    [sendEvent],
  );

  const broadcastPlaceCue = useCallback(
    (payload: PlaceCuePayload, flush = false) => {
      const now = performance.now();
      if (!flush && now - lastCueSentRef.current < AIM_THROTTLE_MS) return;
      lastCueSentRef.current = now;
      sendEvent({ type: 'billiards:place_cue', payload });
    },
    [sendEvent],
  );

  const broadcastSettled = useCallback(
    (payload: SettledStatePayload) => {
      sendEvent({ type: 'billiards:settled', payload });
    },
    [sendEvent],
  );

  const broadcastSnapshot = useCallback(
    (payload: MatchSnapshot) => {
      sendEvent({ type: 'billiards:state_snapshot', payload });
    },
    [sendEvent],
  );

  return useMemo(
    () => ({
      broadcastStart,
      broadcastAim,
      broadcastShot,
      broadcastPlaceCue,
      broadcastSettled,
      broadcastSnapshot,
      requestState,
    }),
    [
      broadcastAim,
      broadcastPlaceCue,
      broadcastSettled,
      broadcastShot,
      broadcastSnapshot,
      broadcastStart,
      requestState,
    ],
  );
}
