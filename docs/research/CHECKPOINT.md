# Master Research & Design Checkpoint

*Cập nhật lần cuối: 25/11/2026 · Checkpoint phục vụ resume nếu session bị gián đoạn.*

## 1. Bối cảnh & Trạng thái Hiện tại (Phase 0 Baseline)

| Hạng mục | Thực tế đã xác minh | Nguồn bằng chứng |
|---|---|---|
| **Đã triển khai (V0.1 + Spike 0)** | Shell React 19 + TS 5.9 + Vite 8 + VitePWA; Phaser 4.2.1 (`WorldScene`, BFS pathfinding, starter CC0 sprites + avatar canvas); `WorldBackend` (`SupabaseBackend`, `DevLanBackend`, `LocalPreviewBackend`, `UnconfiguredBackend`); 3 SQL migrations + `seed.sql` + `tests/rls_and_pairing.sql`; `SpikeLabModal` (`cinemaSync.ts`); Dev-only `?art-demo=A..E` showcases & `DemoEScene.ts` | `src/`, `supabase/`, `docs/ARCHITECTURE.md`, `docs/PROGRESS.md` |
| **Đã kiểm thử tự động** | `eslint .` (0 err/warn); `tsc --noEmit` (exit 0); Vitest 6 files / 24 tests pass; Vite + VitePWA build + `verify-prod-guard.mjs` (0 dev leaks); Playwright E2E 8/8 pass (`chromium-desktop` + `chromium-iphone-16-pro-max` `430×932` qua Dev LAN SSE) | `docs/PROGRESS.md`, `tests/` |
| **Đã kiểm thử trên thiết bị thật** | Người dùng đã thử Spike 0 video sync PoC giữa Windows và Redmi K70E qua cùng Wi-Fi (quan sát đồng bộ gần realtime) | Yêu cầu Master Research |
| **Chưa nghiệm thu (Pending Manual / Future)** | Tích hợp artwork Demo E vào game V0.1; Supabase Cloud thật (3 migrations, SQL test, 2 mạng khác nhau); iPhone 16 Pro Max Safari thật + Add to Home Screen + lock/unlock + Wi-Fi↔4G; Cinema WAN/bitrate cao/iPhone Safari không cài VPN | `docs/PROGRESS.md`, `docs/TEST_PLAN.md` |
| **Đã duyệt bởi người dùng** | Định hướng mỹ thuật **Demo E — Unified Cozy World** + avatar `Modern Interiors Free`; ràng buộc ngân sách **`≈ 0₫`**; Zero-Config UX (1 link HTTPS, không VPN cho người xem); không tạo Demo F; chưa sửa game chính ở milestone research | Yêu cầu 25/11/2026 |
| **Đề xuất chờ duyệt** | Xem `## Pending Decisions` trong [DECISIONS.md](../DECISIONS.md) | `docs/DECISIONS.md` |
| **Rủi ro tồn đọng** | iOS Safari WebSocket backgrounding & WebGL context loss; Supabase Free project pause & giới hạn egress/Realtime; parity `DevLanBackend ↔ SupabaseBackend`; Phaser chunk (~1.39 MB raw / 364 kB gzip); Cinema HTTPS VPN-less + codec/upload; animation thiếu ở bản free | `docs/ARCHITECTURE.md`, `docs/art/ART_DIRECTION.md` |

- **Hash manifest mã nguồn gốc (ngoài docs):** `scratch/code-manifest-before.txt` trong artifact local của phiên Antigravity (774 files). Cam kết giữ nguyên 100% hash này khi kết thúc research milestone.

---

## 2. Checklist Deliverable Toàn bộ Chiến dịch

### Phase 0 — Context Recovery & Plan
- [x] Khôi phục context toàn repo, docs, src, migrations, tests
- [x] Tạo hash manifest mã nguồn trước khi chỉnh docs (`MANIFEST_COUNT=774`)
- [x] Tạo `docs/research/CHECKPOINT.md`
- [x] Cập nhật `ADR-008`, `ADR-009` và `Pending Decisions` vào `docs/DECISIONS.md`

