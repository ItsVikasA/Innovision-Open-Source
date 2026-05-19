import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { assertAdmin, AuthError } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function hashUserId(userId, secret) {
  return crypto.createHmac("sha256", secret).update(userId).digest("hex").substring(0, 16);
}

function roundTimestamp(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function parseLimit(raw) {
  const n = parseInt(raw || "", 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

async function fetchPage(adminDb, collectionName, limit, cursor) {
  const { FieldPath } = await import("firebase-admin/firestore");
  let query = adminDb.collection(collectionName).orderBy(FieldPath.documentId()).limit(limit);
  if (cursor) {
    query = query.startAfter(cursor);
  }
  const snapshot = await query.get();
  return snapshot.docs;
}

function mapOutcomes(docs, secret) {
  return docs.map((doc) => {
    const data = doc.data();
    return {
      userId: hashUserId(doc.id, secret),
      xp: data.xp,
      level: data.level,
      streak: data.streak,
      badgesCount: data.badges?.length || 0,
      achievementsCount: data.achievements?.length || 0,
      lastActive: roundTimestamp(data.lastActive),
    };
  });
}

function mapInteractions(docs, secret) {
  return docs.map((doc) => {
    const data = doc.data();
    return {
      userId: hashUserId(data.userId || doc.id, secret),
      action: data.action,
      timestamp: roundTimestamp(data.timestamp),
      duration: data.duration,
      courseId: data.courseId,
      chapterId: data.chapterId,
    };
  });
}

export async function GET(request) {
  let decoded;
  try {
    decoded = await assertAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateKey = `research-export:${decoded.uid || decoded.email || "unknown"}`;
  const rate = checkRateLimit(rateKey, { limit: 30, windowMs: 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
        },
      }
    );
  }

  const secret = process.env.RESEARCH_HASH_SECRET;
  if (!secret) {
    console.error("RESEARCH_HASH_SECRET is not configured");
    return NextResponse.json(
      { error: "Research export is not configured" },
      { status: 503 }
    );
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Database is not initialized" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const cursor = searchParams.get("cursor");
  const limit = parseLimit(searchParams.get("limit"));

  let collectionName;
  let mapper;
  if (type === "interactions") {
    collectionName = "user_activity";
    mapper = mapInteractions;
  } else if (type === "outcomes") {
    collectionName = "gamification";
    mapper = mapOutcomes;
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const docs = await fetchPage(adminDb, collectionName, limit, cursor);
    const data = mapper(docs, secret);
    const nextCursor = docs.length === limit ? docs[docs.length - 1].id : null;
    return NextResponse.json({ data, nextCursor });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
