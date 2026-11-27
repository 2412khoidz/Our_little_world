# V0.2 Roadmap — Remaining Foundation Work (`V0.2.x` & `V0.2.4`)

*Cập nhật: 27/11/2026 | Kế thừa & thay thế V0.2 P0 draft (`25/11/2026`). Toàn bộ P0 Deep Farming A–G, Economy, Living Pet V2, NET.1.1 & Billiards V2 đã hợp nhất vào `main` (`v0.2.5`). Tài liệu này chỉ theo dõi **phần V0.2 còn lại**.*

---

## 1. Hạng mục V0.2 đã hoàn tất (`OWNER APPROVED` tại `v0.2.5` + `e5de4ac`)

- Thế giới `16×16` hợp nhất (6 khu vực + 4 shop), Avatar Cozy Human V2, 5 track nhạc nền riêng tư, Nuvora Inventory & `CatalogSkuIcon`.
- Multiplayer `NET.1.1` WebSocket + `/__share/<token>` auto-join `Nắng` + diagnostics & khóa quyền Host.
- Deep Farming Checkpoints A–G (40 crops, 20 flowers, 12 orchard trees, 7 livestock, 84 recipes, 8 workshops, Order Board, Chill/Tension fishing, atlases `public/assets/farming/*`).
- Mèo 2D `Quýt` + 3D Pet Care V2 (`vuena-cat.glb`), hotfix ưu tiên ô ruộng trước hitbox mèo & hotfix va chạm 3 cây ăn quả.
- Billiards V2 multiplayer (`minigame_event`) & Couple P0 (`hold_hands`, `hug`, posture anchors).

---

## 2. Việc còn lại của `V0.2.x` (Complete the Gameplay Foundation)

### 2.0 `M0` — Mobile-First HUD, Touch Controls & Global Fullscreen — **`Phase 1 OWNER APPROVED` (`main`)**
- **Đã hợp nhất & duyệt (Phase 1 từ `feat/mobile-first-hud` @ `cfd3099`):** HUD gỗ 9-slice `Kiln Harvest`, joystick Pointer Events mượt (`src/shared/input/virtualJoystickController.ts`), chính sách viewport `--olw-vvh` (`src/shared/viewport/viewportPolicy.ts`), và `GlobalViewportContext` quản lý single `fullscreenOwner` ([VIEWPORT_FULLSCREEN_CONTRACT.md](handovers/VIEWPORT_FULLSCREEN_CONTRACT.md)) sẵn sàng cho Billiards V4.1.
- **Chưa hoàn thành (`PLANNED`):** Tối ưu menu phụ trợ (auxiliary menu optimization) chưa hoàn tất và chưa được đánh dấu xong.

### 2.1 `M1` — Billiards V3 & 3D Transplant — **`IN PROGRESS`** (`OLW-Billiards-V3` / `feat/billiards-v3`)
- **Đã có trên worktree `feat/billiards-v3` (chưa merge / chưa owner verify):**
  - Module mới: `botAi.ts`, `lobbyProtocol.ts`, `physics3dEngine.ts`, `BilliardsEntryMenu.tsx`, `BilliardsOnlineLobby.tsx`, `billiards3d.css`, `localStats.ts`, `useBilliardsKeyboard.ts`, `scripts/devLanBilliardsLobby.mjs`.
  - Mở rộng: `physicsEngine.ts`, `protocol.ts`, `types.ts`, `netcode/protocol.ts`, `devLanServerPlugin.mjs`, `devLanWsHub.mjs`.
