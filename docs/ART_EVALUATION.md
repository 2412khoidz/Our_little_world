# Đánh giá Mỹ thuật & Kiểm kê Asset — Our Little World

*Ngày lập báo cáo: 25/11/2026*
*Mục tiêu: Kiểm kê toàn bộ bộ asset miễn phí đã tải, chống trùng lặp bằng SHA-256, kiểm tra bản quyền web/PWA, dựng 4 bản demo mỹ thuật độc lập (Demo A, B, C, D) với nội thất + khu vườn + Mây + Nắng + thú cưng, và đánh giá khả năng mở rộng gameplay trước khi chốt art direction.*

---

## 1. Kiểm kê file & kiểm tra trùng lặp SHA-256

Nguồn quét là thư mục tải về của phiên đánh giá. Để chạy lại, truyền thư mục nguồn qua `OLW_ART_DOWNLOADS_DIR` hoặc dùng `asset-candidates/downloads/`.
Tổng số file phát hiện: **17 file** (**15 SHA-256 duy nhất**, **2 bản trùng hoàn toàn**). Toàn bộ file gốc, file giải nén, contact sheet và screenshot xem trước được giữ cục bộ trong `asset-candidates/` (đã thêm vào `.gitignore`, tuyệt đối không commit lên Git công khai và không đóng gói vào `dist/`).

| # | Tên file | Kích thước | SHA-256 (8 ký tự đầu) | Trạng thái | Ghi chú |
|---:|---|---:|---|---|---|
| 1 | `Cozy Farm Free.zip` | 15,248 B | `2c1aa3ed...fba19feb75` | Đã giải nén (`1/1` PNG) | Demo A (ngoại thất) |
| 2 | `free_version.zip` | 15,248 B | `2c1aa3ed...fba19feb75` | **Bỏ qua (Trùng)** | Trùng SHA-256 hoàn toàn với `Cozy Farm Free.zip` |
| 3 | `Cozy Interior Free.zip` | 5,678 B | `b1b524c8...fec5453a7e` | Đã giải nén (`1/1` PNG) | Demo A (nội thất) |
| 4 | `char free.zip` | 7,603 B | `04bcc924...72b353c59` | Đã giải nén (`1/1` PNG + 2 GIF) | Demo A — Cozy People Free (`global.png` 256×384) |
| 5 | `Sprout Lands - Sprites - Basic pack.zip` | 306,593 B | `72b607a2...6ccf899c4895` | Đã giải nén (`40/40` PNG) | Demo B (cốt lõi) |
| 6 | `Sprout_Lands_-_Sprites_-_Basic_pack.zip` | 306,593 B | `72b607a2...6ccf899c4895` | **Bỏ qua (Trùng)** | Trùng SHA-256 hoàn toàn với `Sprout Lands - Sprites - Basic pack.zip` |
| 7 | `Sprout Lands - UI Pack - Basic pack.zip` | 143,623 B | `d699a719...8e06ecec34` | Đã giải nén (`45/45` PNG) | Demo B (UI pastel) |
| 8 | `Sprout Sorry pack.zip` | 1,321,098 B | `10542ef2...5c63034f4f` | Đã giải nén (`131/131` PNG) | Demo B — Cherry Blossom, nội thất mới, nhà đèn vàng, picnic, cá, ếch |
| 9 | `Cozy_Lands_Basic_v1.25.zip` | 193,698 B | `35908d45...ca7b568b0` | Đã giải nén (`85/85` PNG) | Demo D (ngoại thất tương thích) |
| 10 | `Cute_Fantasy_Free.zip` | 54,914 B | `88997e9d...080f47f0` | Đã giải nén (`23/23` PNG) | Đánh giá đối chiếu ngoại thất |
| 11 | `Modern_Interiors_Free_v2.2.zip` | 1,100,882 B | `1e38aae8...53fba7f0` | Đã giải nén (`59/64` PNG) | Demo D (nội thất + `Adam` & `Amelia`); bỏ bản upscale 32x/48x & RPG Maker |
| 12 | `Sunnyside_World_ASSET_PACK_V2.1.zip` | 11,326,185 B | `1e282df4...71469669` | Đã giải nén (`396/5835` PNG) | Demo C (bỏ cây Gamemaker UUID trùng lặp & `__MACOSX`) |
| 13 | `Sunnyside_World_ARCHIVED_ASSETS.zip` | 10,900,488 B | `18f19fd7...d224aa86` | Bỏ qua giải nén | Bản cũ hơn, đã có V2.1 |
| 14 | `sunnyside_world_chatacter_anim_human_v1.0.aseprite` | 414,228 B | `95eca626...fc731708` | Chép file nguồn tham chiếu | File nguồn `.aseprite` nhân vật Sunnyside |
| 15 | `Ninja_Adventure_-_Asset_Pack.zip` | 94,022,790 B | `95a06f4f...37df62a7b15` | Đã giải nén (`1835/1915` PNG) | Đánh giá CC0 (Tileset, Actor, Items, UI) |
| 16 | `Godot_Project_V4.zip` | 32,050,262 B | `1872e1a3...52850a2208` | Bỏ qua giải nén | Project ví dụ Godot của Ninja Adventure |
| 17 | `free_pets_pack_frakassets.zip` | 20,402,864 B | `e70d1a99...34264f31` | Đã giải nén (`180/720` PNG) | Lớp thú cưng 4 hướng 16px/32px top-down (`CC BY 4.0`) cho cả 4 demo |

