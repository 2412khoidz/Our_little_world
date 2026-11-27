# Donor Asset Library Inventory (`M3a — C:\Users\admin\Downloads\items&farm`)

*Kiểm kê thực địa ngày 27/11/2026 trên `origin/main` (`e5de4ac`). Toàn bộ số liệu bên dưới được trích xuất trực tiếp từ 28 tệp gốc bằng Pillow + SHA-256 pixel hashing; không suy đoán từ tên file và không giữ pack thô trong `public/`.*

- **Chỉ mục máy đọc (Machine-Readable Inventory):** [asset-library-inventory.json](asset-library-inventory.json) (`267` canonical SKU mappings + `30` nhóm tài nguyên chưa dùng kèm đường dẫn, tọa độ `[x, y, w, h]`, phân loại ngữ nghĩa, tình trạng dùng & đề xuất tái sử dụng).
- **Contact Sheets trực quan (nằm ngoài tracked `public/`):** Thư mục `asset-candidates/m3a-contact-sheets/` (`gitignored`):
  - `01_frl_animals.png` — Toàn bộ `FarmRanchLife/04_Ranch_Animals/` (`9` loài + `bees_swarm`)
  - `02_frl_buildings_machines.png` — `14` máy chế biến, `21` công trình + bản tuyết, ranch props
  - `03_frl_tools_and_items_sample.png` — Công cụ & icon vật phẩm trong `FarmRanchLife`
  - `04_cooking_food_candidates.png` — Món ăn/nguyên liệu ứng viên cho V0.3 Cooking
  - `05_yoshino_gifts_flowers_bakery.png` — Hoa, quà, bánh ngọt, dango trong `Yoshino v1.3`
  - `06_mismatched_skus_review.png` — Đối chiếu trực quan các SKU ánh xạ sai hiện tại
  - `07_shikashi_and_replacements.png` — Các ô Shikashi đang ánh xạ sai (gà sống làm hạt mèo, bình máu làm ruy băng, áo giáp làm chăn...) & ứng viên thay thế (trà hoa `food-fleurman`, dầu ô liu `food-glitch`, trứng xanh...)

---

## 1. Số liệu Tổng hợp Sau Khử Trùng (Deduplication)

| Chỉ số | Giá trị xác minh | Ghi chú phương pháp |
|---|---:|---|
| **Tổng tệp trong `items&farm/`** | **28** | 27 archive `.zip` + 1 ảnh rời `crops.png` (`128×64`) |
| **Tổng sprite/frame PNG dùng được** | **10,840** | Đã lọc bỏ toàn bộ ảnh preview, background variants (`BG *`), bản đổ bóng (`Drop Shadow`, `shadow/`), `_sheets/`, `orig/` và stub `__MACOSX/` |
| **Vector `.svg` song song** | **383** | `food-glitch-scalable.zip` (`247`) + `food-ocal-scalable.zip` (`136`) — trùng nội dung với bản raster `.png` |
| **Sprite/frame PNG DUY NHẤT (pixel SHA-256)** | **8,079** | Tổng duy nhất sau khi khử trùng lặp giữa các pack |
| **Sprite nguồn duy nhất ĐANG DÙNG ở runtime** | **424** | Chỉ **`5.25%`** tổng kho pixel duy nhất đang được dùng thực sự (`items-16/32`, `workshops`, `crops-stages`, `trees-orchard`) |
| **Canonical SKUs trong catalog** | **267** | Ánh xạ vào `260` pixel-hash duy nhất (`7` cặp SKU bị trùng ảnh nhau hoàn toàn) |

### Trùng lặp Xuyên Pack (Cross-Pack Pixel SHA-256 Duplicates)
- `lpc-food-v1.zip` ↔ `lpc-food-v2.zip`: **`679`** sprite trùng pixel (v2 là bản mở rộng gộp của v1).
- `Shikashi's Fantasy Icons Pack v2.zip` (`284` icon trên `#1`) ↔ `Shikashi's Fantasy Icons Pack.zip` (`245` icon trên `#1`): **`241`** sprite trùng pixel (v1 chỉ còn `4` ô riêng).
- `crops-v2.1.zip` (`283` unique) ↔ `crops.zip` (`255` unique): **`175`** sprite trùng pixel; `crops.zip` ↔ `lpc-food-v2.zip` trùng **`41`**.

