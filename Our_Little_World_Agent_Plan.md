# Our Little World — Product & Engineering Plan

**Bản đặc tả v1.0 | 24/11/2026 | Dành cho coding agent (Codex hoặc tương đương)**

Đây là tài liệu định hướng để triển khai dự án mới, chưa phải mô tả một codebase đã tồn tại. Các con số về hiệu năng, kinh tế và phạm vi MVP là mục tiêu/giả định ban đầu, phải được đo và điều chỉnh. Không coi chúng là kết quả đã kiểm chứng. Người dùng ưu tiên miễn phí, tự host phim, giao diện iPhone và thế giới pixel art dành riêng cho hai người.

## 0. Chỉ thị cho coding agent

Bạn đóng vai trò senior full-stack/game engineer và product designer. Hãy xây dựng **Our Little World**, một cozy game 2D kết hợp ứng dụng cho cặp đôi yêu xa. Chỉ triển khai một milestone được giao mỗi lần, không cố tạo toàn bộ roadmap trong một lượt. Ưu tiên trải nghiệm thật trên điện thoại, độ tin cậy, an toàn dữ liệu, code dễ mở rộng và chi phí thấp hơn số lượng tính năng.

Khi bắt đầu:
1. Kiểm tra repo, git status, README, cấu trúc và các quyết định đã có; nếu repo trống thì bootstrap sau khi lập kế hoạch. Không ghi đè code hoặc thay đổi ngoài phạm vi.
2. Đọc toàn bộ tài liệu này; tạo `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/TEST_PLAN.md`, `docs/ASSETS.md`, `docs/PROGRESS.md`. Tài liệu này có thể đặt tại `docs/PRODUCT_SPEC.md`.
3. Kiểm tra tài liệu chính thức của thư viện và nền tảng trước khi chọn phiên bản. Pin dependencies bằng lockfile. Không bịa API, tính năng hay hạn mức miễn phí. Không dùng thư viện bỏ bảo trì khi có lựa chọn đơn giản hơn.
4. Lập kế hoạch task nhỏ, nêu tiêu chí nghiệm thu và giả định; triển khai Spike trước rồi V0.1 theo thứ tự. Khi cần quyền tài khoản, secrets, mua asset, public exposure hoặc phát sinh phí: dừng phần đó và yêu cầu chủ dự án thao tác/duyệt. Có thể tiếp tục phần không phụ thuộc.
5. Sau mỗi task: chạy lint, typecheck, test, build phù hợp; cập nhật tiến độ, quyết định, rủi ro, lỗi còn lại và lệnh chạy. Không tuyên bố pass nếu chưa chạy. Phân biệt test giả lập và test thiết bị thật.
6. Không tự deploy công khai, mua dịch vụ, thay đổi mạng/firewall hoặc xóa dữ liệu. Không commit credentials, token Jellyfin, nội dung cá nhân, phim hay asset không được phép phân phối.
7. Giữ UI tiếng Việt mặc định, chuẩn bị i18n nếu cần. Giao diện đẹp, không dùng placeholder/lorem ipsum làm bản nghiệm thu; có thể dùng asset tạm với giấy phép phù hợp trong Spike.

## 1. Product vision

### 1.1 Đối tượng và thiết bị
- Hai người không phải gamer hardcore, muốn có thêm hoạt động chung khi ở xa.
- Một người: Windows laptop Acer Helios Neo 16 (i9-13900HX, RTX 4060 Laptop, RAM 32 GB), Android Redmi K70E.
- Người còn lại: iPhone 16 Pro Max là thiết bị ưu tiên, có Mac đời 2013 nhưng không dựa vào Mac.
- Cả hai thấy video call khi học gây mất tập trung; phòng học phải hoạt động khi camera/mic tắt.
- Không đăng ký dịch vụ streaming phim; phim local trên Windows là use case chính. Chỉ hỗ trợ nguồn có quyền truy cập/chia sẻ.

### 1.2 Trải nghiệm cốt lõi
Hai người có một căn nhà riêng, hai avatar, khu vườn và thú cưng. Căn nhà là giao diện điều hướng của ứng dụng: tương tác với đồ vật sẽ mở công cụ tương ứng. Có menu nhanh để dùng chức năng mà không cần di chuyển avatar. Cả hai có thể online cùng lúc hoặc chơi bất đồng bộ. Tiến trình chung tồn tại qua các phiên.

### 1.3 Nguyên tắc bất biến
- Không ép đăng nhập, không daily streak bắt buộc, không vật nuôi chết đói/cây chết do offline.
- Có thể tiến triển chỉ bằng gameplay; học tập và các hoạt động thật không bắt buộc. Không xếp hạng hoặc giám sát đối phương. Không biến thời gian dành cho nhau thành KPI.
- Cho phép mini-game PvP thân thiện, tự nguyện giữa hai thành viên. Không xếp hạng cạnh tranh dài hạn, không mất tài sản và không khóa tiến trình. Không pay-to-win, quảng cáo, loot box, public chat hay matchmaking.
- Chỉ hai thành viên được truy cập thế giới; các dữ liệu tình cảm mặc định riêng tư.
- Ưu tiên thao tác một tay, touch, thời gian mở app ngắn và phản hồi rõ. Phiên chơi từ vài phút cũng có ý nghĩa.
- Không ép realtime: tài nguyên và nội thất luôn được lưu phía server; mở app lại vẫn đúng trạng thái.

