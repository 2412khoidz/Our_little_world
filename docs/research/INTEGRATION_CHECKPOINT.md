# Grand Integration — Checkpoint

Ngày 25/11/2026 · `integration/night-merge` · **Tích hợp mã nguồn và kiểm chứng local xong. Database migration history còn chặn cổng SQL.**

## Mốc nguồn và commit

| Mốc | SHA kiểm trực tiếp |
| --- | --- |
| Baseline và `main` | `34f58c78d7c1755f61d8276d93967005e1bc4f45` |
| GPT foundation | `a8b2468ce7cd873ef81d35731e5a668002e95b8d` |
| Neon Grand handover | `0c23ad1033598e4ab2e32a2a5a72d0f425eb00ee` |
| DeepSeek final remediation | `3dfd32ce05206102f502e678510c4518a3ebc688` |

Cả ba worktree sạch ở preflight. Neon đã commit báo cáo Grand ở Phase 14, DeepSeek có xác nhận bàn giao của chủ dự án và HEAD khớp. Kiểm tra desktop chỉ thấy phiên Codex hiện tại cho dự án, cùng Vite và app harness đang mở. Hợp nhất các SHA đã chốt vào nhánh tích hợp trong thư mục chính, theo thứ tự `fdfee31` (Neon lên GPT) → `8095d59` (DeepSeek). `6ec1d34` bổ sung regression và bản vá SQL tiến. Ba nhánh nguồn và `main` giữ SHA trên.

- `App.tsx` giữ vòng đời ready/reconnect của GPT và refresh Inventory/Pet/Study/Mailbox, broadcast Couple của Neon. `WorldScene.ts` giữ camera, ambient motes, label, posture và map của Neon. Gói walk thường qua cùng gate 125 ms/2 px, idle/map/reconnect gửi snapshot và seq tăng, idle chủ động vẫn đồng bộ vị trí ngồi/nằm. Chỉ nhận vị trí của phiên Presence được chọn. Dev LAN giữ sửa lỗi stream cũ xóa phiên mới.
- E2E dùng tọa độ từ camera Neon và giữ regression ba session của GPT. Hợp nhất notices của cả hai nhánh. `npm run typecheck` dùng `tsc -b`. Atlas riêng, candidates và state Dev LAN hiện có nằm ngoài Git. Chạy QA với relay state riêng.
- Map logic giữ tile 16 px, nhà 16×12 và vườn 18×14. Map 64×64 và 96×96 vẫn ở sandbox. Giữ bản Demo E theo PD-01, chưa chốt biến thể mèo, UI hoặc cỡ map mới.

## Cổng SQL và bảo mật

**Blocker:** GPT `20261125000100_v01_security_hardening.sql` và Neon `20261125000100_v015_inventory_and_catalog.sql` cùng prefix. Workspace chưa liên kết database cần bảo toàn. Checkpoint nguồn chỉ xác nhận những lần chạy của agent, chưa có lịch sử chính thức từ database đích. Chưa đổi version file nào. Để tiếp tục cần lịch sử read-only của các DB cần giữ, hoặc xác nhận từ chủ dự án rằng không có DB đã áp hai version này. Khi có bằng chứng, cấp version duy nhất cho file chưa áp và xác minh lại bằng migration runner. Thứ tự mục tiêu là ba migration V0.1 → GPT hardening → Inventory → Pet → Study → Mailbox → inventory hardening → `20261125000600`. Giữ `supabase/dev-migrations/` ngoài lịch sử production.

- PostgreSQL 18.6 tạm chạy loopback với fixture `auth/realtime`. Đã chạy fresh install và upgrade bằng cách áp SQL theo thứ tự từng **tệp**, kiểm giữ hai thành viên, layout nội thất và kibble đã lưu. Cách này kiểm SQL thực và dữ liệu nâng cấp. Lịch sử theo timestamp của Supabase vẫn chờ xử lý.
- Reproduce lỗi debit với CHECK `23514` ở migration Neon `0500`. Migration bổ sung `20261125000600_v015_inventory_debit_and_mailbox_receipts.sql` ghi số dư dương hoặc xóa stack rỗng, giữ khóa world → inventory và giới hạn stack. Hai RPC hộp thư so actor, action và request trước khi trả receipt; digest resolve cả khi pgcrypto ở `extensions`. Receipt gửi cũ thiếu dữ liệu scope/surprise sẽ báo conflict khi retry. Không sửa hồi tố file nguồn.
- Cả hai database tạm pass `rls_and_pairing.sql`, `v01_security_hardening.sql`, `v015_inventory_security.sql` và `v015_inventory_debit_and_mailbox.sql` với fixture đầy đủ. Nhiều kết nối pass luồng tạo/đổi mã mời, hai người tranh slot cuối, replay nội thất, thêm vào SKU chưa tồn tại, và hai lượt cho mèo ăn chỉ trừ một phần. SQL mới kiểm gửi quà từ kho riêng, ẩn quà trước khi mở, retry một lần và chặn receipt của người khác.
- Supabase Test thật, PostgREST, Auth và private WebSocket còn **Pending Verification**. Các contract chưa nối như chất lượng kho, nước/bát thức ăn, chăm sóc vật lý và nhật ký riêng vẫn cần kiểm thử khi có backend tương ứng.

