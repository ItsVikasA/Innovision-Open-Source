// Progress Sync API for Offline Support — with LWW merge & server-side validation
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";

// Minimum seconds a chapter should take to complete (prevents spoofed instant completions)
const MIN_CHAPTER_DURATION_SECONDS = 30;

/**
 * GET /api/progress/sync — fetch server-side progress for a course
 * Query params: courseId (required), courseType (optional, default "roadmap")
 */
export async function GET(request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const email = session.user.email;

    // Fetch the canonical progress doc for this user+course
    const docId = `${email}_${courseId}`;
    const docRef = adminDb.collection("progress").doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({
        progress: null,
        message: "No server progress found",
      });
    }

    return NextResponse.json({ progress: docSnap.data() });
  } catch (error) {
    console.error("Progress fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

/**
 * POST /api/progress/sync — merge offline progress with server state using LWW
 * Body: { courseId, courseType, chapters: { [chapterKey]: { completed, completedAt, timeSpent } }, clientTimestamp }
 */
export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { courseId, courseType, chapters, clientTimestamp } = body;

    if (!courseId || !chapters || typeof chapters !== "object") {
      return NextResponse.json(
        { error: "courseId and chapters object are required" },
        { status: 400 }
      );
    }

    const email = session.user.email;
    const docId = `${email}_${courseId}`;
    const docRef = adminDb.collection("progress").doc(docId);

    // Run merge inside a transaction for atomicity
    const result = await adminDb.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      const serverData = docSnap.exists ? docSnap.data() : {};
      const serverChapters = serverData.chapters || {};
      const mergedChapters = { ...serverChapters };
      const conflicts = [];
      let rejected = 0;

      for (const [chapterKey, clientChapter] of Object.entries(chapters)) {
        const serverChapter = serverChapters[chapterKey];
        const clientCompletedAt = clientChapter.completedAt || 0;
        const serverCompletedAt = serverChapter?.completedAt || 0;

        // Validate: reject suspiciously fast completions (anti-spoofing)
        if (clientChapter.completed && clientChapter.timeSpent !== undefined) {
          if (clientChapter.timeSpent < MIN_CHAPTER_DURATION_SECONDS) {
            conflicts.push({
              chapter: chapterKey,
              reason: "completion_too_fast",
              clientTimeSpent: clientChapter.timeSpent,
              minimumRequired: MIN_CHAPTER_DURATION_SECONDS,
            });
            rejected++;
            continue; // Skip this chapter — don't merge suspicious data
          }
        }

        // LWW merge: keep whichever has the later completedAt timestamp
        if (!serverChapter) {
          // No server record — accept client data
          mergedChapters[chapterKey] = {
            completed: clientChapter.completed || false,
            completedAt: clientCompletedAt,
            timeSpent: clientChapter.timeSpent || 0,
            source: "offline",
          };
        } else if (clientCompletedAt > serverCompletedAt) {
          // Client is newer — use client data
          mergedChapters[chapterKey] = {
            completed: clientChapter.completed || false,
            completedAt: clientCompletedAt,
            timeSpent: clientChapter.timeSpent || 0,
            source: "offline",
          };
          if (serverChapter.completed && !clientChapter.completed) {
            // Conflict: server had it completed but client says not completed (but client is newer)
            conflicts.push({
              chapter: chapterKey,
              reason: "overwrite_completed",
              resolution: "client_wins_lww",
            });
          }
        } else {
          // Server is newer or equal — keep server data
          if (clientChapter.completed && !serverChapter.completed) {
            conflicts.push({
              chapter: chapterKey,
              reason: "server_newer",
              resolution: "server_wins_lww",
            });
          }
          // Server data already in mergedChapters
        }
      }

      const mergedDoc = {
        userId: email,
        courseId,
        courseType: courseType || "roadmap",
        chapters: mergedChapters,
        lastSyncedAt: Date.now(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      transaction.set(docRef, mergedDoc, { merge: true });

      return { mergedChapters, conflicts, rejected };
    });

    return NextResponse.json({
      success: true,
      message: "Progress synced with LWW merge",
      conflicts: result.conflicts,
      rejected: result.rejected,
      chapters: result.mergedChapters,
    });
  } catch (error) {
    console.error("Progress sync error:", error);
    return NextResponse.json({ error: "Failed to sync progress" }, { status: 500 });
  }
}
