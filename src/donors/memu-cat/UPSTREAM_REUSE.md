# memu-cat (Whoopadhi/memu-cat)

| Field | Value |
|-------|--------|
| Repository | https://github.com/Whoopadhi/memu-cat |
| Reference | `vendor/memu-cat-upstream/cat.js` |
| License | Not listed in repo — **interaction reference only** |

## Ported into OLW

| Donor concept | OLW module |
|---------------|------------|
| `following` / `fetching` / `idle` / `sad` state machine | `donorPetCareAutonomy.ts` (`chase_toy`, sleep timers) |
| Toy drag → pounce | Three.js yarn sprite + chase lerp in `DonorPetThreeCare.tsx` |

## Excluded

CSS/HTML cat art — OLW uses licensed Frakassets `cat-orange` frames only.