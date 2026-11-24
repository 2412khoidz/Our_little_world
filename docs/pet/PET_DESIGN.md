# Thiết kế Thú cưng Sống động (`PET_DESIGN`)

*Ưu tiên chiều sâu hành vi của **một chú mèo chung (`cat-orange`)** thay vì chạy theo số lượng loài. Phân tách **MVP (`V0.1.5`)** và **Intelligent Pet (`V0.2.3`)**.*

---

## 1. Triết lý & Phân kỳ MVP vs Advanced

| Hạng mục | **MVP (`V0.1.5 — Living Home`)** | **Advanced (`V0.2.3 — Intelligent Pet`)** |
|---|---|---|
| **Số lượng & Chủng loại** | 1 chú mèo cam (`cat-orange`, `Free Pets Pack CC BY 4.0`), đặt tên chung | Tùy chọn đổi màu lông từ layer `unlit` hoặc thêm chó `puppy-shiba` sau |
| **Nhu cầu & Cảm xúc** | 3 chỉ số lõi (`no`, `năng lượng`, `vui vẻ`), `FLOOR = 30`, không chết | Đủ **8 nhu cầu** + **9 trạng thái cảm xúc**, biểu cảm qua hành vi/âm thanh/icon chứ không spam thanh bar |
| **Trí tuệ & Tự chủ** | Đi dạo cơ bản, lại gần bát ăn/ngủ, tới nằm cạnh khi chủ học; ngữ cảnh xem phim mở ở V0.4 | **Utility AI** + **Affordance System** + **7 tính cách** + **Bounded Memory** |
| **Tương tác cặp đôi** | Vuốt ve, cho ăn (hạt cơ bản `0₫`), chơi đuổi bóng, cùng chơi chung | Thói quen riêng với từng người chơi, tha đồ chơi/quà nhỏ về, thích nghi khi dời đồ |

---

## 2. Tám Nhu cầu & Chín Cảm xúc (Quy tắc Không Tổn thương)

- **8 Nhu cầu (`0..100`):** `hunger` (mức no, thấp nghĩa là đói), `thirst` (Khát), `energy` (Năng lượng), `hygiene` (Vệ sinh), `fun` (Vui vẻ), `stimulation` (Chống buồn chán), `social` (Tương tác), `safety` (An toàn).
- **Quy tắc Bất biến (từ `Ourlittlepet` + nguyên tắc dự án):**
  - Mèo **được phép** thấy đói, buồn chán, cô đơn hoặc rụt rè khi vắng chủ lâu (`clamp >= FLOOR = 25..30`) để tạo cảm giác sống thật.
  - **TUYỆT ĐỐI KHÔNG** để mèo chết, bỏ đi vĩnh viễn hay mắc bệnh hiểm nghèo chỉ vì hai bạn bận thi/đi làm hoặc offline. Sau 1 lần cho ăn + vuốt ve khi quay lại, mèo hồi phục ấm áp dần.
- **9 Cảm xúc (suy ra từ nhu cầu + sự kiện gần đây, thể hiện qua anim & bong bóng biểu cảm):**
  `happy` (Vui vẻ), `sad` (Buồn), `lonely` (Cô đơn), `curious` (Tò mò), `scared` (Sợ hãi), `grumpy` (Khó chịu), `relaxed` (Thư giãn), `excited` (Hào hứng), `clingy` (Làm nũng).

---

## 3. Tính cách, Ký ức Hữu hạn & Quan hệ Riêng từng Người

- **7 Nét tính cách (trọng số `0..1` tạo cá tính riêng):** *Ham ăn (`glutton`), Nghịch ngợm (`playful`), Quấn người (`clingy`), Tò mò (`curious`), Nhút nhát (`shy`), Lười biếng (`lazy`), Độc lập (`independent`)*.
- **Ký ức hữu hạn (`Bounded Typed Memory`, KHÔNG dùng Vector DB / LLM):**
  - Lưu ring-buffer tối đa `24` sự kiện gần nhất + bảng điểm sở thích `preference_scores` cho: *món ăn thích, đồ chơi thích, chỗ ngủ quen, góc trốn an toàn, đồ nội thất mới khám phá, khung giờ hoạt động, các sự kiện kỷ niệm*.
- **Quan hệ Riêng với Mây và Nắng (Chống KPI độc hại):**
  - Mèo ghi nhớ riêng `affinity` & lịch sử (*ai hay cho ăn sáng, ai hay chơi bóng chiều*) để tự nhiên dụi đầu hay chạy ra đón người phù hợp.
  - **CẤM hiển thị bảng xếp hạng "mèo yêu ai hơn"** dưới mọi hình thức!

---

## 4. Tích hợp Tự nhiên vào Đời sống Cặp đôi

| Hoạt động của Người chơi | Phản ứng tự chủ của Mèo (`pet_context_hook`) |
|---|---|
| **Học Pomodoro (`V0.1.5+`)** | Lặng lẽ đi tới nằm cuộn tròn ở góc thảm/bàn học cạnh chủ, **không làm ồn**. |
| **Xem phim Sofa (`V0.4`)** | Nhảy lên / ngồi cạnh sofa ngủ hoặc ngắm màn hình cùng cặp đôi. |
| **Làm vườn (`V0.2.1`)** | Tự đi theo ra sân vườn đuổi bướm, ngửi khóm hoa mới trồng. |
| **Câu cá bên ao (`V0.2.2`)** | Ngồi bệt trên cỏ/cầu gỗ nhìn phao câu háo hức. |
| **Nấu ăn trong Bếp (`V0.3`)** | Lảng vảng quanh quầy bếp hít hà mùi cá/súp (`curious / glutton`). |
| **Trang trí / Đặt đồ mới** | Đánh dấu đồ mới vừa đặt (`newly_placed`) → chạy tới ngửi & thám hiểm. |
| **Trở về nhà sau offline** | Chạy ra phía cửa chính / cổng đón chủ kèm emote tim & meo nhẹ. |
