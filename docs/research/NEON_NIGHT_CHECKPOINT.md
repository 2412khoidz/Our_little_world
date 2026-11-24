# Neon Night Checkpoint — `neon/night-dev`

Cập nhật tự động bởi agent triển khai ban đêm trên nhánh `neon/night-dev` tại `C:\Users\admin\Downloads\Our_little_world`.

## Ràng buộc an toàn đang giữ vững
- Không chạm vào sibling worktrees (`OLW-gpt-night`, `OLW-deepseek-night`).
- Không sửa `src/shared/realtime.ts` (`MovementTxThrottle`, `MovementPacket`).
- Không sửa các migration V0.1 đã chốt (`supabase/migrations/20261124000100..0300`).
- Không xây dựng engine kinh tế cạnh tranh (thuộc phạm vi `OLW-020-*`).
- Không push Git, không deploy Internet, không chạy SQL lên Supabase Cloud, không commit `asset-candidates/` hay `public/assets/private-unified/`.

## Tiến độ từng Phase & Commit

### Phase 1 & 2 — Khôi phục chất lượng mỹ thuật Demo E trong game chính & Visual QA Gate
- **Trạng thái:** `Implemented` & `Locally tested` (chờ nghiệm thu Cloud/iPhone Safari thật).
- **Nội dung đã hoàn thành:**
  - Nâng cấp pipeline atlas (`scripts/build-unified-atlas.mjs`, `scripts/unified-atlas-art.mjs`, `scripts/build-private-atlas.py`, `scripts/atlas-sources/free-pets-cat-sheet.json`, `scripts/atlas-sources/demo-e-textures.json`):
    - Cắt 1:1 native pixel cho toàn bộ 12 nội thất V0.1 (sửa triệt để lỗi méo/lệch ô của `bed_cozy`, `wardrobe_oak`, `bookshelf_warm`, `lamp_floor`, `sofa_cream`, `table_wood`, `desk_study`, `plant_monstera`, `rug_peach`, `lantern_garden`).
    - Bổ sung hàng pose ngồi (`sit`, 24 frames/tóc) cho `avatars.png` (Adam/Alex/Amelia + fallback CC0) và animation `:sit-*` trong `phaserAvatarTexture.ts`.
    - Xuất `world-props.png` + `props-manifest.json` cho cả `unified` (CC0 + `CC BY 4.0` `cat-orange` 128f + `_shadow`) và `private-unified` (đầy đủ props + sheet hoạt ảnh Demo E).
  - Nâng cấp `WorldScene.ts` & `worldCamera.ts`:
    - Bổ sung cảnh quan đồng cỏ liên hoàn bên ngoài nhà/vườn (`meadow_tile` 64x64 + hoa dại + cây anh đào/táo/sồi/đào), viền nhà ấm áp, hiên nhà, hộp thư đỏ, lò sưởi cháy (`olw-fire`), quầy bếp + TV, góc thú cưng (thảm + bát), ánh nắng xiên, đèn tỏa sáng dịu và tên nhân vật nhỏ gọn.
    - Khu vườn: ao cong với nước động (`olw-water`), cầu gỗ đôi, hoa sen/súng/sậy, vịt/ếch/gà/cừu/cối xay gió hoạt ảnh, thảm picnic anh đào, luống hoa/rau hướng dương có hàng rào + tổ ong và cánh hoa anh đào rơi nhẹ.
    - Camera adaptive follow mượt cho `430×932` portrait (`2.0×` integer) & `844×390` landscape khi chơi, chuyển sang `fitWorldZoom` khi vào Chế độ Trang trí.
- **Kiểm chứng đã chạy sau chỉnh sửa:**
  - `npm run assets:atlas` + `npm run assets:atlas:private` OK (`21` world/avatar ID + `57` props/anim ID).
  - `npm run lint` PASS; `npm run typecheck` PASS; `npm test` (`8` files, `32` tests) PASS.
  - `npm run build && node scripts/verify-prod-guard.mjs` PASS (`0` dev leak, precache verified).
  - `npm run build:private` PASS.
  - `PLAYWRIGHT_PORT=4176 npx playwright test` PASS (`8/8` desktop + `430×932` mobile).
  - Đã kiểm tra trực quan 8 ảnh PNG trong `test-results/v01-demo-e-restored/`.

### Phase 3 — V0.1.5 Living Home (Đang triển khai tuần tự)
- `OLW-015-01` Inventory Foundation (`K5`): **Implemented & Locally tested** (`supabase/migrations/20261125000100_v015_inventory_and_catalog.sql`, `src/shared/inventory/*`, `DevLan` + `SupabaseBackend`, `InventoryModal.tsx`, `inventoryRules.test.ts` + `v015Inventory.test.ts` — `10` files / `38` tests PASS).
- `OLW-015-03/04` Living Pet MVP (`cat-orange`): *In progress*
- `OLW-015-05/06` Silent Study Room & Pomodoro: *Pending*
- `OLW-015-07` Couple Interactions & Photo Frame: *Pending*
- `OLW-015-02` Mailbox & Gifts: *Pending*
- `OLW-015-08` Dev Console (`K6`) & `supabase/dev-migrations/`: *Pending*