---

## 2. Kiểm kê Chi tiết 28 Pack

| # | Tên file / Archive | Kích thước | Grid / Frame gốc chính | Frame PNG dùng được | Duy nhất trong pack | Nguồn gốc ĐANG DÙNG (Unique) | Tỷ lệ khai thác | Phân loại & Ghi chú phần chưa dùng |
|---|---|---:|---|---:|---:|---:|---:|---|
| 1 | `FarmRanchLife_v1.0.zip` | 3.00 MB | `16×16`, `16×32`, `32×32`, `32×48`, strips `2f..8f` | 4,906 | 3,427 | **198** | **5.78%** | Đang dùng icons/hạt/8 máy frame 0/18 cây. **Còn nguyên:** `9` loài thú animated (`468` files), `14` máy × 6f, `21` nhà + tuyết, `62` tool anim, `22` VFX, `7` fishing FX, `10` cây ăn quả 7f+rung, `22` cá + `8` crab-pot, trà/cà phê/rượu/mayo |
| 2 | `crops-v2.1.zip` | 78.7 KB | `1024×1024` (`32×32` grid) | 393 | 283 | **86** | **30.39%** | Đang dùng 22 cây × 4 frame sinh trưởng (`crops-stages.png`); còn lại ~197 ô cây/trạng thái chưa dùng |
| 3 | `Ghostpixxells_pixelfood.zip` | 129.7 KB | `32×32` đơn | 102 | 102 | **19** | **18.63%** | Đang dùng bánh & 1 số đĩa (`19/102`); **còn 83 món 32×32** (cheesecake, spaghetti, curry, steak, ramen, dumplings, waffle, bagel, taco, sandwich...) |
| 4 | `yoshinos _bright_icons_16x16_v1.3.zip` | 152.2 KB | `16×16` đơn (`130`) | 130 | 130 | **24** *(→38 SKUs)* | **18.46%** | Dùng cho 20 hoa (qua hue shift) + 1 phần trái/mật/quà; **còn 106 icon** (7 xiên dango, 10 fruit bowls, birthday cake, lily/poppy/dandelion, fruit wines, sắc tố) |
| 5 | `Free_pixel_food_16x16.zip` | 118.0 KB | `16×16` đơn (`100`) | 100 | 100 | **17** | **17.00%** | Còn **83 icon 16×16** (7 vị trà sữa boba, 11 ly cà phê/trà, 5 bánh kem lát, 4 phô mai, kem ốc quế, tỏi/hành/gừng/chanh xanh/dưa hấu) |
| 6 | `lpc-fruit-trees.zip` | 397.6 KB | `96×128` grid (`10×32`) | 415 | 267 | **36** *(→48 ô)* | **13.48%** | 12 cây × 4 giai đoạn dùng `36` hình gốc (cam/chanh/ô liu, lê/sung, táo/lựu dùng chung thân gốc) |
| 7 | `food.zip` | 73.7 KB | `16×16` đơn (`188`) | 188 | 188 | **13** | **6.91%** | Còn **175 icon 16×16** gồm `egg_whole_blue`, `garlic`, `onion`, `pizzas`, `sushi`, `steaks`, `salads`, `fish_fillet` |
| 8 | `Shikashi's Fantasy Icons Pack v2.zip` | 2.10 MB | `512×867` (`32×32`, `16×27`) | 284 | 284 | **16** | **5.63%** | Chỉ 1 sheet `#1` có 284 icon (`15` PNG còn lại là biến thể nền/bóng); đang dùng nhiều ô nhầm nghĩa (`chicken` làm hạt mèo, `potion` làm ruy băng, `tunic` làm chăn) |
| 9 | `food-ocal.zip` | 242.7 KB | `32×32` đơn (`138`) | 138 | 138 | **6** | **4.35%** | Đang dùng `broccoli`, `cabbage`, `zucchini`, `cheese_wedge`, `water_mug`, `sashimi`; **còn 132 icon** (pasta lasagna/macaroni, salad, smoothie, milk carton, sandwiches) |
| 10 | `lpc-food-v2.zip` | 357.3 KB | `32×32` 3 sheet lớn | 1,679 | 1,657 | **8** | **0.48%** | Gần như chưa khai thác (**1,649 ô còn lại**: mì, bột, gia vị, rau quả, thịt, hải sản, bánh, nước chấm) |
| 11 | `food-glitch.zip` | 368.3 KB | `32×32` đơn (`247`) | 247 | 246 | **1** | **0.41%** | Hiện dùng đúng 1 file (`flummery` làm sữa chua!); **có sẵn `condiment/oil_olive.png`, 20+ nước sốt, `bubble_tea`, smoothies, trứng Easter** |
| 12 | `food-bluecarrot16_20201221.zip` | 414.4 KB | `24×24` & `32×32` | 575 | 575 | **0** *(dead ref)* | **0.00%** | Khai báo `bc = lambda ...` trong `pack-farming-atlases.py` nhưng nằm trong `if False`; rất giàu hải sản, cà phê, phô mai, bánh mì |
| 13 | `food-dcss_20201222.zip` | 64.9 KB | `32×32` đơn (`29` gốc) | 29 | 29 | **0** *(dead ref)* | **0.00%** | Khai báo `dcss = lambda ...` trong `pack-farming-atlases.py` nhưng nằm trong `if False`; có `honeycomb`, `royal_jelly`, `lychee`, `sultana`, `pizza` |
| 14 | `crops.zip` | 64.4 KB | `32×32` grid | 361 | 255 | 0 | 0.00% | Phiên bản cũ của `crops-v2.1.zip` (`175` trùng pixel) |
| 15 | `crops.png` | 8.6 KB | `128×64` (`32×32`, `4×2`) | 8 | 8 | 0 | 0.00% | Ảnh rời `crops.png` ở root; script chỉ dùng `crops-v2/crops.png` bên trong `crops-v2.1.zip` |
| 16 | `lpc-food-v1.zip` | 199.3 KB | `32×32` grid | 930 | 930 | 0 | 0.00% | Trùng `679` ô với `lpc-food-v2.zip`; giữ v2 làm chuẩn |
| 17 | `Shikashi's Fantasy Icons Pack.zip` | 1.90 MB | `512×640` (`32×32`, `16×20`) | 245 | 245 | 0 | 0.00% | Bản v1; trùng `241` ô với `Shikashi v2` (chỉ có 4 ô riêng) |
| 18 | `food-fleurman.zip` | 22.8 KB | `24×24` & `32×32` | 24 | 24 | 0 | 0.00% | `10` tách trà nhiều màu + `cup` + `cookie` (2 size) — rất hợp M6 Tea Time |
| 19 | `food-7soul1_20201212.zip` | 36.4 KB | `32×32` đơn | 28 | 28 | 0 | 0.00% | Cá chín/sống, thịt chín/nóng, dứa, dâu tằm, hạt dẻ, bánh mì, ớt chuông 3 màu |
| 20 | `food-thekingphoenix.zip` | 19.6 KB | `32×32` đơn | 25 | 25 | 0 | 0.00% | Sữa, cà phê, cupcake, donut, pizza, kem, bơ, trứng ốp |
| 21 | `food-jetrel_20201222.zip` | 13.5 KB | `32×32` đơn | 17 | 17 | 0 | 0.00% | Trà, salad, súp, bánh mì lát, xúc xích, nước uống |
| 22 | `food-melle.zip` | 277.6 KB | `32×32` đơn | 6 | 6 | 0 | 0.00% | `croissant`, `cupcake`, `doughnut`, `gelatin`, `pie`, `strawberry_shortcake_cookie` |
| 23 | `food-wikimedia_20230225.zip` | 1.58 MB | `32×32` (`+xcf/orig`) | 3 | 3 | 0 | 0.00% | `pepper_habanero`, `pepper_jalapeno`, `potato` |
| 24 | `food-arlantr_20201229.zip` | 4.6 KB | `32×32` đơn | 4 | 4 | 0 | 0.00% | `apple`, `carrot`, `fantasy_fruit`, `meat` |
| 25 | `food-homohikka.zip` | 2.9 KB | `16×16` & `32×32` | 2 | 2 | 0 | 0.00% | `bread`, `meat` |
| 26 | `food-other_20230225.zip` | 7.7 KB | `32×32` (`+xcf`) | 1 | 1 | 0 | 0.00% | `pinto_beans` |
| 27 | `food-glitch-scalable.zip` | 2.63 MB | `.svg` (vector nguồn) | *(247 SVG)* | *(247)* | 0 | 0.00% | Nguồn vector của `food-glitch.zip` |
| 28 | `food-ocal-scalable.zip` | 2.74 MB | `.svg` (vector nguồn) | *(136 SVG)* | *(136)* | 0 | 0.00% | Nguồn vector của `food-ocal.zip` |

