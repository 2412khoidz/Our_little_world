# Art Pipeline Reconciliation — Game Chính (`WorldScene.ts`) vs Combined Experience (`WorldExpansionScene.ts`)

- **Nhánh:** `integration/night-merge`
- **Tài liệu đối chiếu:** `src/game/scenes/WorldScene.ts` · `src/game/worldSandbox/WorldExpansionScene.ts` · `src/features/sandboxes/CombinedExperienceDemo.tsx` · `scripts/build-private-atlas.py`
- **Nguyên tắc:** Giữ duy nhất hệ asset atlas hiện tại (`WORLD_ART_KEY` + `WORLD_PROPS_KEY` + `AVATAR_ATLAS_KEY`), tuyệt đối không tạo art pipeline thứ ba.

## 1. Bảng Đối Chiếu Nguyên Nhân Chênh Lệch Chất Lượng (Đã Xác Định Chính Xác)

| Thành phần | Trong Game Chính (`WorldScene.ts`) | Trong Sandbox Trước Pass (`WorldExpansionScene.ts`) | Trạng thái Sau Final Art Pass |
|---|---|---|---|
| **Nền cỏ thế giới** | Tiled `env.meadow_tile` 64×64 (`Sprout Lands` ngẫu nhiên 12 ô cỏ) + `env.meadow_flora` rải theo hash (lines 310–337) | Tô kín bằng `add.rectangle(0, 0, ..., 0xa8cf7c)` đơn sắc nên nhìn phẳng và trống (old line 199) | **Đã đồng bộ:** Phủ `env.meadow_tile` toàn vùng cỏ + `meadow_flora` & `sakura_petals` + viền cỏ biển `shore_s` |
| **Quảng trường & Đường đi** | Dùng `map.garden` đã bake **9-slice autotile `Tilled_Dirt_Wide_v2.png`** mượt từ `build-private-atlas.py` (lines 173–211) | Vẽ 2 hình chữ nhật vuông góc bằng `add.rectangle(..., 0xdec099)` gây cảm giác cứng thô (old lines 223–237) | **Đã đồng bộ tại Homestead & nối đường mềm:** Dán nguyên bản `map.garden` làm khu vực trung tâm + đổi đường nối xa sang bước đất bo tròn viền `0xc7a379` |
| **Bờ hồ & Bờ biển** | Ao cong dùng đủ 8 frame **`shore_n/s/w/e/nw/ne/sw/se`**, cầu gỗ đôi `bridge_wood`, `water_lotus`, `water_lily`, `water_reed_a/b`, ếch + vịt động (lines 459–509) | Ao hình chữ nhật thô không viền `shore_*`, cầu gỗ đơn, bờ biển & cầu tàu là `add.rectangle` phẳng (old lines 281–302) | **Đã đồng bộ:** Áp dụng đủ 8 frame `shore_*`, `olw-water`, cầu đôi `bridge_wood`, bèo sen, lau sậy, vịt/ếch ở Homestead + hồ câu, và cầu tàu lát `bridge_wood` |
| **Ánh sáng & Bóng đổ** | Đủ `placeSoftShadow()` dưới từng cây/prop/nhân vật + `placeSunbeam()` + `placeWarmLight()` + `nature.lantern_garden` | Chỉ có bóng cho vài cây ở nhà; cây & ghế ở biome ngoài thiếu bóng đổ và thiếu đèn lồng chiếu sáng | **Đã bổ sung:** Hỗ trợ `shadowWidth` trong `placeProp()`, thêm bóng đổ cho cây/ghế ngoài khu, đèn lồng & ánh sáng vàng |
| **Hoạt ảnh môi trường** | `olw-fire`, `olw-duck`, `olw-frog`, `olw-chicken`, `olw-sheep`, `olw-windmill` + `createAmbientMotes(..., 'petal')` | Bướm vẽ bằng `add.rectangle(3x2)` và khói `circle`, không cập nhật cánh hoa bay | **Đã đồng bộ:** Đưa đủ `olw-chicken`, `olw-sheep`, `olw-windmill`, `olw-fire` & `updateAmbientMotes(..., 'petal' / 'firefly')` vào sandbox |
| **Vào trong nhà (Interior)** | Chuyển phòng `home` ↔ `garden` qua portal cửa (`map.home` 256×192 + nội thất + góc thú cưng) | Chỉ có prop mặt tiền `nature.cottage_pastel`, không có chế độ vào nhà và không tải `map.home` | **Đã triển khai:** Thêm `interiorMode: 'outdoor' | 'indoor'`, đi thẳng vào cửa nhà hoặc nhấn `[J]` / nút `Vào trong nhà` để bước vào `map.home` đầy đủ sunbeam, lò sưởi, nội thất và bát ăn/nước |

