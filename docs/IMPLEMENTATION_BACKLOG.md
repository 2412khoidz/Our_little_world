# Backlog Triển khai Chi tiết (`IMPLEMENTATION_BACKLOG`)

*Cập nhật: 27/11/2026 | Canonical Baseline: `main` (`e5de4ac`, release `v0.2.5+`)*
*Phân rã nhiệm vụ nhỏ cho **Codex / Claude / DeepSeek / Gemini** qua worktree riêng (`npm run worktree:new -- --name <slug>`). Chuẩn bàn giao theo [CANONICAL_BASELINE.md](CANONICAL_BASELINE.md) và [REGRESSION_CHECKLIST.md](REGRESSION_CHECKLIST.md).*

> [!IMPORTANT]
> **Backlog V3 Hiện hành:** Phần lớn task trong `Phần A` lịch sử dưới đây (`V0.1-1..7`, `OLW-010-01..03`, `V0.1.5`, `V0.2.0`) đã được hợp nhất vào canonical `main` (`v0.2.5`). Danh sách **Mission hành động hiện tại (`M0`..`M10`)** nằm tại **[NEXT_MISSIONS.md](NEXT_MISSIONS.md)** cùng kết quả kiểm kê tài nguyên **`M3a` (`OWNER APPROVED`)** tại **[ASSET_REUSE_BACKLOG.md](art/ASSET_REUSE_BACKLOG.md)**:
> - **M3a (`OWNER APPROVED`):** Kiểm kê 28 pack donor & backlog sửa icon / transplant thú nuôi (`ASSET_LIBRARY_INVENTORY.md`, `ASSET_REUSE_BACKLOG.md`, `asset-library-inventory.json`)
> - **M0 (`Phase 1 OWNER APPROVED`):** Mobile-First HUD, Touch Controls & Global Fullscreen đã gộp `main` (`cfd3099`); tối ưu menu phụ trợ vẫn còn mở
> - **M1 (`IN PROGRESS` · V4 `NOT APPROVED`):** Billiards V3/V4.1 & 3D Transplant (chờ sửa camera V4.1; giữ Billiards V2 trên `main`)
> - **M2 (`V0.2.x`):** Couple P1 Animations (`kiss`, `lean_shoulder`, `dance`, `give_flower`)
> - **M3 (`V0.2.x`):** Farming, Fishing, Pet Polish + Sửa 32 SKU sai/trùng & Transplant Thú Nuôi (`FarmRanchLife`)
> - **M4 (`V0.2.4`):** Home Progression (Shop nội thất 4 phong cách + mở rộng nhà giữ nguyên đồ cũ)
> - **M5 (`V0.3`):** Interactive Cooking UI (`src/shared/cooking/`) nối nguyên liệu nông trại
> - **M6 (`V0.3`):** Persistent Shared Life UI (Nhật ký, Wishlist, Lịch hẹn, Picnic)
> - **M7 (`S0-5b` Spike):** Cinema VPN-less WAN Transport Benchmark (Windows → iPhone 4G)
> - **M8 (`V0.4`):** Home Cinema Player + Subtitles & WS cho `Caro/Othello/Battleship/Memory`
> - **M9 (`V0.5`):** Shop Art Unity, NPC depth, Save Backup/Restore & Mobile Perf
> - **M10 (`V1.0`):** Our Island Expansion
>
> Mục **`OLW-010-05` / `OLW-010-06`** (Supabase Cloud SQL & Cloudflare Pages HTTPS 24/7) chuyển sang **`DEFERRED`** (chỉ chạy khi chuyển sang vận hành cloud). Mục **`Phần A` bên dưới được giữ nguyên làm tài liệu tham chiếu lịch sử.**

---

## Phần A — Tài liệu Tham chiếu Lịch sử (`V0.1` · `S0-5b` · `V0.1.5` · `V0.2.0`)

### 1. Hoàn thiện `V0.1` — Tích hợp Demo E, Tối ưu Quota & Triển khai Thực tế

