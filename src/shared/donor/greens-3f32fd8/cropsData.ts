/**
 * Transplanted from `fernforge-arcade/greens` @ 3f32fd8903b2c47fd2b05a529d0652c1b789e0b6
 * Original sources: src/game/data/crops.js, src/game/data/items.js
 * SPDX-License-Identifier: MIT
 */

export interface GreensCropDef {
  readonly id: string;
  readonly name: string;
  readonly seasons: readonly number[];
  readonly growDays: number;
  readonly regrowDays: number;
  readonly seedPrice: number;
  readonly sellPrice: number;
  readonly kind: 'leafy' | 'head' | 'root' | 'vine' | 'stalk' | 'fruit' | 'flower';
  readonly stem: string;
  readonly leaf: string;
  readonly leaf2: string | null;
  readonly fruit: string | null;
  readonly fruit2: string | null;
  readonly heart: boolean;
  readonly produce: { readonly shape: string; readonly c: string; readonly c2?: string };
  readonly yieldMin: number;
  readonly yieldMax: number;
  readonly xp: number;
}

export interface GreensUtilityItemDef {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly price: number;
  readonly sellPrice: number;
  readonly radius: number | null;
  readonly qualityBoost: number | null;
  readonly speedBoost: number | null;
  readonly desc: string;
}

export const GREENS_SEASON_NAMES = ["Spring","Summer","Fall","Winter"] as const;

