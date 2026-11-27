# Subsystem Handover — Deep Farming & Economy (`Checkpoints A–G`)

Tài liệu tham chiếu gốc: [UPSTREAM_REUSE.md](../UPSTREAM_REUSE.md) · [public/assets/farming/CREDITS.md](../../public/assets/farming/CREDITS.md) · [PROGRESS.md](../PROGRESS.md)

[M3d + M3e — Hiệu ứng trang trại và câu cá](FARMING_FISHING_VISUALS.md)

## 1. Current Canonical Implementation & Exact Source Paths
- **Catalog & Content Registry (`267` canonical SKUs):** `src/shared/catalog/deepFarmingContent.ts`, `canonicalCatalog.ts`, `canonicalCatalog.generated.json`, `src/shared/economy/{catalogConfig,types,orderBoard,balanceAudit,arbitrage,ledgerMath,shippingBin}.ts`.
- **Deep Farming Domain (Pure TS):** `src/shared/farming/` — `crops.ts`, `deepCropSimulation.ts` (**40 crops**), `flowerGenetics.ts` & `blooms.ts` (**20 flowers** + lai 8 hướng), `orchard.ts` (**12 perennial fruit trees**), `livestock.ts` (**7 species**), `workshops.ts` (**8 workshops, 84 recipes**), `deepFarmState.ts`, `serverApply.ts`, `toolUpgrades.ts`, `farmGrowthClock.ts`, `farmPlotLayout.ts` (184 plots), `farmWorldClockBridge.ts`, `src/shared/world/{worldCalendar,worldClock,worldWeatherPresentation}.ts`.
- **Phaser Visuals & Packed Atlases:** `src/game/farming/` (`FarmPlotVisualController.ts`, `OrchardVisualController.ts`, `LivestockVisualController.ts` [7 loài dùng atlas `livestock-ranch` + `sheep_brown_baby` scale `1.00` + vịt bơi nước], `ambientAnimalVisualAdapter.ts` [ambient animals ở `farm`/`village`/`garden`], `proceduralCropTextures.ts`, `proceduralAnimalTextures.ts` fallback nhẹ), `src/shared/art/{farmingSpriteAtlas.ts,farmingSpriteAtlas.generated.json,donorProceduralIconSpec.ts}`, `src/shared/donor/farmCropVisualResolver.ts`, `public/assets/farming/{items-16,items-32,crops-stages,trees-orchard,livestock-ranch}.{png,json}` (`32` SKU sai/trùng đã sửa ở M3b), packer `scripts/pack-farming-atlases.py`.
- **UI Modals & CSS:** `src/features/farming/` (`FarmEconomyPanel.tsx`, `FlowerAlbumOrchardModal.tsx`, `LivestockPanelModal.tsx`, `OrderBoardModal.tsx`, `NuvoraShopGrid.tsx`, `NuvoraShopSeedRow.tsx`, `deepFarmingModals.css`), `src/features/donor/{DonorWorkshopModal,ChillFishingModal,TensionFishingModal}.tsx`, `src/ui/components/CatalogSkuIcon.tsx`.
- **Server Authority & SQL:** `src/server/{devLanFarmRoute,devLanDeepFarmHandlers,devLanDonorRoute}.ts`, `src/lib/backend/{devLanBackend,localPreviewBackend,supabaseBackend,types}.ts`, `supabase/migrations/20261127000100_deep_farming_canonical_catalog.sql`, `20261127000200_deep_farming_authority_v2.sql`, `scripts/generate-item-catalog-sql.ts`.

## 2. Existing Architecture & Contracts
- **Shared Cooperative Authority:** Một ví chung (`walletCoins`) và một túi đồ chung (`ownerScope === 'shared'`) do server (`deepFarmState.ts` + `devLanDeepFarmHandlers.ts`) giữ quyền quyết định; mỗi mutation cập nhật `stateVersion`, hỗ trợ `idempotencyKey` chống replay (`409` trên duplicate/conflict) và phát `world_mutated` qua WS.
- **No Cozy Penalty:** Tăng trưởng theo mùa/thời tiết & tưới nước/phân bón/sprinkler nhưng **không héo cây, không chết thú, không phạt offline**.
- **Catalog Sync:** Mọi chỉnh sửa catalog SKU phải đồng bộ qua `npm run catalog:sync` và pass `catalogParity.test.ts` + `itemCatalogGenerator.test.mjs`.

