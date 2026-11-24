# Công cụ Nhà phát triển & Bảo vệ Production (`DEV_TOOLS`)

*Áp dụng **K6** — Developer Console phát triển song hành với từng milestone, giúp kiểm thử tính năng ngay mà không phải cày gameplay, đồng thời khóa chặt khỏi production ở cả tầng build lẫn server.*

---

## 1. Kiến trúc Cách ly 3 Lớp (`Dev vs Production`)

```text
[Client Production Build]                      [Client Dev Build (import.meta.env.DEV)]
  ├─ Không tồn tại DevConsole UI                 ├─ DevConsole Drawer (ẩn/hiện qua phím/nút Dev)
  └─ verify-prod-guard.mjs chặn mọi marker       └─ DevLanBackend (/api/dev-lan/*) hoặc Supabase Test

[Supabase Production Project (Free #1)]        [Supabase Test Project (Free #2)]
  ├─ CHỈ áp dụng supabase/migrations/*           ├─ Áp dụng supabase/migrations/* + supabase/dev-migrations/*
  └─ KHÔNG tồn tại bất kỳ RPC dev_* nào          └─ RPC dev_* kiểm tra: auth.uid() IN dev_admins AND worlds.is_test = true
```

- **Không chỉ ẩn bằng CSS:** Khi `npm run build` chạy cho người dùng thật, Vite loại toàn bộ giao diện Dev Console, bộ chọn danh tính và `PetBrainDebugger`; **đồng thời Supabase Production không cài thư mục `supabase/dev-migrations/`** nên kể cả gọi REST API thô cũng bị Postgres từ chối (`404` / `42501`).
- **Mở rộng `scripts/verify-prod-guard.mjs`:** Mỗi khi thêm module dev mới (`dev-console`, `menu-pet-debugger`, `/api/dev-console`), phải thêm marker tương ứng vào `FORBIDDEN_PROD_MARKERS`.

---

## 2. Danh mục khả năng Dev Console Theo Milestone

> **Nguyên tắc gọn nhẹ:** Không triển khai trước câu lệnh cho hệ thống chưa có trong milestone đó.

| Milestone kích hoạt | Nhóm lệnh Dev Console (`DevActions`) | Hiện trạng (`25/11/2026`) |
|---|---|---|
| **V0.1 (Đang có + Cần test)** | 1. Đóng vai một trong hai người chơi (`Mây` / `Nắng`)<br>2. Test tài khoản thứ ba (`Khách lạ`) bị từ chối<br>3. Reset test world & tạo sẵn nhà 2/2<br>4. Giả lập mất mạng (`Simulate network loss`) & Reconnect testing | Đã có nền trên Dev LAN (`DevIdentity` + `setSimulatedOffline` trong `RealtimeHandle`); chờ nối giao diện Dev Console thống nhất |
| **V0.1.5 (`Living Home`)** | 5. Spawn / Remove item trong kho tối thiểu (**K5**)<br>6. Unlock furniture & collections đã tồn tại<br>7. Teleport nhanh giữa phòng / cổng<br>8. Chỉnh pet state cơ bản & ép Pomodoro qua phút cuối<br>9. Save snapshot JSON & Restore snapshot test world<br>10. Test animation cặp đôi & mèo | Thiết kế xong, chưa triển khai |
| **V0.2.0 (`Economy`)** | 11. Set / Add / Remove currency (`world_wallet` có ghi rõ lý do `dev_cheat` vào `economy_ledger`) | Thiết kế xong, chưa triển khai |
| **V0.2.1 – V0.2.2 (`Farm & Fish`)** | 12. Điều chỉnh thời gian (`+1h`, `+1 ngày`, `+7 ngày`) & Tốc độ mô phỏng (`1× / 5× / 20×`)<br>13. Đổi ngày, mùa, thời tiết test<br>14. Ép cây trưởng thành ngay (`Force crop ready`)<br>15. Spawn cá hiếm trong phiên test | Thiết kế xong, chưa triển khai |
| **V0.2.3 (`Living Pet AI`)** | 16. **Pet Brain Debugger** (Utility score inspector, edit 8 needs / 9 emotions / 7 traits / 24 memories)<br>17. Force pet action & Force pet animation<br>18. Simulate offline `+48h / +7d` & overlay BFS path/affordance | Đặc tả chi tiết trong `docs/pet/PET_TEST_PLAN.md` |
| **V0.2.4 – V0.3 (`Home & Co-op`)** | 19. Unlock recipes & Unlock areas (nhà kính/hiên/chợ)<br>20. Set house level<br>21. Tạo NPC order nhanh & Force NPC action<br>22. Test mini-game hoàn thành/chưa hoàn thành/hủy & test nấu ăn | Chưa triển khai |

---

## 3. Kiểm thử An toàn Chống Truy cập Trái phép
- Unit/SQL test bắt buộc khi thêm `supabase/dev-migrations/`:
  1. Gọi `dev_grant_currency_or_item` khi `worlds.is_test = false` → **MUST FAIL (`FORBIDDEN`)**.
  2. Gọi `dev_grant_currency_or_item` bởi user không nằm trong `dev_admins` → **MUST FAIL (`FORBIDDEN`)**.
  3. Chạy `npm run build && node scripts/verify-prod-guard.mjs` → **MUST PASS (0 dev marker trong `dist/assets/*.js`)**.

## 4. Hợp đồng khi triển khai

- **Dev LAN:** dùng server Dev hiện có và fixtures tổng hợp. Chọn danh tính nhanh chỉ trong mode Dev LAN. Console gọi các handler test đã định danh từ UI DEV.
- **Supabase Test:** dùng project riêng nếu còn slot miễn phí theo PD-07. Chỉ áp dev migrations trên project đã allowlist. `SECURITY DEFINER` có search_path cố định, quyền execute giới hạn và kiểm tra `auth.uid()` là dev admin, world đúng ID và `is_test = true`. Không cấp client quyền ghi `dev_admins` hoặc đổi `is_test`.
- **Snapshot:** chỉ export dữ liệu gameplay tổng hợp có schemaVersion; không kèm auth, thư riêng, ảnh, secret hoặc session. Restore kiểm tra world/phiên bản trước khi ghi trong transaction; reset có xác nhận và chỉ cho sandbox.
- **Bằng chứng thoát:** kiểm build guard, migration inventory và Test DB. Test endpoint vắng ở Prod, user thường và admin vào world không phải test bị từ chối, admin Test hợp lệ thành công. V0.1 chỉ có công cụ Dev LAN và guard hiện tại; Dev Console là thiết kế.
