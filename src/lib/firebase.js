import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForStaticBuild12345",
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN || "innovision-dummy.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "innovision-dummy",
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET || "innovision-dummy.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_APP_ID || "1:1234567890:web:1234567890abcdef",
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID || "G-DUMMY123",
};

// Initialize Firebase only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
