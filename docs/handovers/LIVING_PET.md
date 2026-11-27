# Subsystem Handover — Living Pet (`Quýt` 2D Overworld + Vuena 3D Pet Care V2)

Tài liệu tham chiếu gốc: [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) · [public/assets/pet-care-v2/CREDITS.md](../../public/assets/pet-care-v2/CREDITS.md) · [PROGRESS.md](../PROGRESS.md)

## 1. Current Canonical Implementation & Exact Source Paths
- **Pure TS Authority & Living Brain:**
  - `src/shared/pet/{petTypes,petNeeds}.ts`
  - `src/shared/petLiving/` (`petBrainContract04B.ts`, `petAutonomousController.ts`, `petBrainConfig.ts`, `petIntelligenceConfig.ts`, `petFoodCatalog.ts`, `petFoodIntent.ts`, `petPhysicalCare.ts`, `petPrimitivesAdapter.ts`, `petVisualTypes.ts`, `mainGame/`, `petMovement/`, `petCare/`, `donor/`)
- **Overworld 2D Cat (`Quýt`):**
  - `src/game/pet/{livingCatWorldSprite,PetAnimationController,PetLivingMainGameDriver,petSpriteBuilder}.ts`
  - `public/assets/pets/cat-orange-32px.png` (`32×32` top-down animated sheet, scale `0.78`) + `public/assets/unified/world-props.png`
- **3D Pet Care V2 Room (`vuena-cat.glb` từ OLW-Carbon `b162a2d` + Neon upgrades):**
  - `src/game/pet/care/` (`PetCareThreeStage.ts`, `CatGltfActor.ts`, `PetCareScene.ts`, `PetCareRuntime.ts`, `catBrain.ts`, `catPlayController.ts`, `catPawIk.ts`, `catAnatomyConstraints.ts`, `CatAnimationAdapter.ts`, `petCareAudio.ts`, `petCareBridgeState.ts`, `petCareQuality.ts`, `PetCareToyLayer.ts`, `PetCarePortraitRig*.ts`)
  - `src/features/petCare/{PetCareTouchOverlay,PetCareJ4lpanPortrait,petCareHandFeedAuthority}.tsx/.ts`
  - `src/features/pet/{PetShopCloseUpCat.tsx,petShopCloseUpCat.css}`
  - `public/assets/pet-care-v2/models/vuena-cat.glb` (`CC0 1.0`, 19 bones, 13 clips) + `audio/*.mp3` + `public/assets/audio/sprites/pet.{mp3,json}`
- **Dev LAN & SQL Persistence:** `scripts/devLanPetLiving.mjs`, `scripts/devLanPetLivingPlan.mjs`, `scripts/devLanPetCareSession.mjs`, `supabase/migrations/20261125000200..20261125160000*.sql`.

## 2. Existing Architecture & Contracts
- **Intent vs Authority Separation (`petBrainContract04B.ts`):** AI não bộ (`PetAutonomousController`, `PetBrainInputSnapshot`) chỉ phát sinh `PetActionIntent` (di chuyển, ăn/uống, phản ứng khi cặp đôi ngồi sofa hoặc học bài); lớp authority (`devLanPetLiving` / Supabase RPC) mới quyết định tiêu thụ thức ăn, cập nhật nhu cầu và phát sync.
- **2D ↔ 3D Scene Suspension:** Khi mở phòng **Chăm sóc mèo 3D**, `PetCareScene` bật `setPetCareModeActive(true)` để `PetCareThreeStage` (Three.js WebGL2) nhận trọn tài nguyên GPU/CPU với `CatGltfActor` (`vuena-cat.glb`), hỗ trợ vuốt ve raycast (`catPlayController`), đồ chơi (`ToyWorld` physics), cho ăn trực tiếp bằng tay (`petCareHandFeedAuthority`), audio mèo ghi âm thật (`meow_*`, `purr_*`) và preset đồ họa (`petCareQuality.ts`), sau đó đồng bộ `SharedPetCareSession` qua `/pet-care/session/patch` (có `idempotencyKey`).
- **Cozy Safety:** Mèo không chết khi người chơi bận hoặc offline lâu (`no punishing decay`).

