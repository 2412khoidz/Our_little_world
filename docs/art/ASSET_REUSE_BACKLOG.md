# Donor Asset Reuse Backlog & Content Plan (`M3a`)

*Tài liệu hành động dựa trên kiểm toán 28 pack tại [ASSET_LIBRARY_INVENTORY.md](ASSET_LIBRARY_INVENTORY.md) và [asset-library-inventory.json](asset-library-inventory.json). Mọi đề xuất dưới đây giữ nguyên mèo `Quýt` (2D + Vuena 3D) và avatar `Cozy Human V2`, không nạp raw ZIP vào `public/`.*

---

## 1. Danh sách SKU Sai Nghĩa / Placeholder / Trùng Ảnh Cần Sửa (`32` SKUs)

Kiểm tra trực quan toàn bộ 267 SKU bằng contact sheets (`06_mismatched_skus_review.png`, `07_shikashi_and_replacements.png`) phát hiện 2 nhóm lỗi nặng:

### 1.1 Sai hoàn toàn ngữ nghĩa (Critical Visual Bugs — nên sửa ngay ở M3)
| SKU | Tên tiếng Việt | Ảnh sai hiện tại (`pack-farming-atlases.py`) | Đề xuất thay thế từ kho sẵn có |
|---|---|---|---|
| `gift_plush_cat` | Thú bông mèo cam nhỏ | `f16("onigiri_3")` — **cơm nắm tam giác** | Crop/thu gọn từ sprite `cat-orange` hoặc icon mèo/quà gắn nơ nhỏ (`16×16`) |
| `pet_kibble_basic` | Hạt mèo cơ bản | `shik(14, 15)` — **con gà vặt lông sống** | Dùng bát đầy hạt trong `FRL/05_Buildings_Machines/Ranch_Props/pet_bowl_empty_food_water_3f.png` (frame 1) |
| `wood_chair` | Ghế gỗ | `frl("materials/wood_planks.png")` — **3 thanh ván gỗ** | Dùng slice ghế gỗ từ `public/assets/unified/world-props.png` / tile ghế chuẩn `16×16` |
| `tool_can_copper/iron/gold` | Bình tưới đồng/thép/vàng | `frl_tool("milk_pail_copper_iron_gold_crystal_4f.png", 0..2)` — **3 xô vắt sữa** | `iron` lấy `iron_tier_for_pack1_tools...png` frame 2 (đúng hình bình tưới!); `copper` & `gold` extract hoặc hue-shift từ bình tưới chuẩn thay vì xô sữa |
| `ribbon` | Ruy băng | `shik(19, 4)` — **lọ thuốc máu đỏ RPG** | Tạo hoặc chọn nơ/ruy băng `16×16` hợp thẩm mỹ cặp đôi |
| `wool_blanket` | Chăn len ghép mảng | `shik(7, 9)` — **áo thun xanh hiệp sĩ** | Dùng hình cuộn vải/chăn gấp đúng nghĩa |
| `gift_star_jar` | Hũ sao giấy kỷ niệm | `shik(9, 7)` — **lọ mana vàng có dấu `+`** | Dùng hũ thủy tinh lấp lánh / hũ sao nhỏ (không mang ký hiệu buff RPG) |
| `olive_oil` | Dầu ô liu | `frl("artisan/truffle_oil.png")` | Thay trực tiếp bằng **`food-glitch.zip` → `32x32/condiment/oil_olive.png`** (đúng chai dầu ô liu!) |
| `golden_egg` | Trứng vàng quý | `frl("animal_products/egg_large_brown.png")` — **trứng nâu** | Shift vàng óng từ `egg_small_white` / `egg_large_brown` + ánh sáng 2px |
| `yogurt` | Sữa chua trái cây | `glitch("dessert/flummery")` | Đổi sang `Free_pixel_food_16x16` (`soymilk_strawberry` / kem cốc) hoặc `food-ocal` (`strawberry_smoothie`) |
| `vinegar` | Giấm gạo lên men | `frl("artisan/grape_juice.png")` — **chai nước ép nho tím** | Dùng chai giấm/gia vị trong `food-glitch` (`dressing_oily`) hoặc `lpc-food-v2` |
| `ancient_green` | Mầm cổ đại | `frl("artisan/farm_crystal.png")` — **viên đá quý xanh** | Dùng `FRL/08_Items/crops/amaranth.png` hoặc cây phát sáng `crops-v2.1` |

