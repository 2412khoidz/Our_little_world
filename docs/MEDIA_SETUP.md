# Cinema Spike và thử nghiệm truyền phim

## 1. Trạng thái

Spike 0 đã thử đồng bộ Play/Seek giữa hai Chromium context qua Dev LAN và chủ dự án đã quan sát Windows ↔ Redmi K70E trên cùng Wi-Fi với video mẫu. S0-5b kiểm tra đường truyền thật Windows → iPhone Safari qua mạng di động, cùng quyền truy cập, codec, seek và chi phí. Hai phép thử có kết quả riêng. Cinema production thuộc V0.4.

## 2. Ứng viên S0-5b

| Ứng viên | Thiết lập thử | Điều cần xác nhận |
|---|---|---|
| **A. Tailscale Funnel + HLS** | Windows host chạy Funnel và gateway HLS cục bộ. Trình duyệt iPhone mở link HTTPS. | Funnel công khai và giới hạn relay. Bảo vệ manifest, segment và phụ đề bằng quyền phiên ngắn hạn đã xác thực, thử revoke/hết hạn và kiểm tra log. Giữ Jellyfin admin và thư viện ngoài đường public. |
| **B. WebRTC + STUN/TURN** | Windows Chrome/Edge lấy stream từ video cục bộ. Safari nhận stream, gửi seek về host và đồng bộ lệnh qua phòng riêng. | Ghi direct/relay, H.264, âm thanh, phụ đề và reconnect. TURN chỉ bật khi credential ngắn hạn và chi phí 0₫ đã xác nhận. Kiểm tra SDP mặc định trước khi thử workaround upstream. |
| **C. File local** | Hai máy mở cùng MP4 H.264/AAC, trao đổi play/pause/seek. | Dự phòng khi upload, bitrate hoặc ngân sách không đạt. Thử picker/seek file lớn trên iPhone. |

So sánh nhà cung cấp, điều khoản và định mức trong [nghiên cứu Cinema](research/OPEN_SOURCE_RESEARCH.md#3-nghiên-cứu-riêng-cinema-transport-vs-state-sync-xác-minh-25112026). Serve/Tailscale riêng chỉ để chẩn đoán host nếu có môi trường sẵn. S0-5b cần người xem dùng browser thường.

## 3. Cách dùng Spike 0 Lab có sẵn trong ứng dụng
1. Mở app trên Windows và iPhone → vào **Menu → Spike 0 Lab**.
2. Chọn tab **Đồng bộ Video (PoC)**:
   - Chọn nguồn **Video mẫu có sẵn** (`/spike/sample-cozy-sync.mp4`), hoặc **Chọn file local**, hoặc **Nhập URL private**.
   - Nhấn **Sẵn sàng (Ready)** trên cả hai máy.
   - Dùng nút **Play / Pause / Seek** và quan sát đồng hồ đếm khung hình trên video cùng bảng đo **Clock Offset**, **Drift (ms)**, **Hành động sửa sai lệch (`ignore` / `rate` / `seek`)** và **Buffering**.

## 4. Protocol Go/No-Go cho iPhone thật

Mọi kết quả hiện là **Pending Manual Verification**. Dùng file có quyền: A là MP4 H.264/AAC, B là MKV/HEVC hoặc AC3 kèm SRT để kiểm tra remux/transcode. Ghi build/device/iOS, mạng host và iPhone, đường truyền và profile mã hóa. Pilot mỗi ứng viên 10 phút, xác nhận ứng viên dẫn đầu bằng ít nhất 60 phút phát liên tục. Ghi median/p95 startup, seek, drift khi cả hai đã phát, rebuffer count/thời gian, bitrate và CPU/GPU. Giữ media riêng tư khỏi log và Service Worker.

| Gate | Mục tiêu thử nghiệm | Funnel / WebRTC |
|---|---|---|
| Một link, không VPN/app iPhone | Mở trên Safari thật, thao tác phát bằng một chạm, thử thêm PWA | Chưa chạy / Chưa chạy |
| Truyền và sync | 720p trở lên ở profile đo, drift p95 mục tiêu ≤500 ms ngoài đoạn seek/rebuffer; thử seek từ hai phía và phụ đề | Chưa chạy / Chưa chạy |
| Phục hồi | Khóa/mở màn hình, đổi Wi-Fi ↔ 4G, thử host đóng tab và reconnect | Chưa chạy / Chưa chạy |
| Quyền truy cập | Người ngoài, phiên hết hạn và URL media trực tiếp bị chặn; media không cache | Chưa chạy / Chưa chạy |
| Chi phí | Đo upload và lưu lượng relay, xác minh dùng 0₫ và cơ chế dừng nếu sắp vượt mức | Chưa chạy / Chưa chạy |

Chốt ứng viên đạt sau khi ghi số đo. Nếu cả hai không đạt chi phí, quyền truy cập hoặc chất lượng, ghi No-Go và chỉ giữ file local ở mức dự phòng. Nghiệm thu V0.4 vẫn cần xem trọn buổi dài 1–2 giờ trên iPhone thật; voice và ducking kiểm tra riêng nếu được bật.

PD-03 cho phép nghiên cứu Funnel HLS và WebRTC khi đến S0-5b. Chọn transport dựa trên số đo sau spike. Dùng hostname đi kèm nền tảng với ngân sách bổ sung 0₫ theo PD-04. [Quyết định](DECISIONS.md#quyết-định-đã-chốt)
