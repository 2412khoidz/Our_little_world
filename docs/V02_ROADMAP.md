# Our Little World — Roadmap v2

**Cập nhật 25/11/2026 | Project Agent + 3 Composer | Repo: [2412khoidz/Our_little_world](https://github.com/2412khoidz/Our_little_world)**

Định hướng: cozy game 2D và không gian số riêng tư cho một cặp đôi yêu xa. Stardew Valley cho world/farming, Nintendogs cho pet care, iPhone Safari/PWA và Windows là thiết bị chính. Không ép cày, không phạt offline, không camera khi học, chi phí gần 0. Product spec: `Our_Little_World_Agent_Plan_v2.md`.

## 0. Snapshot hiện tại — chưa phải release

Đối chiếu metadata và mô tả PR trên GitHub ngày 25/11/2026. Cả #10–#14 đang mở, chưa merge; chưa chạy lại source/test độc lập trong lần cập nhật tài liệu này. Các tuyên bố playable/test pass dưới đây là báo cáo agent, cần kiểm chứng trong build tích hợp. HEAD có thể thay đổi: Project Agent phải đọc lại Git trước khi thực hiện.

| Hạng mục | PR / HEAD tại lúc rà | Trạng thái báo cáo | Còn thiếu |
|---|---|---|---|
| Pet authority | [#10](https://github.com/2412khoidz/Our_little_world/pull/10) `45d027a` | SQL authority, reservation, movement plan | Wiring game, hand-feed phù hợp, kiểm thử tích hợp |
| Living Pet | [#11](https://github.com/2412khoidz/Our_little_world/pull/11) `b95fec4` | DEV local simulation trong nhà | Authority thực, gộp phần kế thừa với #12/#13 |
| Composer 3 / OLWH-2 | [#12](https://github.com/2412khoidz/Our_little_world/pull/12) `327bd62` | Tiled zones, 160+ ô farm, portal, camera, nước/tileset cải tiến, 3 NPC idle wander/dialog preview | Autotile/shoreline, interiors nhà dân, anchor farm/shop, quality pass và capture mới |
| Composer 2 / OLWH-1 | [#13](https://github.com/2412khoidz/Our_little_world/pull/13) `2de56d7` | PetCareScene riêng, mắt/nhịp thở, đồ chơi, autonomy, Dev LAN hand-feed trừ kho | Portrait vẫn lấy sheet 24px, Supabase stub, full authority, playtest 5–10 phút |
| Composer 1 / OLWH-3 | [#14](https://github.com/2412khoidz/Our_little_world/pull/14) `abba693` | Dev LAN farming trong vườn, starter, 4 hạt, shipping, wallet/version và persistence file | RPC/RLS Supabase, farm lớn, icon/plot sprites, xác minh E2E đủ vòng lặp |

## 1. P0 — V0.2: A Home Comes Alive (đợt hiện hành)

### Composer 1 — Farming & Economy / PR #14
- [ ] Kiểm tra domain hiện có, hoàn thiện Supabase RPC/RLS cho farm, mua/bán, wallet và inventory; giao dịch atomic, idempotent, server clock, reject outsider và race.
- [ ] Dùng plot IDs/anchors thống nhất với Composer 3; đưa vòng lặp từ vườn thử nghiệm sang farm lớn, không làm mất tiến trình cũ.
- [ ] Mua hạt ở shop thật, cuốc → gieo → tưới → thu hoạch → shipping → tái đầu tư. Không cần seed thủ công cho người chơi bình thường; Dev LAN và Supabase test parity.
- [ ] Chốt SKU/action/result/version với Composer 2; dùng inventory và hotbar chung, không trừ vật phẩm phía client.
- [ ] Chạy balance simulation với rules thật; cân bằng cho phiên ngắn, không cày hay phạt offline; hệ số ×120 chỉ dùng dev.
- [ ] Hai client thực hiện vòng lặp, cạnh tranh thu hoạch/retry, reload/reconnect giữ state. Ghi test và bằng chứng.

Reference: Harvest Hollow (ledger/economy), Meadowbrook/webfarmville (farming/balance), Hollowmere (map/warp contract khi cần). Ưu tiên dùng implementation thực tế phù hợp thay vì chỉ viết fixture/tài liệu.

### Composer 2 — Pet Care & Hotbar / PR #13
- [ ] Slice 4: artwork/model cận cảnh riêng thực sự chi tiết; mắt, tai, đuôi, tư thế, nhịp thở và biểu cảm. Không coi texture key riêng của sprite 24px là HD.
- [ ] Vuốt theo vùng, kéo đồ chơi, vồ/đuổi/ngửi/từ chối, cho ăn, uống, chải, gọi, ngủ, liếm lông; hành vi tự chủ và cá tính, không chỉ phản ứng theo nút.
- [ ] Chốt tích hợp #10/#11 với Project Agent; hand-feed và các mutation pet chạy authority thật, một PetSnapshot, inventory debit đúng một lần, hai client đồng bộ, không production stub/local-only làm nghiệm thu.
- [ ] Hotbar/held item chung cả pet và farming; icon dụng cụ/hạt, touch và keyboard, starter/backfill idempotent, world mới/cũ.
- [ ] Phiên chơi 5–10 phút có bằng chứng nhiều hành vi (gồm tự chủ, từ chối và consume); test desktop/mobile, reload, hai client.

Reference: nintendogs-threejs, Hollowmere, webfarmville; chọn giải pháp 2D/3D phù hợp iPhone và phong cách chung.

### Composer 3 — World & Exploration / PR #12
- [ ] Nâng chất lượng tile art: autotile, terrain transitions, shoreline, layering, bóng và cảnh quan có chủ đích; không chỉ thêm map hoặc scatter.
- [ ] Làng có nhà đa dạng, quảng trường, hồ, NPC, cửa hàng và interiors; farm có vùng trồng, kho/chuồng/ao, không gian mở rộng; rừng có ngóc ngách và biển có bờ/cầu gỗ.
- [ ] Chốt plot anchors, shop/shipping anchors và map IDs với Composer 1; UI/render tương tác dùng contract chung với Composer 2.
- [ ] Portal/collision/camera/spawn đúng; chuyển vùng không màn hình trống; không có cảnh vật giả ngoài playable bounds; hai người thấy đúng vùng.
- [ ] NPC có hoạt động và hội thoại cơ bản; không mở rộng quest engine phức tạp.
- [ ] Chơi khám phá 5–10 phút liên tục, capture mới đúng commit, không collision debug, kiểm tra touch/camera/mobile.

Reference: Hollowmere, Harvest Duo, Farm Rai Larn Na, Tuxemon, Kaetram/BrowserQuest và webfarmville; được thay implementation cũ nếu tốt hơn và tương thích contract.

### Project Agent — Integration & release gate (chủ trì)
- [ ] Đọc Git/PR/diff/handover/test thực tế. Xác định dependency và phần trùng #11 trong #12/#13; không cherry-pick/merge mù. Cử một người xử lý file chung.
- [ ] Chốt một map/plot contract, một interaction/hotbar, một inventory/wallet authority, một PetSnapshot và schema migrations nhất quán. Truyền contract cho các task.
- [ ] Dùng integration/night-merge hoặc nhánh review riêng để tích hợp, không tự merge main. Review và giao sửa nếu công cụ hỗ trợ; nếu không, cung cấp prompt cụ thể cho owner.
- [ ] Bảo toàn tính năng V0.1, nội thất, mini-game/co-op, emote và quyền riêng tư; chạy regression lint/typecheck/unit/build/SQL/E2E, kiểm tra prod guard. Test mock không thay test authority.
- [ ] Build thống nhất: nhà → chăm mèo → làng/shop mua hạt → farm cuốc/gieo/tưới/thu hoạch/bán → khám phá rừng/biển → về nhà. Có playtest 15–20 phút, không cần chuyển branch hoặc bật debug riêng cho từng module.
- [ ] Hai người chơi đồng thời, retry/race, outsider, reload/reconnect, offline an toàn; persistence qua Supabase local/test, Dev LAN parity. Xác nhận không stub trong path production.
- [ ] Đo performance/touch, kiểm thử PC + iPhone Safari/PWA thật qua hai mạng (owner hỗ trợ khi cần). Playwright WebKit/emulation không thay thiết bị thật.
- [ ] Ghi commit đã kiểm thử, lệnh chạy, video/screenshot, blocker, thiết bị và môi trường. Owner duyệt chất lượng và release; chỉ sau đó chuyển trọng tâm V0.3. Không deploy/migrate production khi chưa được phép.

## 2. Spike / V0.1 — kiểm tra hồi quy, không làm lại

Giữ các yêu cầu gốc. Chỉ đánh dấu hoàn thành khi có bằng chứng của build tích hợp, đặc biệt đối với iPhone thật và mạng khác nhau.
### Spike kỹ thuật (các mục chưa xác nhận)
- [ ] Hai client kết nối realtime, thử mất mạng, chuyển nền và quay lại trên iPhone.
- [ ] Phaser hiển thị pixel art sắc nét, điều khiển cảm ứng và bố cục dọc/ngang.
- [ ] Jellyfin phát một phim local hợp lệ qua Tailscale tới Safari iPhone; thử Direct Play và transcoding.
- [ ] Thử đồng bộ hai player Play/Pause/Seek, kiểm tra drift và buffering.
- [ ] Xác minh asset pack, giấy phép, kích thước tile, góc nhìn và animation.

### V0.1 — Our Little Home (release gate)
- [ ] Hai tài khoản và một thế giới riêng.
- [ ] Căn nhà và khu vườn pixel art.
- [ ] Hai nhân vật di chuyển realtime.
- [ ] Tùy chỉnh ngoại hình nhân vật.
- [ ] Trang trí nội thất và lưu trạng thái.
- [ ] Điều khiển cảm ứng trên iPhone.
- [ ] Cài đặt dưới dạng PWA.


## 3. Roadmap dài hạn — giữ nguyên tầm nhìn

### V0.3 — Our Daily Life
- [ ] Phòng học Pomodoro không camera.
- [ ] Nhật ký tình yêu chung.
- [ ] Album ảnh và khung ảnh trong nhà.
- [ ] Lịch hẹn hò và đếm ngược ngày gặp.
- [ ] Wishlist và địa điểm muốn đi.
- [ ] Câu hỏi dành cho cặp đôi.
- [ ] Hộp thư và quà bất ngờ.

### V0.4 — Our Little Cinema
- [ ] Phát phim tải về từ laptop Windows.
- [ ] Tích hợp media server Jellyfin.
- [ ] Đồng bộ Play/Pause/Seek realtime.
- [ ] Tự hiệu chỉnh sai lệch thời gian.
- [ ] Phụ đề và lựa chọn track âm thanh.
- [ ] Voice chat tùy chọn.
- [ ] Danh sách phim và lịch sử xem.

### V0.5 — Polish & Experience
- [ ] Chu kỳ ngày đêm và hiệu ứng thời tiết.
- [ ] Nhạc nền và âm thanh môi trường.
- [ ] Tối ưu Safari và điều khiển cảm ứng.
- [ ] Xử lý mất kết nối và đồng bộ lại.
- [ ] Bảo mật, sao lưu và phục hồi dữ liệu.
- [ ] Kiểm thử toàn bộ trên thiết bị thật.

### V1.0 — Our Island (tùy chọn, sau V0.5)
- [ ] Hồ câu cá.
- [ ] Khu picnic.
- [ ] Mở rộng hoạt động tại bãi biển đã có.
- [ ] Mở rộng rừng, địa điểm bí mật và khu vực khám phá.
- [ ] Mở rộng nhà và khu vườn.
- [ ] Sự kiện theo mùa và ngày kỷ niệm.
- [ ] Thêm hoạt động co-op.

Không triển khai hàng loạt V0.3–V1.0 trong đợt P0. Media spike Jellyfin/Tailscale có thể kiểm chứng độc lập khi không cản P0. Các yêu cầu bảo mật, backup, hiệu năng, mobile và dữ liệu riêng tư áp dụng xuyên suốt, không đợi tới V0.5.

## 4. Cách cập nhật tiến độ

Một nguồn tiến độ chung trong repo (ưu tiên docs/PROGRESS.md và docs/ROADMAP.md hiện có, không tạo bản sao mâu thuẫn). Cập nhật trạng thái theo mức: Planned → In progress → Dev playable → Integrated → Owner verified/Released. Ghi rõ môi trường/commit; For Review không đồng nghĩa Done. Chỉ tick checkbox sau khi kiểm chứng đúng tiêu chí. Mỗi lượt báo owner: gameplay mới, PR/commit, test thực tế, blocker, việc tiếp theo. Không dùng số test hoặc số dòng code làm thước đo chính.
