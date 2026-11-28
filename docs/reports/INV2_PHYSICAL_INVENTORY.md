# INV.2 — Ba lô và kho vật lý

Bản thử Dev LAN nằm trên `feature/inv2-physical-inventory`, dựa trên local main `72270c5c375d819b3aa7b4baff1928dc03610c88`. Local main đã hợp nhất hotfix `5be8de5` qua `c6df885`. Lần fetch cuối vẫn thấy `origin/main` ở RC2 `fe1937b`. INV.2 có cổng bật riêng và yêu cầu tên save `.dev-lan-state-inv2-*.json`.

Bản cập nhật điều khiển, thiết kế và ảnh nghiệm thu nằm trong [báo cáo tương tác và giao diện](INV2_WORLD_CONTROLS_AND_UI.md).

## Nghiên cứu nguồn

Hai repository dưới đây được clone nông ra thư mục tạm ngoài OLW. Mã TypeScript và giao diện dùng thiết kế, art và hợp đồng OLW.

| Nguồn đã đọc | Áp dụng trong OLW |
| --- | --- |
| [Inventory.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley.Inventories/Inventory.cs#L261) và [InventoryMenu.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley.Menus/InventoryMenu.cs#L307) | Xóa vật phẩm giữ nguyên địa chỉ ô. Di chuyển, chia, đổi và gộp theo giới hạn; chỉ ghi khi có đích hợp lệ. |
| [Farmer.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley/Farmer.cs#L2784) và [Toolbar.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley.Menus/Toolbar.cs#L39) | Theo dõi `shiftToolbar`, `CurrentToolIndex` và `MaxItems`. OLW xoay chỉ số hàng đang hoạt động qua các hàng 9 ô để giữ địa chỉ kho. |
| [Item.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley/Item.cs#L678) | So phẩm cấp, định danh và metadata trước khi gộp. Trang bị có định danh riêng được giới hạn một món mỗi ô. |
| [ItemGrabMenu.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley.Menus/ItemGrabMenu.cs#L1050), [Chest.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley.Objects/Chest.cs#L731) và [FarmerTeam.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley/FarmerTeam.cs#L1468) | Nạp stack đích trước, sắp xếp theo nhóm. Kho có định danh riêng và giao dịch đồng thời được tuần tự hóa theo phiên bản thế giới. |
| [InventoryPage.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley.Menus/InventoryPage.cs#L286) và [Utility.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley/Utility.cs#L3110) | Theo dõi nút thùng rác, cấp thùng rác và cách hoàn tiền. OLW yêu cầu chọn lượng, xác nhận bỏ và kiểm tra bảo vệ ở server. Hoàn xu chưa được mở. |
| [ShopMenu.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley.Menus/ShopMenu.cs#L1300) | Giao dịch cần chốt vật phẩm và tiền cùng lúc. Bản thử dùng lại giá theo phẩm cấp và bộ đếm bão hòa của OLW. |
| [CraftingPage.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley.Menus/CraftingPage.cs#L448) và [Workbench.cs](https://github.com/Dannode36/StardewValleyDecompiled/blob/5225ef409e42a6159a82cf81200bf6eb315c9961/Stardew%20Valley/StardewValley.Objects/Workbench.cs#L50) | Đọc đường truyền container vào `consumeIngredients` và khóa rương gần qua `MultipleMutexRequest`. Hợp đồng OLW nhận kho đủ điều kiện và trả biên nhận từng stack. |
| [ConvenientInventory.cs](https://github.com/alanperrow/StardewModding/blob/acf36e94960a9d30afcad1360a72c65472a0e9df/ConvenientInventory/ConvenientInventory.cs#L71), [QuickStackInMenuLogic.cs](https://github.com/alanperrow/StardewModding/blob/acf36e94960a9d30afcad1360a72c65472a0e9df/ConvenientInventory/QuickStack/QuickStackInMenuLogic.cs#L92), [QuickStackLogic.cs](https://github.com/alanperrow/StardewModding/blob/acf36e94960a9d30afcad1360a72c65472a0e9df/ConvenientInventory/QuickStack/QuickStackLogic.cs#L211), [AutoOrganizeLogic.cs](https://github.com/alanperrow/StardewModding/blob/acf36e94960a9d30afcad1360a72c65472a0e9df/ConvenientInventory/AutoOrganize/AutoOrganizeLogic.cs#L64) và [InventoryExpansions.cs](https://github.com/alanperrow/StardewModding/blob/acf36e94960a9d30afcad1360a72c65472a0e9df/ConvenientInventory/Integrations/InventoryExpansions.cs) | Đọc `FavoriteItemSlots`, chọn rương trong phạm vi, bỏ qua ô bảo vệ, tự sắp xếp và mở rộng bitmap khi dung lượng đổi. OLW lưu yêu thích theo stack, khóa theo ô, bỏ qua hàng đang dùng khi sắp xếp. |

## Mô hình và hành vi đã chạy

- Một save giữ các ô vật lý theo `home`, `backpack:<userId>` và `overflow:<userId>`. Chủ sở hữu và địa chỉ ô quyết định thao tác hợp lệ. Thanh nhanh đọc 9 ô của hàng đang hoạt động. Không có bản ghi kho thứ hai cho thanh nhanh. Ba lô có 18 ô ban đầu. Phím 1–9 chọn vật phẩm. Nhấn ngắn Shift hoặc chạm biểu tượng hàng để đổi hàng.
- Mở kho bằng tương tác với tủ lạnh trong nhà. Dev LAN chỉ trả dữ liệu và nhận giao dịch kho khi người chơi ở cạnh tủ. Hiển thị tối đa 36 ô kho mỗi trang. Tìm và lọc giữ nguyên địa chỉ ô. Desktop dùng kéo thả hoặc Shift+click, mobile dùng chọn món rồi chọn ô, tách đôi, chuyển nhanh và đổi hàng bằng nút. Chọn món chỉ tạo trạng thái tạm ở trình duyệt. Server ghi nguyên tử khi nhận thao tác cùng `version`, `stackId` và khóa phát lại. Có GET tương thích được chiếu từ ba lô cho thông báo WebSocket.
- Sắp xếp giữ nguyên hàng đang dùng, ô khóa và món yêu thích. Cất nhanh bỏ qua món khóa, yêu thích, giữ chỗ và trang bị. Thả tạo thực thể thuộc save, có bản đồ, tọa độ và người thả. Hai thành viên trong tầm có thể nhặt; món dư ở lại khi ba lô đã đầy. Một thế giới giữ tối đa 64 món rơi, kể cả qua tải lại. Món không tự hết hạn. UI liệt kê món gần trong ba lô và nút ba lô đánh dấu khi có món gần.
- Ba lô mở lên 27, 36, 45 và 54 ô với giá thử 100, 250, 500 và 850 xu. Tham chiếu RC2 là ví khởi đầu 50 xu, hạt lúa 4 xu, lúa thường 8 xu và táo thường 22 xu. Giá này dành cho playtest, còn chờ vòng cân bằng kết hợp. Bán tại chợ hoặc gửi ở gần thùng hàng dùng duy nhất số lượng của ô được chọn và ví chung hiện có. Gửi hàng dùng bộ đếm bão hòa hiện tại. Các thao tác trả về lỗi khi món được bảo vệ, tồn kho đổi hoặc save ghi thất bại.

## Chuyển save

Khi bật thí điểm, server lập ô kho xác định từ thứ tự dữ liệu cũ, giữ ví, gói khởi đầu đã áp dụng, phẩm cấp và metadata có sẵn. Đồ cá nhân dư được giữ trong kho riêng của người sở hữu. Các lô hàng đồng nhất rất lớn có thể được rút theo từng chồng. Khi chuyển thành công, bucket tổng cũ được bỏ trong cùng lần lưu và lần đọc sau dùng save vật lý đã có.

Nút **Lấy món từ ô nhanh cũ** dùng các liên kết còn trong cùng browser origin. Sau xác nhận, liên kết cá nhân đưa stack hiện có về đúng ô nếu khả thi. Liên kết dùng chung chuyển một món từ kho còn hàng để tránh gán toàn bộ kho cho người đến trước. Dữ liệu lịch sử thiếu định danh cá thể được tạo ID xác định. Độ bền từng đơn vị của một dòng tổng, liên kết của origin/browser khác và người sở hữu dự kiến của đồ chung không thể suy ra. Save có định danh trang bị trùng hoặc còn lời mời ăn của mèo đang giữ món dừng chuyển đổi để giữ nguyên dữ liệu.

## Bàn giao tích hợp

Xem [INV.2d — Gameplay và save thật](INV2D_GAMEPLAY_AND_OWNER_SAVE.md) để biết các tuyến đã nối trong Dev LAN. Phần dưới ghi lại tình trạng ở đợt nền tảng.

| Điểm nối còn mở | Điều kiện để bật gameplay đầy đủ |
| --- | --- |
| **M3d/M3e** `feat/farming-fishing-visuals@ad39c19` | Giữ đường `App.tsx` → `WorldScene.ts` cho phiên bản và FX. Farm command cần địa chỉ ô và `stackId` của hạt/dụng cụ thực. Gieo và thu hoạch cần chung giao dịch với ruộng. Khi ba lô đầy, phần thưởng còn chờ phải giữ trong trạng thái domain hoặc luống. |
| **M3g** `feat/deep-fishing-progression@167a732` | Adapter Phase B đọc cần, dây, lưỡi, mồi và độ bền từ ô vật lý. Cần giữ và cập nhật đúng `instanceId` cùng lượt câu và phần thưởng phía server. `creditPhysicalReward` trả phần chưa nhận để domain lưu. |
| **Xưởng, bếp, shop mua hàng, vật nuôi, thư/quà và pet** | Các thao tác aggregate cũ trên save thí điểm bị chặn. Dùng `debitPhysicalBackpackSlot`, `reservePhysicalIngredients`, `refundPhysicalIngredients` và biên nhận chứa phẩm cấp/metadata. Cần nối yêu cầu địa điểm và ghi các biên nhận cùng giao dịch hiện có. |
| **Supabase, Local Preview và hiển thị món rơi trên bản đồ** | Các mode thường vẫn dùng quyền sở hữu của hotfix. Cutover Supabase cần schema ô vật lý, khóa giao dịch, RLS, migration và kiểm thử nhiều kết nối. Local Preview cần adapter trên cùng mô hình. Marker Phaser cho món rơi cần nối sau khi thống nhất các thay đổi đang có ở `WorldScene`. |

INV.2a và INV.2b đã có lát chạy trên Dev LAN cô lập. INV.2c có nâng cấp và bán/gửi hàng trong thí điểm. Các điểm nối trên quyết định khi nào toàn bộ nhiệm vụ có thể nghiệm thu.

## Kiểm thử

- 35 ca Vitest tập trung qua, gồm bộ bảo toàn vật phẩm, hotfix và NET.1. Sau các sửa cuối, 11 ca vật lý và ví chạy lại qua.
- Playwright chạy đổi hàng, kéo thả desktop, hai client tranh chồng cuối, nhặt đồng thời và chuyển ô nhanh cũ. Ba hồi quy headless ở chế độ thường qua gồm hạt lúa, phản hồi đến muộn và WebSocket reconnect. Chạy desktop và Chromium giả lập iPhone theo từng ca; nghiệm thu iPhone Safari thật để chủ dự án thực hiện.
- Khởi động tiến trình Dev LAN mới từ save đã chuyển. Slot 1 vẫn giữ đúng ID và một hạt lúa, revision 2 và ví 50 xu.
- ESLint qua với 4 warning sẵn có. Typecheck, build và production guard qua. Bundle production không có endpoint, flag server hoặc modal riêng của INV.2.

## Commit và cách chạy

- INV.2a `0738034630de093abfd7536943e371bc72ab71f9`
- INV.2b `6a78888b7dab9b51d8d5e1a64deff943c70f7f72`
- Lát thí điểm INV.2c `e612a3c29a7ddd1eb000b23f105da48de7007b8c`

```powershell
Set-Location 'C:/Users/admin/Downloads/OLW-feat-inv2-physical-inventory'
$env:OLW_DEV_LAN_PHYSICAL_INVENTORY = '1'
$env:VITE_OLW_PHYSICAL_INVENTORY = '1'
$env:OLW_DEV_LAN_STATE_FILE = '.dev-lan-state-inv2-playtest.json'
npm run dev -- --host 127.0.0.1 --port 4230 --strictPort
```

Mở [bản thí điểm](http://127.0.0.1:4230/?extended-world=1), tạo nhà thử, vào vai Mây hoặc Nắng, rồi tương tác với tủ lạnh ở góc dưới bên trái nhà để lấy đồ. I mở ba lô ở mọi bản đồ. Để thử migration, đặt một bản sao save dưới tên file thí điểm trước khi chạy server.
