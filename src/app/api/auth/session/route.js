import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/create-notification";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const { idToken } = await req.json();

    if (idToken && idToken.length > 4000) {
      return NextResponse.json({ success: false, error: "Invalid token length" }, { status: 400 });
    }

    const cookieStore = await cookies();

    if (idToken) {
      const existingSession = cookieStore.get("session");
      const isNewLogin = !existingSession;

      // Verify the ID token and create a proper session cookie
      const { getAuth } = await import("firebase-admin/auth");
      try {
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
        const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });

        // Set session cookie
        cookieStore.set("session", sessionCookie, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 5, // 5 days (in seconds)
        });

        if (isNewLogin) {
          const decoded = await getAuth().verifySessionCookie(sessionCookie);
          const userEmail = decoded.email;
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
        console.error("Error creating session cookie or notification:", err);
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.json({ success: true });
    } else {
      // Clear session cookie
      cookieStore.delete("session");
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return NextResponse.json({ success: true });
}
