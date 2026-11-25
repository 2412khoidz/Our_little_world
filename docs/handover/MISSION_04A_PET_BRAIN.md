# MISSION_04A — Living Pet Brain & Autonomous Behavior

**Branch:** `cursor/mission-04a-pet-brain-36fd`  
**Scope:** `src/shared/petLiving/*`, Pet Lab sandbox, Vitest — **no** SQL, `App.tsx`, `WorldScene`, Inventory/Catalog production paths.

## Architecture

```
PetBrainInputSnapshot (needs, traits, affordances, env, nowMs)
        ↓
petAutonomousController.tickPetBrain
        ↓
DeepSeek primitives (via petPrimitivesAdapter)
  · filterAffordances / needUrgency / scoreAction
  · shouldInterrupt / isRepeatSuppressed / noteSelection
  · appendMemoryEvent (cap 24)
        ↓
Neon petIntelligenceConfig (action scoring, 7 traits, 8 needs, 9 emotions)
        ↓
PetBrainDecisionOutput (phase, intents, completions — no inventory RPC)
```

## Fixture replacement

- **`petPrimitivesAdapter.ts`:** re-exports / bridges to `src/shared/petAdvanced/primitives` (no local duplicate math).
- **`petAutonomousController.ts`:** lifecycle phases `idle → moving → performing → completing`; commitment + anti-repeat (extra cooldown on `hide_in_box`).
- **`petBrainContract04B.ts`:** types only for Mission 04B authoritative execution.
- **`petFoodIntent.ts`:** sniff/accept/refuse/defer — `consumeItem` remains an **intent flag**, not executed here.

## Personalities (QA trio)

| Profile | Id | Role |
|---------|-----|------|
| Tò mò & năng động | `curious_bong` | explore / play |
| Nhút nhát | `shy_timid` | cautious, defer food when busy |
| Điềm tĩnh | `sleepy_mochi` | rest-first |

(`PET_BRAIN_QA_PROFILE_IDS` in `petIntelligenceConfig.ts`.)

## Pet Lab

- `/?pet-lab=1` — uses real `tickPetBrain`, ~72s session trace, debug phase/intent strip.
- Long traces: `runPetLabSessionTrace({ durationMs, stepMs })`.

## Session traces (Vitest artifact)

After `npm run test -- tests/unit/petBrainAutonomous.test.ts`:

- `test-results/pet-brain-traces/session-curious-explore.json`
- `test-results/pet-brain-traces/session-sleepy-interrupt.json`
- `test-results/pet-brain-traces/session-hungry-food.json`

## Verification (local)

| Check | Result |
|--------|--------|
| `npm run lint` / `typecheck` / **466** Vitest | Pass on branch |
| `verify-prod-guard` | Unchanged Pet Lab DEV marker |
| Device / private art | Not claimed |

## Regression tests

`tests/unit/petBrainAutonomous.test.ts` — adapter, serialization, personality divergence, anti-repeat, commitment, food defer, unreachable affordance, deterministic replay.

Existing `petLivingIntelligence.test.ts` updated for brain lifecycle trace semantics.

## Known limits

- Lab applies **soft need deltas on completion** for demonstration only; production must use 04B server transactions.
- No pathfinding / Phaser movement — travel is time-based in lab.
- Mission 04B must wire `PetActionCompletionEvent` + `PetFoodOfferIntent` to RPC.

## Integration contract (04B)

See `petBrainContract04B.ts`: `PetBrainInputSnapshot`, `PetActionIntent`, `PetActionCompletionEvent`, `PetFoodOfferIntent`, `PetBrainPersistedState`.

Brain **must not** debit inventory, persist affection, or call Supabase.