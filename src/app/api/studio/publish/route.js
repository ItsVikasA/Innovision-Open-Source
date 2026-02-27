import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createNotification } from "@/lib/create-notification";

export async function POST(request) {
  try {
    const courseData = await request.json();

    // Save to published courses collection
    const docRef = await adminDb.collection("published_courses").add({
      ...courseData,
      status: "published",
      publishedAt: new Date().toISOString(),
    });

    // Create notification for the creator
    if (courseData.createdBy) {
      try {
        await createNotification(adminDb, {
          userId: courseData.createdBy,
          title: "Course Published!",
          body: `Your course "${courseData.title}" is now published and live.`,
          type: "achievement",
          link: "/courses", // Link to the public courses list or similar
        });
      } catch (notifError) {
        console.warn("Failed to create publish notification:", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: "Course published successfully",
    });
  } catch (error) {
    console.error("Error publishing course:", error);
    return NextResponse.json({ error: "Failed to publish course" }, { status: 500 });
  }
}
