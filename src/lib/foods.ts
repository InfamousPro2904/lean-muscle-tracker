// Lean-Muscle-Tracker — local food database
// Curated for accuracy. Indian foods are first-class.
// Macros are per 100 g unless a portion preset says otherwise.

import type { Macros100g } from './types'

export type FoodCategory =
  | 'breads'   | 'rice'    | 'curry'  | 'protein'
  | 'dairy'    | 'vegetable' | 'fruit'  | 'snack'
  | 'sweet'    | 'drink'   | 'grain'  | 'nut'
  | 'other'

export type Cuisine = 'indian' | 'western' | 'asian' | 'universal'

export interface FoodItem {
  name:     string
  category: FoodCategory
  cuisine:  Cuisine
  per100g:  Macros100g
  /** Common serving sizes — first entry is shown by default */
  portions?: { label: string; grams: number }[]
}

// ── QUICK FOODS — shown as default tile grid (~18 items) ────────────────────
// Mix of Indian + Western items most likely to be eaten daily.

export const QUICK_FOODS: FoodItem[] = [
  { name: 'Chapati / Roti',       category: 'breads',  cuisine: 'indian',    per100g: { kcal: 297, protein: 11,  carbs: 56,  fat: 4   }, portions: [{ label: '1 medium', grams: 40 }] },
  { name: 'Dal (Toor / Moong)',   category: 'curry',   cuisine: 'indian',    per100g: { kcal: 116, protein: 9,   carbs: 20,  fat: 0.4 }, portions: [{ label: '1 katori', grams: 150 }] },
  { name: 'White Rice (cooked)',  category: 'rice',    cuisine: 'universal', per100g: { kcal: 130, protein: 2.7, carbs: 28,  fat: 0.3 }, portions: [{ label: '1 cup', grams: 150 }] },
  { name: 'Curd / Dahi',          category: 'dairy',   cuisine: 'indian',    per100g: { kcal: 60,  protein: 3.5, carbs: 4.7, fat: 3.3 }, portions: [{ label: '1 katori', grams: 100 }] },
  { name: 'Paneer',               category: 'protein', cuisine: 'indian',    per100g: { kcal: 296, protein: 18,  carbs: 6,   fat: 22  }, portions: [{ label: '1 cube', grams: 25 }] },
  { name: 'Egg (whole, boiled)',  category: 'protein', cuisine: 'universal', per100g: { kcal: 155, protein: 13,  carbs: 1.1, fat: 11  }, portions: [{ label: '1 large egg', grams: 50 }] },
  { name: 'Chicken Breast (cooked)', category: 'protein', cuisine: 'universal', per100g: { kcal: 165, protein: 31,  carbs: 0,   fat: 3.6 } },
  { name: 'Brown Rice (cooked)',  category: 'rice',    cuisine: 'universal', per100g: { kcal: 216, protein: 5,   carbs: 45,  fat: 1.8 }, portions: [{ label: '1 cup', grams: 195 }] },
  { name: 'Rolled Oats (dry)',    category: 'grain',   cuisine: 'universal', per100g: { kcal: 389, protein: 17,  carbs: 66,  fat: 7   }, portions: [{ label: '1/2 cup', grams: 50 }] },
  { name: 'Whey Protein Powder',  category: 'protein', cuisine: 'universal', per100g: { kcal: 380, protein: 75,  carbs: 10,  fat: 5   }, portions: [{ label: '1 scoop', grams: 30 }] },
  { name: 'Banana',               category: 'fruit',   cuisine: 'universal', per100g: { kcal: 89,  protein: 1.1, carbs: 23,  fat: 0.3 }, portions: [{ label: '1 medium', grams: 120 }] },
  { name: 'Greek Yogurt (plain)', category: 'dairy',   cuisine: 'universal', per100g: { kcal: 59,  protein: 10,  carbs: 3.6, fat: 0.4 } },
  { name: 'Whole Milk',           category: 'dairy',   cuisine: 'universal', per100g: { kcal: 61,  protein: 3.2, carbs: 4.8, fat: 3.3 }, portions: [{ label: '1 glass', grams: 250 }] },
  { name: 'Almonds',              category: 'nut',     cuisine: 'universal', per100g: { kcal: 579, protein: 21,  carbs: 22,  fat: 50  }, portions: [{ label: '10 almonds', grams: 12 }] },
  { name: 'Peanut Butter',        category: 'nut',     cuisine: 'universal', per100g: { kcal: 588, protein: 25,  carbs: 20,  fat: 50  }, portions: [{ label: '1 tbsp', grams: 16 }] },
  { name: 'Sweet Potato (cooked)',category: 'vegetable', cuisine: 'universal', per100g: { kcal: 86,  protein: 1.6, carbs: 20,  fat: 0.1 } },
  { name: 'Salmon (cooked)',      category: 'protein', cuisine: 'universal', per100g: { kcal: 208, protein: 20,  carbs: 0,   fat: 13  } },
  { name: 'Avocado',              category: 'fruit',   cuisine: 'universal', per100g: { kcal: 160, protein: 2,   carbs: 9,   fat: 15  }, portions: [{ label: '1/2 medium', grams: 100 }] },
]