### Phase 1 — Open Source Research & Free-Tier Audit
- [x] Clone nông 18 repository tham khảo ra ngoài repo (`olw-refs/`) + đọc LICENSE/SHA thực tế
- [x] Sàng lọc nhanh 18 repo & phân tích sâu 6 repo P0 + các module giá trị cao
- [x] Nghiên cứu tách bạch Cinema Transport vs Sync & Free-tier (Supabase, Static Host, TURN/Tunnel) có URL + ngày xác minh
- [x] Xuất `docs/research/OPEN_SOURCE_RESEARCH.md`
- [x] Xuất `docs/research/REUSE_MATRIX.md`
- [x] Xuất `docs/research/INTEGRATION_PLAN.md`
- [x] Xuất `docs/research/ARCHITECTURE_REVIEW.md`
- [x] **Plan Review Gate** sau Phase 1 (`enter_plan_mode`)

### Phase 2 — Game Design & Progression
- [x] `docs/gameplay/GAME_DESIGN.md`
- [x] `docs/gameplay/WORLD_PROGRESSION.md`
- [x] `docs/gameplay/MINIGAME_DESIGN.md`
- [x] `docs/gameplay/NPC_DESIGN.md`
- [x] `docs/gameplay/COUPLE_INTERACTIONS.md`

### Phase 3 — Cooperative Economy
- [x] Nghiên cứu 3 nguồn `marxists.org` (Capital I ch.1, ch.3; Gotha Critique ch.1)
- [x] `docs/economy/ECONOMY_DESIGN.md`
- [x] `docs/economy/ECONOMY_MODEL.md`
- [x] `docs/economy/PRODUCTION_CHAINS.md`
- [x] `docs/economy/MARKET_AND_NPC.md`
- [x] `docs/economy/BALANCING_PLAN.md` (kèm kiểm tra số học PoC ngoài repo)
- [x] `docs/economy/ECONOMY_SIMULATOR_SPEC.md`

### Phase 4 — Living Pet System
- [x] Kiểm kê kích thước/frame thực tế spritesheet `Free Pets Pack` trong `asset-candidates/`
- [x] `docs/pet/PET_DESIGN.md`
- [x] `docs/pet/PET_AI_ARCHITECTURE.md`
- [x] `docs/pet/PET_ANIMATION_MATRIX.md`
- [x] `docs/pet/PET_SIMULATION_SPEC.md`
- [x] `docs/pet/PET_TEST_PLAN.md`

### Phase 5 — Future AI Vision
- [x] `docs/ai/FUTURE_AI_VISION.md`

### Phase 6 — Dev Tools, Roadmap & DeepSeek Handover
- [ ] `docs/DEV_TOOLS.md`
- [ ] `docs/MASTER_ROADMAP.md` (và thu gọn `docs/ROADMAP.md` trỏ sang)
- [ ] `docs/MILESTONE_ACCEPTANCE.md`
- [ ] `docs/IMPLEMENTATION_BACKLOG.md`
- [ ] `docs/AGENT_HANDOVER.md`
- [ ] `docs/ARCHITECTURE_OVERVIEW.md`
- [ ] Cập nhật `AGENTS.md`, `docs/PROGRESS.md`, `CHANGELOG.md`, `docs/README.md`, rà mâu thuẫn `ASSETS.md`/`PRODUCT_SPEC.md`/`TEST_PLAN.md`
- [ ] `docs/research/MASTER_RESEARCH_SUMMARY.md`

### Final Verification
- [ ] Kiểm tra nhất quán cross-doc & liên kết nội bộ
- [ ] Đối chiếu hash manifest `code-manifest-before` vs `after` (0 thay đổi mã nguồn)
- [ ] Chạy `npm run lint`, `npm run typecheck`, `git status --short`
