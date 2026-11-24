# Quality Audit & Pre-Integration Technical Handover

- **Nhánh:** `neon/night-dev`
- **Commit baseline kiểm tra:** `e47b477`
- **Chuỗi commit Pre-Integration Override:** `afd75bb` (M1) → `1605435` (M2) → `411efb2` (M3) → `e4eb0aa` (M4) → `1f5b8d4` (M5) → `0a8ec8c` (M6) → polish & handover commits.

## 1. Các Lỗi Nền Tảng Đã Phát Hiện & Khắc Phục
1. **`tsc --noEmit` kiểm tra 0 file (`tsconfig.json` có `"files": []`):** Đã đổi `"typecheck"` trong `package.json` sang `"tsc -b"` để kiểm tra thật cả `tsconfig.app.json` và `tsconfig.node.json` (khắc phục lỗi build tiềm ẩn ngay từ M1).
2. **`worldAtlas.ts` cắt cụt frame animation:** Sửa vòng lặp đăng ký lưới spritesheet từ `frameCount` sang `Math.max(entry.frameCount, cols * rows)`.
3. **Bảo mật & nguyên tử Inventory PostgreSQL (`20261125000500_v015_inventory_security_and_quality_prep.sql`):** Thu hồi quyền `EXECUTE` trên helper nội bộ khỏi `PUBLIC, anon, authenticated, service_role`; nâng cấp `_inventory_adjust_item` dùng khóa `worlds FOR UPDATE` + `INSERT ... ON CONFLICT DO UPDATE` nguyên tử và đồng bộ test cạnh tranh cho Dev LAN (`tests/server/v015Inventory.test.ts`).
4. **React 19 StrictMode Double-Canvas:** Áp dụng `requestAnimationFrame` guard + `game?.canvas?.remove()` + `host.replaceChildren()` trong `WorldExpansionSandbox.tsx` và `CombinedExperienceDemo.tsx`.
5. **Tràn ngang trên Dev Pet Lab & Typography Variant B:** Sửa chuỗi `7 Traits` bằng `overflowWrap: 'anywhere'`, đổi font Storybook từ `Georgia` (lỗi dấu tiếng Việt trên Windows) sang `'Cambria', 'Times New Roman', serif`, và sửa animation modal `OurLittleNotebook` không lộ nền.

## 2. Kết Quả Kiểm Chứng Thực Tế Mới Nhất
- `npm run lint`: **0 errors**
- `npm run typecheck` (`tsc -b`): **0 errors**
- `npm test` (`vitest run`): **23 files, 68/68 tests pass** (gồm unit tests cho `interactionResolver`, `petAnimationController`, `petPhysicalCare`, `petLivingIntelligence`, `worldExpansionMap`, `v03SharedLife` + toàn bộ tests V0.1 & V0.1.5)
- `npm run build` + `node scripts/verify-prod-guard.mjs` + `npm run build:private`: **PASSED** (0 dev leaks; toàn bộ 5 sandbox `/?pet-art=1`, `/?ui-sandbox=1`, `/?world-sandbox=1`, `/?pet-lab=1`, `/?experience-demo=1` nạp lười sau `import.meta.env.DEV` và bị loại khỏi `dist/assets/*.js`)
- `PLAYWRIGHT_PORT=4176 npx playwright test`: **13 passed, 1 skipped** (skip có chủ đích đối với bài quay GIF desktop khi chạy trên project mobile):
  - `v01-our-little-home.spec.ts`: **8/8 pass**
  - `v015-living-home.spec.ts`: **2/2 pass**
  - `grand-experience-sandboxes.spec.ts`: **3/3 active runs pass** trên Desktop `1280×720`, Mobile `430×932`, Small `390×844` và Landscape `844×390` kèm 2 GIF chuyển động thật.

## 3. Hạng Mục Còn Chờ (Không Khai Khống `Accepted`)
1. **Xác nhận trực quan từ chủ dự án:** Duyệt biến thể mèo (`Quýt`, `Mochi`, `Bông`), biến thể UI (`Warm Pixel Cottage` vs `Illustrated Storybook`), và kích thước bản đồ (`64×64` vs `96×96`).
2. **Tích hợp trong Integration Master:**
   - Gộp migration đánh số trùng `20261125000100` giữa GPT (`v01_security_hardening`) và Neon (`v015_inventory_and_catalog`) + chạy `supabase/tests/v015_inventory_security.sql` trên PostgreSQL / Supabase Cloud thật.
   - Nối `src/shared/petLiving/petPrimitivesAdapter.ts` (`[PRE-INTEGRATION ADAPTER FIXTURE]`) vào module `OLW-deepseek-night/src/shared/petAdvanced/primitives/`.
3. **Kiểm thử thiết bị thật:** iPhone Safari (PWA Home Screen + audio) và 2 máy Windows ↔ Redmi K70E.
