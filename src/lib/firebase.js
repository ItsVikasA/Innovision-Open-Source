import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
};

let db = null;
let auth = null;

// Only initialize Firebase Client SDK if the API key is present in environment variables
const hasApiKey = firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined";

if (hasApiKey) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase client initialization failed:", error);
  }
} else {
  if (typeof window !== "undefined") {
    console.warn("Firebase Client SDK: NEXT_PUBLIC_FIREBASE_API_KEY is missing. Client-side database and authentication will not be initialized.");
  }
}

export { db, auth };
