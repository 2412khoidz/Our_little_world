# MISSION N — Complete World Reconstruction & Deep Donor Transplant Report

**Branch:** `antigravity/neon-world-reconstruction` (built from `origin/integration/donor-reuse-recovery` @ `f0fd012` + Mission L `antigravity/neon-cozy-art-v2` @ `71b8d5b`, merge `48e528d`)  
**Target PR Branch:** `integration/donor-reuse-recovery` (open PR only; not auto-merged)  
**Primary Authoritative Scope:** World Art Direction, World Design, `16×16` Pixel-Density Unification, Map Reconstruction, Deep Donor Transplants, Camera/Lighting/Weather/Portal Fixes, and Live Private-Art Visual Evidence.

---

## 1. Root-Cause Audit Findings (Why the Prior World Felt Duplicated & Broken)

Direct source inspection and live Windows (`VITE_OLW_PRIVATE_ART=1`) gameplay captures against the recovery base exposed six concrete defects:

1. **Duplicate Beach Map (`public/assets/maps/beach.json`, 48×34):** `beach.json` was previously generated as a crop of Cabacos Village's eastern street block rather than an independent coastal environment, causing Village and Beach to look visually repetitive.
2. **`64×64` vs `16×16` Scale Mismatch on Farm (`public/assets/maps/farm.json`, 50×40 @ 64px):** `farm.json` rendered on a `64px` grid while skipping decoration/object layers, whereas `farmPlayableBridge.ts` mapped farmable plots with `TILE_SIZE = 16` — creating a 4× spatial/visual alignment disconnect against `16×16` Cozy Human V2 characters and world zones.
3. **Indoor Weather Leak & Olive Void (`WorldLightingOverlay.ts`, `WorldScene.ts`):** Outdoor rain particles kept falling inside `home` and `shop_*` interiors, while interiors rendered over a bright olive camera background `#a6be77`.
4. **Portal Bounce Strips & NPC Shadow Leaks (`WorldScene.ts`, `import-donor-cabacos.mjs`, `import-donor-tuxemon-forest.mjs`):** `onWestGateLane` and `onEastGateLane` auto-teleported across wide 4–5 tile strips without arrival cooldowns, several shop spawns landed directly inside exit triggers, Tuxemon forest's south trailhead was blocked, and NPC shadows leaked across map transitions (`npc.shadow.destroy()` missing).
5. **Zone Ambient Accents Disabled in Private Art (`tiledZoneAccents.ts`):** An early `if (USE_PRIVATE_ART) return;` guard bypassed all living props, lanterns, animals, and sparkles on Tiled maps whenever private art was active; moreover, `WorldScene.ts` never invoked `applyTiledZoneAccents`.
6. **Cropped Navigation (`OutdoorWorldNavSheet.tsx`, `QuickNavBar.tsx`):** Exploration menu omitted `shop_tool`, `shop_crop_market`, and direct farm navigation, and `QuickNavBar` only highlighted `Khám phá` on a subset of shop routes.

---

## 2. Reconstructed World Architecture (Cohesive `16×16` Standard)

All playable zones now share a native `16×16` tile grid compatible with **Cozy Human V2** proportions, shadows, and camera zoom:

| Zone | Map ID | Dimensions / Tile | Source & Reconstruction Highlights | Portals / Interactables |
|---|---|---|---|---|
| **Home** | `home` | 16×12 @ 16px | Warm `#1d151c` interior framing; outdoor rain cleared indoors; night tint softened (`alpha * 0.42`) | Exit south to `garden`; furniture postures preserved |
| **Garden** | `garden` | 18×14 @ 16px | Fixed south gates at `(9, 12)` and `(3, 12)` | Connects north to `home`, south cleanly into `village` |
| **Farm** | `farm` | **64×44 @ 16px** | Built via `scripts/import-donor-farm-v2.mjs` using Cabacos `ts_map` terrain + Hollowmere MIT props (`farmhouse`, `greenhouse`, `windmill`, `shipping_bin`, `scarecrow`, `wishing_well`, `hay_bale`, `wooden_bench`); `FarmPlotVisualController.ts` scales `64×64` donor soil overlays `0.25x` onto `16×16` plots | **All 184 plot IDs preserved** (`farm_main_0..119` at `16,10` 12×10 + `farm_annex_0..63` at `40,28` 8×8); `farm_shipping_bin`, pond fishing, bench, NPC `bac_hai` |
| **Village** | `village` | Cabacos @ 16px | Built via `scripts/import-donor-cabacos.mjs`; preserved Cabacos overworld + 4 shop interiors (`shop_seed`, `shop_tool`, `shop_crop_market`, `shop_town_hall`) with spawns ≥2 tiles clear of exit doors | Connected routes to `garden`, `farm`, `forest`, `beach`, and shops; `arrivedAtTile` anti-bounce protection; 4 NPC spawns + Hollowmere cafe patio |
| **Tuxemon Forest** | `forest` | `tt_forest_route1` @ 16px | Retained core Tuxemon multi-layer canopy (`scripts/vendor-donor-tuxemon-forest.mjs`, `scripts/import-donor-tuxemon-forest.mjs`), opened southern trailhead | Open south portal `(8,39) -> village(12,5)`, east portal `(24,24) -> beach(5,16)`, foraging spots, bench, NPC `be_na` |
| **Gull Bay Beach** | `beach` | **56×36 @ 16px** | Completely independent coastal biome built via `scripts/import-donor-beach-v2.mjs` using Cabacos ocean/sand/pier/shell/crab tiles + Hollowmere MIT coastal props (`ferry`, `cafe`, `palm`, `crab_pot`, `wooden_bench`) | Sunlit sea glints, oceanfront bench (`beach_sunset_bench`) supporting shared couple sitting (`tryEnterAnchorBench`), pier fishing (`Ông Minh` NPC) |

Additional engine-wide upgrades verified:
- `WorldScene.ts`: Zone-specific camera backgrounds (`#1d151c` indoor, `#2d82b5` beach, `#254834` forest, `#689b4f` grass), zero-margin camera bounds on large tiled maps, NPC shadow cleanup on transitions, generic tiled bench couple-sit anchor (`tryEnterAnchorBench`), and `arrivedAtTile` bounce guard.
- `discoverabilityMarkers.ts`: Compact translucent markers (`16×14`) preserving all `cabacos_*` and `marker-gull-bay-beach` contracts while capping `crop_plot` hint clutter to `farm_main_0`.
- `tiledWorldNpcs.ts`: NPC ground shadows, compact readable nameplates, and gentle idle motion (`bac_hai`, `co_lan`, `ong_minh`, `chu_tu`, `be_na`).
- `OutdoorWorldNavSheet.tsx` & `QuickNavBar.tsx`: Full Vietnamese destination routing (`Thị trấn Cabacos`, `Nông trại (184 luống)`, `Rừng thông Tuxemon`, `Bãi biển Vịnh Hải Âu`, `Cửa hàng hạt giống`, `Cửa hàng dụng cụ & mồi`, `Chợ nông sản`).

---

## 3. Deep Donor Transplant Summary

Details and exact SHAs are cataloged in `docs/UPSTREAM_REUSE.md`:
- **`goncalojbsousa/Farming-Simulator-Cabacos`** (`79e423defc12bd99327cfcc28bf7ec0085996244`, MIT) — `ts_map` 16×16 terrain, water, trees, fencing, piers, shells, crab, and preserved 4 shop interiors.
- **`robintrepte/hollowmere.tretu.de`** (`a7a8e5addd61af5cfbebe254bb1895394c2e9043`, MIT) — transplanted 13 clean props into `public/maps/donor/hollowmere/sprites/` with `UPSTREAM-LICENSE.txt`.
- **`Tuxemon/Tuxemon`** (`4e63c45b436d372daae9f802bb5efa44232fe151`, GPL-3.0-or-later) — retained & fixed forest route slice.
- **`Blinter/harvest-horizon`** (`51c65b87bfb6bd83f8295017c34d9a2b973f56e9`, MIT) & **`clear-code-projects/PyDew`** (`0efb7cc5698da023188626e879853716bb7330ab`, CC0) — architectural and farm progression references; soil overlay scale normalized.

---

## 4. Verification Matrix (Strictly Observed Results)

### Passed After Final Edit (`task-991`)
- `npm run assets:atlas` → **PASS** (21 semantic IDs generated under `public/assets/unified/`)
- `npm run assets:atlas:private` → **PASS** (21 world/avatar IDs + 57 props/anim IDs from 46 source files)
- `npm run lint` → **PASS** (`0` errors; 3 pre-existing hook dependency warnings in `src/app/App.tsx` and `src/features/donor/ChillFishingModal.tsx`)
- `npm run typecheck` → **PASS** (`tsc -b` exit 0)
- `npm run build` → **PASS** (`dist/sw.js` generated, 25 precache entries)
- `npm run test` → **PASS** (**153 / 153 test files, 757 / 757 tests** including new `tests/unit/worldReconstructionGraph.test.ts`)
- `npm run build:private` → **PASS** (`dist-private/sw.js` generated)

