import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Fetch user profile
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data();

    // Fetch gamification data
    const gamRef = adminDb.collection("gamification").doc(userId);
    const gamSnap = await gamRef.get();
    const gamData = gamSnap.exists ? gamSnap.data() : {};

    // Count completed courses
    const roadmapsSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("roadmaps")
      .where("process", "==", "completed")
      .get();

    const coursesCompleted = roadmapsSnap.size;

    // Return only public-safe fields
    return NextResponse.json({
      user: {
        name: userData.name || userData.displayName || userId.split("@")[0],
        avatar: userData.photoURL || userData.image || null,
        bio: userData.bio || null,
        location: userData.location || null,
        joinedAt: userData.createdAt || null,
        xp: gamData.xp || 0,
        level: gamData.level || 1,
        streak: gamData.streak || 0,
        coursesCompleted,
        badges: gamData.badges || [],
      },
    });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
