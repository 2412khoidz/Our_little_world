# AGENTS.md — Hướng dẫn cho Coding Agent

Tài liệu này quy định nguyên tắc kỹ thuật, phạm vi và quy trình làm việc trong repository **Our Little World**.

## 1. Bối cảnh sản phẩm
- **Mục tiêu:** Cozy game 2D pixel art kết hợp không gian số riêng tư dành cho **một cặp đôi yêu xa** (2 thành viên tối đa).
- **Thiết bị ưu tiên:** iPhone 16 Pro Max (Safari + PWA Add to Home Screen) và Windows Chrome/Edge; Android là nền tảng bổ sung.
- **Ngôn ngữ UI:** Tiếng Việt mặc định (hướng tới dễ tách i18n về sau).
- **Triết lý thiết kế:** Không buộc đăng nhập lại khi còn phiên hợp lệ, không daily streak, không phạt offline, cho phép mini-game PvP thân thiện tự nguyện, không quảng cáo, không camera/mic khi học.

## 2. Stack & Phiên bản đã xác minh
- **Package manager:** `npm` (duy nhất; khóa phiên bản qua `package-lock.json`).
- **Frontend UI:** React 19 (`^19.3.1`), TypeScript (`~5.9.3`), Vite (`^8.3.8`), Zod (`^4.6.7`), Lucide React (`^1.79.0`).
- **Game Engine:** Phaser 4 (`^4.2.1`) với `pixelArt: true`, `roundPixels: true`, `antialias: false`.
- **PWA:** `vite-plugin-pwa` (`^2.0.0`) + `workbox-window` (`^7.4.1`).
- **Backend / Realtime:** `@supabase/supabase-js` (`^2.119.2`) + Supabase Postgres (migrations + RLS + RPC) + Realtime private channels. Trong môi trường development khi chưa cấu hình `.env`, app chạy **Dev LAN Multiplayer Relay** (`scripts/devLanServerPlugin.mjs` + `devLanBackend.ts`) để test realtime đa thiết bị qua Wi-Fi; cơ chế giả lập danh tính bị khóa cứng sau `import.meta.env.DEV` và bị loại hoàn toàn khỏi production build.
- **Testing:** Vitest (`^5.1.1`) + Testing Library + jsdom, Playwright (`^1.65.1`).

## 2.1 Nguyên tắc Zero-Configuration Onboarding (Bắt buộc cho Production)
Người dùng thứ hai không am hiểu công nghệ; toàn bộ trải nghiệm chính thức phải đạt chuẩn không cấu hình phức tạp:
- **Chỉ cần một đường link HTTPS** để bắt đầu (không gửi file cài đặt, không yêu cầu cấu hình thủ công).
- **Không cần cài VPN, Tailscale hoặc ứng dụng bên thứ ba** cho mọi tính năng thông thường.
- **Đăng nhập đơn giản, duy trì phiên đăng nhập** ổn định qua các lần mở lại app.
- **Hỗ trợ Add to Home Screen trên iPhone** với hướng dẫn tiếng Việt trực quan.
- **Không hiển thị các thông số kỹ thuật không cần thiết** (ẩn FPS, DPR, RTT, mã trạng thái kỹ thuật, chế độ backend dev và bộ chuyển danh tính thử nghiệm khỏi giao diện production).
- **Tự động kết nối lại khi mất mạng** hoặc mở lại từ nền mà không làm mất tiến trình đã lưu.
- **Mọi thông báo lỗi phải được diễn đạt bằng tiếng Việt dễ hiểu** (tránh mã lỗi hay thuật ngữ kỹ thuật thô).
- **Cinema (V0.4) không yêu cầu người xem cài VPN:** Cần nghiên cứu phương án phát phim local từ máy Windows qua HTTPS riêng tư không bắt bạn gái cài Tailscale/VPN, vẫn bảo đảm bảo mật, chất lượng video và chi phí thấp trước khi triển khai V0.4.
- **Cô lập Dev Impersonation:** Mọi công cụ chọn nhanh danh tính, reset thế giới dev và Spike 0 diagnostics chỉ được tồn tại khi `import.meta.env.DEV === true`, tuyệt đối không xuất hiện trong bản production.

