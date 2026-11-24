# Security & Privacy Policy — Our Little World

## 1. Kiểm soát truy cập thế giới cặp đôi
- **Giới hạn cứng 2 thành viên:** Không dựa vào giao diện UI để ẩn nút. Hàm `redeem_world_invite` khóa bản ghi `worlds` (`FOR UPDATE`), kiểm tra `COUNT(world_members) < 2`, và xác nhận token mời chưa hết hạn và chưa dùng.
- **Mã mời một lần:** Hệ thống chỉ lưu **SHA-256 hash** (`token_hash`) trong bảng `world_invites` (không bật `SELECT` RLS cho client). Mã thô chỉ xuất hiện 1 lần khi chủ nhà bấm tạo lời mời.
- **Tài khoản riêng biệt:** Mỗi người có tài khoản Auth riêng (`auth.uid()`). Không dùng chung email/mật khẩu.

## 2. Row Level Security (RLS) & Realtime Private Channels
- Toàn bộ bảng dữ liệu (`profiles`, `worlds`, `world_members`, `furniture_placements`, `furniture_placement_tiles`, `mutation_idempotency`) đều bật RLS.
- Chỉ thành viên hợp lệ mới được đọc dữ liệu của `world_id` tương ứng; mọi thao tác ghi/ghép cặp/sửa đồ chạy qua Postgres `SECURITY DEFINER` RPCs có kiểm tra `public.is_world_member(world_id)` và khóa giao dịch.
- Kênh Realtime sử dụng `config: { private: true }` và kiểm tra RLS trên `realtime.messages` qua `realtime.topic()` khớp `'world:' || world_id` (hoặc `'cinema-spike:' || world_id`).
- **Lưu ý quan trọng khi triển khai SQL:** Không chạy `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY` trong migration của Supabase vì bảng đã bật RLS sẵn và user migration không sở hữu schema `realtime`.

## 3. Bảo mật Client, PWA & Media
- Tuyệt đối không đưa `service_role` key vào frontend hay file `.env` client. Chỉ dùng `VITE_SUPABASE_PUBLISHABLE_KEY` / anon key kết hợp RLS.
- Workbox Service Worker được cấu hình `runtimeCaching: []` và bỏ qua `/spike/` để **không cache** dữ liệu API, auth token, nhật ký, ảnh riêng tư hay video.
- Không gắn token Jellyfin dài hạn vào URL công khai, không gửi nội dung cá nhân tới dịch vụ phân tích hay LLM bên thứ ba.
- **Minh bạch mã hóa:** Lưu trữ trên Supabase sử dụng HTTPS khi truyền tải và mã hóa mặc định của hạ tầng cloud (không phải end-to-end encryption — quản trị viên project Supabase vẫn có quyền quản trị DB nếu tự mở dashboard). Không tuyên bố E2EE.
