import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";

// GET - Fetch public course (no auth required)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();

    if (!id) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    // Try published_courses collection FIRST (more efficient)
    const publishedRef = adminDb.collection("published_courses").doc(id);
    const pubSnap = await publishedRef.get();

    if (pubSnap.exists) {
      const pubData = pubSnap.data();
      return NextResponse.json({
        success: true,
        course: {
          id: pubSnap.id,
          ...pubData,
          chapters: pubData.chapters || [],
          chapterCount: pubData.chapters?.length || 0,
        },
      });
    }

    // Fallback: Search across all users (legacy/direct link support)
    const usersRef = adminDb.collection("users");
    const usersSnapshot = await usersRef.get();

    for (const userDoc of usersSnapshot.docs) {
      const courseRef = userDoc.ref.collection("roadmaps").doc(id);
      const courseSnap = await courseRef.get();

      if (courseSnap.exists) {
        const courseData = courseSnap.data();

        // Check if course is public
        if (!courseData.isPublic) {
          return NextResponse.json(
            { error: "This course is private" },
            { status: 403 }
          );
        }

        // Return public course data
        return NextResponse.json({
          success: true,
          course: {
            id: courseSnap.id,
            courseTitle: courseData.courseTitle,
            courseDescription: courseData.courseDescription,
            chapters: courseData.chapters || [],
            chapterCount: courseData.chapters?.length || 0,
            difficulty: courseData.difficulty,
            createdAt: courseData.createdAt,
            createdBy: userDoc.id,
            shareCount: courseData.shareCount || 0,
          },
        });
      }
    }

    return NextResponse.json(
      { error: "Course not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching public course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course: " + error.message },
      { status: 500 }
    );
  }
}

// POST - Make course public/private
export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { isPublic } = await request.json();
    const userId = session.user.email;
    const adminDb = getAdminDb();

    if (!id || typeof isPublic !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Update course visibility in user's roadmap
    const courseRef = adminDb.collection("users").doc(userId).collection("roadmaps").doc(id);
    const courseSnap = await courseRef.get();
    
    if (!courseSnap.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseData = courseSnap.data();

    // 2. Perform the update
    await courseRef.update({
      isPublic: isPublic,
      updatedAt: new Date().toISOString(),
    });

    // 3. Mirror to global published_courses collection for discovery
    const publishedRef = adminDb.collection("published_courses").doc(id);
    
    if (isPublic) {
      // Add or Update in global gallery
      await publishedRef.set({
        courseTitle: courseData.courseTitle,
        courseDescription: courseData.courseDescription || "",
        chapters: courseData.chapters || [],
        difficulty: courseData.difficulty || "balanced",
        createdBy: userId,
        authorName: session.user.name || "Anonymous",
        authorImage: session.user.image || null,
        status: "published",
        publishedAt: new Date().toISOString(),
      }, { merge: true });
    } else {
      // Remove from global gallery if set to private
      await publishedRef.delete();
    }

    return NextResponse.json({
      success: true,
      message: isPublic ? "Course is now public" : "Course is now private",
      isPublic,
    });
  } catch (error) {
    console.error("Error updating course visibility:", error);
    return NextResponse.json(
      { error: "Failed to update course: " + error.message },
      { status: 500 }
    );
  }
}
