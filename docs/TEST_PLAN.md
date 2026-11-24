# Test Plan — Our Little World

## 1. Các tầng kiểm thử

| Tầng | Công cụ | Phạm vi | Tiêu chí |
|---|---|---|---|
| **Static Check** | ESLint + TypeScript (`tsc --noEmit`) | Toàn bộ `src/` & `tests/` | 0 lỗi, 0 cảnh báo không giải thích |
| **Unit Tests** | Vitest (`tests/unit/`) | `placement.ts`, `realtime.ts`, `avatar.ts`, `cinemaSync.ts`, `localPreviewBackend.ts` | Tất cả test case pass sau mọi thay đổi |
| **Integration SQL** | `supabase/tests/rls_and_pairing.sql` | Pairing cap 2 người, RLS outsider, occupancy conflict, idempotency | Chạy trực tiếp trên Postgres/Supabase dev khi kết nối |
| **E2E (Local Chromium)** | Playwright (`tests/e2e/`) | Desktop Chrome + Mobile viewport `430x932` (iPhone 16 Pro Max giả lập) | Luồng 2 tab ghép đôi, outsider reject, đổi phòng, trang trí, reload, không lỗi console, Spike 0 PoC |
| **Manual Device Testing** | iPhone 16 Pro Max Safari/PWA + Windows Chrome/Edge + Android | Cảm ứng thật, khóa màn hình, đổi Wi-Fi/4G, Add to Home Screen và kiểm thử Cinema riêng nếu đến S0-5b | Ghi lại iOS version, mạng, kết quả thực tế vào `docs/PROGRESS.md` |

> **Nguyên tắc trung thực:** Playwright WebKit/Chromium trên Windows **không thay thế** bài test thiết bị thật trên iPhone 16 Pro Max. Mọi hạng mục chưa chạy trên iPhone thật, Supabase cloud thật, hoặc Jellyfin/Tailscale thật phải ghi rõ *"Chưa test trên thiết bị thật"*.

## 2. Ma trận kiểm thử V0.1 + Spike 0

| ID | Kịch bản | Kết quả kỳ vọng | Mức kiểm chứng |
|---|---|---|---|
| T01 | Ghép cặp 2 người + Người thứ 3 xâm nhập | Tab 1 tạo nhà + mã mời; Tab 2 nhập mã thành công; Tab 3 bị từ chối với lỗi nhà đủ 2 người | Unit + E2E (Local) / SQL test (Supabase) |
| T02 | Hiện diện & Di chuyển cùng phòng / khác phòng | Cùng phòng thấy avatar di chuyển mượt; đổi phòng ẩn avatar cũ và báo đối phương ở phòng nào | Unit + E2E (Local) |
| T03 | Tùy chỉnh ngoại hình | Thay đổi biệt danh/tóc/áo/phụ kiện ở Tủ đồ cập nhật ngay và giữ nguyên sau reload | Unit + E2E (Local) |
| T04 | Trang trí nội thất & Xung đột đồng thời | Đặt thảm dưới bàn được phép; đặt 2 đồ cùng `object` bị chặn; 2 client đặt cùng ô chỉ 1 người thắng, người kia rollback & reload giữ nguyên state | Unit + E2E (Local) / SQL test (Supabase) |
| T05 | Khung hình di động `430x932` & Touch | Không tràn ngang, nút điều hướng >= 44 CSS px, canvas nhận tap-to-move không cuộn trang | E2E Mobile viewport / Manual iPhone |
| T06 | PWA Install & Offline | Build sinh `sw.js` & `manifest.webmanifest`; không cache API/video; mất mạng báo trạng thái rõ, có mạng kéo snapshot | Build check + Manual iPhone/Chrome |
| T07 | Spike 0 Media Sync PoC | 2 tab tải `/spike/sample-cozy-sync.mp4`, Ready, Play/Pause/Seek theo revision, không echo loop, hiển thị drift | Unit + E2E (Local) |
| T08 | V0.1 đa mạng + Safari khóa màn hình | HTTPS Auth thật, khôi phục session/layout, tự reconnect khi đổi Wi-Fi ↔ 4G, không còn ghost avatar | iPhone Safari/PWA + Windows qua Supabase Cloud |

V0.1 chạy SQL fixture ở Supabase Test và thử ba danh tính bằng client thật. Bài E2E đang có dùng lại mã mời đã đổi để thử người thứ ba, vì vậy Test cần kiểm tra thêm người thứ ba bị chặn đọc, ghi, private channel và giới hạn thành viên bằng đường độc lập với token đã dùng. Ghi build ID, kết nối, iOS, thao tác và kết quả vào [PROGRESS.md](PROGRESS.md). S0-5b xem [MEDIA_SETUP.md](MEDIA_SETUP.md).

SQL fixture hiện có trả về sớm nếu thiếu 3 user UUID từ `supabase/seed.sql`. Trên Test, chuẩn bị đủ fixture và ghi nhận cả dòng xác nhận chạy assertions. NOTICE “Skipping SQL integration block” tính là chưa chạy. Script dùng JWT giả lập và kiểm xung đột tuần tự. Dùng hai kết nối thật để test race và ba tài khoản Test để kiểm RLS bằng client thật. Chỉ nạp seed tổng hợp vào Test.
