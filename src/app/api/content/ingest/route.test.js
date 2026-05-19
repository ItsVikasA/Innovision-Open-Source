import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: vi.fn(() => null),
  FieldValue: { increment: (n) => ({ __op: "increment", value: n }) },
}));

vi.mock("@/lib/firebase", () => ({
  auth: {},
}));

vi.mock("@/lib/ingestion-service", () => ({
  ingestContent: vi.fn(),
}));

vi.mock("@/lib/text-extractor", () => ({
  detectFileType: vi.fn(),
}));

vi.mock("@/lib/create-notification", () => ({
  createNotification: vi.fn(async () => undefined),
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

import { getAuth } from "firebase-admin/auth";
import { ingestContent } from "@/lib/ingestion-service";
import { detectFileType } from "@/lib/text-extractor";
import { clearAllRateLimits } from "@/lib/rate-limit";
import { POST } from "./route.js";

function makeReq({
  authHeader,
  contentLength,
  xForwardedFor,
  file,
  fileName = "doc.pdf",
} = {}) {
  const headers = new Map();
  if (authHeader !== undefined) headers.set("authorization", authHeader);
  if (contentLength !== undefined) headers.set("content-length", String(contentLength));
  if (xForwardedFor !== undefined) headers.set("x-forwarded-for", xForwardedFor);

  return {
    headers: {
      get: (name) => headers.get(name.toLowerCase()) ?? null,
    },
    formData: async () => ({
      get: (key) => (key === "file" && file !== undefined ? file : null),
    }),
  };
}

function makeFile(bytes, name = "doc.pdf") {
  const buf = typeof bytes === "string" ? Buffer.from(bytes) : bytes;
  return {
    name,
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAllRateLimits();
  getAuth.mockReturnValue({
    verifyIdToken: vi.fn(async () => ({ uid: "u1", email: "user@example.com" })),
  });
  detectFileType.mockReturnValue("pdf");
  ingestContent.mockResolvedValue({
    courseId: "course_123",
    title: "Test Course",
    description: "A description",
    chapterCount: 3,
    totalWords: 1000,
    estimatedReadingTime: 5,
    chapters: [],
  });
});

describe("POST /api/content/ingest", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const res = await POST(makeReq({ contentLength: 100 }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(ingestContent).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header is missing Bearer prefix", async () => {
    const res = await POST(makeReq({ authHeader: "Token abc.def.ghi", contentLength: 100 }));
    expect(res.status).toBe(401);
    expect(ingestContent).not.toHaveBeenCalled();
  });

  it("returns 401 when Bearer token is empty", async () => {
    const res = await POST(makeReq({ authHeader: "Bearer ", contentLength: 100 }));
    expect(res.status).toBe(401);
    expect(ingestContent).not.toHaveBeenCalled();
  });

  it("returns 401 when verifyIdToken throws", async () => {
    getAuth.mockReturnValue({
      verifyIdToken: vi.fn(async () => {
        throw new Error("token expired");
      }),
    });
    const res = await POST(makeReq({ authHeader: "Bearer bad-token", contentLength: 100 }));
    expect(res.status).toBe(401);
    expect(ingestContent).not.toHaveBeenCalled();
  });

  it("returns 411 when Content-Length is missing or zero", async () => {
    const res = await POST(makeReq({ authHeader: "Bearer ok-token" }));
    expect(res.status).toBe(411);
    expect(ingestContent).not.toHaveBeenCalled();
  });

  it("returns 413 when Content-Length exceeds the maximum upload size", async () => {
    const res = await POST(
      makeReq({ authHeader: "Bearer ok-token", contentLength: 100 * 1024 * 1024 })
    );
    expect(res.status).toBe(413);
    expect(ingestContent).not.toHaveBeenCalled();
  });

  it("returns 400 when no file is provided in the form data", async () => {
    const res = await POST(
      makeReq({ authHeader: "Bearer ok-token", contentLength: 500 })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No file provided");
    expect(ingestContent).not.toHaveBeenCalled();
  });

  it("returns 400 when the file extension is not supported", async () => {
    detectFileType.mockReturnValue(null);
    const res = await POST(
      makeReq({
        authHeader: "Bearer ok-token",
        contentLength: 500,
        file: makeFile("hello", "doc.exe"),
      })
    );
    expect(res.status).toBe(400);
    expect(ingestContent).not.toHaveBeenCalled();
  });

  it("returns 200 and calls ingestContent on the happy path", async () => {
    const res = await POST(
      makeReq({
        authHeader: "Bearer ok-token",
        contentLength: 500,
        file: makeFile("valid-pdf-bytes", "doc.pdf"),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.courseId).toBe("course_123");
    expect(ingestContent).toHaveBeenCalledOnce();
    const [, fileName, , userIdArg] = ingestContent.mock.calls[0];
    expect(fileName).toBe("doc.pdf");
    expect(userIdArg).toBe("user@example.com");
  });

  it("returns 429 after the per-user rate limit is exceeded", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 11; i += 1) {
      const res = await POST(
        makeReq({
          authHeader: "Bearer ok-token",
          contentLength: 500,
          xForwardedFor: `10.0.0.${i + 1}`,
          file: makeFile("v", "doc.pdf"),
        })
      );
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("returns 429 after the per-IP rate limit is exceeded", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 31; i += 1) {
      getAuth.mockReturnValue({
        verifyIdToken: vi.fn(async () => ({ uid: `u${i}`, email: `u${i}@example.com` })),
      });
      const res = await POST(
        makeReq({
          authHeader: "Bearer ok-token",
          contentLength: 500,
          xForwardedFor: "1.2.3.4",
          file: makeFile("v", "doc.pdf"),
        })
      );
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("does not call ingestContent when rate limited", async () => {
    for (let i = 0; i < 10; i += 1) {
      await POST(
        makeReq({
          authHeader: "Bearer ok-token",
          contentLength: 500,
          xForwardedFor: `9.9.9.${i + 1}`,
          file: makeFile("v", "doc.pdf"),
        })
      );
    }
    ingestContent.mockClear();
    const res = await POST(
      makeReq({
        authHeader: "Bearer ok-token",
        contentLength: 500,
        xForwardedFor: "9.9.9.99",
        file: makeFile("v", "doc.pdf"),
      })
    );
    expect(res.status).toBe(429);
    expect(ingestContent).not.toHaveBeenCalled();
  });

  it("uses the first IP from x-forwarded-for when it contains a comma-separated list", async () => {
    const res = await POST(
      makeReq({
        authHeader: "Bearer ok-token",
        contentLength: 500,
        xForwardedFor: "203.0.113.45, 10.0.0.1, 10.0.0.2",
        file: makeFile("v", "doc.pdf"),
      })
    );
    expect(res.status).toBe(200);
  });
});