## 2. Visual direction & UX

### 2.1 Art direction
Cozy pastel pixel art, góc nhìn top-down/three-quarter RPG thống nhất, nhà gỗ, đèn vàng, cây cối, hoa anh đào, bảng màu dịu; tránh kết hợp top-down với isometric không tương thích. Ưu tiên bộ asset đồng nhất từ một họa sĩ, với 16x16 là kích thước tile đề xuất (kiểm tra pack trước khi cố định). Pixel-perfect camera, nearest-neighbor, không kéo giãn sai tỷ lệ. Dùng HTML/CSS cho form, modal, accessibility; Phaser cho cảnh game.

Nguồn ứng viên (kiểm tra license và nội dung thực tế trước khi chọn):
- Cozy Farm: https://shubibubi.itch.io/cozy-farm
- Tìm bộ Cozy Interior và Cozy People cùng tác giả trên https://shubibubi.itch.io/ (chưa xác minh tên/URL, độ tương thích, giá hay license hiện tại).
- Sprout Lands (phương án thay thế): https://cupnooble.itch.io/sprout-lands-asset-pack và https://cupnooble.itch.io/sprout-lands-ui-pack
- Modern Interiors (phương án nhà hiện đại): https://limezu.itch.io/moderninteriors
- Pets: https://frakassets.itch.io/free-pets-pack
- Tiled: https://www.mapeditor.org/; Piskel: https://www.piskelapp.com/; LibreSprite: https://libresprite.github.io/

Không sao chép sprite Stardew Valley hay ảnh minh họa tìm trên Internet vào sản phẩm nếu không có quyền. AI art chỉ dùng cho chân dung, tranh, quà hoặc asset đặc biệt sau khi kiểm tra nền trong suốt, palette, anchor, kích thước và animation. Không giả định AI tạo sprite sheet đã căn pixel hoàn hảo. Ghi manifest gồm asset, tác giả, nguồn, license, yêu cầu attribution, phạm vi sử dụng. Asset mua riêng không commit vào repo public nếu giấy phép cấm phân phối. Có script/import hướng dẫn người dùng cung cấp asset hợp lệ.

### 2.2 Bản đồ và đồ vật tương tác
MVP: một căn nhà nhỏ, 1 phòng chính + góc học + góc thú cưng, một khu vườn bên ngoài. Có cửa ra vào, collision, spawn points và vùng tương tác. Từng room là scene/map ID; mở rộng qua cổng/khu vực sau này.

| Đồ vật | Hành động | Phiên bản |
|---|---|---|
| Sofa, TV | Mở rạp phim, danh sách phim | V0.4 |
| Bàn học | Phiên tập trung chung hoặc riêng | V0.3 |
| Tủ sách | Nhật ký và câu hỏi | V0.3 |
| Khung ảnh | Album riêng, chọn ảnh treo tường | V0.3 |
| Lịch | Kế hoạch gặp, đếm ngược | V0.3 |
| Hộp thư | Thư và quà bất ngờ | V0.3 |
| Giường/tủ đồ | Trang trí, đổi ngoại hình | V0.1+ |
| Ổ mèo/bát ăn | Chăm sóc thú cưng | V0.2 |
| Luống đất | Gieo hạt, tưới, thu hoạch | V0.2 |
| Cửa hàng/biển cửa hàng | Mua nội thất, hạt giống | V0.2 |
| Hồ, picnic, biển | Hoạt động mở rộng | V1.0 |

Tính năng chưa triển khai nên ẩn hoặc có nhãn chưa mở, không tạo nút giả. Đường dẫn nhanh từ giao diện mobile: Nhà / Học / Phim / Kỷ niệm / Menu, chỉ hiện các module có thật. Dùng safe-area, nút touch đủ lớn (~44 CSS px trở lên), hỗ trợ keyboard, focus, zoom chữ ở giao diện HTML, tránh hover-only. Không buộc dùng landscape cho nhật ký hoặc học; phim nên hỗ trợ fullscreen ngang.

## 3. Roadmap theo milestone

### Spike 0 — Kiểm chứng rủi ro trước khi xây lớn
- Một PWA tối giản, chạy trên Windows Chrome/Edge và iPhone Safari; thử Add to Home Screen.
- Hai avatar trên map test, di chuyển qua hai mạng khác nhau, reconnect, iPhone khóa màn hình và quay lại.
- Jellyfin local + Tailscale thử phim hợp lệ trên iPhone, một H.264/AAC MP4 và một MKV/HEVC hoặc audio không tương thích để đánh giá remux/transcode. Thử subtitle và audio track.
- Hai player thử đồng bộ Play/Pause/Seek, buffering, clock offset. Chưa tích hợp vào game. Không thiết kế giả định iPhone có thể truy cập mọi địa chỉ private từ mọi origin.
- Xác minh art pack và cách import Tiled/Phaser; đo kích thước tải, fps và tương tác.
- Báo cáo Go/No-Go từng phần: thiết bị, mạng trực tiếp/relay, codec, lỗi Safari, quyền truy cập, các phép đo. Nếu media thất bại, giữ độc lập khỏi game và sử dụng cùng file local hoặc ứng dụng bên ngoài tạm thời.

