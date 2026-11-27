# Our Little World

**Our Little World** là một cozy game 2D pixel art kết hợp không gian số riêng tư dành cho một cặp đôi yêu xa — được thiết kế ưu tiên **iPhone Safari / PWA** và **Windows Chrome / Edge**.

Hiện tại phiên bản **Canonical Stable Baseline (`v0.2.5` trên nhánh `main`)** đã hợp nhất đầy đủ trải nghiệm chơi cùng nhau từ `integration/olw-canonical-rc1` sau playtest phê duyệt của chủ dự án. Xem [chỉ mục tài liệu](docs/README.md) và [tiến độ dự án](docs/PROGRESS.md).

---

## Tính năng trong Canonical Baseline (`v0.2.5`)

- **Thế giới riêng tư cho 2 người (`Mây` & `Nắng`) + NET.1.1 Multiplayer:**
  - Vận chuyển realtime **WebSocket** (`ws`) qua **Dev LAN Relay** + **Cloudflare Quick Tunnel** (`npm run host:couple`), hỗ trợ **Remote Partner Auto-Join** qua link `/__share/<token>` vào thẳng thế giới chung với vai `Nắng`, heartbeat ping/pong, reconnect backoff/watchdog, điều phối chuyển động mượt (`RemoteMotionInterpolator`) và khóa quyền host trên client từ xa (`HTTP 403`).
  - Hỗ trợ ghép đôi Supabase (`worlds` + `world_members` + RLS + RPC atomic tối đa 2 thành viên) khi cấu hình `.env`.
- **Thế giới Pixel Art `16×16` (6 khu vực):** Bản đồ Tiled JSON liên thông `home`, `garden`, `village`, `forest`, `beach`, `farm` với camera pixel-perfect (`pixelArt: true`, `roundPixels: true`), NPCs & chu kỳ ngày/đêm, cùng nhạc nền riêng theo khu vực.
- **Avatar Cozy Human V2 & Thú cưng (2D + 3D Pet Care V2):** Tùy chỉnh ngoại hình đồng bộ realtime; mèo 2D `Quýt` đi dạo quanh nhà/vườn + phòng chăm sóc mèo 3D tương tác (`vuena-cat.glb`, hiệu ứng vuốt ve, cho ăn, chơi đồ chơi, preset đồ họa và âm thanh mèo CC0).
- **Deep Farming (Checkpoints A–G) & Kinh tế chung:** Hệ thống nông trại chiều sâu với **40 loại nông sản**, **20 loài hoa** (nhân giống hoa), **12 cây ăn quả** (orchard), **7 loài vật nuôi** (chuồng & chăm sóc), **84 công thức** & **8 xưởng chế biến** (`DonorWorkshopModal`), bảng đơn hàng (`OrderBoardModal`), thời tiết/mùa vụ và lưu trạng thái đồng bộ.
- **Billiards V2 Realtime:** Bàn bi-a 8-ball chơi 2 người đồng bộ qua WebSocket NET.1 (`minigame_event`), deterministic physics, replay và tạm dừng/khôi phục overworld mượt mà.
- **Mobile-first & PWA:** Bố cục `100dvh` hỗ trợ safe-area iPhone, điều khiển chạm để đi / joystick ảo / bàn phím WASD, trang trí nội thất theo lớp `floor`/`object`, Service Worker + Web App Manifest + hướng dẫn cài Add to Home Screen trên Safari, và `Spike 0 Lab` cô lập.

---

## Cài đặt, Asset Riêng Tư & Lệnh Chạy

### Yêu cầu môi trường
- **Node.js:** `>= 22.12` (đã xác minh trên Node `v24.18.0` và `npm 11.16.0`)
- **Python 3 + Pillow:** Chỉ cần nếu muốn tái tạo hoặc đóng gói lại private atlas local (`npm run assets:atlas:private`).
- **FFmpeg:** Tùy chọn, chỉ cần nếu muốn tạo lại video mẫu cho Spike 0 (`npm run spike:video`).

