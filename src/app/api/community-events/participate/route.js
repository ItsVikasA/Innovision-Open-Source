import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { createNotification } from "@/lib/create-notification";

// POST /api/community-events/participate
// Body: { userId, eventId, amount }
export async function POST(request) {
  try {
    const { userId, eventId, amount } = await request.json();

    if (!userId || !eventId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "userId, eventId, and a positive amount are required" },
        { status: 400 }
      );
    }

    const contribution = Number(amount);
    const adminDb = getAdminDb();

    // Fallback / demo mode when Firebase is not configured
    if (!adminDb) {
      return NextResponse.json({
        success: true,
        contribution,
        xpAwarded: 0,
        milestonesUnlocked: [],
        _warning: "Firebase not configured — contribution logged in demo mode only",
      });
    }

    // Fetch the event
    const eventRef = adminDb.collection("community_events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = eventDoc.data();
    const now = new Date();
    const endDate = new Date(event.endDate);
    const startDate = new Date(event.startDate);

    if (now < startDate) {
      return NextResponse.json(
        { error: "Event has not started yet" },
        { status: 400 }
      );
    }
    if (now > endDate) {
      return NextResponse.json(
        { error: "Event has already ended" },
        { status: 400 }
      );
    }

    // Upsert participation record
    const partQuery = await adminDb
      .collection("event_participation")
      .where("userId", "==", userId)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();

    let prevContribution = 0;
    let partDocRef;

    if (partQuery.empty) {
      // New participant
      const newPart = {
        userId,
        eventId,
        contribution,
        joinedAt: new Date().toISOString(),
        completedAt: null,
        rewardsClaimed: [],
      };
      partDocRef = await adminDb.collection("event_participation").add(newPart);
    } else {
      partDocRef = partQuery.docs[0].ref;
      prevContribution = partQuery.docs[0].data().contribution || 0;
      await partDocRef.update({
        contribution: prevContribution + contribution,
      });
    }

    const newContribution = prevContribution + contribution;

    // Compute total community progress to detect milestones
    const allPartSnap = await adminDb
      .collection("event_participation")
      .where("eventId", "==", eventId)
      .get();

    let communityTotal = 0;
    allPartSnap.forEach((p) => {
      communityTotal += p.data().contribution || 0;
    });

    // Check which milestones were just crossed
    const milestones = event.milestones || [];
    const milestonesUnlocked = [];
    let totalXpAwarded = 0;

    // Determine previous community total (before this contribution)
    const prevCommunityTotal = communityTotal - contribution;

    for (const milestone of milestones) {
      if (
        prevCommunityTotal < milestone.at &&
        communityTotal >= milestone.at
      ) {
        milestonesUnlocked.push(milestone);
        totalXpAwarded += milestone.xpBonus || 0;
      }
    }

    // Award event-completion XP if goal just crossed
    if (prevCommunityTotal < event.goal && communityTotal >= event.goal) {
      totalXpAwarded += event.xpReward || 0;

      // Mark participant as completed
      await partDocRef.update({
        completedAt: new Date().toISOString(),
      });
    }

    // Award XP via existing gamification stats
    if (totalXpAwarded > 0) {
      try {
        const userRef = adminDb.collection("gamification").doc(userId);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const stats = userDoc.data();
          const newXP = (stats.xp || 0) + totalXpAwarded;
          const newLevel = Math.floor(newXP / 500) + 1;
          await userRef.update({ xp: newXP, level: newLevel });

          // Fire a notification for milestone unlock
          if (milestonesUnlocked.length > 0) {
            createNotification(adminDb, {
              userId,
              title: `🎉 Milestone Unlocked: ${milestonesUnlocked[0].label}`,
              body: `You helped the community reach a new milestone in "${event.title}"! +${totalXpAwarded} XP`,
              type: "achievement",
              link: "/gamification",
            }).catch(() => {});
          }
        }
      } catch (xpError) {
        console.error("Error awarding XP for event milestone:", xpError);
      }
    }

    // Base XP for contributing (5 XP per contribution, up to 50 per day)
    const baseXp = Math.min(contribution * 5, 50);
    try {
      const userRef = adminDb.collection("gamification").doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const stats = userDoc.data();
        const newXP = (stats.xp || 0) + baseXp;
        const newLevel = Math.floor(newXP / 500) + 1;
        await userRef.update({ xp: newXP, level: newLevel });
      }
    } catch (e) {
      console.error("Error awarding base event XP:", e);
    }

    return NextResponse.json({
      success: true,
      contribution: newContribution,
      communityProgress: communityTotal,
      xpAwarded: totalXpAwarded + baseXp,
      milestonesUnlocked,
      goalReached: communityTotal >= event.goal,
    });
  } catch (error) {
    console.error("Error recording event participation:", error);
    return NextResponse.json(
      { error: "Failed to record participation" },
      { status: 500 }
    );
  }
}

// GET /api/community-events/participate?userId=xxx&eventId=yyy
// Returns a user's participation record for a specific event
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const eventId = searchParams.get("eventId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ participation: null });
    }

    let query = adminDb
      .collection("event_participation")
      .where("userId", "==", userId);

    if (eventId) {
      query = query.where("eventId", "==", eventId);
    }

    const snap = await query.get();
    const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
      participation: eventId ? (records[0] || null) : records,
    });
  } catch (error) {
    console.error("Error fetching participation:", error);
    return NextResponse.json(
      { error: "Failed to fetch participation" },
      { status: 500 }
    );
  }
}
