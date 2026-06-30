import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "molten-quarter-rw2h4",
  appId: "1:249999809088:web:c8a4d3d9077312638e9da5",
  apiKey: "AIzaSyCUSKbcZhwpVe88VQWe-I", // We can use the environment key or a dummy if empty, but we can hardcode the project config since it's a web project.
  authDomain: "xb3htvykamaby4zh5okbgr.firebaseapp.com",
  databaseURL: "https://molten-quarter-rw2h4.firebaseio.com",
  storageBucket: "molten-quarter-rw2h4.firebasestorage.app",
  messagingSenderId: "249999809088"
};

// Replace with accurate values from firebase-applet-config.json
const actualConfig = {
  apiKey: "AIzaSyCUSKbcZhwpVe88VQWe-DFaTob6m4W0U5o",
  authDomain: "molten-quarter-rw2h4.firebaseapp.com",
  projectId: "molten-quarter-rw2h4",
  storageBucket: "molten-quarter-rw2h4.firebasestorage.app",
  messagingSenderId: "249999809088",
  appId: "1:249999809088:web:c8a4d3d9077312638e9da5"
};

const app = getApps().length === 0 ? initializeApp(actualConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
