# Mission 02 — SQL Foundation checkpoint

Nhánh `codex/mission-02-sql-foundation` từ `98a035fe3e551bbf9f1b6682649194df9dd0c904`. PR #1 đã merge vào integration. Mục này đang tiến hành.

## Migration history

Chủ dự án xác nhận hai migration trùng version chưa áp vào database có dữ liệu cần bảo toàn. Các lần PostgreSQL trước chỉ trên database tạm, dữ liệu chơi thử qua Dev LAN. `v01_security_hardening` đã đổi từ `20261125000100` sang `20261125000000`, đứng sau ba migration core và trước Inventory. `node scripts/check-migration-versions.mjs` hiện pass. Các file đã có khác giữ nguyên version.

## Công việc độc lập đã chuẩn bị

- `node scripts/generate-item-catalog-sql.ts` tạo SQL sinh từ K5 và Economy hiện tại. Nó kiểm SKU trùng, giữ fingerprint `7076075b`, giữ tên, mục đích, stack limit K5. Các group Economy được ánh xạ vào purpose hiện có. Migration 00700 dùng dữ liệu được sinh, duy trì fingerprint. Group được ánh xạ vào purpose K5 hiện tại, tradeable của các SKU Economy để false. Giá và sell channel chưa đưa vào SQL, nên chưa bật Shipping Bin hoặc shop.
- PWA E2E chờ game tự đăng ký Service Worker, kiểm worker điều khiển trang trước và sau offline reload. Không gọi `register` trong test.

## API cho Composer/Grok

- `inventory_get(world_id)` trả thêm `quality` trên từng hàng. Hàng cũ backfill `normal`. Định danh mới gồm world, scope, SKU và quality. Giới hạn stack là tổng các tier cho từng scope/SKU. Helper nội bộ `_inventory_adjust_quality` giữ khóa world và không cấp quyền client. Helper cũ gọi tier normal để bảo toàn pet và mailbox.
- `pet_adopt_or_rename(world_id, name, expected_version, idempotency_key)` là RPC nhận nuôi hiện có. `pet_care_bowls` có RLS chỉ cho thành viên đọc. RPC `pet_care_apply(world_id, pet_id, action, expected_version, scope, sku, quality, idempotency_key)` nhận `fill_food`, `eat_food`, `fill_water` hoặc `drink_water`. Bowl khởi tạo version 1 khi gọi đầu tiên. Response có `bowl` và `pet`. Tất cả mutations khóa world → pet → bowl/inventory, gắn actor/action/request vào receipt. Thức ăn hiện hỗ trợ `pet_kibble_basic` normal, từ shared hoặc scope của chính người gọi. Retry cùng key và payload trả cùng kết quả.
- Thử nghiệm mới kiểm trừ đúng một món, retry, stale version, từ chối khi no và dung lượng nước. Chưa có proximity/server simulation authority, RNG/preferences, pitcher có nguồn hữu hạn hay CAS riêng cho pet; RPC chưa được nối vào gameplay. Chưa coi vertical slice là hoàn thành.
- Fresh và upgrade trên PostgreSQL 18.6 loopback với fixture auth/realtime pass năm SQL suites hiện có và hai suite quality/care. Kịch bản hai session hiện xác minh inventory, feeding MVP, invite và retry. Cần thêm concurrency tests riêng cho bowl, quà quality, TS/Postgres parity, RLS/JWT trên Supabase Test và server-authoritative harvest/fishing/cooking/market trước khi bật gameplay có thưởng.

## Công việc còn lại

- Thống nhất catalog thành nguồn duy nhất thay vì kết hợp hai nguồn hiện có. Review mapping purpose/tradeable, giữ sell channels, bổ sung quality-aware transfer và gift. Không tự thay đổi giá hay fingerprint.
- Hoàn thiện physical care bằng authority cho vị trí, quyết định ăn/từ chối, memory/affection và các food SKU đã duyệt. Các domain khác tiếp tục dùng `gameplay/actionContracts.ts` với server time/RNG, business uniqueness và transaction inventory/ledger.
- TS/PostgreSQL parity, migration runner Supabase và concurrency của bowl chưa được kiểm. Không có SQL được áp lên Supabase Cloud.

## Kiểm thử

Xem kết quả kiểm chứng cuối trong PR. PWA regression kiểm game tự đăng ký Service Worker. Không chỉnh artwork, UI, map hay balance.