### V0.1 — Our Little Home
Phạm vi: hai tài khoản được ghép cặp bằng lời mời một lần, một nhà + vườn nhỏ, avatar di chuyển realtime, 2–3 tùy chọn ngoại hình, một số nội thất có thể đặt/di chuyển, persistence, keyboard/touch, PWA. Có starter furniture; chưa cần shop, pet AI, full inventory, movie hay study. Không cần nhiều scene ngoài hai bản đồ tối giản. Chỉ dùng asset hợp lệ.

Nghiệm thu: hai thiết bị mạng khác nhau nhìn thấy nhau; reload giữ đồ đã đặt; mỗi tài khoản thấy đúng nhà; người thứ ba bị từ chối; đồng thời đặt cùng ô chỉ một giao dịch thắng; iPhone không bị cuộn trang ngoài ý muốn khi chơi; mất mạng rồi quay lại có snapshot mới; build chạy được từ README.

### V0.2 — A Home Comes Alive
Thú cưng chung (chọn mèo hoặc chó, bắt đầu một con), đặt tên, vuốt ve, cho ăn, chơi, animation idle/walk/sleep/happy; không có tử vong hoặc trừ tình cảm do offline. Luống vườn, một vài giống cây, thu hoạch, bán, tiền chung, túi đồ chung, cửa hàng nội thất, một mini-game co-op hoặc chơi một mình, emote tương tác. Chưa cần hệ thống NPC, breeding, weather ảnh hưởng mùa vụ, hay nền kinh tế phức tạp.

Nghiệm thu: một người offline người kia vẫn thu hoạch; cây sẵn sàng sau thời gian server, không chết; cùng thu hoạch một ô chỉ nhận thưởng một lần; tiền không âm; shop và inventory atomic; hai người thấy thú cưng nhất quán ở mức trạng thái, vị trí/animation có thể nội suy cục bộ.

### V0.3 — Our Daily Life
Pomodoro, nhật ký, album, lịch hẹn, wishlist, danh sách địa điểm, câu hỏi, thư/quà. Không camera, không mic mặc định, không cần học chung môn. Có quiet mode và không phát thông báo gây mất tập trung. Câu hỏi có thể bỏ qua; nội dung người dùng nhập không gửi tới LLM bên ngoài. Nhật ký và album có quyền riêng tư theo cặp; khả năng chỉnh sửa/xóa rõ ràng.

Nghiệm thu: khóa iPhone trong phiên học, mở lại đồng hồ đúng; hết giờ chỉ cấp thưởng tối đa một lần nếu xác nhận hoàn thành; hai người có thể bắt đầu/kết thúc riêng; ảnh chỉ cặp truy cập được; nhật ký chỉnh sửa không âm thầm ghi đè phiên bản mới; lời mời/ảnh không có URL public dài hạn; lịch dùng timezone Asia/Ho_Chi_Minh để hiển thị, lưu timestamp UTC.

### V0.4 — Our Little Cinema
Jellyfin làm media layer, ứng dụng tự quản session đồng bộ, UI TV, thư viện, lịch sử, phụ đề, lựa chọn audio track, voice chat tùy chọn. Triển khai local file fallback khi phù hợp. Không viết media server/transcoder mới nếu Jellyfin đủ dùng. Không hỗ trợ DRM bypass.

Nghiệm thu: xem phim local hợp lệ trên PC và iPhone qua mạng riêng; Play/Pause/Seek hai chiều hoặc host-only theo setting; buffering/reconnect an toàn; có số đo drift; lỗi codec/mạng hiển thị hướng dẫn; không lộ token; voice chat fail không làm phim dừng; nếu một máy ngủ, có trạng thái rõ khi quay lại.

### V0.5 — Polish & Experience
Day/night, thời tiết trang trí, audio môi trường độc lập, chuyển cảnh, tối ưu mobile, accessibility, diagnostics, backup/restore, test regression, lỗi reconnect, hướng dẫn vận hành. Mục tiêu ổn định trước khi mở rộng.

### V1.0 — Our Island (tùy chọn)
Mở rộng map với hồ, picnic, biển, rừng; câu cá, thêm cây/đồ, map portal, sự kiện theo mùa/kỷ niệm, nội thất mở rộng, thêm hoạt động co-op. Chỉ triển khai khi hai người thực sự thích core. Không mặc định phải xây NPC quest engine, combat, procedural world hoặc hệ thống mùa vụ phức tạp.

## 4. Gameplay & economy

### 4.1 Core loop
Mở nhà → gặp người kia/nuôi pet/thu hoạch → nhận tiền hoặc vật phẩm → chọn món đồ → trang trí nhà → thấy tiến triển chung → quay lại khi muốn. Một phiên 5–15 phút cũng đủ. Không có stamina gate bắt buộc hay penalty offline.

### 4.2 Nguồn tài nguyên
Gameplay phải tự đủ: vườn, mini-game, vật phẩm trang trí, sau này câu cá/khám phá. Hoạt động đời thật chỉ là bonus. Điểm học không phải tiền duy nhất, không yêu cầu giám sát học tập. Không bắt buộc ghi nhật ký hay xem phim để mua nội thất. Không thưởng số lượng tin nhắn/ảnh.

