# Living Pet Quality Report (Pre-Integration Override)

- **Nhánh:** `neon/night-dev`
- **Trạng thái:** `Implemented & Locally tested` (Sandbox & `PetEntity` cục bộ; chờ người dùng duyệt trực quan 3 biến thể mèo trước Integration Master).
- **URL xem trực tiếp (DEV):** `/?pet-art=1` · `/?pet-lab=1` · `/?experience-demo=1`

## 1. Kiểm toán Sprite Cũ (`free-pets-pack` `cat-orange`) & Cách Sửa
1. **Thiếu độ dễ thương ở góc nhìn 75° top-down 16×16px:** Nhân vật avatar Modern Interiors có thân cao 16×24px với nét mặt rõ ràng, khiến con mèo 16×16px cũ trông như khối pixel nhỏ thiếu biểu cảm.
2. **Lỗi đăng ký frame trong `src/game/art/worldAtlas.ts`:** Lưới spritesheet có `12×16 = 192` ô nhưng vòng lặp trước đây dừng tại `frameCount = 128`, bỏ sót toàn bộ nhóm frame `Walk_*` (`144..185`). Đã sửa trong commit `afd75bb` (`Math.max(entry.frameCount, cols * rows)`).
3. **Chuyển sang Sprite Thủ Công 24×24px (`src/game/pet/petSpriteBuilder.ts`):** Render tỷ lệ nguyên bản 1:1 (chân khớp chiều ngang nhân vật 16×24px, đầu to biểu cảm rõ tai, má hồng, mũi nhỏ và đuôi vằn/xù), bỏ scaling lẻ `1.25×` gây méo pixel.

## 2. Ba Biến Thể Độc Lập & Phụ Kiện (`src/shared/petLiving/petVisualTypes.ts`)
- **`ginger-tabby` (Quýt):** Tai nhọn tinh anh, sọc trán chữ M, tất kem và đuôi vằn cong.
- **`cream-puff` (Mochi):** Thân tròn béo mũm mĩm (`bodyRoundness: 'chubby'`), tai bo tròn, má hồng phấn và đuôi bông xù.
- **`calico-patch` (Bông):** Nền kem phối mảng cam – cacao bất đối xứng, chỏm tai điểm màu và đuôi bông.
- **4 phụ kiện:** Tự nhiên (`none`), Nơ hồng pastel (`ribbon_rose`), Khăn cổ bạc hà (`scarf_mint`), Vòng chuông vàng (`bell_gold`).

## 3. Ma trận 27 Animation Tracks & Chuyển Trạng Thái Tự Nhiên
- **Idle & Locomotion 4 hướng (`idle_*`, `walk_*`, `run_*`, `sit_*`):** Đủ 4 hướng Nam/Đông/Bắc/Tây, đi kèm `PetAnimationController.ts` làm mượt gia tốc di chuyển và **facing hysteresis 220ms** chống giật quay mặt khi đổi hướng chéo.
- **Nhịp sinh hoạt & khoảnh khắc đáng yêu:** `lie_down`, `sleep` (cuộn tròn thở nhẹ), **`wake_yawn_stretch` (1.2s — ngáp và duỗi người trước khi chạy tiếp)**, `sniff`, `eat`, `drink`, `pet_purr`, `happy_hop`, `play_pounce`, `box_peek` (ló đầu từ hộp giấy), `groom`.

## 4. Trí Tuệ Sinh Hoạt & Kiểm Soát Rung Lắc (`src/shared/petLiving/`)
- **Adapter Fixture (`petPrimitivesAdapter.ts`):** Đánh dấu rõ `[PRE-INTEGRATION ADAPTER FIXTURE]` mô phỏng hợp đồng của `OLW-deepseek-night` (`capacity: 24`, không xếp hạng người chăm, truyền `nowMs` xác định) để Integration Master nối trực tiếp module primitives chính thức.
- **8 Nhu cầu Không Tử Vong:** `FLOOR = 25..30`, ngoại tuyến tối đa 48h không bao giờ làm thú cưng ốm nặng hay mất.
- **Anti-Sleep-Loop (`< 35`):** Nếu đói hoặc khát dưới `35`, nhu cầu ăn/uống vượt quyền ngủ trừ khi ngủ sâu có chủ đích; khi hai bạn vào Study mode, mèo chuyển sang nằm yên lặng gần bàn học.

## 5. Bằng chứng Kiểm Chứng Cục Bộ
- Unit tests: `tests/unit/petAnimationController.test.ts` (3 tests), `tests/unit/petPhysicalCare.test.ts` (4 tests), `tests/unit/petLivingIntelligence.test.ts` (4 tests) — pass.
- Playwright E2E + GIF động: `test-results/grand-showcase/01-pet-art-*.png`, `05-pet-lab-*.png`, `pet-locomotion-and-wake.gif` (12 frames), `pet-physical-feeding-and-play.gif` (9 frames).
