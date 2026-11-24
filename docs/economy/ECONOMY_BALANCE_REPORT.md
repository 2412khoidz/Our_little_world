# Báo cáo Cân bằng Kinh tế — Our Little World (V0.2.x)

Ngày: 25/11/2026 · Nhánh `deepseek/night-dev` · Catalog production **giữ nguyên**
(fingerprint `7076075b`, `olw-economy-v0.2.0-r1`). Mọi cấu hình dưới đây là
**experimental profile** chưa được duyệt; không tham số nào được ghi vào catalog.

Chạy lại:

```bash
npm run economy:sim                       # 7-8 persona × 5 profile × 7/30/90/180 ngày
npm run economy:experiments -- --days=90  # sweep A-E, cây, nấu ăn, pacing, sai lệch
```

---

## 1. Baseline

| Hạng mục | Giá trị |
|---|---|
| Ví khởi đầu | 120 xu (giả định BALANCING_PLAN) |
| Vườn khởi đầu | 12 ô (WORLD_PROGRESSION tier 1) |
| Bão hòa mềm | 20 đơn vị/nhóm/ngày, −1%/đơn vị, sàn −30% |
| Đơn NPC | 3 slot / 12h, premium 1,35–1,70× |
| Nhà hàng | 1,60–2,00×, deadline 90–150s, ≥2★ |
| Phí offline / thuế | **0** |
| Giá mua shop | `storeBuy ≥ 2 × sellPrice` (0 arbitrage) |

Baseline A cho kết quả (median 3 seed, 90 ngày):

| Chỉ số | casual | optimizer_mixed | optimizer |
|---|---|---|---|
| Xu/phút **thao tác** | 9,73 | 9,35 | **17,02** |
| Xu/phút **phiên** | **9,68** | 5,85 | 6,79 |
| Xu/ngày thực | 122,20 | 175,38 | 203,58 |
| Xu/ô-ngày | 14,16 | 14,83 | 17,86 |
| Tỉ lệ idle | 0,01 | 0,37 | 0,60 |
| Top-group share | 0,35 | 0,36 | 1,00 |
| Số nhóm bán | 5 | 5 | 1 |
| Tài sản cuối | 11.118 | 15.904 | 18.442 |

## 2. Phương pháp đo

Năm mẫu số, **không thay thế nhau**:

1. **Xu/phút thao tác** (`workedSeconds`): chỉ tính thời gian thực hiện hành động
   (gieo, thu, câu, nấu, bán). Đo "công sức".
2. **Xu/phút phiên** (`activeSeconds`): toàn bộ thời lượng ngồi chơi, gồm idle.
   Đo "cảm giác mỗi buổi".
3. **Xu/ngày thực**: chia cho số ngày lịch, gồm cả ngày vắng. Đo pacing.
4. **Xu/ô-ngày**: `netIncome / plotDays` — chi phí cơ hội của đất (mỗi ô đang
   canh tác cộng 1 ô-ngày mỗi ngày).
5. **Thời gian & ngày thực để mua nội thất**: `daysToAfford` chạy engine thật,
   tôn trọng ngày vắng.

**Cảnh báo phương pháp (đã kiểm tra):** persona `optimizer` thuần nông nghiệp
**idle 60%** phiên vì sau khi lấp 12 ô không còn hành động. Xu/phút *thao tác*
của nó vì thế bị thổi lên (17,02) trong khi xu/phút *phiên* chỉ 6,79 — thấp hơn
casual. Kết luận "monoculture lãi hơn" chỉ đúng khi chọn mẫu số có lợi. Vì vậy
báo cáo thêm persona **`optimizer_mixed`** (chuyển sang câu cá/hái lượm/nấu khi
ô đất kín): idle 37%, vẫn giữ 5 nhóm hoạt động, và **không** vượt casual
(9,35 so với 9,73 xu/phút thao tác).

## 3. Profile thử nghiệm

| Mã | Mô tả | Tham số |
|---|---|---|
| **A** | Baseline đã duyệt | 20 đơn vị/nhóm/ngày, −100bp/đơn vị, sàn 7000 |
| **B** | Ngưỡng thấp hơn | 8 đơn vị/nhóm/ngày, còn lại như A |
| **C** | Ngưỡng riêng theo nhóm/SKU | grain 12, veg 10, fruit 8, flower 6, fish 5, dish 4, material/seed/pantry/bait 20, craft 5 |
| **D** | Bão hòa theo **tổng giá trị** bán/ngày | 150 xu/ngày miễn phí, −40bp mỗi xu vượt, sàn 7000 |
| **E** | Nhu cầu hồi phục theo thời gian | sold units nhân `2^(-t/6h)` kể từ lần bán đầu trong ngày |

