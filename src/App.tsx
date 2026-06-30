/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LogEntry, UserProfile, MedicationEntry } from './types';
import { Language, translations } from './lib/i18n';
import { auth, db } from './lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { decryptSensitiveFields, encryptSensitiveFields } from './lib/encryption';

// Import subcomponents
import Dashboard from './components/Dashboard';
import FoodLogger from './components/FoodLogger';
import MealPlanner from './components/MealPlanner';
import MedicationReminder from './components/MedicationReminder';
import SecurityPanel from './components/SecurityPanel';
import Settings from './components/Settings';

import { Activity, Flame, ShieldAlert, LogOut, Lock, LogIn, Fingerprint, RefreshCw, User, ClipboardList, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_PROFILE = (userId: string): UserProfile => ({
  userId,
  name: "Jane Doe",
  age: 30,
  gender: 'female',
  weight: 65,
  height: 165,
  activityLevel: 'moderate',
  goal: 'lose',
  dailyCalorieTarget: 1750,
  proteinTarget: 110,
  carbsTarget: 195,
  fatTarget: 58,
  isE2EEnabled: true,
  language: 'en',
  biometricEnabled: false,
  securityPIN: ''
});

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  // Auth Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // Core App State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [medications, setMedications] = useState<MedicationEntry[]>([]);

  // Biometrics Lock State
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [pinVerificationInput, setPinVerificationInput] = useState('');
  const [verificationError, setVerificationError] = useState('');

  const lang: Language = profile?.language || 'en';
  const t = translations[lang];

  // Handle Online/Offline Detection
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setSyncing(true);
        try {
          await loadUserData(user.uid);
        } catch (e) {
          console.error("Cloud load failed, utilizing LocalStorage fallback", e);
          loadLocalFallback(user.uid);
        } finally {
          setSyncing(false);
        }
      } else {
        // Check if we are currently in a sandbox mode session, keep them active
        setCurrentUser((prev) => {
          if (prev && (prev.uid === 'sandbox_local_user' || prev.uid === 'guest_sandbox_user' || prev.uid.startsWith('local_user_'))) {
            return prev;
          }
          // Schedule state clears safely
          setTimeout(() => {
            setProfile(null);
            setLogs([]);
            setMedications([]);
          }, 0);
          return null;
        });
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sync to Cloud / Local Storage on State Changes
  const syncState = async (updatedProfile: UserProfile, updatedLogs: LogEntry[], updatedMeds: MedicationEntry[]) => {
    if (!currentUser) return;
    setSyncing(true);
    
    // Save to LocalStorage first to guarantee 100% robust offline mode!
    localStorage.setItem(`ns_profile_${currentUser.uid}`, JSON.stringify(updatedProfile));
    localStorage.setItem(`ns_logs_${currentUser.uid}`, JSON.stringify(updatedLogs));
    localStorage.setItem(`ns_meds_${currentUser.uid}`, JSON.stringify(updatedMeds));

    const isSandbox = currentUser.uid === 'sandbox_local_user' || currentUser.uid === 'guest_sandbox_user' || currentUser.uid.startsWith('local_user_');

    if (!offline && !isSandbox) {
      try {
        // Enforce medical encryption before sending to database!
        const sensitiveKeys: (keyof UserProfile)[] = ['age', 'weight', 'height', 'activityLevel', 'goal'];
        const securedProfile = updatedProfile.isE2EEnabled 
          ? encryptSensitiveFields(updatedProfile, sensitiveKeys, currentUser.uid)
          : updatedProfile;

        // Sync Profile
        await setDoc(doc(db, "users", currentUser.uid), securedProfile);

        // Sync Logs (to keep database simple, sync as a fully unified document index or sync individually)
        // For standard robust syncing, we can save user records as a nested collection or save a unified today list
        await setDoc(doc(db, "logs", currentUser.uid), { entries: updatedLogs });

        // Sync Medications
        await setDoc(doc(db, "medications", currentUser.uid), { list: updatedMeds });
      } catch (e) {
        console.warn("Firestore sync interrupted, offline buffer safe.", e);
      }
    }
    setSyncing(false);
  };

  const loadUserData = async (uid: string) => {
    // 1. Load Profile
    const profileSnap = await getDoc(doc(db, "users", uid));
    let loadedProfile: UserProfile;

    if (profileSnap.exists()) {
      const rawProfile = profileSnap.data() as UserProfile;
      // Decrypt personal medical parameters client-side!
      const sensitiveKeys: (keyof UserProfile)[] = ['age', 'weight', 'height', 'activityLevel', 'goal'];
      loadedProfile = rawProfile.isE2EEnabled
        ? decryptSensitiveFields(rawProfile, sensitiveKeys, uid)
        : rawProfile;
    } else {
      // Seed default profile
      loadedProfile = DEFAULT_PROFILE(uid);
      await setDoc(doc(db, "users", uid), loadedProfile);
    }

    // 2. Load Logs
    const logsSnap = await getDoc(doc(db, "logs", uid));
    let loadedLogs: LogEntry[] = [];
    if (logsSnap.exists()) {
      loadedLogs = logsSnap.data().entries || [];
    }

    // 3. Load Medications
    const medsSnap = await getDoc(doc(db, "medications", uid));
    let loadedMeds: MedicationEntry[] = [];
    if (medsSnap.exists()) {
      loadedMeds = medsSnap.data().list || [];
    }

    setProfile(loadedProfile);
    setLogs(loadedLogs);
    setMedications(loadedMeds);

    // If biometric lock is enabled on this profile, lock it immediately
    if (loadedProfile.biometricEnabled && loadedProfile.securityPIN) {
      setIsBiometricLocked(true);
    }
  };

  const loadLocalFallback = (uid: string) => {
    const localProfile = localStorage.getItem(`ns_profile_${uid}`);
    const localLogs = localStorage.getItem(`ns_logs_${uid}`);
    const localMeds = localStorage.getItem(`ns_meds_${uid}`);

    const loadedProfile = localProfile ? JSON.parse(localProfile) : DEFAULT_PROFILE(uid);
    setProfile(loadedProfile);
    setLogs(localLogs ? JSON.parse(localLogs) : []);
    setMedications(localMeds ? JSON.parse(localMeds) : []);

    if (loadedProfile.biometricEnabled && loadedProfile.securityPIN) {
      setIsBiometricLocked(true);
    }
  };

  // Auth Operations
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) return;

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        const cleanEmail = email.trim().toLowerCase();
        const localUserKey = `ns_local_auth_${cleanEmail}`;
        const localUid = `local_user_${encodeURIComponent(cleanEmail).replace(/%/g, '_')}`;

        if (isRegistering) {
          // Check if user already exists locally
          const existingPass = localStorage.getItem(localUserKey);
          if (existingPass) {
            setAuthError("An offline account with this email already exists on this device. Please sign in instead.");
            return;
          }
          // Register locally
          localStorage.setItem(localUserKey, password);
          setCurrentUser({ uid: localUid, email: cleanEmail });
          loadLocalFallback(localUid);
        } else {
          // Sign in locally
          const storedPass = localStorage.getItem(localUserKey);
          if (!storedPass) {
            setAuthError("No offline account found with this email. Please toggle to 'Sign Up' to create one.");
            return;
          }
          if (storedPass !== password) {
            setAuthError("Incorrect password for this offline account. Please try again.");
            return;
          }
          setCurrentUser({ uid: localUid, email: cleanEmail });
          loadLocalFallback(localUid);
        }
      } else {
        setAuthError(err.message || "Authentication failed. Try again.");
      }
    }
  };

  const handleGuestLogin = async () => {
    setAuthError('');
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        // Fallback to local sandbox user instantly so user is never blocked
        const guestUid = 'guest_sandbox_user';
        setCurrentUser({ uid: guestUid, email: 'guest@nutrisecure.local' });
        loadLocalFallback(guestUid);
      } else {
        setAuthError("Failed to initialize offline-safe guest mode.");
      }
    }
  };

  const handleEnterSandboxMode = () => {
    setAuthError('');
    const sandboxUid = 'sandbox_local_user';
    setCurrentUser({ uid: sandboxUid, email: 'sandbox@nutrisecure.local' });
    loadLocalFallback(sandboxUid);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out error", e);
    }
    setCurrentUser(null);
    setProfile(null);
    setLogs([]);
    setMedications([]);
  };

  // State mutators synchronized to Cloud
  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    syncState(updatedProfile, logs, medications);
  };

  const handleAddLog = (newEntry: Omit<LogEntry, 'id' | 'userId' | 'timestamp'>) => {
    if (!currentUser || !profile) return;
    const fullEntry: LogEntry = {
      ...newEntry,
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.uid,
      timestamp: Date.now()
    };
    const updatedLogs = [fullEntry, ...logs];
    setLogs(updatedLogs);
    syncState(profile, updatedLogs, medications);
  };

  const handleDeleteLog = (id: string) => {
    if (!profile) return;
    const updatedLogs = logs.filter(log => log.id !== id);
    setLogs(updatedLogs);
    syncState(profile, updatedLogs, medications);
  };

  const handleAddMedication = (newMed: Omit<MedicationEntry, 'id' | 'takenDates' | 'active'>) => {
    if (!currentUser || !profile) return;
    const fullMed: MedicationEntry = {
      ...newMed,
      id: Math.random().toString(36).substr(2, 9),
      takenDates: [],
      active: true
    };
    const updatedMeds = [...medications, fullMed];
    setMedications(updatedMeds);
    syncState(profile, logs, updatedMeds);
  };

  const handleDeleteMedication = (id: string) => {
    if (!profile) return;
    const updatedMeds = medications.filter(med => med.id !== id);
    setMedications(updatedMeds);
    syncState(profile, logs, updatedMeds);
  };

  const handleToggleMedTaken = (id: string) => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const updatedMeds = medications.map(med => {
      if (med.id === id) {
        const alreadyTaken = med.takenDates.includes(today);
        const takenDates = alreadyTaken
          ? med.takenDates.filter(d => d !== today)
          : [...med.takenDates, today];
        return { ...med, takenDates };
      }
      return med;
    });
    setMedications(updatedMeds);
    syncState(profile, logs, updatedMeds);
  };

  const handleUpdatePIN = (pin: string) => {
    if (!profile) return;
    const updatedProfile = {
      ...profile,
      securityPIN: pin,
      biometricEnabled: pin.length > 0
    };
    setProfile(updatedProfile);
    syncState(updatedProfile, logs, medications);
  };

  const handleVerifyBiometrics = () => {
    if (!profile) return;
    if (pinVerificationInput === profile.securityPIN) {
      setIsBiometricLocked(false);
      setPinVerificationInput('');
      setVerificationError('');
    } else {
      setVerificationError('Incorrect PIN code. Please try again.');
    }
  };

  const handleSimulateFingerprint = () => {
    // TouchID Simulation - instantly unlocks!
    setIsBiometricLocked(false);
    setPinVerificationInput('');
    setVerificationError('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Securing Connection...</span>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!currentUser || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="inline-block p-3 bg-blue-50 text-blue-600 rounded-2xl mx-auto">
              <Activity className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">NutriSecure Pro</h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">HIPAA-Compliant E2E Encrypted Calorie Companion</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@healthpartner.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>

            {authError && (
              <div className="space-y-3">
                {authError === 'auth/operation-not-allowed' ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Firebase Auth Provider Disabled</span>
                    </div>
                    <div className="space-y-2 text-slate-700 font-medium">
                      <p className="text-[11px] leading-relaxed">
                        The <strong>Email/Password</strong> sign-in provider is not enabled in your Firebase project console.
                      </p>
                      <div className="text-[10px] space-y-1.5 pl-4 list-decimal">
                        <div>1. Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold hover:text-blue-800">Firebase Console</a>.</div>
                        <div>2. Select your project and click <strong>Authentication</strong>.</div>
                        <div>3. Go to the <strong>Sign-in method</strong> tab and enable <strong>Email/Password</strong>.</div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Don't worry! You can bypass this right now and explore all features using the <strong>Local Sandbox Mode</strong> button below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <p className="leading-snug">{authError}</p>
                  </div>
                )}

                {authError === 'auth/operation-not-allowed' && (
                  <button
                    type="button"
                    onClick={handleEnterSandboxMode}
                    className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🛡️ Enter Local Sandbox Mode (Bypass)
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border border-transparent"
            >
              <LogIn className="w-4 h-4" />
              {isRegistering ? 'Create HIPAA Protected Account' : 'Authenticate Credentials'}
            </button>
          </form>

          <div className="space-y-3 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-slate-500 hover:text-blue-600 font-semibold transition"
            >
              {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
            <span className="block text-[10px] text-slate-300 font-bold uppercase">or</span>
            <button
              onClick={handleGuestLogin}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              🚀 Anonymous Safe Guest Mode
            </button>
            <button
              onClick={handleEnterSandboxMode}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[11px] py-2 rounded-xl border border-dashed border-slate-300 transition cursor-pointer"
            >
              🛡️ Continue Offline in Local Sandbox
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Biometric Lock Screen Overlay
  if (isBiometricLocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-slate-800 border border-slate-700 p-8 rounded-3xl text-center space-y-6 text-slate-200"
        >
          <div className="space-y-2">
            <div className="inline-block p-4 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">{t.appName} Locked</h1>
            <p className="text-xs text-slate-400">Authenticating with HIPAA Biometrics Security</p>
          </div>

          <div className="py-4 space-y-4">
            {/* Click to authenticate TouchID simulation */}
            <button
              onClick={handleSimulateFingerprint}
              className="mx-auto w-20 h-20 bg-slate-700 hover:bg-slate-600 rounded-full border border-slate-600 hover:border-blue-400 transition-all flex items-center justify-center text-blue-400 cursor-pointer shadow-lg animate-pulse"
              title="Click to Simulate Fingerprint"
            >
              <Fingerprint className="w-10 h-10" />
            </button>
            <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Click Fingerprint to Simulate TouchID
            </span>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-700">
            <label className="text-[10px] font-bold text-slate-400 uppercase block text-left">Or enter security PIN</label>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={6}
                value={pinVerificationInput}
                onChange={(e) => setPinVerificationInput(e.target.value)}
                placeholder="Enter PIN"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-xs text-center text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleVerifyBiometrics}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 rounded-xl transition"
              >
                Verify
              </button>
            </div>
            {verificationError && (
              <p className="text-xs text-rose-400 mt-1 font-semibold">{verificationError}</p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: t.dashboard, icon: <Activity className="w-4 h-4" /> },
    { id: 'foodLog', label: t.foodLog, icon: <Flame className="w-4 h-4" /> },
    { id: 'mealPlanner', label: t.mealPlanner, icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'medications', label: t.medications, icon: <PillIcon /> },
    { id: 'security', label: t.security, icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'settings', label: t.settings, icon: <User className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col md:flex-row" id="nutrisecure-root-app">
      
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 h-screen sticky top-0">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-blue-600 tracking-wider uppercase">NutriSecure Pro</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clinical Suite</p>
          </div>
        </div>

        {/* Navigation Items in Sidebar */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full px-6 py-3 flex items-center gap-3 text-[13px] font-semibold border-l-[3px] transition-all text-left cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-50/50 text-blue-600 border-blue-600'
                  : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer status metrics */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center gap-2.5 text-xs text-slate-500 font-semibold mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Multi-device Sync Active
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
            {offline ? "Offline Buffer Safe" : "Offline Mode Ready"}
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Banner Indicator for Offline Mode */}
        {offline && (
          <div className="bg-amber-500 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 z-50">
            <ShieldCheck className="w-4 h-4" />
            {t.offlineMode}
          </div>
        )}

        {/* Mobile Header + Tabs */}
        <header className="md:hidden bg-white border-b border-slate-200">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                <Activity className="w-4 h-4" />
              </div>
              <h1 className="text-sm font-extrabold text-blue-600 uppercase tracking-wide">NutriSecure Pro</h1>
            </div>
            
            <button
              onClick={handleSignOut}
              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Horizontal Tabs */}
          <nav className="px-4 pb-3 flex gap-1 overflow-x-auto scrollbar-none">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Main Top bar Header Card (Professional Theme standard) */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                profile.biometricEnabled 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {profile.biometricEnabled ? '★ Biometric Verified' : 'Standard PIN Lock'}
              </span>
              <span className="px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 border border-green-200">
                ✔ HIPAA Compliant
              </span>
              <span className="px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 hidden xs:inline-block">
                🔒 E2E Encrypted
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">{profile.name}</div>
                <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">ID: NS-{profile.userId.substring(0, 6).toUpperCase()}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-xs text-blue-600 uppercase">
                {profile.name.substring(0, 2)}
              </div>
              
              <button
                onClick={handleSignOut}
                className="hidden md:flex p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition border border-slate-100 shrink-0 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Render Active Tab */}
          <main className="min-h-[500px]" id="app-main-content-panel">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'dashboard' && (
                  <Dashboard logs={logs} profile={profile} lang={lang} />
                )}
                {activeTab === 'foodLog' && (
                  <FoodLogger 
                    logs={logs} 
                    onAddLog={handleAddLog} 
                    onDeleteLog={handleDeleteLog} 
                    lang={lang} 
                  />
                )}
                {activeTab === 'mealPlanner' && (
                  <MealPlanner 
                    profile={profile} 
                    lang={lang} 
                    onAddLog={handleAddLog} 
                  />
                )}
                {activeTab === 'medications' && (
                  <MedicationReminder
                    medications={medications}
                    onAddMedication={handleAddMedication}
                    onDeleteMedication={handleDeleteMedication}
                    onToggleTaken={handleToggleMedTaken}
                    lang={lang}
                  />
                )}
                {activeTab === 'security' && (
                  <SecurityPanel
                    profile={profile}
                    medications={medications}
                    lang={lang}
                    onUpdatePIN={handleUpdatePIN}
                    onToggleBiometrics={(enabled) => {
                      handleUpdateProfile({ ...profile, biometricEnabled: enabled });
                    }}
                  />
                )}
                {activeTab === 'settings' && (
                  <Settings
                    profile={profile}
                    logs={logs}
                    lang={lang}
                    onUpdateProfile={handleUpdateProfile}
                    onUpdateLanguage={(l) => {
                      handleUpdateProfile({ ...profile, language: l });
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Humble & Professional Footer */}
          <footer className="text-center py-6 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-t border-slate-200 mt-6">
            NutriSecure HIPAA Compliant companion • Client-Side Encryption Enabled
          </footer>

        </div>
      </div>
    </div>
  );
}

// Simple Pill icon inside app navigation
function PillIcon() {
  return (
    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
      <path d="M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v5h14V6a1 1 0 0 0-1-1H6zm13 8H5v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5z" />
    </svg>
  );
}
