# Progress Tracker — Our Little World

*Cập nhật lần cuối: 27/11/2026*

## CANONICAL RC2 INTEGRATION (`integration/olw-canonical-rc2` → `main`)

- **Hợp nhất thống nhất Canonical RC2 (`M0 Phase 1` + `M1 Billiards V4.1` + `M3a–M3c.2` + Multiplayer Maintenance):**
  - **Cơ sở:** `main` @ `692d508` (đã có `M0` Mobile HUD Phase 1 `cfd3099`, `fix/remote-share-single-link` `143a822`, Roadmap V3 `f900d09`, và `M3a` Audit `3134f1a`).
  - **M3 (`feat/farming-art-recovery` @ `0018d10`):** Sửa `32` SKU sai/trùng ảnh (`4bf8061`), transplant toàn bộ 7 loài vật nuôi động (`0cf17fb`, `livestock-ranch.{png,json}`), khôi phục chân dung UI + ambient animals tại `farm`/`village`/`garden` (`469d3de`), và chỉnh biến thể cừu `sheep_brown_baby` scale `1.00` (`0018d10`); giữ nguyên mèo `Quýt` 2D/3D.
  - **M1 (`feat/billiards-v4-camera` @ `fecb746`):** Billiards V4.1 (2D & 3D, Practice/Bot/Local 2P/Online Ready Check Lobby, độ nhạy cảm ứng, raycast chọn bi, camera nghiêng V4.1 + trở về góc cơ khi ngắm, và chọn người khai cuộc công bằng + luân phiên tái đấu `fecb746`).
  - **Ranh giới tích hợp đã vá sạch:** Nối `useFocusMode.ts` → `GlobalViewportContext` (`useOptionalGlobalViewport`) giữ 1 `fullscreenOwner` duy nhất; đồng bộ `handleOpenBilliards` cho cả `MobileNavDrawer` và `MenuModal`; vá triệt để lỗi **HTTP 404 cold-start** trên `/donor/workshop/queue` (`scripts/devLanServerPlugin.mjs` chờ async `ssrLoadModule` promises cho `/donor/` & `/farm`).
  - **Bảo toàn save & phạm vi mở:** Save gốc `.dev-lan-state.json` được backup nguyên vẹn (`80D55386...`); tạo thêm save nghiệm thu cô lập `.dev-lan-state-acceptance-rc2.json` (`50,000` xu, `37` nhóm vật phẩm & đủ 7 loài); giữ nguyên `M0` auxiliary mobile menu improvements, `M2`, `M3d`, `M3e` và `M4–M10` là nhiệm vụ tiếp theo.

## M3d + M3e trên `feat/farming-fishing-visuals`

- **Đã triển khai, chờ chủ dự án duyệt hình ảnh.** Tám máy có ba trạng thái ở trang trại và bảng xưởng. Hiệu ứng trang trại dựa trên dữ liệu đã xác nhận. Chill và Tension dùng chung artwork mặt nước, phao và khung fullscreen.
- [Hướng dẫn playtest, ca kiểm tra và giới hạn](handovers/FARMING_FISHING_VISUALS.md).

## DOCS RECONCILIATION — ROADMAP V3, APPROVED `M3a`, `M0` & MULTIPLAYER MAINTENANCE (`main`)

- **Hợp nhất chỉ tài liệu & metadata (từ `chore/master-roadmap-v3` @ `f900d09` + `chore/m3a-asset-library-audit` @ `3134f1a`):**
  - **`M3a` (`OWNER APPROVED`):** Hợp nhất trọn vẹn 4 tài liệu kiểm kê kho donor `28` pack (`8,079` PNG duy nhất, `424` đang dùng = `5.25%`, `32` SKU sai/trùng ảnh & kế hoạch transplant): [ASSET_LIBRARY_INVENTORY.md](art/ASSET_LIBRARY_INVENTORY.md), [ASSET_REUSE_BACKLOG.md](art/ASSET_REUSE_BACKLOG.md), [asset-library-inventory.json](art/asset-library-inventory.json), và [NEXT_MISSIONS.md](NEXT_MISSIONS.md).
- **Hợp nhất `M0` Mobile HUD Phase 1 (`OWNER APPROVED`, `feat/mobile-first-hud` @ `cfd3099`):**
  - Tích hợp HUD mobile-first (`MobileTopHud`, `MobileNavDrawer`, `TouchJoystick`, `mobileHud.css`, `virtualJoystickController.ts`, `viewportPolicy.ts`), bộ điều phối `GlobalViewportContext` (`--olw-vvh` & single `fullscreenOwner` contract tại [VIEWPORT_FULLSCREEN_CONTRACT.md](handovers/VIEWPORT_FULLSCREEN_CONTRACT.md)), giữ nguyên Billiards V2 trên `main`.
- **Hợp nhất `fix/remote-share-single-link` (`143a822` — Multiplayer Maintenance):**
  - `scripts/olwRemoteShare.mjs` (`buildInfo`) & `src/features/couple/RemoteShareModal.tsx`: ẩn link LAN tạm khi tunnel đang `starting`, chỉ xuất duy nhất link HTTPS bền vững khi tunnel `ready` (chỉ fallback LAN khi `tunnelStatus === 'error'` hoặc tắt tunnel).

## MASTER ROADMAP V3 RECONCILIATION (`main` @ `e5de4ac` / `v0.2.5+`)

- **Kiểm toán thực trạng đã xác minh trên `main` (`e5de4ac`):**
  - **`OWNER APPROVED`:** Thế giới `16×16` 6 khu vực + 4 shop, Cozy Human V2 + Nuvora Inventory + 5 track nhạc nền riêng tư, `NET.1.1` WS + `/__share/<token>`, Deep Farming A–G (`40` crops, `20` flowers, `12` orchard species, `7` livestock, `84` recipes, `8` workshops, Order Board, Chill/Tension Fishing), `Quýt` 2D + Vuena 3D Pet Care V2, Billiards V2, Couple P0 (`hold_hands`, `hug`, posture anchors), và 2 hotfix hậu `v0.2.5` (`5de7317`: chặn tap mèo mở nhầm Pet Care 3D + chặn noclip 3 gốc cây ăn quả).
  - **`IN PROGRESS`:** **Billiards V3 & 3D Transplant** trên worktree riêng `C:\Users\admin\Downloads\OLW-Billiards-V3` (`feat/billiards-v3` tách từ `6c1bc66` — đã có khung `botAi.ts`, `lobbyProtocol.ts`, `physics3dEngine.ts`, `BilliardsEntryMenu.tsx`, `BilliardsOnlineLobby.tsx`, `useBilliardsKeyboard.ts`, cần hoàn thiện & reconcile lên `e5de4ac`, chưa test owner).
  - **`IMPLEMENTED` (chưa nghiệm thu playtest riêng V0.3):** `PomodoroPanel` (Study Room + tắt audio sạch), `MailboxModal`, `ScrapbookAlbumModal` (`react-pageflip`, `5MB` local/Dev LAN).
  - **`PARTIALLY IMPLEMENTED`:** Domain thuần `src/shared/cooking/` (chưa có UI Bếp), `sharedLifeTypes.ts` + `V03PrototypesModal.tsx` (Dev prototype dữ liệu giả), `Couple` P1 (`kiss` v.v. — `COUPLE_P1_ENABLED = false`), `DecorateDrawer` (chưa có shop nội thất/mở rộng phòng V0.2.4), `Caro/Othello/Battleship/Memory` (chưa nối WS `minigame_event` & `MenuModal`), `SpikeLabModal` + `cinemaSync.ts` (`V0.4` chờ benchmark `S0-5b`).
  - **`DEFERRED` / `UNVERIFIED`:** Supabase Cloud migrations (`20261124000100..20261127000200`), RLS cloud test, HTTPS Cloudflare Pages 24/7 (không chặn phát triển local Dev LAN); kiểm chứng iPhone Safari + Quick Tunnel lại cho toàn bộ bản gộp `v0.2.5+` và `OLW_ACCEPTANCE_LONG=1`.
- **Tài liệu lộ trình chuẩn hóa mới:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) · [ROADMAP.md](ROADMAP.md) · [V02_ROADMAP.md](V02_ROADMAP.md) · [NEXT_MISSIONS.md](NEXT_MISSIONS.md) · [MILESTONE_ACCEPTANCE.md](MILESTONE_ACCEPTANCE.md).

## FEATURE BRANCH — BILLIARDS V4 (`feat/billiards-v4-camera`)

- **Nhánh & Worktree:** `feat/billiards-v4-camera` tại `C:\Users\admin\Downloads\OLW-Billiards-V4` (tách từ `origin/main` @ `e5de4ac`, tích hợp nền tảng Billiards V3.2 từ `feat/billiards-v3` @ `696a9be`, giữ nguyên physics 2D/3D & không đụng primary workspace `C:\Users\admin\Downloads\Our_little_world`).
- **P0-A — Điều khiển độ nhạy cảm ứng cục bộ (`touchPreferences.ts`, `BilliardsTouchCameraSettings.tsx`, `Billiards2DGame.tsx`, `Billiards3DGame.tsx`, `BilliardsEntryMenu.tsx`):**
  - Bổ sung 4 thanh trượt độ nhạy độc lập lưu qua `localStorage` (`olw.billiards.touchCameraPrefs.v1`, không đồng bộ multiplayer) + nút **Mặc định**: **Độ nhạy ngắm cơ** (`65%`, `10–200%`), **Tinh chỉnh khi khóa cơ** (`30%`, `5–100%`), **Độ nhạy xoay camera** (`75%`, `10–200%`), **Độ nhạy thu phóng** (`80%`, `10–200%`).
  - Mức `100%` tương ứng đúng baseline cảm ứng gốc; không phụ thuộc FPS hay DPR; khóa cơ (`billiards-aim-lock`) chặn chạm nhầm nhảy góc nhưng vẫn cho phép kéo ngón tinh chỉnh góc cực nhỏ theo độ nhạy `lockedFineSensitivityPct`.
- **P0-B — Phân biệt thao tác cảm ứng & Raycast chọn bi 3D chính xác (`touchControls.ts`, `Billiards3DGame.tsx`, `cameraController3d.ts`):**
  - Chuẩn hóa bộ phân loại `TapGestureState` theo CSS px (`TOUCH_TAP_SLOP_PX = 8`, `TOUCH_TAP_MAX_MS = 450`, theo dõi `maxDistPx` suốt cử chỉ, loại bỏ drag bắt đầu từ bi, chuyển đa chạm pinch, hủy sự kiện, kéo đặt bi cái và UI touch).
  - Trong 3D, chỉ nhận diện đổi mục tiêu camera (`focusedBallId`) khi `pointerup` đạt tap hợp lệ và `THREE.Raycaster.intersectObjects` trúng đúng mesh bi nhìn thấy (không bao giờ kích hoạt khi tap mặt bàn trống, băng, lỗ, sàn hoặc viền). Đổi mục tiêu camera không làm thay đổi `aimAngle`, `aimLocked` hay `power`.
- **P1/P2/P3/P4 — Tactical Overview & Adaptive Cinematic Camera (`cameraController3d.ts`, `Billiards3DGame.tsx`, `billiards.css`):**
  - Triển khai máy trạng thái nhẹ `aiming → shot_transition → tracking → overview` + `manual_override` đọc trực tiếp vị trí/vận tốc `Ball3DState`, `onFirstHit`, `onPocket` (không chạy mô phỏng phụ hay thêm render camera).
  - **Adaptive Cinematic** (mặc định trên mobile 3D; desktop giữ `Manual`): tự nâng camera lên góc nghiêng điện ảnh trên cao theo vùng bao các bi chuyển động, tự động chuyển sang bi va chạm thật nếu đánh trượt mục tiêu dự kiến, giữ lỗ bi cái / lỗ mục tiêu & kết quả bi rơi vào lỗ (`1.15s`), tự mở rộng toàn bàn khi phá bi hoặc nhiều bi tản rộng, và áp dụng giảm chấn bất đối xứng (mở rộng nhanh `10.5`, thu gọn chậm `2.1` kèm hysteresis cooldown `480ms` & deadband `0.09m`).
  - Sau khi bi dừng, reset `zoomLevel = 1.0x` và giữ góc nhìn **Toàn bàn** (`overview`) quan sát đủ 6 lỗ cho tới khi người chơi chủ động chọn góc nhìn khác; chạm/kéo/zoom khi bi đang chạy lập tức nhường quyền điều khiển (`manual_override`) cho tới hết cú đánh; sửa thêm responsive header `@media (max-width: 960px), (max-height: 520px)` cho màn hình ngang mobile (`844×390`) hết đè HUD.
