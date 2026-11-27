# So sánh Trải nghiệm Nuôi Mèo Quýt — Donor Gốc, PR #79 Baseline & V2 (`antigravity/carbon-living-pet-v2`)

Tài liệu đối chiếu kỹ thuật và trải nghiệm thực tế sau khi trực tiếp chạy thử các donor gốc, baseline PR #79 (`26b185d`) và bản nâng cấp **Deep Living Pet Experience V2**.

---

## 1. Bảng So sánh Kiến trúc & Trải nghiệm

| Tiêu chí | Donor 1: `SawyerHood/nintendogs-threejs` (`43d231c`) | Donor 2: `j4lpan/pet-shop` (`77f8b59`, MIT) | PR #79 Baseline (`26b185d`) | **OLW V2 (`antigravity/carbon-living-pet-v2`)** |
|---|---|---|---|---|
| **Renderer & Không gian** | Three.js WebGL2 full 3D room, sàn gỗ, bóng đổ mềm, sunbeam, bàn ghế | Three.js (`THREE.Mesh` low-poly) + Tauri overlay | Phaser canvas 2D trên nền tối `#120e14` với vài hình khối đơn giản + ảnh minh họa 48×48 phóng lớn (`288×48`) | **Three.js WebGL2 3D full-body Cat + Phòng khách đôi có nắng**, sàn gỗ ván, thảm san hô, sofa đôi, nệm ngủ, trụ cào móng, cửa sổ nắng & hạt bụi bay, khay bát ăn/nước, hộp giấy |
| **Giải phẫu & Biểu cảm** | Thân 3D Surface Nets + GLSL Shell Fur + mắt tròn + tai cụp chó | Đóng/mở mắt, chớp mắt kép, nhướng tai, vẫy đuôi, tim bay | Portrait 2D tĩnh tại tâm `(cx, cy)`, đổi frame biểu cảm trên lưới | **Giải phẫu mèo thật** (hộp sọ tròn, mõm ngắn `:3`, 8 râu 3D hai bên má, tai tam giác dựng + vểnh/cụp airplane ears, mắt đồng tử dọc mèo + slow-blink/squint, đuôi dài 5 đốt uốn lượn) |
| **Tự chủ hành vi (Autonomy)** | `Brain` (`wander`, `sniff`, `sleep`, `stretch`, `playToy`, `eat/drink`, `come`) | Tự đi lại nhỏ + phản ứng chuột | Chu kỳ animation tại chỗ + bubble chữ | **`CatBrain` kết nối 1:1 OLW `Pet8Needs`, `PetPersonalityTraits`, `derive9Emotion`, `scoreAffordanceAction`, `MemoryState`**: tự đi dạo, đánh hơi, ngồi chớp mắt chậm, nằm cuộn loaf, ngủ trên nệm/vệt nắng (`zzz`), vươn vai ngáp, tự liếm chân rửa mặt, tự vồ bóng/len, chui hộp giấy |
| **Tương tác trực tiếp** | Vuốt theo capsule vùng thân (`uComb`), chải lược 3D (`uFluff`), ném bóng/đĩa, gọi tên, đặt bát | Vuốt & chạm nhanh | Bấm nút HUD (`Gọi`, `Chải`, `Nước`) + phím tắt hotbar + vùng hit portrait ẩn | **Raycast trực tiếp trên mèo 3D**: vuốt từng vùng (`head`, `chin`, `back`, `belly`, `tail`), lược 3D tăng độ bồng lông `uFluff`, ném & hất **Bóng chuông**, **Cuộn len**, **Cần câu mèo dây Verlet 6 đốt** (mèo rình, ngoáy mông & nhảy vồ trên không), **Hộp giấy**, **Bát ăn & bát nước gốm** (Quýt tự chạy tới ăn/uống), plus ranh giới từ chối |
| **Tài khoản / Backend / 2P** | Local single-player `localStorage` | Single-player desktop | `SharedPetCareSession` (`stroke`, `feed`, `brush`) ở Dev-LAN; Supabase stub | **Một Pet Authority duy nhất** + `SharedPetCareSession` mở rộng (`stroke`, `feed`, `brush`, `water`, `toy`, `pose`), Dev-LAN SSE + **Supabase Realtime broadcast**, sync ngược về `WorldScene` & `PetLivingMainGameDriver` khi thoát |
| **Tiêu thụ kho & Chống trùng lặp** | Không có hệ thống kho chung | Không | `consumeHandFoodInCare` gọi từ `PetCareScene` | Bảo toàn single authority: `evt:pet-care-request-consume` phát **duy nhất 1 lần** qua `App.tsx`, giữ nguyên 100% logic kho/thẻ/hành vi trên bản đồ chính |

---

## 2. Kết quả Thực nghiệm Trực tiếp

1. **Donor `nintendogs-threejs` (`43d231c`)**:
   - Đã clone, chạy live trên Chromium SwiftShader WebGL2 (`donor-nintendogs-petting.png`, `donor-nintendogs-home.png`).
   - Điểm mạnh cần transplant: Surface Nets + Shell Fur (`uFluff`, `uComb`), raycast bone capsule theo vùng cơ thể, physics đồ chơi trong phòng, camera bám tự nhiên (`FollowCamera`).
   - Điểm cần tái tạo cho mèo: donor gốc có tỷ lệ xương & mõm chó, không có cần câu mèo, râu 3D, đồng tử dọc mèo, dáng cuộn loaf/ngồi liếm chân hay hộp giấy.
2. **Donor `j4lpan/pet-shop` (`77f8b59`, MIT)**:
   - Đã clone và chạy live trên Chromium với mock `__TAURI__` (`donor-j4lpan-cat.png`).
   - Tham khảo biểu cảm mắt kép, phản xạ tai và sự gọn gàng khi thu gọn trên một góc nhìn gần gũi.
3. **PR #79 Baseline (`26b185d`)**:
   - Đã chạy kiểm chứng tại `/?living-pet=1` (`pr79-baseline-idle.png`, `pr79-baseline-brush.png`, `pr79-baseline-toy.png`): mèo nằm cố định ở giữa màn hình trên nền tối `#120e14`, chưa có di chuyển trong phòng 3D, chưa có lược/bát ăn/đồ chơi vật lý trực tiếp.
4. **Bản nâng cấp V2 (`antigravity/carbon-living-pet-v2`)**:
   - Người chơi vào trực tiếp từ **Hồ sơ Mèo → "Chăm sóc Quýt (3D)"** (`PetPanel`) hoặc phím ngữ cảnh gần mèo.
   - Quýt tự sống trong phòng có nắng: dạo, ngửi, ngồi nhìn, cuộn bánh mì, ngủ trưa, vươn vai, liếm chân rửa mặt, chui hộp giấy và tự hất cuộn len.
   - Đủ > 5 tương tác trực tiếp nhạy bén: vuốt từng vùng, chải lông 3D tăng độ mượt `uFluff`, chơi bóng chuông, cuộn len, vẫy cần câu mèo (Quýt rình và nhảy vồ), đặt hạt ăn / rót nước thấy Quýt đi tới ăn/uống, và biểu hiện ranh giới ("cụp tai airplane ears + né bước") khi chạm quá đà vào đuôi/bụng hoặc khi đang mệt.
   - Hai client cùng chăm sóc Quýt đồng thời và thoát/vào lại giữ nguyên trạng thái.
