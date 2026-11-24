# Our Little World — Product Specification

Tài liệu gốc được đồng bộ từ `Our_Little_World_Agent_Plan.md` làm chuẩn đặc tả cho toàn bộ dự án.

> **North star:** Người dùng muốn mở app vì căn nhà là nơi của hai người, không phải vì có daily quests. Nếu một tính năng không làm trải nghiệm chung dễ chịu hơn, hãy hoãn nó.

## 1. Đối tượng & Thiết bị mục tiêu
- **Người dùng:** Một cặp đôi yêu xa, không phải gamer hardcore, muốn có một ngôi nhà ảo chung ấm áp gắn kết các hoạt động nhẹ nhàng hàng ngày.
- **Thiết bị ưu tiên:**
  - iPhone 16 Pro Max (iOS Safari + Add to Home Screen PWA) — ưu tiên tối đa cho bố cục một tay, cảm ứng, safe-area và khả năng phục hồi sau khi khóa màn hình.
  - Windows laptop (Chrome/Edge) — có thể làm media host V0.4 theo kết quả S0-5b.
  - Android (Chrome) — nền tảng bổ sung.

## 2. Nguyên tắc bất biến & Zero-Configuration Onboarding
1. Giữ phiên đăng nhập cho nhà riêng, không daily streak bắt buộc, không vật nuôi chết đói/cây chết do offline.
2. Không camera/mic bắt buộc khi học; phòng học tương lai hỗ trợ silent co-presence.
3. Không xếp hạng, không giám sát đối phương, không biến thời gian bên nhau thành KPI.
4. Cho phép mini-game PvP thân thiện giữa hai thành viên như Caro, Othello và Battleship. Cả hai tự nguyện tham gia. Không xếp hạng cạnh tranh dài hạn, không mất tài sản và không khóa tiến trình sau PvP. Không pay-to-win, quảng cáo hay loot box.
5. Chỉ tối đa **hai thành viên** trong một thế giới; mọi dữ liệu chung mặc định riêng tư ở tầng server (RLS). Cho phép một tài khoản đăng nhập trên nhiều thiết bị, nhưng luôn từ chối tài khoản thứ ba.
6. Persistent state luôn nằm ở server; mở app lại bất kỳ lúc nào đều khôi phục đúng trạng thái mới nhất và tự động kết nối lại khi mất mạng.
7. **Zero-configuration cho người dùng thứ hai (không am hiểu công nghệ):**
   - Chỉ cần mở **một đường link HTTPS** duy nhất để bắt đầu; hỗ trợ Add to Home Screen trên iPhone.
   - Không yêu cầu cài VPN, Tailscale hoặc ứng dụng bên thứ ba cho mọi tính năng thông thường (và cả mục tiêu V0.4 Cinema).
   - Đăng nhập đơn giản, duy trì phiên đăng nhập, không hiển thị thông số kỹ thuật hay nút dev trong bản production.
   - Mọi thông báo lỗi hiển thị bằng tiếng Việt dễ hiểu, ấm áp.

## 3. Lộ trình tổng quan
- **Spike 0:** Kiểm chứng rủi ro kỹ thuật (PWA/Safari, Realtime multi-network/background, Phaser pixel-art & touch, Cinema LAN sync và benchmark WAN riêng, drift/buffering, xác minh asset pack).
- **V0.1 — Our Little Home (Final Integration):** 2 tài khoản ghép cặp qua lời mời 1 lần, 1 căn nhà + 1 khu vườn pixel art, di chuyển realtime, 2–3+ tùy chọn ngoại hình, trang trí nội thất lưu trạng thái & chống đè atomic, điều khiển cảm ứng iPhone, cài đặt PWA.
- **V0.1.5 — Living Home (sau nghiệm thu V0.1):** Kho không tiền, mèo MVP, tương tác đôi, hộp thư/quà và Pomodoro im lặng.
- **V0.2 — A Home Comes Alive:** Ví chung và ledger, trồng trọt, câu cá, Utility AI nâng cao, mở rộng nhà, mini-game hợp tác.
- **V0.3 — Our Daily Life:** Nấu ăn, nhật ký, album ảnh, lịch hẹn, wishlist và picnic.
- **V0.4 — Our Little Cinema:** Transport sau S0-5b, đồng bộ Play/Pause/Seek, điều chỉnh drift, phụ đề/audio track và voice tùy chọn. Người xem mở link HTTPS và dùng Safari.
- **V0.5 — Polish & Experience:** Ngày/đêm, thời tiết trang trí, audio môi trường, backup/restore, diagnostics, kiểm thử toàn diện thiết bị thật.
- **V1.0 — Our Island (Tùy chọn):** Mở rộng bản đồ hồ, picnic, bãi biển, rừng sau khi đánh giá mức độ sử dụng thực tế.

Xem [lộ trình và gate theo phiên bản](MASTER_ROADMAP.md).
