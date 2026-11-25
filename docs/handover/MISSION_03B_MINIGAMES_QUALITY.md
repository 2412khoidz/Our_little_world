# MISSION_03B — Premium Mini-games Quality Pass

**Branch:** `cursor/mission-03b-minigames-quality-36fd`  
**PR:** #5 → `integration/night-merge`  
**Scope:** UI/UX only at `/minigames.html` — **no** reducer, SQL, `App.tsx`, or `WorldScene` changes.

## Art direction — Cozy Game Table

- Walnut timber frame (`CozyGameTable`, `.mn-table-outer`)
- Couple strip: Mây / Nắng with **CSS icon dots** (not emoji)
- Tactile stones/discs; Memory **original SVG** faces + card-back (`memoryCardArt.tsx`)
- Lucide volume icons in shell; Battleship hit/miss **CSS marks** and ship silhouette (no emoji on board)
- `prefers-reduced-motion` disables animations (E2E verified)
- Web Audio chimes (`minigameAudio.ts`) + mute persistence (`localStorage`)

## Reusable components (main-game embed later)

| Component | Role |
|-----------|------|
| `MinigameShell` | Title, turn, couple pills, mute, exit, restart |
| `CozyGameTable` | Wood-rim board tray |
| `memoryCardArt.tsx` | Cozy SVG motifs (8 symbols + card back) |
| `useMinigame` | Domain adapter (reducer errors → Vietnamese UI) |
| `minigameCoupleDisplay.ts` | Labels + icon class only |

**Multiplayer (future):** keep `MinigameDefinition` + viewer DTOs; swap hot-seat gate for server session — see `BattleshipGame` privacy comments.

## Rules preserved (unchanged reducers)

- Caro: 15×15, win length 5 (overline)
- Othello: standard legality + pass
- Memory: 8 pairs, flip/pair semantics
- Battleship: seeded placement, `publicStateFor` / hot-seat curtain

## Functional E2E (`tests/e2e/minigames-functional.spec.ts`)

| Game | Covered |
|------|---------|
| Caro | Win line `data-winning`, outcome, restart empty board |
| Othello | Flip/counts, auto + explicit pass, play until terminal outcome |
| Memory | Mismatch turn, match, double-flip error, **full clear** after restart (seed `base+7919`) |
| Battleship | Hit/miss hints, privacy curtain, viewer projection, win loop, restart |
| Shell | Mute `aria-pressed` after reload, reduced motion, exit mid-game |
| Viewports | 390×844, 430×932, 844×390 — no horizontal overflow, touch size checks |

Helpers: `tests/e2e/minigames-e2e-helpers.ts` (shared with domain `MINIGAME_BASE_SEED`).

Screenshots are **per Playwright project**: `chromium-desktop--*` and `chromium-iphone-16-pro-max--*` under `test-results/minigames-quality/`.

**Before reference:** copy `test-results/art-pass/after/after-minigame-*` when present; new shots are `*-end-win`, `*-playing`, viewport variants.

## Verification (remediation @ PR #5)

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test` (Vitest) | 458 passed |
| `npm run build` | Pass |
| `node scripts/verify-prod-guard.mjs` | Pass (0 dev leaks) |
| `minigames-functional.spec.ts` | **12/12** (2 projects) |
| `npm run test:e2e` | **27 passed**, 1 skipped |
| `npm run test:e2e:pwa` | Pass |
| iPhone Safari thật | Chưa — Chromium viewports only |

## Limits

- Hot-seat only — not server-authoritative multiplayer
- Battleship: no manual ship placement phase (domain uses auto-place)
- iPhone Safari: Chromium viewport only unless owner tests device

## Owner decisions pending

- Caro VN rule variant (if ever) — not changed here
- Couple names permanent vs configurable from world members (Mission 04)