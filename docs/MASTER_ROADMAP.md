# Our Little World — Master Roadmap V3 (Reconciled Source of Truth)

*Cập nhật: 27/11/2026 | Canonical Branch: `main` (`e5de4ac`) | Release Tag: `v0.2.5` + Accepted Hotfixes (`5de7317`)*
*Kiến trúc vận hành hiện tại: **Windows-hosted Dev LAN + Cloudflare Quick Tunnel** (`npm run host:couple`, chi phí bổ sung `0₫`). Tài liệu này là lộ trình tổng thể chuẩn duy nhất; lịch sử V0.1/V0.2 cũ được giữ tham chiếu tại [PROGRESS.md](PROGRESS.md), [DECISIONS.md](DECISIONS.md) và [V02_ROADMAP.md](V02_ROADMAP.md).*

---

## 1. Quy ước Trạng thái (Status Definitions)

Tách bạch **mức độ hoàn thiện mã nguồn** với **nghiệm thu của chủ dự án**:

- **`OWNER APPROVED`**: Đã triển khai trong canonical `main`, đã được chủ dự án playtest & phê duyệt.
- **`IMPLEMENTED`**: Code, UI và wiring đã có trên `main`; chưa có vòng playtest phê duyệt riêng cho hạng mục đó hoặc còn chờ test thiết bị thật.
- **`PARTIALLY IMPLEMENTED`**: Đã có domain thuần hoặc bản prototype Dev-only / UI rời; còn thiếu nối end-to-end hoặc nội dung.
- **`IN PROGRESS`**: Đang phát triển tích cực trên worktree/nhánh riêng, chưa gộp `main`.
- **`PLANNED`**: Đã chốt phạm vi trong lộ trình V3, sẵn sàng tách worktree khi đạt dependency.
- **`DEFERRED`**: Tạm hoãn có chủ đích (hạ tầng cloud, DB luôn bật, dịch vụ trả phí) — **không chặn** phát triển gameplay local.
- **`BLOCKED`**: Chưa thể triển khai cho tới khi hoàn tất benchmark hoặc điều kiện phụ thuộc.
- **`UNVERIFIED`**: Chưa xác minh trên thiết bị thật (iPhone Safari + 4G/5G) hoặc hạ tầng thật (Supabase Cloud / SQL).

---

## 2. Kiểm toán Thực trạng Sản phẩm trên Canonical `main` (`e5de4ac`)

Nhiều hệ thống V0.1.5, V0.2 và V0.3 đã được triển khai vượt xa thứ tự milestone cũ. Bảng dưới đây phản ánh **thực tế mã nguồn** tại `e5de4ac`:

| Hệ thống | Trạng thái Hiện tại | Đã có & Nguồn Donor/Code | Còn thiếu / Lỗi đã biết / Chưa kiểm | Độ ưu tiên & Độc lập Worktree |
|---|---|---|---|---|
| **Core World `16×16` (6 khu vực + 4 shop interiors)** | `OWNER APPROVED` | `home`, `garden`, `village`, `farm`, `beach`, `forest`, `shop*` (`Cabacos@79e423d`, `Hollowmere@a7a8e5a`, `Tuxemon@4e63c45`, `Sprout/Demo E`), va chạm, cửa, thang, `WorldLightingOverlay`, NPCs | Nội thất `shop_*` vẫn dùng Sunnyside pre-rendered plate (tinh chỉnh đồng nhất ở V0.5); 2 Vitest Canvas 2D donor cũ fail dưới `jsdom` | Nền dùng chung — sửa qua worktree riêng + pass `worldReconstructionGraph` |
| **Avatar Cozy Human V2, Nuvora Inventory & Custom Audio** | `OWNER APPROVED` | PyDew/Modern Interiors `avatars.png`, `private-unified/` (10 file), Nuvora Inventory + `CatalogPropsIcon`, 5 track riêng tư `private-audio/` + SFX MIT/CC0 | Không có hồi quy mở; asset private giữ cục bộ (`.gitignore`) cho tới khi chốt bản quyền phân phối | Bảo toàn tuyệt đối qua `assets:private:verify` |
| **Multiplayer `NET.1.1` (WS + Remote Onboarding)** | `OWNER APPROVED` *(9/11 real-device NET.1.1 pass; bản gộp RC1 chờ Safari lại)* | `devLanWsHub.mjs`, `olwRemoteShare.mjs` (`/__share/<token>` auto-join `Nắng`, cookie HMAC, khóa Host route `403`), `devLanRealtimeClient.ts`, `RemoteMotionInterpolator`, `NetworkDiagnosticsOverlay` | `UNVERIFIED` cho tổ hợp đầy đủ `v0.2.5` trên iPhone Safari thật qua Quick Tunnel & đổi Wi-Fi↔5G | Chỉnh ở `App.tsx`/`devLanServerPlugin.mjs` cần kiểm chéo Farming & Billiards |
| **Deep Farming & Economy (`Checkpoints A–G`)** | `OWNER APPROVED` *(kèm hotfix collision 3 cây `5de7317`)* | 267 canonical SKUs, 40 crops (`greens`), 20 flowers + lai 8 hướng (`webfarmville`), 12 orchard trees (`refreshBlockedGrid` đã khóa gốc cây), 7 livestock + 84 recipes + 8 workshops (`harvest-hollow`), 3-slot Order Board, fishing (`chill`/`tension` + `fish_minnow`), `farming/*.png` atlases | `UNVERIFIED` 2 migration SQL (`20261127000100..200`) trên Postgres/Supabase Cloud thật; cần thêm polish discoverability & hướng dẫn UX nhẹ nhàng | Cao (V0.2.x) — worktree riêng được nếu không đè `App.tsx` |
| **Living Pet (`Quýt` 2D + Vuena 3D Pet Care V2)** | `OWNER APPROVED` *(kèm hotfix chặn tap mở nhầm `5de7317`)* | `Quýt` 32×32 avoid obstacles/plots, `vuena-cat.glb` (CC0), 8 real cat vocalizations, quality presets, `SharedPetCareSession` 2P, chạm mèo không còn mở nhầm khi làm vườn (`J`/nút ngữ cảnh + farm plot priority) | `UNVERIFIED` WebGL2 dài hơi (`OLW_ACCEPTANCE_LONG=1`) & iPhone Safari thật; `SawyerHood/nintendogs-threejs` thiếu LICENSE file gốc (chỉ lưu ý nếu public thương mại) | Trung bình (V0.2.x) — độc lập cao |
| **Billiards V2** | `OWNER APPROVED` | `BilliardsModal.tsx`, fixed-timestep `physicsEngine.ts` (`1/480s`), `protocol.ts`, NET.1 `minigame_event`, lazy-load + `cmd:set-render-suspended`, `20261126000100_v02_billiards_minigame.sql` | Chờ nâng cấp lên Billiards V3 & 3D (`feat/billiards-v3`); SQL chưa chạy trên Cloud thật | Đã hoàn thành baseline V2 |
| **Billiards V3 & 3D Transplant** | `IN PROGRESS` | Worktree `C:\Users\admin\Downloads\OLW-Billiards-V3` (nhánh `feat/billiards-v3`): đang phát triển menu vào chế độ, Local 2P, Bot AI (`botAi.ts`), Online Lobby (`BilliardsOnlineLobby.tsx`, `lobbyProtocol.ts`), bàn phím desktop (`useBilliardsKeyboard.ts`), ghép `physics3dEngine.ts` từ gói 3D chủ dự án cung cấp (`our_little_billiards_3d_*`) | Chưa hoàn tất tích hợp UI/3D render & chưa reconcile lên `origin/main` (`e5de4ac`); **chưa** kiểm chứng playtest của chủ dự án | **P0 ngay lập tức (`V0.2.x`)** — hoàn tất trong `OLW-Billiards-V3` rồi mới merge |
| **Couple Interactions (`P0` vs `P1`)** | `OWNER APPROVED` (P0) / `PARTIALLY IMPLEMENTED` (P1) | P0 `hold_hands` + `hug` + `CoupleEmoteDock` + posture `sit_sofa`/`sit_bench`/`lie_bed`/`sit_study` (`promenad` FABRIK, `embrace` pixel rig). P1 (`kiss`, `lean_shoulder`, `dance`, `give_flower`) đã có schema trong `coupleTypes.ts` (`COUPLE_P1_ENABLED = false`) | Chưa có sprite/animation frames & pose pairing cho `kiss` (và P1 khác), chưa bật flag `COUPLE_P1_ENABLED` | Cao (`V0.2.x`) — tách worktree riêng |
| **Study Room & Pomodoro** | `IMPLEMENTED` *(chưa nghiệm thu riêng V0.3)* | `PomodoroPanel.tsx`, `src/shared/study/pomodoro.ts` (MIT `cocoworking`), `ambientAudio.ts` (tắt sạch AudioContext theo phản hồi owner), nút trong `MenuModal` | Chưa có playtest chuyên sâu dài phiên 2 người cho V0.3 Shared Life | Trung bình (`V0.3`) — độc lập cao |
| **Mailbox & Secret Gifts** | `IMPLEMENTED` *(Dev LAN)* | `MailboxModal.tsx`, `mailboxRules.ts` (`ownerScope` quà riêng tư trước khi mở), nút trong `MenuModal` | Mở rộng thiệp kỷ niệm / đính kèm quà nông trại & hoa ở V0.3 | Trung bình (`V0.3`) |
| **Scrapbook Photo Album** | `IMPLEMENTED` *(Local preview / Dev LAN)* | `ScrapbookAlbumModal.tsx` (`react-pageflip`), `scrapbookAlbumStorage.ts`, giới hạn upload `5MB` trong `sharedLifeTypes.ts` | Ảnh lưu cục bộ/Dev LAN; cloud private storage bucket hoãn cùng hạ tầng Cloud | Trung bình (`V0.3`) |
| **Cooking (`src/shared/cooking/`)** | `PARTIALLY IMPLEMENTED` | Domain `cookingMachine.ts`, `recipes.ts` clean-room hoàn chỉnh với 3 chế độ & rủi ro cháy | Chưa có UI bếp tương tác, chưa nối nguyên liệu chung từ Deep Farming / Workshop & chưa mở trong game chính | Cao (`V0.3`) — tách worktree riêng |
| **Shared Journal, Wishlist, Date Calendar & Picnic** | `PARTIALLY IMPLEMENTED` | Kiểu dữ liệu `sharedLifeTypes.ts` + màn hình mẫu Dev-only `V03PrototypesModal.tsx` | Thiếu persistence Dev LAN (`devLanSharedLifeHandlers.mjs` cần nối thật), thiếu UI chính thức & điểm picnic ngoài trời | Trung bình (`V0.3`) — độc lập cao |
| **Furniture Shop & Home Progression** | `PARTIALLY IMPLEMENTED` | `DecorateDrawer.tsx`, `decorateInteriorPolicy.ts`, 12+ món starter, atomic footprint grid `placement.ts` | Chưa có shop nội thất 4 phong cách, chưa có nâng cấp/mở rộng phòng (`kitchen`, `bedroom`, `study`, `greenhouse`), chưa có cơ chế bảo toàn vị trí đồ khi nâng cấp map | Cao (`V0.2.4`) — cần cẩn thận `maps.ts` & `placement.ts` |
| **Mini-games (`Caro`, `Othello`, `Battleship`, `Memory`)** | `PARTIALLY IMPLEMENTED` | Pure reducers & privacy helpers (`src/shared/minigames/`), React UIs (`CaroGame`, `OthelloGame`, `BattleshipGame`, `MemoryGame`) | Chưa nối WS `minigame_event` realtime 2 người và chưa mở lại trên `MenuModal.tsx` | Trung bình (`V0.4`) — tái sử dụng pattern `Billiards` |
| **Cinema & VPN-less Media Sync (`V0.4`)** | `PARTIALLY IMPLEMENTED` / `BLOCKED` *(chờ S0-5b)* | `src/shared/cinemaSync.ts`, `SpikeLabModal.tsx` (Dev-only PoC `<video playsInline>`), `/spike/sample-cozy-sync.mp4` | Chưa chạy benchmark `S0-5b` (Tailscale Funnel HLS vs WebRTC TURN 0₫) từ Windows host tới iPhone 4G không cài VPN; chưa có Movie Room UI, chọn phụ đề/audio track | `BLOCKED` bước player chính cho tới khi `S0-5b` PASS trên iPhone Safari |
| **Supabase Cloud, RLS SQL Migrations & Hosting 24/7** | `DEFERRED` / `UNVERIFIED` | `supabase/migrations/20261124000100..20261127000200` (27 files), `supabaseBackend.ts`, `supabase/tests/` | Chưa chạy Postgres/RLS thật trên Supabase Cloud; không chặn phát triển Dev LAN hiện tại | `DEFERRED` theo quyết định chủ dự án |

