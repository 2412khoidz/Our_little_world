# Định hướng Mỹ thuật Chính thức — Our Little World (`Demo E: Unified Cozy World`)

*Cập nhật: 25/11/2026 · Tham chiếu kết quả kiểm kê SHA-256 và đối chiếu 10 pack tại [ART_EVALUATION.md](../ART_EVALUATION.md) (không lặp lại dữ liệu inventory).*

---

## 1. Bản sắc Mỹ thuật Hợp nhất (Unified Art Direction)

- **Chủ đạo (Backbone):** **Sprout Lands** (Cup Nooble) — *cozy pastel cottagecore*, đường viền mềm ấm, màu cỏ xanh dịu (`#c0d470` / `#a4c263`), anh đào hồng, ao nước chuyển tiếp hữu cơ, cảm giác lãng mạn và ấm cúng cho tổ ấm hai người mà không quá trẻ con.
- **Mảnh ghép hợp nhất có chọn lọc trong Demo E (`?art-demo=E`):**
  - **Nội thất & kiến trúc phòng:** *Modern Interiors Free (LimeZu)* — tường kem chân gỗ (`Room_Builder`), sàn gỗ xương cá + gạch mosaic khu học, sofa dài, lò sưởi gạch, bàn trà, bàn ăn, tủ lạnh, quầy trái cây, kệ sách đôi, bàn học hai chỗ, dây đèn, TV/màn hình cinema tương lai; kết hợp nét ấm từ *Sprout Lands* (giường đôi xanh/hồng, thảm thú cưng, tranh treo, lửa bập bùng) và bát gốm thú cưng từ *Sunnyside World*.
  - **Cảnh quan & vườn:** *Sprout Lands Basic + Sorry Pack* (cỏ 12 biến thể hữu cơ, bờ hồ bo góc autotile + mặt nước 4 frame, sen/bèo/cầu gỗ/ếch, đường đất viền 9-slice, cây anh đào, picnic, chòi mái hồng, tổ ong) + *Cozy Lands Basic* (bồn hoa gỗ, hộp thư trước cổng) + *Sunnyside World* (hoa hướng dương/củ cải/bắp cải, cừu, vịt, cối xay gió).
  - **Thú cưng sống động:** *Free Pets Pack (Frakassets, CC BY 4.0)* — mèo cam `cat-orange` trong góc thú cưng và chó `puppy-shiba` ngoài vườn.

---

## 2. So sánh Hệ thống Nhân vật Chính & Kiến trúc Avatar V0.1

Kiểm tra trực tiếp file spritesheet nguồn cho thấy bản miễn phí của từng pack có khả năng animation khác nhau rõ rệt:

| Ứng viên Avatar | Kích thước / Chiều cao | Animation có sẵn trong bản Free | Khả năng tách lớp & đổi màu V0.1 | Độ hợp đồ nội thất & ngoại thất | Đánh giá chọn cho Demo E |
|---|---|---|---|---|---|
| **Modern Interiors Free** (`Adam`, `Alex`, `Amelia`) | Cell `16×32`, dáng người `~16×23px` | **Đủ 4 hướng thực thụ:** `idle` (6f), `run` (6f), `sit` (24f), `phone` (9f) | **Xuất sắc (qua palette-remap):** Tóc, da và áo tách biệt hoàn toàn mã RGB (`#3a3a50` giữ làm viền) | Rất chuẩn với bàn học, sofa, bàn ăn, nhà ở & cân đối ngoài vườn Sprout/Cozy | **CHỌN LÀM RIG CHÍNH** |
| **Cozy People Free** (`global.png` + GIF) | Cell `32×32`, dáng `~12×20px` | Bản Free chỉ cung cấp `char_walk_left.gif` & `char_walk_right.gif` (**chỉ đi 2 hướng ngang**, chưa có đi thẳng lên/xuống) | **Rất tốt** (tách sẵn 6 hàng: thân, tóc, áo, quần, giày, mũ) | Hơi nhỏ khi đứng cạnh nội thất `16×32` của Modern Interiors | Không chọn làm rig chính ở bản Free; giữ làm nguồn NPC / phiên bản mở rộng tương lai nếu nâng cấp |
| **Sprout Lands** (`Basic Charakter`) | Cell `48×48`, dáng chibi `14×16px` | 4 hướng `walk`/`idle` + `Actions` cuốc/tưới + `Ocean Pack` câu cá | Chỉnh màu tổng thể dễ nhưng chỉ 1 dáng tai thú mặc định, khó tách tóc ngắn/bob/dài như V0.1 | Quá lùn khi đứng bên cạnh bàn học/bếp Modern Interiors | Không chọn làm nhân vật cặp đôi chính (vẫn tận dụng sprite câu cá làm tham chiếu thiết kế) |
| **Sunnyside World** (`Human/`) | Cell `96×64`, dáng `14×18px` | Cực mượt (9–10f): `idle`, `walk`, `run`, `water`, `dig`, `cast`, `carry` | Tách sẵn 6 kiểu tóc (`shorthair`, `longhair`, `curlyhair`...) | **Hạn chế cứng: chỉ đi 2 hướng ngang** (flip Trái/Phải), thiếu mặt thẳng lên/xuống | Dùng làm bộ chuẩn NPC/nhân công nông trại hoặc tham khảo frame animation |

