import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(request) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Database not available. Check server configuration." },
      { status: 500 }
    );
  }

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const userRef = adminDb.collection("gamification").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stats = userDoc.data();

    // If streak is 0, set it to 1 (they're using it today)
    if (stats.streak === 0) {
      await userRef.update({
        streak: 1,
        lastActive: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Streak fixed to 1",
        newStreak: 1,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Streak already set",
      currentStreak: stats.streak,
    });
  } catch (error) {
    console.error("Error fixing streak:", error);
    return NextResponse.json({ error: "Failed to fix streak" }, { status: 500 });
  }
}
