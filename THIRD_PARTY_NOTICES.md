# Third-Party Notices — Our Little World

This repository respects and preserves all third-party attributions and licenses.

## 1. Cocoworking — Pure TypeScript Pomodoro Logic (`MIT License`)
- **Upstream Source:** `cocoworking` (`commit 947494f`, `packages/shared/src/pomodoro.ts`)
- **Ported / Adapted Location:** `src/shared/study/pomodoro.ts`
- **License:** MIT License

```text
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 2. Free Pets Pack (`CC BY 4.0`)
- **Creator:** Frakassets (`https://frakassets.itch.io/free-pets-pack`)
- **Assets Used:** `cat-orange` 16×16 top-down animated spritesheet (`outline_lit` & `shadow`, 128 frames) and `puppy-shiba` 16×16 preview frame.
- **License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

## 3. Mission M — 3D Pet Care V2 Donors (`src/donors/nintendogs-cat-v2/` & expressions)

1. **`SawyerHood/nintendogs-threejs` (`commit 43d231c26e209132dbadb752a6a8e14830c83ccd`)**
   - **Adapted Modules:** Procedural SDF & Surface Nets mesher (`sdf.ts`, `surfaceNets.ts`), GLSL shell-fur shader (`fur.ts`), skeleton rig/IK/pose solver patterns (`catDesign.ts`, `catModel.ts`, `catRig.ts`, `catActor.ts`), `ToyWorld` physics (`toyPhysics.ts`), procedural living-room props & follow camera (`catProps.ts`, `catRoom.ts`), `Brain` & raycast `PlayController` patterns (`catBrain.ts`, `catPlayController.ts`).
   - **Verification Note:** All ported files are tagged `// Adapted from SawyerHood/nintendogs-threejs@43d231c` and documented in `src/donors/nintendogs-cat-v2/UPSTREAM_REUSE.md`; upstream repo currently has **no LICENSE file declared** (recorded transparently for owner review before external public distribution).
   - **Zero copyrighted audio/binary assets copied.**

2. **`j4lpan/pet-shop` (`commit 77f8b59a33c93881b44e15209b310b199a423d2a`, `MIT License`)**
   - **Adapted Concepts:** Double-blink eye micro-expressions, ear twitches, and lightweight reactive cues integrated into `catRig.ts` and `catBrain.ts`.
   - **License:** MIT License (Copyright (c) j4lpan — permissive open-source license allowing modification and redistribution with attribution).

## 4. Mission M.1 — CC0 3D Cat Model & Real Audio Assets (`public/assets/pet-care-v2/`)

- **`Vuena — Cute Pets & Wildlife FREE Sample`** (`https://vuena.itch.io/blocky-pets-free`) — **CC0 1.0 Universal**
  - **Used:** `GLB/animal_cat.glb` (19 bones, 13 clips, LOD0/LOD1) vendored at `public/assets/pet-care-v2/models/vuena-cat.glb` alongside `LICENSE-VUENA-CC0.txt`.
- **OpenGameArt CC0 Audio Packs** (transcoded locally to mono `.mp3` for cross-browser & iOS Safari/PWA compatibility):
  - **Cat Purr & Meow** by Kerzoven (`https://opengameart.org/content/cat-purr-meow`, **CC0**) — `meow_soft.mp3`, `meow_happy.mp3`, `meow_food.mp3`, `purr_loop.mp3`, `purr_sleep.mp3`.
  - **Meow** by IgnasD (`https://opengameart.org/content/meow`, **CC0**) — `meow_short.mp3`.
  - **Crunch sounds (cucumber)** by cogitollc (`https://opengameart.org/content/crunch-sounds-cucumber`, **CC0**) — `eat_crunch.mp3`, `eat_crunch_2.mp3`.
  - **40 CC0 Water / Splash / Slime SFX** by rubberduck (`https://opengameart.org/content/40-cc0-water-splash-slime-sfx`, **CC0**) — `drink_lap.mp3`.
  - **100 CC0 SFX & 100 CC0 SFX 2** by rubberduck (`https://opengameart.org/content/100-cc0-sfx`, `https://opengameart.org/content/100-cc0-sfx-2`, **CC0**) — `bell_jingle.mp3`, `box_rustle.mp3`, `brush_fur.mp3`, `footstep.mp3`, `ball_bounce.mp3`, `toy_swish.mp3`.
- **Note:** `vinish.dev` *Orange Tabby* (`CC BY 4.0`) was inspected as an upstream reference candidate and is not bundled in `public/assets/pet-care-v2/`.

## Status of the V0.2–V0.3 domain modules (DeepSeek night session)

The reference checkouts listed in `docs/research/REUSE_MATRIX.md`
(`harvest-hollow`, `webfarmville`, `greens`, …) are **not present** in this
worktree (`antigravity/scratch/olw-refs` is not part of the delivered tree).
Because the task requires checking the exact revision and license before porting,
and because no upstream source file was available to copy, every module below was
written **clean-room from the design specifications** in `docs/`. No line of
upstream code was copied, so no MIT licence text is reproduced here yet.