- **Kiểm chứng sau chỉnh sửa cuối trên `feat/billiards-v4-camera` (Windows Chromium / Dev LAN WS):**
  - `npm run typecheck`: **PASSED** (`tsc -b`, exit 0).
  - `npm run lint`: **PASSED** (`0` errors, `1` warning pre-existing tại `ChillFishingModal.tsx:90`).
  - Vitest (7 suites Bi-a + `privateAssetSync.test.ts`): **8/8 suites, 26/26 tests PASSED**.
  - Production build (`npm run build` — 2617 modules, 45 PWA precache entries / `4926.82 KiB`) + `node scripts/verify-prod-guard.mjs` + `npm run assets:private:verify`: **PASSED**.
  - Playwright E2E (`PLAYWRIGHT_PORT=4181`, `billiards-multiplayer.spec.ts` + `billiards-v3-modes.spec.ts` + `billiards-v4-camera.spec.ts`): **`chromium-desktop` 9/9 PASSED**, **`chromium-iphone-16-pro-max` 6/6 PASSED** (tổng **15/15 PASSED**). Mobile 3D frame-time đo thực tế từ DEV RAF profiler: **p50 `16.7ms`, p95 `33.4ms`**; desktop: **p50 `49.9ms`, p95 `50.1ms`** dưới software WebGL E2E.
  - **Phần chưa kiểm chứng:** Chơi thử trên thiết bị iPhone / Android vật lý thật (Safari PWA & cảm giác vuốt ngón thật).

## FEATURE BRANCH — BILLIARDS V3 (`feat/billiards-v3`, merged into `feat/billiards-v4-camera`)

- **Nhánh & Worktree:** `feat/billiards-v3` tại `C:\Users\admin\Downloads\OLW-Billiards-V3` (tách từ `origin/main` / `v0.2.5`, không sửa primary workspace `C:\Users\admin\Downloads\Our_little_world`).
- **Menu vào game & Chế độ chơi (Checkpoint A):** Bổ sung `BilliardsEntryMenu.tsx` hỗ trợ chọn phiên bản **2D** hoặc **3D**, chế độ **2 người cùng máy** (`local_pvp`), **Đấu Bot** (`ai`: Dễ / Vừa / Cao thủ), **Đấu Online với người thương** (`online`), cùng thể thức **8-Bi** / **9-Bi** và tùy chọn đồ họa 3D thích ứng (`auto` / `low` / `medium` / `high`). Chế độ Local 2P và Bot chạy hoàn toàn cục bộ không cần bạn chơi online.
- **Local Hot-Seat, Bot AI & Thống kê tách biệt (Checkpoint B):** Hoàn thiện lượt luân phiên thật trên cùng bàn phím/chuột/cảm ứng cho cả 2D và 3D; triển khai `src/shared/billiards/botAi.ts` mô phỏng trước bằng chính physics engine 2D & 3D (hỗ trợ cả ball-in-hand, chọn bi hợp lệ và biến thể draw tránh scratch bi cái); lưu thống kê Local/Bot riêng vào `localStorage` (`localStats.ts`), tách biệt hoàn toàn khỏi thống kê cặp đôi Online.
- **Khôi phục điều khiển Desktop gốc (Checkpoint C):** `useBilliardsKeyboard.ts` khôi phục thao tác giữ `Space` nạp lực dao động (`0.06..1.0` @ `1.25/s`) và thả để bắn, `←`/`→` (+ `Shift` xoay mịn), giữ `Z` soi cận cảnh, `Escape` hủy nạp lực/đóng popup trong game, khóa phím overworld (WASD/Arrows/Space/E/J/K/1-8) khi mở modal Bi-a và khôi phục hoàn toàn khi thoát. Cho phép `Space` hoạt động bình thường ngay cả sau khi chỉnh thanh trượt nâng cơ (`<input type="range">`).
- **Online Lobby & Ready Check qua NET.1.1 WS (Checkpoint D):** Mở rộng `devLanBilliardsLobby.mjs`, `lobbyProtocol.ts`, `useBilliardsSync.ts` và `BilliardsOnlineLobby.tsx` cho mời bạn chơi (`billiards-invite-banner`), phòng chờ cấu hình chung (2D/3D, 8-Bi/9-Bi, người khai cuộc), sẵn sàng độc lập + gate tải xong asset 2D/3D, đồng bộ đồng hồ server (`serverNowMs` trong `welcome`/`pong` + EWMA offset), đếm ngược `startAtServerMs`, hủy/rời phòng, tái đấu đồng thuận và giữ nguyên ván `in_match` + cache snapshot khi một người rớt mạng/reload.
- **Chuyển ghép Quán Bi-a 3D & Lifecycle (Checkpoint E–F):** Chuyển ghép trực tiếp từ nguồn donor `C:\Users\admin\Downloads\our_little_billiards_3d_8_ball_pool_edition(1).html` sang `src/shared/billiards/physics3dEngine.ts` + `Billiards3DGame.tsx` + `billiards3d.css` (bàn 9ft tỉ lệ mét Three.js, gỗ gụ/chrome, nâng cơ Massé `0°–45°`, 3 góc camera Gậy/Trên cao/Góc rộng, dải ngắm 3D, Web Audio metric foley, physics fixed-timestep `1/120s` × 6 substeps). Tách lazy-load độc lập `Billiards2DGame` (`41.49 kB` gzip `13.04 kB`) và `Billiards3DGame` (`50.52 kB` gzip `16.02 kB`), tái sử dụng `three` đang dùng chung cho Pet Care, dọn sạch WebGL/renderer/timer/listener khi đóng và khôi phục Phaser overworld (`data-render-suspended`: `1` → `0`) cùng nhạc nền riêng.
- **Nâng cấp Mobile Portrait, Smart Touch, Online Lobby Fix & Chế độ Luyện tập tự do (đợt 2 trên `feat/billiards-v3`):**
  - **Bàn dọc 2D chuẩn 8 Ball Pool cho màn hình dọc (`viewportTransform.ts`):** Tự động xoay `-90°` ngược chiều kim đồng hồ sang canvas `540×1000` khi màn hình dọc (`≤ 720px`) mà vẫn giữ nguyên tọa độ vật lý & wire online (`1000×540`) để PC màn ngang và điện thoại màn dọc đấu online khớp 100%; có nút đổi `Tự động / Dọc / Ngang` trong cài đặt; bổ sung shading cầu 3D và đường dự đoán bi cái + bi mục tiêu theo góc cắt/xoáy.
  - **Smart Touch (`touchControls.ts`) & Focus Mode (`useFocusMode.ts`):** Chạm trên màn hình cảm ứng không nhảy góc tức thì mà dùng vuốt thích ứng tốc độ + nút **Khóa góc ngắm (`billiards-aim-lock`)** + **Ngắm tinh phóng đại (`billiards-precision-btn`)** + **Chế độ tập trung / Toàn màn hình (`billiards-fullscreen-btn`, `--olw-vvh`)** + **vùng trượt ngang hủy kéo lực (`billiards-power-cancel-tag`)** + nâng điểm chạm đặt bi cái `36px` khỏi đầu ngón tay; ở bản 3D tách riêng **1 ngón chỉnh cơ** vs **2 ngón xoay/pinch zoom camera** và hỗ trợ camera `Trên cao` dọc theo khung hình dọc.
  - **HUD mobile 2 hàng không đè chữ (`billiards.css`, `billiards3d.css`):** Hàng 1 chứa nhóm nút thao tác & Spin/Đóng, hàng 2 hiển thị tên người chơi, khay bi và tỷ số tách rời hoàn toàn.
  - **Sửa lỗi Online Lobby tự mở 3D:** Bỏ auto-launch vào bàn khi mở lobby có ván cũ; thay bằng banner lựa chọn tường minh **`Tiếp tục ván đang dở`** vs **`Tạo phòng mới` (`reason: 'new_lobby'`)**, giữ nguyên hồi phục khi mất kết nối tạm thời (`applyLobbyConnectionChange`).
  - **Chế độ mới — Luyện tập tự do (`mode: 'practice'`):** Thêm card chọn trong `BilliardsEntryMenu.tsx` (kèm minh họa SVG bàn 2D/3D) cho phép đánh tự do không giới hạn lượt/đồng hồ và đặt lại bi cái bất cứ lúc nào (cả 2D & 3D).
  - **Nâng cấp V3.2 — Sửa toán học Touch 2D, Camera 3D độc lập & Giao diện Quán Bi-a Wood/Hall:**
    - **Chuyển ghép tài nguyên & chuẩn giấy phép (`public/assets/billiards/`, `scripts/production-public-files.json`):** Khai thác asset MIT từ `henshmi/Classic-Pool-Game` (`f60e9b8`, đã tối ưu sang `cue-stick.png`, `title-bg.jpg`, `table-preview.jpg` + `CREDITS.md`), tái sử dụng gỗ Kiln Harvest có sẵn của OLW (`public/assets/ui/hybrid/`), `Three.js OrbitControls` (`MIT`), và avatar pixel-art `BilliardsAvatarPortrait.tsx` (`drawCozyWardrobePreview`) thay toàn bộ emoji `🏡`/`🌙`/`🤖`/`🎯` trên HUD và Lobby. Chỉ tham khảo thuật toán/kiến trúc (không chép code/asset) từ các donor `NO_LICENSE` / `GPL-3.0`.
    - **Sửa triệt để điều khiển Touch 2D (`touchControls.ts`, `Billiards2DGame.tsx`):** Gỡ bỏ hoàn toàn đảo chiều `flippedHandedness: portraitRotated`, gỡ đứt gãy `radius < 28px`, sửa hướng xoay đồng nhất theo chiều kim đồng hồ trên cả 4 góc phần tư (dọc/ngang/zoom), hỗ trợ chạm nhanh `<= 450ms` & `<= 8px` để đổi góc ngắm ngay khi nhả tay (không bắn nhầm), chế độ ngắm tinh dùng `computeRelativeFineAimDelta2D` không phụ thuộc tốc độ lấy mẫu cảm ứng, khóa multi-touch tránh nhảy góc khi chuyển 2→1 ngón, xử lý `pointercancel`/`lostpointercapture` an toàn, và nâng cấp bàn 2D viền gỗ gụ + chốt kim cương + lỗ da viền đồng + cơ `cue-stick.png`.
    - **Tách bộ điều khiển Camera 3D (`cameraController3d.ts`, `Billiards3DGame.tsx`, `billiards3d.css`):** Tách sở hữu `OrbitControls` trong chế độ **`Tự do` (`orbit`)**, dùng quaternion slerp mượt + `shortestAngleDelta3D` (chuyển cam `Toàn bàn` / `Góc cơ` / `Tự do` trực tiếp qua 3 nút không snap `camera.up`), bỏ làm tròn `.toFixed(2)` trên zoom, giữ steady `hoverWorldPt` khi kéo ngắm bình thường, nâng gợi ý `olw-hand-hint--top` lên trên để hết đè `billiards-3d-elev-slider`, và gắn profiler RAF nhẹ (`data-perf-p50`/`p95` chỉ trong `DEV`).
    - **Thiết kế lại sảnh vào Quán Bi-a (`BilliardsEntryMenu.tsx`, `billiards.css`):** Nền sảnh `title-bg.jpg`, 2 thẻ chọn bản 2D/3D kèm ảnh thực, 4 nút chế độ gọn gàng, nút gỗ `button_wide_wood_*.png`, và gom cài đặt phụ (8-Bi/9-Bi, độ khó Bot, đồ họa 3D, thống kê Online & Local) vào modal **`billiards-entry-settings-btn`**.
  - Static & Build: `npm run lint` (0 errors, 1 warning có sẵn tại `ChillFishingModal.tsx:90`), `npm run typecheck`, `npm run build` (2615 modules, 45 PWA precache entries / `4907.53 KiB`, 7 JS bundles), `node scripts/verify-prod-guard.mjs`, `npm run assets:private:verify` đều **PASSED**.
  - Vitest (10 suites Bi-a + netcode trên Touch/3D Camera/Portrait/Lobby/Bot/Controls/Protocol/DevLAN): **10/10 suites, 28/28 tests PASSED** (sau khi cập nhật canvas mock `createLinearGradient` / `bezierCurveTo` / `closePath` trong `billiardsControlsAndLifecycle.test.tsx`).
  - Playwright E2E (`PLAYWRIGHT_PORT=4175`, `billiards-multiplayer.spec.ts` + `billiards-v3-modes.spec.ts` trên cả `--project=chromium-desktop` 7/7 và `--project=chromium-iphone-16-pro-max` 7/7): **14/14 PASSED**. Chromium 3D frame-time đo thực tế từ DEV RAF profiler: Desktop Chromium **p50 `16.7–33.4ms`, p95 `33.4–50.1ms`**; 430×932 Mobile emulation **p50 `16.7ms`, p95 `33.4ms`**. Vòng lặp DOM/Heap 10 chu kỳ ổn định (`liveDomNodes`: `179 -> 180`, `jsHeapMB`: `24.8 -> 25.13 MB` desktop / `25.28 -> 25 MB` iPhone emulation).
  - **Phần chưa kiểm chứng thực tế trên phần cứng thật:** Chơi thật trên iPhone 16 Pro Max (Safari / PWA Add to Home Screen) và Android thật qua Cloudflare Quick Tunnel (đo FPS/nhiệt WebGL & cảm giác vuốt tay thật) và SQL migration trên Supabase Cloud thật.

## HOTFIX POST-`v0.2.5` — Pet Interaction Priority & Orchard Collision (`fix/pet-interaction-and-orchard-collision`)

