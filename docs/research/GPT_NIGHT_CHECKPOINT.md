# GPT Night checkpoint — V0.1 Technical Finalization

Worktree `OLW-gpt-night`, nhánh `gpt/night-dev`, baseline `34f58c7`. Ngày 25/11/2026. Các commit chỉ lưu cục bộ.

## OLW-010-04 — Realtime Optimization

Hoàn thành local. Commit logic thuần `48c5974`. Commit tích hợp caller và regression `c63494c`. Thay đổi giới hạn một gói đi bộ mỗi 125 ms và dịch chuyển Euclid từ 2 px tính theo gói cuối. Đổi hướng vẫn theo nhịp gửi thường. Gói dừng và đổi map phát một lần ngay khi chuyển trạng thái. Modal và tab ẩn chốt idle rồi ngừng gửi đi bộ. Khi transport báo đã kết nối, client gửi lại vị trí hiện tại với seq tiếp tục tăng. Mỗi người có một avatar từ phiên Presence mới nhất, các gói từ phiên khác không ghi đè vị trí đang hiển thị.

### Đo cục bộ

Chạy logic throttle của baseline và bản sửa với cùng đồng hồ giả, mẫu 5 ms. Kịch bản gồm một mẫu ban đầu, đi 12 giây ở 64 px/s (đặt lại tọa độ x mỗi 2 giây để giữ trong map), 3 giây dao động 0,7 px, 1 giây idle, rồi gọi hai lần liên tiếp ở map mới.

| Điều kiện | Baseline 100 ms | Bản sửa 125 ms |
| --- | ---: | ---: |
| Đi 12 giây | 120 | 96 |
| Dao động 3 giây | 30 | 0 |
| Ban đầu, idle và đổi map | 3 | 3 |
| Tổng gửi | 153 | 99 |
| Gửi và nhận, một nguồn, hai kết nối | 306 | 198 |
| Gửi và nhận, một nguồn, ba kết nối | 459 | 297 |

Gửi giảm **35,3% trong kịch bản này**. Hai dòng gửi và nhận là phép tính với 1 hoặc 2 phiên nhận và `self: false`. Tổng thực tế còn phụ thuộc Presence, các broadcast khác, số nguồn cùng đi và thời gian sử dụng. Chưa đo usage Cloud, chưa xác nhận Supabase Free đủ cho cặp đôi. Nguồn cách tính [Supabase Realtime Messages](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages).

### Kiểm thử và bàn giao

- `npm run lint`, `npm run typecheck`, `npm run test` (35/35), `npm run build` và `node scripts/verify-prod-guard.mjs` pass. Public SW có 25 mục, 2.008,46 KiB. Vite vẫn báo các chunk lớn hơn 500 kB.
- Playwright Dev LAN pass 10/10 với retry tắt trên Chromium desktop và viewport cảm ứng 430×932. Chạy lặp riêng regression 8/8 với retry tắt. Regression dùng ba browser context, hai tài khoản, dừng khi mở modal hoặc giả lập tab ẩn, ngắt/kết nối lại mạng và đổi nhà → vườn. Lần chạy trước khi sửa relay có một ca mobile cần retry. Guard mới ngăn luồng SSE cũ dọn phiên thay thế khi hai luồng reconnect giao nhau.
- Vitest kiểm ngưỡng 2 px, hướng đổi theo cadence, thứ tự seq từng thiết bị, idle/map một lần và nội suy với gói đến lệch nhịp hoặc sai thứ tự. E2E hiện dùng atlas public.
- Chưa chạy iPhone Safari/PWA hay Android thật, chưa đo WAN hoặc số liệu Supabase Cloud. Không thay đổi schema, RLS, `MovementPacket` hoặc `WorldBackend`.

## OLW-010-05 — Review và hướng dẫn đã bàn giao

[Review và checklist](GPT_NIGHT_OLW_010_05_REVIEW.md) ghi các điều kiện cần xử lý trước khi chuyển sang Production. Ưu tiên kiểm quyền hiệu lực của RPC helper, thống nhất thứ tự khóa invite/world và xác minh RLS/Realtime bằng role cùng JWT thực. Tài liệu gồm hai project Free khi còn slot, Auth tạo sẵn hai người, kiểm URL asset private theo PD-01 và nghiệm thu Safari/PWA thật.

Nhánh `gpt/night-dev` đã dừng sau review. Cloud Test, license triển khai của atlas riêng, kiểm thử thiết bị thật và xác nhận quota còn chờ. Không có thay đổi migration hoặc adapter Supabase trong mốc review. Chi phí bổ sung 0₫.
