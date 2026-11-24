# Neon Night Checkpoint — `neon/night-dev`

Cập nhật tự động bởi agent triển khai ban đêm trên nhánh `neon/night-dev` tại `C:\Users\admin\Downloads\Our_little_world`.

## Ràng buộc an toàn đang giữ vững
- Không chạm vào sibling worktrees (`OLW-gpt-night`, `OLW-deepseek-night`).
- Không sửa `src/shared/realtime.ts` (`MovementTxThrottle`, `MovementPacket`).
- Không sửa các migration V0.1 đã chốt (`supabase/migrations/20261124000100..0300`).
- Không xây dựng engine kinh tế cạnh tranh (thuộc phạm vi `OLW-020-*`).
- Không push Git, không deploy Internet, không chạy SQL lên Supabase Cloud, không commit `asset-candidates/` hay `public/assets/private-unified/`.

## Tiến độ từng Phase & Commit

- **Commit `03072e4` — Phase 1 & 2 (Demo E Art Restoration & Visual QA Gate):** **Implemented & Locally tested** (`21` world/avatar ID + `57` props/anim ID, adaptive follow camera, `8/8` Playwright E2E + `verify-prod-guard.mjs` + 8 QA screenshots inspected).
- **Commit `b5c6faa` — `OLW-015-01` Inventory Foundation (`K5`):** **Implemented & Locally tested** (`supabase/migrations/20261125000100_v015_inventory_and_catalog.sql`, `src/shared/inventory/*`, `DevLan` + `SupabaseBackend`, `InventoryModal.tsx`, `inventoryRules.test.ts` + `v015Inventory.test.ts`).
- **Commit `3d8a630` — `OLW-015-03/04` Living Pet MVP (`cat-orange`):** **Implemented & Locally tested** (`supabase/migrations/20261125000200_v015_pet_mvp.sql`, `src/shared/pet/*`, `PetEntity.ts`, `PetPanel.tsx` + `petAudio.ts`, `petNeeds.test.ts` + `v015Pet.test.ts`).
- **Commit `eb5d202` — `OLW-015-05/06` Silent Study Room & Pomodoro Co-Presence:** **Implemented & Locally tested** (`THIRD_PARTY_NOTICES.md`, `supabase/migrations/20261125000300_v015_study_pomodoro.sql`, `src/shared/study/*` port MIT `cocoworking`, `PomodoroPanel.tsx` + `ambientAudio.ts`, ghế bàn học + mèo nằm cạnh góc học tắt tiếng, `pomodoro.test.ts` + `v015Study.test.ts`).
- **Commit `d40b2e1` — `OLW-015-07` Couple Interactions & Static Photo Frame:** **Implemented & Locally tested** (`src/shared/couple/*`, `DevLan` + `SupabaseBackend` `couple_event` broadcast/SSE, `CoupleActionBar.tsx`, `PhotoFrameModal.tsx`, ngồi sofa/ghế vườn 2 slot, nằm giường + chăn pixel, mời ôm 15s + bong bóng tim, `coupleProtocol.test.ts`).
- **Commit `3e7ed72` — `OLW-015-02` Mailbox & Surprise Gifts:** **Implemented & Locally tested** (`supabase/migrations/20261125000400_v015_mailbox_and_gifts.sql`, `src/shared/mailbox/*`, giấu nội dung quà bất ngờ phía server trước khi mở, `MailboxModal.tsx` plain-text an toàn XSS, badge thư chưa đọc trên hòm thư đỏ ngoài vườn, `v015Mailbox.test.ts`).
- **Commit `400e054` — `OLW-015-08` Dev Console (`K6`) & `supabase/dev-migrations/`:** **Implemented & Locally tested** (`supabase/dev-migrations/20261125900100_dev_console_rpcs.sql` cách ly khỏi `supabase/migrations/`, Dev LAN `/dev-console/*` spawn item/set pet/tua Pomodoro/export+restore snapshot khử bí mật, `DevConsoleDrawer.tsx` + phím `Ctrl+Shift+D` chỉ nạp ở `import.meta.env.DEV`, `verify-prod-guard.mjs` đã bổ sung marker, `v015DevConsole.test.ts`).
- **Commit `5db098b` — Phase 4 Prototype UI V0.3 (Dev-only):** **Implemented & Locally tested** (`V03PrototypesModal.tsx` Nhật ký/Wishlist/Album/Bếp·Chợ·Mini-game cục bộ không giả lập tiền tệ hay Cloud, nạp lười sau `import.meta.env.DEV`, `verify-prod-guard.mjs` xác nhận loại bỏ 100% khỏi `dist/assets/*.js`).
- **Commit `e47b477` — Phase 5 Cổng kiểm chứng & Visual QA V0.1.5:** **Implemented & Locally tested** (`tests/e2e/v015-living-home.spec.ts`, sửa tương phản nhãn trong hộp thư & định vị lại joystick không đè thanh tương tác di động).
  - **Còn chờ (`Pending cloud/device verification`):** Áp dụng `supabase/migrations/20261125000100..0500` lên Supabase Cloud thật, chạy kiểm thử trên iPhone Safari thật (PWA Home Screen + audio trên thao tác chạm thật), và thử 2 máy thật qua LAN/WAN. Không áp dụng `supabase/dev-migrations/` lên bản Production.

