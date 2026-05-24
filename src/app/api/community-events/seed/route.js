import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const SAMPLE_EVENTS = [
  {
    title: "Plant 10,000 Trees Week",
    description:
      "Join learners worldwide in a collective effort to plant 10,000 trees. Every lesson you complete counts as one tree planted toward the community goal.",
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
  },
  {
    title: "Zero Plastic Challenge",
    description:
      "Commit to reducing plastic use. Share your pledge and earn XP for every sustainability lesson completed this month. Together, let's rid the oceans of plastic.",
    theme: "blue",
    icon: "♻️",
    goal: 50000,
    unit: "pledges",
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    xpReward: 1000,
    badgeId: "zero_plastic_hero",
    milestones: [
      { at: 10000, label: "Awareness Rising", xpBonus: 100 },
      { at: 25000, label: "Commitment Strong", xpBonus: 200 },
      { at: 40000, label: "Impact Felt", xpBonus: 300 },
      { at: 50000, label: "Ocean Saved! 🌊", xpBonus: 400 },
    ],
    isSeasonal: true,
    isActive: true,
  },
  {
    title: "Clean Water Mission",
    description:
      "Help bring awareness to clean water access. Complete water conservation modules to contribute to a global awareness mission and unlock exclusive rewards.",
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
  },
];

// GET /api/community-events/seed
// Seeds the Firestore database with sample events (run once for demo/dev)
export async function GET() {
  try {
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase not configured — cannot seed events" },
        { status: 503 }
      );
    }

    // Check if events already exist to avoid duplicates
    const existing = await adminDb.collection("community_events").limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({
        message: "Events already seeded. Delete existing events to re-seed.",
        count: 0,
      });
    }

    const batch = adminDb.batch();
    const seededIds = [];

    for (const event of SAMPLE_EVENTS) {
      const docRef = adminDb.collection("community_events").doc();
      batch.set(docRef, {
        ...event,
        createdAt: new Date().toISOString(),
      });
      seededIds.push(docRef.id);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${SAMPLE_EVENTS.length} community events`,
      count: SAMPLE_EVENTS.length,
      ids: seededIds,
    });
  } catch (error) {
    console.error("Error seeding community events:", error);
    return NextResponse.json(
      { error: "Failed to seed events" },
      { status: 500 }
    );
  }
}
