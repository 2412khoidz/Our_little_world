# Mission 04B-2 — Server-Authoritative Living Pet

**Branch:** `cursor/mission-04b2-pet-authority-d77e`  
**Base:** `integration/night-merge` (post PR #9, ancestry includes `e2eacc1`)  
**Out of scope:** PR #8 movement runtime files, `App.tsx`, `WorldScene`, production `PetEntity` rendering.

## Architecture

Living Pet execution is **lazy and RPC-driven**: there is no always-on worker, no LLM on the hot path, and no trust in client vitals, bowl debits, elapsed time, or RNG.

| Layer | Role |
| --- | --- |
| **Pet Brain (TS, Mission 04A)** | Proposes intents (`eat_bowl`, affordance targets). Not authoritative. |
| **Movement runtime (PR #8)** | Client proposals: `movement_ready`, `animation_finished`. Not authoritative. |
| **PostgreSQL RPC (04B-2)** | Server clock (`clock_timestamp()`), action instances, travel/perform windows, atomic bowl + vitals + memory. |
| **WorldBackend.petLiving** | Typed client bridge for 04B-3 UI/sync. |

**Trusted computation:** Brain output is *advisory*. The server only commits consumption when:

1. A signed-in world member started a `pet_living_begin_action` with matching `living_version`.
2. Bowl preconditions held at begin time.
3. `movement_ready` arrives at or after `arrive_at_ms` (fixed travel ms).
4. `animation_finished` arrives at or after `perform_until_ms` with `movement_verified`.
5. Internal `_pet_living_authority_consume_*` runs once per instance (`consumption_recorded`).

**Not claimed:** continuous background simulation. Offline vitals still use bounded `_pet_catchup_vitals` on read paths (existing OLW-015 behavior). Multi-day offline is not tick-simulated.

### Travel / perform constants (server-owned)

| `action_id` | Travel ms | Perform ms |
| --- | ---: | ---: |
| `eat_bowl` | 1400 | 2800 |
| `drink_water` | 1000 | 2200 |

## Migration order

Apply after existing V0.1.5 pet care migrations:

1. `20261125120000_pet_living_authority_04b2.sql`

**Preserves data:** `ALTER TABLE pets ADD COLUMN IF NOT EXISTS` only; no pet/world reset.

## Schema (summary)

- **`pets`:** `personality_json`, `living_version`, `brain_state_json` (opaque).
- **`pet_living_action_instances`:** Server-owned action lifecycle; clients SELECT only.
- **`pet_food_offers`:** Offer contract (SKU/quality immutable per row).
- **`pet_living_memory`:** Append-only, capped at 64 events/world via `_pet_living_append_memory`.

Internal functions (`_pet_living_authority_consume_food/water`, `_pet_living_append_memory`, `_pet_living_now_ms`) have **no** client `EXECUTE`.

## RPC contracts (authenticated)

| RPC | Purpose |
| --- | --- |
| `pet_living_get_snapshot(world_id)` | Authoritative snapshot: pet, bowl, active action, offers, memory, `serverNowMs`, `livingVersion`. |
| `pet_living_begin_action(...)` | Start `eat_bowl` / `drink_water`; requires `expected_living_version`; idempotent via `v015_rpc_idempotency`. |
| `pet_living_submit_proposal(...)` | `movement_ready` \| `animation_finished`; gates on server timestamps; consumes at most once. |
| `pet_food_offer_create(...)` | Offer row only — **no inventory debit**. |
| `pet_food_offer_respond(...)` | `accept` \| `refuse` \| `defer` \| `cancel` (cancel: caregiver only). |

**Legacy block:** `pet_care_apply` with `eat_food` / `drink_water` still raises `SERVER_AUTHORITY_REQUIRED`.

## TypeScript backend

- **`src/shared/petLiving/petAuthorityTypes.ts`** — DTOs for snapshots/actions/offers.
- **`WorldBackend.petLiving`** (`src/lib/backend/types.ts`):
  - `getLivingSnapshot`
  - `beginLivingAction`
  - `submitLivingProposal`
  - `createFoodOffer`
  - `respondFoodOffer`
- **Supabase:** RPC wrappers in `supabaseBackend.ts`.
- **Dev LAN:** `scripts/devLanPetLiving.mjs` + routes under `/pet/living/*` with same idempotency and timing rules.

## Security evidence

- RLS: member SELECT on living tables; no client INSERT/UPDATE/DELETE.
- `SECURITY DEFINER` RPCs use `search_path = pg_catalog, public, pg_temp`.
- World lock `FOR UPDATE` on `worlds` for mutating RPCs.
- Idempotency: `v015_rpc_idempotency` per action/key/hash.
- Cross-world: all queries scoped by `world_id` + membership.
- SQL regression: `supabase/tests/pet_living_authority.sql` (direct eat blocked, gated consume, idempotent finish, refuse offer).

## Limitations (honest)

1. **Movement verification** is timing-based until PR #8 reachability math is wired in 04B-3; fake early proposals are rejected, not rewarded.
2. **Food offers** do not yet pour into bowl or tie to inventory stacks (platform for accept → fill → living action in 04B-3).
3. **Position** is not yet stored in SQL; `target_affordance_id` is recorded for future verification.
4. **No Supabase Cloud apply** in this mission — local SQL suite only.

## 04B-3 integration guide (Composer Agent 2)

1. On Pet Brain commit to `eat_bowl` / `drink_water`, call `backend.petLiving.beginLivingAction` with current `livingVersion` from snapshot (not client pet version).
2. When movement runtime fires proposals, call `submitLivingProposal` with stable idempotency keys per proposal attempt.
3. Subscribe to `world_mutated` / poll `getLivingSnapshot` after each RPC; render from `snapshot.pet` and `snapshot.activeAction` — never locally increment hunger.
4. Do **not** call `pet_care_apply(eat_food)` or legacy `interactPet(feed)`.
5. Align client animation duration with server windows (1400+2800 / 1000+2200) or expect server-side rejection while animating early.
6. Food offer UI: create/respond via `petLiving`; physical pour remains `pet.applyPetCare(fill_food)`; consumption chain stays living RPCs.

## Verification checklist

- `npm run lint`, `typecheck`, `test`, `test:sql`, `build`
- `supabase/tests/pet_living_authority.sql` in `run-local-sql-suite.mjs`
- Existing E2E unchanged (no App/WorldScene edits)