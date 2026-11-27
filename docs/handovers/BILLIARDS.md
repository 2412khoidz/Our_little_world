# Subsystem Handover — Billiards V2 (`minigame_event` over `NET.1`)

## 1. Current Canonical Implementation & Exact Source Paths
- **Pure TS Physics & Protocol:**
  - `src/shared/billiards/types.ts` (Zod schemas: `BallStateSchema`, `ShotParamsSchema`, `MatchSnapshot`, `BilliardsTransport`, `8ball` / `9ball`, `online` / `local_pvp` / `ai`)
  - `src/shared/billiards/physicsEngine.ts` (deterministic fixed-timestep engine: `FIXED_STEP_DT = 1/120`, `FIXED_SUBSTEPS = 4`, table `1000×540`, `BALL_R = 13.5`)
  - `src/shared/billiards/protocol.ts` (versioned state machine, turn/foul rules, late/stale packet rejection, snapshot resync)
- **React UI, Audio & Lazy Shell:** `src/features/minigames/billiards/` (`BilliardsModal.tsx`, `LazyBilliardsModal.tsx`, `useBilliardsSync.ts`, `sound.ts`, `billiards.css`, `index.ts`), `src/features/home/MenuModal.tsx`.
- **Overworld Suspension Bridge:** `src/game/eventBus.ts` & `src/game/scenes/WorldScene.ts` (`cmd:set-render-suspended`, cập nhật `data-render-suspended`), `src/app/App.tsx`, `src/features/study/ambientAudio.ts`.
- **Backend / Server / SQL:** `scripts/devLanBilliardsHandlers.mjs`, `scripts/devLanServerPlugin.mjs`, `scripts/devLanWsHub.mjs` (`minigame_event`), `src/lib/backend/{types,devLanBackend,localPreviewBackend,supabaseBackend,unconfiguredBackend}.ts`, `supabase/migrations/20261126000100_v02_billiards_minigame.sql`, `supabase/tests/billiards_matches.sql`.

## 2. Existing Architecture & Contracts
- **Deterministic Fixed-Timestep Simulation:** `MICRO_DT = (1/120)/4` giây bảo đảm sai số vật lý `0.000000 px` giữa các thiết bị 30/60/120/144 FPS và chế độ `0.5x Slow-Mo Replay`.
- **Network Budget & Sync:** Aim sync giới hạn `AIM_THROTTLE_MS = 100` (`<= 10 Hz`, giữ an toàn dưới ngưỡng Supabase `eventsPerSecond: 15`), kết nối qua `BilliardsTransport` chuyển tải `minigame_event` trên WebSocket `devLanWsHub.mjs` (hoặc Supabase Realtime private channel); đồng bộ phục hồi snapshot qua `billiards:state_request` + `RETRY_REQUEST_MS = 600`.
- **Overworld Isolation:** Khi mở `BilliardsModal`, app phát `cmd:set-render-suspended` để tạm dừng vòng render Phaser overworld nhằm tiết kiệm pin/GPU trên iPhone, sau đó khôi phục hoàn toàn và giữ nguyên vị trí/input overworld khi đóng.

## 3. Verified Donor Repositories & Imported Modules
- Tự triển khai gốc (clean TypeScript + Canvas 2D / WebAudio + Zod schemas) gắn trực tiếp vào kiến trúc NET.1 WS & Backend Adapter của **Our Little World** ở commit `3a89a9e`. Không dùng thư viện vật lý hay binary bên thứ ba ngoài `zod` và WebAudio tổng hợp trong `sound.ts`.

## 4. Owner-Approved Behavior
- Mini-game PvP thân thiện giữa 2 người (`online`, `local_pvp`, `ai`), lazy-load không làm phình chunk khởi động chính (`BilliardsModal-*.js` & `BilliardsModal-*.css` tách riêng).
- Đóng/mở nhiều chu kỳ không rò rỉ DOM/heap và không khóa điều khiển nhân vật khi trở lại overworld (`data-render-suspended` chuyển `1` → `0`).
- Có bàn bi-a đặt tại world/menu và lưu ván idempotent (`billiards_matches`).

## 5. Known Bugs & Untested Scenarios
- `supabase/migrations/20261126000100_v02_billiards_minigame.sql` & `supabase/tests/billiards_matches.sql` chưa chạy xác nhận trên Supabase Cloud project thật.
- Chưa playtest 2 máy thật (Windows PC ↔ iPhone Safari qua Cloudflare Quick Tunnel) sau khi hợp nhất vào `v0.2.5`.

## 6. Historical Regressions That Must Not Return
- **Treo/mất điều khiển overworld sau khi thoát Bi-a:** Quên phát `cmd:set-render-suspended: false` khi đóng modal hoặc lỗi cleanup listener.
- **Lệch kết quả giữa 60Hz PC và 120Hz ProMotion iPhone:** Cấm thay đổi hằng số `FIXED_STEP_DT` / `FIXED_SUBSTEPS` sang variable delta-time.
- **Gói tin trễ ghi đè ván mới:** Luôn kiểm tra `matchId`, `shotIndex` và `baseStateVersion` trong `protocol.ts`.

## 7. Focused Test Commands
```bash
npx vitest run tests/unit/billiardsPhysicsDeterminism.test.ts tests/unit/billiardsProtocol.test.ts tests/unit/billiardsModalLifecycle.test.tsx tests/server/billiardsDevLan.test.ts
npx playwright test tests/e2e/billiards-multiplayer.spec.ts --project=chromium-desktop
```

## 8. Dependencies on Other Subsystems
- **Multiplayer (`NET.1`):** Yêu cầu `minigame_event` qua `devLanWsHub.mjs` / `supabaseBackend.ts` và phiên 2 thành viên.
- **Phaser Overworld (`WorldScene.ts`):** Phụ thuộc `cmd:set-render-suspended` để nhường GPU khi chơi Bi-a và phục hồi input + presence ngay khi đóng.
- **Audio:** Tương tác với `ambientAudio.ts` khi tạm dừng/phát âm thanh bàn bi-a.
