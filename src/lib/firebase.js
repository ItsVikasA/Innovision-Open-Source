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

function hasRequiredConfig() {
  return ["apiKey", "projectId", "appId"].every((key) => {
    const value = firebaseConfig[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

let app = null;
let db = null;
let auth = null;

if (hasRequiredConfig()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Firebase client initialization failed:", error?.message || error);
    }
  }
} else if (process.env.NODE_ENV === "development") {
  console.warn("Firebase env variables missing. Auth and Firestore are disabled locally.");
}

export { db, auth, app };
