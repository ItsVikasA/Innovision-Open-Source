import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// GET /api/community-events
// Returns all active and upcoming events with aggregated community progress
export async function GET() {
  try {
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json(FALLBACK_EVENTS);
    }

    const now = new Date();

    // Fetch all events
    const eventsSnap = await adminDb.collection("community_events").get();
    const events = [];

    for (const doc of eventsSnap.docs) {
      const event = { id: doc.id, ...doc.data() };

      // Aggregate total community contributions
      const partSnap = await adminDb
        .collection("event_participation")
        .where("eventId", "==", doc.id)
        .get();

      let totalContribution = 0;
      let participantCount = 0;
      partSnap.forEach((p) => {
        totalContribution += p.data().contribution || 0;
        participantCount += 1;
      });

      event.communityProgress = totalContribution;
      event.participantCount = participantCount;

      // Compute derived status
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);

      if (now < start) {
        event.status = "upcoming";
      } else if (now > end) {
        event.status = "ended";
      } else {
        event.status = "active";
      }

      events.push(event);
    }

    // Sort: active first, then upcoming, then ended
    const order = { active: 0, upcoming: 1, ended: 2 };
    events.sort((a, b) => order[a.status] - order[b.status]);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching community events:", error);
    return NextResponse.json(FALLBACK_EVENTS);
  }
}

// POST /api/community-events
// Creates a new event (admin / seed usage)
export async function POST(request) {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      theme,
      icon,
      goal,
      unit,
      startDate,
      endDate,
      xpReward,
      badgeId,
      milestones,
      isSeasonal,
    } = body;

    if (!title || !goal || !startDate || !endDate) {
      return NextResponse.json(
        { error: "title, goal, startDate and endDate are required" },
        { status: 400 }
      );
    }

    const newEvent = {
      title,
      description: description || "",
      theme: theme || "green",
      icon: icon || "🌍",
      goal: Number(goal),
      unit: unit || "actions",
      startDate,
      endDate,
      xpReward: Number(xpReward) || 500,
      badgeId: badgeId || null,
      milestones: milestones || [],
      isSeasonal: Boolean(isSeasonal),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("community_events").add(newEvent);
    return NextResponse.json({ success: true, id: docRef.id, event: newEvent });
  } catch (error) {
    console.error("Error creating community event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

// Fallback for when Firebase is not configured (demo mode)
const FALLBACK_EVENTS = {
  events: [
    {
      id: "plant-trees-week",
      title: "Plant 10,000 Trees Week",
      description:
        "Join learners worldwide in a collective effort to plant 10,000 trees. Every lesson you complete counts as one tree planted.",
      theme: "green",
      icon: "🌳",
      goal: 10000,
      unit: "trees",
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      xpReward: 500,
      badgeId: "eco_planter",
      milestones: [
        { at: 2500, label: "Seedling Stage", xpBonus: 50 },
        { at: 5000, label: "Sapling Stage", xpBonus: 100 },
        { at: 7500, label: "Young Forest", xpBonus: 150 },
        { at: 10000, label: "Full Forest 🎉", xpBonus: 200 },
      ],
      isSeasonal: false,
      isActive: true,
      status: "active",
      communityProgress: 6843,
      participantCount: 312,
    },
    {
      id: "zero-plastic-challenge",
      title: "Zero Plastic Challenge",
      description:
        "Commit to reducing plastic use. Share your pledge and earn XP for every sustainability lesson this month.",
      theme: "blue",
      icon: "♻️",
      goal: 50000,
      unit: "pledges",
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
      xpReward: 1000,
      badgeId: "zero_plastic_hero",
      milestones: [
        { at: 10000, label: "Awareness", xpBonus: 100 },
        { at: 25000, label: "Commitment", xpBonus: 200 },
        { at: 40000, label: "Impact", xpBonus: 300 },
        { at: 50000, label: "Ocean Saved! 🌊", xpBonus: 400 },
      ],
      isSeasonal: true,
      isActive: true,
      status: "active",
      communityProgress: 18420,
      participantCount: 891,
    },
    {
      id: "clean-water-mission",
      title: "Clean Water Mission",
      description:
        "Help bring awareness to clean water access. Complete water conservation modules to contribute to the mission.",
      theme: "cyan",
      icon: "💧",
      goal: 25000,
      unit: "awareness actions",
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
      xpReward: 750,
      badgeId: "water_guardian",
      milestones: [
        { at: 5000, label: "Drop by Drop", xpBonus: 75 },
        { at: 12500, label: "River Rising", xpBonus: 150 },
        { at: 20000, label: "Stream Strong", xpBonus: 225 },
        { at: 25000, label: "Ocean United! 💧", xpBonus: 300 },
      ],
      isSeasonal: true,
      isActive: true,
      status: "upcoming",
      communityProgress: 0,
      participantCount: 0,
    },
  ],
};
