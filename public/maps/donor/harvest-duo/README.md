# Harvest Duo (Intelisgod/harvest-duo) — layout reference

**License:** No assets vendored — procedural pygame art stays upstream; metadata only (see `UPSTREAM-LICENSE.txt`).  
**OLW status:** `surveyed` (`area-graph-v1` + beach pier reference)

Harvest Duo is a **2P co-op** pygame farm sim. OLW reuses **area graphs, warps, and pier/tideline layout** only — not pygame rendering.

| File | Purpose |
|------|---------|
| `donor-manifest.json` | Upstream pin + slice id |
| `area-graph.v1.json` | Area ids, grid sizes, warp edges (farm ↔ beach ↔ town ↔ forest) |
| `beach-layout-reference.v1.json` | `build_beach()` pier + props anchors for Hollowmere coast polish |
| `UPSTREAM-LICENSE.txt` | Attribution / no-binary vendoring policy |

## OLW map analogues

| Harvest Duo | OLW `MapId` |
|-------------|-------------|
| `farm` | `farm` |
| `town` | `village` |
| `beach` | `beach` (Hollowmere Gull Bay importer) |
| `forest` | `forest` (PyDew glade slice) |

## Commands

```bash
npm run import-donor:hollowmere-beach   # applies coast polish + lifebuoy waypoint
npm run test -- tests/unit/harvestDuoDonorPrep.test.ts
npm run test:e2e -- tests/e2e/beach-coast-smoke.spec.ts
node scripts/capture-donor-beach-olw.mjs
```