# Ma trận sử dụng donor

Bằng chứng và phiên bản: [09](09_SOURCE_INDEX.md). Phân loại kỹ thuật không phải cấp phép pháp lý; trước khi phân phối phải kiểm tra giấy phép từng file và nguồn dữ liệu.

| Nguồn / file | Ý tưởng | Phân loại / công sức / tác động |
|---|---|---|
| Stardew `Crop.cs`, `HoeDirt.cs` | pha, tái sinh, chất lượng, giant | Chỉ tham khảo thuật toán; cao, phụ thuộc XNA/engine/data, không nhập mã hoặc data thương mại; mô phỏng theo mốc nhẹ |
| Stardew `Object.cs`, `MachineData.cs` | quy tắc máy, seed | Chỉ tham khảo thuật toán; vừa–cao, data và engine coupling; đối chiếu xưởng OLW trước |
| DST `farm_plants.lua`, `farmplantstress.lua` | checkpoint và bố trí | Chỉ tham khảo thuật toán; vừa, phụ thuộc entity/component/tuning; tìm hàng xóm theo grid nhỏ; không sao chép |
| DST `farming_manager.lua` | nutrient/ẩm theo ô | Chỉ tham khảo thuật toán; cao, engine world/timer; ba loại chưa được chứng minh cần thiết |
| Vintage `BESoilNutrition.cs`, `BEFarmland.cs` | hồi đất, stage timestamps | Chỉ tham khảo thuật toán; cao, Vintage API/world climate/save; tránh per-frame |
| F1 `acnh_flowers.py`, F2 `flowers.py` | genotype, phân phối và tìm đường | Chỉ tham khảo thuật toán; vừa–cao, Python/data cộng đồng; chưa xác minh license, không copy |
| F3 `scripts/hybridize.py` | tích phân bố | Chỉ tham khảo thuật toán; vừa; mã GPL-3.0-or-later và dữ liệu có giấy phép riêng (xem LICENSE.md), không copy vào dự án nếu chưa đánh giá |
| OLW `src/shared/donor/*` hiện hữu | module đã vend | Đã tích hợp có điều kiện theo `docs/UPSTREAM_REUSE.md`; kiểm tra license/credits trước khi mở rộng |

Không tìm thấy bằng chứng cấp quyền sao chép Stardew/DST chỉ vì repo công khai; Vintage và F1/F2 cần kiểm tra license cụ thể tại SHA trước mọi tái sử dụng. Không bê nguyên repository.
