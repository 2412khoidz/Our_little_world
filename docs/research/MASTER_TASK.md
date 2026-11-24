# CẬP NHẬT QUYẾT ĐỊNH TRƯỚC KHI THỰC HIỆN MASTER RESEARCH

Tôi chính thức duyệt Demo E — Unified Cozy World làm định hướng mỹ thuật của Our Little World.

- Giữ nguyên lựa chọn asset và hệ avatar Modern Interiors.
- Không tạo Demo F.
- Không nghiên cứu lại artwork.
- Chưa tích hợp artwork vào game chính trong research milestone này.
- Những vấn đề nhỏ về sàn nhà, đường đi, nền cỏ, tỷ lệ pet và camera mobile sẽ được xử lý trong milestone tích hợp sau.

## Ràng buộc ngân sách mới — rất quan trọng

Tôi là sinh viên và có ngân sách rất hạn chế.

Mục tiêu phát triển Our Little World với chi phí bổ sung gần nhất có thể với 0 đồng.

- Tận dụng tối đa asset miễn phí hiện có.
- Ưu tiên mã nguồn mở có license phù hợp.
- Ưu tiên free tier cho hosting, database và storage.
- Tận dụng quota Google AI Pro, GPT Plus/Codex và GitHub Copilot Student.
- DeepSeek V4.1 Flash là agent triển khai chi phí thấp khi cần.
- Không mặc định sử dụng dịch vụ trả phí.
- Không tự mua asset hoặc dịch vụ.
- Không overengineering.
- Không tạo tài liệu dài dòng hoặc trùng lặp.
- Chỉ nghiên cứu sâu những repository thực sự có giá trị.
- Ưu tiên các giải pháp đơn giản, dễ bảo trì và phù hợp với đúng hai người dùng.

Giữ nguyên tầm nhìn dài hạn của dự án, nhưng đánh đổi tốc độ phát triển để giảm chi phí nếu cần thiết.

Hãy thực hiện toàn bộ Master Prompt bên dưới theo thứ tự, duy trì checkpoint và không dừng lại chờ xác nhận giữa các phase nghiên cứu.

Khi hoàn thành, dừng lại và báo cáo. Chưa chuyển sang implementation.
# OUR LITTLE WORLD — MASTER RESEARCH, GAME DESIGN, ARCHITECTURE & HANDOVER

Bạn đóng vai trò Principal Software Architect, Senior Game Designer, Game Economy Designer và Technical Lead của dự án Our Little World.

Đây là nhiệm vụ nghiên cứu và thiết kế tổng hợp, chuẩn bị cho quá trình phát triển dài hạn bằng các coding agent như DeepSeek V4.1 Flash.

Tôi sẽ không có mặt trong quá trình bạn thực hiện nhiệm vụ này. Hãy chủ động thực hiện lần lượt tất cả các phase dưới đây mà không cần chờ tôi xác nhận giữa các phase.

Nếu gặp quyết định cần người dùng phê duyệt, hãy ghi vào danh sách Pending Decisions, sử dụng giả định hợp lý có ghi chú để tiếp tục nghiên cứu những phần không bị ảnh hưởng.

Không tự mua asset, dịch vụ hoặc sử dụng thông tin xác thực chưa được cung cấp.

---

# PHASE 0 — CONTEXT RECOVERY & EXECUTION PLAN

Trước tiên, đọc và đối chiếu:

- AGENTS.md.
- README.md.
- Roadmap và Agent Plan hiện tại.
- docs/PROGRESS.md.
- docs/DECISIONS.md.
- docs/ASSETS.md.
- docs/ART_EVALUATION.md.
- Tài liệu kiến trúc.
- Kết quả Art Direction & Demo E mới nhất.
- Source code và test suite hiện tại.

Xác định:

- Những gì đã triển khai.
- Những gì đã kiểm thử tự động.
- Những gì đã kiểm thử trên thiết bị thật.
- Những gì chưa nghiệm thu.
- Các quyết định đã được người dùng chấp thuận.
- Các đề xuất chưa được chấp thuận.
- Các rủi ro kỹ thuật còn tồn tại.

Không coi một tính năng đã được viết trong roadmap là tính năng đã hoàn thành.

Tạo execution plan và checklist cho toàn bộ nhiệm vụ.

Sử dụng checkpoint lưu trong repository để có thể tiếp tục nếu session bị gián đoạn hoặc context bị compact.

Không nghiên cứu lại những công việc đã hoàn thành và có đủ bằng chứng.

---

# PHASE 1 — OPEN SOURCE RESEARCH & REUSE STRATEGY

Mục tiêu là tránh reinvent the wheel, tận dụng mã nguồn mở hợp lệ và giảm chi phí phát triển.

## 1.1. Farming, gameplay, kinh tế và progression

### Meadowbrook Farm — P0

https://github.com/Shiz0id/webfarmville

Nghiên cứu:

- Economy simulator, đặc biệt scripts/balance-sim.ts nếu tồn tại tại revision đang kiểm tra.
- Shared domain logic.
- Farming.
- Production chains.
- Processing.
- Inventory.
- Transactions.
- Orders.
- Furniture.
- Economic balancing.
- Progression.

### Harvest Hollow

https://github.com/KrasimirKralev/harvest-hollow

Nghiên cứu nông trại co-op, sở hữu chung, sản xuất, chăn nuôi, chế biến và progression dài hạn.

### Farming Simulator Cabaços

https://github.com/goncalojbsousa/Farming-Simulator-Cabacos

Nghiên cứu farming bằng Phaser và TypeScript, làm đất, gieo trồng, tưới nước, thu hoạch, bán hàng và nâng cấp công cụ.

### Greens

https://github.com/fernforge-arcade/greens

Nghiên cứu fishing, farming, hybrid crops, cooking, crafting, NPC, quests, shops và thời tiết.

### Sunflower Land — P1

https://github.com/sunflower-land/sunflower-land

Nghiên cứu inventory, resource management, state machine, content organization, economy và cách sử dụng Sunnyside World artwork.

Không đưa blockchain, NFT, Web3 hoặc token tiền thật vào Our Little World.

## 1.2. Thú cưng và ứng dụng dành cho cặp đôi

### Our Little Pet — P0

https://github.com/itzmeNotgab/Ourlittlepet

Nghiên cứu ghép cặp, nuôi mèo chung, trạng thái pet, chăm sóc, cảm xúc, mini-game, trang phục và kỷ niệm.

### Hackipups

https://github.com/ulisesvina/hackipups

