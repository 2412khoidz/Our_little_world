import { useEffect, useState } from 'react';
import { Activity, X } from 'lucide-react';
import {
  type NetworkDiagnosticsState,
  sanitizeSessionShort,
} from '../../shared/netcode/diagnostics';

interface NetworkDiagnosticsOverlayProps {
  diagnostics: NetworkDiagnosticsState;
  onClose?: () => void;
}

function formatPacketAge(lastMonoMs: number | null, nowMonoMs: number): string {
  if (lastMonoMs === null) return '--';
  const ageMs = Math.max(0, Math.round(nowMonoMs - lastMonoMs));
  if (ageMs < 1000) return `${ageMs} ms`;
  return `${(ageMs / 1000).toFixed(1)} s`;
}

function statusLabel(status: NetworkDiagnosticsState['status']): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'reconnecting':
      return 'Reconnecting';
    case 'connecting':
      return 'Connecting';
    case 'offline':
      return 'Offline';
    default:
      return 'Disconnected';
  }
}

export function NetworkDiagnosticsOverlay({
  diagnostics,
  onClose,
}: NetworkDiagnosticsOverlayProps) {
  const [nowMonoMs, setNowMonoMs] = useState(() => performance.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMonoMs(performance.now());
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  if (!import.meta.env.DEV) return null;

  const localShort = sanitizeSessionShort(diagnostics.localSessionShort);
  const remoteShort = diagnostics.remoteSessionShort
    ? sanitizeSessionShort(diagnostics.remoteSessionShort)
    : 'none';

  return (
    <aside
      className="network-diagnostics-panel"
      data-testid="network-diagnostics-overlay"
      aria-label="Multiplayer Diagnostics"
    >
      <div className="network-diagnostics-panel__header">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <Activity size={13} />
          Multiplayer Diagnostics
        </span>
        {onClose && (
          <button
            type="button"
            className="network-diagnostics-panel__close"
            data-testid="network-diagnostics-close"
            onClick={onClose}
            aria-label="Đóng bảng chẩn đoán mạng"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="network-diagnostics-panel__grid">
        <span>Status</span>
        <strong data-testid="diag-status">{statusLabel(diagnostics.status)}</strong>

        <span>Transport</span>
        <strong data-testid="diag-transport">{diagnostics.transport.toUpperCase()}</strong>

        <span>RTT</span>
        <strong data-testid="diag-rtt">
          {diagnostics.rttMs !== null ? `${diagnostics.rttMs} ms` : '--'}
          {diagnostics.smoothedRttMs !== null ? ` (avg ${diagnostics.smoothedRttMs})` : ''}
        </strong>

        <span>Jitter</span>
        <strong data-testid="diag-jitter">
          {diagnostics.jitterMs !== null ? `${diagnostics.jitterMs} ms` : '--'}
        </strong>

        <span>Last pkt age</span>
        <strong data-testid="diag-packet-age">
          {formatPacketAge(diagnostics.lastPacketReceivedAtMonoMs, nowMonoMs)}
        </strong>

        <span>Reconnects</span>
        <strong data-testid="diag-reconnects">{diagnostics.reconnectCount}</strong>

        <span>Players</span>
        <strong data-testid="diag-players">
          {diagnostics.playerCount}/{diagnostics.maxPlayers}
        </strong>

        <span>Local</span>
        <strong data-testid="diag-local">
          {localShort} · {diagnostics.localMapId ?? '--'}
        </strong>

        <span>Remote</span>
        <strong data-testid="diag-remote">
          {remoteShort} · {diagnostics.remoteMapId ?? '--'}{' '}
          {diagnostics.remoteSessionShort
            ? diagnostics.remoteRenderedOnMap
              ? '(On map)'
              : '(Other)'
            : ''}
        </strong>

        <span>State version</span>
        <strong data-testid="diag-state-version">{diagnostics.stateVersion}</strong>

        <span>Queue</span>
        <strong data-testid="diag-queue">{diagnostics.outboundQueueSize}</strong>
      </div>
    </aside>
  );
}
