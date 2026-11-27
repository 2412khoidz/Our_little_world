import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { WebSocket, WebSocketServer } from 'ws';
import { getRemoteShareStatus, startRemoteShare, stopRemoteShare } from './olwRemoteShare.mjs';

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function computeRfc3550Jitter(rtts) {
  let jitter = 0;
  for (let i = 1; i < rtts.length; i += 1) {
    const d = Math.abs(rtts[i] - rtts[i - 1]);
    jitter += (d - jitter) / 16;
  }
  return jitter;
}

async function waitReady(timeoutMs = 35_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = getRemoteShareStatus();
    if (s.tunnelStatus === 'ready' && s.publicShareUrl) return s;
    if (s.tunnelStatus === 'error') {
      throw new Error(`Tunnel failed: ${s.tunnelError || 'unknown'}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Timed out waiting for tunnel readiness');
}

async function runSseProbe(origin, cookieHeader) {
  const startedAt = performance.now();
  const arrivalMs = [];
  let status = null;
  let error = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('SSE probe timeout (8s)')), 8_000);
  try {
    const res = await fetch(`${origin}/api/dev-lan/events`, {
      headers: { Cookie: cookieHeader },
      signal: controller.signal,
    });
    status = res.status;
    if (!res.ok || !res.body) {
      return { ok: false, status, count: 0, arrivalMs, error: `HTTP ${res.status}` };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const blocks = buf.split('\n\n');
      buf = blocks.pop() ?? '';
      for (const block of blocks) {
        if (block.includes('event: spike_ping')) {
          arrivalMs.push(Math.round(performance.now() - startedAt));
        }
      }
    }
    return {
      ok: arrivalMs.length === 6,
      status,
      count: arrivalMs.length,
      arrivalMs,
      totalMs: Math.round(performance.now() - startedAt),
      error: arrivalMs.length < 6 ? `Expected 6 SSE events, got ${arrivalMs.length}` : null,
    };
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    return { ok: false, status, count: arrivalMs.length, arrivalMs, error };
  } finally {
    clearTimeout(timeout);
  }
}

function connectWs(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers, handshakeTimeout: 10_000 });
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('WebSocket connect timeout'));
    }, 10_000);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    ws.once('unexpected-response', (_req, res) => {
      clearTimeout(timer);
      reject(new Error(`Unexpected HTTP ${res.statusCode}`));
    });
  });
}

async function run() {
  let protocolPongReceived = false;
  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (ws, req) => {
    const remoteTag = req.headers['x-olw-remote-share'] ?? null;
    ws.send(JSON.stringify({ type: 'welcome', remoteTag, serverAt: Date.now() }));
    ws.once('pong', () => {
      protocolPongReceived = true;
    });
    ws.ping();
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', seq: msg.seq, clientSentMs: msg.clientSentMs }));
      } else if (msg.type === 'echo') {
        ws.send(JSON.stringify({ type: 'echo_ack', payload: msg.payload }));
      }
    });
  });

  const upstream = http.createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
    if (pathname === '/api/dev-lan/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      });
      res.socket?.setNoDelay?.(true);
      res.flushHeaders?.();
      res.write(': connected\n\n');
      let seq = 0;
      const timer = setInterval(() => {
        seq += 1;
        res.write(`event: spike_ping\ndata: ${JSON.stringify({ seq, sentAt: Date.now() })}\n\n`);
        if (seq >= 6) {
          clearInterval(timer);
          res.end();
        }
      }, 300);
      req.on('close', () => clearInterval(timer));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, pathname, remoteTag: req.headers['x-olw-remote-share'] ?? null }));
  });

  upstream.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
    if (pathname !== '/api/dev-lan/ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const addr = upstream.address();
  const targetPort = typeof addr === 'object' && addr ? addr.port : 0;

  try {
    const startInfo = await startRemoteShare({ targetPort, tunnel: true, refresh: true });
    console.log('[spike] starting tunnel, local proxy port =', startInfo.proxyPort);
    const status = await waitReady();
    const publicShareUrl = status.publicShareUrl;
    const origin = new URL(publicShareUrl).origin;
    const wssUrl = `${origin.replace(/^https:/, 'wss:')}/api/dev-lan/ws`;
    console.log('[spike] tunnel ready:', { provider: status.provider, origin });

    // 1. Auth gates
    const unauthHttp = await fetch(`${origin}/api/dev-lan/check`);
    let unauthWsErr = null;
    try {
      const badWs = await connectWs(wssUrl);
      badWs.close();
    } catch (err) {
      unauthWsErr = err instanceof Error ? err.message : String(err);
    }
    console.log('[spike] auth gates:', { unauthHttpStatus: unauthHttp.status, unauthWsErr });

    // 2. Pair link -> cookie
    const pairRes = await fetch(publicShareUrl, { redirect: 'manual' });
    const rawCookie = pairRes.headers.get('set-cookie') || '';
    const cookieHeader = rawCookie.split(';')[0];
    console.log('[spike] cookie exchange:', { status: pairRes.status, hasCookie: cookieHeader.startsWith('olw_remote_share=') });

    // 3. SSE probe over live tunnel
    const sseResult = await runSseProbe(origin, cookieHeader);
    console.log('[spike] SSE probe result:', sseResult);

    // 4. WSS probe over live tunnel
    const wsConnectStart = performance.now();
    const ws = await connectWs(wssUrl, { Cookie: cookieHeader });
    const connectMs = Math.round(performance.now() - wsConnectStart);

    const welcomeMsg = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('welcome timeout')), 5000);
      ws.once('message', (raw) => {
        clearTimeout(t);
        resolve(JSON.parse(String(raw)));
      });
    });

    const rtts = [];
    for (let seq = 1; seq <= 15; seq += 1) {
      const sentMono = performance.now();
      const pongRtt = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`pong ${seq} timeout`)), 5000);
        const onMsg = (raw) => {
          const msg = JSON.parse(String(raw));
          if (msg.type === 'pong' && msg.seq === seq) {
            clearTimeout(t);
            ws.off('message', onMsg);
            resolve(performance.now() - sentMono);
          }
        };
        ws.on('message', onMsg);
        ws.send(JSON.stringify({ type: 'ping', seq, clientSentMs: sentMono }));
      });
      rtts.push(Number(pongRtt.toFixed(2)));
    }

    const echoAck = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('echo timeout')), 5000);
      const onMsg = (raw) => {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'echo_ack') {
          clearTimeout(t);
          ws.off('message', onMsg);
          resolve(msg.payload);
        }
      };
      ws.on('message', onMsg);
      ws.send(JSON.stringify({ type: 'echo', payload: { hello: 'olw-wss', n: 42 } }));
    });

    // Abrupt drop & reconnect recovery timing
    ws.terminate();
    const recStart = performance.now();
    const ws2 = await connectWs(wssUrl, { Cookie: cookieHeader });
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('reconnect welcome timeout')), 5000);
      ws2.once('message', () => {
        clearTimeout(t);
        resolve();
      });
    });
    const reconnectRecoveryMs = Math.round(performance.now() - recStart);
    ws2.close(1000);

    const minRtt = Math.min(...rtts);
    const avgRtt = Number((rtts.reduce((a, b) => a + b, 0) / rtts.length).toFixed(2));
    const p95Rtt = percentile(rtts, 95);
    const maxRtt = Math.max(...rtts);
    const jitterMs = Number(computeRfc3550Jitter(rtts).toFixed(2));

    console.log('[spike] WSS probe result:', {
      connectMs,
      welcomeRemoteTag: welcomeMsg.remoteTag,
      protocolPingPongOk: protocolPongReceived,
      echoAckOk: echoAck?.n === 42,
      samples: rtts.length,
      minRtt,
      avgRtt,
      p95Rtt,
      maxRtt,
      jitterMs,
      reconnectRecoveryMs,
    });
  } finally {
    await stopRemoteShare();
    for (const c of wss.clients) c.terminate();
    wss.close();
    await new Promise((resolve) => upstream.close(resolve));
  }
}

run().catch((err) => {
  console.error('[spike] FAILED:', err);
  process.exitCode = 1;
});
