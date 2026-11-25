# Donor upstream reuse (Mission C1 / multi-donor expansion)

Copied source files only. Single inventory authority: `src/shared/donor/adapter/olwDonorAuthority.ts` (no second ledger, no daily caps / offline punishment).

## Shiz0id/webfarmville @ `c420bc253f5de9dbaec636a729f4b4b2866248c4`

| Upstream | OLW path |
| --- | --- |
| `shared/src/content/workshops.ts` | `webfarmville-c420bc2/content/workshops.ts` |
| `shared/src/logic/reducer.ts` (craft queue) | `meadowbrookWorkshopQueue.ts` |
| `shared/src/features/nature.ts` | `meadowbrookNatureCatch.ts`, `content/meadowbrookNatureCritters.ts` |
| Mill recipes | `olwMeadowbrookMill.ts` |

**Spot:** `meadow_pond` → ~~chill reel~~ tidefall bar (see Tidefall row).

## KrasimirKralev/harvest-hollow @ `9b23e1a1fe2b19e117a3005efce21417052ded97`

| Upstream | OLW path |
| --- | --- |
| `shared/rules/economy.js` (`mulBp`, `cutMs`) | `economyMulBp.ts` |
| `shared/rules/actions/crafting.js` (`enqueue` timing) | `craftQueueSchedule.ts` |
| `shared/content/recipes.js` (bread, chicken_feed rows) | `content/hollowRecipeExcerpt.ts` |
| `shared/rules/actions/animals.js` (cycle shape) | `hollowCoopCycle.ts` (caps stripped) |
| Bakery / feed recipes | `olwHollowBakery.ts` |

**Playable:** bakery queue (`donor_bread`, `chicken_feed`), coop feed/collect (`donor_egg`).

## stateloop-connected/source-tidefall-phaser @ `6a77169d198757413ccd92d310bf655d2f177506` (MIT)

| Upstream | OLW path |
| --- | --- |
| `FishingSystem.js` cast/wait/bite/minigame flow + `Constants.js` `FISHING.*` | `tidefall-phaser/tidefallFishingFsm.ts`, `tidefallFishingConstants.ts` |
| `public/assets/sprites/**` (beach, bobber, ripple, UI, terrain) | `public/assets/donor/tidefall-phaser/sprites/**` + `UPSTREAM-LICENSE.txt` |
| `FishingSystem.js#createMinigameUI` / `minigamePress` | `tidefallFishingArt.ts` (9-slice), `tidefallFishingCanvas.ts`, `ChillFishingModal.tsx` |

**Spot:** `meadow_pond`, `gull_bay` → tidefall bar minigame (economy still `olwDonorAuthority` meadowbrook resolve).

## cristianjeffries/chill-fishing (MIT, main) — legacy reel

| Upstream | OLW path |
| --- | --- |
| `game.js` (`updateReel` / `startReel`) | `chill-fishing/reelMinigame.ts` (unit tests only; pond UI superseded by Tidefall) |

## forinda/canvas-games @ `main` (`tutorials/48-fishing`)

| Upstream | OLW path |
| --- | --- |
| `src/games/fishing/systems/FishingSystem.ts#updateReeling` | `canvas-games-fishing/tensionReelSim.ts` |
| `src/games/fishing/data/fish.ts` (trout/salmon/bass excerpt) | `canvas-games-fishing/streamFishSpecies.ts` |

**Spot:** `east_stream` → economy via `pickCanvasStreamFish`; presentation unified on Tidefall bar (`tidefall_bar`).

## Dropped weaker duplicate

- **`greens@3f32fd8` FSM:** not vendored — OLW production fishing stays `src/shared/fishing/fishingMachine.ts`; donor dev uses **chill** (pond) + **canvas-games tension** (stream) only.
- **Harvest-hollow daily/coop caps:** stripped in adapter; no `rules/daily.js` port.

## Dev LAN API

| Route | Purpose |
| --- | --- |
| `GET/POST /donor/workshop/*` | Meadowbrook mill |
| `POST /donor/bakery/*` | Hollow bakery + feed mill |
| `POST /donor/coop/*` | Chicken feed/collect |
| `GET /donor/fishing/session` | Couple observe same spot (2P sync) |
| `POST /donor/fishing/sync` | Phase + bar state broadcast |
| `POST /donor/fishing/*` | `spotId`: `meadow_pond` \| `east_stream` \| `gull_bay` |

## Tests

| Vitest | E2E |
| --- | --- |
| `donorMeadowbrookWorkshop.test.ts`, `donorHollowBakery.test.ts`, `donorHollowCoop.test.ts`, `donorTensionFishing.test.ts`, `donorReelMinigame.test.ts`, `donorTidefallFishingFsm.test.ts`, `donorMeadowbrookCatch.test.ts` | `tests/e2e/donor-economy-two-client.spec.ts` |

Branch: `cursor/multi-donor-expansion-d77e` → `integration/donor-reuse-preview`.