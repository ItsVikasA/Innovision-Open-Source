import { getAdminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function GET() {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Database not available. Check server configuration." },
      { status: 500 }
    );
  }

  const session = await getServerSession();

  // Fetch from gamification collection (single source of truth for XP)
  const gamificationCol = adminDb.collection("gamification");
  const gamificationSnaps = await gamificationCol.get();

  // Fetch user details from users collection
  const usersCol = adminDb.collection("users");
  const usersSnaps = await usersCol.get();

  // Create a map of user details
  const usersMap = {};
  usersSnaps.docs.forEach((doc) => {
    usersMap[doc.id] = {
      name: doc.data().name,
      email: doc.data().email,
      image: doc.data().image,
    };
  });

  // Combine gamification data with user details
  let xps = gamificationSnaps.docs.map((doc) => {
    const userId = doc.id;
    const userDetails = usersMap[userId] || {};
    return {
      xp: doc.data().xp || 0,
      email: userId,
      name: userDetails.name || "Unknown",
      image: userDetails.image || "",
    };
  });

  xps = xps.sort((a, b) => b.xp - a.xp);
  const rank = xps.findIndex((e) => e.email === session?.user.email) + 1;
  const leaderboard = xps.length >= 10 ? xps.slice(0, 11) : xps;

  return NextResponse.json({ rank, leaderboard });
}
