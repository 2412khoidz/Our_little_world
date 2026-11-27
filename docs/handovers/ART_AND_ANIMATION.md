# Subsystem Handover — World Maps, Art Direction, Avatar, Inventory & Audio

Tài liệu tham chiếu gốc: [ART_DIRECTION_CONTRACT.md](../ART_DIRECTION_CONTRACT.md) · [UPSTREAM_REUSE.md](../UPSTREAM_REUSE.md) · [PRIVATE_ASSETS_SETUP.md](../PRIVATE_ASSETS_SETUP.md) · [public/assets/audio/CREDITS.md](../../public/assets/audio/CREDITS.md)

## 1. Current Canonical Implementation & Exact Source Paths
- **Bản đồ `16×16` & Collision / Portals:** `src/assets/maps/` & `public/assets/maps/` (`home.json`, `garden.json`, `farm.json`, `village.json`, `beach.json`, `forest.json`, `shop*.json`), `src/shared/maps.ts`, `src/shared/placement.ts`, `src/game/world/` (`WorldLightingOverlay.ts`, `tiledWorldNpcs.ts`, `tiledZoneAccents.ts`, `privateArtCapability.ts`), `src/game/scenes/{BootScene,WorldScene}.ts`.
- **Avatar & Animation (Cozy Human V2 + PyDew Farmer):** `src/game/art/` (`avatarRig.json`, `avatarSpriteBuilder.ts`, `donorPydewFarmerAvatarTexture.ts`, `donorPunyAvatarTexture.ts`, `phaserAvatarTexture.ts`, `worldAtlas.ts`, `worldCamera.ts`), `src/shared/donor/pydewFarmerCharacterSheet.ts`, `src/shared/avatar.ts`.
- **Private Unified Runtime Assets (Local-only, gitignored):**
  - `public/assets/private-unified/` (`world.png`, `world-props.png`, `avatars.png` `384×384`, `manifest.json`, `props-manifest.json`, `donor-pydew-characters/farmer-{may,nang,rose}-atlas.png`).
  - `public/assets/private-audio/music/` (`home_garden_theme.mp3`, `farm.mp3`, `blue_forest.mp3`, `beach.mp3`, `pet_care.mp3`).
  - Script đồng bộ & kiểm tra: `scripts/sync-private-assets.mjs`, `scripts/verify-private-build.mjs`, `src/shared/art/privateUnifiedAtlas.ts`.
- **UI Túi đồ & HUD:** `src/features/inventory/` (Nuvora Interactive Inventory Skin, `CatalogPropsIcon`), `src/features/npc/NpcDialogueOverlay.tsx`, `src/features/home/{TopStatusBar,QuickNavBar}.tsx`, `public/assets/ui/hybrid/`.
- **Audio & NPC Dialogue:** `src/game/audio/gameAudioManager.ts`, `src/shared/audio/{surfaceFootsteps,catVocalizationScheduler}.ts`, `src/shared/npc/npcDialogueRegistry.ts`.

## 2. Existing Architecture & Contracts
- **Strict `16×16` Pixel Contract:** Phaser khởi tạo với `pixelArt: true`, `roundPixels: true`, `antialias: false`; toàn bộ texture pixel dùng `NEAREST`. Props đa độ phân giải đi qua helper scale chuẩn (`applyWorldFurnitureDisplaySize`) không sai lệch `blockedGrid` hay cửa portal.
- **Dual Art Profile Safety:** Build công khai (`npm run build`) dùng starter/MIT/CC0 assets và bị `scripts/verify-prod-guard.mjs` + `scripts/verify-private-build.mjs` chặn **tuyệt đối** không đóng gói `/assets/private-unified` hay `/assets/private-audio` vào Service Worker precache (`dist/sw.js`).
- **Audio Biome Routing:** `GameAudioManager` tự ưu tiên track từ `/assets/private-audio/music/*` khi khả dụng trên host local, fallback sạch về `public/assets/audio/music/*` (MIT) khi chạy profile public; phát tiếng bước chân theo bề mặt (`soil`, `sand`, `wood`, `stone`, `water`, `grass`).

## 3. Verified Donor Repositories & Imported Modules
- **Maps & Props:** `goncalojbsousa/Farming-Simulator-Cabacos@79e423d` (MIT — `village`, `farm`, `beach` base, 4 `shop_*` Sunnyside plates), `robintrepte/hollowmere.tretu.de@a7a8e5a` (MIT — beach/farm sprite props & music), `Tuxemon/Tuxemon@4e63c45` (`tt_forest_route1` → `forest.json`), Sprout Lands / Demo E (`home`, `garden`, hybrid UI emotes), `Blinter/harvest-horizon` (MIT — `garden.mp3`, `blue_forest.mp3`), `bitkiln` Kiln Harvest Free Sampler (`public/assets/ui/hybrid/`).
- **Characters:** `artemn0va/pydew-valley@5b33bfd` (CC0 — PyDew farmer `farmer-{may,nang,rose}-atlas.png`), plus Puny/Modern Interiors wardrobe adapters.

## 4. Owner-Approved Behavior
- Bảo toàn 100% 6 khu vực + 4 shop nội thất hiện có, portal dịch chuyển êm không bounce ngược, nhân vật Cozy Human V2, tương tác túi đồ Nuvora kéo/bấm mượt không kẹt overlay, âm thanh 5 track riêng tư của chủ dự án và dialogue NPC ADV mượt.

## 5. Known Bugs & Untested Scenarios
- Nội thất `shop_*` dùng pre-rendered plates của Cabacos (đã cân sáng nhẹ `#ffe8c2` để đồng điệu nhà riêng; chưa thay hoàn toàn sang bộ gạch riêng dự kiến ở V0.5).
- 2 Vitest unit tests donor rendering cũ (`donorCabacosRenderDetect.test.ts`, `pydewFarmDonorRender.test.ts`) cần Chromium thực (fail trong `jsdom`).

## 6. Historical Regressions That Must Not Return
- **Mất tương tác túi đồ Nuvora (kẹt kéo/click overlay):** Luôn giữ pointer-events & state close sạch ở inventory modal.
- **Hỏng va chạm & portal `village` / `farm` / `beach` / `forest`:** Mọi chỉnh sửa map phải pass `worldReconstructionGraph.test.ts` (không tường tàng hình, không kẹt NPC/cửa, đủ đường đi tới 184 luống và portal).
- **Commit/Push nhầm `public/assets/private-*` hoặc file nhạc `4cfc3b7`/`a0c8f80`:** Tuyệt đối không gỡ `.gitignore` cho `private-unified/` / `private-audio/` và luôn dùng `npm run assets:private:sync` để đồng bộ sang worktree mới.

## 7. Focused Test Commands
```bash
npm run assets:private:verify
npx vitest run tests/unit/worldReconstructionGraph.test.ts tests/unit/audioBiomesAndFootsteps.test.ts tests/unit/npcDialogueAndLivingWorld.test.ts tests/unit/donorPunyAvatarSheet.test.ts tests/unit/privateArtAvatarPipeline.test.ts tests/server/unifiedAtlas.test.ts tests/server/privateAssetSync.test.ts tests/server/verifyPrivateBuild.test.mjs
```

## 8. Dependencies on Other Subsystems
- Cung cấp tilemap, collision grid, layer depth và camera cho **Living Pet** (mèo 2D `Quýt`), **Deep Farming** (plots, orchard, chuồng nuôi) và **Multiplayer** (render avatar đối phương + `HeldItemRenderer`).
