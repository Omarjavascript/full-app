export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fat: number;     // in grams
  servingSize: number;
  servingUnit: string;
  category?: string;
}

export interface LogEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingAmount: number; // multiplier of servingSize
}

export interface UserProfile {
  userId: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number; // in kg
  height: number; // in cm
  activityLevel: 'sedentary' | 'moderate' | 'active';
  goal: 'lose' | 'maintain' | 'gain';
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  isE2EEnabled: boolean;
  language: 'en' | 'es' | 'fr';
  biometricEnabled: boolean;
  securityPIN?: string;
}

export interface MedicationEntry {
  id: string;
  name: string;
  dosage: string;
  time: string; // HH:MM
  takenDates: string[]; // YYYY-MM-DD
  active: boolean;
}

export interface CustomMealPlan {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: {
    breakfast: MealPlanItem;
    lunch: MealPlanItem;
    dinner: MealPlanItem;
    snack: MealPlanItem;
  };
  createdAt: number;
}

export interface MealPlanItem {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
}
