# AI Farm (game-xay-nha) — day/night transplant evidence

| Field | Value |
|-------|--------|
| **Upstream URL** | https://github.com/nhungcute/game-xay-nha |
| **Upstream SHA** | `ab2ad7f7a3228b3cdfddd707fe7342a8cedf8061` (vendor clone @ Wave 3) |
| **License / terms** | Owner-supplied / upstream repo default (verify before redistribution of assets) |
| **OLW paths** | `src/shared/donor/ai-farm-xay-nha/dayCyclePresentation.ts` · `src/shared/world/worldClock.ts` · `src/game/world/WorldLightingOverlay.ts` · `src/features/home/WorldClockHud.tsx` |

## Source → destination

| Upstream path | OLW path |
|---------------|----------|
| `apps/web/src/game/dayCycle.ts` (`lighting`, `NIGHT_PHASES`, mode persistence) | `src/shared/donor/ai-farm-xay-nha/dayCyclePresentation.ts` |
| `apps/web/src/ui/TopBar.tsx` (`clockIcon`, clock pill layout) | `src/features/home/WorldClockHud.tsx` |
| `apps/web/src/game/GameLoop.ts` (`updateLighting` concept) | `src/game/world/WorldLightingOverlay.ts` + `cmd:sync-world-clock` |
| `apps/web/src/game/dayCycle.test.ts` | `tests/unit/aiFarmDayCyclePresentation.test.ts` |

## Weather

Upstream has no standalone weather module — OLW `worldWeatherPresentation.ts` is **reimplementation** (deterministic rng per world-day, presentation-only).

## Gameplay

| | Mô tả |
|-|--------|
| **Before** | Overworld không có vòng ngày đêm, không HUD giờ/thời tiết. |
| **After** | HUD “Ngày N” + giờ Việt; lớp phủ sáng tối + mưa nhẹ (drizzle) trên Phaser; chế độ Luôn ban ngày/đêm/Theo giờ thật (không ảnh hưởng farm authority). |
| **Proof** | `tests/unit/aiFarmDayCyclePresentation.test.ts` · `tests/unit/worldClockPresentation.test.ts` |