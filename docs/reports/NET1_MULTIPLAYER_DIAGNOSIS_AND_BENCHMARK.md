# MISSION NET.1 — Multiplayer Diagnosis, WebSocket Migration & Verification Report

- **Branch / Worktree:** `feature/multiplayer-hardening` (branched from `f69106e`) in `OLW-Multiplayer`
- **Date:** 2026-11-27
- **Scope:** Phase A (Diagnose & Live Quick Tunnel Reproduction), Phase B (WebSocket Transport + Proxy Security), Phase C (Reconnect & Authoritative Reconciliation), Phase D (Smooth Movement & Held Item Sync), Phase E (Authoritative Gameplay Sync & Idempotency).

---

## 1. Phase A — Root Cause Diagnosis

### 1.1 Empirical Cloudflare Quick Tunnel Reproduction (`scripts/spike-tunnel-transport.mjs`)
Live test run against Cloudflare Quick Tunnel (`https://hansen-sufficient-scout-hindu.trycloudflare.com`):

1. **Auth & Pairing Gate (both HTTP & WS):**
   - Unauthenticated HTTP request: `401 Unauthorized`
   - Unauthenticated WS upgrade: `Unexpected HTTP 401`
   - Pairing `/__share/<token>`: `302` setting signed `HttpOnly` cookie `olw_remote_share`
2. **SSE (`GET /api/dev-lan/events`) over Quick Tunnel — Reproduced Incompatibility:**
   - Official Cloudflare documentation states Quick Tunnels do not support Server-Sent Events (SSE).
   - Server emitted **6 events spaced every 300 ms**. Over the live Quick Tunnel, **all 6 events were edge-buffered and arrived together only when the stream closed**:
     - `arrivalMs`: `[2133, 2133, 2133, 2133, 2133, 2133]` (`totalMs: 2134`)
   - This explains why HTTP REST calls (`world/snapshot`, wallet coins, pet status) worked while realtime SSE partner updates stalled, delayed, or silently failed after mobile network changes.
3. **WSS (`wss://.../api/dev-lan/ws`) over the SAME Live Quick Tunnel:**
   - Handshake time (`connectMs`): **211 ms**
   - Protocol RFC 6455 `ping`/`pong`: **passed (`true`)**
   - Application echo `ack`: **passed (`true`)**
   - 15-sample RTT distribution: **`min 82.9 ms`**, **`avg 88.86 ms`**, **`p95 136.67 ms`**, **`max 136.67 ms`**, **`jitter 7.46 ms`**
   - Recovery after abrupt `ws.terminate()`: **`209 ms`**

### 1.2 Additional Protocol & State Bugs Identified in Baseline `f69106e`
- **Half-open sockets on mobile Wi-Fi ↔ 5G switches:** Prior SSE client had no bidirectional ping/pong RTT watchdog and did not actively close half-open connections when browser `offline` fired, causing stale connections to linger without triggering fast reconnect/resync.
- **Incomplete presence resync:** `App.tsx` presence updates omitted pixel `(x, y)`, `posture`, and equipped `heldItem*` fields; `GET /events` could also overwrite offline map transitions with stale `preservedPresence`.
- **Cross-device clock skew sensitivity:** Couple invites compared receiver `Date.now()` against sender `expiresAtMs`, which breaks when mobile and PC clocks differ; server-side presence selection lacked monotonic sequence ordering.
- **Snapshot race / stale rollback risk:** Asynchronous world/farm/inventory/pet REST snapshot fetches lacked monotonic request-sequence and state-version anti-rollback guards, and several mutation endpoints lacked `idempotencyKey` replay protection.

---

## 2. Architecture & Donor Repository Attributions