- **Việc cần hoàn tất trước khi tích hợp:**
  1. Reconcile nhánh `feat/billiards-v3` (tách từ `6c1bc66`) lên `origin/main` mới nhất (`e5de4ac`).
  2. Hoàn chỉnh tích hợp cảnh 3D bi-a từ nguồn chủ dự án cung cấp (`C:\Users\admin\Downloads\our_little_billiards_3d_*`), giữ lazy-load (`Three.js` không làm phình initial chunk), giải phóng WebGL context gọn khi đóng.
  3. Kiểm tra đủ 3 chế độ: Chơi 1 người với Bot, Local 2P chung máy, Online Ready Lobby 2 máy (`Mây` ↔ `Nắng`), cùng điều khiển bàn phím desktop gốc (`useBilliardsKeyboard.ts`) & chạm mobile.
  4. Kiểm chứng hồi quy đối với file dùng chung (`devLanWsHub.mjs`, `devLanServerPlugin.mjs`, `netcode/protocol.ts`) + owner playtest phê duyệt.

### 2.2 Couple Natural Animations P1 (`kiss`, `lean_shoulder`, `dance`, `give_flower`) — **`PLANNED`**
- **Hiện trạng:** Schema & protocol đã có sẵn trong `src/shared/couple/coupleTypes.ts` (`COUPLE_P1_ENABLED = false`), `CoupleActionBar.tsx` đã có label.
- **Cần làm:** Tạo cặp frame pixel-paired `couplePairedPoseTextures.ts` giữ nguyên `AvatarConfig` của 2 người chơi cho `kiss` (ưu tiên) và các dáng P1 còn lại, âm thanh/emote nhẹ nhàng, bật `COUPLE_P1_ENABLED = true` sau khi chủ dự án duyệt hình ảnh.

### 2.3 `M3` — Farming, Fishing, Pet Polish + Icon Fixes & Livestock Transplant — **`PLANNED`**
- Sửa nhóm SKU sai nghĩa / trùng ảnh trong `scripts/pack-farming-atlases.py` và transplant spritesheet thú nuôi (`FarmRanchLife/04_Ranch_Animals`) + VFX thay hình học Canvas thủ công theo kế hoạch đã duyệt ở **`M3a`** ([ASSET_REUSE_BACKLOG.md](art/ASSET_REUSE_BACKLOG.md)).
- Rà soát độ rõ của nút ngữ cảnh mobile / `J` gần các điểm: cây ăn quả (trồng/thu hoạch), chuồng nuôi, bảng đơn hàng, xưởng chế biến & bàn câu cá; bổ sung E2E/unit regression cho tương tác `Quýt` + ô ruộng và cây ăn quả.

---

## 3. `V0.2.4` — Home Progression & Interior Expansion — **`PLANNED`**

- **Mục tiêu:** Tạo động lực chi tiêu coin từ nông trại (`walletCoins`) để mua nội thất trang trí và nâng cấp không gian ngôi nhà chung.
- **Phạm vi:**
  1. **Shop nội thất 4 phong cách** (`Pastel`, `Modern`, `Cottage`, `Rustic`) tái sử dụng catalog + `DecorateDrawer.tsx` + `CatalogPropsIcon`.
  2. **Nâng cấp/mở rộng nhà theo bậc:** phòng ngủ, góc bếp (`V0.3` sẽ đặt cooking UI tại đây), phòng học, nhà kính & hiên vườn.
  3. **Bảo toàn dữ liệu & nội thất cũ:** Mọi nâng cấp map/bounds phải di chuyển hoặc thu hồi an toàn nội thất đang đặt về kho, không bao giờ làm hỏng `.dev-lan-state.json` đang chơi.
- **Ràng buộc an toàn:** Tiện ích cơ bản (giường, bàn học, chăm mèo) vẫn dùng được với `0` coin; không ép cày.

---

## 4. Ghi chú Lịch sử V0.2 P0 (PR #10–#14 — `25/11/2026`)
Các đầu việc V0.2 P0 trong bản `ROADMAP_v2` cũ đã được hợp nhất thành công vào `v0.2.5` qua nhánh phục hồi `integration/olw-canonical-rc1`; phần Supabase Cloud RPC parity (`OLW-mission-02`) được tách riêng thành hạ tầng `DEFERRED` để không làm chậm nhịp phát triển gameplay local.