### PairNest

https://github.com/YourSigh/pairnest

Nghiên cứu không gian riêng dành cho hai người, nhật ký, album, wishlist, thú cưng, mini-game và các tính năng đời thường.

## 1.3. Phòng học chung

### Coco Working — P0

https://github.com/cocolocow/cocoworking

Nghiên cứu Phaser, React, TypeScript, multiplayer pixel art, Pomodoro đồng bộ, animation, âm thanh môi trường và silent co-presence.

### Focus Street

https://github.com/therealprodigy/focus-town

### Study Buddy

https://github.com/caolanegan/study-buddy

### Focus Picnic

https://github.com/gotcha-khushi/Focus_Picnic

Nghiên cứu phòng học chung, phần thưởng, nội thất, thú cưng, đồng hồ, Supabase synchronization và không gian tập trung.

Hai người dùng đều không thích bật video call trong lúc học vì dễ mất tập trung.

Ưu tiên trải nghiệm hiện diện cùng nhau trong thế giới ảo mà không bắt buộc giao tiếp liên tục.

## 1.4. Cinema và local video streaming

### WatchParty — P0

https://github.com/howardchung/watchparty

Nghiên cứu:

- Play/pause/seek synchronization.
- Clock synchronization.
- Drift correction.
- Buffering.
- Reconnect.
- Local media.
- HLS.
- WebRTC.
- Voice chat.

### Local Watch Party — P0

https://github.com/smSamani/Local-Watch-Party

Nghiên cứu:

- Phát phim từ laptop Windows.
- FFmpeg.
- Transcoding.
- HLS.
- Phụ đề.
- Voice chat.
- Audio ducking.
- Remote browser playback.

### Syncplay

https://github.com/Syncplay/syncplay

Nghiên cứu thuật toán đồng bộ thời điểm phát, độ trễ, hiệu chỉnh sai lệch và phục hồi trạng thái.

Yêu cầu Cinema:

- Hai người không đăng ký dịch vụ streaming.
- Nguồn phim chủ yếu là video local có quyền sử dụng.
- Người thứ hai sử dụng iPhone Safari/PWA.
- Không bắt người xem cài VPN hoặc ứng dụng bên thứ ba.
- Ưu tiên chất lượng hình ảnh và đồng bộ gần realtime.
- Hỗ trợ play/pause/seek từ cả hai phía theo quy tắc phòng.
- Hỗ trợ phụ đề và voice chat.
- Giảm âm lượng phim khi trò chuyện nếu người dùng bật tính năng này.
- Xác thực truy cập, bảo mật media và chi phí thấp.

PoC hiện tại đã được người dùng thử nghiệm giữa Windows và Redmi K70E qua cùng Wi-Fi, cho kết quả đồng bộ gần như realtime theo quan sát.

Chưa coi đây là nghiệm thu WAN, phim bitrate cao, iPhone Safari hoặc truy cập từ xa không cần VPN.

Nghiên cứu riêng khả năng truyền dữ liệu video và khả năng đồng bộ trạng thái trình phát. Không đánh đồng hai bài toán.

## 1.5. Pet AI và behavioral simulation

https://github.com/yongjiexue88/Petivolution

https://github.com/mnemonice/nadagotchi

https://github.com/donkimc/1000pets

https://github.com/itzmeNotgab/Ourlittlepet

Nghiên cứu Utility AI, personality, memory, emotion, autonomous behavior, simulation clock và separation between simulation and rendering.

## 1.6. Quy trình nghiên cứu

- Kiểm tra repository tồn tại, khả năng truy cập và license.
- Clone nông hoặc tải source khi phù hợp.
- Lưu repository tham khảo ngoài repository chính.
- Ưu tiên terminal, git, ripgrep và local scripts thay vì browser automation.
- Không thực thi script hoặc executable không đáng tin cậy.
- Phân tích source code thực tế, không chỉ README.
- Ghi URL, commit SHA, đường dẫn file, symbol/function và license.
- Kiểm tra license của code và artwork riêng biệt.
- Đánh giá dependencies, test coverage, maturity, maintainability và compatibility.
- Không mặc định Phaser 3 tương thích trực tiếp với Phaser 4.
- Không mặc định repository công khai đồng nghĩa được phép tái sử dụng code.

Phân loại các module:

A. Có thể tái sử dụng trực tiếp.

B. Có thể port hoặc điều chỉnh.

C. Chỉ nên học ý tưởng, kiến trúc hoặc thuật toán.

D. Không phù hợp hoặc không có quyền tái sử dụng.

Ưu tiên phân tích sâu:

- Meadowbrook Farm.
- Coco Working.
- WatchParty.
- Local Watch Party.
- Our Little Pet.
- Petivolution.

Sàng lọc các repository khác trước khi phân tích sâu để tránh lãng phí context và token.

Không bắt buộc phân tích toàn bộ file trong mọi repository.

## 1.7. Câu hỏi cần trả lời

- Có repository nào đủ tốt để fork làm nền cho toàn bộ dự án không?
- Giữ codebase hiện tại và tái sử dụng từng module có hiệu quả hơn không?
- Những hệ thống nào có thể tiết kiệm nhiều công sức nhất?
- Có quyết định kiến trúc hiện tại nào cần điều chỉnh trước khi gameplay mở rộng không?
- Tích hợp như thế nào mà không phá WorldBackend, Supabase, RLS, DevLanBackend, asset pipeline và PWA?
- Những module nào phù hợp để DeepSeek triển khai?
- Những module nào cần model mạnh review?

## Deliverables

- docs/research/OPEN_SOURCE_RESEARCH.md
- docs/research/REUSE_MATRIX.md
- docs/research/INTEGRATION_PLAN.md
- docs/research/ARCHITECTURE_REVIEW.md

Sau khi hoàn thành, tự động tiếp tục Phase 2.

---

# PHASE 2 — GAME DESIGN & WORLD PROGRESSION

Our Little World là cozy life simulator dành riêng cho một cặp đôi yêu xa.

Không chỉ là ứng dụng có đồ họa pixel art, mà phải có gameplay thực sự hấp dẫn, thử thách, risk/reward và mục tiêu dài hạn.

Hai người dùng không phải gamer hardcore.

## 2.1. Triết lý gameplay

