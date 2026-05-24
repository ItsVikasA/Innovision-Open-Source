import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// GET /api/community-events/history?userId=xxx
// Returns all past event participation records for a user,
// enriched with event metadata.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    if (!adminDb) {
      // Return demo history when Firebase is not configured
      return NextResponse.json({ history: DEMO_HISTORY });
    }

    // Fetch all participation records for the user
    const partSnap = await adminDb
      .collection("event_participation")
      .where("userId", "==", userId)
      .get();

    if (partSnap.empty) {
      return NextResponse.json({ history: [] });
    }

    const history = [];

    for (const partDoc of partSnap.docs) {
      const part = partDoc.data();
      const eventId = part.eventId;

      // Fetch the event details
      const eventDoc = await adminDb
        .collection("community_events")
        .doc(eventId)
        .get();

      if (!eventDoc.exists) continue;

      const event = eventDoc.data();
      const now = new Date();
      const endDate = new Date(event.endDate);

      // Only return ended or active events (not purely upcoming)
      const status = now > endDate ? "ended" : "active";

      // Compute community total for this event
      const allPartSnap = await adminDb
        .collection("event_participation")
        .where("eventId", "==", eventId)
        .get();

      let communityTotal = 0;
      let participantCount = 0;
      allPartSnap.forEach((p) => {
        communityTotal += p.data().contribution || 0;
        participantCount += 1;
      });

      // Determine which milestones this user helped unlock
      const milestones = event.milestones || [];
      const unlockedMilestones = milestones.filter(
        (m) => communityTotal >= m.at
      );

      history.push({
        id: partDoc.id,
        eventId,
        eventTitle: event.title,
        eventIcon: event.icon,
        eventTheme: event.theme,
        status,
        userContribution: part.contribution || 0,
        communityProgress: communityTotal,
        goal: event.goal,
        unit: event.unit,
        participantCount,
        joinedAt: part.joinedAt,
        completedAt: part.completedAt,
        rewardsClaimed: part.rewardsClaimed || [],
        unlockedMilestones,
        xpReward: event.xpReward,
        badgeId: event.badgeId,
        goalReached: communityTotal >= event.goal,
        startDate: event.startDate,
        endDate: event.endDate,
      });
    }

    // Sort: most recent first
    history.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching event history:", error);
    return NextResponse.json(
      { error: "Failed to fetch event history" },
      { status: 500 }
    );
  }
}

const DEMO_HISTORY = [
  {
    id: "demo-1",
    eventId: "plant-trees-week",
    eventTitle: "Plant 10,000 Trees Week",
    eventIcon: "🌳",
    eventTheme: "green",
    status: "ended",
    userContribution: 47,
    communityProgress: 10000,
    goal: 10000,
    unit: "trees",
    participantCount: 312,
    joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    rewardsClaimed: ["eco_planter"],
    unlockedMilestones: [
      { at: 2500, label: "Seedling Stage", xpBonus: 50 },
      { at: 5000, label: "Sapling Stage", xpBonus: 100 },
      { at: 7500, label: "Young Forest", xpBonus: 150 },
      { at: 10000, label: "Full Forest 🎉", xpBonus: 200 },
    ],
    xpReward: 500,
    badgeId: "eco_planter",
    goalReached: true,
  },
];
