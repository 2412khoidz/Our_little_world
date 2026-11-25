# Mission 04B-2 — Server-Authoritative Living Pet

**Branch:** `cursor/mission-04b2-pet-authority-d77e` → PR #10  
**Base:** `integration/night-merge` @ `6a58fa1` (PR #8 movement merged)  
**Out of scope:** Production `App.tsx` / `WorldScene` wiring (04B-3); Supabase Cloud apply.

## Architecture

Lazy RPC execution on PostgreSQL + Dev LAN parity. **No** always-on worker, **no** LLM on hot path, **no** trust in client vitals, durations, bowl debits, or arbitrary affordances.

| Layer | Role |
| --- | --- |
| **Pet Brain (04A)** | Advisory intents. |
| **Movement runtime (04B-1, merged)** | Client simulation + proposals; mirrors anchors/path math in TS. |
| **`petAuthorityMovementPlan.ts` + SQL BFS** | Server-owned plan at `begin_action`: target binding, path steps, dest stand tile, travel/perform ms from 04B-1 animation map. |
| **PostgreSQL RPC** | Membership, idempotency, proof validation, consumption, inventory holds. |

### Trusted consumption (fail-closed)

1. `begin_action`: `is_world_member`, action↔affordance binding (`food_bowl` / `water_bowl` only), home map, **BFS reachability** from `pets.anchor_tile_*`, server `arrive_at_ms` / `perform_until_ms`.
2. `movement_ready`: requires `p_proof.standTile{X,Y}` matching server `dest_tile_*` + server time ≥ `arrive_at_ms`.
3. `animation_finished`: prior movement verified + server time ≥ `perform_until_ms` + no double consume.
4. NULL/empty `p_proposal` → `VALIDATION_ERROR` (never completion branch).

### Food offers

- **Create:** reserves 1× stack (`shared` else caregiver personal); SKU in `item_catalog`.
- **Respond (client):** `cancel` only (caregiver, member).
- **`pet_food_offer_evaluate`:** server rules on hunger (no client accept/refuse/defer); releases inventory on refuse; memory `food_offer_*`.

### Stale / reconnect

- `_pet_living_recover_stale_actions`: `moving`/`performing` older than `perform_until_ms + 180s` → `cancelled` (on snapshot/begin/submit).

## Migrations

1. `20261125120000_pet_living_authority_04b2.sql`
2. `20261125140000_pet_living_authority_hardening.sql`

## Key RPCs

| RPC | Notes |
| --- | --- |
| `pet_living_submit_proposal(..., p_proof jsonb)` | `movement_ready` needs proof; `FORBIDDEN` if not member. |
| `pet_food_offer_respond` | `cancel` only; other responses → `BRAIN_AUTHORITY_REQUIRED`. |
| `pet_food_offer_evaluate` | Server pet decision for pending offer. |

## TypeScript

- `src/shared/petLiving/petMovement/petAuthorityMovementPlan.ts` — Vitest parity with SQL plan.
- `WorldBackend.petLiving.submitLivingProposal({ proof? })`, `evaluateFoodOffer`.

## Security evidence

`supabase/tests/pet_living_authority.sql`: outsider denied, fake target `TARGET_MISMATCH`, NULL proposal, bad movement proof, idempotent finish, inventory reserve/release on offer, brain-only response, timed gate.

## Limitations

- SQL BFS uses home static blockers + anchor table (not per-world furniture placements yet) — fail-closed if unreachable; 04B-3 may pass placement snapshot for verified worlds.
- Full furniture-blocked grid parity with client executor is Vitest-covered in TS plan; SQL uses static wall set + anchor tiles.

## 04B-3 integration

1. Read `movementPlan` from `beginLivingAction` and active action `destTileX/Y`.
2. On client `movement_ready`, submit `{ standTileX, standTileY }` from executor arrival tile (must match server plan).
3. Call `evaluateFoodOffer` after brain considers an offer — never `respondFoodOffer` with accept/refuse/defer.
4. On stale `ACTION_STALE`, refresh snapshot and re-begin from brain.

## Verification (local)

lint, typecheck, Vitest 524, SQL fresh+upgrade, `npm run build` (PWA), Playwright 31 pass / 1 skip.