---

## 2. So sánh 10 bộ asset (Mỹ thuật, Tỷ lệ, Nhân vật & Bản quyền Web/PWA)

| Bộ Asset | Tác giả | Tỷ lệ tile / Nhân vật | Phong cách & Palette tiêu biểu | Hỗ trợ 4 hướng & Tùy biến | Nội thất | Giấy phép bản Free (Web/PWA & Repo công khai) |
|---|---|---|---|---|---|---|
| **Cozy Farm / Interior / People Free** | shubibubi | 16×16 / Nhân vật 32×32 (dáng 12×20px) | Pastel nâu-rêu ấm (`#83924c`, `#634b3a`, `#dea48a`), viền mềm | 4 hướng (paper-doll tách lớp thân/tóc/áo/quần/giày) | Rất ít ở bản free (1 sheet 160×80) | Phi thương mại cá nhân; **cấm** redistribute trên repo công khai |
| **Sprout Lands (Basic + UI + Sorry)** | Cup Nooble | 16×16 / Nhân vật 48×48 (chibi ~14×16px) | Pastel kem-hồng-xanh dịu (`#c0d470`, `#e8b7ac`, `#f3f4e7`) | 4 hướng + action cuốc/tưới/câu cá; phối màu hoặc tự sửa được | Đầy đủ gỗ/pastel/thảm/đèn/kệ sách | Phi thương mại, cho phép mã nguồn mở kèm ghi chú credit `Cup Nooble`, **cấm** redistribute pack gốc |
| **Sunnyside World v2.1** | Daniel Diggle | 16×16 / Nhân vật 96×64 (khung ~14×18px) | Sáng rực pastel ấm (`#c58a63`, `#63c74d`, `#e8ad7d`), hoạt ảnh mượt | **Chỉ 2 hướng ngang** (Trái/Phải flip); có sẵn tóc `short/long/curly/bowl/mop/spikey` tách lớp | Đồ đồng quê cơ bản (giường đơn, kệ sách, bàn, thảm đỏ) | **Dùng được cả thương mại miễn phí**, sửa được; **cấm** up nguyên pack gốc lên store/repo |
| **Cozy Lands Basic v1.25** | Amo-QAQ | 16×16 / Nhân vật 48×48 (dáng ~17×22px) | Pastel tươi, viền tối rõ (`#9ebd64`, `#d3644d`, `#7dabc3`) | `girl` đủ 9 hành động 4 hướng; `boy` có `idle`/`walk` 4 hướng | **Không có nội thất** ở bản Basic | Free: phi thương mại; Premium từ **$2.99** mở thương mại; **cấm** redistribute |
| **Modern Interiors Free v2.2** | LimeZu | 16×16 / Nhân vật 16×32 (cao ~23px) | Chi tiết căn hộ hiện đại, sắc nét (`#3a3a50`, `#e0b870`, `#f8f8f8`) | 4 hướng mượt (idle 6f, run 6f, sit, phone) | **Xuất sắc nhất** (lò sưởi, sofa, rèm, đèn dây, máy tính, thảm) | Free: phi thương mại (~1% bản đầy đủ); bản Complete **$1.20–$2+**; **cấm** redistribute |
| **Cute Fantasy RPG (Free)** | Kenmi | 16×16 / Nhân vật 32×32 (~16×22px) | Xanh ngọc đậm phong cách RPG (`#5ac54f`, `#91533b`, `#3f2832`) | 4 hướng + action; 1 nhân vật nam mặc định | **Không có nội thất** ở bản Free | Free: phi thương mại; Premium ~**$3.99**; **cấm** redistribute |
| **Ninja Adventure** | Pixel-boy & AAA | 16×16 / Nhân vật 16×16 | Tương phản cao kiểu retro Action-RPG (`#a3754e`, `#141b1b`) | 4 hướng + 50+ nhân vật sẵn (hạn chế đổi tóc/áo từng món) | Khá đầy đủ kiểu Nhật / cổ điển | **CC0 1.0 Public Domain** — thương mại & repo công khai đều hợp lệ |
| **Free Pets Pack** | Frakassets | 16px / 32px / 48px / 64px top-down | Nét mượt có cả `outline` và `no-outline` dễ ghép mọi bộ art | 4 hướng (South/East/North/West) × `Idle`, `Walk`, `Happy`, `Sleep` + JSON | N/A (10 loài thú cưng) | **CC BY 4.0** — thương mại & public repo hợp lệ (chỉ cần ghi credit `Frakassets`) |

