# Donor Upstream Reuse — Living 3D Cat Care V2

Transplanted and feline-adapted for Mission M (`antigravity/carbon-living-pet-v2`) under a single OLW pet authority.

## 1. SawyerHood/nintendogs-threejs (`43d231c26e209132dbadb752a6a8e14830c83ccd`)

| Upstream file | OLW V2 path | Adaptation |
| --- | --- | --- |
| `src/dog/sdf.ts` | `src/donors/nintendogs-cat-v2/sdf.ts` | Direct transplant of analytic SDF primitives & smooth CSG |
| `src/dog/surfaceNets.ts` | `src/donors/nintendogs-cat-v2/surfaceNets.ts` | Direct transplant of Surface Nets mesher + analytic normal refinement |
| `src/dog/fur.ts` | `src/donors/nintendogs-cat-v2/fur.ts` | Direct transplant of shell-textured fur GLSL shader (`uFluff`, `uComb`) |
| `src/dog/breeds.ts` | `src/donors/nintendogs-cat-v2/catBreeds.ts` | Re-proportioned to feline anatomy + mapped 1:1 to `CatCoatVariantId` |
| `src/dog/patterns.ts` | `src/donors/nintendogs-cat-v2/catPatterns.ts` | Added feline mackerel `tabby`, `cream-point`, and `calico` vertex painting |
| `src/dog/design.ts` | `src/donors/nintendogs-cat-v2/catDesign.ts` | Feline skull, short muzzle, erect triangular ears, long 5-bone tail |
| `src/dog/dogModel.ts` | `src/donors/nintendogs-cat-v2/catModel.ts` | Added 3D whiskers, cat slit-pupil eyes, and `CatAccessoryId` collar/ribbon/bell |
| `src/dog/rig.ts` | `src/donors/nintendogs-cat-v2/catRig.ts` | Added cat poses (`groom`, `stalk`, `pounce`, `arch_purr`, `refuse`), airplane ears, feline tail waves |
| `src/dog/actor.ts` | `src/donors/nintendogs-cat-v2/catActor.ts` | Direct transplant of locomotion, ground collision, and bone-capsule raycast |
| `src/world/props.ts` | `src/donors/nintendogs-cat-v2/catProps.ts` | Transplanted bowls, brush, ribbon bow + added yarn ball, bell ball, cardboard box, Verlet feather wand |
| `src/world/room.ts` & `src/game/cameraRig.ts` | `src/donors/nintendogs-cat-v2/catRoom.ts` | Cozy couple's living room (floor, sunlit window, rug, sofa, cushion, scratching post, bowls) |
| `src/game/toyPhysics.ts` | `src/donors/nintendogs-cat-v2/toyPhysics.ts` | 3D ball/yarn physics + Verlet feather wand + paw-bat impulse |
| `src/dog/brain.ts` & `src/game/play.ts` | `src/game/pet/care/catBrain.ts`, `catPlayController.ts` | Cat behavior acts bridged to OLW `PetAutonomousController`, `Pet8Needs`, `MemoryState`, `SharedPetCareSession` |

## 2. j4lpan/pet-shop (`77f8b59a33c93881b44e15209b310b199a423d2a`, MIT)

- Double-blink cadence, spontaneous yawn/ear-twitch micro-expressions, loafing/kneading/belly-up/groom idle diversity, and mouse/wand tracking responsiveness integrated into `catRig.ts` and `catBrain.ts`.