Giá trị thử nghiệm cho V0.2 (chưa cân bằng, agent đưa vào config, không hardcode rải rác):
| Hạng mục | Giá trị minh họa |
|---|---:|
| Ví chung khi bắt đầu V0.2 | 200 xu |
| Hạt giống | 5 xu |
| Bán một cây thu hoạch | 15 xu |
| Một lượt mini-game hoàn thành | 10–25 xu |
| Đồ trang trí nhỏ | 25–60 xu |
| Nội thất lớn | 80–200 xu |
| Phiên học hoàn thành (tùy chọn) | 10 xu, giới hạn mềm nếu cần |

Không có thanh toán tiền thật. Đặt giá và thời gian sao cho việc trang trí thú vị mà không phải cày. Có thể điều chỉnh sau một tuần chơi thực tế. Tất cả thao tác cấp/trừ tiền qua transaction server, idempotency key, ledger. Không tin số xu do client gửi.

### 4.3 Nội thất, cây, pet
- Furniture catalog định nghĩa footprint, hướng xoay, anchor, sprite, loại phòng, collision, giá. Chỉ xoay khi có sprite tương ứng. Grid placement, preview ô hợp lệ, move/remove vào inventory, giao dịch atomic.
- Cây lưu crop ID, planted_at, ready_at, harvested_at, plot ID, phiên bản; server tính trạng thái khi đọc/thu hoạch, không cần cron mỗi phút. Tưới có thể là tương tác tùy chọn hoặc tăng tiến độ theo rule rõ; không phạt offline.
- Pet lưu tên, loài, màu, trạng thái chung, thời điểm tương tác; animation cục bộ cho nhẹ. Không cố đồng bộ từng frame. Tình cảm không suy giảm vì nghỉ chơi. Sau này mở thêm pet nếu muốn.
- Emote: wave, heart, sit together; không yêu cầu phản hồi, không gây gián đoạn chế độ học.

## 5. Technical architecture

### 5.1 Stack đề xuất (xác minh versions trước khi cài)
- React + TypeScript + Vite cho UI; Phaser cho game canvas; Tiled JSON cho tile map; CSS mobile-first.
- Supabase Auth + Postgres + Realtime + Storage. Dùng SQL migrations và RLS. Phần nghiệp vụ atomic bằng Postgres RPC/transaction; Edge Function chỉ khi thực sự cần.
- PWA manifest + service worker bằng công cụ Vite phù hợp; cache asset tĩnh versioned, không mặc định cache nhật ký/ảnh riêng/video/token. Không phụ thuộc service worker chạy nền để giữ websocket hoặc timer.
- Cloudflare Pages hoặc hosting static tương đương; local dev Supabase CLI/Docker nếu thuận tiện, project dev/test tách production.
- Jellyfin trên laptop Windows, FFmpeg/NVENC do Jellyfin quản lý nếu cần. Tailscale kết nối private cho media. WebRTC voice ở giai đoạn sau.
- Chọn pnpm hoặc npm theo repo, chỉ dùng một package manager. Vitest hoặc tương đương, Playwright (Chromium/WebKit), kiểm thử thật Safari iPhone.

Tại sao không Unity/Godot native ngay: PWA tránh cài app và quy trình Apple signing; web UI thuận tiện cho journal/movie/study. Không khẳng định PWA hỗ trợ mọi tính năng nền hoặc codec; xác minh trên iPhone. Nếu sau này PWA không đáp ứng, đánh giá native wrapper riêng, không đổi stack vội.

### 5.2 Logical architecture
```
Windows Chrome/Edge       iPhone Safari/PWA        Android (optional)
        |                        |                       |
        +--------- HTTPS / authenticated sessions -------+
                                 |
                Static web app (React + Phaser)
                                 |
                   Supabase Auth / RLS / RPC
                      Postgres + private Storage
                      Realtime channels (pair)
                                 |
                   Persistent state + session sync

Media (separate private path; not proxied by static hosting):
Windows Jellyfin + movie files <---- Tailscale/HTTPS ----> iPhone player
                 ^                                     ^
                 +-- playback state via Realtime ------+
```
Frontend public URL không đồng nghĩa dữ liệu public. Media endpoint là dịch vụ riêng; Supabase không nhận stream video. Không gọi localhost từ iPhone hoặc dùng ngrok/public tunnel mặc định. Nếu PWA origin public gọi media private, kiểm tra HTTPS, certificate, CORS, private-network restrictions và authentication trên browser thật. Có thể dùng origin private/reverse proxy được kiểm soát nếu cần; không bỏ TLS hoặc mở CORS `*` để chữa lỗi.

### 5.3 Repo structure (đề xuất, điều chỉnh theo repo)
```
our-little-world/
  AGENTS.md
  README.md
  docs/
    PRODUCT_SPEC.md ROADMAP.md ARCHITECTURE.md DECISIONS.md
    TEST_PLAN.md ASSETS.md PROGRESS.md SECURITY.md MEDIA_SETUP.md
  src/
    app/                 # routes, auth, shell, PWA UI
    game/
      scenes/            # home, garden
      entities/          # avatar, pet, furniture
      systems/           # movement, collision, interaction
      maps/              # Tiled manifests
    features/
      pairing/ home/ inventory/ economy/ pets/ gardening/
      study/ journal/ album/ dates/ mailbox/ cinema/
    lib/                 # auth client, realtime, clock, validation
    shared/              # domain types, event schemas, pure logic
    styles/
  public/assets/         # only distributable, licensed assets
  supabase/
    migrations/ seed.sql functions/ tests/
  tests/                 # unit, integration, e2e
  scripts/               # seed dev, asset import, diagnostics
  .env.example
```
Không bắt buộc monorepo cho một frontend. Tách game renderer khỏi state nghiệp vụ; Phaser nhận state/events qua adapter, không tự truy vấn DB ở từng sprite. React quản modal/form, không chạy React render 60 FPS.

