# MISSION 04B-3A — Living Pet in the Main Game

**Branch:** `cursor/mission-04b3a-main-game-pet-36fd`  
**Base:** `integration/night-merge` @ `6a58fa1` (PR #8 + #9 merged)  
**Depends on:** 04A brain, 04B-1 movement; **not** 04B-2 authority (PR #10).

## Owner trial (Windows / DEV)

1. `npm run dev` with dev LAN or local preview.
2. Log in and pair as usual.
3. Open **`http://localhost:5173/?living-pet=1`** (or append `?living-pet=1` to your dev URL).
4. Vào **nhà (home)** — banner *Mèo tự sinh — chế độ DEV*.
5. Giữ **private Demo E** build locally for full cat sprites (`npm run build:private`); cloud uses public procedural cat fallback.

Tắt: nút *Thoát chế độ thử* hoặc bỏ query `living-pet`.

**Giới hạn:** mô phỏng cục bộ only — không đồng bộ hai client, không trừ kho khi offer food (J), không RPC authority.

## Architecture

```
PetLivingMainGameDriver (game/pet)
  tickPetBrain @ 2s cadence
  tickPetMovement each frame
  PetAuthorityPort (noop → 04B-3B)
        ↓
PetEntity.applyLivingLocomotion (sprite + anim)
WorldScene (placements → blocked grid + affordances)
MainGameInteractionLayer → offer food → cmd:pet-local-food-offer (presentation)
```

## Feature flag

`petLivingDevFlag.ts` — `import.meta.env.DEV` AND (`?living-pet=1` OR `localStorage olw-living-pet=1`).

Production: `verify-prod-guard.mjs` forbids `living-pet-local-sim` / `living-pet=1` in bundles.

## Authority seam

`petAuthorityPort.ts` — `DevNoOpPetAuthorityPort` records proposals in-memory; **04B-3B** replaces with server port (PR #10+).

## Files touched

| Area | Files |
|------|--------|
| Runtime | `petLivingDevFlag`, `petMainGameAffordances`, `petAuthorityPort`, `PetLivingMainGameDriver` |
| Game | `PetEntity`, `WorldScene`, `eventBus` |
| UI | `LivingPetDevBanner`, `executeMainGameContextAction`, `MainGameInteractionLayer` |
| Guard | `verify-prod-guard.mjs` |

## Gameplay acceptance

- **Telemetry (DEV):** `data-testid="living-pet-telemetry"` (mirror Phaser mèo: `data-x`, `data-y`, `data-anim`, `data-brain-phase`, `data-food-offer`).
- **E2E di chuyển:** `living-pet-main-game.spec.ts` — ~60s lấy mẫu vị trí/anim, food offer qua `olw-dev-living-pet-food-offer`.
- **Trace 3 phút:** `living-pet-gameplay-acceptance.spec.ts` → `living-pet-acceptance-trace.txt` + screenshots `living-pet-acceptance-min*.png` (thư mục `OLW_LIVING_PET_ARTIFACT_DIR`, mặc định `/opt/cursor/artifacts`).
- Banner DEV thu nhỏ — góc dưới trái, không che canvas.

## Tests

- `npm run lint` / `typecheck` / `Vitest` / `build` / `verify-prod-guard`
- `tests/unit/petMainGameLiving.test.ts`
- `tests/e2e/living-pet-main-game.spec.ts` (2 Chromium projects)
- `tests/e2e/living-pet-gameplay-acceptance.spec.ts` (trace on, ~3 min)

## Sau PR #10 — Mission 04B-3B

Xem `MISSION_04B3B_AUTHORITY_WIRING.md`.

## Not in scope

- PR #10 SQL / consumption RPC
- Multiplayer authoritative pet state
- Garden map living pet (home only today)