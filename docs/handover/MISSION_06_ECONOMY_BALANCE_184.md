# Mission 06 — Economy balance @ 184 plots (Composer 1)

**Branch:** `cursor/mission-06-economy-184-balance-d77e`  
**Base:** PR #14 farming authority (`farmPlotContract` v1.0.1, 184 anchors)  
**Integration:** do **not** touch `integration/playtest-all` until owner accepts.

## Composer 1 checklist (from `docs/V02_ROADMAP.md` §1)

Relevant P0 for this mission:

- [x] Plot IDs aligned with Composer 3 contract (`farmPlotIndex` + SQL tile helpers on #14).
- [ ] Supabase RPC/RLS production parity (continues on #14 / Foundation).
- [x] **`npm run economy:sim --plots=184`** — optional override using contract plot count (this PR).
- [x] Production chain v1 typed sketch: `src/shared/economy/farmProductionChainV1.ts`.
- [ ] Two-client harvest race + reload E2E on integrated build (playtest-all gate).

## Simulator flags

| Command | Farming `plotCount` | Use |
|---------|---------------------|-----|
| `npm run economy:sim` | **12** (profile default) | Fast regression / catalog |
| `npm run economy:sim -- --plots=184` | **184** (contract) | Balance vs real grid capacity |
| `npm run economy:sim -- --plots=sample:24` | **24** | Stratified sample cap (proxy) |
| `npm run economy:sim -- --smoke` | unchanged | 50×7 quick gate |

Plot count source of truth: `enumerateFarmPlotAnchors().length` in `farmPlotContract.ts` (must match gameplay).

## Curves snapshot (`seed=20261125`, smoke 7d)

**v021 + coop, plotCount 12 (default):** income ≈ **3.10** xu/phút @ day 7; dominant strategy ratio **1.29** (mono > balanced).

**v021 + coop, `--plots=184`:** income ≈ **5.61** xu/phút @ day 7; dominant strategy ratio **0.71** (balanced ≥ mono — more plot slots, same session time → spreading beats monoculture in sim).

Interpretation: 184-plot capacity **lowers** monoculture advantage in the headless model because daily active seconds are fixed per persona; widening slots dilutes optimizer focus unless session budget scales (not modeled yet). **Not a ship blocker** by itself; tune saturation/session after owner playtest.

Full smoke log: agent artifact `economy-sim-184-smoke.log`.

## Production chain v1.1 (playable)

```
shop (seeds + sugar/spice) → till|plant|water|harvest → pantry (flour / mứt dâu / súp) → shipping bin → wallet
```

- **Shop:** 6 seeds + `sugar_pack`, `spice` (`FARM_SHOP_*` in `farmShipping.ts`).
- **Pantry:** `farm_pantry_station` interactable + `POST /farm/process` (Dev LAN) / `farm_process_pantry` (Supabase).
- **Shipping:** crops + `FARM_SELLABLE_PANTRY_SKUS`; UI hint in `FARM_ECONOMY_PROGRESSION_V1`.

### Anti-grind knobs @ 184 plots

| Knob | Location | Intent |
|------|----------|--------|
| Shipping group saturation | `shippingBin.ts` | Raw crop spam loses margin; processed goods use pantry/dish groups |
| Process-before-bulk hint | `farmEconomyProgression.ts` | Steers co-op toward jam/flour/soup before bin dump |
| Sim `plotCount=184` | `npm run economy:sim -- --plots=184` | Re-balance when session model changes; ratio 0.71 @ smoke 7d |
| Mid-tier seed wallet hint | `midTierSeedWalletHint: 80` | Pacing for sunflower/cabbage without hard server gate |

Config: `buildFarmProductionChainV1()` v**1.1.0**.

**Catalog fingerprint:** `71f9ecca` (+ `strawberry_jam` pantry SKU; sim/arbitrage gates re-run on #17).

## Related

- [MISSION_05_ECONOMY_SIM_VS_184_GRID.md](./MISSION_05_ECONOMY_SIM_VS_184_GRID.md) — historical gap note (pre–Mission 06 flag).