## 3. Verified Donor Repositories & Imported Modules
Xem chi tiết giấy phép & SHA trong [docs/UPSTREAM_REUSE.md](../UPSTREAM_REUSE.md) và [public/assets/farming/CREDITS.md](../../public/assets/farming/CREDITS.md):
- `KrasimirKralev/harvest-hollow@9b23e1a` (MIT) → `src/shared/donor/harvest-hollow-9b23e1a/` (orchard, 7 livestock, 8 workshops, 84 recipes, integer math).
- `Shiz0id/webfarmville@c420bc2` (MIT) → `src/shared/donor/webfarmville-c420bc2/` (weather rules, 8-neighbor flower genetics, `meadowbrookNatureCatch.ts`).
- `fernforge-arcade/greens@3f32fd8` (MIT) → `src/shared/donor/greens-3f32fd8/` (40 crops, regrow/fertilizer/sprinkler/skills).
- `robintrepte/hollowmere.tretu.de@a7a8e5a` (MIT) → `src/shared/donor/hollowmere-a7a8e5a/` (artisan pricing/curves).
- Sprite atlases `public/assets/farming/*` được đóng gói từ 9 nguồn đã kiểm kê trong `public/assets/farming/CREDITS.md` (Free Pixel Food 16x16, Yoshino's Bright Icons, Ghostpixxells, LPC Food V2/Crops/Fruit Trees, Farm & Ranch Life, Shikashi's Fantasy Icons, OpenGameArt CC0 packs). *`sunflower-land` bị loại hoàn toàn.*

## 4. Owner-Approved Behavior
- Gộp các modal xưởng chế biến vào `DonorWorkshopModal` thay vì mở quá nhiều nút trùng lặp; mọi modal Deep Farming dùng card ấm cúng `deepFarmingModals.css` (không phụ thuộc Tailwind), có `role="dialog"` và `maxHeight: 90dvh` cuộn an toàn trên mobile để nút **Đóng** luôn chạm được.
- Orchard & chuồng nuôi đặt tại vùng cỏ đi được gần khu trang trại; biểu tượng `!` (ready badge) và cây/cây ăn quả giữ tỉ lệ khớp lưới `16px`.

## 5. Known Bugs & Untested Scenarios
- Hai migration `20261127000100` và `20261127000200` + `supabase/tests/deep_farming_authority.sql` chưa chạy nghiệm thu trên Supabase Cloud project thật.
- Playtest đa thiết bị thật (PC + iPhone Safari qua Quick Tunnel) cho toàn bộ vòng lặp Deep Farming Checkpoints A–G sau hợp nhất RC1 đang chờ nghiệm thu thiết bị thật.

## 6. Historical Regressions That Must Not Return
- **Hồi quy `fish_minnow` (PR/commit `08be551` -> đã vá ở `61541aa`):** Tuyệt đối không map cá mương `minnow` về `bait_free_worm` — phải giữ SKU `fish_minnow` trong `meadowbrookNatureCatch.ts`.
- **Tailwind class mất CSS:** Repo KHÔNG cài Tailwind CSS; mọi modal mới phải có CSS riêng (như `deepFarmingModals.css`), cấm dựa vào class tiện ích Tailwind mà không kiểm tra render thực tế.
- **Tỉ lệ khổng lồ trên bản đồ `16px` & `!` badge quá to / kẹt viewport:** Kiểm tra scale cây/thú/huy hiệu (`farmVisualScaleParity.test.ts`) và đảm bảo không đặt vật thể vào ô `blocked` hoặc thiếu `maxHeight: 90dvh`.

## 7. Focused Test Commands
```bash
npx vitest run tests/unit/farming.test.ts tests/unit/deepCropSimulation.test.ts tests/unit/flowerGeneticsOrchard.test.ts tests/unit/livestock.test.ts tests/unit/workshopsEconomy.test.ts tests/unit/orderBoard.test.ts tests/unit/farmingSpriteAtlas.test.ts tests/unit/farmVisualScaleParity.test.ts tests/unit/catalogParity.test.ts tests/unit/canonicalFishingReward.test.ts tests/server/deepFarmingCoopAuthority.test.ts tests/server/itemCatalogGenerator.test.mjs
npx playwright test tests/e2e/donor-economy-two-client.spec.ts tests/e2e/farming-co-op.spec.ts --project=chromium-desktop
```

## 8. Dependencies on Other Subsystems
- **Multiplayer (`NET.1`):** Dùng `stateVersion`, `idempotencyKey`, và broadcast `world_mutated` khi thu hoạch/chế biến/mua bán.
- **Inventory & Art:** Phụ thuộc `CatalogSkuIcon.tsx` + `public/assets/farming/*` + 184 plots & shop maps (`shop_seed`, `shop_tool`, `shop_crop_market`) trong `WorldScene.ts` (lưới `16px`).
