/**
 * Transplanted from `KrasimirKralev/harvest-hollow` @ 9b23e1a1fe2b19e117a3005efce21417052ded97
 * Original sources: shared/content/{crops,trees,animals,feeds,tools,buildings,recipes}.js
 * SPDX-License-Identifier: MIT
 */

export const HOLLOW_CROPS = [
  {
    "id": "wheat",
    "name": "Wheat",
    "m": "M1a",
    "unlock": 1,
    "growMs": 60000,
    "yield": 2,
    "sell": 2,
    "seed": 2,
    "xp": 1,
    "classes": [
      "grain"
    ],
    "season": "winter",
    "hue": "#E8B84A",
    "archetype": "tall",
    "model": "crops/wheat",
    "xp100": 50,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      50,
      250,
      750,
      2500
    ],
    "freshMs": 300000,
    "waterable": false
  },
  {
    "id": "carrot",
    "name": "Carrot",
    "m": "M1a",
    "unlock": 2,
    "growMs": 120000,
    "yield": 2,
    "sell": 4,
    "seed": 3,
    "xp": 1,
    "classes": [
      "root",
      "veg"
    ],
    "season": "spring",
    "hue": "#F08A2C",
    "archetype": "root",
    "model": "crops/carrot",
    "xp100": 100,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      50,
      250,
      750,
      2500
    ],
    "freshMs": 300000,
    "waterable": false
  },
  {
    "id": "corn",
    "name": "Corn",
    "m": "M1a",
    "unlock": 3,
    "growMs": 600000,
    "yield": 3,
    "sell": 15,
    "seed": 18,
    "xp": 6,
    "classes": [
      "grain"
    ],
    "season": "summer",
    "hue": "#F2D04B",
    "archetype": "tall",
    "model": "crops/corn",
    "xp100": 563,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      35,
      190,
      560,
      1900
    ],
    "freshMs": 300000,
    "waterable": false
  },
  {
    "id": "strawberry",
    "name": "Strawberry",
    "m": "M1a",
    "unlock": 4,
    "growMs": 3600000,
    "yield": 3,
    "sell": 90,
    "seed": 108,
    "xp": 34,
    "classes": [
      "fruit"
    ],
    "season": "spring",
    "hue": "#E83A55",
    "archetype": "bush",
    "model": "crops/strawberry",
    "xp100": 3375,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      20,
      100,
      300,
      1000
    ],
    "freshMs": 900000,
    "waterable": true
  },
  {
    "id": "potato",
    "name": "Potato",
    "m": "M1a",
    "unlock": 5,
    "growMs": 14400000,
    "yield": 3,
    "sell": 171,
    "seed": 205,
    "xp": 64,
    "classes": [
      "root",
      "veg"
    ],
    "season": "autumn",
    "hue": "#C9A06A",
    "archetype": "root",
    "model": "crops/potato",
    "xp100": 6413,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      12,
      60,
      180,
      620
    ],
    "freshMs": 3600000,
    "waterable": true
  },
  {
    "id": "tomato",
    "name": "Tomato",
    "m": "M1a",
    "unlock": 6,
    "growMs": 1800000,
    "yield": 3,
    "sell": 47,
    "seed": 56,
    "xp": 18,
    "classes": [
      "veg"
    ],
    "season": "summer",
    "hue": "#E8463A",
    "archetype": "bush",
    "model": "crops/tomato",
    "xp100": 1763,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      25,
      130,
      380,
      1300
    ],
    "freshMs": 450000,
    "waterable": true
  },
  {
    "id": "sugarcane",
    "name": "Sugarcane",
    "m": "M1a",
    "unlock": 8,
    "growMs": 2700000,
    "yield": 2,
    "sell": 108,
    "seed": 86,
    "xp": 27,
    "classes": [
      "cane"
    ],
    "season": "winter",
    "hue": "#9BD86A",
    "archetype": "tall",
    "model": "crops/sugarcane",
    "xp100": 2700,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      20,
      110,
      330,
      1100
    ],
    "freshMs": 675000,
    "waterable": true
  },
  {
    "id": "pumpkin",
    "name": "Pumpkin",
    "m": "M1a",
    "unlock": 9,
    "growMs": 43200000,
    "yield": 2,
    "sell": 445,
    "seed": 356,
    "xp": 111,
    "classes": [
      "veg"
    ],
    "season": "autumn",
    "hue": "#F2852A",
    "archetype": "ground",
    "model": "crops/pumpkin",
    "xp100": 11125,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "freshMs": 7200000,
    "waterable": true
  },
  {
    "id": "sunflower",
    "name": "Sunflower",
    "m": "M1a",
    "unlock": 11,
    "growMs": 21600000,
    "yield": 2,
    "sell": 335,
    "seed": 268,
    "xp": 84,
    "classes": [
      "grain",
      "flower"
    ],
    "season": "summer",
    "hue": "#FFD21F",
    "archetype": "flower",
    "model": "crops/sunflower",
    "xp100": 8375,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      11,
      55,
      160,
      530
    ],
    "freshMs": 5400000,
    "waterable": true
  },
  {
    "id": "cabbage",
    "name": "Cabbage",
    "m": "M1a",
    "unlock": 12,
    "growMs": 86400000,
    "yield": 2,
    "sell": 632,
    "seed": 506,
    "xp": 158,
    "classes": [
      "veg"
    ],
    "season": "winter",
    "hue": "#B7E36E",
    "archetype": "ground",
    "model": "crops/cabbage",
    "xp100": 15800,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "freshMs": 7200000,
    "waterable": true
  },
  {
    "id": "raspberry",
    "name": "Raspberry",
    "m": "M1a",
    "unlock": 12,
    "growMs": 9000000,
    "yield": 3,
    "sell": 152,
    "seed": 182,
    "xp": 57,
    "classes": [
      "fruit"
    ],
    "season": "summer",
    "hue": "#C7234A",
    "archetype": "bush",
    "model": "crops/raspberry",
    "xp100": 5700,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      15,
      75,
      220,
      730
    ],
    "freshMs": 2250000,
    "waterable": true
  },
  {
    "id": "oats",
    "name": "Oats",
    "m": "M1b",
    "unlock": 13,
    "growMs": 1200000,
    "yield": 3,
    "sell": 34,
    "seed": 41,
    "xp": 13,
    "classes": [
      "grain"
    ],
    "season": "autumn",
    "hue": "#D8C27A",
    "archetype": "tall",
    "model": "crops/oats",
    "xp100": 1275,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      30,
      150,
      440,
      1500
    ],
    "freshMs": 300000,
    "waterable": false
  },
  {
    "id": "rose",
    "name": "Roses",
    "m": "M1b",
    "unlock": 13,
    "growMs": 5400000,
    "yield": 2,
    "sell": 184,
    "seed": 147,
    "xp": 46,
    "classes": [
      "flower"
    ],
    "season": "spring",
    "hue": "#D6284B",
    "archetype": "flower",
    "model": "crops/rose",
    "xp100": 4600,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      17,
      85,
      260,
      870
    ],
    "freshMs": 1350000,
    "waterable": true
  },
  {
    "id": "blueberry",
    "name": "Blueberry",
    "m": "M1b",
    "unlock": 14,
    "growMs": 10800000,
    "yield": 3,
    "sell": 170,
    "seed": 204,
    "xp": 64,
    "classes": [
      "fruit"
    ],
    "season": "summer",
    "hue": "#4D5BD6",
    "archetype": "bush",
    "model": "crops/blueberry",
    "xp100": 6375,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      14,
      70,
      200,
      680
    ],
    "freshMs": 2700000,
    "waterable": true
  },
  {
    "id": "cotton",
    "name": "Cotton",
    "m": "M1b",
    "unlock": 16,
    "growMs": 36000000,
    "yield": 2,
    "sell": 448,
    "seed": 358,
    "xp": 112,
    "classes": [
      "fibre"
    ],
    "season": "autumn",
    "hue": "#FFFFFF",
    "archetype": "bush",
    "model": "crops/cotton",
    "xp100": 11200,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "freshMs": 7200000,
    "waterable": true
  },
  {
    "id": "coffee",
    "name": "Coffee Beans",
    "m": "M1b",
    "unlock": 16,
    "growMs": 18000000,
    "yield": 3,
    "sell": 219,
    "seed": 263,
    "xp": 82,
    "classes": [
      "bean"
    ],
    "season": "winter",
    "hue": "#A3262A",
    "archetype": "bush",
    "model": "crops/coffee",
    "xp100": 8213,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      11,
      55,
      170,
      570
    ],
    "freshMs": 4500000,
    "waterable": true
  },
  {
    "id": "paprika",
    "name": "Paprika",
    "m": "M1b",
    "unlock": 16,
    "growMs": 9000000,
    "yield": 2,
    "sell": 240,
    "seed": 192,
    "xp": 60,
    "classes": [
      "spice"
    ],
    "season": "autumn",
    "hue": "#C8281E",
    "archetype": "bush",
    "model": "crops/paprika",
    "xp100": 6000,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      15,
      75,
      220,
      730
    ],
    "freshMs": 2250000,
    "waterable": true
  },
  {
    "id": "savory",
    "name": "Savory",
    "m": "M1b",
    "unlock": 17,
    "growMs": 2400000,
    "yield": 3,
    "sell": 72,
    "seed": 86,
    "xp": 27,
    "classes": [
      "spice"
    ],
    "season": "summer",
    "hue": "#7A9A48",
    "archetype": "flower",
    "model": "crops/savory",
    "xp100": 2700,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      25,
      120,
      350,
      1200
    ],
    "freshMs": 600000,
    "waterable": true
  },
  {
    "id": "lavender",
    "name": "Lavender",
    "m": "M1b",
    "unlock": 18,
    "growMs": 7200000,
    "yield": 2,
    "sell": 223,
    "seed": 178,
    "xp": 56,
    "classes": [
      "flower"
    ],
    "season": "spring",
    "hue": "#A98BE0",
    "archetype": "flower",
    "model": "crops/lavender",
    "xp100": 5575,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      16,
      80,
      240,
      780
    ],
    "freshMs": 1800000,
    "waterable": true
  },
  {
    "id": "chili",
    "name": "Chili Pepper",
    "m": "M1b",
    "unlock": 18,
    "growMs": 3600000,
    "yield": 2,
    "sell": 163,
    "seed": 130,
    "xp": 41,
    "classes": [
      "spice"
    ],
    "season": "summer",
    "hue": "#D62A1E",
    "archetype": "bush",
    "model": "crops/chili",
    "xp100": 4075,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      20,
      100,
      300,
      1000
    ],
    "freshMs": 900000,
    "waterable": true
  },
  {
    "id": "cumin",
    "name": "Cumin",
    "m": "M1b",
    "unlock": 19,
    "growMs": 25200000,
    "yield": 2,
    "sell": 396,
    "seed": 317,
    "xp": 99,
    "classes": [
      "spice"
    ],
    "season": "spring",
    "hue": "#B08A4E",
    "archetype": "tall",
    "model": "crops/cumin",
    "xp100": 9900,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      10,
      50,
      150,
      510
    ],
    "freshMs": 6300000,
    "waterable": true
  },
  {
    "id": "onion",
    "name": "Onion",
    "m": "M1b",
    "unlock": 24,
    "growMs": 5400000,
    "yield": 3,
    "sell": 140,
    "seed": 168,
    "xp": 53,
    "classes": [
      "root",
      "veg"
    ],
    "season": "spring",
    "hue": "#E7C8A0",
    "archetype": "root",
    "model": "crops/onion",
    "xp100": 5250,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      17,
      85,
      260,
      870
    ],
    "freshMs": 1350000,
    "waterable": true
  },
  {
    "id": "watermelon",
    "name": "Watermelon",
    "m": "M2",
    "unlock": 27,
    "growMs": 57600000,
    "yield": 2,
    "sell": 629,
    "seed": 503,
    "xp": 157,
    "classes": [
      "fruit"
    ],
    "season": "summer",
    "hue": "#3E8E3A",
    "archetype": "ground",
    "model": "crops/watermelon",
    "xp100": 15725,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "freshMs": 7200000,
    "waterable": true
  },
  {
    "id": "pepper",
    "name": "Bell Pepper",
    "m": "M2",
    "unlock": 31,
    "growMs": 18000000,
    "yield": 3,
    "sell": 259,
    "seed": 311,
    "xp": 97,
    "classes": [
      "veg"
    ],
    "season": "summer",
    "hue": "#E03C2E",
    "archetype": "bush",
    "model": "crops/pepper",
    "xp100": 9713,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      11,
      55,
      170,
      570
    ],
    "freshMs": 4500000,
    "waterable": true
  },
  {
    "id": "rice",
    "name": "Rice",
    "m": "M2",
    "unlock": 35,
    "growMs": 28800000,
    "yield": 3,
    "sell": 333,
    "seed": 400,
    "xp": 125,
    "classes": [
      "grain"
    ],
    "season": "autumn",
    "hue": "#CFE59A",
    "archetype": "tall",
    "model": "crops/rice",
    "xp100": 12488,
    "stages": [
      0,
      0.1,
      0.4,
      1
    ],
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "freshMs": 7200000,
    "waterable": true
  }
] as const;
export const HOLLOW_TREES = [
  {
    "id": "apple_tree",
    "name": "Apple Tree",
    "m": "M1a",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 4,
    "shop": true,
    "cost": 4900,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 14400000,
    "yield": 5,
    "product": "apple",
    "xp": 101,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      12,
      60,
      180,
      620
    ],
    "model": "trees/apple_tree",
    "shape": {
      "canopy": [
        1,
        1,
        1
      ],
      "trunk": 1,
      "lean": 0
    },
    "hue": "#E23B3B",
    "leaf": "#4E9A3A"
  },
  {
    "id": "pine",
    "name": "Pine (woodlot)",
    "m": "M1a",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 6,
    "shop": true,
    "cost": 6800,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 28800000,
    "yield": 8,
    "product": "wood",
    "xp": 142,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": false,
    "tool": "axe",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/pine",
    "shape": {
      "canopy": [
        0.9,
        1.45,
        0.9
      ],
      "trunk": 1.1,
      "lean": 0
    },
    "hue": "#8A5A33",
    "leaf": "#2F6B3C"
  },
  {
    "id": "cherry_tree",
    "name": "Cherry Tree",
    "m": "M1a",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 11,
    "shop": true,
    "cost": 6400,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 21600000,
    "yield": 5,
    "product": "cherry",
    "xp": 134,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      11,
      55,
      160,
      530
    ],
    "model": "trees/cherry_tree",
    "shape": {
      "canopy": [
        1.05,
        0.95,
        1.05
      ],
      "trunk": 0.95,
      "lean": 0.04
    },
    "hue": "#B5122E",
    "leaf": "#5DA544"
  },
  {
    "id": "orange_tree",
    "name": "Orange Tree",
    "m": "M1b",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 13,
    "shop": true,
    "cost": 7500,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 28800000,
    "yield": 6,
    "product": "orange",
    "xp": 156,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/orange_tree",
    "shape": {
      "canopy": [
        1,
        1,
        1
      ],
      "trunk": 0.9,
      "lean": 0
    },
    "hue": "#F28C1E",
    "leaf": "#3F8F3A"
  },
  {
    "id": "pomegranate_tree",
    "name": "Pomegranate Tree",
    "m": "M1b",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 14,
    "shop": true,
    "cost": 8800,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 39600000,
    "yield": 5,
    "product": "pomegranate",
    "xp": 183,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/pomegranate_tree",
    "shape": {
      "canopy": [
        1.1,
        0.9,
        1.1
      ],
      "trunk": 0.8,
      "lean": 0.05
    },
    "hue": "#C0213A",
    "leaf": "#3F7F36"
  },
  {
    "id": "lemon_tree",
    "name": "Lemon Tree",
    "m": "M1b",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 15,
    "shop": true,
    "cost": 7700,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 28800000,
    "yield": 6,
    "product": "lemon",
    "xp": 161,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/lemon_tree",
    "shape": {
      "canopy": [
        0.95,
        1.05,
        0.95
      ],
      "trunk": 0.9,
      "lean": 0.02
    },
    "hue": "#F5D63D",
    "leaf": "#4A9A3E"
  },
  {
    "id": "peach_tree",
    "name": "Peach Tree",
    "m": "M1b",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 17,
    "shop": true,
    "cost": 5100,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 10800000,
    "yield": 4,
    "product": "peach",
    "xp": 106,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      14,
      70,
      200,
      680
    ],
    "model": "trees/peach_tree",
    "shape": {
      "canopy": [
        1.3,
        0.8,
        1.3
      ],
      "trunk": 0.8,
      "lean": 0.03
    },
    "hue": "#F7A26B",
    "leaf": "#62A848"
  },
  {
    "id": "pear_tree",
    "name": "Pear Tree",
    "m": "M1b",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 19,
    "shop": true,
    "cost": 8900,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 36000000,
    "yield": 6,
    "product": "pear",
    "xp": 186,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/pear_tree",
    "shape": {
      "canopy": [
        0.8,
        1.3,
        0.8
      ],
      "trunk": 1.2,
      "lean": 0
    },
    "hue": "#C9D14A",
    "leaf": "#4C9440"
  },
  {
    "id": "cinnamon_tree",
    "name": "Cinnamon Tree",
    "m": "M1b",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 19,
    "shop": true,
    "cost": 8500,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 32400000,
    "yield": 5,
    "product": "cinnamon",
    "xp": 178,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/cinnamon_tree",
    "shape": {
      "canopy": [
        0.95,
        1.2,
        0.95
      ],
      "trunk": 1.05,
      "lean": 0.03
    },
    "hue": "#9C5A2E",
    "leaf": "#3D7A3A"
  },
  {
    "id": "plum_tree",
    "name": "Plum Tree",
    "m": "M1b",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 23,
    "shop": true,
    "cost": 8000,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 25200000,
    "yield": 5,
    "product": "plum",
    "xp": 166,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      510
    ],
    "model": "trees/plum_tree",
    "shape": {
      "canopy": [
        1.05,
        1,
        1.05
      ],
      "trunk": 1,
      "lean": 0.05
    },
    "hue": "#6B2A6E",
    "leaf": "#4F8E3C"
  },
  {
    "id": "walnut_tree",
    "name": "Walnut Tree",
    "m": "M2",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 26,
    "shop": true,
    "cost": 10000,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 43200000,
    "yield": 6,
    "product": "walnut",
    "xp": 218,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": false,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/walnut_tree",
    "shape": {
      "canopy": [
        1.25,
        1.1,
        1.25
      ],
      "trunk": 1.2,
      "lean": 0.02
    },
    "hue": "#8B6B43",
    "leaf": "#4A853A"
  },
  {
    "id": "olive_tree",
    "name": "Olive Tree",
    "m": "M2",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 30,
    "shop": true,
    "cost": 11000,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 43200000,
    "yield": 6,
    "product": "olive",
    "xp": 228,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/olive_tree",
    "shape": {
      "canopy": [
        1.2,
        0.75,
        1.2
      ],
      "trunk": 0.75,
      "lean": 0.08
    },
    "hue": "#6F7D3A",
    "leaf": "#9AAE8C"
  },
  {
    "id": "maple_tree",
    "name": "Maple Tree",
    "m": "M2",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 34,
    "shop": true,
    "cost": 11000,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 36000000,
    "yield": 6,
    "product": "maple_sap",
    "xp": 219,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": false,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/maple_tree",
    "shape": {
      "canopy": [
        1.1,
        1.2,
        1.1
      ],
      "trunk": 1.1,
      "lean": 0
    },
    "hue": "#C8452B",
    "leaf": "#D9542C"
  },
  {
    "id": "cocoa_tree",
    "name": "Cocoa Tree",
    "m": "M2",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 36,
    "shop": true,
    "cost": 13000,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 57600000,
    "yield": 6,
    "product": "cocoa",
    "xp": 276,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/cocoa_tree",
    "shape": {
      "canopy": [
        0.9,
        1.1,
        0.9
      ],
      "trunk": 0.9,
      "lean": 0.04
    },
    "hue": "#8A4B2A",
    "leaf": "#3E7F38"
  },
  {
    "id": "fig_tree",
    "name": "Fig Tree",
    "m": "M2",
    "kind": "tree",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 39,
    "shop": true,
    "cost": 11000,
    "growthBp": 4500,
    "cap": {
      "base": 4,
      "per10Levels": 1,
      "max": 8
    },
    "cycleMs": 32400000,
    "yield": 5,
    "product": "fig",
    "xp": 219,
    "saplingCycles": 2,
    "heirloomAt": 60,
    "flowering": true,
    "tool": "basket",
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "model": "trees/fig_tree",
    "shape": {
      "canopy": [
        1.15,
        0.9,
        1.15
      ],
      "trunk": 0.85,
      "lean": 0.06
    },
    "hue": "#5B3A5E",
    "leaf": "#5C9B45"
  }
] as const;
export const HOLLOW_ANIMALS = [
  {
    "id": "chicken",
    "name": "Chicken",
    "m": "M1a",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "coop"
    ],
    "unlock": 1,
    "shop": true,
    "baby": 800,
    "adult": 1300,
    "first": {
      "baby": 560,
      "adult": 900
    },
    "growthBp": 1000,
    "babyMs": 1800000,
    "bottle": "chicken_feed",
    "feed": "chicken_feed",
    "feedQty": 1,
    "cycleMs": 1200000,
    "product": "egg",
    "out": 1,
    "xp": 10,
    "prizedAt": 60,
    "premium": "golden_egg",
    "premiumBp": 1000,
    "mastery": [
      30,
      150,
      440,
      1500
    ],
    "sound": "cluck",
    "model": "animals/chicken"
  },
  {
    "id": "cow",
    "name": "Cow",
    "m": "M1a",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "cow_barn"
    ],
    "unlock": 7,
    "shop": true,
    "baby": 1400,
    "adult": 2200,
    "growthBp": 1000,
    "babyMs": 7200000,
    "bottle": "baby_bottle",
    "feed": "livestock_feed",
    "feedQty": 1,
    "cycleMs": 3600000,
    "product": "milk",
    "out": 1,
    "xp": 18,
    "prizedAt": 40,
    "premium": "cream_top_milk",
    "premiumBp": 1000,
    "mastery": [
      20,
      100,
      300,
      1000
    ],
    "sound": "moo",
    "model": "animals/cow"
  },
  {
    "id": "sheep",
    "name": "Sheep",
    "m": "M1a",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "pasture"
    ],
    "unlock": 12,
    "shop": true,
    "baby": 2800,
    "adult": 4500,
    "growthBp": 1000,
    "babyMs": 21600000,
    "bottle": "baby_bottle",
    "feed": "livestock_feed",
    "feedQty": 2,
    "cycleMs": 14400000,
    "product": "wool",
    "out": 1,
    "xp": 36,
    "prizedAt": 25,
    "premium": "silk_wool",
    "premiumBp": 1000,
    "mastery": [
      12,
      60,
      180,
      620
    ],
    "sound": "baa",
    "model": "animals/sheep"
  },
  {
    "id": "bee",
    "name": "Bee Colony",
    "m": "M1b",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "beehive"
    ],
    "unlock": 13,
    "shop": false,
    "baby": null,
    "adult": null,
    "growthBp": 1000,
    "babyMs": 0,
    "bottle": null,
    "feed": null,
    "feedQty": 0,
    "cycleMs": 21600000,
    "product": "honey",
    "out": 1,
    "xp": 43,
    "prizedAt": 25,
    "premium": "royal_jelly",
    "premiumBp": 1000,
    "mastery": [
      11,
      55,
      160,
      530
    ],
    "sound": "buzz",
    "model": "animals/bee"
  },
  {
    "id": "rabbit",
    "name": "Rabbit",
    "m": "M1b",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "hutch"
    ],
    "unlock": 14,
    "shop": true,
    "baby": 2000,
    "adult": 3200,
    "growthBp": 1000,
    "babyMs": 5400000,
    "bottle": "rabbit_greens",
    "feed": "rabbit_greens",
    "feedQty": 1,
    "cycleMs": 7200000,
    "product": "angora_wool",
    "out": 1,
    "xp": 25,
    "prizedAt": 40,
    "premium": "cloud_angora",
    "premiumBp": 1000,
    "mastery": [
      16,
      80,
      240,
      780
    ],
    "sound": "thump",
    "model": "animals/rabbit"
  },
  {
    "id": "quail",
    "name": "Quail",
    "m": "M1b",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "quail_coop"
    ],
    "unlock": 15,
    "shop": true,
    "baby": 1100,
    "adult": 1800,
    "growthBp": 1000,
    "babyMs": 1800000,
    "bottle": "chicken_feed",
    "feed": "chicken_feed",
    "feedQty": 1,
    "cycleMs": 2400000,
    "product": "quail_egg",
    "out": 2,
    "xp": 15,
    "prizedAt": 60,
    "premium": "speckled_egg",
    "premiumBp": 1000,
    "mastery": [
      25,
      120,
      350,
      1200
    ],
    "sound": "chirp",
    "model": "animals/quail"
  },
  {
    "id": "pig",
    "name": "Pig",
    "m": "M1b",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "pig_pen"
    ],
    "unlock": 17,
    "shop": true,
    "baby": 2800,
    "adult": 4500,
    "growthBp": 1000,
    "babyMs": 14400000,
    "bottle": "baby_bottle",
    "feed": "pig_slop",
    "feedQty": 1,
    "cycleMs": 14400000,
    "product": "truffle",
    "out": 1,
    "xp": 35,
    "prizedAt": 25,
    "premium": "black_truffle",
    "premiumBp": 1000,
    "mastery": [
      12,
      60,
      180,
      620
    ],
    "sound": "oink",
    "model": "animals/pig"
  },
  {
    "id": "bison",
    "name": "Bison",
    "m": "M1b",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "bison_range"
    ],
    "unlock": 17,
    "shop": true,
    "baby": 3900,
    "adult": 6200,
    "growthBp": 1000,
    "babyMs": 28800000,
    "bottle": "baby_bottle",
    "feed": "prairie_hay",
    "feedQty": 2,
    "cycleMs": 28800000,
    "product": "bison_wool",
    "out": 2,
    "xp": 50,
    "prizedAt": 20,
    "premium": "bison_down",
    "premiumBp": 1000,
    "mastery": [
      10,
      50,
      150,
      500
    ],
    "sound": "snort",
    "model": "animals/bison"
  },
  {
    "id": "duck",
    "name": "Duck",
    "m": "M1b",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "duck_pond"
    ],
    "unlock": 19,
    "shop": true,
    "baby": 1700,
    "adult": 2700,
    "growthBp": 1000,
    "babyMs": 3600000,
    "bottle": "chicken_feed",
    "feed": "chicken_feed",
    "feedQty": 1,
    "cycleMs": 5400000,
    "product": "duck_egg",
    "out": 1,
    "xp": 22,
    "prizedAt": 40,
    "premium": "golden_feather",
    "premiumBp": 1000,
    "mastery": [
      17,
      85,
      260,
      870
    ],
    "sound": "quack",
    "model": "animals/duck"
  },
  {
    "id": "goat",
    "name": "Goat",
    "m": "M1b",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "goat_yard"
    ],
    "unlock": 22,
    "shop": true,
    "baby": 2400,
    "adult": 3800,
    "growthBp": 1000,
    "babyMs": 14400000,
    "bottle": "baby_bottle",
    "feed": "livestock_feed",
    "feedQty": 2,
    "cycleMs": 10800000,
    "product": "goat_milk",
    "out": 1,
    "xp": 31,
    "prizedAt": 25,
    "premium": "aged_goat_cheese",
    "premiumBp": 1000,
    "mastery": [
      14,
      70,
      200,
      680
    ],
    "sound": "bleat",
    "model": "animals/goat"
  },
  {
    "id": "horse",
    "name": "Horse",
    "m": "M1b",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "stable"
    ],
    "unlock": 25,
    "shop": true,
    "baby": 3400,
    "adult": 5400,
    "growthBp": 1000,
    "babyMs": 28800000,
    "bottle": "baby_bottle",
    "feed": "livestock_feed",
    "feedQty": 2,
    "cycleMs": 21600000,
    "product": "manure",
    "out": 2,
    "xp": 44,
    "prizedAt": 20,
    "premium": "show_ribbon",
    "premiumBp": 1000,
    "mastery": [
      11,
      55,
      160,
      530
    ],
    "sound": "neigh",
    "model": "animals/horse"
  },
  {
    "id": "alpaca",
    "name": "Alpaca",
    "m": "M2",
    "kind": "animal",
    "layer": "none",
    "homes": [
      "paddock"
    ],
    "unlock": 33,
    "shop": true,
    "baby": 3100,
    "adult": 5000,
    "growthBp": 1000,
    "babyMs": 21600000,
    "bottle": "baby_bottle",
    "feed": "livestock_feed",
    "feedQty": 2,
    "cycleMs": 18000000,
    "product": "alpaca_fiber",
    "out": 1,
    "xp": 40,
    "prizedAt": 25,
    "premium": "royal_fiber",
    "premiumBp": 1000,
    "mastery": [
      11,
      55,
      170,
      570
    ],
    "sound": "hum",
    "model": "animals/alpaca"
  }
] as const;
export const HOLLOW_FEEDS = [
  {
    "id": "chicken_feed",
    "name": "Chicken Feed",
    "m": "M1a",
    "building": "feed_mill",
    "unlock": 1,
    "ms": 300000,
    "out": 6,
    "classes": [
      {
        "cls": "grain",
        "qty": 3
      }
    ],
    "sell": 2,
    "xp": 1,
    "storePrice": 5
  },
  {
    "id": "livestock_feed",
    "name": "Livestock Feed",
    "m": "M1a",
    "building": "feed_mill",
    "unlock": 7,
    "ms": 600000,
    "out": 6,
    "classes": [
      {
        "cls": "grain",
        "qty": 2
      },
      {
        "cls": "root",
        "qty": 1
      }
    ],
    "sell": 3,
    "xp": 1,
    "storePrice": 8
  },
  {
    "id": "rabbit_greens",
    "name": "Rabbit Greens",
    "m": "M1b",
    "building": "feed_mill",
    "unlock": 14,
    "ms": 600000,
    "out": 6,
    "classes": [
      {
        "cls": "root",
        "qty": 2
      },
      {
        "cls": "veg",
        "qty": 1
      }
    ],
    "sell": 4,
    "xp": 2,
    "storePrice": 10
  },
  {
    "id": "pig_slop",
    "name": "Pig Slop",
    "m": "M1b",
    "building": "feed_mill",
    "unlock": 17,
    "ms": 600000,
    "out": 6,
    "classes": [
      {
        "cls": "produce",
        "qty": 2
      }
    ],
    "sell": 3,
    "xp": 2,
    "storePrice": 8
  },
  {
    "id": "prairie_hay",
    "name": "Prairie Hay",
    "m": "M1b",
    "building": "feed_mill",
    "unlock": 17,
    "ms": 600000,
    "out": 6,
    "classes": [
      {
        "cls": "grain",
        "qty": 3
      },
      {
        "cls": "veg",
        "qty": 1
      }
    ],
    "sell": 4,
    "xp": 2,
    "storePrice": 10
  }
] as const;
export const HOLLOW_TOOLS = [
  {
    "id": "hand",
    "name": "Hand",
    "m": "M1a",
    "unlock": 1,
    "cost": 0,
    "brush": [
      1,
      1
    ],
    "key": 1,
    "acts": [
      "harvest",
      "plant",
      "water",
      "tend",
      "collect",
      "shake",
      "clear",
      "pet",
      "uproot"
    ],
    "text": "Does the obvious thing: harvest, plant your chosen seed, water, tend, collect, clear weeds, pet. Shift uproots."
  },
  {
    "id": "seed_bag",
    "name": "Seed Bag",
    "m": "M1a",
    "unlock": 1,
    "cost": 0,
    "brush": [
      1,
      1
    ],
    "key": 2,
    "acts": [
      "plant"
    ],
    "text": "Plant the chosen crop; drag to paint a field."
  },
  {
    "id": "sickle",
    "name": "Sickle",
    "m": "M1a",
    "unlock": 1,
    "cost": 0,
    "brush": [
      1,
      1
    ],
    "key": 3,
    "acts": [
      "harvest"
    ],
    "text": "Harvest ripe crops; drag across a field."
  },
  {
    "id": "watering_can",
    "name": "Watering Can",
    "m": "M1a",
    "unlock": 4,
    "cost": 0,
    "brush": [
      1,
      1
    ],
    "key": 4,
    "acts": [
      "water"
    ],
    "text": "Water crops of 30 minutes or more and trees: they grow faster. Free, forever."
  },
  {
    "id": "feed_scoop",
    "name": "Feed Scoop",
    "m": "M1a",
    "unlock": 1,
    "cost": 0,
    "brush": [
      1,
      1
    ],
    "key": 5,
    "acts": [
      "tend"
    ],
    "text": "Collect and re-feed animals in one stroke."
  },
  {
    "id": "basket",
    "name": "Basket",
    "m": "M1a",
    "unlock": 4,
    "cost": 0,
    "brush": [
      1,
      1
    ],
    "key": 6,
    "acts": [
      "shake",
      "collect"
    ],
    "text": "Harvest trees and collect finished goods from buildings."
  },
  {
    "id": "compost_scoop",
    "name": "Compost Scoop",
    "m": "M1a",
    "unlock": 8,
    "cost": 0,
    "brush": [
      1,
      1
    ],
    "key": 7,
    "acts": [
      "fertilize"
    ],
    "text": "Spread Compost: +1 unit and a chance of a blue-ribbon harvest."
  },
  {
    "id": "axe",
    "name": "Axe",
    "m": "M1a",
    "unlock": 1,
    "cost": 0,
    "brush": [
      1,
      1
    ],
    "key": 8,
    "acts": [
      "chop"
    ],
    "text": "Chop stumps, logs, boulders and Pine."
  },
  {
    "id": "hammer",
    "name": "Hammer",
    "m": "M1a",
    "unlock": 1,
    "cost": 0,
    "brush": [
      1,
      1
    ],
    "key": 9,
    "acts": [
      "place",
      "move",
      "rotate",
      "store"
    ],
    "text": "Build mode: place, move (timers keep running), rotate, store."
  },
  {
    "id": "big_watering_can",
    "name": "Big Watering Can",
    "m": "M1a",
    "unlock": 10,
    "cost": 4000,
    "brush": [
      3,
      3
    ],
    "upgrades": "watering_can",
    "acts": [
      "water"
    ],
    "text": "Waters a 3x3 patch per step."
  },
  {
    "id": "wide_sickle",
    "name": "Wide Sickle",
    "m": "M1a",
    "unlock": 12,
    "cost": 6000,
    "brush": [
      2,
      2
    ],
    "upgrades": "sickle",
    "acts": [
      "harvest"
    ],
    "text": "Harvests a 2x2 patch per step."
  },
  {
    "id": "seed_spreader",
    "name": "Seed Spreader",
    "m": "M1b",
    "unlock": 14,
    "cost": 9000,
    "brush": [
      2,
      2
    ],
    "upgrades": "seed_bag",
    "acts": [
      "plant"
    ],
    "text": "Plants a 2x2 patch per step."
  },
  {
    "id": "grand_sickle",
    "name": "Grand Sickle",
    "m": "M2",
    "unlock": 26,
    "cost": 20000,
    "brush": [
      3,
      3
    ],
    "upgrades": "sickle",
    "acts": [
      "harvest"
    ],
    "text": "Harvests a 3x3 patch per step."
  }
] as const;
export const HOLLOW_BUILDINGS = [
  {
    "id": "feed_mill",
    "name": "Feed Mill",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 1,
    "shop": true,
    "cost": 0,
    "slots": [
      3,
      6
    ],
    "slotCosts": [
      550,
      880,
      1400
    ],
    "secondCopy": {
      "at": 31,
      "cost": 120000
    },
    "model": "buildings/feed_mill"
  },
  {
    "id": "mill",
    "name": "Windmill",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 3,
    "shop": true,
    "cost": 0,
    "slots": [
      2,
      6
    ],
    "slotCosts": [
      830,
      1300,
      2100,
      3400
    ],
    "secondCopy": {
      "at": 16,
      "cost": 38000
    },
    "model": "buildings/mill"
  },
  {
    "id": "bakery",
    "name": "Bakery",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 4,
    "shop": true,
    "cost": 2600,
    "slots": [
      2,
      6
    ],
    "slotCosts": [
      1300,
      2100,
      3300,
      5300
    ],
    "secondCopy": null,
    "model": "buildings/bakery"
  },
  {
    "id": "sawmill",
    "name": "Sawmill",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 6,
    "shop": true,
    "cost": 6000,
    "slots": [
      2,
      5
    ],
    "slotCosts": [
      3000,
      4800,
      7700
    ],
    "secondCopy": null,
    "model": "buildings/sawmill"
  },
  {
    "id": "dairy",
    "name": "Dairy",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 7,
    "shop": true,
    "cost": 9000,
    "slots": [
      2,
      6
    ],
    "slotCosts": [
      3800,
      6000,
      9600,
      15000
    ],
    "secondCopy": {
      "at": 18,
      "cost": 18000
    },
    "model": "buildings/dairy"
  },
  {
    "id": "compost_bin",
    "name": "Compost Bin",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 8,
    "shop": true,
    "cost": 4800,
    "slots": [
      1,
      3
    ],
    "slotCosts": [
      4000,
      6400
    ],
    "secondCopy": null,
    "model": "buildings/compost_bin",
    "collector": {
      "item": "compost",
      "every": 20,
      "out": 3,
      "maxBatches": 3
    }
  },
  {
    "id": "kitchen",
    "name": "Farm Kitchen",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 9,
    "shop": true,
    "cost": 14000,
    "slots": [
      2,
      6
    ],
    "slotCosts": [
      6000,
      9600,
      15000,
      25000
    ],
    "secondCopy": null,
    "model": "buildings/kitchen"
  },
  {
    "id": "preserves",
    "name": "Preserves Kitchen",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 11,
    "shop": true,
    "cost": 19000,
    "slots": [
      2,
      6
    ],
    "slotCosts": [
      8000,
      13000,
      20000,
      33000
    ],
    "secondCopy": null,
    "model": "buildings/preserves"
  },
  {
    "id": "weaver",
    "name": "Weaver's Shed",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 12,
    "shop": true,
    "cost": 24000,
    "slots": [
      2,
      5
    ],
    "slotCosts": [
      10000,
      16000,
      26000
    ],
    "secondCopy": null,
    "model": "buildings/weaver"
  },
  {
    "id": "sewing",
    "name": "Sewing Table",
    "m": "M1b",
    "kind": "building",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 14,
    "shop": true,
    "cost": 34000,
    "slots": [
      2,
      5
    ],
    "slotCosts": [
      14000,
      23000,
      36000
    ],
    "secondCopy": null,
    "model": "buildings/sewing"
  },
  {
    "id": "pie_oven",
    "name": "Pie Oven",
    "m": "M1b",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      2
    ],
    "unlock": 15,
    "shop": true,
    "cost": 49000,
    "slots": [
      2,
      6
    ],
    "slotCosts": [
      18000,
      28000,
      45000,
      72000
    ],
    "secondCopy": {
      "at": 33,
      "cost": 98000
    },
    "model": "buildings/pie_oven"
  },
  {
    "id": "juice_press",
    "name": "Juice Press",
    "m": "M1a",
    "kind": "building",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 6,
    "shop": true,
    "cost": 7200,
    "slots": [
      2,
      6
    ],
    "slotCosts": [
      3000,
      4800,
      7700,
      12000
    ],
    "secondCopy": null,
    "model": "buildings/juice_press"
  },
  {
    "id": "chandlery",
    "name": "Chandlery",
    "m": "M1b",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 16,
    "shop": true,
    "cost": 53000,
    "slots": [
      2,
      5
    ],
    "slotCosts": [
      19000,
      30000,
      49000
    ],
    "secondCopy": null,
    "model": "buildings/chandlery"
  },
  {
    "id": "spice_mill",
    "name": "Spice Mill",
    "m": "M1b",
    "kind": "building",
    "layer": "object",
    "size": [
      2,
      2
    ],
    "unlock": 16,
    "shop": true,
    "cost": 46000,
    "slots": [
      2,
      5
    ],
    "slotCosts": [
      19000,
      30000,
      49000
    ],
    "secondCopy": null,
    "model": "buildings/spice_mill"
  },
  {
    "id": "packing",
    "name": "Packing Table",
    "m": "M1b",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      2
    ],
    "unlock": 20,
    "shop": true,
    "cost": 96000,
    "slots": [
      2,
      4
    ],
    "slotCosts": [
      30000,
      48000
    ],
    "secondCopy": null,
    "model": "buildings/packing"
  },
  {
    "id": "oil_press",
    "name": "Oil Press",
    "m": "M2",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 30,
    "shop": true,
    "cost": 180000,
    "slots": [
      2,
      5
    ],
    "slotCosts": [
      55000,
      88000,
      140000
    ],
    "secondCopy": null,
    "model": "buildings/oil_press"
  },
  {
    "id": "sugar_shack",
    "name": "Sugar Shack",
    "m": "M2",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 34,
    "shop": true,
    "cost": 210000,
    "slots": [
      2,
      4
    ],
    "slotCosts": [
      65000,
      100000
    ],
    "secondCopy": null,
    "model": "buildings/sugar_shack"
  },
  {
    "id": "chocolatier",
    "name": "Chocolatier",
    "m": "M2",
    "kind": "building",
    "layer": "object",
    "size": [
      3,
      3
    ],
    "unlock": 36,
    "shop": true,
    "cost": 250000,
    "slots": [
      2,
      5
    ],
    "slotCosts": [
      70000,
      110000,
      180000
    ],
    "secondCopy": null,
    "model": "buildings/chocolatier"
  }
] as const;
export const HOLLOW_RECIPES = [
  {
    "id": "flour",
    "name": "Flour",
    "m": "M1a",
    "building": "mill",
    "unlock": 3,
    "ms": 300000,
    "out": 1,
    "inputs": {
      "wheat": 3
    },
    "tier": "T2",
    "duet": false,
    "sell": 51,
    "xp": 6,
    "mastery": [
      50,
      240,
      720,
      2400
    ]
  },
  {
    "id": "cornmeal",
    "name": "Cornmeal",
    "m": "M1a",
    "building": "mill",
    "unlock": 3,
    "ms": 600000,
    "out": 1,
    "inputs": {
      "corn": 2
    },
    "tier": "T2",
    "duet": false,
    "sell": 108,
    "xp": 10,
    "mastery": [
      35,
      190,
      560,
      1900
    ]
  },
  {
    "id": "sugar",
    "name": "Sugar",
    "m": "M1a",
    "building": "mill",
    "unlock": 8,
    "ms": 1200000,
    "out": 1,
    "inputs": {
      "sugarcane": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 254,
    "xp": 18,
    "mastery": [
      30,
      150,
      440,
      1500
    ]
  },
  {
    "id": "oat_flakes",
    "name": "Oat Flakes",
    "m": "M1b",
    "building": "mill",
    "unlock": 13,
    "ms": 600000,
    "out": 1,
    "inputs": {
      "oats": 2
    },
    "tier": "T2",
    "duet": false,
    "sell": 157,
    "xp": 11,
    "mastery": [
      35,
      190,
      560,
      1900
    ]
  },
  {
    "id": "bread",
    "name": "Bread",
    "m": "M1a",
    "building": "bakery",
    "unlock": 4,
    "ms": 300000,
    "out": 1,
    "inputs": {
      "flour": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 96,
    "xp": 6,
    "mastery": [
      50,
      240,
      720,
      2400
    ]
  },
  {
    "id": "corn_bread",
    "name": "Corn Bread",
    "m": "M1a",
    "building": "bakery",
    "unlock": 4,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "cornmeal": 1,
      "egg": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 381,
    "xp": 24,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "carrot_muffin",
    "name": "Carrot Muffin",
    "m": "M1a",
    "building": "bakery",
    "unlock": 4,
    "ms": 1200000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "carrot": 2,
      "egg": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 279,
    "xp": 17,
    "mastery": [
      30,
      150,
      440,
      1500
    ]
  },
  {
    "id": "pancakes",
    "name": "Pancakes",
    "m": "M1a",
    "building": "bakery",
    "unlock": 8,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "egg": 2,
      "milk": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 558,
    "xp": 25,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "cookies",
    "name": "Cookies",
    "m": "M1a",
    "building": "bakery",
    "unlock": 10,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "egg": 1,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 673,
    "xp": 36,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "blueberry_muffin",
    "name": "Blueberry Muffin",
    "m": "M1b",
    "building": "bakery",
    "unlock": 14,
    "ms": 2400000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "egg": 1,
      "blueberry": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 747,
    "xp": 34,
    "mastery": [
      25,
      120,
      350,
      1200
    ]
  },
  {
    "id": "granola_bar",
    "name": "Granola Bar",
    "m": "M1b",
    "building": "bakery",
    "unlock": 15,
    "ms": 2400000,
    "out": 1,
    "inputs": {
      "oat_flakes": 1,
      "honey": 1,
      "strawberry": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 867,
    "xp": 35,
    "mastery": [
      25,
      120,
      350,
      1200
    ]
  },
  {
    "id": "olive_bread",
    "name": "Olive Bread",
    "m": "M2",
    "building": "bakery",
    "unlock": 30,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "olive": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 921,
    "xp": 33,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "planks",
    "name": "Planks",
    "m": "M1a",
    "building": "sawmill",
    "unlock": 6,
    "ms": 600000,
    "out": 2,
    "inputs": {
      "wood": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 112,
    "xp": 10,
    "mastery": [
      35,
      190,
      560,
      1900
    ]
  },
  {
    "id": "wooden_crate",
    "name": "Wooden Crate",
    "m": "M1a",
    "building": "sawmill",
    "unlock": 6,
    "ms": 1200000,
    "out": 1,
    "inputs": {
      "planks": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 366,
    "xp": 18,
    "mastery": [
      30,
      150,
      440,
      1500
    ]
  },
  {
    "id": "bird_house",
    "name": "Bird House",
    "m": "M1a",
    "building": "sawmill",
    "unlock": 9,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "planks": 3
    },
    "tier": "T3",
    "duet": false,
    "sell": 692,
    "xp": 45,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "cream",
    "name": "Cream",
    "m": "M1a",
    "building": "dairy",
    "unlock": 7,
    "ms": 1200000,
    "out": 1,
    "inputs": {
      "milk": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 286,
    "xp": 18,
    "mastery": [
      30,
      150,
      440,
      1500
    ]
  },
  {
    "id": "butter",
    "name": "Butter",
    "m": "M1a",
    "building": "dairy",
    "unlock": 7,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "cream": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 485,
    "xp": 25,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "baby_bottle",
    "name": "Baby Bottle",
    "m": "M1a",
    "building": "dairy",
    "unlock": 7,
    "ms": 600000,
    "out": 2,
    "inputs": {
      "milk": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 112,
    "xp": 10,
    "mastery": [
      35,
      190,
      560,
      1900
    ]
  },
  {
    "id": "cheese",
    "name": "Cheese",
    "m": "M1a",
    "building": "dairy",
    "unlock": 10,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "milk": 3
    },
    "tier": "T3",
    "duet": false,
    "sell": 786,
    "xp": 45,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "yogurt",
    "name": "Strawberry Yogurt",
    "m": "M1a",
    "building": "dairy",
    "unlock": 7,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "milk": 1,
      "strawberry": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 507,
    "xp": 34,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "ice_cream",
    "name": "Ice Cream",
    "m": "M1b",
    "building": "dairy",
    "unlock": 18,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "cream": 1,
      "sugar": 1,
      "blueberry": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1108,
    "xp": 50,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "goat_cheese",
    "name": "Goat Cheese",
    "m": "M1b",
    "building": "dairy",
    "unlock": 22,
    "ms": 5400000,
    "out": 1,
    "inputs": {
      "goat_milk": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 1071,
    "xp": 72,
    "mastery": [
      17,
      85,
      260,
      870
    ]
  },
  {
    "id": "compost",
    "name": "Compost",
    "m": "M1b",
    "building": "compost_bin",
    "unlock": 25,
    "ms": 7200000,
    "out": 3,
    "inputs": {
      "manure": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 309,
    "xp": 94,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "omelette",
    "name": "Omelette",
    "m": "M1a",
    "building": "kitchen",
    "unlock": 9,
    "ms": 1200000,
    "out": 1,
    "inputs": {
      "egg": 2,
      "milk": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 454,
    "xp": 19,
    "mastery": [
      30,
      150,
      440,
      1500
    ]
  },
  {
    "id": "veggie_soup",
    "name": "Veggie Soup",
    "m": "M1a",
    "building": "kitchen",
    "unlock": 9,
    "ms": 2400000,
    "out": 1,
    "inputs": {
      "carrot": 2,
      "potato": 1,
      "tomato": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 483,
    "xp": 32,
    "mastery": [
      25,
      120,
      350,
      1200
    ]
  },
  {
    "id": "pumpkin_soup",
    "name": "Pumpkin Soup",
    "m": "M1a",
    "building": "kitchen",
    "unlock": 9,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "pumpkin": 2,
      "cream": 1,
      "carrot": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1462,
    "xp": 35,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "popcorn",
    "name": "Popcorn",
    "m": "M1a",
    "building": "kitchen",
    "unlock": 10,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "corn": 2,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 722,
    "xp": 26,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "dog_biscuit",
    "name": "Dog Biscuit",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 10,
    "ms": 900000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "egg": 1,
      "milk": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 394,
    "xp": 15,
    "mastery": [
      30,
      160,
      490,
      1600
    ]
  },
  {
    "id": "cat_treat",
    "name": "Cat Treat",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 10,
    "ms": 900000,
    "out": 1,
    "inputs": {
      "cream": 1,
      "egg": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 487,
    "xp": 15,
    "mastery": [
      30,
      160,
      490,
      1600
    ]
  },
  {
    "id": "roasted_seeds",
    "name": "Roasted Sunflower Seeds",
    "m": "M1a",
    "building": "kitchen",
    "unlock": 11,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "sunflower": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 880,
    "xp": 26,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "coleslaw",
    "name": "Coleslaw",
    "m": "M1a",
    "building": "kitchen",
    "unlock": 12,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "cabbage": 2,
      "carrot": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 1484,
    "xp": 27,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "potato_gratin",
    "name": "Potato Gratin",
    "m": "M1a",
    "building": "kitchen",
    "unlock": 12,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "potato": 2,
      "cheese": 1,
      "cream": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1784,
    "xp": 46,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "truffle_pasta",
    "name": "Truffle Pasta",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 17,
    "ms": 5400000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "egg": 1,
      "truffle": 1,
      "butter": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 1444,
    "xp": 68,
    "mastery": [
      17,
      85,
      260,
      870
    ]
  },
  {
    "id": "french_onion_soup",
    "name": "French Onion Soup",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 24,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "onion": 2,
      "cheese": 1,
      "bread": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1589,
    "xp": 53,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "watermelon_salad",
    "name": "Watermelon Salad",
    "m": "M2",
    "building": "kitchen",
    "unlock": 27,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "watermelon": 2,
      "goat_cheese": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2680,
    "xp": 44,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "stuffed_peppers",
    "name": "Stuffed Peppers",
    "m": "M2",
    "building": "kitchen",
    "unlock": 31,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "pepper": 2,
      "tomato": 1,
      "cheese": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1811,
    "xp": 58,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "risotto",
    "name": "Truffle Risotto",
    "m": "M2",
    "building": "kitchen",
    "unlock": 35,
    "ms": 5400000,
    "out": 1,
    "inputs": {
      "rice": 2,
      "truffle": 1,
      "butter": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 2096,
    "xp": 83,
    "mastery": [
      17,
      85,
      260,
      870
    ]
  },
  {
    "id": "custard",
    "name": "Custard",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 19,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "duck_egg": 2,
      "milk": 1,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1062,
    "xp": 40,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "rice_pudding",
    "name": "Rice Pudding",
    "m": "M2",
    "building": "kitchen",
    "unlock": 35,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "rice": 2,
      "milk": 1,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1443,
    "xp": 48,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "wedding_cake",
    "name": "Wedding Cake",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 25,
    "ms": 7200000,
    "out": 1,
    "inputs": {
      "flour": 3,
      "egg": 4,
      "butter": 2,
      "sugar": 2,
      "cream": 1
    },
    "tier": "duet",
    "duet": true,
    "sell": 2997,
    "xp": 94,
    "duetXp": 118,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "strawberry_jam",
    "name": "Strawberry Jam",
    "m": "M1a",
    "building": "preserves",
    "unlock": 11,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "strawberry": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 889,
    "xp": 46,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "ketchup",
    "name": "Ketchup",
    "m": "M1a",
    "building": "preserves",
    "unlock": 11,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "tomato": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 685,
    "xp": 36,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "cherry_jam",
    "name": "Cherry Jam",
    "m": "M1a",
    "building": "preserves",
    "unlock": 11,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "cherry": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1261,
    "xp": 46,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "sauerkraut",
    "name": "Sauerkraut",
    "m": "M1a",
    "building": "preserves",
    "unlock": 12,
    "ms": 14400000,
    "out": 1,
    "inputs": {
      "cabbage": 2,
      "carrot": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2389,
    "xp": 140,
    "mastery": [
      12,
      60,
      180,
      620
    ]
  },
  {
    "id": "orange_marmalade",
    "name": "Orange Marmalade",
    "m": "M1b",
    "building": "preserves",
    "unlock": 13,
    "ms": 4500000,
    "out": 1,
    "inputs": {
      "orange": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1326,
    "xp": 56,
    "mastery": [
      18,
      90,
      280,
      920
    ]
  },
  {
    "id": "blueberry_jam",
    "name": "Blueberry Jam",
    "m": "M1b",
    "building": "preserves",
    "unlock": 14,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "blueberry": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1143,
    "xp": 47,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "peach_jam",
    "name": "Peach Jam",
    "m": "M1b",
    "building": "preserves",
    "unlock": 17,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "peach": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1281,
    "xp": 49,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "plum_jam",
    "name": "Plum Jam",
    "m": "M1b",
    "building": "preserves",
    "unlock": 23,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "plum": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1471,
    "xp": 53,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "fig_jam",
    "name": "Fig Jam",
    "m": "M2",
    "building": "preserves",
    "unlock": 39,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "fig": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1805,
    "xp": 62,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "pickled_peppers",
    "name": "Pickled Peppers",
    "m": "M2",
    "building": "preserves",
    "unlock": 31,
    "ms": 7200000,
    "out": 1,
    "inputs": {
      "pepper": 3,
      "onion": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1718,
    "xp": 100,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "yarn",
    "name": "Yarn",
    "m": "M1a",
    "building": "weaver",
    "unlock": 12,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "wool": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 497,
    "xp": 27,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "cotton_cloth",
    "name": "Cotton Cloth",
    "m": "M1b",
    "building": "weaver",
    "unlock": 16,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "cotton": 2
    },
    "tier": "T2",
    "duet": false,
    "sell": 1205,
    "xp": 39,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "lavender_dye",
    "name": "Lavender Dye",
    "m": "M1b",
    "building": "weaver",
    "unlock": 18,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "lavender": 2
    },
    "tier": "T2",
    "duet": false,
    "sell": 675,
    "xp": 29,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "alpaca_yarn",
    "name": "Alpaca Yarn",
    "m": "M2",
    "building": "weaver",
    "unlock": 33,
    "ms": 2400000,
    "out": 1,
    "inputs": {
      "alpaca_fiber": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 658,
    "xp": 43,
    "mastery": [
      25,
      120,
      350,
      1200
    ]
  },
  {
    "id": "scarf",
    "name": "Wool Scarf",
    "m": "M1b",
    "building": "sewing",
    "unlock": 14,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "yarn": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 1373,
    "xp": 47,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "cotton_tote",
    "name": "Cotton Tote",
    "m": "M1b",
    "building": "sewing",
    "unlock": 16,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "cotton_cloth": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 2799,
    "xp": 49,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "picnic_blanket",
    "name": "Picnic Blanket",
    "m": "M1b",
    "building": "sewing",
    "unlock": 17,
    "ms": 9000000,
    "out": 1,
    "inputs": {
      "cotton_cloth": 2,
      "yarn": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 3726,
    "xp": 102,
    "mastery": [
      15,
      75,
      220,
      730
    ]
  },
  {
    "id": "sweater",
    "name": "Sweater",
    "m": "M1b",
    "building": "sewing",
    "unlock": 18,
    "ms": 7200000,
    "out": 1,
    "inputs": {
      "yarn": 2,
      "lavender_dye": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2363,
    "xp": 87,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "wool_pillow",
    "name": "Wool Pillow",
    "m": "M1b",
    "building": "sewing",
    "unlock": 16,
    "ms": 5400000,
    "out": 1,
    "inputs": {
      "wool": 2,
      "cotton_cloth": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2313,
    "xp": 67,
    "mastery": [
      17,
      85,
      260,
      870
    ]
  },
  {
    "id": "quilt",
    "name": "Quilt",
    "m": "M1b",
    "building": "sewing",
    "unlock": 20,
    "ms": 14400000,
    "out": 1,
    "inputs": {
      "cotton_cloth": 3,
      "yarn": 2,
      "lavender_dye": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 6521,
    "xp": 155,
    "mastery": [
      12,
      60,
      180,
      620
    ]
  },
  {
    "id": "alpaca_plush",
    "name": "Alpaca Plush",
    "m": "M2",
    "building": "sewing",
    "unlock": 33,
    "ms": 5400000,
    "out": 1,
    "inputs": {
      "alpaca_fiber": 2,
      "cotton_cloth": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2491,
    "xp": 81,
    "mastery": [
      17,
      85,
      260,
      870
    ]
  },
  {
    "id": "alpaca_shawl",
    "name": "Alpaca Shawl",
    "m": "M2",
    "building": "sewing",
    "unlock": 33,
    "ms": 10800000,
    "out": 1,
    "inputs": {
      "alpaca_yarn": 2,
      "lavender_dye": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 3123,
    "xp": 142,
    "mastery": [
      14,
      70,
      200,
      680
    ]
  },
  {
    "id": "apple_pie",
    "name": "Apple Pie",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 15,
    "ms": 7200000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "apple": 3,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1691,
    "xp": 84,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "pumpkin_pie",
    "name": "Pumpkin Pie",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 15,
    "ms": 9000000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "pumpkin": 2,
      "cream": 1,
      "egg": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2109,
    "xp": 100,
    "mastery": [
      15,
      75,
      220,
      730
    ]
  },
  {
    "id": "cherry_pie",
    "name": "Cherry Pie",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 15,
    "ms": 7200000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "cherry": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1616,
    "xp": 84,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "lemon_cake",
    "name": "Lemon Cake",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 15,
    "ms": 10800000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "lemon": 2,
      "butter": 1,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2143,
    "xp": 116,
    "mastery": [
      14,
      70,
      200,
      680
    ]
  },
  {
    "id": "blueberry_pie",
    "name": "Blueberry Pie",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 16,
    "ms": 7200000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "blueberry": 3,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1723,
    "xp": 85,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "peach_cobbler",
    "name": "Peach Cobbler",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 17,
    "ms": 7200000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "peach": 3,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1854,
    "xp": 86,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "pear_tart",
    "name": "Pear Tart",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 19,
    "ms": 7200000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "pear": 2,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1734,
    "xp": 88,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "lemon_meringue_pie",
    "name": "Lemon Meringue Pie",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 19,
    "ms": 9000000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "lemon": 2,
      "duck_egg": 2,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1918,
    "xp": 105,
    "mastery": [
      15,
      75,
      220,
      730
    ]
  },
  {
    "id": "plum_cake",
    "name": "Plum Cake",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 23,
    "ms": 9000000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "plum": 3,
      "egg": 1,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2061,
    "xp": 110,
    "mastery": [
      15,
      75,
      220,
      730
    ]
  },
  {
    "id": "walnut_honey_cake",
    "name": "Walnut Honey Cake",
    "m": "M2",
    "building": "pie_oven",
    "unlock": 26,
    "ms": 14400000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "walnut": 2,
      "honey": 1,
      "egg": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2380,
    "xp": 165,
    "mastery": [
      12,
      60,
      180,
      620
    ]
  },
  {
    "id": "fig_tart",
    "name": "Fig & Goat Cheese Tart",
    "m": "M2",
    "building": "pie_oven",
    "unlock": 39,
    "ms": 9000000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "fig": 3,
      "goat_cheese": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 3212,
    "xp": 130,
    "mastery": [
      15,
      75,
      220,
      730
    ]
  },
  {
    "id": "apple_juice",
    "name": "Apple Juice",
    "m": "M1a",
    "building": "juice_press",
    "unlock": 6,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "apple": 3
    },
    "tier": "T3",
    "duet": false,
    "sell": 682,
    "xp": 25,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "orange_juice",
    "name": "Orange Juice",
    "m": "M1b",
    "building": "juice_press",
    "unlock": 13,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "orange": 3
    },
    "tier": "T3",
    "duet": false,
    "sell": 839,
    "xp": 27,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "lemonade",
    "name": "Lemonade",
    "m": "M1b",
    "building": "juice_press",
    "unlock": 15,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "lemon": 2,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 903,
    "xp": 28,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "carrot_juice",
    "name": "Carrot Juice",
    "m": "M1a",
    "building": "juice_press",
    "unlock": 6,
    "ms": 1200000,
    "out": 1,
    "inputs": {
      "carrot": 4
    },
    "tier": "T3",
    "duet": false,
    "sell": 158,
    "xp": 18,
    "mastery": [
      30,
      150,
      440,
      1500
    ]
  },
  {
    "id": "pear_nectar",
    "name": "Pear Nectar",
    "m": "M1b",
    "building": "juice_press",
    "unlock": 19,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "pear": 3
    },
    "tier": "T3",
    "duet": false,
    "sell": 976,
    "xp": 29,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "watermelon_juice",
    "name": "Watermelon Juice",
    "m": "M2",
    "building": "juice_press",
    "unlock": 27,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "watermelon": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 1511,
    "xp": 32,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "beeswax",
    "name": "Beeswax",
    "m": "M1b",
    "building": "chandlery",
    "unlock": 16,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "honey": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 565,
    "xp": 28,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "honey_candle",
    "name": "Honey Candle",
    "m": "M1b",
    "building": "chandlery",
    "unlock": 16,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "beeswax": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 1439,
    "xp": 39,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "lavender_candle",
    "name": "Lavender Candle",
    "m": "M1b",
    "building": "chandlery",
    "unlock": 18,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "beeswax": 1,
      "lavender": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1186,
    "xp": 50,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "lavender_soap",
    "name": "Lavender Soap",
    "m": "M1b",
    "building": "chandlery",
    "unlock": 22,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "lavender": 2,
      "goat_milk": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1110,
    "xp": 52,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "breakfast_hamper",
    "name": "Breakfast Hamper",
    "m": "M1b",
    "building": "packing",
    "unlock": 20,
    "ms": 5400000,
    "out": 1,
    "inputs": {
      "wooden_crate": 1,
      "pancakes": 1,
      "strawberry_jam": 1,
      "orange_juice": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 3216,
    "xp": 71,
    "mastery": [
      17,
      85,
      260,
      870
    ]
  },
  {
    "id": "picnic_basket",
    "name": "Picnic Basket",
    "m": "M1b",
    "building": "packing",
    "unlock": 23,
    "ms": 10800000,
    "out": 1,
    "inputs": {
      "wooden_crate": 1,
      "bread": 1,
      "cheese": 1,
      "lemonade": 1,
      "picnic_blanket": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 6894,
    "xp": 127,
    "mastery": [
      14,
      70,
      200,
      680
    ]
  },
  {
    "id": "spa_basket",
    "name": "Spa Basket",
    "m": "M2",
    "building": "packing",
    "unlock": 26,
    "ms": 10800000,
    "out": 1,
    "inputs": {
      "wooden_crate": 1,
      "lavender_soap": 1,
      "lavender_candle": 1,
      "cotton_tote": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 6512,
    "xp": 131,
    "mastery": [
      14,
      70,
      200,
      680
    ]
  },
  {
    "id": "cozy_winter_gift",
    "name": "Cozy Winter Gift",
    "m": "M2",
    "building": "packing",
    "unlock": 28,
    "ms": 10800000,
    "out": 1,
    "inputs": {
      "wooden_crate": 1,
      "sweater": 1,
      "honey_candle": 1,
      "cookies": 2
    },
    "tier": "T4",
    "duet": false,
    "sell": 6588,
    "xp": 134,
    "mastery": [
      14,
      70,
      200,
      680
    ]
  },
  {
    "id": "sunflower_oil",
    "name": "Sunflower Oil",
    "m": "M2",
    "building": "oil_press",
    "unlock": 30,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "sunflower": 3
    },
    "tier": "T2",
    "duet": false,
    "sell": 1461,
    "xp": 57,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "olive_oil",
    "name": "Olive Oil",
    "m": "M2",
    "building": "oil_press",
    "unlock": 30,
    "ms": 5400000,
    "out": 1,
    "inputs": {
      "olive": 4
    },
    "tier": "T2",
    "duet": false,
    "sell": 1846,
    "xp": 79,
    "mastery": [
      17,
      85,
      260,
      870
    ]
  },
  {
    "id": "truffle_oil",
    "name": "Truffle Oil",
    "m": "M2",
    "building": "oil_press",
    "unlock": 32,
    "ms": 10800000,
    "out": 1,
    "inputs": {
      "truffle": 1,
      "olive_oil": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 3248,
    "xp": 140,
    "mastery": [
      14,
      70,
      200,
      680
    ]
  },
  {
    "id": "maple_syrup",
    "name": "Maple Syrup",
    "m": "M2",
    "building": "sugar_shack",
    "unlock": 34,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "maple_sap": 2
    },
    "tier": "T2",
    "duet": false,
    "sell": 1059,
    "xp": 59,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "chocolate",
    "name": "Chocolate",
    "m": "M2",
    "building": "chocolatier",
    "unlock": 36,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "cocoa": 2,
      "sugar": 1,
      "milk": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 1616,
    "xp": 61,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "chocolate_truffles",
    "name": "Chocolate Truffles",
    "m": "M2",
    "building": "chocolatier",
    "unlock": 37,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "chocolate": 1,
      "cream": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2290,
    "xp": 49,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "fertilizer",
    "name": "Fertilizer",
    "m": "M1a",
    "building": "compost_bin",
    "unlock": 10,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "compost": 2,
      "egg": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 907,
    "xp": 26,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "raspberry_jam",
    "name": "Raspberry Jam",
    "m": "M1a",
    "building": "preserves",
    "unlock": 12,
    "ms": 4200000,
    "out": 1,
    "inputs": {
      "raspberry": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1128,
    "xp": 52,
    "mastery": [
      19,
      95,
      280,
      950
    ]
  },
  {
    "id": "raspberry_tart",
    "name": "Raspberry Tart",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 15,
    "ms": 6000000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "raspberry": 3,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1570,
    "xp": 72,
    "mastery": [
      17,
      85,
      250,
      840
    ]
  },
  {
    "id": "rose_jelly",
    "name": "Rose Petal Jelly",
    "m": "M1b",
    "building": "preserves",
    "unlock": 13,
    "ms": 5400000,
    "out": 1,
    "inputs": {
      "rose": 3,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1324,
    "xp": 65,
    "mastery": [
      17,
      85,
      260,
      870
    ]
  },
  {
    "id": "rose_candle",
    "name": "Rose Candle",
    "m": "M1b",
    "building": "chandlery",
    "unlock": 16,
    "ms": 3000000,
    "out": 1,
    "inputs": {
      "beeswax": 1,
      "rose": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 1269,
    "xp": 42,
    "mastery": [
      20,
      110,
      320,
      1100
    ]
  },
  {
    "id": "pomegranate_juice",
    "name": "Pomegranate Juice",
    "m": "M1b",
    "building": "juice_press",
    "unlock": 14,
    "ms": 2100000,
    "out": 1,
    "inputs": {
      "pomegranate": 3
    },
    "tier": "T3",
    "duet": false,
    "sell": 1122,
    "xp": 31,
    "mastery": [
      25,
      120,
      360,
      1200
    ]
  },
  {
    "id": "grenadine",
    "name": "Grenadine Syrup",
    "m": "M1b",
    "building": "preserves",
    "unlock": 14,
    "ms": 3000000,
    "out": 1,
    "inputs": {
      "pomegranate": 2,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1166,
    "xp": 41,
    "mastery": [
      20,
      110,
      320,
      1100
    ]
  },
  {
    "id": "farm_coffee",
    "name": "Farmhouse Coffee",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 16,
    "ms": 1500000,
    "out": 1,
    "inputs": {
      "coffee": 2,
      "milk": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 773,
    "xp": 24,
    "mastery": [
      25,
      140,
      410,
      1400
    ]
  },
  {
    "id": "coffee_cake",
    "name": "Coffee Cake",
    "m": "M1b",
    "building": "pie_oven",
    "unlock": 16,
    "ms": 9600000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "coffee": 2,
      "egg": 1,
      "sugar": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1677,
    "xp": 107,
    "mastery": [
      14,
      70,
      210,
      710
    ]
  },
  {
    "id": "angora_yarn",
    "name": "Angora Yarn",
    "m": "M1b",
    "building": "weaver",
    "unlock": 14,
    "ms": 2100000,
    "out": 1,
    "inputs": {
      "angora_wool": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 447,
    "xp": 31,
    "mastery": [
      25,
      120,
      360,
      1200
    ]
  },
  {
    "id": "angora_mittens",
    "name": "Angora Mittens",
    "m": "M1b",
    "building": "sewing",
    "unlock": 14,
    "ms": 4500000,
    "out": 1,
    "inputs": {
      "angora_yarn": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 1348,
    "xp": 57,
    "mastery": [
      18,
      90,
      280,
      920
    ]
  },
  {
    "id": "bunny_slippers",
    "name": "Bunny Slippers",
    "m": "M1b",
    "building": "sewing",
    "unlock": 16,
    "ms": 6000000,
    "out": 1,
    "inputs": {
      "angora_wool": 2,
      "cotton_cloth": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2192,
    "xp": 73,
    "mastery": [
      17,
      85,
      250,
      840
    ]
  },
  {
    "id": "ground_paprika",
    "name": "Ground Paprika",
    "m": "M1b",
    "building": "spice_mill",
    "unlock": 16,
    "ms": 900000,
    "out": 1,
    "inputs": {
      "paprika": 3
    },
    "tier": "T2",
    "duet": false,
    "sell": 848,
    "xp": 16,
    "mastery": [
      30,
      160,
      490,
      1600
    ]
  },
  {
    "id": "sharena_sol",
    "name": "Colourful Salt",
    "m": "M1b",
    "building": "spice_mill",
    "unlock": 17,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "savory": 2,
      "ground_paprika": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1218,
    "xp": 28,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "grill_spice",
    "name": "Grill Spice",
    "m": "M1b",
    "building": "spice_mill",
    "unlock": 19,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "cumin": 2,
      "chili": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1275,
    "xp": 40,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "ground_cinnamon",
    "name": "Ground Cinnamon",
    "m": "M1b",
    "building": "spice_mill",
    "unlock": 19,
    "ms": 1200000,
    "out": 1,
    "inputs": {
      "cinnamon": 2
    },
    "tier": "T2",
    "duet": false,
    "sell": 735,
    "xp": 21,
    "mastery": [
      30,
      150,
      440,
      1500
    ]
  },
  {
    "id": "lyutenitsa",
    "name": "Lyutenitsa",
    "m": "M1b",
    "building": "preserves",
    "unlock": 18,
    "ms": 6000000,
    "out": 1,
    "inputs": {
      "paprika": 3,
      "tomato": 2,
      "chili": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1577,
    "xp": 75,
    "mastery": [
      17,
      85,
      250,
      840
    ]
  },
  {
    "id": "salted_bread",
    "name": "Bread with Colourful Salt",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 17,
    "ms": 2100000,
    "out": 1,
    "inputs": {
      "bread": 1,
      "sharena_sol": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1570,
    "xp": 32,
    "mastery": [
      25,
      120,
      360,
      1200
    ]
  },
  {
    "id": "village_potatoes",
    "name": "Village Potatoes",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 19,
    "ms": 3000000,
    "out": 1,
    "inputs": {
      "potato": 2,
      "savory": 1,
      "cumin": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1158,
    "xp": 44,
    "mastery": [
      20,
      110,
      320,
      1100
    ]
  },
  {
    "id": "cinnamon_rolls",
    "name": "Cinnamon Rolls",
    "m": "M1b",
    "building": "bakery",
    "unlock": 19,
    "ms": 3300000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "ground_cinnamon": 1,
      "butter": 1,
      "egg": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1729,
    "xp": 47,
    "mastery": [
      20,
      100,
      310,
      1000
    ]
  },
  {
    "id": "spiced_cider",
    "name": "Spiced Apple Juice",
    "m": "M1b",
    "building": "juice_press",
    "unlock": 19,
    "ms": 2400000,
    "out": 1,
    "inputs": {
      "apple": 3,
      "cinnamon": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1061,
    "xp": 36,
    "mastery": [
      25,
      120,
      350,
      1200
    ]
  },
  {
    "id": "quail_canapes",
    "name": "Quail Egg Canapés",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 15,
    "ms": 1500000,
    "out": 1,
    "inputs": {
      "quail_egg": 3,
      "bread": 1,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 946,
    "xp": 24,
    "mastery": [
      25,
      140,
      410,
      1400
    ]
  },
  {
    "id": "mini_quiche",
    "name": "Mini Quiches",
    "m": "M1b",
    "building": "bakery",
    "unlock": 15,
    "ms": 5400000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "quail_egg": 4,
      "cheese": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1600,
    "xp": 66,
    "mastery": [
      17,
      85,
      260,
      870
    ]
  },
  {
    "id": "bison_yarn",
    "name": "Bison Yarn",
    "m": "M1b",
    "building": "weaver",
    "unlock": 17,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "bison_wool": 1
    },
    "tier": "T2",
    "duet": false,
    "sell": 514,
    "xp": 39,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "bison_blanket",
    "name": "Warm Bison Blanket",
    "m": "M1b",
    "building": "sewing",
    "unlock": 17,
    "ms": 12000000,
    "out": 1,
    "inputs": {
      "bison_yarn": 2,
      "cotton_cloth": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 3264,
    "xp": 129,
    "mastery": [
      13,
      65,
      200,
      660
    ]
  },
  {
    "id": "felt_slippers",
    "name": "Felt Slippers",
    "m": "M1b",
    "building": "sewing",
    "unlock": 17,
    "ms": 6600000,
    "out": 1,
    "inputs": {
      "bison_wool": 2
    },
    "tier": "T3",
    "duet": false,
    "sell": 1041,
    "xp": 80,
    "mastery": [
      16,
      80,
      240,
      810
    ]
  },
  {
    "id": "pizza",
    "name": "Pizza",
    "m": "M1b",
    "building": "bakery",
    "unlock": 20,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "tomato": 2,
      "cheese": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1339,
    "xp": 51,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "walnut_cookies",
    "name": "Walnut Cookies",
    "m": "M2",
    "building": "bakery",
    "unlock": 26,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "walnut": 1,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1174,
    "xp": 43,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "maple_pancakes",
    "name": "Maple Pancakes",
    "m": "M2",
    "building": "bakery",
    "unlock": 34,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "egg": 2,
      "maple_syrup": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1547,
    "xp": 34,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "sweetheart_cake",
    "name": "Sweetheart Cake",
    "m": "M1a",
    "building": "bakery",
    "unlock": 10,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "flour": 2,
      "egg": 2,
      "butter": 1,
      "strawberry": 2
    },
    "tier": "duet",
    "duet": true,
    "sell": 1291,
    "xp": 45,
    "duetXp": 56,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "toy_horse",
    "name": "Toy Horse",
    "m": "M1a",
    "building": "sawmill",
    "unlock": 12,
    "ms": 7200000,
    "out": 1,
    "inputs": {
      "planks": 2,
      "yarn": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 1365,
    "xp": 81,
    "mastery": [
      16,
      80,
      240,
      780
    ]
  },
  {
    "id": "harvest_feast",
    "name": "Harvest Feast",
    "m": "M1b",
    "building": "kitchen",
    "unlock": 15,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "veggie_soup": 1,
      "corn_bread": 1,
      "apple_pie": 1
    },
    "tier": "duet",
    "duet": true,
    "sell": 2939,
    "xp": 48,
    "duetXp": 60,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "potato_chips",
    "name": "Potato Chips",
    "m": "M2",
    "building": "kitchen",
    "unlock": 30,
    "ms": 2700000,
    "out": 1,
    "inputs": {
      "potato": 2,
      "sunflower_oil": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2165,
    "xp": 45,
    "mastery": [
      20,
      110,
      330,
      1100
    ]
  },
  {
    "id": "maple_fudge",
    "name": "Maple Walnut Fudge",
    "m": "M2",
    "building": "kitchen",
    "unlock": 34,
    "ms": 3600000,
    "out": 1,
    "inputs": {
      "maple_syrup": 1,
      "walnut": 1,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2310,
    "xp": 59,
    "mastery": [
      20,
      100,
      300,
      1000
    ]
  },
  {
    "id": "hot_cocoa",
    "name": "Hot Cocoa",
    "m": "M2",
    "building": "kitchen",
    "unlock": 36,
    "ms": 1800000,
    "out": 1,
    "inputs": {
      "chocolate": 1,
      "milk": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 2036,
    "xp": 35,
    "mastery": [
      25,
      130,
      380,
      1300
    ]
  },
  {
    "id": "chocolate_cake",
    "name": "Chocolate Cake",
    "m": "M2",
    "building": "pie_oven",
    "unlock": 36,
    "ms": 10800000,
    "out": 1,
    "inputs": {
      "flour": 1,
      "chocolate": 1,
      "egg": 2,
      "butter": 1
    },
    "tier": "T3",
    "duet": false,
    "sell": 3482,
    "xp": 146,
    "mastery": [
      14,
      70,
      200,
      680
    ]
  },
  {
    "id": "harvest_hamper",
    "name": "Harvest Festival Hamper",
    "m": "M2",
    "building": "packing",
    "unlock": 32,
    "ms": 16200000,
    "out": 1,
    "inputs": {
      "wooden_crate": 1,
      "pumpkin_pie": 1,
      "truffle_oil": 1,
      "lavender_candle": 1,
      "walnut_honey_cake": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 10838,
    "xp": 194,
    "mastery": [
      12,
      60,
      180,
      590
    ]
  },
  {
    "id": "gourmet_hamper",
    "name": "Gourmet Hamper",
    "m": "M2",
    "building": "packing",
    "unlock": 37,
    "ms": 14400000,
    "out": 1,
    "inputs": {
      "wooden_crate": 1,
      "chocolate_cake": 1,
      "goat_cheese": 1,
      "maple_fudge": 1,
      "olive_bread": 1
    },
    "tier": "T4",
    "duet": false,
    "sell": 9632,
    "xp": 185,
    "mastery": [
      12,
      60,
      180,
      620
    ]
  }
] as const;
export const HOLLOW_ITEMS = [
  {
    "id": "wheat",
    "name": "Wheat",
    "m": "M1a",
    "kind": "crop",
    "unlock": 1,
    "source": "wheat",
    "sell": 2,
    "classes": [
      "grain",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "carrot",
    "name": "Carrot",
    "m": "M1a",
    "kind": "crop",
    "unlock": 2,
    "source": "carrot",
    "sell": 4,
    "classes": [
      "root",
      "veg",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "corn",
    "name": "Corn",
    "m": "M1a",
    "kind": "crop",
    "unlock": 3,
    "source": "corn",
    "sell": 15,
    "classes": [
      "grain",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "strawberry",
    "name": "Strawberry",
    "m": "M1a",
    "kind": "crop",
    "unlock": 4,
    "source": "strawberry",
    "sell": 90,
    "classes": [
      "fruit",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "potato",
    "name": "Potato",
    "m": "M1a",
    "kind": "crop",
    "unlock": 5,
    "source": "potato",
    "sell": 171,
    "classes": [
      "root",
      "veg",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "tomato",
    "name": "Tomato",
    "m": "M1a",
    "kind": "crop",
    "unlock": 6,
    "source": "tomato",
    "sell": 47,
    "classes": [
      "veg",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "sugarcane",
    "name": "Sugarcane",
    "m": "M1a",
    "kind": "crop",
    "unlock": 8,
    "source": "sugarcane",
    "sell": 108,
    "classes": [
      "cane",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "pumpkin",
    "name": "Pumpkin",
    "m": "M1a",
    "kind": "crop",
    "unlock": 9,
    "source": "pumpkin",
    "sell": 445,
    "classes": [
      "veg",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "sunflower",
    "name": "Sunflower",
    "m": "M1a",
    "kind": "crop",
    "unlock": 11,
    "source": "sunflower",
    "sell": 335,
    "classes": [
      "grain",
      "flower",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "cabbage",
    "name": "Cabbage",
    "m": "M1a",
    "kind": "crop",
    "unlock": 12,
    "source": "cabbage",
    "sell": 632,
    "classes": [
      "veg",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "raspberry",
    "name": "Raspberry",
    "m": "M1a",
    "kind": "crop",
    "unlock": 12,
    "source": "raspberry",
    "sell": 152,
    "classes": [
      "fruit",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "oats",
    "name": "Oats",
    "m": "M1b",
    "kind": "crop",
    "unlock": 13,
    "source": "oats",
    "sell": 34,
    "classes": [
      "grain",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "rose",
    "name": "Roses",
    "m": "M1b",
    "kind": "crop",
    "unlock": 13,
    "source": "rose",
    "sell": 184,
    "classes": [
      "flower",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "blueberry",
    "name": "Blueberry",
    "m": "M1b",
    "kind": "crop",
    "unlock": 14,
    "source": "blueberry",
    "sell": 170,
    "classes": [
      "fruit",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "cotton",
    "name": "Cotton",
    "m": "M1b",
    "kind": "crop",
    "unlock": 16,
    "source": "cotton",
    "sell": 448,
    "classes": [
      "fibre",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "coffee",
    "name": "Coffee Beans",
    "m": "M1b",
    "kind": "crop",
    "unlock": 16,
    "source": "coffee",
    "sell": 219,
    "classes": [
      "bean",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "paprika",
    "name": "Paprika",
    "m": "M1b",
    "kind": "crop",
    "unlock": 16,
    "source": "paprika",
    "sell": 240,
    "classes": [
      "spice",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "savory",
    "name": "Savory",
    "m": "M1b",
    "kind": "crop",
    "unlock": 17,
    "source": "savory",
    "sell": 72,
    "classes": [
      "spice",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "lavender",
    "name": "Lavender",
    "m": "M1b",
    "kind": "crop",
    "unlock": 18,
    "source": "lavender",
    "sell": 223,
    "classes": [
      "flower",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "chili",
    "name": "Chili Pepper",
    "m": "M1b",
    "kind": "crop",
    "unlock": 18,
    "source": "chili",
    "sell": 163,
    "classes": [
      "spice",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "cumin",
    "name": "Cumin",
    "m": "M1b",
    "kind": "crop",
    "unlock": 19,
    "source": "cumin",
    "sell": 396,
    "classes": [
      "spice",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "onion",
    "name": "Onion",
    "m": "M1b",
    "kind": "crop",
    "unlock": 24,
    "source": "onion",
    "sell": 140,
    "classes": [
      "root",
      "veg",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "watermelon",
    "name": "Watermelon",
    "m": "M2",
    "kind": "crop",
    "unlock": 27,
    "source": "watermelon",
    "sell": 629,
    "classes": [
      "fruit",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "pepper",
    "name": "Bell Pepper",
    "m": "M2",
    "kind": "crop",
    "unlock": 31,
    "source": "pepper",
    "sell": 259,
    "classes": [
      "veg",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "rice",
    "name": "Rice",
    "m": "M2",
    "kind": "crop",
    "unlock": 35,
    "source": "rice",
    "sell": 333,
    "classes": [
      "grain",
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "apple",
    "name": "Apple",
    "m": "M1a",
    "kind": "fruit",
    "unlock": 4,
    "source": "apple_tree",
    "sell": 162,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "wood",
    "name": "Wood",
    "m": "M1a",
    "kind": "material",
    "unlock": 6,
    "source": "pine",
    "sell": 142,
    "classes": [],
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 20
  },
  {
    "id": "cherry",
    "name": "Cherry",
    "m": "M1a",
    "kind": "fruit",
    "unlock": 11,
    "source": "cherry_tree",
    "sell": 214,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "orange",
    "name": "Orange",
    "m": "M1b",
    "kind": "fruit",
    "unlock": 13,
    "source": "orange_tree",
    "sell": 208,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "pomegranate",
    "name": "Pomegranate",
    "m": "M1b",
    "kind": "fruit",
    "unlock": 14,
    "source": "pomegranate_tree",
    "sell": 292,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "lemon",
    "name": "Lemon",
    "m": "M1b",
    "kind": "fruit",
    "unlock": 15,
    "source": "lemon_tree",
    "sell": 214,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "peach",
    "name": "Peach",
    "m": "M1b",
    "kind": "fruit",
    "unlock": 17,
    "source": "peach_tree",
    "sell": 211,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "pear",
    "name": "Pear",
    "m": "M1b",
    "kind": "fruit",
    "unlock": 19,
    "source": "pear_tree",
    "sell": 248,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "cinnamon",
    "name": "Cinnamon",
    "m": "M1b",
    "kind": "fruit",
    "unlock": 19,
    "source": "cinnamon_tree",
    "sell": 284,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "plum",
    "name": "Plum",
    "m": "M1b",
    "kind": "fruit",
    "unlock": 23,
    "source": "plum_tree",
    "sell": 265,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "walnut",
    "name": "Walnut",
    "m": "M2",
    "kind": "fruit",
    "unlock": 26,
    "source": "walnut_tree",
    "sell": 291,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "olive",
    "name": "Olive",
    "m": "M2",
    "kind": "fruit",
    "unlock": 30,
    "source": "olive_tree",
    "sell": 304,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "maple_sap",
    "name": "Maple Sap",
    "m": "M2",
    "kind": "fruit",
    "unlock": 34,
    "source": "maple_tree",
    "sell": 292,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "cocoa",
    "name": "Cocoa Pod",
    "m": "M2",
    "kind": "fruit",
    "unlock": 36,
    "source": "cocoa_tree",
    "sell": 368,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "fig",
    "name": "Fig",
    "m": "M2",
    "kind": "fruit",
    "unlock": 39,
    "source": "fig_tree",
    "sell": 351,
    "classes": [
      "produce"
    ],
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0
  },
  {
    "id": "chicken_feed",
    "name": "Chicken Feed",
    "m": "M1a",
    "kind": "feed",
    "unlock": 1,
    "source": "chicken_feed",
    "sell": 2,
    "sellable": false,
    "orderable": false,
    "giftable": false,
    "keepDefault": 0,
    "storePrice": 5,
    "classes": []
  },
  {
    "id": "livestock_feed",
    "name": "Livestock Feed",
    "m": "M1a",
    "kind": "feed",
    "unlock": 7,
    "source": "livestock_feed",
    "sell": 3,
    "sellable": false,
    "orderable": false,
    "giftable": false,
    "keepDefault": 0,
    "storePrice": 8,
    "classes": []
  },
  {
    "id": "rabbit_greens",
    "name": "Rabbit Greens",
    "m": "M1b",
    "kind": "feed",
    "unlock": 14,
    "source": "rabbit_greens",
    "sell": 4,
    "sellable": false,
    "orderable": false,
    "giftable": false,
    "keepDefault": 0,
    "storePrice": 10,
    "classes": []
  },
  {
    "id": "pig_slop",
    "name": "Pig Slop",
    "m": "M1b",
    "kind": "feed",
    "unlock": 17,
    "source": "pig_slop",
    "sell": 3,
    "sellable": false,
    "orderable": false,
    "giftable": false,
    "keepDefault": 0,
    "storePrice": 8,
    "classes": []
  },
  {
    "id": "prairie_hay",
    "name": "Prairie Hay",
    "m": "M1b",
    "kind": "feed",
    "unlock": 17,
    "source": "prairie_hay",
    "sell": 4,
    "sellable": false,
    "orderable": false,
    "giftable": false,
    "keepDefault": 0,
    "storePrice": 10,
    "classes": []
  },
  {
    "id": "egg",
    "name": "Egg",
    "m": "M1a",
    "kind": "animal",
    "unlock": 1,
    "source": "chicken",
    "sell": 82,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "golden_egg",
    "name": "Golden Egg",
    "m": "M1a",
    "kind": "premium",
    "unlock": 1,
    "source": "chicken",
    "sell": 328,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "milk",
    "name": "Milk",
    "m": "M1a",
    "kind": "animal",
    "unlock": 7,
    "source": "cow",
    "sell": 142,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cream_top_milk",
    "name": "Cream-Top Milk",
    "m": "M1a",
    "kind": "premium",
    "unlock": 7,
    "source": "cow",
    "sell": 568,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "wool",
    "name": "Wool",
    "m": "M1a",
    "kind": "animal",
    "unlock": 12,
    "source": "sheep",
    "sell": 285,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "silk_wool",
    "name": "Silk Wool",
    "m": "M1a",
    "kind": "premium",
    "unlock": 12,
    "source": "sheep",
    "sell": 1140,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "honey",
    "name": "Honey",
    "m": "M1b",
    "kind": "animal",
    "unlock": 13,
    "source": "bee",
    "sell": 342,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "royal_jelly",
    "name": "Royal Jelly",
    "m": "M1b",
    "kind": "premium",
    "unlock": 13,
    "source": "bee",
    "sell": 1368,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "angora_wool",
    "name": "Angora Wool",
    "m": "M1b",
    "kind": "animal",
    "unlock": 14,
    "source": "rabbit",
    "sell": 201,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cloud_angora",
    "name": "Cloud Angora",
    "m": "M1b",
    "kind": "premium",
    "unlock": 14,
    "source": "rabbit",
    "sell": 804,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "quail_egg",
    "name": "Quail Egg",
    "m": "M1b",
    "kind": "animal",
    "unlock": 15,
    "source": "quail",
    "sell": 58,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "speckled_egg",
    "name": "Speckled Egg",
    "m": "M1b",
    "kind": "premium",
    "unlock": 15,
    "source": "quail",
    "sell": 232,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "truffle",
    "name": "Truffle",
    "m": "M1b",
    "kind": "animal",
    "unlock": 17,
    "source": "pig",
    "sell": 282,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "black_truffle",
    "name": "Black Truffle",
    "m": "M1b",
    "kind": "premium",
    "unlock": 17,
    "source": "pig",
    "sell": 1128,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "bison_wool",
    "name": "Bison Wool",
    "m": "M1b",
    "kind": "animal",
    "unlock": 17,
    "source": "bison",
    "sell": 201,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "bison_down",
    "name": "Bison Down",
    "m": "M1b",
    "kind": "premium",
    "unlock": 17,
    "source": "bison",
    "sell": 804,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "duck_egg",
    "name": "Duck Egg",
    "m": "M1b",
    "kind": "animal",
    "unlock": 19,
    "source": "duck",
    "sell": 173,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "golden_feather",
    "name": "Golden Feather",
    "m": "M1b",
    "kind": "premium",
    "unlock": 19,
    "source": "duck",
    "sell": 692,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "goat_milk",
    "name": "Goat Milk",
    "m": "M1b",
    "kind": "animal",
    "unlock": 22,
    "source": "goat",
    "sell": 247,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "aged_goat_cheese",
    "name": "Aged Goat Cheese",
    "m": "M1b",
    "kind": "premium",
    "unlock": 22,
    "source": "goat",
    "sell": 988,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "manure",
    "name": "Manure",
    "m": "M1b",
    "kind": "animal",
    "unlock": 25,
    "source": "horse",
    "sell": 174,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "show_ribbon",
    "name": "Show Ribbon",
    "m": "M1b",
    "kind": "premium",
    "unlock": 25,
    "source": "horse",
    "sell": 696,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "alpaca_fiber",
    "name": "Alpaca Fibre",
    "m": "M2",
    "kind": "animal",
    "unlock": 33,
    "source": "alpaca",
    "sell": 318,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "royal_fiber",
    "name": "Royal Fibre",
    "m": "M2",
    "kind": "premium",
    "unlock": 33,
    "source": "alpaca",
    "sell": 1272,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "flour",
    "name": "Flour",
    "m": "M1a",
    "kind": "craft",
    "tier": "T2",
    "unlock": 3,
    "source": "flour",
    "sell": 51,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cornmeal",
    "name": "Cornmeal",
    "m": "M1a",
    "kind": "craft",
    "tier": "T2",
    "unlock": 3,
    "source": "cornmeal",
    "sell": 108,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "sugar",
    "name": "Sugar",
    "m": "M1a",
    "kind": "craft",
    "tier": "T2",
    "unlock": 8,
    "source": "sugar",
    "sell": 254,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "oat_flakes",
    "name": "Oat Flakes",
    "m": "M1b",
    "kind": "craft",
    "tier": "T2",
    "unlock": 13,
    "source": "oat_flakes",
    "sell": 157,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "bread",
    "name": "Bread",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 4,
    "source": "bread",
    "sell": 96,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "corn_bread",
    "name": "Corn Bread",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 4,
    "source": "corn_bread",
    "sell": 381,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "carrot_muffin",
    "name": "Carrot Muffin",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 4,
    "source": "carrot_muffin",
    "sell": 279,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "pancakes",
    "name": "Pancakes",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 8,
    "source": "pancakes",
    "sell": 558,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cookies",
    "name": "Cookies",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 10,
    "source": "cookies",
    "sell": 673,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "blueberry_muffin",
    "name": "Blueberry Muffin",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 14,
    "source": "blueberry_muffin",
    "sell": 747,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "granola_bar",
    "name": "Granola Bar",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 15,
    "source": "granola_bar",
    "sell": 867,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "olive_bread",
    "name": "Olive Bread",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 30,
    "source": "olive_bread",
    "sell": 921,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "planks",
    "name": "Planks",
    "m": "M1a",
    "kind": "craft",
    "tier": "T2",
    "unlock": 6,
    "source": "planks",
    "sell": 112,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "wooden_crate",
    "name": "Wooden Crate",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 6,
    "source": "wooden_crate",
    "sell": 366,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "bird_house",
    "name": "Bird House",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 9,
    "source": "bird_house",
    "sell": 692,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cream",
    "name": "Cream",
    "m": "M1a",
    "kind": "craft",
    "tier": "T2",
    "unlock": 7,
    "source": "cream",
    "sell": 286,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "butter",
    "name": "Butter",
    "m": "M1a",
    "kind": "craft",
    "tier": "T2",
    "unlock": 7,
    "source": "butter",
    "sell": 485,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "baby_bottle",
    "name": "Baby Bottle",
    "m": "M1a",
    "kind": "consumable",
    "tier": "T2",
    "unlock": 7,
    "source": "baby_bottle",
    "sell": 112,
    "sellable": false,
    "orderable": false,
    "giftable": false,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cheese",
    "name": "Cheese",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 10,
    "source": "cheese",
    "sell": 786,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "yogurt",
    "name": "Strawberry Yogurt",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 7,
    "source": "yogurt",
    "sell": 507,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "ice_cream",
    "name": "Ice Cream",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 18,
    "source": "ice_cream",
    "sell": 1108,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "goat_cheese",
    "name": "Goat Cheese",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 22,
    "source": "goat_cheese",
    "sell": 1071,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "compost",
    "name": "Compost",
    "m": "M1a",
    "kind": "consumable",
    "tier": "T2",
    "unlock": 8,
    "source": "compost_bin",
    "sell": 309,
    "sellable": false,
    "orderable": false,
    "giftable": false,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "omelette",
    "name": "Omelette",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 9,
    "source": "omelette",
    "sell": 454,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "veggie_soup",
    "name": "Veggie Soup",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 9,
    "source": "veggie_soup",
    "sell": 483,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "pumpkin_soup",
    "name": "Pumpkin Soup",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 9,
    "source": "pumpkin_soup",
    "sell": 1462,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "popcorn",
    "name": "Popcorn",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 10,
    "source": "popcorn",
    "sell": 722,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "dog_biscuit",
    "name": "Dog Biscuit",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 10,
    "source": "dog_biscuit",
    "sell": 394,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cat_treat",
    "name": "Cat Treat",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 10,
    "source": "cat_treat",
    "sell": 487,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "roasted_seeds",
    "name": "Roasted Sunflower Seeds",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 11,
    "source": "roasted_seeds",
    "sell": 880,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "coleslaw",
    "name": "Coleslaw",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 12,
    "source": "coleslaw",
    "sell": 1484,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "potato_gratin",
    "name": "Potato Gratin",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 12,
    "source": "potato_gratin",
    "sell": 1784,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "truffle_pasta",
    "name": "Truffle Pasta",
    "m": "M1b",
    "kind": "craft",
    "tier": "T4",
    "unlock": 17,
    "source": "truffle_pasta",
    "sell": 1444,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "french_onion_soup",
    "name": "French Onion Soup",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 24,
    "source": "french_onion_soup",
    "sell": 1589,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "watermelon_salad",
    "name": "Watermelon Salad",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 27,
    "source": "watermelon_salad",
    "sell": 2680,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "stuffed_peppers",
    "name": "Stuffed Peppers",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 31,
    "source": "stuffed_peppers",
    "sell": 1811,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "risotto",
    "name": "Truffle Risotto",
    "m": "M2",
    "kind": "craft",
    "tier": "T4",
    "unlock": 35,
    "source": "risotto",
    "sell": 2096,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "custard",
    "name": "Custard",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 19,
    "source": "custard",
    "sell": 1062,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "rice_pudding",
    "name": "Rice Pudding",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 35,
    "source": "rice_pudding",
    "sell": 1443,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "wedding_cake",
    "name": "Wedding Cake",
    "m": "M1b",
    "kind": "craft",
    "tier": "duet",
    "unlock": 25,
    "source": "wedding_cake",
    "sell": 2997,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "strawberry_jam",
    "name": "Strawberry Jam",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 11,
    "source": "strawberry_jam",
    "sell": 889,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "ketchup",
    "name": "Ketchup",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 11,
    "source": "ketchup",
    "sell": 685,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cherry_jam",
    "name": "Cherry Jam",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 11,
    "source": "cherry_jam",
    "sell": 1261,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "sauerkraut",
    "name": "Sauerkraut",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 12,
    "source": "sauerkraut",
    "sell": 2389,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "orange_marmalade",
    "name": "Orange Marmalade",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 13,
    "source": "orange_marmalade",
    "sell": 1326,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "blueberry_jam",
    "name": "Blueberry Jam",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 14,
    "source": "blueberry_jam",
    "sell": 1143,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "peach_jam",
    "name": "Peach Jam",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 17,
    "source": "peach_jam",
    "sell": 1281,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "plum_jam",
    "name": "Plum Jam",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 23,
    "source": "plum_jam",
    "sell": 1471,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "fig_jam",
    "name": "Fig Jam",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 39,
    "source": "fig_jam",
    "sell": 1805,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "pickled_peppers",
    "name": "Pickled Peppers",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 31,
    "source": "pickled_peppers",
    "sell": 1718,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "yarn",
    "name": "Yarn",
    "m": "M1a",
    "kind": "craft",
    "tier": "T2",
    "unlock": 12,
    "source": "yarn",
    "sell": 497,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cotton_cloth",
    "name": "Cotton Cloth",
    "m": "M1b",
    "kind": "craft",
    "tier": "T2",
    "unlock": 16,
    "source": "cotton_cloth",
    "sell": 1205,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "lavender_dye",
    "name": "Lavender Dye",
    "m": "M1b",
    "kind": "craft",
    "tier": "T2",
    "unlock": 18,
    "source": "lavender_dye",
    "sell": 675,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "alpaca_yarn",
    "name": "Alpaca Yarn",
    "m": "M2",
    "kind": "craft",
    "tier": "T2",
    "unlock": 33,
    "source": "alpaca_yarn",
    "sell": 658,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "scarf",
    "name": "Wool Scarf",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 14,
    "source": "scarf",
    "sell": 1373,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cotton_tote",
    "name": "Cotton Tote",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 16,
    "source": "cotton_tote",
    "sell": 2799,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "picnic_blanket",
    "name": "Picnic Blanket",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 17,
    "source": "picnic_blanket",
    "sell": 3726,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "sweater",
    "name": "Sweater",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 18,
    "source": "sweater",
    "sell": 2363,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "wool_pillow",
    "name": "Wool Pillow",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 16,
    "source": "wool_pillow",
    "sell": 2313,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "quilt",
    "name": "Quilt",
    "m": "M1b",
    "kind": "craft",
    "tier": "T4",
    "unlock": 20,
    "source": "quilt",
    "sell": 6521,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "alpaca_plush",
    "name": "Alpaca Plush",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 33,
    "source": "alpaca_plush",
    "sell": 2491,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "alpaca_shawl",
    "name": "Alpaca Shawl",
    "m": "M2",
    "kind": "craft",
    "tier": "T4",
    "unlock": 33,
    "source": "alpaca_shawl",
    "sell": 3123,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "apple_pie",
    "name": "Apple Pie",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 15,
    "source": "apple_pie",
    "sell": 1691,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "pumpkin_pie",
    "name": "Pumpkin Pie",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 15,
    "source": "pumpkin_pie",
    "sell": 2109,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cherry_pie",
    "name": "Cherry Pie",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 15,
    "source": "cherry_pie",
    "sell": 1616,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "lemon_cake",
    "name": "Lemon Cake",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 15,
    "source": "lemon_cake",
    "sell": 2143,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "blueberry_pie",
    "name": "Blueberry Pie",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 16,
    "source": "blueberry_pie",
    "sell": 1723,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "peach_cobbler",
    "name": "Peach Cobbler",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 17,
    "source": "peach_cobbler",
    "sell": 1854,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "pear_tart",
    "name": "Pear Tart",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 19,
    "source": "pear_tart",
    "sell": 1734,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "lemon_meringue_pie",
    "name": "Lemon Meringue Pie",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 19,
    "source": "lemon_meringue_pie",
    "sell": 1918,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "plum_cake",
    "name": "Plum Cake",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 23,
    "source": "plum_cake",
    "sell": 2061,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "walnut_honey_cake",
    "name": "Walnut Honey Cake",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 26,
    "source": "walnut_honey_cake",
    "sell": 2380,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "fig_tart",
    "name": "Fig & Goat Cheese Tart",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 39,
    "source": "fig_tart",
    "sell": 3212,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "apple_juice",
    "name": "Apple Juice",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 6,
    "source": "apple_juice",
    "sell": 682,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "orange_juice",
    "name": "Orange Juice",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 13,
    "source": "orange_juice",
    "sell": 839,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "lemonade",
    "name": "Lemonade",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 15,
    "source": "lemonade",
    "sell": 903,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "carrot_juice",
    "name": "Carrot Juice",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 6,
    "source": "carrot_juice",
    "sell": 158,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "pear_nectar",
    "name": "Pear Nectar",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 19,
    "source": "pear_nectar",
    "sell": 976,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "watermelon_juice",
    "name": "Watermelon Juice",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 27,
    "source": "watermelon_juice",
    "sell": 1511,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "beeswax",
    "name": "Beeswax",
    "m": "M1b",
    "kind": "craft",
    "tier": "T2",
    "unlock": 16,
    "source": "beeswax",
    "sell": 565,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "honey_candle",
    "name": "Honey Candle",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 16,
    "source": "honey_candle",
    "sell": 1439,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "lavender_candle",
    "name": "Lavender Candle",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 18,
    "source": "lavender_candle",
    "sell": 1186,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "lavender_soap",
    "name": "Lavender Soap",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 22,
    "source": "lavender_soap",
    "sell": 1110,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "breakfast_hamper",
    "name": "Breakfast Hamper",
    "m": "M1b",
    "kind": "craft",
    "tier": "T4",
    "unlock": 20,
    "source": "breakfast_hamper",
    "sell": 3216,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "picnic_basket",
    "name": "Picnic Basket",
    "m": "M1b",
    "kind": "craft",
    "tier": "T4",
    "unlock": 23,
    "source": "picnic_basket",
    "sell": 6894,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "spa_basket",
    "name": "Spa Basket",
    "m": "M2",
    "kind": "craft",
    "tier": "T4",
    "unlock": 26,
    "source": "spa_basket",
    "sell": 6512,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cozy_winter_gift",
    "name": "Cozy Winter Gift",
    "m": "M2",
    "kind": "craft",
    "tier": "T4",
    "unlock": 28,
    "source": "cozy_winter_gift",
    "sell": 6588,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "sunflower_oil",
    "name": "Sunflower Oil",
    "m": "M2",
    "kind": "craft",
    "tier": "T2",
    "unlock": 30,
    "source": "sunflower_oil",
    "sell": 1461,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "olive_oil",
    "name": "Olive Oil",
    "m": "M2",
    "kind": "craft",
    "tier": "T2",
    "unlock": 30,
    "source": "olive_oil",
    "sell": 1846,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "truffle_oil",
    "name": "Truffle Oil",
    "m": "M2",
    "kind": "craft",
    "tier": "T4",
    "unlock": 32,
    "source": "truffle_oil",
    "sell": 3248,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "maple_syrup",
    "name": "Maple Syrup",
    "m": "M2",
    "kind": "craft",
    "tier": "T2",
    "unlock": 34,
    "source": "maple_syrup",
    "sell": 1059,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "chocolate",
    "name": "Chocolate",
    "m": "M2",
    "kind": "craft",
    "tier": "T2",
    "unlock": 36,
    "source": "chocolate",
    "sell": 1616,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "chocolate_truffles",
    "name": "Chocolate Truffles",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 37,
    "source": "chocolate_truffles",
    "sell": 2290,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "fertilizer",
    "name": "Fertilizer",
    "m": "M1a",
    "kind": "consumable",
    "tier": "T2",
    "unlock": 10,
    "source": "fertilizer",
    "sell": 907,
    "sellable": false,
    "orderable": false,
    "giftable": false,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "raspberry_jam",
    "name": "Raspberry Jam",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 12,
    "source": "raspberry_jam",
    "sell": 1128,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "raspberry_tart",
    "name": "Raspberry Tart",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 15,
    "source": "raspberry_tart",
    "sell": 1570,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "rose_jelly",
    "name": "Rose Petal Jelly",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 13,
    "source": "rose_jelly",
    "sell": 1324,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "rose_candle",
    "name": "Rose Candle",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 16,
    "source": "rose_candle",
    "sell": 1269,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "pomegranate_juice",
    "name": "Pomegranate Juice",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 14,
    "source": "pomegranate_juice",
    "sell": 1122,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "grenadine",
    "name": "Grenadine Syrup",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 14,
    "source": "grenadine",
    "sell": 1166,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "farm_coffee",
    "name": "Farmhouse Coffee",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 16,
    "source": "farm_coffee",
    "sell": 773,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "coffee_cake",
    "name": "Coffee Cake",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 16,
    "source": "coffee_cake",
    "sell": 1677,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "angora_yarn",
    "name": "Angora Yarn",
    "m": "M1b",
    "kind": "craft",
    "tier": "T2",
    "unlock": 14,
    "source": "angora_yarn",
    "sell": 447,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "angora_mittens",
    "name": "Angora Mittens",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 14,
    "source": "angora_mittens",
    "sell": 1348,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "bunny_slippers",
    "name": "Bunny Slippers",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 16,
    "source": "bunny_slippers",
    "sell": 2192,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "ground_paprika",
    "name": "Ground Paprika",
    "m": "M1b",
    "kind": "craft",
    "tier": "T2",
    "unlock": 16,
    "source": "ground_paprika",
    "sell": 848,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "sharena_sol",
    "name": "Colourful Salt",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 17,
    "source": "sharena_sol",
    "sell": 1218,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "grill_spice",
    "name": "Grill Spice",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 19,
    "source": "grill_spice",
    "sell": 1275,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "ground_cinnamon",
    "name": "Ground Cinnamon",
    "m": "M1b",
    "kind": "craft",
    "tier": "T2",
    "unlock": 19,
    "source": "ground_cinnamon",
    "sell": 735,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "lyutenitsa",
    "name": "Lyutenitsa",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 18,
    "source": "lyutenitsa",
    "sell": 1577,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "salted_bread",
    "name": "Bread with Colourful Salt",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 17,
    "source": "salted_bread",
    "sell": 1570,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "village_potatoes",
    "name": "Village Potatoes",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 19,
    "source": "village_potatoes",
    "sell": 1158,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "cinnamon_rolls",
    "name": "Cinnamon Rolls",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 19,
    "source": "cinnamon_rolls",
    "sell": 1729,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "spiced_cider",
    "name": "Spiced Apple Juice",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 19,
    "source": "spiced_cider",
    "sell": 1061,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "quail_canapes",
    "name": "Quail Egg Canapés",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 15,
    "source": "quail_canapes",
    "sell": 946,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "mini_quiche",
    "name": "Mini Quiches",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 15,
    "source": "mini_quiche",
    "sell": 1600,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "bison_yarn",
    "name": "Bison Yarn",
    "m": "M1b",
    "kind": "craft",
    "tier": "T2",
    "unlock": 17,
    "source": "bison_yarn",
    "sell": 514,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "bison_blanket",
    "name": "Warm Bison Blanket",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 17,
    "source": "bison_blanket",
    "sell": 3264,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "felt_slippers",
    "name": "Felt Slippers",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 17,
    "source": "felt_slippers",
    "sell": 1041,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "pizza",
    "name": "Pizza",
    "m": "M1b",
    "kind": "craft",
    "tier": "T3",
    "unlock": 20,
    "source": "pizza",
    "sell": 1339,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "walnut_cookies",
    "name": "Walnut Cookies",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 26,
    "source": "walnut_cookies",
    "sell": 1174,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "maple_pancakes",
    "name": "Maple Pancakes",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 34,
    "source": "maple_pancakes",
    "sell": 1547,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "sweetheart_cake",
    "name": "Sweetheart Cake",
    "m": "M1a",
    "kind": "craft",
    "tier": "duet",
    "unlock": 10,
    "source": "sweetheart_cake",
    "sell": 1291,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "toy_horse",
    "name": "Toy Horse",
    "m": "M1a",
    "kind": "craft",
    "tier": "T3",
    "unlock": 12,
    "source": "toy_horse",
    "sell": 1365,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "harvest_feast",
    "name": "Harvest Feast",
    "m": "M1b",
    "kind": "craft",
    "tier": "duet",
    "unlock": 15,
    "source": "harvest_feast",
    "sell": 2939,
    "sellable": true,
    "orderable": false,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "potato_chips",
    "name": "Potato Chips",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 30,
    "source": "potato_chips",
    "sell": 2165,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "maple_fudge",
    "name": "Maple Walnut Fudge",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 34,
    "source": "maple_fudge",
    "sell": 2310,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "hot_cocoa",
    "name": "Hot Cocoa",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 36,
    "source": "hot_cocoa",
    "sell": 2036,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "chocolate_cake",
    "name": "Chocolate Cake",
    "m": "M2",
    "kind": "craft",
    "tier": "T3",
    "unlock": 36,
    "source": "chocolate_cake",
    "sell": 3482,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "harvest_hamper",
    "name": "Harvest Festival Hamper",
    "m": "M2",
    "kind": "craft",
    "tier": "T4",
    "unlock": 32,
    "source": "harvest_hamper",
    "sell": 10838,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  },
  {
    "id": "gourmet_hamper",
    "name": "Gourmet Hamper",
    "m": "M2",
    "kind": "craft",
    "tier": "T4",
    "unlock": 37,
    "source": "gourmet_hamper",
    "sell": 9632,
    "sellable": true,
    "orderable": true,
    "giftable": true,
    "keepDefault": 0,
    "classes": []
  }
] as const;
