# Subsystem Handover — Multiplayer & Remote Onboarding (`NET.1` / `NET.1.1`)

Tài liệu tham chiếu gốc: [NET1_MULTIPLAYER_DIAGNOSIS_AND_BENCHMARK.md](../reports/NET1_MULTIPLAYER_DIAGNOSIS_AND_BENCHMARK.md) · [PROGRESS.md](../PROGRESS.md)

## 1. Current Canonical Implementation & Exact Source Paths
- **Netcode thuần TS:** `src/shared/netcode/` (`protocol.ts`, `backoff.ts`, `outboundQueue.ts`, `interpolation.ts`, `diagnostics.ts`, `minigameContract.ts`), cùng `src/shared/realtime.ts`, `src/shared/types.ts`, `src/shared/couple/{coupleTypes,coupleProtocol}.ts`.
- **Realtime Client & Adapters:** `src/lib/backend/devLanRealtimeClient.ts` (WS primary + SSE fallback, ping `2.5s`, watchdog `6.5s`, `probeLiveness()` `1.2s`), `src/lib/backend/devLanBackend.ts`, `src/lib/backend/devLanSessionHeaders.ts`, `src/lib/backend/supabaseBackend.ts`.
- **Dev LAN Server, WS Hub & Quick Tunnel Proxy:** `scripts/devLanWsHub.mjs` (`WebSocketServer({ noServer: true, maxPayload: 64 * 1024 })`), `scripts/devLanServerPlugin.mjs` (`ensureRemotePartnerInPrimaryWorld`, `bumpWorldStateVersion`, auth guards), `scripts/olwRemoteShare.mjs` (proxy HTTP + WS `/__share/<token>`, HMAC cookie `olw_remote_share`, `upgradeSockets` cleanup), `scripts/olwTunnelBinary.mjs`, `scripts/spike-tunnel-transport.mjs`.
- **UI & Scene Integration:** `src/app/App.tsx`, `src/features/pairing/OnboardingScreen.tsx` (`isRemoteClient`), `src/features/home/TopStatusBar.tsx`, `src/features/network/NetworkDiagnosticsOverlay.tsx` (`import.meta.env.DEV` only), `src/game/scenes/WorldScene.ts` (`MovementTxThrottle`, `RemoteMotionInterpolator`).

## 2. Existing Architecture & Contracts
- **Transport:** WebSocket `/api/dev-lan/ws` qua Cloudflare Quick Tunnel (`WSS`) thay thế SSE làm kênh chính (do SSE bị Cloudflare Quick Tunnel edge-buffer đến khi đóng stream); giữ SSE fallback có kiểm soát khi WS handshake lỗi liên tiếp.
- **State Sync & Ordering:** Mọi kết nối nhận `welcome` snapshot (`serverSeq`, `stateVersion`, `domainVersions`, `presences`, `latestMovements`), gói rời mạng chốt `idle`, hàng đợi `BoundedOutboundQueue(64)`, chống lệch đồng hồ bằng `resolveInviteLocalExpiryMs(ttlMs, nowLocalMs)` và chống rollback snapshot bằng `serverSeq` / `stateVersion` + `idempotencyKey`.
- **Remote Security (`x-olw-remote-share: 1`):** Mở `/__share/<token>` tự gán phiên `PARTNER_B_DEV_ID` (**Nắng**), tự ghép Nắng vào ngôi nhà 1/2 sẵn có của **Mây** (giữ nguyên toàn bộ đồ/pet/farm), cho phép `/world/redeem` & `GET /identities` (chỉ trả `[partner-b]`), đồng thời **chặn HTTP `403`** mọi route quản trị Host (`/reset`, `/seed-couple`, `/world/create`, `/world/invite`, `/dev-console/*`, `POST/DELETE /remote-share`, giả mạo `Mây`/`Outsider`).

