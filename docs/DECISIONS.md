# Architecture Decision Records (ADRs)

## ADR-001: Package manager dùng `npm` và ghim TypeScript `~5.9.3`
- **Bối cảnh:** Máy phát triển cài sẵn Node `v24.18.0` và `npm 11.16.0` (không có `pnpm` hay `yarn`). Bản mới nhất trên npm của `typescript` đã lên `7.0.2`, trong khi `typescript-eslint@8.74.0` yêu cầu peer `typescript >=4.8.4 <6.1.0`.
- **Quyết định:** Dùng `npm` duy nhất và khóa `typescript` ở `~5.9.3` trong `package.json` + `package-lock.json`.
- **Hệ quả:** Lint/typecheck/build ổn định, không xung đột peer dependency.

## ADR-002: Chọn Phaser `4.2.1` với cấu hình pixel-art tường minh + Lazy Dynamic Import
- **Bối cảnh:** Cần hiển thị thế giới pixel art 16x16 sắc nét trên cả desktop và iOS Safari, đồng thời giữ initial load nhẹ.
- **Quyết định:** Dùng `phaser@4.2.1`, đặt tường minh `pixelArt: true`, `roundPixels: true`, `antialias: false`, giới hạn `DPR <= 2`, và dynamic `import()` từ `GameViewport.tsx` để Phaser tách thành chunk riêng.
- **Phương án dự phòng:** Nếu lỗi WebGL lặp lại trên iPhone thật, ghi ca tái hiện và thử giảm tải/khôi phục context. Chỉ đề xuất thử Phaser 3.90.0 trong nhánh riêng sau review và phê duyệt; scene, texture và input cần migration/kiểm thử lại.

