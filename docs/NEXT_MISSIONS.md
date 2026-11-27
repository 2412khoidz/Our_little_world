# Next Development Missions (`docs/NEXT_MISSIONS.md`)

*Cập nhật: 27/11/2026 | Canonical Baseline: `main` (`v0.2.5+`) | Đã phê duyệt & hợp nhất kiểm kê tài nguyên **`M3a`** ([ASSET_LIBRARY_INVENTORY.md](art/ASSET_LIBRARY_INVENTORY.md), [ASSET_REUSE_BACKLOG.md](art/ASSET_REUSE_BACKLOG.md), [asset-library-inventory.json](art/asset-library-inventory.json))*
*Mọi mission dưới đây bắt buộc khởi tạo worktree riêng bằng `npm run worktree:new -- --name <slug>` từ `origin/main` và tuân thủ [REGRESSION_CHECKLIST.md](REGRESSION_CHECKLIST.md).*

---

## Tổng quan Điều phối (Parallel vs Sequential)

```text
[M3a: Asset Library Audit] (COMPLETED & OWNER APPROVED on main)
         │
         ▼ (Feeds curated icons, animal sheets, VFX, fishing & cooking art into M2..M10)
[M0: Mobile-first HUD, Touch Controls & Global Fullscreen] (IN PROGRESS in OLW-Mobile-HUD) ──┐
[M1: Billiards V3 Mobile Usability & Visual Recovery] (IN PROGRESS in OLW-Billiards-V3) ─────┼─▶ Merge vào main (V0.2.x)
[M2: Natural Couple Animations (P1 Kiss & Poses)] ─────────────────────────────────────────┤
[M3b: Correct All 32 Inaccurate SKU Sprite Mappings] ──▶ [M3c: Animated Livestock Transplant] ──┐
[M3d: Animated Processing Machines & Env VFX] ──▶ [M3e: Fishing Artwork & Anim Transplant] ─────┘
                                                                                                │
                                                                                                ▼
                                                                               [M4: Home Progression & Shop (V0.2.4)]
                                                                               (Reserved: Building Upgrade Assets)
                                                                                        │
                                      ┌─────────────────────────────────────────────────┴────────────────────┐
                                      ▼                                                                      ▼
[M5: Interactive Cooking UI (V0.3)]                                [M6: Real Shared Life UI (Diary/Calendar/Picnic)]
(Reserved: Food Assets)                                            (Reserved: Gifts, Tea, Flowers & Picnic Assets)
[M7: S0-5b Cinema Transport Benchmark (Spike)]  (Chạy độc lập song song bất kỳ lúc nào có iPhone 4G)
                                      │
                                      ▼ (Chỉ chạy M8 khi M7 PASS Go)
[M8: Cinema Player + Subtitles & Co-op Minigames (V0.4)]
                                      │
                                      ▼
[M9: Living Polish, Save Backup/Restore & Mobile Perf (V0.5)] ──▶ [M10: Our Island Expansion (V1.0)]
```

### Quy tắc Phân bổ Tài nguyên & Ranh giới Thực thi (Asset Reservation & Scope Boundary)
- **Phân biệt rõ Tài nguyên sẵn có vs Gameplay đã triển khai:** Toàn bộ 28 pack trong `asset-library-inventory.json` (`8,079` sprite PNG duy nhất) chỉ là **tài nguyên donor sẵn có** để trích xuất chọn lọc — **không đồng nghĩa** với tính năng gameplay đã hoạt động trên `main`. Hiện tại trên `main` mới triển khai Deep Farming Checkpoints A–G, Billiards V2, Pet Care 3D và Couple P0; các hệ thống ở M0–M10 chỉ được tính là đã hoàn tất sau khi có mã nguồn, test và nghiệm thu riêng.
- **Đặt chỗ tài nguyên theo từng Mission (không import sớm vào atlas hiện tại):**
  - **M4 (Home Progression):** Giữ riêng tài nguyên nâng cấp công trình (`FarmRanchLife/05_Buildings_Machines/Buildings/{barn_level1..3,coop_level1..3,artisan_shed}`, `Ranch_Props`, icon nội thất `Shikashi v2` & `world-props.png`).
  - **M5 (Interactive Cooking):** Giữ riêng tài nguyên món ăn, đồ uống & nguyên liệu bếp (`Ghostpixxells`, `Free_pixel_food_16x16`, `food-melle`, `food-ocal`, `food-glitch`, `lpc-food-v2`, trà/cà phê/cua ghẹ trong `FarmRanchLife`).
  - **M6 (Shared Life):** Giữ riêng tài nguyên quà tặng, tách trà, hoa & picnic (`food-fleurman`, `yoshinos` `birthday_cake`/dango/fruit bowls/hoa `lily`/`poppy`/`dandelion`, quà kỷ niệm).

