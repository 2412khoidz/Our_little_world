# Ma trận Tái sử dụng Mã nguồn mở (`REUSE_MATRIX`)

*Tham chiếu chứng cứ chi tiết tại [OPEN_SOURCE_RESEARCH.md](OPEN_SOURCE_RESEARCH.md).*

## Quy ước Phân loại & Nghĩa vụ Pháp lý
- **A (Reuse trực tiếp):** Tái sử dụng gần nguyên vẹn (chỉ sửa import/kiểu nhỏ), **bắt buộc** giữ nguyên copyright + text license gốc trong `THIRD_PARTY_NOTICES.md`.
- **B (Port / Điều chỉnh):** Port thuật toán/cấu trúc TS sang domain `src/shared/` hoặc `tools/` của Our Little World, giữ attribution tương ứng (`MIT` / `Apache-2.0`).
- **C (Chỉ học Ý tưởng / Kiến trúc):** Thiết kế và viết mới 100% (*clean-room*), dùng cho repo `PolyForm Noncommercial`, `Apache-2.0` Python, thiếu file `LICENSE` hoặc mismatch stack (Phaser 3 / RN).
- **D (Không phù hợp / Cấm tái sử dụng code):** `AGPL-3.0` (`pairnest`), `UNLICENSED` (`sunflower-land`), hoặc thiếu license & stack không khớp.

---

## Bảng Ma trận Tái sử dụng Theo Module

| Domain OLW | Module / File tham khảo (`repo@SHA:path#symbol`) | Phân loại | License & Nghĩa vụ | Target trong OLW | Mức công sức | Agent đề xuất |
|---|---|---|---|---|---|---|
| **Clock Sync nâng cao (iOS Suspend)** | `harvest-hollow@9b23e1a:shared/net/clock.js#ClockSync` | **A / B** | `MIT` · Ghi NOTICE Krasimir Kralev | `src/shared/cinemaSync.ts` (`ClockOffsetEstimator`) | Nhỏ (`< 0.5 ngày`) | DeepSeek + Neon/Codex review |
| **Pomodoro Co-Presence Pure Logic** | `cocoworking@947494f:packages/shared/src/pomodoro.ts` (`createPomodoroState`, `getRemainingMs`, `nextPhase`) | **A / B** | `MIT` · Ghi NOTICE Coco Working (**cấm dùng pixel art**) | `src/shared/study/pomodoro.ts` | Nhỏ (`0.5 ngày`) | DeepSeek V4.1 Flash |
| **Economy Simulator Runner** | `webfarmville@c420bc2:scripts/balance-sim.ts#run` + `harvest-hollow@9b23e1a:tools/economy-model.mjs` | **B** | `MIT` · Ghi NOTICE Shiz0id & Krasimir Kralev | `scripts/economy-sim.ts` + `tools/economy-model.ts` | Trung bình (`1–1.5 ngày`) | DeepSeek theo Spec P3 |
| **Integer Ledger & Basis-Points** | `harvest-hollow@9b23e1a:shared/rules/economy.js#mulBp/#earn/#grant/#spend/#ledger` | **B** | `MIT` · Ghi NOTICE Krasimir Kralev | `src/shared/economy/ledgerMath.ts` + Postgres RPC | Trung bình (`1 ngày`) | Neon/Codex thiết kế RPC + DeepSeek test |
| **Flower Cross-Breeding Grid** | `webfarmville@c420bc2:shared/src/features/blooms.ts#breed` | **B** | `MIT` · Ghi NOTICE Shiz0id | `src/shared/farming/blooms.ts` | Nhỏ (`0.5 ngày`) | DeepSeek V4.1 Flash |
| **Pure RNG (Server-seeded)** | `webfarmville@c420bc2:shared/src/content/orders.ts#nextRandom` (`mulberry32`) + bài học chống grind seed của `harvest-hollow` | **B** | `MIT` | `src/shared/rng.ts` (seed luôn lấy từ server/DB) | Nhỏ (`0.25 ngày`) | DeepSeek V4.1 Flash |
| **Timezone & Daily Cap Deterministic** | `harvest-hollow@9b23e1a:shared/rules/coop.js#dayOf/#localAt/#capTake` | **B** | `MIT` · Ghi NOTICE Krasimir Kralev | `src/shared/time/farmCalendar.ts` | Nhỏ (`0.5 ngày`) | DeepSeek V4.1 Flash |
| **Cinema Rate Hysteresis** | `Syncplay@49e2a1b:syncplay/client.py#_slowDownToCoverTimeDifference` | **C** | `Apache-2.0` (Python → viết TS thuần) | `src/shared/cinemaSync.ts` | Nhỏ (`0.25 ngày`) | DeepSeek V4.1 Flash |
| **Cinema WebCodecs & SDP Safari Fix** | `watchparty@ec71395:src/utils/clientTranscode.ts` + `src/components/App/App.tsx:862–872` (`a=extmap-allow-mixed`) | **B / C** | `MIT` · Ghi NOTICE Howard Chung | `src/features/cinema/` (chỉ nạp lazy ở V0.4) | Trung bình (`1–2 ngày`) | Neon/Codex review |
| **Cinema Windowed FFmpeg HLS & Ducking** | `Local-Watch-Party@02e466d:server/index.js#ensureHlsSegment` + `src/App.jsx#effectiveVolume` | **C** | `PolyForm Noncommercial 1.0.0` (học kiến trúc, tự viết sạch) | Local Host Gateway V0.4 (`tools/cinema-host/`) | Trung bình (`1.5 ngày`) | Neon/Codex thiết kế |
| **Fishing Hold-to-Catch FSM** | `greens@3f32fd8:src/game/systems/fishing.js#Fishing` | **C** | `pkg: MIT` thiếu `LICENSE` → tự viết sạch TS 100% | `src/shared/fishing/fishingMachine.ts` | Nhỏ (`0.5 ngày`) | DeepSeek V4.1 Flash |
| **Pet Non-Punitive Decay (`FLOOR > 0`)** | `Ourlittlepet@6c3e063:src/utils/petMath.ts#applyDecay` | **C** | Không có LICENSE → chỉ lấy ý tưởng `FLOOR=30`, `sleep` hồi | `src/shared/pet/petNeeds.ts` | Nhỏ (`0.5 ngày`) | DeepSeek V4.1 Flash |
| **Pet Utility AI & Anti-Sleep-Loop** | `Petivolution@d6f80a6:frontend/src/sim/ai/utility.ts#calculateUtility` | **C** | File `LICENSE` thiếu dù README ghi MIT → clean-room TS theo K3 | `src/shared/pet/petBrain.ts` | Trung bình (`1 ngày`) | Neon/Codex khung + DeepSeek mở rộng |
| **Phaser 3 Game Scenes / UI / Assets** | `Farming-Simulator-Cabacos`, `cocoworking/CoworkingScene`, `nadagotchi`, `sunflower-land` | **D** | Mismatch Phaser 3 vs 4 hoặc cấm dùng lại / Unlicensed | Không sử dụng (`DemoEScene` + `WorldScene` đã có) | — | — |
| **Mobile Couple App Full Code** | `pairnest` (`AGPL-3.0`), `Ourlittlepet` (RN+Firebase), `hackipups` | **D** | `AGPL-3.0` có nghĩa vụ cung cấp mã nguồn tương ứng theo điều khoản khi sửa và cung cấp qua mạng / khác stack React Native | Chỉ lấy danh mục ý tưởng UX (album, wishlist, nhật ký) | — | — |

