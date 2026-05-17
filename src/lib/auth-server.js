import { cookies } from "next/headers";
import { auth as firebaseAuth } from "@/lib/firebase";

/**
 * Get the current user from the session cookie
 * This replaces NextAuth's auth() function for API routes
 */
export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    // The session cookie is a Firebase session cookie
    const sessionCookieValue = sessionCookie.value;

    try {
      const { getAuth } = await import("firebase-admin/auth");
      // Verify session cookie with Firebase Admin SDK instead of just decoding
      const decodedClaims = await getAuth().verifySessionCookie(sessionCookieValue, true);
      
      return {
        user: {
          email: decodedClaims.email,
          name: decodedClaims.name,
          image: decodedClaims.picture,
        },
      };
    } catch (e) {
      console.error("Failed to verify session token:", e);
      return null;
    }
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}
