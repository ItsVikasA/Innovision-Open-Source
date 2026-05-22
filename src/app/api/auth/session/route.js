import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/create-notification";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  createVerifiedSessionCookie,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-server";

export async function POST(req) {
  try {
    const { idToken } = await req.json();

    if (idToken && idToken.length > 4000) {
      return NextResponse.json({ success: false, error: "Invalid token length" }, { status: 400 });
    }

    const cookieStore = await cookies();

    if (idToken) {
      const existingSession = cookieStore.get(SESSION_COOKIE_NAME);
      const isNewLogin = !existingSession;
      const verifiedSession = await createVerifiedSessionCookie(idToken);

      if (!verifiedSession) {
        cookieStore.delete(SESSION_COOKIE_NAME);
        return NextResponse.json(
          { success: false, error: "Invalid or expired token" },
          { status: 401 }
        );
      }

      const { decodedToken, sessionCookie } = verifiedSession;

      cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
      });


      try {
        if (isNewLogin) {
          const userEmail = decodedToken.email;
          if (userEmail) {
            const adminDb = getAdminDb();
            createNotification(adminDb, {
              userId: userEmail,
              title: "Welcome back!",
              body: "You recently signed in. Ready to keep learning?",
              type: "system",
              link: "/profile",
            }).catch(() => { });
          }
        }
      } catch (err) {
        console.error("Error verifying ID token or creating notification:", err);
      }

      return NextResponse.json({ success: true });
    } else {
      cookieStore.delete(SESSION_COOKIE_NAME);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