### Playwright E2E Runs (Windows Chromium / Dev LAN)
- **Passed specs (executed against Mission N codebase):**
  - `tests/e2e/donor-economy-two-client.spec.ts` (1/1 passed)
  - `tests/e2e/phase-ii-diagonal-walk.spec.ts` (1/1 passed)
  - `tests/e2e/phase-ii-furniture-posture.spec.ts` (2/2 passed)
  - `tests/e2e/beach-coast-smoke.spec.ts` (1/1 passed)
  - `tests/e2e/farming-co-op.spec.ts` (1/1 passed)
- **Pre-existing E2E mismatches observed (unchanged on `origin/integration/donor-reuse-recovery`, verified via `git diff` showing zero edits in `tests/e2e/` or `src/server/`):**
  - `tests/e2e/pydew-forest-portal-smoke.spec.ts` & `tests/e2e/tiled-world-two-client.spec.ts` fail because clicking `[data-testid="nav-outdoor"]` opens `OutdoorWorldNavSheet` (`App.tsx` `onOpenOutdoorNav`) rather than immediately switching to `'village'`.
  - `tests/e2e/worker-k-economy-two-client.spec.ts` fails on `POST /api/dev-lan/farm/buy-seed` because `seedStarterFarmPack` initializes `v015.wallets[worldId]` on `GET /farm`, whereas the test posts `buy-seed` before calling `GET /farm`.

### Real Windows Private-Art Gameplay Capture (`VITE_OLW_PRIVATE_ART=1`)
Executed via `scripts/capture-world-reconstruction-evidence.mjs` + `build_mission_n_media.py` after final polish and inspected frame-by-frame:
- Stills captured & inspected: `01-home.png` through `07-shop-seed.png`, `08-beach-night.png`, plus iPhone 16 Pro Max portrait viewport captures (`mobile-beach-430x932.png`, `mobile-farm-430x932.png`).
- Comparison sheets generated & inspected: `before-after-world-reconstruction.png`, `donor-vs-transplant-comparison.png`.
- Animated gameplay GIFs generated & inspected:
  - `world-walkthrough-all-zones.gif` (34 frames: real walking + garden→village portal traversal, Gull Bay coastline/dock, farm, forest)
  - `farming-loop-till-plant-water-harvest-sell.gif` (23 frames: live UI `KeyJ` till `"Đã cuốc xong"`, plant `"Đã gieo hạt"`, water, and Shipping Bin modal `"Thùng giao hàng"`)
  - `two-player-world-coop.gif` (20 frames: Mây + Nắng Dev LAN two-client movement + shared Gull Bay bench sit + floating heart emote)

### Not Tested in This Environment
- Real physical **iPhone 16 Pro Max** (Safari + PWA Add to Home Screen over HTTPS) and Android hardware verification.
- Live hosted **Supabase production** database/Realtime channel verification (local runs used Dev LAN relay).

---

## 5. Honest Limitations & Recommended Paid Asset Packs (Owner Decision)

1. **Automated Capture Crop Ripeness & World Clock:** During the 23-frame `farming-loop` Playwright burst, the 2.8s fast-grow pause before harvesting `farm_main_0` elapsed prior to full wheat ripeness, so `Thùng giao hàng` opened cleanly via UI `KeyJ` showing an empty shared produce basket (`farming-co-op.spec.ts` covers authoritative harvest/economy state separately). Likewise, `08-beach-night.png` retained morning calendar time (`07:52`) because wall-clock / world creation age drives the clock hour independently of `olw.time-of-day`.
2. **Untransplanted Commercial Tiers:** Non-commercial/restricted itch.io packs were intentionally not bundled. If the Owner wants an even deeper cohesive palette pass across indoor walls/roofs and coastal buildings later, recommended optional purchases (with license review before buying):
   - **Hometown Pack (Full)** — unified town houses, brick/stone paths, interior tiles, and seasonal variants at native 16×16.
   - **Kiln Harvest (Full)** — cohesive 16×16 farm buildings, animated crops, barns, and furniture matching cozy pastel warmth.
   - **LimeZu Modern Interiors (Full)** — upgrades `home` furniture & room customization beyond the starter/free tier without style clashing.