---

## 3. Kiểm toán Runtime Pipeline Hiện tại

### 3.1 Phân tích `scripts/pack-farming-atlases.py` & Output
1. **`public/assets/farming/items-16.png` & `items-32.png` (`farmingSpriteAtlas.generated.json`):**
   - Toàn bộ **`267/267` canonical SKUs** đều có entry, cộng **`8` workshop machine frame 0** (`ws_*`).
   - **Ghi đè & Code chết trong script:** Có **`7` SKU bị gán đè** (`pet_kibble_basic`, `bait_shrimp`, `sea_salt`, `wheat`, `zucchini`, `grape_raisin`, `cabbage`) và **`9` nhánh `if False`** khiến `food-bluecarrot16` (`bc`) và `food-dcss` (`dcss`) thực tế đóng góp **0 sprite**.
   - **Trùng pixel runtime (`260` unique pixel / `267` SKU):** `7` cặp SKU dùng chính xác cùng 1 ảnh nguồn:
     1. `gift_flower_bouquet` == `rose_pink`
     2. `wild_herb` == `kale`
     3. `sugar_pack` == `feed_deluxe`
     4. `spice` == `paprika_powder`
     5. `tulip_bouquet` == `tulip_pink`
     6. `bridal_rose_bouquet` == `rose_white`
     7. `lavender_candle` == `rose_soap`