> **Lưu ý triển khai Web/PWA & Git:** Repo hiện tại đang đặt ở local; nếu đẩy mã nguồn lên GitHub **công khai (Public)**, chỉ có **CC0** (`Ninja Adventure`, starter assets) và **CC BY 4.0** (`Free Pets Pack` kèm credit) được phép nằm công khai trên Git. Toàn bộ pack miễn phí khác của Itch.io (`Sprout Lands`, `Modern Interiors`, `Cozy Farm/Interior`, `Cozy Lands`, `Cute Fantasy`, `Sunnyside World`) chỉ nên giữ ở private repo hoặc đóng gói vào bundle app web khi chạy, không tách file archive phân phối lại.

---

## 3. Đánh giá 4 bản Demo Mỹ thuật & Khả năng mở rộng gameplay tương lai

Mỗi bản demo đều có thể mở trực tiếp trên trình duyệt khi chạy `npm run dev`:
- `http://localhost:5173/?art-demo=A` — **Demo A:** Cozy Farm + Cozy Interior + Cozy People + `cat-orange`
- `http://localhost:5173/?art-demo=B` — **Demo B:** Sprout Lands Basic + UI + Sorry Pack + `puppy-shiba`
- `http://localhost:5173/?art-demo=C` — **Demo C:** Sunnyside World v2.1 + `bunny-white` (+ cừu, gà, vịt)
- `http://localhost:5173/?art-demo=D` — **Demo D:** Modern Interiors Free + Cozy Lands Basic + `cat-orange` & `puppy-shiba`

Trong UI xem thử có sẵn tab chuyển `Demo A | Demo B | Demo C | Demo D` và nút góc nhìn `Toàn cảnh | Trong nhà | Ngoài vườn`.

### Bảng chấm điểm mở rộng gameplay (Thang 1–5 dựa trên asset miễn phí hiện có)