- **Nghiệm thu từ chủ dự án:** Chủ dự án đã playtest và phê duyệt cả hai bản sửa lỗi nóng trên baseline `v0.2.5` (`6c1bc66` → `main`):
  1. **Ngăn mở nhầm Pet Care 3D khi đang làm vườn:**
     - Gỡ `setInteractive` / tap handler trực tiếp trên mèo 2D trong [PetEntity.ts](../src/game/entities/PetEntity.ts) và bỏ nhánh bắt click vào Quýt trong `WorldScene.ts`, giúp click/chạm một lần lên mèo không tự mở Pet Care 3D và không cướp click xuống ô ruộng hay đi bộ.
     - Cập nhật [interactionResolver.ts](../src/shared/interaction/interactionResolver.ts) (`isFarmingToolOrSeed` + `hasReachableCropPlot`) để khi cầm nông cụ, hạt giống, phân bón hoặc vòi phun đứng cạnh ô ruộng, ô ruộng luôn thắng ưu tiên trước mèo cho phím `J` và nút tương tác ngữ cảnh mobile; giữ nguyên mở Pet Care 3D có chủ ý qua `J`/nút ngữ cảnh, cho ăn (`offer_food_pet`) và chơi đồ chơi (`roll_toy`).
  2. **Chặn noclip gốc cây ăn quả (Orchard Trees):**
     - Bổ sung `refreshBlockedGrid()` trong [WorldScene.ts](../src/game/scenes/WorldScene.ts) đồng bộ các ô gốc `DEFAULT_ORCHARD_SLOT_TILES[view.slotIndex]` của những cây đang trồng trong `deepFarmCache.orchardViews` vào `blockedGrid` khi dựng map và khi nhận `cmd:sync-deep-farm`, chặn cả nhân vật và Quýt đi xuyên qua 3 cây ăn quả (và các cây trồng thêm về sau).
- **Kiểm chứng tập trung (Focused checks):**
  - `npx vitest run tests/unit/mobileInteractablesAndHud.test.ts tests/unit/farmVisualScaleParity.test.ts`: **2/2 files, 5/5 tests PASSED** (bao gồm case mới xác nhận ưu tiên `crop_plot` trước `pet` khi cầm nông cụ).
  - `npm run typecheck`: **PASSED** (`tsc -b`, exit 0).
  - **Chính sách quy trình:** Các thay đổi được commit trên nhánh fix riêng `fix/pet-interaction-and-orchard-collision` rồi gộp an toàn vào `main` (từ task kế tiếp trở đi bắt buộc phát triển trong worktree riêng tạo bằng `npm run worktree:new -- --name <slug>`).

## CANONICAL STABLE RELEASE (`main` / tag `v0.2.5`)

- **Phê duyệt phát hành:** Chủ dự án đã playtest và phê duyệt `integration/olw-canonical-rc1` (`a800e12`), thăng hạng thành **Canonical Stable Baseline `v0.2.5`** trên nhánh **`main`**.
- **Kiểm toán Git History & Vệ sinh trước khi push:**
  - Xác nhận **`4cfc3b7`** (`refs/tags/backup/owner-accepted-baseline`, chứa 4 track `.mp3` riêng tư) **không nằm trong cây lịch sử** của `integration/olw-canonical-rc1` hay `main`; giữ cục bộ, không push tag/nhánh backup lên GitHub.
  - Phát hiện **`a0c8f80`** (từng thêm `public/assets/audio/music/home_garden_theme.mp3` 3.79 MB trước khi xóa ở `4d875b4`), lịch sử cũ của `.dev-lan-state-pw-4176.json` / `.dev-lan-state-vqg-4188.json`, và file `.dev-lan-state-qa-4174.json` còn nằm trong tree `a800e12`.
  - Đã gỡ `.dev-lan-state-qa-4174.json` khỏi Git tracking (`git rm --cached`), bổ sung `.dev-lan-state-*.json` vào `.gitignore` (giữ nguyên `.dev-lan-state.json` cục bộ của chủ dự án), và xác nhận các track trong `public/assets/audio/music/` (`title`, `farm`, `town`, `forest`, `garden`, `blue_forest`) đều là bản MIT từ `robintrepte/hollowmere` & `Blinter/harvest-horizon` theo `public/assets/audio/CREDITS.md`.
  - Do `origin/main` chưa từng tồn tại trên GitHub và bản `main` cục bộ trước đây (`34f58c7`, đã lưu bản dự phòng `backup/pre-release-main-34f58c7`) sạch hoàn toàn (0 media/private/state blob), nhánh `main` cho bản phát hành `v0.2.5` được tạo từ commit `34f58c7` với đúng snapshot cây code sạch đã duyệt của `integration/olw-canonical-rc1` — đảm bảo lịch sử `main` push lên GitHub sạch 100%, không force-push hay viết lại nhánh remote nào.
- **Lệnh vận hành & Chính sách nhánh tương lai:**
  - Đồng bộ asset riêng tư cục bộ: `npm run assets:private:sync -- --from <source>` & `npm run assets:private:verify`.
  - Khởi chạy server cặp đôi: `npm run host:couple` (hoặc `npm run dev`).
  - Mọi nhánh feature/fix mới trong tương lai bắt buộc tách từ `main` (`v0.2.5` trở đi).

## CANONICAL BASELINE RECOVERY & UNIFIED INTEGRATION (`integration/olw-canonical-rc1`)

- **Baseline chuẩn đã khôi phục:** `f69106e` (`OLW-Neon` `antigravity/unified-neon-carbon`, bảo toàn toàn bộ bản đồ 16×16 6 khu vực, avatar Cozy Human V2 `384×384`, mèo cam 2D + Pet Care 3D `vuena-cat.glb`, sửa kéo/click túi đồ Nuvora, va chạm/portal và 5 bản nhạc nền riêng tư).
- **Nhánh sao lưu an toàn (chưa xóa / không force-push):**
  - `backup/recovery-neon-f69106e` (`f69106e`)
  - `backup/recovery-multiplayer-27560ac` (`27560ac`)
  - `backup/recovery-deep-farming-08be551` (`08be551`)
  - `backup/recovery-carbon-b162a2d` (`b162a2d`)
  - `backup/recovery-billiards-wip` (`aaf7d50` / `3eac5fe`)
- **Chuỗi commit tích hợp trên `integration/olw-canonical-rc1` (chưa push / chưa merge):**
  1. `79a6017` — Đồng bộ runtime private assets (`scripts/sync-private-assets.mjs`, `docs/PRIVATE_ASSETS_SETUP.md`, `tests/server/privateAssetSync.test.ts`; kiểm tra SHA-256 cho `public/assets/private-unified/` và 5 track `public/assets/private-audio/`).
  2. `c4052c7` — Tích hợp **NET.1** WebSocket transport, reconnect watchdog & state sync (từ `187285b`).
  3. `4e34bf7` — Tích hợp **NET.1.1** remote partner `/__share/<token>` auto-join trực tiếp thành Nắng, redeem & siết quyền host (từ `27560ac` — bản NET.1.1 này trước đó đã được chủ dự án test trên thiết bị thật **9/11 kịch bản pass, 0 fail, 2 chưa test**).
  4. `97e6319` — Ghép **Deep Farming Checkpoints A–G** (item registry, 40 nông sản, 20 hoa, 12 cây ăn quả, 7 loài vật nuôi, 84 công thức, 8 xưởng, order board, shared authority, packed donor atlases) lên nền `16px` + sửa scale cây trồng/`!` badge/chuyển vùng orchard & chuồng nuôi ra đồng cỏ đi được + gộp `DonorWorkshopModal`.
  5. `3a89a9e` — Tích hợp **Billiards V2** lên hạ tầng WebSocket NET.1 (`minigame_event`), giữ nguyên deterministic physics, replay, lazy-load & tạm dừng/khôi phục overworld (`cmd:set-render-suspended`), kèm bảng SQL `billiards_matches` & RPC.
  6. `61541aa` — Sửa hồi quy `minnow` → `fish_minnow` trong `meadowbrookNatureCatch.ts` (bị `08be551` đè về `bait_free_worm`) và cập nhật 4 unit test tiền Deep Farming.
  7. `7ad2f90` — Giới hạn cuộn `maxHeight: 90dvh` trong `DonorWorkshopModal.tsx` để nút Đóng luôn nằm trong viewport.
  8. `ae392ed` — Bổ sung `src/features/farming/deepFarmingModals.css` và semantics `role="dialog"` cho `FlowerAlbumOrchardModal`, `LivestockPanelModal`, `OrderBoardModal` (khắc phục việc repo không dùng Tailwind CSS).
- **Kiểm chứng tự động & trình duyệt đã chạy (Local Windows / Dev LAN Server / Chromium):**
  - Trên `7ad2f90`: `npm run lint` (`0` errors, `1` warning pre-existing tại `ChillFishingModal.tsx:90`), `npm run typecheck`, `npm run build` (2599 modules), `node scripts/verify-prod-guard.mjs`, `npm run assets:private:verify` (**10 atlas/character files + 5 custom music tracks PASSED**), Playwright E2E `chromium-desktop` (**6/6 passed**: `billiards-multiplayer.spec.ts` 3/3, `donor-economy-two-client.spec.ts` 1/1, `multiplayer-ws-hardening.spec.ts` 2/2 gồm NET.1.1 `/__share/<token>`).
  - Full Vitest `npm run test` trên `7ad2f90`: **188/190 test files passed (876/876 executed tests passed)**; chỉ còn **2 suite jsdom Canvas 2D có sẵn từ baseline `f69106e`** fail (`tests/unit/donorCabacosRenderDetect.test.ts` và `tests/unit/pydewFarmDonorRender.test.ts` do `phaser.esm.js` thiếu `HTMLCanvasElement.getContext('2d')` dưới jsdom).
  - Sau sửa CSS 3 modal (`ae392ed`): `npm run lint`, `npm run typecheck`, `npm run build` (2600 modules, 36 PWA precache entries), `node scripts/verify-prod-guard.mjs`, `npm run assets:private:verify` đều **PASSED**, và kiểm tra trình duyệt trực tiếp trên `http://localhost:5176` (0 console/page errors):
    - Xác nhận avatar Cozy Human V2 (`avatars.png` `384×384`), mèo 2D `Quýt`, Pet Care 3D (`vuena-cat.glb` HTTP 200), 6 bản đồ (`home`, `garden`, `village`, `forest`, `beach`, `farm`), cả 5 track `.mp3` tại `/assets/private-audio/music/*.mp3` HTTP 200/206, kéo/đóng túi đồ không kẹt overlay, scale cây/thú/huy hiệu nông trại cân đối, cả 4 modal Deep Farming có card ấm cúng + `role="dialog"`, Billiards V2 mở/bắn/đóng (`data-render-suspended` `1` → `0`), và Network Diagnostics (`Status: Connected`, `Transport: WS`).
- **Phần chưa kiểm chứng thực tế trên bản gộp RC1 (chờ chủ dự án nghiệm thu):**
  - Chơi thật 2 thiết bị trên iPhone 16 Pro Max (Safari + PWA Add to Home Screen) qua Cloudflare Quick Tunnel cho toàn bộ bản gộp RC1 (Deep Farming + Billiards V2 + chuyển mạng Wi-Fi ↔ 5G).
  - Chạy thực tế SQL migrations & assertions (`supabase/migrations/*` + `node scripts/run-local-sql-suite.mjs` / Supabase project thật) cho 2 migration Deep Farming & Billiards V2.
- **Cảnh báo Git History & Đồng bộ Asset Riêng Tư:**
  - Để đồng bộ runtime trên worktree/máy dev khác: chạy `npm run assets:private:sync -- --from <đường_dẫn_source>` và kiểm tra lại bằng `npm run assets:private:verify`.
  - **Không được push** tag cục bộ `backup/owner-accepted-baseline` (`4cfc3b7`) vì chứa 4 file `.mp3` riêng tư trong lịch sử commit đó (và commit lịch sử `a0c8f80` đã có trên `origin/antigravity/unified-neon-carbon` chứa `home_garden_theme.mp3`). Nhánh `integration/olw-canonical-rc1` chỉ chứa code sạch (toàn bộ `public/assets/private-*` nằm trong `.gitignore`).

## MISSION NET.1.1 — Sửa hồi quy Remote Join qua Cloudflare Quick Tunnel (`feature/multiplayer-hardening`)

- **Nguyên nhân gốc đã tái hiện trực tiếp trên `187285b`:**
  1. Khi máy Host đã tạo sẵn ngôi nhà **1/2** (`[Mây]`), hàm `seedCoupleWorldIfNeeded()` trong `scripts/devLanServerPlugin.mjs` thoát sớm nếu `db.worlds` đã tồn tại mà chưa thêm `Nắng` (`partner-b`) -> điện thoại mở `/__share/<token>` tuy được gán phiên `Nắng` nhưng `GET /api/dev-lan/world/snapshot` trả `null`, rơi về `OnboardingScreen`.
  2. Quy tắc `blockedRemoteRoute` của NET.1 chặn nhầm `POST /api/dev-lan/world/redeem` (**HTTP 403**: `"Thao tác quản trị này chỉ mở trên máy chủ Host."`) khiến nhập mã mời ghép đôi thất bại, và chặn nhầm `GET /api/dev-lan/identities` (**HTTP 403**) làm mất nút chọn danh tính sau khi bấm `Đổi tài khoản`.
  3. `stopRemoteShare()` trong `scripts/olwRemoteShare.mjs` chưa đóng các upgrade socket WebSocket nên `DELETE /api/dev-lan/remote-share` có thể bị chờ timeout khi client đang kết nối WS.
