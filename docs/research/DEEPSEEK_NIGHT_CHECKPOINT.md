# Checkpoint — DeepSeek Night Session (V0.2–V0.3 domain modules)

Ngày: 25/11/2026 · Nhánh: `deepseek/night-dev` · Baseline: `34f58c7`

Phạm vi: các module domain thuần TypeScript thuộc V0.2–V0.3. **Không** đụng
renderer, UI, Inventory, Pet, Pomodoro, Mailbox, Supabase, SQL migration hay
`WorldBackend`. Mọi module dưới đây là logic chưa được tích hợp vào gameplay
chính — chưa phải gameplay hoàn chỉnh.

## 1. Trạng thái module

| Module | Mốc | Trạng thái | Test | Commit |
|---|---|---|---|---|
| Economy config + ledger math + arbitrage | V0.2.0 | Hoàn thành (domain) | 37 | `ec12ed5` |
| Economy simulator + `npm run economy:sim` | V0.2.0 | Hoàn thành; profile V0.2.0 chạy thật, profile V0.2.1+ là giả định | 14 | `fe81eb6` |
| Farming (cây trồng, tưới, chất lượng, tái sinh, lai hoa) | V0.2.1 | Hoàn thành (domain) | 22 | `abcb059` |
| Minigames (Caro, Othello, Battleship, Memory) | V0.2.5 | Hoàn thành (rules) | 46 | `e7bb312` |
| Fishing (encounter + FSM giữ để kéo) | V0.2.2 | Hoàn thành (prototype) | 26 | `68e0f5c` |
| Cooking (co-op, nhiệt/thời gian, đơn nhà hàng) | V0.3 | Hoàn thành (prototype) | 38 | `f6e6ef6` |
| Cross-module SKU contract | — | Hoàn thành | 10 | `e6e209b` |
| RNG dùng chung | V0.2.0 | Hoàn thành | (qua các module) | `ec12ed5` |

Tổng: **224 test** trong 16 file (bao gồm test sẵn có của V0.1), typecheck và
lint sạch.

## 2. API contract (rút gọn)

```ts
// src/shared/economy/catalogConfig.ts
ITEM_CATALOG: readonly ItemDefinition[]        // 34 SKU ổn định, có milestone
computeSellPrice(sku, quality?, saturationCount?, overrides?): number
computeSellPriceBp(...) / computeSellLot(sku, quality, startCount, qty): SellQuote
validateCatalog(): { ok, errors, warnings }
deriveStandardValueBp(item): number            // công thức V_i = (Σa·V + w·L + D)/qty
catalogFingerprint(): string                   // neo báo cáo vào một revision config

// src/shared/economy/ledgerMath.ts
mulBp(amount, bp) / divFloor(amount, divisor)
saturationMultiplierBp(unitIndex, config)       // sàn 0.70
createWallet / applyLedgerEntry / applyItemDelta / replayLedger
// invariant: wallet = start + Σearned + Σgranted − Σspent, không bao giờ âm

// src/shared/economy/arbitrage.ts
analyzeArbitrage(): { findings, timeGatedItems, ok }   // direct + multi-step zero-wait

// src/shared/rng.ts
mulberry32(seed) / createRng(seed) -> RngStream { next, int, chance, pick, weighted, shuffle }
hashSeed / deriveSeed(base, ...parts)

// src/shared/farming  → createFarm, plant, water, harvest, breedFlowers, CROP_DEFINITIONS
// src/shared/fishing  → rollEncounter, createFishingState, cast, tick, press, release
// src/shared/cooking  → createCookingSession, applyCookingAction, getOrderConstraints
// src/shared/minigames→ CARO/OTHELLO/BATTLESHIP/MEMORY + MINIGAME_REGISTRY
```

Tất cả hành động gameplay trả về `{ ok: true, ... } | { ok: false, code, messageVi }`
(hoặc ném lỗi có `code` + `messageVi` với minigame/Fishing). Không module nào
cấp xu hay vật phẩm: phần thưởng thuộc tầng server/economy.

## 3. Cách chạy

```bash
npm run economy:sim                       # audit đầy đủ, 1000 phiên × 180 ngày, ~0.9s
npm run economy:sim -- --seed=42 --sessions=200 --days=90
npm run economy:sim -- --json > report.json
npx vitest run tests/unit/economySim.test.ts
npx vitest run tests/unit/farming.test.ts tests/unit/fishing.test.ts \
  tests/unit/cooking.test.ts tests/unit/minigames.test.ts tests/unit/domainIntegration.test.ts
```

