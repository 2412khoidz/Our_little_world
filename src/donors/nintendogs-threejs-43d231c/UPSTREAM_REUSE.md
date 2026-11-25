# Upstream reuse — SawyerHood/nintendogs-threejs

| Field | Value |
|-------|--------|
| Repository | https://github.com/SawyerHood/nintendogs-threejs |
| Pin commit | `43d231c26e209132dbadb752a6a8e14830c83ccd` |
| License | No LICENSE file in upstream; fan remake README — **reference only** for interaction patterns |
| OLW branch | `cursor/donor-pet-nintendogs-threejs-43d231c-36fd` |

## What we copied

| Upstream path | OLW path | Use |
|---------------|----------|-----|
| `src/game/play.ts` | `vendor/nintendogs-threejs-43d231c/upstream/play.ts` | Petting stroke speed + brush mode reference |
| `src/dog/brain.ts` | `vendor/nintendogs-threejs-43d231c/upstream/brain.ts` | Activity / `setPet` API reference only |

## What we ported (cat-only, no dog mesh)

| OLW module | Notes |
|------------|-------|
| `olwCatStrokeBrain.ts` | 2D stroke sampling + zones (head/chin/back); maps to `reactToCareStroke` |
| `DonorPetThreeCare.tsx` | DEV route `?donor-pet-three=1` — Three.js room + **licensed cat-orange** billboard, shared `PhysicalCarePetState` |

**Not imported:** procedural dog actor, fur shell, town/kennel gameplay — OLW stays one save, one cat skin (Demo E / private-unified atlas).

## Evaluation (2026-11-25)

Three.js donor home screenshot: `media/donor-nintendogs-threejs-home-43d231c.png` (project store).

**Decision:** Donor **interaction** (stroke feel, brush cadence) beats Phaser care UX; **visual** stays licensed 2D cat in OLW (no dog-as-cat). Hybrid route is the C2 slice.