import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { ensureCloudflaredBinary, waitForTunnelReadiness } from './olwTunnelBinary.mjs';

const COOKIE_NAME = 'olw_remote_share';
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;
const GLOBAL_KEY = '__OLW_REMOTE_SHARE_STATE__';

function getGlobalState() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = { session: null };
  }
  return globalThis[GLOBAL_KEY];
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a ?? ''), 'utf8');
  const bb = Buffer.from(String(b ?? ''), 'utf8');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function signCookie(sessionId, secret) {
  const sig = crypto.createHmac('sha256', secret).update(sessionId).digest('base64url');
  return `${sessionId}.${sig}`;
}

function verifyCookie(rawHeader, sessionId, secret) {
  if (!rawHeader) return false;
  const parts = String(rawHeader).split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== COOKIE_NAME) continue;
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    const dot = val.lastIndexOf('.');
    if (dot <= 0) continue;
    const cid = val.slice(0, dot);
    if (!timingSafeEqualStr(cid, sessionId)) continue;
    const expected = signCookie(sessionId, secret);
    if (timingSafeEqualStr(val, expected)) return true;
  }
  return false;
}

function isHttpsRequest(req, session = null) {
  const proto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim().toLowerCase();
  if (proto === 'https') return true;
  if (String(req.headers['x-forwarded-ssl'] ?? '').trim().toLowerCase() === 'on') return true;
  const cfVisitor = String(req.headers['cf-visitor'] ?? '');
  if (cfVisitor.includes('"https"')) return true;
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
    .split(':')[0]
    .trim()
    .toLowerCase();
  if (host.endsWith('.trycloudflare.com') || host.endsWith('.lhr.life')) return true;
  if (session?.tunnelOrigin) {
    try {
      if (host === new URL(session.tunnelOrigin).hostname.toLowerCase()) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export function extractTunnelOrigin(text) {
  const raw = String(text ?? '');
  const cfMatch = raw.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (cfMatch) {
    return { origin: cfMatch[0], provider: 'cloudflared' };
  }
  const lhrMatch = raw.match(/https:\/\/[a-z0-9.-]+\.lhr\.life/i);
  if (lhrMatch) {
    return { origin: lhrMatch[0], provider: 'localhost.run' };
  }
  return null;
}

export function rankLanAddresses(interfaces = os.networkInterfaces()) {
  const out = [];
  for (const [name, addrs] of Object.entries(interfaces || {})) {
    if (!addrs) continue;
    const lower = name.toLowerCase();
    const isVirtual =
      lower.includes('vethernet') ||
      lower.includes('wsl') ||
      lower.includes('hyper-v') ||
      lower.includes('docker') ||
      lower.includes('vmware') ||
      lower.includes('virtualbox') ||
      lower.includes('tailscale') ||
      lower.includes('loopback');
    for (const info of addrs) {
      if (info.family !== 'IPv4' || info.internal) continue;
      if (info.address.startsWith('169.254.')) continue;
      if (info.address.startsWith('127.')) continue;
      const isPrivateLan =
        info.address.startsWith('192.168.') ||
        info.address.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(info.address);
      if (!isPrivateLan) continue;
      let score = isVirtual ? 10 : 100;
      if (info.address.startsWith('192.168.')) score += 20;
      if (lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('wlan')) score += 15;
      if (lower.includes('ethernet')) score += 10;
      out.push({ interfaceName: name, address: info.address, score, recommended: false });
    }
  }
  out.sort((a, b) => b.score - a.score);
  if (out[0]) out[0].recommended = true;
  return out;
}

function renderAuthRequiredHtml() {
  return `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Our Little World</title></head>
<body style="font-family:system-ui,sans-serif;background:#241a20;color:#fff6ea;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center;">
  <div style="max-width:400px;background:#32242d;padding:24px;border-radius:16px;border:1px solid #d494a7;">
    <h2 style="margin:0 0 8px;">Phiên chia sẻ riêng tư</h2>
    <p style="margin:0;line-height:1.5;color:#efd8df;">Vui lòng mở đúng đường link riêng tư vừa được gửi để vào thế giới của hai bạn nhé.</p>
  </div>
</body>
</html>`;
}

async function defaultTunnelSpawner(proxyPort, probeToken, onReady, onError) {
  let activeChild = null;
  let cancelled = false;
  let readyEmitted = false;

  const killChild = (child) => {
    if (!child) return;
    try {
      if (!child.killed) child.kill('SIGKILL');
    } catch {
      /* ignore */
    }
    if (process.platform === 'win32' && child.pid) {
      try {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch {
        /* ignore */
      }
    }
  };

  const close = () => {
    cancelled = true;
    killChild(activeChild);
    activeChild = null;
  };

  const spawnAndWaitForOrigin = (command, args, expectedProvider, timeoutMs) =>
    new Promise((resolve) => {
      let child;
      let logBuf = '';
      let settled = false;
      let timer = null;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (!result.ok) {
          killChild(child);
        }
        resolve(result);
      };

      try {
        child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        activeChild = child;
      } catch (err) {
        finish({ ok: false, log: '', reason: err instanceof Error ? err.message : String(err) });
        return;
      }

      timer = setTimeout(() => {
        finish({ ok: false, log: logBuf, reason: `Hết thời gian chờ ${expectedProvider}` });
      }, timeoutMs);

      const onChunk = (chunk) => {
        const text = String(chunk);
        logBuf += text;
        if (logBuf.length > 8192) logBuf = logBuf.slice(-4096);
        if (cancelled) {
          finish({ ok: false, log: logBuf, reason: 'cancelled' });
          return;
        }
        const extracted = extractTunnelOrigin(text) ?? extractTunnelOrigin(logBuf);
        if (extracted && extracted.provider === expectedProvider) {
          finish({ ok: true, child, url: extracted.origin, provider: extracted.provider });
        }
      };

      child.stdout?.on('data', onChunk);
      child.stderr?.on('data', onChunk);
      child.once('error', (err) => {
        finish({ ok: false, log: logBuf, reason: err instanceof Error ? err.message : String(err) });
      });
      child.once('exit', (code) => {
        if (!settled) {
          finish({ ok: false, log: logBuf, reason: `Thoát với mã ${code ?? 'unknown'}` });
        } else if (!cancelled && readyEmitted && activeChild === child) {
          activeChild = null;
        }
      });
    });

  void (async () => {
    let saw429 = false;
    let firstReason = '';

    // Attempt 1: Cloudflare Quick Tunnel
    try {
      const binPath = await ensureCloudflaredBinary();
      if (cancelled) return;
      const cf = await spawnAndWaitForOrigin(
        binPath,
        ['tunnel', '--url', `http://127.0.0.1:${proxyPort}`, '--no-autoupdate'],
        'cloudflared',
        14_000,
      );
      if (cancelled) return;
      if (cf.ok) {
        await waitForTunnelReadiness(cf.url, `/__probe/${probeToken}`, { timeoutMs: 15_000 });
        if (cancelled) return;
        readyEmitted = true;
        onReady(cf.url, 'cloudflared');
        return;
      }
      saw429 = /\b429\b|Tunnelstore/i.test(cf.log);
      firstReason = cf.reason;
    } catch (err) {
      firstReason = err instanceof Error ? err.message : 'cloudflared unavailable';
    }

    if (cancelled) return;

    // Attempt 2: SSH reverse tunnel fallback via localhost.run (supports *.app.lhr.life)
    const nullDev = process.platform === 'win32' ? 'NUL' : '/dev/null';
    const sshArgs = [
      '-T',
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      `UserKnownHostsFile=${nullDev}`,
      '-o',
      'ConnectTimeout=10',
      '-o',
      'BatchMode=yes',
      '-o',
      'ServerAliveInterval=25',
      '-o',
      'ServerAliveCountMax=3',
      '-o',
      'ExitOnForwardFailure=yes',
      '-R',
      `80:127.0.0.1:${proxyPort}`,
      'nokey@localhost.run',
    ];
    const lhr = await spawnAndWaitForOrigin('ssh', sshArgs, 'localhost.run', 15_000);
    if (cancelled) return;
    if (lhr.ok) {
      await waitForTunnelReadiness(lhr.url, `/__probe/${probeToken}`, { timeoutMs: 12_000 });
      if (cancelled) return;
      readyEmitted = true;
      onReady(lhr.url, 'localhost.run');
      return;
    }

    const detail = saw429
      ? 'Cloudflare Quick Tunnel đang giới hạn kết nối (429 — thử tắt WARP/VPN nếu đang bật)'
      : `Không khởi tạo được đường hầm Cloudflare (${firstReason || 'lỗi mạng'})`;
    onError(`${detail} và máy chủ dự phòng cũng không kết nối được (${lhr.reason}). Bạn vẫn có thể dùng link Wi-Fi LAN bên dưới.`);
  })();

  return { close };
}

function bindProxyServer(sessionRef) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const session = sessionRef.current;
      if (!session || session.closed || session.expiresAtMs <= Date.now()) {
        res.statusCode = 503;
        res.end('Share session closed');
        return;
      }

      const rawUrl = req.url || '/';
      const parsed = new URL(rawUrl, 'http://127.0.0.1');

      if (req.method === 'GET' && parsed.pathname.startsWith('/__probe/')) {
        const token = parsed.pathname.slice('/__probe/'.length);
        if (timingSafeEqualStr(token, session.probeToken)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end('ok');
          return;
        }
      }

      if (req.method === 'GET' && parsed.pathname.startsWith('/__share/')) {
        const token = parsed.pathname.slice('/__share/'.length);
        if (!timingSafeEqualStr(token, session.pairToken)) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(renderAuthRequiredHtml());
          return;
        }
        const cookieVal = encodeURIComponent(signCookie(session.id, session.cookieSecret));
        const secureAttr = isHttpsRequest(req, session) ? '; Secure' : '';
        res.statusCode = 302;
        res.setHeader(
          'Set-Cookie',
          `${COOKIE_NAME}=${cookieVal}; Path=/; HttpOnly; SameSite=Lax${secureAttr}; Max-Age=43200`,
        );
        res.setHeader('Location', '/?remote-partner=1');
        res.setHeader('Cache-Control', 'no-store');
        res.end('Redirecting...');
        return;
      }

      if (!verifyCookie(req.headers.cookie, session.id, session.cookieSecret)) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(renderAuthRequiredHtml());
        return;
      }

      session.lastClientAtMs = Date.now();
          const targetHeaders = {
        ...req.headers,
        host: `127.0.0.1:${session.targetPort}`,
        'x-olw-remote-share': '1',
        'x-forwarded-host': String(req.headers.host ?? ''),
        'x-forwarded-proto': isHttpsRequest(req, session) ? 'https' : 'http',
      };
      delete targetHeaders['accept-encoding'];

      const isSseStream = parsed.pathname.startsWith('/api/dev-lan/events');
      if (isSseStream) {
        req.setTimeout?.(0);
        res.setTimeout?.(0);
        req.socket?.setNoDelay?.(true);
        res.socket?.setNoDelay?.(true);
      }

      const proxyReq = http.request(
        {
          hostname: '127.0.0.1',
          port: session.targetPort,
          path: rawUrl,
          method: req.method,
          headers: targetHeaders,
        },
        (proxyRes) => {
          const outHeaders = { ...proxyRes.headers };
          const ctype = String(outHeaders['content-type'] ?? '');
          if (ctype.includes('text/event-stream') || isSseStream) {
            outHeaders['cache-control'] = 'no-cache, no-transform';
            outHeaders['x-accel-buffering'] = 'no';
            if (outHeaders['content-length']) {
              delete outHeaders['transfer-encoding'];
            }
          }
          res.writeHead(proxyRes.statusCode || 502, outHeaders);
          res.flushHeaders?.();
          proxyRes.pipe(res);
        },
      );
      if (isSseStream) {
        proxyReq.setTimeout?.(0);
      }

      res.on('close', () => {
        if (!res.writableEnded && !proxyReq.destroyed) proxyReq.destroy();
      });
      req.on('aborted', () => {
        if (!proxyReq.destroyed) proxyReq.destroy();
      });
      proxyReq.on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Upstream dev server unavailable');
        }
      });

      req.pipe(proxyReq);
    });

    server.on('upgrade', (req, socket, head) => {
      const session = sessionRef.current;
      if (
        !session ||
        session.closed ||
        session.expiresAtMs <= Date.now() ||
        !verifyCookie(req.headers.cookie, session.id, session.cookieSecret)
      ) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
      if (String(req.headers.upgrade ?? '').toLowerCase() !== 'websocket') {
        socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
      const upgradePath = new URL(req.url || '/', 'http://127.0.0.1').pathname;
      const wsProtocol = String(req.headers['sec-websocket-protocol'] ?? '').toLowerCase();
      const isAllowedWs =
        upgradePath === '/api/dev-lan/ws' ||
        (upgradePath === '/' && wsProtocol.includes('vite-hmr')) ||
        upgradePath.startsWith('/@vite');
      if (!isAllowedWs) {
        socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      session.lastClientAtMs = Date.now();
      socket.setNoDelay?.(true);

      const upstream = net.connect(session.targetPort, '127.0.0.1', () => {
        upstream.setNoDelay?.(true);
        const rawHost = String(req.headers.host ?? '');
        const forwardedProto = isHttpsRequest(req, session) ? 'https' : 'http';
        const headerLines = [`${req.method || 'GET'} ${req.url || '/'} HTTP/${req.httpVersion || '1.1'}`];
        for (const [k, v] of Object.entries(req.headers)) {
          const lower = k.toLowerCase();
          if (
            lower === 'host' ||
            lower === 'x-olw-remote-share' ||
            lower === 'x-forwarded-host' ||
            lower === 'x-forwarded-proto'
          ) {
            continue;
          }
          if (v !== undefined) {
            headerLines.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
          }
        }
        headerLines.push(`Host: 127.0.0.1:${session.targetPort}`);
        headerLines.push('x-olw-remote-share: 1');
        if (rawHost) headerLines.push(`x-forwarded-host: ${rawHost}`);
        headerLines.push(`x-forwarded-proto: ${forwardedProto}`);
        headerLines.push('', '');
        upstream.write(headerLines.join('\r\n'));
        if (head && head.length) upstream.write(head);
        socket.pipe(upstream);
        upstream.pipe(socket);
      });
      session.upgradeSockets ??= new Set();
      session.upgradeSockets.add(socket);
      session.upgradeSockets.add(upstream);
      const teardown = () => {
        session.upgradeSockets?.delete(socket);
        session.upgradeSockets?.delete(upstream);
        if (!socket.destroyed) socket.destroy();
        if (!upstream.destroyed) upstream.destroy();
      };
      upstream.on('error', teardown);
      upstream.on('close', teardown);
      socket.on('error', teardown);
      socket.on('close', teardown);
    });

    server.requestTimeout = 0;
    server.keepAliveTimeout = 65_000;
    server.on('error', reject);
    server.listen(0, '0.0.0.0', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to bind share proxy port'));
        return;
      }
      resolve({ server, port: addr.port });
    });
  });
}

