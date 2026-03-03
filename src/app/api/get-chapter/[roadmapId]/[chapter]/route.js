import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
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

    if (!docSnap.exists) {
      return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
    }

    const data = docSnap.data();

    if (data.process === "pending") {
      return NextResponse.json({ chapter: { process: "pending" } });
    }

    if (data.process === "failed") {
      return NextResponse.json({
        chapter: {
          process: "failed",
          error: data.error || "Chapter generation failed. Please try again.",
        },
      });
    }

    const taskSnap = await taskDocRef.get();
    const tasks = Object.values(taskSnap?.data() || {});

    return NextResponse.json({
      chapter: { ...data, tasks },
    });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
