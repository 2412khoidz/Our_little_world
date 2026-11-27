# Subsystem Handover — Billiards V3 (2D & 3D, Modes, Online Lobby & Restored Controls)

## 1. Current Implementation & Exact Source Paths (`feat/billiards-v3`)
- **Pure TS Physics, AI & Protocol:**
  - `src/shared/billiards/types.ts` (Zod schemas: `BilliardsEdition`, `BotDifficulty`, `Billiards3DQuality`, `BallStateSchema`, `ShotParamsSchema`, `MatchSnapshot`, `BilliardsLobbyState`, `LobbyConfirmedConfig`, `billiards:lobby_*` wire events)
  - `src/shared/billiards/physicsEngine.ts` (deterministic 2D fixed-timestep engine: `FIXED_STEP_DT = 1/120`, `FIXED_SUBSTEPS = 4`, table `1000×540`, `BALL_R = 13.5`)
  - `src/shared/billiards/physics3dEngine.ts` (deterministic 3D real-scale metric engine transplanted từ donor 3D: `FIXED_STEP_3D = 1/120`, `SUBSTEPS_3D = 6`, bàn 9ft `2.54m × 1.27m`, `BALL_R_3D = 0.028575`, hỗ trợ Massé elevation `0°..45°`)
  - `src/shared/billiards/botAi.ts` (`computeBotShot2D`, `chooseBotBallInHand2D`, `computeBotShot3D`, `chooseBotBallInHand3D`)
  - `src/shared/billiards/protocol.ts` & `src/shared/billiards/lobbyProtocol.ts` (versioned match state machine + shared lobby ready check, asset-readiness gating, countdown & rematch state machine)
- **React UI, Keyboard, Touch, Portrait & Lazy Modules:**
  - `src/features/minigames/billiards/`: `BilliardsModal.tsx` (wrapper + `React.lazy` boundary, chỉ auto-vào bàn khi countdown do chính phiên lobby vừa kích hoạt kết thúc), `LazyBilliardsModal.tsx`, `BilliardsEntryMenu.tsx` (kèm SVG bàn 2D/3D & card **Luyện tập tự do**), `BilliardsOnlineLobby.tsx` (banner chọn `Tiếp tục ván đang dở` vs `Tạo phòng mới`), `Billiards2DGame.tsx` (bàn dọc `-90°` auto/dọc/ngang trên mobile, shading cầu 3D, tia ngắm bi cái + bi mục tiêu, pinch zoom), `Billiards3DGame.tsx` (Three.js 3D, portrait top-view & follow framing, tách gesture 1 ngón ngắm vs 2 ngón camera), `viewportTransform.ts`, `touchControls.ts`, `useFocusMode.ts`, `useBilliardsKeyboard.ts`, `useBilliardsSync.ts`, `localStats.ts`, `sound.ts`, `billiards.css` (mobile 2-row zero-overlap HUD), `billiards3d.css`, `billiardsGameProps.ts`.
- **Overworld Suspension Bridge:** `src/game/eventBus.ts`, `src/game/scenes/WorldScene.ts`, `src/app/App.tsx` (kèm `billiards-invite-banner` và phân tách `handleBilliardsMatchComplete` chỉ lưu DB khi `mode === 'online'`), `src/features/study/ambientAudio.ts`.
- **Backend / Server / SQL:** `scripts/devLanBilliardsLobby.mjs`, `scripts/devLanBilliardsHandlers.mjs`, `scripts/devLanWsHub.mjs` (`serverNowMs` trong `welcome`/`pong`, `SERVER_LOBBY_SESSION_ID`), `src/lib/backend/devLanRealtimeClient.ts` (EWMA server clock offset), `supabase/migrations/20261126000100_v02_billiards_minigame.sql`.

## 2. Donor Sources & Architecture Notes
- **Donor 2D V2 (Owner):** `C:\Users\admin\Downloads\our_little_world_billiards_pack_v2.zip` -> dùng đối chiếu hành vi phím `Space` nạp lực dao động, `ArrowLeft`/`ArrowRight` + `Shift`, `Z` soi cận cảnh và luồng điều khiển bàn 2D.
- **Donor 3D Edition (Owner):** `C:\Users\admin\Downloads\our_little_billiards_3d_8_ball_pool_edition(1).html` -> nguồn chuyển ghép trực tiếp toàn bộ Three.js scene (bàn gỗ gụ/chrome, bóng procedural texture + quaternion spin, đèn overhead + accent, cơ bi-a có strike animation, dải ngắm 3D ribbon, 3 góc cam `follow`/`top`/`orbit`, Massé `0°..45°`, Web Audio metric foley) vào `physics3dEngine.ts` + `Billiards3DGame.tsx` + `billiards3d.css`.
- **Two Separate Simulation Adapters:** Bản 2D (`1000×540` px) và 3D (`2.54×1.27` m) giữ 2 physics/render adapter tách biệt, đồng bộ qua giao thức `protocol.ts` chung và chuyển đổi tọa độ `wireToBalls3D` / `balls3DToWire` ở biên giới wire/snapshot.
- **Overworld & Lifecycle:** Mở `BilliardsModal` tạm dừng render Phaser overworld (`cmd:set-render-suspended: true`); khi thoát sẽ dispose renderer WebGL/textures/geometries/materials, timer, RAF và listener, đồng thời khôi phục overworld & nhạc nền biome.

