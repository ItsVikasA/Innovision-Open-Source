import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

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

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const userRef = adminDb.collection("gamification").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ activities: {} });
    }

    const stats = userDoc.data();

    // Build activity map from achievements
    const activityData = {};

    if (stats.achievements && Array.isArray(stats.achievements)) {
      stats.achievements.forEach((achievement) => {
        if (achievement.timestamp) {
          const date = new Date(achievement.timestamp);
          const dateStr = date.toISOString().split("T")[0];
          activityData[dateStr] = (activityData[dateStr] || 0) + 1;
        }
      });
    }

    return NextResponse.json({
      success: true,
      activities: activityData,
    });
  } catch (error) {
    console.error("Error fetching activity data:", error);
    return NextResponse.json({ error: "Failed to fetch activity data" }, { status: 500 });
  }
}
