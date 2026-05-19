import { NextResponse } from "next/server";
import { ingestContent } from "@/lib/ingestion-service";
import { detectFileType } from "@/lib/text-extractor";
import { createNotification } from "@/lib/create-notification";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireBearerAuth, AuthError } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PER_USER_LIMIT = 10;
const PER_IP_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export async function POST(request) {
  let decoded;
  try {
    decoded = await requireBearerAuth(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = decoded.email || decoded.uid;

  const userRate = checkRateLimit(`ingest:user:${userId}`, {
    limit: PER_USER_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  if (!userRate.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(userRate.retryAfterMs / 1000)) },
      }
    );
  }

  const ipRate = checkRateLimit(`ingest:ip:${getClientIp(request)}`, {
    limit: PER_IP_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  if (!ipRate.allowed) {
    return NextResponse.json(
      { error: "Too many uploads from this network. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(ipRate.retryAfterMs / 1000)) },
      }
    );
  }

  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (!contentLength) {
    return NextResponse.json(
      { error: "Content-Length header is required" },
      { status: 411 }
    );
  }
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum allowed size is ${MAX_UPLOAD_BYTES} bytes.` },
      { status: 413 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

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

    if (fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum allowed size is ${MAX_UPLOAD_BYTES} bytes.` },
        { status: 413 }
      );
    }

    const result = await ingestContent(buffer, file.name, fileSize, userId);

    const adminDb = getAdminDb();
    if (adminDb) {
      createNotification(adminDb, {
        userId,
        title: "Course Created from File!",
        body: `"${result.title}" with ${result.chapterCount} chapters is ready to explore.`,
        type: "progress",
        link: `/ingested-course/${result.courseId}`,
      }).catch(() => {});
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
