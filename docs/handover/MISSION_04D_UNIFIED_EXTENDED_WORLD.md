# MISSION 04D — Unified Extended World

**Branch:** `cursor/mission-04d-unified-extended-world-36fd`  
**Base:** builds on `integration/night-merge` + Mission 04B-3A (living pet contracts untouched).

## Mục tiêu

Hợp nhất quy mô Extended/Combined Experience Demo với chất lượng **Demo E** trong **game chính**, không nhân bản sandbox 64×64 thưa. Tách rõ:

| Layer | Path | Trách nhiệm |
|-------|------|-------------|
| **World content** | `src/shared/worldContent/` | Landmarks, anchor gameplay, map collision contracts |
| **Main-game integration** | `src/shared/worldIntegration/`, `WorldScene`, `maps.ts`, `QuickNavBar` | Cổng, spawn, nav, DEV preview flag |
| **Sandboxes (legacy)** | `src/game/worldSandbox/`, `src/features/sandboxes/` | Giữ nguyên URL `?world-sandbox=1` / `?experience-demo=1` |

Tham chiếu thiết kế: [WORLD_EXPANSION_DESIGN.md](../world/WORLD_EXPANSION_DESIGN.md) (DeepSeek/Neon sandbox spec).

## Owner trial (Windows / DEV) — slice 1

1. `npm run dev`
2. **`http://localhost:5173/?extended-world=1`**
3. Đăng nhập preset → Vườn → đi **cổng phía Nam** hoặc nút **Đồng cỏ**.
4. Private Demo E: `npm run build:private` trên máy owner.

**Giới hạn slice 1:** map `meadow` 22×18 — picnic, mini-game anchor, farm fence, hồ nhỏ, chợ xem trước. **Chưa** farming/fishing RPC, **chưa** thay home/garden data.

## Living Pet boundary

- `PetLivingMainGameDriver` chỉ **home** — không đổi contract 04B-3A/04B-3B.
- Không sửa PR #10.

## Tiếp theo (không trong slice 1)

- Các map chunk tiếp theo (orchard trail, beach) nối meadow
- Portal economy/minigame khi V0.2 backend sẵn sàng
- Tích hợp farming anchors với `src/shared/farming/` (domain only)

## Tests (đã chạy trên Cloud agent)

- `npm run lint` / `typecheck` / `test` (525 Vitest) / `build` / `verify-prod-guard` — pass
- `tests/unit/extendedWorldMeadow.test.ts`
- `tests/e2e/extended-world-meadow.spec.ts` (2 Chromium projects)

**Lưu ý merge:** Nhánh này xuất phát từ HEAD Mission 04B-3A; nên merge **PR #11** trước, sau đó rebase PR #12 lên `integration/night-merge` nếu cần diff gọn.