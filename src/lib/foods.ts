import { FoodItem } from '../types';

export const curatedFoods: FoodItem[] = [
  { id: '1', name: 'Oatmeal (cooked)', calories: 150, protein: 6, carbs: 27, fat: 3, servingSize: 234, servingUnit: 'g', category: 'Breakfast' },
  { id: '2', name: 'Whole Large Egg', calories: 70, protein: 6, carbs: 0.6, fat: 5, servingSize: 50, servingUnit: 'g', category: 'Protein' },
  { id: '3', name: 'Chicken Breast (cooked, boneless)', calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: 100, servingUnit: 'g', category: 'Protein' },
  { id: '4', name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, servingSize: 118, servingUnit: 'g', category: 'Fruit' },
  { id: '5', name: 'White Rice (cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: 100, servingUnit: 'g', category: 'Carbohydrates' },
  { id: '6', name: 'Salmon Fillet (cooked)', calories: 206, protein: 22, carbs: 0, fat: 12, servingSize: 100, servingUnit: 'g', category: 'Protein' },
  { id: '7', name: 'Avocado (medium)', calories: 240, protein: 3, carbs: 12, fat: 22, servingSize: 150, servingUnit: 'g', category: 'Fats' },
  { id: '8', name: 'Almonds', calories: 164, protein: 6, carbs: 6, fat: 14, servingSize: 28, servingUnit: 'g', category: 'Snack' },
  { id: '9', name: 'Broccoli (steamed)', calories: 35, protein: 2.8, carbs: 7, fat: 0.4, servingSize: 100, servingUnit: 'g', category: 'Vegetable' },
  { id: '10', name: 'Sweet Potato (baked)', calories: 90, protein: 2, carbs: 21, fat: 0.2, servingSize: 100, servingUnit: 'g', category: 'Carbohydrates' },
  { id: '11', name: 'Greek Yogurt (plain, non-fat)', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: 100, servingUnit: 'g', category: 'Dairy' },
  { id: '12', name: 'Apple (medium)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, servingSize: 182, servingUnit: 'g', category: 'Fruit' },
  { id: '13', name: 'Peanut Butter (creamy)', calories: 188, protein: 8, carbs: 6, fat: 16, servingSize: 32, servingUnit: 'g', category: 'Fats' },
  { id: '14', name: 'Tuna (canned in water)', calories: 128, protein: 26, carbs: 0, fat: 3, servingSize: 100, servingUnit: 'g', category: 'Protein' },
  { id: '15', name: 'Olive Oil', calories: 119, protein: 0, carbs: 0, fat: 13.5, servingSize: 14, servingUnit: 'ml', category: 'Fats' },
  { id: '16', name: 'Whole Wheat Bread (1 slice)', calories: 80, protein: 4, carbs: 15, fat: 1, servingSize: 30, servingUnit: 'g', category: 'Carbohydrates' },
  { id: '17', name: 'Spinach (raw)', calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1, servingSize: 30, servingUnit: 'g', category: 'Vegetable' },
  { id: '18', name: 'Black Beans (boiled)', calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5, servingSize: 100, servingUnit: 'g', category: 'Carbohydrates' },
  { id: '19', name: 'Cottage Cheese (2%)', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, servingSize: 100, servingUnit: 'g', category: 'Dairy' },
  { id: '20', name: 'Ribeye Steak (cooked)', calories: 291, protein: 24, carbs: 0, fat: 21, servingSize: 100, servingUnit: 'g', category: 'Protein' },
  { id: '21', name: 'Quinoa (cooked)', calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, servingSize: 100, servingUnit: 'g', category: 'Carbohydrates' },
  { id: '22', name: 'Milk (whole, 3.25%)', calories: 149, protein: 8, carbs: 12, fat: 8, servingSize: 244, servingUnit: 'ml', category: 'Dairy' },
  { id: '23', name: 'Blueberries (fresh)', calories: 84, protein: 1.1, carbs: 21, fat: 0.5, servingSize: 148, servingUnit: 'g', category: 'Fruit' },
  { id: '24', name: 'Protein Powder (Whey)', calories: 120, protein: 24, carbs: 3, fat: 1.5, servingSize: 30, servingUnit: 'g', category: 'Snack' },
  { id: '25', name: 'White Potato (boiled)', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: 100, servingUnit: 'g', category: 'Carbohydrates' }
];

export function searchFoods(query: string): FoodItem[] {
  if (!query) return curatedFoods;
  const lowerQuery = query.toLowerCase();
  return curatedFoods.filter(f => f.name.toLowerCase().includes(lowerQuery));
}

/**
 * Interface for the API-returned food estimation
 */
export interface FoodEstimateResponse {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  isAiEstimated: boolean;
}
