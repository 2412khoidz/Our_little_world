# Mission L — Cozy Art Direction & Character System V2 Report

- **Branch:** `antigravity/neon-cozy-art-v2`
- **Base commit:** `26b185d0c598fab7fb14847f2eb614d93af56996` (`origin/integration/donor-reuse-recovery`)
- **Target integration:** `integration/donor-reuse-recovery` (PR opened, not auto-merged)

---

## 1. Đánh giá PR #76 (PyDew Farmer) & Toàn cảnh mỹ thuật khi chạy game trực tiếp trên Windows

Khi chạy live build `private-art` trên Windows tại `26b185d` qua cả 7 khu vực (`home`, `garden`, `forest`, `village`, `shop_seed`, `farm`, `beach`), multiplayer 2 người và Tủ đồ (`AvatarModal`), các vấn đề mỹ thuật cốt lõi được xác định rõ:

1. **Sai bản thể nhân vật (Cat mascot thay vì cặp đôi người):** `artemn0va/pydew-valley` tái sử dụng nhân vật thú bông màu kem (mèo/hamster của Sprout Lands), không phù hợp mục tiêu cặp đôi yêu nhau sinh hoạt trong nhà/vườn/làng.
2. **Lệch mật độ pixel (Pixel Density 4×):** Toàn bộ Home, Cabacos Shop, Village, Tuxemon Forest và Beach dùng chuẩn `16×16` pixel/tile, trong khi PyDew Farmer gốc được upscale `64×64` (`4×` to/thô hơn nét pixel nội thất và thú cưng).
3. **Thiếu tùy biến ngoại hình & lệch giữa Tủ đồ ↔ Gameplay:** `farmer-may-atlas.png` và `farmer-nang-atlas.png` chỉ là 1 sprite duy nhất đổi nhẹ tint hồng; `AvatarModal.tsx` ẩn toàn bộ tùy chọn tông da, kiểu tóc, màu tóc, kiểu áo, phụ kiện.
4. **Co giãn cell khi vung cuốc/tưới:** `build-pydew-farmer-gameplay-atlas.py` crop `getbbox()` từng frame vào ô `64×64`, làm nhân vật bị thu nhỏ rõ rệt trong các frame `hoe` / `water` / `axe`.
5. **Giả lập animation bằng frame sai ngữ cảnh:** `fish` trỏ vào `axe` (`harvest`), `affection` trỏ vào `water`, `sit`/`lie`/`hold` dùng đứng yên (`idle`).
6. **Chồng bảng tên & bóng cứng:** Bảng tên `Mây` / `Nắng` đè lên đầu nhân vật (`y - 25`), bóng dùng ellipse cứng thay vì soft radial shadow, và map `farm` (`tilewidth = 64`) bị zoom `2.0` làm gạch nhà phóng to quá khổ.

---

## 2. Nghiên cứu trực tiếp 5 phương án nhân vật