- **Khắc phục & Siết bảo mật quyền hạn từ xa:**
  - Bổ sung `ensureRemotePartnerInPrimaryWorld()` (gọi tại `POST /remote-share` và `GET /client-context` khi `isRemoteClient === true`) để tự động ghép `Nắng` (`22222222-...`) vào ngôi nhà 1/2 hiện có (giữ nguyên toàn bộ dữ liệu nhà, đồ đạc, pet của Host) và phát `world_mutated('member')` cho Host.
  - Gỡ `/world/redeem` và `/identities` khỏi `blockedRemoteRoute`: cho phép `Nắng` dùng `/world/redeem` nếu cần, và `GET /identities` chỉ trả về đúng `[partner-b]` khi là remote client; đồng thời **siết chặt quyền remote** trong `devLanServerPlugin.mjs` + `devLanWsHub.mjs` chỉ chấp nhận `PARTNER_B_DEV_ID` (`403` nếu giả mạo `Mây` hoặc `Outsider`) và tiếp tục chặn `403` đối với `/reset`, `/seed-couple`, `/world/create`, `/world/invite`, `/dev-console/*` và `POST`/`DELETE /remote-share`.
  - Cập nhật `OnboardingScreen.tsx` & `App.tsx` (`isRemoteClient`) ẩn các nút Dev/Host trên client từ xa, và cập nhật `stopRemoteShare()` đóng dứt điểm `upgradeSockets`.
- **Kiểm chứng NET.1.1 (sau chỉnh sửa code cuối):**
  - `npm run lint` (`0` errors, `2` warnings có sẵn), `npm run typecheck`, `npm run build`, `node scripts/verify-prod-guard.mjs` (**PASSED**).
  - Vitest 9 file hồi quy (`multiplayerHardening.test.ts` 5/5, `remoteShareTunnel.test.mjs`, `devLanServer.test.ts`, `swPrecache.test.mjs`, `moduleBoundary.test.ts`, `netcodeCore.test.ts`, `networkDiagnosticsOverlay.test.tsx`, `playerFacingCopyGate.test.ts`, `realtimePresenceSync.test.ts`): **9/9 files, 27/27 tests pass**.
  - Playwright E2E `multiplayer-ws-hardening.spec.ts` (cổng `4179`): `chromium-desktop` (**2/2 pass**, `13.3s`) và `chromium-iphone-16-pro-max` (**2/2 pass**, `12.2s`).
  - Kiểm thử trình duyệt sạch qua **Cloudflare Quick Tunnel thật (`lands-keep-compete-source.trycloudflare.com`)** từ nhà 1/2 do Mây tạo thủ công: mở `/__share/<token>` tự vào thẳng `home` không qua onboarding, `Connected` / `WSS` / `2/2` / `RTT 92 ms (avg 189)` / `Jitter 10 ms` / `home (On map)`, `POST /reset` trả `403`, tải lại trang (`reload`) giữ đúng phiên `Nắng` & kết nối lại `WSS` (`RTT 81 ms`).

## MISSION NET.1 — Hardening Multiplayer WebSocket, Reconnect & Authoritative State Sync (`feature/multiplayer-hardening`)

- **Chẩn đoán gốc rễ & Benchmark Live Cloudflare Quick Tunnel ([NET1_MULTIPLAYER_DIAGNOSIS_AND_BENCHMARK.md](reports/NET1_MULTIPLAYER_DIAGNOSIS_AND_BENCHMARK.md)):**
  - Tái hiện thực tế bằng `scripts/spike-tunnel-transport.mjs` qua Quick Tunnel `https://hansen-sufficient-scout-hindu.trycloudflare.com`: đúng như cảnh báo tài liệu Cloudflare, **SSE (`/api/dev-lan/events`) bị edge-buffer hoàn toàn** (6 sự kiện server phát cách nhau 300ms đều chỉ tới cùng lúc khi đóng stream ở **`2133ms`**); trong khi **WSS (`/api/dev-lan/ws`)** kết nối trong **`211ms`**, `ping`/`pong` RFC 6455 thành công, **RTT trung bình `88.86ms`** (`min 82.9ms`, `p95 136.67ms`, `jitter 7.46ms`) và phục hồi sau ngắt đột ngột trong **`209ms`**.
- **Phase B/C/D/E triển khai & Donor Reuse:**
  - Chuyển vận chuyển realtime chính sang **WebSocket (`ws` `noServer` trong `scripts/devLanWsHub.mjs` + `src/lib/backend/devLanRealtimeClient.ts`)**, giữ SSE fallback có kiểm soát, bảo vệ WS upgrade + HTTP proxy (`scripts/olwRemoteShare.mjs`) theo phiên đăng nhập 2 người và chặn route quản trị host (`403` cho client từ xa).
  - Bổ sung `welcome` snapshot, `presenceSeq`/`serverSeq`/`stateVersion` đơn điệu, supersede kết nối cũ (`4001`), hàng đợi có giới hạn `BoundedOutboundQueue(64)`, exponential backoff + jitter (`ReconnectBackoff`), heartbeat WS + ping/pong `2.5s`, watchdog `6.5s`, `probeLiveness()` khi chuyển mạng/unlock/resume, và bỏ phụ thuộc đồng hồ giữa các máy cho couple invite (`resolveInviteLocalExpiryMs`).
  - Nâng cấp mượt di chuyển (`RemoteMotionInterpolator`, cadence 10 Hz + gói `idle` chốt vị trí, đồng bộ `posture` & `heldItem`), đồng bộ phiên bản trạng thái + `idempotencyKey` cho farm/donor/pet care, và thêm bảng **Multiplayer Diagnostics** DEV-only (`NetworkDiagnosticsOverlay.tsx`, `TopStatusBar.tsx`, `Ctrl+Shift+N`) ẩn hoàn toàn khỏi production build.
- **Kiểm chứng tự động (Local / Dev LAN WS Proxy / Chromium headless, sau chỉnh sửa code cuối):**
  - `npm run lint` (`0` errors, `2` warnings có sẵn), `npm run typecheck` (`tsc -b`, exit 0), `npm run build` (2569 modules, 26 PWA precache entries), `node scripts/verify-prod-guard.mjs` (**PASSED**, 0 dev leak).
  - Vitest (`--exclude tests/unit/donorCabacosRenderDetect.test.ts --exclude tests/unit/pydewFarmDonorRender.test.ts`): **175 files / 837 tests passed** (gồm `multiplayerHardening.test.ts` giả lập 0/100/200/300ms RTT + jitter, Wi-Fi→5G blackhole + chống stale packet, đồng thời farm/pet & bảo mật proxy/WS; `netcodeCore.test.ts` 7/7; `networkDiagnosticsOverlay.test.tsx` 1/1; `swPrecache.test.mjs` 2/2). Ghi chú 2 file `donorCabacosRenderDetect.test.ts` và `pydewFarmDonorRender.test.ts` vẫn có lỗi load Phaser/Canvas trong jsdom có sẵn từ baseline `f69106e`.
  - Playwright 2 client (port `4179`): `chromium-desktop` (`multiplayer-ws-hardening.spec.ts` + `farming-co-op.spec.ts`: **2/2 pass**) và `chromium-iphone-16-pro-max` (`multiplayer-ws-hardening.spec.ts`: **1/1 pass**). Lưu ý `tiled-world-two-client.spec.ts` có drift UI có sẵn (`nav-outdoor` hiện mở bảng chọn map `OutdoorWorldNavSheet`).
- **Chưa kiểm chứng thực tế (Chờ chủ dự án test trên thiết bị thật):** Playtest 2 máy thật (PC + iPhone Safari / PWA qua `trycloudflare.com` với chuyển mạng **Wi-Fi ↔ 5G**, khóa/mở máy, background/resume và farm/pet đồng thời).

## Sửa lỗi sau Playtest thực tế 2 thiết bị (PC + iPhone Safari / Cloudflare Quick Tunnel)

- **Hiển thị bạn đồng hành tức thì & chống nhấp nháy SSE:** `POST /realtime` (`movement`) cập nhật trực tiếp presence trên server, thêm grace window `2.5s` + keepalive `8s` khi tunnel/iPhone chập chờn, phát lại `movement` của người kia ngay khi SSE mở (`GET /events`), tự tạo `remoteEntity` khi nhận packet di chuyển mà chưa kịp nhận `presence_sync`, bỏ so sánh lệch đồng hồ liên thiết bị, giữ `currentPresence` qua các lần reconnect và không phá kết nối khỏe khi chuyển tab ngắn.
- **Tương tác cảm ứng mobile & HUD không chồng lấn (`430×932`):** Bật scope `.olw-game-ui[data-ui-variant='warm-pixel-cottage']` kèm fallback `:root` trong `gameUiTokens.css`; sắp xếp lại làn dọc mobile (`.quick-nav`, hotbar, `.joystick-zone`, `.main-game-touch-actions` với nhãn rõ ràng cho `[J]`/`[K]`, `.couple-emote-dock`) để không đè lên nhau; mở thẳng **Chăm sóc mèo 3D** khi đứng cạnh mèo dù đang cầm nông cụ; bổ sung chạm trực tiếp vào mèo, sofa, giường đôi, ghế vườn, bàn học, tủ đồ, hòm thư và khung ảnh để tự tìm đường đến và thực hiện thao tác.
- **Xem người thương câu cá mượt 60 FPS:** Bỏ `saveDb()` đồng bộ trên `/donor/fishing/sync`, đẩy `donor_fishing_sync` trực tiếp qua SSE, loại bỏ `setFsm` 60Hz gây giật React trong `ChillFishingModal.tsx`, nội suy mượt `stepSpectatorFishingState(...)` bằng `requestAnimationFrame`, và hiển thị đúng avatar riêng của hai người trên cầu câu.
- **Phòng học yên tĩnh (`Tắt` âm thanh):** Dừng sạch toàn bộ `AudioContext`/`GainNode`/`AudioBufferSourceNode` (`suspend` + `close`) trong `ambientAudio.ts` và gọi `gameAudio.setOverlayPaused(true)` khi ở trong `Phòng học yên tĩnh` hoặc đang chọn `Tắt` âm thanh nền.
- **Kiểm chứng tự động:** `npm run typecheck`, `npm run lint` (0 errors), `npm run build`, `node scripts/verify-prod-guard.mjs`, 12 file `vitest` (`42/42` tests pass gồm 4 test mới: `realtimePresenceSync`, `mobileInteractablesAndHud`, `fishingSpectatorSmooth`, `studyAmbientAudio`), và Playwright Chromium 2 ngữ cảnh (desktop `1280×800` + mobile portrait `430×932` với ảnh kiểm tra không chồng HUD, chạm sofa/giường/mèo 3D, tắt âm phòng học, spectator câu cá SSE). **Lưu ý:** Nghiệm thu thực tế lại trên **iPhone 16 Pro Max Safari qua đường hầm HTTPS** vẫn cần chủ dự án kiểm tra lại.
- **Ghi chú E2E legacy:** Chạy `tests/e2e/v01-our-little-home.spec.ts` và `tests/e2e/v015-living-home.spec.ts` có `5 passed / 7 failed` do drift có sẵn từ các milestone trước (7 nút bottom nav thay vì 5, UI túi Nuvora P.1 bỏ `inv-row-*`, và `world-clock-wallet` trên portrait `430×932` che nút mời trên top bar).

## Phase II donor preview (parallel integration)

