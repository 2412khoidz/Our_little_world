# Mission 02 — SQL Foundation checkpoint

Nhánh `codex/mission-02-sql-foundation` từ `98a035fe3e551bbf9f1b6682649194df9dd0c904`. PR #1 đã merge vào integration. Mục này đang tiến hành.

## Migration history — blocker

Hai file `20261125000100_v01_security_hardening.sql` và `20261125000100_v015_inventory_and_catalog.sql` trùng version. Workspace không có thông tin liên kết hay lịch sử database cần bảo toàn. Đã yêu cầu chủ dự án xác nhận các file đã áp theo từng database. Không đổi tên hoặc áp migration khi chưa có bằng chứng.

Chạy `node scripts/check-migration-versions.mjs` để phát hiện trùng version. Lệnh hiện exit 1 vì xác định đúng xung đột đã tồn tại. Bài unit kiểm cả trường hợp trùng và tên hợp lệ. Khi có lịch sử, giữ nguyên mọi version đã áp, chọn version chưa dùng cho file còn lại, bảo đảm thứ tự core → hardening → inventory → pet → study → mailbox → các bản vá. Rồi chạy guard, fresh install và upgrade với migration runner thực.

## Công việc độc lập đã chuẩn bị

- `node scripts/generate-item-catalog-sql.ts` tạo SQL preview từ K5 và Economy hiện tại. Nó kiểm SKU trùng, giữ fingerprint `7076075b`, giữ tên, mục đích, stack limit K5. Các group Economy được ánh xạ vào purpose hiện có. Cần review ánh xạ và tradeable trước khi đưa vào migration. Preview không chứa giá, chưa hợp nhất hai nguồn thành một catalog chính thức và chưa tạo quyền bán. Không chạy preview trên database production.
- PWA E2E chờ game tự đăng ký Service Worker, kiểm worker điều khiển trang trước và sau offline reload. Không gọi `register` trong test.

## Hợp đồng cần thực hiện sau migration history

1. Giữ inventory scope `shared` hoặc `user:<auth.uid()>`, lock world trước inventory, atomic cả ledger và tồn kho. Khóa replay theo world, actor, action và request fingerprint, kèm business key cho mỗi chu kỳ để chặn yêu cầu mới nhận thưởng lần hai.
2. Backfill quality `normal`, áp `normal/silver/gold` theo SKU. Trước khi đổi unique key phải cập nhật toàn bộ `_inventory_adjust_item`, `inventory_get`, mailbox send/open, pet và caller đang giả định một hàng mỗi SKU. Kiểm tổng stack limit theo scope/SKU và tính riêng từng quality trong cùng transaction. Không phát hành schema quality nửa vời.
3. Physical feeding cần world/pet/version, SKU/quality, nguồn kho hợp lệ và operation key. Server tự xác thực thành viên, chọn thời gian và kiểm trạng thái care. Trừ thức ăn, cập nhật bowl/pet/memory, version và receipt trong một transaction. Replay cùng actor/request trả kết quả đã lưu, khác payload báo conflict. Hai người cho ăn cùng lúc không được tiêu thụ hay cộng affection hai lần.
4. Food/water bowl, adoption và petting cần xác định lifecycle và server authority tương thích với `petPhysicalCare.ts` và `gameplay/actionContracts.ts`. Chưa có RPC mới hoặc quyền client dùng trực tiếp helper.
5. Harvest, fishing, cooking, shipping bin và NPC shop tiếp tục dùng domain DeepSeek. Server giữ thời gian/RNG và phiên, xác minh state/version, áp business uniqueness và idempotency transaction cùng inventory/ledger. Không chấp nhận reward do client tự báo.
6. Chạy SQL RLS và quyền EXECUTE với JWT thật ở Test, test cạnh tranh và retry, SQL/TS parity cho giá và basis points. Không báo PostgreSQL atomicity đã đạt nếu chưa có các giao dịch này.

## Kiểm thử

Lint, typecheck, 460 Vitest và build đã chạy trước khi thêm test catalog, E2E PWA 1/1 pass. Chạy lại suite đầy đủ khi tiếp tục. Chưa chạy SQL fresh/upgrade cho mission vì version còn trùng. Không chỉnh artwork, UI, map hay balance.
