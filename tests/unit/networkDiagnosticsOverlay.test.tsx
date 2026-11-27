import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NetworkDiagnosticsOverlay } from '../../src/features/network/NetworkDiagnosticsOverlay';
import { createInitialNetworkDiagnostics } from '../../src/shared/netcode/diagnostics';

describe('NetworkDiagnosticsOverlay', () => {
  it('displays required multiplayer metrics without exposing credentials or tokens', () => {
    const diag = createInitialNetworkDiagnostics({
      status: 'connected',
      transport: 'wss',
      rttMs: 86,
      smoothedRttMs: 89,
      jitterMs: 12,
      lastPacketReceivedAtMonoMs: performance.now() - 40,
      reconnectCount: 1,
      playerCount: 2,
      maxPlayers: 2,
      localSessionShort: 'may1..0001',
      localMapId: 'farm',
      remoteSessionShort: 'nang..0002',
      remoteMapId: 'farm',
      remoteRenderedOnMap: true,
      stateVersion: 142,
      outboundQueueSize: 0,
    });

    const { container } = render(<NetworkDiagnosticsOverlay diagnostics={diag} />);

    expect(screen.getByTestId('diag-status')).toHaveTextContent('Connected');
    expect(screen.getByTestId('diag-transport')).toHaveTextContent('WSS');
    expect(screen.getByTestId('diag-rtt')).toHaveTextContent('86 ms (avg 89)');
    expect(screen.getByTestId('diag-jitter')).toHaveTextContent('12 ms');
    expect(screen.getByTestId('diag-reconnects')).toHaveTextContent('1');
    expect(screen.getByTestId('diag-players')).toHaveTextContent('2/2');
    expect(screen.getByTestId('diag-local')).toHaveTextContent('may1..0001 · farm');
    expect(screen.getByTestId('diag-remote')).toHaveTextContent('nang..0002 · farm (On map)');
    expect(screen.getByTestId('diag-state-version')).toHaveTextContent('142');
    expect(screen.getByTestId('diag-queue')).toHaveTextContent('0');

    const text = container.textContent ?? '';
    expect(text).not.toMatch(/olw_remote_share|token|cookie|secret|@ourlittleworld/i);
  });
});