Persona: `casual`, `optimizer_mixed`, `optimizer` (đoạn dưới), 3 seed
(`20261125`, `7`, `99`), 90 ngày, profile `v021` (12 ô đất).

## 4. Kết quả định lượng A–E

| Policy | Persona | /thao tác | /phiên | /ngày | /ô-ngày | idle | top | nhóm | Tài sản |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A | casual | 9,73 | 9,68 | 122,20 | 14,16 | 0,01 | 0,35 | 5 | 11.118 |
| A | mixed | 9,35 | 5,85 | 175,38 | 14,83 | 0,37 | 0,36 | 5 | 15.904 |
| A | optimizer | 17,02 | 6,79 | 203,58 | 17,86 | 0,60 | 1,00 | 1 | 18.442 |
| B | casual | 9,73 | 9,68 | 122,09 | 14,15 | 0,01 | 0,35 | 5 | 11.108 |
| B | mixed | 9,31 | 5,83 | 174,83 | 14,79 | 0,37 | 0,36 | 5 | 15.855 |
| B | optimizer | 16,55 | 6,60 | 198,04 | 17,37 | 0,60 | 1,00 | 1 | 17.944 (−2,7%) |
| C | casual | 9,73 | 9,68 | 122,14 | 14,16 | 0,01 | 0,35 | 5 | 11.113 |
| C | mixed | 9,33 | 5,84 | 175,22 | 14,82 | 0,37 | 0,36 | 5 | 15.890 |
| C | optimizer | 16,86 | 6,72 | 201,73 | 17,70 | 0,60 | 1,00 | 1 | 18.276 (−0,9%) |
| D | casual | 7,80 | 7,74 | 97,64 | 11,34 | 0,01 | 0,35 | 5 | 8.908 (−20%) |
| D | mixed | 6,40 | 4,01 | 120,33 | 10,22 | 0,37 | 0,36 | 5 | 10.950 (−31%) |
| D | optimizer | 9,52 | 3,76 | 112,82 | 9,98 | 0,61 | 1,00 | 1 | 10.274 (−44%) |
| E | mọi persona | **trùng A** trong simulator | | | | | | | |

**Dominant strategy ratio** (optimizer / casual, xu/phút thao tác):

| Policy | Tỉ lệ | Trần 2,2 |
|---|---:|---|
| A | 1,75 | ✅ |
| B | 1,70 | ✅ |
| C | 1,73 | ✅ |
| D | 1,22 | ✅ |

Theo **xu/phút phiên** thì optimizer luôn *thấp hơn* casual (A: 0,70×; D: 0,49×)
vì idle; theo **xu/ô-ngày** (A: 1,26×) chênh lệch nhỏ nhất.

## 5. Trade-off từng phương án

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| **A baseline** | Không phạt ai; guard 1,75 < 2,2; casual đạt pacing | Monoculture vẫn hơn casual ~1,75× công sức | **Giữ làm production** |
| **B ngưỡng 8** | Giảm monoculture 2,7%; gần như không ảnh hưởng casual | Ở 12 ô, ngưỡng ≥12 hoàn toàn vô hiệu → 8 chỉ hơi chạm | Tùy chọn nhẹ |
| **C theo nhóm** | Hoa/cá/bánh saturate sớm, đúng "sức hấp thụ thị trường" | Chỉ giảm 0,9% ở 12 ô; phức tạp hơn khi cần UI giải thích | Tùy chọn trung tính |
| **D theo giá trị** | Cân bằng tốt nhất (1,22×) vì chặn mọi hoạt động lãi cao | Giảm 20% thu nhập casual, 44% optimizer → dễ hiểu nhầm là "bị phạt" | **Không khuyến nghị** ở V0.2 |
| **E hồi phục** | Không phạt, thưởng bán rải rác; không bắt đăng nhập | Simulator chỉ bán 1 lần/phiên nên kết quả trùng A; cần đo thêm khi có nhiều phiên/ngày | Đo riêng: bán dồn 188c vs chia 3 phiên 192c (+2,0%) |

