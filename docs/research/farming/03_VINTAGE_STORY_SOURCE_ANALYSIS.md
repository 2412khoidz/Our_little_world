# Vintage Story — đất và lịch tăng trưởng

Nguồn [V] [09](09_SOURCE_INDEX.md), VERIFIED_SOURCE, độ tin cậy cao trong các hàm dẫn dưới đây. `BlockEntitySoilNutrition` là base của `BlockEntityFarmland`; dependency engine/API và dữ liệu crop bên ngoài mod khiến không thể sao chép tách rời.

`BESoilNutrition.cs:38–58, 77–94, 491–560` lưu ba nutrient, fertilizer nhả chậm, độ ẩm, thời gian và độ phì gốc vào tree attributes. `BEFarmland.cs:170–202, 227–271`: giờ mỗi giai đoạn phụ thuộc ngày/tháng tăng trưởng, số giai đoạn và `GetGrowthRate(requiredNutrient)`; mỗi lần tiến giai đoạn tiêu `NutrientConsumption / max(1,GrowthStages-1)` của loại crop yêu cầu. Nhờ các loại cần N/P/K khác nhau, đổi cây có thể cho chất trước hồi lại — suy luận từ công thức, không phải bằng chứng cân bằng thực tế.

`updateSoilFertility` 350–384: hồi về fertility gốc khi được phép, loại đang tiêu hồi bằng 1/3; phân nhả tối đa 0.25/lần vào mỗi chất đến 100, khi hết phân mức dư trên fertility gốc giảm 0.05/lần. Đơn vị là mỗi lần gọi, không tự ý gọi là mỗi giờ. `updateMoistureLevel` 231–263: sàn ẩm `clamp(1-distance/4,0,1)`, thời gian khô bị giới hạn bằng 4 ngày giữ nước; giảm tuyến tính và cộng mưa theo điều kiện phơi trời. `GetGrowthRate` 400–416: `m=max(.01, moisture*100/70-.143)^.35`; nhân m với 1.1, 1, .9, .6, .3, .1 theo các ngưỡng NPK >75, >50, >35, >20, >5, còn lại. Cây vẫn có tốc độ dương rất thấp trong trường hợp cạn.

`BEFarmland.cs:53–87` bọc interval update, điều chỉnh lịch theo light và chỉ thử lớn khi vượt thời điểm giai đoạn; `BlockEntityFastForwardGrowth.cs` là base cần đọc thêm để kết luận đầy đủ về lịch catch-up, giới hạn và climate history. Crop hỏng nhiệt/thu hoạch giảm ở `BEFarmland.cs:306–307`; chưa truy ngưỡng nhiệt hay công thức sát thương. Không đề xuất chết cây hoặc mô phỏng vi khí hậu liên tục cho OLW.

Đơn giản hóa: bắt đầu một `soilBalance` tùy chọn duy nhất hoặc chỉ bonus luân canh; nếu chơi thử thấy quyết định không đủ khác biệt mới cân nhắc hai nhóm. Khôi phục thụ động có trần và đảm bảo thu hoạch cơ bản; compost chỉ tăng cơ hội bonus. Một biến đất không thể tái tạo đầy đủ vòng bù trừ NPK, đây là đánh đổi có chủ đích.
