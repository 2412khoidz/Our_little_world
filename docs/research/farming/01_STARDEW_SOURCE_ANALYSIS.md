# Stardew Valley 1.6 — phân tích mã nguồn

Nguồn [S] trong [09](09_SOURCE_INDEX.md); VERIFIED_SOURCE, độ tin cậy cao đối với nhánh đã đọc, không đồng nghĩa đã đối chiếu mọi phiên bản game. Mã decompile và dữ liệu thương mại chỉ dùng nghiên cứu; không sao chép vào OLW.

## Tăng trưởng và thu hoạch

`Crop` constructor nạp `DaysInPhase`, thêm pha sentinel 99999 (Crop.cs:256–257). `newDay(state)` (789–875) nhận trạng thái nước, môi trường, thời gian/pha; cây ngoài trời chết khi sai mùa, tiếp tục nếu đã tưới hoặc `NeedsWatering=false`. Cây chưa thu hoạch tăng ngày pha có chặn, chuyển pha và bỏ qua pha <=0; cây tái sinh giảm đếm. Ở thu hoạch, `RegrowDays <= 0` xóa cây; nếu dương thiết lập đếm tái sinh (723–733). OLW không nên sao chép chết trái mùa.

Tại `harvest` (543–580), L = FarmingLevel, F = soil.GetFertilizerQualityBoostLevel(): `g=0.2*(L/10)+0.2*F*((L+2)/12)+0.01`, `s=min(0.75,2*g)`. Lần thử iridium chỉ khi F>=3 với ngưỡng g/2; nếu thất bại thử gold bằng một lần ngẫu nhiên mới; tiếp theo thử silver bằng lần mới hoặc F>=3; rồi clamp theo crop data. Với các ngưỡng trong [0,1], xác suất thực tế gold = `(1-I*g/2)*g`, silver = `(1-I*g/2)*(1-g)*(I ? 1 : s)` với I=1 khi F>=3. Không được xem g và s là xác suất cuối độc lập; clamp chất lượng sau roll có thể gộp hạng. Ví dụ L=0 F=0: gold 1%, silver 0.99*2%=1.98%. Stack min/max theo dữ liệu và level; còn các nhánh bonus chưa phân tích đầy đủ.

`newDay` (828–867): cây đạt pha cuối tại Farm hoặc map cho phép giant, kiểm điều kiện data và roll seed theo ngày/ô/id; duyệt hình chữ nhật `TileSize`, yêu cầu HoeDirt và cùng `indexOfHarvest` tại mọi ô; xóa crop và thêm GiantCrop. Điều kiện thực thi bao gồm đường đi tưới ở trên; không suy diễn mọi ô đều chín từ vòng kiểm tra này. Đánh đổi: giữ diện tích và chờ thay vì thu hoạch ngay. Xem thêm `GiantCrop.cs` và `GiantCropData` trước khi cân bằng phần thưởng.

## Hạt giống và máy

`Object.OutputSeedMaker` (2241–2273) tìm seed đầu tiên trong crop data có HarvestItemId khớp input object; không tìm được trả null. Seed theo ngày/vị trí/thời gian: roll đầu <0.005 cho item 499 một cái, nếu không roll mới <0.02 cho 770 số 1–4, còn lại seed số 1–3. Xác suất vô điều kiện nhánh thứ hai 0.995*0.02 = 1.99%, nhánh thường 97.51%; chưa xác minh ý nghĩa item ID bằng game data, không gán tên. `Object` gọi `MachineDataUtility.TryGetMachineOutputRule` theo trigger (1707, 2384), `OutputMachine` (2477): quy tắc data-driven thay vì timer cho từng công thức trong UI.

## Chưa hoàn tất

Cần truy `HoeDirt.dayUpdate`, tốc độ phân/sprinkler, `GameLocation` update, `Farmer.gainExperience`/professions, `Object.sellToStorePrice` (6895), data crops/machine và greenhouse trước khi khẳng định công thức kinh tế, thu nhập hay tối ưu. Quy tắc đầu vào–đầu ra machine còn phụ thuộc data; chưa có bảng lợi nhuận thực. Lựa chọn OLW: học nguyên tắc timing và bonus hữu hạn, không sao chép tài sản/mã.
