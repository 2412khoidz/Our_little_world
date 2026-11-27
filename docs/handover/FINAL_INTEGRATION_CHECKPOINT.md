# Final integration checkpoint — Missions 02 / 02.5 / 03 / 03B / 04A

## Snapshot refs (verified)

| Deliverable | Commit |
|---|---|
| Foundation PR #6 (hardened) | `b772e582…` on `cursor/mission-025-takeover-d77e` |
| Foundation Quality Gate | `7c5047d` → cherry-picked as `fbd46b6` on PR #6 |
| Mini-games PR #5 | `8bbceb7` (merge snapshot) |
| Pet Brain PR #7 | `632c157` (merge snapshot) |
| **Combined integration trial** | `cursor/final-integration-trial-d77e` @ HEAD after pet-brain fix |

Base Foundation before gate: `e0d49f3`.

## PR relationships & ancestry

| Source PR | HEAD (remote) | Relationship to PR #6 |
|---|---|---|
| **#3** Mission 02 SQL | `33c4f18` on `codex/mission-02-sql-foundation` | **Superseded:** PR #6 contains `01000`/`01100` pet authority, quality mailbox, catalog projection; merge-base `838d95e`. |
| **#4** Mission 03 physical | `700d1af` on `cursor/mission-03-physical-interaction-36fd` | **Integrated in takeover trial:** PR #6 ancestry includes `700d1af` (merge-base); hotbar, held item, physical care paths present. |
| **#6** Foundation takeover | `b772e58` | Integration vehicle for 02/02.5 + hardening. |
| **#5** Mini-games 03B | `8bbceb7` | **Trial-merge clean** onto hardened #6 (no conflicts). |
| **#7** Pet Brain 04A | `632c157` | **Trial-merge clean** onto #6+#5; one correctness patch on trial branch (deserialize + completed-id cap). |

**Recommended merge order (owner):**

1. **PR #6** (`cursor/mission-025-takeover-d77e`) → `integration/night-merge`
2. **PR #5** → night-merge (or stack after #6)
3. **PR #7** → night-merge **after** #6; include trial pet-brain deserialize fix from integration branch
4. **Close/supersede PR #3** once #6 lands (duplicate SQL authority work)
5. **Close/supersede PR #4** once #6+#5+#7 land (physical + minigames absorbed)

**Alternative:** Single integration PR from `cursor/final-integration-trial-d77e` if owner prefers one merge — preserves exact trial commits (`6d3f2b7`, `498250a`, pet fix).

**Do not merge PR #7 without #6** (catalog/authority/mailbox contracts).

## Phase 1 — Foundation hardening (on PR #6)

Included in `b772e58`:

- `scripts/sqlSuiteDbSafety.mjs` + loopback + `olw_sql_*` only
- Fresh DB `olw_sql_test` vs upgrade `olw_sql_test_upgrade` (distinct disposable names)
- `fileURLToPath` for Windows repo root resolution
- `upgrade_pre_01000_seed.sql` + `upgrade_preserve_01000.sql`
- Legacy mailbox **v1 receipt → v2 hash** documented: `IDEMPOTENCY_CONFLICT`; **do not retry** same key — issue new idempotency key
- Saturation parity: Vitest indices through `39_961`; SQL asserts floor at high unit index
- `FOUNDATION_QUALITY_GATE_REPORT.md`
- Fingerprint `7076075b` unchanged

## Phase 3 — Pet Brain (trial branch only)

| Check | Status |
|---|---|
| Restore v1/v2 moving/performing without `lastIntent` | **Fixed** → idle |
| Bounded `completedInstanceIds` | Cap **64** |
| No inventory/hunger RPC from lab brain | Lab executor only (existing tests) |
| Long simulation traces | Vitest exports under `test-results/pet-brain-traces/` when run |

Pet Brain **not wired** to production `pet_interact` / Supabase consumption (Mission 04B scope).

## Phase 4 — Verification (combined trial @ integration HEAD)

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| Vitest | **507** pass (58 files; minigames + pet brain + gate tests) |
| `npm run test:sql` | Pass (fresh + seeded upgrade + concurrency) |
| `npm run build` (public) | Pass |
| `verify-prod-guard.mjs` | Pass |
| Playwright | **31 pass / 1 skip** (incl. minigames-functional) |
| PWA runtime E2E | 1 pass |
| Catalog fingerprint | Vitest `unifiedCatalog` → `7076075b` |

**Not executed (honest gaps):**

- Private-art build / `verify:private`
- Supabase Cloud migrations / Auth / private Realtime
- Physical iPhone Safari / PWA install

## Remaining blockers (production)

1. Mission 04 server bowl consumption + authoritative pet position (see `MISSION_04_TECHNICAL_HANDOVER.md`)
2. Mission 04B — promote Pet Brain from lab to server-backed main game
3. Supabase Cloud apply + device nghiệm thu
4. Mailbox idempotency v1→v2: ops note for any in-flight send receipts before `01000`

## Local acceptance (owner)

```powershell
# PR #6 or integration trial
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
node scripts/verify-prod-guard.mjs
npm run test:e2e
npm run test:e2e:pwa

$env:OLW_SQL_TEST_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/olw_sql_test"
npm run test:sql
```

## Verdict

| Question | Answer |
|---|---|
| **Stable integration checkpoint for owner merge?** | **YES** — trial branch `cursor/final-integration-trial-d77e` |
| **PR #6 alone integration-ready?** | **YES** for 02/02.5 (+03 physical already in tree); stack #5/#7 per order above |
| **Production deploy-ready?** | **NO** — Mission 04/04B + Cloud + real devices |

## Mission 04B / 05 readiness

- **04B:** Pet Brain lab contracts and tests green; needs server authority adapter and no client-side vitals mutation in main game.
- **05:** Out of scope; minigames PvP economy not expanded in this checkpoint.