function buildInfo(session) {
  if (!session || session.closed || session.expiresAtMs <= Date.now()) {
    return {
      active: false,
      tunnelStatus: 'idle',
      provider: null,
      shareUrl: null,
      lanShareUrl: null,
      tunnelError: null,
      expiresAtMs: null,
      lastClientAtMs: null,
    };
  }
  const lanShareUrl = session.recommendedLanIp
    ? `http://${session.recommendedLanIp}:${session.proxyPort}/__share/${session.pairToken}`
    : null;
  const publicShareUrl = session.tunnelOrigin
    ? `${session.tunnelOrigin}/__share/${session.pairToken}`
    : null;
  return {
    active: true,
    tunnelStatus: session.tunnelStatus,
    provider: session.provider,
    shareUrl: publicShareUrl || lanShareUrl,
    publicShareUrl,
    lanShareUrl,
    tunnelError: session.tunnelError,
    expiresAtMs: session.expiresAtMs,
    lastClientAtMs: session.lastClientAtMs,
    proxyPort: session.proxyPort,
    probePath: `/__probe/${session.probeToken}`,
    sharePath: `/__share/${session.pairToken}`,
  };
}

export function getRemoteShareStatus() {
  const state = getGlobalState();
  if (state.session && (state.session.closed || state.session.expiresAtMs <= Date.now())) {
    void stopRemoteShare();
    return buildInfo(null);
  }
  return buildInfo(state.session);
}

