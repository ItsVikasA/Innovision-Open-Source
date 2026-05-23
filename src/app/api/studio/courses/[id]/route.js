import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function PUT(request, { params }) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Database not available. Check server configuration." },
      { status: 500 }
    );
  }

  try {
    const { id } = params;
    const courseData = await request.json();

    const courseRef = adminDb.collection("published_courses").doc(id);

    // Check if course exists
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Update the course
    await courseRef.update({
      ...courseData,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Course updated successfully",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Database not available. Check server configuration." },
      { status: 500 }
    );
  }

  try {
    const { id } = params;

    await adminDb.collection("published_courses").doc(id).delete();

    return NextResponse.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
