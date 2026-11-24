# Our Little World

**Our Little World** là một cozy game 2D pixel art kết hợp không gian số riêng tư dành cho một cặp đôi yêu xa — được thiết kế ưu tiên **iPhone Safari / PWA** và **Windows Chrome / Edge**.

Hiện tại dự án ở **V0.1 Final Integration**. Master Research & Design đã đóng; Demo E đã duyệt về mỹ thuật và game V0.1 hiện dùng starter CC0. Xem [chỉ mục tài liệu](docs/README.md) và [tiến độ V0.1](docs/PROGRESS.md).

---

## Tính năng hiện có (Spike 0 + V0.1)

- **Hai tài khoản & Một thế giới riêng tư (Pairing Invite 1 lần):** Tạo căn nhà chung, sinh mã mời sử dụng một lần, giới hạn cứng tối đa 2 thành viên (`worlds` + `world_members` + RLS + RPC atomic). Người thứ 3 bị từ chối ở tầng dữ liệu.
- **Căn nhà & Khu vườn Pixel Art (16x16):** Hai bản đồ Tiled JSON (`home` và `garden`) nối qua cửa ra vào, camera pixel-perfect (`pixelArt: true`, `roundPixels: true`).
- **Di chuyển & Hiện diện Realtime:** Hai avatar nhìn thấy nhau trong cùng phòng, biết đối phương đang ở phòng nào hoặc ngoại tuyến; tự động ngắt gửi khi đứng yên (~10 Hz khi di chuyển) và ẩn avatar nếu khác phòng.
- **Tùy chỉnh ngoại hình (Tủ đồ):** Đổi biệt danh, màu da, kiểu/màu tóc, trang phục và phụ kiện; vẽ thành spritesheet pixel art ngay trên client và đồng bộ tới đối phương.
- **Trang trí nội thất & Lưu trạng thái:** 12 món đồ khởi đầu với footprint theo lưới 16x16, chia lớp `floor` (thảm đặt dưới bàn) và `object`, ngăn chặn đặt đè hoặc bịt cửa, xử lý xung đột đồng thời atomic + optimistic rollback.
- **Mobile-first & PWA:** Bố cục `100dvh` hỗ trợ safe-area iPhone, điều khiển bằng chạm để đi (tap-to-move với tìm đường tránh vật cản), cần điều khiển ảo tùy chọn, bàn phím WASD/mũi tên trên PC, Service Worker + Web App Manifest + hướng dẫn cài Add to Home Screen trên Safari.
- **Phòng thí nghiệm Spike 0 cô lập (`Spike 0 Lab`):** Đo FPS/DPR/visibility/WebGL và thử nghiệm đồng bộ video Play/Pause/Seek + tính clock offset & drift trên `<video playsInline>` bằng file MP4 hợp lệ mà chưa gắn vào game.

---

## Cài đặt & Chạy Local

### Yêu cầu môi trường
- **Node.js:** `>= 22.12` (đã xác minh trên Node `v24.18.0` và `npm 11.16.0`)
- **FFmpeg:** Tùy chọn, chỉ cần nếu muốn tạo lại video mẫu cho Spike 0 (`npm run spike:video`).

### Các bước chạy nhanh (Local Preview Mode — không cần cấu hình Supabase)

```bash
# 1. Cài đặt thư viện
npm install

# 2. (Tùy chọn) Tạo lại starter pixel art & video mẫu Spike 0
npm run assets:generate
npm run spike:video

# 3. Chạy dev server (mở cho cả mạng LAN để thử bằng iPhone cùng Wi-Fi)
npm run dev
```

Mở trình duyệt trên laptop tại `http://localhost:5173` và trên điện thoại (Redmi K70E / iPhone cùng Wi-Fi) tại `http://<IP-máy-Windows>:5173`.
Khi chạy ở môi trường development (`npm run dev`) và chưa cấu hình `.env` Supabase, ứng dụng tự bật **Dev LAN Multiplayer Relay** (`/api/dev-lan/*`, đồng bộ HTTP + SSE giữa nhiều thiết bị vật lý qua Wi-Fi):
- Trên laptop chọn **Mây (Chủ nhà)**, tạo nhà (hoặc bấm **Tạo sẵn nhà 2/2**) và lấy mã mời.
- Trên điện thoại chọn **Nắng (Người thương)** để nhập mã mời (hoặc vào thẳng nếu đã tạo sẵn nhà 2/2) và di chuyển realtime cùng lúc.
- Thử đóng vai **Khách lạ** trên một thiết bị/tab thứ ba để kiểm chứng hệ thống từ chối người thứ 3.
- Bộ chọn danh tính dev chỉ tồn tại khi `import.meta.env.DEV === true` và bị loại hoàn toàn khỏi bản build production (`npm run build`).

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
