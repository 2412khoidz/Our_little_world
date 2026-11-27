# Next 10 Development Missions (`docs/NEXT_MISSIONS.md`)

*Cập nhật: 27/11/2026 | Canonical Baseline: `main` (`e5de4ac`)*
*Mọi mission dưới đây bắt buộc khởi tạo worktree riêng bằng `npm run worktree:new -- --name <slug>` từ `origin/main` và tuân thủ [REGRESSION_CHECKLIST.md](REGRESSION_CHECKLIST.md).*

---

## Tổng quan Điều phối (Parallel vs Sequential)

```text
[M1: Billiards V3 + 3D] (IN PROGRESS in OLW-Billiards-V3) ──┐
[M2: Couple P1 Animations (Kiss & Poses)] ──────────────────┼─▶ Merge vào main (V0.2.x)
[M3: Farming/Pet UX & Discoverability Polish] ──────────────┘         │
                                                                      ▼
                                                     [M4: Home Progression & Shop (V0.2.4)]
                                                              │
              ┌───────────────────────────────────────────────┴────────────────────┐
              ▼                                                                    ▼
[M5: Interactive Cooking UI (V0.3)]                              [M6: Real Shared Life UI (Diary/Calendar/Picnic)]
[M7: S0-5b Cinema Transport Benchmark (Spike)]  (Chạy độc lập song song bất kỳ lúc nào có iPhone 4G)
              │
              ▼ (Chỉ chạy M8 khi M7 PASS Go)
[M8: Cinema Player + Subtitles & Co-op Minigames (V0.4)]
              │
              ▼
[M9: Living Polish, Save Backup/Restore & Mobile Perf (V0.5)] ──▶ [M10: Our Island Expansion (V1.0)]
```

---

## Mission 1 — Hoàn tất Billiards V3 & Tích hợp 3D (`V0.2.x` · `IN PROGRESS`)
- **Phạm vi & Trải nghiệm người chơi:** Hoàn thiện màn hình chọn chế độ (Chơi với Bot AI, Local 2P chung màn hình, Online Ready Check Lobby), khôi phục đầy đủ điều khiển bàn phím desktop gốc (`useBilliardsKeyboard.ts`) và thay renderer 2D bằng cảnh bi-a 3D từ gói nguồn chủ dự án (`our_little_billiards_3d_*`), giữ lazy-load để không làm chậm lúc vào game.
- **Dependencies:** Đang mở trên `C:\Users\admin\Downloads\OLW-Billiards-V3` (`feat/billiards-v3`). Cần reconcile lên `origin/main` (`e5de4ac`) trước khi merge.
- **Branch / Worktree đề xuất:** Tiếp tục `feat/billiards-v3` tại `C:\Users\admin\Downloads\OLW-Billiards-V3`.
- **Hệ thống & File chồng chéo:** `scripts/devLanServerPlugin.mjs`, `scripts/devLanWsHub.mjs`, `src/lib/backend/{devLanRealtimeClient.ts,types.ts}`, `src/shared/netcode/protocol.ts`, `src/features/minigames/billiards/*`.
- **Song song / Tuần tự:** **Tuần tự tích hợp đầu tiên** với các task chạm `devLanServerPlugin.mjs`/`devLanWsHub.mjs`; có thể song song với M2/M3/M7 nếu M2/M3 không sửa `devLanWsHub.mjs`.
- **Focused Acceptance:** `billiardsPhysicsDeterminism.test.ts`, `billiardsProtocol.test.ts`, `billiardsModalLifecycle.test.tsx`, `billiardsDevLan.test.ts`, `billiards-multiplayer.spec.ts`, `multiplayer-ws-hardening.spec.ts`, `verify-prod-guard.mjs` + playtest 3 chế độ (Bot, Local 2P, Online 2 máy).
- **Donor sẵn có:** `C:\Users\admin\Downloads\our_little_billiards_3d_8_ball_pool_edition.html`, `our_little_world_billiards_3d_addon.zip`, `our_little_world_billiards_pack_v2.zip`, Three.js (`^0.186.1` đã có sẵn trong `package.json`).
- **Agent / Model đề xuất:** **Pro / High-reasoning** (kiến trúc 3D WebGL + deterministic physics + WS lobby sync).