### 1. Cài thư viện & đồng bộ Private Runtime Assets (Local-only)

Bộ asset nghệ thuật và 5 track nhạc nền riêng tư không nằm trong Git public (`public/assets/private-unified/` và `public/assets/private-audio/` được `.gitignore` chặn). Xem chi tiết tại [docs/PRIVATE_ASSETS_SETUP.md](docs/PRIVATE_ASSETS_SETUP.md).

```bash
# 1. Cài đặt thư viện
npm install

# 2. Đồng bộ 15 file private runtime assets từ worktree đã duyệt (không copy .env hay file save)
npm run assets:private:sync -- --from ../OLW-Neon

# 3. Kiểm tra toàn vẹn SHA-256, PNG atlas và kích thước manifest trước khi chạy
npm run assets:private:verify
```

### 2. Chạy Host chơi cùng nhau (`npm run host:couple` / `npm run dev`)

```bash
# Khởi chạy server dev cho Host (Windows) + hỗ trợ Cloudflare Quick Tunnel cho Nắng
npm run host:couple
# Hoặc tương đương:
npm run dev
```

- Mở `http://localhost:5173` trên máy Host (**Mây**), tạo hoặc tiếp tục thế giới và bật bảng **Chia sẻ qua mạng ngoài** để lấy link `https://*.trycloudflare.com/__share/<token>` gửi cho **Nắng** trên iPhone Safari / thiết bị cùng Wi-Fi (`http://<IP-máy-Windows>:5173`).
- File save cục bộ (`.dev-lan-state.json`) và thông số dev switcher chỉ tồn tại khi `import.meta.env.DEV === true`, bị loại hoàn toàn khỏi production build (`npm run build`).
- Để chạy build/preview profile private trên máy cục bộ (yêu cầu đã chạy `npm run assets:atlas:private` khi có pack nguồn): `npm run build:private` và `npm run preview:private`.

---

## Chính sách nhánh (Branching Policy)

- **`main`** (gắn tag phát hành, hiện tại **`v0.2.5`**) là **nhánh Canonical Stable duy nhất** của dự án.
- **Bắt buộc:** Mọi nhánh tính năng mới (`feat/*`), sửa lỗi (`fix/*`) hoặc dọn dẹp (`chore/*`) đều phải tạo mới từ commit mới nhất trên `main`:
  ```bash
  git checkout main && git pull --ff-only origin main
  git checkout -b feat/ten-tinh-nang-moi
  ```
- Tuyệt đối không tạo nhánh mới từ các nhánh thử nghiệm/feature cũ hoặc worktree chưa chạy `npm run assets:private:verify`.
- Không commit/push `.dev-lan-state*.json`, `.env`, thông tin bí mật, hay thư mục `public/assets/private-*` / `public/assets/local-licensed/`.

---

## Giới hạn đã biết (Known Limitations)

