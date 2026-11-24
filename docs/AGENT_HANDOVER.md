# Sổ tay Bàn giao Coding Agent (`AGENT_HANDOVER`)

*Quy chuẩn vận hành cho **DeepSeek V4.1 Flash** (triển khai tính năng từ đặc tả) và **Neon / Codex** (kiến trúc, SQL/RLS nhạy cảm, review mốc lớn).*

---

## 1. Quy trình Đọc Tài liệu Trước Khi Nhận Task (Tiết kiệm Context)

Không nạp toàn bộ repository vào context. Với mỗi `Task ID` trong [IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md):
1. Đọc [AGENTS.md](../AGENTS.md) và đúng block của **`Task ID`** trong `IMPLEMENTATION_BACKLOG.md`.
2. Đọc đúng file đặc tả được trỏ trong mục **`Source references`** của task đó (ví dụ task Economy chỉ đọc `ECONOMY_SIMULATOR_SPEC.md`, task Art chỉ đọc `ASSET_PIPELINE.md`).
3. Bắt đầu với các file Relevant files và tìm symbol bằng rg. Kiểm tra callers, tests và state tương thích trước khi đổi contract.

---

## 2. Phân công Vai trò & Quy tắc Báo cáo

| Vai trò | Phạm vi chịu trách nhiệm | Đầu ra bắt buộc sau mỗi task |
|---|---|---|
| **DeepSeek V4.1 Flash** | `src/shared/*` (domain logic, reducer, math, simulator), React modals/UI theo thiết kế cố định, sprite wiring Phaser 4, `DevLanBackend` handler, Vitest unit & contract tests | Diff gọn đúng `Scope`, liệt kê file đã sửa, chạy đủ lệnh kiểm thử và báo đúng kết quả |
| **Neon / Codex (Review)** | Mọi file trong `supabase/migrations/`, `supabase/dev-migrations/`, Postgres RPC `SECURITY DEFINER`, RLS policies, **Sim-Host Election (K3/K4)**, Cinema transport/token bảo mật, thay đổi `WorldBackend` | Phê duyệt thiết kế / rà soát lỗi đồng thời, idempotency, prod guard |

---

## 3. Bộ Lệnh Kiểm chứng Bắt buộc (`Definition of Done`)

Sau khi sửa code/tài liệu xong, chạy tuần tự và báo kết quả thực tế (cấm suy diễn hay bỏ qua test):
```bash
npm run lint          # Phải đạt 0 errors, 0 warnings
npm run typecheck     # tsc --noEmit phải exit 0 (lưu ý strict noUncheckedIndexedAccess)
npm run test          # Vitest toàn bộ suite pass 100%
npm run build         # tsc -b + vite build + sinh dist/sw.js
node scripts/verify-prod-guard.mjs   # Bắt buộc 0 leaks dev/cheat/asset-candidates trong dist/
npm run test:e2e      # Chạy khi sửa UI/luồng multiplayer/game viewport
```

---

## 4. Danh sách Cấm Kỵ & Khi Nào Phải Dừng Hỏi (`Escalate`)

- **CẤM:** Tự mở rộng phạm vi sang milestone sau (*scope creep*); sửa trực tiếp `src/shared/` để gọi `fetch`/Supabase; tạo button giả cho tính năng chưa code; đưa asset `asset-candidates/` hay file `.zip/.aseprite` vào `public/` hoặc `dist/`; gửi dữ liệu người dùng tới LLM; đề xuất dịch vụ trả phí mặc định.
- **BẮT BUỘC DỪNG & BÁO `Neon` / Chủ dự án NẾU:**
  1. Phát hiện thay đổi yêu cầu sửa 3 migration V0.1 đã khóa (`20261124000100..0300`).
  2. Gặp xung đột hợp đồng `WorldBackend` hoặc `DevLanBackend` không thể map giống SQL RPC.
  3. Cần quyền tài khoản cloud, xác nhận asset/quyền chi, hoặc nghiệm thu trên Safari thật. Ghi phần chờ và tiếp tục phần độc lập đã được giao.

## 5. Trạng thái tích hợp mỹ thuật

**OLW-010-01..03 đã hoàn thành** theo PD-01 cập nhật. Máy phát triển dùng atlas riêng tạo từ pack Demo E sẵn có. Atlas public dùng nguồn đã xác minh. Đọc [checkpoint](research/TAKEOVER_CHECKPOINT.md#olw-010-03--world-integration-đã-hoàn-thành) và [quy trình asset](art/ASSET_PIPELINE.md#4-tạo-bản-phát-triển-riêng-và-bản-public) trước khi tiếp tục. OLW-010-04 trở đi mở khi được giao. V0.1.5 chỉ mở sau nghiệm thu V0.1.

Mẫu bàn giao một task: ID và trạng thái · file/symbol đã sửa · contract và invariant chính · lệnh/kết quả thực chạy · evidence thiết bị thật hoặc mục pending · quyết định/giả định cần review · task kế tiếp. Không gửi nội dung private, secret hay file media sang coding agent khác.
