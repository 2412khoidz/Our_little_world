# Thiết kế Gameplay Cốt lõi — Our Little World (`GAME_DESIGN`)

*Tài liệu thiết kế cơ chế chơi (Phase 2). Nguyên tắc kiến trúc áp dụng: **K1–K8** ([ARCHITECTURE_REVIEW.md](../research/ARCHITECTURE_REVIEW.md)), định hướng mỹ thuật **Demo E** ([ART_DIRECTION.md](../art/ART_DIRECTION.md)). Tham khảo *Stardew Valley, Animal Crossing, Spiritfarer, Overcooked* chỉ ở mức cơ chế.*

---

## 1. Triết lý & Vòng lặp Gameplay (Core Loop)

- **Triết lý bất biến:** Dễ tiếp cận với người không hardcore nhưng có chiều sâu kỹ năng & rủi ro có ý nghĩa; chơi được cả **solo / bất đồng bộ / co-op 2 người**; **không** daily streak bắt buộc, **không** cây chết hay pet tổn thương vì bận việc/offline, **không** biến học bài hay tình cảm thành nghĩa vụ kinh tế; **vui ngay cả khi không có LLM**.
- **Core Loop:**
  ```text
  Trồng trọt / Câu cá / Khám phá  ──►  Thu hoạch (chất lượng & thời tiết)
           ▲                                       │
           │                                       ▼
  Mở khóa góc nhà / công cụ ◄── Tích lũy / Trang trí ◄── Nấu ăn / Bán NPC / Đặt hàng
  ```

---

## 2. Hệ thống Farming (`V0.2.1`)

| Hạng mục | Chi tiết thiết kế |
|---|---|
| **MVP** | Làm đất (`hoe`) ngoài vùng `garden_plots`, gieo hạt (`wheat`, `tomato`, `carrot`, `sunflower`, `strawberry`, `tulip`, `rose`), tưới nước thủ công giúp **tăng tốc sinh trưởng (`+25%`) hoặc mở khóa lai giống**, cây lớn theo **server timestamp** (`ready_at`), **không bao giờ chết héo khi offline**. Phân chất lượng `normal / silver / gold` theo đất bón + độ may mắn. Nâng cấp bình tưới/cuốc qua 3 bậc (Wood → Copper → Pastel Gold). |
| **Advanced** | **Cây ăn quả lâu năm** (`peach`, `cherry`, `orange` trồng 1 lần, thu nhiều chu kỳ), **hoa lai giống chéo 8 ô lân cận** (port thuật toán `webfarmville@c420bc2:shared/src/features/blooms.ts#breed`), **bó hoa tặng người thương**, **Cây Kỷ niệm đặc biệt** trồng vào mốc hẹn hò/sinh nhật cho quà trang trí, kết nối trực tiếp nguyên liệu vào bếp & crafting. |
| **Data model dự kiến** | `garden_plots (id, world_id, map_id, tile_x, tile_y, soil_state, crop_sku, planted_at, watered_at, fertilized, ready_at, quality_seed, regrow_count, version)`. Tham chiếu `webfarmville` `blooms.ts` (B). |
| **Dependencies** | K2 Inventory & Catalog (`V0.2.0`), Demo E crop/flower atlas (`ART_DIRECTION.md`), `farmCalendar.ts` (timezone `Asia/Ho_Chi_Minh`). |
| **Edge cases** | Hai người tưới/thu hoạch cùng lúc 1 ô → khóa `FOR UPDATE` theo `plot_id` + kiểm tra `harvested` để chỉ cấp 1 lần; người dùng đổi giờ điện thoại không ảnh hưởng `ready_at` vì server gán `now()`. |
| **Acceptance criteria** | Một người offline người kia vẫn trồng/thu được; tắt tab 7 ngày cây không chết; thu hoạch đồng thời cùng ô trả `CONFLICT` cho người đến sau; unit test đạt 100% logic sinh trưởng + lai giống. |

---

## 3. Hệ thống Fishing (`V0.2.2`)