#### `OLW-010-01`: Tạo script trích xuất Production Atlas từ bộ Demo E (`0₫`)
- **Milestone:** V0.1 (Art Integration) | **Priority:** P0 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash (Neon review license/paths)
- **Mục tiêu:** Đóng gói chỉ đúng các sprite/tile đã chọn của Demo E từ `asset-candidates/` thành atlas gọn nhẹ (không nhúng nguyên pack gốc), sinh `CREDITS.md` (`Cup Nooble`, `LimeZu`, `Amo-QAQ`, `Daniel Diggle`, `Frakassets`).
- **Dependencies:** ADR-008 và PD-01 đã duyệt. Sẵn sàng nhận sau baseline. Ưu tiên asset Demo E gốc có quyền sử dụng riêng phi thương mại. Kiểm quyền Web/PWA cho profile public; quyền triển khai chưa rõ được ghi Pending Deployment License Verification.
- **Relevant files:** `src/game/artDemos/semanticAssetRegistry.ts`, `src/game/artDemos/DemoEScene.ts`, `scripts/import-external-assets.mjs`, `.gitignore`, `vite.config.ts`.
- **Relevant source references:** [ART_DIRECTION.md](art/ART_DIRECTION.md), [ASSET_PIPELINE.md](art/ASSET_PIPELINE.md).
- **API contract:** `node scripts/build-unified-atlas.mjs` đọc pack local ngoài artifact deploy. Xuất manifest, sheet và credits riêng cho từng profile (`--private` dùng asset gốc). Dùng đường dẫn build đã chốt trong [asset pipeline](art/ASSET_PIPELINE.md#3-kế-hoạch-tích-hợp-vào-game-v01-chính-không-phá-vỡ-hệ-thống-hiện-có). Báo rõ bằng tiếng Việt khi thiếu nguồn/quyền.
- **Data model:** Mỗi entry có semantic ID ổn định, texture, rect, anchor và pack/version/credit. Kiểm tra rect nằm trong sheet. Chỉ map ID dùng ở production V0.1.
- **Invariants:** Tuyệt đối không copy `.zip`, `.aseprite`, `Sunnyside_World_Gamemaker/` hay file thừa vào `public/` hay `dist/`; giữ kích thước precache PWA nhỏ (`< 3 MB`).
- **Scope:** Script trích xuất atlas + `CREDITS.md` + fallback cảnh báo tiếng Việt nếu thiếu file nguồn local.
- **Out-of-scope:** Sửa `WorldScene`, sửa DB hoặc mua asset.
- **Acceptance criteria:** Tái sinh deterministic atlas nhà/vườn và rig avatar từ nguồn được phép. Có credits, báo cáo từng asset vào dist, precache mục tiêu <3 MB và dùng CC0 ở profile public nếu quyền Web/PWA còn chưa rõ và giữ asset gốc trong profile private; ghi riêng giấy phép/shipping cho emote, pet và asset các mốc sau.
- **Test cases:** Thiếu pack, ID trùng, rect ngoài sheet, output lặp byte-identical, asset chưa xác nhận bị loại khỏi dist và sw.js; quét dist với production guard.

#### `OLW-010-02`: Tích hợp Hệ thống Avatar Modern Interiors (`unifiedAvatarBuilder`) vào Game V0.1
- **Milestone:** V0.1 (Art Integration) | **Priority:** P0 | **Risk:** Low | **Recommended agent:** DeepSeek V4.1 Flash
- **Mục tiêu:** Chuyển `phaserAvatarTexture.ts` của game chính V0.1 sang dùng cơ chế palette-remap Canvas của `unifiedAvatarBuilder.ts`, thay thế starter sprite thủ công.
- **Dependencies:** `OLW-010-01`.
- **Relevant files:** `src/game/art/phaserAvatarTexture.ts`, `src/game/artDemos/unifiedAvatarBuilder.ts`, `src/shared/avatar.ts`, `src/features/avatar/AvatarModal.tsx`.
- **Relevant source references:** [ART_DIRECTION.md §2](art/ART_DIRECTION.md).
- **API contract:** Giữ `ensurePhaserAvatarTexture(scene, config): string` và các animation key hiện tại; bên trong dựng texture đã cache từ palette/rig mới, có fallback starter nếu asset thiếu.
- **Data model:** Bảo toàn 100% `avatarConfigSchema` (`skinTone`, `hairStyle`, `hairColor`, `outfitStyle`, `outfitColor`, `accessory`).
- **Invariants:** Không đổi schema Supabase `profiles.avatar_config`; giữ nguyên viền `#3a3a50`/`#46465e`; 4 hướng idle/walk hoạt động cả local và remote peer.
- **Scope:** Avatar builder game chính + preview avatar trong Tủ đồ (`AvatarModal`).
- **Out-of-scope:** Thêm phụ kiện/kiểu tóc mới ngoài danh sách V0.1.
- **Acceptance criteria:** Đổi ngoại hình trên Tủ đồ cập nhật ngay trên Canvas 2 client và giữ nguyên sau reload.
- **Test cases:** `avatar.test.ts`, config đã lưu trước đổi render, đổi tóc/áo/kính ở cả hai client, reload, 4 hướng và không trùng cache key giữa hai ngoại hình.

#### `OLW-010-03`: Nâng cấp `WorldScene.ts` & Maps V0.1 lên Đồ họa Demo E (Sửa Sàn, Đường, Cỏ, Tỷ lệ Pet, Camera Mobile)
- **Milestone:** V0.1 (Art Integration) | **Priority:** P0 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash (Neon review visual/collision)
- **Mục tiêu:** Áp dụng atlas Demo E vào `BootScene.ts` & `WorldScene.ts` cho hai bản đồ `home` và `garden`, đồng thời xử lý dứt điểm 5 điểm tồn tại đã ghi chú: (1) liền mạch sàn gỗ/mosaic, (2) 9-slice đường đất vườn, (3) đa dạng tile cỏ không kẻ ô, (4) cân tỷ lệ thú cưng `16px` cạnh avatar `16×23px`, (5) khung camera mobile dọc/ngang không viền đen & không cắt sprite mép.
- **Dependencies:** `OLW-010-01`, `OLW-010-02`.
- **Relevant files:** `src/game/scenes/BootScene.ts`, `src/game/scenes/WorldScene.ts`, `src/shared/catalog.ts`, `src/shared/maps.ts`, `src/shared/placement.ts`.
- **Relevant source references:** [ASSET_PIPELINE.md](art/ASSET_PIPELINE.md), `src/game/artDemos/DemoEScene.ts`.
- **API contract:** Giữ các payload `evt:local-movement`, `evt:request-map-change`, `evt:decorate-place`, `evt:decorate-move` và hợp đồng WorldBackend.
- **Data model:** Bảng ánh xạ render theo SKU hiện tại; giữ footprint, layerSlot và điểm tương tác trong domain.
- **Invariants:** Lưới BFS `16×16`, va chạm tường/đồ, Y-depth `Math.round(worldBottomY)` và vùng cấm đặt cổng cửa không đổi.
- **Scope:** Render home/garden và catalog render. Tỷ lệ pet kiểm tra bằng asset preview ngoài luồng nếu có quyền; pet sống chỉ mở ở V0.1.5.
- **Out-of-scope:** Gameplay farming/pet AI mới hay chuyển sang Phaser 3.
- **Acceptance criteria:** Không lỗi pixel mờ trên desktop/mobile; đi qua cửa nhà↔vườn hoạt động; đặt/dời nội thất đúng footprint `16×16`.
- **Test cases:** `placement.test.ts` pass; Playwright `v01-our-little-home.spec.ts` 8/8 pass trên bản render mới + chụp kiểm tra `1280×720`, `430×932`, `844×390`.

#### `OLW-010-04`: Tối ưu Băng thông Realtime Movement (`8 Hz` + Delta >= 2px) Cho Supabase Free Quota
- **Milestone:** V0.1 | **Priority:** P1 | **Risk:** Low | **Recommended agent:** DeepSeek V4.1 Flash
- **Mục tiêu:** Đo baseline và thử trần 8 Hz (125 ms) cho gói di chuyển thường, ngưỡng 2 px theo khoảng cách từ lần gửi cuối. Xác minh quota theo lượt gửi/nhận và số thiết bị, không hứa mức tiết kiệm khi chưa đo.
- **Dependencies:** Không.
- **Relevant files:** `src/shared/realtime.ts`, `src/game/scenes/WorldScene.ts`, `src/app/App.tsx`, `src/lib/backend/supabaseBackend.ts`, `tests/unit/realtime.test.ts`.
- **Relevant source references:** [ARCHITECTURE_REVIEW.md §2.1](research/ARCHITECTURE_REVIEW.md).
- **API contract:** Mở rộng `MovementTxThrottle.shouldEmit` và caller để quyết định từ tọa độ/hướng. Giữ schema MovementPacket và seq tăng theo phiên.
- **Data model:** Không đổi `MovementPacket`.
- **Invariants:** Không làm giật nội suy phía người nhận; gói đổi `mapId` hoặc chuyển sang `idle` luôn gửi ngay không bị drop.
- **Scope:** Bộ điều tiết gửi gói trong `src/shared/realtime.ts` + caller trong `WorldScene.ts`.
- **Out-of-scope:** Thay đổi Postgres schema hay Supabase channel rules.
- **Acceptance criteria:** Gói thường khi đi cách nhau ≥125 ms. Idle và đổi map gửi riêng một gói chốt theo chuyển trạng thái. Modal hoặc tab ẩn không có gói đi bộ thường. Ghi mẫu measurement và projection khi có usage Cloud.
- **Test cases:** Delta tích lũy 2 px, idle/map gửi đúng một lần, direction change vẫn tôn trọng trần gói thường, pause/resume không rớt gói mới, 2–3 kết nối và nội suy khi mạng chập chờn.

#### `OLW-010-05`: Thiết lập Supabase Cloud (Prod + Test) & Deploy HTTPS Cloudflare Pages Free
- **Milestone:** V0.1 | **Priority:** P0 | **Risk:** High | **Recommended agent:** Neon (hướng dẫn/kiểm) + Chủ dự án (thao tác secrets)
- **Mục tiêu:** Thiết lập Supabase Cloud và static hosting HTTPS ưu tiên Cloudflare Pages Free, nghiệm thu Auth V0.1 theo PD-08. Chạy migration và SQL assertions ở Test trước.
- **Dependencies:** `OLW-010-03`, baseline/task `OLW-010-04`, bằng chứng quyền phát hành, quyền tài khoản, khả năng dùng slot Supabase Free theo PD-07 và luồng Auth theo PD-08.
- **Relevant files:** `supabase/migrations/*.sql`, `supabase/tests/rls_and_pairing.sql`, `vite.config.ts`, `.env.example`, `scripts/verify-prod-guard.mjs`.
- **Relevant source references:** [MILESTONE_ACCEPTANCE.md §1](MILESTONE_ACCEPTANCE.md).
- **API contract:** `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` là biến build public; Auth email/password và world invite là hai bước riêng. Cấu hình Site URL/redirect HTTPS theo phương án Auth được duyệt.
- **Data model:** Toàn bộ bảng V0.1 + RLS private Realtime channel.
- **Invariants:** `verify-prod-guard.mjs` phải pass trước khi deploy; **không** nạp `seed.sql` dev hay `dev-migrations` lên project Production; **không** lộ `service_role`.
- **Scope:** Cloud Test chạy ba migration V0.1 và SQL assertions với đủ ba UUID fixture. Nếu runner in “Skipping SQL integration block” thì chưa đạt. Production áp ba migration theo thứ tự. Xác nhận Auth bằng hai tài khoản người chơi và fixture outsider ở Test, HTTPS và PWA mở độc lập với laptop.
- **Out-of-scope:** Tính năng V0.1.5+.
- **Acceptance criteria:** Người chơi mở cùng link HTTPS và đăng nhập; session sống qua reload; account thứ ba bị chặn membership, read/write và private Realtime ở Test. Kiểm tra artifact và cache trước khi deploy.
- **Test cases:** SQL + test private channel thật, 2 lần redeem hợp lệ song song chỉ thêm một thành viên, 2 session cùng tài khoản không chiếm thêm slot; kiểm tài khoản tạo sẵn đăng nhập được, đăng ký công khai bị từ chối và khôi phục an toàn theo PD-08, Auth và media ngoài Service Worker.
- **Chi tiết bàn giao:** Xác minh SMTP mặc định trước khi dựa vào mail. Theo PD-08, chủ dự án ưu tiên tạo sẵn hai tài khoản đã xác nhận qua công cụ Auth Admin. Tắt đăng ký công khai và kiểm tra hướng dẫn đăng nhập, khôi phục bằng tiếng Việt. Quy trình khôi phục cần xác minh quyền sở hữu, giữ secret và thông tin khôi phục ngoài client và log. Không đưa secret vào client. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp) · [Auth Admin](https://supabase.com/docs/reference/javascript/auth-admin-createuser)

#### `OLW-010-06`: Nghiệm thu Thiết bị Thật (`Pending Manual Verification` — Windows + K70E + iPhone 16 Pro Max)
- **Milestone:** V0.1 | **Priority:** P0 | **Risk:** High | **Recommended agent:** Chủ dự án + bạn gái (Neon ghi kết quả vào `PROGRESS.md`)
- **Mục tiêu:** Nghiệm thu thực tế trên **iPhone 16 Pro Max Safari thật + Add to Home Screen PWA**, Android Redmi K70E và Windows Chrome qua **2 mạng khác nhau (Wi-Fi ↔ 4G)**; quyết định có cần fallback `phaser@3.90.0` (ADR-002) không.
- **Dependencies:** `OLW-010-05`.
- **Relevant files:** `docs/TEST_PLAN.md`, `docs/MILESTONE_ACCEPTANCE.md`, `docs/PROGRESS.md`.
- **Relevant source references:** [MILESTONE_ACCEPTANCE.md §1](MILESTONE_ACCEPTANCE.md).
- **API contract:** N/A (Kiểm thử thực địa).
- **Data model:** N/A.
- **Invariants:** Báo cáo trung thực iOS version, mạng, lỗi WebGL/reconnect nếu có; không tự đánh pass nếu chưa test thật.
- **Scope:** Chạy T01–T06 và T08 từ [TEST_PLAN.md](TEST_PLAN.md), trên bản HTTPS và mạng thật. T07 là LAN Cinema sync; WAN Cinema nằm ở S0-5b.
- **Out-of-scope:** Cinema bitrate cao (thuộc `S0-5b`).
- **Acceptance criteria:** Hoàn thành toàn bộ 18 mục trong `MILESTONE_ACCEPTANCE.md §1` không lỗi nghiêm trọng.
- **Test cases:** Add to Home Screen → đăng nhập → mời người thương → đi lại đồng thời → đặt nội thất trùng ô → khóa màn hình 60s rồi mở lại → đổi Wi-Fi sang 4G → reload kiểm tra persistence.

---

### 2. Spike Song song Cinema VPN-less (`S0-5b`)

#### `OLW-S05B-01`: Benchmark Truyền Media Không Cài VPN Phía iPhone (`Tailscale Funnel HLS` vs `WebRTC TURN Free`)
- **Milestone:** Spike `S0-5b` (Chạy song song sau V0.1) | **Priority:** P1 | **Risk:** High | **Recommended agent:** Neon + Chủ dự án
- **Mục tiêu:** Kiểm chứng thực nghiệm đường truyền laptop Windows → **iPhone 16 Pro Max Safari qua mạng 4G** (bạn gái chỉ mở 1 URL HTTPS, 0 cài Tailscale/VPN): so sánh (A) Windowed FFmpeg HLS qua Tailscale Funnel có token ký vs (B) WebRTC `video.captureStream()` + Cloudflare Free 1TB TURN.
- **Dependencies:** Chạy khi tới S0-5b sau V0.1 trong sandbox HTTPS riêng. PD-03 đã duyệt nghiên cứu hai ứng viên trong ngân sách 0₫. Phép thử transport không cần DB production.
- **Relevant files:** `docs/MEDIA_SETUP.md`, `docs/research/OPEN_SOURCE_RESEARCH.md §3`, `src/shared/cinemaSync.ts`.
- **Relevant source references:** `Local-Watch-Party@02e466d:server/index.js#ensureHlsSegment` (chỉ học kiến trúc), `watchparty@ec71395:src/components/App/App.tsx:866`.
- **API contract:** Prototype ngoài luồng (`Spike 0 Lab` hoặc sandbox riêng), dùng HMAC token ngắn hạn trên host endpoint.
- **Data model:** Chưa thêm bảng production.
- **Invariants:** 0₫ theo tài khoản và hạn mức đã xác minh, media hợp lệ, xác thực từng tài nguyên, không đưa credential hoặc thư viện Jellyfin ra Internet.
- **Scope:** Thử nghiệm tốc độ 720p/1080p H.264/AAC & MKV phụ đề `.vtt`, đo buffering, seek latency, audio ducking / `AVAudioSession` trên iPhone Safari thật.
- **Out-of-scope:** UI Rạp phim hoàn chỉnh trong game chính V0.4.
- **Acceptance criteria:** Ghi số đo, quyết định Go/No-Go cho từng ứng viên theo [MEDIA_SETUP.md](MEDIA_SETUP.md). No-Go là kết quả hợp lệ và giữ V0.4 ở trạng thái chờ transport.
- **Test cases:** Mẫu H.264/AAC, MKV/SRT, seek do hai bên yêu cầu, session hết hạn và người ngoài bị từ chối. Đo 10 phút và một lượt 60 phút trên iPhone 4G thật, đổi mạng/khóa máy, thử P2P và relay riêng.

---

### 3. `V0.1.5` (sau nghiệm thu V0.1) — Living Home (Pet MVP, Inventory K5, Pomodoro, Hộp thư & Quà, Tương tác Đôi, Dev Console)

#### `OLW-015-01`: Inventory Tối thiểu (`K5`) & `item_catalog` Read-Only
- **Milestone:** V0.1.5 | **Priority:** P0 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash (Neon review SQL/RLS)
- **Mục tiêu:** Triển khai tầng kho đồ nền (chưa có tiền tệ) hỗ trợ đồ chung (`shared`) và ngăn quà bí mật (`user:<uuid>`), hạt mèo cơ bản miễn phí, làm móng cho Hộp thư & Economy `V0.2.0`.
- **Dependencies:** V0.1 đã nghiệm thu theo PD-06.
- **Relevant files:** `src/shared/inventory/`, `src/lib/backend/types.ts`, `src/lib/backend/supabaseBackend.ts`, `src/lib/backend/devLanBackend.ts`, `supabase/migrations/`.
- **Relevant source references:** [ARCHITECTURE_REVIEW.md §1 (K5)](research/ARCHITECTURE_REVIEW.md), [ECONOMY_SIMULATOR_SPEC.md §2](economy/ECONOMY_SIMULATOR_SPEC.md).
- **API contract:** `getInventory(worldId)` đọc kho chung + kho của caller. `claimFreeStarterItem(worldId, idempotencyKey)` chỉ cấp SKU hạt mèo theo định mức. Tiêu hao dùng helper server nội bộ gọi trong RPC hộp thư/pet, không có RPC ghi kho tổng quát.
- **Data model:** `item_catalog(sku, stack_limit, purpose)`; `inventory_items(world_id, owner_scope, item_sku, qty)` unique theo ba cột, scope `shared` hoặc `user:<uuid>`. Ghi replay vào bảng RPC-private theo quy ước bên dưới.
- **Invariants:** Gom/tiêu tạo-xóa dòng nguyên tử; cấp bát hạt shared tối đa một lần/ngày khi trống, theo ngày server, SKU không mua/bán; túi riêng chỉ chủ túi đọc. Tất cả write lấy khóa world trước.
- **Scope:** Schema SQL + pure helper + contract tests cho DevLan và Supabase.
- **Out-of-scope:** Tiền xu, shop mua bán, giá nông sản (`V0.2.0`).
- **Acceptance criteria:** Hai người nhận quà / lấy hạt mèo free đồng thời không làm lệch `qty` âm hoặc nhân đôi item.
- **Test cases:** Race cấp hạt trong 2 session, giả ownerScope, đọc túi người kia, outsider, retry cùng request và cùng key nhưng khác actor/payload. Xác minh SKU và dữ liệu V0.1.5 còn nguyên sau migration V0.2.0.

#### `OLW-015-02`: Hộp thư Trước Cổng & Gửi Thư / Quà Bất ngờ
- **Milestone:** V0.1.5 | **Priority:** P1 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash (Neon review RLS)
- **Mục tiêu:** Biến hộp thư đỏ (Demo E) thành nơi gửi thư ngắn & đóng gói 1 món quà từ túi cá nhân/túi chung tới đối phương, giữ bất đồng bộ kể cả khi người kia đang offline.
- **Dependencies:** `OLW-015-01`.
- **Relevant files:** `src/features/mailbox/`, `src/shared/mailbox/`, `src/game/scenes/WorldScene.ts`, `supabase/migrations/`.
- **Relevant source references:** [COUPLE_INTERACTIONS.md §3](gameplay/COUPLE_INTERACTIONS.md).
- **API contract:** `sendLetterOrGift(worldId, recipientId, note, giftSku?, ownerScope?, idempotencyKey)` và `openMailboxItem(worldId, letterId, idempotencyKey)`. Quà MVP số lượng 1.
- **Data model:** `letters_and_gifts (id, world_id, sender_id, recipient_id, note, item_sku, qty, opened_at, created_at)`.
- **Invariants:** Server kiểm tra người nhận là thành viên còn lại, trừ item vào thư khi gửi, chuyển vào túi người nhận một lần khi mở. Danh sách trước mở chỉ cho thấy có thư; SKU/note trả theo quyền qua projection. Giữ thư chưa mở nếu stack đích đầy. Nội dung tối đa 500 ký tự, hiển thị văn bản thuần.
- **Scope:** UI hộp thư mobile-first + indicator có thư mới trên sprite hộp thư + RPC SQL.
- **Out-of-scope:** Gửi ảnh đính kèm dung lượng lớn (`V0.3` Album).
- **Acceptance criteria:** Mây gửi quà từ túi riêng lúc Nắng offline → Nắng không thấy trước, chỉ khi bấm Hộp thư mới mở ra nhận đồ vào kho.
- **Test cases:** Hai tab mở cùng thư, giao dịch lỗi stack rồi retry, outsider và đổi recipientId bị chặn, note chứa HTML được render là text, B offline lúc gửi rồi mở được.

#### `OLW-015-03`: Pet MVP Domain (`cat-orange`) & Offline Non-Lethal Decay
- **Milestone:** V0.1.5 | **Priority:** P0 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash (Neon review RPC)
- **Mục tiêu:** Tạo logic thuần & bảng DB cho 1 chú mèo cam chung: nhận nuôi/đặt tên, 3 nhu cầu cơ bản (`no`, `năng lượng`, `vui vẻ`), `FLOOR = 30`, cho ăn (hạt `0₫`), uống nước, vuốt ve.
- **Dependencies:** `OLW-015-01`.
- **Relevant files:** `src/shared/pet/petNeeds.ts`, `src/lib/backend/`, `supabase/migrations/`.
- **Relevant source references:** [PET_DESIGN.md](pet/PET_DESIGN.md), [PET_SIMULATION_SPEC.md](pet/PET_SIMULATION_SPEC.md).
- **API contract:** `getPetSnapshot(worldId)` trả snapshot + serverNowMs; `adoptOrRenamePet(worldId, name, expectedVersion?, key)`; `interactPet(worldId, petId, action, expectedVersion, key)`. SKU thức ăn do server quyết định.
- **Data model:** `pets`, `pet_events` với `UNIQUE(world_id, idempotency_key)`.
- **Invariants:** Cùng một pet/world, feed cooldown dùng giờ server, retry replay trước so version, mỗi commit cập nhật version/catch-up và inventory trong cùng transaction. Theo sàn, hệ số và mốc giờ ở `PET_SIMULATION_SPEC.md`.
- **Scope:** Domain catch-up thuần + RPC tương tác + Parity `DevLanBackend`.
- **Out-of-scope:** Full Utility AI 8 nhu cầu / 24 ký ức / Pet Brain Debugger (`V0.2.3`).
- **Acceptance criteria:** Snapshot sau 30 ngày giống catch-up 48h, từng stat ở dải 30–100. Feed khác khóa đồng thời chỉ mất một hạt; replay đúng request không tăng event.
- **Test cases:** Vitest property test `computePetVitalsAt` ở `0h/12h/48h/720h`; Backend contract test race cho ăn.

#### `OLW-015-04`: Pet MVP Renderer (`Free Pets Pack` `cat-orange` 4 hướng) & UI Tương tác Mèo
- **Milestone:** V0.1.5 | **Priority:** P0 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash
- **Mục tiêu:** Tải 128 frames `cat-orange_16px_top-down` (`Happy/Idle/Sleep/Walk` × 4 hướng + `_shadow`), hiển thị mèo đi quanh góc thú cưng, lại bát ăn khi được cho ăn, và nằm cạnh bàn học/sofa khi cặp đôi hoạt động.
- **Dependencies:** `OLW-015-03`, `OLW-010-03` và quyền ship mèo ghi từ `OLW-010-01`.
- **Relevant files:** `src/game/entities/PetEntity.ts`, `src/game/scenes/WorldScene.ts`, `src/features/pets/`.
- **Relevant source references:** [PET_ANIMATION_MATRIX.md](pet/PET_ANIMATION_MATRIX.md).
- **API contract:** `getPetSnapshot` lúc mở map/reconnect và khi nhận tín hiệu thay đổi version, nhận anchor rồi chạy hoạt ảnh cục bộ xác định từ server time.
- **Data model:** Dùng chung `PetSnapshot` từ `OLW-015-03`.
- **Invariants:** MVP một mèo, không có Sim-Host; icon tim/ZZZ có fallback, âm thanh mặc định im khi học. Ngữ cảnh Pomodoro nối ở OLW-015-06.
- **Scope:** Entity Phaser 4 + bong bóng tim/Zzz + modal nhỏ đặt tên & chạm vuốt ve/cho ăn.
- **Out-of-scope:** Bảng Utility AI phức tạp (`V0.2.3`).
- **Acceptance criteria:** Mèo hiển thị mượt cả `home` lẫn khi 2 máy cùng ở góc thú cưng; tap chạm vào mèo mở menu tương tác nhanh 1 ngón.
- **Test cases:** Hai context nhận cùng pet ID, rename, feed, reconnect và cùng quay về anchor khi layout thay đổi.

#### `OLW-015-05`: Tích hợp Pomodoro Co-presence Thuần TS (Port MIT từ `cocoworking`) & Đồng bộ Server
- **Milestone:** V0.1.5 | **Priority:** P0 | **Risk:** Low | **Recommended agent:** DeepSeek V4.1 Flash (Neon review SQL)
- **Mục tiêu:** Port `cocoworking@947494f:packages/shared/src/pomodoro.ts` (kèm ghi chú `THIRD_PARTY_NOTICES.md`) sang `src/shared/study/pomodoro.ts`, lưu phiên học theo `started_at`/`ends_at` server ms để iPhone khóa màn hình vẫn chuẩn giờ.
- **Dependencies:** V0.1 đã nghiệm thu theo PD-06.
- **Relevant files:** `src/shared/study/pomodoro.ts`, `THIRD_PARTY_NOTICES.md`, `src/lib/backend/`, `supabase/migrations/`.
- **Relevant source references:** [REUSE_MATRIX.md](research/REUSE_MATRIX.md), `cocoworking@947494f:packages/shared/src/pomodoro.ts`, `focus-town:server/shared-focus.ts`.
- **API contract:** `getStudySnapshot(worldId)` trả serverNowMs; `startSession(worldId, mode, focusMinutes, key)`; pause/resume/finish nhận sessionId, expectedVersion, key. Hai thành viên có thể tham gia phiên shared, chỉ người mở điều khiển vòng đời. Solo riêng theo actor. Khi tải lại, suy ra phase từ server time và timeline đã lưu, không reset hoặc cần tick nền.
- **Data model:** `study_sessions` gồm world_id, owner_id, mode, phase, status, started_at, ends_at, remaining_ms, version. Một phiên shared đang chạy/tạm dừng mỗi world; solo một phiên mỗi người.
- **Invariants:** Không dùng `setInterval` làm nguồn chân lý thời gian; **không bắt buộc bật camera hay mic**; không ép chuỗi streak; học vẫn mở lúc ví `0` xu.
- **Scope:** Pure timer state + attribution MIT notice + RPC session sync.
- **Out-of-scope:** Tiền xu hay phần thưởng kinh tế (`V0.2.0+` tùy chọn thưởng nhẹ không ép buộc).
- **Acceptance criteria:** Khóa màn hình hoặc tắt tab 10 phút rồi mở lại đồng hồ vẫn đúng giây thực tế theo server time.
- **Test cases:** Port MIT có vector focus → break → complete, pause/resume, reload khi trôi qua endsAt, hai lệnh cạnh tranh, replay, người ngoài bị chặn và hai timer solo độc lập.

#### `OLW-015-06`: Giao diện Phòng học Im lặng & Tương tác Bàn học 2 Chỗ (Có Pet Nằm Cạnh)
- **Milestone:** V0.1.5 | **Priority:** P0 | **Risk:** Low | **Recommended agent:** DeepSeek V4.1 Flash
- **Mục tiêu:** Nối bàn học 2 chỗ (Demo E) với Pomodoro: chạm bàn học để ngồi chế độ học (`sit`), xem đồng hồ gọn không gây xao nhãng, bật âm thanh mưa/lửa nhẹ tùy chọn, và mèo tự tới nằm góc thảm bàn học.
- **Dependencies:** `OLW-015-05`, `OLW-015-04`.
- **Relevant files:** `src/features/study/PomodoroPanel.tsx`, `src/game/scenes/WorldScene.ts`, `src/app/App.tsx`.
- **Relevant source references:** [GAME_DESIGN.md](gameplay/GAME_DESIGN.md), `Our_Little_World_Agent_Plan.md §6`.
- **API contract:** Đọc StudySnapshot, hiển thị thời gian còn lại theo server clock; ghế là hiện diện theo session, release khi rời map/đi lại/timeout.
- **Data model:** Đọc `study_sessions`.
- **Invariants:** Tắt camera/mic 100%; UI dọc mobile gọn không cản thao tác; cho phép học một mình hoặc đồng bộ cùng lúc.
- **Scope:** Panel điều khiển 25/45/60/90p + chọn ngồi slot trái/phải bàn học.
- **Out-of-scope:** Bảng xếp hạng ai học chăm hơn (cấm tuyệt đối).
- **Acceptance criteria:** Cả 2 cùng mở phòng học thấy avatar nhau ngồi 2 ghế bàn học với bộ đếm giờ đồng bộ.
- **Test cases:** Hai client vào ghế khác nhau, reload/lock không reset timer, một người dùng solo khi đối phương offline, mèo ở góc học và không xin camera/mic.

#### `OLW-015-07`: Tương tác Đôi Cơ bản (`Sit Sofa/Giường`, `Ôm 0₫`, `Emote`) + Khung ảnh Tĩnh
- **Milestone:** V0.1.5 | **Priority:** P1 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash
- **Mục tiêu:** Cho phép ngồi cạnh nhau trên sofa/ghế vườn dùng animation `sit/sit2` của Modern Interiors, nằm nghỉ trên giường dùng lớp phủ chăn pixel (`0₫`), mời ôm (`Invite/Accept 15s TTL`, pose kề + bong bóng tim `0₫`), gửi 5 emote nhanh, và đặt 1 Khung ảnh Kỷ niệm treo tường.
- **Dependencies:** `OLW-010-03`, `OLW-015-01`.
- **Relevant files:** `src/shared/couple/`, `src/features/couple/`, `src/game/scenes/WorldScene.ts`.
- **Relevant source references:** [COUPLE_INTERACTIONS.md §1–§2](gameplay/COUPLE_INTERACTIONS.md).
- **API contract:** Broadcast `COUPLE_INVITE` / `COUPLE_ACCEPT` / `COUPLE_END` + `COUPLE_EMOTE`.
- **Data model:** Broadcast tạm với inviteId, fromSessionId, toUserId, actor, mapId, expiry; khung ảnh dùng asset mẫu nội bộ và ID ảnh cấu hình, upload riêng tư ở V0.3.
- **Invariants:** Hug cần đúng người được mời chấp nhận trong 15s, cùng map và điểm neo hợp lệ; di chuyển/đổi map/rớt mạng hủy. 0 xu; pose 0₫ theo PD-05. Nắm tay là mở rộng sau MVP.
- **Scope:** Sit/Lie/Hug(0₫)/Emote + Khung ảnh cơ bản.
- **Out-of-scope:** Animation ôm vẽ riêng mất phí (`PD-05`), Album nhiều trang & Nhật ký (`V0.3`).
- **Acceptance criteria:** Mời ôm và ngồi sofa đồng bộ 2 tab; chạm đi hướng khác hủy tư thế sạch sẽ không kẹt avatar.
- **Test cases:** Invite hết hạn, accept lặp/đến trễ, nhận nhầm phiên, hai người cùng chọn một chỗ, chuyển map hủy pose, khung sử dụng ảnh mẫu.

#### `OLW-015-08`: Nền tảng Dev Console Cơ bản (`K6`) & `supabase/dev-migrations/` Cách ly Project Test
- **Milestone:** V0.1.5 | **Priority:** P1 | **Risk:** High | **Recommended agent:** Neon (SQL guard) + DeepSeek (UI Dev)
- **Mục tiêu:** Xây dựng ngăn kéo Dev Console (`Ctrl+Shift+D` / nút Dev) chỉ tải trong `import.meta.env.DEV`: Reset world, Spawn item K5, Teleport phòng/vườn, Đóng vai 1/2/3, Giả lập mất mạng, Lưu/Phục hồi JSON snapshot, và bộ RPC `dev_*` đặt tách trong `supabase/dev-migrations/`.
- **Dependencies:** `OLW-015-01`, `OLW-015-03`; dùng Dev LAN trước, Cloud Test chỉ khi còn slot Free cho project riêng theo PD-07.
- **Relevant files:** `src/features/devConsole/`, `supabase/dev-migrations/`, `scripts/verify-prod-guard.mjs`, `scripts/devLanServerPlugin.mjs`.
- **Relevant source references:** [DEV_TOOLS.md](DEV_TOOLS.md).
- **API contract:** DevConsoleActions DEV-only; impersonation chỉ dành cho Dev LAN. Test project yêu cầu Auth thật, allowlist project dev, auth.uid() trong dev_admins và world có is_test=true.
- **Data model:** Bảng test riêng `public.dev_admins (user_id PK)` nằm trong `supabase/dev-migrations/`.
- **Invariants:** Production thiếu dev schema/RPC và build không có marker. Restore chỉ sandbox, kiểm tra schema version/world, transactional. Không export thư, ảnh, auth/session hay dữ liệu production.
- **Scope:** UI Dev Console + JSON snapshot + RPC cô lập project Test.
- **Out-of-scope:** Cheat tiền tệ hay cây trồng (bổ sung ở `V0.2.0` và `V0.2.1`).
- **Acceptance criteria:** Gọi `dev_*` trên world không gắn `is_test = true` hoặc user thường đều lỗi `FORBIDDEN`; bản build production sạch 0%.
- **Test cases:** Build guard, user thường, admin với world thường và production project đều từ chối; restore lỗi giữ snapshot cũ. Chỉ áp lệnh khi hệ thống liên quan đã có.

---

### 4. `V0.2.0` (sau khi nghiệm thu V0.1.5) — Economy Foundation (Ví chung, Ledger, NPC Bác Hai Mùa, Economy Simulator)

#### `OLW-020-01`: Nguồn Config Catalog Chung (`catalogConfig.ts`) & Ledger Math Số nguyên (`harvest-hollow` MIT)
- **Milestone:** V0.2.0 | **Priority:** P0 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash (Neon review)
- **Mục tiêu:** Đưa bảng item khởi đầu (~30 items ở `PRODUCTION_CHAINS.md`) và phép tính basis-points `mulBp` / giá bán `P_i` vào 1 file nguồn TS duy nhất dùng cho cả client, SQL seed generator và simulator.
- **Dependencies:** `OLW-015-01`.
- **Relevant files:** `src/shared/economy/catalogConfig.ts`, `src/shared/economy/ledgerMath.ts`, `scripts/generate-catalog-sql.mjs`, `THIRD_PARTY_NOTICES.md`.
- **Relevant source references:** [ECONOMY_MODEL.md](economy/ECONOMY_MODEL.md), [PRODUCTION_CHAINS.md](economy/PRODUCTION_CHAINS.md), `harvest-hollow@9b23e1a:shared/rules/economy.js`.
- **API contract:** Xuất `ITEM_CATALOG`, `computeSellPrice(sku, quality, saturationCount)`, `mulBp(amount, bp)`.
- **Data model:** Sinh thẳng SQL `INSERT ... ON CONFLICT DO UPDATE` cho `item_catalog`.
- **Invariants:** 100% phép tính trả số nguyên; mọi đồ shop mua đều thỏa `storeBuy >= 2 * baseSell` (không arbitrage).
- **Scope:** Config, integer math và generator. Phân biệt SKU hiện hành và SKU mô phỏng tương lai bằng milestone; chỉ kích hoạt catalog tương ứng. Giữ dữ liệu/surprise gifts hiện có.
- **Out-of-scope:** UI Cửa hàng hay Postgres RPC.
- **Acceptance criteria:** Script sinh SQL khớp với config TS 100%; unit test xác nhận 0 sai số làm tròn & 0 arbitrage.
- **Test cases:** Vector giá giống SQL tại biên rounding, split lô lúc qua ngưỡng, catalog upsert không đổi stable SKU và rule resale riêng với kiểm tra arbitrage đa bước ở OLW-020-04.

#### `OLW-020-02`: Postgres Schema `world_wallet`, `economy_ledger` & RPC `economy_apply_transaction` (`K2`)
- **Milestone:** V0.2.0 | **Priority:** P0 | **Risk:** High | **Recommended agent:** Neon / Codex (triển khai & review SQL)
- **Mục tiêu:** Tạo bảng ví chung, sổ cái `economy_ledger` append-only và RPC `SECURITY DEFINER` thực thi mua/bán/nhận thưởng atomic trong 1 transaction.
- **Dependencies:** `OLW-020-01`.
- **Relevant files:** `supabase/migrations/`, `supabase/tests/`.
- **Relevant source references:** [ECONOMY_SIMULATOR_SPEC.md §2](economy/ECONOMY_SIMULATOR_SPEC.md).
- **API contract:** `economy_apply_transaction(p_world_id, p_action, p_payload, p_idempotency_key)` trả snapshot ví, delta kho và ledgerId. Actions MVP buy_seed, sell_bin, forage_herb. Thưởng mới có RPC nội bộ theo milestone, không có grant tùy ý từ client.
- **Data model:** Giữ inventory K5; thêm world_wallet, economy_ledger và counter bão hòa theo world/day/group. ID điểm hái và thời điểm tái sinh lưu server. Backfill ví hiện có và world mới bằng cùng grant một lần, ghi ledger.
- **Invariants:** Khóa world mới đến các dòng domain rồi validate/commit. Giá/quantity/outcome do server tính. RLS chỉ đọc kho theo scope; idempotency gắn actor/action/payload và lặp trả snapshot lúc commit.
- **Scope:** SQL migrations + RLS + SQL unit/concurrency tests.
- **Out-of-scope:** UI cửa hàng React.
- **Acceptance criteria:** Hai transaction đồng thời mua món vượt quá số dư chỉ 1 thắng, người còn lại nhận `INSUFFICIENT_FUNDS`.
- **Test cases:** SQL race hai writer với số dư vừa đủ, claim forage cùng điểm, replay khác payload, outsider, kho cũ còn nguyên sau migrate và tổng ledger đúng sau backfill.

#### `OLW-020-03`: Đồng bộ Hợp đồng `EconomyBackend` Trên `SupabaseBackend` & `DevLanBackend`
- **Milestone:** V0.2.0 | **Priority:** P0 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash
- **Mục tiêu:** Hiện thực hóa `EconomyBackend` cho cả `SupabaseBackend` (gọi RPC `OLW-020-02`), `DevLanBackend` (giữ file `.dev-lan-state.json` tương đương atomic/ledger/idempotency) và bộ contract test chạy chung.
- **Dependencies:** `OLW-020-02`.
- **Relevant files:** `src/lib/backend/types.ts`, `src/lib/backend/supabaseBackend.ts`, `src/lib/backend/devLanBackend.ts`, `scripts/devLanServerPlugin.mjs`, `tests/server/`.
- **Relevant source references:** [INTEGRATION_PLAN.md §1.B](research/INTEGRATION_PLAN.md).
- **API contract:** `world.economy.transact(worldId, action, payload, key)` và `getWalletAndLedger(worldId)`. Chỉ trả trang ledger đã lọc quyền, snapshot và code lỗi có cấu trúc.
- **Data model:** Khớp kiểu `EconomySnapshot` trên mọi adapter.
- **Invariants:** Không phá hợp đồng V0.1 cũ của `WorldBackend`; lỗi trả về đúng mã `INSUFFICIENT_FUNDS` / `STOCK_EXCEEDED` tiếng Việt.
- **Scope:** Adapter methods + Vitest contract suite.
- **Out-of-scope:** UI shop phức tạp.
- **Acceptance criteria:** Bộ contract test chung trên Dev LAN. LocalPreview kiểm tra unsupported hoặc chạy cùng contract nếu hỗ trợ feature. Supabase có mapping test và assertions thật ở Cloud Test trước nghiệm thu.
- **Test cases:** Dev LAN atomic/retry, reload và thông báo ví mới cho 2 tab; adapter Supabase serialize và map lỗi đúng; test SQL riêng khi có Test DB.

#### `OLW-020-04`: Economy Simulator Độc lập (`src/shared/economy/sim/` & `scripts/economy-sim.ts`)
- **Milestone:** V0.2.0 | **Priority:** P1 | **Risk:** Medium | **Recommended agent:** DeepSeek V4.1 Flash (Neon review báo cáo)
- **Mục tiêu:** Port kiến trúc runner của `webfarmville@c420bc2:scripts/balance-sim.ts` xây bộ simulator thuần TS mô phỏng `7`, `30`, `90`, `180` ngày cho đủ `7` personas, kiểm tra invariants tự động.
- **Dependencies:** `OLW-020-01`.
- **Relevant files:** `src/shared/economy/sim/`, `scripts/economy-sim.ts`, `tests/unit/economySim.test.ts`, `THIRD_PARTY_NOTICES.md`.
- **Relevant source references:** [ECONOMY_SIMULATOR_SPEC.md §1](economy/ECONOMY_SIMULATOR_SPEC.md), `webfarmville@c420bc2:scripts/balance-sim.ts`.
- **API contract:** `npm run economy:sim` in báo cáo net income, nguồn/đích xu, dominant strategy ratio và check deadlock.
- **Data model:** Seeded PRNG (`mulberry32`) + State thuần không đụng DOM/Phaser.
- **Invariants:** Test fail CI ngay nếu bất kỳ persona nào kẹt ở 0 xu (`deadlock`), tìm thấy arbitrage, hay 1 nghề lãi vượt trần `2.2×`.
- **Scope:** Simulator headless + báo cáo JSON/console + regression test Vitest.
- **Out-of-scope:** Đẩy số liệu simulator lên Supabase.
- **Acceptance criteria:** Chạy ít nhất 1.000 phiên trên seed cố định, đủ 7 persona và bốn mốc, báo findings và thời gian chạy đã đo. Profile V0.2.0 phải pass đường ví trống mà không cần cá/nấu. Regressions từng config fail với seed tái lập.
- **Test cases:** Ví trống, 30 ngày offline không thuế, chu trình mua/chế biến/bán có lỗi, phát hiện tăng tài nguyên vô hạn, so solo/co-op và xu/phút của chiến lược tập trung.

#### `OLW-020-05`: NPC Bác Hai Mùa, Thùng Giao Hàng (Shipping Bin 24/7) & Ví Chung HUD
- **Milestone:** V0.2.0 | **Priority:** P0 | **Risk:** Low | **Recommended agent:** DeepSeek V4.1 Flash
- **Mục tiêu:** Hiển thị số dư ví chung gọn nhẹ ở HUD (ẩn bớt khi đang ở chế độ Học im lặng), thêm Thùng Giao Hàng cạnh cổng và NPC Bác Hai Mùa bán hạt giống/mua nông sản theo giờ mở cửa.
- **Dependencies:** `OLW-020-03`.
- **Relevant files:** `src/features/economy/`, `src/features/home/TopStatusBar.tsx`, `src/game/scenes/WorldScene.ts`.
- **Relevant source references:** [NPC_DESIGN.md](gameplay/NPC_DESIGN.md), [MARKET_AND_NPC.md](economy/MARKET_AND_NPC.md).
- **API contract:** Gọi `world.economy.transact(...)` với optimistic UI có rollback khi lỗi `CONFLICT`/`INSUFFICIENT_FUNDS`.
- **Data model:** Đọc `ITEM_CATALOG` + `world_wallet`.
- **Invariants:** UI mobile `430×932` không tràn ngang, Shipping Bin nhận đồ 24/7 tránh lệch múi giờ; bán `wild_herb` giải cứu ví = `0`.
- **Scope:** HUD ví + Drawer Shipping Bin & Bác Hai Mùa. Đặt tối thiểu 2 điểm hái thảo mộc gần cổng, dùng cùng action/ledger OLW-020-02. Hạt cứu trợ mở khi farming đã có ở V0.2.1.
- **Out-of-scope:** Bảng đơn hàng 3 slot (`V0.2.5`), nấu ăn (`V0.3`).
- **Acceptance criteria:** Hai máy thấy cùng ví. Một người online, ví và kho trống, hái rồi bán đủ mua hạt trong <10 phút chơi. NPC có thể đóng cửa mà Shipping Bin vẫn bán được.
- **Test cases:** E2E mua/bán và reload; bắt đầu ví trống, hết hạn điểm hái và hai người cùng hái một điểm. Assert B không thể thu tiền hai lần khi retry.

#### `OLW-020-06`: Bổ sung Lệnh Tiền tệ & Kho Đồ vào Dev Console (`dev-migrations`)
- **Milestone:** V0.2.0 | **Priority:** P1 | **Risk:** Low | **Recommended agent:** DeepSeek V4.1 Flash (Neon review SQL)
- **Mục tiêu:** Thêm vào Dev Console (`V0.1.5`): `Set/Add/Remove Coins`, `Spawn/Clear Item`, xem `economy_ledger` nhanh trong môi trường dev/test.
- **Dependencies:** `OLW-015-08`, `OLW-020-02`.
- **Relevant files:** `src/features/devConsole/`, `supabase/dev-migrations/`, `scripts/devLanServerPlugin.mjs`.
- **Relevant source references:** [DEV_TOOLS.md §2](DEV_TOOLS.md).
- **API contract:** `dev_grant_currency_or_item` chỉ trên Test với role đã xác thực trong dev_admins và thế giới is_test, hoặc Dev LAN.
- **Data model:** Ghi chú rõ `reason = 'dev_cheat'` trong `economy_ledger`.
- **Invariants:** 100% bị chặn khỏi bản production bởi `verify-prod-guard.mjs` & không tồn tại trong project Supabase Prod.
- **Scope:** Chỉ bổ sung lệnh của `V0.2.0`.
- **Out-of-scope:** Lệnh ép cây/cá (`V0.2.1/V0.2.2`).
- **Acceptance criteria:** Test DB và Dev LAN cho kết quả đúng, âm bị chặn, ledger ghi dev_cheat và production không có endpoint.
- **Test cases:** SQL test từ chối non-admin + `verify-prod-guard.mjs` pass.

---

### Quy ước dùng chung cho các task V0.1.5–V0.2.0

- Giữ nguyên API V0.1 của `WorldBackend`. Tính năng theo miền chỉ expose trên backend có hỗ trợ. `LocalPreviewBackend` có thể báo không hỗ trợ tính năng mới. Dev LAN dùng hợp đồng tương đương Supabase. Mock RPC kiểm tra client mapping và SQL suite kiểm tra quyền/transaction thật.
- RPC kiểm tra membership trước khi đọc kết quả cũ, luôn khóa theo thứ tự world → domain row. Idempotency record có key theo world, actor, action, hash request và kết quả. Dùng bảng nội bộ không cấp SELECT cho client cho các kết quả có dữ liệu riêng, vì `mutation_idempotency` V0.1 cho thành viên đọc và dành cho nội thất. Retry giống hệt trả bản đã commit; key dùng lại khác request trả conflict. Broadcast dùng để báo refresh/version.
- AuthA/AuthB/AuthC là fixture Test. Test write/read của người thứ ba, dữ liệu riêng trong shared snapshots/replay, và race bằng hai kết nối. Lỗi từ backend được map thành câu tiếng Việt ở UI.
- Đọc [tiêu chí nghiệm thu](MILESTONE_ACCEPTANCE.md) trước khi đánh dấu task hoặc milestone đạt. Task future là kế hoạch theo [lộ trình](MASTER_ROADMAP.md).

## Phần B — Danh mục Epic Cho `V0.2.1 → V1.0` *(Phân rã chi tiết khi tới milestone)*

| Epic ID | Milestone | Mục tiêu & Nội dung Chính | Phụ thuộc | Rủi ro Chính | Agent Đề xuất |
|---|---|---|---|---|---|
| **`EPIC-021`** | **V0.2.1 — Farming** | Luống đất, tưới nước, chất lượng nông sản, hoa lai 8 hướng (`webfarmville/blooms.ts`), bó hoa tặng, cây ăn quả & Kỷ niệm, Cô Mai Hoa | `V0.2.0` | Lệch timezone/chống chết offline | DeepSeek (domain) + Neon (SQL plot lock) |
| **`EPIC-022`** | **V0.2.2 — Fishing** | Ao cá Demo E, mini-game kéo thanh 1 ngón (`greens` logic viết mới), 3 bậc hiếm, mồi `0c`/cao cấp, cần câu nâng cấp, bể cá, Chú Tư Cần | `V0.2.0`, Ao Demo E | Độ nhạy touch iPhone Safari & chống click siêu tốc | DeepSeek (FSM + UI) + Neon (RPC RNG) |
| **`EPIC-023`** | **V0.2.3 — Intelligent Pet** | Full 8 needs, 9 emotions, 7 traits, 24 memories, Utility AI + Affordances thích nghi dời đồ, **Sim-Host Election (K3)**, Pet Brain Debugger | `V0.1.5`, `V0.2.0` | Lệch hành vi 2 client khi chuyển Sim Host | Neon (Sim-Host) + DeepSeek (Utility AI/Debugger) |
| **`EPIC-024`** | **V0.2.4 — Home Progression** | Cửa hàng nội thất 4 bộ (`Pastel/Modern/Cottage/Rustic`), Chú Mộc Lâm, nâng cấp công cụ & mở rộng phòng/nhà kính/hiên không mất đồ cũ | `V0.2.0–023` | Đồ đặt sát mép khi map đổi kích thước | DeepSeek + Neon (migration map expansion) |
| **`EPIC-025`** | **V0.2.5 — Co-op Gameplay** | Hạ tầng **K4**, **4 mini-game MVP** (Caro PvP thân thiện, Lật thẻ, Đoán ý, Mê cung bất đối xứng), NPC Order Board 3 slot (`webfarmville` pattern) | `V0.2.0` | Đồng bộ mê cung và thưởng co-op idempotent. Caro tự nguyện, chỉ kết quả trong ván, không cược hoặc mất tài sản | DeepSeek (reducers/UI) + Neon (K4 sync/RPC) |
| **`EPIC-030`** | **V0.3 — Shared Life** | **Cooking 3 chế độ** (sơ chế/nhiệt/cháy khét + Co-op + Order Nhà hàng), Nhật ký, Album private RLS, Lịch hẹn `Asia/Ho_Chi_Minh`, Wishlist, Picnic | `V0.2.1–025` | Quyền riêng tư ảnh Storage & UX chạm Cooking | Neon (Storage RLS + Cooking sync) + DeepSeek |
| **`EPIC-040`** | **V0.4 — Cinema** | Triển khai phương án thắng cuộc từ `S0-5b` (Tailscale Funnel Windowed HLS hoặc WebRTC TURN), nâng `ClockSync` + hysteresis, phụ đề VTT/SRT, Voice & Ducking tùy chọn | `V0.3` đóng và `S0-5b` có phương án Go trên iPhone | Băng thông upload nhà & Safari `AVAudioSession` | Neon / Codex (chủ công toàn phần Cinema) |
| **`EPIC-050`** | **V0.5 — Polish** | Ngày/đêm, thời tiết trang trí, audio môi trường mute-safe, tối ưu 60fps/RAM Safari, backup/restore toàn bộ dữ liệu nhà, kiểm thử iPhone toàn diện | `V0.1–V0.4` | Safari WebGL context loss khi giữ app lâu | Neon + DeepSeek (test suite) |
| **`EPIC-100`** | **V1.0+ — Our Island & AI** | Khu chợ, làng nhỏ, đảo và khám phá ở V1.0. Sau V1.0 mới xét thử HybridLlmBrain local, API chỉ nếu được duyệt riêng | `V0.5` ổn định | Chi phí/độ trễ LLM & bảo mật dữ liệu riêng | Neon + Chủ dự án phê duyệt mở rộng |
