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
- **Commit (hiện tại) — `OLW-015-08` Dev Console (`K6`) & `supabase/dev-migrations/`:** **Implemented & Locally tested** (`supabase/dev-migrations/20261125900100_dev_console_rpcs.sql` cách ly khỏi `supabase/migrations/`, Dev LAN `/dev-console/*` spawn item/set pet/tua Pomodoro/export+restore snapshot khử bí mật, `DevConsoleDrawer.tsx` + phím `Ctrl+Shift+D` chỉ nạp ở `import.meta.env.DEV`, `verify-prod-guard.mjs` đã bổ sung marker, `v015DevConsole.test.ts`).