`economy:sim` chạy bằng Node ≥ 22.18 (type stripping), **không thêm dependency**.
Vì vậy các import nội bộ trong `src/shared/economy/**` dùng đuôi `.ts` tường minh;
Vite/Vitest resolve bình thường.

## 4. Kết quả simulator (seed `20261125`, config `7076075b`)

| Hồ sơ | Thu nhập ròng / phút (ngày 180, 7 persona) | Ghi chú |
|---|---|---|
| V0.2.0 (chỉ hái lượm + Shipping Bin) | 3,1 – 3,9 xu/phút | đúng phạm vi V0.2.0, không giả định farming/fishing/cooking |
| V0.2.1 (+ 12 ô đất) | 5,8 – 10,2 xu/phút | nông trại đẩy thu nhập lên ~2× mục tiêu pacing |
| V0.2.2 (+ câu cá) | tương đương V0.2.1 | cá hiếm 6–10 xu/phút, cạnh tranh với trồng trọt |
| V0.3.0 (+ nấu ăn, giả định) | 4,4 – 7,6 xu/phút | nấu ăn **không** nâng thu nhập; xem mục 5 |

- **Invariant:** 0 vi phạm trên 1000 phiên × 180 ngày; ví/kho không âm.
- **Arbitrage:** 0 finding; 18 SKU bị chặn bởi thời gian sản xuất.
- **Deadlock:** 0; đường phục hồi ví 0 = 75 giây (1 lần hái 60s + 1 lần bán 15s → 5 xu ≥ 4 xu), đạt mục tiêu < 10 phút.
- **Offline:** persona `long_absence` nghỉ 14–30 ngày không mất xu, không mất cây.
- **Dominant strategy:** tỉ lệ monoculture/cân bằng = **1,22 – 1,33** (trần 2,2) → đạt.

## 5. Vấn đề cân bằng phát hiện được (báo cáo thật, không sửa assertion)

1. **Nông trại nhanh hơn pacing thiết kế ~2×.** Với 12 ô đất, persona casual đạt ~9,7 xu/phút; mục tiêu "nội thất đẹp 180 xu trong 30–60 phút" tương đương 3–6 xu/phút. Nguyên nhân: mỗi chu kỳ cây chậm (cải bắp 120 phút, dâu 90 phút) chỉ tốn 60 giây thao tác mà lãi 14 xu → ~14 xu/phút cho riêng cây trồng, trong khi thời gian mọc là offline.
2. **Ngưỡng bão hòa mềm 20 đơn vị/ngày/nhóm không chặn được cây chậm.** 12 ô × 1 chu kỳ/ngày = 12 đơn vị < 20, nên cải bắp/dâu/hồng không bao giờ bị giảm giá; ngưỡng chỉ tác động lên lúa mì (nhiều chu kỳ/ngày). Hệ quả: cây lãi cao–chậm là chiến lược tốt nhất và không bị cơ chế chống monoculture làm giảm.
3. **Nấu ăn không có lợi thế kinh tế.** `carrot_soup` bán 42 xu, nguyên liệu 2 cà rốt (30) + thảo mộc (5) = 35 xu → lãi 7 xu cho 240 giây nấu = 1,75 xu/phút, thấp hơn trồng trọt. Đúng tinh thần "chế biến không bắt buộc lãi hơn bán thô", nhưng V0.3 cần đơn nhà hàng (1,6–2,0×) mới có động lực nấu; simulator **không** mô phỏng Order Board/Restaurant vì chưa triển khai.
4. **Caveat phương pháp luận:** persona optimizer chỉ trồng trọt nên sau khi lấp đầy 12 ô sẽ ngồi không; "xu/phút" đo trên toàn bộ thời lượng phiên chơi (không phải thời gian bận rộn), nên tỉ lệ 1,22–1,33 là cận trên hợp lý cho chiến lược độc tôn. Guard 2,2× vẫn đạt nhưng biên an toàn không lớn.
5. **Hai lỗ hổng dữ liệu thiết kế** (đã thành cảnh báo trong `validateCatalog`):
   - `carp_pond`: bảng ghi V = 11,0 nhưng công thức cho 12,0 (lệch 1 xu ở dòng cá; `herb_carp` được tính theo 11,0).
   - `peach`: có giá bán nhưng không có SKU cây giống → hiện **không thể sở hữu hợp lệ**; farming dùng `sapling_peach` (SKU chưa tồn tại trong catalog) và simulator loại `peach` khỏi mô phỏng.

