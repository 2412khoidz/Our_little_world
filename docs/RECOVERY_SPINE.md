# Recovery spine — `donor-reuse-recovery` @ `8e4454d`

Owner rejected playtest checkpoint `8e4454d` on `integration/donor-reuse-preview`. **No merge to main.** Recovery PRs target branch `donor-reuse-recovery` only.

**Owner directive:** `/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/docs/owner-reject-8e4454d-recovery.md`

## Held work

- PR **#56** (Rai shop skin + tool tweens) — **do not merge** until this spine + C3 shop/farm map recovery land.

## C1 farming (this branch)

| Piece | Path |
|-------|------|
| WorldClock → season presentation | `src/shared/farming/farmWorldClockBridge.ts` |
| Donor chain copy (Rai/PyDew/Harvest) | `src/shared/farming/farmDonorChainPresentation.ts` |
| C3 shop/NPC routing table | `src/shared/world/shopRecoveryCoordination.ts` |
| UI wiring | `FarmEconomyPanel.tsx`, `interactionResolver.ts` labels |

Growth/harvest authority unchanged (`farmGrowthClock`, server farm RPC).

## Next (parallel owners)

- C3: real farm map, forest, beach, shop interior (#7 in recovery doc).
- C2: avatar atlas, pet care path, album.
- Rebase #56 onto recovery after farm map + shop interior slice.