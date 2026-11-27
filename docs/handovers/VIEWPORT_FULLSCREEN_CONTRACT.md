# Shared Global Fullscreen, Viewport & Orientation Contract (`M0` ↔ `Billiards V3.2`)

This contract coordinates the global viewport/fullscreen lifecycle between **M0 (`feat/mobile-first-hud`)** and **Billiards V3.2 (`feat/billiards-v3`)**.

## 1. Single Owner Rule
- `GlobalViewportProvider` (`src/app/viewport/GlobalViewportContext.tsx`) wraps `MainCoupleApp` in `src/app/App.tsx` and is the **only** controller allowed to manage global `document.fullscreenElement` / `screen.orientation` / `--olw-vvh` lifecycle.
- Ownership states (`FullscreenOwner`): `'none' | 'app' | 'minigame'`.
  - When the player enters fullscreen from the main overworld HUD (`btn-global-fullscreen`), `fullscreenOwner` becomes `'app'`.
  - When a minigame (`Billiards`, `ChillFishing`, `PetCare3D`, etc.) opens and calls `requestMinigameFocus('billiards', containerRef.current)`:
    - If `fullscreenOwner === 'app'`, ownership remains `'app'`.
    - When the minigame unmounts or calls `releaseMinigameFocus('billiards')`, `document.exitFullscreen()` is called **ONLY** if `fullscreenOwner === 'minigame'`.
  - **Result:** Closing Billiards never boots the player out of app-requested fullscreen.

## 2. Drop-in Replacement for Billiards `useFocusMode`
Billiards V3.2 (`Billiards2DGame.tsx`, `Billiards3DGame.tsx`) currently calls:
```ts
const { isFullscreen, isFocusExpanded, toggleFocusOrFullscreen } = useFocusMode(rootRef);
```
Once both branches integrate:
1. Replace `useFocusMode(rootRef)` inside `Billiards2DGame` / `Billiards3DGame` with:
   ```ts
   import { useSharedFocusMode } from '../../../app/viewport/GlobalViewportContext';
   const { isFullscreen, isFocusExpanded, toggleFocusOrFullscreen } = useSharedFocusMode(rootRef, 'billiards');
   ```
   *(Or pass `useSharedFocusMode` through `BilliardsModalProps` / wrap `useFocusMode.ts` as a thin delegate to `useSharedFocusMode` so unit tests that mount `BilliardsModal` standalone still fall back gracefully when no `GlobalViewportProvider` is mounted.)*
2. Keep using `--olw-vvh` (`window.visualViewport.height`) — `GlobalViewportProvider` automatically syncs `--olw-vvh` and `--olw-vvw` on `:root` and `.app-shell` across `visualViewport.resize`, `window.resize`, `orientationchange`, and `fullscreenchange`.
3. Do NOT call `document.exitFullscreen()` unconditionally in component unmount `useEffect` cleanups inside minigames.

## 3. Orientation & iOS Safari Behavior
- Supported user preferences (`olw:orientation-pref:v1`): `'auto' | 'portrait' | 'landscape'`.
- On Android Chromium (when native Fullscreen + `screen.orientation.lock` are available), entering fullscreen locks to the user's chosen orientation and unlocks cleanly when returning to `'auto'` or exiting fullscreen.
- On iPhone Safari (where `requestFullscreen` and `screen.orientation.lock` are unavailable/restricted in browser tabs), `isFocusExpanded` activates safe viewport fitting (`--olw-vvh`, `data-focus-expanded="1"`), exposes a one-tap link to `IosInstallModal` (Add to Home Screen PWA), and shows a non-blocking manual rotation hint if the user selected `'landscape'` while holding the phone upright (or vice versa).
- The root application is **never** CSS-rotated with `transform: rotate(90deg)`.