- **Vitest jsdom vs Canvas 2D:** 2 file unit test rendering donor cũ từ baseline (`tests/unit/donorCabacosRenderDetect.test.ts` và `tests/unit/pydewFarmDonorRender.test.ts`) dùng Canvas 2D pixel detection của Phaser trong môi trường `jsdom` mặc định nên không khả dụng trên `jsdom`; luồng render thực tế được kiểm chứng bằng Playwright Chromium (`npm run test:e2e`) và kiểm tra trình duyệt.
- **Kiểm thử đa thiết bị thực tế trên RC1 hợp nhất:** Bản `NET.1.1` đã qua real-device test (`9/11` kịch bản pass, `0` fail), tuy nhiên tổ hợp đầy đủ sau khi gộp **Deep Farming + Billiards V2 + Vuena Cat** vẫn cần xác nhận thêm trên iPhone Safari thật (PWA Add to Home Screen) qua Cloudflare Quick Tunnel khi có thời gian playtest cặp đôi.
- **Supabase SQL & Cloud Production:** Bộ migration mới cho Deep Farming & Billiards (`supabase/migrations/*`) cần được chạy và xác nhận trên Supabase project thật trước khi chuyển hoàn toàn sang cloud mode.
- **Private Assets khi deploy Internet:** Bản `npm run build` (`dist/`) dùng profile public CC0/MIT đã xác minh bản quyền; các pack private vẫn chỉ chạy trên host local cá nhân cho đến khi xác minh quyền phân phối công khai. [Quy trình asset](docs/art/ASSET_PIPELINE.md#4-tạo-bản-phát-triển-riêng-và-bản-public) · [Credits public](public/assets/unified/CREDITS.md) · [Audio Credits](public/assets/audio/CREDITS.md)

### Kết nối Supabase thật (tùy chọn cho dev/test đa mạng)

1. Tạo project Supabase mới (tách riêng dev và production).
2. Trên project Test riêng, chạy lần lượt 3 file migration trong `supabase/migrations/`:
   - `20261124000100_v01_core_worlds_and_auth.sql`
   - `20261124000200_v01_furniture_and_occupancy.sql`
   - `20261124000300_v01_realtime_private_channels.sql`
3. Sao chép `.env.example` thành `.env` và điền:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```
4. Khởi động lại `npm run dev` (hoặc `npm run build && npm run preview`).

---

## Lệnh kiểm thử & Build

```bash
npm run lint        # Kiểm tra ESLint
npm run typecheck   # Kiểm tra TypeScript strict
npm run test        # Chạy unit & local-backend integration tests (Vitest)
npm run build       # Build production + tạo PWA Service Worker & Manifest
npm run test:e2e    # Chạy Playwright E2E (desktop + viewport iPhone 16 Pro Max)
```

---

## Cấu trúc thư mục

```text
├── AGENTS.md                 # Quy ước cho coding agent
├── docs/                     # Tài liệu sản phẩm, kiến trúc, quyết định, bảo mật, test, tiến độ
├── public/
│   ├── assets/               # Starter CC0 tileset, furniture, Tiled JSON maps, asset manifest
│   ├── icons/                # PWA icons & apple-touch-icon
│   └── spike/                # Video mẫu MP4 cho Spike 0 (không cache qua SW)
├── scripts/                  # Tạo starter art, import external pack, tạo video mẫu Spike 0
├── src/
│   ├── app/                  # Root app shell & lifecycle reconnect
│   ├── features/             # Onboarding/Pairing, Home/Decorate, Avatar, PWA, Spike 0 Lab
│   ├── game/                 # Phaser 4 engine, scenes, spritesheet builder, pathfinding
│   ├── lib/                  # Env, Supabase client, Backend Adapters (Supabase & Local Preview)
│   ├── shared/               # Pure domain types, catalogs, collision/placement, sync math
│   └── styles/               # Cozy pastel mobile-first CSS
├── supabase/
│   ├── migrations/           # SQL schema, RLS, atomic RPCs, private Realtime policies
│   ├── tests/                # SQL verification assertions
│   └── seed.sql              # Synthetic dev users
└── tests/                    # Vitest unit tests & Playwright E2E tests
```

---

## Tài liệu liên quan

- [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) — Đặc tả sản phẩm tổng thể
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Kiến trúc hệ thống & phân tích rủi ro kỹ thuật
- [docs/ROADMAP.md](docs/ROADMAP.md) — Lộ trình và chi tiết task V0.1
- [docs/PROGRESS.md](docs/PROGRESS.md) — Trạng thái hiện tại & checklist nghiệm thu
- [docs/TEST_PLAN.md](docs/TEST_PLAN.md) — Ma trận kiểm thử tự động và thiết bị thật
- [docs/ASSETS.md](docs/ASSETS.md) — Giấy phép asset & hướng dẫn import bộ asset ngoài
- [docs/MEDIA_SETUP.md](docs/MEDIA_SETUP.md) — Quy trình thử nghiệm Spike 0 với Jellyfin + Tailscale
- [docs/SECURITY.md](docs/SECURITY.md) — Chính sách bảo mật, RLS & quyền riêng tư
