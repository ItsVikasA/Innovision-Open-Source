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

    // The session cookie contains the Firebase ID token
    const idToken = sessionCookie.value;

    try {
      const parts = idToken.split(".");

      // Validate JWT format
      if (parts.length !== 3) {
        console.error("Invalid JWT format");
        return null;
      }

      const payload = JSON.parse(
        atob(parts[1])
      );

      return {
        user: {
          email: payload.email,
          name: payload.name,
          image: payload.picture,
        },
      };
    } catch (e) {
      console.error("Failed to parse session token:", e);
      return null;
    }
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}
