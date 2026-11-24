# Thiết kế Kinh tế Hợp tác Gia đình — Our Little World (`ECONOMY_DESIGN`)

*Cơ sở lý luận (Marx + Kinh tế học Game Hiện đại) và mô hình sở hữu chung cho cặp đôi. Chưa triển khai production.*

---

## 1. Đối chiếu Lý luận Kinh tế Chính trị Marx & Thực tiễn Game Design

Nghiên cứu trực tiếp từ 3 văn bản kinh điển tại `marxists.org` (*Tư bản Quyển I Chương 1, Chương 3*; *Phê phán Cương lĩnh Gotha Phần I*):

| Khái niệm Marx (Nguồn & Mục) | Ý nghĩa lý luận gốc | Cách vận dụng hợp lý vào Our Little World (*Không đồng nhất máy móc*) |
|---|---|---|
| **Giá trị sử dụng (`Use-Value`) & Giá trị (`Value`)** (*Capital I, Ch.1, Sec.1*) | Tính hữu ích làm nên giá trị sử dụng (cho tiêu dùng, trang trí, chế biến); giá trị trao đổi thể hiện lao động kết tinh chung. | Phân tách **công dụng thực tế trong nhà** (bàn học ngồi đôi, hoa tặng, cá thả bể, món ăn hồi phục/tiệc) khỏi **giá trao đổi xu** khi bán ra chợ. |
| **Thời gian lao động xã hội cần thiết (`SNLT`)** (*Capital I, Ch.1, Sec.1*) | Lượng lao động trung bình cần để làm ra vật phẩm dưới điều kiện sản xuất bình thường, trình độ thông thường — không phải thời gian chủ quan của người làm chậm. | Giá trị cơ sở dùng thông số **`L_i` (lao động chuẩn của công thức/ao/luống)**; người chơi thao tác chậm hay để tab treo máy **không** được trả xu cao hơn (*xem `ECONOMY_MODEL.md`*). |
| **Tư liệu sản xuất (`Means of Production`)** (*Capital I, Ch.1 Sec.1 & Gotha I*) | Đất đai, công cụ, nguyên liệu truyền dần giá trị vào sản phẩm; thiên nhiên cùng lao động là nguồn của cải vật chất. | Cuốc, bình tưới, cần câu, bếp và luống đất là tư liệu sản xuất dùng chung của cặp đôi, có phần phân bổ hao mòn chuẩn `D_i` trong công thức mô phỏng. |
| **Lưu thông hàng hóa `H–T–H` (`C–M–C`)** (*Capital I, Ch.3, Sec.2: Selling in order to buy*) | Bán hàng hóa lấy tiền tệ (`Thước đo giá trị` & `Phương tiện lưu thông`) để mua hàng hóa khác có giá trị sử dụng mới. | Cặp đôi trồng/câu ra sản phẩm (`H`) → đổi NPC lấy xu (`T`) → mua hạt, nguyên liệu, nội thất, đồ cho mèo (`H'`). Tiền chỉ là phương tiện lưu thông, **không có tích lũy tư bản bóc lột**. |
| **Sở hữu chung & Phân phối** (*Critique of the Gotha Programme, Part I*) | Phản bác khẩu hiệu "toàn bộ sản phẩm lao động" đơn giản: trước khi chia dùng cá nhân phải trích **khấu trừ tái sản xuất** (bù tư liệu sản xuất tiêu hao, mở rộng sản xuất, dự trữ) và quỹ chung; giai đoạn cao hướng tới làm theo năng lực, hưởng theo nhu cầu. | Tài sản chung nuôi dưỡng căn nhà & mở rộng khu vườn; hai người cùng hưởng thành quả nhà đẹp và quà tặng nhau **mà không chấm điểm công sức**. |

> [!CAUTION]
> **Ranh giới học thuật bắt buộc:** Trong Our Little World **không tồn tại quan hệ thuê mướn sức lao động tư bản**. Do đó, phần chênh lệch giữa doanh thu bán hàng cho NPC và chi phí nguyên liệu **tuyệt đối không được gọi là "giá trị thặng dư" (*surplus value*)** theo nghĩa Marx; đây chỉ là *phần giá trị mới tạo thêm từ lao động chuẩn / biên độ cân bằng game (`net value added / margin`)*.

---

## 2. Mô hình Sở hữu Chung (Cooperative Household Model)

| Tài sản / Quyền hạn | Quy chế trong Thế giới 2 Người | Luật Bất biến |
|---|---|---|
| **Nhà, vườn & mở rộng** | Sở hữu chung của `world_id` | Cả hai đều được trang trí, mở rộng, trồng và thu hoạch tự do |
| **Công cụ sản xuất** | Dùng chung (`cuốc`, `bình tưới`, `cần câu`, `chảo`) | Nâng cấp 1 lần ở Thợ mộc là cả 2 cùng hưởng cấp mới |
| **Ví tiền (`world_wallet`)** | Một ví xu chung duy nhất | Chi tiêu đồng bộ atomic qua Postgres `FOR UPDATE` (**K2**) |
| **Kho hàng (`shared` inventory)** | Kho nông sản, cá, nguyên liệu, đồ trang trí chung | Đặt đồ hay nấu ăn lấy trực tiếp từ kho chung |
| **Túi cá nhân (`user` inventory)** | Mỗi người có 1 ngăn riêng nhỏ cho **quà bất ngờ, thư & bó hoa chưa tặng** | Chỉ chủ ngăn nhìn thấy trước khi gửi sang hộp thư đối phương (**K5**) |
| **Đóng góp lao động** | Tự phân công tự nhiên (*người thích câu cá, người thích trồng hoa/nấu ăn*) | **CẤM hiển thị bảng xếp hạng ai kiếm nhiều tiền hơn** |

---

## 3. Chống Bế tắc Kinh tế & Bảo vệ Người Chơi Casual

1. **Không thuế offline, không phí duy trì:** Nghỉ chơi 30 ngày không mất xu, không chết cây, không mất nhà.
2. **Chống kẹt khi ví `= 0` xu (`Anti-Deadlock`):**
   - **Hái lượm miễn phí (`wild_herb`, `wood_branch`)** dọc mép vườn tái sinh định kỳ (không cần vốn).
   - **Mồi giun đất miễn phí (`bait_free_worm`, `0₫`)** tại bờ ao câu cá cơ bản.
   - **Gói hạt giống cứu trợ miễn phí (từ V0.2.1)** (`3×seed_wheat`) nếu tổng giá trị thanh khoản quy ra xu của ví, hạt và nông sản bán được dưới ngưỡng tối thiểu `10` xu.
3. **Độc lập đời thường:** Mọi tiện ích tình cảm, học tập Pomodoro, nhật ký, album và Cinema vẫn hoạt động bình thường dù ví nhà = `0`.

Lối phục hồi V0.2.0 là hái thảo mộc miễn phí rồi bán qua Shipping Bin, kể cả lúc ví và kho trống. Câu miễn phí bổ sung ở V0.2.2. Xem [thị trường NPC](MARKET_AND_NPC.md#3-phục-hồi-khi-ví-và-kho-trống).