**Vì sao B/C gần như vô hiệu:** với 12 ô, mỗi nhóm chỉ bán tối đa ~12 đơn vị/ngày;
ngưỡng 20 của A chưa bao giờ chạm. Muốn saturation có tác dụng phải hạ ngưỡng
xuống dưới 12 (B=8) hoặc mở rộng vườn 24/36 ô.

## 6. Cooking economy (trong dải 1,60–2,00× đã duyệt)

Xu/phút thao tác (nguyên liệu bán thô → đơn NPC → nhà hàng 1,6 / 1,8 / 2,0):

| Món | NVL | Bán thô | Đơn NPC | NH 1,6 | NH 1,8 | NH 2,0 |
|---|---:|---:|---:|---:|---:|---:|
| carrot_soup | 35 | 1,75 | 8,50 | 8,00 | 10,00 | 12,25 |
| herb_carp | 19 | 3,25 | 8,00 | 8,00 | 9,50 | 11,25 |
| peach_tea | 39 | 3,25 | 10,25 | 11,00 | 13,50 | 16,25 |
| strawberry_tart | 58 | 5,00 | 18,50 | 16,50 | 20,50 | 24,50 |
| koinori_platter | 79 | 5,75 | 23,50 | 21,00 | 26,00 | 31,25 |

- Nấu ăn **không bắt buộc**: bán thô vẫn dương; chỉ kém hơn nếu so với đơn.
- Không arbitrage: mọi nguyên liệu chế biến đều không mua được ở shop (trừ gia vị),
  `analyzeArbitrage()` = 0 finding; không có vòng lặp vô hạn.
- Lưu ý: đơn NPC (1,65×) có thể **cao hơn** nhà hàng 1,6× — nên UI đơn hàng phải
  hiển thị đúng hệ số từng món, đừng hứa "nhà hàng luôn cao hơn".

## 7. Catalog consistency

### 7.1 `carp_pond` — nguyên nhân lệch 1 xu

`V = (Σa·V + w·L + D) / qty` với `w = 5 xu/đơn vị lao động`:

- Nguyên liệu: 1 × `bait_free_worm` (V = 1,0) = **1,0**
- Lao động: 5 × 1,8 = **9,0**
- Khấu hao: **2,0**
- Tổng = **12,0** nhưng bảng `PRODUCTION_CHAINS` ghi **11,0**.

`herb_carp` được tính theo 11,0 (29,0 = 11 + 5 + 11 + 2), nên sai số lan sang dòng
sau. Giá bán (14 / 32) là số độc lập nên **người chơi không thấy gì thay đổi**.

**Đề xuất:** sửa bảng thành 12,0 và 30,0; hoặc giữ nguyên và ghi chú "sai số PoC".
Không tự sửa vì đây là bảng thiết kế đã duyệt.

### 7.2 `peach` — thiếu đường sở hữu

Hiện `peach`: `storeBuy = null`, `inputs = []`, không forageable → **không thể sở
hữu hợp lệ**; simulator loại khỏi mô phỏng (đúng yêu cầu). Farming đang giả định
`sapling_peach` (chưa tồn tại trong catalog).

Đề xuất SKU mới (experimental):

| Trường | Giá trị đề xuất |
|---|---|
| `sapling_peach` | group `seed`, V0.2.1, `storeBuy = 240`, `sellPrice = 80` (nhưng **không** bán được — `sellChannels: []`) |
| Thu hoạch | 3 quả/lần × 18 xu = 54 xu; 6 lần (1 vụ + 5 tái sinh) |
| Thời gian | 180 phút vụ đầu, 120 phút mỗi tái sinh (theo farming) |

Kiểm tra: 6 × 54 = 324 xu doanh thu − 240 xu cây = 84 xu cho 6 phút thao tác
≈ **14 xu/phút** — ngang dâu tây/cải bắp, không phá trần 2,2×. Nếu giữ giá cây
30 xu như farming đang giả định thì peach đạt **~49 xu/phút** (3,5× dâu tây) và
**phá trần dominant strategy** → không được đưa vào gameplay thật với giá đó.

## 8. Pacing nội thất (casual, profile v021, seed 20261125)

| Món | Giá | Ngày thực | Phút phiên | Dải thiết kế |
|---|---:|---:|---:|---|
| Trang trí nhỏ | 45 | 2 | 23 | 5–15 phút ⚠️ (chậm hơn dải) |
| Đồ chơi pet | 80 | 2 | 22 | 10–20 phút ✅ |
| Nội thất đẹp | 180 | 4 | 45 | 30–60 phút ✅ |
| Góc phòng | 420 | 7 | 87 | 1–3 giờ ✅ |
| Mở rộng nhà | 1.400 | 15 | 182 | 3–8 giờ ✅ |

