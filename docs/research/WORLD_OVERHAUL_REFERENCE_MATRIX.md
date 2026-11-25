# World overhaul — reference matrix (cloned 2026-11-25)

Clones under `/agent/repos/world-refs/` (shallow). Owner goal: Stardew-scale exploration — linked regions, enterable shops, honest collision, follow camera.

| Repo | Stack | Map / world model | Camera | Collision | Interiors / NPC | Co-op fit | Reuse into OLW? |
|------|-------|-------------------|--------|-----------|-----------------|-----------|----------------|
| **[Hollowmere](https://github.com/robintrepte/hollowmere.tretu.de)** | Godot 4.7, MIT | JSON grids per map (`data/maps/*.json`), layered `TileMapLayer`, terrain spill/shore autotiling in `World.gd` | Follow player + y-sort actors | Tile grid + `blockers` + building footprints | Yes — town, greenhouse, mines, casino; NPC A* | Online co-op (host auth) | **Patterns only** — wrong engine; best reference for *data-driven tile world* |
| **[Harvest Duo](https://github.com/Intelisgod/harvest-duo)** | Python + pygame-ce | ASCII `Area.grid` + `warps[]` + buildings rect; 10+ areas (farm, town, mine, beach, forest, home interior…) | Dual-player bounds (`camera.py`) | `SOLID_TILES` + trees/rocks/buildings | Home iso interior, shop tiles, temple | **2P same keyboard / LAN** — matches OLW couple | **Patterns only** — port area graph + warp contract; art is 100% procedural |
| **[Farm Rai Larn Na](https://github.com/kensfpon/Farm-Rai-Larn-Na)** | Phaser 4 + TS + Vite | README claims 13 seasonal painted maps; **public clone is doc + minimal `FarmScene`** (single backdrop, grid objects) | — | Grid `FIELD` + `objectAt` | Described in README, not in clone | Single player | **Cannot vendor** until full sources ship; align on stack only |
| **[harvest-hollow](https://github.com/KrasimirKralev/harvest-hollow)** | Node + canvas farming MMO | Farm instances in browser; not a walkable RPG overworld | Farm UI | Placement grid | Store NPCs as UI | Async co-op farms | Economy/ledger patterns (`shared/`), not world renderer |
| **[Meadowbrook Farm / webfarmville](https://github.com/Shiz0id/webfarmville)** | Phaser + TS isometric farm | Single `FarmScene`, `@farm/shared` sim | Zoom/pan farm | `objectAt` / footprints | Town as feature modules, not walk-in | Friends async | **Composer 1 P0** — economy/`balance-sim.ts`; iso art not main world |
| **[Tuxemon](https://github.com/Tuxemon/Tuxemon)** | Python RPG | TMX tile maps under `mods/tuxemon/maps` | Classic RPG follow | TMX collision layers | NPC battles, doors | Single player | TMX **authoring pipeline** reference if OLW adopts multi-map Tiled |

## Run / build checks (agent)

| Repo | Result |
|------|--------|
| Harvest Duo | `pip install pygame-ce` + `python main.py` boots (headless VM, no audio device) |
| Farm Rai Larn Na | `npm ci && npm run build` — **pass** (minimal scene bundle ~1.5MB) |
| Hollowmere | Godot 4.7 not installed on agent VM — inspected `game/scenes/world/world.gd` + `data/maps/` |
| webfarmville / harvest-hollow | Not run (time); structure via grep |

## Recommendation (playable > report)

**Do not replace OLW with another repo wholesale.** React shell, Supabase/Dev LAN, and Phaser 4 avatar path stay.

**Adopt a hybrid pipeline (next mission after PR #12 lands):**

1. **Area graph** (Harvest Duo model) — canonical list of regions, warp rectangles, spawn pairs; one `MapId` per outdoor region + interior maps. See `src/shared/world/worldAreaGraph.ts` (planned graph, not wired).
2. **Tile maps** (Hollowmere + existing OLW Tiled JSON) — ground/collision/object layers in Tiled; Phaser `Tilemap` for home/garden/**village/forest/beach**; retire painting fake props in `outdoorRenderer.ts` for anything marked playable.
3. **Camera** — single follow camera (Phaser) with clamp to map bounds; later dual-anchor lerp for co-op (Harvest Duo `camera.py` behaviour).
4. **Honest bounds** — collision layer is source of truth; decorative tiles outside collision = background only (PR #12 P0 direction).

**Deprioritize:** vendoring Hollowmere (Godot), Harvest Duo renderer (Python), webfarmville iso farm as the main world.

**Track Farm Rai Larn Na** when upstream publishes full map pipeline (seasonal map loads, interior enters) — closest stack match to OLW.

## Licenses

Hollowmere MIT; Harvest Duo check repo LICENSE; Farm Rai Larn Na LICENSE + THIRD_PARTY; webfarmville LICENSE; Tuxemon GPL — **no copy-paste assets/code from GPL into OLW**.