- Dễ tiếp cận, có chiều sâu.
- Chơi solo hoặc co-op.
- Không bắt buộc cả hai online đồng thời.
- Có thể thất bại khi thực hiện thử thách.
- Không bị trừng phạt nặng vì không đăng nhập.
- Không ép streak.
- Không quảng cáo hoặc pay-to-win.
- Không bắt buộc học bài để kiếm tài nguyên.
- Không biến tương tác tình cảm thành nghĩa vụ kinh tế.
- Có nhiều con đường phát triển.
- Gameplay phải thú vị ngay cả khi không có LLM.

Gameplay loop:

Sản xuất và khám phá → thu hoạch → trao đổi hoặc chế biến → tích lũy → trang trí và nâng cấp → mở khóa hoạt động mới.

## 2.2. Farming

Thiết kế:

- Làm đất.
- Gieo hạt.
- Tưới nước.
- Thu hoạch.
- Rau củ.
- Hoa.
- Cây ăn quả.
- Chất lượng nông sản.
- Nâng cấp công cụ.
- Lai giống hoa.
- Hoa để tặng đối phương.
- Cây đặc biệt cho ngày kỷ niệm.
- Sử dụng nông sản trong nấu ăn và crafting.

Cây trưởng thành theo thời gian thực, không chết chỉ vì người chơi offline.

## 2.3. Fishing

- Ao cá nhỏ từ V0.2.
- Mini-game câu cá có kỹ năng.
- Cá có độ hiếm và chất lượng.
- Mồi câu và nâng cấp cần câu.
- Thời gian, thời tiết và địa điểm ảnh hưởng kết quả.
- Có thể bán cá, nấu ăn hoặc trưng bày trong bể cá.
- Hai người có thể câu cá cùng nhau.

## 2.4. Cooking

Không thiết kế nấu ăn chỉ bằng cách chọn nguyên liệu rồi bấm nút.

Cần có gameplay thực sự:

- Sơ chế.
- Cắt nguyên liệu.
- Canh thời điểm.
- Điều chỉnh nhiệt.
- Phối hợp chuyển nguyên liệu.
- Trình bày món ăn.
- Chất lượng thành phẩm.

Ba chế độ:

1. Casual cooking: luyện công thức và thư giãn.
2. Co-op cooking: hai người phối hợp để đạt chất lượng cao.
3. Restaurant orders: giới hạn thời gian, yêu cầu chất lượng, phần thưởng lớn.

Có thể thất bại, nấu cháy, mất một phần nguyên liệu hoặc mất cơ hội nhận thưởng.

Risk và reward phải có ý nghĩa.

Tham khảo Overcooked nhưng điều chỉnh độ khó cho hai người chơi casual và màn hình cảm ứng.

## 2.5. NPC và thị trường

Không bán hàng cho một hệ thống vô hình đơn thuần.

Thiết kế NPC:

- Người thu mua nông sản.
- Chủ tiệm hoa.
- Người bán cá.
- Chủ nhà hàng.
- Thợ mộc.
- Chủ tiệm thú cưng.
- Người giao hàng.
- Chủ quán cà phê.
- Các nhân vật bổ sung khi cần.

NPC có:

- Vai trò kinh tế.
- Lịch sinh hoạt.
- Giờ mở cửa.
- Tính cách cơ bản.
- Hội thoại viết sẵn.
- Hàng hóa.
- Nhu cầu.
- Đơn đặt hàng.

Có thể bán trực tiếp hoặc sử dụng shipping bin.

Giai đoạn đầu chỉ cần một số NPC ghé thăm nhà hoặc khu chợ nhỏ.

Chưa cần AI Town và LLM.

## 2.6. Tương tác giữa hai người

- Ôm nhau.
- Nắm tay.
- Ngồi chung sofa.
- Ngồi ghế ngoài vườn.
- Nằm nghỉ cạnh nhau.
- Tặng hoa.
- Tặng quà.
- Gửi thư.
- Gửi emote.
- Chụp ảnh chung.
- Picnic.
- Khiêu vũ.
- Cùng chơi với thú cưng.

Thiết kế invite/accept, animation synchronization và interruption rules phù hợp.

Không ép thực hiện tương tác hoặc thưởng kinh tế cho mọi hành động tình cảm.

## 2.7. Mini-games

Các mini-game đơn giản:

- Cờ caro.
- Othello.
- Battleship.
- Lật thẻ trí nhớ.
- Đoán ý người yêu.
- Vẽ và đoán.
- Ghép ảnh kỷ niệm.
- Nonogram co-op.
- Đoán địa điểm.
- Tìm đồ vật.
- Phối đồ.
- Thi trang trí phòng.
- Ghép bó hoa.
- Câu chuyện nối tiếp.

Các mini-game phối hợp realtime:

- Dẫn đường trong mê cung, một người thấy bản đồ và một người điều khiển.
- Giải đố thông tin bất đối xứng.
- Giải cứu mèo.
- Cùng khiêng đồ.
- Chèo thuyền đôi.
- Bắt đom đóm.
- Nấu ăn co-op.
- Trồng hoa tốc độ.
- Song tấu theo nhịp.
- Đảo kho báu.
- Cùng xây cầu.
- Phiêu lưu đi cảnh 2D.

Mỗi mini-game nên kéo dài khoảng 2–10 phút, trừ những thử thách đặc biệt.

Thiết kế shared mini-game infrastructure:

- Registry.
- Session.
- Rules.
- Participant state.
- Multiplayer synchronization.
- Scoring.
- Rewards.
- Reconnect.
- Cancellation.
- Testing.

Không xây framework quá phức tạp và không triển khai tất cả mini-game cùng lúc.

## 2.8. Home progression

Hai người có thể dần mở khóa:

1. Căn nhà nhỏ và khu vườn.
2. Phòng ngủ và phòng khách riêng.
3. Nhà bếp và phòng học.
4. Phòng thú cưng.
5. Nhà kính.
6. Hiên nhà và khu picnic.
7. Ao cá và khu vườn mở rộng.
8. Rạp phim riêng.
9. Khu chợ.
10. Làng nhỏ.
11. Our Island.

Không bắt buộc khóa tiện ích đời thường như Pomodoro, nhật ký hoặc Cinema sau progression kinh tế.

Mở khóa chủ yếu phục vụ gameplay, thẩm mỹ và mở rộng không gian.

Hỗ trợ các bộ sưu tập nội thất Pastel, Cottage, Modern và Rustic theo art direction hiện tại.

## 2.9. Học hỏi từ các game có sẵn

