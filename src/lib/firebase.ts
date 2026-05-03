import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

console.log('[Firebase] Initializing app for project:', firebaseConfig.projectId);

let app: FirebaseApp;
try {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase] App initialized ✓');
} catch (err) {
  console.error('[Firebase] App initialization failed:', err);
  throw err;
}

// Analytics — non-blocking, only runs in browser environments
if (typeof window !== 'undefined') {
  try {
    getAnalytics(app);
    console.log('[Firebase] Analytics initialized ✓');
  } catch {
    // Analytics may fail in dev environments without HTTPS — not critical
    console.warn('[Firebase] Analytics skipped (likely non-HTTPS dev environment)');
  }
}

export { app };