## 3. Quy tắc phạm vi & Canonical Baseline (Scope & Branching Policy)
- **Canonical Stable Baseline hiện tại:** Nhánh **`main`** (release tag **`v0.2.5`** tại `b43712e`, hợp nhất từ `integration/olw-canonical-rc1` sau khi chủ dự án playtest và phê duyệt). Baseline hợp nhất gồm: nền tảng 16px OLW-Neon, asset riêng tư local (`public/assets/private-unified/`, `public/assets/private-audio/`), Multiplayer NET.1.1 (WebSocket, xác thực phiên từ xa, reconnect watchdog, điều phối Nắng), Deep Farming Checkpoints A–G, Billiards V2, và mèo 3D Vuena + pet-care V2 từ OLW-Carbon.
- **Primary Playable Workspace:** `C:\Users\admin\Downloads\Our_little_world` (chỉ chạy bản playtest chính & Integration/Release trên nhánh `main` hoặc release candidate sạch).
- **Chính sách nhánh bắt buộc (Future Branching Policy):** Mọi nhánh tính năng hoặc sửa lỗi mới (`feat/*`, `fix/*`, `chore/*`) **BẮT BUỘC** phải khởi tạo qua worktree mới từ commit mới nhất trên `origin/main` bằng `npm run worktree:new -- --name <slug>`. Tuyệt đối không tạo nhánh mới từ các nhánh thử nghiệm/feature cũ hoặc worktree chưa đồng bộ baseline.
- Các mốc chưa mở trong baseline này (học, hộp thư nâng cao, nhật ký đầy đủ và Cinema V0.4) vẫn mở theo quyết định chủ dự án. Xem [lộ trình](docs/MASTER_ROADMAP.md) và [quyết định đã chốt](docs/DECISIONS.md#quyết-định-đã-chốt).
- Đồ vật xem trước trên bản đồ chưa kích hoạt chức năng đầy đủ chỉ hiển thị thông báo trung thực — không tạo nút giả; tính năng chưa hoàn chỉnh không đưa vào menu điều hướng chính.
- **Tài liệu nguồn chân lý & bàn giao hệ thống con:** [CANONICAL_BASELINE.md](docs/CANONICAL_BASELINE.md) · [REGRESSION_CHECKLIST.md](docs/REGRESSION_CHECKLIST.md) · `docs/handovers/{MULTIPLAYER,FARMING,BILLIARDS,ART_AND_ANIMATION,LIVING_PET}.md`.

### 3.1 Cổng Khởi động Bắt buộc (Mandatory Startup Gate)
Trước khi sửa bất kỳ file nào, mọi coding agent **PHẢI** chạy kiểm tra và dừng ngay nếu không khớp:
1. Kiểm tra root repo, nhánh hiện tại, `HEAD`, trạng thái working tree và `origin/main`:
   ```bash
   git rev-parse --show-toplevel && git branch --show-current && git rev-parse HEAD && git status --short
   git fetch origin main && git rev-parse origin/main
   git merge-base --is-ancestor origin/main HEAD && echo "ANCESTRY_OK"
   ```
2. Kiểm tra asset riêng tư local: `npm run assets:private:verify` (nếu thiếu và cần đồng bộ từ primary workspace sạch: `npm run assets:private:sync -- --from C:\Users\admin\Downloads\Our_little_world`).
3. **DỪNG NGAY** nếu đang đứng nhầm workspace, nhánh cũ/detached không chứa `origin/main`, hoặc thiếu asset riêng tư. Cấm tiếp tục code trên các worktree/nhánh thử nghiệm cũ (`OLW-Neon`, `OLW-Multiplayer`, `OLW-Carbon`, `feat/deep-farming-transplant`, v.v.).

### 3.2 Chính sách Worktree & Tích hợp (Worktree & Integration Policy)
- **Feature Agent:** Chỉ làm việc trong worktree riêng tạo bởi `npm run worktree:new -- --name <slug>`; **KHÔNG** push trực tiếp vào `main`, **KHÔNG** merge nhánh chéo, **KHÔNG** ghi đè tùy tiện các file nền dùng chung (`src/app/App.tsx`, `src/game/scenes/WorldScene.ts`, `scripts/devLanServerPlugin.mjs`, maps/atlases) ngoài phạm vi task, và phải rebase/reconcile theo `origin/main` trước khi bàn giao (kèm SHA commit, danh sách file sửa, focused tests & hướng dẫn playtest).
- **Integration & Release Agent:** Là vai trò duy nhất được quyền hợp nhất vào `main` tại `C:\Users\admin\Downloads\Our_little_world`, kiểm toán lịch sử Git sạch (không `.dev-lan-state*.json`, `.env`, `private-*`), chạy regression gate và gắn tag release.
- **Thiết lập & Lệnh chạy chuẩn:**
  - Đồng bộ tài nguyên riêng tư local (không sao chép `.env` hay file save): `npm run assets:private:sync -- --from <source-worktree>` && `npm run assets:private:verify`.
  - Khởi chạy Host chơi cùng nhau: `npm run host:couple` (hoặc `npm run dev`).
- **Giới hạn đã biết:** `npm run test` trên `jsdom` fail ở 2 suite Canvas 2D donor cũ (`donorCabacosRenderDetect.test.ts`, `pydewFarmDonorRender.test.ts`); luồng thật kiểm bằng Chromium Playwright. Cloud Supabase thật, Migration SQL thật và vòng playtest iPhone Safari + Cloudflare Quick Tunnel đầy đủ sau hợp nhất cần xác nhận bổ sung trên thiết bị thật.

## 4. Kiến trúc & Biên giới module
- `src/shared/` — Domain types, schemas, placement/collision logic, map definitions, realtime throttling/interpolation, cinema sync math. **Thuần TypeScript, không phụ thuộc DOM, React hay Phaser.**
- `src/lib/` — Env parsing, Supabase client, Backend Adapter (`WorldBackend`), `supabaseBackend`, `localPreviewBackend`.
- `src/game/` — Phaser scenes, pixel-art avatar texture builder, grid pathfinding, typed `eventBus`. **Phaser không tự gọi DB trực tiếp.**
- `src/features/` & `src/app/` — React UI shell (mobile-first), onboarding/pairing, avatar customizer, decorate drawer, PWA banner/guide, Spike 0 Lab cô lập.
- `supabase/` — SQL migrations tuần tự theo milestone, `seed.sql` dữ liệu giả lập dev, và `tests/` SQL assertions.

## 5. An toàn, Bảo mật & Tài nguyên
- **KHÔNG** commit `.env`, API keys, `service_role` key, token Jellyfin, phim, ảnh riêng tư hoặc paid asset packs không được phép phân phối.
- **KHÔNG** lưu mật khẩu hoặc nội dung riêng tư trong Service Worker cache.
- **KHÔNG** dùng `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY` trong migration (dễ lỗi quyền `42501`; bảng đã bật RLS sẵn trên Supabase).
- **KHÔNG** dùng asset vi phạm bản quyền (Stardew Valley, ảnh tải lậu). Bộ asset mặc định trong repo là starter procedural CC0 tự sinh (`scripts/generate-starter-assets.mjs`); asset ngoài đặt ở `public/assets/local-licensed/` (đã gitignore).
- **KHÔNG** báo cáo pass cho bài test chưa chạy hoặc đánh đồng test Chromium desktop/local với nghiệm thu trên iPhone thật, Supabase thật, hoặc Jellyfin/Tailscale thật.

## 6. Definition of Done cho mỗi task
1. Code chạy sạch: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` đều exit 0.
2. E2E Playwright (`npm run test:e2e`) chạy và pass cho các luồng liên quan.
3. Tài liệu (`docs/PROGRESS.md`, `docs/ROADMAP.md`, `README.md` nếu cần) được cập nhật trung thực: nêu rõ phần đã test, phần chưa test trên thiết bị thật và rủi ro còn lại.

**Bàn giao:** Đọc đúng task ở [backlog](docs/IMPLEMENTATION_BACKLOG.md) và [handover](docs/AGENT_HANDOVER.md). Chi phí bổ sung là 0₫. Dữ liệu dev và dev RPC bị cô lập khỏi production. Kiểm tra quyền ship của asset trước khi đưa vào bản build. Tra cứu qua [chỉ mục](docs/README.md) và [gate nghiệm thu](docs/MILESTONE_ACCEPTANCE.md).

Mini-game PvP giữa hai thành viên chỉ mở ở các milestone đã định. Không xếp hạng cạnh tranh dài hạn, không mất tài sản và không bắt buộc chơi. [Đặc tả sản phẩm](docs/PRODUCT_SPEC.md)
