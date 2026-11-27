# Tiêu chí Nghiệm thu (`MILESTONE_ACCEPTANCE` — V3 Reconciled)

*Cập nhật: 27/11/2026 | Quy tắc trung thực: Mọi cổng chạy trên Dev LAN / Chromium Desktop tách biệt hoàn toàn với nghiệm thu iPhone Safari thật và Supabase Cloud thật. Hạ tầng Cloud (`Tier C`) đang **`DEFERRED`** và **không chặn** phát triển gameplay local (`Tier A` & `Tier B`).*

---

## Tier A — Kiến trúc Vận hành Hiện tại (Windows Dev LAN + Cloudflare Quick Tunnel · `v0.2.5+`)

| # | Cổng kiểm chứng | Trạng thái | Bằng chứng & Điều kiện |
|---|---|---|---|
| A1 | Canonical workspace & clean Git history (`main` @ `e5de4ac`, `v0.2.5`) | `OWNER APPROVED` | Lịch sử `main` sạch bí mật/state/private audio; `assets:private:verify` pass 15 file |
| A2 | Thế giới `16×16` 6 khu vực, Avatar V2, Audio riêng tư, Nuvora Inventory | `OWNER APPROVED` | Owner playtest duyệt RC1 + kiểm tra va chạm 3 gốc cây (`5de7317`) |
| A3 | Multiplayer `NET.1.1` (`WSS`, `/__share/<token>` auto-join `Nắng`, khóa Host `403`) | `OWNER APPROVED` *(9/11 NET.1.1)* / `UNVERIFIED` *(tổ hợp `v0.2.5` iPhone Safari)* | Playwright WS 2-client pass; cần chạy lại 1 lượt iPhone Safari + Wi-Fi↔5G trên `main` mới nhất |
| A4 | Deep Farming A–G + Order Board + Fishing (`fish_minnow`) + Orchard | `OWNER APPROVED` | Chromium E2E + Unit + owner playtest + hotfix collision 3 cây (`5de7317`) |
| A5 | Living Pet (`Quýt` 2D + `vuena-cat.glb` 3D) & ưu tiên ô ruộng | `OWNER APPROVED` | Hotfix chặn tap nhầm mở Pet Care 3D (`5de7317`) đã được chủ dự án duyệt; `OLW_ACCEPTANCE_LONG=1` còn `UNVERIFIED` |
| A6 | Billiards V2 (`BilliardsModal`, NET.1 WS sync) | `OWNER APPROVED` | Đã gộp `v0.2.5` + 3/3 E2E Chromium; bản nâng cấp Billiards V3 + 3D (`feat/billiards-v3`) đang `IN PROGRESS` |
| A7 | Production Build & Guard (`dist/` + `sw.js`) | `OWNER APPROVED` | `npm run build && node scripts/verify-prod-guard.mjs` exit 0, zero dev/private leaks |
| A8 | Kiểm kê Tài nguyên Donor `M3a` (`docs/art/ASSET_*`) | `OWNER APPROVED` | Kiểm kê `28` pack (`8,079` PNG duy nhất), 267 SKU & backlog tái sử dụng (`chore/m3a-asset-library-audit` @ `3134f1a` đã gộp `main`) |
| A9 | `M0` Mobile-First HUD Phase 1 (`feat/mobile-first-hud` @ `cfd3099`) | `OWNER APPROVED` *(Phase 1)* | HUD 9-slice Kiln, joystick Pointer Events, `--olw-vvh` & single `fullscreenOwner` đã hợp nhất `main` (cải tiến menu phụ trợ vẫn còn mở) |
| A10 | `M1` Billiards V4.1 & Fair Start (`feat/billiards-v4-camera` @ `fecb746`) | `OWNER APPROVED` *(Integrated RC2)* | 2D & 3D, camera nghiêng V4.1, độ nhạy cảm ứng, raycast chọn bi, lobby ready check & chọn người khai cuộc công bằng; nối `useFocusMode` → `GlobalViewportContext` |
| A11 | `M3b–M3c.2` Farming Art, 32 SKUs & Livestock (`feat/farming-art-recovery` @ `0018d10`) | `OWNER APPROVED` *(Integrated RC2)* | Sửa `32` SKU sai/trùng; đóng gói `livestock-ranch.{png,json}` 7 loài, vịt bơi, `sheep_brown_baby` scale `1.00`, chân dung UI & ambient animals (không đụng Quýt) |

