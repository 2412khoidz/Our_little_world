# PR #10 → Composer 2 App wiring (implemented on PR #13)

Canonical spec on #10: [`PR10_COMPOSER2_PETLIVING_APP.md`](https://github.com/2412khoidz/Our_little_world/blob/cursor/mission-04b2-pet-authority-d77e/docs/handover/PR10_COMPOSER2_PETLIVING_APP.md) @ `de7a4a5`. This copy tracks #13 integration status.

Foundation (#10) owns SQL + `WorldBackend.petLiving`; **App shell stays on #13**.

## Done on `cursor/mission-04c-pet-experience-36fd`

| Concern | Location |
|---------|----------|
| Hand-feed authority | `src/features/petCare/petCareHandFeedAuthority.ts` → `backend.pet.consumeHandFood` |
| Optional living refresh | After success: `backend.petLiving?.getLivingSnapshot(worldId)` when present |
| DEV isolation | `?living-pet=1` fallback **only** in DEV when `SERVER_AUTHORITY_REQUIRED` |
| Types | `PetLivingBackend` + `petAuthorityTypes.ts` aligned with #10 |

## Merge integration

1. Merge **#10** before claiming prod Supabase living + consume.
2. Drop duplicate migration `20261125001200` if both branches carry it (one file).
3. Map server codes (`INSUFFICIENT_ITEMS`, `VERSION_CONFLICT`, `COOLDOWN_ACTIVE`) — user-facing toasts in `App.tsx` consume path.

## Related

- **PR #11** (`cursor/mission-04b3a-main-game-pet-36fd`): overworld living pet — DEV `?living-pet=1` only; shares `PetSnapshot` with care scene, not a second pet DB.

## Not on #13

- Overworld `PetLivingMainGameDriver` server proposals (merge #11 after #10 for full loop).
- Bowl `applyPetCare` in care close-up (presentation-only bowls in scene).