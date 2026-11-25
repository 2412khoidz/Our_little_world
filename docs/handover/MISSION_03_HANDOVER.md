# MISSION_03_HANDOVER — Physical Interaction in Main Game

## Trạng thái

Game chính tại `/` có **hotbar từ inventory thật**, **J/K contextual actions**, **held item trên avatar** (khi chọn slot), **mobile nút J/K** (chỉ mobile), và **diegetic prompts** — không cần `?experience-demo=1`.

## Hoạt động trong game chính

| Tính năng | Ghi chú |
|---|---|
| WASD / arrows / joystick | Không đổi (`WorldScene`) |
| Hotbar 1–8 | `buildHotbarSlotsFromInventory` — chỉ đọc, không trừ kho client |
| Held item sprite | `HeldItemRenderer` trên `WorldScene` |
| J / K / I / Escape | `MainGameInteractionLayer` + `isEditableInputTarget` |
| Diegetic: wardrobe, study, mailbox, photo, sofa/bed/bench, portal | Map sang `gameEventBus` events hiện có |
| Cho ăn bằng J | Chỉ `pet_kibble_basic` → `backend.pet.interactPet('feed')` |
| Vuốt ve bằng J (không cầm đồ) | `interactPet('pet')` |
| Mobile J/K buttons | Chỉ `max-width: 768px`; không D-pad thừa desktop |

## Independent review remediation (post-implementation)

| ID | Nội dung |
|---|---|
| P0 | Held item identity: `reconcileHeldItemWithHotbar` theo `HotbarStackKey` (ownerScope + sku + quality); slot compaction + depletion |
| P1 | `validateActionAgainstLatestFrame` + `interactionMutationBusy` / local action gate — không J/K stale hoặc trùng mutation |
| P2 | `INVENTORY_HOTBAR_ADAPTER_IMPLEMENTATION=v015-shared-sku-projection`; allowlist **5 SKU** ban đầu — không dùng nguyên trạng khi quality tiers ship |

## Phụ thuộc Mission 02 (chưa authoritative)

- Đổ bát / rót nước / bình nước / đồ chơi / thức ăn ngoài hạt cơ bản → toast *Mission 02 pending*
- Trạng thái bát (đầy/trống) presentation-only cho đến khi có transaction backend
- `Mission02InventoryAdapterContract` trong `inventoryHotbarAdapter.ts` — placeholder unified catalog

## API adapter contract (Mission 02)

```typescript
// src/shared/interaction/inventoryHotbarAdapter.ts
export interface Mission02InventoryAdapterContract {
  readonly source: 'v015-inventory-snapshot' | 'unified-catalog-v2';
  buildHotbarSlots(worldId: string): Promise<HotbarSlot[]>;
}
```

Thay `buildHotbarSlotsFromInventory` bằng implementation v2 khi Codex ship catalog — **không** đổi `GameHotbar` / resolver.

## File thay đổi chính

- `src/shared/interaction/mainGameInteractables.ts`, `mainGameWorldAnchors.ts`, `inventoryHotbarAdapter.ts`
- `src/features/home/MainGameInteractionLayer.tsx`, `executeMainGameContextAction.ts`
- `src/game/scenes/WorldScene.ts` — held item + `evt:interaction-frame`
- `src/game/eventBus.ts` — `cmd:sync-held-item`, `evt:interaction-frame`
- `src/app/App.tsx` — shell wiring
- `src/features/home/GameViewport.tsx` — ẩn nearby legacy khi HUD mới
- Tests: `tests/unit/inventoryHotbarAdapter.test.ts`, `mainGameInteractables.test.ts`, `tests/e2e/main-game-physical-interaction.spec.ts`

## Conflict dự kiến với Mission 02

- Inventory SKU order / quality tiers → chỉ file adapter
- Bowl state RPC → bổ sung field `bowlPresentation` input + backend read
- Pet feed semantics nhiều loại thức ăn → mở rộng nhánh `offer_food_pet` sau RPC

## Kiểm chứng (cloud)

| Check | Kết quả |
|---|---|
| lint / typecheck | Pass |
| Vitest | **468** pass (+held identity, action gate) |
| `npm run build` + prod guard | Pass |
| `npm run test:e2e` | Pass (20+; v01 cập nhật `btn-context-primary`) |
| `npm run test:e2e:pwa` | Pass |
| Private build | Không khai khống |

## Hướng dẫn chơi thử

1. Dev LAN: seed couple → vào nhà.
2. Menu → Kho đồ → nhận hạt miễn phí (nếu có).
3. Phím `1` chọn hạt — thấy đồ trên tay avatar.
4. Đứng gần mèo / bàn học / cửa — badge **J** đổi theo hướng & khoảng cách.
5. `J` cho ăn (đã nhận nuôi, có hạt, hết cooldown).
6. `K` cất đồ đang cầm.

**Private build / artwork:** không khai khống trên cloud — visual parity Demo E vẫn cần máy local `build:private`.