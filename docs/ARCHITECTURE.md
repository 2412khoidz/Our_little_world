# Architecture & Technical Risk Analysis — Our Little World

## 1. Tổng quan kiến trúc (Spike 0 + V0.1)

```text
+--------------------+         +-------------------------+
| Windows Chrome/Edge|         | iPhone 16 Pro Max       |
|                    |         | Safari / Home Screen PWA|
+---------+----------+         +------------+------------+
          |                                 |
          +----- HTTPS / Auth Session ------+
                            |
             Static Web App (React 19 + Phaser 4)
          +-----------------+-----------------+
          |                                   |
  +-------v-------+                   +-------v-------+
  | React UI Shell| <--- EventBus --> | Phaser 4 Game |
  | (Forms/Modals)|                   | (60fps Canvas)|
  +-------+-------+                   +---------------+
          |
          v
  +-------+-------------------------------------------+
  | WorldBackend Adapter (src/lib/backend/)           |
  |  ├─ SupabaseBackend (Production / Cloud Dev)      |
  |  ├─ DevLanBackend (DEV ONLY: Vite HTTP + SSE LAN) |
  |  └─ UnconfiguredBackend (Prod fallback an toàn)   |
  +-------+-------------------------------------------+
          |
          v
  +-------+-------------------------------------------+
  | Supabase (Postgres + RLS + RPC + Private Realtime)|
  | - tables: profiles, worlds, world_members,        |
  |   world_invites, furniture_catalog,               |
  |   furniture_placements, furniture_placement_tiles,|
  |   mutation_idempotency                            |
  | - channel: private 'world:<world_id>'             |
  +---------------------------------------------------+

Tách biệt hoàn toàn trong Spike 0 (chưa tích hợp production):
[Windows Local Media PoC] <--- (Hướng V0.4: HTTPS riêng tư KHÔNG bắt cài VPN) ---> [iPhone <video playsInline>]
                                          ^
                                          +-- sync PoC qua Dev LAN SSE / 'cinema-spike:<world_id>'
```

## 2. Phân tách lớp (Layer Boundaries)

1. **`src/shared/` (Pure Domain Layer):**
   - Không import React, DOM, `window`, Supabase hay Phaser.
   - Chứa `types.ts`, `avatar.ts` (Zod validation + presets), `catalog.ts` (12 starter furniture items & default home layout), `maps.ts` (`home` 16x12 & `garden` 18x14 bounds, portals, static collisions, no-place zones), `placement.ts` (footprint & layer-slot validation), `realtime.ts` (10Hz TX throttle, sequence & bounds validator, stale timeout, `selectLatestPresenceByUser` chống trùng avatar khi 1 tài khoản đăng nhập nhiều thiết bị, position interpolation), `cinemaSync.ts` (RTT clock offset estimator, expected position, drift thresholds, CAS revision reducer, anti-echo guard).
2. **`src/lib/backend/` (Backend Adapter Layer):**
   - Chuẩn hóa giao tiếp qua interface `WorldBackend`.
   - `SupabaseBackend`: Gọi các `SECURITY DEFINER` RPCs trong Postgres và subscribe private channel (`private: true`) với quy trình reconnect: `refreshSession()` → resubscribe channel → `getWorldSnapshot()` → reconcile state → publish fresh presence.
   - `DevLanBackend` + `scripts/devLanServerPlugin.mjs` (**CHỈ TỒN TẠI KHI `import.meta.env.DEV`**): Middleware `configureServer` chạy trên Vite dev server cung cấp REST JSON + Server-Sent Events (`/api/dev-lan/*`) lưu trạng thái vào file `.dev-lan-state.json` (gitignored). Cho phép Windows laptop + điện thoại Android/iPhone trong cùng Wi-Fi chơi realtime nhiều người thật mà không cần Docker/Supabase local, vẫn giữ nguyên mọi kiểm tra membership/2-member cap/occupancy. Bị dead-code elimination loại hoàn toàn khỏi `dist/` khi build production.
   - `LocalPreviewBackend`: Giữ lại làm adapter nhẹ thuần in-browser phục vụ unit test logic trạng thái client.
   - `UnconfiguredBackend`: Fallback an toàn trong production nếu thiếu biến môi trường Supabase; không bao giờ cung cấp nút giả lập danh tính.
