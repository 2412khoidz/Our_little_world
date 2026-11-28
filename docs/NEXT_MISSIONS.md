# Next Development Missions (`docs/NEXT_MISSIONS.md`)

*Cập nhật: 27/11/2026 | Canonical Baseline: `main` (`v0.2.5+`) | Đã phê duyệt & hợp nhất kiểm kê tài nguyên **`M3a`** ([ASSET_LIBRARY_INVENTORY.md](art/ASSET_LIBRARY_INVENTORY.md), [ASSET_REUSE_BACKLOG.md](art/ASSET_REUSE_BACKLOG.md), [asset-library-inventory.json](art/asset-library-inventory.json))*
*Mọi mission dưới đây bắt buộc khởi tạo worktree riêng bằng `npm run worktree:new -- --name <slug>` từ `origin/main` và tuân thủ [REGRESSION_CHECKLIST.md](REGRESSION_CHECKLIST.md).*

---

## Tổng quan Điều phối (Parallel vs Sequential)

```text
[M3a Audit, M3b 32 SKUs, M3c/M3c.1/M3c.2 Livestock & Ambient, M0 Phase 1 HUD, M1 Billiards V4.1] (COMPLETED & OWNER APPROVED in Canonical RC2)
         │
         ▼ (Remaining V0.2.x polish & features)
[M0 Follow-up: Auxiliary Mobile Menu Improvements] (PENDING) ──┐
[M2: Natural Couple Animations (P1 Kiss & Poses)] ─────────────┼─▶ Complete V0.2.x
[M3d: Animated Processing Machines & Env VFX] (CHỜ DUYỆT) ───────┤
[M3e: Fishing Artwork & Anim Transplant] (CHỜ DUYỆT) ────────────┘
                                                                      │
                                                                      ▼
                                                     [M4: Home Progression & Shop (V0.2.4)]
                                                     (Reserved: Building Upgrade Assets)
                                                                      │
                              ┌───────────────────────────────────────┴────────────────────┐
                              ▼                                                            ▼
[M5: Interactive Cooking UI (V0.3)]                      [M6: Real Shared Life UI (Diary/Calendar/Picnic)]
(Reserved: Food Assets)                                  (Reserved: Gifts, Tea, Flowers & Picnic Assets)
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

## Mission 0 — Mobile-first HUD, Touch Controls & Global Fullscreen (`V0.2.x` · `Phase 1 OWNER APPROVED & INTEGRATED`)
- **Trạng thái hiện tại:** **Phase 1 đã được chủ dự án phê duyệt và hợp nhất vào `main`** (`feat/mobile-first-hud` @ `cfd3099`). **Lưu ý:** Hạng mục **tối ưu menu phụ trợ (auxiliary menu optimization)** vẫn chưa hoàn thành (`PLANNED` cho đợt polish tiếp theo) và không được đánh dấu hoàn tất.
- **Phạm vi đã tích hợp (Phase 1):** Tái thiết kế HUD mobile-first với khung gỗ 9-slice **Kiln Harvest** (`TouchJoystick`, `MobileTopHud`, `MobileNavDrawer`, `MainGameInteractionLayer`, `CoupleEmoteDock`, `GameHotbar`), joystick Pointer Events (`fixed`/`floating` thumb anchor + radial deadzone), và bộ điều phối toàn màn hình/hướng màn hình dùng chung (`GlobalViewportContext`, `--olw-vvh`, `viewportPolicy.ts`) với **quy tắc 1 chủ sở hữu (`fullscreenOwner`)** theo [VIEWPORT_FULLSCREEN_CONTRACT.md](handovers/VIEWPORT_FULLSCREEN_CONTRACT.md) để bảo toàn fullscreen qua mở/đóng Bi-a/Câu cá/Pet Care và hỗ trợ iPhone Safari safe-area.
- **Hợp đồng phối hợp tương lai:** Giữ nguyên `GlobalViewportContext` & `useSharedFocusMode` sẵn sàng cho nhánh sửa **Billiards V4.1** sau khi được phê duyệt riêng; trên `main` tiếp tục giữ **Billiards V2** ổn định.
- **Hệ thống & File chồng chéo:** `src/app/App.tsx`, `src/app/viewport/GlobalViewportContext.tsx`, `src/shared/viewport/viewportPolicy.ts`, `src/shared/input/virtualJoystickController.ts`, `src/features/home/mobile/*`, `src/features/minigames/billiards/*` (đối chiếu contract fullscreen).
- **Song song / Tuần tự:** **COORDINATED** với M1 (`App.tsx` & shared fullscreen lifecycle); **PARALLEL SAFE** với M2, M3b–M3e, M7.
- **Focused Acceptance:** `mobileInteractablesAndHud.test.ts`, unit test cho `virtualJoystickController` & `viewportPolicy`, Playwright desktop + `430×932` portrait/landscape không che HUD và không kẹt joystick/fullscreen khi mở-đóng modal.
- **Donor sẵn có:** `Kiln Harvest` (`KILN-HARVEST-LICENSE.txt`), nghiên cứu clean-room `floating-thumb-dungeon` (`78e6337`), `nipplejs` (`ea425b3`), `mini-market-game` (`4fc4d96`), `phaser-toolkit`/`rex-notes`, mở rộng từ `useFocusMode.ts` của Billiards V3.2.
- **Agent / Model đề xuất:** **Pro** (Pointer Events + DOM/Phaser viewport & fullscreen ownership).

## Mission 1 — Billiards V4.1 & Fair Starting-Player Selection (`V0.2.x` · `COMPLETED & OWNER APPROVED` in RC2)
- **Trạng thái hiện tại:** Đã hoàn thiện, nghiệm thu và hợp nhất vào `main` trong đợt **Canonical RC2** (`feat/billiards-v4-camera` @ `fecb746` + nối contract `useFocusMode` → `GlobalViewportContext`).
- **Phạm vi đã tích hợp:** 2D & 3D (9ft Three.js), 4 chế độ (`practice`, `ai`, `local_pvp`, `online` ready check lobby), bàn phím desktop (`useBilliardsKeyboard.ts`), độ nhạy cảm ứng cục bộ (`touchPreferences.ts`), raycast chọn bi 3D, camera điện ảnh góc nghiêng V4.1 + trở về góc cơ khi ngắm, và chọn người khai cuộc công bằng + luân phiên tái đấu (`fecb746`).
- **Tồn đọng không chặn (`DEFERRED`):** Chưa playtest thiết bị Safari/Android vật lý thật; Supabase Cloud lobby coordinator hoãn theo `Tier C`.

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

## Mission 3b — Correct All 32 Inaccurate SKU Sprite Mappings (`V0.2.x` · `COMPLETED & OWNER APPROVED` in RC2)
- **Trạng thái:** Đã hoàn tất sửa toàn bộ `32` SKU sai ngữ nghĩa/trùng pixel, dọn `7` lệnh ghi đè + `9` nhánh `if False` trong `scripts/pack-farming-atlases.py`, và hợp nhất vào `main` trong Canonical RC2 (`4bf8061`). Giữ nguyên 100% canonical SKU IDs và tương thích save.

## Mission 3c / M3c.1 / M3c.2 — Animated Livestock & Ambient Animal Transplant (`V0.2.x` · `COMPLETED & OWNER APPROVED` in RC2)
- **Trạng thái:** Đã đóng gói `public/assets/farming/livestock-ranch.{png,json}` từ `FarmRanchLife_v1.0.zip` cho đủ `7` loài vật nuôi, thêm chân dung UI (`LivestockPanelModal.tsx`), chuyển ghép ambient animals trên `farm`/`village`/`garden` (`ambientAnimalVisualAdapter.ts`), hoạt ảnh vịt bơi nước và chỉnh cừu sang `sheep_brown_baby` ở scale `1.00` (`0cf17fb`, `40f0504`, `469d3de`, `0018d10`); giữ nguyên mèo `Quýt` 2D/3D.

## Mission 3d — Animated Processing Machines and Environmental VFX (`V0.2.x` · đã duyệt, có trong RC3 nghiệm thu)

- Tám máy Farm & Ranch Life hoạt động cạnh mốc xưởng Meadowbrook. Khung nghỉ, vòng làm việc và khung có thành phẩm lấy từ trạng thái hàng đợi hiện có. Trong bảng xưởng, mỗi mẻ có tiến độ và hình nguyên liệu/thành phẩm.
- Hiệu ứng cuốc, gieo, tưới, thu hoạch và báo chín bám ô đất. Vườn cây giữ hình cây LPC với chuyển động rung và quả rơi. Vật nuôi hiện trái tim tại vị trí thực sau khi vuốt ve thành công.
- Tích hợp chung với M3e vào RC3 nghiệm thu. Xem [Hướng dẫn playtest M3d/M3e](handovers/FARMING_FISHING_VISUALS.md).

## Mission 3e — Fishing Artwork and Animation Transplant (`V0.2.x` · có trong RC3, nghiệm thu câu cá thủ công chuyển sang M3g)

- Phao, gợn nước, bọt, dây câu, cá cắn và cá vừa bắt hiển thị theo phiên câu hiện có. Chill vẫn mở mặc định. Suối Đông cho phép chọn thêm chế độ giữ lực Tension.
- Hai bảng câu dùng chung khung Nuvora và cơ chế toàn màn hình của ứng dụng. Xem [Hướng dẫn playtest M3d/M3e](handovers/FARMING_FISHING_VISUALS.md).

## Sau RC3 — Deep Fishing và Deep Farming

- **M3g Deep Fishing:** Tiếp tục Phase A trong worktree hiện tại. Phase B nối artwork câu đã duyệt và nguồn ô, ID cá thể và độ bền trong kho vật lý Dev LAN.
- **FARM.0 — Simulation Foundation:** Tích lũy tăng trưởng, thời gian và môi trường, quyền quyết định của máy chủ, đồng nhất backend, hiệu năng và mô phỏng xác định.
- **FARM.1 — Soil & Farming Ecology:** Dinh dưỡng đất, ủ phân, luân canh và trồng xen hỗ trợ.
- **FARM.2 — Crop Progression:** Chuyên hóa phân bón, phẩm cấp, nâng cấp dụng cụ/kỹ năng và cơ chế cây trồng nâng cao.
- **FARM.3 — Genetics & Breeding:** Gene hoa, lai qua nhiều thế hệ, giống cây và metadata genotype lưu bền.
- **FARM.4 — Economy & Production Balance:** Lợi nhuận cây trồng, xưởng, đơn hàng và tự động hóa.
- **FARM.5 — Deep Livestock & Animal Behavior:** Sở thích theo loài (ưa thích, chấp nhận, không thích hoặc từ chối), phản ứng khi ăn, bị thu hút và đi theo thức ăn trên tay, cho ăn bằng thanh nhanh vật lý, dinh dưỡng, tình cảm, chất lượng sản phẩm, lai giống và tự động hóa cho ăn về sau. Không phạt đói khi offline.

FARM.0–FARM.5 là kế hoạch. Xem [nghiên cứu R1/R1.1](research/farming/00_RESEARCH_SUMMARY.md) và [cổng nghiệm thu từng pha](research/farming/11_PHASES_ACCEPTANCE_AND_OPEN_QUESTIONS.md).

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
