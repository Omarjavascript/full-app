import React, { useState } from 'react';
import { FoodItem, LogEntry } from '../types';
import { translations, Language } from '../lib/i18n';
import { curatedFoods, searchFoods, FoodEstimateResponse } from '../lib/foods';
import { Search, Plus, Trash2, Calendar, Coffee, Utensils, Moon, Compass, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FoodLoggerProps {
  logs: LogEntry[];
  onAddLog: (entry: Omit<LogEntry, 'id' | 'userId' | 'timestamp'>) => void;
  onDeleteLog: (id: string) => void;
  lang: Language;
}

export default function FoodLogger({ logs, onAddLog, onDeleteLog, lang }: FoodLoggerProps) {
  const t = translations[lang];
  const today = new Date().toISOString().split('T')[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [servingAmount, setServingAmount] = useState<number>(1);
  
  // Custom manual logging fields
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);

  // AI search state
  const [isAiEstimating, setIsAiEstimating] = useState(false);
  const [aiError, setAiError] = useState('');

  const todayLogs = logs.filter(entry => entry.date === today);

  const filteredFoods = searchFoods(searchQuery);

  const handleSelectFood = (food: FoodItem) => {
    onAddLog({
      date: today,
      mealType,
      foodName: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      servingAmount
    });
    setSearchQuery('');
  };

  const handleLogCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customCalories) return;

    onAddLog({
      date: today,
      mealType,
      foodName: customName,
      calories: Number(customCalories) || 0,
      protein: Number(customProtein) || 0,
      carbs: Number(customCarbs) || 0,
      fat: Number(customFat) || 0,
      servingAmount: 1
    });

    // Reset fields
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setIsCustomExpanded(false);
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAiEstimating(true);
    setAiError('');

    try {
      const response = await fetch(`/api/food-estimate?query=${encodeURIComponent(searchQuery)}&lang=${lang}`);
      if (!response.ok) {
        throw new Error("Failed to contact nutrition calculator");
      }
      const data: FoodEstimateResponse = await response.json();
      
      onAddLog({
        date: today,
        mealType,
        foodName: `✨ ${data.name} (${t.estimatedByAI})`,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        servingAmount: 1
      });

      setSearchQuery('');
    } catch (e: any) {
      setAiError(lang === 'en' 
        ? 'Could not connect to AI. Please try standard food items or log manually.' 
        : lang === 'es' 
        ? 'No se pudo conectar a la IA. Intente con alimentos estándar o registre manualmente.' 
        : "Impossible de se connecter à l'IA. Essayez des aliments standard.");
    } finally {
      setIsAiEstimating(false);
    }
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'lunch': return <Utensils className="w-4 h-4 text-blue-600" />;
      case 'dinner': return <Moon className="w-4 h-4 text-indigo-500" />;
      default: return <Compass className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="food-logger-section">
      {/* Col 1 & 2: Food Search and Logs */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Search & DB Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-blue-600" />
            {lang === 'en' ? 'Search & Log Foods' : lang === 'es' ? 'Buscar y Registrar' : 'Rechercher et Enregistrer'}
          </h2>

          {/* Config row: meal type & serving size */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t.mealType}</label>
              <select 
                value={mealType} 
                onChange={(e) => setMealType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="breakfast">🍳 {t.breakfast}</option>
                <option value="lunch">🥗 {t.lunch}</option>
                <option value="dinner">🍛 {t.dinner}</option>
                <option value="snack">🍎 {t.snack}</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t.servingAmount}</label>
              <select 
                value={servingAmount} 
                onChange={(e) => setServingAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value={0.5}>0.5x Portion</option>
                <option value={1}>1.0x Portion</option>
                <option value={1.5}>1.5x Portion</option>
                <option value={2}>2.0x Portion</option>
                <option value={3}>3.0x Portion</option>
              </select>
            </div>

            <div className="col-span-2 md:col-span-1 flex items-end">
              <button
                onClick={() => setIsCustomExpanded(!isCustomExpanded)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold py-2 px-3 rounded-xl transition-all"
              >
                {isCustomExpanded ? 'Hide Custom Entry' : '✍️ Custom Entry'}
              </button>
            </div>
          </div>

          {/* Search Inputs */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchFood}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-24 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              
              {/* AI Button inside search */}
              <button
                onClick={handleAiSearch}
                disabled={isAiEstimating || !searchQuery.trim()}
                className="absolute right-2 top-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {isAiEstimating ? '...' : <Sparkles className="w-3 h-3" />}
                {t.aiSearchBtn}
              </button>
            </div>

            {aiError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{aiError}</p>
              </div>
            )}

            {/* Curated food matching results list */}
            {searchQuery && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 bg-slate-50/50"
              >
                {filteredFoods.length > 0 ? (
                  filteredFoods.map(food => (
                    <div 
                      key={food.id}
                      onClick={() => handleSelectFood(food)}
                      className="p-3 hover:bg-white cursor-pointer transition-all flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-700">{food.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {food.servingSize} {food.servingUnit} • {t.protein}: {food.protein}g, {t.carbs}: {food.carbs}g, {t.fat}: {food.fat}g
                        </p>
                      </div>
                      <span className="font-bold text-blue-600 font-mono flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md">
                        +{food.calories * servingAmount} <span className="text-[9px] font-normal text-slate-400">kcal</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No exact match. Try clicking the <strong className="text-blue-600 font-semibold">AI Search</strong> button above to estimate the nutrition of "{searchQuery}" automatically!
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Manual Custom Logging Entry Form */}
        <AnimatePresence>
          {isCustomExpanded && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleLogCustom}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4 overflow-hidden"
              id="custom-log-form"
            >
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.customFoodTitle}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.foodName}</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Oatmeal with almond milk"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.calories} (kcal)</label>
                  <input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    placeholder="250"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.protein} (g)</label>
                  <input
                    type="number"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    placeholder="15"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.carbs} (g)</label>
                  <input
                    type="number"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    placeholder="30"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.fat} (g)</label>
                  <input
                    type="number"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    placeholder="5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                {t.logEntryBtn}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Todays Food Logs List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            {t.historyTitle}
          </h2>

          <div className="space-y-3">
            {todayLogs.length > 0 ? (
              todayLogs.map(log => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white border border-slate-100 rounded-lg shadow-2xs mt-0.5">
                      {getMealIcon(log.mealType)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">{log.foodName}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {log.servingAmount}x serving • {t.protein}: {Math.round(log.protein * log.servingAmount)}g, {t.carbs}: {Math.round(log.carbs * log.servingAmount)}g, {t.fat}: {Math.round(log.fat * log.servingAmount)}g
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700 font-mono bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
                      {Math.round(log.calories * log.servingAmount)} kcal
                    </span>
                    <button
                      onClick={() => onDeleteLog(log.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                      title="Delete log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                {t.noEntries}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Col 3: Quick list of popular foods with quick logs */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            {lang === 'en' ? 'Quick Add Foods' : lang === 'es' ? 'Alimentos Frecuentes' : 'Ajout Rapide'}
          </h2>

          <div className="space-y-2">
            {curatedFoods.slice(0, 8).map(food => (
              <div 
                key={food.id}
                className="p-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-700">{food.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {food.calories} kcal / {food.servingSize}{food.servingUnit}
                  </p>
                </div>
                <button
                  onClick={() => handleSelectFood(food)}
                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all cursor-pointer"
                  title="Quick add"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
