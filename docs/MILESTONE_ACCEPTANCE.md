# Tiêu chí Nghiệm thu Theo Milestone (`MILESTONE_ACCEPTANCE`)

*Quy tắc trung thực: Không bao giờ đánh dấu đạt **V0.1** chỉ dựa trên Dev LAN và Playwright Desktop. Mọi mục cần thiết bị thật hoặc tài khoản người dùng ghi rõ `Pending Manual Verification`.*

---

## 1. Bảng Nghiệm thu Bắt buộc Cho `V0.1 — Foundation` (`18` Cổng Kiểm chứng)

| # | Hạng mục nghiệm thu (Đề bài 6.4) | Trạng thái hiện tại (`25/11/2026`) | Ghi chú trung thực |
|---|---|---|---|
| 1 | Artwork chính thức (Demo E) được người dùng duyệt | **ĐÃ DUYỆT** | Người dùng chốt Demo E + avatar Modern Interiors + ngân sách `0₫` |
| 2 | License và asset pipeline rõ ràng | **Đặc tả có · Chờ quyền ship** | Ghi bằng chứng quyền Web/PWA cho từng asset trong dist và Service Worker theo PD-01. Asset chưa rõ quyền dùng fallback CC0. |
| 3 | **Artwork Demo E được tích hợp vào game chính V0.1** | **`Pending Implementation`** | Game chính V0.1 vẫn đang dùng starter CC0; cần làm theo `OLW-010-01..03` (gồm sửa sàn/đường/cỏ/pet/camera) |
| 4 | Windows và Android multiplayer | **Một phần (Dev LAN)** | Đã pass logic & hướng dẫn; cần test lại bản nối Supabase & artwork mới trên K70E thật |
| 5 | **Supabase thật** (Migrations + Auth + DB) | **`Pending Manual Verification`** | Đã viết 3 migrations + SQL tests; **chưa chạy trên Supabase Cloud project thật** |
| 6 | **Authentication** (Email/Password thật) | **`Pending Manual Verification`** | Có `SupabaseBackend`. PD-08 ưu tiên tài khoản tạo sẵn và tắt đăng ký công khai. Chờ thử đăng nhập, duy trì phiên và quy trình khôi phục an toàn. |
| 7 | **RLS** (Row Level Security + Private Realtime) | **Viết SQL / `Pending Cloud Verify`** | Có `supabase/tests/rls_and_pairing.sql`; chưa chạy ở Cloud Test; cần test người ngoài đọc/ghi và đăng ký private channel độc lập với token đã dùng |
| 8 | **Remote HTTPS** (host static theo PD-02) | **`Pending Implementation`** | Chưa deploy. Cloudflare Pages Free là ưu tiên đã duyệt ở PD-02 |
| 9 | **iPhone 16 Pro Max Safari thật** (Touch, 100dvh, PWA Add to Home Screen) | **`Pending Manual Verification`** | Mới giả lập viewport `430×932` trên Playwright Chromium; chưa test iOS Safari thật |
| 10 | Persistence (Reload giữ nguyên đồ & avatar) | Pass Local/DevLAN E2E · Chờ Cloud Verify | Cần xác minh thêm trên Supabase Cloud |
| 11 | Refresh / Reload giữa phiên chơi | Pass Local/DevLAN E2E · Chờ Safari Verify | Cần test WebGL + session reload trên iPhone Safari thật |
| 12 | Reconnect (Mất mạng / khóa màn hình / đổi Wi-Fi ↔ 4G) | Có logic lifecycle · `Pending Manual Verification` | Bắt buộc kiểm thử khóa màn hình iPhone & chuyển Wi-Fi ↔ 4G thật |
| 13 | Concurrent furniture placement (`FOR UPDATE` + tiles) | Pass kiểm tra occupancy local · Chờ race Cloud | Bài E2E kiểm tra đặt tuần tự. Bổ sung 2 writer đồng thời trên Cloud Test và xác minh rollback |
| 14 | Membership limit (Cứng 2 người + 1 user đa thiết bị, chặn người thứ 3) | Pass luồng Dev LAN · Chờ Cloud SQL | E2E thử mã mời đã dùng. Test C riêng ở Cloud để kiểm membership, read/write và private channel |
| 15 | Production guard (`verify-prod-guard.mjs`) | **ĐÃ ĐẠT** | `0` dev/LAN/`art-demo` leaks trong `dist/assets/*.js` |
| 16 | Unit tests (`npm run test`) | **ĐÃ ĐẠT** | Vitest `6 files, 24/24 tests pass` |
| 17 | Server tests (`tests/server/devLanServer.test.ts` + SQL assertions) | Pass Node Server · Chờ Postgres SQL | Node server pass local. SQL chờ Cloud Test và đủ fixture, không tính skip là pass |
| 18 | E2E tests (`npm run test:e2e`) | **ĐÃ ĐẠT (Chromium)** | Takeover chạy lại `8/8 tests pass` (Desktop + `430×932` Dev LAN SSE) |