- Stardew Valley: farming, fishing, production, economy và NPC.
- Animal Crossing: decorating, collection, flower breeding và progression.
- Pocket Love: tổ ấm, thú cưng và tương tác cặp đôi.
- Spiritfarer: liên kết farming, fishing, cooking và crafting.
- Widgetable: nuôi thú cưng chung.
- Overcooked: risk/reward và phối hợp.
- PICO PARK: cooperative challenges.
- We Were Here: asymmetric information.
- Keep Talking and Nobody Explodes: communication puzzles.
- It Takes Two: khả năng bổ sung giữa hai nhân vật.
- Nintendogs: pet interaction.
- Neko Atsume: pet autonomy.
- The Sims 4 Cats & Dogs: personality và nhu cầu.

Chỉ học cơ chế, không sao chép tài sản có bản quyền.

## Deliverables

- docs/gameplay/GAME_DESIGN.md
- docs/gameplay/WORLD_PROGRESSION.md
- docs/gameplay/MINIGAME_DESIGN.md
- docs/gameplay/NPC_DESIGN.md
- docs/gameplay/COUPLE_INTERACTIONS.md

Mỗi hệ thống cần có MVP, advanced features, data model dự kiến, dependencies, edge cases và acceptance criteria.

Sau khi hoàn thành, tự động tiếp tục Phase 3.

---

# PHASE 3 — COOPERATIVE ECONOMY DESIGN

Tôi muốn nền kinh tế được thiết kế nghiêm túc, có cơ sở lý luận và có khả năng kiểm chứng bằng mô phỏng.

## 3.1. Nghiên cứu kinh tế chính trị Marx

Tư bản, Quyển I — Chương 1:

https://www.marxists.org/archive/marx/works/1867-c1/ch01.htm

Tư bản, Quyển I — Chương 3:

https://www.marxists.org/archive/marx/works/1867-c1/ch03.htm

Phê phán Cương lĩnh Gotha:

https://www.marxists.org/archive/marx/works/1875/gotha/ch01.htm

Nghiên cứu:

- Giá trị sử dụng.
- Giá trị hàng hóa.
- Thời gian lao động xã hội cần thiết.
- Quy luật giá trị.
- Tư liệu sản xuất.
- Sản xuất.
- Lưu thông hàng hóa H-T-H.
- Trao đổi.
- Tiêu dùng.
- Tích lũy.
- Tái sản xuất.
- Sở hữu chung.
- Phân phối thành quả.

Kết hợp với kinh tế học và game economy design hiện đại:

- Currency sources and sinks.
- Supply and demand.
- Opportunity cost.
- Scarcity.
- Production chains.
- Market balancing.
- Inflation.
- Progression pacing.

Phân biệt rõ lý luận Marx với công thức và quy tắc mô phỏng do chúng ta tự thiết kế.

Không gọi phần chênh lệch giữa giá bán và chi phí sản xuất là giá trị thặng dư theo nghĩa Marx nếu không tồn tại quan hệ thuê lao động tương ứng.

## 3.2. Mô hình sở hữu chung

Our Little World là nền kinh tế hộ gia đình hợp tác giữa hai người, có trao đổi với thị trường NPC.

- Nhà và đất thuộc sở hữu chung.
- Công cụ sản xuất dùng chung.
- Ví tiền chung.
- Kho hàng chung.
- Inventory cá nhân dành cho vật phẩm riêng và quà bất ngờ.
- Hai người tự phân công lao động.
- Thành quả phục vụ mục tiêu chung.
- Không có bảng xếp hạng đóng góp của hai người.

## 3.3. Mô hình giá trị

Nghiên cứu công thức khởi đầu:

V_i = sum(a_ij * V_j) + w * L_i + D_i

Trong đó:

- V_i là giá trị cơ sở.
- a_ij là lượng nguyên liệu đầu vào.
- V_j là giá trị nguyên liệu.
- L_i là thời gian lao động chuẩn.
- w là hệ số quy đổi lao động chuẩn.
- D_i là phần giá trị công cụ và tư liệu sản xuất được phân bổ.

Lưu ý:

- Đây không phải công thức nguyên bản của Marx.
- Không định giá dựa trực tiếp vào thời gian thao tác thực tế của từng người.
- Người chơi thao tác chậm không tự động tạo ra hàng hóa có giá trị cao hơn.
- Không tính toàn bộ thời gian chờ cây mọc là lao động.
- Độ hiếm, chất lượng và cung cầu có thể ảnh hưởng giá giao dịch, cần phân biệt với mô hình giá trị cơ sở.
- Không bắt buộc mọi món chế biến đều có lợi nhuận cao hơn nguyên liệu thô.

Phản biện và cải thiện mô hình nếu cần.

## 3.4. Chuỗi sản xuất

Ví dụ:

Hạt giống → cây trồng → nông sản → chế biến → hàng hóa → NPC hoặc tiêu dùng.

Cá → món ăn hoặc bể cá.

Hoa → bó hoa → bán hoặc tặng.

Nguyên liệu → crafting → công cụ và nội thất.

Tiền được sử dụng để mua:

- Hạt giống.
- Mồi câu.
- Nguyên liệu.
- Công cụ.
- Nội thất.
- Vật phẩm thú cưng.
- Nâng cấp sản xuất.
- Mở rộng nhà.

## 3.5. Thị trường NPC

- Có nhu cầu hàng hóa theo nhóm.
- Có đơn đặt hàng.
- Có mức thưởng chất lượng.
- Nhu cầu thay đổi theo mùa và sự kiện.
- Có thể hạn chế thu mua hoặc giảm giá khi nguồn cung quá lớn.
- Tránh một chiến lược farming vượt trội tuyệt đối.
- Luôn có phương án phục hồi kinh tế cho người chơi casual.
- Không tạo độ phức tạp vĩ mô không cần thiết.

Không để người chơi bị mắc kẹt vì hết tiền và không thể mua nguyên liệu để tiếp tục chơi.

Không có thuế hoặc chi phí bắt buộc làm mất tài sản khi offline.

## 3.6. Mục tiêu pacing ban đầu

- Trang trí nhỏ: 5–15 phút chơi.
- Đồ chơi pet: 10–20 phút.
- Nội thất đẹp: 30–60 phút.
- Hoàn thiện một góc phòng: 1–3 giờ.
- Mở rộng nhà: 3–8 giờ tích lũy.

Các con số chỉ là mục tiêu tham khảo, chưa phải thông số chính thức.

Ưu tiên vui vẻ hơn grinding.

## 3.7. Economy Simulator

Tận dụng kết quả nghiên cứu Meadowbrook Farm.

Thiết kế simulator TypeScript độc lập với renderer.

