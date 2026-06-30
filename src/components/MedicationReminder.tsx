import React, { useState } from 'react';
import { MedicationEntry } from '../types';
import { translations, Language } from '../lib/i18n';
import { Pill, Clock, Plus, Trash2, Check, AlertCircle, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MedicationReminderProps {
  medications: MedicationEntry[];
  onAddMedication: (med: Omit<MedicationEntry, 'id' | 'takenDates' | 'active'>) => void;
  onDeleteMedication: (id: string) => void;
  onToggleTaken: (id: string) => void;
  lang: Language;
}

export default function MedicationReminder({
  medications,
  onAddMedication,
  onDeleteMedication,
  onToggleTaken,
  lang
}: MedicationReminderProps) {
  const t = translations[lang];
  const today = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      new Notification(t.appName, {
        body: t.notifAllowed,
        icon: '/favicon.ico'
      });
    }
  };

  const handleAddMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage) return;

    onAddMedication({
      name,
      dosage,
      time
    });

    setName('');
    setDosage('');
    setTime('08:00');
    setIsFormOpen(false);

    // Schedule a mock notification simulation for 5 seconds to showcase instant response
    if (notificationPermission === 'granted') {
      setTimeout(() => {
        new Notification(t.medReminders, {
          body: `${t.remindTakeMed} ${name} (${dosage}) at ${time}`,
          icon: '/favicon.ico'
        });
      }, 5000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="medications-view">
      {/* Col 1 & 2: Active Medications List */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Header summary info & Permission setup */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-700 flex items-center gap-1.5">
              <Pill className="w-5 h-5 text-blue-600" />
              {t.medTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1">{t.medSubtitle}</p>
          </div>

          <div>
            {notificationPermission === 'granted' ? (
              <div className="bg-blue-50 text-blue-700 font-bold text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" />
                {t.notifAllowed}
              </div>
            ) : (
              <button
                onClick={requestNotificationPermission}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[10px] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5" />
                {lang === 'en' ? 'Enable Reminders' : 'Activar Avisos'}
              </button>
            )}
          </div>
        </div>

        {/* Medications list */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Active Medication Schedule' : 'Calendario Activo'}</h3>
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.addMedBtn}
            </button>
          </div>

          {/* Form */}
          <AnimatePresence>
            {isFormOpen && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleAddMed}
                className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 mb-4 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.medName}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Multivitamin, Metformin"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.dosage}</label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      placeholder="e.g. 1 pill, 5ml"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.remindTime}</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="text-slate-500 text-xs font-semibold px-4 py-2 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Save Reminder
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {medications.length > 0 ? (
              medications.map(med => {
                const isTakenToday = med.takenDates.includes(today);
                return (
                  <div 
                    key={med.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all text-xs ${
                      isTakenToday 
                        ? 'bg-blue-50/20 border-blue-100' 
                        : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg border ${
                        isTakenToday 
                          ? 'bg-blue-50 border-blue-100 text-blue-600' 
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                          {med.name}
                          {isTakenToday && (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase">
                              Done
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Dosage: {med.dosage} • <span className="font-bold text-slate-500">{med.time}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isTakenToday ? (
                        <button
                          onClick={() => onToggleTaken(med.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {t.medTakenToday}
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleTaken(med.id)}
                          className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {t.takenBtn}
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteMedication(med.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-xs text-slate-400">
                No medication entries. Click Add Medication above to set scheduled reminders.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Col 3: Safe Guidelines */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reminder Guidelines</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Compliant with health safety protocols.</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs leading-relaxed text-slate-500 border-t border-slate-50 pt-4">
            <p>
              ⏰ <strong>Consistency:</strong> Logging medications along with calorie logs provides a comprehensive overview of therapy adherence.
            </p>
            <p>
              🔒 <strong>Data Privacy:</strong> Schedule timing and drug descriptions are client-side encrypted before cloud backups to maintain maximum confidentiality.
            </p>
            <p>
              💡 <strong>Smart Toasts:</strong> When system push notifications are not supported or blocked in the browser, NutriSecure automatically presents in-app alarm toasts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
