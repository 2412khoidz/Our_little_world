# Handover — Pet AI Primitives (V0.2.3 preparation)

> **Trạng thái: PRIMITIVES ONLY.** Đây là các khối thuật toán tái sử dụng, **V0.2.3 CHƯA hoàn thành**.
> Neon sở hữu Pet MVP và toàn bộ hành vi mèo thật; tài liệu này chỉ mô tả API và cách ghép.

## 1. File & phạm vi
- `src/shared/petAdvanced/primitives/utilityMath.ts` — curve, urgency, weighted score, tie-break.
- `.../stabilization.ts` — cooldown, commitment, hysteresis, switch budget, anti-repeat.
- `.../memory.ts` — memory event có kiểu, buffer giới hạn, decay, per-caregiver.
- `.../affordances.ts` — lọc/xếp điểm/chọn affordance (không pathfinding).
- `.../sandbox.ts` — fixture 4 hành động, trace tất định (chỉ test/tuning).
- `.../index.ts` — re-export toàn bộ API. Test: `tests/unit/petPrimitives.test.ts` (32 test).

TypeScript thuần: không React/Phaser/DOM/Supabase, không timer, không `Date.now()`,
không `Math.random()`. Thời gian là `nowMs`; ngẫu nhiên là `seed`/`rng`.
Dữ liệu sai (NaN, ±Infinity, mảng rỗng, weight âm) được **chuẩn hoá an toàn**, không throw.
Không có typed error vì không input nào là programming error; lỗi kiểu do TypeScript chặn.

## 2. Response curve (cấu hình từ config)
`RESPONSE_CURVES` là registry theo tên: `linear`, `power`, `smoothstep`,
`inverseSmoothstep`, `logistic`; `getResponseCurve(name)` lấy hàm từ dữ liệu JSON
(tên lạ → `linear`). Tham số: `{ exponent }` (power, mặc định 2), `{ steepness, midpoint }`
(logistic, mặc định 8 và 0.5). Mọi curve kẹp input/output vào `[0, 1]`.

`needUrgency({ value, target, criticalThreshold, curve, weight })`: `value` là độ thoả mãn
0..100 (thấp = tệ). Bằng `target` → 0; bằng `criticalThreshold` → `weight` (kẹp 0..1).
`curve` nhận tên hoặc hàm. NaN/+Infinity coi như "đã thoả" (không spam hành động).

## 3. Ghép utility scoring
`scoreAction([{ key, value01, weight }, ...])` → `{ score01, totalWeight, breakdown }`.
Đây là trung bình có trọng số; weight ≤ 0/NaN bị bỏ; nếu **tất cả** weight ≤ 0 thì lấy
trung bình đều; danh sách rỗng → 0. `weightedScore(...)` chỉ trả `score01`.
`urgencyScore(contributions, mode)` với `weighted_mean` (mặc định), `saturating_sum`, `max`.
`deterministicTieBreak(candidates, keyFn?)`: score giảm dần, rồi key chuỗi tăng dần; không
bao giờ so sánh object identity. Truyền `keyFn` nếu candidate không có
`key`/`id`/`actionId`/`targetId`/`action`.

## 4. Cooldown, commitment, hysteresis
- `createCooldownTracker()` → `{ lastUsedAtMs: null }` (JSON thuần).
  `markUsed(state, nowMs)` (monotonic), `isOnCooldown(state, nowMs, cooldownMs)`, `remainingMs`.
- `sanitizeStabilizationConfig({ minActionMs, commitmentMs, interruptGraceMs,
  hysteresisMargin01, maxSwitches, switchWindowMs, minRepeatCooldownMs })`. Khoá commitment
  = `max(minActionMs, commitmentMs)`; `interruptGraceMs` cho đổi sớm một nhịp.
  `canSwitch(current, nowMs, config)`.
- `shouldInterrupt({ current, candidate, nowMs, config, currentInvalid?, history? })`:
  candidate phải hơn current ít nhất `hysteresisMargin01` **và** current invalid/đã xong
  hoặc hết commitment; tôn trọng `interruptible: false` và switch budget.
- `noteSwitch`, `canSwitchWithinBudget`, `noteSelection`, `isRepeatSuppressed` (cùng action
  chỉ được chọn lại sau `minRepeatCooldownMs`).
- Thứ tự khuyến nghị: lọc affordance → chấm điểm → `shouldInterrupt` → kiểm tra
  `isRepeatSuppressed` khi đổi action → ghi `markUsed`/`noteSelection`/`noteSwitch`.

## 5. Bounded memory
- `MemoryEvent { id, kind, atMs, caregiverId, weight?, tags? }`; kind built-in:
  `fed | played | petted | ignored | slept | explored`. Thêm kind qua
  `createMemoryKindRegistry(['purred'])`.
