# V0.2 — Integration playbook (Project Agent)

**Canonical roadmap/plan:** [V02_ROADMAP.md](V02_ROADMAP.md) · [V02_PRODUCT_ENGINEERING_PLAN.md](V02_PRODUCT_ENGINEERING_PLAN.md)  
**Contracts:** [handover/PET_CARE_HOTBAR_CONTRACT.md](handover/PET_CARE_HOTBAR_CONTRACT.md) (Composer 1 + 2 shared hotbar)

### Locked shared contracts (2026-11-25)

| Contract | Source PR / SHA | Consumers |
|----------|-----------------|-----------|
| Farm plots `1.0.0`→`1.0.1` | [#12](https://github.com/2412khoidz/Our_little_world/pull/12) — 184 anchors locked; **1.0.1** = shop portal tile (38,13) only | **#14** re-pull `farmPlotContract.v1.json` after #12 bump; bind `farm_main_{index}` |
| Hand-feed RPC | [#10](https://github.com/2412khoidz/Our_little_world/pull/10) + [#13](https://github.com/2412khoidz/Our_little_world/pull/13) — `pet_consume_hand_food` migration `20261125001200` | On integrate: **one** migration file; drop duplicate hunk if both PRs carry it |

## PR stack (do not auto-merge `main`)

| Order | PR | Owner | Blocks |
|------|-----|--------|--------|
| 1 | [#10](https://github.com/2412khoidz/Our_little_world/pull/10) | Foundation | Supabase pet/inventory authority |
| 2 | [#11](https://github.com/2412khoidz/Our_little_world/pull/11) | Composer 2 | Living overworld (DEV flag production-off) |
| 3 | [#12](https://github.com/2412khoidz/Our_little_world/pull/12) | Composer 3 | World/farm plot anchors |
| 4 | [#14](https://github.com/2412khoidz/Our_little_world/pull/14) | Composer 1 | Farming RPC on those anchors |
| 5 | [#13](https://github.com/2412khoidz/Our_little_world/pull/13) | Composer 2 | Pet care scene + hand-feed (care bowl/brush/water = scene-only until #10) |

Recommended integration branch (when owner approves): `integration/playtest-all` — rebase stack per [project-context](/cursor/stores/self/docs/project-context.md).

## Owner vertical slice (15–20 min, one dev server)

1. `npm run dev` · `/?living-pet=1` (optional overworld brain until #10 wired).
2. **Home:** seed couple → adopt cat → **Pet care** (J): vuốt, gọi, len, cá (authority debit on Dev LAN).
3. **Garden:** portal → làng/farm (#12) → shop mua hạt (#14) → cuốc/gieo/tưới/thu hoạch/shipping.
4. Reload tab · second browser profile → cùng world: pet vitals + inventory sync.
5. Capture: `node scripts/capture-pet-care-session.mjs` + farming script from #14 when ready.

**Parallel streams (2026-11-25):** #12 `WORLD_EXPLORATION_CAPTURE_CHECKLIST.md` + farm **1.0.1** shop portal (38,13); #14 `npm run economy:sim` green @ `ed6640f` (12-plot sim — 184-grid pacing separate).

## Conflict owners (single editor per merge)

| Surface | Owner agent |
|---------|-------------|
| `WorldScene.ts` tilemap/camera | Composer 3 only |
| `PetCareScene` / `src/game/pet/care/*` | Composer 2 only |
| Farming sim / wallet RPC | Composer 1 only |
| `App.tsx`, `eventBus`, backend types, hotbar | Project Agent gates contract PR comments |

## Regression gate

`npm run lint && npm run typecheck && npm run test && npm run build && node scripts/verify-prod-guard.mjs`  
E2E: pet-care + farming + movement specs on integration branch.