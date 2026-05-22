import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookieStore = {
  get: vi.fn(),
};

const mockCookies = vi.fn(async () => mockCookieStore);
const mockVerifySessionCookie = vi.fn();
const mockVerifyIdToken = vi.fn();
const mockCreateSessionCookie = vi.fn();

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifySessionCookie: mockVerifySessionCookie,
    verifyIdToken: mockVerifyIdToken,
    createSessionCookie: mockCreateSessionCookie,
  }),
}));

const {
  createVerifiedSessionCookie,
  getAuthenticatedUserFromRequest,
  getServerSession,
  SESSION_COOKIE_MAX_AGE_MS,
} = await import("./auth-server.js");

describe("auth-server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it("returns a verified session user from the session cookie", async () => {
    mockCookieStore.get.mockReturnValue({ value: "session-cookie" });
    mockVerifySessionCookie.mockResolvedValue({
      uid: "user-1",
      email: "learner@example.com",
      name: "Learner",
      picture: "https://example.com/avatar.png",
    });

    const session = await getServerSession();

    expect(session).toEqual({
      user: {
        uid: "user-1",
        email: "learner@example.com",
        name: "Learner",
        image: "https://example.com/avatar.png",
      },
    });
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("falls back to verified ID tokens for legacy cookies", async () => {
    mockCookieStore.get.mockReturnValue({ value: "legacy-id-token" });
    mockVerifySessionCookie.mockRejectedValue(new Error("not a session cookie"));
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-2",
      email: "legacy@example.com",
      name: "Legacy User",
    });

    const session = await getServerSession();

    expect(session?.user.email).toBe("legacy@example.com");
    expect(mockVerifySessionCookie).toHaveBeenCalledWith("legacy-id-token", true);
    expect(mockVerifyIdToken).toHaveBeenCalledWith("legacy-id-token", true);
  });

  it("uses a verified bearer token when no cookie is available", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-3",
      email: "bearer@example.com",
      name: "Bearer User",
    });

    const request = new Request("http://localhost/api/test", {
      headers: {
        authorization: "Bearer signed-token",
      },
    });

    const user = await getAuthenticatedUserFromRequest(request);

    expect(user?.email).toBe("bearer@example.com");
    expect(mockVerifyIdToken).toHaveBeenCalledWith("signed-token", true);
  });

  it("creates a server session cookie only from a verified ID token", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-4",
      email: "verified@example.com",
    });
    mockCreateSessionCookie.mockResolvedValue("secure-session-cookie");

    const result = await createVerifiedSessionCookie("valid-id-token");

    expect(result).toEqual({
      decodedToken: {
        uid: "user-4",
        email: "verified@example.com",
      },
      sessionCookie: "secure-session-cookie",
    });
    expect(mockCreateSessionCookie).toHaveBeenCalledWith("valid-id-token", {
      expiresIn: SESSION_COOKIE_MAX_AGE_MS,
    });
  });
});
