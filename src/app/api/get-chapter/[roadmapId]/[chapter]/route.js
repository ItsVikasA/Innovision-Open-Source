import { getAdminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Database not available. Check server configuration." },
      { status: 500 }
    );
  }

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { roadmapId, chapter } = await params;
    const docRef = adminDb
      .collection("users")
      .doc(session.user.email)
      .collection("roadmaps")
      .doc(roadmapId)
      .collection("chapters")
      .doc(chapter);

    const taskDocRef = adminDb
      .collection("users")
      .doc(session.user.email)
      .collection("roadmaps")
      .doc(roadmapId)
      .collection("chapters")
      .doc(chapter)
      .collection("tasks")
      .doc("task");

    const docSnap = await docRef.get();
    const taskSnap = await taskDocRef.get();
    if (docSnap.exists && docSnap.data().process === "pending") {
      return NextResponse.json({ chapter: { process: "pending" } });
    }
    if (!docSnap.exists) {
      return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
    }
    const tasks = Object.values(taskSnap?.data() || {});

    return NextResponse.json({
      chapter: { ...docSnap.data(), tasks },
    });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
