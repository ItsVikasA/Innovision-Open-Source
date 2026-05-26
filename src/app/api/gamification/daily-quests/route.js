import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildDailyQuestState, mergeDailyQuestProgress } from "@/lib/daily-quests";

// GET - Fetch user's daily quests
export async function GET(request) {
  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Gamification backend unavailable" }, { status: 503 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Get user's quest progress for today
    const userQuestsRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("dailyQuests")
      .doc(today);

    const userQuestsDoc = await userQuestsRef.get();
    let userProgress = userQuestsDoc.exists ? userQuestsDoc.data() : {};

    // Initialize progress if not exists
    if (!userProgress.quests) {
      userProgress = buildDailyQuestState(today);
      await userQuestsRef.set(userProgress);
    }

    const mergedProgress = mergeDailyQuestProgress(today, userProgress);
    const quests = mergedProgress.quests;

    return NextResponse.json({
      date: today,
      quests,
      totalXPEarned: mergedProgress.totalXPEarned,
      allCompleted: quests.every(q => q.completed),
      allClaimed: quests.every(q => q.claimed),
    });
  } catch (error) {
    console.error("Error fetching daily quests:", error);
    return NextResponse.json({ error: "Failed to fetch quests" }, { status: 500 });
  }
}

// POST - Update quest progress or claim reward
export async function POST(request) {
  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    const { userId, action, questId, progressIncrement, progressType } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Gamification backend unavailable" }, { status: 503 });
    }

    const today = new Date().toISOString().split("T")[0];
    const userQuestsRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("dailyQuests")
      .doc(today);

    const userQuestsDoc = await userQuestsRef.get();

    if (!userQuestsDoc.exists) {
      return NextResponse.json({ error: "No quests found for today" }, { status: 404 });
    }

    let userProgress = userQuestsDoc.data();

    if (action === "updateProgress") {
      // Update progress for quests matching the progress type
      userProgress.quests = userProgress.quests.map(quest => {
        if (quest.type === progressType && !quest.completed) {
          const newProgress = Math.min(quest.progress + (progressIncrement || 1), quest.target);
          return {
            ...quest,
            progress: newProgress,
            completed: newProgress >= quest.target,
          };
        }
        return quest;
      });

      await userQuestsRef.update({ quests: userProgress.quests });

      return NextResponse.json({
        success: true,
        quests: userProgress.quests,
      });
    }

    if (action === "claim") {
      // Find and claim the quest reward
      const questIndex = userProgress.quests.findIndex(q => q.id === questId);

      if (questIndex === -1) {
        return NextResponse.json({ error: "Quest not found" }, { status: 404 });
      }

      const quest = userProgress.quests[questIndex];

      if (!quest.completed) {
        return NextResponse.json({ error: "Quest not completed" }, { status: 400 });
      }

      if (quest.claimed) {
        return NextResponse.json({ error: "Already claimed" }, { status: 400 });
      }

      // Mark as claimed
      userProgress.quests[questIndex].claimed = true;
      userProgress.totalXPEarned = (userProgress.totalXPEarned || 0) + quest.xpReward;

      await userQuestsRef.update({
        quests: userProgress.quests,
        totalXPEarned: userProgress.totalXPEarned,
      });

      // Award XP to user's main stats
      const userStatsRef = adminDb.collection("gamification").doc(userId);
      const statsDoc = await userStatsRef.get();
      const currentStats = statsDoc.exists ? statsDoc.data() : {};
      const currentXP = currentStats.xp || 0;
      const updatedXP = currentXP + quest.xpReward;

      await userStatsRef.set({
        ...currentStats,
        xp: updatedXP,
        level: Math.max(currentStats.level || 1, Math.floor(updatedXP / 500) + 1),
        streak: currentStats.streak || 1,
        badges: currentStats.badges || [],
        rank: currentStats.rank || 0,
        achievements: [
          ...(currentStats.achievements || []),
          {
            title: `${quest.title} Claimed!`,
            description: quest.description,
            xp: quest.xpReward,
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({
        success: true,
        xpAwarded: quest.xpReward,
        quest: userProgress.quests[questIndex],
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating daily quests:", error);
    return NextResponse.json({ error: "Failed to update quests" }, { status: 500 });
  }
}
