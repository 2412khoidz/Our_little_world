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
| **`petAuthorityNavigationContract.ts`** | Map registry + `PET_AUTHORITY_NAV_CONTRACT_VERSION`; home supported, garden fail-closed until 04D placement snapshot. |
| **PostgreSQL RPC** | Membership, idempotency, server clock gates, consumption, inventory holds. |

### Trusted consumption (fail-closed)

1. `begin_action`: `is_world_member`, action↔affordance binding (`food_bowl` / `water_bowl` only), registered map (`home` via `pet_nav_anchors`), **BFS reachability** from `pets.anchor_tile_*`, server `arrive_at_ms` / `perform_until_ms`. Locks `worlds` → `_pet_living_expire_due_offers` → `_pet_living_recover_stale_actions`.
2. `movement_ready`: **server clock** ≥ `arrive_at_ms` only; `p_proof` telemetry ignored. Sets `authoritative_tile_*` = plan destination.
3. `animation_finished`: `movement_verified`, server clock ≥ `perform_until_ms`, authoritative tile = dest, no double consume.
4. NULL/empty `p_proposal` → `VALIDATION_ERROR`.

### Food offers & reservations

- **Create:** reserves 1× stack (`shared` else caregiver personal); SKU in `item_catalog`; statuses through `consumed`.
- **Expire (`_pet_living_expire_due_offers`):** pending / accepted / deferred past `expires_at_ms` → release inventory + `expired` **in the same transaction** (no `RAISE` after release). Invoked from snapshot, begin, submit, care apply, evaluate, respond.
- **Respond (client):** `cancel` only (caregiver, member); expiry returns `{ offerExpired: true, snapshot }`.
- **`pet_food_offer_evaluate`:** server hunger rules; releases inventory on refuse; memory `food_offer_*`.
- **`fill_food`:** `_pet_living_finalize_accepted_offer_for_fill` matches caregiver + `reserved_owner_scope` + SKU + quality before debiting inventory.

### Stale / reconnect

- `_pet_living_recover_stale_actions`: `moving`/`performing` older than `perform_until_ms + 180s` → `cancelled`.

## Migrations

1. `20261125120000_pet_living_authority_04b2.sql`
2. `20261125140000_pet_living_authority_hardening.sql`
3. `20261125150000_pet_living_correctness.sql` — offer expiry commit, authoritative tiles, `pet_nav_anchors`, reservation consume path.

## Key RPCs

| RPC | Notes |
| --- | --- |
| `pet_living_submit_proposal(..., p_proof jsonb)` | Optional proof ignored for auth; `FORBIDDEN` if not member. |
| `pet_food_offer_respond` | `cancel` only; other responses → `BRAIN_AUTHORITY_REQUIRED`. |
| `pet_food_offer_evaluate` | Server pet decision for pending offer. |

## TypeScript

- `petAuthorityMovementPlan.ts` — Vitest parity with SQL plan; origin + `mapId` + `furnitureCollisionMode`.
- `petAuthorityNavigationContract.ts` — 04D extension hook.
- `WorldBackend.petLiving.submitLivingProposal({ proof? })` — proof deprecated for authorization.

## Security evidence

`supabase/tests/pet_living_authority.sql`: outsider denied, fake target, server movement clock, NULL proposal, offer cancel/reserve, pending + **accepted** expiry refunds, idempotent finish.

`tests/unit/petAuthorityNavigationContract.test.ts`: garden fail-closed.

## Limitations

- SQL BFS + `pet_nav_anchors` only; **no** dynamic furniture from DB placements — `TARGET_UNREACHABLE` / `MAP_NOT_SUPPORTED`.
- `furnitureCollisionMode: starter_static` on plans; 04D must supply placement snapshot before extended maps ship.

## 04B-3 integration

1. Read `movementPlan` from `beginLivingAction` (origin + dest tiles, timing).
2. Submit `movement_ready` / `animation_finished` on server timing — **do not** rely on client stand tile for authority.
3. Call `evaluateFoodOffer` after brain considers an offer — never client accept/refuse/defer.
4. On stale `ACTION_STALE`, refresh snapshot and re-begin from brain.

## Verification (local)

lint, typecheck, Vitest (incl. nav contract), SQL fresh+upgrade, `npm run build`, Playwright pet flows where applicable.