export const GREENS_CROPS: readonly GreensCropDef[] = [
  {
    "id": "lettuce",
    "name": "Lettuce",
    "seasons": [
      0
    ],
    "growDays": 4,
    "regrowDays": 0,
    "seedPrice": 20,
    "sellPrice": 45,
    "kind": "leafy",
    "stem": "#4f8c36",
    "leaf": "#7cc04f",
    "leaf2": "#9ad96a",
    "fruit": null,
    "fruit2": null,
    "heart": true,
    "produce": {
      "shape": "leafy",
      "c": "#7cc04f"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 8
  },
  {
    "id": "spinach",
    "name": "Spinach",
    "seasons": [
      0,
      2
    ],
    "growDays": 5,
    "regrowDays": 0,
    "seedPrice": 25,
    "sellPrice": 55,
    "kind": "leafy",
    "stem": "#3c7a2e",
    "leaf": "#3f8a36",
    "leaf2": "#56a345",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#3f8a36"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 10
  },
  {
    "id": "kale",
    "name": "Kale",
    "seasons": [
      0,
      2,
      3
    ],
    "growDays": 6,
    "regrowDays": 3,
    "seedPrice": 35,
    "sellPrice": 60,
    "kind": "leafy",
    "stem": "#2c6024",
    "leaf": "#2f7a3a",
    "leaf2": "#45924f",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#2f7a3a"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 12
  },
  {
    "id": "cabbage",
    "name": "Cabbage",
    "seasons": [
      0
    ],
    "growDays": 8,
    "regrowDays": 0,
    "seedPrice": 40,
    "sellPrice": 110,
    "kind": "head",
    "stem": "#4f8c36",
    "leaf": "#8fc85a",
    "leaf2": "#a8de72",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "head",
      "c": "#9ad96a",
      "c2": "#b6e886"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 18
  },
  {
    "id": "arugula",
    "name": "Arugula",
    "seasons": [
      0
    ],
    "growDays": 4,
    "regrowDays": 2,
    "seedPrice": 22,
    "sellPrice": 40,
    "kind": "leafy",
    "stem": "#3c7a2e",
    "leaf": "#5fa83e",
    "leaf2": "#7cc04f",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#5fa83e"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 7
  },
  {
    "id": "bokchoy",
    "name": "Bok Choy",
    "seasons": [
      0,
      2
    ],
    "growDays": 5,
    "regrowDays": 0,
    "seedPrice": 30,
    "sellPrice": 70,
    "kind": "leafy",
    "stem": "#dfe8c0",
    "leaf": "#5fa83e",
    "leaf2": "#7cc04f",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#9ad96a"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 11
  },
  {
    "id": "radish",
    "name": "Radish",
    "seasons": [
      0
    ],
    "growDays": 4,
    "regrowDays": 0,
    "seedPrice": 15,
    "sellPrice": 38,
    "kind": "root",
    "stem": "#4f8c36",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#d23b4e",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "round",
      "c": "#d23b4e",
      "c2": "#e85f70"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 7
  },
  {
    "id": "parsnip",
    "name": "Parsnip",
    "seasons": [
      0
    ],
    "growDays": 5,
    "regrowDays": 0,
    "seedPrice": 18,
    "sellPrice": 42,
    "kind": "root",
    "stem": "#4f8c36",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#e8d8a0",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "long",
      "c": "#e8d8a0",
      "c2": "#f4e8bc"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 8
  },
  {
    "id": "potato",
    "name": "Potato",
    "seasons": [
      0
    ],
    "growDays": 6,
    "regrowDays": 0,
    "seedPrice": 30,
    "sellPrice": 50,
    "kind": "root",
    "stem": "#3c7a2e",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#c79a5e",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "round",
      "c": "#c79a5e",
      "c2": "#d8b074"
    },
    "yieldMin": 1,
    "yieldMax": 3,
    "xp": 10
  },
  {
    "id": "cauliflower",
    "name": "Cauliflower",
    "seasons": [
      0
    ],
    "growDays": 9,
    "regrowDays": 0,
    "seedPrice": 45,
    "sellPrice": 130,
    "kind": "head",
    "stem": "#4f8c36",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "head",
      "c": "#f4f0e0",
      "c2": "#fff"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 20
  },
  {
    "id": "peas",
    "name": "Snap Peas",
    "seasons": [
      0
    ],
    "growDays": 6,
    "regrowDays": 2,
    "seedPrice": 28,
    "sellPrice": 35,
    "kind": "vine",
    "stem": "#4f8c36",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#7cc04f",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "cluster",
      "c": "#7cc04f"
    },
    "yieldMin": 2,
    "yieldMax": 4,
    "xp": 9
  },
  {
    "id": "scallion",
    "name": "Scallion",
    "seasons": [
      0,
      3
    ],
    "growDays": 3,
    "regrowDays": 2,
    "seedPrice": 12,
    "sellPrice": 28,
    "kind": "stalk",
    "stem": "#dfe8c0",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#9ad96a",
    "fruit2": "#fff",
    "heart": false,
    "produce": {
      "shape": "long",
      "c": "#9ad96a",
      "c2": "#eef"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 5
  },
  {
    "id": "strawberry",
    "name": "Strawberry",
    "seasons": [
      0
    ],
    "growDays": 7,
    "regrowDays": 3,
    "seedPrice": 60,
    "sellPrice": 70,
    "kind": "fruit",
    "stem": "#3c7a2e",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#e23b4e",
    "fruit2": "#ffe46b",
    "heart": false,
    "produce": {
      "shape": "round",
      "c": "#e23b4e",
      "c2": "#ff7080"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 12
  },
  {
    "id": "greenbean",
    "name": "Green Bean",
    "seasons": [
      1
    ],
    "growDays": 6,
    "regrowDays": 2,
    "seedPrice": 30,
    "sellPrice": 32,
    "kind": "vine",
    "stem": "#3c7a2e",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#5fa83e",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "cluster",
      "c": "#5fa83e"
    },
    "yieldMin": 2,
    "yieldMax": 4,
    "xp": 9
  },
  {
    "id": "cucumber",
    "name": "Cucumber",
    "seasons": [
      1
    ],
    "growDays": 6,
    "regrowDays": 3,
    "seedPrice": 35,
    "sellPrice": 55,
    "kind": "vine",
    "stem": "#3c7a2e",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#4f8c36",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "long",
      "c": "#4f8c36",
      "c2": "#6cae44"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 11
  },
  {
    "id": "zucchini",
    "name": "Zucchini",
    "seasons": [
      1
    ],
    "growDays": 7,
    "regrowDays": 3,
    "seedPrice": 40,
    "sellPrice": 60,
    "kind": "vine",
    "stem": "#3c7a2e",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#3f7a2e",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "long",
      "c": "#3f7a2e",
      "c2": "#5fa83e"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 12
  },
  {
    "id": "broccoli",
    "name": "Broccoli",
    "seasons": [
      1
    ],
    "growDays": 8,
    "regrowDays": 0,
    "seedPrice": 50,
    "sellPrice": 120,
    "kind": "head",
    "stem": "#4f8c36",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#3f7a2e",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "cluster",
      "c": "#3f7a2e",
      "c2": "#56a345"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 18
  },
  {
    "id": "celery",
    "name": "Celery",
    "seasons": [
      1
    ],
    "growDays": 6,
    "regrowDays": 0,
    "seedPrice": 32,
    "sellPrice": 65,
    "kind": "stalk",
    "stem": "#9ad96a",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#9ad96a",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "long",
      "c": "#9ad96a",
      "c2": "#b6e886"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 11
  },
  {
    "id": "bellpepper",
    "name": "Bell Pepper",
    "seasons": [
      1
    ],
    "growDays": 7,
    "regrowDays": 3,
    "seedPrice": 42,
    "sellPrice": 50,
    "kind": "fruit",
    "stem": "#3c7a2e",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#3fae4f",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "round",
      "c": "#3fae4f",
      "c2": "#5fd96a"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 11
  },
  {
    "id": "tomato",
    "name": "Tomato",
    "seasons": [
      1
    ],
    "growDays": 8,
    "regrowDays": 2,
    "seedPrice": 45,
    "sellPrice": 55,
    "kind": "fruit",
    "stem": "#3c7a2e",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#e23b3b",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "round",
      "c": "#e23b3b",
      "c2": "#ff6b6b"
    },
    "yieldMin": 1,
    "yieldMax": 3,
    "xp": 12
  },
  {
    "id": "corn",
    "name": "Corn",
    "seasons": [
      1,
      2
    ],
    "growDays": 10,
    "regrowDays": 3,
    "seedPrice": 55,
    "sellPrice": 60,
    "kind": "stalk",
    "stem": "#5fa83e",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#ffd84e",
    "fruit2": "#fff0a0",
    "heart": false,
    "produce": {
      "shape": "long",
      "c": "#ffd84e",
      "c2": "#fff0a0"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 16
  },
  {
    "id": "basil",
    "name": "Basil",
    "seasons": [
      1
    ],
    "growDays": 4,
    "regrowDays": 2,
    "seedPrice": 25,
    "sellPrice": 45,
    "kind": "leafy",
    "stem": "#3c7a2e",
    "leaf": "#3f8a36",
    "leaf2": "#56a345",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#3f8a36"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 8
  },
  {
    "id": "chard",
    "name": "Swiss Chard",
    "seasons": [
      1,
      2
    ],
    "growDays": 6,
    "regrowDays": 3,
    "seedPrice": 34,
    "sellPrice": 58,
    "kind": "leafy",
    "stem": "#e23b4e",
    "leaf": "#2f7a3a",
    "leaf2": "#45924f",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#2f7a3a"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 11
  },
  {
    "id": "okra",
    "name": "Okra",
    "seasons": [
      1
    ],
    "growDays": 7,
    "regrowDays": 2,
    "seedPrice": 38,
    "sellPrice": 50,
    "kind": "vine",
    "stem": "#3c7a2e",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#5fa83e",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "long",
      "c": "#5fa83e",
      "c2": "#7cc04f"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 10
  },
  {
    "id": "brussels",
    "name": "Brussels Sprout",
    "seasons": [
      2
    ],
    "growDays": 8,
    "regrowDays": 3,
    "seedPrice": 45,
    "sellPrice": 60,
    "kind": "stalk",
    "stem": "#4f8c36",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#5fa83e",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "cluster",
      "c": "#5fa83e"
    },
    "yieldMin": 2,
    "yieldMax": 3,
    "xp": 14
  },
  {
    "id": "leek",
    "name": "Leek",
    "seasons": [
      2
    ],
    "growDays": 7,
    "regrowDays": 0,
    "seedPrice": 30,
    "sellPrice": 60,
    "kind": "stalk",
    "stem": "#9ad96a",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#9ad96a",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "long",
      "c": "#9ad96a",
      "c2": "#eef"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 12
  },
  {
    "id": "collard",
    "name": "Collard Greens",
    "seasons": [
      2
    ],
    "growDays": 6,
    "regrowDays": 3,
    "seedPrice": 36,
    "sellPrice": 62,
    "kind": "leafy",
    "stem": "#2c6024",
    "leaf": "#357a32",
    "leaf2": "#4c9446",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#357a32"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 12
  },
  {
    "id": "turnip",
    "name": "Turnip",
    "seasons": [
      2
    ],
    "growDays": 5,
    "regrowDays": 0,
    "seedPrice": 20,
    "sellPrice": 48,
    "kind": "root",
    "stem": "#4f8c36",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#f0e8f0",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "round",
      "c": "#f0e8f0",
      "c2": "#c79ad6"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 9
  },
  {
    "id": "pumpkin",
    "name": "Pumpkin",
    "seasons": [
      2
    ],
    "growDays": 11,
    "regrowDays": 0,
    "seedPrice": 70,
    "sellPrice": 230,
    "kind": "fruit",
    "stem": "#4f8c36",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#e08a2e",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "round",
      "c": "#e08a2e",
      "c2": "#f0a84e"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 26
  },
  {
    "id": "squash",
    "name": "Butternut Squash",
    "seasons": [
      2
    ],
    "growDays": 8,
    "regrowDays": 0,
    "seedPrice": 48,
    "sellPrice": 105,
    "kind": "fruit",
    "stem": "#4f8c36",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#e8b85e",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "long",
      "c": "#e8b85e",
      "c2": "#f4d088"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 17
  },
  {
    "id": "artichoke",
    "name": "Artichoke",
    "seasons": [
      2
    ],
    "growDays": 9,
    "regrowDays": 0,
    "seedPrice": 55,
    "sellPrice": 140,
    "kind": "head",
    "stem": "#4f8c36",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "head",
      "c": "#5fa83e",
      "c2": "#7cc04f"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 20
  },
  {
    "id": "watercress",
    "name": "Watercress",
    "seasons": [
      2
    ],
    "growDays": 4,
    "regrowDays": 2,
    "seedPrice": 26,
    "sellPrice": 50,
    "kind": "leafy",
    "stem": "#3c7a2e",
    "leaf": "#56a345",
    "leaf2": "#7cc04f",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#56a345"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 9
  },
  {
    "id": "mustard",
    "name": "Mustard Greens",
    "seasons": [
      2
    ],
    "growDays": 5,
    "regrowDays": 2,
    "seedPrice": 28,
    "sellPrice": 52,
    "kind": "leafy",
    "stem": "#4f8c36",
    "leaf": "#7cc04f",
    "leaf2": "#9ad96a",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#7cc04f"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 10
  },
  {
    "id": "kohlrabi",
    "name": "Kohlrabi",
    "seasons": [
      2
    ],
    "growDays": 6,
    "regrowDays": 0,
    "seedPrice": 34,
    "sellPrice": 75,
    "kind": "root",
    "stem": "#4f8c36",
    "leaf": "#6cae44",
    "leaf2": null,
    "fruit": "#9ad9b0",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "round",
      "c": "#9ad9b0",
      "c2": "#b6e8c8"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 12
  },
  {
    "id": "grape",
    "name": "Grape",
    "seasons": [
      2
    ],
    "growDays": 9,
    "regrowDays": 3,
    "seedPrice": 60,
    "sellPrice": 75,
    "kind": "vine",
    "stem": "#4f8c36",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#7a3bd2",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "cluster",
      "c": "#7a3bd2"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 14
  },
  {
    "id": "winterkale",
    "name": "Frost Kale",
    "seasons": [
      3
    ],
    "growDays": 7,
    "regrowDays": 4,
    "seedPrice": 55,
    "sellPrice": 95,
    "kind": "leafy",
    "stem": "#2c6024",
    "leaf": "#3a8a6a",
    "leaf2": "#56a385",
    "fruit": null,
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "leafy",
      "c": "#3a8a6a"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 16
  },
  {
    "id": "snowpea",
    "name": "Snow Pea",
    "seasons": [
      3
    ],
    "growDays": 6,
    "regrowDays": 3,
    "seedPrice": 50,
    "sellPrice": 65,
    "kind": "vine",
    "stem": "#3c7a2e",
    "leaf": "#7cc0a0",
    "leaf2": null,
    "fruit": "#9ad9b0",
    "fruit2": null,
    "heart": false,
    "produce": {
      "shape": "cluster",
      "c": "#9ad9b0"
    },
    "yieldMin": 2,
    "yieldMax": 3,
    "xp": 14
  },
  {
    "id": "starfruit",
    "name": "Starfruit",
    "seasons": [
      1
    ],
    "growDays": 13,
    "regrowDays": 0,
    "seedPrice": 200,
    "sellPrice": 750,
    "kind": "fruit",
    "stem": "#4f8c36",
    "leaf": "#5fa83e",
    "leaf2": null,
    "fruit": "#ffe046",
    "fruit2": "#fff",
    "heart": false,
    "produce": {
      "shape": "round",
      "c": "#ffe046",
      "c2": "#fff5a0"
    },
    "yieldMin": 1,
    "yieldMax": 1,
    "xp": 50
  },
  {
    "id": "ancientgreen",
    "name": "Ancient Green",
    "seasons": [
      0,
      1,
      2,
      3
    ],
    "growDays": 14,
    "regrowDays": 7,
    "seedPrice": 0,
    "sellPrice": 500,
    "kind": "leafy",
    "stem": "#2c6024",
    "leaf": "#6cd0b0",
    "leaf2": "#9af0d0",
    "fruit": null,
    "fruit2": null,
    "heart": true,
    "produce": {
      "shape": "leafy",
      "c": "#6cd0b0"
    },
    "yieldMin": 1,
    "yieldMax": 2,
    "xp": 60
  }
] as const;

