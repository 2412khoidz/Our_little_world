# Progress Tracker — Our Little World

*Cập nhật lần cuối: 25/11/2026*

## Phase II donor preview (parallel integration)

| Field | Value |
|-------|--------|
| **Frozen owner compare** | `0ef19c4` @ `integration/donor-reuse-preview` (#27–#29: HUD, discoverability, farm/fish) |
| **Render checkpoint tag** | `checkpoint/p0-cabacos-pet-7474eb0` (pre–Phase II) |
| **Worker dispatch** | Phase II branches continue in parallel; owner gate reversed — integration merges after VQG |
| **Playthrough** | [PHASE_II_OWNER_PLAYTHROUGH.md](PHASE_II_OWNER_PLAYTHROUGH.md) |
| **Interactables** | store [`interactable-inventory.md`](/cursor/stores/self/docs/interactable-inventory.md) |
| **8-dir walk clips** | `facing8` → Phaser `walk-{diagonal}` rows (procedural + atlas composite); VQG `media/vqg-phase-ii-diagonal-walk.png`; e2e `phase-ii-diagonal-walk.spec.ts` (Chromium desktop, chưa iPhone) |
| **Cửa / thang env hooks** | Portal table + ladder pairs; 2P `COUPLE_ENV_TRANSITION`; VQG door/ladder png; e2e `phase-ii-env-transition.spec.ts` |
| **Interactable audit P0** | Barn door → shop; home bowl J + `COUPLE_HOME_BOWL`; minigame honest stub; VQG `vqg-phase-ii-bowl-food-fill.png` / `barn-door` |

`integration/playtest-all` vẫn @ `c01d291` — không đổi.

## 0. V0.2 P0 — A Home Comes Alive (đồng bộ Roadmap v2)

**Nguồn:** [V02_ROADMAP.md](V02_ROADMAP.md) · [V02_PRODUCT_ENGINEERING_PLAN.md](V02_PRODUCT_ENGINEERING_PLAN.md) · [V02_INTEGRATION_PLAYBOOK.md](V02_INTEGRATION_PLAYBOOK.md)

| Stream | PR | Trạng thái agent | Ghi chú tích hợp |
|--------|-----|------------------|------------------|
| Composer 1 Farming | #14 | Dev LAN playable | Chờ Supabase RPC + plot contract C3 |
| Composer 2 Pet | #13 | Slice 4 in progress | PetCareScene, hand-feed RPC `20261125001200`, e2e session |
| Composer 3 World | #12 | Zone/farm art | Không sửa care scene |
| Foundation authority | #10 | SQL open | #13 wires `pet_consume_hand_food`; merge trước prod Supabase |
| Living overworld | #11 | DEV `?living-pet=1` | Gộp vào #12/#13 khi integrate |

**Chưa owner-verified:** build tích hợp 15–20 phút (nhà → mèo → shop → farm → explore). **Không** merge `main`.

## 1. Trạng thái tổng thể
- **Milestone hiện tại:** V0.2 P0 (song song V0.1 gate còn thiết bị thật)
- **Trạng thái:** Ba PR feature (#12–#14) + foundation #10/#11; tích hợp theo playbook, chưa release.

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

### OLW-010-01 — Atlas Demo E theo profile

Đã tạo atlas private từ 15 tệp nguồn Demo E, cộng hai frame Frakassets đã xác minh. Profile public có PNG 16.142 B và tổng 27.960 B gồm manifest/credits. Profile private có PNG 46.875 B và tổng 74.780 B. Cả hai có 21 semantic ID. Private atlas tái tạo trùng hash. Public precache 25 mục, 1.999,56 KiB. Tệp ZIP giả và atlas private có sẵn trong sandbox đều nằm ngoài dist public và precache.

Lint, typecheck, 26 Vitest, production build/guard, private build và 8 Playwright Chromium đều pass. Đã kiểm hình atlas 1:1, phần runtime sẽ nối ở OLW-010-02 và OLW-010-03. Quyền deploy Internet của bốn nhóm pack Demo E còn Pending Deployment License Verification. [Quy trình và credits](art/ASSET_PIPELINE.md#4-tạo-bản-phát-triển-riêng-và-bản-public)

### OLW-010-02 — Avatar Modern Interiors trong game chính

Profile riêng dùng rig Adam/Alex/Amelia. WorldScene và Tủ đồ dùng cùng Canvas palette-remap của Demo E, giữ 6 trường cấu hình cũ, bốn hướng và khóa animation cũ. Profile public dùng rig CC0. Nếu tải atlas thất bại, bộ vẽ avatar starter vẫn hoạt động.

Lint, typecheck, 26 Vitest, public/private build, guard và 8 Playwright Chromium pass. Hai context đổi tóc, màu, áo và kính, peer cập nhật Canvas, reload khôi phục preview. Kiểm hình Tủ đồ ở 430×932, bốn hướng có frame idle và walk riêng, hai cấu hình có cache key khác nhau. Chưa kiểm iPhone thật.


### OLW-010-03 — World Integration đã hoàn thành

Game chính dùng hai nền atlas và ánh xạ đủ 12 SKU. Profile private giữ pixel gốc Demo E với sàn gỗ bớt tương phản, mosaic liền mạch, đường Sprout Lands nối theo ô kề và biến thể cỏ rải theo hash. Camera fit toàn map khi resize và đổi map, cả khi mở bảng trang trí. Hình pet dùng cell 16×16 ở cùng mật độ avatar, kiểm dưới dạng preview tĩnh. Menu có link credits theo profile.

- Lint, typecheck, **31/31 Vitest**, public/private build, production guard và **8/8 Playwright Chromium** pass. Có cảnh báo chunk >500 kB như trước.
- E2E kiểm hai context cùng chơi (cả desktop và Chromium cảm ứng), đổi ngoại hình, chạm đi tới cổng nhà/vườn, đặt và dời đèn đúng ô, chặn chồng đồ, rồi reload và chọn lại món đã dời. WorldBackend, schema/RLS, map logic, collision và BFS giữ nguyên.
- PNG atlas public **16.454 B**, tổng cả manifest và credits **28.272 B**. Atlas riêng **47.649 B** PNG và **75.570 B** tổng. Public SW **25 mục, 2.006,19 KiB**. Private SW **25 mục, 2.006,20 KiB**, không precache atlas riêng. Build public không sao chép atlas riêng hoặc tệp thử nghiệm không hợp lệ.
- Screenshot game chính ở desktop 1440×900 và 1280×720, mobile portrait 430×932 và landscape 844×390, cùng Tủ đồ và preview tỷ lệ pet, lưu ngoài Git tại `test-results/v01-final-art/`. Dữ liệu ảnh là fixture Dev LAN.
- Chưa thử bản này trên iPhone Safari/PWA thật, Android thật hay Supabase Cloud. Quyền phục vụ atlas riêng qua Internet còn Pending Deployment License Verification. [Giấy phép và credits](art/ASSET_PIPELINE.md#4-tạo-bản-phát-triển-riêng-và-bản-public)

### OLW-010-04 — Realtime Optimization

Di chuyển thường giới hạn 8 Hz, ngưỡng 2 px tích lũy và cập nhật hướng theo cadence. Gửi gói chốt khi idle, đổi map hoặc kết nối lại. Một avatar đại diện cho mỗi người, chọn theo phiên Presence mới nhất. Trace cục bộ giảm từ 153 xuống 99 gói. Lint, typecheck, 35 Vitest, public build, production guard và 10 Playwright Chromium không retry pass. Số liệu Supabase Cloud và nghiệm thu Safari/PWA trên iPhone thật đang chờ. [Checkpoint kỹ thuật](research/GPT_NIGHT_CHECKPOINT.md)

### OLW-010-05 — Review và checklist

Đã review tĩnh SQL/RLS/RPC, Auth và private Realtime. Có checklist Supabase Test/Prod, Cloudflare Pages Free, quyền triển khai Web/PWA của artwork và xác thực URL asset. Các mục Cloud và thiết bị thật chưa thực hiện. [Review và checklist](research/GPT_NIGHT_OLW_010_05_REVIEW.md)

### V0.1 Security Hardening

Đã thêm migration bổ sung cho quyền EXECUTE của RPC, thứ tự khóa world/invite, trần hai thành viên, phân quyền Realtime và receipt idempotency. PostgreSQL 18.6 local vượt SQL assertions và ba kịch bản nhiều phiên. Supabase Test/Auth/PostgREST/WebSocket thật còn **Pending Verification**. [Checkpoint và hướng dẫn tích hợp](research/GPT_NIGHT_CHECKPOINT.md#v01-security-hardening--hoàn-thành-local-cloud-pending-verification)

## 7. Triển khai V0.1.5 — Living Home (`neon/night-dev`)

*Trạng thái tổng thể V0.1.5: **Implemented & Locally tested** (`Pending cloud/device verification` — chưa đánh dấu `Accepted` trước khi kiểm thử Supabase Cloud và iPhone Safari thật).*

- **Phục hồi mỹ thuật Demo E & Camera (`03072e4`):** Tái lập 100% tỷ lệ pixel 1:1 (`world-props.png`, `props-manifest.json`), anim ngồi trên `avatars.png`, sprite mèo `cat-orange` CC BY 4.0, camera tự bám theo người chơi trên bản đồ lớn hơn viewport và thu vừa khít khi trang trí.
- **`OLW-015-01` Kho đồ tối thiểu K5 (`b5c6faa`):** `supabase/migrations/20261125000100_v015_inventory_and_catalog.sql`, 6 vật phẩm catalog 0₫, phân tách `shared` và `user:<uuid>`, nhận hạt mèo miễn phí hằng ngày.
- **`OLW-015-03/04` Bé mèo cam sống động (`3d8a630`):** `20261125000200_v015_pet_mvp.sql`, catch-up ngoại tuyến nhân từ (`FLOOR=30`, trần 48 giờ), đua lệnh cho ăn nguyên tử & hồi chiêu server, `PetEntity.ts` + `PetPanel.tsx` + âm thanh `petAudio.ts` chạm để phát.
- **`OLW-015-05/06` Phòng học yên tĩnh & Pomodoro (`eb5d202`):** `THIRD_PARTY_NOTICES.md` ghi công MIT (`cocoworking`), `20261125000300_v015_study_pomodoro.sql`, đồng hồ chuẩn server (`PomodoroPanel.tsx`), âm thanh nền mặc định tắt (`ambientAudio.ts`), ngồi vào ghế trái/phải và mèo nằm nghỉ chế độ yên lặng.
- **`OLW-015-07` Tương tác cặp đôi & Khung ảnh (`d40b2e1`):** `CoupleActionBar.tsx` (5 biểu tượng cảm xúc + mời ôm 15 giây có chấp nhận/từ chối), ngồi sofa/ghế vườn 2 slot không chồng lên nhau, nằm giường đôi kèm lớp chăn pixel pastel, `PhotoFrameModal.tsx`.
- **`OLW-015-02` Hộp thư & Quà bất ngờ (`3e7ed72`):** `20261125000400_v015_mailbox_and_gifts.sql`, giấu nội dung quà bí mật ở tầng server tới khi người nhận tự mở, rollback sạch khi ngăn đồ nhận đã đầy (`STACK_FULL`), `MailboxModal.tsx` plain-text chống XSS và badge thông báo trên hòm thư đỏ ngoài vườn.
- **`OLW-015-08` Dev Console K6 (`400e054`) & Prototype V0.3 (`5db098b`):** Tách RPC dev vào `supabase/dev-migrations/20261125900100_dev_console_rpcs.sql` (`dev_admins` + `worlds.is_test = true`), `DevConsoleDrawer.tsx` (`Ctrl+Shift+D`), `V03PrototypesModal.tsx` chỉ nạp qua `import.meta.env.DEV` và được kiểm tra loại bỏ 100% khỏi bản production bởi `scripts/verify-prod-guard.mjs`.
- **Kiểm chứng cục bộ mới nhất (cổng `4176`, Dev LAN + Chromium):** `npm run lint` (0 lỗi), `npm run typecheck` (`tsc -b`, 0 lỗi), `npm test` (**23 files / 68 tests pass**), `npm run build` + `verify-prod-guard.mjs` (**Pass**, 0 dev leaks), `npm run build:private` (**Pass**), `npx playwright test` (**13 passed, 1 skipped**). [Checkpoint nhánh đêm](research/NEON_NIGHT_CHECKPOINT.md)

## 8. Pre-Integration Quality & Living Pet Override (`neon/night-dev`)

*Trạng thái: **Implemented & Locally tested** (Sandbox & E2E cục bộ; chờ chủ dự án duyệt trực quan biến thể mèo, UI và quy mô bản đồ trước khi chạy Integration Master).*

- **M1 P0 Foundation (`afd75bb`):** Khôi phục typecheck thật (`tsc -b`), sửa lỗi đăng ký đủ frame lưới trong `src/game/art/worldAtlas.ts`, bổ sung migration `20261125000500` thu hồi quyền `EXECUTE` helper `SECURITY DEFINER` và khóa `worlds FOR UPDATE` trong `_inventory_adjust_item` (`supabase/tests/v015_inventory_security.sql` chờ chạy trên PostgreSQL thật).
- **M2 Living Cat Visual (`1605435`):** 3 biến thể mèo thủ công `24×24px` (`ginger-tabby` Quýt, `cream-puff` Mochi, `calico-patch` Bông) + 4 phụ kiện + 27 animation tracks + `PetAnimationController.ts` (`wake_yawn_stretch`), sandbox `/?pet-art=1`.
- **M3 Physical Interaction (`411efb2`):** Hệ thống phím & ngữ cảnh `[J]`/`[K]`/`1–8` (`interactionResolver.ts`), `HeldItemRenderer.ts`, catalog thức ăn an toàn (`petFoodCatalog.ts`), bảo toàn 1:1 `Inventory → Bowl → Consumed`, hành trình nhận nuôi mèo hoang (`petPhysicalCare.ts`) và `PetEntity.ts` render nguyên bản 1:1.
- **M4 Living Pet Intelligence & Pet Lab (`e4eb0aa`):** Adapter tiền tích hợp (`petPrimitivesAdapter.ts`), cấu hình 7 tính cách / 8 nhu cầu không tử vong / 9 cảm xúc / 14 affordance (`petIntelligenceConfig.ts`), mô phỏng 18 kịch bản (`petLabSimulation.ts`), sandbox `/?pet-lab=1`.
- **M5 Game UI & Shared Life (`1f5b8d4`):** Hệ thống Cozy Indie Game UI với 2 biến thể **Warm Pixel Cottage** & **Illustrated Storybook**, thanh hotbar, hộp thoại chân dung, Cuốn Sổ Chung 5 tab (`OurLittleNotebook.tsx`), contract & Dev LAN stubs V0.3, sandbox `/?ui-sandbox=1`.
- **M6 World Expansion & Showcase (`0a8ec8c`):** Bản đồ `64×64` & `96×96` gồm 10 địa điểm có chiều sâu (`worldExpansionMap.ts`, `WorldExpansionScene.ts`), `/?world-sandbox=1` và bản trải nghiệm tổng hợp `/?experience-demo=1` với Touch D-pad di động.
- **Tài liệu & Bằng chứng trực quan (`test-results/grand-showcase/`):** Đã tạo đủ 16 screenshot Desktop/Mobile/Small/Landscape + 2 animated GIF (`pet-locomotion-and-wake.gif`, `pet-physical-feeding-and-play.gif`) và bộ báo cáo bàn giao Phase 14 ([Living Pet](pet/LIVING_PET_QUALITY_REPORT.md), [Game UI](ui/GAME_UI_DESIGN_SYSTEM.md), [Physical Interaction](gameplay/PHYSICAL_INTERACTION_SPEC.md), [World Expansion](world/WORLD_EXPANSION_DESIGN.md), [Quality Audit](research/QUALITY_AUDIT.md)).

## 9. Grand Integration

Đã hợp nhất GPT, Neon và DeepSeek trên nhánh riêng, bảo toàn Demo E, Realtime và các bản Grand sandbox. PostgreSQL local đạt fresh/upgrade theo từng tệp SQL, gồm bản vá debit kho và receipt hộp thư. Vitest 453/453 và Playwright Chromium 15 pass, 1 skip có chủ đích. Xung đột version migration chờ lịch sử database đích. Supabase Cloud, thiết bị thật và mở rộng gameplay sau quality gate còn chờ. [Integration checkpoint](research/INTEGRATION_CHECKPOINT.md)

## 10. Mission 02 — SQL foundation đang review

Đã đối chiếu lịch sử theo xác nhận chủ dự án và gỡ version migration trùng. Catalog/quality, RPC bát ăn nước và các vector integer có bản chuẩn bị trong nhánh mission. PostgreSQL fixture fresh/upgrade và các regression local pass. Parity giá/bão hòa, quality gift, authority không gian, gameplay có thưởng và Supabase Test còn chờ. [Checkpoint và API](research/MISSION_02_CHECKPOINT.md)

## 11. Mission 02.5 — nhánh tích hợp thử

Đã review snapshot PR #4 `700d1af` và thử tích hợp riêng: 474 Vitest, Playwright 19 pass / 1 skip, PostgreSQL fixture fresh/upgrade và public/private guards pass. Đã thêm bản sửa thử cho identity/quality hotbar, concurrent input và Escape. Luồng `pet_interact('feed')` cũ vẫn vượt qua gate physical care; catalog, quality gift/transfer và server authority chưa hoàn tất. Chưa đủ điều kiện merge hoặc deploy; Supabase thật và iPhone thật chưa được kiểm. [Bàn giao Mission 04](research/MISSION_04_TECHNICAL_HANDOVER.md)

## 12. Mission 04B-2 — server-authoritative living pet

Đã thêm migrations 04B-2 + hardening `20261125140000` + correctness `20261125150000`: offer expiry commit (pending/accepted/deferred), reservation consume on `fill_food`, server-clock movement (`authoritative_tile_*`, bỏ proof làm căn cứ), `pet_nav_anchors` + nav contract 04D. **Local:** lint/typecheck, Vitest 526, SQL fresh+upgrade, build/PWA. **Chưa:** Cloud apply, iPhone, dynamic furniture grid trong SQL. [Bàn giao 04B-2](handover/MISSION_04B2_PET_AUTHORITY.md)

## 13. Mission 05 — Farming vertical slice (checkpoint)

- **Branch:** `cursor/mission-05-farming-slice-d77e` — vòng lặp Dev LAN trong game chính: cuốc → gieo → tưới → thu hoạch → bán/mua hạt (`docs/handover/MISSION_05_FARMING_PLAYABLE.md`).
- **Đã kiểm (local DoD):** Vitest **534** pass (`farmPlotContract` + 184 plots), lint/typecheck/build; Playwright `farming-co-op.spec.ts` — 2 client + API versioned apply, annex ô `120`, `INVALID_PLOT` (log: `/opt/cursor/artifacts/farming-co-op-e2e-184.log`).
- **Lưới:** `farmPlotContract` **v1.0.1** (#12 vendored), **184** ô (`farm_main`+`farm_annex`), Dev LAN + Supabase `_farm_plot_on_contract_soil`; SQL `farming_authority.sql` chưa chạy trên Postgres thật.
- **Chưa kiểm:** Supabase migration apply trên remote; duplicate-harvest 2 client; icon hotbar farming (Composer 2).
- **PR #10:** readiness + Composer 2 authority trong `docs/handover/PR10_INTEGRATION_COMPOSER2.md` (pet branch riêng).