---

## Mission 0 — Mobile-first HUD, Touch Controls & Global Fullscreen (`V0.2.x` · `IN PROGRESS`)
- **Phạm vi & Trải nghiệm người chơi:** Tái thiết kế HUD mobile-first với khung gỗ 9-slice **Kiln Harvest** (`TouchJoystick`, `MobileTopHud`, `MobileNavDrawer`, `MainGameInteractionLayer`, `CoupleEmoteDock`, `GameHotbar`), joystick Pointer Events (`fixed`/`floating` thumb anchor + radial deadzone), và bộ điều phối toàn màn hình/hướng màn hình dùng chung (`GlobalViewportContext`, `--olw-vvh`, `viewportPolicy.ts`) với **quy tắc 1 chủ sở hữu (`fullscreenOwner`)** để thoát Bi-a/Câu cá/Pet Care không làm rớt fullscreen toàn app và hỗ trợ safe-area/Add-to-Home-Screen trên iPhone Safari (không xoay CSS gốc).
- **Dependencies:** Hợp đồng phối hợp viewport với **M1** (`OLW-Billiards-V3`) theo mô hình `VIEWPORT_FULLSCREEN_CONTRACT.md` trong worktree M0 (`GlobalViewportContext` + `useSharedFocusMode`). Cần hoàn tất phát triển, test & reconcile lên `main` mới nhất trước khi merge.
- **Branch / Worktree đề xuất:** Tiếp tục `feat/mobile-first-hud` tại `C:\Users\admin\Downloads\OLW-Mobile-HUD`.
- **Hệ thống & File chồng chéo:** `src/app/App.tsx`, `src/app/viewport/GlobalViewportContext.tsx`, `src/shared/viewport/viewportPolicy.ts`, `src/shared/input/virtualJoystickController.ts`, `src/features/home/mobile/*`, `src/features/minigames/billiards/*` (đối chiếu contract fullscreen).
- **Song song / Tuần tự:** **COORDINATED** với M1 (`App.tsx` & shared fullscreen lifecycle); **PARALLEL SAFE** với M2, M3b–M3e, M7.
- **Focused Acceptance:** `mobileInteractablesAndHud.test.ts`, unit test cho `virtualJoystickController` & `viewportPolicy`, Playwright desktop + `430×932` portrait/landscape không che HUD và không kẹt joystick/fullscreen khi mở-đóng modal.
- **Donor sẵn có:** `Kiln Harvest` (`KILN-HARVEST-LICENSE.txt`), nghiên cứu clean-room `floating-thumb-dungeon` (`78e6337`), `nipplejs` (`ea425b3`), `mini-market-game` (`4fc4d96`), `phaser-toolkit`/`rex-notes`, mở rộng từ `useFocusMode.ts` của Billiards V3.2.
- **Agent / Model đề xuất:** **Pro** (Pointer Events + DOM/Phaser viewport & fullscreen ownership).