### 5.4 Persistent data model (tên logic, agent thiết kế migration)
| Table | Nội dung / ràng buộc chính |
|---|---|
| profiles | user_id từ Auth, nickname, avatar config |
| worlds, world_members | world_id, member_id; giới hạn hai thành viên bằng transaction |
| invites | token hash, expires_at, redeemed_at; một lần, không trả token hash |
| maps / world_state | map id, version, layout metadata |
| furniture_catalog, placements | sku, map, footprint, rotation, version, unique constraints theo occupancy |
| wallets, wallet_ledger | world_id, balance, idempotency key, reason; atomic |
| inventory | world_id, sku, quantity >= 0 |
| pets, pet_events | world_id, species, name, interactions |
| garden_plots, crops | plot ownership, timestamps, crop status, version |
| study_sessions, study_participants | timing, participant status, reward claim uniqueness |
| journal_entries | world_id, author, body, version, timestamps |
| photos | world_id, private storage path, metadata |
| date_plans, wishlist_items, places | date/time, notes, status |
| questions, answers | question ID, visibility/reveal state |
| letters, gifts | sender, recipient, content, reveal condition |
| cinema_sessions, watch_history | media id (opaque), playback state, revision, status |

Tất cả persistent rows theo world phải có RLS policies cho membership; storage object paths dùng world ID với policy kiểm tra membership, không chỉ dựa vào khó đoán. Bảng catalog công khai read-only nếu cần. Không lưu token media ở bảng public. Dùng constraints, server timestamps, FK, unique keys và index cần thiết. Migration theo milestone, không tạo tất cả bảng khi V0.1 chưa cần.

### 5.5 Realtime model
Phân biệt dữ liệu transient và persistent. Realtime Presence cho trạng thái online; Broadcast private channel cho movement/emote; database/RPC cho nội thất, tiền, cây, pet, nhật ký. Không viết DB mỗi frame.

- Avatar local render mục tiêu 60fps nếu thiết bị chịu được, giảm 30fps nếu cần; gửi position khoảng 10 Hz thử nghiệm, interpolate remote avatar và bỏ event out-of-order. Dùng `world_id`, `map_id`, seq, timestamp, position, facing, animation, session ID. Validate bounds, payload size, map access, rate limit. Vì chỉ hai người tin cậy, MVP không cần authoritative physics server nhưng không dùng vị trí client để quyết định thưởng/tiền.
- Realtime private channel authorization theo membership; không chỉ tên room khó đoán. Cần kiểm tra RLS/policies cho Realtime Broadcast/Presence riêng.
- On reconnect: auth refresh → resubscribe → fetch snapshot → reconcile revisions → publish fresh presence. Bỏ stale movement sau timeout, không khẳng định offline tuyệt đối khi background. Persistent mutations dùng idempotency keys, optimistic UI có rollback hoặc báo lỗi, không silently merge xung đột.
- Hai người thao tác cùng lúc: transaction khóa cần thiết và unique occupancy; một người thắng, người còn lại nhận conflict và refetch. Với nhật ký dùng version check hoặc bản sao xung đột, không mất nội dung.
- Khi iPhone background, pause render và gửi trạng thái phù hợp nếu có thể; sau resume không giả định websocket vẫn còn.

## 6. Study room: silent co-presence

Phòng học có hai avatar ngồi ở bàn; không gọi video/mic mặc định. Người dùng chọn mục tiêu, thời lượng 25/45/60/90 phút hoặc tùy chỉnh. Có thể cùng bắt đầu một session hoặc tham gia/kết thúc độc lập. Mỗi người chọn âm thanh riêng, tắt animation hoặc bật tối giản. Không hiển thị thông báo chat, không leaderboard, không buộc bật app suốt phiên.

Data: server-authoritative `started_at`, `ends_at`, pause/resume state, `remaining_ms` nếu paused; mỗi participant có session ID, trạng thái và completion claim. UI suy ra remaining từ server time + clock offset, dùng monotonic time trong foreground; sau resume fetch server snapshot. Không dựa vào `setInterval` chạy nền. Pause riêng không ảnh hưởng người kia trừ khi cả hai chủ động chọn shared timer. Khi kết thúc, hiển thị trạng thái và tùy chọn xác nhận đã học; không gọi đây là xác minh thời gian học thật. Bonus một lần qua RPC, không bắt buộc học cùng.

Không hứa web notification/âm thanh khi iPhone khóa màn hình: thử thực tế và dùng phương án thông báo tùy chọn nếu được hỗ trợ; người dùng không mất tiến trình nếu notification không đến.

## 7. Cinema: ưu tiên phim local, mượt và đồng bộ

### 7.1 Product requirements
Host chọn phim từ thư viện Jellyfin trên Windows; iPhone nhận link/metadata qua session và tự phát, không stream màn hình. Hai thiết bị dùng chung nguồn hợp lệ, playback engine tự buffer. Có Play/Pause/Seek, trạng thái Ready/Buffering/Disconnected, host-only hoặc both-control, phụ đề, audio track, fullscreen, lịch sử, tùy chọn voice chat.