## Pre-Integration Execution Override (Baseline `e47b477` — Trạng thái `Implemented & Locally tested`, Chờ duyệt trực quan)

- **Commit `afd75bb` — Milestone M1 (P0):** Bật `"typecheck": "tsc -b"`, sửa lỗi đăng ký frame trong `src/game/art/worldAtlas.ts` (`Math.max(entry.frameCount, cols * rows)`), hardening `supabase/migrations/20261125000500_v015_inventory_security_and_quality_prep.sql` (`REVOKE ALL ON FUNCTION ...` khỏi `PUBLIC, anon, authenticated, service_role`, khóa `worlds FOR UPDATE` + delta upsert nguyên tử), kèm `supabase/tests/v015_inventory_security.sql` và test song song Dev LAN (`tests/server/v015Inventory.test.ts`).
- **Commit `1605435` — Milestone M2 (P1):** Sprite mèo thủ công `24×24px` (`src/game/pet/petSpriteBuilder.ts`) với 3 biến thể độc lập (`ginger-tabby` Quýt, `cream-puff` Mochi, `calico-patch` Bông), 4 phụ kiện, 27 animation tracks, `PetAnimationController.ts` (`wake_yawn_stretch` 1.2s, facing hysteresis 220ms), `/?pet-art=1` (`PetArtSandbox.tsx`), `tests/unit/petAnimationController.test.ts`.
- **Commit `411efb2` — Milestone M3 (P2–P4):** Hệ thống tương tác ngữ cảnh (`src/shared/interaction/*` — `WASD`/`J`/`K`/`I`/`1-8`/`Escape`, chấm điểm khoảng cách + hướng nhìn, `isEditableInputTarget`), `HeldItemRenderer.ts`, catalog thức ăn an toàn (`petFoodCatalog.ts`), vòng đời chăm sóc bảo toàn 1:1 `Inventory → Bowl → Consumed` & nhận nuôi mèo hoang (`petPhysicalCare.ts`), nâng cấp `PetEntity.ts` về tỷ lệ gốc 1:1 `24×24px`, `tests/unit/interactionResolver.test.ts`, `tests/unit/petPhysicalCare.test.ts`.
- **Commit `e4eb0aa` — Milestone M4 (P7–P8):** Adapter Pre-Integration `src/shared/petLiving/petPrimitivesAdapter.ts`, cấu hình 7 tính cách / 8 nhu cầu non-lethal (`FLOOR=25..30`) / 9 cảm xúc / 14 affordance & anti-sleep-loop `<35` (`petIntelligenceConfig.ts`), 18 kịch bản kiểm chứng (`petLabSimulation.ts`), `/?pet-lab=1` (`PetLabModal.tsx`), bổ sung 6 marker dev vào `scripts/verify-prod-guard.mjs`, `tests/unit/petLivingIntelligence.test.ts`.
- **Commit `1f5b8d4` — Milestone M5 (UI & Shared Life):** Hệ thống Game UI (`src/ui/designSystem/gameUiTokens.css` — 2 biến thể `Warm Pixel Cottage` & `Illustrated Storybook`, `GameIcons.tsx`), `GameHotbar`, `ContextualPromptBadge`, `GameDialogueBox`, `OurLittleNotebook` + `PetNotebookPage`, contract & Dev LAN stubs Shared Life V0.3 (`src/shared/sharedLife/sharedLifeTypes.ts`, `scripts/devLanSharedLifeHandlers.mjs`), `/?ui-sandbox=1` (`UiVariantsSandbox.tsx`), `tests/server/v03SharedLife.test.ts`.
- **Commit `0a8ec8c` + Commit Polish/E2E — Milestone M6 (World Expansion & Combined Showcase):** Bản đồ mở rộng `64×64` / `96×96` với 10 landmark (`src/game/worldSandbox/*`), `/?world-sandbox=1`, `/?experience-demo=1` (`CombinedExperienceDemo.tsx` với Touch D-pad + thanh công cụ thu gọn trên mobile), `tests/unit/worldExpansionMap.test.ts`, `tests/e2e/grand-experience-sandboxes.spec.ts` cùng bộ visual QA & 2 GIF thực tế.