export async function stopRemoteShare() {
  const state = getGlobalState();
  const session = state.session;
  state.session = null;
  if (!session) return false;
  session.closed = true;
  if (session.expiryTimer) {
    clearTimeout(session.expiryTimer);
    session.expiryTimer = null;
  }
  try {
    session.tunnelHandle?.close?.();
  } catch {
    /* ignore */
  }
  if (session.upgradeSockets) {
    for (const sock of session.upgradeSockets) {
      try {
        sock.destroy();
      } catch {
        /* ignore */
      }
    }
    session.upgradeSockets.clear();
  }
  await new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve();
    };
    const guard = setTimeout(done, 500);
    guard.unref?.();
    try {
      session.proxyServer.closeAllConnections?.();
      session.proxyServer.close(() => done());
    } catch {
      done();
    }
  });
  return true;
}

export async function startRemoteShare(options) {
  const state = getGlobalState();
  const existing = state.session;
  const targetPort = Number(options?.targetPort);
  if (!Number.isFinite(targetPort) || targetPort <= 0) {
    throw new Error('Cần targetPort hợp lệ của Vite dev server.');
  }

  if (existing && !existing.closed && existing.expiresAtMs > Date.now() && existing.targetPort === targetPort && !options?.refresh) {
    return buildInfo(existing);
  }

  await stopRemoteShare();

  const sessionRef = { current: null };
  const { server, port } = await bindProxyServer(sessionRef);
  const lanList = rankLanAddresses(options?.interfaces);
  const recommendedLanIp = lanList[0]?.address ?? null;
  const wantTunnel = options?.tunnel !== false;
  const ttlMs = Math.max(5_000, options?.ttlMs ?? DEFAULT_TTL_MS);

  const session = {
    id: crypto.randomUUID(),
    pairToken: crypto.randomBytes(24).toString('base64url'),
    cookieSecret: crypto.randomBytes(32).toString('base64url'),
    probeToken: crypto.randomBytes(12).toString('base64url'),
    targetPort,
    proxyServer: server,
    proxyPort: port,
    recommendedLanIp,
    tunnelStatus: wantTunnel ? 'starting' : 'idle',
    provider: wantTunnel ? null : 'lan',
    tunnelOrigin: null,
    tunnelError: null,
    tunnelHandle: null,
    expiresAtMs: Date.now() + ttlMs,
    lastClientAtMs: null,
    expiryTimer: null,
    closed: false,
  };
  sessionRef.current = session;
  state.session = session;

  session.expiryTimer = setTimeout(() => {
    if (getGlobalState().session?.id === session.id) {
      void stopRemoteShare();
    }
  }, ttlMs);
  session.expiryTimer.unref?.();

  if (wantTunnel) {
    const spawner = options?.tunnelSpawner ?? defaultTunnelSpawner;
    session.tunnelHandle = await spawner(
      port,
      session.probeToken,
      (origin, provider) => {
        if (session.closed) return;
        session.tunnelOrigin = origin;
        session.provider = provider || 'cloudflared';
        session.tunnelStatus = 'ready';
        session.tunnelError = null;
      },
      (errText) => {
        if (session.closed) return;
        session.tunnelStatus = 'error';
        session.tunnelError = errText;
      },
    );
  }

  return buildInfo(session);
}
