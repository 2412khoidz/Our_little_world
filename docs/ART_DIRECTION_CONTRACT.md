# Art Direction Contract — Our Little World

Tài liệu quy chuẩn mỹ thuật & nguồn gốc tài nguyên (Donor Provenance) phục vụ bảo toàn bản đồ đẹp hiện có và định hướng đồng bộ dần từ Mission P.1 đến V0.5.

---

## 1. Bảng kiểm kê nguồn gốc tài nguyên (Donor Provenance Audit)

### 1.1 Bản đồ & Nội thất (Maps & Interiors)

| Map ID | Vai trò | Kích thước | Grid | Nguồn Donor | Commit / Phiên bản | Tileset / Plate | Giấy phép |
|---|---|---|---|---|---|---|---|
| `home` | Ngôi nhà chung của cặp đôi | `16×12` | `16px` | Sprout Lands + Demo E (`unified/world.png`) | `47ddc077` | `map.home` baked pastel cottage + furniture | License-verified starter / Demo E |
| `garden` | Khu vườn hoa & cầu gỗ ao | `18×14` | `16px` | Sprout Lands (`harvest_hill_example`) | `47ddc077` | `map.garden` + `world-props.png` | License-verified starter / Demo E |
| `farm` | Nông trại 184 luống & ao cá | `64×44` | `16px` | Farming Simulator Cabacos + Hollowmere props | `79e423d` | `ts_map.png` + `donor-hollowmere-*` | MIT |
| `village` | Làng Cabacos trung tâm | `86×48` | `16px` | Farming Simulator Cabacos | `79e423d` | `ts_map.png`, `ts_forest.png` + `olw_roof_overhang` | MIT |
| `beach` | Vịnh Hải Âu & cầu gỗ câu cá | `56×36` | `16px` | Farming Simulator Cabacos + Hollowmere beach | `79e423d` | `ts_map.png` + `ferry`, `palm`, `crab_pot` | MIT |
| `forest` | Rừng thông yên tĩnh | `28×40` | `16px` | Tuxemon (`tt_forest_route1`) | `4e63c45b` | `core_outdoor*`, `prototyping_outdoor` | CC BY-SA 4.0 (Tuxemon runtime maps) |
| `shop`, `shop_seed` | Tiệm hạt giống Bác Hai | `24×18` | `16px` | Cabacos (`Seed_shop.tmj` — Sunnyside plate) | `79e423d` | `seed_shop_sunnyside_style_384x288.png` | MIT |
| `shop_tool` | Tiệm dụng cụ Chú Tư | `24×18` | `16px` | Cabacos (`tool_shop.tmj` — Sunnyside plate) | `79e423d` | `tool_shop_sunnyside_style_384x288.png` | MIT |
| `shop_crop_market` | Chợ nông sản | `24×18` | `16px` | Cabacos (`Crop_market.tmj`) | `79e423d` | `crop_market_sem_fundo.png` | MIT |
| `shop_town_hall` | Hội trường làng | `24×18` | `16px` | Cabacos (`Town_hall.tmj`) | `79e423d` | `town_hall_sem_fundo.png` | MIT |

> **Lưu ý về sự khác biệt thẩm mỹ giữa các khu:** Khu `home`/`garden` mang nét Sprout Lands / Demo E pastel ấm áp; `village`/`farm`/`beach` dùng bộ Cabacos (`ts_map`) phối prop Hollowmere (đồng nhất ấm sáng); riêng `shop_*` sử dụng các tấm hình pre-rendered Sunnyside-style (`384×288`) của Cabacos nên trước đây hơi tương phản lạnh hơn nhà riêng (`home`). Vì vậy chúng giữ nguyên layout/họa tiết gốc và chỉ bổ sung lớp hòa sắc ấm nhẹ + filtering `NEAREST`.

### 1.2 Nhân vật, Thú cưng, Nông sản & Giao diện (Characters, Pets, Items & HUD)

| Hạng mục | Nguồn Donor / Tác giả | Kích thước chuẩn | Vị trí trong repo | Giấy phép |
|---|---|---|---|---|
| Nhân vật chơi & NPC (overworld) | PyDew Valley (`artemn0va/pydew-valley`) | `64×64` sheet, hiển thị ~`32×32` | `public/assets/donor/pydew-characters/` | CC0 1.0 |
| Mèo 2D overworld (`Quýt`) | Free Pets Pack (Frakassets) | `32×32` (`12` cols/row) | `public/assets/unified/world-props.png` | Verified asset pack |
| Mèo 3D Pet Care | Vuena (`CatGltfActor`) + PBD constraints | Three.js GLB | `public/assets/pet-care-v2/` + `src/game/pet/care/` | CC0 / OLW |
| Động vật hoang dã & vườn | Sprout Lands / Cozy props + Procedural Crab | `16×16` | `world-props.png` + `olw-crab-sheet` | Verified / CC0 1.0 |
| Icon vật phẩm & nông sản | Kiln Harvest Sampler + Fishing Frenzy | `16×16` / `32×18` | `public/assets/ui/hybrid/`, `public/assets/donor/fishing-frenzy/` | Free sampler / MIT |
| Giao diện túi đồ & HUD | Nuvora Interactive Inventory Skin + Cozy HUD | Vector pixel-crisp UI | `src/features/inventory/nuvora/`, `src/ui/` | OLW / MIT |
| Âm nhạc & SFX | Hollowmere, Harvest Horizon, Cabacos, OLW Synth | `44.1kHz` MP3 / Sprites | `public/assets/audio/` (`CREDITS.md`) | MIT / CC0 1.0 |