| Our Little World module | Conceptual reference (not copied) | Upstream license | Reuse class |
|---|---|---|---|
| `src/shared/economy/ledgerMath.ts` — integer coins, basis points, `mulBp`, append-only ledger | `harvest-hollow@9b23e1a:shared/rules/economy.js` (MIT, Krasimir Kralev) | MIT | B → clean-room |
| `src/shared/economy/sim/` — seeded headless balance runner | `webfarmville@c420bc2:scripts/balance-sim.ts` (MIT, Shiz0id) + `harvest-hollow@9b23e1a:tools/economy-model.mjs` (MIT) | MIT | B → clean-room |
| `src/shared/rng.ts` — `mulberry32` PRNG, weighted picks | `webfarmville@c420bc2:shared/src/content/orders.ts#nextRandom` (MIT); the algorithm itself is public domain | MIT | B → clean-room |
| `src/shared/farming/blooms.ts` — 8-neighbour flower cross-breeding | `webfarmville@c420bc2:shared/src/features/blooms.ts#breed` (MIT) | MIT | B → clean-room |
| `src/shared/fishing/fishingMachine.ts` — hold-to-catch FSM | `greens@3f32fd8:src/game/systems/fishing.js` — `package.json` says MIT but the repository ships **no LICENSE file** | MIT (unverified file) | C → clean-room, no code reused |
| `src/shared/cooking/` — co-op cooking + restaurant order constraints | Design only (`docs/gameplay/GAME_DESIGN.md §4`, `docs/economy/MARKET_AND_NPC.md §1`) | — | original |
| `src/shared/minigames/` — Caro, Othello, Battleship, Memory reducers | Design only (`docs/gameplay/MINIGAME_DESIGN.md`) | — | original |

## Obligations if upstream code is pasted later

If a future change copies source text verbatim from any MIT repository above,
the copyright line and full MIT text of that repository must be reproduced in
this file together with the source URL and commit SHA, and the ported file must
carry the header comment required by `docs/research/INTEGRATION_PLAN.md §2`:

```ts
// Adapted from <repo>@<sha> (<License>) — see THIRD_PARTY_NOTICES.md
```

## Forbidden sources (do not copy)

`sunflower-land` (UNLICENSED), `pairnest` (AGPL-3.0), `Ourlittlepet` (no
license), `Local-Watch-Party` (PolyForm Noncommercial 1.0.0), and all art/audio
from `cocoworking`, `harvest-hollow` and `Cabacos`.

## 3. Deep Farming MIT Code Donors (`feat/deep-farming-transplant`)

- **`KrasimirKralev/harvest-hollow`** (`9b23e1a`, MIT): adapted deterministic economy balance formulas, perennial orchard rules, livestock & artisan workshop chains (`src/shared/donor/harvest-hollow-9b23e1a/`, `src/shared/farming/`).
- **`Shiz0id/webfarmville`** (`c420bc2`, MIT): adapted weather rules & 8-neighbor flower crossbreeding formulas (`src/shared/donor/webfarmville-c420bc2/`, `src/shared/farming/flowerGenetics.ts`), omitting all offline death/withering rules.
- **`fernforge-arcade/greens`** (`3f32fd8`, MIT): adapted seasonal crop lifecycle curves, fertilizers, sprinklers & skill XP tier tables (`src/shared/donor/greens-3f32fd8/`, `src/shared/farming/deepCropSimulation.ts`).
- **`robintrepte/hollowmere.tretu.de`** (`a7a8e5a`, MIT): adapted supplementary crop/preserve content tables (`src/shared/catalog/deepFarmingContent.ts`).

## 4. Curated Packed Farming Sprite Atlases (`public/assets/farming/`)

Packed via `scripts/pack-farming-atlases.py`; see `public/assets/farming/CREDITS.md` for itemized asset attributions:
- **Free Pixel Food (16x16)** by Alex Kovacs (CC BY 4.0 / commercial & personal game use with attribution).
- **Yoshino's Bright Icons 16x16 v1.3** by Rym Yoshino (licensed for personal & commercial games/apps; no standalone pack redistribution).
- **Ghostpixxells Free Pixel Foods** (CC0).
- **LPC Food V2** & **LPC Crops v2.1** & **LPC Fruit Trees** (CC-BY-SA 3.0+ / GPL 3.0+, bluecarrot16, Daniel Eddeland, Joshua Taylor, Jetrel, et al.).
- **Farm & Ranch Life v1.0** (perpetual commercial/personal game use license; no standalone pack redistribution or AI training).
- **Shikashi's Fantasy Icons Pack v2** (commercial/personal project use).
- **OpenGameArt CC0 Food Packs** (`food.zip`, `food-ocal.zip`, `food-glitch.zip`, `food-dcss_20201222.zip`, CC0 / Public Domain).
