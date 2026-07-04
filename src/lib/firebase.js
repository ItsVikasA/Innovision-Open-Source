import { initializeApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const rawApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const isConfigured = rawApiKey && rawApiKey !== "your-firebase-api-key";

const firebaseConfig = {
  apiKey: isConfigured ? rawApiKey : "AIzaSyDummyKeyForLocalDevelopment39Chars",
  authDomain: isConfigured ? process.env.NEXT_PUBLIC_AUTH_DOMAIN : "localhost",
  projectId: isConfigured ? process.env.NEXT_PUBLIC_PROJECT_ID : "innovision-dummy",
  storageBucket: isConfigured ? process.env.NEXT_PUBLIC_STORAGE_BUCKET : "innovision-dummy.appspot.com",
  messagingSenderId: isConfigured ? process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID : "123456789012",
  appId: isConfigured ? process.env.NEXT_PUBLIC_APP_ID : "1:123456789012:web:1234567890abcdef",
  measurementId: isConfigured ? process.env.NEXT_PUBLIC_MEASUREMENT_ID : "G-1234567890",
};

// Initialize Firebase only if not already initialized
let app;
let db;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Enable offline persistence
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  });
} else {
  app = getApps()[0];
  db = getFirestore(app);
}
const auth = getAuth(app);

export { db, auth };
