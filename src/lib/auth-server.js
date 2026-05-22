import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;
export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_COOKIE_MAX_AGE_MS / 1000;

async function getFirebaseAdminAuth() {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth();
}

function mapDecodedTokenToUser(decodedToken) {
  if (!decodedToken?.email && !decodedToken?.uid) {
    return null;
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email ?? null,
    name: decodedToken.name ?? null,
    image: decodedToken.picture ?? null,
  };
}

export async function verifyFirebaseSessionToken(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  try {
    const auth = await getFirebaseAdminAuth();

    try {
      return await auth.verifySessionCookie(sessionToken, true);
    } catch {
      // Support older cookies that stored a verified Firebase ID token directly.
      return await auth.verifyIdToken(sessionToken, true);
    }
  } catch {
    return null;
  }
}

export async function verifyFirebaseIdToken(idToken) {
  if (!idToken) {
    return null;
  }

  try {
    const auth = await getFirebaseAdminAuth();
    return await auth.verifyIdToken(idToken, true);
  } catch {
    return null;
  }
}

export async function createVerifiedSessionCookie(idToken) {
  const decodedToken = await verifyFirebaseIdToken(idToken);

  if (!decodedToken) {
    return null;
  }

  try {
    const auth = await getFirebaseAdminAuth();
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_COOKIE_MAX_AGE_MS,
    });

    return { decodedToken, sessionCookie };
  } catch (error) {
    console.error("Error creating session cookie:", error);
    return null;
  }
}

export async function getAuthenticatedUserFromSessionCookie() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const decodedToken = await verifyFirebaseSessionToken(sessionToken);

    return mapDecodedTokenToUser(decodedToken);
  } catch (error) {
    console.error("Error getting authenticated user from session cookie:", error);
    return null;
  }
}

export async function getAuthenticatedUserFromRequest(request) {
  const cookieUser = await getAuthenticatedUserFromSessionCookie();
  if (cookieUser) {
    return cookieUser;
  }

  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  const decodedToken = await verifyFirebaseIdToken(idToken);

  return mapDecodedTokenToUser(decodedToken);
}

/**
 * Get the current user from the verified session cookie.
 */
export async function getServerSession() {
  const user = await getAuthenticatedUserFromSessionCookie();
  return user ? { user } : null;
}