3. **`src/game/` (Phaser 4 Renderer Layer):**
   - Khởi tạo lazy qua dynamic `import()` để bundle shell ban đầu tải nhanh (< 3 MB compressed).
   - `pixelArt: true`, `roundPixels: true`, `antialias: false`, `DPR <= 2`.
   - `WorldScene` lập chỉ mục thực thể người thương theo `userId` (`selectLatestPresenceByUser`) để một tài khoản đăng nhập đồng thời trên nhiều thiết bị không sinh avatar nhân đôi và vẫn đồng bộ mượt.
   - Giao tiếp hai chiều với React thông qua `gameEventBus` (command đi xuống, sự kiện tương tác/telemetry đi lên).
4. **`src/features/` & `src/app/` (Mobile-First UI Shell & Zero-Config UX):**
   - HTML/CSS đảm nhiệm toàn bộ form, modal, onboarding, thông báo lỗi tiếng Việt thân thiện, accessibility (keyboard, focus, text zoom).
   - Trong bản production (`!import.meta.env.DEV`), mọi công cụ kỹ thuật (`Spike 0 Lab`, FPS/DPR/RTT, bộ chuyển danh tính dev) bị ẩn và loại khỏi luồng người dùng; chỉ giữ trải nghiệm 1 link HTTPS → đăng nhập đơn giản → Add to Home Screen iPhone → tự động reconnect.
   - Canvas chỉ xử lý hiển thị thế giới game và điều khiển chạm trong khung chơi.

## 3. Mô hình dữ liệu & Chống xung đột V0.1

- **Giới hạn 2 thành viên:** Hàm `redeem_world_invite` chạy `SELECT ... FOR UPDATE` trên hàng `worlds` trước khi đếm `world_members < 2`, đánh dấu `redeemed_at` một lần duy nhất cho token hash SHA-256.
- **Đặt nội thất atomic (`furniture_placement_tiles`):** Thay vì chỉ lưu `(tile_x, tile_y)` trên một bảng duy nhất (dễ bị lọt khi đồ rộng 2x1 hoặc 2x2 chồng mép lên nhau), mỗi ô chiếm chỗ được ghi vào bảng `furniture_placement_tiles` với khóa chính `(world_id, map_id, layer_slot, tile_x, tile_y)`.
  - Nếu 2 người đặt đồ chồng lên nhau cùng lúc, Postgres unique constraint chặn ngay giao dịch đến sau và trả lỗi có cấu trúc `TILE_OCCUPIED`; client rollback optimistic UI và refetch snapshot.
  - Chia `layer_slot` thành `'floor'` (thảm) và `'object'` (bàn, ghế, tủ) để thảm đặt được bên dưới bàn/sofa một cách tự nhiên.
- **Idempotency:** Bảng `mutation_idempotency` lưu `(world_id, idempotency_key)` để thao tác retry khi chập chờn mạng không tạo bản sao hoặc lỗi giả.

## 4. Phân tích rủi ro kỹ thuật (Technical Risks)