## 6. Giả định đã ghi rõ (không phải số liệu thiết kế)

- Thời gian mọc cà rốt = 15 phút (bảng không ghi); đào = 180 phút/chu kỳ, tái sinh 120 phút.
- Nước tưới giảm 25% thời gian mọc (theo GAME_DESIGN §2) — farming và simulator không mô phỏng tưới trong tính toán thu nhập.
- Thời gian thao tác: hái 60s, gieo 30s, thu 30s, câu 180s, nấu 240s, bán 15s.
- Điểm hái hồi 1 đơn vị/3 phút; 2 điểm gần cổng.
- Vườn khởi đầu 12 ô (WORLD_PROGRESSION §2: 12 → 24 → 36 khi mở rộng V0.2.4).
- Ví khởi đầu 120 xu (theo ghi chú BALANCING_PLAN).
- Fishing: cần câu bậc 2 cho `lotus_trout`; simulator chưa mô hình hoá bậc cần câu (luôn cho phép).
- Battleship: tàu được phép chạm nhau; Othello tự động chuyển lượt khi đối phương bị chặn.

## 7. Việc cần Neon/GPT hoàn thành (pending integration)

| Việc | Chủ sở hữu | Ghi chú |
|---|---|---|
| `item_catalog` SQL + generator từ `ITEM_CATALOG` | Neon (Inventory/OLW-015-01) | Chưa tạo migration để tránh xung đột; `stable SKU` + `milestone` + `stackLimit` đã sẵn sàng |
| `EconomyBackend` (RPC buy/sell/forage, ledger, idempotency) | Neon/Codex (OLW-020-02/03) | Domain đã có `applyLedgerEntry`/`replayLedger` để đối chiếu vector |
| Order Board 3 slot + NPC Bác Hai Mùa UI | Neon (OLW-020-05) | Simulator hiện không mô phỏng order/restaurant |
| Gắn `farming` vào `garden_plots` (server `ready_at`) | Neon | Domain đã nhận `nowMs` tường minh |
| `sapling_peach` SKU + giá | Chủ dự án quyết định | Thiếu trong PRODUCTION_CHAINS |
| Wire renderer/UI cho 4 mini-game | Neon | Rules đã thuần, serializable, có `publicStateFor` |

## 8. File dễ xung đột khi merge

- `package.json` — chỉ thêm 1 dòng `"economy:sim"`.
- `tsconfig.node.json` — chỉ thêm 1 dòng `"scripts/economy-sim.ts"`.
- `THIRD_PARTY_NOTICES.md` — file mới; nếu Neon/GPT cũng tạo file này, giữ cả hai phần.
- `tests/unit/economyCatalog.test.ts` — pin số cảnh báo catalog; cập nhật khi sửa catalog.
- `src/shared/economy/sim/config.ts` — số liệu cân bằng; đổi ở đây rồi chạy lại `npm run economy:sim`.

## 9. Hướng dẫn tích hợp vào game chính

1. **Giá & ví:** import `computeSellPrice`, `mulBp`, `applyLedgerEntry` từ
   `src/shared/economy`. Không tính giá ở client khi gọi RPC: server đọc
   `item_catalog` + đếm bão hòa trong DB.
2. **Trồng trọt:** `WorldScene`/UI gọi `plant(farm, { plotIndex, cropSku, nowMs })`
   với `nowMs` từ server; render trạng thái từ `growthProgress03`. Không bao giờ
   dùng `Date.now()` trong domain.
3. **Câu cá:** `rollEncounter` chạy server-side (seed server) và trả `EncounterResult`;
   client chỉ chạy FSM `cast/tick/press/release` để hiển thị, rồi gửi kết quả
   `landed` để server cấp cá.
4. **Nấu ăn:** mỗi người một role; `applyCookingAction` kiểm tra đúng vai. Đơn nhà
   hàng dùng `getOrderConstraints` trước khi trao thưởng.
5. **Mini-game:** lưu `state` JSON + `version`; mỗi nước đi gọi reducer với
   `actorId` và `expectedVersion`. Với Battleship chỉ gửi `publicStateFor(...)`
   cho đối phương qua Realtime.
6. **Kiểm tra trước khi merge:** `npm run lint && npm run typecheck && npm run test && npm run economy:sim`.