### 1.2 Trùng ảnh runtime (`7` cặp = `14` SKU) & gần đúng cần tách rõ
- **Tách `lavender_candle` vs `rose_soap`:** Cả 2 đang dùng chung `frl("artisan/lavender_honey.png")`; đổi `lavender_candle` sang biến thể nến tím từ `shik(10, 11)` và `rose_soap` sang thanh xà phòng hồng.
- **Tách 3 bó hoa (`gift_flower_bouquet`, `tulip_bouquet`, `bridal_rose_bouquet`):** Không để giống hệt 1 bông lẻ `rose_pink`, `tulip_pink`, `rose_white` — ghép mini 3 bông + giấy gói.
- **Tách `spice` vs `paprika_powder` (`shik(20, 4)`), `sugar_pack` vs `feed_deluxe` (`sugar_cube.png`), `wild_herb` vs `kale` (`kale.png`), `lemon_marmalade` (đang dùng `honey_jar`), `pickled_pepper` (đang dùng `canned_soup`), `angora_yarn` (`rope_coil`), `walnut` (`acorn`), `cocoa_bean` (`coconut` — có sẵn `food-bluecarrot16/24x24/misc/coffee_beans_01.png`), `tool_hoe_*` (`trowel`), `tool_sickle_*` (`shears`), `tool_seed_spreader` (`pitchfork`)**.
- **Dọn `pack-farming-atlases.py`:** Xóa `7` lệnh `put16/put32` bị ghi đè và `9` nhánh `if False` (`bc`, `dcss`).

---

## 2. Cơ hội Transplant Trực tiếp từ `FarmRanchLife_v1.0.zip` (Ưu tiên cao)

| Hạng mục Transplant | Đường dẫn chính xác trong `FarmRanchLife_v1.0.zip` | Thay thế / Nâng cấp gì? | Mission |
|---|---|---|---|
| **Animated Livestock (6/7 loài + Ong)** | `04_Ranch_Animals/{chicken,duck,cow,goat,sheep,rabbit}/*` (`26..78` sheet/loài, đủ `idle_down_2f`, `walk_4dir`, `eat`, `sleep`) + `10_Effects/bees_swarm_4f.png` | **Thay thế hoàn toàn vẽ hình học Canvas trong `proceduralAnimalTextures.ts`** bằng spritesheet động 4 hướng cho `LivestockVisualController.ts` (không đụng mèo `Quýt`) | **M3** |
| **Artisan Machine Animations (`6f`)** | `05_Buildings_Machines/Artisan_Machines/*_idle_work4_done_6f.png` (`8` máy đang dùng + `6` máy mới: `butter_churn`, `keg`, `incubator`, `tapper`, `recycling_machine`, `gem_maker`) | Tám máy hiện có đã dùng đủ frame trong xưởng và trang trại. Sáu máy còn lại để dành cho mốc sau | **M3d / M4** |
| **Farming & Petting VFX Strips** | `10_Effects/{soil_dust_till_4f,water_hit_4f,seed_scatter_4f,harvest_pop_4f,hearts_petting_4f}.png`, `02_Crops/ready_sparkle_overlay_4f.png`, `03_Fruit_Trees/*_harvest_shake_3f.png` | Đã dùng hiệu ứng donor trên ô ruộng/vật nuôi, phần quả rơi của 9 cây tương ứng và giữ tán LPC | **M3d** |
| **Fishing FX & Shellfish** | `11_Fishing/{bobber_float_4f,bobber_bite_4f,fishing_spot_bubbles_4f}.png`, `08_Items/crab_pot/*` (`8` loài), `08_Items/fish/*` (`22` loài cá còn dư) | Phao, cú cắn, bọt và sprite minnow đã vào M3e. Lờ cua và các loài còn lại để dành | **M3e / M10** |
| **Ranch Buildings, Stalls & Props** | `05_Buildings_Machines/Buildings/{barn_level1..3,coop_level1..3,artisan_shed,shipping_bin_lid_open_4f}` + bản tuyết `winter_snow/*`; `Ranch_Props/{market_stall_*,pet_bowl_3f,compost_bin_4f,egg_basket_2f}` | Gắn chuồng nâng cấp ngoài `farm`, sạp chợ nông sản làng, bát ăn mèo đồng bộ | **M4 / M9 / M10** |
| **Tool Actions Overlay** | `06_Characters_Tools/Actions/*` (`62` sheet: `hoe`, `water_copper/gold/crystal`, `plant_seeds`, `harvest`, `pet_3dir`, `fish_cast/reel/catch`) | Tham chiếu frame anim & overlay công cụ đồng/thép/vàng/pha lê chuẩn tỷ lệ `16px` *(giữ nguyên body `Cozy Human V2`)* | **M3 / M9** |