| Hạng mục | Chi tiết thiết kế |
|---|---|
| **MVP** | Câu tại bờ **ao cá phía Đông khu vườn (Demo E)**; mini-game kéo thanh giữ nhịp 1 ngón cho màn hình chạm (*hold-to-rise, release-to-drop*, viết mới sạch theo FSM `idle → waiting → bite → reeling → caught/missed` tham chiếu `greens/fishing.js`); cá có **3 bậc hiếm** (*thường, hiếm, truyền thuyết*) + **chất lượng** (`normal/silver/gold`); thời điểm trong ngày (`sáng/chiều/tối`) và thời tiết ảnh hưởng tỷ lệ gặp cá. |
| **Advanced** | Mồi câu tiêu hao (tăng tỷ lệ cá hiếm/vàng), nâng cấp cần câu qua 3 cấp (nới vùng xanh thanh kéo), thả cá vào **Bể cá trong nhà** hoặc nấu món súp/nướng trong Bếp, **Câu cá Co-op**: hai người đứng kề bờ ao kích hoạt tỷ lệ cắn câu nhanh hơn và cơ hội *Cá Đôi Vui Vẻ* (không ép online cùng lúc). |
| **Data model dự kiến** | `fishing_catches (world_id, fish_sku, best_size_cm, count_caught, unlocked_at)` + RNG cá được xác nhận qua server RPC khi kết thúc lượt kéo hợp lệ (giới hạn thời gian tối thiểu theo độ khó). |
| **Dependencies** | K2 Inventory (`V0.2.0`), mặt nước ao cá Demo E (`V0.1`), `rng.ts`. |
| **Edge cases** | Khóa màn hình iPhone khi cá đang cắn câu → hủy phiên câu an toàn không trừ cần câu; thao tác quá nhanh `< 800ms` bị từ chối chống spam packet. |
| **Acceptance criteria** | Chạm 1 ngón chơi mượt trên màn hình dọc `430×932`; trượt nhịp mất mồi tiêu hao nhưng vẫn có cần/mồi cơ bản miễn phí chống kẹt kinh tế; hai avatar câu cạnh nhau hiển thị anim cần câu đồng bộ. |

---

## 4. Hệ thống Cooking Có Kỹ năng & Rủi ro (`V0.3`)

*Tham chiếu nhịp phối hợp từ Overcooked nhưng tinh chỉnh tốc độ nhẹ nhàng, điều khiển chạm 1–2 ngón thoải mái trên iPhone.*

- **Quy trình thao tác thực tế (không bấm nút xong ngay):**
  1. **Sơ chế / Cắt nguyên liệu:** Chạm theo vạch nhịp cắt 3–5 lát (sai lệch quá nhiều làm giảm cấp chất lượng nguyên liệu).
  2. **Canh thời điểm & Điều chỉnh nhiệt:** Kéo/giữ thanh nhiệt trong vùng vàng (`ideal_temp`) khi xào/nướng trong 8–15 giây; để vọt lên vùng đỏ quá `3s` → **cháy khét (mất món, chỉ thu hồi 0–1 phụ phẩm tro)**.
  3. **Phối hợp chuyển nguyên liệu (Co-op):** Ở chế độ Co-op, người A cắt ở quầy sơ chế, đẩy sang khay chuyền cho người B canh chảo/nồi để giữ combo tươi mới.
  4. **Trình bày món ăn (Plating):** Chọn sốt/trang trí đúng thứ tự của đơn để chốt bậc sao (`★ / ★★ / ★★★`).

| Chế độ | Mô tả | Risk / Reward |
|---|---|---|
| **1. Casual Cooking** | Tự do luyện công thức không giới hạn giờ | Nếu canh quá cháy vẫn hỏng món (mất nguyên liệu đã bỏ vào), giúp làm quen cơ chế không áp lực. |
| **2. Co-op Cooking** | Hai người chia 2 trạm bếp (Sơ chế ↔ Nấu/Trình bày) | Combo nhịp đôi tăng xác suất ra món **Vàng (`★★★`)** + hồi năng lượng/bài trí bàn ăn đẹp. |
| **3. Restaurant Orders** | Đơn giao hàng từ NPC Chủ nhà hàng có đồng hồ đếm ngược (90–150s) | **Rủi ro cao, thưởng lớn:** Hoàn thành đúng hạn + đạt sao nhận `1.6x–2.0x` giá trị; quá giờ hoặc cháy mất tiền thưởng đơn và chỉ giữ nguyên liệu còn dư. |

- **Data model dự kiến:** `known_recipes (world_id, recipe_sku, mastery_count, best_stars)`, `cooking_sessions` (local state + kết quả xác thực server qua K4 khi nộp món/đơn).
- **Dependencies:** Farming (`V0.2.1`), Fishing (`V0.2.2`), Zone Bếp trong nhà (Demo E), NPC Orders (`V0.2.5`).
- **Edge cases:** Rớt mạng giữa ván Co-op → tự giữ tạm thời hạn `15s` hoặc cho phép 1 người hoàn tất trạm còn lại (không tự động hủy làm mất oan nguyên liệu của cặp đôi).
- **Acceptance criteria:** Mất nhiệt độ → cháy thật; đạt `★★★` yêu cầu thật sự canh cắt + nhiệt chuẩn; chơi được mượt trên cảm ứng dọc và ngang iPhone.