## 3. Verified Donor Repositories & Imported Modules
- `websockets/ws` (`^8.23.0`) → `scripts/devLanWsHub.mjs`.
- `socketio/socket.io` (`backo2`) → `ReconnectBackoff` trong `src/shared/netcode/backoff.ts`.
- `colyseus/colyseus` → room `welcome` snapshot, `4001` supersede semantics trong `devLanWsHub.mjs`.
- `Kaetram/Kaetram-Open` & `mozilla/BrowserQuest` → `RemoteMotionInterpolator` (`SNAP_DISTANCE_PX = 96`, `MAX_EXTRAPOLATION_MS = 160`, `MAX_VELOCITY_PX_PER_SEC = 180`) trong `src/shared/netcode/interpolation.ts`.

## 4. Owner-Approved Behavior
- Host bấm chia sẻ Quick Tunnel và gửi 1 link `/__share/<token>`: đối phương mở trên iPhone Safari vào thẳng thế giới cùng **Mây** với vai **Nắng**, không qua màn hình cấu hình phức tạp hay VPN.
- Mở Network Diagnostics (`Ctrl+Shift+N` hoặc chạm badge kết nối ở dev) chỉ tồn tại trong `import.meta.env.DEV`, bị loại sạch khỏi production build (`verify-prod-guard.mjs`).
- Đã được chủ dự án test thiết bị thật NET.1.1 (`27560ac`): **9/11 kịch bản pass, 0 fail, 2 chưa test**.

## 5. Known Bugs & Untested Scenarios
- 2 kịch bản real-device ở vòng NET.1.1 chưa hoàn tất + cần xác nhận lại tổ hợp hợp nhất `v0.2.5` trên **iPhone 16 Pro Max Safari (PWA Add to Home Screen) ↔ Quick Tunnel** khi chuyển Wi-Fi ↔ 5G và khóa màn hình lâu.
- `SupabaseBackend` chưa nghiệm thu thực tế đa mạng trên Supabase Cloud project thật.
- Spec E2E cũ `tests/e2e/tiled-world-two-client.spec.ts` có drift selector nút `nav-outdoor` có sẵn trước NET.1.

## 6. Historical Regressions That Must Not Return
- **SSE edge-buffering** trên Cloudflare Quick Tunnel (tuyệt đối không quay lại SSE làm kênh chính).
- **Lỗi `2/2` / `OnboardingScreen` trên `/__share/<token>`:** Host tạo sẵn nhà `1/2` trước khi bật chia sẻ khiến `Nắng` bị kẹt onboarding hoặc bị HTTP `403` tại `/world/redeem` / `/identities`.
- **Lệch đồng hồ giữa Windows & iPhone** làm hết hạn oan mã mời hoặc ghi đè presence mới bằng snapshot cũ (`stale packet`).
- **Treo proxy shutdown (`stopRemoteShare()`)** do không đóng `upgradeSockets` WS.
- **Lọt `NetworkDiagnosticsOverlay` hoặc dev routes vào production bundle** (`verify-prod-guard.mjs`).

## 7. Focused Test Commands
```bash
npx vitest run tests/unit/netcodeCore.test.ts tests/unit/networkDiagnosticsOverlay.test.tsx tests/unit/realtimePresenceSync.test.ts tests/server/multiplayerHardening.test.ts tests/server/remoteShareTunnel.test.mjs tests/server/devLanServer.test.ts tests/server/swPrecache.test.mjs
npx playwright test tests/e2e/multiplayer-ws-hardening.spec.ts --project=chromium-desktop
npx playwright test tests/e2e/multiplayer-ws-hardening.spec.ts --project=chromium-iphone-16-pro-max
node scripts/verify-prod-guard.mjs
```

## 8. Dependencies on Other Subsystems
- Vận chuyển dùng chung cho **World Movement/Couple Actions** (`WorldScene.ts`), **Billiards V2** (`minigame_event`), **Deep Farming Co-op** (`world_mutated`, `stateVersion`, `idempotencyKey`), và **Pet Care V2** (`/pet-care/session/patch`).
- Sửa `devLanServerPlugin.mjs` / `devLanWsHub.mjs` / `App.tsx` bắt buộc kiểm tra lại cả Billiards V2 và Farming Co-op.
