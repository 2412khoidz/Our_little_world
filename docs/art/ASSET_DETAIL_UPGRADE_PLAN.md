# Asset Detail & Art Direction Upgrade Plan (Zero-Budget Local Sources)

- **Nhánh:** `integration/night-merge`
- **Nguyên tắc:** Tận dụng tối đa asset miễn phí đã có sẵn trong `asset-candidates/extracted/` (chi phí 0₫), giữ đồng nhất tỷ lệ 16×16px và bảng màu Cozy Pastel ấm áp, không dùng ảnh quảng cáo, không nâng logical tile resolution.

## 1. Kế Hoạch Nâng Cấp Chi Tiết Môi Trường Từ Local Candidates

| Hạng mục chi tiết | Nguồn local đã xác minh (0₫) | Ghi chú nâng cấp cụ thể & trạng thái |
|---|---|---|
| **Ground variation** | `sprout-lands-basic/Tilesets/Grass.png` (`env.meadow_tile` 64×64, 12 biến thể cỏ), `cozy-lands-basic/Terrain/` | Phủ full lưới 64×64 thay cho mảng xanh phẳng; có sẵn 12 ô cỏ + hoa dại trong `world-props.png`. |
| **Natural paths** | `sprout-lands-basic/Tilesets/Tilled_Dirt_Wide_v2.png` (9-slice bo góc), `Tilesets/Bitmask references 1/2.png` | **Đã dùng** trực tiếp cho cụm Homestead `map.garden`; bước kế tiếp cắt thành 16 ô `path_dirt_*` để autotile tự động cho cả `64×64` / `96×96`. |
| **Grass & flowers** | `Grass.png` cols 6–7 (`env.meadow_flora`), `Cherry Blossom Biom.png` (`sakura_petals`), `sunnyside-world/Elements/Crops/` | Rải xen kẽ theo hash tránh lặp; ưu tiên cụm hoa cạnh hàng rào, gốc cây và mép đường đi. |
| **Bushes** | `sprout-lands-sorry/.../Cherry Blossom Biom.png` (`sakura_bush`), `Trees, stumps and bushes v2.png` | Cắt thêm 2–3 biến thể bụi xanh tròn/bụi hoa dâu từ `Trees, stumps and bushes v2.png` cho vùng rừng thông và bờ rào. |
| **Trees** | `nature.sakura_tree`, `prop.oak_tree`, `prop.apple_tree`, `prop.peach_tree` (`Trees, stumps and bushes v2.png`), `sunnyside-world` | Đảm bảo mỗi gốc cây đều có `placeSoftShadow()` và kích thước đồng nhất 32×32 / 32×48. |
| **Water edges** | `Water.png` (4 frames) + `Grass.png` 8 ô bờ cong (`shore_n/s/w/e/nw/ne/sw/se`) + `Cherry Blossom Biom water plants.png` | **Đã tái sử dụng đầy đủ** cho Homestead pond & Fishing Pond; có thể cắt thêm góc lõm (`shore_inner_*`) cho hồ hình chữ L hoặc bờ sông dài. |
| **Furniture** | `modern-interiors-free/Interiors_free/16x16/Interiors_free_16x16.png` & `Room_Builder_free_16x16.png` | Giữ phong cách Modern Interiors Free (đồng bộ avatar); bổ sung bộ bếp, tủ sách, bàn học đôi và hộp giấy mèo khi mở rộng V0.2+. |
| **Held items & Food sprites** | Tự vẽ 16×16 có kiểm soát (`petSpriteBuilder.ts` `drawItemIcon16`) + `cozy-lands-basic/Items/`, `sunnyside-world/Elements/Crops/`, `piknik_foods.png` | **Đã làm nét 16×16** bát hạt, bát nước, cá hồi vân mỡ, cá chép nướng có vệt vỉ, bình nước có vệt sáng gốm, cuộn len trong `LIVING_ITEMS_ATLAS_KEY`; có thể map thêm icon cá/rau từ `cozy-lands-basic/Items/fish/`. |
| **Buildings** | `small_House_light_with_door_grass.png` (`cottage_pastel`, `side_cottage`), `cozy-lands-basic/Buildings/house_01.png`, `house_02.png` | Dùng `cottage_pastel` làm nhà đôi; có thể tận dụng `cozy-lands-basic/Buildings/house_01.png` làm Chợ Bác Hai tại Quảng trường (`square`) mà không cần mua pack mới. |
| **Environmental animation** | `olw-fire`, `olw-water`, `olw-duck`, `olw-frog`, `olw-chicken`, `olw-sheep`, `olw-windmill`, `createAmbientMotes` (`petal` / `firefly`) | **Đã bật lại đầy đủ** trong `WorldExpansionScene.ts`; cập nhật thêm bướm pixel 2-frame khi tối ưu xong tilemap. |

## 2. Cải Thiện Pet Art (Mèo Bốn Chân — `src/game/pet/petSpriteBuilder.ts`)
- **Trọng tâm:** Dồn chất lượng vào dáng **mèo bốn chân (quadruped)** nhất quán trên cả 4 hướng, ưu tiên biến thể chủ đạo **`ginger-tabby` (Quýt)** cùng giữ tương thích `cream-puff` & `calico-patch`.
- **Nâng cấp đã thực hiện:**
  - Áp dụng **sel-out (shaded outline)** ấm (`#965630` cạnh sáng trên / `#5c2e1c` cạnh tối dưới thay cho viền nâu đen đồng loạt), thêm highlight lưng cam mơ (`#fac987`).
  - Tư thế đi/chạy hướng Đông/Tây là **thân ngang bốn chân rõ 4 bàn chân tất kem** (2 chân trước + 2 chân sau bước chéo nhịp), mặt xoay nhẹ 3/4 để luôn đọc được hai mắt sáng, mũi hồng và sọc trán `M`.
  - Tư thế Nam/Bắc bổ sung 2 chân sau hơi khuất bên hông + 2 chân trước bước so le để không giống thú nhồi bông đứng hai chân.
  - Chuỗi `wake_yawn_stretch` chia 3 nhịp mượt: tỉnh giấc → ngáp há miệng hồng nhỏ → **duỗi cong lưng hạ hai chân trước (`play-bow stretch`)** rồi mới đứng/chạy tiếp.

## 3. Mini-Game Art Direction (`src/features/minigames/minigames.css`)
- **Phong cách chung — Warm Wood & Felt Cozy Tabletop:** Khung bàn gỗ óc chó tối ấm, khay game nền giấy kem viền kép gỗ + chỉ đồng (`#4c2d1f` / `#b58252`), tab bookmark và nút nhấn chạm nổi 3D.
- **Đặc trưng từng trò (giữ nguyên 100% reducer & rule của DeepSeek):**
  - **Caro:** Lưới gỗ hinoki, quân cờ gốm Coral & Sage nổi khối 3D có đốm sáng specular, viền vàng vạch thắng.
  - **Othello:** Mặt bàn nỉ xanh rêu sâu, quân đen/trắng vát bóng, chấm vàng phát sáng tại ô hợp lệ.
  - **Lật thẻ (Memory):** Lưng thẻ hoa văn dệt chéo màu san hô ấm, mặt ngửa đóng khung polaroid pastel, ô ghép đúng chuyển viền xanh lá.
  - **Bắn tàu (Battleship):** Bàn hải đồ giấy biển xanh cổ, thân tàu gỗ bo viền, màn che chuyển lượt dạng phong thư sáp ấm áp.