- **`websockets/ws` (`^8.x` devDependency):** Lightweight `WebSocketServer({ noServer: true, maxPayload: 64 * 1024 })` unified in `scripts/devLanWsHub.mjs`, plus `ws.ping()`/`pong` heartbeat (`5s` interval, max 2 missed pongs) and strict WebSocket close/supersede semantics (`4001`). Chosen instead of a full MMO framework to keep zero recurring infra cost and reuse Vite/Node middleware.
- **`socketio/socket.io` (`backo2` pattern):** Adapted into `src/shared/netcode/backoff.ts` (`ReconnectBackoff` with capped exponential delay + symmetric jitter) and client reconnect/offline/online/liveness-probe transitions in `src/lib/backend/devLanRealtimeClient.ts`.
- **`colyseus/colyseus`:** Room lifecycle & authoritative state concepts adapted into `welcome` full room snapshot (`serverSeq`, `stateVersion`, `domainVersions`, authoritative `presences`, `latestMovements` replay), session replacement (`4001`), and reconnect grace windows (`4.5s` WS / `2.5s` SSE fallback).
- **`Kaetram/Kaetram-Open` & `mozilla/BrowserQuest`:** Adapted smooth entity motion principles into `src/shared/netcode/interpolation.ts` (`RemoteMotionInterpolator`: `SNAP_DISTANCE_PX = 96`, `SETTLE_DISTANCE_PX = 0.35`, `MAX_EXTRAPOLATION_MS = 160`, `MAX_VELOCITY_PX_PER_SEC = 180`, jitter-adaptive smoothing) and 10 Hz movement throttle with stopped `idle` final packet in `src/game/scenes/WorldScene.ts`.

---

## 3. Summary of Changes by Phase

### Phase A/B — Transport, Proxy & DEV-only Diagnostics
- **`scripts/olwRemoteShare.mjs` (+ `scripts/olwRemoteShare.d.mts`):** Enforced session expiry checks on HTTP & WS upgrades, allowed WS upgrades strictly for `/api/dev-lan/ws` and Vite HMR (`400` non-WS, `404` unknown WS path, `401` unauth/expired), stripped client-forged forwarding headers, enabled `socket.setNoDelay(true)`, tore down streams bidirectionally, and preserved SSE chunked streams cleanly.
- **`scripts/devLanWsHub.mjs`:** Server-side WS room hub + controlled SSE fallback parity, `welcome` snapshot, delayed `55ms` initial presence broadcast fallback (avoids flashing partial URL-only presence before `hello` delivers exact `(x, y)`), monotonic `serverSeq`/`presenceSeq`, stale `connectionId`/`connectionSeq`/`seq` rejection, `4001` session replacement, and `MAP_PIXEL_BOUNDS` validation.
- **`scripts/devLanServerPlugin.mjs` & `scripts/devLanV015Handlers.mjs`:** Wired Vite `httpServer.on('upgrade', handler.handleUpgrade)`, `worldStateVersions` + `domainVersions` tracking (`bumpWorldStateVersion`), `world.stateVersion` in snapshots, `idempotencyKey` dedup on `/pet-care/session/patch`, and HTTP `403` enforcement for remote clients (`x-olw-remote-share: 1`) on `OUTSIDER_DEV_ID`, `/reset`, `/identities`, `/dev-console/*`, and `/world/create|invite|redeem`.
- **`src/features/network/NetworkDiagnosticsOverlay.tsx` + `src/shared/netcode/diagnostics.ts` + `TopStatusBar.tsx` + `src/styles/app.css`:** DEV-only (`import.meta.env.DEV`) diagnostics panel toggled by clicking `connection-pill` or `Ctrl+Shift+N`. Reports connection status, transport (`WSS`/`WS`/`SSE`), RTT/avg RTT (`RttJitterTracker` EWMA), RFC 3550 jitter, packet age, reconnect count, player count (`2/2`), sanitized local/remote session IDs & maps, on-map render status, authoritative state version, and outbound queue size. Never renders tokens, secrets, cookies, or emails; excluded from production bundle (`verify-prod-guard.mjs` verified).