### Ranh Giới Pre-Integration Fixture & Xung Đột Bàn Giao Cho Integration Master
1. **`src/shared/petLiving/petPrimitivesAdapter.ts` (`[PRE-INTEGRATION ADAPTER FIXTURE]`):** Đang chạy adapter giả lập tạm để tách nhánh trước Integration; khi gộp với `OLW-deepseek-night`, nối thẳng vào `src/shared/petAdvanced/primitives/` (yêu cầu đúng contract DeepSeek `PET_AI_PRIMITIVES_HANDOVER.md`: `capacity: 24`, không xếp hạng người chăm, truyền `nowMs` xác định).
2. **Xung đột số hiệu migration với nhánh GPT:** `OLW-gpt-night` có `20261125000100_v01_security_hardening.sql` trùng tiền tố với `20261125000100_v015_inventory_and_catalog.sql` trên `neon/night-dev`. Không tự ý đổi số phiên bản các file `20261125000100..0400` trước khi Integration Master gộp migration.
3. **Danh sách Dev Sandbox URLs (chỉ bật khi `import.meta.env.DEV === true`, đã verify loại bỏ khỏi `dist/`):**
   - `/?pet-art=1` — So sánh 3 giống mèo & 27 animation tracks
   - `/?ui-sandbox=1` — Đổi qua lại Variant A (`Warm Pixel Cottage`) & Variant B (`Illustrated Storybook`)
   - `/?world-sandbox=1` — Bản đồ mở rộng `64×64` ↔ `96×96` & 10 địa điểm
   - `/?pet-lab=1` — Trình thử nghiệm 18 kịch bản AI, 7 tính cách & thanh 8 nhu cầu
   - `/?experience-demo=1` — Bản tổng hợp tương tác vật lý `[J]`/`[K]`/`1-8`, nhận nuôi, Sổ chung & Touch D-pad

### Kết Quả Kiểm Chứng Tổng Hợp Mới Nhất (`neon/night-dev`, port `4176`)
- `npm run lint`: **Pass** (0 errors)
- `npm run typecheck` (`tsc -b`): **Pass** (0 errors)
- `npm test`: **Pass — 23 files, 68/68 tests pass**
- `npm run build` + `node scripts/verify-prod-guard.mjs` + `npm run build:private`: **Pass** (0 dev leaks)
- `PLAYWRIGHT_PORT=4176 npx playwright test`: **13 passed, 1 skipped** (bài quay GIF desktop bỏ qua có chủ đích trên project iPhone):
  - `tests/e2e/v01-our-little-home.spec.ts`: **8/8 pass**
  - `tests/e2e/v015-living-home.spec.ts`: **2/2 pass**
  - `tests/e2e/grand-experience-sandboxes.spec.ts`: **3/3 active runs pass** trên Desktop `1280×720`, Mobile `430×932`, Small `390×844` và Landscape `844×390`
- **Bằng chứng hình ảnh & GIF (`test-results/grand-showcase/`):**
  - `01-pet-art-{desktop,mobile}.png`, `02-ui-cottage-{desktop,mobile}.png`, `03-ui-storybook-{desktop,mobile}.png`, `04-world-expansion-{desktop,mobile}.png`, `05-pet-lab-{desktop,mobile}.png`, `06-combined-experience-{desktop,mobile}.png`, `07-notebook-pet-{desktop,mobile}.png`, `08-combined-small-390x844.png`, `09-combined-landscape-844x390.png`
  - `pet-locomotion-and-wake.gif` (12 frames) & `pet-physical-feeding-and-play.gif` (9 frames)
- **Tài liệu Phase 14:** `docs/pet/LIVING_PET_QUALITY_REPORT.md`, `docs/ui/GAME_UI_DESIGN_SYSTEM.md`, `docs/gameplay/PHYSICAL_INTERACTION_SPEC.md`, `docs/world/WORLD_EXPANSION_DESIGN.md`, `docs/research/QUALITY_AUDIT.md`.
- **Hạng mục còn chờ phê duyệt / hạ tầng thật:** Chủ dự án chọn biến thể mèo (`Quýt` / `Mochi` / `Bông`), biến thể UI (`Cottage` / `Storybook`) và cỡ map (`64×64` / `96×96`); Integration Master xử lý xung đột migration `20261125000100` + nối `OLW-deepseek-night`; chạy `supabase/tests/v015_inventory_security.sql` trên PostgreSQL / Supabase Cloud thật và nghiệm thu trên iPhone Safari thật + Redmi K70E.
