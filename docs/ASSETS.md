# Asset Manifest & Licensing Guide

## 1. Bộ Asset Starter hiện dùng trong V0.1 (Có thể phân phối công khai)

Toàn bộ asset đồ họa mặc định đang nằm trong `public/assets/` được sinh bằng mã nguồn tại `scripts/generate-starter-assets.mjs` với giấy phép **`CC0-1.0`** (Public Domain). Mục tiêu là đảm bảo **tính nhất quán 100% ở tỷ lệ 16x16 góc nhìn 3/4 RPG**, bảng màu pastel ấm áp, và **không vướng rủi ro bản quyền** trong quá trình hoàn thiện tính năng.

Danh sách chi tiết được ghi tự động tại `public/assets/manifest.json` mỗi khi chạy `npm run assets:generate`:
- `public/assets/starter/tileset-cozy.png` — Tileset nhà gỗ + vườn hoa anh đào (16x16 px)
- `public/assets/starter/furniture-cozy.png` — 12 món nội thất starter 16x16 / 32x16 / 16x32 / 32x32 px
- `public/assets/maps/home.json` & `public/assets/maps/garden.json` — Tiled JSON maps
- `public/icons/*.png` — PWA icons (32, 180, 192, 512 px)

---

## 2. Đánh giá các bộ Asset ứng viên từ cộng đồng (Để chủ dự án chọn cho bản art cuối)

| Bộ Asset | Tác giả & Link | Tile & Góc nhìn | Bản Free | Bản Trả phí | Ghi chú tương thích & Khuyến nghị |
|---|---|---|---|---|---|
| **Cozy Farm** | shubibubi (`https://shubibubi.itch.io/cozy-farm`) | 16x16, Top-down 3/4 | Tập con cơ bản (cỏ, cây, 1 nhà, gà, cà chua/khoai). Dùng cá nhân/học tập; bản thương mại chính thức mở ở gói đầy đủ. | Từ ~\$3.99 (PWYW). Gồm đầy đủ 4 mùa, nhà, động vật, autotile, UI. Không được bán lại/phân phối lại asset gốc. | **Ứng viên số 1** cho không khí pastel ấm áp, đúng góc nhìn và tỷ lệ 16x16 của dự án. |
| **Cozy Interior / Cozy People** | shubibubi (`https://shubibubi.itch.io/`) | 16x16, Top-down 3/4 | Không thương mại, cho phép chỉnh sửa, ghi credit nếu được. Không phân phối lại. | Từ ~\$3.99+. Dùng cho mọi dự án kể cả thương mại, không phân phối lại. | Rất đồng bộ nếu ghép cùng Cozy Farm (cùng tác giả). |
| **Sprout Lands (Asset + UI)** | Cup Nooble (`https://cupnooble.itch.io/sprout-lands-asset-pack`) | 16x16, 16-bit 3/4 | Chỉ **non-commercial**, bắt buộc credit *Cup Nooble*, không phân phối lại. | Từ ~\$3.99+. Dùng thương mại & phi thương mại, đầy đủ animation 4 hướng. | Bảng màu tươi sáng hơn; rất hợp nếu thích phong cách tròn trịa, cute. |
| **Modern Interiors** | LimeZu (`https://limezu.itch.io/moderninteriors`) | 16x16, 3/4 | Chỉ dùng cá nhân/phi thương mại. | Từ ~\$1.50+. Cho phép chỉnh sửa/dùng thương mại, bắt buộc credit kèm link, không phân phối lại. | Cực kỳ nhiều đồ nội thất hiện đại (TV, bàn học, laptop), hợp phòng hiện đại/rạp phim nhưng ít phần sân vườn đồng quê. |
| **Free Pets Pack** | Frakassets (`https://frakassets.itch.io/free-pets-pack`) | Pixel art nhỏ | **CC BY 4.0** (được dùng kể cả thương mại, bắt buộc ghi credit *Frakassets*). | Miễn phí hoàn toàn. | Ứng viên tốt cho mèo/chó ở **V0.2**, cần kiểm tra tỷ lệ pixel và chiều cao đứng cạnh avatar 16x24. |

> **Chính sách repository:** Nếu chủ dự án tải hoặc mua các gói từ Itch.io, **không commit trực tiếp vào repo public**. Hãy giải nén vào thư mục `public/assets/local-licensed/` (đã được thêm vào `.gitignore`) và dùng `npm run assets:import` để xác minh định dạng.

Demo E là hướng mỹ thuật đã duyệt. Bảng pack ghi điều kiện tham khảo của lần đánh giá artwork. Khi đóng gói theo [asset pipeline](art/ASSET_PIPELINE.md), lưu bằng chứng quyền cho đúng gói/version sẽ ship và chỉ đưa file cần dùng vào artifact. Test output `dist` và Service Worker ở OLW-010-01.