## 3. Supported Editions × Modes Matrix
- **2D × Local 2P (8-Bi & 9-Bi):** Playable & E2E verified (desktop + 430×932 mobile touch).
- **2D × Bot (Dễ / Vừa / Cao thủ, 8-Bi & 9-Bi):** Playable & unit/E2E verified, thống kê tách riêng ở `localStorage`.
- **2D × Online (8-Bi & 9-Bi):** Playable & 2-client WS E2E verified (invite, ready check, asset gate, countdown, full match, reconnect, mutual rematch, idempotent DB stats, ghép được giữa PC màn ngang và mobile màn dọc).
- **2D & 3D × Luyện tập tự do (`practice`):** Playable & E2E verified — không giới hạn lượt/đồng hồ, đặt lại bi cái tự do.
- **3D × Local 2P (8-Bi & 9-Bi):** Playable & E2E verified (3 cameras, Massé slider, `Space` shoot, 3x open/close disposal).
- **3D × Bot (Dễ / Vừa / Cao thủ, 8-Bi & 9-Bi):** Playable & unit/E2E verified.
- **3D × Online (8-Bi & 9-Bi):** Playable & 2-client WS E2E verified (invite toast, 3D asset preload gate, synchronized countdown start, deterministic synced shot & reload recovery).

## 4. Known Bugs, Limits & Untested Scenarios
- Chưa playtest thực tế trên iPhone 16 Pro Max (Safari/PWA) qua Cloudflare Quick Tunnel — FPS/nhiệt WebGL 3D hiện mới kiểm trên Chromium desktop (`430×932` emulation) chứ chưa kiểm phần cứng iPhone thật.
- Migration SQL & RPC Bi-a trên Supabase Cloud thật chưa chạy xác nhận sau bản V3.
- Trong chế độ `3D Online`, nếu `confirmedOnlineConfig` được cập nhật cho ván mới cùng lúc có rớt mạng kéo dài, client dựa vào cache `lastMatchSnapshot` + `billiards:state_request` từ server/peer để hồi phục.

## 5. Historical Regressions That Must Not Return
- **Treo/mất điều khiển overworld sau khi thoát Bi-a:** Quên phát `cmd:set-render-suspended: false` khi đóng modal hoặc lỗi cleanup listener/keyboard capture.
- **Phím `Space` mất tác dụng sau khi kéo `<input type="range">`:** Luôn loại trừ `range`/`button`/`checkbox`/`radio` trong `isEditableTarget()` của `useBilliardsKeyboard.ts`.
- **Lệch kết quả giữa 60Hz PC và 120Hz ProMotion iPhone:** Cấm thay đổi hằng số `FIXED_STEP_DT` / `FIXED_STEP_3D` sang variable delta-time.
- **Gói tin trễ ghi đè ván mới:** Luôn kiểm tra `matchId`, `matchSeq`, `shotSeq`, `configVersion` và `baseStateVersion` trong `protocol.ts` & `lobbyProtocol.ts`.

## 6. Focused Test Commands
```bash
npx vitest run tests/unit/billiardsTouchAndViewport.test.ts tests/unit/billiards3dPhysicsDeterminism.test.ts tests/unit/billiardsBotAi.test.ts tests/unit/billiardsControlsAndLifecycle.test.tsx tests/unit/billiardsLobbyProtocol.test.ts tests/unit/billiardsModalLifecycle.test.tsx tests/unit/billiardsPhysicsDeterminism.test.ts tests/unit/billiardsProtocol.test.ts tests/server/billiardsLobbyWs.test.ts tests/server/billiardsDevLan.test.ts
npx playwright test tests/e2e/billiards-multiplayer.spec.ts tests/e2e/billiards-v3-modes.spec.ts --project=chromium-desktop
npx playwright test tests/e2e/billiards-v3-modes.spec.ts -g "mobile touch controls" --project=chromium-iphone-16-pro-max
```

## 7. Dependencies on Other Subsystems
- **Multiplayer (`NET.1`):** Yêu cầu `minigame_event` qua `devLanWsHub.mjs` / `supabaseBackend.ts` và `serverNowMs` clock offset từ `devLanRealtimeClient.ts`.
- **Phaser Overworld (`WorldScene.ts`):** Phụ thuộc `cmd:set-render-suspended` để nhường GPU khi chơi Bi-a và phục hồi input + presence ngay khi đóng.
- **Audio:** Tương tác với `ambientAudio.ts` khi tạm dừng/phát âm thanh bàn bi-a.
