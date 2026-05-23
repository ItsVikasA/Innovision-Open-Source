import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * Test endpoint to initialize and test gamification system
 * Usage: GET /api/gamification/test?userId=user@example.com&action=init
 */
export async function GET(request) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Database not available. Check server configuration." },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (action === "init") {
      // Initialize user gamification data
      const userRef = adminDb.collection("gamification").doc(userId);
      const initialData = {
        xp: 0,
        level: 1,
        streak: 0,
        badges: [],
        rank: 0,
        achievements: [],
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await userRef.set(initialData, { merge: true });

      return NextResponse.json({
        success: true,
        message: "Gamification initialized",
        data: initialData,
      });
    }

    if (action === "award") {
      // Award test XP
      const xpAmount = parseInt(searchParams.get("xp") || "100");
      const activityType = searchParams.get("type") || "complete_chapter";

      const awardRes = await fetch(`${request.nextUrl.origin}/api/gamification/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: activityType,
          value: xpAmount,
        }),
      });

      const result = await awardRes.json();
      return NextResponse.json({
        success: true,
        message: `Awarded ${xpAmount} XP`,
        result,
      });
    }

    if (action === "check") {
      // Check current stats
      const userRef = adminDb.collection("gamification").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return NextResponse.json({
          exists: false,
          message: "User not initialized. Use ?action=init to initialize.",
        });
      }

      return NextResponse.json({
        exists: true,
        data: userDoc.data(),
      });
    }

    return NextResponse.json({
      message: "Gamification Test Endpoint",
      usage: {
        init: "/api/gamification/test?userId=user@example.com&action=init",
        award:
          "/api/gamification/test?userId=user@example.com&action=award&xp=100&type=complete_chapter",
        check: "/api/gamification/test?userId=user@example.com&action=check",
      },
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
