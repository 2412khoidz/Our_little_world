# Bàn giao cho chủ nhiệm vụ và agent triển khai

Theo `docs/NEXT_MISSIONS.md`, M3d hiện chỉ là **Animated Processing Machines & Env VFX**, không phải agent Deep Farming. Tên tài liệu được giữ theo yêu cầu R1; không tự mở rộng phạm vi M3d. Xác nhận phân công với chủ dự án, nhất là M3g chưa được xác định và worktree có thể đang thay đổi.

## Ngay — không nhân đôi công việc

1. M3d dùng trạng thái idle/work/done hiện tại để hiển thị máy; không tạo timer/mutation thứ hai. Phối hợp M3e về atlas/UI và agent inventory về transaction; đối chiếu `DonorWorkshopModal`, `FarmPlotVisualController`, `OrchardVisualController`, packer/BootScene.
2. Người phụ trách farming lập bảng `crop/seed/giá/yield/thời gian/recipe` từ catalog thực và benchmark theo horizon hữu hạn; audit transaction Dev LAN/SQL và test hồi quy. Xác minh điều kiện `wateredPeriod !== null` trước khi sửa.
3. Lập playtest 2 người bất đồng bộ, cơ bản và nâng cao; đánh giá sự rõ ràng và công sức, không mặc định thêm hệ thống.

## Sau khi được mở milestone

Thử bonus luân canh + compost một biến, sau đó cân bằng và đo với baseline. Genotype, lineage, instances/stacking, data migration và journal thuộc dự án mở rộng riêng; phải quyết định bảo toàn giống cũ và test rollback. Giant là đồ trang trí/bonus tự nguyện, không khóa thu hoạch. Không làm NPK đầy đủ, héo/chết hàng loạt, giới hạn daily login, độ bền công cụ hoặc mini-game bắt buộc nếu thiếu bằng chứng gameplay.

## Tiêu chí nghiệm thu đề xuất

- Farm cũ load và harvest không mất vật phẩm, hai client cùng thu không nhân đôi; retry và reconnect nhất quán, atomic rollback khi inventory đầy hoặc lỗi.
- Để farm offline dài ngày vẫn có thu hoạch cơ bản; trời/mùa thay đổi qua nhiều mốc không bị tính hồi tố như điều kiện hiện tại; tính xác định theo cycle và server clock.
- Hai người có thể trồng/nhận quà/xem khám phá ở thời điểm khác nhau; một người không có mặt không khóa tiến độ.
- Tính giá trị kỳ vọng, công suất máy và thao tác cho nhiều horizon; không xác nhận vui bằng chỉ số test.
- Focused unit property tests: boundaries, save migration, gene probability tổng 1, deterministic seed, permutation order; transactional integration: same key, different keys same plot, concurrent version conflict, fault/retry; UI mobile và Playwright hai client. Cloud Supabase SQL thật và iPhone Safari vật lý là nghiệm thu riêng, chưa chạy.
- Với thay đổi code tương lai chạy gate lint/typecheck/test/build/E2E của repo; ghi trung thực hai suite canvas jsdom có giới hạn đã biết.
