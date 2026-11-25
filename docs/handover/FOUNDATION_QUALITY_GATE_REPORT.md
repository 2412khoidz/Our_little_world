# Foundation independent quality gate (PR #6)

**Reviewed commit (PR #6 head):** `e0d49f3b8ba84385da28763a9f0f70d9a1962501`  
**Gate branch (hardening only + PR #5 trial):** `cursor/foundation-quality-gate-d77e`  
**Date:** 2025-11-25 (Cloud agent)

This is an independent audit, not a Foundation rewrite.

## Verdict

| Question | Answer |
|---|---|
| **Foundation integration-ready** (merge into `integration/night-merge` as the 02/02.5 integration vehicle) | **YES**, with documented caveats below |
| **Production deployment-ready** (Supabase Cloud + real iPhone/PWA + full pet authority) | **NO** |

**Merge vs deploy:** Integration-ready means PR #6 is an acceptable integration bundle for `integration/night-merge` after owner review. Production-ready requires Mission 04 server consumption, Cloud/migration apply on owner project, and real-device PWA gates — none of which this review executed.

## Evidence (review branch after gate hardening; PR #6 code unchanged at `e0d49f3` + runner/seed commits)

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| Vitest | Pass (57 files; includes `sqlSuiteDbSafety`, saturation parity) |
| `npm run test:sql` | Pass fresh + seeded upgrade + `upgrade_preserve_01000.sql` + concurrency |
| `npm run build` + `verify-prod-guard.mjs` | Pass |
| Playwright (PR #6 + trial PR #5 merge on gate branch) | **31 pass / 1 skip** |
| `npm run test:e2e:pwa` | Pass (gate branch) |

PowerShell SQL repro unchanged:

```powershell
$env:OLW_SQL_TEST_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/olw_sql_test"
npm run test:sql
```

## P0 — Security & transactions (audit of `e0d49f3` migrations)

| Area | Finding |
|---|---|
| Pet legacy `feed`/`water` | `SERVER_AUTHORITY_REQUIRED` before inventory/vitals (`01000`); covered by `pet_consumption_authority.sql` as `authenticated` + JWT. |
| `pet_interact` grants | Final state: `01100` `REVOKE` PUBLIC/anon/service_role; `GRANT` authenticated only. |
| `SECURITY DEFINER` RPCs | Mailbox/inventory/pet paths use `auth.uid()` + `is_world_member`; internal helpers (`_inventory_adjust_*`, `_economy_*`) lack authenticated `EXECUTE` (tests assert). |
| NULL / validation | `pet_interact` rejects null/empty idempotency; transfer rejects null qty/quality; mailbox normalizes `p_gift_quality`. |
| Inventory transfer | World `FOR UPDATE`; scoped `user:{uid}` vs `shared`; idempotency actor/action/hash bound; single transaction wraps both adjusts. |
| Gift quality | Distinct stacks; send debit uses `_inventory_adjust_quality`; surprise hides SKU/qty/body until open. |
| Shared/private | `inventory_get` filters items to shared or `user:{viewer}`; partner cannot see owner private stacks (security SQL). |
| Idempotency v1→v2 | Pre-`01000` mailbox send hash **8-tuple**; post-`01000` **includes quality** — legacy receipts **do not** replay under new hash (`IDEMPOTENCY_CONFLICT`). Documented + tested in `upgrade_preserve_01000.sql`. |
| Concurrent debit/credit | `v01_security_concurrency.cjs` passes; bowl fill concurrency in SQL suite. |
| Transaction rollback | Failed RPC raises before commit; no partial transfer observed in SQL tests. |
| Surprise privacy | `_build_mailbox_snapshot` redacts body/gift until open; partner sees `giftRedacted` in tests. |

**Residual risk (medium):** Fixture runner grants `authenticated` broad table DML on loopback only to mimic PostgREST; not part of production migrations. Real Supabase grant model still needs owner verification.

## P0 — SQL test safety (fixed on gate branch)

- `scripts/sqlSuiteDbSafety.mjs`: loopback-only URL; database name must match `olw_sql_*`; refuses `postgres` / `template*`.
- `run-local-sql-suite.mjs`: `fileURLToPath` for Windows path resolution; refuses DROP on non-disposable names.
- Vitest: `tests/unit/sqlSuiteDbSafety.test.mjs`.

## P1 — Real upgrade verification (gate branch)

- `upgrade_pre_01000_seed.sql`: 2 members, pet, shared/personal inventory, surprise letter, legacy v1 send receipt, furniture placement, `mutation_idempotency` row.
- Tail migrations `00900`–`01100` then `upgrade_preserve_01000.sql`: data preserved, `gift_quality` backfill `normal`, legacy feed blocked, v1 receipt conflict.

## P1 — Economy parity

- `_economy_saturation_mul_bp` matches TS `saturationMultiplierBp` for indices `0,19,20,21,35,40,100,500` (Vitest).
- `_economy_mul_bp` overflow guard at `900719925475` (SQL test).
- Fingerprint `7076075b` enforced in `canonicalCatalog.ts` / unit test; balance unchanged in this review.

## P1 — PR equivalence / integration trial

| PR | Result |
|---|---|
| **#3** (`codex/mission-02-sql-foundation` @ `33c4f18`) | Superseded: takeover adds `01000`/`01100` + catalog/mailbox/quality work; not byte-identical patch but covers pet authority + extensions. |
| **#4** (`700d1af`) | Ancestor of takeover trial; takeover is **+2734 / −267** vs PR #4 head across 55 files — includes M03 physical interaction integration + Foundation fixes. |
| **#5** (`cursor/mission-03b-minigames-quality-36fd`) | **Clean merge** on gate branch; full Playwright **31/32** pass. Safe to stack after #6 integration from a regression perspective (this run only). |
| **#7** (Pet Brain) | **Not integrated** — remediation incomplete per mission scope. |

## Remaining blockers (production / Mission 04)

1. Server-side `eat_food` / `drink_water` and hunger authority (Mission 04).
2. Supabase Cloud migration apply + Auth/RLS/Realtime on real project.
3. iPhone Safari / PWA on physical device.
4. Optional: relocate `pet_interact` REVOKE from `anon` into `01000` (today fixed in `01100` only — final fresh DB state is correct).
5. Catalog still projects economy from `catalogConfig` + K5 in `canonicalCatalog` (acceptable but not a single authored file).

## Recommended actions

1. Merge gate-runner hardening (`sqlSuiteDbSafety`, upgrade seed/tests) into PR #6 or `integration/night-merge` via cherry-pick.
2. Owner runs `npm run test:sql` on Windows/PowerShell with disposable DB name `olw_sql_test`.
3. Do **not** deploy production until Mission 04 gates in `MISSION_04_TECHNICAL_HANDOVER.md` are satisfied.