---

## 3. Kế hoạch Khai thác Theo Mission & Mở rộng Nấu ăn (`M5`)

### Ánh xạ Tài sản Theo Mission
- **M3 (Farming & Fishing Polish):** Sửa `12+` SKU sai nặng nhất (`pack-farming-atlases.py`), transplant `04_Ranch_Animals` + `bees_swarm_4f` thay `proceduralAnimalTextures.ts`, gắn VFX `10_Effects/*` & `ready_sparkle_overlay_4f`.
- **M4 (Home Progression):** Tái sử dụng `Shikashi v2` (đồ trang trí, chìa khóa, đèn lồng, sách, cuộn len/vải chuẩn) + `FarmRanchLife` (`barn/coop` nâng cấp & ranch props) để làm icon cửa hàng nội thất/nâng cấp nhà.
- **M5 (Interactive Cooking — V0.3):** Mở rộng từ **`5` công thức `COOKING_RECIPES` hiện có (`carrot_soup`, `herb_carp`, `peach_tea`, `strawberry_tart`, `koinori_platter`)** và phân tách rõ với `84` công thức xưởng (`15` món của `ws_kitchen` đã có sẵn icon ở `items-32`/`items-16`). Tận dụng phần dư của **`Ghostpixxells` (`83` món chưa dùng)** + **`lpc-food-v2` (`1,649` ô)** + **`Free_pixel_food_16x16` (`83`)** + **`food-melle`** + **`food-ocal`** + **`food-glitch`** theo 3 chuỗi mạch lạc:
  1. **Chuỗi Bếp Gia Đình Ấm Cúng (Casual & Comfort — tận dụng rau/trứng/sữa/cá đang trồng):**
     - Mì Ramen & Lẩu (`87_ramen`, `89_salmon_dish`) · Trứng cuộn & Salad (`40_eggsalad`, `73_omlet`, `ocal/misc/salad`) · Bít tết & Gà quay (`95_steak`, `85_roastedchicken`) · Mì Ý & Cà ri (`94_spaghetti`, `32_curry`, `ocal/pasta/lasagna`) · Bánh mì kẹp (`92_sandwich`, `15_burger`).
  2. **Chuỗi Trà Chiều & Quán Bánh (`Bakery + Tea/Boba` — kết nối vườn cây ăn quả + Xưởng Sữa/Mứt):**
     - Mở khóa cây trồng **Trà & Cà phê (`FRL/02_Crops/greenhouse/{tea,coffee}_stages_8f.png`)** + **`tea_leaves_tin`**, **`coffee_beans_bag`**;
     - Đồ uống ấm/mát cặp đôi: **`Free_pixel_food_16x16` (`7` trà sữa `boba_*`, `11` ly `coffee_*`/`tea`)** + **`food-fleurman` (`tea_01..10.png`)** + **`food-melle` (`cupcake`, `strawberry_shortcake_cookie`, `doughnut`, `gelatin`)** + **`Ghostpixxells` (`22_cheesecake`, `79_pancakes`, `101_waffle`, `57_icecream`)**.
  3. **Chuỗi Bữa Tối Lãng mạn & Nhà hàng Cặp đôi (`Co-op Orders 1.6x–2.0x`):**
     - Kết hợp **8 hải sản lờ cua (`FRL/08_Items/crab_pot/*`)** & **22 loài cá mới** + **`pineapple` / `rice` (`FRL`)** tạo combo mâm tiệc (`*_dish` của `Ghostpixxells` cho phiên bản dọn ra bàn ăn 2 người, phân biệt rõ với icon nấu trong bếp!).
