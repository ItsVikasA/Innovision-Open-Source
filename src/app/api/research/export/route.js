import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "interactions") {
      return await exportInteractions();
    } else if (type === "outcomes") {
      return await exportOutcomes();
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

async function exportInteractions() {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  // Get all user activity data
  const snapshot = await adminDb.collection("user_activity").get();

  const anonymizedData = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      userId: hashUserId(data.userId || doc.id),
      action: data.action,
      timestamp: roundTimestamp(data.timestamp),
      duration: data.duration,
      courseId: data.courseId,
      chapterId: data.chapterId,
    };
  });

  return new NextResponse(JSON.stringify(anonymizedData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=interactions.json",
    },
  });
}

async function exportOutcomes() {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  // Get gamification stats (outcomes)
  const snapshot = await adminDb.collection("gamification").get();

  const anonymizedData = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      userId: hashUserId(doc.id),
      xp: data.xp,
      level: data.level,
      streak: data.streak,
      badgesCount: data.badges?.length || 0,
      achievementsCount: data.achievements?.length || 0,
      lastActive: roundTimestamp(data.lastActive),
    };
  });

  return new NextResponse(JSON.stringify(anonymizedData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=outcomes.json",
    },
  });
}

function hashUserId(userId) {
  return crypto.createHash("sha256").update(userId).digest("hex").substring(0, 16);
}

function roundTimestamp(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}
