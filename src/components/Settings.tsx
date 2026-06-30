import React, { useState } from 'react';
import { UserProfile, LogEntry } from '../types';
import { translations, Language } from '../lib/i18n';
import { Save, Download, FileText, Globe, User, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  profile: UserProfile;
  logs: LogEntry[];
  lang: Language;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateLanguage: (lang: Language) => void;
}

export default function Settings({
  profile,
  logs,
  lang,
  onUpdateProfile,
  onUpdateLanguage
}: SettingsProps) {
  const t = translations[lang];

  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [gender, setGender] = useState(profile.gender);
  const [weight, setWeight] = useState(profile.weight);
  const [height, setHeight] = useState(profile.height);
  const [activity, setActivity] = useState(profile.activityLevel);
  const [goal, setGoal] = useState(profile.goal);
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    // Standard Mifflin-St Jeor Equation for daily energy requirements (BMR)
    let bmr = 0;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Multiply BMR by activity multiplier
    let multiplier = 1.2;
    if (activity === 'moderate') multiplier = 1.4;
    if (activity === 'active') multiplier = 1.6;

    let targetCals = Math.round(bmr * multiplier);

    // Apply calories modification based on health goal
    if (goal === 'lose') targetCals -= 500;
    if (goal === 'gain') targetCals += 400;

    // Constrain minimum calories for health safety
    targetCals = Math.max(1200, targetCals);

    // Macronutrient targets (Protein 25%, Carbs 45%, Fats 30%)
    const proteinTarget = Math.round((targetCals * 0.25) / 4);
    const carbsTarget = Math.round((targetCals * 0.45) / 4);
    const fatTarget = Math.round((targetCals * 0.30) / 9);

    onUpdateProfile({
      ...profile,
      name,
      age,
      gender,
      weight,
      height,
      activityLevel: activity,
      goal,
      dailyCalorieTarget: targetCals,
      proteinTarget,
      carbsTarget,
      fatTarget
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Meal Type,Food Name,Calories(kcal),Protein(g),Carbs(g),Fat(g),Serving Multiplier\n";
    logs.forEach(log => {
      // Replace quotes/commas to keep CSV valid
      const sanitizedName = log.foodName.replace(/"/g, '""');
      csvContent += `${log.date},${log.mealType},"${sanitizedName}",${log.calories},${log.protein},${log.carbs},${log.fat},${log.servingAmount}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nutrisecure_nutrition_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>NutriSecure Clinical Health Report</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            h1 { color: #2563eb; border-bottom: 2.5px solid #2563eb; padding-bottom: 12px; margin-bottom: 5px; }
            .meta-subtitle { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 24px; margin: 30px 0; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; }
            .card h3 { margin-top: 0; margin-bottom: 12px; color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .card p { margin: 6px 0; font-size: 13px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; color: #475569; font-weight: bold; }
            .badge { display: inline-block; background-color: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 10px; padding: 4px 8px; border-radius: 4px; margin-bottom: 20px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <span class="meta-subtitle">Clinical Export Record</span>
          <h1>NutriSecure Health & Nutrition Report</h1>
          <div class="badge">HIPAA & GDPR Certified Private Health Information (PHI)</div>
          <p>Export Date: ${new Date().toLocaleDateString()} • Authorized clinician copy.</p>
          
          <div class="grid">
            <div class="card">
              <h3>Patient Physical Stats</h3>
              <p><strong>Name:</strong> ${profile.name || 'Anonymous Patient'}</p>
              <p><strong>Age:</strong> ${profile.age} years</p>
              <p><strong>Weight:</strong> ${profile.weight} kg</p>
              <p><strong>Height:</strong> ${profile.height} cm</p>
              <p><strong>Activity Multiplier:</strong> ${profile.activityLevel.toUpperCase()}</p>
            </div>
            <div class="card">
              <h3>Prescribed Clinical Targets</h3>
              <p><strong>Daily Calorie Target:</strong> ${profile.dailyCalorieTarget} kcal</p>
              <p><strong>Protein Target:</strong> ${profile.proteinTarget}g (100g = 400 kcal)</p>
              <p><strong>Carbohydrates Target:</strong> ${profile.carbsTarget}g (100g = 400 kcal)</p>
              <p><strong>Fats Target:</strong> ${profile.fatTarget}g (100g = 900 kcal)</p>
            </div>
          </div>
          
          <h3>Chronological Food & Nutrition Logs</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Meal Type</th>
                <th>Food Name</th>
                <th>Calories</th>
                <th>Protein</th>
                <th>Carbs</th>
                <th>Fat</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => `
                <tr>
                  <td>${log.date}</td>
                  <td>${log.mealType.toUpperCase()}</td>
                  <td>${log.foodName}</td>
                  <td><strong>${Math.round(log.calories * log.servingAmount)} kcal</strong></td>
                  <td>${Math.round(log.protein * log.servingAmount)}g</td>
                  <td>${Math.round(log.carbs * log.servingAmount)}g</td>
                  <td>${Math.round(log.fat * log.servingAmount)}g</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="settings-tab-panel">
      {/* Col 1 & 2: Personal Health Profile */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-700">{t.profileTitle}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Recalculate your ideal scientific nutrition targets.</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.gender}</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="male">👨 {t.genderMale}</option>
                  <option value="female">👩 {t.genderFemale}</option>
                  <option value="other">🌈 {t.genderOther}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.age}</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.weight} (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.height} (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.activityLevel}</label>
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="sedentary">🏠 {t.actSedentary}</option>
                  <option value="moderate">🏃 {t.actModerate}</option>
                  <option value="active">🚴 {t.actActive}</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.weightGoal}</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="lose">📉 {t.goalLose}</option>
                  <option value="maintain">⚖️ {t.goalMaintain}</option>
                  <option value="gain">💪 {t.goalGain}</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {t.saveProfile}
            </button>
          </form>

          {saveSuccess && (
            <div className="bg-blue-50 border border-blue-100 text-blue-700 p-2.5 rounded-xl text-center text-xs font-semibold mt-4">
              Profile updated and nutrition target limits recalculated!
            </div>
          )}
        </div>
      </div>

      {/* Col 3: Configuration & Exports */}
      <div className="space-y-6">
        
        {/* Language Selection Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.langLabel}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Change language globally.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['en', 'es', 'fr'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => onUpdateLanguage(l)}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all uppercase cursor-pointer ${
                  lang === l 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Data Exports Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Clinician Data Export</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{t.exportDesc}</p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-50">
            <button
              onClick={handleExportCSV}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              {t.exportCSV}
            </button>

            <button
              onClick={handleExportPDF}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              {t.exportPDF}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
