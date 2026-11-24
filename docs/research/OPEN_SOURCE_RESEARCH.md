# Nghiên cứu Mã nguồn mở & Hạ tầng Free-Tier (`Phase 1`)

*Ngày kiểm tra: 25/11/2026 · Tất cả 18 repository được clone nông ngoài repo chính (`olw-refs/`) ở revision xác minh bên dưới. Takeover đối chiếu lại đủ 18 HEAD và file license gốc; số test trong bảng là kiểm kê tệp/kết quả tìm kiếm, chưa chạy test upstream. Không thực thi script upstream.*

---

## 1. Bảng Sàng lọc Toàn bộ 18 Repository

> **Quy tắc bản quyền:** Tách biệt license **Code** và **Artwork**. Repo không có file `LICENSE` hoặc trường `license` mặc định coi là *All Rights Reserved* → loại **D** cho việc copy code (chỉ học kiến trúc/mô hình dữ liệu ở mức khái niệm). Repo chỉ khai báo `"license"` trong `package.json` thiếu file `LICENSE` vẫn ghi chú rõ rủi ro thiếu text bản quyền.

| # | Repository | HEAD SHA (liên kết tới revision đầy đủ) | Cập nhật | License Code (xác minh) | License Art (xác minh) | Stack & Tests | Quyết định |
|---|---|---|---|---|---|---|---|
| **P0** | [webfarmville](https://github.com/Shiz0id/webfarmville) | [c420bc2](https://github.com/Shiz0id/webfarmville/tree/c420bc253f5de9dbaec636a729f4b4b2866248c4) | 2026-10-13 | **MIT** (`LICENSE`) | Procedural code (`0` image) | TS 5.9, Phaser 3.90, Express 5, `node:sqlite`, Vitest (`25` test files) | **Đào sâu · B/C (shared/sim)** |
| **P0** | [cocoworking](https://github.com/cocolocow/cocoworking) | [947494f](https://github.com/cocolocow/cocoworking/tree/947494f933e40812051ed7f3905602b04b9c5fe4) | 2026-03-25 | **MIT** (`LICENSE`) | Commercial (cấm reuse, README L86) | TS 5.7, React 19, Phaser 3.86, Socket.io, Vitest (`13` matches) | **Đào sâu · A/B (`shared/`)** |
| **P0** | [watchparty](https://github.com/howardchung/watchparty) | [ec71395](https://github.com/howardchung/watchparty/tree/ec7139536b40d342aee12ebaee597bf7bb630e8e) | 2026-11-16 | **MIT** (`LICENSE`) | UI icons (`tabler`) | TS, React 18, Socket.io, `hls.js`, `mediabunny` WebCodecs (`3` tests) | **Đào sâu · B/C (Cinema)** |
| **P0** | [Local-Watch-Party](https://github.com/smSamani/Local-Watch-Party) | [02e466d](https://github.com/smSamani/Local-Watch-Party/tree/02e466d57ad178f5d96456102e869f688e8592e5) | 2026-08-13 | **PolyForm Noncommercial 1.0.0** (`LICENSE`) | N/A | JS, React 18, Express 4, FFmpeg HLS, Socket.io (`0` tests) | **Đào sâu · C (noncommercial)** |
| **P0** | [Ourlittlepet](https://github.com/itzmeNotgab/Ourlittlepet) | [6c3e063](https://github.com/itzmeNotgab/Ourlittlepet/tree/6c3e0633704f06f44d33fc54a642e17ce1e2a699) | 2026-11-17 | **Không có LICENSE** (*All Rights Reserved*) | Không rõ | React Native 0.76, Firebase Functions/Firestore (`3` test files) | **Sàng lọc + đọc logic · D code / C ý tưởng** |
| **P0** | [Petivolution](https://github.com/yongjiexue88/Petivolution) | [d6f80a6](https://github.com/yongjiexue88/Petivolution/tree/d6f80a63ea901ddca0718a77a4b748b358a71b27) | 2026-01-12 | **Không có file LICENSE gốc** (README ghi MIT; `backend/pkg` ghi ISC → *mơ hồ*) | Tự vẽ (`standard`) | TS, React 18, Phaser 3.70, Zustand (`33` test matches) | **Đào sâu Utility AI · C (clean-room port)** |
| P1 | [harvest-hollow](https://github.com/KrasimirKralev/harvest-hollow) | [9b23e1a](https://github.com/KrasimirKralev/harvest-hollow/tree/9b23e1a1fe2b19e117a3005efce21417052ded97) | 2026-10-23 | **MIT** (`LICENSE`) | Hỗn hợp ngoài repo | JS (ESM), Express 5, `ws`, Three.js (`424` test matches + `tools/`) | **Đào sâu · A/B (`clock`, `economy-model`)** |
| P1 | [sunflower-land](https://github.com/sunflower-land/sunflower-land) | [56e95e1](https://github.com/sunflower-land/sunflower-land/tree/56e95e187e9d73b29ac5fe67fb365284cbf95cb1) | 2026-11-24 | **`UNLICENSED`** (`package.json`) | Sunnyside paid (README L44: cấm trích xuất) | TS, React 19, Phaser 3.80, XState, Web3 (`440` test matches) | **Chỉ xem pattern state machine · D code** |
| P2 | [greens](https://github.com/fernforge-arcade/greens) | [3f32fd8](https://github.com/fernforge-arcade/greens/tree/3f32fd8903b2c47fd2b05a529d0652c1b789e0b6) | 2026-08-15 | `pkg: MIT` (thiếu file `LICENSE`) | Procedural JS Canvas | Vanilla JS, Canvas 2.5D (`5` test scripts) | **Đọc `fishing.js`/`farming.js` · C** |
| P2 | [Farming-Simulator-Cabacos](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos) | [79e423d](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos/tree/79e423defc12bd99327cfcc28bf7ec0085996244) | 2026-06-18 | **MIT** (`LICENSE`) | Tiled + MP3 ngoài | TS 5.7, Phaser 3.90 (`0` tests) | **Sàng lọc dừng · C/D (Phaser 3 scene)** |
| P2 | [Syncplay](https://github.com/Syncplay/syncplay) | [49e2a1b](https://github.com/Syncplay/syncplay/tree/49e2a1bf36e5be1fc397c5bea14bed350609a9ed) | 2026-10-12 | **Apache-2.0** (`LICENSE`) | Desktop GUI icons | Python 3, Twisted (`1` test match) | **Đọc drift/hysteresis · C** |
| P2 | [nadagotchi](https://github.com/mnemonice/nadagotchi) | [4acec65](https://github.com/mnemonice/nadagotchi/tree/4acec6564b4174a4439207280dd8c627ad031e73) | 2026-07-10 | `pkg: ISC` (thiếu file `LICENSE`) | Tự vẽ / tổng hợp | JS, Phaser 3.55, Capacitor, Jest (`109` test files, nhiều script vá root) | **Đọc kiến trúc tách Brain · C** |
| P2 | [study-buddy](https://github.com/caolanegan/study-buddy) | [bed6f8e](https://github.com/caolanegan/study-buddy/tree/bed6f8e924ab99e6794ed9517e58c7e661292657) | 2026-10-12 | **Không có LICENSE** | Tự vẽ Canvas | TS 7, Vite 8, `@supabase/supabase-js`, Vitest (`9` tests) | **Đọc `supabase/schema.sql` · D code / C ý tưởng** |
| P2 | [focus-town](https://github.com/therealprodigy/focus-town) | [b60da89](https://github.com/therealprodigy/focus-town/tree/b60da896326dff655ffc7c75a15600046d6bbb53) | 2026-10-21 | **Không có LICENSE** | CC0 sound + AI webp | TS, React 19, Drizzle, libSQL/D1 (`21` tests) | **Đọc `shared-focus.ts` atomic state · D code / C** |
| P2 | [pairnest](https://github.com/YourSigh/pairnest) | [8ddf18b](https://github.com/YourSigh/pairnest/tree/8ddf18b680715259df504371124f083ed3b8c9d8) | 2026-08-17 | **AGPL-3.0-only** (`LICENSE`) | N/A | Expo RN 0.81, Express, Prisma (`1` test) | **Chỉ tham khảo danh mục tính năng · D (AGPL)** |
| P2 | [1000pets](https://github.com/donkimc/1000pets) | [249f829](https://github.com/donkimc/1000pets/tree/249f829628d0c276b94a8c85b81d42138f72fd93) | 2026-10-12 | **Không có LICENSE** | Three.js procedural | TS 5.7, Three.js, Express 4, `ws` (`25` tests) | **Đọc `BrainFile` schema · D code / C** |
| P2 | [hackipups](https://github.com/ulisesvina/hackipups) | [48c4554](https://github.com/ulisesvina/hackipups/tree/48c45548030ed03d160aa8f13e37cf5f63134fd6) | 2023-05-14 | **Không có file LICENSE** (badge MIT) | N/A | Next 13, Prisma 4 (`0` tests, cũ 2023) | **Dừng sớm · D** |
| P2 | [Focus_Picnic](https://github.com/gotcha-khushi/Focus_Picnic) | [7753839](https://github.com/gotcha-khushi/Focus_Picnic/tree/7753839aecfbacf14c516fc449edc151070ded7c) | 2026-08-22 | **Không có LICENSE** | Krita pixel art | React, Express, Socket.io (`0` tests) | **Dừng sớm · D** |

---

## 2. Phát hiện Chuyên sâu Theo Miền (Có Trích dẫn Symbol)

### 2.1 Farming, Economy & Simulator
- **`webfarmville` (`MIT`, `c420bc2`):**
  - `shared/src/logic/reducer.ts#applyAction`: reducer thuần TS bất biến (`structuredClone(prev)`) trả `{ state, events }`, tách biệt hoàn toàn khỏi Phaser/Express.
  - `scripts/balance-sim.ts#run`: mô phỏng headless nhiều ngày theo profile (`casual` vs `keen`), đo `levelAt`, `income` theo nguồn, `top sales`, phát hiện quest bị kẹt (`stuck quests`).
  - `shared/src/content/orders.ts#nextRandom`, `#generateOrder`: PRNG `mulberry32` deterministic dùng `state.seed` + đơn đặt hàng trả `1.5x` giá gốc kèm tỷ lệ thưởng decor (`22%`).
  - `shared/src/features/blooms.ts#breed`: lai giống hoa theo chu kỳ `bloomPeriod`, lưới 8 hướng `NEAR`, tăng tỷ lệ khi tưới (`WATERED_MULT`) hoặc trời mưa.
- **`harvest-hollow` (`MIT`, `9b23e1a`):**
  - `tools/economy-model.mjs#cropGross`, `#craftTime`: **Single source of truth** sinh số liệu cân bằng từ một tập công thức gốc (hệ số thời gian ngắn tuyến tính `SHORT_EXP: 1.0`, dài giảm dần `LONG_EXP: 0.45`, công thức không tạo arbitrage khi `STORE_MULT: 2.5` vs `ORDER_MULT: 1.5`) và xuất `--json` nuôi `shared/content/`.
  - `shared/rules/economy.js#earn/#grant/#spend/#refund/#ledger`: tách bạch `earned` (bán/đơn) vs `granted` (thưởng/level-up), ring buffer `ledger`, số học integer basis-points (`mulBp`) tránh sai số float.
  - `shared/rules/coop.js#dayOf/#localAt/#capTake`: tính ngày/giờ/mùa deterministic theo IANA timezone (`dayOfCivil`) bất kể giờ trình duyệt, plus per-player daily caps.
  - `docs/design/review-m0-determinism-economy.md`: cảnh báo thực tế cực giá trị — cấm client tự chọn `cid/seq` để grind seed RNG khi sinh vật phẩm/đơn hàng, và kiểm tra JSON round-trip.
- **`greens` (`pkg: MIT`, `3f32fd8`):** `src/game/systems/fishing.js#Fishing` gọn 91 dòng: FSM `idle -> waiting -> bite -> reeling -> caught/missed`, điều khiển giữ/thả thanh bar đơn giản (phù hợp cảm ứng 1 ngón trên iPhone!). `src/game/systems/farming.js#harvestPlot` mô hình cây thu hoạch nhiều lần (`regrow`) & chất lượng `0/1/2` (`normal/silver/gold`).
- **`sunflower-land` (`UNLICENSED`, `56e95e1`):** Chỉ học kiến trúc tổ chức state machine tách rời (ví dụ `chickenMachine.ts` XState), **tuyệt đối không copy code hay phần Web3/token**.

### 2.2 Cặp đôi & Nuôi thú cưng
- **`Ourlittlepet` (No License, `6c3e063`):** `src/utils/petMath.ts#applyDecay` giữ **`FLOOR = 30`** và clamp `48h` (pet không bao giờ chết hay suy kiệt về 0 vì offline), `sleeping` hồi phục energy nhanh (`+15/h`) và làm chậm đói (`-0.8/h`). `functions/src/index.ts#requestJoin` khóa brute-force mã mời (`5` lần sai → khóa `30 phút`).
- **`Petivolution` (Missing root LICENSE, `d6f80a6`):** `frontend/src/sim/ai/utility.ts#calculateUtility` dùng urgency `1 - vitals`, thưởng khoảng cách gần affordance (`nearWater`, `nearBush`), điều chỉnh theo `personality`, và rule chống lặp `Sleep Loop` khi đói/khát cao (`restScore -= 5.0`). `actions.ts#executeAction` tách rõ mục tiêu (`Goal`) khỏi thực thi di chuyển.
- **`1000pets` (No License, `249f829`):** `src/brain.ts#exportBrain` lưu thời gian dưới dạng `ageSec` (tuổi sự kiện tương đối thay vì wall-clock) để chuyển môi trường/tái đồng bộ clock an toàn.

### 2.3 Phòng học chung
- **`cocoworking` (`MIT`, `947494f`):**
  - `packages/shared/src/pomodoro.ts`: thuần TS 77 dòng (`createPomodoroState`, `getRemainingMs`, `nextPhase`, `getProgressPercent`), lưu `startedAt`/`endsAt` server ms nên không bị lệch khi tab background.
  - `packages/shared/src/proximity.ts`: tính khoảng cách Manhattan & hệ số âm lượng (`proximityVolume`).
  - Lưu ý: `CoworkingScene.ts` dùng **Phaser 3.86** với **isometric + assets trả phí cấm dùng lại**.
- **`focus-town` (No License, `b60da89`):** `server/shared-focus.ts#startSharedFocus` chứng minh mẫu optimistic-locking `revision = revision + 1` + `WHERE status IN ('idle','complete')` + readiness check đồng thời trước khi mở session chung.

---

## 3. Nghiên cứu Riêng Cinema (Transport vs State Sync, Xác minh 25/11/2026)

> Cần tách bạch **2 bài toán độc lập**: (1) **Truyền dòng video/phụ đề/audio** từ laptop Windows tới iPhone Safari không bắt bạn gái cài VPN, và (2) **Đồng bộ trạng thái phát** (`Play/Pause/Seek/Drift`).

### 3.1 So sánh Phương án Truyền Media (Laptop Windows → iPhone Safari, Viewer 0-cài-đặt)

| Phương án | Chi phí | Cần cài trên iPhone? | Điều khoản / Giới hạn (Xác minh 25/11/2026) | Hỗ trợ Seek/Subtitles Safari & Bảo mật | Đánh giá |
|---|---|---|---|---|---|
| **1. Cloudflare Tunnel / Quick Tunnel** | Không chọn cho Cinema | Không | Điều khoản giới hạn phục vụ video qua CDN. Quick Tunnel dùng thử và có URL tạm; tài liệu không xác lập ngoại lệ streaming cho Tunnel. [Điều khoản CDN](https://www.cloudflare.com/service-specific-terms-application-services/) · [Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) | Chỉ dùng hosting tĩnh cho PWA nếu được duyệt. | Ngoài danh sách benchmark chính |
| **2. Tailscale Funnel + FFmpeg HLS theo cửa sổ** | Funnel có trên mọi plan | Không; cài phía Windows host | Funnel vẫn là beta, hostname công khai, relay có giới hạn băng thông không cấu hình được. Tốc độ đạt thực tế chờ đo. [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel) | Safari phát HLS native. Gateway phải kiểm tra quyền theo phiên cho manifest, segment và phụ đề; HTTPS không tự cấp quyền. Stock HLS seek được nếu segment tương ứng sẵn sàng. | Ứng viên A, đo ở S0-5b |
| **3. WebRTC từ Chrome/Edge Windows + STUN/TURN** | STUN miễn phí; TURN/SFU dùng chung 1.000 GB/tháng, sau đó 0,05 USD/GB | Không | P2P khi bắt tay được, NAT có thể cần TURN. Chỉ bật TURN khi đã xác nhận cơ chế giữ ngân sách 0₫, có ngưỡng dừng và credential ngắn hạn do phía tin cậy cấp. [Cloudflare Realtime pricing](https://developers.cloudflare.com/realtime/sfu/platform/pricing/) | Windows host dùng captureStream(); Safari viewer nhận qua RTCPeerConnection. Viewer gửi yêu cầu seek về host; thử H.264, âm thanh, phụ đề, thao tác phát đầu tiên và reconnect trên iPhone. Feature-test trước khi cân nhắc can thiệp SDP. [WebKit media capture](https://bugs.webkit.org/show_bug.cgi?id=224972) | Ứng viên B, đo ở S0-5b |
| **4. Đồng bộ file local** | 0₫ | Không | Hai máy cần có cùng file hợp lệ H.264/AAC. Thử picker, bộ nhớ và seek trên Safari với file thực tế. | Chỉ đồng bộ timeline bằng cinemaSync.ts. | Phương án dự phòng |

### 3.2 Thuật toán Đồng bộ Trạng thái Phát (`Sync`) & Audio Ducking
- Đối chiếu `src/shared/cinemaSync.ts` hiện có với `watchparty` (`ec71395`), `Syncplay` (`49e2a1b`) và `harvest-hollow/shared/net/clock.js`:
  - `cinemaSync.ts` hiện có CAS `expectedRevision`, `AntiEchoGuard`, chọn mẫu RTT thấp nhất và các dải sai lệch 150/500 ms. WatchParty là nguồn đối chiếu cho transport và tương thích browser.
  - **Hai thử nghiệm cho V0.4 sau khi xác nhận transport:**
    1. **Cơ chế hồi phục OS suspend (`ClockSync` từ `harvest-hollow`):** Khi iPhone khóa màn hình/tắt Safari, `performance.now()` đóng băng khiến cửa sổ RTT cũ sai lệch; nếu 2 mẫu liên tiếp khớp nhau nhưng lệch `>250ms` so với offset hiện tại → reset mẫu cũ ngay.
    2. **Hysteresis chống giật tốc độ phát (`Syncplay/client.py:437-450`):** Đề xuất OLW bắt đầu chỉnh ở `>200ms` và chỉ đưa `playbackRate` về `1.0` khi lệch rút xuống `<80ms` (tránh dao động quanh ngưỡng `150ms`).
- **Voice Chat + Audio Ducking (học ý tưởng từ `Local-Watch-Party`, viết lại 100% mới):** Gửi trạng thái `speaking` qua VAD mức mic để giảm âm lượng `<video>` (`effectiveVolume = anyoneSpeaking ? userVolume * 0.2 : userVolume`), lưu ý trên iOS Safari ưu tiên giữ voice tách tùy chọn (hoặc mute/push-to-talk) vì `AVAudioSession` trên iOS đã tự xử lý âm lượng hệ thống khi mở mic.

---

## 4. Hạ tầng Free Tier cho hai người (đối chiếu 25/11/2026)

| Dịch vụ | Số liệu và giới hạn | Hệ quả cho Our Little World |
|---|---|---|
| **Supabase Free** | 2 project Free đang hoạt động theo quyền sở hữu/quản trị, DB 500 MB/project, 1 GB Storage, 200 kết nối Realtime đỉnh và 2 triệu tin/billing cycle. Billing tổng hợp theo tổ chức. Có thể pause khi ít truy vấn trong một tuần. [Billing](https://supabase.com/docs/guides/platform/billing-on-supabase) · [Realtime limits](https://supabase.com/docs/guides/realtime/limits) · [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing) | Xác nhận slot project trước khi chọn Test/Prod. Ghi cách khôi phục project và thông báo kết nối dễ hiểu. |
| **Cloudflare Pages** | Request asset tĩnh miễn phí, tối đa 20.000 file trên Free và 25 MiB/file. [Pricing](https://developers.cloudflare.com/pages/functions/pricing/) · [Limits](https://developers.cloudflare.com/pages/platform/limits/) | Ứng viên static HTTPS của PD-02. Đo artifact thật, tránh Pages Functions hoặc media nếu không cần. |
| **Cloudflare Realtime TURN** | 1.000 GB egress/tháng dùng chung SFU/TURN, có giá theo GB sau ngưỡng. STUN miễn phí. [TURN FAQ](https://developers.cloudflare.com/realtime/turn/faq/) · [Pricing](https://developers.cloudflare.com/realtime/sfu/platform/pricing/) | Khả năng dùng 0₫ của S0-5b phụ thuộc cấu hình tài khoản và khả năng dừng relay trước ngưỡng. |

**Cách tính quota:** Broadcast tính một lượt gửi và một lượt cho mỗi kết nối nhận. Với đúng hai kết nối, self-send tắt, cả hai di chuyển một giờ mỗi ngày trong 30 ngày: 10 Hz × 2 người × 2 lượt × 3.600 × 30 = **4,32 triệu**, còn 8 Hz là **3,456 triệu** (giảm 20% khi di chuyển liên tục). Nhiều tab/thiết bị tăng số lượt nhận. Ngưỡng dịch chuyển và thời gian đứng yên giảm thêm theo hành vi thực tế. OLW-010-04 đo gói gửi, độ mượt và usage Cloud khi có project, gồm Presence và lượt nhận. [Cách Supabase tính tin Realtime](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages)

### Nguồn ưu tiên khi bắt đầu port

- **cocoworking (MIT):** [pomodoro.ts](https://github.com/cocolocow/cocoworking/blob/947494f933e40812051ed7f3905602b04b9c5fe4/packages/shared/src/pomodoro.ts) nhận tham số now; quyền điều khiển phiên, resume và đồng hồ server là phần OLW tự bổ sung. [LICENSE](https://github.com/cocolocow/cocoworking/blob/947494f933e40812051ed7f3905602b04b9c5fe4/LICENSE)
- **harvest-hollow (MIT):** [ClockSync](https://github.com/KrasimirKralev/harvest-hollow/blob/9b23e1a1fe2b19e117a3005efce21417052ded97/shared/net/clock.js), [mulBp](https://github.com/KrasimirKralev/harvest-hollow/blob/9b23e1a1fe2b19e117a3005efce21417052ded97/shared/rules/economy.js), [economy model](https://github.com/KrasimirKralev/harvest-hollow/blob/9b23e1a1fe2b19e117a3005efce21417052ded97/tools/economy-model.mjs). Port logic thuần, ledger OLW do DB quyết định. [LICENSE](https://github.com/KrasimirKralev/harvest-hollow/blob/9b23e1a1fe2b19e117a3005efce21417052ded97/LICENSE)
- **webfarmville (MIT):** [balance-sim](https://github.com/Shiz0id/webfarmville/blob/c420bc253f5de9dbaec636a729f4b4b2866248c4/scripts/balance-sim.ts), [orders](https://github.com/Shiz0id/webfarmville/blob/c420bc253f5de9dbaec636a729f4b4b2866248c4/shared/src/content/orders.ts), [blooms](https://github.com/Shiz0id/webfarmville/blob/c420bc253f5de9dbaec636a729f4b4b2866248c4/shared/src/features/blooms.ts). Tái dùng mẫu runner và RNG thích hợp, cấu hình riêng cho OLW. [LICENSE](https://github.com/Shiz0id/webfarmville/blob/c420bc253f5de9dbaec636a729f4b4b2866248c4/LICENSE)
- **watchparty (MIT):** [clientTranscode.ts](https://github.com/howardchung/watchparty/blob/ec7139536b40d342aee12ebaee597bf7bb630e8e/src/utils/clientTranscode.ts) tách khỏi transport và [SDP workaround](https://github.com/howardchung/watchparty/blob/ec7139536b40d342aee12ebaee597bf7bb630e8e/src/components/App/App.tsx#L862-L872) là bằng chứng upstream cho một cấu hình Safari. Chỉ port nếu benchmark xác nhận cần. [LICENSE](https://github.com/howardchung/watchparty/blob/ec7139536b40d342aee12ebaee597bf7bb630e8e/LICENSE)