## Mission 1 — Billiards V3 Mobile Usability & Visual Recovery (và Tích hợp 3D) (`V0.2.x` · `IN PROGRESS`)
- **Phạm vi & Trải nghiệm người chơi:** Hoàn thiện màn hình chọn chế độ (Chơi với Bot AI, Local 2P chung màn hình, Online Ready Check Lobby), khôi phục trải nghiệm mobile usability/visual recovery, điều khiển bàn phím desktop gốc (`useBilliardsKeyboard.ts`) và tích hợp cảnh bi-a 3D từ gói nguồn chủ dự án (`our_little_billiards_3d_*`), giữ lazy-load để không làm chậm lúc vào game.
- **Dependencies:** Đang mở trên `C:\Users\admin\Downloads\OLW-Billiards-V3` (`feat/billiards-v3`). Cần reconcile lên `origin/main` trước khi merge.
- **Branch / Worktree đề xuất:** Tiếp tục `feat/billiards-v3` tại `C:\Users\admin\Downloads\OLW-Billiards-V3`.
- **Hệ thống & File chồng chéo:** `scripts/devLanServerPlugin.mjs`, `scripts/devLanWsHub.mjs`, `src/lib/backend/{devLanRealtimeClient.ts,types.ts}`, `src/shared/netcode/protocol.ts`, `src/features/minigames/billiards/*`.
- **Song song / Tuần tự:** **Tuần tự tích hợp đầu tiên** với các task chạm `devLanServerPlugin.mjs`/`devLanWsHub.mjs`; có thể song song với M2/M3b–M3e/M7 nếu các nhánh kia không sửa `devLanWsHub.mjs`.
- **Focused Acceptance:** `billiardsPhysicsDeterminism.test.ts`, `billiardsProtocol.test.ts`, `billiardsModalLifecycle.test.tsx`, `billiardsDevLan.test.ts`, `billiards-multiplayer.spec.ts`, `multiplayer-ws-hardening.spec.ts`, `verify-prod-guard.mjs` + playtest 3 chế độ (Bot, Local 2P, Online 2 máy).
- **Donor sẵn có:** `C:\Users\admin\Downloads\our_little_billiards_3d_8_ball_pool_edition.html`, `our_little_world_billiards_3d_addon.zip`, `our_little_world_billiards_pack_v2.zip`, Three.js (`^0.186.1` đã có sẵn trong `package.json`).
- **Agent / Model đề xuất:** **Pro / High-reasoning** (kiến trúc 3D WebGL + deterministic physics + WS lobby sync).

## Mission 2 — Natural Couple Animations: Hôn, Tựa Vai, Nhảy Đôi, Tặng Hoa (`V0.2.x`)
- **Phạm vi & Trải nghiệm người chơi:** Mở khóa cấp P1 (`COUPLE_P1_ENABLED = true`) với hoạt ảnh ghép pixel bảo toàn ngoại hình (`AvatarConfig`) cho `kiss` và ít nhất `give_flower` / `dance` / `lean_shoulder`, kèm lời mời đồng ý 2 người mượt mà.
- **Tái sử dụng tài nguyên (`M3a` / `M3b`):** Dùng bó hoa tổng hợp thật sau khi M3b sửa icon `gift_flower_bouquet` / `tulip_bouquet` / `bridal_rose_bouquet` (không trùng ảnh bông lẻ) + `yoshinos` (`lily`, `poppy`, `pink_rose`) cho tương tác tặng hoa.
- **Dependencies:** Kế thừa P0 (`hold_hands`, `hug`) đã duyệt trên `main`.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name couple-p1-animations` (`feat/couple-p1-animations`, `OLW-feat-couple-p1-animations`).
- **Hệ thống & File chồng chéo:** `src/shared/couple/{coupleTypes.ts,coupleStateMachine.ts}`, `src/game/avatar/couplePairedPoseTextures.ts`, `src/features/couple/CoupleActionBar.tsx`, `src/game/scenes/WorldScene.ts` (nhánh `renderCouplePosture`).
- **Song song / Tuần tự:** **PARALLEL SAFE** với M1, M3b–M3e, M7 (chỉ tránh chạm khối billiards/map trong `WorldScene.ts`).
- **Focused Acceptance:** `coupleNaturalAnimations.test.ts`, `avatarPostureVisual.test.ts`, kiểm tra trực quan desktop + `430×932` hai avatar khớp tóc/áo/phụ kiện khi ôm & hôn.
- **Donor sẵn có:** `src/game/avatar/couplePairedPoseTextures.ts`, `docs/COUPLE_ANIMATION_DONORS.md` (`StardewValleyMods` Kissing, `PostureCore/EmbraceCore`, `promenad` FABRIK), `yoshinos _bright_icons_16x16_v1.3.zip`.
- **Agent / Model đề xuất:** **Standard / Flash + Visual Browser review**.

## Mission 3a — Asset Library Audit (`V0.2.x` · `COMPLETED` on `main`)
- **Trạng thái:** Đã hoàn tất kiểm kê 28 pack (`10,840` frame dùng được, `8,079` pixel SHA-256 duy nhất, `267` canonical SKUs, phát hiện `32` SKU cần sửa) và được chủ dự án phê duyệt tích hợp tài liệu lên `main` (`3134f1a`, `7651916`).
- **Tài liệu nguồn chân lý:** [ASSET_LIBRARY_INVENTORY.md](art/ASSET_LIBRARY_INVENTORY.md) · [ASSET_REUSE_BACKLOG.md](art/ASSET_REUSE_BACKLOG.md) · [asset-library-inventory.json](art/asset-library-inventory.json).
- **Ghi chú ranh giới:** M3a chỉ kiểm kê và lập chỉ mục tài nguyên sẵn có — không thay đổi gameplay hay atlas runtime.

## Mission 3b — Correct All 32 Inaccurate SKU Sprite Mappings (`V0.2.x`)
- **Phạm vi & Trải nghiệm người chơi:** Sửa toàn bộ `32` SKU ánh xạ sai ngữ nghĩa, trùng pixel hoặc placeholder đã chỉ mặt ở M3a (`gift_plush_cat`, `pet_kibble_basic`, `wood_chair`, `tool_can_*`, `tool_hoe_*`, `ribbon`, `wool_blanket`, `gift_star_jar`, `golden_egg`, `yogurt`, `olive_oil`, `vinegar`, `ancient_green`, `lavender_candle`, `rose_soap`, 3 bó hoa, v.v.), đồng thời dọn sạch `7` lệnh ghi đè và `9` nhánh `if False` trong `scripts/pack-farming-atlases.py`.
- **Ràng buộc bảo toàn:** Giữ nguyên 100% canonical SKU IDs, inventory bindings, công thức/giá, tương thích save, và hình ảnh đã duyệt; không import hàng nghìn sprite thừa.
- **Dependencies:** Dựa trực tiếp trên M3a (`ASSET_REUSE_BACKLOG.md` §1) và `origin/main`.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name farming-art-recovery` (`feat/farming-art-recovery`, cùng đợt Checkpoint A với M3c).
- **Hệ thống & File chồng chéo:** `scripts/pack-farming-atlases.py`, `public/assets/farming/{items-16,items-32}.{png,json}`, `public/assets/farming/CREDITS.md`, `src/shared/art/farmingSpriteAtlas.generated.json`.
- **Focused Acceptance:** `farmingSpriteAtlas.test.ts`, `catalogParity.test.ts`, `itemCatalogGenerator.test.mjs`, đối chiếu contact sheet Before/After 32 SKU.