### 7.2 Media paths
1. Chính: Windows Jellyfin phục vụ file qua Tailscale; mỗi người có account media riêng, giới hạn thư viện; laptop phải bật, online, không sleep khi xem. Ưu tiên Direct Play; nếu container/audio/codec không phù hợp, remux hoặc transcode bằng Jellyfin, thử NVENC nếu cấu hình đúng. Host có thể xem cùng nguồn local server. Internet upload, relay, GPU load và codec quyết định chất lượng.
2. Fallback: cả hai có file tương ứng được chọn qua file picker. Xác minh file identity (hash hoặc metadata đáng tin cậy; nếu bản khác nhau cần cảnh báo), không upload file qua Supabase. iPhone Safari codec và sandbox/file picker giới hạn; có thể cần file MP4 tương thích. Không giả định MKV phát native.
3. Cloud storage tùy chọn, không mặc định vì dung lượng và phí. Chỉ với quyền chia sẻ phù hợp.

Không xây transcoder từ đầu, không nhúng token admin, không proxy phim qua Supabase. Đọc Jellyfin API chính thức và thử phương thức phát/xác thực tương thích client. Không dùng URL token dài hạn lộ qua logs/referrer; nếu cần proxy signed URL/ngắn hạn thì triển khai private origin với quyền tối thiểu. Tách secret server khỏi bundle; token người dùng nếu phải có ở client cần phạm vi hạn chế và xử lý an toàn. Không mở port WAN để né Tailscale.

### 7.3 Synchronization protocol
Một authoritative session state được cập nhật bằng RPC hoặc backend, broadcast snapshot sau commit:
```
{sessionId, mediaId, revision, controllerId, mode,
 status: playing|paused|buffering|ended,
 positionSec, rate, effectiveAtServerMs, updatedAtServerMs}
```
- `expectedPosition = positionSec + rate * elapsed` khi playing; khi paused giữ position. Dùng server timestamp, ước lượng clock offset nhiều mẫu RTT (ưu tiên mẫu thấp), resync định kỳ và sau foreground. Không dùng giờ hệ thống của từng máy như nguồn chân lý duy nhất.
- Mọi action gửi command ID, expected revision, desired position hoặc mode; server kiểm tra membership/quyền, giải quyết race bằng compare-and-swap; client áp snapshot revision mới nhất. Không echo vòng lặp event programmatic thành command mới.
- Start: cả hai bấm Ready (xử lý autoplay user gesture), buffer tối thiểu tùy cấu hình, server chọn thời điểm tương lai ngắn, cả hai phát cùng thời điểm nếu sẵn sàng. HLS seek có thể bị giới hạn, cần kiểm tra thực tế.
- Drift correction giả định thử nghiệm: <= 150ms bỏ qua; 150–500ms điều chỉnh rate nhỏ khoảng 0.97–1.03 trong thời gian ngắn nếu browser hỗ trợ; > 500ms seek lại khi ổn định. Tune theo đo đạc, không seek liên tục; tôn trọng playbackRate iOS, reset về 1. Có thể đơn giản hóa bằng seek + threshold nếu rate correction không ổn.
- Buffering: gửi ready/buffering status; mặc định cùng pause sau debounce ngắn (ví dụ 0.5–1s) nếu một máy buffer kéo dài; resume khi cả hai ready hoặc theo thao tác người dùng. Tránh pause/resume storm. Khi client offline, host được chọn tiếp tục hay đợi; reconnect lấy snapshot và đồng bộ lại. Khi một máy autoplay bị chặn, hiển thị nút chạm để phát.
- WebSocket qua Supabase Realtime phù hợp ban đầu; không cần tự xây signaling server cho playback sync nếu đủ. Snapshot persistent để khôi phục. Không cần truyền từng frame hoặc từng `timeupdate` qua mạng.

### 7.4 Safari & media compatibility
Ưu tiên H.264/AAC MP4 hoặc HLS tương thích đã kiểm chứng. HEVC, HDR, MKV, DTS/TrueHD, PGS/ASS phụ đề, nhiều track và fullscreen có thể khác nhau theo browser/codec; kiểm thử chứ không hứa hỗ trợ hết. Nếu phụ đề text, dùng WebVTT hoặc chuyển SRT hợp lệ sang VTT; phụ đề ảnh/ASS phức tạp có thể cần burn-in, làm tăng transcode. Dùng Jellyfin stream selection phù hợp, không giả định HTML5 audio track API hoạt động giống nhau. Không cache phim bằng service worker. Dùng `playsinline` khi phù hợp, user gesture, xử lý `play()` reject; fullscreen native có thể thay đổi điều khiển tùy chỉnh.

### 7.5 Quality goals (chưa kiểm chứng)
- 1080p nếu source, codec, upload và mạng đáp ứng; không hứa 4K remux qua đường relay. Bitrate thực tế thay đổi theo phim. Đo upload host và Tailscale direct/relay; nếu không đủ dùng bitrate thấp hơn hoặc tải trước.
- Drift mục tiêu median <= 200 ms và p95 <= 500 ms trong mạng ổn định sau warmup; đo bằng báo cáo vị trí hai player cùng mốc server time. Không đánh đồng sai lệch timestamp với độ trễ hình ảnh thực tế. Kiểm tra thủ công khi voice chat.
- Play/Pause/Seek phản hồi UI ngay, xác nhận server trong khoảng vài trăm ms nếu mạng tốt; buffering và reconnection có thể lâu hơn.
- Báo số lần buffering, thời gian buffer, bitrate, transcoding status, direct/relay, lỗi media; không lưu nội dung phim vào telemetry.