- **M6 (Shared Life — Gifts, Tea Time & Picnics):** Tận dụng **`yoshinos_bright_16`** (`birthday_cake`, `7` dango mùa lễ `hanami/sakura/mitarashi`, `10` fruit bowls, 3 loại hoa mới `lily/poppy/dandelion`), **`food-fleurman` (`tea_01..10`, `cookie`)** cho nghi thức *Trà chiều & Picnic* trên vườn/biển, plus sửa `gift_plush_cat` & `gift_star_jar` để hộp quà gửi qua `MailboxModal` thật sự ý nghĩa.
- **M9 (Living World):** `FarmRanchLife/05_Buildings_Machines/Buildings/winter_snow/*` cho biến thể mùa Đông; `Ranch_Props/market_stall_*` & cá/rau bày sạp cho NPC chợ làng.
- **M10 (Our Island):** Mở `alpaca`, `horse`, `pig` (`04_Ranch_Animals`), `giant_crops` (`giant_butternut/cantaloupe/cauliflower`), `crab_pot` + `bluegill/halibut/cod/tilapia`, và `artisan/{hops_beer,wine_red,wine_white,maple_syrup}` cho đảo/lễ hội theo mùa.

*Nguyên tắc dung lượng:* Mọi đợt tích hợp về sau chỉ đóng gói các sprite được tham chiếu thực tế vào atlas chuyên dụng lazy-load (như `animals-ranch.png` cho `farm`, `cooking-dishes-32.png` cho màn hình bếp V0.3) thay vì nhúng pack thô vào bundle khởi động.

---

## 4. Thứ tự Triển khai Khuyến nghị (Implementation Sequence)

1. **Bước 1 (trong M3 — Quick Win không đổi kiến trúc catalog):** Sửa script `scripts/pack-farming-atlases.py` để vá `~16` SKU sai nghiêm trọng + `7` cặp trùng icon + dọn dead `if False` lines, rebuild 4 atlas hiện có (`items-16/32`, `crops-stages`, `trees-orchard`).
2. **Bước 2 (trong M3 — Nâng chất lượng nông trại rõ rệt nhất):** Pack sprite sheet riêng `public/assets/farming/livestock-ranch.png` + `.json` từ `FarmRanchLife/04_Ranch_Animals` + `bees_swarm_4f.png` và nâng cấp `LivestockVisualController.ts` bỏ vẽ Canvas thủ công (giữ `proceduralAnimalTextures.ts` làm fallback nhẹ).
3. **Bước 3 (trong M3 / M4):** Thêm `ready_sparkle_overlay_4f`, VFX `10_Effects/*`, và `05_Buildings_Machines` frame chạy cho 8 xưởng.
4. **Bước 4 (trong M5 / M6):** Chọn lọc ~40–60 món ăn & đồ uống tinh túy (không lạm phát SKU rác!) từ `Ghostpixxells`, `Free_pixel_food_16x16`, `food-fleurman`, `food-melle`, `Yoshino`, `FRL tea/coffee/crab_pot` đóng gói thành atlas lazy-load riêng cho Kitchen / Picnic V0.3.
