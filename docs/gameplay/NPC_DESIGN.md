# Thiết kế NPC & Thị trường Giao thương (`NPC_DESIGN`)

*Thiết kế hệ thống NPC sống động nhưng tiết kiệm tài nguyên: dùng lịch trình cố định và hội thoại viết sẵn (scripted) trong `V0.2–V0.5`, **chưa dùng LLM hay AI Town**.*

---

## 1. Bảy (+1) NPC Cốt lõi & Vai trò Kinh tế

| ID | Tên & Danh xưng | Vai trò Kinh tế | Giờ mở cửa (`Asia/Ho_Chi_Minh`) | Tính cách & Lời thoại mẫu | Giai đoạn xuất hiện |
|---|---|---|---|---|---|
| `npc_farmer` | **Bác Hai Mùa** (Thu mua nông sản) | Thu mua rau củ, ngũ cốc; bán hạt giống phổ thông; trao đổi thông qua **Thùng giao hàng (Shipping Bin)** hoặc gặp trực tiếp | `06:00–19:00` (Ship bin 24/7, thanh toán `06:00` hôm sau hoặc tức thì theo chế độ) | Xởi lởi, yêu đất: *"Củ cải sáng nay căng mọng lắm hai đứa ơi!"* | **MVP V0.2.0** (ghé cổng vườn / bảng đơn) |
| `npc_florist` | **Cô Mai Hoa** (Chủ tiệm hoa) | Thu mua hoa tươi & hoa lai; bán hạt hoa & bó hoa gói quà | `07:30–18:30` | Dịu dàng, lãng mạn: *"Bó hoa này tặng người kia chắc vui cả tuần."* | `V0.2.1` |
| `npc_fisher` | **Chú Tư Cần** (Người bán cá) | Thu mua cá tươi; bán mồi câu, cần câu nâng cấp, bể cá trang trí | `05:30–11:30` & `16:00–21:00` | Trầm tĩnh, hài hước: *"Gió hồ hôm nay dễ có cá vàng ẩn mình."* | `V0.2.2` |
| `npc_chef` | **Chị Bếp An** (Chủ nhà hàng) | Phát hành **Restaurant Orders** (đơn nấu ăn có thời hạn & yêu cầu sao `★`), bán gia vị nền | `10:00–22:00` | Nhiệt huyết, kỹ tính: *"Đừng để quá lửa kẻo mất độ giòn nha!"* | `V0.3` |
| `npc_carpenter` | **Chú Mộc Lâm** (Thợ mộc) | Bán công thức & nâng cấp nhà/nhà kính/ao/đồ nội thất gỗ *Cottage/Pastel* | `08:00–17:30` | Chắc nịch, tỉ mỉ: *"Nhà thêm góc bếp sẽ ấm áp hơn nhiều."* | `V0.2.4` |
| `npc_pet` | **Bạn Nhỏ Vy** (Chủ tiệm thú cưng) | Bán đồ chơi mèo, trụ cào móng, đồ ăn ngon (treat) & phụ kiện cổ áo (`V0.2.0+`); thức ăn cơ bản miễn phí | `08:00–20:00` | Yêu động vật: *"Nhóc mèo nhà hai bạn hôm nay quấn chủ ghê."* | `V0.1.5` (giới thiệu) → `V0.2.0` (bán đồ) |
| `npc_courier` | **Anh Giao Nhanh** (Người giao hàng) | Vận chuyển **Thư & Quà bất ngờ giữa hai người chơi** + nhận giao đơn hàng lớn trong ngày | Giao `09:00`, `15:00`, `20:00` (hoặc hộp thư ngay tức thì) | Nhanh nhẹn: *"Có bưu kiện bí mật gửi riêng tới hòm thư trước cổng!"* | `V0.1.5` (hộp thư) → `V0.2.5` (đơn hàng) |
| `npc_barista` | **Chủ quán Cà phê Đom Đóm** | Bán đồ uống hồi tinh thần nhẹ / nhạc chill góc học & đơn bánh ngọt | `14:00–23:30` | Ấm áp, yên tĩnh: *"Ngồi học cùng nhau nhé, cà phê sẵn trên bàn."* | `V0.3 / V0.5` |

---

## 2. Cơ chế Hoạt động: Ghé thăm MVP → Chợ & Làng

- **MVP (`V0.2.0 – V0.2.5`):** Chưa cần bản đồ Làng lớn; mỗi ngày 1–2 NPC phụ trách (hoặc toàn bộ qua **Bảng Đơn Hàng & Sạp Cổng Vườn**) luân phiên ghé cổng nhà phía hộp thư đỏ. **Thùng Giao Hàng (Shipping Bin)** đặt cạnh cổng luôn cho phép thả nông sản bán bất kỳ giờ nào kể cả lúc NPC đóng cửa!
- **Advanced (`V1.0`):** Khi mở **Khu chợ** và **Làng nhỏ**, NPC đi lại giữa nhà riêng → sạp hàng → quảng trường theo lịch trình server time (`Asia/Ho_Chi_Minh`).
- **Đơn đặt hàng (Order Board):** Luôn có 3 slot đơn hàng (tham chiếu cấu trúc `webfarmville@c420bc2:shared/src/content/orders.ts` với lý do hội thoại riêng cho từng NPC), trả thưởng **`1.35x – 1.70x`** giá trị cơ sở và đôi khi kèm 1 món decor đặc biệt.

---

## 3. Data Model, Dependencies, Edge Cases & Acceptance Criteria

- **Data model:**
  - `npc_schedules` & `npc_catalog` (static JSON/TS config sinh SQL seed, không chạy AI).
  - `world_orders (id, world_id, npc_id, items_jsonb, reward_coins, bonus_sku, expires_at, status, seed)` — tạo bởi server RNG.
- **Dependencies:** `farmCalendar.ts` (`Asia/Ho_Chi_Minh`), Economy (`V0.2.0`), Demo E cổng & hộp thư.
- **Edge cases:** Hai người cùng bấm hoàn thành 1 đơn hàng trên bảng cùng giây → khóa hàng `world_orders FOR UPDATE` để chỉ cấp thưởng 1 lần; hết giờ cửa hàng NPC trong lúc đang mở modal mua → vẫn cho hoàn tất giỏ đang mở trong 60s hoặc chuyển sang Shipping Bin.
- **Acceptance criteria:** Không có màn hình bán "vào hư vô" không tên tuổi; Shipping Bin hoạt động 24/7 giúp người chơi lệch múi giờ vẫn bán được đồ; toàn bộ hội thoại tiếng Việt tự nhiên, không gọi LLM API.