---

## Tier B — Tiêu chí Thoát cho Các Milestone Tiếp theo (`V0.2.x → V1.0`)

- **`V0.2.x` (Gameplay Foundation Polish):**
  - **Mobile-First HUD (`M0` phần còn lại):** Hoàn thiện cải tiến menu phụ trợ (auxiliary mobile menu improvements) ở đợt sau; Phase 1 HUD & Global Fullscreen đã nghiệm thu trên `main`.
  - **Couple P1 (`M2`):** Hình ảnh cặp đôi hôn/tựa vai/tặng hoa bảo toàn 100% `AvatarConfig`, không giật vị trí hay trùng tay, owner duyệt hình ảnh trước khi bật `COUPLE_P1_ENABLED = true`.
  - **Machines, VFX & Fishing Art (`M3d` & `M3e`):** Nâng cấp máy chế biến + VFX `FarmRanchLife`, đồ họa câu cá + dọn warning `ChillFishingModal.tsx:90`; `npm run lint` đạt 0 errors.
- **`V0.2.4` (Home Progression):**
  - Shop nội thất `Pastel / Modern / Cottage / Rustic` tiêu coin đúng server ledger; mở rộng phòng không làm mất bất kỳ món đồ hay vị trí lưu cũ trong `.dev-lan-state.json`.
- **`V0.3` (Shared Life):**
  - **Interactive Cooking:** Nối thật vào `src/shared/cooking/` + nguyên liệu nông trại, có cháy khét thật & ăn chung.
  - **Nhật ký / Wishlist / Lịch hẹn / Album / Pomodoro / Mailbox:** Lưu bền trong Dev LAN DB (thay thế hoàn toàn `V03PrototypesModal` giả), bài viết riêng tư (`visibility: 'private'`) ẩn đúng với đối phương.
- **`V0.4` (Cinema & Shared Entertainment):**
  - **`S0-5b` PASS trên iPhone 4G thật:** Không cài VPN/app ngoài phía người thương, xem mượt `>= 60 phút` Windows → iPhone Safari, drift thấp, reconnect Wi-Fi ↔ 4G, media ngoài `sw.js` precache và chi phí `0₫`.
  - **Mini-games (`Caro`, `Othello`, `Battleship`, `Memory`):** Chơi realtime 2 máy qua WS `minigame_event`, ẩn bài bí mật (`privacy.ts`), không xếp hạng hay mất tài sản.
- **`V0.5` (Quality & Living World):**
  - Đồng bộ mỹ thuật các shop `shop_*`, hành vi NPC sâu hơn, sao lưu & khôi phục `.dev-lan-state.json` 1 chạm, test ổn định 30–60p trên iPhone Safari không WebGL context loss.
- **`V1.0` (Our Island):**
  - Bản đồ mở rộng làng/biển/rừng xuyên suốt `worldReconstructionGraph`, sự kiện theo mùa & hoạt động đảo đôi ở chi phí `0₫`.

---

## Tier C — Hạ tầng Cloud / Production 24/7 (`DEFERRED` — Không chặn Local Dev)

Giữ nguyên 18 cổng kiểm chứng V0.1 lịch sử (áp migration lên Supabase Cloud thật, RLS verify với 3 UUID thật, Auth theo `PD-08`, deploy Cloudflare Pages HTTPS `PD-02`, kiểm tra bản quyền phân phối public cho các asset private) ở trạng thái **`DEFERRED / UNVERIFIED`**. Chỉ kích hoạt Tier C khi chủ dự án quyết định đưa bản public/cloud lên vận hành 24/7.