| Tính năng tương lai | Demo A (`Cozy Series Free`) | Demo B (`Sprout Lands + Sorry`) | Demo C (`Sunnyside World v2.1`) | Demo D (`Modern Interiors + Cozy Lands`) |
|---|---|---|---|---|
| **Trồng trọt (Farming)** | 3/5 (cà chua, khoai, túi hạt) | **5/5** (đất tưới ướt, nhiều cây, ong mật, anh đào) | **5/5** (78 sprite cây trồng 6 giai đoạn, cối xay gió) | 4/5 (Cozy Lands có bắp cải, hành, khoai, củ cải, xô tưới) |
| **Câu cá (Fishing)** | 1/5 (không có nước/cần câu) | **5/5** (`Ocean Pack` có animation quăng cần 4 hướng & nhiều cá) | 4/5 (`CASTING`/`REELING` đủ frame nhưng 2 hướng ngang) | 3/5 (`Cozy Lands` có cần câu & icon cá, chưa có animation câu) |
| **Nấu ăn (Cooking)** | 1/5 (chỉ có 1 bếp nhỏ) | **3/5** (bánh mì, mật ong, bánh picnic, thiếu bếp hiện đại) | 2/5 (lửa trại, nguyên liệu thô, thiếu gian bếp) | 3/5 (có bánh ngọt, bàn ăn; bản free thiếu tủ lạnh/bếp nấu) |
| **Nuôi thú cưng (Pets)** | **5/5** (ghép mượt `Free Pets Pack`) | **5/5** (gà + ếch + cá + `Free Pets Pack`) | **5/5** (cừu, gà, vịt, chim, bò + `Free Pets Pack`) | **5/5** (gà Cozy Lands + `cat-orange` & `puppy-shiba`) |
| **NPC & Cửa hàng** | 2/5 (paper-doll sửa được màu nhưng thiếu quầy hàng) | 4/5 (UI khung gỗ có sẵn, nhà Village Pack nhỏ xinh) | 4/5 (rất mạnh về NPC tóc tách lớp + UI nông trại) | **5/5** (Modern Interiors sinh ra cho tiệm/quầy/nội thất; Adam/Alex/Amelia/Bob) |
| **Tùy chỉnh nhân vật** | **4/5** (`global.png` tách lớp 4 hướng, dễ phối màu) | 3/5 (4 hướng chuẩn nhưng bản free chỉ 1 áo/tóc cố định) | **4/5** (nhiều kiểu tóc tách lớp sẵn, **trừ điểm chỉ 2 hướng L/R**) | 3/5 (4 người tạo sẵn rất đẹp; muốn tự đổi từng kiểu tóc cần vẽ/ghép) |
| **Mở rộng nhà nhiều phòng** | 2/5 (bản free chỉ 1 bộ tường/sàn nhỏ) | **4/5** (tường gỗ + nhiều rương + 4 tông màu nội thất) | 2/5 (chủ yếu đồ cắm trại/nông trại, ít phòng chức năng) | **5/5** (`Room_Builder` sinh ra để mở rộng nhiều phòng hiện đại) |

---

## 4. Những gì còn thiếu ở bản Free & Gói Premium giải quyết chính xác

Theo nguyên tắc **ưu tiên dùng miễn phí trước**, bảng dưới đây chỉ rõ giới hạn thực tế của từng bản Free và đường nâng cấp rẻ nhất nếu về sau dự án cần mở rộng:

