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

## Hotbar projection (V0.1.5)

`buildHotbarSlotsFromInventory` — allowlist `MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST`.  
Pet care SKUs: `fish_salmon_bite`, `toy_yarn`, `toy_cardboard_box`, `water_pitcher`, kibble.  
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