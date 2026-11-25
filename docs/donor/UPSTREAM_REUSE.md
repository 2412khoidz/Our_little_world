# Donor upstream reuse (Mission C1 / multi-donor expansion)

Copied source files only. Single inventory authority: `src/shared/donor/adapter/olwDonorAuthority.ts` (no second ledger, no daily caps / offline punishment).

## Shiz0id/webfarmville @ `c420bc253f5de9dbaec636a729f4b4b2866248c4`

| Upstream | OLW path |
| --- | --- |
| `shared/src/content/workshops.ts` | `webfarmville-c420bc2/content/workshops.ts` |
| `shared/src/logic/reducer.ts` (craft queue) | `meadowbrookWorkshopQueue.ts` |
| `shared/src/features/nature.ts` | `meadowbrookNatureCatch.ts`, `content/meadowbrookNatureCritters.ts` |
| Mill recipes | `olwMeadowbrookMill.ts` |

**Spot:** `meadow_pond` → chill reel minigame.

## KrasimirKralev/harvest-hollow @ `9b23e1a1fe2b19e117a3005efce21417052ded97`

| Upstream | OLW path |
| --- | --- |
| `shared/rules/economy.js` (`mulBp`, `cutMs`) | `economyMulBp.ts` |
| `shared/rules/actions/crafting.js` (`enqueue` timing) | `craftQueueSchedule.ts` |
| `shared/content/recipes.js` (bread, chicken_feed rows) | `content/hollowRecipeExcerpt.ts` |
| `shared/rules/actions/animals.js` (cycle shape) | `hollowCoopCycle.ts` (caps stripped) |
| Bakery / feed recipes | `olwHollowBakery.ts` |

**Playable:** bakery queue (`donor_bread`, `chicken_feed`), coop feed/collect (`donor_egg`).

## cristianjeffries/chill-fishing (MIT, main)

| Upstream | OLW path |
| --- | --- |
| `game.js` (`updateReel` / `startReel`) | `chill-fishing/reelMinigame.ts` |

## forinda/canvas-games @ `main` (`tutorials/48-fishing`)

| Upstream | OLW path |
| --- | --- |
| `src/games/fishing/systems/FishingSystem.ts#updateReeling` | `canvas-games-fishing/tensionReelSim.ts` |
| `src/games/fishing/data/fish.ts` (trout/salmon/bass excerpt) | `canvas-games-fishing/streamFishSpecies.ts` |

**Spot:** `east_stream` → tension reel (not meadowbrook table).

## Dropped weaker duplicate

- **`greens@3f32fd8` FSM:** not vendored — OLW production fishing stays `src/shared/fishing/fishingMachine.ts`; donor dev uses **chill** (pond) + **canvas-games tension** (stream) only.
- **Harvest-hollow daily/coop caps:** stripped in adapter; no `rules/daily.js` port.

## Dev LAN API

| Route | Purpose |
| --- | --- |
| `GET/POST /donor/workshop/*` | Meadowbrook mill |
| `POST /donor/bakery/*` | Hollow bakery + feed mill |
| `POST /donor/coop/*` | Chicken feed/collect |
| `POST /donor/fishing/*` | `spotId`: `meadow_pond` \| `east_stream` |

## Tests

| Vitest | E2E |
| --- | --- |
| `donorMeadowbrookWorkshop.test.ts`, `donorHollowBakery.test.ts`, `donorHollowCoop.test.ts`, `donorTensionFishing.test.ts`, `donorReelMinigame.test.ts`, `donorMeadowbrookCatch.test.ts` | `tests/e2e/donor-economy-two-client.spec.ts` |

Branch: `cursor/multi-donor-expansion-d77e` → `integration/donor-reuse-preview`.

## Wave 2 C3 — Interior decorate loop (cocoworking + cozy-space)

| Donor | Commit | OLW |
| --- | --- | --- |
| [cocolocow/cocoworking](https://github.com/cocolocow/cocoworking) | `947494f` | `src/shared/decorate/decoratePlacementLoop.ts`, `src/donors/cocoworking-947494f/*` |
| [adrien04hz/cozy-space-game](https://github.com/adrien04hz/cozy-space-game) | `7b8cb1e` | Flip/preview pattern only; `src/donors/cozy-space-7b8cb1e/UPSTREAM_REUSE.md` |

**Replaced:** full-map decorate grid on Cabacos/village/beach — decorate mode now **home + garden only** (`decorateInteriorPolicy.ts`).

**Persist:** place/move/rotate via existing furniture RPC + dev LAN (`/furniture/rotate`).

**Art:** Modern Interiors / `public/assets/starter/furniture-cozy.png` — no ToffeeCraft / cocoworking tinyhouse PNGs in build.

**Beach nav:** `OutdoorWorldNavSheet` + village `→ Gull Bay` discoverability marker (Cabacos portal bar).