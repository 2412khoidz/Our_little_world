# Phase II — hướng dẫn chơi thử (owner)

**Checkpoint so sánh:** tag `checkpoint/p0-cabacos-pet-7474eb0` (không đổi).  
**Preview hiện hành:** xem `integration/donor-reuse-preview` tip mới nhất sau khi integration xác nhận VQG (HUD 8 ô + vòng farm/câu).

## Chuẩn bị

```bash
git fetch origin integration/donor-reuse-preview
git checkout <tip-integration-ghi-trong-p0-preview-qa-log>
npm ci
npm run import-donor:cabacos
npm run import-donor:hollowmere-beach

VITE_OLW_PRIVATE_ART=1 VITE_OLW_EXTENDED_WORLD=1 VITE_OLW_DONOR_ECONOMY=1 \
  npm run dev -- --host 0.0.0.0 --port 4173 --strictPort
```

Hai trình duyệt / iPhone + PC cùng Wi‑Fi: `http://<IP-máy-chủ>:4173/?extended-world=1`

## 11 bước (không dùng `?vqg-capture=1`)

| # | Việc | Pass khi |
|---|------|----------|
| 1 | **Tạo cặp** → preset **Mây** / **Nắng** | Canvas nhà; **8 ô** hotbar; emoji chỉ còn nút **♥** góc |
| 2 | Hai client cùng world | Thấy nhau di chuyển |
| 3 | **Trang trại** (nav) | Map `farm`; dải hướng dẫn farm/câu (nếu bật) |
| 4 | Chọn **cuốc** (ô 1) | Chip “Đang cầm” / cuốc trên tay |
| 5 | **J** cuốc ô đất | Luống đã cày |
| 6 | Chọn **hạt** → **J** gieo | Có cây trên luống |
| 7 | **Bình tưới** → **J** tưới | Cây lớn (Dev LAN tăng tốc) |
| 8 | **J** thu hoạch | Nông sản vào túi chung |
| 9 | **Thùng giao** hoặc shop → bán/gửi | Xu tăng; không bắt buộc menu Dev |
| 10 | **Ao / suối** → **J** câu | Modal câu donor mở từ thế giới |
| 11 | **Làng Cabacos** + cửa shop | Tiles đầy đủ; nhãn cửa/nhà dễ thấy |

**Phím:** `1`–`8` chọn ô; **J** tương tác; đi bằng WASD / chạm.

## Khác biệt map

- **Vườn nhà** (`nav-garden`) — khu vườn cottage Demo E.  
- **Trang trại** (`nav-farm`) — loop 184-plot / shipping / Bác Hai.  
- **Làng** (`nav-outdoor`) — Cabacos donor.

## Bằng chứng integration

Ảnh: `media/phase-ii-step-*.png`, `farm-fish-p0-*.png`, `donor-cabacos-village-verify.png` trong Project store.  
Log: `/cursor/stores/self/internal/p0-preview-qa-log.md`.