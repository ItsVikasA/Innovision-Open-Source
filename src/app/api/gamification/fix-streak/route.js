import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { fixZeroStreak } from "@/lib/streak-helper";

export async function POST(request) {
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

    // Centralised streak-zero fix via helper
    const { streak, lastActive, changed } = fixZeroStreak(stats);

    if (changed) {
      await userRef.update({ streak, lastActive });

      return NextResponse.json({
        success: true,
        message: "Streak fixed to 1",
        newStreak: streak,
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
