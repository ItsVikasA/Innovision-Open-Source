import { cookies } from "next/headers";
import { auth as firebaseAuth } from "@/lib/firebase";

const JWT_PATTERN = /^[A-Za-z0-9_-]+={0,2}\.[A-Za-z0-9_-]+={0,2}\.[A-Za-z0-9_-]+={0,2}$/;

function decodeJwtPayload(token) {
  if (typeof token !== "string" || !JWT_PATTERN.test(token)) {
    return null;
  }

  try {
    const payloadSegment = token.split(".")[1];
    const paddedPayload = payloadSegment.padEnd(
      payloadSegment.length + ((4 - (payloadSegment.length % 4)) % 4),
      "="
    );
    const base64 = paddedPayload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch (e) {
    console.error("Failed to parse session token:", e);
    return null;
  }
}

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
    // For now, we'll decode it client-side style
    // In production, you should verify it with Firebase Admin SDK
    const idToken = sessionCookie.value;

    const payload = decodeJwtPayload(idToken);
    if (!payload?.email) {
      return null;
    }

    return {
      user: {
        email: payload.email,
        name: payload.name,
        image: payload.picture,
      },
    };
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}