## 2. Những Phần Chỉ Là Landmark Trang Trí vs Điểm Tương Tác Thật
- **Khu vực đã có nội dung & tương tác Demo E thật sau Pass:**
  1. **Homestead Sample District (`cottage` + `farm` + `picnic` + hồ nhỏ):** Dán nguyên cụm `map.garden` (288×224), cho phép **bước vào trong nhà `map.home`**, cho mèo ăn/uống ở bát hiên hoặc góc nhà, vờn cuộn len / hộp giấy.
  2. **Outer Fishing Pond & Beach Pier:** Đủ autotile bờ nước `shore_*` và điểm múc nước sạch (`water_source`).
- **Landmark còn là điểm cảnh quan / neo bản đồ (`worldExpansionMap.ts`) chưa cần gameplay riêng:** *Đồng hoa & Vườn quả (`orchard`)*, *Đường mòn Rừng thông (`pine_trail`)*, *Quảng trường & Chợ Bác Hai (`square`)*, *Mũi ngắm Hoàng hôn (`sunset_cliff`)*, *Góc Anh Đào Bí Mật (`secret_sakura`)*.

## 3. Kế Hoạch Tái Sử Dụng Đầy Đủ Cho Bản Đồ Mở Rộng (Milestone Kế Tiếp)
1. **Xuất 9-slice Dirt Path & Shoreline Tiles thành frame rời trong `world-props.png`:** Hiện tại 9-slice `Tilled_Dirt_Wide_v2.png` chỉ được `build-private-atlas.py` bake tĩnh vào ảnh `map.garden`. Khi mở rộng toàn bộ bản đồ `64×64` / `96×96` bằng JSON tilemap (`Tiled`), cắt thêm 16 ô `path_dirt_*` và `grass_edge_*` vào `props-manifest.json` để Phaser Tilemap Layer tự vẽ mọi ngã rẽ mượt 100% như Homestead mà không dùng `circle`/`rectangle` hình học.
2. **Giữ nguyên 16×16px logical tile resolution:** Không đổi độ phân giải grid; mở rộng bằng multi-region chunks hoặc Tiled JSON tương thích `placement.ts` & `pathfinding.ts`.
3. **Đồng nhất `WorldScene` ↔ `CombinedExperience`:** Sau Integration kế tiếp, gắn trực tiếp `ContextualPromptBadge`, `GameHotbar`, `OurLittleNotebook`, `petSpriteBuilder` 4-legged, và `minigames.css` vào shell chính thay vì duy trì hai scene tách rời.

## 4. Bằng Chứng Trực Quan Before / After (`test-results/art-pass/`)
- **Before & Main Benchmarks (`test-results/art-pass/before/`):** `main-garden-benchmark.png`, `main-home-benchmark.png`, `before-combined-desktop.png`, `before-combined-mobile.png`, `before-pet-art-desktop.png`, `before-minigames-mobile.png`.
- **After (`test-results/art-pass/after/`):** `after-combined-outdoor-desktop.png`, `after-combined-outdoor-mobile.png`, `after-combined-indoor-desktop.png`, `after-pet-art-desktop.png`, `after-pet-quadruped.gif`, `after-minigame-caro-desktop.png`, `after-minigame-othello-mobile.png`, `after-minigame-memory-mobile.png`, `after-minigame-battleship-mobile.png`.
