# Audio Assets Provenance (MIT & CC0)

- `sfx/*.mp3` — Vendored from `goncalojbsousa/Farming-Simulator-Cabacos` @ `79e423d` (MIT License):
  `hoe.mp3`, `waterPlants.mp3`, `plantSeed.mp3`, `sickle.mp3`, `getWater.mp3`, `grassyStep.mp3`, `doorOpen.mp3`, `interaction.mp3`, `purchaseClick.mp3`, `sell.mp3`, `select.mp3`, `toolSwap.mp3`, `fail.mp3`.
- Derived surface footsteps (MIT, shaped from `sfx/*.mp3` via `scripts/generate-e1-audio-clips.mjs`):
  `step_soil.mp3`, `step_sand.mp3`, `step_wood.mp3`, `step_stone.mp3`, `step_water.mp3`.
- Original CC0 JRPG-style feedback stingers (`scripts/generate-e1-audio-clips.mjs`):
  `stinger_item.mp3`, `stinger_fish.mp3`, `stinger_rare.mp3`, `stinger_quest.mp3`, `stinger_area.mp3`.
- `music/*.mp3` —
  - `title.mp3`, `farm.mp3`, `town.mp3`, `forest.mp3` — Vendored from `robintrepte/hollowmere` (MIT License).
  - `garden.mp3` (`07-Alpenglow.mp3`), `blue_forest.mp3` (`04-Blue-Forest.mp3`) — Vendored from `Blinter/harvest-horizon` (MIT License).
- `pet-care-v2/audio/*.mp3` — CC0 feline vocalizations & interaction clips (`meow_soft`, `meow_happy`, `meow_food`, `meow_short`, and trimmed trill `meow_chirp`).
- `sprites/{farming,world,pet,ui}.{mp3,json}` — Packed audio sprites built by `scripts/build-audio-sprites.mjs` from the MIT/CC0 clips above (long music & purr loops kept separate).