### Kiến trúc Avatar Chính Xuyên suốt (`unifiedAvatarBuilder.ts`)
- Sử dụng `Adam` (`short`), `Alex` (`bob`) và `Amelia` (`long`) của *Modern Interiors Free* làm **rig chuẩn 4 hướng 16×32**.
- Khi dựng sprite trong Phaser bằng Canvas (`createCanvas`), giữ nguyên đường viền `#3a3a50`/`#46465e` và thay thế chuẩn theo từng dải sắc độ cho **`skinTone` (`fair`/`warm`/`tan`)**, **`hairColor` (`espresso`/`chestnut`/`honey`/`sakura`)**, **`outfitColor` (`rose`/`sage`/`cream`/`sky`)**; đồng thời vẽ thêm 1–2px chi tiết cho **`outfitStyle` (`sweater`/`overall`/`cardigan`)** và **`accessory` (`glasses`/`ribbon`)**.
- Nhờ vậy toàn bộ hệ thống tùy chỉnh ngoại hình đã lưu trong Supabase `profiles.avatar_config` ở V0.1 **được giữ nguyên 100% không mất trường dữ liệu nào**.

---

## 3. Danh sách Asset Đã Chọn cho Demo E & Quy mô Bố cục

| Khu vực / Vai trò | Semantic IDs tiêu biểu | Nguồn Pack | Ghi chú sử dụng |
|---|---|---|---|
| Cỏ nền hữu cơ (12 ô) & Bờ hồ bo cong autotile | `e-grass` (`grass_v0..11`, `shore_*`) | Sprout Lands Basic | Rải theo hash chống lặp ô bàn cờ |
| Nước ao animation, cầu gỗ dọc, đường đất bo góc 9-slice | `e-water`, `nature.bridge_wood`, `e-dirt-wide` | Sprout Lands Basic | Đường đất có grass corner tự nhiên |
| Cây anh đào, bèo sen hồng, picnic, chòi nhỏ, tổ ong, lửa | `nature.sakura_tree`, `e-picnic-*`, `nature.cottage_pastel`, `e-fire` | Sprout Sorry Pack | Kết hợp lò sưởi tạo lửa sống động |
| Kiến trúc tường/sàn + 6 khu nội thất & 3 avatar rig | `wall.*`, `floor.*`, `furn.*`, `e-rig-*` | Modern Interiors Free | TV/Cinema, 2 bàn học, bếp/tủ lạnh, sofa |
| Bồn hoa gỗ & Hộp thư đỏ trước sân | `nature.planter_box`, `nature.mailbox_red` | Cozy Lands Basic | Gắn kết lối đi trước cửa |
| Hoa hướng dương, củ cải, bắp cải, vịt, cừu, cối xay gió, bát thú cưng | `furn.pet_bowl_*`, `nature.bench_garden`, `e-sunflower`, `e-sheep`, `e-windmill` | Sunnyside World v2.1 | Vịt bơi hồ, bát ăn góc pet |
| Mèo cam ngủ trong nhà & Shiba Inu ngoài vườn | `e-cat`, `e-shiba` | Free Pets Pack | Chuẩn 16px `outline` đồng bộ viền |

### Phân vùng Gameplay Tương lai trong Tổ ấm 6 Khu & Khu vườn
- **Phòng ngủ (Góc trên trái):** Nghỉ ngơi, chúc ngủ ngon, đồng bộ lịch ngủ / trạng thái cặp đôi.
- **Phòng khách & TV/Cinema (Giữa nhà):** Xem phim chung V0.4 (Watch Together), ngồi sofa sưởi ấm, ngắm bánh trà.
- **Góc học tập 2 bàn (Góc trên phải):** Chế độ học / làm việc cùng nhau (Pomodoro / Focus Room V0.2+).
- **Khu Bếp & Bàn ăn (Góc dưới trái):** Mini-game nấu ăn từ nguyên liệu thu hoạch ngoài vườn & ăn chung.
- **Góc Thú cưng (Góc dưới phải):** Cho mèo/chó ăn uống (hai bát gốm), chải lông, mua giường thú cưng mới.
- **Khu vườn lãng mạn:** Vườn hoa anh đào picnic (kỷ niệm / hẹn hò), ao cá + cầu gỗ (câu cá), ô đất trồng cây (farming), vùng mở rộng chuồng nuôi & cây ăn quả phía hai cánh.

---