---

## 2. Quy chuẩn mỹ thuật thống nhất (Unified Art Contract)

Mọi tài nguyên thêm mới hoặc tinh chỉnh từ Checkpoint E trở đi phải tuân thủ 9 thông số chuẩn sau:

1. **Tile Resolution (`16×16` px):** Lưới logic, va chạm (`blockedGrid`), nông trại (`184` luống) và đặt nội thất đều dùng chuẩn `16×16` pixel.
2. **Tỉ lệ nhân vật / công trình (Character-to-Building Scale):** Nhân vật đứng trên bản đồ có chiều cao thị giác ~`20–24px` (`1.25–1.5` tile), tương ứng nhà ở/tiệm cao `48–96px` (`3–6` tile) và cây cao `32–48px`.
3. **Kích thước cửa ra vào (Door Sizes):** Cửa đơn tối thiểu `16×24px` (`1` tile rộng); cổng chính / cửa đôi `32×24px` (`2` tile rộng). Nhân vật không bao giờ lớn hơn khung cửa.
4. **Kích thước nội thất & Đạo cụ (Furniture & Props):** Căn theo bội số `16px` (`1×1`, `2×1`, `2×2`). Prop độ phân giải gốc cao hơn (ví dụ `donor-hollowmere-bench` `64×32px` cho ghế 2 người `2×1`) phải đi qua `applyWorldFurnitureDisplaySize()` để ép về `widthTiles * 16` mà giữ lọc `NEAREST`.
5. **Góc nhìn (Perspective):** Top-down 3/4 oblique (nhìn thấy mặt đứng phía Nam của tường, bàn, giường, mái nhà `olw_roof_overhang`).
6. **Bảng màu ấm cúng (Warm Cozy Palette):**
   - Nền gỗ & khung HUD: `#6f421f` (viền tối), `#c68e49` (gỗ trung), `#fff8eb` (giấy kem).
   - Đất & cỏ đồng bộ: cỏ tươi `#6fb858`, đất ẩm `#8b5a3c`, ánh sáng hoàng hôn `#ffd584`, hồng anh đào `#f7a8c4`.
7. **Hướng đổ bóng (Shadow Direction):** Bóng tiếp xúc mềm hình elip đặt ngay dưới chân vật thể (`footY - 1`), nghiêng nhẹ xuống Nam (`#261814`, alpha `0.36–0.45`).
8. **Ánh sáng (Lighting):** Mọi khu vực dùng chung `WorldLightingOverlay` (ngày/chiều/đêm) + quầng sáng ấm `#ffd584` tại đèn lồng, cửa sổ và cửa hàng. Nội thất shop Cabacos dùng bộ lọc `NEAREST` kèm veil ấm nhẹ `#ffe8c2` (`0.06` ADD) để đồng điệu với nhà riêng.
9. **Mật độ pixel & Bộ lọc (Pixel Density & Filtering):** Bắt buộc `pixelArt: true`, `roundPixels: true`, `antialias: false` ở cấp Phaser Game và `NEAREST` trên toàn bộ texture pixel-art; ảnh UI dùng `image-rendering: pixelated`.

---

## 3. Chính sách bảo toàn & Lộ trình mỹ thuật V0.5

- **Bảo toàn (Không thay thế hàng loạt):** Không xóa hoặc vẽ lại thủ công các bản đồ donor đang đẹp (`home`, `garden`, `village`, `farm`, `beach`, `forest`).
- **Hòa sắc chọn lọc đã áp dụng ở P.1:** Chuẩn hóa chậu hoa anh đào (`flowerpot_sakura` -> hoa hồng phấn), nâng cấp ghế đôi vườn (`bench_garden` 2 chỗ ngồi chuẩn), cua bãi biển pixel CC0, cổng dịch chuyển phát sáng TeaMobi đồng nhất và ve sầu/ánh ấm nội thất shop.
- **Mở rộng V0.5:** Đồng bộ hoàn toàn nội thất 4 cửa hàng Sunnyside theo bộ gạch indoor thống nhất, bổ sung hoạt ảnh mở cửa & khói ống khói theo giờ trong ngày.
