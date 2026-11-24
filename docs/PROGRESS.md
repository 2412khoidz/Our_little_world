# Progress Tracker — Our Little World

*Cập nhật lần cuối: 25/11/2026*

## 1. Trạng thái tổng thể
- **Milestone hiện tại:** V0.1 Final Integration
- **Trạng thái:** Nền V0.1 dùng starter CC0 đã có và được chạy lại test local. Master Research & Design đã đóng theo quyết định chủ dự án. V0.1 chờ tích hợp Demo E, HTTPS/Supabase Cloud và nghiệm thu thiết bị thật.

## 2. Checklist nghiệm thu Spike 0 & V0.1

### Đã hoàn thành & kiểm chứng tự động (Local / Dev LAN Server / Chromium)
- [x] Bootstrap repo (`npm` + `package-lock.json`), TypeScript `5.9.3`, Vite `8.3.8`, `vite-plugin-pwa` `2.0.0`, Vitest `5.1.1`, Playwright `1.65.1`, bộ docs đầy đủ (đã cập nhật nguyên tắc **Zero-Configuration Onboarding** & mục tiêu V0.4 không cần VPN phía người xem).
- [x] Starter CC0 pixel art 16x16 (`tileset-cozy.png`, `furniture-cozy.png`), Tiled JSON maps (`home.json`, `garden.json`), PWA icons, `manifest.json`, và video mẫu Spike 0 (`/spike/sample-cozy-sync.mp4`, 660.2 KB H.264/AAC).
- [x] Domain logic thuần (`src/shared/`): avatar validation, 12 starter furniture items, map bounds/portals/no-place zones, placement & collision grid, 10Hz movement throttle + out-of-order drop + `selectLatestPresenceByUser` chống trùng avatar đa thiết bị, và toán học Spike 0 sync.
- [x] Supabase SQL migrations (`20261124000100`, `20261124000200`, `20261124000300`), `seed.sql`, `tests/rls_and_pairing.sql`.
- [x] **Dev-Only LAN Multiplayer Relay (`scripts/devLanServerPlugin.mjs` + `devLanBackend.ts`):** HTTP JSON + Server-Sent Events (`/api/dev-lan/*`) lưu trạng thái tại `.dev-lan-state.json` (gitignored), hỗ trợ test 2 thiết bị vật lý qua Wi-Fi (`Mây` & `Nắng`), đa thiết bị cho cùng 1 tài khoản, từ chối tài khoản thứ 3 (`403` / `WORLD_FULL`), và bị loại hoàn toàn khỏi production build (`import.meta.env.DEV` + `UnconfiguredBackend`).
- [x] Phaser 4.2.1 renderer pixel-perfect (`pixelArt: true`, `roundPixels: true`, `DPR <= 2`, `ResizeObserver`, lazy dynamic import), tìm đường BFS khi chạm, bàn phím WASD/mũi tên, cần điều khiển ảo tùy chọn, lập chỉ mục avatar đối phương theo `userId`, ẩn avatar khi khác phòng, chế độ trang trí lưới 16x16.
- [x] Giao diện mobile-first tiếng Việt, Onboarding/Pairing thân thiện, Tủ đồ tùy chỉnh ngoại hình, Quản lý trang trí optimistic + rollback, Hướng dẫn cài PWA iOS; `SpikeLabModal` và các công cụ kỹ thuật bị ẩn/tách khỏi bản production.

### Chưa kiểm chứng trên thiết bị/hạ tầng thật (Cần chủ dự án thao tác)
- [ ] Thử thực tế hai thiết bị vật lý qua Wi-Fi: Laptop Windows (`Mây`) ↔ Redmi K70E (`Nắng`).
- [ ] Nghiệm thu thật trên **iPhone 16 Pro Max** (Safari thật + Add to Home Screen PWA, chạm cảm ứng, khóa màn hình và mở lại, đổi Wi-Fi ↔ 4G).
- [ ] Nghiệm thu thật trên **Supabase Cloud** qua **hai mạng khác nhau** (chạy 3 migrations, `supabase/tests/rls_and_pairing.sql`, điền `.env`).
- [ ] Nghiệm thu phương án **V0.4 Cinema không bắt người xem cài VPN** trên thiết bị thật.
- [x] Chủ dự án đã duyệt **Demo E (`?art-demo=E` — Unified Cozy World)** làm định hướng. Tích hợp game chính vẫn chờ `OLW-010-01..03` (xem [ART_DIRECTION.md](art/ART_DIRECTION.md) và [ART_EVALUATION.md](ART_EVALUATION.md)).

