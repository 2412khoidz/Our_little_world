import http from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  extractTunnelOrigin,
  getRemoteShareStatus,
  rankLanAddresses,
  startRemoteShare,
  stopRemoteShare,
} from '../../scripts/olwRemoteShare.mjs';

describe('olwRemoteShare zero-config tunnel & cookie reverse proxy', () => {
  it('extracts both trycloudflare.com and multi-label localhost.run (.app.lhr.life) origins', () => {
    expect(extractTunnelOrigin('INF |  https://gentle-breeze-1234.trycloudflare.com  |')).toEqual({
      origin: 'https://gentle-breeze-1234.trycloudflare.com',
      provider: 'cloudflared',
    });
    expect(
      extractTunnelOrigin(
        '623e72e189b57a.app.lhr.life tunneled with tls termination, https://623e72e189b57a.app.lhr.life',
      ),
    ).toEqual({
      origin: 'https://623e72e189b57a.app.lhr.life',
      provider: 'localhost.run',
    });
    expect(extractTunnelOrigin('http://insecure.example.com')).toBeNull();
  });

  it('prioritizes physical Wi-Fi/Ethernet 192.168.x over virtual adapters', () => {
    const ranked = rankLanAddresses({
      'vEthernet (WSL)': [{ family: 'IPv4', internal: false, address: '172.25.16.1' }],
      Tailscale: [{ family: 'IPv4', internal: false, address: '100.88.1.2' }],
      'Wi-Fi': [{ family: 'IPv4', internal: false, address: '192.168.1.42' }],
      Loopback: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    });

    expect(ranked.length).toBe(2);
    expect(ranked[0].address).toBe('192.168.1.42');
    expect(ranked[0].recommended).toBe(true);
    expect(ranked[1].address).toBe('172.25.16.1');
  });

  it('gates unauthenticated visitors, tags remote requests, and streams SSE cleanly', async () => {
    const upstream = http.createServer((req, res) => {
      if (req.url === '/api/dev-lan/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        res.write('event: sync\ndata: {"ok":true}\n\n');
        setTimeout(() => res.end(), 30);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          url: req.url,
          remoteShareHeader: req.headers['x-olw-remote-share'] ?? null,
        }),
      );
    });

    await new Promise((resolve) => upstream.listen(0, '127.0.0.1', () => resolve()));
    const addr = upstream.address();
    if (!addr || typeof addr === 'string') {
      throw new Error('Failed to resolve upstream port');
    }
    const upstreamPort = addr.port;

    let mockedReadyCallback = null;
    try {
      const info = await startRemoteShare({
        targetPort: upstreamPort,
        tunnel: true,
        refresh: true,
        tunnelSpawner: async (_proxyPort, _probeToken, onReady) => {
          mockedReadyCallback = onReady;
          onReady('https://test-couple-tunnel.trycloudflare.com', 'cloudflared');
          return { close: () => {} };
        },
      });

      expect(info.active).toBe(true);
      expect(info.tunnelStatus).toBe('ready');
      expect(mockedReadyCallback).toBeTruthy();
      expect(info.shareUrl?.startsWith('https://test-couple-tunnel.trycloudflare.com/__share/')).toBe(
        true,
      );

      const status = getRemoteShareStatus();
      expect(status.proxyPort).toBe(info.proxyPort);

      const baseProxy = `http://127.0.0.1:${info.proxyPort}`;

      // 1. Health probe succeeds without cookie
      const probeRes = await fetch(`${baseProxy}${info.probePath}`);
      expect(probeRes.status).toBe(200);
      expect(await probeRes.text()).toBe('ok');

      // 2. Unauthenticated root fails with 401
      const unauthRes = await fetch(`${baseProxy}/`);
      expect(unauthRes.status).toBe(401);

      // 3. Invalid share token fails with 403
      const badTokenRes = await fetch(`${baseProxy}/__share/invalid-token`, {
        redirect: 'manual',
      });
      expect(badTokenRes.status).toBe(403);

      // 4. Valid pair link issues HttpOnly session cookie and redirects to partner auto-join URL
      const pairRes = await fetch(`${baseProxy}${info.sharePath}`, { redirect: 'manual' });
      expect(pairRes.status).toBe(302);
      expect(pairRes.headers.get('location')).toBe('/?remote-partner=1');
      const rawSetCookie = pairRes.headers.get('set-cookie') || '';
      expect(rawSetCookie).toMatch(/olw_remote_share=/);
      expect(rawSetCookie).toMatch(/HttpOnly/i);
      const cookieHeader = rawSetCookie.split(';')[0];

      // 5. Authenticated proxied request includes x-olw-remote-share: 1
      const authedRes = await fetch(`${baseProxy}/hello`, {
        headers: { cookie: cookieHeader },
      });
      expect(authedRes.status).toBe(200);
      const payload = await authedRes.json();
      expect(payload.url).toBe('/hello');
      expect(payload.remoteShareHeader).toBe('1');

      // 6. SSE stream passes through with anti-buffering headers
      const sseRes = await fetch(`${baseProxy}/api/dev-lan/events`, {
        headers: { cookie: cookieHeader },
      });
      expect(sseRes.status).toBe(200);
      expect(sseRes.headers.get('cache-control') || '').toMatch(/no-cache/);
      expect(sseRes.headers.get('x-accel-buffering')).toBe('no');
      const sseBody = await sseRes.text();
      expect(sseBody).toMatch(/event: sync/);
    } finally {
      await stopRemoteShare();
      expect(getRemoteShareStatus().active).toBe(false);
      await new Promise((resolve) => upstream.close(() => resolve()));
    }
  });
});