2. **`public/assets/farming/crops-stages.png`:** Đóng gói `60` cây/hoa × 4 giai đoạn = `240` frame entry (`156` pixel hash duy nhất: `77` từ `crops-v2.1`, `56` từ `FarmRanchLife`, `23` từ 20 hoa ghép `lavender_stages_8f` `[0..2]` + đầu hoa `Yoshino`).
3. **`public/assets/farming/trees-orchard.png`:** Đóng gói `12` cây ăn quả × 4 giai đoạn = `48` frame entry (`36` pixel hash duy nhất từ `lpc-fruit-trees`).
4. **Renderers thực tế (`src/game/farming/` & `src/ui/`):**
   - `CatalogSkuIcon.tsx` ưu tiên tra `getFarmingItemSprite(sku)` trước Kiln / Props / PetFood / Procedural SVG, nên 267 SKU hiện hiển thị mượt qua 2 atlas PNG này.
   - `FarmPlotVisualController.ts` & `OrchardVisualController.ts` đọc thật `crops-stages.png` & `trees-orchard.png` (chỉ fallback sang `proceduralCropTextures.ts` nếu thiếu texture).
   - **Điểm yếu lớn nhất:** `LivestockVisualController.ts` hoàn toàn **chưa đọc sprite donor** mà gọi `ensureLivestockTextures()` trong `proceduralAnimalTextures.ts` (vẽ 3 khung bằng `fillRect`/`ellipse`/`arc` cho cả 7 loài `chicken`, `duck`, `cow`, `goat`, `sheep`, `rabbit`, `bee`), dù `FarmRanchLife_v1.0.zip` có sẵn trọn bộ spritesheet động nhiều hướng cho 6 loài + `bees_swarm_4f.png`!
