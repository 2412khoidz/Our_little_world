# Foundation 02 / 02.5 — Final Acceptance (Composer takeover)

## Baseline

| Label | Ref |
|---|---|
| Integration trial (start) | `codex/mission-025-trial` @ `d610ef3292ac9cbe5cf1b3e43b4f33d43e628e6e` |
| Takeover branch | `cursor/mission-025-takeover-d77e` |
| PR #3 (Mission 02 SQL) | HEAD `33c4f18` on `codex/mission-02-sql-foundation` |
| PR #4 (Mission 03) | HEAD `700d1afb186397e24b2593649c7ae8ee32312a2e` |
| Integration baseline | `98a035f` |

**Merge recommendation:** Merge this integration PR into `integration/night-merge` **after** P0 SQL tests pass on a disposable PostgreSQL 18.6 fixture (Cloud VM had no `OLW_SQL_TEST_DATABASE_URL`). Do **not** close PR #3 / #4 until owner confirms this PR subsumes their diffs without duplication.

## Blockers addressed

### P0 — Pet consumption authority

- `pet_interact('feed'|'water')` now raises `SERVER_AUTHORITY_REQUIRED` before any inventory debit or vitals update.
- Main game and `PetPanel` route **feed/water** to `pet_care_apply('fill_food'|'fill_water')` via new backend `applyPetCare` / `getPetCareSnapshot`.
- Dev LAN parity: legacy interact blocked; `/pet/care` + `/pet/care/apply` added.
- SQL regression: `supabase/tests/pet_consumption_authority.sql` (bypass feed, eat/drink, outsider, internal helper).
- `eat_food` / `drink_water` remain **Mission 04** server-only (existing gate unchanged).

**Cutover model:** Player may **offer** food/water into bowls (inventory debit on fill). Authoritative consumption and hunger updates require Mission 04 simulation (`_pet_sim_consume_*` / internal paths — not implemented here).

### P1 — Unified catalog (TS)

- Single builder: `src/shared/catalog/unifiedCatalog.ts` (`buildUnifiedCatalogRows`), fingerprint `7076075b` enforced.
- `scripts/generate-item-catalog-sql.ts` imports the builder (SQL migration 00700 unchanged; regenerate when owner reconciles).

### P1 — Quality-aware mailbox

- Migration `20261125001000`: `letters_and_gifts.gift_quality`, send/open use `_inventory_adjust_quality` (default `normal`).

### P1 — Held item resurrection

- `useHeldItemFromHotbar` clears anchor when stack depletes; unit test added.

## Blockers still open

- **Mission 04** server eat/drink + position authority before enabling hunger from physical care.
- **Quality-aware transfer** RPC (non-mailbox) — not in scope if absent from migrations; verify before economy gameplay.
- **Supabase Cloud / iPhone / private Realtime** — not exercised in Cloud agent.
- **PostgreSQL SQL suites** on this VM — not run (no test DB URL).

## Pet authority model (summary)

| Action | Client RPC | Effect |
|---|---|---|
| Petting (affection intent) | `pet_interact('pet')` | Vitals fun/energy, cooldown |
| Legacy feed/water | `pet_interact('feed'|'water')` | **Rejected** |
| Fill bowl | `pet_care_apply('fill_food'|'fill_water')` | Inventory + bowl CAS |
| Eat/drink | `pet_care_apply('eat_food'|'drink_water')` | **Rejected** (`SERVER_AUTHORITY_REQUIRED`) |

## Verification (Cloud, this run)

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` (`tsc -b`) | Pass |
| `npm run test` (Vitest) | **476** pass (includes `unifiedCatalog`, held anchor, Dev LAN pet care) |
| `npm run build` | Pass; PWA precache 21 entries |
| PostgreSQL fresh/upgrade + SQL files | **Not run** (no disposable DB) |
| Playwright E2E | **19 pass / 1 skip** (Cloud, post-change) |

## Migration order (append)

`20261125001000_pet_consumption_authority_cutover.sql` after `20261125000900_economy_integer_math.sql`.

## Mission 04 gates (must implement before “full” physical care)

See updated [MISSION_04_TECHNICAL_HANDOVER.md](../research/MISSION_04_TECHNICAL_HANDOVER.md).