| Hạng mục | Rủi ro cụ thể | Biện pháp giảm thiểu đã triển khai trong kiến trúc | Trạng thái kiểm chứng |
|---|---|---|---|
| **1. Multiplayer Realtime & Background iOS** | iOS Safari đóng băng tab và cắt WebSocket chỉ sau vài giây khi chuyển app hoặc khóa màn hình; presence/movement có thể bị treo bóng ma (ghost avatar). | - Phân tách Presence (online), Broadcast (10 Hz transient movement, dừng phát khi đứng yên), và Postgres RPC (persistent state).<br>- Khi `visibilitychange` hoặc `online`: tự động `refreshSession()` → resubscribe → kéo snapshot mới nhất → gửi presence mới.<br>- Avatar đối phương tự mờ/biến mất nếu quá 5 giây không nhận gói mới khi offline; ẩn hoàn toàn nếu khác `mapId`. | Đã viết logic & test đa tab local (Chromium); **chưa test thật trên iPhone Safari qua 4G/Wi-Fi**. |
| **2. Safari trên iPhone & Touch UX** | `100vh` bị thanh địa chỉ Safari che; kéo ngón tay trong canvas làm cuộn/nảy toàn trang; WebGL context bị iOS thu hồi khi thiếu RAM hoặc background. | - Dùng `100dvh` + `env(safe-area-inset-*)`.<br>- Đặt `touch-action: none; user-select: none` **chỉ** trên `.game-canvas-host`, giữ nguyên cuộn và zoom ở modal HTML.<br>- Giới hạn `DPR <= 2`, pause game loop khi `document.hidden`, lắng nghe `webglcontextlost` / `webglcontextrestored`. | Đã kiểm tra layout `430x932` trên Playwright Chromium; **chưa test trên iPhone 16 Pro Max thật**. |
| **3. PWA trên iOS Safari** | Safari không có nút `beforeinstallprompt`; Service Worker cache nhầm token/API hoặc HTML lỗi thời; cập nhật version mới gây lệch schema. | - `registerType: 'prompt'` + banner nhắc cập nhật có kiểm soát.<br>- `runtimeCaching: []` và `globIgnores: ['spike/**']` để tuyệt đối không cache API Supabase, ảnh riêng tư hay video.<br>- Modal hướng dẫn trực quan thao tác `Chia sẻ → Thêm vào MH chính`. | Đã verify build `sw.js` & `manifest.webmanifest`; **chưa test Add to Home Screen trên iOS thật**. |
| **4. Hệ thống phát phim local (Cinema V0.4 — Không cài VPN phía người xem)** | Người dùng thứ hai không rành công nghệ không nên phải cài Tailscale/VPN; gọi HTTP local từ HTTPS PWA bị Safari chặn; MKV/HEVC/AC3/DTS/ASS không Direct Play trên Safari; autoplay bị chặn nếu thiếu user gesture. | - Giữ hoàn toàn tách biệt trong `Spike 0 Lab` ở giai đoạn V0.1.<br>- Giao thức sync dựa trên authoritative revision + CAS + RTT clock offset estimator + drift bands (`<=150ms` bỏ qua, `150–500ms` chỉnh rate `0.97–1.03`, `>500ms` seek) + Anti-Echo Guard.<br>- Trước V0.4 sẽ đánh giá các phương án **VPN-less HTTPS** phía server/host (ví dụ: Funnel HLS có xác thực ngắn hạn, WebRTC P2P từ Windows host hoặc fallback file local; xem MEDIA_SETUP.md) sao cho người xem chỉ mở link HTTPS mà vẫn bảo mật và chi phí gần 0. | Đã xác minh toán học sync + PoC 2 tab/LAN với MP4 H.264/AAC; **chưa thử tải thật lên iPhone và chưa chốt kiến trúc VPN-less V0.4**. |
| **5. Phaser 4 vs Phaser 3** | Phaser 4 (`4.2.1`) thay đổi mặc định `roundPixels = false` (dễ làm nhòe pixel art) và viết lại WebGL RenderNode. | - Bật tường minh `pixelArt: true`, `roundPixels: true`, `antialias: false` ở cả `GameConfig` và `Camera`.<br>- Không dùng custom shader pipeline cũ; dùng Tiled JSON standard layer. | Đã kiểm tra compile, render & tương tác trong Playwright Chromium. |
