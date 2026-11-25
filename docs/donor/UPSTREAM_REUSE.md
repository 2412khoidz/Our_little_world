# Donor upstream reuse (Mission C1)

Copied source files only — no “inspired-by” rewrites. Authority for inventory mutations is `src/shared/donor/adapter/olwDonorAuthority.ts` → existing Dev LAN shared inventory (no second ledger).

## Shiz0id/webfarmville @ `c420bc253f5de9dbaec636a729f4b4b2866248c4` (Meadowbrook)

| Upstream (donor path) | OLW path | Notes |
| --- | --- | --- |
| `shared/src/content/workshops.ts` | `src/shared/donor/webfarmville-c420bc2/content/workshops.ts` | `craftMs`, `workshopSlots` |
| `shared/src/content/buildings.ts` (types + mill shape) | `content/buildingsTypes.ts`, `olwMeadowbrookMill.ts` | OLW catalog SKUs |
| `shared/src/features/nature.ts` (L1–146) | `content/meadowbrookNatureCritters.ts` | Daily caps stripped in catch layer |
| `shared/src/logic/reducer.ts` (craft queue) | `meadowbrookWorkshopQueue.ts` | `enqueueCraft` / `collectFinishedCrafts` |
| `shared/src/features/nature.ts` (catch roll) | `meadowbrookNatureCatch.ts` | Used by fishing resolve |

**Adapter:** `olwDonorAuthority.ts`  
**Dev LAN routes:** `src/server/devLanDonorRoute.ts` → `scripts/devLanV015Handlers.mjs`

## KrasimirKralev/harvest-hollow @ `9b23e1a1fe2b19e117a3005efce21417052ded97`

| Upstream | OLW path | Notes |
| --- | --- | --- |
| `src/economy.js` (`mulBp`, `cutMs`) | `src/shared/donor/harvest-hollow-9b23e1a/economyMulBp.ts` | Ready for price slicing |
| `src/crafting.js` (queue end time) | `craftQueueSchedule.ts` | Scheduling helper |

Not yet wired into mill UI; Meadowbrook `craftMs` drives the playable Dev chain.

## cristianjeffries/chill-fishing (MIT, main)

| Upstream | OLW path | Notes |
| --- | --- | --- |
| `game.js` (`updateReel` / `startReel`) | `src/shared/donor/chill-fishing/reelMinigame.ts` | Pure TS; React overlay in `ChillFishingModal.tsx` |

Catch species / weights: Meadowbrook `meadowbrookNatureCatch.ts` + Dev LAN resolve.

## Tests

| Module | Vitest |
| --- | --- |
| Workshop queue | `tests/unit/donorMeadowbrookWorkshop.test.ts` |
| Reel minigame | `tests/unit/donorReelMinigame.test.ts` |
| Pond catch | `tests/unit/donorMeadowbrookCatch.test.ts` |

## Playable Dev path

1. Dev LAN session, shared inventory with ≥2 `wheat`.
2. Farm map → **Cối xay chuồng** (J) or menu **Cối xay donor (C1)** → queue `olw_flour` → wait 45s → **Lấy món đã xong**.
3. Outdoor pond → **Cầu câu** (J) or menu **Cầu câu donor (C1)** → reel → fish credited to shared inventory (`carp_pond` etc.).

Branch: `cursor/donor-economy-webfarmville-c420bc2-d77e`.