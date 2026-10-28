import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAOfHh7O_IddxXKbNs18zqdDj6wVoHpnZE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pulsenayaruvi.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pulsenayaruvi",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pulsenayaruvi.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "346073671129",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:346073671129:web:40a4a22b56cd08f1f6e5c8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CD8SFWMWMM",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://pulsenayaruvi-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Initialize analytics safely if supported
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export { app, analytics };
