# Cơ chế Thị trường NPC & Chống Lũng đoạn (`MARKET_AND_NPC`)

*Giữ thị trường đơn giản, dễ hiểu với người chơi không hardcore, tránh vĩ mô rắc rối nhưng triệt tiêu chiến lược độc tôn (monoculture).*

---

## 1. Bốn Kênh Giao dịch

| Kênh | Luật hoạt động | Hệ số giá |
|---|---|---|
| **1. Shipping Bin (Thùng cổng vườn)** | Hoạt động 24/7 (cho phép bán bất kỳ lúc nào kể cả khi NPC đóng cửa hoặc người kia offline; người bán cần kết nối), trả `1.0×` giá bán cơ sở × chất lượng (`★`) | `1.00×` |
| **2. Bán trực tiếp NPC (Chuyên biệt)** | Bác Hai Mùa trả `+10%` cho đúng nhóm đang *Hot trong ngày*; Cô Mai Hoa trả `+15%` cho bó hoa/hoa lai; Chú Tư Cần trả `+15%` cho cá đạt bậc Bạc/Vàng | `1.00× – 1.15×` |
| **3. Bảng Đơn đặt hàng (Order Board)** | Luôn hiển thị `3` đơn ngẫu nhiên từ server RNG (`webfarmville` pattern), giao trọn gói nhận thưởng cao + XP + xác suất `20%` kèm món decor nhỏ | **`1.35× – 1.70×`** |
| **4. Đơn Nhà hàng có Đồng hồ (`V0.3`)** | Chị Bếp An đặt món nóng kèm mốc thời gian (`90–150s`) & sao tối thiểu (`★★+`) | **`1.60× – 2.00×`** (rủi ro cháy mất thưởng) |

---

## 2. Độ Bão hòa Mềm (`Soft Saturation`) & Mùa vụ
- **Chống monoculture (trồng 1 loại cây duy nhất vĩnh viễn):**
  - Mỗi nhóm hàng hóa (`grain`, `veg`, `fruit`, `flower`, `fish`, `dish`) có **hạn mức giá chuẩn hàng ngày** (ví dụ `20` đơn vị/ngày/nhóm trên 1 thế giới).
  - Vượt 20 đơn vị trong ngày thì áp hệ số giảm dần với sàn 0,70. MVP đếm lại theo ngày mới lúc 00:00 Asia/Ho_Chi_Minh và tính giá theo từng đơn vị vượt ngưỡng để chia lô không làm tăng tổng tiền. Bước giảm là tham số config.
  - Kết hợp với bảng đơn hàng 3 slot luân phiên giúp người chơi tự nhiên đa dạng hóa: trồng rau + hoa + câu cá + nấu ăn luôn có lợi hơn spam duy nhất lúa mì.
- **Mùa vụ & Sự kiện Cặp đôi:** Mỗi mùa thực (hoặc chu kỳ 2 tuần trong game) luân phiên 1–2 nhóm cây hưởng `m = 1.15×`, và **Ngày kỷ niệm của cặp đôi** mở đơn hàng hoa/bánh đặc biệt thưởng món trang trí kỷ niệm (không ép cày).

---

## 3. Phục hồi khi ví và kho trống

- **V0.2.0:** Hái miễn phí `wild_herb` ở ít nhất hai điểm gần cổng, bán qua Shipping Bin. Với giá gốc đề xuất `5c/đơn vị`, số tiền mua được ít nhất một hạt lúa mì `4c`, kể cả khi áp sàn bão hòa `0.70`. Thời gian chơi mục tiêu dưới 10 phút, đo ở `OLW-020-04` và `OLW-020-05`. Server cấp lượt hái và thời điểm hồi. Solo luôn đi được đường này.
- **V0.2.1:** Bổ sung gói `3×seed_wheat` tối đa mỗi thế giới một lần/ngày khi tổng giá trị thanh khoản (ví + hạt + nông sản bán được) dưới `10c`. Hạt cứu trợ dùng để gieo và không bán trực tiếp.
- **V0.2.2:** Thêm mồi giun không bán được và câu cá miễn phí. `econ-check.mjs` chỉ tính `2×5 + 2×14 = 38c` với giả định có câu cá. Kịch bản chưa đo được thời gian hồi 5 phút trên bản chơi thật.