export const GREENS_UTILITIES: readonly GreensUtilityItemDef[] = [
  {
    "id": "hoe",
    "name": "Hoe",
    "type": "tool",
    "price": 0,
    "sellPrice": 0,
    "radius": null,
    "qualityBoost": null,
    "speedBoost": null,
    "desc": "Till soil into plantable rows."
  },
  {
    "id": "wateringcan",
    "name": "Watering Can",
    "type": "tool",
    "price": 0,
    "sellPrice": 0,
    "radius": null,
    "qualityBoost": null,
    "speedBoost": null,
    "desc": "Water crops so they grow."
  },
  {
    "id": "axe",
    "name": "Axe",
    "type": "tool",
    "price": 0,
    "sellPrice": 0,
    "radius": null,
    "qualityBoost": null,
    "speedBoost": null,
    "desc": "Chop trees for wood."
  },
  {
    "id": "pickaxe",
    "name": "Pickaxe",
    "type": "tool",
    "price": 0,
    "sellPrice": 0,
    "radius": null,
    "qualityBoost": null,
    "speedBoost": null,
    "desc": "Break rocks for stone & ore."
  },
  {
    "id": "scythe",
    "name": "Scythe",
    "type": "tool",
    "price": 0,
    "sellPrice": 0,
    "radius": null,
    "qualityBoost": null,
    "speedBoost": null,
    "desc": "Clear weeds & grass quickly."
  },
  {
    "id": "sword",
    "name": "Old Sword",
    "type": "tool",
    "price": 0,
    "sellPrice": 0,
    "radius": null,
    "qualityBoost": null,
    "speedBoost": null,
    "desc": "A rusty blade. Fends off cave critters."
  },
  {
    "id": "fishingrod",
    "name": "Fishing Rod",
    "type": "tool",
    "price": 0,
    "sellPrice": 0,
    "radius": null,
    "qualityBoost": null,
    "speedBoost": null,
    "desc": "Cast into water to catch fish."
  }
] as const;

