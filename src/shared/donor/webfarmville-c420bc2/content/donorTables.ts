/**
 * Transplanted from `Shiz0id/webfarmville` @ c420bc253f5de9dbaec636a729f4b4b2866248c4
 * Original sources: shared/src/content/{crops,blooms,producers,feedmill,buildings,cooking,weather}.ts
 * Note: offline wither timers stripped per OLW zero-punishment policy.
 * SPDX-License-Identifier: MIT
 */

export const WF_CROPS = [
  {
    "id": "strawberry",
    "name": "Strawberries",
    "level": 1,
    "cost": 10,
    "growSec": 60,
    "yield": 2,
    "xp": 1,
    "colors": [
      "#3f9b3a",
      "#e8344a",
      "#f7e36b"
    ]
  },
  {
    "id": "wheat",
    "name": "Wheat",
    "level": 1,
    "cost": 5,
    "growSec": 180,
    "yield": 3,
    "xp": 1,
    "colors": [
      "#8fbf4a",
      "#e9c35a",
      "#c99a2e"
    ]
  },
  {
    "id": "carrot",
    "name": "Carrots",
    "level": 2,
    "cost": 15,
    "growSec": 300,
    "yield": 2,
    "xp": 2,
    "colors": [
      "#4caf50",
      "#f08a24",
      "#2e7d32"
    ]
  },
  {
    "id": "tomato",
    "name": "Tomatoes",
    "level": 3,
    "cost": 27,
    "growSec": 600,
    "yield": 3,
    "xp": 2,
    "colors": [
      "#3d8b37",
      "#e5432f",
      "#f5d04c"
    ]
  },
  {
    "id": "potato",
    "name": "Potatoes",
    "level": 4,
    "cost": 32,
    "growSec": 1200,
    "yield": 3,
    "xp": 3,
    "colors": [
      "#5aa04a",
      "#c79b5b",
      "#f1f0e0"
    ]
  },
  {
    "id": "corn",
    "name": "Corn",
    "level": 5,
    "cost": 40,
    "growSec": 1800,
    "yield": 3,
    "xp": 3,
    "colors": [
      "#6cb33f",
      "#f6d443",
      "#a6d36b"
    ]
  },
  {
    "id": "blueberry",
    "name": "Blueberries",
    "level": 6,
    "cost": 50,
    "growSec": 2700,
    "yield": 4,
    "xp": 4,
    "colors": [
      "#3b7d3b",
      "#4a62c9",
      "#9db3ff"
    ]
  },
  {
    "id": "pumpkin",
    "name": "Pumpkins",
    "level": 7,
    "cost": 76,
    "growSec": 3600,
    "yield": 2,
    "xp": 5,
    "colors": [
      "#4f8f2f",
      "#f28c1e",
      "#c75f10"
    ]
  },
  {
    "id": "sunflower",
    "name": "Sunflowers",
    "level": 8,
    "cost": 76,
    "growSec": 5400,
    "yield": 3,
    "xp": 5,
    "colors": [
      "#4f9a3c",
      "#ffcf2e",
      "#6b4422"
    ]
  },
  {
    "id": "cotton",
    "name": "Cotton",
    "level": 9,
    "cost": 93,
    "growSec": 7200,
    "yield": 3,
    "xp": 6,
    "colors": [
      "#5b8f46",
      "#fbfbf4",
      "#a77c55"
    ]
  },
  {
    "id": "grape",
    "name": "Grapes",
    "level": 10,
    "cost": 132,
    "growSec": 10800,
    "yield": 4,
    "xp": 7,
    "colors": [
      "#4c8a33",
      "#8a3fb0",
      "#b98bd6"
    ]
  },
  {
    "id": "rice",
    "name": "Rice",
    "level": 11,
    "cost": 126,
    "growSec": 14400,
    "yield": 5,
    "xp": 8,
    "colors": [
      "#7cc261",
      "#efe7b4",
      "#4a8f3a"
    ]
  },
  {
    "id": "coffee",
    "name": "Coffee",
    "level": 12,
    "cost": 223,
    "growSec": 21600,
    "yield": 3,
    "xp": 10,
    "colors": [
      "#2f7a3a",
      "#b3261e",
      "#5b3a29"
    ]
  },
  {
    "id": "lavender",
    "name": "Lavender",
    "level": 13,
    "cost": 210,
    "growSec": 28800,
    "yield": 4,
    "xp": 10,
    "colors": [
      "#6f9a5a",
      "#9c7fe0",
      "#c8b6ff"
    ]
  },
  {
    "id": "watermelon",
    "name": "Watermelons",
    "level": 14,
    "cost": 300,
    "growSec": 36000,
    "yield": 2,
    "xp": 12,
    "colors": [
      "#3f8a35",
      "#2f9e44",
      "#e9445c"
    ]
  },
  {
    "id": "cranberry",
    "name": "Cranberries",
    "level": 15,
    "cost": 165,
    "growSec": 43200,
    "yield": 3,
    "xp": 12,
    "colors": [
      "#3e7a3a",
      "#c2183c",
      "#7a1027"
    ]
  },
  {
    "id": "candy_corn",
    "name": "Candy Corn",
    "level": 1,
    "cost": 20,
    "growSec": 300,
    "yield": 3,
    "xp": 2,
    "colors": [
      "#5f9e3a",
      "#ffb02e",
      "#fff4d6"
    ],
    "event": "halloween"
  },
  {
    "id": "ghost_pumpkin",
    "name": "Ghost Pumpkins",
    "level": 3,
    "cost": 45,
    "growSec": 1500,
    "yield": 2,
    "xp": 4,
    "colors": [
      "#4f8f2f",
      "#f4f1ea",
      "#8a7fb8"
    ],
    "event": "halloween"
  },
  {
    "id": "peppermint",
    "name": "Peppermint",
    "level": 1,
    "cost": 20,
    "growSec": 600,
    "yield": 3,
    "xp": 2,
    "colors": [
      "#3f9b5a",
      "#ffffff",
      "#e5383b"
    ],
    "event": "winter"
  },
  {
    "id": "golden_grape",
    "name": "Golden Grapes",
    "level": 1,
    "cost": 30,
    "growSec": 900,
    "yield": 3,
    "xp": 3,
    "colors": [
      "#4c8a33",
      "#ffd23f",
      "#f7b801"
    ],
    "event": "new_year"
  },
  {
    "id": "bok_choy",
    "name": "Bok Choy",
    "level": 1,
    "cost": 20,
    "growSec": 600,
    "yield": 3,
    "xp": 2,
    "colors": [
      "#6cbf5a",
      "#f1fae5",
      "#3a7d2c"
    ],
    "event": "lunar_new_year"
  },
  {
    "id": "sweetheart_rose",
    "name": "Sweetheart Roses",
    "level": 1,
    "cost": 25,
    "growSec": 900,
    "yield": 3,
    "xp": 3,
    "colors": [
      "#3f8a3a",
      "#ff4d8d",
      "#ffb3cf"
    ],
    "event": "valentines"
  },
  {
    "id": "four_leaf_clover",
    "name": "Four-Leaf Clovers",
    "level": 1,
    "cost": 20,
    "growSec": 600,
    "yield": 3,
    "xp": 2,
    "colors": [
      "#2fa84f",
      "#59d47a",
      "#ffd23f"
    ],
    "event": "st_patricks"
  },
  {
    "id": "star_melon",
    "name": "Star Melons",
    "level": 1,
    "cost": 35,
    "growSec": 1200,
    "yield": 2,
    "xp": 3,
    "colors": [
      "#3f8a35",
      "#ffe066",
      "#818cf8"
    ],
    "event": "tanabata"
  },
  {
    "id": "sweet_potato",
    "name": "Sweet Potatoes",
    "level": 1,
    "cost": 20,
    "growSec": 900,
    "yield": 3,
    "xp": 3,
    "colors": [
      "#5a9e4a",
      "#c8553d",
      "#f2a65a"
    ],
    "event": "thanksgiving"
  },
  {
    "id": "marigold",
    "name": "Marigolds",
    "level": 1,
    "cost": 20,
    "growSec": 600,
    "yield": 3,
    "xp": 2,
    "colors": [
      "#4f9a3c",
      "#ff9f1c",
      "#ffbf69"
    ],
    "event": "diwali"
  },
  {
    "id": "taro",
    "name": "Taro",
    "level": 1,
    "cost": 20,
    "growSec": 900,
    "yield": 3,
    "xp": 3,
    "colors": [
      "#4f8f4a",
      "#a68ab0",
      "#e7dcef"
    ],
    "event": "mid_autumn"
  },
  {
    "id": "matcha",
    "name": "Matcha Tea",
    "level": 1,
    "cost": 25,
    "growSec": 900,
    "yield": 3,
    "xp": 3,
    "colors": [
      "#4a8f3a",
      "#7cb342",
      "#c5e1a5"
    ],
    "event": "hanami"
  },
  {
    "id": "heirloom_tomato",
    "name": "Heirloom Tomatoes",
    "level": 1,
    "cost": 20,
    "growSec": 600,
    "yield": 3,
    "xp": 2,
    "colors": [
      "#3d8b37",
      "#f77f00",
      "#9d0208"
    ],
    "event": "earth_day"
  },
  {
    "id": "rainbow_radish",
    "name": "Rainbow Radishes",
    "level": 1,
    "cost": 20,
    "growSec": 600,
    "yield": 3,
    "xp": 2,
    "colors": [
      "#5aa04a",
      "#c77dff",
      "#ff8fab"
    ],
    "event": "spring"
  },
  {
    "id": "pineapple",
    "name": "Pineapples",
    "level": 1,
    "cost": 35,
    "growSec": 1200,
    "yield": 2,
    "xp": 3,
    "colors": [
      "#4c8a33",
      "#ffc300",
      "#7cb518"
    ],
    "event": "summer"
  },
  {
    "id": "butternut",
    "name": "Butternut Squash",
    "level": 1,
    "cost": 25,
    "growSec": 900,
    "yield": 3,
    "xp": 3,
    "colors": [
      "#5a8f3a",
      "#f4a259",
      "#e8c07d"
    ],
    "event": "harvest"
  }
] as const;
export const WF_BLOOMS = [
  {
    "id": "tulips_red",
    "species": "tulips",
    "hybrid": false
  },
  {
    "id": "tulips_yellow",
    "species": "tulips",
    "hybrid": false
  },
  {
    "id": "tulips_pink",
    "species": "tulips",
    "hybrid": false
  },
  {
    "id": "tulips_purple",
    "species": "tulips",
    "hybrid": false
  },
  {
    "id": "roses_red",
    "species": "roses",
    "hybrid": false
  },
  {
    "id": "roses_white",
    "species": "roses",
    "hybrid": false
  },
  {
    "id": "roses_pink",
    "species": "roses",
    "hybrid": false
  },
  {
    "id": "tulips_orange",
    "species": "tulips",
    "hybrid": true
  },
  {
    "id": "tulips_white",
    "species": "tulips",
    "hybrid": true
  },
  {
    "id": "tulips_black",
    "species": "tulips",
    "hybrid": true
  },
  {
    "id": "tulips_rainbow",
    "species": "tulips",
    "hybrid": true
  },
  {
    "id": "roses_yellow",
    "species": "roses",
    "hybrid": true
  },
  {
    "id": "roses_orange",
    "species": "roses",
    "hybrid": true
  },
  {
    "id": "roses_lavender",
    "species": "roses",
    "hybrid": true
  },
  {
    "id": "roses_blue",
    "species": "roses",
    "hybrid": true
  },
  {
    "id": "roses_gold",
    "species": "roses",
    "hybrid": true
  }
] as const;
export const WF_BLOOM_RECIPES = [
  {
    "a": "tulips_red",
    "b": "tulips_yellow",
    "child": "tulips_orange",
    "odds": 0.5,
    "hinter": "Henrietta",
    "hint": "My hens nap between the red and yellow tulips, and the ones that come up in the middle are orange as a yolk!"
  },
  {
    "a": "tulips_pink",
    "b": "tulips_purple",
    "child": "tulips_white",
    "odds": 0.5,
    "hinter": "Grandma Fern",
    "hint": "Pink and purple tulips side by side, dear. That is how my mother grew her snowy white ones."
  },
  {
    "a": "tulips_purple",
    "b": "tulips_white",
    "child": "tulips_black",
    "odds": 0.3,
    "hinter": "Mayor Maple",
    "hint": "Hoo! Town legend says purple and snowy tulips planted together bloom midnight-dark."
  },
  {
    "a": "tulips_orange",
    "b": "tulips_white",
    "child": "tulips_rainbow",
    "odds": 0.2,
    "hinter": "Rosie",
    "hint": "I put orange tulips next to snowy ones and one came up every colour at once! I nearly fainted!"
  },
  {
    "a": "roses_white",
    "b": "roses_pink",
    "child": "roses_yellow",
    "odds": 0.5,
    "hinter": "Penny",
    "hint": "Oink! White roses and pink roses together sometimes make sunny yellow ones. Like lemonade!"
  },
  {
    "a": "roses_red",
    "b": "roses_yellow",
    "child": "roses_orange",
    "odds": 0.45,
    "hinter": "Mama Marigold",
    "hint": "Red roses cuddled up with sunny ones give the sweetest peach blossoms, honey."
  },
  {
    "a": "roses_red",
    "b": "roses_white",
    "child": "roses_lavender",
    "odds": 0.4,
    "hinter": "Grandma Fern",
    "hint": "Red and white roses together, and a little patience, and you may find lavender ones."
  },
  {
    "a": "roses_lavender",
    "b": "roses_orange",
    "child": "roses_blue",
    "odds": 0.2,
    "hinter": "Mayor Maple",
    "hint": "A blue rose! Only seen once in Meadowbrook, between a lavender bush and a peach one. Remarkable!"
  },
  {
    "a": "roses_blue",
    "b": "roses_yellow",
    "child": "roses_gold",
    "odds": 0.25,
    "wet": true,
    "hinter": "Mama Marigold",
    "hint": "Golden roses only open in the rain, they say. Blue and sunny, side by side, under a grey sky."
  }
] as const;
export const WF_TREES = [
  {
    "id": "apple_tree",
    "name": "Apple Tree",
    "kind": "tree",
    "level": 2,
    "cost": 300,
    "cycleSec": 3600,
    "product": "apple",
    "yield": 3,
    "xp": 3
  },
  {
    "id": "cherry_tree",
    "name": "Cherry Tree",
    "kind": "tree",
    "level": 3,
    "cost": 450,
    "cycleSec": 7200,
    "product": "cherry",
    "yield": 4,
    "xp": 4
  },
  {
    "id": "orange_tree",
    "name": "Orange Tree",
    "kind": "tree",
    "level": 4,
    "cost": 650,
    "cycleSec": 10800,
    "product": "orange",
    "yield": 3,
    "xp": 5
  },
  {
    "id": "lemon_tree",
    "name": "Lemon Tree",
    "kind": "tree",
    "level": 6,
    "cost": 900,
    "cycleSec": 14400,
    "product": "lemon",
    "yield": 3,
    "xp": 6
  },
  {
    "id": "peach_tree",
    "name": "Peach Tree",
    "kind": "tree",
    "level": 8,
    "cost": 1400,
    "cycleSec": 21600,
    "product": "peach",
    "yield": 3,
    "xp": 7
  },
  {
    "id": "banana_tree",
    "name": "Banana Tree",
    "kind": "tree",
    "level": 10,
    "cost": 1500,
    "cycleSec": 28800,
    "product": "banana",
    "yield": 3,
    "xp": 8
  },
  {
    "id": "coconut_palm",
    "name": "Coconut Palm",
    "kind": "tree",
    "level": 12,
    "cost": 1900,
    "cycleSec": 36000,
    "product": "coconut",
    "yield": 3,
    "xp": 10
  },
  {
    "id": "maple_tree",
    "name": "Sugar Maple",
    "kind": "tree",
    "level": 14,
    "cost": 1600,
    "cycleSec": 43200,
    "product": "maple_syrup",
    "yield": 2,
    "xp": 12
  }
] as const;
export const WF_ANIMALS = [
  {
    "id": "chicken",
    "name": "Chicken",
    "kind": "animal",
    "level": 1,
    "cost": 150,
    "cycleSec": 600,
    "product": "egg",
    "yield": 2,
    "xp": 2
  },
  {
    "id": "cow",
    "name": "Cow",
    "kind": "animal",
    "level": 3,
    "cost": 450,
    "cycleSec": 3600,
    "product": "milk",
    "yield": 2,
    "xp": 4
  },
  {
    "id": "sheep",
    "name": "Sheep",
    "kind": "animal",
    "level": 5,
    "cost": 800,
    "cycleSec": 7200,
    "product": "wool",
    "yield": 2,
    "xp": 5
  },
  {
    "id": "beehive",
    "name": "Beehive",
    "kind": "animal",
    "level": 6,
    "cost": 900,
    "cycleSec": 5400,
    "product": "honey",
    "yield": 2,
    "xp": 5
  },
  {
    "id": "pig",
    "name": "Pig",
    "kind": "animal",
    "level": 7,
    "cost": 1200,
    "cycleSec": 10800,
    "product": "truffle",
    "yield": 1,
    "xp": 6
  },
  {
    "id": "duck",
    "name": "Duck",
    "kind": "animal",
    "level": 9,
    "cost": 900,
    "cycleSec": 7200,
    "product": "feather",
    "yield": 3,
    "xp": 6
  },
  {
    "id": "goat",
    "name": "Goat",
    "kind": "animal",
    "level": 11,
    "cost": 1700,
    "cycleSec": 14400,
    "product": "goat_milk",
    "yield": 2,
    "xp": 8
  },
  {
    "id": "rabbit",
    "name": "Angora Rabbit",
    "kind": "animal",
    "level": 13,
    "cost": 2000,
    "cycleSec": 14400,
    "product": "angora",
    "yield": 2,
    "xp": 9
  }
] as const;
export const WF_FEEDS = [
  {
    "id": "animal_feed",
    "name": "Barnyard Feed",
    "bonus": 1,
    "skip": 0.25,
    "babySkip": 0.2
  },
  {
    "id": "deluxe_feed",
    "name": "Deluxe Feed",
    "bonus": 2,
    "skip": 0.5,
    "babySkip": 0.4
  }
] as const;
export const WF_BUILDINGS = [
  {
    "id": "farmhouse",
    "name": "Farmhouse",
    "level": 1,
    "cost": 0,
    "w": 3,
    "h": 3,
    "slots": 0,
    "charm": 10,
    "recipes": [],
    "starter": true
  },
  {
    "id": "feed_mill",
    "name": "Feed Mill",
    "level": 3,
    "cost": 450,
    "w": 2,
    "h": 2,
    "slots": 3,
    "charm": 3,
    "recipes": [
      {
        "id": "animal_feed",
        "output": "animal_feed",
        "qty": 3,
        "inputs": {
          "wheat": 2,
          "carrot": 1
        },
        "craftSec": 90,
        "xp": 2
      },
      {
        "id": "deluxe_feed",
        "output": "deluxe_feed",
        "qty": 2,
        "inputs": {
          "corn": 2,
          "blueberry": 1
        },
        "craftSec": 600,
        "xp": 4
      }
    ]
  },
  {
    "id": "mill",
    "name": "Windmill",
    "level": 4,
    "cost": 800,
    "w": 2,
    "h": 2,
    "slots": 3,
    "charm": 4,
    "recipes": [
      {
        "id": "flour",
        "output": "flour",
        "qty": 1,
        "inputs": {
          "wheat": 3
        },
        "craftSec": 120,
        "xp": 2
      },
      {
        "id": "cornmeal",
        "output": "cornmeal",
        "qty": 1,
        "inputs": {
          "corn": 2
        },
        "craftSec": 300,
        "xp": 3
      },
      {
        "id": "rice_flour",
        "output": "rice_flour",
        "qty": 1,
        "inputs": {
          "rice": 3
        },
        "craftSec": 900,
        "xp": 6
      }
    ]
  },
  {
    "id": "dairy",
    "name": "Dairy",
    "level": 5,
    "cost": 1200,
    "w": 2,
    "h": 2,
    "slots": 3,
    "charm": 3,
    "recipes": [
      {
        "id": "butter",
        "output": "butter",
        "qty": 1,
        "inputs": {
          "milk": 2
        },
        "craftSec": 300,
        "xp": 3
      },
      {
        "id": "cheese",
        "output": "cheese",
        "qty": 1,
        "inputs": {
          "milk": 3
        },
        "craftSec": 1200,
        "xp": 5
      },
      {
        "id": "ice_cream",
        "output": "ice_cream",
        "qty": 1,
        "inputs": {
          "milk": 2,
          "strawberry": 4
        },
        "craftSec": 900,
        "xp": 5
      },
      {
        "id": "goat_cheese",
        "output": "goat_cheese",
        "qty": 1,
        "inputs": {
          "goat_milk": 2
        },
        "craftSec": 1800,
        "xp": 8
      }
    ]
  },
  {
    "id": "bakery",
    "name": "Bakery",
    "level": 6,
    "cost": 1500,
    "w": 2,
    "h": 2,
    "slots": 3,
    "charm": 4,
    "recipes": [
      {
        "id": "bread",
        "output": "bread",
        "qty": 1,
        "inputs": {
          "flour": 2,
          "egg": 1
        },
        "craftSec": 600,
        "xp": 4
      },
      {
        "id": "blueberry_muffin",
        "output": "blueberry_muffin",
        "qty": 1,
        "inputs": {
          "flour": 1,
          "blueberry": 2,
          "egg": 2
        },
        "craftSec": 1200,
        "xp": 6
      },
      {
        "id": "cornbread",
        "output": "cornbread",
        "qty": 1,
        "inputs": {
          "cornmeal": 2,
          "egg": 1
        },
        "craftSec": 900,
        "xp": 6
      },
      {
        "id": "pumpkin_pie",
        "output": "pumpkin_pie",
        "qty": 1,
        "inputs": {
          "flour": 1,
          "pumpkin": 1,
          "egg": 1
        },
        "craftSec": 1800,
        "xp": 7
      }
    ]
  },
  {
    "id": "jam_kitchen",
    "name": "Jam Kitchen",
    "level": 7,
    "cost": 1400,
    "w": 2,
    "h": 2,
    "slots": 3,
    "charm": 4,
    "recipes": [
      {
        "id": "strawberry_jam",
        "output": "strawberry_jam",
        "qty": 1,
        "inputs": {
          "strawberry": 4
        },
        "craftSec": 600,
        "xp": 3
      },
      {
        "id": "apple_jam",
        "output": "apple_jam",
        "qty": 1,
        "inputs": {
          "apple": 3
        },
        "craftSec": 900,
        "xp": 4
      },
      {
        "id": "cherry_jam",
        "output": "cherry_jam",
        "qty": 1,
        "inputs": {
          "cherry": 3
        },
        "craftSec": 1200,
        "xp": 5
      },
      {
        "id": "marmalade",
        "output": "marmalade",
        "qty": 1,
        "inputs": {
          "orange": 2,
          "lemon": 1
        },
        "craftSec": 1800,
        "xp": 7
      },
      {
        "id": "cranberry_sauce",
        "output": "cranberry_sauce",
        "qty": 1,
        "inputs": {
          "cranberry": 3
        },
        "craftSec": 2400,
        "xp": 10
      }
    ]
  },
  {
    "id": "loom",
    "name": "Weaving Loom",
    "level": 9,
    "cost": 1800,
    "w": 2,
    "h": 2,
    "slots": 2,
    "charm": 3,
    "recipes": [
      {
        "id": "yarn",
        "output": "yarn",
        "qty": 1,
        "inputs": {
          "wool": 2
        },
        "craftSec": 600,
        "xp": 5
      },
      {
        "id": "cotton_cloth",
        "output": "cotton_cloth",
        "qty": 1,
        "inputs": {
          "cotton": 3
        },
        "craftSec": 1200,
        "xp": 6
      },
      {
        "id": "sweater",
        "output": "sweater",
        "qty": 1,
        "inputs": {
          "yarn": 2
        },
        "craftSec": 2400,
        "xp": 10
      },
      {
        "id": "quilt",
        "output": "quilt",
        "qty": 1,
        "inputs": {
          "cotton_cloth": 2,
          "angora": 2
        },
        "craftSec": 5400,
        "xp": 18
      }
    ]
  },
  {
    "id": "juice_bar",
    "name": "Juice Stand",
    "level": 10,
    "cost": 2000,
    "w": 2,
    "h": 2,
    "slots": 3,
    "charm": 5,
    "recipes": [
      {
        "id": "lemonade",
        "output": "lemonade",
        "qty": 1,
        "inputs": {
          "lemon": 2,
          "strawberry": 1
        },
        "craftSec": 600,
        "xp": 5
      },
      {
        "id": "veggie_juice",
        "output": "veggie_juice",
        "qty": 1,
        "inputs": {
          "carrot": 2,
          "tomato": 2
        },
        "craftSec": 900,
        "xp": 5
      },
      {
        "id": "grape_juice",
        "output": "grape_juice",
        "qty": 1,
        "inputs": {
          "grape": 4
        },
        "craftSec": 1800,
        "xp": 8
      },
      {
        "id": "smoothie",
        "output": "smoothie",
        "qty": 1,
        "inputs": {
          "peach": 2,
          "milk": 1
        },
        "craftSec": 1500,
        "xp": 8
      }
    ]
  },
  {
    "id": "cafe",
    "name": "Cozy Café",
    "level": 12,
    "cost": 2500,
    "w": 2,
    "h": 2,
    "slots": 2,
    "charm": 8,
    "recipes": [
      {
        "id": "latte",
        "output": "latte",
        "qty": 1,
        "inputs": {
          "coffee": 2,
          "milk": 1
        },
        "craftSec": 900,
        "xp": 8
      },
      {
        "id": "lavender_tea",
        "output": "lavender_tea",
        "qty": 1,
        "inputs": {
          "lavender": 2,
          "honey": 1
        },
        "craftSec": 1200,
        "xp": 8
      },
      {
        "id": "pancakes",
        "output": "pancakes",
        "qty": 1,
        "inputs": {
          "flour": 2,
          "egg": 2,
          "maple_syrup": 1
        },
        "craftSec": 2400,
        "xp": 12
      },
      {
        "id": "truffle_pasta",
        "output": "truffle_pasta",
        "qty": 1,
        "inputs": {
          "flour": 2,
          "truffle": 1,
          "cheese": 1
        },
        "craftSec": 3600,
        "xp": 14
      }
    ]
  }
] as const;
export const WF_COOKING_DISHES = [
  {
    "id": "veggie_salad",
    "name": "Garden Salad",
    "level": 2,
    "inputs": {
      "carrot": 2,
      "tomato": 2
    },
    "steps": [
      "chop",
      "chop",
      "sprinkle"
    ],
    "sell": 110,
    "xp": 6
  },
  {
    "id": "tomato_soup",
    "name": "Tomato Soup",
    "level": 3,
    "inputs": {
      "tomato": 3,
      "egg": 1
    },
    "steps": [
      "chop",
      "stir",
      "heat"
    ],
    "sell": 140,
    "xp": 8
  },
  {
    "id": "omelette",
    "name": "Fluffy Omelette",
    "level": 3,
    "inputs": {
      "egg": 3,
      "tomato": 1
    },
    "steps": [
      "crack",
      "mix",
      "flip"
    ],
    "sell": 130,
    "xp": 8
  },
  {
    "id": "veggie_stirfry",
    "name": "Veggie Stir-Fry",
    "level": 5,
    "inputs": {
      "carrot": 2,
      "corn": 2,
      "potato": 1
    },
    "steps": [
      "chop",
      "flip",
      "sprinkle"
    ],
    "sell": 210,
    "xp": 10
  },
  {
    "id": "corn_chowder",
    "name": "Corn Chowder",
    "level": 5,
    "inputs": {
      "corn": 3,
      "potato": 2,
      "milk": 1
    },
    "steps": [
      "chop",
      "stir",
      "heat"
    ],
    "sell": 270,
    "xp": 12
  },
  {
    "id": "mashed_potatoes",
    "name": "Buttery Mash",
    "level": 5,
    "inputs": {
      "potato": 3,
      "butter": 1,
      "milk": 1
    },
    "steps": [
      "chop",
      "knead",
      "stir"
    ],
    "sell": 260,
    "xp": 12
  },
  {
    "id": "strawberry_shortcake",
    "name": "Strawberry Shortcake",
    "level": 5,
    "inputs": {
      "strawberry": 5,
      "flour": 1,
      "egg": 1,
      "milk": 1
    },
    "steps": [
      "crack",
      "mix",
      "heat",
      "sprinkle"
    ],
    "sell": 320,
    "xp": 16
  },
  {
    "id": "berry_parfait",
    "name": "Berry Parfait",
    "level": 6,
    "inputs": {
      "blueberry": 3,
      "strawberry": 3,
      "milk": 1
    },
    "steps": [
      "mix",
      "sprinkle"
    ],
    "sell": 240,
    "xp": 12
  },
  {
    "id": "apple_pie",
    "name": "Grandma's Apple Pie",
    "level": 6,
    "inputs": {
      "apple": 4,
      "flour": 2,
      "butter": 1
    },
    "steps": [
      "chop",
      "knead",
      "heat"
    ],
    "sell": 360,
    "xp": 18
  },
  {
    "id": "carrot_cake",
    "name": "Carrot Cake",
    "level": 6,
    "inputs": {
      "carrot": 3,
      "flour": 2,
      "egg": 2
    },
    "steps": [
      "chop",
      "mix",
      "heat",
      "sprinkle"
    ],
    "sell": 340,
    "xp": 18
  },
  {
    "id": "pumpkin_soup",
    "name": "Pumpkin Soup",
    "level": 7,
    "inputs": {
      "pumpkin": 1,
      "milk": 1,
      "butter": 1
    },
    "steps": [
      "chop",
      "stir",
      "heat"
    ],
    "sell": 320,
    "xp": 16
  },
  {
    "id": "pizza",
    "name": "Farmhouse Pizza",
    "level": 7,
    "inputs": {
      "flour": 2,
      "tomato": 3,
      "cheese": 1
    },
    "steps": [
      "knead",
      "sprinkle",
      "heat"
    ],
    "sell": 380,
    "xp": 20
  },
  {
    "id": "honey_cookies",
    "name": "Honey Cookies",
    "level": 7,
    "inputs": {
      "flour": 2,
      "butter": 1,
      "egg": 1,
      "honey": 1
    },
    "steps": [
      "crack",
      "mix",
      "knead",
      "heat"
    ],
    "sell": 340,
    "xp": 18
  },
  {
    "id": "sushi_rolls",
    "name": "Veggie Sushi Rolls",
    "level": 11,
    "inputs": {
      "rice": 3,
      "carrot": 1
    },
    "steps": [
      "chop",
      "knead",
      "chop"
    ],
    "sell": 320,
    "xp": 18
  },
  {
    "id": "fish_tacos",
    "name": "Fish Tacos",
    "level": 4,
    "inputs": {
      "bluegill": 2,
      "tomato": 1,
      "corn": 1
    },
    "steps": [
      "chop",
      "flip",
      "sprinkle"
    ],
    "sell": 230,
    "xp": 12
  },
  {
    "id": "fish_and_chips",
    "name": "Fish & Chips",
    "level": 6,
    "inputs": {
      "carp": 1,
      "potato": 2,
      "flour": 1
    },
    "steps": [
      "chop",
      "mix",
      "heat"
    ],
    "sell": 300,
    "xp": 15
  },
  {
    "id": "grilled_trout",
    "name": "Lemon Grilled Trout",
    "level": 8,
    "inputs": {
      "rainbow_trout": 1,
      "butter": 1,
      "lemon": 1
    },
    "steps": [
      "sprinkle",
      "heat",
      "flip"
    ],
    "sell": 360,
    "xp": 18
  },
  {
    "id": "salmon_onigiri",
    "name": "Salmon Onigiri",
    "level": 11,
    "inputs": {
      "salmon": 1,
      "rice": 2
    },
    "steps": [
      "chop",
      "knead",
      "sprinkle"
    ],
    "sell": 420,
    "xp": 20
  },
  {
    "id": "candy_apples",
    "name": "Candy Apples",
    "level": 2,
    "inputs": {
      "apple": 3,
      "candy": 5
    },
    "steps": [
      "stir",
      "sprinkle"
    ],
    "sell": 220,
    "xp": 14,
    "event": "halloween"
  }
] as const;
export const WF_WEATHER_DEFS = {
  "sunny": {
    "id": "sunny",
    "name": "Sunny",
    "emoji": "☀️",
    "perk": "Clear skies: a lovely farming day."
  },
  "cloudy": {
    "id": "cloudy",
    "name": "Cloudy",
    "emoji": "⛅",
    "perk": "Soft and grey. Fish bite a little more boldly."
  },
  "rain": {
    "id": "rain",
    "name": "Rainy",
    "emoji": "🌧️",
    "perk": "Rain waters every crop: they grow 25% faster. Rare fish rise and kitties drop by to shelter.",
    "wet": true,
    "cozy": true
  },
  "storm": {
    "id": "storm",
    "name": "Thunderstorm",
    "emoji": "⛈️",
    "perk": "Crops grow 25% faster, the rarest fish come out and kitties hurry in from the storm.",
    "wet": true,
    "cozy": true
  },
  "windy": {
    "id": "windy",
    "name": "Windy",
    "emoji": "🍃",
    "perk": "The wind shakes the trees: +1 fruit from every tree."
  },
  "snow": {
    "id": "snow",
    "name": "Snowy",
    "emoji": "❄️",
    "perk": "A cozy snow day: cooking gives +50% XP and kitties curl up on your goodies.",
    "cozy": true
  },
  "rainbow": {
    "id": "rainbow",
    "name": "Rainbow",
    "emoji": "🌈",
    "perk": "Rainbow luck: +1 from every harvest!"
  }
} as const;
