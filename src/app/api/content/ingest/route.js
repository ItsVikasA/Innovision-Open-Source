import { NextResponse } from "next/server";
import { ingestContent } from "@/lib/ingestion-service";
import { detectFileType } from "@/lib/text-extractor";
import { createNotification } from "@/lib/create-notification";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(request) {
  try {
    let userId = "anonymous";

    try {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const { getAuth } = await import("firebase-admin/auth");
        const token = authHeader.replace("Bearer ", "");
        const decoded = await getAuth().verifyIdToken(token);
        userId = decoded.email || decoded.uid;
      }
    } catch (authError) {
      console.log("[DEBUG] Auth verification failed, using anonymous:", authError.message);
    }

    console.log("[DEBUG] Content ingestion userId:", userId);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = detectFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        {
          error: `Unsupported file format: "${file.name}". Supported formats: PDF, TXT, EPUB`,
        },
        { status: 400 }
      );
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileSize = buffer.length;
    const result = await ingestContent(buffer, file.name, fileSize, userId);

    if (userId && userId !== "anonymous") {
      const adminDb = getAdminDb();
      console.log("[DEBUG] Creating ingestion notification with link:", `/ingested-course/${result.courseId}`);
      createNotification(adminDb, {
        userId,
        title: "Course Created from File!",
        body: `"${result.title}" with ${result.chapterCount} chapters is ready to explore.`,
        type: "progress",
        link: `/ingested-course/${result.courseId}`,
      }).catch(() => { });
    }

    return NextResponse.json({
      success: true,
      courseId: result.courseId,
      title: result.title,
      description: result.description,
      chapterCount: result.chapterCount,
      totalWords: result.totalWords,
      estimatedReadingTime: result.estimatedReadingTime,
      chapters: result.chapters,
      message: `Course "${result.title}" created with ${result.chapterCount} chapters!`,
    });
  } catch (error) {
    console.error("Content ingestion error:", error);

    const message = error.message || "Failed to ingest content";
    const status = message.includes("Unsupported") || message.includes("too large") ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