---

## Trả lời 7 Câu hỏi Trọng tâm của Phase 1.7

1. **Có repository nào đủ tốt để fork làm nền toàn bộ dự án không?** → **Không.** Toàn bộ repo game nông trại (`webfarmville`, `harvest-hollow`, `Cabaços`, `sunflower-land`) dùng Phaser 3 hoặc Three.js + Express/SQLite/Web3; không repo nào có sẵn kiến trúc **Supabase RLS 2 thành viên + iPhone Safari PWA + Phaser 4 + Dev LAN fallback** như Our Little World đang chạy.
2. **Giữ codebase hiện tại và tái sử dụng từng module có hiệu quả hơn không?** → **Có, hiệu quả vượt trội.** Repo hiện tại đã đạt 24 Vitest + 8 E2E pass, đã có khóa `FOR UPDATE`, idempotency, và Demo E art direction riêng. Port thuần logic sang `src/shared/` tiết kiệm thời gian gấp nhiều lần viết từ đầu mà không gánh nợ kỹ thuật của repo khác.
3. **Những hệ thống nào tiết kiệm nhiều công sức nhất?** → (1) Pomodoro shared state (`cocoworking`), (2) Economy formula-driven generator & headless balance simulator (`harvest-hollow` + `webfarmville`), (3) NTP OS-suspend `ClockSync` (`harvest-hollow`), (4) Flower breeding & order PRNG (`webfarmville`), (5) WebCodecs/Safari SDP có điều kiện (`watchparty`) + windowed FFmpeg HLS blueprint (`Local-Watch-Party`), (6) Utility AI urgency+personality blueprint (`Petivolution`).
4. **Quyết định kiến trúc hiện tại nào cần điều chỉnh trước khi mở rộng?** → Chia `WorldBackend` thành sub-adapters thay vì nhồi 40+ method; đo lượng Broadcast theo kịch bản sử dụng và thử trần 8 Hz có ngưỡng dịch chuyển; tách Project Dev riêng cho Dev Console; chốt kiến trúc bầu *Simulation Host* cho Pet & Co-op mini-game (xem [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md)).
5. **Tích hợp như thế nào mà không phá kiến trúc V0.1?** → Xem chi tiết tại [INTEGRATION_PLAN.md](INTEGRATION_PLAN.md).
6. **Module nào phù hợp để DeepSeek V4.1 Flash triển khai?** → Mọi domain thuần TypeScript trong `src/shared/*` (inventory, ledger math, crops/blooms, fishing FSM, pet needs/utility scorers, turn-based minigame reducers, economy simulator), React modals/UI theo thiết kế cố định, và unit tests Vitest đi kèm.
7. **Module nào cần model mạnh (Neon / Codex) review?** → Postgres migrations + `SECURITY DEFINER` RPCs + RLS (`world_members`, `economy_ledger`, `minigame_sessions`), cơ chế bầu *Sim Host* Pet/Co-op, Dev Console production guard + tách project, Cinema transport HTTPS/HMAC security & WebRTC iOS Safari.