### Phase C/D/E — Reconnect, Smooth Movement & Gameplay Sync
- **`src/shared/netcode/*` & `src/shared/*`:** Pure TS `backoff.ts`, `outboundQueue.ts` (max 64, coalesces transient movement/presence while preserving reliable events), `interpolation.ts`, `protocol.ts`, `minigameContract.ts`; extended `MovementPacket` (`vx`, `vy`, `posture`, `heldItem*`, `isSnapshotReplay`), `PresencePayload` (`presenceSeq`, `posture`, `heldItem*`), `selectLatestPresenceByUser` (prefers `presenceSeq`), `RemoteAvatarFilter` (`isSnapshotReplay`), and clock-skew-independent `resolveInviteLocalExpiryMs(ttlMs, nowLocalMs)`.
- **`src/lib/backend/devLanRealtimeClient.ts` & `src/app/App.tsx`:** WS primary with SSE fallback after repeated WS handshake failures; `2.5s` app ping/pong, `6.5s` half-open watchdog, `1.2s` `probeLiveness()` on `visibilitychange`/`online`/`pageshow`/`navigator.connection`, immediate browser `offline`/`online` handling, full state resync on `onWelcomeResync`, and monotonic request-sequence / version anti-rollback guards.
- **`src/game/scenes/WorldScene.ts` & `src/game/eventBus.ts`:** 10 Hz movement throttle (`MovementTxThrottle(100)`), velocity `(vx, vy)`, final stopped `idle` update, remote `RemoteMotionInterpolator`, per-remote `HeldItemRenderer` (and destroy cleanup), posture sync, and diagnostic metrics events (`evt:local-position-sync`, `evt:remote-render-status`).
- **`src/server/devLanFarmRoute.ts` & `src/server/devLanDonorRoute.ts`:** Added optional `idempotencyKey` replay protection on `/farm/apply`, `/farm/sell`, `/farm/buy-seed`, workshop/bakery/coop mutations (preserving `409 DUPLICATE_IDEMPOTENCY_KEY` on `/farm/ship` and `409 VERSION_CONFLICT` on `/farm/apply`), plus `bumpWorldStateVersion()` and `world_mutated` broadcasts across farm & donor inventory mutations.

---

## 4. Automated Verification Results (Post Final Edit)

| Check | Command | Scope & Result | Notes |
|---|---|---|---|
| **Live Quick Tunnel Spike** | `node scripts/spike-tunnel-transport.mjs` (against `https://hansen-sufficient-scout-hindu.trycloudflare.com`) | **PASS** (SSE reproduced buffered at `[2133..2133]ms`; WSS handshake `211ms`, avg RTT `88.86ms`, jitter `7.46ms`, reconnect `209ms`) | Verified over real Cloudflare Quick Tunnel before migrating gameplay |
| **Lint** | `npm run lint` | **PASS** (`0` errors, `2` pre-existing warnings in `App.tsx:2093`, `ChillFishingModal.tsx:90`) | Exit 0 |
| **TypeScript Build Check** | `npm run typecheck` (`tsc -b`) | **PASS** (`0` errors) | Exit 0 |
| **Production Bundle + PWA** | `npm run build` | **PASS** (2569 modules, VitePWA `26 entries`) | Exit 0 |
| **Production Security Guard** | `node scripts/verify-prod-guard.mjs` | **PASS** (3 JS bundles scanned, zero dev leaks or diagnostics UI strings) | Exit 0 |
| **Vitest Suite (excl. 2 baseline Phaser-jsdom files)** | `npx vitest run --exclude tests/unit/donorCabacosRenderDetect.test.ts --exclude tests/unit/pydewFarmDonorRender.test.ts` | **PASS**: **175 files / 837 tests passed** | Includes `multiplayerHardening.test.ts` (0/100/200/300ms RTT + jitter, Wi-Fi→5G blackhole + stale injection rejection, concurrent farm/pet idempotency & version conflict, WS/HTTP 401/403 security), `netcodeCore.test.ts` (7/7), `networkDiagnosticsOverlay.test.tsx` (1/1), `swPrecache.test.mjs` (2/2), `moduleBoundary.test.ts` (1/1), `playerFacingCopyGate.test.ts` (5/5) |
| **Baseline Vitest Caveat** | Prior full `npm run test` run before `dist/` | **2 pre-existing suite load errors**: `donorCabacosRenderDetect.test.ts` & `pydewFarmDonorRender.test.ts` (`HTMLCanvasElement.getContext()` null inside `phaser.esm.js` under `jsdom`) | Documented as pre-existing on baseline `f69106e` in `docs/PROGRESS.md`; `swPrecache.test.mjs` passes once `dist/sw.js` is built |
| **Playwright E2E — Desktop (2 Clients)** | `npx playwright test tests/e2e/multiplayer-ws-hardening.spec.ts tests/e2e/farming-co-op.spec.ts --project=chromium-desktop --reporter=list` (port `4179`) | **PASS**: **2 / 2 passed** (`multiplayer-ws-hardening` 6.0s, `farming-co-op` 3.6s) | Two independent contexts verify WS transport, `2/2` players, RTT, `home→garden` sync, offline→online reconnect, and authoritative farm `stateVersion` broadcast |
| **Playwright E2E — iPhone 16 Pro Max Portrait** | `npx playwright test tests/e2e/multiplayer-ws-hardening.spec.ts --project=chromium-iphone-16-pro-max --reporter=list` (port `4179`) | **PASS**: **1 / 1 passed** (`multiplayer-ws-hardening` 4.3s) | Verifies mobile portrait (`430×932`) `TopStatusBar` diagnostics toggle, WS recovery, and sync |
| **Baseline E2E UI Drift Note** | `tests/e2e/tiled-world-two-client.spec.ts --project=chromium-desktop` | **Pre-existing failure (`nav-outdoor` now opens `OutdoorWorldNavSheet` instead of jumping directly to `village`)** | Existing `QuickNavBar.tsx` UX behavior from prior milestone |

