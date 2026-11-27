# Đề xuất Deep Farming cho OLW

Tất cả số trong tài liệu này là OLW_PROPOSAL, chưa cân bằng hay triển khai. Giữ baseline hiện hữu; ưu tiên kiểm chứng một vòng mới nhỏ qua playtest trước khi mở rộng.

```text
chọn cây + vị trí → trồng → (tưới / tự động hóa tùy chọn) → thu hoạch
                              ↓
                     đất + cây láng giềng → bonus nhỏ
nông sản → ăn / bán / xưởng → nguyên liệu compost → đất
hoa → nhân giống → album chung → trang trí / quà
```

## Quyết định và tiến trình

Đầu game: mọi cây trưởng thành không cần login hàng ngày; tưới là bonus như hiện tại. Giữa game: thử xoay vòng hai họ cây, compost là lựa chọn, dùng sprinkler giải phóng thao tác. Cuối game: máy/đơn hàng khác công suất và cơ hội sử dụng, không ép tối đa tiền; giống hoặc cây lưu niệm là mục tiêu tự chọn. Một người trồng, người kia thu hoạch hoặc xem album sau; mọi hành động riêng đều có ý nghĩa. M2 quà/animation, M5 nấu ăn, M6 nhật ký phải được các mission đó duyệt hợp đồng, không giả vờ đã tồn tại.

## Dữ liệu tối thiểu và tính toán

Thử nghiệm một số `balance` 0–100 và `lastFamily` trên đất; crop giữ state riêng hiện có. Không cần lưu ẩm thứ hai nếu nguồn hiện tại đã biểu diễn được. Version save và catalog, default 50/unknown khi nâng cấp; migration cần tương thích client cũ. Đề xuất chỉ cập nhật khi thu hoạch hoặc compost, không trừ theo số ngày offline:

```text
rotate = previousFamily != null && previousFamily != currentFamily
bonus = clamp((balance-50)/500 + (rotate ? .05 : 0), 0, .15)
qualityOpportunity = existingChance + bonus  // có clamp theo tier hiện hữu
balance' = clamp(balance - cropCost + (rotate ? 5 : 0), 30, 100)
```

Đây là phép thử chứ không chứng minh cân bằng; 30 là sàn để trồng lặp luôn khả thi, không giảm phần thưởng cơ bản. Compost tăng balance một lần theo input có giá trị sử dụng khác; cần bảo đảm tổng giá thành/bonus không tạo arbitrage. Cân nhắc bỏ balance hoàn toàn nếu người chơi không nhận ra lựa chọn. Hàng xóm giới hạn chỉ tăng bonus cho cặp được giải thích, không phạt bố trí tự do; định nghĩa rõ snapshot và thời điểm chốt tại trồng/thu hoạch để hai client không khác nhau.

Giống nâng cao chỉ sau: `varietyId`, `geneVersion`, cặp allele, `parents`, `name`; trait là trade-off hạn mức, không cộng toàn bộ chỉ số. Tên dùng validation và hỗ trợ tiếng Việt; quà và nhân giống không mất mẫu hiếm. Tách inventory có instance metadata khỏi stack SKU trước khi triển khai; xác định giới hạn lineage/riêng tư và migration.

## Kinh tế

Đo cùng horizon H: `profit = E[yield]*unitPrice*harvests - seedCost - inputs - amortizedMachineCost`; `profit/tile/time=profit/(tiles*H)`, `profit/machineTime` tính thêm chi phí thời gian máy. Regrow tính số lần thực sự thu được trong H, không tính vô hạn; so đơn hàng, quà, bếp, hoa, rủi ro/đầu tư và số thao tác. Không hứa không có chiến lược tối ưu trong mọi điều kiện; mục tiêu có nhiều lựa chọn gần nhau ở các bối cảnh và utility khác nhau. Machine throughput, nguyên liệu đầu vào và thời gian của người chơi là ràng buộc tự nhiên; tránh giá biến động trừng phạt.

## Kiến trúc và nhất quán

| Phương thức | Chi phí và độ chính xác | Kết luận |
|---|---|---|
| Mỗi frame | O(ô × FPS), phụ thuộc client | loại cho domain |
| Fixed interval | dễ hiểu, chạy cả khi không đổi; drift/catch-up | chỉ khi thật cần |
| Event-based | ít việc, cần xử lý thứ tự/hủy/lưu sự kiện | hợp mutation |
| Lazy timestamp | O(ô được đọc), cần lịch sử môi trường | hợp tiến trưởng |
| Hybrid | lazy theo mốc + event mutation, batch dirty | khuyến nghị |

Authority dùng thời gian server và version, chốt snapshot các điều kiện thay đổi trước khi thay đổi trạng thái; không tính toàn khoảng quá khứ bằng thời tiết hiện tại. Seed RNG theo world, plot, cycle, event loại và version algorithm; cố định kết quả khi commit, không reroll khi retry. Trong một transaction khóa/version-check plot + inventory, validate, reconcile, debit/credit, ghi receipt idempotency và outbox/phiên bản; hai harvest đồng thời tối đa một thành công. Định nghĩa retry trả lại receipt hay conflict nhất quán theo contract, không khẳng định đã có toàn bộ. Tính ô đang cần, tra hàng xóm qua chỉ số grid cố định, cache dirty; Phaser chỉ vẽ vùng nhìn thấy. Bounded catch-up phải quy định rõ kết quả khi vắng lâu, không đánh rơi reward đã hứa. Benchmark 184 ô, hai client, thời gian reconnect và kích thước save trước khi tối ưu thêm; không đưa ECS/service mới.

UI: kiểm tra ô hiển thị “đang lớn / sẵn thu hoạch”, gợi ý tích cực như “đổi họ cây giúp đất màu mỡ”, chi tiết nâng cao trong phần mở rộng. Không hiển thị thuật ngữ backend hay yêu cầu tính toán. Playtest casual chỉ trồng hoa và thu hoạch; advanced thử các bố trí, kể lại quyết định, kiểm số thao tác và niềm vui, không chỉ đếm test.
