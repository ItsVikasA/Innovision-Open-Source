import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { computeStreakUpdate } from "@/lib/streak-helper";

/**
 * POST /api/gamification/check-in
 *
 * Dedicated daily check-in endpoint that centralises streak updates.
 * Called once when the user opens the app so streaks are maintained
 * without relying on GET (which should be read‑only).
 *
 * @see https://github.com/ItsVikasA/Innovision-Open-Source/issues/176
 */
export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({
        success: true,
        streak: 1,
        _warning: "Firebase not configured – using default streak",
      });
    }

    const userRef = adminDb.collection("gamification").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // First-time user – initialise gamification record
      const initialStats = {
        xp: 0,
        level: 1,
        streak: 1,
        badges: [],
        rank: 0,
        achievements: [],
        lastActive: new Date().toISOString(),
      };
      await userRef.set(initialStats);
      return NextResponse.json({ success: true, streak: 1, isNew: true });
    }

    const stats = userDoc.data();
    const { streak, lastActive, changed } = computeStreakUpdate(stats, {
      isLearningAction: false,
    });

    if (changed) {
      await userRef.update({ streak, lastActive });
    }

    return NextResponse.json({ success: true, streak });
  } catch (error) {
    console.error("Error during check-in:", error);
    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}