| Phương án | Đánh giá trực tiếp | Kết luận |
|---|---|---|
| **LimeZu Modern Interiors Free** *(có sẵn trên máy owner)* | **Adam (`short`), Alex (`bob`), Amelia (`long`)** ở chuẩn native `16×32` — khớp 1:1 với nội thất `home`, shop `Cabacos`, `Tuxemon` forest, `village`, `beach`, có `idle_anim` (6f), `run` (6f), `sit2` (trái/phải 6f), `sit3` (ngồi chéo trước sofa/ghế 6f), `phone` (9f), và tách ramp màu cho da/tóc/áo. | **CHỌN LÀM RIG CHÍNH V2** (kèm CC0 Human fallback đồng cấu trúc `384×384` cho public build). |
| **Universal LPC Character Generator** | 64×64, rất giàu layer nhưng tỷ lệ RPG cao lớn (`64×64` ~ 2–4× tileset 16px), giấy phép **CC-BY-SA / GPL** ràng buộc ShareAlike, phong cách RPG không cozy bằng chibi 16×32. | Không chọn cho world `16×16`. |
| **Sunnyside World (Daniel Diggle)** *(có sẵn trên máy owner)* | `96×64` canvas (~16px character hói đầu nhỏ, chỉ 2 hướng trái/phải lật gương, không có mặt sau `up`, tóc tách layer rất ít kiểu nữ dễ thương). | Không phù hợp game 4–8 hướng có ngồi bàn học quay lưng (`up`). |
| **Purple Cat — Cozy Farm: 8-Direction Moves** *(itch.io \$3+)* | Đúng 8 hướng chéo + đi/chặt/đào/cuốc/gieo/tưới/nhặt. Tuy nhiên là pack trả phí (\$3+), chưa có sẵn trên máy owner và không có bộ layer tùy biến nam/nữ đa dạng như LimeZu Character Generator. | Đề xuất owner cân nhắc mua nếu muốn true 8-dir farming về sau. |
| **Cozy Lands Basic (Amo-QAQ)** *(có sẵn trên máy owner)* | `boy_idle`/`boy_walk` & `girl_idle`/`girl_walk`/`girl_hoe`/`girl_water`/`girl_hold` cực dễ thương, có **4 hướng + 4 hướng chéo**. Tuy nhiên bản Free thiếu `boy` tools (chỉ `girl` có tool), không có `sit`/`lie` và không có `run` tách biệt. | Tham khảo rất tốt; nếu mua bản Full có thể cân nhắc bổ sung về sau. |
| **PyDew Valley (Sprout Lands)** *(PR #76)* | Mascot mèo kem 64×64, không phải cặp đôi người, lệch tỷ lệ 4×. | Chuyển về `role: 'reference'`. |

---

## 3. Kiến trúc Character System V2 đã triển khai

### 3.1 Atlas thống nhất 4 hàng `384×384` (Private LimeZu & Public CC0)
- **`scripts/build-private-atlas.py`** & **`scripts/unified-atlas-art.mjs`**:
  - Sửa lỗi nghiêm trọng ở atlas cũ: `*_sit_16x16.png` trước đây dùng bước ngang `32px` nhưng bị cắt `16px` gây frame trống. Đã repack sạch **Row 2 (`sit`)** thành `24 × 16×32` không khoảng trống:
    - `right`: `sit2` slots `0..5` (căn baseline `y=31`)
    - `up`: `idle_anim` hướng `up` hạ `+3px` cho dáng ngồi bàn học
    - `left`: `sit2` slots `6..11` (căn baseline `y=31`)
    - `down`: `sit3` slots `0..5` (dáng ngồi sofa/ghế vườn cực tự nhiên)
  - Bổ sung **Row 3 (`phone`)** từ `*_phone_16x16.png` (6 frame dùng điện thoại ấm áp).
- **Đồng bộ 100% Tủ đồ ↔ Gameplay (`AvatarModal.tsx`, `worldAvatarCanvas.ts`, `donorAvatarWardrobePreview.ts`, `phaserAvatarTexture.ts`):**
  - Khôi phục đầy đủ 6 nhóm tùy chỉnh: **Tông da (3)**, **Kiểu tóc (3: nam ngắn / bob / nữ dài)**, **Màu tóc (4)**, **Trang phục (3)**, **Màu áo (4)**, **Phụ kiện (Kính tròn / Nơ nhỏ / Không có)** + 2 preset nhanh **Mây** & **Nắng**.
  - Tủ đồ dùng trực tiếp `loadAvatarAtlas()` + `buildWorldAvatarCanvas()` với nút xem trước sống **Đứng / Đi bộ / Ngồi** và **Xoay 4 hướng**.

### 3.2 Animation thật vs Animation còn thiếu (Báo cáo trung thực)
- **Animation donor thật đã nối & hoạt động:**
  - `idle` (6 frame thở nhẹ 4 hướng — `Adam/Alex/Amelia_idle_anim_16x16.png`)
  - `walk` (6 frame @ 8.5 fps — `*_run_16x16.png`)
  - `run` (giữ `Shift`, tốc độ `1.45×`, 6 frame @ 13.5 fps + bụi chân pixel)
  - `sit` (`sit_sofa` / `sit_bench` dùng `sit3`, `sit_study` quay lưng `up` — `*_sit2/sit3`)
  - `phone` (6 frame thư giãn — `*_phone_16x16.png`)
- **Animation còn thiếu ở bộ LimeZu Free (không giả bằng frame chiến đấu, không ghép rig lệch):**
  1. `lie_bed` nằm ngang: Hiện dùng đầu/vai ở `Row 0` gối đầu trên giường + chăn chần bông pastel (`buildCozyQuilt`) đắp gọn trên thân + nhãn `zzz…`.
  2. `hoe` / `water` / `harvest` / `fish` / `hold` dạng đánh tay riêng trên nhân vật: Hiện dùng **cùng rig người LimeZu** kết hợp **đồ cầm tay donor Cabacos/PyDew** (`HeldItemRenderer` với xoay vung nhẹ + `playCozyActionMotion` nghiêng người nhẹ + `FarmTillToolFx` / `FarmWaterToolFx`), tuyệt đối không dùng frame chém/cung của Puny hay thay rig khác.
  3. Sprite 8 hướng chéo thực thụ (diagonal NE/NW/SE/SW): Hiện map 8 hướng di chuyển về 4 clip cardinal sạch của LimeZu (`cardinalFromFacing8`).

### 3.3 Tương tác cặp đôi & Đồng nhất mỹ thuật
- **Tương tác tình cảm (`coupleTypes.ts`, `coupleProtocol.ts`, `CoupleActionBar.tsx`, `App.tsx`, `WorldScene.ts`):**
  - **🫂 Ôm nhau (`hug`):** Mây & Nắng tiến sát đối diện nhau ở tư thế đứng tự nhiên (sửa lỗi cũ dùng frame ngồi khi ôm!) + tim `💕` bay lên trên bảng tên.
  - **🤝 Nắm tay (`hold_hands`):** Giao thức mời/đồng ý mới — Mây & Nắng đứng cạnh nhau (`±10px`) nhìn về trước + tim vàng `💛` lơ lửng phía trên.
  - **Ngồi cạnh nhau (`sit_sofa`, `sit_bench`) & Nằm chung giường (`lie_bed`):** Sửa lỗi độ sâu khiến nhân vật từng bị chìm sau lưng ghế sofa/giường (`depthBoost` khi ngồi sofa / nằm giường), bổ sung biểu tượng `♥` khi cả hai ngồi cùng sofa/ghế vườn.
- **Đồng nhất toàn game (`WorldScene.ts`, `demoHelpers.ts`, `worldCamera.ts`):**
  - **Soft radial shadow (`demo-soft-shadow`):** Thay ellipse tối cứng bằng bóng mềm dưới chân (tự ẩn khi nằm giường, thu gọn khi ngồi).
  - **Nameplate rõ nét:** Nâng vị trí bảng tên (`y - 28` đứng, `y - 25` ngồi, `y - 21` nằm) tránh đè tóc/nơ, bo pill ấm `0x261a20` viền màu riêng của Mây (`#8bc4d9`) và Nắng (`#f2a2ba`).
  - **Cân tỷ lệ trên `farm` (`tilePx = 64`):** `avatarScale()` đặt `2×` trên `farm` và `computeGameplayZoom` chuẩn hóa zoom `1.0` (desktop) / `0.75` (mobile), giúp nhân vật hài hòa với nhà/ruộng/lối đi của PyDew mà không làm vỡ bản đồ.
  - **Giữ nguyên vẹn rừng Tuxemon & nội thất shop Cabacos**, không chạm vào map JSON, collision hay portal (phạm vi Worker I).

---

## 4. Đề xuất Asset Pack trả phí (Chờ owner duyệt trước khi mua)

Nếu owner muốn nâng cấp nhân vật lên mức hoàn hảo (có đủ frame nằm, cầm dụng cụ cuốc/tưới/câu cá và/hoặc 8 hướng thật), đề xuất theo thứ tự ưu tiên:

1. **LimeZu — Modern Interiors Full / Character Generator** (itch.io):
   - Đồng bộ 100% với bộ hiện tại (`Adam/Alex/Amelia` + `Home`), bổ sung hàng trăm kiểu tóc, trang phục cặp đôi, nhiều animation đời thường (`sleep`, `sit`, `carry`, `tool`).
2. **Amo-QAQ — Cozy Lands Full** (itch.io):
   - Bộ `boy` & `girl` chibi rất hợp thẩm mỹ Cozy Couple và có sẵn **8 hướng chéo thực thụ** + đầy đủ animation nông trại cho cả nam lẫn nữ (hiện bản Free thiếu tool cho nhân vật nam).
3. **Purple Cat — Cozy Farm: 8-Direction Moves** (itch.io, ~\$3):
   - Nếu ưu tiên 8 hướng nông trại chuyên sâu (cuốc/tưới/gieo/thu hoạch 8 hướng), dù ít tùy biến ngoại hình tóc/váy bằng LimeZu.

---

## 5. Ghi chú bàn giao cho Integration Agent (Phạm vi Worker I / H)

- **Không sửa map/collision/portal trong PR này:** `public/assets/maps/*.json`, `src/shared/maps.ts`, collision và portal giữ nguyên cho Worker I.
- **Quan sát khi chạy game live (gợi ý Worker I kiểm tra nếu cần):**
  - Tại `farm.json`, spawn mặc định `(24, 27)` nằm ngay ngoài cửa nhà; cửa nhà PyDew (`24, 25`) hiện chưa có warp vào nội thất riêng mà chỉ là tile sàn gạch lớn `64px`.
- **Lưu ý `verify:private` (từ commit gốc `26b185d`):**
  - `npm run verify:private` báo `index-*.js contains dev marker "/api/dev-lan"` do 2 lời gọi `/api/dev-lan/pet-care/session` trong `src/app/App.tsx` (từ merge Living Pet Care `26b185d`, kiểm tra `backend.mode !== 'dev-lan'` thay vì `import.meta.env.DEV && backend.mode !== 'dev-lan'`). Đã giữ nguyên ngoài phạm vi Mission L để nhánh Pet Care V2 (`OLW-Carbon`) hoặc Integration Agent xử lý đồng bộ.

---

## 6. Trạng thái kiểm chứng trung thực

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| `npm run assets:atlas` & `assets:atlas:private` | PASS | Sinh atlas `384×384` (0 cell rỗng) |
| `node scripts/qa-private-art-avatar.mjs` | PASS | Xác nhận contract `384×384` & metadata Cozy Human V2 |
| `npm run lint` | PASS | 0 errors (2 warnings có sẵn trước đó) |
| `npm run typecheck` | PASS | Exit 0 |
| `npm run test` (Vitest) | PASS | **151/151 files, 749/749 tests pass** |
| `npm run build` & `npm run build:private` | PASS | Build thành công cả public & private-art |
| `npm run verify:private` | FAIL (pre-existing) | Lỗi `/api/dev-lan` trong `App.tsx` pet-care từ `26b185d` |
| Playwright E2E `v01-our-little-home.spec.ts` | 4/5 PASS | Luồng pairing + Wardrobe↔Gameplay sync + multiplayer pass; test `navCount === 5` fail do Extended World có 7 tab từ trước |
| Chụp ảnh live & GIF Windows (Before/After) | PASS | Đã chụp đủ 7 zone + Wardrobe + Multiplayer + Sit/Lie/Hug/HoldHands + 3 GIF thật |
| Thiết bị thật iPhone 16 Pro Max / Supabase thật | CHƯA TEST | Chỉ mới kiểm chứng trên Windows Desktop + Dev LAN local |
