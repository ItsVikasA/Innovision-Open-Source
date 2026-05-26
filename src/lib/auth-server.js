import { cookies } from "next/headers";
import { auth as firebaseAuth } from "@/lib/firebase";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin Auth
function initializeFirebaseAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK not configured. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }

  return getAuth();
}

/**
 * Verify Firebase ID token using Firebase Admin SDK
 * This prevents JWT forgery attacks by validating the token signature
 * @param {string} token - The ID token to verify
 * @returns {Promise<Object|null>} - Decoded token or null if invalid
 */
export async function verifyIdToken(token) {
  try {
    if (!token) {
      console.warn("Token verification: No token provided");
      return null;
    }

    const auth = initializeFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token,true);
    return decodedToken;
  } catch (error) {
    if (error.code === "auth/id-token-expired") {
      console.warn("Token verification: Token has expired");
    } else if (error.code === "auth/id-token-revoked") {
      console.warn("Token verification: Token has been revoked");
    } else if (error.code === "auth/invalid-id-token") {
      console.warn("Token verification: Invalid token format or signature");
    } else {
      console.warn("Token verification failed:", error.message);
    }
    return null;
  }
}

/**
 * Get the current user from the session cookie
 * This replaces NextAuth's auth() function for API routes
 * Uses Firebase Admin SDK to verify JWT tokens securely
 */
export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    const idToken = sessionCookie.value;

    // Verify the token signature using Firebase Admin SDK
    // This prevents forged tokens from being accepted
    const decodedToken = await verifyIdToken(idToken);
    
    if (!decodedToken) {
      return null;
    }

    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        image: decodedToken.picture,
      },
    };
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}
