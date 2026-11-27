# Regression Verification Checklist (`v0.2.5` Canonical Baseline)

Checklist chống hồi quy dùng cho cả **Feature Agent** (trước bàn giao) và **Integration & Release Agent** (trước khi gộp vào `main`).

---

## 1. Cổng Vệ sinh Git, Tài nguyên & Build (Bắt buộc mọi PR/Feature)

- [ ] **Git hygiene:** `git status --short` không chứa `.env`, `.dev-lan-state*.json`, `public/assets/private-*`, `public/assets/local-licensed/`.
- [ ] **Ancestry:** `git merge-base --is-ancestor origin/main HEAD` pass (`exit 0`).
- [ ] **Private runtime assets:** `npm run assets:private:verify` -> PASSED (10 atlas/character files + 5 track nhạc nền).
- [ ] **Lint:** `npm run lint` -> 0 errors (hiện baseline có 1 warning sẵn tại `src/features/donor/ChillFishingModal.tsx:90`, không thêm warning mới).
- [ ] **Typecheck:** `npm run typecheck` -> exit 0.
- [ ] **Production build & Guard:** `npm run build && node scripts/verify-prod-guard.mjs` -> exit 0 (0 dev/private/LAN leaks trong `dist/assets/*.js`, không trùng precache URL trong `dist/sw.js`).

---

## 2. Kiểm thử Chức năng theo Hệ thống con (Focused Gates)

Chỉ chạy các nhóm bài test liên quan trực tiếp + nhóm phụ thuộc khi động vào file dùng chung (`App.tsx`, `WorldScene.ts`, `devLanServerPlugin.mjs`):

### Multiplayer (`NET.1` / `NET.1.1`)
- [ ] `npx vitest run tests/unit/netcodeCore.test.ts tests/unit/networkDiagnosticsOverlay.test.tsx tests/unit/realtimePresenceSync.test.ts tests/server/multiplayerHardening.test.ts tests/server/remoteShareTunnel.test.mjs tests/server/devLanServer.test.ts`
- [ ] `npx playwright test tests/e2e/multiplayer-ws-hardening.spec.ts --project=chromium-desktop`

### Deep Farming & Economy (`Checkpoints A–G`)
- [ ] `npx vitest run tests/unit/farming.test.ts tests/unit/deepCropSimulation.test.ts tests/unit/flowerGeneticsOrchard.test.ts tests/unit/livestock.test.ts tests/unit/workshopsEconomy.test.ts tests/unit/orderBoard.test.ts tests/unit/farmingSpriteAtlas.test.ts tests/unit/farmVisualScaleParity.test.ts tests/unit/catalogParity.test.ts tests/server/deepFarmingCoopAuthority.test.ts`
- [ ] `npx playwright test tests/e2e/donor-economy-two-client.spec.ts tests/e2e/farming-co-op.spec.ts --project=chromium-desktop`

### Billiards V2
- [ ] `npx vitest run tests/unit/billiardsPhysicsDeterminism.test.ts tests/unit/billiardsProtocol.test.ts tests/unit/billiardsModalLifecycle.test.tsx tests/server/billiardsDevLan.test.ts`
- [ ] `npx playwright test tests/e2e/billiards-multiplayer.spec.ts --project=chromium-desktop`

### Art, Maps, Collisions, Inventory & Audio
- [ ] `npx vitest run tests/unit/worldReconstructionGraph.test.ts tests/unit/audioBiomesAndFootsteps.test.ts tests/unit/npcDialogueAndLivingWorld.test.ts tests/unit/donorPunyAvatarSheet.test.ts tests/unit/privateArtAvatarPipeline.test.ts tests/server/unifiedAtlas.test.ts tests/server/verifyPrivateBuild.test.mjs`
- [ ] Kiểm tra thủ công hoặc Playwright trên `http://localhost:5173`: đi qua 6 map (`home`, `garden`, `village`, `forest`, `beach`, `farm`), kéo/bấm ô túi đồ Nuvora, kiểm tra không có overlay kẹt và đúng 5 track `/assets/private-audio/music/*.mp3` tải `200`/`206`.

### Living Pet (2D `Quýt` + 3D `vuena-cat.glb`)
- [ ] `npx vitest run tests/unit/petUnifiedCollision.test.ts tests/unit/petBrainAutonomous.test.ts tests/unit/petCareV2CatBrain.test.ts tests/unit/petLivingIntelligence.test.ts tests/unit/petRealVocalizations.test.ts tests/unit/cat2dNavigationAndCollision.test.ts tests/server/v015Pet.test.ts`
- [ ] Mở **Chăm sóc mèo 3D**, kiểm tra `vuena-cat.glb` render, các preset chất lượng, âm thanh mèo CC0 và đóng quay lại overworld mượt.

---

## 3. Cổng Playtest Thủ công cho Chủ dự án (Khi tích hợp lớn)

1. Chạy từ `C:\Users\admin\Downloads\Our_little_world`: `npm run host:couple`.
2. PC Host (`Mây`) giữ nguyên dữ liệu nhà & `.dev-lan-state.json`; bật chia sẻ `/__share/<token>` qua Cloudflare Quick Tunnel.
3. iPhone Safari / PWA mở trực tiếp link `/__share/<token>` → vào thẳng vai `Nắng`, kiểm tra `Status: Connected`, `Transport: WSS`, chuyển map không lag/kẹt, chuyển Wi-Fi ↔ 5G tự phục hồi, túi đồ + nông trại + bàn bi-a + mèo 3D hoạt động không mất trạng thái.

---

## 4. Các Ngoại lệ & Giới hạn Đã biết ở Baseline `v0.2.5`

- **Vitest `jsdom` Canvas 2D:** `tests/unit/donorCabacosRenderDetect.test.ts` và `tests/unit/pydewFarmDonorRender.test.ts` fail khi chạy full `npm run test` do `phaser.esm.js` gọi `canvas.getContext('2d')` bị `null` trong `jsdom` (đã có từ `f69106e`, không phải hồi quy mới; đã xác nhận Chromium thật).
- **E2E legacy UI drift:** Các spec cũ trước V0.2 (`v01-our-little-home.spec.ts`, `v015-living-home.spec.ts`, `tiled-world-two-client.spec.ts`) có drift selector/UI so với thanh điều hướng & túi đồ Nuvora hiện tại (xem `docs/PROGRESS.md` dòng 75, 85).
- **Chưa nghiệm thu sau hợp nhất trên thiết bị/hạ tầng thật:** Test cặp đôi iPhone Safari + PWA + Cloudflare Quick Tunnel trên bản gộp RC1 (`Deep Farming + Billiards V2 + Vuena Cat`) và chạy migration SQL thật trên Supabase Cloud (`supabase/migrations/20261126000100..20261127000200`).
