import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Try published_courses collection first
    let courseRef = adminDb.collection("published_courses").doc(id);
    let courseSnap = await courseRef.get();

    // If not found, try courses collection
    if (!courseSnap.exists) {
      courseRef = adminDb.collection("courses").doc(id);
      courseSnap = await courseRef.get();
    }

    if (!courseSnap.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseData = {
      id: courseSnap.id,
      ...courseSnap.data(),
    };

    return NextResponse.json(courseData);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
  }
}
