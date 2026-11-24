# Kế hoạch Kiểm thử & Pet Brain Debugger (`PET_TEST_PLAN`)

*Chia lớp test chuẩn xác cho V0.1.5 (MVP) và V0.2.3 (Living Pet AI).*

---

## 1. Các Tầng Kiểm thử Bắt buộc

| Hạng mục Test | Loại & Công cụ | Kịch bản kiểm chứng cụ thể |
|---|---|---|
| **Offline Catch-up & Safety** | Unit + Property (Vitest) | Mô phỏng vắng mặt `1h`, `24h`, `48h`, `30 ngày`: xác nhận mọi vitals luôn nằm trong `[25, 100]`, không `NaN`, không chết, sleep tự hồi energy. |
| **Utility Scoring & Anti-Loop** | Unit (Vitest) | Kiểm tra khi đói `<35` điểm `eat` vượt `sleep` (anti-sleep-loop); kiểm tra commitment + cooldown ngăn đổi hành động liên tục mỗi tick; kiểm tra cùng `(obs, seed)` ra cùng `ValidatedAction`. |
| **Affordance & Furniture Move** | Integration logic (Vitest) | Dời bát ăn hoặc xóa trụ cào ngay lúc mèo đang đi tới → `ActionValidator` hủy/đổi đích sạch sẽ không throw hay kẹt ô bị chặn. |
| **Multiplayer Sim-Host & Race** | E2E Playwright (2 contexts) | (1) Hai máy cùng nhìn thấy mèo thực hiện cùng `PetActionIntent`; (2) Ngắt mạng Sim Host → máy còn lại tiếp quản trong `<= 7s`; (3) Hai máy cùng bấm cho ăn cùng lúc → chỉ trừ đồ 1 lần (`idempotency + FOR UPDATE`). |
| **Mobile & Animation Check** | Visual / Manual iPhone | 128 frame `cat-orange` render sắc nét không lệch `0.5px` (`pixelArt: true`), không tụt FPS trên iPhone 16 Pro Max. |

---

## 2. Đặc tả Pet Brain Debugger (`Dev-Only Sandbox`)

> **Bảo vệ Production:** Chỉ biên dịch bên trong nhánh `if (import.meta.env.DEV)` và bị `scripts/verify-prod-guard.mjs` quét chặn (`menu-pet-debugger`). Tuyệt đối không tồn tại trên bản production của cặp đôi.

- **Giao diện Debug (gắn trong Dev Console khi tới V0.2.3):**
  1. **Inspector trực tiếp:** Bảng điểm Utility thời gian thực (`eat: 1.85`, `sleep: 0.40`...), lý do chọn mục tiêu hiện tại, bảng 24 ký ức gần nhất & điểm sở thích.
  2. **Can thiệp trực tiếp (Local/Test World):** Thanh trượt chỉnh nhanh 8 nhu cầu, ép 9 cảm xúc, bật/tắt 7 nét tính cách, xóa/chèn memory.
  3. **Force & Time-Travel:** Nút `Force Action`, `Force Animation` (chạy thử từng tag `Happy/Idle/Sleep/Walk`), `Simulate +1h / +12h / +7 ngày Offline`, vẽ overlay đường đi BFS hiện tại và danh sách affordances khả dụng trên bản đồ.

Bổ sung test chung cho SQL và Dev LAN với vector catch-up ở 0/12/48/720h và timestamp đi lùi. Test retry cùng khóa sau commit, feed đồng thời khác khóa và caller ngoài thế giới. Test bầu host thuộc V0.2.3, gồm hai tab cùng tài khoản, host ẩn tab, gói đến sau đổi host và layout đổi giữa đường.