## Remediation và trạng thái gameplay

| Trạng thái | Phạm vi |
| --- | --- |
| **Verified Fixed, domain** | Regression tích hợp pass cho integer/overflow/replay, ledger kind và basis points, arbitrage theo lô và đường mua/craft, simulator policy/budget/recovery/oracle, timestamp và heat bucket nấu ăn, viewer projection và version CAS của mini-game. Giữ các sửa đổi DeepSeek. |
| **Verified contract, Pending Backend Integration** | Khóa nghiệp vụ và timestamp/RNG cho harvest, breeding, fishing và cooking. Server vẫn cần dùng các kiểm tra này cùng mutation và ledger trong transaction thật. Còn thiếu parity vectors TS/PostgreSQL, mapping catalog K5 ↔ Economy và migration quality. |
| **Hoạt động trong Dev LAN** | V0.1 pairing, Realtime, hai tài khoản/ba session, nhà/vườn, avatar, đặt/dời đồ. V0.1.5 Inventory, Pet MVP, Pomodoro/study, Couple, khung ảnh, Hộp thư và quà. |
| **Experimental** | Sandbox Pet Art, Pet Lab, 2 UI variants, World Expansion, Combined Experience với hotbar, J/K, cảm ứng, held item, feeding/water/petting, nhận nuôi, notebook và Shared Life nguyên mẫu. Giữ fixture `src/shared/petLiving/petPrimitivesAdapter.ts`. Primitives DeepSeek đã merge và có test, chưa thay adapter hoặc nối authoritative Advanced Pet vì cổng SQL còn chặn. |
| **Chưa triển khai production multiplayer** | Phần thưởng Farming/Fishing/Cooking, shipping, shop/order trên backend có authority, mini-game qua mạng và Advanced Pet authority. Caro, Othello, Memory, Battleship có trang hot-seat riêng. PvP không cấp thưởng. |

Production catalog giữ `7076075b`. Kết quả dominant strategy mới từ handover là A **2,15**, B **2,09**, C **2,13**, D **1,47**. Đây là các kết quả phân tích, không phải quyết định balance. Các số cũ trong review đã superseded. `carp_pond`, `herb_carp`, `sapling_peach`, saturation và luật Caro overline chờ chủ dự án.

## Kiểm chứng client và visual

- Lint, typecheck `tsc -b`, **453/453 Vitest trên 46 file**, public build, production guard, private build, Economy Simulator và Economy Experiments pass. Public build chứa 27.459 byte PNG atlas, private atlas 101.803 byte. Public/private PWA precache 27 mục, lần lượt 2.135,54 và 2.135,56 KiB. Private atlas vắng trong public dist và private Service Worker precache. Vite còn cảnh báo chunk lớn.
- Full Playwright không retry **15 pass, 1 skip**. Skip là bài ghi GIF desktop khi chạy project mobile. Smoke test trình duyệt thêm cho bốn mini-game hot-seat xác nhận thao tác và màn che Battleship khi chuyển lượt. Đây là Chromium, chưa phải iPhone Safari/PWA hoặc Android thật.
- Bằng chứng local, ngoài Git, tại `test-results/integration-night/{main,showcase,living-home}/`. Game chính có nhà, vườn, trang trí và Tủ đồ ở desktop 1280×720/1440×900, mobile 430×932 và 844×390. Thư mục showcase có ảnh biến thể mèo/UI, expansion, Pet Lab, Notebook và 2 GIF (12/9 khung) cho locomotion/wake và feeding/play. Ở ảnh desktop nhà, nhãn hai avatar có thể chồng nhau khi đứng sát. Camera landscape chỉ hiển thị vùng quanh nhân vật theo follow hiện tại. Visual trên máy thật và quyết định thẩm mỹ còn chờ.

## Chạy thử và resume

Trong worktree chính chạy `npm run dev -- --host 127.0.0.1 --port 4184 --strictPort` khi server chưa chạy. Dùng state riêng qua `OLW_DEV_LAN_STATE_FILE` khi seed Dev LAN. URL local đã mở ở `http://127.0.0.1:4184/`. Thêm `?pet-art=1`, `?pet-lab=1`, `?ui-sandbox=1`, `?world-sandbox=1`, `?experience-demo=1` hoặc mở `/minigames.html`. Bản Demo E riêng chỉ dùng trong môi trường đã cấp quyền.

- Game chính hỗ trợ chạm tới ô, WASD/phím mũi tên và các thao tác HUD. Kiểm hai context Mây/Nắng, di chuyển qua cổng, đổi avatar, đặt/dời đồ, gửi quà và Pomodoro.
- Combined Experience dùng WASD hoặc D-pad, J tương tác, K đặt/dùng đồ, 1–8 chọn slot. Thử chọn thức ăn → lại gần mèo → cho ăn trong sandbox, quan sát phản ứng và hộp thoại. Tiếp tục với Pet Lab và mini-game hot-seat.
- Bước resume đầu tiên là giải quyết history/prefix trước khi áp file vào bất kỳ database cần bảo toàn nào. Sau quality gate, tiếp tục adapter Pet thật và physical care dùng Inventory cùng transaction idempotent. Chi phí bổ sung 0₫.