## ADR-003: Dual Backend Adapter (`SupabaseBackend` + `LocalPreviewBackend`)
- **Bối cảnh:** Máy dev hiện tại không có Docker và Supabase CLI để chạy Supabase local container, cũng chưa có project cloud được cấu hình.
- **Quyết định:** Thiết kế interface `WorldBackend`. Khi thiếu `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, app tự chạy `LocalPreviewBackend` qua `localStorage` + `BroadcastChannel` (mỗi tab mang `sessionStorage` riêng) với badge cảnh báo rõ ràng. Khi có `.env` hợp lệ, dùng `SupabaseBackend` thật.
- **Lưu ý trung thực:** `LocalPreviewBackend` không bao giờ được coi là bằng chứng pass cho RLS/network thật trên Supabase; chỉ dùng để phát triển UI/gameplay và E2E nội bộ.

## ADR-004: Khóa chiếm chỗ nội thất theo ô bằng bảng `furniture_placement_tiles`
- **Bối cảnh:** Một món đồ như giường hoặc sofa chiếm `2x2` hoặc `2x1` ô. Nếu chỉ đặt unique index trên `(world_id, map_id, tile_x, tile_y)` ở bảng cha `furniture_placements`, hai người đặt hai món kích thước 2x1 cạnh nhau vẫn có thể chồng ô.
- **Quyết định:** Tách bảng `furniture_placement_tiles` với khóa chính `(world_id, map_id, layer_slot, tile_x, tile_y)`. Mọi thao tác đặt/di chuyển chạy trong transaction RPC khóa hàng `worlds` (`FOR UPDATE`), xóa các ô cũ (nếu move) và chèn tất cả các ô footprint mới nguyên tử.
- **Hệ quả:** Ngăn tuyệt đối hiện tượng 2 client đặt đè cùng lúc, đồng thời cho phép `layer_slot = 'floor'` (thảm) nằm dưới `layer_slot = 'object'` (bàn/sofa).

## ADR-005: Bộ starter pixel art CC0 tự sinh + thư mục import ngoài bị gitignore
- **Bối cảnh:** Chưa mua asset trả phí; repo công khai không được chứa paid packs cấm phân phối hoặc sprite sao chép trái phép.
- **Quyết định:** Viết script `scripts/generate-starter-assets.mjs` sinh toàn bộ tileset 16x16, sprite nội thất và icon PWA với license `CC0-1.0` đặt trong `public/assets/`. Nếu chủ dự án mua/tải asset từ Itch.io, import qua `scripts/import-external-assets.mjs` vào `public/assets/local-licensed/` (đã gitignore).

## ADR-006: Cô lập Spike 0 Media Sync khỏi production gameplay
- **Bối cảnh:** Chưa cài Jellyfin trên host và chưa nghiệm thu qua Tailscale tới iPhone 16 Pro Max.
- **Quyết định:** Đặt toàn bộ công cụ đo thiết bị và thử nghiệm đồng bộ `<video playsInline>` vào modal `SpikeLabModal` riêng biệt (`spike: sample-cozy-sync.mp4`, thuật toán `src/shared/cinemaSync.ts`), không tạo bảng DB hay UI sofa rạp phim giả trong V0.1.

## ADR-007: Dev-Only LAN Multiplayer Relay qua Vite Middleware & Khóa cứng Production (`import.meta.env.DEV`)
- **Bối cảnh:** `LocalPreviewBackend` dùng `localStorage` và `BroadcastChannel` nên chỉ đồng bộ được giữa các tab trong **cùng một trình duyệt trên một máy**, không hỗ trợ chơi thật giữa laptop Windows và điện thoại Redmi K70E qua Wi-Fi. Đồng thời, trong production tuyệt đối không được để lộ chức năng giả lập danh tính hay cho phép bỏ qua xác thực.
- **Quyết định:**
  1. Bổ sung Vite dev-server plugin (`scripts/devLanServerPlugin.mjs`, `apply: 'serve'`) cung cấp HTTP JSON + Server-Sent Events (`/api/dev-lan/*`) lưu trạng thái vào file `.dev-lan-state.json` (gitignored), giữ nguyên toàn bộ logic giới hạn 2 thành viên, mã mời 1 lần, từ chối người thứ 3 và atomic tile occupancy ở phía server dev.
  2. Triển khai `DevLanBackend` chỉ được import/kích hoạt bên trong nhánh `if (import.meta.env.DEV)` tại `src/lib/backend/index.ts`. Khi build production (`npm run build`), nếu thiếu `.env` Supabase, app chuyển sang `UnconfiguredBackend` an toàn và dead-code elimination loại bỏ toàn bộ mã giả lập danh tính khỏi `dist/`.
  3. Lập chỉ mục remote avatar theo `userId` (`selectLatestPresenceByUser`) để một tài khoản đăng nhập cùng lúc trên nhiều thiết bị vẫn hoạt động đúng mà không tạo bản sao nhân vật.

## ADR-008: Demo E — Unified Cozy World là định hướng mỹ thuật chính thức
- **Bối cảnh:** Người dùng đã nghiệm thu so sánh Demo A–E và duyệt chính thức **Demo E (`Unified Cozy World`)** làm hướng mỹ thuật chung (nền *Sprout Lands* pastel cottagecore + nội thất & avatar 4 hướng *Modern Interiors Free* + cảnh quan *Cozy Lands Basic* + nông sản/vật phẩm *Sunnyside World v2.1* + thú cưng *Free Pets Pack* CC BY 4.0).
- **Quyết định:**
  1. Giữ nguyên tập hợp asset miễn phí và avatar rig `Modern Interiors` (`Adam`, `Alex`, `Amelia` + Canvas palette-remap bảo toàn `AvatarConfig`). Không tạo Demo F.
  2. Không tích hợp artwork Demo E vào game V0.1 trong research milestone này; việc cắt production atlas, chỉnh sàn/đường/cỏ/tỷ lệ pet và camera mobile thực hiện ở milestone tích hợp kế tiếp theo [ASSET_PIPELINE.md](art/ASSET_PIPELINE.md).
  3. Asset non-commercial từ Itch.io không được commit nguyên pack lên repo public; chỉ đóng gói sprite có quyền phân phối trong PWA, ghi credit đầy đủ. Gitignore hoặc repo riêng không hạn chế URL của asset đã deploy.

## ADR-009: Chính sách ngân sách ≈ 0₫ & Kiến trúc Free-Tier First
- **Bối cảnh:** Chủ dự án là sinh viên với ngân sách rất hạn chế; ứng dụng phục vụ riêng 2 người dùng.
- **Quyết định:** Ngân sách bổ sung là **0₫**: ưu tiên asset miễn phí hiện có, mã nguồn mở có license tương thích (MIT/Apache/BSD/ISC cho code port trực tiếp), free tier cho database/auth/storage/static hosting và tận dụng quota coding agent sẵn có (DeepSeek V4.1 Flash làm agent triển khai chính cho module có spec rõ). Chỉ dùng tài nguyên hiện có hoặc gói miễn phí. Nếu một phương án có thể làm phát sinh phí thì dùng phương án 0₫ hoặc giữ việc đó ở trạng thái chờ.

---

## ADR-010: Mini-game PvP thân thiện và tự nguyện

- **Quyết định:** Hai thành viên trong cùng thế giới có thể mời nhau chơi Caro, Othello và Battleship. Mỗi ván cần cả hai đồng ý.
- **Giới hạn:** Không xếp hạng cạnh tranh dài hạn, không đặt cược hoặc mất tài sản, không buộc chơi để mở khóa hay tiếp tục tiến trình. Kết quả thắng, thua hoặc hòa chỉ thuộc ván hiện tại.
- **Phạm vi:** Áp dụng cho thiết kế mini-game ở các mốc sau. [Product Specification](PRODUCT_SPEC.md) · [Thiết kế mini-game](gameplay/MINIGAME_DESIGN.md)

## Quyết định đã chốt

Ngày 25/11/2026, chủ dự án đóng Master Research & Design và mở V0.1 Final Integration với ngân sách bổ sung **0₫**.

| ID | Quyết định đã duyệt | Việc cần xác minh khi triển khai |
|---|---|---|
| **PD-01** | Dự án cá nhân phi thương mại. Atlas phát triển riêng ưu tiên asset Demo E gốc được phép dùng trong game. Atlas công khai chỉ dùng asset đã xác minh quyền phát hành Web/PWA. | Asset chưa rõ quyền triển khai được ghi **Pending Deployment License Verification**. Giữ asset gốc ngoài Git và bản public. Xác minh quyền và giới hạn truy cập đường dẫn asset trước deploy Internet. |
| **PD-02** | Ưu tiên Cloudflare Pages Free làm static host. | Kiểm giới hạn, đường dẫn gốc PWA và HTTPS trên artifact khi tới OLW-010-05. |
| **PD-03** | Nghiên cứu Funnel HLS và WebRTC khi đến S0-5b. Transport chính thức chờ kết quả benchmark. | Đo mạng thật Windows → iPhone Safari, quyền truy cập, chi phí 0₫, reconnect và chất lượng. |
| **PD-04** | Không mua tên miền. | Dùng hostname đi kèm nền tảng đã chọn. |
| **PD-05** | Ưu tiên animation tương tác đôi miễn phí và có quyền phát hành. | Dùng pose/overlay nếu thiếu frame hợp lệ. |
| **PD-06** | Duyệt roadmap mới. V0.1.5 chỉ bắt đầu sau khi nghiệm thu V0.1. | Đóng 18 gate V0.1 trước khi mở Living Home. |
| **PD-07** | Tách Supabase Test/Prod nếu tài khoản còn đủ slot miễn phí. | Nếu thiếu slot, dùng Dev LAN cho vòng lặp phát triển và ghi Cloud Test đang chờ. Production giữ sạch dữ liệu test và dev RPC. |
| **PD-08** | Ưu tiên tạo sẵn hai tài khoản, tắt đăng ký công khai và có quy trình khôi phục an toàn. | Kiểm tra tạo tài khoản từ công cụ quản trị, đăng nhập, duy trì phiên và khôi phục trước deploy. Xác minh quyền sở hữu trước khi khôi phục. Dùng cơ chế quản trị an toàn ngoài client và giữ thông tin khôi phục khỏi repo, log và Service Worker. |

Cinema vẫn cần quyết định transport sau S0-5b. Khả năng dùng hai project Supabase và quy trình khôi phục tài khoản vẫn cần xác minh trên môi trường được cấp quyền. [Lộ trình](MASTER_ROADMAP.md) · [Gate nghiệm thu](MILESTONE_ACCEPTANCE.md)