---

## 3. Lộ trình Tái cấu trúc Chính thức (V3 Sequence)

> Lưu ý đánh số: Vì phiên bản phát hành `v0.2.5` đã hợp nhất sẵn Deep Farming, Economy, Livestock, Living Pet & Billiards V2 từ nhánh thử nghiệm, giai đoạn tiếp theo bắt đầu từ **`V0.2.x`** để hoàn thiện nền tảng chơi hiện tại, sau đó tiến tới **`V0.2.4` → `V0.3` → `V0.4` → `V0.5` → `V1.0`**.

| Milestone | Mục tiêu Cốt lõi | Phạm vi Thành phần | Phụ thuộc Chính | Tiêu chí Nghiệm thu Chủ dự án | Trạng thái |
|---|---|---|---|---|---|
| **`V0.2.x` — Gameplay Foundation Polish** | Hoàn tất các tính năng nền tảng đang dang dở & tương tác cặp đôi tự nhiên | 1) **Billiards V3 + 3D** (Local 2P, Bot, Online Ready Lobby, Desktop keyboard, 3D board/cue)<br>2) **Couple P1 Animations** (`kiss`, `lean_shoulder`, `dance`, `give_flower`)<br>3) **Farming / Fishing / Pet polish** + discoverability & nút ngữ cảnh rõ ràng | Baseline `main` (`e5de4ac`) + hoàn tất merge `feat/billiards-v3` | Chủ dự án chơi trọn ván Billiards 3D (Bot, Local 2P, Online Ready), duyệt animation Hôn/Nắm tay/Ôm, không còn kẹt va chạm hay nhầm nút | `IN PROGRESS` |
| **`V0.2.4` — Home Progression & Interior Expansion** | Dùng kinh tế nông trại để mua sắm & mở rộng không gian sống cho cặp đôi | Shop nội thất (`Pastel`, `Modern`, `Cottage`, `Rustic`), nâng cấp mở rộng phòng (`bedroom`, `kitchen`, `study`, `greenhouse`, hiên vườn), **bảo toàn 100% nội thất cũ & `.dev-lan-state.json`** | `V0.2.x` ổn định, tái sử dụng `walletCoins` & `catalog.ts` | Nâng cấp nhà & đặt đồ mới mượt; đồ cũ tự giữ hoặc thu hồi an toàn về kho, không mất save | `PLANNED` |
| **`V0.3` — Shared Life** | Biến ngôi nhà thành không gian sống & kỷ niệm mỗi ngày | 1) **Interactive Cooking UI** (`src/shared/cooking/`) nối nguyên liệu nông trại & ăn chung<br>2) Nối thật **Nhật ký, Wishlist, Lịch kỷ niệm & Picnic** (Dev LAN persistence, thay thế `V03PrototypesModal`)<br>3) Nâng cấp **Pomodoro + Mailbox + Album ảnh** gắn ngữ cảnh | `V0.2.4` (góc bếp & bàn ăn) cho Cooking; `SharedLife` độc lập theo worktree | Cặp đôi nấu ăn co-op từ nguyên liệu tự trồng, viết nhật ký/lịch hẹn/album ảnh và lưu bền qua reload | `PLANNED` |
| **`V0.4` — Cinema & Shared Entertainment** | Xem phim chung từ Windows sang iPhone không VPN & hoàn thiện mini-game co-op | 1) Chốt benchmark **`S0-5b`** (Windows → iPhone 4G Safari, 0₫, không app VPN)<br>2) Rạp phim trong nhà đồng bộ Play/Pause/Seek, reconnect, chọn **phụ đề `.vtt/.srt` & audio track**<br>3) Nối **Caro, Othello, Battleship, Memory** lên WS `minigame_event` | `S0-5b` PASS trên iPhone thật trước khi code UI rạp phim; mini-game độc lập | Xem trọn 1 bộ phim `>= 60 phút` Windows → iPhone Safari 4G mượt, lệch đồng bộ thấp, chuyển Wi-Fi↔5G nối lại được; 4 mini-game chơi 2 máy | `PLANNED` *(Cinema player `BLOCKED` tới khi `S0-5b` Go)* |
| **`V0.5` — Quality & Living World** | Nâng tầm đồng bộ mỹ thuật, âm thanh, hiệu năng & an toàn dữ liệu | Đồng bộ mỹ thuật các shop Cabacos (`shop_*`), chiều sâu NPC theo lịch/thời tiết, âm thanh môi trường theo vùng/giờ, tối ưu FPS/pin Safari PWA, công cụ **sao lưu & khôi phục save (`.dev-lan-state.json` export/import)**, test ổn định phiên dài | `V0.2.4–V0.4` | Chơi phiên dài 30–60p trên iPhone Safari không rò rỉ RAM/mất WebGL; backup/restore world 1 chạm | `PLANNED` |
| **`V1.0` — Our Island** | Thế giới mở rộng cho cặp đôi khám phá lâu dài | Mở rộng làng, tiệm mới & interiors, hoạt động bãi biển & rừng sâu, sự kiện theo mùa/kỷ niệm, tiến trình đảo chung | `V0.5` ổn định sau playtest thực tế | Cặp đôi khám phá trơn tru trên iPhone & Windows, chi phí `0₫` | `PLANNED` |
| **`Deferred Infra` — Cloud / Production Scale** | Vận hành 24/7 trên cloud khi thực sự có nhu cầu | Áp 27 SQL migrations lên Supabase Cloud thật, RLS verify, Cloudflare Pages HTTPS, Auth prod (`PD-08`), private asset CDN licensing | Quyết định riêng của chủ dự án | Đạt đủ SQL assertions + Auth + Hosting 0₫ | `DEFERRED` |

---

## 4. Nguyên tắc Vận hành Tài liệu

- **Tách riêng backlog hành động:** Xem 10 nhiệm vụ kế tiếp chi tiết (worktree, overlap, song song/tuần tự, donor sẵn có) tại [NEXT_MISSIONS.md](NEXT_MISSIONS.md).
- **Bảo toàn lịch sử:** Các quyết định nền tảng `ADR-001..010` và `PD-01..08` trong [DECISIONS.md](DECISIONS.md) vẫn có hiệu lực cho nguyên tắc `0₫`, `pixelArt`, `atomic occupancy`, `Dev-only` isolation và `zero-config` cho người thương.