| Hướng Mỹ thuật | Thiếu hụt ở bản Free hiện có | Gói Premium giải quyết trực tiếp | Chi phí ước tính (Itch.io) |
|---|---|---|---|
| **Demo A — Cozy Series (shubibubi)** | `Cozy Interior Free` chỉ là mẫu nhỏ (160×80, thiếu giường ngủ, tủ lạnh, bếp, sofa, đèn đứng); `Cozy Farm Free` thiếu ao nước, cầu gỗ, hàng rào, animation câu cá; `Cozy People Free` thiếu thêm nhiều kiểu tóc/váy nữ. | • **Cozy Interior** (Full)<br>• **Cozy Farm** (Full)<br>• **Cozy People** (Full) | ~\$3–\$5 / gói (~**\$10–\$15** trọn bộ 3 gói) |
| **Demo B — Sprout Lands (Cup Nooble)** | Bản Free + Sorry Pack đã cực kỳ đầy đủ (~85% nhu cầu V0.1–V0.5!), chỉ thiếu: tùy biến nhiều kiểu tóc/váy cho nhân vật, nội thất bếp nấu chi tiết (bếp gas, bồn rửa) và góc giải trí/Cinema hiện đại (tivi màn hình lớn/sofa dài). | • **Sprout Lands - Sprites - Complete / Premium** (bổ sung animation + vật phẩm)<br>• Nếu làm phòng Cinema hiện đại có thể tự pixel thêm chiếc TV/máy chiếu mang màu pastel Sprout Lands (0 đồng) hoặc vẽ thêm tóc/phụ kiện cho 2 nhân vật của Mây & Nắng. | \$0 để đi xa đến V0.3–V0.4; hoặc **~\$10** bản Complete nếu cần bản thương mại |
| **Demo C — Sunnyside World (Daniel Diggle)** | Thiếu di chuyển 4 hướng đầy đủ (nhân vật quay L/R thôi, nhìn thẳng lưng/mặt chưa có), thiếu nội thất sinh hoạt hiện đại trong nhà (sofa, bếp, tủ quần áo, phòng tắm, góc xem phim). | Ngay cả bản đầy đủ của Sunnyside World vẫn giữ lối đi 2 hướng ngang theo thiết kế gốc → muốn 4 hướng & nội thất phòng hiện đại phải tự vẽ thêm hoặc dùng bộ khác cho trong nhà. | **\$0** (bản hiện có đã cho phép cả thương mại) |
| **Demo D — Modern Interiors (LimeZu) + Cozy Lands (Amo-QAQ)** | `Modern Interiors Free` (~1% bản full) **chỉ có mẫu ít ỏi**: thiếu giường ngủ đôi thực thụ (phần top bản free toàn đồ nhà tắm), thiếu bếp nấu + tủ lạnh + bàn ăn dài, thiếu TV/máy chiếu rạp phim, thiếu nhiều kiểu nhân vật để ghép Mây/Nắng. `Cozy Lands Basic` không có nội thất và bản free cấm thương mại. | • **Modern Interiors Complete (`LimeZu`)**: giải quyết 100% thiếu hụt phòng ngủ, nhà bếp, phòng tắm, rạp chiếu phim tại gia và công cụ Character Generator!<br>• **Cozy Lands Premium (`Amo-QAQ`)** (nếu cần thương mại hóa ngoại thất) | **\$1.20–\$2.50** (Modern Interiors Complete!) + ~**\$2.99** (Cozy Lands Premium — không bắt buộc ngay nếu chưa thương mại) |

---

## 5. Đề xuất lựa chọn cho Our Little World

1. **Phương án Tốt nhất 100% Miễn phí (0 đồng): chọn `Demo B — Sprout Lands (Basic + UI + Sorry Pack) + Free Pets Pack (Frakassets)`**
   - Lý do: Độ đồng nhất **cao nhất**, không cần ghép chắp vá từ nhiều tác giả khác nhau. Vừa có ngôi nhà ấm áp, cây anh đào nở hoa, thảm picnic đôi, ao cá + ếch + cần câu, làm nông + ong mật, lại vừa nhẹ nhàng, nữ tính/dễ thương đúng chất **cozy couple**. Hai nhân vật Mây & Nắng có thể tự tinh chỉnh thêm kiểu tóc/màu áo dựa trên sprite gốc (được phép trong license của Cup Nooble miễn không phân phối lại pack gốc).

2. **Phương án Nâng tầm "Căn hộ + Vườn" siêu chi tiết (0 đồng trước, hoặc nâng cấp chỉ ~\$1.20–\$2 về sau): chọn `Demo D — Modern Interiors (LimeZu) + Cozy Lands Basic + Free Pets Pack`**
   - Lý do: Nếu bạn và Nắng thích cảm giác **"căn hộ ấm cúng của hai đứa"** — có lò sưởi, sofa, rèm cửa, góc xem phim V0.4, bàn làm việc học chung, tủ bếp — thì **LimeZu Modern Interiors** vượt trội mọi đối thủ. Ghép cùng ngoại thất pastel có viền sắc nét của **Cozy Lands Basic** và thú cưng **Free Pets Pack** tạo sự liền mạch rất tốt về tỷ lệ (~22–23px), và nếu sau này cần đầy đủ bếp/giường/TV, chi phí mở khóa trọn bộ LimeZu cũng thấp nhất (**từ ~\$1.20**).

Đây là báo cáo so sánh A–D trước quyết định cuối. Hướng mỹ thuật hiện hành là [Demo E — Unified Cozy World](art/ART_DIRECTION.md), đã duyệt theo [ADR-008](DECISIONS.md#adr-008-demo-e--unified-cozy-world-là-định-hướng-mỹ-thuật-chính-thức). Mức giá trong đánh giá là snapshot lịch sử.
