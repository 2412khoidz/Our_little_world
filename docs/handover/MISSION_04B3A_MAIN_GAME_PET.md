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

## Tests (đã chạy trên Cloud agent)

- `npm run lint` / `typecheck` / `test` (523 Vitest) / `build` / `node scripts/verify-prod-guard.mjs` — pass
- `tests/unit/petMainGameLiving.test.ts` — affordances + ~3 phút tick mô phỏng driver
- `tests/e2e/living-pet-main-game.spec.ts` — seed couple + banner + canvas (2 project Chromium)

## Not in scope

- PR #10 SQL / consumption RPC
- Multiplayer authoritative pet state
- Garden map living pet (home only today)