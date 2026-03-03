import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const userRef = adminDb.collection("gamification").doc(userId);

    // Use a transaction to prevent race conditions on streak fix
    const result = await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error("User not found");
      }

      const stats = userDoc.data();

      if (stats.streak === 0) {
        transaction.update(userRef, {
          streak: 1,
          lastActive: new Date().toISOString(),
        });
        return { fixed: true, newStreak: 1 };
      }

      return { fixed: false, currentStreak: stats.streak };
    });

    if (result.fixed) {
      return NextResponse.json({
        success: true,
        message: "Streak fixed to 1",
        newStreak: result.newStreak,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Streak already set",
      currentStreak: result.currentStreak,
    });
  } catch (error) {
    if (error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Error fixing streak:", error);
    return NextResponse.json({ error: "Failed to fix streak" }, { status: 500 });
  }
}