### Đã hoàn thành thêm — Đánh giá Mỹ thuật & 4 Demo trực quan (25/11/2026)
- [x] Kiểm kê toàn bộ 17 file asset tải về + kiểm tra SHA-256 (loại bỏ 2 bản trùng `free_version.zip` và `Sprout_Lands_-_Sprites_-_Basic_pack.zip`), giải nén vào `asset-candidates/` (đã thêm vào `.gitignore`), sinh contact sheet lưới 16px (`scripts/build-contact-sheets.py`) và kiểm tra bản quyền web/PWA.
- [x] Xây dựng cụm preview dev-only (`?art-demo=A|B|C|D`, loại bỏ 100% khỏi `dist/` khi build production) với 4 bản demo mỹ thuật hoàn chỉnh gồm nội thất, vườn, 2 nhân vật (`Mây` & `Nắng`), thú cưng (`Free Pets Pack` CC BY 4.0), ánh sáng đèn, tia nắng và bóng đổ.
- [x] Chụp và kiểm tra trực quan 8 ảnh Desktop (`1280×720`) & Mobile (`430×932`) bằng Playwright (`scripts/capture-art-demos.mjs`), viết báo cáo chi tiết tại `docs/ART_EVALUATION.md`.

### Đã hoàn thành thêm — Demo E: Unified Cozy World & Tài liệu Mỹ thuật Chính thức (25/11/2026)
- [x] So sánh trực quan 4 ứng viên avatar (`scripts/build-avatar-comparison.py` → `asset-candidates/contact-sheets/avatar-candidates-comparison.png`) và chọn **Modern Interiors Free** (`Adam`, `Alex`, `Amelia`) kèm Canvas palette-remap (`src/game/artDemos/unifiedAvatarBuilder.ts`) bảo toàn 100% `AvatarConfig` của V0.1.
- [x] Xây dựng `SemanticAssetRegistry` & 14 quy tắc chuẩn hóa đa pack (`src/game/artDemos/semanticAssetRegistry.ts`), triển khai bản showcase hợp nhất **Demo E (`?art-demo=E`)** tại `src/game/artDemos/DemoEScene.ts` (nhà 6 khu chức năng + vườn bất đối xứng có ao bo cong autotile, cầu gỗ, đường đất 9-slice, picnic anh đào, luống cây, mèo & Shiba Inu, camera mobile-first & name tag gọn).
- [x] Chụp và nghiệm thu trực quan 8 góc nhìn Demo E (`scripts/capture-art-demos.mjs --only=E`: Desktop overview, Mobile portrait `430×932`, Interior Desktop/Mobile, Garden Desktop/Mobile, Mobile landscape `844×390`, Small mobile `390×844` — 0 lỗi console/HTTP), hoàn thiện bộ tài liệu [ART_DIRECTION.md](art/ART_DIRECTION.md) và [ASSET_PIPELINE.md](art/ASSET_PIPELINE.md).

## 3. Kết quả kiểm thử & Đo đạc thực tế (25/11/2026)

