# MISSION 04B-3B — Living Pet + Server Authority (prep)

**Chờ:** PR #10 authority remediation merge. **Không** bắt đầu SQL/RPC trong mission này trước khi PR #10 sẵn sàng.

## Seam đã có (04B-3A)

| Piece | Path |
|-------|------|
| Local sim flag | `petLivingDevFlag.ts` |
| Authority port | `petAuthorityPort.ts` → `DevNoOpPetAuthorityPort` |
| Brain + movement | `PetLivingMainGameDriver.ts` |
| Food offer (presentation) | `cmd:pet-local-food-offer` → brain input only |

## 04B-3B wiring plan

1. **`SupabasePetAuthorityPort`** implements `PetAuthorityPort`:
   - `submitMovementProposal` → RPC đã merge từ 04B-2 (không client-complete).
   - `submitBrainCompletion` / `submitFoodOfferIntent` → server validation + inventory receipt.
2. **Feature flag split:** tắt `?living-pet=1` local sim khi authority port = server và phiên paired.
3. **`WorldScene`:** feed `foodOffer` từ server-approved intents; không gọi `cmd:pet-local-food-offer` trong production path.
4. **Tests:** contract tests against RPC fixtures; không mở rộng E2E multi-client pet sync cho đến khi shared state RPC có.

## Không làm trong 3B cho đến khi #10 green

- Debit kho / affection persistence
- Multiplayer autonomous pet đồng bộ
- Consumption từ `offer_food_pet` mà không có server ack