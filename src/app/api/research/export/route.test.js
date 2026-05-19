import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldPath: { documentId: () => "__name__" },
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: vi.fn(),
  FieldValue: { increment: (n) => ({ __op: "increment", value: n }) },
}));

vi.mock("@/lib/firebase", () => ({
  auth: {},
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: init?.headers || {},
    }),
  },
}));

import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { clearAllRateLimits } from "@/lib/rate-limit";
import { GET } from "./route.js";

function makeReq(url) {
  return { url };
}

function makeCookiesWith(sessionValue) {
  return {
    get: vi.fn((name) => (name === "session" && sessionValue ? { value: sessionValue } : undefined)),
  };
}

function makeDocs(items) {
  return items.map((entry) => ({
    id: entry.id,
    data: () => entry.data,
  }));
}

function makeDb(docs) {
  const query = {
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
    get: vi.fn(async () => ({ docs })),
  };
  return {
    collection: vi.fn(() => query),
    _query: query,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAllRateLimits();
  process.env.RESEARCH_HASH_SECRET = "test-secret";
});

describe("GET /api/research/export", () => {
  it("returns 401 when no session cookie is present", async () => {
    cookies.mockResolvedValue(makeCookiesWith(null));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(),
      verifyIdToken: vi.fn(),
    });
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when both verifySessionCookie and verifyIdToken throw", async () => {
    cookies.mockResolvedValue(makeCookiesWith("bad-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => {
        throw new Error("bad cookie");
      }),
      verifyIdToken: vi.fn(async () => {
        throw new Error("bad id token");
      }),
    });
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when verified token does not have admin custom claim", async () => {
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: false })),
      verifyIdToken: vi.fn(),
    });
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for an unknown type", async () => {
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: true })),
      verifyIdToken: vi.fn(),
    });
    getAdminDb.mockReturnValue(makeDb([]));
    const res = await GET(makeReq("https://x.test/api/research/export?type=nope"));
    expect(res.status).toBe(400);
  });

  it("returns 503 when RESEARCH_HASH_SECRET is missing", async () => {
    delete process.env.RESEARCH_HASH_SECRET;
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: true })),
      verifyIdToken: vi.fn(),
    });
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes"));
    expect(res.status).toBe(503);
  });

  it("returns 503 when admin db is not initialized", async () => {
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: true })),
      verifyIdToken: vi.fn(),
    });
    getAdminDb.mockReturnValue(null);
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes"));
    expect(res.status).toBe(503);
  });

  it("returns 200 with paginated outcomes data and HMAC pseudo IDs", async () => {
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: true })),
      verifyIdToken: vi.fn(),
    });
    const docs = makeDocs([
      {
        id: "alice@example.com",
        data: {
          xp: 100,
          level: 2,
          streak: 5,
          badges: ["a", "b"],
          achievements: ["x"],
          lastActive: "2026-05-19T12:34:56.000Z",
        },
      },
      {
        id: "bob@example.com",
        data: {
          xp: 50,
          level: 1,
          streak: 1,
          badges: [],
          achievements: [],
          lastActive: "2026-05-18T09:00:00.000Z",
        },
      },
    ]);
    getAdminDb.mockReturnValue(makeDb(docs));
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes&limit=2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].userId).toHaveLength(16);
    expect(body.data[0].userId).not.toBe("alice@example.com");
    expect(body.data[0].xp).toBe(100);
    expect(body.data[0].badgesCount).toBe(2);
    expect(body.data[0].lastActive).toBe("2026-05-19T12:00:00.000Z");
    expect(body.nextCursor).toBe("bob@example.com");
  });

  it("returns nextCursor null when results are below the requested limit", async () => {
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: true })),
      verifyIdToken: vi.fn(),
    });
    const docs = makeDocs([
      { id: "only@example.com", data: { xp: 1, level: 1, streak: 1 } },
    ]);
    getAdminDb.mockReturnValue(makeDb(docs));
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes&limit=50"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nextCursor).toBeNull();
  });

  it("HMAC pseudo IDs differ when the secret differs", async () => {
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: true })),
      verifyIdToken: vi.fn(),
    });
    const docs = makeDocs([{ id: "alice@example.com", data: { xp: 1 } }]);
    getAdminDb.mockReturnValue(makeDb(docs));

    process.env.RESEARCH_HASH_SECRET = "secret-a";
    let res = await GET(makeReq("https://x.test/api/research/export?type=outcomes&limit=10"));
    const idA = (await res.json()).data[0].userId;

    process.env.RESEARCH_HASH_SECRET = "secret-b";
    res = await GET(makeReq("https://x.test/api/research/export?type=outcomes&limit=10"));
    const idB = (await res.json()).data[0].userId;

    expect(idA).not.toBe(idB);
  });

  it("returns 429 after the rate limit threshold is exceeded", async () => {
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: true })),
      verifyIdToken: vi.fn(),
    });
    getAdminDb.mockReturnValue(makeDb([]));

    let lastStatus = 0;
    for (let i = 0; i < 31; i += 1) {
      const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes"));
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("falls back to verifyIdToken when verifySessionCookie throws", async () => {
    cookies.mockResolvedValue(makeCookiesWith("legacy-id-token"));
    const verifySessionCookie = vi.fn(async () => {
      throw new Error("not a session cookie");
    });
    const verifyIdToken = vi.fn(async () => ({ uid: "u1", admin: true }));
    getAuth.mockReturnValue({ verifySessionCookie, verifyIdToken });
    getAdminDb.mockReturnValue(makeDb([]));
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes"));
    expect(res.status).toBe(200);
    expect(verifySessionCookie).toHaveBeenCalled();
    expect(verifyIdToken).toHaveBeenCalled();
  });

  it("clamps a too-large limit down to MAX_LIMIT", async () => {
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: true })),
      verifyIdToken: vi.fn(),
    });
    const db = makeDb([]);
    getAdminDb.mockReturnValue(db);
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes&limit=9999"));
    expect(res.status).toBe(200);
    expect(db._query.limit).toHaveBeenCalledWith(500);
  });

  it("passes a cursor to startAfter when provided", async () => {
    cookies.mockResolvedValue(makeCookiesWith("ok-token"));
    getAuth.mockReturnValue({
      verifySessionCookie: vi.fn(async () => ({ uid: "u1", admin: true })),
      verifyIdToken: vi.fn(),
    });
    const db = makeDb([]);
    getAdminDb.mockReturnValue(db);
    const res = await GET(makeReq("https://x.test/api/research/export?type=outcomes&cursor=zzz@example.com"));
    expect(res.status).toBe(200);
    expect(db._query.startAfter).toHaveBeenCalledWith("zzz@example.com");
  });
});
