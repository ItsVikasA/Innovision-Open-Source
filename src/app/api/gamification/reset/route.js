import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * Reset gamification stats for a user
 * Usage: POST /api/gamification/reset
 * Body: { userId: "user@example.com" }
 */
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
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const userRef = adminDb.collection("gamification").doc(userId);
    const resetData = {
      xp: 0,
      level: 1,
      streak: 0,
      badges: [],
      rank: 0,
      achievements: [],
      lastActive: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userRef.set(resetData);

    return NextResponse.json({
      success: true,
      message: "Gamification stats reset to 0",
      data: resetData,
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
