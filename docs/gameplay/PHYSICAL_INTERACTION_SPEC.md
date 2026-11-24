# Physical Interaction & Pet Care Specification

- **Nhánh:** `neon/night-dev`
- **Modules:** `src/shared/interaction/*`, `src/game/interaction/HeldItemRenderer.ts`, `src/shared/petLiving/{petFoodCatalog.ts, petPhysicalCare.ts}`
- **Trạng thái:** `Implemented & Locally tested` (Sandbox `/?experience-demo=1`, `tests/unit/interactionResolver.test.ts`, `tests/unit/petPhysicalCare.test.ts`).

## 1. Điều Khiển Ngữ Cảnh Thống Nhất (Desktop & Touch)
- **Phím tắt (tự động bỏ qua khi đang gõ vào ô text via `isEditableInputTarget`):**
  - `WASD` / Phím mũi tên / Touch D-pad: di chuyển nhân vật, tự cập nhật hướng mặt.
  - `1–8`: chọn hoặc cất vật phẩm trên tay (`HeldItemState`) mà không tự ý tiêu hao tài nguyên.
  - `J` (hoặc chạm badge hành động chính): thực thi hành động ưu tiên dựa trên mục tiêu gần nhất & vật phẩm đang cầm.
  - `K` / `Escape`: cất đồ đang cầm hoặc đóng hộp thoại.
- **Thuật toán chấm điểm ngữ cảnh (`resolveContextualActions`):** Kết hợp khoảng cách Euclide (`<= reachPx`) với tích vô hướng hướng nhìn (facing bonus) để chọn đúng đối tượng trước mặt người chơi khi mèo đứng sát bát ăn hoặc hộp giấy.

## 2. Vòng Đời Vật Lý Khi Chăm Sóc Mèo (`petPhysicalCare.ts`)
1. **Bảo toàn 1:1 `Inventory → Bowl → Consumed`:** Thức ăn không tự biến mất khi chọn slot. Chỉ khi đưa cho mèo ăn (`resolvePetEat`) hoặc trút vào bát (`fillFoodBowlFromHeld`) số lượng mới giảm đúng 1 phần.
2. **An toàn dinh dưỡng (`petFoodCatalog.ts`):** Chặn danh sách thành phần độc hại cho mèo (`onion`, `garlic`, `chocolate`, `grape`, `coffee`) ngay từ domain logic.
3. **Lịch sự tôn trọng trạng thái tự nhiên:**
   - Nếu mèo đang no (`satiety >= 92`) hoặc đang ngủ say (`sleep`), bé sẽ đánh hơi hoặc vẫy tai từ chối nhẹ nhàng bằng tiếng Việt **mà vẫn giữ nguyên phần thức ăn trên tay người chơi**.
   - Bình nước tái sử dụng được bơm đầy miễn phí tại nguồn nước (giếng/vòi bếp) và đổ có giới hạn dung tích vào bát nước.
4. **Hành trình nhận nuôi mèo hoang (`AdoptionStoryState`):** Mèo lạ ban đầu chỉ dám đến gần ngoài hiên nếu người chơi cầm hạt nhẹ nhàng cúi xuống cho ăn (`offer_starter_food`), vuốt ve làm quen, rồi mới kích hoạt hộp thoại xác nhận nhận nuôi về nhà.

## 3. Bằng chứng Đã Chạy
- `tests/unit/interactionResolver.test.ts` (3/3 pass): test chọn hotbar không trừ kho, ưu tiên mục tiêu theo hướng nhìn, bảo vệ input text.
- `tests/unit/petPhysicalCare.test.ts` (4/4 pass): test bảo toàn 1:1, hoàn nguyên thức ăn khi từ chối, từ chối lúc ngủ say, tiến trình nhận nuôi.
- GIF thực tế: `test-results/grand-showcase/pet-physical-feeding-and-play.gif` (9 frames).
