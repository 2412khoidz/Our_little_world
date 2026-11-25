# MISSION_04B-1 — Pet Movement & Animation Runtime

**Branch:** `cursor/mission-04b1-pet-movement-36fd`  
**Base:** Mission 04A snapshot `632c157` (PR #7)  
**Depends on:** PR #7 brain intents (`PetActionIntent`); Final Integration Checkpoint merge order.

## Architecture

```
PetActionIntent (04A — read-only)
        ↓
petMovementBrainAdapter.selectMovementIntent / movementTargetFromAffordances
        ↓
petMovementExecutor.tickPetMovement
  · tilePathfinding (BFS, shared with avatar)
  · petHomeNavLayout (static home grid + Demo E anchors)
  · petLocomotionModel.stepPetLocomotion (accel, facing hysteresis, walk/run)
  · petActionAnimationMap → perform intents + durations
        ↓
PetMovementTickOutput
  · snapshot (position, facing, animState, nav status)
  · proposals: movement_ready | animation_finished | nav_failed | nav_cancelled
        ↓
Mission 04B-2 server verifies (rebuild grid, ledger instanceId — NOT client trust)
```

**Does not:** debit inventory, hunger, memory, affection; replace brain; call Supabase.

## Modules reused

| Module | Use |
|--------|-----|
| `src/shared/maps.ts` | Home 16×12 static blockers |
| `src/shared/placement.ts` | Starter furniture `blocksMovement` footprint |
| `src/shared/petLiving/petVisualTypes.ts` | Demo E `PET_ANIMATION_SPECS` (3 coat variants share tracks) |
| `src/game/systems/pathfinding.ts` | Re-exports shared BFS |
| `src/game/pet/PetAnimationController.ts` | Re-exports shared locomotion |
| `buildLabAffordances()` | Reachable / available flags for targets |

## Navigation

- **Anchors:** stand tile adjacent to props (bowls, bed, sofa, …) — `PET_HOME_NAV_ANCHORS`.
- **Pathfinding:** 4-neighbor BFS; goal on blocked tile → nearest walkable neighbor (same as avatar).
- **Repath:** max 4 per action, ≥1.2s cadence; target removed from world snapshot → cancel.
- **Stuck:** no progress 4.5s → `nav_failed`.
- **Arrival:** ≤3.5px; optional sniff approach (900ms) before perform anim.
- **Time:** fixed `dtMs` step — no render-frame coupling.

## Movement lifecycle

`idle → navigating → arriving → performing → proposed_complete` (+ `failed` / `cancelled`).

- Travel uses `move` / `run` intents; perform uses mapped `PetBehaviorIntent`.
- `movement_ready` when anchored; `animation_finished` after local anim duration (proposal only).

## Animation mapping

`petActionAnimationMap.ts` — brain `actionId` → travel / approach / perform intents + `performDurationMs` + loop flag.

Audit helper: `auditActionAnimationCoverage()`.  
Known fallback: `scratch_stretch` uses `groom` track; `explore_area` uses `sniff`.

## Pet Lab evidence

- `PetLabMovementStrip` on `/?pet-lab=1` (`data-testid="pet-lab-movement-strip"`).
- Vitest traces: `test-results/pet-movement-traces/*.json` (6 scenarios, 8–35s simulated each).
- Cloud agent: **no** private Demo E atlas in VM — E2E sandbox smoke only; full art verified locally.

### Scenarios

1. `hungryAroundFurniture` — path to bowl  
2. `targetRelocated` — repath / cancel  
3. `sleepNatural` — sleep anim  
4. `blockedPath` — unreachable window  
5. `playThenRest` — yarn then rug  
6. `shyNewObject` — cautious box approach  

## Tests

`tests/unit/petMovementRuntime.test.ts` — path/collision, anchors, arrival proposals, cancel, blocked, instance id, dt independence, serialize, brain adapter, deterministic replay, scenario artifacts.

## Known limits

- **Home map only** in runtime; garden anchors defined but not scenario-tested yet.
- **No Phaser entity sync** — 04B-3 wires `PetEntity` to executor ticks.
- **Client proposals** are non-authoritative; animation end ≠ consumption.
- Pet corner props still not in `blockedGrid` (same as WorldScene today).

## Integration (04B-2 / 04B-3)

1. **04B-3 (client):** Drive `tickPetMovement` from brain phase `moving`/`performing`; pass placements → `buildMovementCollisionGrid`; render `loco.animState` via existing `getLivingCatAnimKey`.
2. **04B-2 (server):** Accept `movement_ready` only as hint; recompute path + distance from authoritative placements; commit consumption on separate RPC after validation.

`MOVEMENT_SERVER_VERIFICATION_HINT_VI` in `petMovementBrainAdapter.ts`.

## Verification (agent)

- `npm run lint` / `typecheck` / Vitest (incl. movement suite)
- `npm run build`
- Playwright sandboxes (includes Pet Lab movement strip)
- Not claimed: private build, iPhone device, production multiplayer