| Lệnh kiểm tra | Phạm vi | Kết quả thực tế |
|---|---|---|
| `npm run lint` | ESLint 10 + TypeScript ESLint + React Hooks v7 | **Pass** (0 errors, 0 warnings) |
| `npm run typecheck` | `tsc --noEmit` strict mode | **Pass** (exit 0) |
| `npm run test` | Vitest (`cinemaSync`, `placement`, `avatar`, `realtime`, `localPreviewBackend`, `devLanServer`) | **Pass** — 6 files, **24/24 tests pass** |
| `npm run build` | `tsc -b && vite build` + VitePWA | **Pass** — `index-*.js` **588.69 kB** (`169.23 kB` gzip), lazy Phaser chunk `createGame-*.js` **1,388.16 kB** (`363.65 kB` gzip), precache **21 entries (1973.23 KiB)**, tạo `dist/sw.js` & `dist/manifest.webmanifest` |
| `node scripts/verify-prod-guard.mjs` | Quét toàn bộ `dist/assets/*.js` | **Pass** — quét 3 JS bundle(s), 0 dấu vết của `/api/dev-lan`, `/asset-candidates`, `art-demo-showcase`, `seed-couple`, email dev hay `menu-spike-lab` trong bản production |
| `npm run test:e2e` | Playwright Chromium (`chromium-desktop` + `chromium-iphone-16-pro-max` `430x932`) với **browser contexts tách biệt hoàn toàn** qua Dev LAN SSE | **Pass** — **8/8 tests pass** (`23.0s`): ghép cặp 2 máy tách biệt, từ chối người thứ 3, đổi phòng realtime, đổi tên avatar, đặt đồ & xung đột ô trùng, đa thiết bị cho cùng 1 tài khoản (vẫn 2/2), layout `430x932`, Spike 0 video sync qua SSE |

## 4. Hướng dẫn thử nghiệm ngay trên Laptop Windows & Redmi K70E

1. Chạy `npm run dev` tại thư mục dự án.
2. Trên **Laptop Windows**: mở `http://localhost:5173`.
3. Trên **Redmi K70E** (cùng mạng Wi-Fi với laptop): mở Chrome và truy cập URL `Network:` mà Vite in ra. *(Nếu K70E không truy cập được cổng `5173`, kiểm tra Windows Firewall cho phép inbound Node.js/port `5173` trong mạng Private Wi-Fi.)*
4. Trên **Laptop**: chọn **Mây (Chủ nhà)** → **Tạo ngôi nhà mới** → bấm **Mời người thương (1/2)** ở thanh trên cùng để lấy mã `OLW-...` (hoặc bấm **Tạo sẵn nhà 2/2 (Mây & Nắng)** nếu muốn vào ngay).
5. Trên **Redmi K70E**: chạm **Nắng (Người thương)** → nhập mã mời vừa tạo (hoặc vào thẳng nếu đã tạo sẵn nhà 2/2).
6. Thử di chuyển cả hai nhân vật, đi ra vườn, mở Tủ đồ đổi ngoại hình, mở Trang trí đặt/chuyển đồ để thấy đồng bộ realtime ngay trên hai thiết bị thật.

## 5. Bàn giao Master Research & Design

Takeover chạy lại lint, typecheck, Vitest 24/24, production build, production guard và Playwright Chromium 8/8. Build và Playwright chạy trong bản sao tạm để giữ nguyên dist và trạng thái Dev LAN của working tree. Vite có cảnh báo chunk >500 kB. Luồng video Windows ↔ Redmi K70E trên cùng Wi-Fi được chủ dự án báo cáo trước đây; chưa có số đo WAN, Safari thật hoặc Cloud. [Checkpoint kiểm chứng](research/TAKEOVER_CHECKPOINT.md) · [Báo cáo tổng hợp](research/MASTER_RESEARCH_SUMMARY.md)

## 6. Baseline trước V0.1 Final Integration

Mốc tiếp nhận là OLW-010-01. Quyền phát hành atlas được kiểm theo PD-01 và dùng fallback CC0 nếu chưa rõ. Việc tích hợp artwork, deploy và nghiệm thu thiết bị thật vẫn đang chờ. Baseline chỉ cập nhật quyết định sản phẩm, tài liệu và thông tin nhận dạng trong dữ liệu thử nghiệm. [Checkpoint](research/TAKEOVER_CHECKPOINT.md#checkpoint-baseline-v01-final-integration)

Kiểm thử baseline trong bản sao tạm đã pass lint, typecheck, 24/24 Vitest, production build, production guard và 8/8 Playwright Chromium (22,8 giây). Vite vẫn có cảnh báo chunk >500 kB. Kết quả Supabase Cloud và iPhone Safari/PWA thật vẫn đang chờ.
