import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
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
  try {
    const { id } = await params;

    await adminDb.collection("published_courses").doc(id).delete();

    return NextResponse.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
