import type { FoodItem } from './types'

// Common foods with typical per-serving macros. These are estimates (USDA-style averages), so brands and cooking will vary.
export const FOODS: FoodItem[] = [
 {
  "id": "chicken-breast--cooked",
  "name": "Chicken breast, cooked",
  "serving": "4 oz",
  "cal": 185.0,
  "p": 35.0,
  "c": 0.0,
  "f": 4.0,
  "cat": "Protein"
 },
 {
  "id": "chicken-thigh--cooked",
  "name": "Chicken thigh, cooked",
  "serving": "4 oz",
  "cal": 210.0,
  "p": 28.0,
  "c": 0.0,
  "f": 10.0,
  "cat": "Protein"
 },
 {
  "id": "ground-turkey-93---cooked",
  "name": "Ground turkey 93%, cooked",
  "serving": "4 oz",
  "cal": 190.0,
  "p": 24.0,
  "c": 0.0,
  "f": 10.0,
  "cat": "Protein"
 },
 {
  "id": "lean-ground-beef-93---cooked",
  "name": "Lean ground beef 93%, cooked",
  "serving": "4 oz",
  "cal": 210.0,
  "p": 26.0,
  "c": 0.0,
  "f": 11.0,
  "cat": "Protein"
 },
 {
  "id": "ground-beef-80-20--cooked",
  "name": "Ground beef 80/20, cooked",
  "serving": "4 oz",
  "cal": 285.0,
  "p": 24.0,
  "c": 0.0,
  "f": 20.0,
  "cat": "Protein"
 },
 {
  "id": "sirloin-steak--cooked",
  "name": "Sirloin steak, cooked",
  "serving": "4 oz",
  "cal": 220.0,
  "p": 30.0,
  "c": 0.0,
  "f": 10.0,
  "cat": "Protein"
 },
 {
  "id": "salmon--cooked",
  "name": "Salmon, cooked",
  "serving": "4 oz",
  "cal": 235.0,
  "p": 25.0,
  "c": 0.0,
  "f": 14.0,
  "cat": "Protein"
 },
 {
  "id": "white-fish--cod--tilapia---cooked",
  "name": "White fish (cod, tilapia), cooked",
  "serving": "4 oz",
  "cal": 120.0,
  "p": 26.0,
  "c": 0.0,
  "f": 2.0,
  "cat": "Protein"
 },
 {
  "id": "tuna--canned-in-water",
  "name": "Tuna, canned in water",
  "serving": "1 can",
  "cal": 120.0,
  "p": 27.0,
  "c": 0.0,
  "f": 1.0,
  "cat": "Protein"
 },
 {
  "id": "shrimp--cooked",
  "name": "Shrimp, cooked",
  "serving": "4 oz",
  "cal": 112.0,
  "p": 24.0,
  "c": 1.0,
  "f": 1.0,
  "cat": "Protein"
 },
 {
  "id": "whole-egg",
  "name": "Whole egg",
  "serving": "1 large",
  "cal": 72.0,
  "p": 6.0,
  "c": 0.4,
  "f": 5.0,
  "cat": "Protein"
 },
 {
  "id": "egg-whites",
  "name": "Egg whites",
  "serving": "3 large",
  "cal": 51.0,
  "p": 11.0,
  "c": 0.7,
  "f": 0.0,
  "cat": "Protein"
 },
 {
  "id": "bacon",
  "name": "Bacon",
  "serving": "2 slices",
  "cal": 90.0,
  "p": 6.0,
  "c": 0.0,
  "f": 7.0,
  "cat": "Protein"
 },
 {
  "id": "deli-turkey",
  "name": "Deli turkey",
  "serving": "3 oz",
  "cal": 90.0,
  "p": 15.0,
  "c": 2.0,
  "f": 1.5,
  "cat": "Protein"
 },
 {
  "id": "whey-protein",
  "name": "Whey protein",
  "serving": "1 scoop",
  "cal": 120.0,
  "p": 24.0,
  "c": 3.0,
  "f": 1.5,
  "cat": "Protein"
 },
 {
  "id": "tofu--firm",
  "name": "Tofu, firm",
  "serving": "4 oz",
  "cal": 90.0,
  "p": 10.0,
  "c": 2.0,
  "f": 5.0,
  "cat": "Protein"
 },
 {
  "id": "tempeh",
  "name": "Tempeh",
  "serving": "3 oz",
  "cal": 160.0,
  "p": 16.0,
  "c": 8.0,
  "f": 9.0,
  "cat": "Protein"
 },
 {
  "id": "protein-bar",
  "name": "Protein bar",
  "serving": "1 bar",
  "cal": 200.0,
  "p": 20.0,
  "c": 22.0,
  "f": 7.0,
  "cat": "Protein"
 },
 {
  "id": "beef-jerky",
  "name": "Beef jerky",
  "serving": "1 oz",
  "cal": 100.0,
  "p": 12.0,
  "c": 4.0,
  "f": 3.0,
  "cat": "Protein"
 },
 {
  "id": "white-rice--cooked",
  "name": "White rice, cooked",
  "serving": "1 cup",
  "cal": 205.0,
  "p": 4.0,
  "c": 45.0,
  "f": 0.4,
  "cat": "Carbs"
 },
 {
  "id": "brown-rice--cooked",
  "name": "Brown rice, cooked",
  "serving": "1 cup",
  "cal": 215.0,
  "p": 5.0,
  "c": 45.0,
  "f": 1.8,
  "cat": "Carbs"
 },
 {
  "id": "oatmeal--dry",
  "name": "Oatmeal, dry",
  "serving": "1/2 cup",
  "cal": 150.0,
  "p": 5.0,
  "c": 27.0,
  "f": 3.0,
  "cat": "Carbs"
 },
 {
  "id": "pasta--cooked",
  "name": "Pasta, cooked",
  "serving": "1 cup",
  "cal": 220.0,
  "p": 8.0,
  "c": 43.0,
  "f": 1.3,
  "cat": "Carbs"
 },
 {
  "id": "whole-wheat-bread",
  "name": "Whole wheat bread",
  "serving": "1 slice",
  "cal": 80.0,
  "p": 4.0,
  "c": 14.0,
  "f": 1.0,
  "cat": "Carbs"
 },
 {
  "id": "white-bread",
  "name": "White bread",
  "serving": "1 slice",
  "cal": 75.0,
  "p": 2.5,
  "c": 14.0,
  "f": 1.0,
  "cat": "Carbs"
 },
 {
  "id": "bagel--plain",
  "name": "Bagel, plain",
  "serving": "1 bagel",
  "cal": 270.0,
  "p": 10.0,
  "c": 53.0,
  "f": 1.5,
  "cat": "Carbs"
 },
 {
  "id": "flour-tortilla",
  "name": "Flour tortilla",
  "serving": "1 (8 in)",
  "cal": 140.0,
  "p": 4.0,
  "c": 24.0,
  "f": 3.5,
  "cat": "Carbs"
 },
 {
  "id": "sweet-potato--baked",
  "name": "Sweet potato, baked",
  "serving": "1 medium",
  "cal": 112.0,
  "p": 2.0,
  "c": 26.0,
  "f": 0.1,
  "cat": "Carbs"
 },
 {
  "id": "white-potato--baked",
  "name": "White potato, baked",
  "serving": "1 medium",
  "cal": 160.0,
  "p": 4.0,
  "c": 37.0,
  "f": 0.2,
  "cat": "Carbs"
 },
 {
  "id": "quinoa--cooked",
  "name": "Quinoa, cooked",
  "serving": "1 cup",
  "cal": 222.0,
  "p": 8.0,
  "c": 39.0,
  "f": 3.6,
  "cat": "Carbs"
 },
 {
  "id": "cream-of-rice--dry",
  "name": "Cream of rice, dry",
  "serving": "1/4 cup",
  "cal": 160.0,
  "p": 3.0,
  "c": 35.0,
  "f": 0.0,
  "cat": "Carbs"
 },
 {
  "id": "rice-cakes",
  "name": "Rice cakes",
  "serving": "2 cakes",
  "cal": 70.0,
  "p": 1.4,
  "c": 15.0,
  "f": 0.5,
  "cat": "Carbs"
 },
 {
  "id": "cheerios",
  "name": "Cheerios",
  "serving": "1 cup",
  "cal": 100.0,
  "p": 3.0,
  "c": 20.0,
  "f": 2.0,
  "cat": "Carbs"
 },
 {
  "id": "black-beans",
  "name": "Black beans",
  "serving": "1/2 cup",
  "cal": 110.0,
  "p": 7.0,
  "c": 20.0,
  "f": 0.5,
  "cat": "Carbs"
 },
 {
  "id": "lentils--cooked",
  "name": "Lentils, cooked",
  "serving": "1/2 cup",
  "cal": 115.0,
  "p": 9.0,
  "c": 20.0,
  "f": 0.4,
  "cat": "Carbs"
 },
 {
  "id": "chickpeas",
  "name": "Chickpeas",
  "serving": "1/2 cup",
  "cal": 135.0,
  "p": 7.0,
  "c": 22.0,
  "f": 2.0,
  "cat": "Carbs"
 },
 {
  "id": "corn",
  "name": "Corn",
  "serving": "1/2 cup",
  "cal": 70.0,
  "p": 2.5,
  "c": 16.0,
  "f": 1.0,
  "cat": "Carbs"
 },
 {
  "id": "banana",
  "name": "Banana",
  "serving": "1 medium",
  "cal": 105.0,
  "p": 1.3,
  "c": 27.0,
  "f": 0.4,
  "cat": "Fruit"
 },
 {
  "id": "apple",
  "name": "Apple",
  "serving": "1 medium",
  "cal": 95.0,
  "p": 0.5,
  "c": 25.0,
  "f": 0.3,
  "cat": "Fruit"
 },
 {
  "id": "blueberries",
  "name": "Blueberries",
  "serving": "1 cup",
  "cal": 85.0,
  "p": 1.0,
  "c": 21.0,
  "f": 0.5,
  "cat": "Fruit"
 },
 {
  "id": "strawberries",
  "name": "Strawberries",
  "serving": "1 cup",
  "cal": 50.0,
  "p": 1.0,
  "c": 12.0,
  "f": 0.5,
  "cat": "Fruit"
 },
 {
  "id": "orange",
  "name": "Orange",
  "serving": "1 medium",
  "cal": 62.0,
  "p": 1.2,
  "c": 15.0,
  "f": 0.2,
  "cat": "Fruit"
 },
 {
  "id": "grapes",
  "name": "Grapes",
  "serving": "1 cup",
  "cal": 100.0,
  "p": 1.0,
  "c": 27.0,
  "f": 0.2,
  "cat": "Fruit"
 },
 {
  "id": "pineapple",
  "name": "Pineapple",
  "serving": "1 cup",
  "cal": 82.0,
  "p": 1.0,
  "c": 22.0,
  "f": 0.2,
  "cat": "Fruit"
 },
 {
  "id": "watermelon",
  "name": "Watermelon",
  "serving": "2 cups",
  "cal": 90.0,
  "p": 2.0,
  "c": 23.0,
  "f": 0.4,
  "cat": "Fruit"
 },
 {
  "id": "raisins",
  "name": "Raisins",
  "serving": "1/4 cup",
  "cal": 125.0,
  "p": 1.0,
  "c": 33.0,
  "f": 0.0,
  "cat": "Fruit"
 },
 {
  "id": "broccoli",
  "name": "Broccoli",
  "serving": "1 cup",
  "cal": 55.0,
  "p": 4.0,
  "c": 11.0,
  "f": 0.6,
  "cat": "Veggies"
 },
 {
  "id": "spinach--raw",
  "name": "Spinach, raw",
  "serving": "2 cups",
  "cal": 14.0,
  "p": 2.0,
  "c": 2.0,
  "f": 0.2,
  "cat": "Veggies"
 },
 {
  "id": "green-beans",
  "name": "Green beans",
  "serving": "1 cup",
  "cal": 35.0,
  "p": 2.0,
  "c": 8.0,
  "f": 0.1,
  "cat": "Veggies"
 },
 {
  "id": "asparagus",
  "name": "Asparagus",
  "serving": "1 cup",
  "cal": 27.0,
  "p": 3.0,
  "c": 5.0,
  "f": 0.2,
  "cat": "Veggies"
 },
 {
  "id": "mixed-salad-greens",
  "name": "Mixed salad greens",
  "serving": "2 cups",
  "cal": 20.0,
  "p": 2.0,
  "c": 4.0,
  "f": 0.2,
  "cat": "Veggies"
 },
 {
  "id": "bell-pepper",
  "name": "Bell pepper",
  "serving": "1 medium",
  "cal": 30.0,
  "p": 1.0,
  "c": 7.0,
  "f": 0.3,
  "cat": "Veggies"
 },
 {
  "id": "cauliflower-rice",
  "name": "Cauliflower rice",
  "serving": "1 cup",
  "cal": 25.0,
  "p": 2.0,
  "c": 5.0,
  "f": 0.3,
  "cat": "Veggies"
 },
 {
  "id": "zucchini",
  "name": "Zucchini",
  "serving": "1 cup",
  "cal": 20.0,
  "p": 1.5,
  "c": 4.0,
  "f": 0.4,
  "cat": "Veggies"
 },
 {
  "id": "carrots",
  "name": "Carrots",
  "serving": "1 cup",
  "cal": 50.0,
  "p": 1.0,
  "c": 12.0,
  "f": 0.3,
  "cat": "Veggies"
 },
 {
  "id": "olive-oil",
  "name": "Olive oil",
  "serving": "1 tbsp",
  "cal": 120.0,
  "p": 0.0,
  "c": 0.0,
  "f": 14.0,
  "cat": "Fats"
 },
 {
  "id": "avocado",
  "name": "Avocado",
  "serving": "1/2 medium",
  "cal": 160.0,
  "p": 2.0,
  "c": 9.0,
  "f": 15.0,
  "cat": "Fats"
 },
 {
  "id": "almonds",
  "name": "Almonds",
  "serving": "1 oz",
  "cal": 165.0,
  "p": 6.0,
  "c": 6.0,
  "f": 14.0,
  "cat": "Fats"
 },
 {
  "id": "peanut-butter",
  "name": "Peanut butter",
  "serving": "2 tbsp",
  "cal": 190.0,
  "p": 7.0,
  "c": 7.0,
  "f": 16.0,
  "cat": "Fats"
 },
 {
  "id": "walnuts",
  "name": "Walnuts",
  "serving": "1 oz",
  "cal": 185.0,
  "p": 4.0,
  "c": 4.0,
  "f": 18.0,
  "cat": "Fats"
 },
 {
  "id": "cashews",
  "name": "Cashews",
  "serving": "1 oz",
  "cal": 160.0,
  "p": 5.0,
  "c": 9.0,
  "f": 13.0,
  "cat": "Fats"
 },
 {
  "id": "butter",
  "name": "Butter",
  "serving": "1 tbsp",
  "cal": 100.0,
  "p": 0.0,
  "c": 0.0,
  "f": 11.0,
  "cat": "Fats"
 },
 {
  "id": "cheddar-cheese",
  "name": "Cheddar cheese",
  "serving": "1 oz",
  "cal": 115.0,
  "p": 7.0,
  "c": 0.4,
  "f": 9.5,
  "cat": "Fats"
 },
 {
  "id": "mozzarella--part-skim",
  "name": "Mozzarella, part-skim",
  "serving": "1 oz",
  "cal": 80.0,
  "p": 7.0,
  "c": 1.0,
  "f": 5.0,
  "cat": "Fats"
 },
 {
  "id": "chia-seeds",
  "name": "Chia seeds",
  "serving": "1 oz",
  "cal": 140.0,
  "p": 5.0,
  "c": 12.0,
  "f": 9.0,
  "cat": "Fats"
 },
 {
  "id": "dark-chocolate",
  "name": "Dark chocolate",
  "serving": "1 oz",
  "cal": 170.0,
  "p": 2.0,
  "c": 13.0,
  "f": 12.0,
  "cat": "Fats"
 },
 {
  "id": "coconut-oil",
  "name": "Coconut oil",
  "serving": "1 tbsp",
  "cal": 120.0,
  "p": 0.0,
  "c": 0.0,
  "f": 13.5,
  "cat": "Fats"
 },
 {
  "id": "greek-yogurt--nonfat-plain",
  "name": "Greek yogurt, nonfat plain",
  "serving": "3/4 cup",
  "cal": 100.0,
  "p": 17.0,
  "c": 6.0,
  "f": 1.0,
  "cat": "Dairy & drinks"
 },
 {
  "id": "cottage-cheese--low-fat",
  "name": "Cottage cheese, low-fat",
  "serving": "1/2 cup",
  "cal": 90.0,
  "p": 12.0,
  "c": 5.0,
  "f": 2.0,
  "cat": "Dairy & drinks"
 },
 {
  "id": "milk--2",
  "name": "Milk, 2%",
  "serving": "1 cup",
  "cal": 120.0,
  "p": 8.0,
  "c": 12.0,
  "f": 5.0,
  "cat": "Dairy & drinks"
 },
 {
  "id": "milk--skim",
  "name": "Milk, skim",
  "serving": "1 cup",
  "cal": 90.0,
  "p": 8.0,
  "c": 12.0,
  "f": 0.0,
  "cat": "Dairy & drinks"
 },
 {
  "id": "almond-milk--unsweetened",
  "name": "Almond milk, unsweetened",
  "serving": "1 cup",
  "cal": 30.0,
  "p": 1.0,
  "c": 1.0,
  "f": 2.5,
  "cat": "Dairy & drinks"
 },
 {
  "id": "orange-juice",
  "name": "Orange juice",
  "serving": "1 cup",
  "cal": 110.0,
  "p": 2.0,
  "c": 26.0,
  "f": 0.5,
  "cat": "Dairy & drinks"
 },
 {
  "id": "protein-shake--ready-to-drink",
  "name": "Protein shake, ready to drink",
  "serving": "11 oz",
  "cal": 160.0,
  "p": 30.0,
  "c": 5.0,
  "f": 3.0,
  "cat": "Dairy & drinks"
 },
 {
  "id": "chocolate-milk",
  "name": "Chocolate milk",
  "serving": "1 cup",
  "cal": 190.0,
  "p": 8.0,
  "c": 27.0,
  "f": 5.0,
  "cat": "Dairy & drinks"
 },
 {
  "id": "sports-drink",
  "name": "Sports drink",
  "serving": "20 oz",
  "cal": 130.0,
  "p": 0.0,
  "c": 34.0,
  "f": 0.0,
  "cat": "Dairy & drinks"
 },
 {
  "id": "black-coffee",
  "name": "Black coffee",
  "serving": "1 cup",
  "cal": 5.0,
  "p": 0.0,
  "c": 0.0,
  "f": 0.0,
  "cat": "Dairy & drinks"
 },
 {
  "id": "cheese-pizza",
  "name": "Cheese pizza",
  "serving": "1 slice",
  "cal": 285.0,
  "p": 12.0,
  "c": 36.0,
  "f": 10.0,
  "cat": "Snacks & treats"
 },
 {
  "id": "peanut-butter---jelly-sandwich",
  "name": "Peanut butter & jelly sandwich",
  "serving": "1 sandwich",
  "cal": 350.0,
  "p": 11.0,
  "c": 46.0,
  "f": 14.0,
  "cat": "Snacks & treats"
 },
 {
  "id": "hummus",
  "name": "Hummus",
  "serving": "2 tbsp",
  "cal": 70.0,
  "p": 2.0,
  "c": 4.0,
  "f": 5.0,
  "cat": "Snacks & treats"
 },
 {
  "id": "popcorn--air-popped",
  "name": "Popcorn, air-popped",
  "serving": "3 cups",
  "cal": 93.0,
  "p": 3.0,
  "c": 19.0,
  "f": 1.0,
  "cat": "Snacks & treats"
 },
 {
  "id": "honey",
  "name": "Honey",
  "serving": "1 tbsp",
  "cal": 64.0,
  "p": 0.0,
  "c": 17.0,
  "f": 0.0,
  "cat": "Snacks & treats"
 },
 {
  "id": "maple-syrup",
  "name": "Maple syrup",
  "serving": "1 tbsp",
  "cal": 52.0,
  "p": 0.0,
  "c": 13.0,
  "f": 0.0,
  "cat": "Snacks & treats"
 },
 {
  "id": "ice-cream",
  "name": "Ice cream",
  "serving": "1/2 cup",
  "cal": 140.0,
  "p": 2.0,
  "c": 16.0,
  "f": 7.0,
  "cat": "Snacks & treats"
 },
 {
  "id": "potato-chips",
  "name": "Potato chips",
  "serving": "1 oz",
  "cal": 150.0,
  "p": 2.0,
  "c": 15.0,
  "f": 10.0,
  "cat": "Snacks & treats"
 }
]

export const FOOD_CATS = ['Protein', 'Carbs', 'Fruit', 'Veggies', 'Fats', 'Dairy & drinks', 'Snacks & treats']

export const MEAL_NAMES: Record<number, string[]> = {
  2: ['Meal 1', 'Meal 2'],
  3: ['Breakfast', 'Lunch', 'Dinner'],
  4: ['Breakfast', 'Lunch', 'Snack', 'Dinner'],
  5: ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Evening snack'],
  6: ['Breakfast', 'Snack 1', 'Lunch', 'Snack 2', 'Dinner', 'Evening snack'],
}
/** Share of the day's macros for each meal. */
export const MEAL_SHARE: Record<number, number[]> = {
  2: [0.5, 0.5], 3: [0.3, 0.4, 0.3], 4: [0.28, 0.3, 0.14, 0.28], 5: [0.25, 0.27, 0.12, 0.26, 0.1], 6: [0.2, 0.1, 0.22, 0.1, 0.28, 0.1],
}
