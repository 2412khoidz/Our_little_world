# Phase II — Pet Care 2D (checkpoint `7474eb0`)

## Direction
- **Stop** presenting overworld `cat-orange` 16×16 cells blown up (×8.25) as the care close-up.
- **Default (Worker H recovery):** Phaser `PetCarePortraitRig` + Frakassets / 48px illustration (`petCareJ4lpanPortraitEnabled()` off). j4lpan SVG opt-in `?pet-care-j4lpan=1`. Procedural 48×48 (`petCarePortraitPainter.ts`) with `?pet-care-procedural=1`.
- **Next:** memu-cat / donor skeletal 2D evaluation; Three.js donor sandbox stays **opt-in** (`?donor-pet-three=1`) only.
- **2P:** one physical pet per world — `sharedPetCareSession.ts` + backend merge; no “Đổi người chăm” UI.

## Flags
| Input | Effect |
|-------|--------|
| `?pet-care-illustration=1` | Force illustration atlas |
| `?pet-care-illustration=0` | Force licensed isolate (regression) |
| `VITE_OLW_PET_CARE_ILLUSTRATION=1` | Illustration in prod builds (pre-sign-off) |

## VQG
- Pet care capture must show `data-pet-care-illustration="1"` on game canvas when illustration path is active.

## 2P co-op
- Dev-LAN: `GET /pet-care/session`, `POST /pet-care/session/patch`, SSE `pet_care_session`.
- Clients: `cmd:sync-shared-pet-care-session` → `PetCarePortraitRig.syncSharedPhysical`.
- Supabase broadcast: stub until Mission 04c RPC.