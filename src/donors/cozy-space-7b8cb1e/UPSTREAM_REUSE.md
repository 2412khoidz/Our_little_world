# cozy-space-game (adrien04hz) @ `7b8cb1e26452f36d9f0574039c041c29a206fcbb`

| Field | Value |
| --- | --- |
| **Repository** | [adrien04hz/cozy-space-game](https://github.com/adrien04hz/cozy-space-game) |
| **License** | README demo; furniture art is **ToffeeCraft** (itch) — **not vendored** into OLW build |
| **Why** | Isometric room decorate loop: catalog categories, grid snap, flip (`R`), confirm/discard |

## Ported (logic only)

| Upstream | OLW |
| --- | --- |
| `components/room/GridOverlay.tsx` footprint + `isFlipped` | `src/shared/decorate/decoratePlacementLoop.ts` |
| `public/data/furniture.json` shape (`placementType: grid \| free`) | Catalog stays `src/shared/catalog.ts` (Modern Interiors / starter atlas sprites) |

## Excluded

- Next.js UI, Framer Motion, ToffeeCraft PNG paths under `public/assets/furniture/`.
- Full-room isometric renderer (OLW keeps top-down Phaser 16px home/garden).

## Run upstream (evidence)

```bash
git clone https://github.com/adrien04hz/cozy-space-game.git
cd cozy-space-game && pnpm install && pnpm dev
# https://cozy-space-game.vercel.app/
```