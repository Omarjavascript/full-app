import React from 'react';
import { LogEntry, UserProfile } from '../types';
import { translations, Language } from '../lib/i18n';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Activity, Flame, Target, Trophy, Sparkles, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  logs: LogEntry[];
  profile: UserProfile;
  lang: Language;
}

export default function Dashboard({ logs, profile, lang }: DashboardProps) {
  const t = translations[lang];
  const today = new Date().toISOString().split('T')[0];

  // Calculate today's consumed macros and calories
  const todayLogs = logs.filter(entry => entry.date === today);
  const totalCalories = todayLogs.reduce((acc, curr) => acc + curr.calories * curr.servingAmount, 0);
  const totalProtein = todayLogs.reduce((acc, curr) => acc + curr.protein * curr.servingAmount, 0);
  const totalCarbs = todayLogs.reduce((acc, curr) => acc + curr.carbs * curr.servingAmount, 0);
  const totalFat = todayLogs.reduce((acc, curr) => acc + curr.fat * curr.servingAmount, 0);

  const calRemaining = Math.max(0, profile.dailyCalorieTarget - totalCalories);
  const calPercent = Math.min(100, (totalCalories / profile.dailyCalorieTarget) * 100);

  const proteinPercent = Math.min(100, (totalProtein / profile.proteinTarget) * 100);
  const carbsPercent = Math.min(100, (totalCarbs / profile.carbsTarget) * 100);
  const fatPercent = Math.min(100, (totalFat / profile.fatTarget) * 100);

  // Generate 7 days charts data
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', { weekday: 'short' });
      
      const dayLogs = logs.filter(log => log.date === dayStr);
      const dayCalories = Math.round(dayLogs.reduce((acc, curr) => acc + curr.calories * curr.servingAmount, 0));
      
      data.push({
        name: dayName,
        calories: dayCalories,
        target: profile.dailyCalorieTarget,
      });
    }
    return data;
  };

  const chartData = getLast7DaysData();

  return (
    <div className="space-y-6" id="dashboard-tab-panel">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Calorie Circle Progress Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center text-center justify-between min-h-[300px]"
          id="main-calorie-card"
        >
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-50">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-sm">
              <Flame className="w-4 h-4 text-blue-600 fill-blue-600/20" />
              {t.calorieSummary}
            </span>
            <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {Math.round(calPercent)}%
            </span>
          </div>

          <div className="relative my-6 flex items-center justify-center">
            {/* SVG Calorie Circle */}
            <svg className="w-40 h-44 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                className="stroke-slate-50"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                className="stroke-blue-600 transition-all duration-500"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={440}
                strokeDashoffset={440 - (440 * calPercent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tracking-tight text-slate-800 font-mono">
                {Math.round(totalCalories)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                / {profile.dailyCalorieTarget} kcal
              </span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 text-left border-t border-slate-50 pt-3">
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{t.caloriesRemaining}</p>
              <p className="text-lg font-bold text-slate-700 font-mono flex items-center gap-1">
                {calRemaining}
                <span className="text-xs text-slate-400 font-normal">kcal</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{t.caloriesConsumed}</p>
              <p className="text-lg font-bold text-slate-700 font-mono flex items-center gap-1 justify-end">
                {Math.round(totalCalories)}
                <span className="text-xs text-slate-400 font-normal">kcal</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Macronutrients breakdown */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between"
          id="macros-summary-card"
        >
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-50">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-sm">
              <Activity className="w-4 h-4 text-blue-600" />
              {t.macros}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Today's Grams
            </span>
          </div>

          {/* Macro sliders */}
          <div className="space-y-5 my-4">
            {/* Protein */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>{t.protein}</span>
                <span className="font-mono">{Math.round(totalProtein)}g / {profile.proteinTarget}g</span>
              </div>
              <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-400 rounded-full transition-all duration-500" 
                  style={{ width: `${proteinPercent}%` }} 
                />
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>{t.carbs}</span>
                <span className="font-mono">{Math.round(totalCarbs)}g / {profile.carbsTarget}g</span>
              </div>
              <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                  style={{ width: `${carbsPercent}%` }} 
                />
              </div>
            </div>

            {/* Fat */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>{t.fat}</span>
                <span className="font-mono">{Math.round(totalFat)}g / {profile.fatTarget}g</span>
              </div>
              <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-400 rounded-full transition-all duration-500" 
                  style={{ width: `${fatPercent}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-[11px] leading-snug text-slate-500">
              Balanced ratios help optimize energy, focus, and blood sugar control throughout the day.
            </p>
          </div>
        </motion.div>

        {/* Motivational Stats Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between"
          id="compliance-stats-card"
        >
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-50">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Health Insights
            </span>
          </div>

          <div className="space-y-4 my-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700">Healthy Habits Streak</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">You logged meals 3 days in a row. Keep it up!</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700">Water intake status</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Hydration levels are nominal for your BMI targets.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-50">
            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {t.complianceBadge}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {t.e2eeBadge}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress Line Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs"
        id="weekly-progress-chart-card"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">{t.weeklyProgress}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Comparing intake versus your goal calorie ceiling.</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 mr-2">{t.weeklyGoal}:</span>
            <span className="text-xs font-bold text-slate-700 font-mono">{profile.dailyCalorieTarget} kcal</span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderColor: '#f1f5f9', 
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="calories" 
                stroke="#2563eb" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorCalories)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
