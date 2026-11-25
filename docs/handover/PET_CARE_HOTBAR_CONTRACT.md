# Pet Care & Hotbar Contract (Composer 1 + Mission 04C)

**Audience:** Farming/tools agents (Composer 1) và Pet Experience (04C).  
**Không** đổi tilemap/world layout (Composer 3).

## Held item (single source)

| Field | Type | Notes |
|-------|------|--------|
| `itemSku` | string \| null | Catalog SKU |
| `itemKind` | `food` \| `toy` \| `water_pitcher` \| `tool` \| `none` |
| `ownerScope` | `shared` \| `user:<uuid>` | Mission 02 quality stacks |
| `quality` | `normal` \| `silver` \| `gold` | |
| `slotIndex` | 0–5 | Hotbar slot |

Emit: `gameEventBus.emit('cmd:sync-held-item', held)`.  
Resolver: `resolveContextualActions` + `executeMainGameContextAction`.

## Hotbar projection (V0.2 shared)

**Single module:** `src/shared/interaction/hotbarContract.ts` + `inventoryHotbarAdapter.buildHotbarSlotsFromInventory`.

| Group | Constant | J-key when care active | Authority |
|-------|----------|------------------------|-----------|
| Pet food/toy/water | `PET_CARE_HOTBAR_SKUS` | `offer_food` / `roll_toy` / care HUD | `consumeHandFood` or scene-only (water brush) |
| Farm tools/seeds | `FARM_TOOL_HOTBAR_SKUS` (C1 extends) | `resolveContextualActions` on plot | #14 RPC — **not** `evt:pet-care-request-consume` |

Rules:

1. One held item via `cmd:sync-held-item`; slot 1–8 chọn trước khi **J**.
2. Care mode: `isPetCareModeActive()` routes food → `evt:pet-care-request-consume` (never client debit).
3. Care mode + `itemKind === 'tool'`: world/farm actions only (C1); pet scene ignores farm SKU until plot interact.
4. Adding a farm SKU: append to `FARM_TOOL_HOTBAR_SKUS`, map `hotbarSkuToHeldKind`, add resolver branch — **do not** duplicate allowlist in `App.tsx`.

Backfill: `ensurePetCareStarterPackIfMissing` on GET `/inventory` when pet exists.

## Care mode (isolated scene)

| Event | Direction | Role |
|-------|-----------|------|
| `cmd:pet-care-mode` | UI → Phaser | WorldScene launches `PetCareScene` |
| `evt:pet-care-mode` | Phaser → UI | HUD overlay |
| `cmd:pet-care-action` | UI → `PetCareScene` | toy/food/brush/call |
| `cmd:pet-care-stroke` | UI → Scene | vuốt (HUD fallback) |
| `evt:pet-care-request-consume` | Scene → App | **authority** debit + vitals |

Renderer: `src/game/pet/care/` — **not** WorldScene tile layers.

## Authority (PR #10 aligned)

- Bowl fill: `applyPetCare('fill_food'|'fill_water')` — existing.
- Hand feed in care: `consumeHandFood` — dev LAN `POST /pet/consume-hand-food`; production Supabase RPC `pet_consume_hand_food` (migration `20261125001200`, aligns with PR #10).
- Không client-mutate vitals; sau success: `cmd:sync-pet` + `refreshInventory`.
- Living `?living-pet=1` overworld brain vẫn presentation-only; **care eat** luôn qua server khi có backend.

## Tool extension (farming)

1. Thêm SKU vào catalog + inventory rules.
2. Extend allowlist nếu cần hotbar.
3. Map `itemKind` trong `inventoryHotbarAdapter.skuToHeldKind`.
4. Thêm branch `executeMainGameContextAction` **hoặc** care `PetCareActionKind` — không fork pet state.