## Mission 2 — Couple P1 Natural Animations: Hôn, Tựa Vai, Nhảy Đôi, Tặng Hoa (`V0.2.x`)
- **Phạm vi & Trải nghiệm người chơi:** Mở khóa cấp P1 (`COUPLE_P1_ENABLED = true`) với hoạt ảnh ghép pixel bảo toàn ngoại hình (`AvatarConfig`) cho `kiss` và ít nhất `give_flower` / `dance` / `lean_shoulder`, kèm lời mời đồng ý 2 người mượt mà.
- **Dependencies:** Kế thừa P0 (`hold_hands`, `hug`) đã duyệt trên `main`.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name couple-p1-animations` (`feat/couple-p1-animations`, `OLW-feat-couple-p1-animations`).
- **Hệ thống & File chồng chéo:** `src/shared/couple/{coupleTypes.ts,coupleStateMachine.ts}`, `src/game/avatar/couplePairedPoseTextures.ts`, `src/features/couple/CoupleActionBar.tsx`, `src/game/scenes/WorldScene.ts` (nhánh `renderCouplePosture`).
- **Song song / Tuần tự:** **PARALLEL SAFE** với M1, M3, M7 (chỉ tránh chạm khối billiards/map trong `WorldScene.ts`).
- **Focused Acceptance:** `coupleNaturalAnimations.test.ts`, `avatarPostureVisual.test.ts`, kiểm tra trực quan desktop + `430×932` hai avatar khớp tóc/áo/phụ kiện khi ôm & hôn.
- **Donor sẵn có:** `src/game/avatar/couplePairedPoseTextures.ts`, `docs/COUPLE_ANIMATION_DONORS.md` (`StardewValleyMods` Kissing, `PostureCore/EmbraceCore`, `promenad` FABRIK).
- **Agent / Model đề xuất:** **Standard / Flash + Visual Browser review**.

## Mission 3 — Polish Farming, Fishing, Pet & Discoverability (`V0.2.x`)
- **Phạm vi & Trải nghiệm người chơi:** Tinh chỉnh UX trực quan khi đứng cạnh cây ăn quả (hái/trồng trực tiếp bằng `J`/nút ngữ cảnh thay vì phải mở modal menu), chuồng nuôi, bảng đơn hàng, ao cá; bổ sung unit/E2E regression cho hotfix chạm mèo khi cầm nông cụ & va chạm 3 gốc cây; dọn drift nhỏ ở `ChillFishingModal.tsx:90` ESLint warning.
- **Dependencies:** Không (dựa trực tiếp trên `e5de4ac`).
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name gameplay-discoverability-polish` (`feat/gameplay-discoverability-polish`).
- **Hệ thống & File chồng chéo:** `src/shared/interaction/{mainGameInteractables.ts,interactionResolver.ts}`, `src/features/home/executeMainGameContextAction.ts`, `src/features/donor/ChillFishingModal.tsx`.
- **Song song / Tuần tự:** **PARALLEL SAFE** với M1, M2, M7 (tránh đụng vùng Billiards trong `WorldScene.ts`).
- **Focused Acceptance:** `mobileInteractablesAndHud.test.ts`, `farmVisualScaleParity.test.ts`, `donor-economy-two-client.spec.ts`, `npm run lint` (`0` errors, `0` warnings).
- **Donor sẵn có:** `src/game/world/discoverabilityMarkers.ts`, `src/shared/interaction/interactionResolver.ts`.
- **Agent / Model đề xuất:** **Flash / Standard**.

