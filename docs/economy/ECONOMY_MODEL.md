# Mô hình Định giá & Phản biện Toán học (`ECONOMY_MODEL`)

*Tách bạch công thức thiết kế riêng của Our Little World khỏi lý luận Marx gốc, bảo đảm cân bằng game và chống lỗi số học.*

---

## 1. Công thức Giá trị Cơ sở & Phản biện Sửa đổi

Khởi điểm từ mô hình đề xuất:

$$V_i = \sum_{j} a_{ij} \cdot V_j + w \cdot L_i + D_i$$

Trong đó:
- $V_i$: **Giá trị cơ sở** (*Base Value*) của đơn vị hàng hóa $i$ (dùng để tham chiếu cân bằng, làm tròn về số nguyên xu hoặc bội số cấu hình).
- $a_{ij}$: Định mức nguyên liệu $j$ tiêu hao chuẩn cho 1 mẻ sản xuất chia sản lượng thu được (`qty`).
- $L_i$: **Thời gian/nỗ lực lao động chuẩn** (*Standard Active Labor*), đo bằng số phút tương tác thực tế trung bình theo thiết kế công thức (**không** đo bằng đồng hồ thực tế của người chơi cụ thể).
- $w$: Hệ số quy đổi lao động chuẩn ($w = 5\text{ xu / đơn vị lao động chuẩn}$ trong bảng thử nghiệm).
- $D_i$: Phần phân bổ **tư liệu sản xuất & vốn chu kỳ** (hao mòn công cụ/chăm cây lâu năm).

### 5 Điểm Phản biện & Tinh chỉnh Bắt buộc
1. **Không dùng thời gian thao tác cá nhân để tính giá:** Nếu người chơi A cắt rau mất 15s còn người chơi B mất 30s, giá trị món ăn vẫn dựa theo **$L_i$ chuẩn** (người thao tác cẩn thận đạt *chất lượng sao* tốt hơn chứ không tự nhiên nhân đôi giá gốc chỉ vì chậm).
2. **Không cộng toàn bộ thời gian chờ mọc (`growMin`) vào $L_i$:** Cây mọc 120 phút khi người dùng khóa máy đi ngủ **không phải 120 phút lao động**. Trái lại, để bù chi phí cơ hội chiếm ô đất, thị trường áp dụng phần bù chu kỳ giảm dần (tham chiếu `harvest-hollow` dùng lũy thừa `min^0.45` khi `> 60m`) ở tầng **giá giao dịch** chứ không thổi phồng `L_i`.
3. **Vật phẩm mua shop ($a_{ij}$ đầu vào):** Hạt giống/gia vị mua từ cửa hàng dùng trực tiếp giá mua chuẩn (`storeBuy`) làm $V_j$ đầu vào trong công thức tính $V_i$ của nông sản/món ăn để bảo đảm bảo toàn giá trị nguyên liệu tái đầu tư.
4. **Tách Giá trị Cơ sở ($V_i$) khỏi Giá Giao dịch ($P_i$):**
   $$P_i = \text{round}\big(P_{\text{base}}(i) \cdot q(\text{quality}) \cdot m(\text{demand}, \text{season}) \cdot s(\text{saturation})\big)$$
   - `q(quality)`: `normal = 1.0`, `silver = 1.25`, `gold = 1.55`.
   - `m(demand, season)`: đơn đặt hàng NPC trả `1.35x – 1.70x`; đúng mùa vụ `+15%`.
   - `s(saturation)`: giảm mềm tối đa `-30%` khi bán dồn cùng 1 món quá ngưỡng ngày/tuần, tự hồi phục dần (**không khóa cứng hay phá sản**).
5. **Chế biến không bắt buộc lúc nào cũng lãi xu cao hơn bán thô:** Ví dụ *Bột mì (`flour`, $V=19$, bán lẻ `17c`)* hay *Bó hoa anh đào (`sakura_bouquet`, $V=93$, bán lẻ `100c`, lãi ròng `+9c` sau nguyên liệu)* được thiết kế để tạo giá trị sử dụng cho **Nấu ăn `★★★`**, **Đơn hàng NPC (`1.5x+`)**, hoặc **Tặng quà đối phương**, tránh mọi công thức biến thành máy in tiền một chiều.

---

## 2. Quy chuẩn Số học Server-Side (Bài học từ `harvest-hollow`)
- Giá cam kết dùng xu nguyên và basis points. Làm tròn xuống sau mỗi phép nhân hệ số, theo thứ tự chất lượng → nhu cầu/mùa → bão hòa. TS và SQL dùng cùng vector kiểm thử, kể cả lô qua ngưỡng. Công thức giá phía trên là giá tham chiếu thiết kế.
- **Kiểm tra resale và arbitrage:** Mọi nguyên liệu bán ở cửa hàng NPC đều tuân thủ $P_{\text{storeBuy}}(j) \ge 2.0 \times P_{\text{sell}}(j)$ (hoặc không bán trực tiếp thành phẩm cao cấp) để không thể *"mua shop → chế biến 0 giây → bán lại kiếm lời vô hạn"*.

Quy tắc giá mua/bán chỉ chặn vòng bán lại trực tiếp. Simulator kiểm tra cả chu trình qua nhiều SKU/công thức và có case đối chứng tạo lãi vô hạn.
