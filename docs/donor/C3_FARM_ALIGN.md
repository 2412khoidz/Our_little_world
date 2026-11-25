# C3 ↔ farm donor alignment (prep — not active until village P0 clears)

**Gate:** Cabacos village tiles visible + pet Three.js renders real pixels (`internal/p0-render-blockers-owner-2511.md`). Until then: **no new donor clones**; farm/fish only on feature branches; **PR #25 merge held**.

## Authority order (post-gate)

1. **Plot indices / anchors:** `src/shared/world/farmPlotContract.ts` + `farmPlotContract.v1.json` — bump version when Cabacos farm annex lands.
2. **Gameplay till/plant/harvest:** existing `farm_apply` + `src/shared/farming/*` (no second plot grid).
3. **Donor mill/bakery/coop/fish:** `olwDonorAuthority.ts` + Dev LAN routes — same shared inventory; workshop buildings stay at `FARM_WORLD_INTERACTABLES` / farm slice interactables until remapped from donor Tiled `Interactables`.

## SKU bridge

Preview-only donor SKUs (Dev LAN catalog) map to economy catalog when promoted:

| Donor dev SKU | Economy target (when promoted) |
| --- | --- |
| `donor_bread` | `carrot_soup` placeholder → real pantry dish or new catalog row via fingerprint bump |
| `donor_egg` | new `egg` row (planned V0.3) |
| `chicken_feed` | pantry ingredient |
| `donor_trout_stream` | `lotus_trout` or dedicated stream fish row |

See `src/shared/donor/adapter/c3FarmDonorBridge.ts` for the machine list.

## C3 village → farm warp (future)

- `VILLAGE_SHOP_PORTAL` already points Cabacos `village` → `shop`.
- Farm donor map: remap `farm_barn_door` / seed shop tile from import script output, not hand-edited React anchors.