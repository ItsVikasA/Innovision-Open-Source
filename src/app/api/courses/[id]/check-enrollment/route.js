import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request, { params }) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Database not available. Check server configuration." },
      { status: 500 }
    );
  }

  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ enrolled: false });
    }

    const { id: courseId } = params;

    // Check if user has a roadmap for this course
    const roadmapsRef = adminDb.collection("users").doc(session.user.email).collection("roadmaps");
    const q = roadmapsRef.where("courseId", "==", courseId);
    const querySnapshot = await q.get();

    if (!querySnapshot.empty) {
      // User is enrolled - return the first roadmap ID
      const roadmapDoc = querySnapshot.docs[0];
      return NextResponse.json({
        enrolled: true,
        roadmapId: roadmapDoc.id,
      });
    }

    return NextResponse.json({ enrolled: false });
  } catch (error) {
    return NextResponse.json({ enrolled: false });
  }
}
