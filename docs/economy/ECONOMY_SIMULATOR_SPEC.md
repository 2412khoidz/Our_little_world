# Đặc tả Economy Simulator & Toàn vẹn Giao dịch (`ECONOMY_SIMULATOR_SPEC`)

*Kết hợp kinh nghiệm từ `webfarmville/scripts/balance-sim.ts`, `harvest-hollow/tools/economy-model.mjs`, `review-m0-determinism-economy.md` và quyết định kiến trúc **K2**.*

---

## 1. Thiết kế Economy Simulator (`src/shared/economy/sim/` + `scripts/economy-sim.ts`)

- **Kiến trúc:** Thuần TypeScript trong `src/shared/economy/sim/`, chạy headless qua Node (`tsx` hoặc Vitest) ở hàng nghìn phiên chơi mà không cần Phaser, DOM hay Postgres.
- **Seeded PRNG:** Dùng `mulberry32(seed)` deterministic để mọi báo cáo bất thường đều tái lập 100%.
- **7 Persona bắt buộc kiểm thử (Đánh giá tại mốc Ngày 7, 30, 90, 180):**
  1. `casual` (vào 1–2 lần/ngày × 10–15 phút, làm đủ việc nhẹ)
  2. `solo` (chỉ 1 người chơi tích cực, người kia tạm bận)
  3. `coop` (cả 2 cùng online điều phối trồng + nấu ăn + đơn)
  4. `optimizer` (chọn công thức có xu/phút cao nhất để kiểm tra monoculture)
  5. `decorator` (ưu tiên mua nội thất, ít cày nấu ăn/đơn)
  6. `long_absence` (nghỉ 14–30 ngày rồi quay lại — kiểm tra `0` thiệt hại phá sản)
  7. `mixed_craft_fish` (ưu tiên câu cá + chế biến thay vì trồng trọt)

### Tiêu chí Kiểm tra Tự động (`Assertions`) của Simulator
- **Inventory & Currency Invariants:** $\text{wallet} = \text{start} + \sum\text{earned} + \sum\text{granted} - \sum\text{spent}$; không số lượng item hay xu nào `< 0`.
- **Zero Arbitrage:** Kiểm tra toàn bộ đồ thị công thức; không tồn tại vòng lặp mua shop → bán/chế biến tức thời tăng xu.
- **Zero Economic Deadlock:** Đặt lại `wallet = 0`, `inventory = {}` ở bất kỳ ngày nào → persona hồi đủ tiền mua hạt trong < 10 phút thực chơi bằng hái thảo mộc và Shipping Bin ở profile V0.2.0. Chạy profile farm/fish riêng theo mốc.
- **Dominant Strategy Guard:** Không có 1 chiến lược đơn lẻ nào vượt quá `2.2×` tốc độ kiếm ròng của chiến lược cân bằng đa dạng sau khi tính `Soft Saturation`.

---

## 2. Toàn vẹn Giao dịch Server-Side (`Transaction Integrity — K2`)

Mọi thay đổi ví xu và kho đồ đều thực thi phía Postgres qua RPC `SECURITY DEFINER` (**DevLanBackend triển khai hợp đồng tương đương 100%**):

| Bảng Postgres (Dự kiến `V0.1.5 / V0.2.0`) | Vai trò & Ràng buộc cứng |
|---|---|
| `item_catalog` | Nguồn giá, nguyên liệu, stack limit, `collection` ở server (read-only cho client) |
| `world_wallet` | `(world_id PK, coins bigint CHECK (coins >= 0), updated_at)` |
| `inventory_items` | `(id, world_id, owner_scope text CHECK (... 'shared' hoặc 'user:<uuid>'), item_sku, qty integer CHECK (qty > 0))` · `UNIQUE(world_id, owner_scope, item_sku)` |
| `economy_ledger` | Bảng append-only ghi `(id, world_id, actor_id, kind, delta_coins, items_delta_jsonb, reason, idempotency_key, created_at)` · `UNIQUE(world_id, idempotency_key)` |

### Luật Chống Gian lận & Xung đột Đôi (`Concurrency & Security`)
1. **Không nhận giá từ Client:** RPC `economy_apply_transaction(world_id, action_type, payload, idempotency_key)` nhận payload theo action. Với buy/sell, chỉ nhận SKU và số lượng hợp lệ 1–999; với forage, chỉ nhận ID điểm hái; toàn bộ giá mua/bán đọc từ `item_catalog` + hệ số `saturation` trong DB.
2. **Khóa hàng `worlds FOR UPDATE`:** Nếu Mây và Nắng cùng bấm mua món cuối hoặc cùng thu hoạch/nộp 1 đơn hàng vào 1 mili-giây → giao dịch đến sau chờ khóa, phát hiện không đủ xu/đơn đã xong và trả lỗi có cấu trúc (`INSUFFICIENT_FUNDS` / `ORDER_ALREADY_FILLED`), **tuyệt đối không âm tiền hay lặp thưởng**.
3. **Idempotency Replay:** Mất mạng khi bấm Bán / Nhận thưởng → server kiểm tra membership rồi kiểm tra đúng actor, action và payload của khóa cũ trong cùng transaction. Trùng hoàn toàn thì trả kết quả lưu lúc commit; khác actor/payload thì báo xung đột và bảo vệ kết quả cũ.
4. **RNG đặt hàng / cá hiếm:** `seed` sinh từ server (`pgcrypto` / server secret + sequence), client không được chọn `seed` hay `entity_id` để lách tỉ lệ hiếm (bài học #2 từ `harvest-hollow/docs/design/review-m0-determinism-economy.md`).
5. **RLS:** Chỉ thành viên hợp lệ (`public.is_world_member(world_id)`) được đọc ví/kho chung; túi cá nhân `user:<uuid>` chỉ hiển thị cho đúng `auth.uid() = owner_uid` cho tới khi chuyển vào hộp thư làm quà.

## 3. Đầu ra và phạm vi theo mốc

Báo JSON có seed, phiên bản config, profile milestone, persona và các mốc 7/30/90/180 ngày. Mỗi mốc ghi thu nhập ròng, số dư, định giá kho, thời điểm mở khóa, nguồn/đích xu, xu/phút solo/co-op, nhóm bán tập trung nhất và biến động giá theo nhóm. Kiểm tra chu trình tài nguyên/sell, trần thu gom, thử ví trống kể cả khi nhu cầu thấp. In seed và chuỗi action khi lỗi để tái lập. Cơ chế chưa ship chỉ có trong profile mô phỏng về sau.
