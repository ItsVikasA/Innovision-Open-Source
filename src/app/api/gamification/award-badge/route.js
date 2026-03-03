import { NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";

// POST - Award a badge to user (idempotent via FieldValue.arrayUnion)
export async function POST(request) {
  try {
    const { userId, badgeId } = await request.json();

    if (!userId || !badgeId) {
      return NextResponse.json({ error: "userId and badgeId required" }, { status: 400 });
    }

    const userRef = adminDb.collection("gamification").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create user if doesn't exist
      await userRef.set({
        xp: 0,
        level: 1,
        streak: 1,
        badges: [badgeId],
        rank: 0,
        achievements: [],
        lastActive: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, badges: [badgeId] });
    }

    // Use arrayUnion — inherently idempotent, no race condition
    await userRef.update({ badges: FieldValue.arrayUnion(badgeId) });

    // Read back to return current badges
    const updatedDoc = await userRef.get();
    const badges = updatedDoc.data()?.badges || [];

    return NextResponse.json({ success: true, badges });
  } catch (error) {
    console.error("Error awarding badge:", error);
    return NextResponse.json({ error: "Failed to award badge" }, { status: 500 });
  }
}
