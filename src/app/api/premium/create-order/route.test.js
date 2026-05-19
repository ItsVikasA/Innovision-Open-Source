import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: vi.fn(),
  FieldValue: {
    increment: (n) => ({ __op: "increment", value: n }),
  },
}));

vi.mock("razorpay", () => ({
  default: class MockRazorpay {
    constructor() {}
    get orders() {
      return {
        create: vi.fn(async (opts) => ({
          id: "order_test_id",
          amount: opts.amount,
          currency: opts.currency,
        })),
      };
    }
  },
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

import { getServerSession } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { POST } from "./route.js";

function makeReq(body) {
  return { json: async () => body };
}

function makeDb({ exists = true, data = {} } = {}) {
  const snap = { exists, data: () => data };
  const couponRef = {};
  return {
    collection: vi.fn(() => ({ doc: vi.fn(() => couponRef) })),
    runTransaction: vi.fn(async (cb) =>
      cb({
        get: vi.fn(async () => snap),
        update: vi.fn(),
      })
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = "rzp_test_x";
  process.env.RAZORPAY_KEY_SECRET = "secret_x";
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_x";
  getServerSession.mockResolvedValue({ user: { email: "user@example.com" } });
});

describe("POST /api/premium/create-order", () => {
  it("returns 401 when no session", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(makeReq({ planType: "premium" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when planType is invalid", async () => {
    const res = await POST(makeReq({ planType: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("creates a premium order without a coupon and does not touch the database", async () => {
    const res = await POST(makeReq({ planType: "premium" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.couponValid).toBe(false);
    expect(body.discountApplied).toBe(0);
    expect(body.amount).toBe(10000);
    expect(getAdminDb).not.toHaveBeenCalled();
  });

  it("applies a valid percent coupon and reserves it", async () => {
    const db = makeDb({
      exists: true,
      data: {
        discount: 50,
        type: "percent",
        active: true,
        validFrom: null,
        validUntil: null,
        maxUses: null,
        allowedEmails: [],
        usesCount: 0,
        reservedCount: 0,
      },
    });
    getAdminDb.mockReturnValue(db);

    const res = await POST(makeReq({ planType: "premium", couponCode: "half" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.couponValid).toBe(true);
    expect(body.discountApplied).toBe(5000);
    expect(body.amount).toBe(5000);
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });

  it("rejects a coupon whose document does not exist", async () => {
    getAdminDb.mockReturnValue(makeDb({ exists: false }));
    const res = await POST(makeReq({ planType: "premium", couponCode: "GHOST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.couponValid).toBe(false);
    expect(body.discountApplied).toBe(0);
  });

  it("rejects an inactive coupon", async () => {
    getAdminDb.mockReturnValue(
      makeDb({
        exists: true,
        data: { discount: 100, type: "percent", active: false },
      })
    );
    const res = await POST(makeReq({ planType: "premium", couponCode: "DEAD" }));
    expect(res.status).toBe(200);
    expect((await res.json()).couponValid).toBe(false);
  });

  it("rejects an expired coupon", async () => {
    const past = new Date(Date.now() - 86400000);
    getAdminDb.mockReturnValue(
      makeDb({
        exists: true,
        data: {
          discount: 100,
          type: "percent",
          active: true,
          validUntil: { toDate: () => past },
        },
      })
    );
    const res = await POST(makeReq({ planType: "premium", couponCode: "OLD" }));
    expect(res.status).toBe(200);
    expect((await res.json()).couponValid).toBe(false);
  });

  it("rejects a coupon whose start date has not yet arrived", async () => {
    const future = new Date(Date.now() + 86400000);
    getAdminDb.mockReturnValue(
      makeDb({
        exists: true,
        data: {
          discount: 100,
          type: "percent",
          active: true,
          validFrom: { toDate: () => future },
        },
      })
    );
    const res = await POST(makeReq({ planType: "premium", couponCode: "EARLY" }));
    expect(res.status).toBe(200);
    expect((await res.json()).couponValid).toBe(false);
  });

  it("rejects an exhausted coupon (reservedCount + usesCount >= maxUses)", async () => {
    getAdminDb.mockReturnValue(
      makeDb({
        exists: true,
        data: {
          discount: 100,
          type: "percent",
          active: true,
          maxUses: 1,
          usesCount: 0,
          reservedCount: 1,
        },
      })
    );
    const res = await POST(makeReq({ planType: "premium", couponCode: "USED" }));
    expect(res.status).toBe(200);
    expect((await res.json()).couponValid).toBe(false);
  });

  it("rejects an email-restricted coupon for a non-allowed user", async () => {
    getAdminDb.mockReturnValue(
      makeDb({
        exists: true,
        data: {
          discount: 100,
          type: "percent",
          active: true,
          allowedEmails: ["someone@else.com"],
        },
      })
    );
    const res = await POST(makeReq({ planType: "premium", couponCode: "PRIV" }));
    expect(res.status).toBe(200);
    expect((await res.json()).couponValid).toBe(false);
  });

  it("accepts an email-restricted coupon for an allowed user", async () => {
    getAdminDb.mockReturnValue(
      makeDb({
        exists: true,
        data: {
          discount: 25,
          type: "percent",
          active: true,
          allowedEmails: ["user@example.com"],
          usesCount: 0,
          reservedCount: 0,
        },
      })
    );
    const res = await POST(makeReq({ planType: "premium", couponCode: "PRIV" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.couponValid).toBe(true);
    expect(body.discountApplied).toBe(2500);
  });

  it("clamps the final amount to at least 100 paise on full discount", async () => {
    getAdminDb.mockReturnValue(
      makeDb({
        exists: true,
        data: {
          discount: 100,
          type: "percent",
          active: true,
          usesCount: 0,
          reservedCount: 0,
        },
      })
    );
    const res = await POST(makeReq({ planType: "premium", couponCode: "FREE" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.discountApplied).toBe(10000);
    expect(body.amount).toBe(100);
  });

  it("returns 503 when the admin database is not initialized and a coupon was supplied", async () => {
    getAdminDb.mockReturnValue(null);
    const res = await POST(makeReq({ planType: "premium", couponCode: "ANY" }));
    expect(res.status).toBe(503);
  });

  it("computes the correct base amount for the education plan", async () => {
    const res = await POST(makeReq({ planType: "education" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.amount).toBe(5000);
  });
});
