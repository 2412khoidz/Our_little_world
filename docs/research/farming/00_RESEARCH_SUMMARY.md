# R1 — Tổng quan nghiên cứu (bản nghiên cứu có giới hạn)

Baseline `origin/main` fe1937b7d26db484f5caedc8d93376c82b614bf6. Đây là nghiên cứu, không phải cam kết triển khai. Chỉ số nguồn, SHA và nhãn bằng chứng xem [09](09_SOURCE_INDEX.md); dấu vết và giới hạn trong từng tài liệu. Những phần chưa truy vết được ghi rõ, không suy diễn thành kết luận.

**Phát hiện:** Stardew tính tăng trưởng theo ngày/pha và kiểm tra chất lượng theo chuỗi lần tung; DST đánh giá nhiều điều kiện tại checkpoint, đổi phần thưởng theo tổng stress; Vintage Story lưu NPK/ẩm và dùng thời điểm/giai đoạn để tiến thời gian; các công cụ ACNH cộng đồng minh họa phân bố kiểu gen ẩn và phép lai Mendel. OLW đã có nhiều nền tảng này dưới dạng khác, đặc biệt 40 cây, phân, tưới, nhà kính, xưởng và hoa lai theo công thức. Không đề xuất xây lại.

**Ưu tiên:** (1) xác nhận hành vi hiện tại và an toàn giao dịch; (2) thử một chỉ số đất nhẹ cùng bonus luân canh tùy chọn; (3) đo kinh tế/khả năng hiểu qua chơi thử; (4) nghiên cứu giống có kiểu gen sau khi có quyết định sản phẩm. Đừng thêm đồng thời ba nguồn dinh dưỡng, stress theo ngày và gene ẩn.

**Điều phối:** `M3d` theo roadmap là hoạt ảnh xưởng/VFX; `M3e` là mỹ thuật câu cá. Không có `M3g` trong tài liệu baseline được tìm; worktree `feat/farming-fishing-visuals` có thay đổi chưa commit và handover tự mô tả đã triển khai M3d+M3e, chờ owner playtest; nhánh fishing progression có prototype chưa commit; `fix/inventory-integrity` có commit 5be8de5. Đây là ảnh chụp trạng thái, không khẳng định trạng thái agent hoặc đã tích hợp. Xác nhận trách nhiệm thực tế trước khi giao. M3d không nên bị giao gameplay trong tài liệu này nếu chưa có chủ dự án đổi phạm vi.

**Giới hạn:** chưa hoàn thành truy vết toàn bộ kinh tế, nghề nghiệp và sprinkler Stardew; tuning và mạng DST; dữ liệu cây Vintage; cloning/định tuyến đầy đủ ACNH; chưa khảo sát diff chưa commit của worktree khác. Cloud SQL và iPhone thật không được kiểm thử. Đây là bản đầu vào kỹ thuật có các lỗ hổng nêu tại từng tài liệu, chưa đáp ứng toàn bộ phạm vi R1.
