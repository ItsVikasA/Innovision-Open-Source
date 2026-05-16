import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import "@/lib/firebase-admin"; // ensure Firebase Admin is initialized

/**
 * Get the current user from the session cookie.
 * Verifies the Firebase ID token cryptographically using the Admin SDK.
 * This prevents forged cookies from bypassing authentication.
 */
export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    const idToken = sessionCookie.value;

    // Cryptographically verify the token signature using Firebase Admin SDK.
    // This rejects any tampered or forged tokens.
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      return {
        user: {
          email: decoded.email,
          name: decoded.name,
          image: decoded.picture,
        },
      };
    } catch (e) {
      // Token is invalid, expired, or forged — treat as unauthenticated
      console.error("Session token verification failed:", e.message);
      return null;
    }
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}