## 3. Verified Donor Repositories & Imported Modules
Xem chi tiết tại [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) và [public/assets/pet-care-v2/CREDITS.md](../../public/assets/pet-care-v2/CREDITS.md):
- **3D Cat Model:** **Vuena** — *Cute Pets & Wildlife FREE Sample* (`GLB/animal_cat.glb`, **CC0 1.0**) → `public/assets/pet-care-v2/models/vuena-cat.glb`.
- **2D Overworld Cat:** **Frakassets** — *Free Pets Pack* (`CC BY 4.0`) → `public/assets/pets/cat-orange-32px.png`.
- **3D Room / Rig / Expressions:** `SawyerHood/nintendogs-threejs@43d231c` (`src/donors/nintendogs-cat-v2/`, chú thích không có file LICENSE gốc ở upstream — cần rà soát nếu phát hành thương mại công khai) & `j4lpan/pet-shop@77f8b59` (**MIT**) cho micro-expressions.
- **Audio:** Real CC0 / Mixkit Free License cat vocalizations & purr/eating SFX (`public/assets/pet-care-v2/audio/*.mp3`).

## 4. Owner-Approved Behavior
- Model mèo 3D Vuena cùng đầy đủ tương tác vuốt ve, cho ăn, đồ chơi, âm thanh mèo thật (đã tinh chỉnh tự nhiên ở OLW-Neon) và mèo 2D `Quýt` `32×32` đi dạo quanh nhà/vườn tránh tường, đồ đạc và avatar.
- Chạm trực tiếp vào mèo trên cả desktop và mobile đều mở thẳng **Chăm sóc mèo 3D** ngay cả khi nhân vật đang cầm nông cụ trên tay.

## 5. Known Bugs & Untested Scenarios
- Nghiệm thu phiên chơi dài `OLW_ACCEPTANCE_LONG=1` (`npm run test:e2e:pet-care-long`) và hiệu năng WebGL2 Three.js trên **iPhone 16 Pro Max Safari thật** sau hợp nhất `v0.2.5` chưa chạy lại.
- `SawyerHood/nintendogs-threejs` upstream thiếu LICENSE rõ ràng trong repo gốc (đã ghi minh bạch trong `THIRD_PARTY_NOTICES.md`).

## 6. Historical Regressions That Must Not Return
- **Mèo 2D đi xuyên tường / hàng rào / đồ nội thất đặt thêm:** Mọi thay đổi map hoặc đặt đồ phải pass `petUnifiedCollision.test.ts` & `cat2dNavigationAndCollision.test.ts`.
- **Rơi về model/mesh cũ hoặc mất âm thanh `vuena-cat.glb`:** Giữ nguyên `CatGltfActor` làm actor mặc định và giữ đủ asset `public/assets/pet-care-v2/`.
- **Chạm vào mèo khi cầm cuốc/bình tưới bị hiểu nhầm là dùng nông cụ:** Giữ ưu tiên mở Pet Care khi click/tap trúng hitbox mèo trên `MainGameInteractionLayer` / `WorldScene`.

## 7. Focused Test Commands
```bash
npx vitest run tests/unit/petUnifiedCollision.test.ts tests/unit/petBrainAutonomous.test.ts tests/unit/petCareV2CatBrain.test.ts tests/unit/petLivingIntelligence.test.ts tests/unit/petRealVocalizations.test.ts tests/unit/cat2dNavigationAndCollision.test.ts tests/unit/petCareM1Adapter.test.ts tests/unit/petCareSessionGoals.test.ts tests/server/v015Pet.test.ts
npx playwright test tests/e2e/pet-care-living-v2.spec.ts --project=chromium-desktop
```

## 8. Dependencies on Other Subsystems
- **Maps & Decorate (`ART_AND_ANIMATION.md`):** Đọc lưới vật cản tĩnh và đồ nội thất đặt động từ `placement.ts` / `WorldScene.ts`.
- **Multiplayer & Audio:** Đồng bộ `SharedPetCareSession` (`idempotencyKey`) qua Dev LAN / Supabase và dùng chung hệ thống tắt/tạm dừng âm thanh nền (`gameAudioManager.ts` + `ambientAudio.ts`).