Sử dụng seeded randomness và configuration.

Mô phỏng hàng nghìn phiên chơi với:

- Casual players.
- Solo players.
- Co-op players.
- Người chơi tối ưu lợi nhuận.
- Người chỉ thích trang trí.
- Người chơi vắng mặt dài ngày.
- Các chiến lược sản xuất khác nhau.

Đánh giá sau 7, 30, 90 và 180 ngày:

- Thu nhập ròng.
- Số dư tiền.
- Inventory value.
- Progression speed.
- Sources and sinks.
- Inflation.
- Economic deadlocks.
- Dominant strategies.
- Arbitrage.
- Infinite resource generation.
- Solo/co-op balance.

Đề xuất cách điều chỉnh thông số bằng configuration thay vì sửa logic.

## 3.8. Transaction integrity

- Server-authoritative economy.
- Atomic transactions.
- Idempotency.
- Transaction ledger.
- Inventory invariants.
- Currency invariants.
- Không double-spending.
- Không duplicate rewards.
- Kiểm tra race conditions giữa hai người chơi.
- RLS.
- House membership.
- Không để client tự xác nhận giá, phần thưởng hoặc số dư.

## Deliverables

- docs/economy/ECONOMY_DESIGN.md
- docs/economy/ECONOMY_MODEL.md
- docs/economy/PRODUCTION_CHAINS.md
- docs/economy/MARKET_AND_NPC.md
- docs/economy/BALANCING_PLAN.md
- docs/economy/ECONOMY_SIMULATOR_SPEC.md

Chưa triển khai nền kinh tế production.

Sau khi hoàn thành, tự động tiếp tục Phase 4.

---

# PHASE 4 — LIVING PET SYSTEM

Thú cưng là một trong những gameplay trung tâm của Our Little World.

Tôi muốn một chú mèo có đời sống thực sự, không chỉ là Tamagotchi với vài thanh trạng thái.

Ưu tiên chiều sâu hành vi của một pet hơn số lượng giống thú cưng.

## 4.1. Nhu cầu và cảm xúc

Các nhu cầu:

- Đói.
- Khát.
- Năng lượng.
- Vệ sinh.
- Vui vẻ.
- Buồn chán.
- Tương tác.
- An toàn.

Các cảm xúc:

- Vui vẻ.
- Buồn.
- Cô đơn.
- Tò mò.
- Sợ hãi.
- Khó chịu.
- Thư giãn.
- Hào hứng.
- Làm nũng.

Pet được phép buồn, đói và cô đơn khi lâu không được chăm sóc.

Không để pet chết, mắc bệnh nghiêm trọng hoặc chịu tổn thương vĩnh viễn chỉ vì người chơi bận hoặc offline.

Thể hiện cảm xúc thông qua animation, hành vi, âm thanh và biểu cảm, không chỉ qua UI chỉ số.

## 4.2. Pet brain

Sử dụng:

- Utility AI.
- State Machine hoặc Behavior Tree.
- Pathfinding.
- Affordance system.
- Personality.
- Bounded memory.

Utility score phụ thuộc vào:

- Nhu cầu.
- Cảm xúc.
- Tính cách.
- Môi trường.
- Thời gian.
- Thời tiết.
- Hoạt động người chơi.
- Đồ vật có thể sử dụng.
- Sở thích.
- Ký ức.

Có cooldown, hysteresis, action commitment và interruption rules.

Tránh thay đổi hành động liên tục, lặp hành vi máy móc hoặc chọn hành động không khả thi.

## 4.3. Autonomous behavior

Pet có thể chủ động:

- Đi quanh nhà và vườn.
- Ăn.
- Uống.
- Ngủ.
- Phơi nắng.
- Liếm lông.
- Vươn vai.
- Ngáp.
- Chơi đồ chơi.
- Đuổi bướm.
- Rình và vồ.
- Khám phá đồ mới.
- Chui vào hộp giấy.
- Cào móng.
- Tìm người chơi.
- Dụi đầu.
- Làm nũng.
- Trốn khi sợ.
- Chạy ra đón chủ.
- Tha đồ chơi hoặc món quà nhỏ về.

Không cần người chơi ra lệnh cho mọi hành động.

Không bắt buộc mọi hành vi đều tạo phần thưởng vật chất.

## 4.4. Personality và memory

Đặc điểm tính cách:

- Ham ăn.
- Nghịch ngợm.
- Quấn người.
- Tò mò.
- Nhút nhát.
- Lười biếng.
- Độc lập.

Ghi nhớ:

- Món ăn yêu thích.
- Đồ chơi yêu thích.
- Vị trí ngủ.
- Nơi an toàn.
- Người thường cho ăn.
- Người thường chơi cùng.
- Đồ vật từng khám phá.
- Thói quen sinh hoạt.
- Các sự kiện quan trọng.

Có quan hệ riêng với từng người chơi.

Không hiển thị bảng xếp hạng pet yêu ai hơn.

Sử dụng typed events, counters, preference scores và bounded memory.

Không cần vector database hoặc LLM ở giai đoạn đầu.

## 4.5. Affordance system

Các vật thể cung cấp những hành động khả thi:

- Sofa: nằm, ngủ, ngồi.
- Cửa sổ: ngắm cảnh, phơi nắng.
- Giường: ngủ.
- Bàn học: nằm cạnh chủ.
- Hộp giấy: trốn, chơi.
- Bát thức ăn: ăn.
- Bát nước: uống.
- Trụ cào móng: cào và vươn vai.
- Đồ chơi: đuổi bắt và tương tác.

Mỗi affordance có interaction point, requirements, occupancy và animation.

Pet cần thích nghi khi đồ nội thất bị di chuyển hoặc khi đường đi không còn hợp lệ.

## 4.6. Animation

Kiểm tra asset pack hiện có, đặc biệt Free Pets Pack.

Nghiên cứu:

- Idle.
- Walk.
- Run.
- Sit.
- Lie down.
- Sleep.
- Eat.
- Drink.
- Groom.
- Stretch.
- Yawn.
- Play.
- Pounce.
- Startle.
- Hide.
- Affection.

Bổ sung micro-animation như chớp mắt, cử động tai, vẫy đuôi và thở khi ngủ nếu có asset phù hợp.

Âm thanh có cooldown, volume setting và mute.

Không tuyên bố có animation nếu chưa kiểm tra spritesheet thực tế.

## 4.7. Tích hợp cuộc sống cặp đôi

