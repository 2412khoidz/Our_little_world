# NUVORA (DarTGTtfd/NUVORA) — reuse evidence

| Field | Value |
|-------|--------|
| Upstream | https://github.com/DarTGTtfd/NUVORA @ `main` (cloned 2026-11-25) |
| License | See upstream `LICENSE` |
| Playtest | `npm install && npm start` → http://localhost:3000 (browser voxel survival) |
| OLW branch | `cursor/nuvora-petshop-c2-302d` on `integration/donor-reuse-preview` |

## Transplanted modules (presentation only)

| Donor file | OLW target | Authority |
|------------|------------|-----------|
| `public/ui.js` (CSS `.sl`, `#hb2`, `.desk`, `.tray`, `.g9`) | `src/features/inventory/nuvora/nuvoraInventorySkin.css` | OLW `backend.inventory` + `inventoryHotbarAdapter.ts` |
| `public/ui.js` (`clickSlot`, `quickMove`, `#cur`, `#tip`) | `nuvoraSlotInteraction.ts` + `NuvoraInteractiveTray.tsx` + `cmd:select-hotbar-slot` | Hotbar slots from adapter; no client qty mutation |
| `public/ui.js` (`.mat`, craft desk) | `NuvoraCraftDesk.tsx` + `DonorWorkshopModal.tsx` | Donor Dev LAN queue/collect RPC unchanged |
| `public/items.js` (slot model, stack counts) | `src/shared/donor/nuvora/nuvoraPresentationBridge.ts` | Server inventory rows unchanged |
| `public/chest.js` (27-slot grid pattern) | `NuvoraInventoryGrid` / interactive tray | No chest world authority |
| Shipping bin UX (slot grid tap) | `FarmEconomyPanel.tsx` (`nuvora-ship-desk`) | `farmShipping` / shipping bin server authority |
| `public/hand.js` | **Not ported** (Three.js first-person); farm tools use `HeldItemRenderer` + props atlas | Phaser avatar layer |

## Player copy

Internal dev names (`donor`, `C1`) removed from menu/workshop labels; `data-testid` retains `donor-*` for E2E only.