## Mission 3c — Animated Livestock Donor Transplant (`V0.2.x`)
- **Phạm vi & Trải nghiệm người chơi:** Đóng gói và thay thế toàn bộ texture vẽ Canvas thủ công trong `proceduralAnimalTextures.ts` bằng spritesheet động thật từ `FarmRanchLife_v1.0.zip` (`04_Ranch_Animals/{chicken,duck,cow,goat,sheep,rabbit}` + `10_Effects/bees_swarm_4f.png` + `beehive_super_stack.png`) vào atlas gọn riêng (`livestock-ranch.{png,json}`) cho `LivestockVisualController.ts`, hỗ trợ idle/walk 4 hướng/eat/sleep, chuẩn hóa feet anchor, bóng đất và depth ordering theo lưới `16px`.
- **Ràng buộc bảo toàn:** Giữ nguyên toàn bộ gameplay chăn nuôi, sản lượng, cho ăn, hạnh phúc, collision, save & multiplayer state; **tuyệt đối không đụng mèo `Quýt`**, avatar người chơi hay Pet Care 3D.
- **Dependencies:** M3a (`ASSET_REUSE_BACKLOG.md` §2) và `origin/main`.
- **Branch / Worktree đề xuất:** `feat/farming-art-recovery` (Checkpoint B–C sau M3b).
- **Hệ thống & File chồng chéo:** `scripts/pack-farming-atlases.py`, `public/assets/farming/livestock-ranch.{png,json}`, `src/shared/art/farmingSpriteAtlas.{ts,generated.json}`, `src/game/scenes/BootScene.ts`, `src/game/farming/LivestockVisualController.ts`.
- **Focused Acceptance:** `farmingSpriteAtlas.test.ts`, `farmVisualScaleParity.test.ts`, `livestockVisualController.test.ts`, `farming-co-op.spec.ts`, `donor-economy-two-client.spec.ts`, screenshot gameplay 7 loài thú.

