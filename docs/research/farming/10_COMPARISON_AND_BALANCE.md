# R1.1 — So sánh cơ chế và ví dụ kinh tế

Các giá trị donor là VERIFIED_SOURCE hoặc COMMUNITY_RECONSTRUCTION tại SHA trong [09](09_SOURCE_INDEX.md); nhận định thiết kế là INFERRED/OLW_PROPOSAL. Ký hiệu “chưa rõ” không đồng nghĩa cơ chế không tồn tại.

| Cơ chế | Stardew decompile | DST script mirror | Vintage mod | Hoa ACNH cộng đồng | OLW baseline / khuyến nghị |
|---|---|---|---|---|---|
| Tăng trưởng | pha theo ngày, nước, season | timer + checkpoint nhiều điều kiện | lịch stage, interval climate | không mô phỏng tăng trưởng cây | timestamp, môi trường tại thời điểm đọc; kiểm parity và chốt lịch sử trước khi thêm bonus |
| Đất | một loại phân ảnh hưởng speed/retention/quality | nutrient ba pool theo tile; cây khác nhau tiêu/hoàn | NPK từng ô, hồi về mức gốc | không đề cập | fertilizer hiện có; thử 1 bonus luân canh, không bắt buộc NPK |
| Bố trí | sprinkler footprint; giant gộp hình chữ nhật | cùng loại gần, crowding; soil tile chung | chọn crop luân canh theo nutrient | ẩn genotype, đường lai | flower 8 láng giềng; thử bonus bố trí có giải thích |
| Chất lượng | roll nối tiếp; fertilizer + level | stress tổng quyết định hạt/giant | thiệt hại nhiệt ảnh hưởng drop | phenotype từ bảng | roll quality hiện có; bonus phải giới hạn, không hạ baseline |
| Tự động | sprinkler và tool charge | timer, không đánh đồng tưới tự động | fast-forward theo khoảng | không chứng minh automation gốc | sprinkler/tool/xưởng có sẵn, tập trung giảm thao tác lặp |
| Hai người | xét farmer hợp lệ khi tính multiplier | master simulation, netvar nghiên cứu | server tick, lưu block | không xác minh trao đổi item | shared inventory/state; cần test hai backend, không khóa vai trò |
| Vắng mặt | không chứng minh offline real-time từ code này | LongUpdate có sẵn, chưa chứng minh server tắt | tối đa một năm world time, chỉ khi calendar đã chạy | không nghiên cứu | không mất cây; giới hạn catch-up phải thông báo và test |
| Rủi ro UX | nhầm xác suất; replant mùa | bảy stressor thành việc vặt | chết, nhiệt độ phức tạp | gene ẩn có thể khó hiểu | nội dung nâng cao tùy chọn; giữ cách chơi cơ bản |

## Ví dụ dựa trên catalog OLW — không phải dự đoán doanh thu thực

`deepCropSimulation.ts:189–191`, `catalogConfig.ts:120–122,141–144`, `rollDeepHarvestQty:406–420`: wheat 5 phút, yield đều 1–2, seed 4, giá thường 8; carrot 15 phút, yield đều 1–2, seed 8, giá 15; tomato 45 phút lần đầu, yield đều 2–3, seed 14, giá 13, có regrow 20 phút. Các giá là catalog; đường bán cụ thể có thể áp rounding/saturation hoặc giá khác, cần xác minh.

Giả lập **giả định** 60 phút trong điều kiện trung tính và đúng mùa, không tưới/phân/weather bonus, chất lượng normal, không phí, có sẵn hạt và thu/trồng lại tức thời, giá không đổi. Lợi nhuận kỳ vọng = tổng `E[qty] × price − seed`. Cho phép thu đúng ranh giới phút 60.

| Cây | Lượt thu trong H=60 phút | Doanh thu kỳ vọng | Hạt | Lãi kỳ vọng / ô / giờ | Thao tác |
|---|---:|---:|---:|---:|---|
| Wheat | 12 | 12 × 1.5 × 8 = 144 | 48 | 96 | trồng + thu mỗi vòng |
| Carrot | 4 | 4 × 1.5 × 15 = 90 | 32 | 58 | 4 vòng |
| Tomato | 1 | 2.5 × 13 = 32.5 | 14 | 18.5 | 1 lần trồng và thu; lần tái sinh sớm nhất phút 65 |

So sánh chỉ cho thấy **mô hình giả định này** thưởng mạnh người thao tác liên tục: trong lúc một người còn bận trò chuyện/câu cá, cà chua có thể tiện hơn. H=90 phút thì tomato có thêm các đợt tại phút 65 và 85 nếu thu ngay: `(3×2.5×13−14)/1.5 ≈ 55.67` xu/ô/giờ. Không tính giới hạn số harvest, server delay và mùa đổi nếu không được xác nhận cho trường hợp thực. Không dùng kết quả để sửa giá trực tiếp.

Ví dụ xưởng: `workshops.ts:143–153`, `catalogConfig.ts:141,162`: 2 wheat normal bán thô được 16; 1 flour có giá catalog 17, thời gian 60 giây → chênh 1 xu/mẻ trước chi phí máy, công, thị trường, giá đầu vào và rounding. Giá trị gián tiếp cho nấu ăn/đơn hàng có thể lớn hơn. Benchmark cần so lời trên một phút máy, ô, số thao tác và giá trị nguyên liệu khi dùng nơi khác.

## Tương tác và thử nghiệm cân bằng

- Người A trồng họ củ; B đổi họ đậu ở lượt sau để thử bonus rồi một người thu lúc rảnh. Chất lượng cơ bản giữ nguyên nếu không ai tối ưu; seed/thu hoạch nằm trong kho chung.
- Hoa cha mẹ có cùng màu nhưng gene khác có thể dẫn tới các con khác màu trong mô hình tự chọn; người A gắn nhãn, B trồng lại, album ghi nguồn gốc. Nếu chưa có instance semantics, giữ công thức SKU hiện tại và không hứa bảo toàn gene.
- So mô phỏng với 1/2/4 lần ghé trong ngày game, H=1/6/24 giờ, lượng ô, thời gian người chơi/máy, số lần tương tác và độ nhạy giá; hai người không bắt buộc online cùng lúc. Chạy simulation balance riêng sau khi xác minh đường bán/độ bão hòa, sau đó playtest cảm nhận.