---

## 5. Shared-File Touch List (For Farming Agent Coordination)

Modified shared files on `feature/multiplayer-hardening`:
- `src/app/App.tsx`
- `src/features/pairing/OnboardingScreen.tsx`
- `src/game/scenes/WorldScene.ts`
- `src/game/eventBus.ts`
- `src/features/home/TopStatusBar.tsx`
- `src/styles/app.css`
- `src/lib/backend/types.ts`
- `src/lib/backend/devLanBackend.ts`
- `src/shared/types.ts`
- `src/shared/realtime.ts`
- `src/shared/couple/coupleTypes.ts`
- `src/shared/couple/coupleProtocol.ts`
- `scripts/devLanServerPlugin.mjs`
- `scripts/devLanServerPlugin.d.mts`
- `scripts/devLanV015Handlers.mjs`
- `scripts/olwRemoteShare.mjs`
- `src/server/devLanFarmRoute.ts`
- `src/server/devLanDonorRoute.ts`
- `package.json`, `package-lock.json`, `tsconfig.node.json`

New files isolated to networking/multiplayer/tests/reports:
- `scripts/devLanWsHub.mjs`, `scripts/olwRemoteShare.d.mts`, `scripts/spike-tunnel-transport.mjs`
- `src/shared/netcode/*` (`backoff.ts`, `diagnostics.ts`, `interpolation.ts`, `minigameContract.ts`, `outboundQueue.ts`, `protocol.ts`)
- `src/lib/backend/devLanRealtimeClient.ts`
- `src/features/network/NetworkDiagnosticsOverlay.tsx`
- `tests/unit/netcodeCore.test.ts`, `tests/unit/networkDiagnosticsOverlay.test.tsx`, `tests/server/multiplayerHardening.test.ts`, `tests/e2e/multiplayer-ws-hardening.spec.ts`
- `docs/reports/NET1_MULTIPLAYER_DIAGNOSIS_AND_BENCHMARK.md`

---

## 6. Pending Mandatory Owner Real-Device Verification Checklist

Real mobile hardware and cellular carrier transitions cannot be substituted by headless Chromium:

1. Start dev host on Windows (`npm run host:couple`) and open **Chia sẻ qua mạng ngoài** (`https://*.trycloudflare.com/__share/...`).
2. Join as **Mây** on PC and **Nắng** on **iPhone 16 Pro Max (Safari + PWA Add to Home Screen)**.
3. Tap the connection status pill (`Trực tuyến` / `Ctrl+Shift+N`) on both devices to open **Multiplayer Diagnostics**:
   - Confirm `Transport` shows **`WSS`**, `Players` shows **`2/2`**, and record measured **RTT**, **Jitter**, and **State version**.
4. Stand side by side across **Nhà (`home`) → Vườn (`garden`) → Trang trại (`farm`) → Làng (`village`)**; equip different held items / couple animations and verify smooth motion & matching held items/maps.
5. **Wi-Fi → 5G switch test on iPhone:** Toggle Wi-Fi off while moving on the same map (or immediately after changing maps), then verify:
   - Status transitions cleanly (`Offline` / `Reconnecting` → `Connected`), target recovery within 3–5s, `Reconnects` increments, `State version` catches up, and both players see each other on the exact current map.
6. **Lock screen & Safari background/resume test:** Lock iPhone for 5–10s, unlock/reopen PWA, and confirm automatic `probeLiveness()` + `welcome` snapshot recovery without losing wallet, farm, or inventory state.
7. **Concurrent farming & pet test:** Have both players till/plant/ship or interact with the cat simultaneously and verify zero duplicate harvest rewards and identical coin/crop counts after sync.