## 4. Kiểm tra Bản quyền Chi tiết Cho Vận hành Thực tế (Web/PWA)

| Bộ Asset | Quyền dùng trong game | Quyền sửa / đổi màu | Yêu cầu ghi nguồn (Credit) | Quyền deploy Web/PWA (riêng tư 2 người) | Quyền tách / phân phối spritesheet | Commit vào GitHub công khai |
|---|---|---|---|---|---|---|
| **Sprout Lands** (Basic / UI / Sorry) | Phi thương mại hợp lệ | **Có** (cho phép tự chỉnh/vẽ theo phong cách) | **Bắt buộc** (`Cup Nooble`) | **Có** (ứng dụng/web game hoàn chỉnh) | **Cấm** redistribute file pack gốc | Được phép mã nguồn mở kèm ghi chú credit nhưng **không được đưa nguyên gói pack để tải lại** → giữ pack ngoài repo công khai |
| **Modern Interiors Free** | Phi thương mại hợp lệ | **Có** (cho phép sửa/recolor phi thương mại) | Không bắt buộc nhưng nên ghi `LimeZu` | **Có** (phi thương mại) | **Cấm** bán hoặc phân phối lại sprite | **Không commit** file PNG gốc lên repo GitHub công khai |
| **Cozy Lands Basic** | Phi thương mại hợp lệ | **Có** | Khuyến khích ghi `Amo-QAQ` | **Có** | **Cấm** redistribute | **Không commit** file PNG gốc lên repo công khai |
| **Sunnyside World v2.1** | **Thương mại & Phi thương mại** | **Có** | Khuyến khích ghi `Daniel Diggle` | **Có** | **Cấm** phân phối lại pack gốc | **Không commit** nguyên pack lên repo công khai |
| **Free Pets Pack** | **Thương mại & Phi thương mại** | **Có** (`CC BY 4.0`) | **Bắt buộc** (`Frakassets`) | **Có** | Được chia sẻ nếu ghi credit | **Được phép** đưa sprite đã dùng + `LICENSE.txt` lên Git công khai |

> **Kết luận bản quyền quan trọng:** Toàn bộ các file từ Itch.io non-commercial (`Sprout Lands`, `Modern Interiors`, `Cozy Lands`, `Sunnyside World`) chỉ lưu trữ ở repo **Private** (hoặc CDN/bucket private khi build) — tuyệt đối **không** đưa thư mục `asset-candidates/`, file `.zip` hay `.aseprite` vào `public/`, production `dist/` hay GitHub Public repo. Khi lên production chính thức, chỉ trích xuất đúng những sprite đã chọn lọc thành atlas tối ưu (chỉ vài trăm KB) vào thư mục được kiểm soát bản quyền riêng.

---

## 5. Tài nguyên & Animation Còn Thiếu — Đề xuất Mua Sắm (Nếu Cần)

### A. Animation & Asset còn thiếu cần bổ sung dần về sau
1. **Animation nhân vật mới (chưa có trong bản Free của Modern Interiors):**
   - `water` (cầm bình tưới cây 4 hướng)
   - `cook` (nấu bếp / thái đồ)
   - `fish` (câu cá bên cầu gỗ)
   - `sleep` (nằm trên giường đôi)
   - `hug` / `hold_hands` (ôm, nắm tay tương tác cặp đôi đặc trưng của Our Little World)
   - `pet_cuddle` (cúi xuống vuốt ve / chơi với mèo, Shiba)
2. **Đồ nội thất mở rộng cho các bản V0.2–V0.5:**
   - Góc bếp sâu hơn (bếp lò/bếp từ, bồn rửa chén, tủ bát treo).
   - Bộ sưu tập TV rạp chiếu phim tại gia (màn chiếu lớn, máy chiếu, gối lười).
   - Phòng tắm, ban công trang trí và nhiều loại phụ kiện tóc/váy đôi mới.

### B. Đề xuất chi phí thực tế (Vẫn giữ ưu tiên 0đ trước)
- **Giai đoạn V0.1 → V0.2 (Khuyến nghị: `0₫`):** Hoạt động hoàn hảo bằng chính tập hợp **Demo E** hiện tại — không cần mua gì thêm để bắt đầu áp dụng vào nhà chính cho hai bạn sử dụng riêng.
- **Nâng cấp đáng tiền nhất về sau (`~$1.20–$2.50` một lần duy nhất):** Mua **Modern Interiors Complete (LimeZu)** khi triển khai nhà bếp chuyên sâu, phòng ngủ đa dạng, phòng Cinema V0.4 và mở công cụ Character Generator đầy đủ của LimeZu.
- **Tùy chọn mở rộng ngoại thất (`$2.99`, chỉ cần nếu sau này công khai/thương mại hoặc muốn nhiều kiểu nhà):** Mua **Cozy Lands Premium** hoặc **Sprout Lands Premium**; không cần mua ở thời điểm hiện tại.
