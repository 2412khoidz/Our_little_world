# Composer 1 — Hollowmere · Harvest Hollow · Meadowbrook Farm

**Owner routing (2026-11-25).** Composer 1 owns **domain reuse** from these three references. Composer 2 = hotbar/presentation; Composer 3 = farm/world layout tiles.

| Name in brief | GitHub | Clone path (agent) |
|---------------|--------|---------------------|
| **Hollowmere** | [robintrepte/hollowmere.tretu.de](https://github.com/robintrepte/hollowmere.tretu.de) | `/agent/repos/world-refs/hollowmere.tretu.de` |
| **Harvest Hollow** | [KrasimirKralev/harvest-hollow](https://github.com/KrasimirKralev/harvest-hollow) | `/agent/repos/world-refs/harvest-hollow` |
| **Meadowbrook Farm** (= marketing name of **webfarmville**) | [Shiz0id/webfarmville](https://github.com/Shiz0id/webfarmville) | `/agent/repos/world-refs/webfarmville` |

`docs/research/MASTER_TASK.md` §1.1 lists Meadowbrook as P0 and points at **webfarmville** — same product.

---

## What to steal (by repo)

### Hollowmere (MIT, Godot 4)

**Use:** world **data contract**, not engine code.

- Map JSON: `game/data/maps/*.json` — `w`/`h`, `ops` (rect/scatter), `warps` (`to`, `tx`, `ty`), `objects` (buildings with `action` for interiors), `spawn`.
- Runtime reference: `game/scenes/world/world.gd` — layered ground, shoreline/spill ranks, `blockers` + `interactables`, y-sort.
- **Port into OLW:** extend `src/shared/world/worldAreaGraph.ts` and future Tiled/object layers; align warp rects with `MapPortal` in `src/shared/maps.ts`.
- **Do not:** import GDScript, GPL assets, or Steam store art.

### Harvest Hollow

**Use:** authoritative **economy + ledger + co-op farm state** (browser MMO farm instances, not RPG overwalk).

- Core: `shared/rules/economy.js` — `ledger`, `consume`, `earn`, `intake`, idempotent receipts, barn caps.
- Actions split under `shared/rules/actions/*` (market, orders, pen, pets, quests).
- **Port into OLW:** already mirrored by `src/shared/economy/ledgerMath.ts`, `shippingBin.ts`, `orderBoard.ts`, `src/shared/farming/serverApply.ts`. Diff HH patterns when adding wallet/farm RPC (Mission 05+): single transaction = state + ledger line + version bump.
- **Do not:** copy UI bundles or Node server verbatim; keep Supabase RLS + Dev LAN parity.

### Meadowbrook Farm (webfarmville)

**Use:** **farming loop + balance** in TypeScript.

- Shared sim: `shared/` package (`createFarm`, `applyAction`, crops/buildings/producers, quests).
- Balance tooling: `scripts/balance-sim.ts` — multi-day sim using real rules (compare with `src/shared/economy/sim/`).
- Rendering: single isometric `FarmScene.ts` — reference for **economy footprints**, not OLW top-down world.
- **Port into OLW:** align crop timings and sell curves with `catalogConfig.ts` / `PRODUCTION_CHAINS.md`; add optional `npm run sim:meadowbrook` wrapper that runs OLW sim + logs pacing (no new gameplay in UI until owner approves).
- License: check repo `LICENSE` before copying strings/tables.

---

## OLW landing zones (Composer 1 only)

| System | Our path |
|--------|----------|
| Crop lifecycle | `src/shared/farming/` |
| Wallet / sell-buy | `src/shared/economy/`, `src/shared/shop/shop.ts` |
| Dev LAN farm | `src/server/devLanFarmRoute.ts`, `src/shared/farming/serverApply.ts` |
| World graph (data) | `src/shared/world/worldAreaGraph.ts` |
| Extended outdoor (PR #12) | collision `outdoorCollision.ts` — **no** fake interactables |

---

## Deliverables (incremental, playable > reports)

1. **Map/warp spec** — one JSON or TS fixture for “village warp east of outdoor” modeled on Hollowmere `warps[]` (no renderer swap).
2. **Ledger test** — one Vitest that replays HH-style `earn → consume → ledger` through `ledgerMath.replayLedger`.
3. **Balance snapshot** — run webfarmville `balance-sim` (or OLW `economy/sim`) and paste 5-line pacing note into `docs/PROGRESS.md`.

---

## Cross-links

- World visuals / Stardew scale: `docs/research/WORLD_OVERHAUL_REFERENCE_MATRIX.md` (PR #12 Phase 6).
- Mission 05 farming slice: `docs/handover/MISSION_05_FARMING_PLAYABLE.md` (other branch).
- PR #12 playtest: `docs/handover/MISSION_04D_UNIFIED_EXTENDED_WORLD.md` — `?extended-world=1`.