import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
import { createNotification } from "@/lib/create-notification";

// GET - Fetch user's bookmarks
export async function GET(request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRef = adminDb.collection("users").doc(session.user.email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ bookmarks: [] });
    }

    const bookmarks = userDoc.data().bookmarks || [];
    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

// POST - Add or remove bookmark
export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roadmapId, courseId, chapterNumber, chapterTitle, roadmapTitle, courseTitle, courseType, action, chapterId } = await request.json();

    const id = courseId || roadmapId;
    const title = courseTitle || roadmapTitle || "Course";
    const type = courseType || "roadmap";

    if (!id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(session.user.email);
    const userDoc = await userRef.get();

    let bookmarks = userDoc.exists ? (userDoc.data().bookmarks || []) : [];
    const bookmarkId = chapterNumber !== undefined ? `${type}_${id}_${chapterNumber}` : `${type}_${id}_course`;

    if (action === "remove") {
      // Remove bookmark
      bookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    } else {
      // Add bookmark if not exists
      const exists = bookmarks.some(b => b.id === bookmarkId);
      if (!exists) {
        bookmarks.push({
          id: bookmarkId,
          roadmapId: id,
          courseId: id,
          chapterNumber: chapterNumber || 0,
          chapterId: chapterId || null,
          chapterTitle: chapterTitle || (chapterNumber ? `Chapter ${chapterNumber}` : "Course Overview"),
          roadmapTitle: title,
          courseTitle: title,
          courseType: type,
          createdAt: new Date().toISOString(),
        });
      }
    }

    await userRef.set({ bookmarks }, { merge: true });

    if (action !== "remove") {
      const chapterLabel = chapterTitle || (chapterNumber ? `Chapter ${chapterNumber}` : null);
      const notifBody = chapterLabel
        ? `You bookmarked "${chapterLabel}" in ${title}.`
        : `You bookmarked the course "${title}".`;

      let notifLink = "/roadmap";
      if (type === "ingested") {
        if (chapterId) {
          notifLink = `/ingested-course/${id}/${chapterId}`;
        } else if (chapterNumber && chapterNumber !== 0) {
          notifLink = `/ingested-course/${id}/${chapterNumber}`;
        } else {
          notifLink = `/ingested-course/${id}`;
        }
      } else if (type === "youtube") {
        notifLink = `/youtube-course/${id}`;
      } else {
        if (chapterNumber && chapterNumber !== 0) {
          notifLink = `/chapter-test/${id}/${chapterNumber}`;
        } else {
          notifLink = `/roadmap/${id}`;
        }
      }

      createNotification(adminDb, {
        userId: session.user.email,
        title: "Bookmark Saved",
        body: notifBody,
        type: "progress",
        link: notifLink,
      }).catch(() => { });
    }

    return NextResponse.json({
      success: true,
      bookmarks,
      isBookmarked: action !== "remove"
    });
  } catch (error) {
    console.error("Error updating bookmark:", error);
    return NextResponse.json({ error: "Failed to update bookmark" }, { status: 500 });
  }
}