---

## 7. NET.1.1 Addendum — Remote Join Regression Fix & Live Quick Tunnel Verification

### Exact Root Cause Reproduced on Baseline `187285b`
1. **1/2 Host world did not auto-pair Partner B (`GET /api/dev-lan/world/snapshot` returned `200 { ok: true, data: null }`):** When Host (`Mây`) created a `1/2` world manually via `POST /world/create` before clicking **"Chơi cùng người thương"**, `seedCoupleWorldIfNeeded()` exited early (`if (existingId) return existingId`) without adding `Nắng` (`22222222-2222-4222-8222-222222222222`). Opening `/__share/<token>` signed the phone in as `Nắng`, but `GET /world/snapshot` returned `null` and forced `OnboardingScreen`.
2. **Over-broad host-admin route block (`403 FORBIDDEN`):** `scripts/devLanServerPlugin.mjs` placed `/world/redeem` and `/identities` inside `blockedRemoteRoute`. Attempting to redeem Host's invite code returned **`403` (`"Thao tác quản trị này chỉ mở trên máy chủ Host."`)**, and signing out triggered `GET /api/dev-lan/identities` -> **`403`**, leaving `"Chọn danh tính kiểm thử"` with 0 identity buttons.
3. **Proxy shutdown hang on WS connections:** `stopRemoteShare()` in `scripts/olwRemoteShare.mjs` waited for `proxyServer.close()` while upgraded WebSocket sockets stayed open.

### Security & Onboarding Fixes Applied
- `scripts/devLanServerPlugin.mjs`: added `ensureRemotePartnerInPrimaryWorld()` (preserves all existing 1/2 world data while adding `partner-b` cleanly and broadcasting `world_mutated('member')`); removed `/world/redeem` and `/identities` from `blockedRemoteRoute`; filtered remote `GET /identities` strictly to `[partner-b]`; blocked `POST /seed-couple`, `POST /world/create`, `POST /world/invite`, `POST /reset`, `/dev-console/*`, and any non-`partner-b` remote `x-dev-user-id` / `userId` (`Mây` impersonation or `Outsider`) with **`403 FORBIDDEN`**.
- `scripts/devLanWsHub.mjs`: tightened WS upgrade remote enforcement from `qUserId === OUTSIDER_DEV_ID` to `qUserId !== PARTNER_B_DEV_ID`.
- `src/features/pairing/OnboardingScreen.tsx` & `src/app/App.tsx`: passed `isRemoteClient` to hide host/dev UI controls and show partner-only entry if signed out.
- `scripts/olwRemoteShare.mjs`: tracked `upgradeSockets` and added bounded `500ms` close guard in `stopRemoteShare()`.

### NET.1.1 Verification (Clean Browser + Real Cloudflare Quick Tunnel)
- **Playwright NET.1.1 E2E (`tests/e2e/multiplayer-ws-hardening.spec.ts`, port `4179`):** `chromium-desktop` **2/2 passed (13.3s)**, `chromium-iphone-16-pro-max` **2/2 passed (12.2s)**.
- **Live Cloudflare Quick Tunnel clean-browser run (`https://lands-keep-compete-source.trycloudflare.com`):**
  - Host `Mây` manually created a `1/2` world (`btn-create-world`) and started Quick Tunnel (`cloudflared`).
  - Clean mobile browser (`430x932`, zero cookies/storage) navigated directly to `/__share/<token>` -> automatically landed inside `home` without onboarding or manual invite entry -> diagnostics reported **`Connected` / `WSS` / `2/2` / `RTT 92 ms (avg 189)` / `Jitter 10 ms` / `home (On map)`**; remote `POST /reset` returned **`403`** and `GET /identities` returned `['partner-b']`; full `page.reload()` preserved `Nắng` in `home` and reconnected over `WSS` (`RTT 81 ms`, `2/2`, `0` page errors).
- **Post-edit static/build/unit gate:** `npm run lint` (`0` errors, `2` pre-existing warnings), `npm run typecheck` (exit `0`), `npm run build` (`2569` modules, `26` PWA entries), `node scripts/verify-prod-guard.mjs` (**PASSED**), and 9 targeted regression Vitest files (**9/9 files, 27/27 tests passed**).
