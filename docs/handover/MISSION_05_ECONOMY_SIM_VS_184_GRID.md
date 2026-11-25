# Mission 05 — Economy sim vs 184-plot gameplay (honest gap)

**PR #14** ships **184** authoritative farm plots (`farmPlotContract` **v1.0.1**, `farmPlotIndex.ts`, Supabase `_farm_plot_count() = 184`).  
**`npm run economy:sim`** still models farming with **`plotCount: 12`** on every `v021+` profile in `src/shared/economy/sim/config.ts`.

## What the sim measures today

| Layer | Plot count | Purpose |
|-------|------------|---------|
| **Gameplay / authority (#14)** | **184** (`farm_main` 120 + `farm_annex` 64) | Dev LAN `farm/apply`, Supabase `farm_apply`, interactables on `farm.json` |
| **Economy simulator (`v021`–`v030`)** | **12** | Pacing from `WORLD_PROGRESSION` tier-1 starter garden (pre–`V0.2.4` expansion curve) |

The simulator caps daily plant/harvest cycles by `profile.plotCount`. It does **not** read `FARM_PLOT_COUNT` from the plot contract.

## Why this is OK for V0.2 gate (for now)

- **Catalog / arbitrage / deadlock / zero-wallet recovery** do not depend on plot cardinality.
- **Monoculture vs balanced** ratio in sim is a **12-parallel-slot** farm, not a 184-slot optimizer.
- **Income per worked minute** from sim **overstates** time-per-day spent farming relative to a 184-grid co-op (same crop math, fewer simulated plots than a maxed farm).

## What sim does *not* prove for #14

- Co-op saturation on **annex** plots (`plotIndex ≥ 120`).
- Shipping-bin throughput when two players fill many plots in one session.
- Decoration pacing if household income scales with **184** active slots (sim still assumes **12**).

## Follow-up (post–owner playtest, optional V0.2.4)

1. Add sim profile `v021_full` with `plotCount: 184` (or derive from `FARM_PLOT_COUNT`) and re-baseline dominance caps.
2. Align `WORLD_PROGRESSION` tiers with Composer 3 contract tiers if expansion is gameplay-gated, not cosmetic-only.

## Commands

```bash
npm run economy:sim                 # default plotCount=12 on v021+ profiles
npm run economy:sim -- --plots=184  # contract grid (Mission 06)
npm run economy:sim -- --smoke      # quick gate
```

See [MISSION_06_ECONOMY_BALANCE_184.md](./MISSION_06_ECONOMY_BALANCE_184.md) for curves and Composer 1 checklist.