---

## 2. Tiêu chí Thoát Nhanh Cho Các Milestone Tiếp Theo (`V0.1.5 → V1.0`)

- **`V0.1.5` (Living Home):** Pomodoro co-presence đồng bộ qua reload/khóa máy (`±1s` theo server time); Inventory cá nhân ẩn đúng quà cho tới khi gửi qua Hộp thư; Mèo `cat-orange` render từ `Free Pets Pack` không chết khi bỏ quên `> 48h`, `verify-prod-guard.mjs` chặn 100% Dev Console.
- **`V0.2.0` (Economy Foundation):** Economy Simulator chạy `180` ngày cho cả 7 personas đạt `0` arbitrage, `0` deadlock, `0` chiến lược vượt trần `2.2×`; `economy_apply_transaction` pass concurrency race test 2 client mua món cuối cùng lúc; `DevLanBackend` đạt `100%` contract test parity với schema SQL.
- **`V0.2.1` (Farming) & `V0.2.2` (Fishing):** Trồng/tưới/lai hoa chạy theo server timestamp (`0` lỗi lệch múi giờ); mini-game câu cá 1 ngón đạt `>= 30 FPS` trên iPhone Safari và không thể tự gửi request thu cá dưới `800ms`.
- **`V0.2.3` (Intelligent Pet):** Sim-Host tự chuyển giao `< 7s` khi host rớt mạng; dời bát ăn lúc mèo đang đi tới không làm mèo kẹt tường; Pet Brain Debugger bị loại sạch khỏi `dist/`.
- **`V0.2.4` (Home Progression) & `V0.2.5` (Co-op Gameplay):** Mở rộng phòng tự thu hồi đồ sát mép vào kho không mất; 4 mini-game MVP chơi hết 1 ván + mất mạng nối lại không mất trạng thái.
- **`V0.3` (Shared Life):** Nấu ăn Co-op/Order cháy thật khi quá nhiệt/hết giờ; Nhật ký/Album ảnh dùng Supabase Private Storage Signed URLs (`RLS`), tuyệt đối không gửi nội dung ra API LLM ngoài.
- **`V0.4` (Cinema):** Chạy được trọn vẹn 1 phim `60+ phút` từ laptop Windows tới **iPhone Safari thật qua 4G không cài app VPN**, giữ drift ổn định theo `ClockSync` và lỗi codec hiển thị tiếng Việt có phương án xử lý.
- **`V0.5` & `V1.0`:** Kiểm thử hồi quy đầy đủ trên thiết bị thật, backup/restore DB test, và chỉ xét thử `HybridLlmBrain` sau V1.0 và đo chi phí theo ngân sách đã duyệt.

**Điều kiện đóng V0.1:** tất cả 18 gate có bằng chứng của build triển khai. Chạy lại các gate sau khi tích hợp artwork. Ghi môi trường, ngày, build/commit, thiết bị/iOS và kết quả pass/fail vào [PROGRESS.md](PROGRESS.md). Tách ba phép thử Cinema: LAN sync đã có quan sát, S0-5b WAN/iPhone chưa chạy, nghiệm thu V0.4 sau khi có transport.
