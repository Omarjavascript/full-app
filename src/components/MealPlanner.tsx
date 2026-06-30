import React, { useState } from 'react';
import { UserProfile, CustomMealPlan, LogEntry } from '../types';
import { translations, Language } from '../lib/i18n';
import { Sparkles, Brain, Check, Calendar, ArrowRight, Salad, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MealPlannerProps {
  profile: UserProfile;
  lang: Language;
  onAddLog: (entry: Omit<LogEntry, 'id' | 'userId' | 'timestamp'>) => void;
}

export default function MealPlanner({ profile, lang, onAddLog }: MealPlannerProps) {
  const t = translations[lang];
  const today = new Date().toISOString().split('T')[0];

  const [diet, setDiet] = useState<string>('balanced');
  const [allergies, setAllergies] = useState<string>('');
  const [targetCalories, setTargetCalories] = useState<number>(profile.dailyCalorieTarget);
  const [mealPlan, setMealPlan] = useState<CustomMealPlan | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loggedStatus, setLoggedStatus] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setMealPlan(null);
    setLoggedStatus(false);

    try {
      const response = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyCalorieTarget: targetCalories,
          preference: diet,
          allergies: allergies || 'none',
          language: lang
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact Gemini AI");
      }

      const plan: CustomMealPlan = await response.json();
      setMealPlan(plan);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(lang === 'en' 
        ? 'Could not connect to AI planner. Please try again.' 
        : lang === 'es' 
        ? 'No se pudo conectar al planificador de IA. Intente de nuevo.' 
        : "Erreur de connexion au planificateur IA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogWholePlan = () => {
    if (!mealPlan) return;
    
    // Log breakfast
    onAddLog({
      date: today,
      mealType: 'breakfast',
      foodName: `🍳 ${mealPlan.meals.breakfast.name}`,
      calories: mealPlan.meals.breakfast.calories,
      protein: mealPlan.meals.breakfast.protein,
      carbs: mealPlan.meals.breakfast.carbs,
      fat: mealPlan.meals.breakfast.fat,
      servingAmount: 1
    });

    // Log lunch
    onAddLog({
      date: today,
      mealType: 'lunch',
      foodName: `🥗 ${mealPlan.meals.lunch.name}`,
      calories: mealPlan.meals.lunch.calories,
      protein: mealPlan.meals.lunch.protein,
      carbs: mealPlan.meals.lunch.carbs,
      fat: mealPlan.meals.lunch.fat,
      servingAmount: 1
    });

    // Log dinner
    onAddLog({
      date: today,
      mealType: 'dinner',
      foodName: `🍛 ${mealPlan.meals.dinner.name}`,
      calories: mealPlan.meals.dinner.calories,
      protein: mealPlan.meals.dinner.protein,
      carbs: mealPlan.meals.dinner.carbs,
      fat: mealPlan.meals.dinner.fat,
      servingAmount: 1
    });

    // Log snack
    onAddLog({
      date: today,
      mealType: 'snack',
      foodName: `🍎 ${mealPlan.meals.snack.name}`,
      calories: mealPlan.meals.snack.calories,
      protein: mealPlan.meals.snack.protein,
      carbs: mealPlan.meals.snack.carbs,
      fat: mealPlan.meals.snack.fat,
      servingAmount: 1
    });

    setLoggedStatus(true);
  };

  return (
    <div className="space-y-6" id="meal-planner-view">
      {/* Configuration Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-700">{t.plannerTitle}</h2>
            <p className="text-xs text-slate-400 mt-1">{t.plannerSubtitle}</p>
          </div>
        </div>

        <form onSubmit={handleGeneratePlan} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t.dietPreference}</label>
            <select
              value={diet}
              onChange={(e) => setDiet(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="balanced">🥗 {t.dietBalanced}</option>
              <option value="keto">🥩 {t.dietKeto}</option>
              <option value="vegan">🌱 {t.dietVegan}</option>
              <option value="vegetarian">🥚 {t.dietVegetarian}</option>
              <option value="paleo">🍖 {t.dietPaleo}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t.allergiesLabel}</label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. peanuts, dairy, shellfish"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t.caloriesTarget} (kcal)</label>
            <input
              type="number"
              value={targetCalories}
              onChange={(e) => setTargetCalories(Number(e.target.value))}
              placeholder="2000"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-white/10" />
              {isLoading ? t.generatingPlan : t.generatePlanBtn}
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs mt-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Generated Plan Render */}
      <AnimatePresence>
        {mealPlan && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="space-y-6"
            id="meal-plan-result"
          >
            {/* Header info */}
            <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  AI Plan Active
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-2">{mealPlan.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Daily Targets Met: <span className="font-bold text-slate-700">{mealPlan.calories} kcal</span> • 
                  P: <span className="font-bold text-slate-700">{mealPlan.protein}g</span>, 
                  C: <span className="font-bold text-slate-700">{mealPlan.carbs}g</span>, 
                  F: <span className="font-bold text-slate-700">{mealPlan.fat}g</span>
                </p>
              </div>

              <div>
                {loggedStatus ? (
                  <div className="bg-blue-600 text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center gap-1.5 shadow-sm">
                    <Check className="w-4 h-4" />
                    {t.planLoggedSuccess}
                  </div>
                ) : (
                  <button
                    onClick={handleLogWholePlan}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    {t.logEntirePlan}
                  </button>
                )}
              </div>
            </div>

            {/* Individual Meal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(mealPlan.meals).map(([key, rawMeal]) => {
                const meal = rawMeal as any;
                return (
                  <div key={key} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-50 mb-4">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full">
                          {key === 'breakfast' ? t.breakfast : key === 'lunch' ? t.lunch : key === 'dinner' ? t.dinner : t.snack}
                        </span>
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          {meal.calories} kcal
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-800">{meal.name}</h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{meal.description}</p>

                      {/* Ingredients list */}
                      {meal.ingredients && meal.ingredients.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.ingredients}</p>
                           <div className="flex flex-wrap gap-1.5">
                            {meal.ingredients.map((ing, idx) => (
                              <span key={idx} className="text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Macros line bar */}
                    <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-50 text-[10px] font-mono font-semibold text-slate-500">
                      <div className="bg-blue-50/50 p-1.5 rounded-lg border border-blue-100/30 text-center">
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wide">PRO</span>
                        {meal.protein}g
                      </div>
                      <div className="bg-amber-50/50 p-1.5 rounded-lg border border-amber-100/30 text-center">
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wide">CARB</span>
                        {meal.carbs}g
                      </div>
                      <div className="bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/30 text-center">
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wide">FAT</span>
                        {meal.fat}g
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