- Khi học: pet nằm gần bàn học.
- Khi xem phim: pet nằm trên sofa.
- Khi làm vườn: pet khám phá và đuổi bướm.
- Khi câu cá: pet ngồi cạnh mặt nước.
- Khi nấu ăn: pet lảng vảng quanh bếp.
- Khi trang trí: pet khám phá nội thất mới.
- Khi người chơi trở về: pet có thể chạy ra đón.

Pet phải tạo cảm giác là một thành viên trong căn nhà.

## 4.8. Multiplayer và offline simulation

Hai người phải nhìn thấy cùng một pet.

Thiết kế:

- Persistent pet state.
- Server timestamps.
- Authoritative mutation.
- Single simulation authority hoặc cơ chế tương đương.
- Seeded randomness khi phù hợp.
- Snapshot.
- Reconnect.
- Offline catch-up.
- Concurrent interaction handling.
- Race condition protection.

Không yêu cầu server mô phỏng 60 FPS liên tục.

Khi offline, tính trạng thái dựa trên timestamp và mô hình catch-up có giới hạn.

Khi online, mô phỏng hành vi chi tiết.

Không để hai client tự tạo hai trạng thái pet khác nhau.

## 4.9. Kiến trúc mở rộng

Tách decision-making khỏi action execution.

World Observation → AgentBrain → Validated Action → Action Executor.

Giai đoạn đầu chỉ sử dụng Utility AI.

Giữ abstraction đủ đơn giản để sau này bổ sung Hybrid LLM Brain.

## 4.10. Pet Brain Debugger

- Xem utility scores.
- Xem action hiện tại.
- Xem nguyên nhân lựa chọn.
- Chỉnh nhu cầu.
- Chỉnh cảm xúc.
- Chỉnh personality.
- Chỉnh preferences.
- Kiểm tra memory.
- Force action.
- Force animation.
- Simulate time.
- Simulate offline.
- Debug pathfinding.
- Debug affordance availability.

Chỉ dành cho development hoặc test sandbox được bảo vệ.

## Deliverables

- docs/pet/PET_DESIGN.md
- docs/pet/PET_AI_ARCHITECTURE.md
- docs/pet/PET_ANIMATION_MATRIX.md
- docs/pet/PET_SIMULATION_SPEC.md
- docs/pet/PET_TEST_PLAN.md

Chia hệ thống thành MVP và advanced milestones.

Chưa triển khai LLM API.

Sau khi hoàn thành, tự động tiếp tục Phase 5.

---

# PHASE 5 — FUTURE AI WORLD

Định hướng dài hạn là biến Our Little World thành một thế giới sống với pet và NPC có trí thông minh, ký ức, tính cách, mục tiêu và quan hệ xã hội.

Tuy nhiên, AI Town không phải mục tiêu của giai đoạn đầu.

## 5.1. Tài liệu tham khảo dài hạn

AI Town:

https://github.com/a16z-infra/ai-town

Generative Agents:

https://github.com/joonspk-research/generative_agents

Smallville Agents:

https://github.com/andres-villavicencio-dev/smallville-agents

LLMville:

https://github.com/dyang195/llmville

Agent Sandbox:

https://github.com/ccb/agent-sandbox

Generative Agents paper:

https://arxiv.org/abs/2304.03442

Chỉ lưu lại để nghiên cứu sau. Không dành nhiều token phân tích toàn bộ source code các repository này ở thời điểm hiện tại.

## 5.2. Các cấp độ AI

### Level 1 — Living World

- Utility AI.
- State Machine.
- NPC schedules.
- Scripted dialogues.
- Autonomous pet behavior.

### Level 2 — Intelligent World

- Personality.
- Memory.
- Preferences.
- Behavioral adaptation.
- Event reactions.

### Level 3 — Generative World

- LLM-powered dialogue.
- Planning.
- Reflection.
- Dynamic quests.
- Hybrid pet/NPC intelligence.

### Level 4 — Autonomous Society

- Multi-agent simulation.
- NPC social relationships.
- NPC giao tiếp với nhau.
- Tự tổ chức sự kiện.
- Emergent gameplay.
- AI Town.

## 5.3. Kiến trúc tương lai

LLM phụ trách quyết định cấp cao, hội thoại và planning.

Game engine/backend kiểm soát:

- Pathfinding.
- Animation.
- Action execution.
- World state.
- Inventory.
- Economy.
- Security.
- Transaction validation.

LLM không được tự tạo tiền, vật phẩm hoặc sửa database tùy ý.

Pet phải hành xử như động vật, không biến thành chatbot nói tiếng người.

Hạ tầng dự kiến:

- Provider-agnostic LLM interface.
- DeepSeek API hoặc API chi phí thấp.
- Ollama, LM Studio hoặc llama.cpp.
- Model local nhỏ.
- Structured output.
- Action allowlist.
- Event-driven inference.
- Memory retrieval.
- Cost tracking.
- Utility AI fallback.

Laptop phát triển có RTX 4060 Laptop 8GB VRAM và RAM 32GB.

Có thể thử model local 1B–8B trong tương lai.

Game chỉ phục vụ hai người nên có thể cân nhắc mục tiêu ngân sách API $1–3/tháng, nhưng phải benchmark và đo chi phí thực tế.

Không gửi nhật ký, ảnh riêng tư hoặc thông tin cá nhân không liên quan cho model.

## 5.4. Phạm vi hiện tại

Chỉ tạo:

docs/ai/FUTURE_AI_VISION.md

Không:

- Tích hợp LLM.
- Benchmark model.
- Tạo vector database.
- Xây dựng LLM infrastructure.
- Triển khai multi-agent simulation.
- Phân tích sâu AI Town.
- Overengineering kiến trúc để phục vụ một tính năng còn xa.

Thử nghiệm LLM có thể xem xét quanh V1.0 nếu gameplay đủ phong phú.

AI Town đầy đủ là mục tiêu sau V1.0.

Sau khi hoàn thành, tự động tiếp tục Phase 6.

---

# PHASE 6 — DEVELOPER TOOLS, MASTER ROADMAP & DEEPSEEK HANDOVER

Hợp nhất toàn bộ kết quả nghiên cứu và thiết kế thành một hệ thống tài liệu nhất quán.

## 6.1. Developer Console

Developer cần toàn quyền trong môi trường test, không phải cày gameplay để kiểm tra chức năng.

Thiết kế khả năng:

- Set/add/remove currency.
- Spawn/remove item.
- Unlock furniture.
- Unlock recipes.
- Unlock areas.
- Set house level.
- Teleport.
- Điều chỉnh thời gian.
- Điều chỉnh tốc độ mô phỏng.
- Đổi ngày, mùa, thời tiết.
- Ép cây trưởng thành.
- Spawn cá hiếm.
- Tạo NPC order.
- Force NPC action.
- Force pet action.
- Chỉnh pet state.
- Pet Brain Debugger.
- Test mini-game.
- Test animation.
- Simulate network loss.
- Reconnect testing.
- Đóng vai một trong hai người chơi.
- Test tài khoản thứ ba bị từ chối.
- Save snapshot.
- Restore snapshot.
- Reset test world.

Developer Console phát triển cùng từng milestone.

Không cần triển khai trước các lệnh cho hệ thống chưa tồn tại.

Tách biệt test world và production world.

Không chỉ ẩn menu bằng CSS.

Phải có production guard, kiểm soát quyền phía server và kiểm thử chống truy cập trái phép.

## 6.2. Master Roadmap đề xuất

### V0.1 — Foundation

- Kiến trúc.
- Multiplayer.
- Nhà và vườn.
- Ngoại hình.
- Trang trí.
- Artwork chính thức.
- Dev LAN.
- Supabase.
- HTTPS deployment.
- Mobile-first UX.
- Spike 0.

### V0.1.5 — Living Home

- Thú cưng cơ bản.
- Tương tác cặp đôi.
- Ôm, nắm tay, ngồi chung.
- Tặng quà.
- Hộp thư.
- Khung ảnh.
- Pomodoro.
- Developer Console cơ bản.

### V0.2.0 — Economy Foundation

- Shared wallet.
- Inventory.
- Item catalog.
- Transaction ledger.
- NPC thu mua.
- Economy Simulator.

### V0.2.1 — Farming

- Gieo trồng.
- Thu hoạch.
- Chất lượng.
- Hoa.
- Lai giống.
- Cây kỷ niệm.

### V0.2.2 — Fishing

- Ao cá.
- Fishing mini-game.
- Độ hiếm.
- Mồi câu.
- Cần câu.
- Bể cá.

### V0.2.3 — Intelligent Pet

- Utility AI nâng cao.
- Personality.
- Memory.
- Preferences.
- Affordances.
- Pet Brain Debugger.

### V0.2.4 — Home Progression

- Shop.
- Công cụ.
- Bộ sưu tập nội thất.
- Mở rộng nhà.
- Mở khóa khu vực.

### V0.2.5 — Cooperative Gameplay

- Mini-game infrastructure.
- Mini-game cặp đôi.
- NPC orders.
- Co-op challenges.

### V0.3 — Shared Life

- Cooking co-op.
- Nhật ký.
- Album.
- Lịch hẹn.
- Wishlist.
- Picnic.
- Tính năng đời thường nâng cao.

### V0.4 — Cinema

- Local media streaming.
- Đồng bộ video.
- HLS hoặc giải pháp phù hợp.
- Phụ đề.
- Voice chat.
- Audio ducking.
- Reconnect.
- Remote iPhone playback.

### V0.5 — Polish

- Economy balancing.
- Performance.
- Animation.
- Âm thanh.
- Accessibility.
- Ngày đêm.
- Thời tiết.
- Hành vi NPC và pet nâng cao.

### V1.0 — Our Island

- Làng nhỏ.
- Khu chợ.
- Nông trại mở rộng.
- Khu hẹn hò.
- Khám phá.
- Thử nghiệm LLM NPC nếu phù hợp.

### Sau V1.0 — Future AI World

- Hybrid pet/NPC AI.
- LLM.
- Long-term memory.
- Planning.
- Multi-agent simulation.
- AI Town.
- Emergent gameplay.

Đây là roadmap đề xuất, không phải thứ tự bất biến.

Hãy phản biện dependency conflicts, scope và pacing.

Ví dụ:

- Nếu tặng quà ở V0.1.5 cần inventory, hãy thiết kế inventory tối thiểu hoặc điều chỉnh thứ tự.
- Nếu pet cần vật phẩm tiêu hao trước Economy Foundation, hãy xác định dependency hợp lý.
- Nếu Cinema khả thi nhờ kết quả nghiên cứu mã nguồn mở và Spike 0, có thể đề xuất đưa lên sớm hơn.
- Nếu các tính năng đời thường mang lại giá trị cao hơn gameplay phức tạp, hãy ưu tiên vertical slice có thể sử dụng sớm.

Không tự động triển khai roadmap.

## 6.3. UX và deployment

- Windows và iPhone là nền tảng chính.
- Android phục vụ phát triển và kiểm thử.
- Người chơi thứ hai không am hiểu công nghệ.
- Zero-configuration onboarding.
- Một đường link HTTPS.
- Không bắt cài VPN hoặc Tailscale cho các chức năng thông thường.
- Đăng nhập đơn giản.
- Duy trì phiên đăng nhập.
- Giao diện tiếng Việt.
- Mobile-first.
- Add to Home Screen.
- Reconnect tự động.
- Hai tài khoản trong một nhà, không giới hạn cứng hai thiết bị.
- Chơi được khi người kia offline.
- Không yêu cầu laptop developer phải bật để sử dụng các chức năng thông thường.

Cinema sử dụng nguồn media local có thể cần laptop host hoạt động. Phân biệt điều kiện này với các tính năng thông thường.

## 6.4. V0.1 acceptance

Trước khi nghiệm thu V0.1:

- Artwork chính thức được người dùng duyệt.
- License và asset pipeline rõ ràng.
- Artwork được tích hợp vào game chính.
- Windows và Android multiplayer.
- Supabase thật.
- Authentication.
- RLS.
- Remote HTTPS.
- iPhone Safari thật.
- Persistence.
- Refresh.
- Reconnect.
- Concurrent furniture placement.
- Membership limit.
- Production guard.
- Unit tests.
- Server tests.
- E2E tests.

Không tuyên bố đã nghiệm thu V0.1 nếu chỉ có Dev LAN và Playwright.

Nếu một bài kiểm thử cần thiết bị iPhone hoặc sự tham gia của người dùng, ghi rõ Pending Manual Verification.

Không bịa kết quả kiểm thử.

## 6.5. Agent allocation

Neon chịu trách nhiệm chính:

- Architecture.
- Art direction.
- Open source research.
- Game design.
- Economy design.
- Pet AI design.
- Technical risk analysis.
- Integration decisions.

DeepSeek V4.1 Flash chịu trách nhiệm chính:

- Domain logic.
- Gameplay implementation.
- Inventory.
- Shop.
- Farming.
- Fishing.
- Pet behavior.
- Economy simulator.
- Mini-games.
- Tests.
- Các tính năng đời thường theo đặc tả.

Neon hoặc Codex review những milestone lớn và lỗi khó.

Không để DeepSeek phải nghiên cứu lại toàn bộ dự án.

## 6.6. Implementation backlog

Mỗi task phải có:

- Task ID.
- Milestone.
- Priority.
- Mục tiêu.
- Dependencies.
- Relevant files.
- Relevant source references.
- API contract.
- Data model.
- Invariants.
- Scope.
- Out-of-scope.
- Acceptance criteria.
- Test cases.
- Recommended agent.
- Risk level.

Chia thành task đủ nhỏ để một coding agent chi phí thấp có thể thực hiện độc lập.

Tránh task chung chung như "Implement entire farming system".

## 6.7. Deliverables

- docs/MASTER_ROADMAP.md
- docs/IMPLEMENTATION_BACKLOG.md
- docs/DEV_TOOLS.md
- docs/MILESTONE_ACCEPTANCE.md
- docs/AGENT_HANDOVER.md
- docs/ARCHITECTURE_OVERVIEW.md
- AGENTS.md cập nhật.
- docs/PROGRESS.md cập nhật.
- CHANGELOG.md cập nhật phù hợp.
- Documentation index.

Có thể hợp nhất hoặc tái sử dụng tài liệu hiện có nếu hợp lý hơn việc tạo thêm file.

Không sao chép toàn bộ tài liệu vào AGENTS.md.

AGENTS.md nên ngắn gọn, chứa quy tắc bắt buộc và đường dẫn đến tài liệu chuyên biệt.

---

# GLOBAL EXECUTION RULES

Áp dụng cho toàn bộ nhiệm vụ.

## A. Autonomous execution

- Thực hiện Phase 0 đến Phase 6 theo thứ tự.
- Không dừng lại xin xác nhận giữa các phase nghiên cứu.
- Nếu gặp blocker ở một repository, ghi nhận rồi tiếp tục repository khác.
- Nếu có quyết định chưa được duyệt, đánh dấu Pending Decision.
- Không để một vấn đề nhỏ chặn toàn bộ nhiệm vụ.
- Duy trì checkpoint để có thể resume.
- Không yêu cầu người dùng phải online.

## B. Token efficiency

- Không nghiên cứu lại artwork đã hoàn thành.
- Không tải lại asset.
- Không tạo lại Demo A–D.
- Không dùng browser automation khi terminal có thể xử lý.
- Ưu tiên nghiên cứu source code theo module và symbol.
- Không đọc toàn bộ repository nếu không cần thiết.
- Không gửi toàn bộ codebase vào context lặp đi lặp lại.
- Có thể sử dụng subagent cho nhóm nghiên cứu độc lập.
- Tránh công việc trùng lặp giữa các subagent.
- Tổng hợp kết quả vào file thay vì giữ toàn bộ trong hội thoại.
- Dừng đào sâu repository không phù hợp.
- Không phân tích sâu AI Town tại milestone hiện tại.

## C. Scope protection

Đây là RESEARCH & DESIGN MILESTONE, không phải implementation milestone.

Không:

- Thay đổi gameplay production.
- Triển khai V0.1.5.
- Triển khai farming.
- Triển khai economy.
- Triển khai pet system.
- Triển khai Cinema mới.
- Triển khai AI Town.
- Mua asset.
- Mua API hoặc dịch vụ.
- Thay thế codebase bằng repository khác.
- Thay artwork chính thức khi Demo E chưa được duyệt.
- Thay đổi kiến trúc lớn khi chưa được người dùng chấp thuận.
- Sửa các phần đang được Art Direction task sử dụng một cách xung đột.

Được phép tạo tài liệu, checklist, backlog và các báo cáo nghiên cứu.

Nếu cần một PoC kỹ thuật rất nhỏ để kiểm chứng giả định, ưu tiên thực hiện trong sandbox riêng, không tích hợp production và ghi rõ lý do.

## D. Evidence and honesty

- Không bịa repository, module, API hoặc license.
- Không bịa kết quả test.
- Không coi README là bằng chứng đủ về chất lượng implementation.
- Phân biệt confirmed facts, assumptions và proposals.
- Trích dẫn source code cụ thể khi đưa ra đề xuất tái sử dụng.
- Ghi rõ những gì chưa kiểm chứng.
- Kiểm tra nghĩa vụ license khi tái sử dụng code.
- Không sao chép artwork chưa có quyền sử dụng.

## E. Final verification

Sau khi hoàn thành tất cả phase:

- Kiểm tra tài liệu có mâu thuẫn không.
- Kiểm tra dependency giữa milestone.
- Kiểm tra trạng thái git.
- Xác nhận không thay đổi game production ngoài phạm vi cho phép.
- Chạy các verification phù hợp nếu có thay đổi code hoặc tooling.
- Kiểm tra các tài liệu bàn giao có đủ cụ thể cho DeepSeek không.
- Loại bỏ các tài liệu trùng lặp không cần thiết.

## F. Final report

Tạo docs/research/MASTER_RESEARCH_SUMMARY.md.

Báo cáo cuối cùng cần trả lời:

1. Đã hoàn thành những gì?
2. Repository nào đáng tái sử dụng nhất?
3. Module nào có thể reuse, port hoặc chỉ tham khảo?
4. Có nên giữ codebase hiện tại hay fork dự án khác?
5. Có rủi ro kiến trúc nào cần xử lý?
6. Roadmap mới là gì?
7. Nền kinh tế được đề xuất như thế nào?
8. Pet AI được thiết kế như thế nào?
9. Những quyết định nào còn chờ người dùng?
10. Những bài kiểm thử nào cần thiết bị thật?
11. Những task nào sẵn sàng giao cho DeepSeek?
12. Những công việc nào vẫn chưa hoàn thành?
13. Task tiếp theo nên triển khai là gì?

Sau khi hoàn thành nhiệm vụ tổng hợp, dừng lại và trình bày báo cáo.

Không tự động chuyển sang implementation.

Mục tiêu cuối cùng là để khi tôi quay lại, tôi có một bản thiết kế Our Little World đủ sâu, nhất quán, có cơ sở nghiên cứu, có kế hoạch tái sử dụng mã nguồn mở và có backlog sẵn sàng bàn giao cho coding agent chi phí thấp.
