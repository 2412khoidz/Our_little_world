# Lộ trình Mở rộng Thế giới & Bộ sưu tập Nhà (`WORLD_PROGRESSION`)

*Tài liệu định nghĩa 11 bậc mở rộng không gian từ V0.1 → V1.0+ và quy chuẩn 4 bộ sưu tập nội thất theo Demo E.*

---

## 1. Quy tắc Độc lập Tiện ích Đời thường (Bất biến)
> **CẤM khóa các tiện ích sinh hoạt cặp đôi sau tiến trình kinh tế hoặc level.**
> Phòng học Pomodoro (`V0.1.5`), Tủ đồ, Hộp thư/Quà bất ngờ, Nhật ký, Album, Lịch hẹn, Wishlist và Rạp phim (`V0.4`) luôn mở cho cả hai ngay khi mở khóa phiên bản tương ứng — kể cả khi ví nhà đang `0` xu. Tiến trình mở khóa nhà chủ yếu phục vụ **chiều sâu gameplay (bếp, nhà kính, ao, chợ), không gian trang trí và phần thưởng thẩm mỹ**.

---

## 2. 11 Bậc Mở rộng Không gian (`MVP → Long-term`)

| Bậc | Không gian / Khu vực | Vai trò mở rộng | Phiên bản mục tiêu | Mở khóa / Điều kiện gợi ý |
|---|---|---|---|---|
| **1** | **Căn nhà nhỏ & Khu vườn ban đầu** | Khởi điểm V0.1: góc ngủ, góc khách, góc học, ao nhỏ, 1 số ô đất sẵn | `V0.1` | Mở sẵn từ ngày đầu tạo nhà |
| **2** | **Phòng ngủ & Phòng khách riêng** | Mở rộng vách ngăn tách biệt phòng ngủ ấm cúng + sảnh TV/sofa rộng | `V0.2.4` | Nâng cấp nhà cấp 1 (xu + gỗ cơ bản) |
| **3** | **Nhà bếp & Phòng học chuyên sâu** | Lắp quầy bếp nhiều trạm nấu (Sơ chế/Bếp lửa) + 2 bàn học nâng cao | `V0.2.4 / V0.3` | Phục vụ Cooking V0.3 (bàn học Pomodoro cơ bản thuộc đề xuất V0.1.5) |
| **4** | **Phòng thú cưng riêng** | Không gian mở cho mèo với trụ cào móng, cửa sổ phơi nắng, hộp giấy | `V0.1.5 / V0.2.3` | Tích hợp từ góc pet Demo E (`V0.1.5`), nâng cấp phòng rộng ở `V0.2.4` |
| **5** | **Nhà kính (Greenhouse)** | Khu trồng cây quanh năm không bị giới hạn mùa, tăng cơ hội hoa hiếm | `V0.2.4` | Nâng cấp vườn sau khi trồng thành thạo vài lứa hoa |
| **6** | **Hiên nhà & Khu Picnic anh đào** | Chòi nhỏ, thảm picnic mở rộng, nơi đón NPC & hẹn hò uống trà | `V0.2.4 / V0.3` | Có sẵn góc cơ bản trong Demo E; mở rộng đồ picnic/chòi |
| **7** | **Ao cá & Khu vườn mở rộng** | Mở thêm cánh Đông-Nam vườn trồng cây ăn quả & điểm câu cá sâu hơn | `V0.2.2 / V0.2.4` | Mở thêm số ô đất (`12 → 24 → 36` ô) & bến câu nâng cấp |
| **8** | **Rạp phim riêng tại gia (Cinema Lounge)** | Khu chiếu phim màn hình rộng chuyên dụng (hoặc biến hóa phòng khách) | `V0.4` | Tiện ích Cinema mở cho cặp đôi không khóa tiền; trang trí ghế rạp dùng xu |
| **9** | **Khu chợ nhỏ (Cozy Market)** | Quầy hàng cố định của các NPC (Hoa, Cá, Bếp, Thợ mộc) thay vì chỉ ghé cổng | `V0.2.5 / V1.0` | Truy cập qua cổng đường cái phía Bắc/Tây vườn |
| **10** | **Làng nhỏ (Cozy Village)** | Cụm nhà các NPC sinh hoạt theo lịch trình, bảng đơn hàng cộng đồng | `V1.0` | Khi core kinh tế và NPC V0.2–V0.5 ổn định |
| **11** | **Our Island** | Đảo riêng với bãi biển, rừng thông khám phá, chòi ngắm sao, sự kiện kỷ niệm | `V1.0+` | Cổng bến thuyền; mở rộng tùy nhu cầu thực tế của cặp đôi |

---

## 3. Bốn Bộ sưu tập Nội thất Hỗ trợ (Theo `SemanticAssetRegistry`)

Mọi vật phẩm nội thất thuộc đúng 1 nhóm phong cách trong 4 bộ sưu tập đã thiết kế ở [ASSET_PIPELINE.md](../art/ASSET_PIPELINE.md) mà **không thay đổi schema DB**:

| Bộ sưu tập (`collection`) | Đặc trưng thị giác | Nguồn pack miễn phí (`0₫`) | Vai trò trong House Progression |
|---|---|---|---|
| **`pastel`** | Tông hồng đào, kem, gỗ sáng ấm áp | *Sprout Lands Basic + Sorry* | Bộ khởi đầu mặc định V0.1 & khu vườn anh đào |
| **`modern`** | Đường nét gọn gàng, sofa dài, bàn học 2 màn hình, TV/màn chiếu | *Modern Interiors Free (LimeZu)* | Phòng khách Cinema, góc học tập 2 chỗ, nhà bếp hiện đại |
| **`cottage`** | Bồn hoa gỗ, hộp thư đỏ, bàn gỗ mộc, lọ hoa đồng nội | *Cozy Lands Basic* (+ *Sprout*) | Nâng cấp sân vườn, hiên nhà, khu picnic |
| **`rustic`** | Bát gốm thô, cối xay gió, hàng rào nông trại, quầy nông sản | *Sunnyside World v2.1* | Nông trại mở rộng, khu chợ & làng V1.0 |

---

## 4. Data Model, Dependencies, Edge Cases & Acceptance Criteria

- **Data model:** `world_unlocks (world_id, area_key, unlocked_at, unlocked_by, upgrade_level)`, liên kết với `furniture_catalog.collection`.
- **Dependencies:** `K2` (ví chung & ledger), `src/shared/maps.ts` (khai báo cổng portal `home ↔ garden ↔ market ↔ island`).
- **Edge cases:** Nâng cấp mở rộng phòng khi đồ nội thất cũ đặt sát vách tường đang thay đổi → hệ thống tự động di dời các món vướng viền vào `inventory_items` thay vì xóa mất đồ của người chơi!
- **Acceptance criteria:** Hai máy mở khóa khu vực mới chỉ trả tiền 1 lần (`FOR UPDATE`); mở app lúc ví `0` xu vẫn vào học Pomodoro và xem rạp phim bình thường; phối trộn tự do đồ từ cả 4 collection trong cùng 1 phòng giữ đúng Y-depth.