## Mission 3d — Animated Processing Machines and Environmental VFX (`V0.2.x`)
- **Phạm vi & Trải nghiệm người chơi:** Mở rộng hình động 6 frame cho các máy chế biến (`FarmRanchLife/05_Buildings_Machines/Artisan_Machines/*_idle_work4_done_6f.png`) và gắn VFX môi trường từ `FarmRanchLife` (`10_Effects/{soil_dust_till_4f,water_hit_4f,seed_scatter_4f,harvest_pop_4f,hearts_petting_4f}.png`, `02_Crops/ready_sparkle_overlay_4f.png`, `03_Fruit_Trees/*_harvest_shake_3f.png`), kèm tinh chỉnh UX đứng cạnh cây ăn quả/chuồng/xưởng.
- **Dependencies:** Sau M3b–M3c để tránh xung đột `scripts/pack-farming-atlases.py` và `BootScene.ts`.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name farming-machines-vfx` (`feat/farming-machines-vfx`).
- **Hệ thống & File chồng chéo:** `scripts/pack-farming-atlases.py`, `src/game/farming/{FarmPlotVisualController,OrchardVisualController}.ts`, `src/features/donor/DonorWorkshopModal.tsx`, `src/shared/interaction/*`.
- **Focused Acceptance:** `farmVisualScaleParity.test.ts`, `mobileInteractablesAndHud.test.ts`, `donor-economy-two-client.spec.ts`, `npm run lint` (`0` errors, `0` warnings).

## Mission 3e — Fishing Artwork and Animation Transplant (`V0.2.x`)
- **Phạm vi & Trải nghiệm người chơi:** Thay thế/nâng cấp artwork và hiệu ứng ao câu cá bằng bộ `FarmRanchLife/11_Fishing/{bobber_float_4f,bobber_bite_4f,fishing_spot_bubbles_4f}.png` cùng artwork cá chuẩn xác (giữ nguyên hợp đồng `fish_minnow` và `meadowbrookNatureCatch.ts`), đồng thời dọn warning `ChillFishingModal.tsx:90`.
- **Dependencies:** M3a (`ASSET_REUSE_BACKLOG.md` §2) và độc lập với M3d (trừ `pack-farming-atlases.py` nếu dùng chung atlas).
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name fishing-art-transplant` (`feat/fishing-art-transplant`).
- **Hệ thống & File chồng chéo:** `src/features/donor/{ChillFishingModal,TensionFishingModal}.tsx`, `src/game/scenes/WorldScene.ts` (vùng hồ câu), `src/shared/art/farmingSpriteAtlas.ts`.
- **Focused Acceptance:** `canonicalFishingReward.test.ts`, `farmingSpriteAtlas.test.ts`, `npm run lint` (`0` errors, `0` warnings).

## Mission 4 — Home Progression: Furniture Shop & House Upgrades (`V0.2.4`)
- **Phạm vi & Trải nghiệm người chơi:** Thêm cửa hàng nội thất 4 phong cách (`Pastel`, `Modern`, `Cottage`, `Rustic`) tiêu coin từ ví nông trại và hệ thống nâng cấp mở rộng nhà (`kitchen`, `bedroom`, `study`, `greenhouse`), **tự động giữ lại toàn bộ đồ đạc cũ và tương thích 100% file save `.dev-lan-state.json`**.
- **Tái sử dụng tài nguyên (`M3a`):** Tận dụng `FarmRanchLife/05_Buildings_Machines/Buildings/{barn_level1..3,coop_level1..3,artisan_shed}` cho nâng cấp chuồng/nhà ngoài vườn và icon đồ gia dụng/trang trí sạch từ `Shikashi v2` & `world-props.png`.
- **Dependencies:** Nên merge sau M1 và M3b–M3e để tránh xung đột `App.tsx`, `MenuModal.tsx`, `pack-farming-atlases.py` và `devLanServerPlugin.mjs`. (Tài nguyên nâng cấp công trình giữ riêng cho M4).
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name home-progression-v024` (`feat/home-progression-v024`).
- **Hệ thống & File chồng chéo:** `src/shared/{catalog.ts,maps.ts,placement.ts}`, `src/shared/decorate/*`, `src/features/home/DecorateDrawer.tsx`, `src/game/scenes/WorldScene.ts`, `scripts/devLanV015Handlers.mjs`.
- **Song song / Tuần tự:** **SEQUENTIAL** trước M5 (vì M5 gắn UI Bếp vào góc bếp mở rộng của M4); chạy cẩn thận file `maps.ts` & `placement.ts`.
- **Focused Acceptance:** Test nâng cấp nhà từ save `.dev-lan-state.json` có sẵn không mất 1 món đồ nào; đặt/xoay nội thất mới 2 máy không đè ô (`placement.test.ts`), kiểm tra mèo 2D `petUnifiedCollision.test.ts`.
- **Donor sẵn có:** `src/shared/decorate/{decorateInteriorPolicy.ts,decoratePlacementLoop.ts}`, `src/donors/cocoworking-947494f`, `src/donors/cozy-space-7b8cb1e`, `FarmRanchLife/05_Buildings_Machines/`, `Shikashi v2`.
- **Agent / Model đề xuất:** **Pro** (migration save + dynamic `maps.ts` bounds + collision safety).

## Mission 5 — Interactive Cooking & Eating Together (`V0.3`)
- **Phạm vi & Trải nghiệm người chơi:** Xây dựng mini-game nấu ăn tương tác 3 chế độ (Casual / Co-op / Orders có rủi ro cháy khét) nối trực tiếp vào `src/shared/cooking/` (`5` công thức khởi đầu: `carrot_soup`, `herb_carp`, `peach_tea`, `strawberry_tart`, `koinori_platter`), mở rộng thành chuỗi ẩm thực 3 tầng (Món ấm cúng hằng ngày, Trà chiều/Bánh ngọt, Bữa tối lãng mạn) dùng nguyên liệu từ Deep Farming + cho 2 người ngồi bàn ăn chung.
- **Tái sử dụng tài nguyên (`M3a`):** Khai thác có chọn lọc phần chưa dùng trong **`Ghostpixxells` (`83` món còn lại — phân biệt icon đĩa bàn ăn `*_dish`)**, **`Free_pixel_food_16x16` (`83` — 7 vị `boba_*`, 11 ly `coffee/tea`, 5 bánh lát, 4 phô mai)**, **`food-melle` (`6` bánh ngọt 32×32)**, **`food-ocal` (`pasta`, `salad`, `smoothie`)**, **`food-glitch` (nước sốt/gia vị)**, **`lpc-food-v2` (`1,649` ô nguyên liệu)** và cây trà/cà phê/lúa/dứa + lờ cua trong **`FarmRanchLife`** — đóng gói thành atlas lazy-load riêng cho Kitchen, không nhúng cả pack thô.
- **Dependencies:** M4 (`kitchen` anchor/furniture) khuyến nghị xong trước hoặc dùng anchor tạm trong `home` rồi gắn vào góc bếp V0.2.4.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name interactive-cooking-v03` (`feat/interactive-cooking-v03`).
- **Hệ thống & File chồng chéo:** `src/shared/cooking/*`, `src/features/cooking/*` (mới), `src/server/devLanDeepFarmHandlers.ts`, `src/features/home/executeMainGameContextAction.ts`.
- **Song song / Tuần tự:** **PARALLEL SAFE** với M6 và M7 sau khi xong M4.
- **Focused Acceptance:** `cooking.test.ts`, test tiêu thụ nguyên liệu đúng `stateVersion` & `idempotencyKey`, E2E 2 người nấu cùng 1 món và ăn buff nhẹ / thưởng coin.
- **Donor sẵn có:** `src/shared/cooking/{cookingMachine.ts,recipes.ts}`, `Ghostpixxells_pixelfood.zip`, `Free_pixel_food_16x16.zip`, `lpc-food-v2.zip`, `food-melle.zip`, `food-ocal.zip`.
- **Agent / Model đề xuất:** **Standard / Pro**.

## Mission 6 — Persistent Shared Life: Diary, Wishlist, Date Calendar & Picnic (`V0.3`)
- **Phạm vi & Trải nghiệm người chơi:** Thay thế `V03PrototypesModal.tsx` (dữ liệu giả) bằng hệ thống **Nhật ký chung/riêng**, **Wishlist muốn đi**, **Lịch hẹn & Đếm ngược ngày gặp**, nghi thức **Trà chiều & Picnic** trên vườn/bãi biển có lưu bền trong Dev LAN DB (`sharedLifeTypes.ts`), cùng tinh chỉnh Pomodoro + Mailbox thiệp/quà kỷ niệm.
- **Tái sử dụng tài nguyên (`M3a`):** Dùng **`food-fleurman.zip` (`10` tách trà `tea_01..10`, `cookie`, `cup`)**, **`yoshinos_bright_16` (`birthday_cake`, `7` dango mùa lễ, `10` fruit bowls, hoa `lily/poppy/dandelion`)**, và ảnh quà đã sửa (`gift_plush_cat`, `gift_star_jar`).
- **Dependencies:** Độc lập hoàn toàn (có thể chạy song song M4/M5 nếu tránh đụng `MenuModal.tsx` quá nhiều).
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name shared-life-v03` (`feat/shared-life-v03`).
- **Hệ thống & File chồng chéo:** `src/shared/sharedLife/sharedLifeTypes.ts`, `src/features/devPrototypes/V03PrototypesModal.tsx` → `src/features/sharedLife/*`, `scripts/devLanSharedLifeHandlers.mjs`, `src/features/mailbox/MailboxModal.tsx`, `src/features/study/PomodoroPanel.tsx`.
- **Song song / Tuần tự:** **PARALLEL SAFE** với M5 và M7.
- **Focused Acceptance:** `v03SharedLife.test.ts`, kiểm tra ẩn bài viết riêng tư (`visibility: 'private'`) với đối phương, lưu/khôi phục qua reload 2 client, `verify-prod-guard.mjs`.
- **Donor sẵn có:** `src/shared/sharedLife/sharedLifeTypes.ts`, `scripts/devLanSharedLifeHandlers.mjs`, `src/features/couple/ScrapbookAlbumModal.tsx` (`react-pageflip`), `food-fleurman.zip`, `yoshinos _bright_icons_16x16_v1.3.zip`.
- **Agent / Model đề xuất:** **Flash / Standard**.

## Mission 7 — `S0-5b`: Cinema VPN-less WAN Transport Benchmark (`Spike`)
- **Phạm vi & Trải nghiệm người chơi:** Thử nghiệm thực tế truyền phim MP4/MKV từ laptop Windows sang **iPhone 16 Pro Max Safari qua mạng 4G/5G không cài Tailscale/VPN**: đo Tailscale Funnel HLS (token ngắn hạn) vs WebRTC `captureStream()` + free TURN 0₫ theo [MEDIA_SETUP.md](MEDIA_SETUP.md). Xuất báo cáo Go/No-Go + chốt giao thức cho M8.
- **Dependencies:** Không — chỉ cần Windows host + iPhone 4G thật.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --prefix spike --name s05b-cinema-transport` (`spike/s05b-cinema-transport`).
- **Hệ thống & File chồng chéo:** `scripts/spike-cinema-*`, `src/features/spike/SpikeLabModal.tsx`, `docs/MEDIA_SETUP.md`.
- **Song song / Tuần tự:** **PARALLEL SAFE** hoàn toàn (cô lập trong Spike Lab).
- **Focused Acceptance:** Chạy đạt 60 phút liên tục Windows → iPhone Safari 4G không app VPN, drift `<= 500ms` ngoài seek, chặn link không token/hết hạn (`401/403`), media không bị Service Worker cache (`swPrecache.test.mjs`).
- **Donor sẵn có:** `src/shared/cinemaSync.ts`, `SpikeLabModal.tsx`, `docs/research/OPEN_SOURCE_RESEARCH.md §3`.
- **Agent / Model đề xuất:** **Pro** + Chủ dự án test thiết bị thật.

## Mission 8 — V0.4 Home Cinema & Multiplayer Mini-Games (`Caro/Othello/Battleship/Memory`) (`V0.4`)
- **Phạm vi & Trải nghiệm người chơi:** (A) Xây rạp chiếu phim tại gia (sofa xem phim, đồng bộ Play/Pause/Seek/Reconnect, chọn phụ đề `.vtt`/`.srt` và audio track) dùng transport thắng từ M7; (B) Nối 4 mini-game có sẵn (`Caro`, `Othello`, `Battleship`, `Memory`) lên kênh WS `minigame_event` giống Billiards và mở lại từ `MenuModal` / bàn chơi trong nhà.
- **Dependencies:** Phần Cinema **CHẶN CỨNG** bởi kết quả Go từ M7 (`S0-5b`); phần nối WS 4 mini-game có thể tách thành `M8b` song song sau M1!
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name v04-cinema-and-minigames` (`feat/v04-cinema-and-minigames`).
- **Hệ thống & File chồng chéo:** `src/shared/cinemaSync.ts`, `src/shared/minigames/*`, `src/features/minigames/*`, `scripts/devLanWsHub.mjs`, `src/app/App.tsx`.
- **Song song / Tuần tự:** **SEQUENTIAL** sau M7 (Cinema) & M1 (`minigame_event` protocol).
- **Focused Acceptance:** `minigameUi.test.tsx`, `minigames.test.ts`, `cinemaSync.test.ts`, xem phim dài + mất mạng nối lại + chơi Caro/Battleship 2 trình duyệt không lộ bài bí mật (`privacy.ts`).
- **Donor sẵn có:** `src/shared/cinemaSync.ts`, `src/shared/minigames/{caro,othello,battleship,memory,privacy}.ts`, `src/features/minigames/{CaroGame,OthelloGame,BattleshipGame,MemoryGame}.tsx`.
- **Agent / Model đề xuất:** **Pro**.

## Mission 9 — Living World Polish, Shop Art Unity, Save Backup & Mobile Perf (`V0.5`)
- **Phạm vi & Trải nghiệm người chơi:** Đồng bộ mỹ thuật nội thất 4 cửa hàng Cabacos (`shop_*`) khỏi nét plate Sunnyside lệch tông, làm sâu hơn lịch sinh hoạt NPC & hiệu ứng thời tiết/âm thanh môi trường, tối ưu tải bộ nhớ trên iPhone Safari phiên dài và thêm giao diện **Xuất / Nhập file sao lưu thế giới** (`.dev-lan-state.json` snapshot an toàn, không lộ secret).
- **Tái sử dụng tài nguyên (`M3a`):** Dùng **`FarmRanchLife/05_Buildings_Machines/Buildings/winter_snow/*`** cho kiến trúc mùa Đông, **`market_stall_dairy/fruit/veg.png`** cho sạp chợ làng & **`07_NPCs/*`** tham chiếu lịch sinh hoạt NPC.
- **Dependencies:** Sau M4–M8.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name v05-quality-living-world` (`feat/v05-quality-living-world`).
- **Hệ thống & File chồng chéo:** `src/assets/maps/shop*.json`, `src/game/world/{WorldLightingOverlay,tiledWorldNpcs}.ts`, `src/game/audio/gameAudioManager.ts`, `scripts/devLanServerPlugin.mjs`.
- **Song song / Tuần tự:** **SEQUENTIAL** (giai đoạn hội tụ trước V1.0).
- **Focused Acceptance:** Test export → reset → import khôi phục nguyên 100% nhà/đồ/nông trại/mèo; memory/DOM audit không rò rỉ sau 30 phút idle/chuyển map; full Chromium E2E & `verify-prod-guard.mjs`.
- **Donor sẵn có:** `WorldLightingOverlay.ts`, `npcDialogueRegistry.ts`, `FarmRanchLife` seasonal buildings & market stalls, `Kiln/Sprout/Cabacos` tilesets trong repo.
- **Agent / Model đề xuất:** **Pro**.

## Mission 10 — Our Island Expansion (`V1.0`)
- **Phạm vi & Trải nghiệm người chơi:** Mở rộng bản đồ làng, thêm tiệm & nội thất mới, mở hoạt động bãi biển (đặt lờ cua/thu vỏ sò/lửa trại) & rừng sâu, sự kiện theo mùa & ngày kỷ niệm chung của hai người.
- **Tái sử dụng tài nguyên (`M3a`):** Bổ sung thú nuôi **`alpaca`, `horse`, `pig` (`FRL/04_Ranch_Animals`)**, **`giant_crops`**, **`8` hải sản `crab_pot` + `22` loài cá còn lại (`FRL/08_Items/fish/*`)**, tiệm đồ uống/rượu vang trái cây (`FRL/artisan/{hops_beer,wine_red,wine_white}`, `yoshinos` `*_wine`) cho khu lễ hội đảo.
- **Dependencies:** M9 (`V0.5` ổn định sau playtest thực tế).
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name v10-our-island` (`feat/v10-our-island`).
- **Hệ thống & File chồng chéo:** `src/shared/maps.ts`, `public/assets/maps/*`, `src/assets/maps/*`, `src/shared/npc/*`, `src/shared/worldContent/*`.
- **Song song / Tuần tự:** **SEQUENTIAL** cuối lộ trình hiện tại (hoặc chia nhiều mission con theo từng khu vực khi tới V1.0).
- **Focused Acceptance:** `worldReconstructionGraph.test.ts` pass 100% reachability & collision không tường tàng hình, mèo & 2 người chơi xuyên suốt mọi khu mới.
- **Donor sẵn có:** `Tuxemon`, `Hollowmere`, `Cabacos`, `FarmRanchLife_v1.0.zip`, `food-bluecarrot16`, `yoshinos`.
- **Agent / Model đề xuất:** **Pro**.