### 7.6 Voice chat
WebRTC audio-only tùy chọn, push-to-talk/mute; không bật camera. Signaling qua kênh private; STUN/TURN khi cần. TURN có thể tốn phí; voice là optional, ưu tiên sync phim trước. Kiểm tra quyền microphone, audio routing iPhone, headphone/echo, background restrictions. Có thể dùng cuộc gọi riêng nếu tích hợp chưa ổn, không ép voice chạy trong MVP.

## 8. Privacy, security, resilience

- Auth invite-only hoặc hạn chế signup; pairing token ngẫu nhiên đủ entropy, hash, hết hạn, dùng một lần; cap hai member enforced server. Không chia sẻ cùng credential. Thiết kế unpair/export/delete sau khi chủ dự án duyệt, không tự xóa dữ liệu của người kia.
- RLS bắt buộc trên từng bảng, private storage và private Realtime channels; test user A/B (đúng cặp) và user C (ngoài cặp). Không service-role key trong client; chỉ publishable/anon key với RLS. Validate input, sanitize text/render, limit image type/size, rate limit mutation, chống replay. Không render HTML thô từ diary.
- HTTPS, CSP phù hợp, không log tokens hoặc nội dung nhật ký/ảnh/phim. Không dùng analytics bên ngoài mặc định. Không gửi ảnh, nhật ký cho AI hoặc third party không cần thiết. Storage permissions không phải end-to-end encryption; backend operator có thể có quyền truy cập. Không tuyên bố E2EE khi chưa thiết kế.
- Private photo bucket; signed URLs ngắn hạn, access check, compress ảnh theo lựa chọn, bỏ EXIF nhạy cảm nếu phù hợp. Cơ chế backup/restore/export và xóa ảnh có tham chiếu. Cache static riêng, xóa private state khi logout; không lưu secret trong service worker cache.
- Tailscale chỉ grant truy cập dịch vụ cần thiết, không cấp toàn bộ laptop/network nếu không cần; kiểm tra ACL/grants và cách share thiết bị phù hợp. Không expose Jellyfin admin/public ports. Secrets trong env/secret manager, `.env.example` chỉ tên biến.
- Backup Postgres và private storage (tách riêng), kiểm tra restore trên dev; không dựa hoàn toàn vào free-tier retention. Không tự động xóa lịch sử. Khi offline, UI read-only cho mutation không thể xác nhận; tránh tuyên bố đã lưu khi server chưa ack.

## 9. Test plan & performance

### 9.1 Test matrix
| Test | Kỳ vọng |
|---|---|
| Windows + iPhone, khác mạng | Auth, invite, map, presence và movement hoạt động |
| iPhone Safari + Home Screen PWA | Layout, touch, safe-area, reload, khóa/mở màn hình |
| Android Chrome (bổ sung) | Core flows không lỗi nghiêm trọng |
| User C truy cập DB/Storage/Realtime/RPC | Bị từ chối ở server, không chỉ ẩn UI |
| Hai client đặt đồ cùng ô | Một thành công, một conflict, không chồng trái luật |
| Retry mua/thu hoạch/thưởng | Không nhân đôi tiền, inventory không âm |
| Mất wifi, đổi mạng, background | Reconnect và snapshot, không mất state đã commit |
| Study khóa màn hình | Thời gian đúng sau resume, thưởng idempotent |
| Journal concurrent edit | Conflict rõ, không mất bản ghi |
| Cinema pause/play/seek đồng thời | Revision authoritative, không echo loop |
| Cinema buffering, autoplay reject | UI rõ, policy pause/resume đúng, recovery |
| Media MP4/MKV/HEVC/audio/subtitles | Đo kết quả trên Safari; fallback nếu không hỗ trợ |
| Backup/restore | Dữ liệu và ảnh phục hồi ở môi trường test |

Unit test: economy, placement/collision logic, timer, crop, playback drift. Integration: SQL/RPC, RLS, invite, idempotency, snapshot. E2E: hai browser contexts, Playwright Chromium/WebKit. WebKit desktop không thay thế iPhone thật. Manual checklist cần ghi lại thiết bị, iOS, browser, mạng, kết quả, bug, ảnh/log không chứa bí mật.

### 9.2 Performance budgets (mục tiêu, không cam kết)
- Pixel art scene nhỏ hướng tới 60 FPS trên iPhone 16 Pro Max, chấp nhận 30 FPS ổn định nếu cần; không chạy render khi background; giảm animation/particles nếu pin/nhiệt cao.
- Initial app shell nhanh, lazy load scene/module; đặt mục tiêu payload khởi đầu khoảng <= 3 MB compressed, đo và điều chỉnh theo asset thực tế. Không tải phim/album toàn bộ khi mở nhà.
- Movement gửi khoảng 10 Hz, điều chỉnh theo băng thông/quota; chỉ khi cần, không idle spam. Theo dõi Supabase message usage, disconnect và lỗi. Không dùng realtime per-frame.
- Các thao tác quan trọng có loading/error/retry rõ ràng. Đo startup, fps, latency và usage trước khi tối ưu.