- `createMemoryState(capacity)`; **mặc định 64** vì `PET_AI_ARCHITECTURE.md` không nêu số.
  Khi lưu Supabase nên truyền `capacity: 24` theo `PET_SIMULATION_SPEC.md` (tối đa 24 sự kiện).
- Buffer sắp theo `(atMs, id)`, evict oldest trước, tie theo id → cùng tập sự kiện cho cùng
  state bất kể thứ tự chèn. Trùng `id` là idempotent (bản đầu thắng).
- `expireEvents(events, nowMs, ttlMs)`, `recencyWeight(atMs, nowMs, halfLifeMs)`,
  `frequencyCount(...)`, `preferenceScore(events, { nowMs, halfLifeMs, kindWeights })`
  (trung bình có trọng số recency/kind, 0..1).
- `scorePreferenceByCaregiver(events, caregiverIds, config)`: điểm quen thuộc **riêng** từng
  người, thứ tự theo `caregiverIds`. **KHÔNG có helper so sánh/xếp hạng hai chủ** — dùng cho
  attachment/familiarity, không phải "mèo yêu ai hơn".
- `serializeMemory(state)` / `deserializeMemory(json)` round-trip chính xác; JSON hỏng →
  buffer rỗng an toàn.

## 6. Affordances
`AffordanceCandidate { id, targetId, action, available, reachable, distance, occupied,
cooldownUntilMs, estimatedCostMs, tags?, context? }` do Pet MVP cung cấp; module không đọc
map, không BFS. `filterAffordances(candidates, { nowMs, maxDistance, requireReachable,
allowOccupied })` loại unavailable/unreachable/quá xa/occupied/cooldown và distance vô hạn.
`scoreAffordance(candidate, weights)`:
`base + distanceWeight*inverseDistance + costWeight*inverseCost + tagWeight*tagMatch
 - occupancyWeight*occupied`, kẹp `[0, 1]`. `selectAffordance(candidates, config)` trả
`{ candidate, score01, breakdown } | null`, tie-break theo `affordanceKey`.

## 7. Ví dụ ghép selector
```ts
const nowMs = observation.serverNowMs;
const eligible = filterAffordances(observation.affordances, {
  nowMs, maxDistance: 24, requireReachable: true, allowOccupied: false,
});
const ranked = eligible.map((candidate) => scoreAffordance(candidate, { preferredTags: ['food'] }));
const best = deterministicTieBreak(ranked, (entry) => affordanceKey(entry.candidate))[0];
const current = observation.currentAction; // { actionId, targetId, startedAtMs, durationMs, score01 }
if (current !== undefined && best !== undefined &&
    !shouldInterrupt({ current, candidate: { actionId: best.candidate.action,
      targetId: best.candidate.targetId, score01: best.score01 },
      nowMs, config: stabilization, history: switchHistory })) {
  // giữ hành động hiện tại
} else if (best !== undefined &&
           !isRepeatSuppressed(selectionLog, best.candidate.action, nowMs, repeatMs)) {
  // chọn best; sau đó markUsed(cooldowns[action], nowMs),
  // noteSelection(selectionLog, action, nowMs), noteSwitch(history, ...)
}
```

## 8. Việc còn lại của Neon (KHÔNG nằm trong primitives)
- Ánh xạ 7 tính cách → trọng số từng hành động; chọn con số cá tính thật của mèo.
- Chọn target/critical/curve cho 8 nhu cầu; quyết định anti-sleep-loop (ngưỡng đói <35).
- Mô hình 9 cảm xúc, biểu cảm anim/âm thanh/bong bóng.
- Action thật, duration, tag, điều kiện interrupt khi người chơi vuốt ve/cho ăn.
- Sim-Host, RPC, lưu DB (24 event), debugger UI.

## 9. Pet MVP phải cung cấp
- Giá trị 8 needs `0..100` (thấp = tệ) + caregiver ids hợp lệ.
- Affordance đã được ActionValidator/BFS điền `reachable`, `distance`, `occupied`,
  `cooldownUntilMs`.
- `nowMs` từ server (hoặc đồng hồ đã đồng bộ), action hiện tại và seed RNG tường minh.
- Nơi lưu state JSON: cooldown/history/selection/memory đều plain JSON, không Map/Set/Date.

## 10. Giả định & kiểm chứng
- Capacity memory mặc định 64 (docs kiến trúc không ghi số); DB cap 24 → truyền 24.
- `distance` là đơn vị world unit không gắn tile; mặc định `maxDistance` 24.
- `scoreAffordance` cộng trọng số tuyệt đối rồi kẹp; weight > 1 sẽ bão hoà, không lỗi.
- Sandbox mặc định personality rỗng (trung tính), không hardcode tính cách mèo.
Chạy: `npx vitest run tests/unit/petPrimitives.test.ts` → **32/32 pass**.
