# Chuỗi Sản xuất & Bảng Định giá Khởi đầu (`PRODUCTION_CHAINS`)

*Số liệu tính toán và kiểm tra không arbitrage từ PoC `econ-check.mjs` ($w = 5$ xu / đơn vị $L_i$ chuẩn). Thuộc config tập trung duy nhất cho cả SQL Seed lẫn Simulator (**K2**).*

---

## 1. Bốn Chuỗi Sản xuất Cốt lõi

```text
[1] Hạt giống (Shop/Free) ──► Trồng trọt ──► Nông sản (normal/silver/gold) ──► Bếp (Chế biến) / Đơn NPC / Shipping Bin
[2] Bờ ao + Mồi (Free/Shop) ─► Câu cá ─────► Cá (3 bậc hiếm) ───────────────► Bếp / Bể cá / Chú Tư Cần
[3] Hạt hoa + Tưới/Mưa ────► Lai giống ───► Hoa tươi / Hoa lai ────────────► Bó hoa (Tặng / Tiệm hoa)
[4] Khai thác / Thu gom ───► Gỗ & Thảo mộc ► Chế tác Thợ mộc / Gia vị bếp ─► Công cụ & Bộ sưu tập Nội thất
```

---

## 2. Bảng Tham số Khởi đầu (`28` Items Đại diện, Kiểm chứng `0` Arbitrage)