## 10. Deployment & cost

- Dev: local frontend + Supabase local hoặc project dev; seed 2 test users, 1 outside user. Không dùng dữ liệu thật cho test.
- Production: static host HTTPS, Supabase project, environment separation; migration có backup và rollback plan. PWA manifest và icon; kiểm tra update strategy để client cũ không phá schema. Chỉ deploy sau duyệt.
- Media: Windows Jellyfin + Tailscale, thư viện read-only khi phù hợp, account không admin, GPU acceleration tùy chọn. Không cần laptop bật để chơi nhà, học, viết nhật ký nếu cloud backend hoạt động; chỉ cần bật để xem media local.
- Mục tiêu chi phí gần 0 cho hai người, chưa xác minh quota hiện tại. Free-tier có thể thay đổi, project có thể bị pause, storage/egress/realtime/backup/TURN vượt hạn mức. Không bật auto-billing hoặc mua asset khi chưa duyệt. Theo dõi chi phí; phim lưu trên laptop giảm phí cloud nhưng tốn điện/upload. Hạn chế cloud video.

## 11. Definition of done & agent workflow

Mỗi task chỉ được coi hoàn tất nếu có code chạy được, migration/seed nếu cần, test phù hợp, cập nhật README/docs, không có secret hoặc asset vi phạm, và có nghiệm thu trên target hoặc ghi rõ chưa test target. CI tối thiểu lint, typecheck, unit test, build; integration/E2E theo milestone. Không tự tắt test để qua CI. Không dùng mock để tuyên bố tính năng realtime/media đã hoạt động thật.

Báo cáo sau mỗi milestone:
- Tính năng đã làm và chưa làm.
- File thay đổi, migration, quyết định kỹ thuật và lý do.
- Lệnh chạy + kết quả thực tế; test nào chưa chạy, lỗi nào tồn tại.
- Hướng dẫn chủ dự án thử Windows/iPhone, setup tối thiểu và dữ liệu seed.
- Rủi ro, chi phí, bước tiếp theo và điều cần người dùng quyết định.

## 12. First implementation task (giao agent ngay)

Chỉ làm **Spike 0 + nền móng V0.1**, không triển khai pet, economy, journal hoặc cinema production. Nếu repo chưa tồn tại, tạo scaffold theo stack đề xuất. Bắt đầu từ Spike, kiểm tra rủi ro Safari/media riêng biệt; các bước cần iPhone, Jellyfin, tài khoản hoặc asset chưa có thì cung cấp hướng dẫn và checklist, không tuyên bố đã nghiệm thu. Sau Spike, triển khai theo vertical slice nhỏ, mỗi slice có demo:

1. Scaffold React/TS/Vite, PWA shell, responsive, lint/typecheck/test/build; docs và .env.example.
2. Phaser map đơn giản với asset hợp lệ, camera pixel-perfect, keyboard và touch/tap-to-move; collision và tương tác một đồ vật. Chưa cần art cuối.
3. Supabase migration: profiles/worlds/members/invites, RLS, seed dev, auth UI, pair invite; test outsider. Transaction pairing tối đa hai thành viên.
4. Private Realtime movement + Presence, snapshot/reconnect, local/remote avatar, map room isolation. Test hai browser contexts và hướng dẫn iPhone thật.
5. Starter furniture catalog/placement persistence: đặt, di chuyển, cất; validate occupancy atomic; optimistic rollback. Không economy ở V0.1.
6. Polish V0.1: menu nhanh, onboarding, offline/error states, asset manifest, PWA install instructions, tests, docs, review.
7. Song song về mặt kiến trúc nhưng tách khỏi production: media proof-of-concept riêng với video mẫu hợp lệ, local sync test, hướng dẫn Jellyfin/Tailscale; chỉ tích hợp khi đạt yêu cầu và đến V0.4.

**Deliverable đầu tiên:** plan ngắn trong repo, code scaffold chạy local, một map thử nghiệm có avatar điều khiển bằng chuột/phím và touch, cùng báo cáo kiểm tra rủi ro. Nếu có quyền và môi trường phù hợp, tiếp tục tới slice hai client. Không chờ hoàn thiện tất cả asset mới viết code; thay asset tạm sau.

## 13. Quyết định cần chủ dự án xác nhận khi tới giai đoạn tương ứng

- Asset cuối: chọn một family sau khi xem preview và kiểm tra license; cần mua hay không.
- Tên/avatar/pet, màu sắc, layout nhà: để cả hai cùng chọn; mặc định tạm thời dùng tên trung tính.
- Supabase/hosting: account, quota, region, giới hạn chi phí; không cần hỏi trước khi làm local scaffold.
- Phòng phim: tốc độ upload, đường Tailscale direct/relay, định dạng phim thường xem, Jellyfin access và cách host private HTTPS.
- Quyền riêng tư nhật ký: mặc định chung trong cặp; nếu muốn mục riêng tư chỉ tác giả đọc, thiết kế chính sách riêng trước khi thêm.
- Chỉ sau khi V0.5 đã ổn mới quyết định có mở rộng thành Our Island không.

**North star:** người dùng muốn mở app vì căn nhà là nơi của hai người, không phải vì có daily quests. Nếu một tính năng không làm trải nghiệm chung dễ chịu hơn, hãy hoãn nó.
