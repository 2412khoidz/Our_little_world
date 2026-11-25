# MISSION_04A — Living Pet Brain & Autonomous Behavior

**Branch:** `cursor/mission-04a-pet-brain-36fd`  
**PR:** #7 (correctness pass @ controller lifecycle, persistence, memory authority, lab executor)  
**Scope:** `src/shared/petLiving/*`, Pet Lab sandbox, Vitest — **no** SQL, `App.tsx`, `WorldScene`, Inventory/Catalog production paths.

## Architecture

```
PetBrainInputSnapshot (needs, traits, affordances, env, foodOffer?, nowMs)
        ↓
petAutonomousController.tickPetBrain  (decision cadence, no per-frame replan)
        ↓
DeepSeek primitives (via petPrimitivesAdapter)
  · filterAffordances / needUrgency / scoreAction
  · shouldInterrupt during moving/performing
  · isRepeatSuppressed — no ranked[0] fallback when suppressed
  · noteSelection / noteSwitch
        ↓
Neon petIntelligenceConfig (action scoring, 7 traits, 8 needs, 9 emotions)
        ↓
PetBrainDecisionOutput
  · phase + PetActionIntent (instanceId, travel vs perform ms)
  · completions: completed | failed | cancelled | interrupted (proposed deltas only)
  · foodIntents from offer (caregiver on offer, no inventory mutation)
  · memoryIntents: [] (brain never authoritative)
        ↓
petLabSimulationExecutor (dev only) — confirm completion, bowl/water accounting, memory
```

## Correctness pass highlights

| Area | Behavior |
|------|-----------|
| **Lifecycle** | `idle → moving → performing → completing`; perform clock starts after travel; interrupt evaluation on cadence while moving/performing |
| **Target loss** | Cancel in flight; no `completed` on invalid target |
| **Persistence** | `PetBrainPersistedState` **v2** (`lastIntent`, travel/perform timestamps, `completedInstanceIds`); safe v1 upgrade |
| **Memory** | Fed/drank/slept only via **lab executor** after `completed`; duplicate instance IDs ignored |
| **Anti-repeat** | Suppressed candidates skipped entirely → idle fallback message |
| **Food** | `foodOffer` on snapshot → `PetFoodOfferIntent`; deferred offers do not set `mayConsumeItem` |

## Personalities (QA trio)

| Profile | Id | Role |
|---------|-----|------|
| Tò mò & năng động | `curious_bong` | explore / play |
| Nhút nhát | `shy_timid` | cautious, defer food when busy |
| Điềm tĩnh | `sleepy_mochi` | rest-first |

(`PET_BRAIN_QA_PROFILE_IDS` in `petIntelligenceConfig.ts`.)

## Pet Lab

- `/?pet-lab=1` — `tickPetBrain` + debug phase/intent/travel strip.
- `runPetLabSessionTrace` feeds completions through `petLabSimulationExecutor` and logs **per-instance** transitions.
- Long acceptance runs (180–300s): `PET_LAB_LONG_SESSIONS` in `petLabSimulation.ts`.

## Session traces (Vitest artifact)

After `npm run test -- tests/unit/petBrainAutonomous.test.ts`:

- `test-results/pet-brain-traces/session-new_furniture-curious_bong.json`
- `test-results/pet-brain-traces/session-hungry-mischievous_quyt.json`
- `test-results/pet-brain-traces/session-target_moved-sleepy_mochi.json`

## Regression tests

`tests/unit/petBrainAutonomous.test.ts` — v2 restore mid-action, interrupt vs commitment, target moved cancel, suppressed-all idle, executor exactly-once & empty bowl, resource depletion, food offer caregiver, deterministic instance transitions, 180–300s artifacts.

`tests/unit/petLivingIntelligence.test.ts` — scenarios + personality divergence (lab executor need path).

## Known limits

- Lab travel remains **time-based**; Mission **04B** supplies real movement / authoritative consumption RPC.
- Brain emits **proposed** `proposedNeedDeltas` on `completed`; production must confirm before applying needs or inventory.
- Mission 04B must wire `PetActionCompletionEvent` + `PetFoodOfferIntent` to server transactions.

## Integration contract (04B)

See `petBrainContract04B.ts`: `PetBrainInputSnapshot`, `PetActionIntent`, `PetActionCompletionEvent`, `PetFoodOfferIntent`, `PetBrainPersistedState` (v2).

Brain **must not** debit inventory, persist affection, append authoritative memory, or call Supabase.