Ghi chú: món 45 xu chậm hơn dải vì người chơi casual phải tích luỹ qua 2 phiên;
không phải lỗi nghiêm trọng (món đầu tiên thường mua ngay bằng ví khởi đầu 120 xu).

## 9. Acceptance criteria

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Không ví/kho âm | ✅ | invariant mỗi 7 ngày + milestone; 8 persona × 5 profile |
| Không arbitrage vô hạn | ✅ | `analyzeArbitrage()` 0 finding; 18 SKU time-gated |
| Phục hồi từ ví 0 | ✅ | 75 giây (hái 60s + bán 15s) |
| Không mất cây/tiền khi nghỉ | ✅ | `long_absence` 14–30 ngày: tài sản không giảm, cây vẫn chín |
| Không hoạt động bắt buộc hằng ngày | ✅ | không streak/thuế; saturation reset 00:00; đường hái lượm luôn mở |
| Dominant strategy ≤ 2,2 | ✅ 1,75 (A) | đo theo phút thao tác, tệ nhất trong 4 policy |
| Báo cáo pacing + diversity | ✅ | mục 4, 8 |

## 10. Recommended balance configuration

1. **Production: giữ A** (đã đạt guard 1,75). Không cần đổi catalog.
2. **Không đưa D vào production**: giảm 20% thu nhập casual — trái tinh thần cozy.
3. **Cân nhắc B=8** như "lớp bảo hiểm" khi vườn mở 24/36 ô (lúc đó ngưỡng 20 mới
   bắt đầu chạm); chưa cần ở V0.2.
4. **E chỉ hữu ích khi có nhiều phiên bán/ngày**; giữ như thiết kế tương lai, không
   triển khai UI bây giờ.
5. **Đa dạng hoá đã có sẵn**: persona `optimizer_mixed` cho thấy người chơi tự
   nhiên chuyển sang câu cá/hái lượm khi ô đất kín mà vẫn giữ 5 nhóm — đây là
   hành vi lành mạnh, không cần ép bằng thuế hay phạt.
6. **Không khuyến khích** tăng giá bán nông sản để "bù" – sẽ phá pacing nội thất.

## 11. Quyết định cần chủ dự án duyệt

| # | Quyết định | Ảnh hưởng |
|---|---|---|
| D1 | Sửa `carp_pond` 11,0 → 12,0 và `herb_carp` 29,0 → 30,0 | Chỉ số tham chiếu; giá bán không đổi |
| D2 | Thêm SKU `sapling_peach` (240 xu, không bán lại) | Mở chuỗi cây ăn quả, peach lãi ~14 xu/phút |
| D3 | Chọn ngưỡng saturation cho V0.2.4 khi vườn 24/36 ô (A hay B/C) | Ảnh hưởng monoculture ở quy mô lớn |
| D4 | Có mô phỏng nhiều phiên bán/ngày để nghiệm thu E hay không | Cần thêm hành vi "bán nhiều lần" vào engine |

Cho tới khi D1–D4 được duyệt: catalog production, `DEFAULT_SATURATION` và
Shipping Bin **không thay đổi**.

---

## Phụ lục — Đính chính phương pháp (sau GPT independent review)

Các số dominant strategy trong báo cáo gốc **không còn dùng làm bằng chứng** vì
phương pháp đo đã thay đổi theo review:

- Strategy (balanced/monoculture) tách khỏi persona; trước đây persona
  `optimizer` ép cả hai nhánh cùng chọn crop tốt nhất → ratio 1 giả tạo.
- RNG tách kênh `choice`/`quality` để hai nhánh nhận cùng "may mắn".
- Thời gian bán/mua vượt phiên được tính là `overrunSeconds` (không còn miễn phí).
- Recovery probe dùng `claimForage` thật (availability + respawn) thay vì cộng item.
- Oracle độc lập: journal vật phẩm, replay ledger, stack limit, quality.

Baseline đo lại (`seed 20261125`, 60–90 ngày): dominant ratio A = **2,15**,
B = 2,09, C = 2,13, D = 1,47 (trần 2,2). Kết luận định tính không đổi (A đạt
trần nhưng sát; D cân bằng nhất nhưng giảm thu nhập casual), định lượng thay đổi.