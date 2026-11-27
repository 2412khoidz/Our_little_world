import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteShareModal } from '../../src/features/couple/RemoteShareModal';

describe('RemoteShareModal single durable HTTPS share link', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides temporary LAN URLs while tunnel is starting and shows only the single durable HTTPS URL once ready', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          active: true,
          tunnelStatus: 'starting',
          provider: null,
          shareUrl: null,
          publicShareUrl: null,
          lanShareUrl: null,
          tunnelError: null,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = render(<RemoteShareModal onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('remote-share-starting-note')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('remote-share-url-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remote-share-copy-btn')).not.toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toMatch(/192\.168\./);
    unmount();

    const readyUrl = 'https://durable-couple-link.trycloudflare.com/__share/token-123';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          active: true,
          tunnelStatus: 'ready',
          provider: 'cloudflared',
          shareUrl: readyUrl,
          publicShareUrl: readyUrl,
          lanShareUrl: null,
          tunnelError: null,
        },
      }),
    });

    render(<RemoteShareModal onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('remote-share-url-input')).toHaveValue(readyUrl);
    });
    expect(document.body.textContent ?? '').not.toMatch(/Copy LAN|Cùng Wi-Fi:|192\.168\./);
  });
});
