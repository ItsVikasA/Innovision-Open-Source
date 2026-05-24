import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({
        studyGoal: 30,
        dailyStudyTime: {},
        _warning: "Firebase not configured"
      });
    }

    const userRef = adminDb.collection("gamification").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({
        studyGoal: 30,
        dailyStudyTime: {}
      });
    }

    const data = userDoc.data();
    return NextResponse.json({
      studyGoal: data.studyGoal || 30,
      dailyStudyTime: data.dailyStudyTime || {}
    });
  } catch (error) {
    console.error("Error fetching study time:", error);
    return NextResponse.json({ error: "Failed to fetch study time" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, action, duration, goal } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({
        success: false,
        _warning: "Firebase not configured"
      }, { status: 503 });
    }

    const userRef = adminDb.collection("gamification").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create with defaults
      await userRef.set({
        xp: 0,
        level: 1,
        streak: 1,
        badges: [],
        rank: 0,
        achievements: [],
        lastActive: new Date().toISOString(),
        studyGoal: 30,
        dailyStudyTime: {}
      });
    }

    if (action === "setGoal") {
      if (typeof goal !== "number" || goal <= 0) {
        return NextResponse.json({ error: "Invalid goal value" }, { status: 400 });
      }
      await userRef.update({ studyGoal: goal });
      return NextResponse.json({ success: true, studyGoal: goal });
    }

    if (action === "reset") {
      await userRef.update({ dailyStudyTime: {} });
      return NextResponse.json({ success: true, dailyStudyTime: {} });
    }

    if (action === "track") {
      if (typeof duration !== "number" || duration <= 0) {
        return NextResponse.json({ error: "Invalid duration value" }, { status: 400 });
      }

      const todayStr = new Date().toISOString().split("T")[0];
      
      // Fetch fresh data to ensure transaction-like safety
      const freshDoc = await userRef.get();
      const freshData = freshDoc.data() || {};
      const dailyTime = freshData.dailyStudyTime || {};
      
      const currentTodayTime = dailyTime[todayStr] || 0;
      const newTodayTime = currentTodayTime + duration;
      
      dailyTime[todayStr] = newTodayTime;
      
      await userRef.update({
        dailyStudyTime: dailyTime,
        lastActive: new Date().toISOString()
      });

      // Reward XP (e.g. 10 XP) once per day if they hit their daily study goal
      const studyGoalSec = (freshData.studyGoal || 30) * 60;
      let goalCompletedToday = false;
      if (currentTodayTime < studyGoalSec && newTodayTime >= studyGoalSec) {
        goalCompletedToday = true;
      }

      return NextResponse.json({
        success: true,
        dailyStudyTime: dailyTime,
        goalCompletedToday
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating study time:", error);
    return NextResponse.json({ error: "Failed to update study time" }, { status: 500 });
  }
}
