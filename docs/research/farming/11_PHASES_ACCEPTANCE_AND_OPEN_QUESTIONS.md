# R1.1 — Lộ trình đề xuất, nghiệm thu và câu hỏi mở

Đây là nghiên cứu và phân phase để chủ dự án quyết định, không tự mở mission hoặc sửa M3d/M3e/M3g. Trước mọi implementation kiểm tra roadmap, worktree và quyền sở hữu module hiện hành.

## Phase 0 — xác minh baseline, không thêm gameplay

Lập trace riêng Dev LAN và Supabase cho plant/water/harvest, flower, workshop, inventory; ghi các ngữ nghĩa idempotency, transaction, clock và parity. Đo projection ở 184 ô, ảnh hưởng mùa/mưa/sprinkler đến progress; kiểm crop đã ready có thể trở lại chưa ready. Ghi số thao tác và lựa chọn của hai người. Đầu ra: kết quả test và benchmark, không khẳng định test thay playtest.

**Gate:** save cũ load; hai client thu cùng ô không nhân đôi; retry cùng key rõ kết quả; reconnect không mất committed state; xác nhận thời tiết không làm retroactive thay đổi ngoài ý muốn. Nếu baseline không đạt, chuyển cho mission sở hữu và không xây feature chồng lên lỗi.

## Phase 1 — thử bonus luân canh hạn chế

Chỉ sau Phase 0 và quyết định sản phẩm, chọn một phương án A/B: `lastFamily` + bonus một lần; hoặc thêm `soilBalance` trong [06](06_DEEP_FARMING_SYSTEM_PROPOSAL.md) nếu người chơi hiểu và muốn. Chốt bonus tại sự kiện có authority; không cộng theo ngày vắng; cây cơ bản vẫn chín và cho sản lượng bình thường. Không thêm NPK, cỏ gây hại hoặc bảy stressor. Dùng fertilizer, sprinkler, tool và xưởng sẵn có.

**Gate:** cùng seed/đầu vào thu được cùng kết quả; không tăng quality vượt clamp, không tạo lãi dương chỉ từ mua–compost–bán; migration old save có default, không thay SKU, không thay kết quả cây đã thu; UI nói lợi ích, không bắt buộc đọc số. Hai người bất đồng bộ có thể trồng/thu và thấy cùng lịch sử luân canh.

## Phase 2 — tùy chọn nghiên cứu giống

Prototype data riêng có version: `plantInstanceId`, `speciesId`, `alleles`, `phenotypeId`, `generation`, parent references tùy chọn, `name`, `algorithmVersion`. Dùng test model 2 locus trước; không import bảng màu hay code donor. Seed RNG ổn định theo world/cycle/action; payload và event id được bảo vệ trong cùng transaction. Định nghĩa gift instance, stack identity, giới hạn tên, schema version, restore/rollback trước khi code. Hợp tác với nhiệm vụ sở hữu inventory/authority, không tự thay contract.

**Gate:** tổng xác suất offspring bằng 1, lai 1×1 đúng 1:2:1, phân biệt genotype cùng phenotype, clone giữ genotype, test cross, sản phẩm bình thường vẫn hữu dụng; transfer bed→inventory→bed→gift giữ đúng allele và tên, song song không nhân bản mẫu hoặc reroll, old flower SKU tiếp tục dùng recipe cũ. Đây là các hành vi **đề xuất**, không phải kết quả đã test.

## Phase 3 — chuỗi và trải nghiệm cặp đôi

Chỉ khi mission nấu ăn, quà và nhà có hợp đồng: dùng output xưởng hiện tại làm nguyên liệu, album chia sẻ lời nhắn/tên cây kỷ niệm, nâng cấp công cụ giảm thao tác. Không tạo vai trò cố định, thưởng đồng thời online hay phần thưởng daily streak. Giant có thể là mục tiêu thẩm mỹ tùy chọn sau thử nghiệm, cần quy tắc footprint/thu hoạch không mất cơ hội.

**Gate:** một người trồng, người kia tiếp tục ngày khác; mọi quyết định có lựa chọn bỏ qua; hai cách chơi casual/advanced cùng có thu hoạch; gift và trạng thái đã commit tồn tại sau reconnect. Test UI tiếng Việt, 430×932 và iPhone Safari vật lý, thêm accessibility; không tính desktop Chromium là nghiệm thu iPhone.

## Test plan

- Unit/property: mốc mùa, nước, ẩm, thay công cụ, overflow, clock lùi, progress đơn điệu, thu hoạch đúng deadline; crop regrow giới hạn; genotype distribution, version migration và RNG cố định.
- Integration: song song hai harvest cùng plot với key giống/khác, retry sau timeout, server restart giữa các bước, DB rollback, hai client trồng và tặng, concurrency trên inventory; test riêng Dev LAN và SQL/Supabase thật, không đồng nhất kết quả.
- E2E/playtest: 2 client desktop, sau đó PC + iPhone thật qua HTTPS; vắng nhiều giờ/ngày, đổi mùa, tưới, thu, mở app nền; casual chỉ trồng hoa, advanced thử luân canh. Ghi số thao tác, lần phải mở UI, mức hiểu, trải nghiệm vui và thời gian; không kết luận vui từ test count.
- Với implementation tương lai chạy `npm run lint`, `typecheck`, `test`, `build`, E2E liên quan; ghi riêng giới hạn hai suite Canvas jsdom được repo mô tả. Nghiên cứu tài liệu hiện tại không chạy các gate gameplay.

## Danh sách chưa đủ bằng chứng

1. Stardew: data thực seed/crop/machine, giá nâng cấp và tất cả đường shipping/chuyên môn; không có ranking lợi nhuận gốc có thể kiểm chứng. Cần game data có quyền truy cập, đối chiếu rounding, mùa, ngày trồng và các bonus trước khi lập bảng.
2. DST: network replica của từng trường/đơn vị rate, tính nhất quán reconnect và toàn bộ registry/weed; chỉ có master boundary/netvar/save đã dẫn. Mirror có thể không tương ứng release hiện tại.
3. Vintage: các crop definition/data cụ thể, toàn bộ API engine và world calendar khi server ngừng; fast-forward là khi calendar trôi, không khẳng định offline realtime.
4. ACNH: source Nintendo, mutation và cơ chế bảo toàn gene khi inventory/gift chưa có; mọi instance/transfer là thiết kế OLW, không phải xác minh game gốc.
5. OLW: SQL parity và transaction/locking/idempotency khi có cạnh tranh, kết quả tests cloud thật, hành vi thực thời tiết/ETA, chi phí quét thực, ngữ nghĩa stack instance và các mission hiện hành. Chưa chứng minh lỗi runtime chỉ bằng static read.
6. Cân bằng thực: ví dụ [10](10_COMPARISON_AND_BALANCE.md) không tính mọi modifier; chưa chạy benchmark đầy đủ, playtest hai người, iPhone thật hoặc định giá utility tình cảm của cây kỷ niệm.
