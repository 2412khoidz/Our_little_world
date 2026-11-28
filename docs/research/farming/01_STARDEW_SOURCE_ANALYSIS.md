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


## R1.1 — phân, sprinkler, giá và tiến trình

Các link theo SHA ở [chỉ mục](09_SOURCE_INDEX.md#bổ-sung-r11); VERIFIED_SOURCE là hành vi code dịch ngược S, không phải source chính thức. `HoeDirt.applySpeedIncreases` (601–648) reset pha về data, cộng boost của phân + 0.25 cho paddy đủ điều kiện + 0.10 profession 5, tính `ceil(tổng ngày ban đầu × boost)` rồi phân phối số ngày giảm qua pha, tối đa 3 lượt; giữ pha đầu ít nhất một ngày và không đụng sentinel. `GetFertilizerSpeedBoost` (1052–1068): ID 465/466/918 tương ứng .10/.25/.33; `GetFertilizerWaterRetentionChance` (1071–1087): ID 370/371/920 là .33/.66/1; `GetFertilizerQualityBoostLevel` (1091–1107): ID 368/369/919 lần lượt 1/2/3. Đây là ba hướng cơ hội dùng ô phân; không đồng nhất % tốc độ với % giảm thời gian vì làm tròn, phân phối pha và giới hạn ba lượt.

`HoeDirt.dayUpdate` (890–917) gọi `crop.newDay(state)` trước khi có thể reset trạng thái nước theo xác suất retention, paddy gần nước là nhánh riêng; `seasonUpdate` (924–931) có thể xóa phân nếu điều kiện mùa không còn hợp. `Object.DayUpdate` (1678–1695) đăng ký tưới sau farm event, bỏ qua mưa ngoài trời và luật NO_SPRINKLER; `GetSprinklerTiles` (1642–1662) radius 0 lấy bốn ô kề, radius dương lấy hình vuông bao gồm tâm; `ApplySprinkler` (1575–1582) chỉ đặt state=1 trên HoeDirt phù hợp, tôn trọng NoSprinklers. Quyết định là trả chi phí chế tạo/không gian để giảm thao tác, không phải tự động giải mọi quyết định giống/xưởng. Không suy diễn footprint của từng SKU khi chưa đối chiếu data/radius.

`Crop.harvest` (675–683) cho player, không phải Junimo, XP `round(16*ln(1+0.018*basePrice))` trong nhánh harvest thành công; giá là `Object.Price` và số lượng thêm không làm công thức này nhân theo số quả trong đoạn được đọc. `Farmer.gainExperience` (2954–3015) cộng XP và xếp các mức mới; `LevelUpMenu` (467–490) chọn nhánh profession, ID 0/1 rồi 2/3 hoặc 4/5 theo nhánh. `Object.getPriceAfterMultipliers` (6991–7060) với profession 1 áp 1.1 cho một số category, profession 4 áp 1.4 cho category -26; xét các farmer đủ điều kiện và dùng multiplier cao nhất, điều kiện ví riêng khác ví chung. Không khẳng định cộng dồn hai người. `Object.sellToStorePrice` (6895–6913) áp chất lượng `(1+0.25*quality)` rồi multiplier, difficulty và ép số nguyên; còn phụ thuộc category/đường bán.

`WateringCan.OnUpgradeLevelChanged` (105–125) tăng dung tích 40,55,70,85,100 theo level; `Tool.tilesAffected` (957 trở đi) thay footprint theo power/hướng, `WateringCan.DoFunction` (147–159) tiêu stamina theo power/level. Đây là phần đã xác minh, chưa truy đủ giá/ngày nâng cấp và data mở khóa. Đối chiếu OLW: đã có `toolUpgrades.ts`, `expandToolPlotFootprint` và sprinkler; không xây lại. Tính value theo seed, số thu đúng horizon, chất lượng, nghề, thời gian máy và thao tác; dữ liệu crop/machine gốc chưa trích nên không tuyên bố cây Stardew tối ưu.
