import { cookies } from "next/headers";
import { auth as firebaseAuth } from "@/lib/firebase";

export class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    const idToken = sessionCookie.value;

    try {
      const payload = JSON.parse(atob(idToken.split(".")[1]));
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

export async function assertAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) {
    throw new AuthError("Unauthorized", 401);
  }

  const { getAuth } = await import("firebase-admin/auth");
  const auth = getAuth();

  let decoded;
  try {
    decoded = await auth.verifySessionCookie(session, true);
  } catch (_) {
    try {
      decoded = await auth.verifyIdToken(session, true);
    } catch (_) {
      throw new AuthError("Unauthorized", 401);
    }
  }

  if (decoded.admin !== true) {
    throw new AuthError("Forbidden", 403);
  }

  return decoded;
}
