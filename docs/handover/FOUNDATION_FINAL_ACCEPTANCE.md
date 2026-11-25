# Foundation 02 / 02.5 — Final Acceptance (Composer takeover)

## Baseline

| Label | Ref |
|---|---|
| Integration trial (start) | `codex/mission-025-trial` @ `d610ef3` |
| Takeover branch | `cursor/mission-025-takeover-d77e` |
| PR | **#6** → `integration/night-merge` |
| Economy fingerprint | `7076075b` (unchanged) |

**Merge recommendation:** Merge after owner reviews PostgreSQL evidence below. Do **not** apply migrations directly to Supabase Cloud from agent runs.

## P0 — PostgreSQL verification (Cloud VM)

Disposable **PostgreSQL 16** on loopback with `supabase/tests/fixtures/local_auth_bootstrap.sql` (auth.uid, roles, realtime stub).

| Path | Role |
|---|---|
| `scripts/run-local-sql-suite.mjs` | Fresh install (15 migrations) + upgrade path (12 + 3 tail) + concurrency `.cjs` |
| `npm run test:sql` | Same runner (`OLW_SQL_TEST_DATABASE_URL`) |

**PowerShell (local reproduce):**

```powershell
$env:OLW_SQL_TEST_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/olw_sql_test"
npm run test:sql
```

**Fresh + upgrade SQL files (all PASS on takeover run):** `economy_integer_math`, `inventory_quality`, `physical_pet_care`, `pet_consumption_authority`, `v015_inventory_debit_and_mailbox`, `v015_inventory_security`, `v01_security_hardening`, `inventory_transfer_quality`, `mailbox_gift_quality`, plus `v01_security_concurrency.cjs`.

**Pet authority test (`pet_consumption_authority.sql`):** privilege assertions run as DB owner; RPC exercises use `SET LOCAL ROLE authenticated` with JWT claim; `anon` denied `pet_interact` / `pet_care_apply`; legacy feed/water, `eat_food`/`drink_water`, NULL action/version, retry/idempotency covered.

**Migration 01100:** `REVOKE` legacy `pet_interact` from `anon`; `inventory_transfer_quality`; `_economy_saturation_mul_bp` (TS parity); mailbox snapshot `giftQuality`.

## P0 — Pet consumption authority

- `pet_interact('feed'|'water')` → `SERVER_AUTHORITY_REQUIRED` (no inventory debit / vitals).
- UI / `App.tsx`: feed/water → `pet_care_apply('fill_food'|'fill_water')`; toasts and `PetPanel` labels say **đổ vào bát** (not “đã ăn”).
- `eat_food` / `drink_water` remain **Mission 04** server-only.

**Cutover gameplay limitation:** Players only refill bowls; hunger/thirst do not drop from authoritative consumption until Mission 04 Advanced Pet AI.

## P1 — Canonical catalog

- `src/shared/catalog/canonicalCatalog.ts`: **K5 starters** authored once; `buildUnifiedCatalogRows()` projects economy (`catalogConfig` / `7076075b`) + starters for SQL generator and inventory rules.
- `scripts/generate-item-catalog-sql.ts` imports canonical builder (replaces deleted `unifiedCatalog.ts` merger).

## P1 — Quality end-to-end

| Layer | Status |
|---|---|
| SQL | `gift_quality` column; send/open idempotency hash v2; `_inventory_adjust_quality` |
| Types | `MailboxGiftQuality`, `SendMailboxParams.giftQuality` |
| Supabase adapter | `p_gift_quality` on send |
| Dev LAN | quality-aware `adjustInventoryItem`, mailbox send/open hash + debit/credit |
| Mailbox UI | stack key `scope:quality:sku`; `App.handleSendMailbox` passes quality |
| Inventory transfer | `inventory_transfer_quality` RPC + Supabase + Dev LAN `/inventory/transfer-quality` |

No automatic quality merge (normal/silver/gold stay distinct stacks).

## Migrations (append order)

1. `20261125001000_pet_consumption_authority_cutover.sql`
2. `20261125001100_inventory_transfer_and_economy_parity.sql`

## Verification (this takeover run)

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test` (Vitest) | **482** pass (`economySaturationParity`, catalog, pet care) |
| `npm run build` | Pass; PWA precache 21 entries |
| `npm run test:sql` | **Pass** (fresh + upgrade + concurrency) |
| Playwright E2E | **19 pass / 1 skip** (living-home mailbox select key fixed for quality) |
| Supabase Cloud / iPhone Safari | Not exercised |

## Still gated on Mission 04

Server-side bowl consumption, hunger sync from physical care, position authority, Advanced Pet AI.