| Field | Value |
|-------|--------|
| **Frozen owner compare** | `0ef19c4` @ `integration/donor-reuse-preview` (#27–#29: HUD, discoverability, farm/fish) |
| **Render checkpoint tag** | `checkpoint/p0-cabacos-pet-7474eb0` (pre–Phase II) |
| **Worker dispatch** | Phase II branches continue in parallel; owner gate reversed — integration merges after VQG |
| **Playthrough** | [PHASE_II_OWNER_PLAYTHROUGH.md](PHASE_II_OWNER_PLAYTHROUGH.md) |
| **Interactables** | store [`interactable-inventory.md`](/cursor/stores/self/docs/interactable-inventory.md) |
| **8-dir walk clips** | `facing8` → Phaser `walk-{diagonal}` rows (procedural + atlas composite); VQG `media/vqg-phase-ii-diagonal-walk.png`; e2e `phase-ii-diagonal-walk.spec.ts` (Chromium desktop, chưa iPhone) |
| **Cửa / thang env hooks** | Portal table + ladder pairs; 2P `COUPLE_ENV_TRANSITION`; VQG door/ladder png; e2e `phase-ii-env-transition.spec.ts` |
| **Interactable audit P0** | Barn door → shop; home bowl J + `COUPLE_HOME_BOWL`; minigame honest stub; VQG `vqg-phase-ii-bowl-food-fill.png` / `barn-door` |

`integration/playtest-all` vẫn @ `c01d291` — không đổi.

## 0. V0.2 P0 — A Home Comes Alive (đồng bộ Roadmap v2)

**Nguồn:** [V02_ROADMAP.md](V02_ROADMAP.md) · [V02_PRODUCT_ENGINEERING_PLAN.md](V02_PRODUCT_ENGINEERING_PLAN.md) · [V02_INTEGRATION_PLAYBOOK.md](V02_INTEGRATION_PLAYBOOK.md)

| Stream | PR | Trạng thái agent | Ghi chú tích hợp |
|--------|-----|------------------|------------------|
| Composer 1 Farming | #14 | Dev LAN playable | Chờ Supabase RPC + plot contract C3 |
| Composer 2 Pet | #13 | Slice 4 in progress | PetCareScene, hand-feed RPC `20261125001200`, e2e session |
| Composer 3 World | #12 | Zone/farm art | Không sửa care scene |
| Foundation authority | #10 | SQL open | #13 wires `pet_consume_hand_food`; merge trước prod Supabase |
| Living overworld | #11 | DEV `?living-pet=1` | Gộp vào #12/#13 khi integrate |

**Chưa owner-verified:** build tích hợp 15–20 phút (nhà → mèo → shop → farm → explore). **Không** merge `main`.

## 1. Trạng thái tổng thể
- **Milestone hiện tại:** V0.2 P0 (song song V0.1 gate còn thiết bị thật)
- **Trạng thái:** Ba PR feature (#12–#14) + foundation #10/#11; tích hợp theo playbook, chưa release.

## 2. Checklist nghiệm thu Spike 0 & V0.1

### Đã hoàn thành & kiểm chứng tự động (Local / Dev LAN Server / Chromium)
- [x] Bootstrap repo (`npm` + `package-lock.json`), TypeScript `5.9.3`, Vite `8.3.8`, `vite-plugin-pwa` `2.0.0`, Vitest `5.1.1`, Playwright `1.65.1`, bộ docs đầy đủ (đã cập nhật nguyên tắc **Zero-Configuration Onboarding** & mục tiêu V0.4 không cần VPN phía người xem).
- [x] Starter CC0 pixel art 16x16 (`tileset-cozy.png`, `furniture-cozy.png`), Tiled JSON maps (`home.json`, `garden.json`), PWA icons, `manifest.json`, và video mẫu Spike 0 (`/spike/sample-cozy-sync.mp4`, 660.2 KB H.264/AAC).
- [x] Domain logic thuần (`src/shared/`): avatar validation, 12 starter furniture items, map bounds/portals/no-place zones, placement & collision grid, 10Hz movement throttle + out-of-order drop + `selectLatestPresenceByUser` chống trùng avatar đa thiết bị, và toán học Spike 0 sync.
- [x] Supabase SQL migrations (`20261124000100`, `20261124000200`, `20261124000300`), `seed.sql`, `tests/rls_and_pairing.sql`.
- [x] **Dev-Only LAN Multiplayer Relay (`scripts/devLanServerPlugin.mjs` + `devLanBackend.ts`):** HTTP JSON + Server-Sent Events (`/api/dev-lan/*`) lưu trạng thái tại `.dev-lan-state.json` (gitignored), hỗ trợ test 2 thiết bị vật lý qua Wi-Fi (`Mây` & `Nắng`), đa thiết bị cho cùng 1 tài khoản, từ chối tài khoản thứ 3 (`403` / `WORLD_FULL`), và bị loại hoàn toàn khỏi production build (`import.meta.env.DEV` + `UnconfiguredBackend`).
- [x] Phaser 4.2.1 renderer pixel-perfect (`pixelArt: true`, `roundPixels: true`, `DPR <= 2`, `ResizeObserver`, lazy dynamic import), tìm đường BFS khi chạm, bàn phím WASD/mũi tên, cần điều khiển ảo tùy chọn, lập chỉ mục avatar đối phương theo `userId`, ẩn avatar khi khác phòng, chế độ trang trí lưới 16x16.
- [x] Giao diện mobile-first tiếng Việt, Onboarding/Pairing thân thiện, Tủ đồ tùy chỉnh ngoại hình, Quản lý trang trí optimistic + rollback, Hướng dẫn cài PWA iOS; `SpikeLabModal` và các công cụ kỹ thuật bị ẩn/tách khỏi bản production.

### Chưa kiểm chứng trên thiết bị/hạ tầng thật (Cần chủ dự án thao tác)
- [ ] Thử thực tế hai thiết bị vật lý qua Wi-Fi: Laptop Windows (`Mây`) ↔ Redmi K70E (`Nắng`).
- [ ] Nghiệm thu thật trên **iPhone 16 Pro Max** (Safari thật + Add to Home Screen PWA, chạm cảm ứng, khóa màn hình và mở lại, đổi Wi-Fi ↔ 4G).
- [ ] Nghiệm thu thật trên **Supabase Cloud** qua **hai mạng khác nhau** (chạy 3 migrations, `supabase/tests/rls_and_pairing.sql`, điền `.env`).
- [ ] Nghiệm thu phương án **V0.4 Cinema không bắt người xem cài VPN** trên thiết bị thật.
- [x] Chủ dự án đã duyệt **Demo E (`?art-demo=E` — Unified Cozy World)** làm định hướng. Tích hợp game chính vẫn chờ `OLW-010-01..03` (xem [ART_DIRECTION.md](art/ART_DIRECTION.md) và [ART_EVALUATION.md](ART_EVALUATION.md)).

### Đã hoàn thành thêm — Đánh giá Mỹ thuật & 4 Demo trực quan (25/11/2026)
- [x] Kiểm kê toàn bộ 17 file asset tải về + kiểm tra SHA-256 (loại bỏ 2 bản trùng `free_version.zip` và `Sprout_Lands_-_Sprites_-_Basic_pack.zip`), giải nén vào `asset-candidates/` (đã thêm vào `.gitignore`), sinh contact sheet lưới 16px (`scripts/build-contact-sheets.py`) và kiểm tra bản quyền web/PWA.
- [x] Xây dựng cụm preview dev-only (`?art-demo=A|B|C|D`, loại bỏ 100% khỏi `dist/` khi build production) với 4 bản demo mỹ thuật hoàn chỉnh gồm nội thất, vườn, 2 nhân vật (`Mây` & `Nắng`), thú cưng (`Free Pets Pack` CC BY 4.0), ánh sáng đèn, tia nắng và bóng đổ.
- [x] Chụp và kiểm tra trực quan 8 ảnh Desktop (`1280×720`) & Mobile (`430×932`) bằng Playwright (`scripts/capture-art-demos.mjs`), viết báo cáo chi tiết tại `docs/ART_EVALUATION.md`.

### Đã hoàn thành thêm — Demo E: Unified Cozy World & Tài liệu Mỹ thuật Chính thức (25/11/2026)
- [x] So sánh trực quan 4 ứng viên avatar (`scripts/build-avatar-comparison.py` → `asset-candidates/contact-sheets/avatar-candidates-comparison.png`) và chọn **Modern Interiors Free** (`Adam`, `Alex`, `Amelia`) kèm Canvas palette-remap (`src/game/artDemos/unifiedAvatarBuilder.ts`) bảo toàn 100% `AvatarConfig` của V0.1.
- [x] Xây dựng `SemanticAssetRegistry` & 14 quy tắc chuẩn hóa đa pack (`src/game/artDemos/semanticAssetRegistry.ts`), triển khai bản showcase hợp nhất **Demo E (`?art-demo=E`)** tại `src/game/artDemos/DemoEScene.ts` (nhà 6 khu chức năng + vườn bất đối xứng có ao bo cong autotile, cầu gỗ, đường đất 9-slice, picnic anh đào, luống cây, mèo & Shiba Inu, camera mobile-first & name tag gọn).
- [x] Chụp và nghiệm thu trực quan 8 góc nhìn Demo E (`scripts/capture-art-demos.mjs --only=E`: Desktop overview, Mobile portrait `430×932`, Interior Desktop/Mobile, Garden Desktop/Mobile, Mobile landscape `844×390`, Small mobile `390×844` — 0 lỗi console/HTTP), hoàn thiện bộ tài liệu [ART_DIRECTION.md](art/ART_DIRECTION.md) và [ASSET_PIPELINE.md](art/ASSET_PIPELINE.md).

## 3. Kết quả kiểm thử & Đo đạc thực tế (25/11/2026)

| Lệnh kiểm tra | Phạm vi | Kết quả thực tế |
|---|---|---|
| `npm run lint` | ESLint 10 + TypeScript ESLint + React Hooks v7 | **Pass** (0 errors, 0 warnings) |
| `npm run typecheck` | `tsc --noEmit` strict mode | **Pass** (exit 0) |
| `npm run test` | Vitest (`cinemaSync`, `placement`, `avatar`, `realtime`, `localPreviewBackend`, `devLanServer`) | **Pass** — 6 files, **24/24 tests pass** |
| `npm run build` | `tsc -b && vite build` + VitePWA | **Pass** — `index-*.js` **588.69 kB** (`169.23 kB` gzip), lazy Phaser chunk `createGame-*.js` **1,388.16 kB** (`363.65 kB` gzip), precache **21 entries (1973.23 KiB)**, tạo `dist/sw.js` & `dist/manifest.webmanifest` |
| `node scripts/verify-prod-guard.mjs` | Quét toàn bộ `dist/assets/*.js` | **Pass** — quét 3 JS bundle(s), 0 dấu vết của `/api/dev-lan`, `/asset-candidates`, `art-demo-showcase`, `seed-couple`, email dev hay `menu-spike-lab` trong bản production |
| `npm run test:e2e` | Playwright Chromium (`chromium-desktop` + `chromium-iphone-16-pro-max` `430x932`) với **browser contexts tách biệt hoàn toàn** qua Dev LAN SSE | **Pass** — **8/8 tests pass** (`23.0s`): ghép cặp 2 máy tách biệt, từ chối người thứ 3, đổi phòng realtime, đổi tên avatar, đặt đồ & xung đột ô trùng, đa thiết bị cho cùng 1 tài khoản (vẫn 2/2), layout `430x932`, Spike 0 video sync qua SSE |

## 4. Hướng dẫn thử nghiệm ngay trên Laptop Windows & Redmi K70E

1. Chạy `npm run dev` tại thư mục dự án.
2. Trên **Laptop Windows**: mở `http://localhost:5173`.
3. Trên **Redmi K70E** (cùng mạng Wi-Fi với laptop): mở Chrome và truy cập URL `Network:` mà Vite in ra. *(Nếu K70E không truy cập được cổng `5173`, kiểm tra Windows Firewall cho phép inbound Node.js/port `5173` trong mạng Private Wi-Fi.)*
4. Trên **Laptop**: chọn **Mây (Chủ nhà)** → **Tạo ngôi nhà mới** → bấm **Mời người thương (1/2)** ở thanh trên cùng để lấy mã `OLW-...` (hoặc bấm **Tạo sẵn nhà 2/2 (Mây & Nắng)** nếu muốn vào ngay).
5. Trên **Redmi K70E**: chạm **Nắng (Người thương)** → nhập mã mời vừa tạo (hoặc vào thẳng nếu đã tạo sẵn nhà 2/2).
6. Thử di chuyển cả hai nhân vật, đi ra vườn, mở Tủ đồ đổi ngoại hình, mở Trang trí đặt/chuyển đồ để thấy đồng bộ realtime ngay trên hai thiết bị thật.

## 5. Bàn giao Master Research & Design

Takeover chạy lại lint, typecheck, Vitest 24/24, production build, production guard và Playwright Chromium 8/8. Build và Playwright chạy trong bản sao tạm để giữ nguyên dist và trạng thái Dev LAN của working tree. Vite có cảnh báo chunk >500 kB. Luồng video Windows ↔ Redmi K70E trên cùng Wi-Fi được chủ dự án báo cáo trước đây; chưa có số đo WAN, Safari thật hoặc Cloud. [Checkpoint kiểm chứng](research/TAKEOVER_CHECKPOINT.md) · [Báo cáo tổng hợp](research/MASTER_RESEARCH_SUMMARY.md)

## 6. Baseline trước V0.1 Final Integration

Mốc tiếp nhận là OLW-010-01. Quyền phát hành atlas được kiểm theo PD-01 và dùng fallback CC0 nếu chưa rõ. Việc tích hợp artwork, deploy và nghiệm thu thiết bị thật vẫn đang chờ. Baseline chỉ cập nhật quyết định sản phẩm, tài liệu và thông tin nhận dạng trong dữ liệu thử nghiệm. [Checkpoint](research/TAKEOVER_CHECKPOINT.md#checkpoint-baseline-v01-final-integration)

Kiểm thử baseline trong bản sao tạm đã pass lint, typecheck, 24/24 Vitest, production build, production guard và 8/8 Playwright Chromium (22,8 giây). Vite vẫn có cảnh báo chunk >500 kB. Kết quả Supabase Cloud và iPhone Safari/PWA thật vẫn đang chờ.

### OLW-010-01 — Atlas Demo E theo profile

Đã tạo atlas private từ 15 tệp nguồn Demo E, cộng hai frame Frakassets đã xác minh. Profile public có PNG 16.142 B và tổng 27.960 B gồm manifest/credits. Profile private có PNG 46.875 B và tổng 74.780 B. Cả hai có 21 semantic ID. Private atlas tái tạo trùng hash. Public precache 25 mục, 1.999,56 KiB. Tệp ZIP giả và atlas private có sẵn trong sandbox đều nằm ngoài dist public và precache.

Lint, typecheck, 26 Vitest, production build/guard, private build và 8 Playwright Chromium đều pass. Đã kiểm hình atlas 1:1, phần runtime sẽ nối ở OLW-010-02 và OLW-010-03. Quyền deploy Internet của bốn nhóm pack Demo E còn Pending Deployment License Verification. [Quy trình và credits](art/ASSET_PIPELINE.md#4-tạo-bản-phát-triển-riêng-và-bản-public)

### OLW-010-02 — Avatar Modern Interiors trong game chính

Profile riêng dùng rig Adam/Alex/Amelia. WorldScene và Tủ đồ dùng cùng Canvas palette-remap của Demo E, giữ 6 trường cấu hình cũ, bốn hướng và khóa animation cũ. Profile public dùng rig CC0. Nếu tải atlas thất bại, bộ vẽ avatar starter vẫn hoạt động.

Lint, typecheck, 26 Vitest, public/private build, guard và 8 Playwright Chromium pass. Hai context đổi tóc, màu, áo và kính, peer cập nhật Canvas, reload khôi phục preview. Kiểm hình Tủ đồ ở 430×932, bốn hướng có frame idle và walk riêng, hai cấu hình có cache key khác nhau. Chưa kiểm iPhone thật.


### OLW-010-03 — World Integration đã hoàn thành

Game chính dùng hai nền atlas và ánh xạ đủ 12 SKU. Profile private giữ pixel gốc Demo E với sàn gỗ bớt tương phản, mosaic liền mạch, đường Sprout Lands nối theo ô kề và biến thể cỏ rải theo hash. Camera fit toàn map khi resize và đổi map, cả khi mở bảng trang trí. Hình pet dùng cell 16×16 ở cùng mật độ avatar, kiểm dưới dạng preview tĩnh. Menu có link credits theo profile.

- Lint, typecheck, **31/31 Vitest**, public/private build, production guard và **8/8 Playwright Chromium** pass. Có cảnh báo chunk >500 kB như trước.
- E2E kiểm hai context cùng chơi (cả desktop và Chromium cảm ứng), đổi ngoại hình, chạm đi tới cổng nhà/vườn, đặt và dời đèn đúng ô, chặn chồng đồ, rồi reload và chọn lại món đã dời. WorldBackend, schema/RLS, map logic, collision và BFS giữ nguyên.
- PNG atlas public **16.454 B**, tổng cả manifest và credits **28.272 B**. Atlas riêng **47.649 B** PNG và **75.570 B** tổng. Public SW **25 mục, 2.006,19 KiB**. Private SW **25 mục, 2.006,20 KiB**, không precache atlas riêng. Build public không sao chép atlas riêng hoặc tệp thử nghiệm không hợp lệ.
- Screenshot game chính ở desktop 1440×900 và 1280×720, mobile portrait 430×932 và landscape 844×390, cùng Tủ đồ và preview tỷ lệ pet, lưu ngoài Git tại `test-results/v01-final-art/`. Dữ liệu ảnh là fixture Dev LAN.
- Chưa thử bản này trên iPhone Safari/PWA thật, Android thật hay Supabase Cloud. Quyền phục vụ atlas riêng qua Internet còn Pending Deployment License Verification. [Giấy phép và credits](art/ASSET_PIPELINE.md#4-tạo-bản-phát-triển-riêng-và-bản-public)

### OLW-010-04 — Realtime Optimization

Di chuyển thường giới hạn 8 Hz, ngưỡng 2 px tích lũy và cập nhật hướng theo cadence. Gửi gói chốt khi idle, đổi map hoặc kết nối lại. Một avatar đại diện cho mỗi người, chọn theo phiên Presence mới nhất. Trace cục bộ giảm từ 153 xuống 99 gói. Lint, typecheck, 35 Vitest, public build, production guard và 10 Playwright Chromium không retry pass. Số liệu Supabase Cloud và nghiệm thu Safari/PWA trên iPhone thật đang chờ. [Checkpoint kỹ thuật](research/GPT_NIGHT_CHECKPOINT.md)

### OLW-010-05 — Review và checklist

Đã review tĩnh SQL/RLS/RPC, Auth và private Realtime. Có checklist Supabase Test/Prod, Cloudflare Pages Free, quyền triển khai Web/PWA của artwork và xác thực URL asset. Các mục Cloud và thiết bị thật chưa thực hiện. [Review và checklist](research/GPT_NIGHT_OLW_010_05_REVIEW.md)

### V0.1 Security Hardening

Đã thêm migration bổ sung cho quyền EXECUTE của RPC, thứ tự khóa world/invite, trần hai thành viên, phân quyền Realtime và receipt idempotency. PostgreSQL 18.6 local vượt SQL assertions và ba kịch bản nhiều phiên. Supabase Test/Auth/PostgREST/WebSocket thật còn **Pending Verification**. [Checkpoint và hướng dẫn tích hợp](research/GPT_NIGHT_CHECKPOINT.md#v01-security-hardening--hoàn-thành-local-cloud-pending-verification)

## 7. Triển khai V0.1.5 — Living Home (`neon/night-dev`)

*Trạng thái tổng thể V0.1.5: **Implemented & Locally tested** (`Pending cloud/device verification` — chưa đánh dấu `Accepted` trước khi kiểm thử Supabase Cloud và iPhone Safari thật).*

- **Phục hồi mỹ thuật Demo E & Camera (`03072e4`):** Tái lập 100% tỷ lệ pixel 1:1 (`world-props.png`, `props-manifest.json`), anim ngồi trên `avatars.png`, sprite mèo `cat-orange` CC BY 4.0, camera tự bám theo người chơi trên bản đồ lớn hơn viewport và thu vừa khít khi trang trí.
- **`OLW-015-01` Kho đồ tối thiểu K5 (`b5c6faa`):** `supabase/migrations/20261125000100_v015_inventory_and_catalog.sql`, 6 vật phẩm catalog 0₫, phân tách `shared` và `user:<uuid>`, nhận hạt mèo miễn phí hằng ngày.
- **`OLW-015-03/04` Bé mèo cam sống động (`3d8a630`):** `20261125000200_v015_pet_mvp.sql`, catch-up ngoại tuyến nhân từ (`FLOOR=30`, trần 48 giờ), đua lệnh cho ăn nguyên tử & hồi chiêu server, `PetEntity.ts` + `PetPanel.tsx` + âm thanh `petAudio.ts` chạm để phát.
- **`OLW-015-05/06` Phòng học yên tĩnh & Pomodoro (`eb5d202`):** `THIRD_PARTY_NOTICES.md` ghi công MIT (`cocoworking`), `20261125000300_v015_study_pomodoro.sql`, đồng hồ chuẩn server (`PomodoroPanel.tsx`), âm thanh nền mặc định tắt (`ambientAudio.ts`), ngồi vào ghế trái/phải và mèo nằm nghỉ chế độ yên lặng.
- **`OLW-015-07` Tương tác cặp đôi & Khung ảnh (`d40b2e1`):** `CoupleActionBar.tsx` (5 biểu tượng cảm xúc + mời ôm 15 giây có chấp nhận/từ chối), ngồi sofa/ghế vườn 2 slot không chồng lên nhau, nằm giường đôi kèm lớp chăn pixel pastel, `PhotoFrameModal.tsx`.
- **`OLW-015-02` Hộp thư & Quà bất ngờ (`3e7ed72`):** `20261125000400_v015_mailbox_and_gifts.sql`, giấu nội dung quà bí mật ở tầng server tới khi người nhận tự mở, rollback sạch khi ngăn đồ nhận đã đầy (`STACK_FULL`), `MailboxModal.tsx` plain-text chống XSS và badge thông báo trên hòm thư đỏ ngoài vườn.
- **`OLW-015-08` Dev Console K6 (`400e054`) & Prototype V0.3 (`5db098b`):** Tách RPC dev vào `supabase/dev-migrations/20261125900100_dev_console_rpcs.sql` (`dev_admins` + `worlds.is_test = true`), `DevConsoleDrawer.tsx` (`Ctrl+Shift+D`), `V03PrototypesModal.tsx` chỉ nạp qua `import.meta.env.DEV` và được kiểm tra loại bỏ 100% khỏi bản production bởi `scripts/verify-prod-guard.mjs`.
- **Kiểm chứng cục bộ mới nhất (cổng `4176`, Dev LAN + Chromium):** `npm run lint` (0 lỗi), `npm run typecheck` (`tsc -b`, 0 lỗi), `npm test` (**23 files / 68 tests pass**), `npm run build` + `verify-prod-guard.mjs` (**Pass**, 0 dev leaks), `npm run build:private` (**Pass**), `npx playwright test` (**13 passed, 1 skipped**). [Checkpoint nhánh đêm](research/NEON_NIGHT_CHECKPOINT.md)

## 8. Pre-Integration Quality & Living Pet Override (`neon/night-dev`)

*Trạng thái: **Implemented & Locally tested** (Sandbox & E2E cục bộ; chờ chủ dự án duyệt trực quan biến thể mèo, UI và quy mô bản đồ trước khi chạy Integration Master).*

- **M1 P0 Foundation (`afd75bb`):** Khôi phục typecheck thật (`tsc -b`), sửa lỗi đăng ký đủ frame lưới trong `src/game/art/worldAtlas.ts`, bổ sung migration `20261125000500` thu hồi quyền `EXECUTE` helper `SECURITY DEFINER` và khóa `worlds FOR UPDATE` trong `_inventory_adjust_item` (`supabase/tests/v015_inventory_security.sql` chờ chạy trên PostgreSQL thật).
- **M2 Living Cat Visual (`1605435`):** 3 biến thể mèo thủ công `24×24px` (`ginger-tabby` Quýt, `cream-puff` Mochi, `calico-patch` Bông) + 4 phụ kiện + 27 animation tracks + `PetAnimationController.ts` (`wake_yawn_stretch`), sandbox `/?pet-art=1`.
- **M3 Physical Interaction (`411efb2`):** Hệ thống phím & ngữ cảnh `[J]`/`[K]`/`1–8` (`interactionResolver.ts`), `HeldItemRenderer.ts`, catalog thức ăn an toàn (`petFoodCatalog.ts`), bảo toàn 1:1 `Inventory → Bowl → Consumed`, hành trình nhận nuôi mèo hoang (`petPhysicalCare.ts`) và `PetEntity.ts` render nguyên bản 1:1.
- **M4 Living Pet Intelligence & Pet Lab (`e4eb0aa`):** Adapter tiền tích hợp (`petPrimitivesAdapter.ts`), cấu hình 7 tính cách / 8 nhu cầu không tử vong / 9 cảm xúc / 14 affordance (`petIntelligenceConfig.ts`), mô phỏng 18 kịch bản (`petLabSimulation.ts`), sandbox `/?pet-lab=1`.
- **M5 Game UI & Shared Life (`1f5b8d4`):** Hệ thống Cozy Indie Game UI với 2 biến thể **Warm Pixel Cottage** & **Illustrated Storybook**, thanh hotbar, hộp thoại chân dung, Cuốn Sổ Chung 5 tab (`OurLittleNotebook.tsx`), contract & Dev LAN stubs V0.3, sandbox `/?ui-sandbox=1`.
- **M6 World Expansion & Showcase (`0a8ec8c`):** Bản đồ `64×64` & `96×96` gồm 10 địa điểm có chiều sâu (`worldExpansionMap.ts`, `WorldExpansionScene.ts`), `/?world-sandbox=1` và bản trải nghiệm tổng hợp `/?experience-demo=1` với Touch D-pad di động.
- **Tài liệu & Bằng chứng trực quan (`test-results/grand-showcase/`):** Đã tạo đủ 16 screenshot Desktop/Mobile/Small/Landscape + 2 animated GIF (`pet-locomotion-and-wake.gif`, `pet-physical-feeding-and-play.gif`) và bộ báo cáo bàn giao Phase 14 ([Living Pet](pet/LIVING_PET_QUALITY_REPORT.md), [Game UI](ui/GAME_UI_DESIGN_SYSTEM.md), [Physical Interaction](gameplay/PHYSICAL_INTERACTION_SPEC.md), [World Expansion](world/WORLD_EXPANSION_DESIGN.md), [Quality Audit](research/QUALITY_AUDIT.md)).

## 9. Grand Integration

Đã hợp nhất GPT, Neon và DeepSeek trên nhánh riêng, bảo toàn Demo E, Realtime và các bản Grand sandbox. PostgreSQL local đạt fresh/upgrade theo từng tệp SQL, gồm bản vá debit kho và receipt hộp thư. Vitest 453/453 và Playwright Chromium 15 pass, 1 skip có chủ đích. Xung đột version migration chờ lịch sử database đích. Supabase Cloud, thiết bị thật và mở rộng gameplay sau quality gate còn chờ. [Integration checkpoint](research/INTEGRATION_CHECKPOINT.md)

## 10. Mission 02 — SQL foundation đang review

Đã đối chiếu lịch sử theo xác nhận chủ dự án và gỡ version migration trùng. Catalog/quality, RPC bát ăn nước và các vector integer có bản chuẩn bị trong nhánh mission. PostgreSQL fixture fresh/upgrade và các regression local pass. Parity giá/bão hòa, quality gift, authority không gian, gameplay có thưởng và Supabase Test còn chờ. [Checkpoint và API](research/MISSION_02_CHECKPOINT.md)

## 11. Mission 02.5 — nhánh tích hợp thử

Đã review snapshot PR #4 `700d1af` và thử tích hợp riêng: 474 Vitest, Playwright 19 pass / 1 skip, PostgreSQL fixture fresh/upgrade và public/private guards pass. Đã thêm bản sửa thử cho identity/quality hotbar, concurrent input và Escape. Luồng `pet_interact('feed')` cũ vẫn vượt qua gate physical care; catalog, quality gift/transfer và server authority chưa hoàn tất. Chưa đủ điều kiện merge hoặc deploy; Supabase thật và iPhone thật chưa được kiểm. [Bàn giao Mission 04](research/MISSION_04_TECHNICAL_HANDOVER.md)

## 12. Mission 04B-2 — server-authoritative living pet

Đã thêm migrations 04B-2 + hardening `20261125140000` + correctness `20261125150000`: offer expiry commit (pending/accepted/deferred), reservation consume on `fill_food`, server-clock movement (`authoritative_tile_*`, bỏ proof làm căn cứ), `pet_nav_anchors` + nav contract 04D. **Local:** lint/typecheck, Vitest 526, SQL fresh+upgrade, build/PWA. **Chưa:** Cloud apply, iPhone, dynamic furniture grid trong SQL. [Bàn giao 04B-2](handover/MISSION_04B2_PET_AUTHORITY.md)

## 13. Mission 05 — Farming vertical slice (checkpoint)

- **Branch:** `cursor/mission-05-farming-slice-d77e` — vòng lặp Dev LAN trong game chính: cuốc → gieo → tưới → thu hoạch → bán/mua hạt (`docs/handover/MISSION_05_FARMING_PLAYABLE.md`).
- **Đã kiểm (local DoD):** Vitest **534** pass (`farmPlotContract` + 184 plots), lint/typecheck/build; Playwright `farming-co-op.spec.ts` — 2 client + API versioned apply, annex ô `120`, `INVALID_PLOT` (log: `/opt/cursor/artifacts/farming-co-op-e2e-184.log`).
- **Lưới:** `farmPlotContract` **v1.0.1** (#12 vendored), **184** ô (`farm_main`+`farm_annex`), Dev LAN + Supabase `_farm_plot_on_contract_soil`; SQL `farming_authority.sql` chưa chạy trên Postgres thật.
- **Kiểm chứng:** Supabase migration apply trên remote; duplicate-harvest 2 client; icon hotbar farming (Composer 2).
- **PR #10:** readiness + Composer 2 authority trong `docs/handover/PR10_INTEGRATION_COMPOSER2.md` (pet branch riêng).

## 14. Mission M — Deep Living Pet Experience V2 (`antigravity/carbon-living-pet-v2`)

- **Phạm vi & Kiến trúc:** Nâng cấp từ PR #79 (`26b185d`) lên hệ thống **3D Three.js Living Pet Care V2** (`src/donors/nintendogs-cat-v2/` + `src/game/pet/care/`):
  - **Giải phẫu & shader lông mèo 3D (`CatModel`, `CatRig`, `CatActor`, `CatBreeds`, `CatPatterns`):** Surface Nets + GLSL shell-fur (`uFluff`, `uComb`, `uDirt`), đồng tử dọc mèo + double-blink/squint (`j4lpan/pet-shop` MIT), 8 râu 3D hai má, tai tam giác dựng/cụp airplane ears, đuôi dài 5 đốt (`idle`, `wag_slow`, `wag_fast`, `puff`, `tuck`), hộp sọ/bàn chân cho 3 giống OLW (`ginger-tabby`, `cream-puff`, `calico-patch`).
  - **Không gian sống & đồ chơi (`CatRoom`, `CatProps`, `ToyWorld`, `CatWandSim`):** Phòng khách cặp đôi có nắng vàng, bụi sáng bay, thảm dệt, sofa đôi, nệm ngủ, trụ cào móng, khay bát ăn/bát nước gốm có hiệu ứng vơi/sóng nước, lược 3D, bóng chuông, cuộn len, hộp giấy và cần câu mèo dây Verlet 6 đốt.
  - **Tự chủ hành vi & Ranh giới (`CatBrain`, `CatPlayController`, `PetCareThreeStage`):** Nối 1:1 `PetSnapshot`, `Pet8Needs`, `PetPersonalityTraits`, `derive9Emotion`, `scoreAffordanceAction`, `MemoryState`. Quýt tự đi dạo, đánh hơi, ngồi chớp mắt chậm, cuộn bánh mì, ngủ trưa, vươn vai ngáp, liếm chân rửa mặt, vồ đồ chơi, chui hộp giấy, tự chạy tới bát ăn/uống nước, và cụp tai né bước (`RefuseAct`) khi bị chạm quá đà/mệt.
  - **2P Co-Care & Persistence:** Mở rộng `SharedPetCareSession` (`water`, `toy`, `pose`, `coatFluff`) trên Dev-LAN SSE + Supabase Realtime broadcast (`pet_care_session`), nối ngược trạng thái chăm sóc về `WorldScene` / `PetLivingMainGameDriver`, giữ nguyên 1 điểm phát `evt:pet-care-request-consume` chống trừ kho trùng.
- **Đã kiểm (local Chromium WebGL2 + Dev-LAN, sau lần sửa code cuối):**
  - `npm run lint` (**0 errors**, 2 warnings có sẵn), `npm run typecheck` (`tsc -b`, exit **0**), `npm run build` + VitePWA (`dist/sw.js`, 25 precache entries, **704ms**).
  - `npm run test`: **152 files / 752 tests pass** (gồm `tests/unit/petCareV2CatBrain.test.ts`).
  - Playwright Chromium Desktop (`PLAYWRIGHT_PORT=4183`): **6/6 pass** trên 5 specs (`pet-care-closeup.spec.ts`, `pet-care-isolated-atlas.spec.ts`, `pet-care-session-acceptance.spec.ts`, `pet-care-shared-session.spec.ts`, `pet-care-living-v2.spec.ts` gồm test 2-client `preset-partner-a` + `preset-partner-b`, single consume & exit/re-enter persistence). *(Ghi chú: spec có sẵn `pet-care-hotbar.spec.ts` không thuộc scope V2 trước đó fail ở `.locator('svg')` trong `hotbar-slot-1`.)*
  - Video nghiệm thu liên tục H.264 `1280×720`: **385.44 giây (06:25)** + đối chiếu donor tại [PET_CARE_V2_COMPARISON.md](phase-ii/PET_CARE_V2_COMPARISON.md).
- **Chưa kiểm trên thiết bị/hạ tầng thật (`Pending Device & Cloud Verification`):** Chưa test hiệu năng WebGL2 & cảm ứng thật trên **iPhone 16 Pro Max Safari / PWA Add to Home Screen**, và chưa test đồng bộ 2 mạng qua **Supabase Cloud** thật.

## 15. Mission M.1 — Model Vuena CC0, Animation tương tác, Âm thanh CC0 & Tối ưu hiệu năng (`antigravity/carbon-living-pet-v2`)

- **Model 3D chuyên nghiệp (CC0):** Thay thế mặc định model procedural Surface Nets + 9-layer shell fur bằng **`Vuena — Cute Pets & Wildlife FREE Sample`** (`public/assets/pet-care-v2/models/vuena-cat.glb`, **CC0**, 19 xương, **13 animations**: `idle`, `idle_alt`, `walk`, `run`, `jump`, `eat`, `sit`, `sleep`, `attack`, `call`, `hit`, `death`, `assist`, kèm `cat_LOD0` 7.188 tris & `cat_LOD1` 2.452 tris) qua `CatGltfActor` & `CatAnimationAdapter`. Vẫn giữ model procedural cũ để so sánh DEV qua `?cat-model=procedural`.
- **Animation & Tương tác vật lý:** Bổ sung `pawSwipe` nhấc & vờn chân trước đồng bộ đúng frame chạm đồ chơi (`progress >= 0.54`) với `ToyWorld.batImpulse`, bổ sung pha ôm cuộn len & đạp chân sau (`hugKick`), và sửa `BoxPeekAct` tiếp cận ngoài hộp + nhảy qua thành hộp `jumpTo` vào tâm hộp (`interiorFloorY`) có gắn obstacle `'box'` để tránh xuyên mesh.
- **Âm thanh thật CC0 (`PetCareAudioEngine`):** Vendor và transcode 15 file MP3 từ OpenGameArt CC0 (`Kerzoven`, `IgnasD`, `cogitollc`, `rubberduck`) tại `public/assets/pet-care-v2/audio/` (meo, gừ loop, nhai hạt, uống nước, bước chân, bóng nảy, chuông, hộp giấy, vút cần câu/đồ chơi, chải lông) với cooldown chống lặp, nút Mute + thanh Âm lượng, và gesture-unlock tương thích Safari/iOS PWA.
- **Hiệu năng & Preset đồ họa:** Ngủ vòng lặp 2D Phaser (`game.loop.sleep()` / `wake()` trong `PetCareRuntime.ts`) và bỏ render `PetCarePortraitRig`/`PetCareRoomBackdrop` ẩn khi mở Pet Care 3D; thêm 3 preset **`Thấp` / `Vừa` / `Cao`** (`DPR <= 1.0/1.5/2.0`, shadow tắt/`512`/`1024`, `LOD1`/`LOD0`, hạt bụi `0`/`14`/`32`) và xử lý giải phóng tài nguyên WebGL/GLTF khi thoát.
- **Kiểm chứng cục bộ (Chromium Desktop, không chạy benchmark dài theo giới hạn quota):**
  - `npm run lint` (0 lỗi), `npm run typecheck` (`tsc -b`, exit 0), targeted Vitest (`petCareV2CatBrain.test.ts` + `petCareM1Adapter.test.ts`: **8/8 pass**), `npm run build` + `tests/server/swPrecache.test.mjs` (**2/2 pass**).
  - Playwright `tests/e2e/pet-care-living-v2.spec.ts` (`--project=chromium-desktop`, cổng `4183`): **2/2 pass** (đo nhanh cùng môi trường headless SwiftShader cho thấy frame time giảm từ **202.5ms** xuống **87.0ms**, `renderTriangles` 31.576 ở LOD0 `Cao`, chuyển `Thấp` ↔ `Cao` đổi `LOD1` ↔ `LOD0`, mute/volume & 2P sync hoạt động).
- **Chưa kiểm chứng thật:** Cần chủ dự án playtest trực tiếp trên Windows GPU, **iPhone 16 Pro Max Safari / PWA Add to Home Screen** (kiểm chứng độ mượt và audio iOS thật) và cân bằng âm lượng nghe thực tế.

## 16. Final World Stabilization, Real Cat Vocalizations, Remote Tunnel Share & P0 Natural Couple Animations (`antigravity/unified-neon-carbon`)

*Cập nhật lần cuối: 26/11/2026*

- **Lịch sử & Tag khôi phục:** Giữ tag `backup/owner-accepted-baseline` tại `4cfc3b7` và giữ lịch sử sạch từ `9646e5c` (có lưu ý commit `a0c8f80` trước đó về regression locomotion mèo đã được khắc phục trong pipeline hợp nhất).
- **Địa hình độ cao kiểu Pokémon & Tài nguyên âm nhạc (`tileElevation.ts`, `zonePropColliders.ts`, `gameAudioManager.ts`):**
  - Áp dụng tầng dữ liệu `Elevation` & `ElevationTransitions` trên 4 bản đồ Tiled (`village`, `farm`, `beach`, `forest`): chặn ô độ cao `0` (nước, vách đá, bờ cầu gỗ), chỉ cho phép đổi độ cao `+/-1` qua cầu thang/đường dốc chỉ định, chặn cắt góc chéo qua vách và chặn vật cản `farm_beehive` (`40,26`); kiểm tra BFS hợp lệ 100% portal & NPC trên cả 4 bản đồ (`village`, `farm`, `beach`, `forest`).
  - Chuẩn hóa **Extended World** & **Safe Living Cat** làm mặc định chính thức tại `/` (DEV vẫn giữ opt-out `?extended-world=0` / `?living-pet=0`); không để rò rỉ DEV UI/flag trong bản build production.
  - Cấu hình nhạc nền theo vùng (`home_garden`, `farm`, `town`, `forest`, `beach`) với nhạc riêng gitignored tại `public/assets/private-audio/music/` (fallback MIT công khai tại `public/assets/audio/music/`), kèm cơ chế độc quyền `setPetCareMusicActive` cho BGM `pet_care` khi chăm mèo 3D.
- **Hotfix Tiếng mèo thật (`import-real-cat-vocalizations.mjs`, `catVocalizationScheduler.ts`, `petCareAudio.ts`):**
  - Loại bỏ hoàn toàn âm meo tổng hợp formant/oscillator; nhập **8 file tiếng mèo/mèo con ghi âm thật** khác nhau (MD5 duy nhất) từ **Freesound CC0** (`#448084` Breviceps, `#476918` Luke100000, `#813119` & `#813113` qubodup) và **Mixkit** (`#92`, `#86`, `#96`) vào `public/assets/pet-care-v2/audio/` và đóng gói sprite `public/assets/audio/sprites/pet.{mp3,json}`.
  - Nâng cấp `PetCareAudioEngine` & `gameAudioManager`: giữ nguyên purr/ăn/uống/đồ chơi, chỉ xoay vòng 8 file thật không lặp liên tiếp, giới hạn cao độ tự nhiên `0.97–1.03`, gọi `ctx.resume()` trước khi phát nếu `AudioContext` đang `suspended` (khắc phục Safari/iOS drop tiếng đầu), và ducking BGM nhẹ khi mèo kêu.
- **Zero-Config Cross-Network Share (`scripts/olwRemoteShare.mjs`, `olwTunnelBinary.mjs`, `RemoteShareModal.tsx`):**
  - Bổ sung lệnh `npm run host:couple` và bảng **Chia sẻ qua mạng ngoài (Dev)** tự khởi chạy Cloudflare Quick Tunnel (`cloudflared`, nhị phân tải về `.olw-bin/` gitignored) + proxy reverse có cookie HMAC `HttpOnly`, route `/__share/<token>` tự chuyển hướng sang `/?remote-partner=1` tự ghép Partner B (`Nắng`), passthrough SSE `no-cache`, và khóa cứng HTTP `403` cho yêu cầu từ xa gắn header `x-olw-remote-share: 1`.
  - Bổ sung `CoupleInviteToast` luôn hiển thị ngay cả khi `CoupleEmoteDock` đang thu gọn ở góc màn hình.
- **P0 Natural Couple Animations (`coupleHandKinematics.ts`, `coupleStateMachine.ts`, `couplePairLocomotion.ts`, `couplePairedPoseTextures.ts`, `coupleAnimationRenderer.ts`, `WorldScene.ts`):**
  - Khóa phạm vi chỉ bật P0 (`hug`: `approach -> embrace -> hold -> release`, và `hold_hands`: `reach -> connect -> idle / walk -> release`); giữ nguyên `COUPLE_P1_ENABLED = false` chờ chủ dự án duyệt hình ảnh P0.
  - Áp dụng 2-bone FABRIK (`jordgubben/promenad`, [COUPLE_ANIMATION_DONORS.md](COUPLE_ANIMATION_DONORS.md)), compositing giữ nguyên 100% `AvatarConfig` (`hairStyle`, `hairColor`, `skinTone`, `outfitColor`, kính/nơ), bỏ thay thế bằng emoji nổi, vẽ tay hai lớp chiều sâu đúng giải phẫu chibi (`row 23.5` vai, `row 25.8` nắm tay) và formation đi bộ ngang/chéo cạnh nhau tránh vật cản + chặn kéo xuyên tường.
- **Kết quả kiểm chứng cục bộ mới nhất (Windows Chromium headless + Dev LAN SSE, sau chỉnh sửa code cuối):**
  - `npm run typecheck` (`tsc -b`): **Pass** (exit `0`).
  - `npm run lint`: **Pass** (`0` errors; 3 warnings có sẵn ở `App.tsx` và `ChillFishingModal.tsx`).
  - `npm run build`: **Pass** (`vite build` 2563 modules + VitePWA 26 entries).
  - `node scripts/verify-prod-guard.mjs`: **Pass** (`scanned 3 JS bundle(s) in dist/assets/, zero dev leaks and public assets/precache verified`).
  - `remoteShareTunnel.test.mjs` (**Pass 3/3**) + kiểm thử kết nối HTTPS công khai thật (`olwRemoteShare`: sửa lỗi `cloudflared` 429 chuyển tự động sang `localhost.run` `*.app.lhr.life`, mở bind `0.0.0.0` cho Wi-Fi LAN, nhận diện cookie `Secure` trên HTTPS; đã xác minh live round-trip `200`/`401`/`302`/cookie `Secure HttpOnly` qua tên miền HTTPS thật `trycloudflare.com` & fallback `*.app.lhr.life`).
  - Targeted Vitest trước đó (7 suites / 26 tests) & Full `npm run test` (**817/817 tests pass** across **168/170** files; 2 file-level pre-existing suite load errors ở `donorCabacosRenderDetect.test.ts` và `pydewFarmDonorRender.test.ts`).
  - Kiểm thử Playwright 2 browser context độc lập qua Dev LAN (`Mây` trên `/` & `Nắng` tự vào qua `/?remote-partner=1`): **Pass** — xác minh 403 guard trên `/api/dev-lan/remote-share`, `/` mở mặc định Extended World (`village`) & Pet Care 3D (`meow_happy`), toast mời ôm hiển thị khi dock thu gọn, và xác minh trực quan 3 ảnh P0 (`couple-hug-embrace.png`, `couple-hold-hands-idle.png`, `couple-hold-hands-walk.png` với `coupleHandGap = 0.6px` giữa lúc đang đi cùng nhau và thoát về `none` bình thường).
- **Chưa kiểm chứng / Chờ chủ dự án nghiệm thu:**
  - Chờ chủ dự án **nghiệm thu trực quan** P0 couple animations trước khi mở P1 (`kiss`, `lean_shoulder`, `dance`, `give_flower`).
  - Chờ chủ dự án **nghiệm thu âm thanh thực tế** 8 tiếng mèo ghi âm thật trên loa máy tính & iPhone.
  - Chưa test thực tế trên **iPhone 16 Pro Max Safari / PWA Add to Home Screen** qua 4G khác mạng với đối phương, và chưa test **Supabase Cloud** thật.

## 17. Billiards V4.1 — True 3D Cinematic Camera Correction (`feat/billiards-v4-camera`)

- **Phạm vi & Kiến trúc Camera 3D Nghiêng Điện Ảnh (`cameraController3d.ts`, `Billiards3DGame.tsx`):**
  - **Loại bỏ triệt để góc nhìn phẳng 90° ở chế độ `Adaptive Cinematic`:** Giữ vector `worldUp = [0, 1, 0]` và giải bài toán `fitBoxInObliqueFrustum3D` (chiếu 8 góc hộp bounding theo camera basis thật cho viewport portrait & landscape, trừ biên an toàn HUD) thay cho chế độ sụp tilt về 0 / chuyển sang `Toàn bàn` 90° của V4.
  - **Ngữ cảnh xoay chuyển mượt theo cú đánh (`35°–68°`):**
    - Trước cú đánh giữ nguyên góc cơ thấp (`Góc cơ` ~`20°`); khi bắt đầu đánh nhấc mượt lên góc nghiêng chéo `40°–55°` quanh `shotAimAngle` (`computeObliqueShotAzimuth3D`).
    - Khi đánh vỡ bi / nhiều bi chạy: nới khoảng cách & góc nghiêng lên tới tối đa `68°` (giữ rõ thành gỗ, chân bàn, cả 6 lỗ và bóng đổ 3D). Khi theo bi mục tiêu / đường vào lỗ: theo mượt kiểu máy quay thể thao (`42°–64°`) với smoothing bất đối xứng (mở rộng nhanh, thu hẹp chậm + giữ ổn định `480ms`).
  - **Hậu cú đánh & Phục hồi góc cơ không làm kẹt chế độ:** Kết thúc cú đánh dừng ở **tổng quan 3D nghiêng (`52°–56°`)** (`cameraStage = 'overview'`) mà vẫn giữ nguyên `camMode` người chơi đã chọn (`Góc cơ`), và mượt mà trả về góc cơ khi người chơi chủ động ngắm (`drag` trên bàn, nút `⟲`/`⟳`, phím mũi tên, hoặc kéo thanh lực), đồng thời không ngắt lượt đối phương hay Bot AI. Chế độ `Toàn bàn` (90°) vẫn được giữ riêng cho người chơi chọn `Tổng quan 90°`.
  - **Bảo toàn tuyệt đối:** Không chỉnh sửa `Billiards2DGame.tsx`, `touchControls.ts`, `touchPreferences.ts`, physics (`physicsEngine.ts`, `physics3dEngine.ts`), luật bi-a, multiplayer sync hay nhánh `main`.
- **Kiểm chứng cục bộ sau lần sửa cuối (Windows Chromium headless + Vitest + Dev LAN WS):**
  - `npm run typecheck` (`tsc -b`): **Pass** (exit `0`).
  - `npm run lint`: **Pass** (`0` errors; 1 warning có sẵn tại `ChillFishingModal.tsx`).
  - Targeted Vitest (**8/8 suites, 26/26 tests pass**): gồm `billiardsTouchAndViewport.test.ts` (`11` tests kiểm tra `computePoseElevationDeg`, oblique break/tight/overview/fallback framing & hysteresis), `billiards3dPhysicsDeterminism.test.ts`, `billiardsBotAi.test.ts`, `billiardsLobbyProtocol.test.ts`, `billiardsControlsAndLifecycle.test.tsx`, `billiardsModalLifecycle.test.tsx`, `billiardsLobbyWs.test.ts`, `privateAssetSync.test.ts`.
  - `npm run build` + VitePWA + `node scripts/verify-prod-guard.mjs` + `npm run assets:private:verify`: **Pass** (quét 7 JS bundle, 0 dev leaks).
  - Playwright E2E trên Chromium WebGL (`PLAYWRIGHT_PORT=4183`):
    - `--project=chromium-desktop`: **10/10 pass** (`billiards-multiplayer.spec.ts`, `billiards-v3-modes.spec.ts`, `billiards-v4-camera.spec.ts`).
    - `--project=chromium-iphone-16-pro-max`: **7/7 pass** (`billiards-v3-modes.spec.ts`, `billiards-v4-camera.spec.ts`), `frame-time` đo được `p50 = 16.7ms`, `p95 = 33.4ms`.
  - Kiểm tra trực quan 7 ảnh PNG (`portrait` `430×932` & `landscape` `844×390`) và video `.webm` xác nhận bàn 3D giữ chiều sâu thành gỗ/lỗ bi rõ nét ở mọi pha và không che lấp HUD.
- **Chưa kiểm chứng trên thiết bị thật:** Chưa playtest trên phần cứng **iPhone 16 Pro Max Safari / PWA Add to Home Screen** hoặc Android thật, và chưa kiểm tra qua Supabase Cloud thật.

## 18. Billiards V4.1 — Fair Starting Player Selection & Alternating Rematches (`feat/billiards-v4-camera`)

- **Vấn đề giải quyết:** Trước đây Mây luôn là người khai cuộc mặc định ở mọi ván đấu.
- **Giải pháp tối thiểu:**
  - **Ván đầu tiên:** Lựa chọn ngẫu nhiên xác suất 50/50 giữa Mây (slot 0) và Nắng (slot 1) trong chế độ 2 người cùng máy (`local_pvp`) và online.
  - **Tái đấu (Rematch) & Chơi ván mới:** Luôn luân phiên người khai cuộc (`initiatorSlot === 0 ? 1 : 0`), không phụ thuộc vào người thắng ván trước.
  - **Chế độ Luyện tập (Practice):** Luôn luôn bắt đầu với người chơi (slot 0) và mở sẵn quyền di chuyển bi cái (`canMoveCueBall === true`).
  - **Đồng bộ Online & Điều phối viên có thẩm quyền (Authoritative Coordinator):** Tính ngẫu nhiên ban đầu của ván online được giải quyết duy nhất 1 lần trên server (`devLanBilliardsLobby.mjs`), truyền đồng bộ qua `billiards:lobby_state` cho cả hai client nhận diện chính xác cùng một người khai cuộc; giữ nguyên lựa chọn người khai cuộc rõ ràng của người chơi khi bấm chọn trên giao diện lobby; tái đấu online tự động luân phiên người khai cuộc dựa trên ván trước.
  - **Nhất quán 2D và 3D:** Triển khai giống hệt nhau trên cả `Billiards2DGame.tsx` và `Billiards3DGame.tsx`.
- **Kiểm chứng cục bộ (DoD):**
  - `npm run typecheck` (`tsc -b`): **Pass** (exit `0`).
  - `npm run lint`: **Pass** (`0` errors).
  - Focused Vitest: `tests/unit/billiardsStartingPlayer.test.ts` (7/7 tests pass: xác nhận phân phối 50/50 qua 200 mẫu, practice slot 0, rematch luân phiên, server coordinator sync & explicit selection), `tests/unit/billiardsLobbyProtocol.test.ts`, `tests/unit/billiardsProtocol.test.ts`, `tests/server/billiardsLobbyWs.test.ts`.
  - Playwright E2E: `tests/e2e/billiards-multiplayer.spec.ts` (3/3 pass), `tests/e2e/billiards-v3-modes.spec.ts` (4/4 pass), `tests/e2e/billiards-v4-camera.spec.ts` (3/3 pass).
  - `npm run build` + `verify-prod-guard.mjs` + `assets:private:verify`: **Pass** (0 dev leaks).


