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

export async function requireBearerAuth(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthError("Unauthorized", 401);
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new AuthError("Unauthorized", 401);
  }

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    return decoded;
  } catch (_) {
    throw new AuthError("Unauthorized", 401);
  }
}
