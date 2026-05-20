import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: courseId } = await params;

    // Check if user is already enrolled
    const roadmapsRef = adminDb.collection("users").doc(session.user.email).collection("roadmaps");
    const enrollmentQuery = roadmapsRef.where("courseId", "==", courseId);
    const existingEnrollment = await enrollmentQuery.get();

    if (!existingEnrollment.empty) {
      const existingRoadmap = existingEnrollment.docs[0];
      return NextResponse.json({
        success: true,
        roadmapId: existingRoadmap.id,
        message: "You are already enrolled in this course",
        alreadyEnrolled: true,
      });
    }

    // Fetch course from published_courses
    const courseRef = adminDb.collection("published_courses").doc(courseId);
    const courseSnap = await courseRef.get();

    if (!courseSnap.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseData = courseSnap.data();
    const chapters = courseData.chapters || [];

    // Create roadmap
    const roadmapId = `${Date.now()}`;
    const roadmapRef = adminDb.collection("users").doc(session.user.email).collection("roadmaps").doc(roadmapId);

    await roadmapRef.set({
      userId: session.user.email,
      courseId: courseId,
      courseTitle: courseData.title || "Untitled Course",
      courseDescription: courseData.description || "",
      chapters: chapters.map((ch, idx) => ({
        chapterNumber: idx + 1,
        chapterTitle: ch.title || `Chapter ${idx + 1}`,
        chapterDescription: ch.description || "",
        completed: false,
      })),
      completed: false,
      process: "completed",
      createdAt: new Date().toISOString(),
      enrolledAt: new Date().toISOString(),
      isStudioCourse: true, // Mark as Studio course
    });

    // Create chapter subcollections with actual content
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterNum = (i + 1).toString();

      const chapterRef = adminDb
        .collection("users")
        .doc(session.user.email)
        .collection("roadmaps")
        .doc(roadmapId)
        .collection("chapters")
        .doc(chapterNum);

      await chapterRef.set({
        content: chapter.content || "",
        title: chapter.title || `Chapter ${i + 1}`,
        chapterNumber: i + 1,
        process: "completed",
        createdAt: new Date().toISOString(),
      });

      // Create tasks document
      const tasksRef = adminDb
        .collection("users")
        .doc(session.user.email)
        .collection("roadmaps")
        .doc(roadmapId)
        .collection("chapters")
        .doc(chapterNum)
        .collection("tasks")
        .doc("task");

      await tasksRef.set({});
    }

    return NextResponse.json({
      success: true,
      roadmapId: roadmapId,
      message: "Successfully enrolled in course",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to enroll in course",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
