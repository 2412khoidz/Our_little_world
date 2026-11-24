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
