# Phase II — Pet Care V2 (`antigravity/carbon-living-pet-v2`, nâng cấp từ `7474eb0` / `26b185d`)

## Direction
- **Stop** presenting overworld `cat-orange` 16×16 cells blown up (×8.25) as the care close-up.
- **V2 Live 3D Stage (`PetCareThreeStage.ts`):** When Pet Care mode opens (`PetPanel` `"Chăm sóc Quýt (3D)"` hoặc ngữ cảnh gần mèo), React mounts a Three.js WebGL2 full-body procedural feline (`src/donors/nintendogs-cat-v2/`) + sunlit couple living room (`CatRoom`, `FollowCamera`, `ToyWorld`, `CatWandSim` Verlet feathers, food/water bowls, 3D brush, cardboard box) synchronized 1:1 with `PetSnapshot`, `Pet8Needs`, `MemoryState`, and `WorldScene`.
- **Legacy Phaser Regression Compatibility:** `PetCareScene.ts` keeps emitting `dataset.petCareRig = 'portrait'` and preserving `?pet-care-illustration=0` (`petCareAtlasIsolated`) and `?pet-care-j4lpan=1` opt-in paths so regression gates continue passing cleanly.
- **2P Co-Care:** One physical pet per world — `sharedPetCareSession.ts` + `devLanPetCareSession.mjs` + `supabaseBackend.ts` (`pet_care_session` broadcast) synchronize `stroke`, `feed`, `brush`, `water`, `toy` (`ball`, `yarn`, `wand`, `box`), and `pose` patches concurrently without “Đổi người chăm” toggles.

## Flags
| Input | Effect |
|-------|--------|
| Default (`/?living-pet=1` hoặc game chính) | Mount 3D Living Pet Care V2 (`PetCareThreeStage`) trên nền phòng khách có nắng |
| `?pet-care-illustration=1` | Force illustration atlas flag on Phaser canvas |
| `?pet-care-illustration=0` | Force licensed isolate (regression) |
| `?pet-care-j4lpan=1` | Opt-in j4lpan SVG overlay preview |

## 2P co-op
- Dev-LAN: `GET /api/dev-lan/pet-care/session`, `POST /api/dev-lan/pet-care/session/patch`, SSE `pet_care_session`.
- Clients: `cmd:sync-shared-pet-care-session` → `PetCareThreeStage` + `PetCarePortraitRig.syncSharedPhysical`.
- Supabase Realtime: `pet_care_session` private channel broadcast wired in `supabaseBackend.ts` (`publishPetCareSession` + listener).