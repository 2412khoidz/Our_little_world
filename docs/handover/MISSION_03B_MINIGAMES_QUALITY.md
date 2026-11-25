# MISSION_03B — Premium Mini-games Quality Pass

**Branch:** `cursor/mission-03b-minigames-quality-36fd`  
**Scope:** UI/UX only at `/minigames.html` — **no** reducer, SQL, `App.tsx`, or `WorldScene` changes.

## Art direction — Cozy Game Table

- Walnut timber frame (`CozyGameTable`, `.mn-table-outer`)
- Player couple strip: Mây / Nắng (presentation only; reducer ids unchanged)
- Tactile stones/discs/cards with `mn-pop-in`, card flip, sea shimmer
- `prefers-reduced-motion` disables animations
- Web Audio chimes (`minigameAudio.ts`) + mute (localStorage)

## Reusable components (main-game embed later)

| Component | Role |
|-----------|------|
| `MinigameShell` | Title, turn, couple pills, mute, exit, restart |
| `CozyGameTable` | Wood-rim board tray |
| `useMinigame` | Domain adapter (reducer errors surface as Vietnamese UI) |
| `minigameCoupleDisplay.ts` | Labels only |

**Multiplayer (future):** keep `MinigameDefinition` + viewer DTOs; swap hot-seat gate for server session — see `BattleshipGame` privacy comments.

## Rules preserved (unchanged reducers)

- Caro: 15×15, win length 5 (overline)
- Othello: standard legality + pass
- Memory: 8 pairs, flip/pair semantics
- Battleship: seeded placement, `publicStateFor` / hot-seat curtain

## Asset sources

- CSS procedural gradients + emoji motifs (CC0 presentation)
- No private Demo E uploads, no purchased packs

## Verification

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test` (Vitest) | 458 passed |
| `npm run build` | Pass |
| `node scripts/verify-prod-guard.mjs` | Pass (0 dev leaks) |
| `npx playwright test tests/e2e/minigames-functional.spec.ts` | Pass (10/10, 2 projects) |
| `npm run test:e2e` | 25 passed, 1 skipped (GIF sandbox desktop-only) |
| `npm run test:e2e:pwa` | Pass |
| iPhone Safari thật | Chưa — chỉ Chromium viewport 430×932 |

## Screenshots

Saved under `test-results/minigames-quality/` by Playwright (`minigames-functional.spec.ts`):

- `caro-playing-desktop.png`, `caro-portrait-menu.png`
- `othello-legal-move-desktop.png`, `othello-portrait.png`
- `memory-flip-mobile.png`, `memory-portrait.png`
- `battleship-fire-desktop.png`, `battleship-portrait-gate.png`

(Grand experience sandboxes still capture `after-minigame-*` under `test-results/art-pass/after/`.)

## Limits

- Hot-seat only — not server-authoritative multiplayer
- Battleship: no manual ship placement phase (domain uses auto-place)
- iPhone Safari: Chromium viewport only unless owner tests device

## Owner decisions pending

- Caro VN rule variant (if ever) — not changed here
- Couple names permanent vs configurable from world members (Mission 04)