export const GREENS_RECIPES = [
  {
    "id": "salad",
    "type": "cook",
    "out": "salad",
    "n": 1,
    "ingredients": {
      "lettuce": 1,
      "spinach": 1
    },
    "unlock": null
  },
  {
    "id": "coleslaw",
    "type": "cook",
    "out": "coleslaw",
    "n": 1,
    "ingredients": {
      "cabbage": 1,
      "radish": 1
    },
    "unlock": {
      "skill": "cooking",
      "lvl": 1
    }
  },
  {
    "id": "veggie_soup",
    "type": "cook",
    "out": "veggie_soup",
    "n": 1,
    "ingredients": {
      "potato": 1,
      "leek": 1,
      "kale": 1
    },
    "unlock": {
      "skill": "cooking",
      "lvl": 1
    }
  },
  {
    "id": "greens_smoothie",
    "type": "cook",
    "out": "greens_smoothie",
    "n": 1,
    "ingredients": {
      "kale": 1,
      "spinach": 1,
      "basil": 1
    },
    "unlock": {
      "skill": "foraging",
      "lvl": 2
    }
  },
  {
    "id": "stir_fry",
    "type": "cook",
    "out": "stir_fry",
    "n": 1,
    "ingredients": {
      "broccoli": 1,
      "bellpepper": 1,
      "scallion": 1
    },
    "unlock": {
      "skill": "cooking",
      "lvl": 2
    }
  },
  {
    "id": "veggie_stew",
    "type": "cook",
    "out": "veggie_stew",
    "n": 1,
    "ingredients": {
      "potato": 1,
      "turnip": 1,
      "leek": 1,
      "kale": 1
    },
    "unlock": {
      "skill": "cooking",
      "lvl": 3
    }
  },
  {
    "id": "pickles",
    "type": "cook",
    "out": "pickles",
    "n": 1,
    "ingredients": {
      "cucumber": 2
    },
    "unlock": {
      "skill": "cooking",
      "lvl": 1
    }
  },
  {
    "id": "baked_potato",
    "type": "cook",
    "out": "baked_potato",
    "n": 1,
    "ingredients": {
      "potato": 1
    },
    "unlock": null
  },
  {
    "id": "fish_dinner",
    "type": "cook",
    "out": "fish_dinner",
    "n": 1,
    "ingredients": {
      "bass": 1,
      "parsnip": 1
    },
    "unlock": {
      "skill": "fishing",
      "lvl": 2
    }
  },
  {
    "id": "pumpkin_pie",
    "type": "cook",
    "out": "pumpkin_pie",
    "n": 1,
    "ingredients": {
      "pumpkin": 1,
      "milk": 1,
      "egg": 1
    },
    "unlock": {
      "skill": "cooking",
      "lvl": 4
    }
  },
  {
    "id": "berry_jam",
    "type": "cook",
    "out": "berry_jam",
    "n": 1,
    "ingredients": {
      "wild_berry": 2,
      "strawberry": 1
    },
    "unlock": {
      "skill": "foraging",
      "lvl": 1
    }
  },
  {
    "id": "herb_tea",
    "type": "cook",
    "out": "herb_tea",
    "n": 1,
    "ingredients": {
      "basil": 1,
      "dandelion": 1
    },
    "unlock": {
      "skill": "foraging",
      "lvl": 1
    }
  },
  {
    "id": "corn_bread",
    "type": "cook",
    "out": "corn_bread",
    "n": 1,
    "ingredients": {
      "corn": 2,
      "egg": 1
    },
    "unlock": {
      "skill": "cooking",
      "lvl": 2
    }
  },
  {
    "id": "energy_tonic",
    "type": "cook",
    "out": "energy_tonic",
    "n": 1,
    "ingredients": {
      "starfruit": 1,
      "honey": 1,
      "wild_mushroom": 1
    },
    "unlock": {
      "skill": "cooking",
      "lvl": 6
    }
  },
  {
    "id": "copper_bar",
    "type": "craft",
    "out": "copper_bar",
    "n": 1,
    "ingredients": {
      "copper": 4,
      "coal": 1
    },
    "unlock": {
      "skill": "mining",
      "lvl": 1
    }
  },
  {
    "id": "iron_bar",
    "type": "craft",
    "out": "iron_bar",
    "n": 1,
    "ingredients": {
      "iron": 4,
      "coal": 2
    },
    "unlock": {
      "skill": "mining",
      "lvl": 3
    }
  },
  {
    "id": "gold_bar",
    "type": "craft",
    "out": "gold_bar",
    "n": 1,
    "ingredients": {
      "gold": 4,
      "coal": 3
    },
    "unlock": {
      "skill": "mining",
      "lvl": 5
    }
  },
  {
    "id": "chest",
    "type": "craft",
    "out": "chest",
    "n": 1,
    "ingredients": {
      "wood": 30
    },
    "unlock": null
  },
  {
    "id": "scarecrow",
    "type": "craft",
    "out": "scarecrow",
    "n": 1,
    "ingredients": {
      "wood": 20,
      "fiber": 10,
      "coal": 1
    },
    "unlock": {
      "skill": "farming",
      "lvl": 1
    }
  },
  {
    "id": "sprinkler",
    "type": "craft",
    "out": "sprinkler",
    "n": 1,
    "ingredients": {
      "copper_bar": 1,
      "iron_bar": 1
    },
    "unlock": {
      "skill": "farming",
      "lvl": 3
    }
  },
  {
    "id": "fence",
    "type": "craft",
    "out": "fence",
    "n": 5,
    "ingredients": {
      "wood": 4
    },
    "unlock": null
  },
  {
    "id": "gate",
    "type": "craft",
    "out": "gate",
    "n": 1,
    "ingredients": {
      "wood": 6
    },
    "unlock": null
  },
  {
    "id": "torch",
    "type": "craft",
    "out": "torch",
    "n": 2,
    "ingredients": {
      "wood": 1,
      "sap": 2
    },
    "unlock": null
  },
  {
    "id": "stone_path",
    "type": "craft",
    "out": "stone_path",
    "n": 5,
    "ingredients": {
      "stone": 2
    },
    "unlock": null
  },
  {
    "id": "fertilizer",
    "type": "craft",
    "out": "fertilizer",
    "n": 2,
    "ingredients": {
      "sap": 2,
      "fiber": 4
    },
    "unlock": {
      "skill": "farming",
      "lvl": 2
    }
  }
] as const;