| Nhóm | Item ID | Nguyên liệu đầu vào (`a_ij`) | Mua Shop (`storeBuy`) | $L_i$ chuẩn | $D_i$ | Giá trị $V_i$ | Giá bán cơ sở (`sell × qty`) | Thưởng Đơn (`order ×`) | Mục tiêu sử dụng chính |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| **Hạt / Gốc** | `seed_wheat` | — | `4c` | `0` | `0` | `4.0` | `2c` | — | Cây khởi đầu nhanh (`5m`) |
| | `seed_carrot` | — | `8c` | `0` | `0` | `8.0` | `4c` | — | Nguyên liệu súp / đơn |
| | `seed_tomato` | — | `14c` | `0` | `0` | `14.0` | `7c` | — | Thu hoạch `×2` quả (`45m`) |
| | `seed_strawberry` | — | `22c` | `0` | `0` | `22.0` | `11c` | — | Thu hoạch `×2`, bánh tart (`90m`) |
| | `seed_sunflower` | — | `16c` | `0` | `0` | `16.0` | `8c` | — | Hoa / bó hoa (`60m`) |
| | `seed_rose_pink` | — | `20c` | `0` | `0` | `20.0` | `10c` | — | Lai hoa anh đào (`90m`) |
| | `seed_cabbage` | — | `26c` | `0` | `0` | `26.0` | `13c` | — | Cây dài hạn (`120m`) |
| **Thu lượm** | `bait_free_worm` | — | **`0c`** | `0.2` | `0` | `1.0` | `0c` | — | **Chống bế tắc khi ví = 0** |
| | `bait_shrimp` | — | `6c` | `0` | `0` | `6.0` | `2c` | — | Tăng xác suất cá hiếm |
| | `wild_herb` | Hái mép vườn | — | `1.0` | `0` | `5.0` | `5c` | — | Gia vị nấu ăn & chống bế tắc |
| | `wood_branch` | Nhặt cành / đốn cành | — | `1.0` | `1` | `6.0` | `6c` | — | Crafting & thợ mộc |
| **Nông sản** | `wheat` | `1×seed_wheat` | — | `0.4` | `1` | `7.0` | `8c ×1` | `1.40×` | Làm bột, đồ ăn nhanh |
| | `carrot` | `1×seed_carrot` | — | `0.6` | `1` | `12.0` | `15c ×1` | `1.45×` | Nấu `carrot_soup` |
| | `tomato` | `1×seed_tomato` | — | `1.0` | `2` | `10.5` | `13c ×2` | `1.45×` | Bán & chế biến trung bình |
| | `strawberry` | `1×seed_strawberry` | — | `1.2` | `2` | `15.0` | `18c ×2` | `1.50×` | Nguyên liệu bánh ngọt |
| | `sunflower` | `1×seed_sunflower` | — | `1.0` | `1` | `22.0` | `25c ×1` | `1.45×` | Hoa trang trí & bó hoa |
| | `rose_pink` | `1×seed_rose_pink` | — | `1.2` | `1` | `27.0` | `30c ×1` | `1.50×` | Bó hoa & lai hoa |
| | `rose_sakura` | Lai `rose_pink` | — | `1.5` | `2` | `36.5` | `48c ×1` | `1.60×` | Hoa quý tặng người thương |
| | `cabbage` | `1×seed_cabbage` | — | `1.4` | `2` | `35.0` | `40c ×1` | `1.50×` | Nấu đĩa lớn / đơn hàng |
| | `peach` | Cây ăn quả lâu năm | — | `1.0` | `9` | `4.67` | `18c ×3` | `1.45×` | Thu nhiều chu kỳ sau đầu tư ban đầu |
| **Cá (`V0.2.2`)** | `carp_pond` | `1×bait_free_worm` | — | `1.8` | `2` | `11.0` | `14c ×1` | `1.40×` | Cá phổ thông dễ câu |
| | `koi_pastel` | `1×bait_shrimp` | — | `2.4` | `3` | `21.0` | `24c ×1` | `1.50×` | Cá cảnh / đĩa cá nhà hàng |
| | `lotus_trout` | `1×bait_shrimp` | — | `3.4` | `4` | `27.0` | `36c ×1` | `1.55×` | Cá hiếm ao sen |
| **Chế biến** | `flour` | `2×wheat` | — | `0.8` | `1` | `19.0` | **`17c ×1`** | `1.40×` | Nguyên liệu bánh (*không lãi hơn bán thô nếu không làm bánh/đơn*) |
| | `carrot_soup` | `2×carrot + 1×wild_herb` | — | `2.0` | `2` | `41.0` | `42c ×1` | `1.65×` | Món đơn giản luyện Bếp |
| | `herb_carp` | `1×carp_pond + 1×wild_herb` | — | `2.2` | `2` | `29.0` | `32c ×1` | `1.60×` | Món cá rủi ro cháy bếp |
| | `peach_tea` | `2×peach + 1×sugar_pack(6c)` | — | `1.6` | `2` | `25.34` | `52c ×1` | `1.55×` | Đồ uống picnic / quán cà phê |
| | `strawberry_tart` | `1×flour + 2×strawberry + 1×spice(10c)` | — | `3.0` | `3` | `77.0` | `78c ×1` | `1.70×` | Bánh nhà hàng trả cao khi đạt `★★★` |
| | `koinori_platter` | `1×koi_pastel + cabbage + carrot` | — | `3.5` | `3` | `88.5` | `102c ×1` | `1.70×` | Đĩa đặc sản Co-op Cooking |
| | `sakura_bouquet` | `2×rose_pink + sunflower + ribbon(6c)` | — | `2.0` | `1` | `93.0` | `100c ×1` | `1.55×` | Tặng người yêu & đơn Tiệm hoa |
| | `wood_chair` | `3×wood_branch` | — | `1.5` | `2` | `27.5` | **`26c ×1`** | `1.30×` | Crafting đặt dùng trong nhà |

---

## 3. Các Đầu Chi Chính (`Currency Sinks`)
1. **Hạt giống, mồi câu & gia vị tiêu hao** (`4c – 26c`).
2. **Đồ trang trí nhỏ & đồ chơi thú cưng** (`35c – 90c`).
3. **Nội thất 4 bộ sưu tập (`Pastel/Modern/Cottage/Rustic`)** (`120c – 550c`).
4. **Nâng cấp công cụ (cuốc, bình, cần câu, bếp)** (`250c – 900c`).
5. **Mở rộng nhà, nhà kính, ao cá & khu chợ (`V0.2.4 → V1.0`)** (`1,200c – 6,000c`).
