# PR #10 — Integration readiness & Composer 2 authority contract

**Branch:** `cursor/mission-04b2-pet-authority-d77e` (merged target: `integration/night-merge`)  
**Head:** `45d027a` (+ correctness `20261125150000`)

## Ship status

| Area | Ready for 04B-3 wiring |
| --- | --- |
| RPC + Dev LAN parity | Yes (`pet_living_*`, food offers) |
| `WorldBackend.petLiving` | Yes |
| Movement runtime (04B-1) | Yes (client sim only) |
| `App.tsx` / `WorldScene` consumption | **No** — deliberate scope hold |

## Dynamic furniture collision (audit)

| Layer | Behavior | Limit |
| --- | --- | --- |
| SQL `_pet_living_build_movement_plan` | BFS on **starter_static** home walls + `pet_nav_anchors` | **No** per-world `layout_placements` footprint. Unreachable → `TARGET_UNREACHABLE` (fail-closed). |
| TS `petAuthorityMovementPlan.ts` | Same static grid + `furnitureCollisionMode: starter_static` | Garden / 04D maps → `MAP_NOT_SUPPORTED` via `petAuthorityNavigationContract.ts`. |
| Stale recovery | `worlds` row lock → `_pet_living_expire_due_offers` → `_pet_living_recover_stale_actions` | No layout version invalidation yet — 04B-3 should bump `livingVersion` when decorate changes block tiles **if** dynamic collision enabled. |

**Composer 2 must not** send `standTileX/Y` as consumption proof. Server sets `authoritative_tile_*` on `movement_ready` when `now >= arrive_at_ms`.

## Composer 2 — client contract

### `beginLivingAction`

- Read `movementPlan`: `originTileX/Y`, `destTileX/Y`, `travelMs`, `performMs`, `mapId`, `planHash`.
- Run 04B-1 executor for **presentation** only; proposals are **hints**.

### `submitLivingProposal`

| Proposal | Client sends | Server checks |
| --- | --- | --- |
| `movement_ready` | instanceId, idempotencyKey | Server clock ≥ `arriveAtMs`; ignores `p_proof` for auth. |
| `animation_finished` | instanceId, idempotencyKey | `movementVerified`, clock ≥ `performUntilMs`, authoritative tiles = dest. |

### Food offers

- Create/reserve inventory on server.
- Caregiver **`cancel` only** via `respond`; brain uses `evaluateFoodOffer`.
- Expiry returns `{ offerExpired: true, snapshot }` — no hard crash.

### Hotbar / held item (shared with Mission 05)

File: `src/shared/interaction/inventoryHotbarAdapter.ts` — extend `MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST` with farming SKUs; use `HotbarStackKey` (`ownerScope + sku + quality`). Mission 05 adds `tool_hoe`, `tool_watering_can`, `seed_*` on Composer 2 presentation pass.

### Integration checklist (04B-3)

1. Subscribe `petLiving.getSnapshot` after world load.
2. On brain intent to eat/drink: `beginLivingAction` → wait client anim → `movement_ready` / `animation_finished` on **server timing**, not client tile proof.
3. Wire `evaluateFoodOffer` when brain picks pending offer.
4. On `ACTION_STALE`, refresh snapshot and re-begin.
5. Do **not** read client vitals for consumption.

## Regression evidence

`supabase/tests/pet_living_authority.sql`, Vitest nav contract, Dev LAN pet living routes.