// ── EXTENDED FOODS — searched but not shown as default tiles (~150+ items) ──

export const EXTENDED_FOODS: FoodItem[] = [
  // ── Indian Breads ─────────────────────────────────────────────────────────
  { name: 'Plain Paratha',            category: 'breads', cuisine: 'indian', per100g: { kcal: 320, protein: 7,   carbs: 45, fat: 12 }, portions: [{ label: '1 medium', grams: 80 }] },
  { name: 'Aloo Paratha',             category: 'breads', cuisine: 'indian', per100g: { kcal: 280, protein: 6,   carbs: 38, fat: 11 }, portions: [{ label: '1 medium', grams: 110 }] },
  { name: 'Naan',                     category: 'breads', cuisine: 'indian', per100g: { kcal: 310, protein: 9,   carbs: 50, fat: 7  }, portions: [{ label: '1 piece', grams: 90 }] },
  { name: 'Butter Naan',              category: 'breads', cuisine: 'indian', per100g: { kcal: 350, protein: 9,   carbs: 50, fat: 12 }, portions: [{ label: '1 piece', grams: 90 }] },
  { name: 'Plain Dosa',               category: 'breads', cuisine: 'indian', per100g: { kcal: 168, protein: 4,   carbs: 30, fat: 3  }, portions: [{ label: '1 dosa', grams: 80 }] },
  { name: 'Masala Dosa',              category: 'breads', cuisine: 'indian', per100g: { kcal: 175, protein: 4,   carbs: 28, fat: 5  }, portions: [{ label: '1 dosa', grams: 150 }] },
  { name: 'Idli',                     category: 'breads', cuisine: 'indian', per100g: { kcal: 132, protein: 4,   carbs: 27, fat: 0.5 }, portions: [{ label: '1 piece', grams: 30 }] },
  { name: 'Vada (Medu)',              category: 'snack',  cuisine: 'indian', per100g: { kcal: 220, protein: 8,   carbs: 25, fat: 11 }, portions: [{ label: '1 piece', grams: 50 }] },
  { name: 'Uttapam',                  category: 'breads', cuisine: 'indian', per100g: { kcal: 150, protein: 4,   carbs: 26, fat: 3  }, portions: [{ label: '1 medium', grams: 130 }] },
  { name: 'Poori',                    category: 'breads', cuisine: 'indian', per100g: { kcal: 380, protein: 7,   carbs: 39, fat: 22 }, portions: [{ label: '1 piece', grams: 35 }] },
  { name: 'Bhature',                  category: 'breads', cuisine: 'indian', per100g: { kcal: 340, protein: 7,   carbs: 50, fat: 12 }, portions: [{ label: '1 piece', grams: 100 }] },

  // ── Indian Rice ───────────────────────────────────────────────────────────
  { name: 'Veg Biryani',              category: 'rice',   cuisine: 'indian', per100g: { kcal: 200, protein: 7,   carbs: 26, fat: 7  }, portions: [{ label: '1 plate', grams: 250 }] },
  { name: 'Chicken Biryani',          category: 'rice',   cuisine: 'indian', per100g: { kcal: 245, protein: 11,  carbs: 26, fat: 11 }, portions: [{ label: '1 plate', grams: 300 }] },
  { name: 'Mutton Biryani',           category: 'rice',   cuisine: 'indian', per100g: { kcal: 270, protein: 12,  carbs: 25, fat: 13 }, portions: [{ label: '1 plate', grams: 300 }] },
  { name: 'Jeera Rice',               category: 'rice',   cuisine: 'indian', per100g: { kcal: 175, protein: 3,   carbs: 30, fat: 5  }, portions: [{ label: '1 cup', grams: 150 }] },
  { name: 'Khichdi',                  category: 'rice',   cuisine: 'indian', per100g: { kcal: 130, protein: 4,   carbs: 22, fat: 3  }, portions: [{ label: '1 bowl', grams: 200 }] },
  { name: 'Curd Rice',                category: 'rice',   cuisine: 'indian', per100g: { kcal: 110, protein: 3,   carbs: 18, fat: 3  }, portions: [{ label: '1 bowl', grams: 200 }] },
  { name: 'Pulao',                    category: 'rice',   cuisine: 'indian', per100g: { kcal: 170, protein: 4,   carbs: 28, fat: 5  }, portions: [{ label: '1 cup', grams: 150 }] },
  { name: 'Lemon Rice',               category: 'rice',   cuisine: 'indian', per100g: { kcal: 165, protein: 3,   carbs: 28, fat: 5  } },
  { name: 'Tomato Rice',              category: 'rice',   cuisine: 'indian', per100g: { kcal: 160, protein: 3,   carbs: 27, fat: 5  } },

  // ── Indian Curries / Mains ───────────────────────────────────────────────
  { name: 'Sambar',                   category: 'curry',  cuisine: 'indian', per100g: { kcal: 67,  protein: 4,   carbs: 11, fat: 1  }, portions: [{ label: '1 cup', grams: 200 }] },
  { name: 'Rajma (cooked)',           category: 'curry',  cuisine: 'indian', per100g: { kcal: 127, protein: 8.7, carbs: 22, fat: 0.5 }, portions: [{ label: '1 katori', grams: 150 }] },
  { name: 'Chana / Chole',            category: 'curry',  cuisine: 'indian', per100g: { kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 }, portions: [{ label: '1 katori', grams: 150 }] },
  { name: 'Palak Paneer',             category: 'curry',  cuisine: 'indian', per100g: { kcal: 180, protein: 8,   carbs: 8,  fat: 13 }, portions: [{ label: '1 katori', grams: 150 }] },
  { name: 'Paneer Butter Masala',     category: 'curry',  cuisine: 'indian', per100g: { kcal: 280, protein: 12,  carbs: 9,  fat: 22 } },
  { name: 'Kadai Paneer',             category: 'curry',  cuisine: 'indian', per100g: { kcal: 220, protein: 11,  carbs: 8,  fat: 16 } },
  { name: 'Matar Paneer',             category: 'curry',  cuisine: 'indian', per100g: { kcal: 200, protein: 10,  carbs: 9,  fat: 14 } },
  { name: 'Chicken Curry',            category: 'curry',  cuisine: 'indian', per100g: { kcal: 175, protein: 12,  carbs: 5,  fat: 12 } },
  { name: 'Butter Chicken',           category: 'curry',  cuisine: 'indian', per100g: { kcal: 270, protein: 13,  carbs: 4,  fat: 22 } },
  { name: 'Chicken Tikka Masala',     category: 'curry',  cuisine: 'indian', per100g: { kcal: 220, protein: 14,  carbs: 5,  fat: 16 } },
  { name: 'Tandoori Chicken',         category: 'protein', cuisine: 'indian', per100g: { kcal: 165, protein: 24,  carbs: 1,  fat: 7  } },
  { name: 'Mutton Curry',             category: 'curry',  cuisine: 'indian', per100g: { kcal: 260, protein: 15,  carbs: 4,  fat: 21 } },
  { name: 'Fish Curry',               category: 'curry',  cuisine: 'indian', per100g: { kcal: 145, protein: 17,  carbs: 4,  fat: 7  } },
  { name: 'Egg Curry',                category: 'curry',  cuisine: 'indian', per100g: { kcal: 180, protein: 11,  carbs: 5,  fat: 13 } },
  { name: 'Dal Makhani',              category: 'curry',  cuisine: 'indian', per100g: { kcal: 180, protein: 8,   carbs: 17, fat: 9  }, portions: [{ label: '1 katori', grams: 150 }] },
  { name: 'Dal Tadka',                category: 'curry',  cuisine: 'indian', per100g: { kcal: 130, protein: 8,   carbs: 19, fat: 3  }, portions: [{ label: '1 katori', grams: 150 }] },

  // ── Indian Vegetables / Sabzi ────────────────────────────────────────────
  { name: 'Aloo Gobi',                category: 'vegetable', cuisine: 'indian', per100g: { kcal: 100, protein: 3,   carbs: 15, fat: 4  } },
  { name: 'Bhindi (Okra Sabzi)',      category: 'vegetable', cuisine: 'indian', per100g: { kcal: 90,  protein: 2,   carbs: 11, fat: 4  } },
  { name: 'Baingan Bharta',           category: 'vegetable', cuisine: 'indian', per100g: { kcal: 95,  protein: 2,   carbs: 8,  fat: 7  } },
  { name: 'Mixed Veg Curry',          category: 'vegetable', cuisine: 'indian', per100g: { kcal: 110, protein: 3,   carbs: 12, fat: 6  } },
  { name: 'Aloo Matar',               category: 'vegetable', cuisine: 'indian', per100g: { kcal: 105, protein: 3,   carbs: 14, fat: 4  } },
  { name: 'Cabbage Sabzi',            category: 'vegetable', cuisine: 'indian', per100g: { kcal: 70,  protein: 2,   carbs: 8,  fat: 4  } },

  // ── Indian Snacks ────────────────────────────────────────────────────────
  { name: 'Poha',                     category: 'snack',  cuisine: 'indian', per100g: { kcal: 130, protein: 2.6, carbs: 27, fat: 1.5 }, portions: [{ label: '1 bowl', grams: 150 }] },
  { name: 'Upma',                     category: 'snack',  cuisine: 'indian', per100g: { kcal: 132, protein: 3.5, carbs: 22, fat: 3  }, portions: [{ label: '1 bowl', grams: 200 }] },
  { name: 'Samosa',                   category: 'snack',  cuisine: 'indian', per100g: { kcal: 250, protein: 4,   carbs: 24, fat: 16 }, portions: [{ label: '1 piece', grams: 60 }] },
  { name: 'Pakora',                   category: 'snack',  cuisine: 'indian', per100g: { kcal: 290, protein: 8,   carbs: 30, fat: 16 } },
  { name: 'Dhokla',                   category: 'snack',  cuisine: 'indian', per100g: { kcal: 160, protein: 6,   carbs: 25, fat: 4  }, portions: [{ label: '1 piece', grams: 50 }] },
  { name: 'Vada Pav',                 category: 'snack',  cuisine: 'indian', per100g: { kcal: 280, protein: 7,   carbs: 35, fat: 13 }, portions: [{ label: '1 piece', grams: 120 }] },
  { name: 'Pav Bhaji',                category: 'snack',  cuisine: 'indian', per100g: { kcal: 200, protein: 5,   carbs: 28, fat: 8  }, portions: [{ label: '1 plate', grams: 250 }] },
  { name: 'Pani Puri',                category: 'snack',  cuisine: 'indian', per100g: { kcal: 230, protein: 4,   carbs: 32, fat: 10 }, portions: [{ label: '6 pieces', grams: 100 }] },
  { name: 'Bhel Puri',                category: 'snack',  cuisine: 'indian', per100g: { kcal: 250, protein: 5,   carbs: 40, fat: 9  } },
  { name: 'Sev',                      category: 'snack',  cuisine: 'indian', per100g: { kcal: 540, protein: 19,  carbs: 50, fat: 30 } },
  { name: 'Murukku',                  category: 'snack',  cuisine: 'indian', per100g: { kcal: 480, protein: 8,   carbs: 60, fat: 23 } },

  // ── Indian Sweets ────────────────────────────────────────────────────────
  { name: 'Gulab Jamun',              category: 'sweet',  cuisine: 'indian', per100g: { kcal: 350, protein: 4,   carbs: 45, fat: 18 }, portions: [{ label: '1 piece', grams: 50 }] },
  { name: 'Rasgulla',                 category: 'sweet',  cuisine: 'indian', per100g: { kcal: 186, protein: 4,   carbs: 41, fat: 1.5 }, portions: [{ label: '1 piece', grams: 40 }] },
  { name: 'Jalebi',                   category: 'sweet',  cuisine: 'indian', per100g: { kcal: 400, protein: 1,   carbs: 65, fat: 16 } },
  { name: 'Kheer',                    category: 'sweet',  cuisine: 'indian', per100g: { kcal: 145, protein: 4,   carbs: 22, fat: 4  }, portions: [{ label: '1 katori', grams: 150 }] },
  { name: 'Halwa (Suji)',             category: 'sweet',  cuisine: 'indian', per100g: { kcal: 380, protein: 5,   carbs: 50, fat: 18 }, portions: [{ label: '1 katori', grams: 100 }] },
  { name: 'Laddu (Besan)',            category: 'sweet',  cuisine: 'indian', per100g: { kcal: 460, protein: 9,   carbs: 55, fat: 22 }, portions: [{ label: '1 piece', grams: 30 }] },
  { name: 'Barfi',                    category: 'sweet',  cuisine: 'indian', per100g: { kcal: 420, protein: 7,   carbs: 50, fat: 22 } },

  // ── Indian Drinks ────────────────────────────────────────────────────────
  { name: 'Sweet Lassi',              category: 'drink',  cuisine: 'indian', per100g: { kcal: 80,  protein: 2,   carbs: 13, fat: 2  }, portions: [{ label: '1 glass', grams: 250 }] },
  { name: 'Salted Lassi',             category: 'drink',  cuisine: 'indian', per100g: { kcal: 50,  protein: 2,   carbs: 5,  fat: 2  }, portions: [{ label: '1 glass', grams: 250 }] },
  { name: 'Buttermilk / Chaas',       category: 'drink',  cuisine: 'indian', per100g: { kcal: 40,  protein: 2,   carbs: 4,  fat: 1.5 }, portions: [{ label: '1 glass', grams: 250 }] },
  { name: 'Masala Chai (sugar)',      category: 'drink',  cuisine: 'indian', per100g: { kcal: 50,  protein: 1.2, carbs: 7,  fat: 2  }, portions: [{ label: '1 cup', grams: 150 }] },
  { name: 'Filter Coffee',            category: 'drink',  cuisine: 'indian', per100g: { kcal: 35,  protein: 1,   carbs: 5,  fat: 1.5 }, portions: [{ label: '1 cup', grams: 150 }] },
  { name: 'Coconut Water',            category: 'drink',  cuisine: 'indian', per100g: { kcal: 19,  protein: 0.7, carbs: 4,  fat: 0.2 }, portions: [{ label: '1 glass', grams: 240 }] },
  { name: 'Nimbu Pani',               category: 'drink',  cuisine: 'indian', per100g: { kcal: 30,  protein: 0.1, carbs: 8,  fat: 0  }, portions: [{ label: '1 glass', grams: 250 }] },

  // ── Indian Fruits ────────────────────────────────────────────────────────
  { name: 'Mango',                    category: 'fruit',  cuisine: 'indian', per100g: { kcal: 60,  protein: 0.8, carbs: 15, fat: 0.4 }, portions: [{ label: '1 medium', grams: 200 }] },
  { name: 'Pomegranate',              category: 'fruit',  cuisine: 'indian', per100g: { kcal: 83,  protein: 1.7, carbs: 19, fat: 1.2 }, portions: [{ label: '1 cup', grams: 174 }] },
  { name: 'Guava',                    category: 'fruit',  cuisine: 'indian', per100g: { kcal: 68,  protein: 2.6, carbs: 14, fat: 0.9 }, portions: [{ label: '1 medium', grams: 165 }] },
  { name: 'Papaya',                   category: 'fruit',  cuisine: 'indian', per100g: { kcal: 43,  protein: 0.5, carbs: 11, fat: 0.3 } },
  { name: 'Custard Apple (Sitaphal)', category: 'fruit',  cuisine: 'indian', per100g: { kcal: 94,  protein: 2.1, carbs: 24, fat: 0.3 } },

  // ── Western Proteins ─────────────────────────────────────────────────────
  { name: 'Chicken Thigh (cooked)',   category: 'protein', cuisine: 'universal', per100g: { kcal: 209, protein: 26,  carbs: 0,   fat: 11 } },
  { name: 'Tuna (canned, drained)',   category: 'protein', cuisine: 'universal', per100g: { kcal: 116, protein: 26,  carbs: 0,   fat: 1  } },
  { name: 'Cottage Cheese',           category: 'dairy',   cuisine: 'universal', per100g: { kcal: 98,  protein: 11,  carbs: 3.4, fat: 4.3 } },
  { name: 'Tofu',                     category: 'protein', cuisine: 'asian',     per100g: { kcal: 144, protein: 17,  carbs: 3,   fat: 9  } },
  { name: 'Tempeh',                   category: 'protein', cuisine: 'asian',     per100g: { kcal: 195, protein: 20,  carbs: 8,   fat: 11 } },
  { name: 'Beef Mince (cooked)',      category: 'protein', cuisine: 'universal', per100g: { kcal: 250, protein: 26,  carbs: 0,   fat: 17 } },
  { name: 'Pork Chop (cooked)',       category: 'protein', cuisine: 'universal', per100g: { kcal: 231, protein: 26,  carbs: 0,   fat: 14 } },
  { name: 'Egg White',                category: 'protein', cuisine: 'universal', per100g: { kcal: 52,  protein: 11,  carbs: 0.7, fat: 0.2 }, portions: [{ label: '1 egg white', grams: 33 }] },
  { name: 'Casein Protein Powder',    category: 'protein', cuisine: 'universal', per100g: { kcal: 360, protein: 80,  carbs: 5,   fat: 2  }, portions: [{ label: '1 scoop', grams: 30 }] },

  // ── Grains & Carbs ───────────────────────────────────────────────────────
  { name: 'Quinoa (cooked)',          category: 'grain', cuisine: 'universal', per100g: { kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 } },
  { name: 'Pasta (cooked)',           category: 'grain', cuisine: 'western',   per100g: { kcal: 158, protein: 6,   carbs: 31, fat: 1  } },
  { name: 'Whole Wheat Bread',        category: 'breads', cuisine: 'western',  per100g: { kcal: 247, protein: 13,  carbs: 41, fat: 4.2 }, portions: [{ label: '1 slice', grams: 30 }] },
  { name: 'White Bread',              category: 'breads', cuisine: 'western',  per100g: { kcal: 265, protein: 9,   carbs: 49, fat: 3.2 }, portions: [{ label: '1 slice', grams: 30 }] },
  { name: 'Cornflakes',               category: 'grain',  cuisine: 'western',  per100g: { kcal: 357, protein: 8,   carbs: 84, fat: 0.4 }, portions: [{ label: '1 bowl', grams: 30 }] },
  { name: 'Muesli',                   category: 'grain',  cuisine: 'western',  per100g: { kcal: 380, protein: 11,  carbs: 66, fat: 7  }, portions: [{ label: '1 bowl', grams: 50 }] },
  { name: 'Lentils (cooked)',         category: 'grain',  cuisine: 'universal', per100g: { kcal: 116, protein: 9,   carbs: 20, fat: 0.4 } },
  { name: 'Chickpeas (cooked)',       category: 'grain',  cuisine: 'universal', per100g: { kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 } },
  { name: 'Black Beans (cooked)',     category: 'grain',  cuisine: 'universal', per100g: { kcal: 132, protein: 8.9, carbs: 24, fat: 0.5 } },

  // ── Vegetables ───────────────────────────────────────────────────────────
  { name: 'Broccoli (cooked)',        category: 'vegetable', cuisine: 'universal', per100g: { kcal: 34,  protein: 2.8, carbs: 7,   fat: 0.4 } },
  { name: 'Spinach (cooked)',         category: 'vegetable', cuisine: 'universal', per100g: { kcal: 23,  protein: 3,   carbs: 3.6, fat: 0.4 } },
  { name: 'Cauliflower (cooked)',     category: 'vegetable', cuisine: 'universal', per100g: { kcal: 23,  protein: 1.8, carbs: 5,   fat: 0.5 } },
  { name: 'Carrot',                   category: 'vegetable', cuisine: 'universal', per100g: { kcal: 41,  protein: 0.9, carbs: 10,  fat: 0.2 } },
  { name: 'Tomato',                   category: 'vegetable', cuisine: 'universal', per100g: { kcal: 18,  protein: 0.9, carbs: 3.9, fat: 0.2 } },
  { name: 'Cucumber',                 category: 'vegetable', cuisine: 'universal', per100g: { kcal: 16,  protein: 0.7, carbs: 3.6, fat: 0.1 } },
  { name: 'Potato (boiled)',          category: 'vegetable', cuisine: 'universal', per100g: { kcal: 87,  protein: 1.9, carbs: 20,  fat: 0.1 } },
  { name: 'Onion',                    category: 'vegetable', cuisine: 'universal', per100g: { kcal: 40,  protein: 1.1, carbs: 9,   fat: 0.1 } },
  { name: 'Bell Pepper',              category: 'vegetable', cuisine: 'universal', per100g: { kcal: 31,  protein: 1,   carbs: 6,   fat: 0.3 } },

  // ── Fruits ───────────────────────────────────────────────────────────────
  { name: 'Apple',                    category: 'fruit', cuisine: 'universal', per100g: { kcal: 52,  protein: 0.3, carbs: 14, fat: 0.2 }, portions: [{ label: '1 medium', grams: 180 }] },
  { name: 'Orange',                   category: 'fruit', cuisine: 'universal', per100g: { kcal: 47,  protein: 0.9, carbs: 12, fat: 0.1 }, portions: [{ label: '1 medium', grams: 150 }] },
  { name: 'Strawberries',             category: 'fruit', cuisine: 'universal', per100g: { kcal: 33,  protein: 0.7, carbs: 8,  fat: 0.3 } },
  { name: 'Blueberries',              category: 'fruit', cuisine: 'universal', per100g: { kcal: 57,  protein: 0.7, carbs: 14, fat: 0.3 } },
  { name: 'Grapes',                   category: 'fruit', cuisine: 'universal', per100g: { kcal: 69,  protein: 0.7, carbs: 18, fat: 0.2 } },
  { name: 'Watermelon',               category: 'fruit', cuisine: 'universal', per100g: { kcal: 30,  protein: 0.6, carbs: 8,  fat: 0.2 } },
  { name: 'Pineapple',                category: 'fruit', cuisine: 'universal', per100g: { kcal: 50,  protein: 0.5, carbs: 13, fat: 0.1 } },
  { name: 'Kiwi',                     category: 'fruit', cuisine: 'universal', per100g: { kcal: 61,  protein: 1.1, carbs: 15, fat: 0.5 } },
  { name: 'Dates',                    category: 'fruit', cuisine: 'universal', per100g: { kcal: 282, protein: 2.5, carbs: 75, fat: 0.4 }, portions: [{ label: '1 date', grams: 8 }] },
  { name: 'Raisins',                  category: 'fruit', cuisine: 'universal', per100g: { kcal: 299, protein: 3,   carbs: 79, fat: 0.5 } },

  // ── Nuts & Seeds ─────────────────────────────────────────────────────────
  { name: 'Cashews',                  category: 'nut', cuisine: 'universal', per100g: { kcal: 553, protein: 18,  carbs: 30, fat: 44 } },
  { name: 'Walnuts',                  category: 'nut', cuisine: 'universal', per100g: { kcal: 654, protein: 15,  carbs: 14, fat: 65 } },
  { name: 'Pistachios',               category: 'nut', cuisine: 'universal', per100g: { kcal: 562, protein: 20,  carbs: 28, fat: 45 } },
  { name: 'Chia Seeds',               category: 'nut', cuisine: 'universal', per100g: { kcal: 486, protein: 17,  carbs: 42, fat: 31 } },
  { name: 'Flax Seeds',               category: 'nut', cuisine: 'universal', per100g: { kcal: 534, protein: 18,  carbs: 29, fat: 42 } },
  { name: 'Pumpkin Seeds',            category: 'nut', cuisine: 'universal', per100g: { kcal: 559, protein: 30,  carbs: 11, fat: 49 } },

  // ── Dairy & Drinks ───────────────────────────────────────────────────────
  { name: 'Skim Milk',                category: 'dairy', cuisine: 'universal', per100g: { kcal: 34, protein: 3.4, carbs: 5, fat: 0.1 }, portions: [{ label: '1 glass', grams: 250 }] },
  { name: 'Almond Milk (unsweet)',    category: 'dairy', cuisine: 'universal', per100g: { kcal: 17, protein: 0.6, carbs: 0.6, fat: 1.5 }, portions: [{ label: '1 glass', grams: 250 }] },
  { name: 'Soy Milk',                 category: 'dairy', cuisine: 'asian',     per100g: { kcal: 54, protein: 3.3, carbs: 6, fat: 1.8 }, portions: [{ label: '1 glass', grams: 250 }] },
  { name: 'Cheddar Cheese',           category: 'dairy', cuisine: 'western',   per100g: { kcal: 402, protein: 25,  carbs: 1.3, fat: 33 }, portions: [{ label: '1 slice', grams: 28 }] },
  { name: 'Mozzarella',               category: 'dairy', cuisine: 'western',   per100g: { kcal: 280, protein: 28,  carbs: 3, fat: 17 } },

  // ── Misc / Other ─────────────────────────────────────────────────────────
  { name: 'Olive Oil',                category: 'other', cuisine: 'universal', per100g: { kcal: 884, protein: 0,   carbs: 0,   fat: 100 }, portions: [{ label: '1 tbsp', grams: 14 }] },
  { name: 'Butter',                   category: 'other', cuisine: 'universal', per100g: { kcal: 717, protein: 0.9, carbs: 0.1, fat: 81  }, portions: [{ label: '1 tbsp', grams: 14 }] },
  { name: 'Ghee',                     category: 'other', cuisine: 'indian',    per100g: { kcal: 900, protein: 0,   carbs: 0,   fat: 100 }, portions: [{ label: '1 tsp', grams: 5 }] },
  { name: 'Honey',                    category: 'other', cuisine: 'universal', per100g: { kcal: 304, protein: 0.3, carbs: 82,  fat: 0   }, portions: [{ label: '1 tbsp', grams: 21 }] },
  { name: 'Sugar (white)',            category: 'other', cuisine: 'universal', per100g: { kcal: 387, protein: 0,   carbs: 100, fat: 0   }, portions: [{ label: '1 tsp', grams: 4 }] },
  { name: 'Dark Chocolate (70%)',     category: 'sweet', cuisine: 'universal', per100g: { kcal: 600, protein: 8,   carbs: 46,  fat: 43  }, portions: [{ label: '1 square', grams: 10 }] },
  { name: 'Protein Bar (avg)',        category: 'snack', cuisine: 'universal', per100g: { kcal: 380, protein: 30,  carbs: 35,  fat: 12  }, portions: [{ label: '1 bar', grams: 60 }] },

  // ── Asian / Other Cuisines ───────────────────────────────────────────────
  { name: 'Sushi (avg)',              category: 'rice', cuisine: 'asian', per100g: { kcal: 150, protein: 6,  carbs: 28, fat: 2 }, portions: [{ label: '1 piece', grams: 25 }] },
  { name: 'Pad Thai',                 category: 'rice', cuisine: 'asian', per100g: { kcal: 200, protein: 8,  carbs: 32, fat: 6 } },
  { name: 'Pizza (cheese)',           category: 'breads', cuisine: 'western', per100g: { kcal: 266, protein: 11, carbs: 33, fat: 10 }, portions: [{ label: '1 slice', grams: 100 }] },
  { name: 'Burger (beef, fast food)', category: 'snack',  cuisine: 'western', per100g: { kcal: 295, protein: 17, carbs: 24, fat: 14 }, portions: [{ label: '1 burger', grams: 250 }] },
  { name: 'French Fries',             category: 'snack',  cuisine: 'western', per100g: { kcal: 312, protein: 3.4, carbs: 41, fat: 15 }, portions: [{ label: '1 small', grams: 70 }] },
]

// All foods combined for searching
export const ALL_FOODS: FoodItem[] = [...QUICK_FOODS, ...EXTENDED_FOODS]

// ── Search helpers ──────────────────────────────────────────────────────────

/** Search local food database — case-insensitive substring match, ranked by name length (shorter = more relevant) */
export function searchFoods(query: string, limit = 12): FoodItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return ALL_FOODS
    .filter(f => f.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.length - b.name.length)
    .slice(0, limit)
}