## Mission 4 — Home Progression: Furniture Shop & House Upgrades (`V0.2.4`)
- **Phạm vi & Trải nghiệm người chơi:** Thêm cửa hàng nội thất 4 phong cách (`Pastel`, `Modern`, `Cottage`, `Rustic`) tiêu coin từ ví nông trại và hệ thống nâng cấp mở rộng nhà (`kitchen`, `bedroom`, `study`, `greenhouse`), **tự động giữ lại toàn bộ đồ đạc cũ và tương thích 100% file save `.dev-lan-state.json`**.
- **Dependencies:** Nên merge sau M1/M3 để tránh xung đột `App.tsx`, `MenuModal.tsx` và `devLanServerPlugin.mjs`.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name home-progression-v024` (`feat/home-progression-v024`).
- **Hệ thống & File chồng chéo:** `src/shared/{catalog.ts,maps.ts,placement.ts}`, `src/shared/decorate/*`, `src/features/home/DecorateDrawer.tsx`, `src/game/scenes/WorldScene.ts`, `scripts/devLanV015Handlers.mjs`.
- **Song song / Tuần tự:** **SEQUENTIAL** trước M5 (vì M5 gắn UI Bếp vào góc bếp mở rộng của M4); chạy cẩn thận file `maps.ts` & `placement.ts`.
- **Focused Acceptance:** Test nâng cấp nhà từ save `.dev-lan-state.json` có sẵn không mất 1 món đồ nào; đặt/xoay nội thất mới 2 máy không đè ô (`placement.test.ts`), kiểm tra mèo 2D `petUnifiedCollision.test.ts`.
- **Donor sẵn có:** `src/shared/decorate/{decorateInteriorPolicy.ts,decoratePlacementLoop.ts}`, `src/donors/cocoworking-947494f`, `src/donors/cozy-space-7b8cb1e`, `LimeZu`/`Sprout` `world-props.png`.
- **Agent / Model đề xuất:** **Pro** (migration save + dynamic `maps.ts` bounds + collision safety).

## Mission 5 — Interactive Cooking & Eating Together (`V0.3`)
- **Phạm vi & Trải nghiệm người chơi:** Xây dựng mini-game nấu ăn tương tác 3 chế độ (Casual / Co-op / Orders có rủi ro cháy khét) nối trực tiếp vào `src/shared/cooking/`, dùng nguyên liệu từ Deep Farming (40 nông sản, trứng/sữa/cá) và cho 2 người ngồi bàn ăn chung.
- **Dependencies:** M4 (`kitchen` anchor/furniture) khuyến nghị xong trước hoặc dùng anchor tạm trong `home` rồi gắn vào góc bếp V0.2.4.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name interactive-cooking-v03` (`feat/interactive-cooking-v03`).
- **Hệ thống & File chồng chéo:** `src/shared/cooking/*`, `src/features/cooking/*` (mới), `src/server/devLanDeepFarmHandlers.ts`, `src/features/home/executeMainGameContextAction.ts`.
- **Song song / Tuần tự:** **PARALLEL SAFE** với M6 và M7 sau khi xong M4.
- **Focused Acceptance:** `cooking.test.ts`, test tiêu thụ nguyên liệu đúng `stateVersion` & `idempotencyKey`, E2E 2 người nấu cùng 1 món và ăn buff nhẹ / thưởng coin.
- **Donor sẵn có:** `src/shared/cooking/{cookingMachine.ts,recipes.ts}` (đã viết sẵn), icon món ăn trong `public/assets/farming/items-32.png` (Ghostpixxells CC0 32×32).
- **Agent / Model đề xuất:** **Standard / Pro**.

## Mission 6 — Persistent Shared Life: Diary, Wishlist, Date Calendar & Picnic (`V0.3`)
- **Phạm vi & Trải nghiệm người chơi:** Thay thế `V03PrototypesModal.tsx` (dữ liệu giả) bằng hệ thống **Nhật ký chung/riêng**, **Wishlist muốn đi**, **Lịch hẹn & Đếm ngược ngày gặp**, và hoạt động **Picnic trên vườn/bãi biển** có lưu bền trong Dev LAN DB (`sharedLifeTypes.ts`), cùng tinh chỉnh Pomodoro + Mailbox thiệp kỷ niệm.
- **Dependencies:** Độc lập hoàn toàn (có thể chạy song song M4/M5 nếu tránh đụng `MenuModal.tsx` quá nhiều).
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name shared-life-v03` (`feat/shared-life-v03`).
- **Hệ thống & File chồng chéo:** `src/shared/sharedLife/sharedLifeTypes.ts`, `src/features/devPrototypes/V03PrototypesModal.tsx` → `src/features/sharedLife/*`, `scripts/devLanSharedLifeHandlers.mjs`, `src/features/mailbox/MailboxModal.tsx`, `src/features/study/PomodoroPanel.tsx`.
- **Song song / Tuần tự:** **PARALLEL SAFE** với M5 và M7.
- **Focused Acceptance:** `v03SharedLife.test.ts`, kiểm tra ẩn bài viết riêng tư (`visibility: 'private'`) với đối phương, lưu/khôi phục qua reload 2 client, `verify-prod-guard.mjs`.
- **Donor sẵn có:** `src/shared/sharedLife/sharedLifeTypes.ts`, `scripts/devLanSharedLifeHandlers.mjs`, `src/features/couple/ScrapbookAlbumModal.tsx` (`react-pageflip`).
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
- **Dependencies:** Sau M4–M8.
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name v05-quality-living-world` (`feat/v05-quality-living-world`).
- **Hệ thống & File chồng chéo:** `src/assets/maps/shop*.json`, `src/game/world/{WorldLightingOverlay,tiledWorldNpcs}.ts`, `src/game/audio/gameAudioManager.ts`, `scripts/devLanServerPlugin.mjs`.
- **Song song / Tuần tự:** **SEQUENTIAL** (giai đoạn hội tụ trước V1.0).
- **Focused Acceptance:** Test export → reset → import khôi phục nguyên 100% nhà/đồ/nông trại/mèo; memory/DOM audit không rò rỉ sau 30 phút idle/chuyển map; full Chromium E2E & `verify-prod-guard.mjs`.
- **Donor sẵn có:** `WorldLightingOverlay.ts`, `npcDialogueRegistry.ts`, `Kiln/Sprout/Cabacos` tilesets trong repo.
- **Agent / Model đề xuất:** **Pro**.

## Mission 10 — Our Island Expansion (`V1.0`)
- **Phạm vi & Trải nghiệm người chơi:** Mở rộng bản đồ làng, thêm tiệm & nội thất mới, mở hoạt động bãi biển (thu vỏ sò/lửa trại) & rừng sâu, sự kiện theo mùa & ngày kỷ niệm chung của hai người.
- **Dependencies:** M9 (`V0.5` ổn định sau playtest thực tế).
- **Branch / Worktree đề xuất:** `npm run worktree:new -- --name v10-our-island` (`feat/v10-our-island`).
- **Hệ thống & File chồng chéo:** `src/shared/maps.ts`, `public/assets/maps/*`, `src/assets/maps/*`, `src/shared/npc/*`, `src/shared/worldContent/*`.
- **Song song / Tuần tự:** **SEQUENTIAL** cuối lộ trình hiện tại (hoặc chia nhiều mission con theo từng khu vực khi tới V1.0).
- **Focused Acceptance:** `worldReconstructionGraph.test.ts` pass 100% reachability & collision không tường tàng hình, mèo & 2 người chơi xuyên suốt mọi khu mới.
- **Donor sẵn có:** `Tuxemon`, `Hollowmere`, `Cabacos`, `Kaetram` references đã ghi nhận trong `docs/UPSTREAM_REUSE.md`.
- **Agent / Model đề xuất:** **Pro**.
