import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// Mock dependencies
vi.mock("@/lib/firebase-admin", () => {
  const mockAdminDb = {
    collectionGroup: vi.fn(),
  };
  return {
    getAdminDb: vi.fn(() => mockAdminDb),
    adminDb: mockAdminDb,
  };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

describe("GET /api/certificates/verify/[certificateId]", () => {
  let mockAdminDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminDb = getAdminDb();
  });

  it("should return 400 if certificateId is missing", async () => {
    const request = new Request("http://localhost:3000/api/certificates/verify/", {
      method: "GET",
    });
    const params = { certificateId: undefined };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Certificate ID is required");
  });

  it("should return 500 if database is not available", async () => {
    getAdminDb.mockReturnValueOnce(null);

    const request = new Request("http://localhost:3000/api/certificates/verify/test-cert", {
      method: "GET",
    });
    const params = { certificateId: "test-cert" };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database not available. Check server configuration.");
  });

  it("should verify certificate successfully when it exists", async () => {
    const mockCertData = {
      userName: "John Doe",
      courseTitle: "Introduction to AI",
      completionDate: "May 20, 2026",
      chapterCount: 5,
      verified: true,
    };

    const mockGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => mockCertData,
        },
      ],
    });

    const mockWhere = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: mockGet,
      }),
    });

    mockAdminDb.collectionGroup.mockReturnValue({
      where: mockWhere,
    });

    const request = new Request("http://localhost:3000/api/certificates/verify/test-cert-123", {
      method: "GET",
    });
    const params = { certificateId: "test-cert-123" };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.valid).toBe(true);
    expect(data.certificate).toEqual(mockCertData);

    expect(mockAdminDb.collectionGroup).toHaveBeenCalledWith("certificates");
    expect(mockWhere).toHaveBeenCalledWith("certificateId", "==", "test-cert-123");
  });

  it("should return valid false when certificate does not exist", async () => {
    const mockGet = vi.fn().mockResolvedValue({
      empty: true,
      docs: [],
    });

    const mockWhere = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: mockGet,
      }),
    });

    mockAdminDb.collectionGroup.mockReturnValue({
      where: mockWhere,
    });

    const request = new Request("http://localhost:3000/api/certificates/verify/nonexistent-cert", {
      method: "GET",
    });
    const params = { certificateId: "nonexistent-cert" };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.valid).toBe(false);
    expect(data.message).toBe("Certificate not found");
  });

  it("should return 500 when database error occurs", async () => {
    mockAdminDb.collectionGroup.mockImplementationOnce(() => {
      throw new Error("Firestore error");
    });

    const request = new Request("http://localhost:3000/api/certificates/verify/test-cert", {
      method: "GET",
    });
    const params = { certificateId: "test-cert" };

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to verify certificate");
  });
});
