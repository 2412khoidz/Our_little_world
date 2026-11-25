# cocoworking (cocolocow) @ `947494f933e40812051ed7f3905602b04b9c5fe4`

| Field | Value |
| --- | --- |
| **Repository** | [cocolocow/cocoworking](https://github.com/cocolocow/cocoworking) |
| **License** | MIT (`LICENSE`) |
| **Why** | Tinyhouse **RoomEditor**: palette catalog, drag, **snapToGrid**, texture **rotate** (`R`), export layout |

## Ported (logic only)

| Upstream | OLW |
| --- | --- |
| `packages/client/src/scenes/RoomEditor.ts` | `src/shared/decorate/decoratePlacementLoop.ts`, `roomEditorRotatePalette.excerpt.ts` |
| `packages/shared/src/movement.ts` occupancy | Reuses existing `src/shared/placement.ts` authority |

## Excluded

- Phaser 3 tinyhouse PNGs (`assets/tinyhouse/*`) — OLW uses Modern Interiors starter sheet + private licensed packs per `AGENTS.md`.
- Monorepo realtime / coworking presence (out of V0.2 slice).

## Run upstream (evidence)

```bash
git clone https://github.com/cocolocow/cocoworking.git
cd cocoworking && npm install   # root workspace
# Open packages/client RoomEditor scene in Vite (pnpm preferred upstream)
```

Pomodoro logic was ported earlier in `src/shared/study/pomodoro.ts` (same donor).