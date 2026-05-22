import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockCookies = vi.fn(async () => mockCookieStore);
const mockCreateNotification = vi.fn();
const mockGetAdminDb = vi.fn(() => ({ collection: vi.fn() }));
const mockCreateVerifiedSessionCookie = vi.fn();

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

vi.mock("@/lib/create-notification", () => ({
  createNotification: mockCreateNotification,
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: mockGetAdminDb,
}));

vi.mock("@/lib/auth-server", () => ({
  createVerifiedSessionCookie: mockCreateVerifiedSessionCookie,
  SESSION_COOKIE_MAX_AGE_SECONDS: 432000,
  SESSION_COOKIE_NAME: "session",
}));

const { DELETE, POST } = await import("./route.js");

describe("POST /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue(undefined);
    mockCreateNotification.mockResolvedValue(null);
  });

  it("stores a verified session cookie and returns success", async () => {
    mockCreateVerifiedSessionCookie.mockResolvedValue({
      decodedToken: {
        email: "learner@example.com",
      },
      sessionCookie: "secure-session-cookie",
    });

    const request = new Request("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "valid-id-token" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "session",
      "secure-session-cookie",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 432000,
        path: "/",
        sameSite: "lax",
      })
    );
    expect(mockCreateNotification).toHaveBeenCalled();
  });

  it("rejects invalid tokens before setting the cookie", async () => {
    mockCookieStore.get.mockReturnValue({ value: "old-cookie" });
    mockCreateVerifiedSessionCookie.mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "forged-token" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ success: false, error: "Invalid or expired token" });
    expect(mockCookieStore.delete).toHaveBeenCalledWith("session");
    expect(mockCookieStore.set).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNotification.mockResolvedValue(null);
  });

  it("clears the session cookie", async () => {
    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockCookieStore.delete).toHaveBeenCalledWith("session");
  });
});
