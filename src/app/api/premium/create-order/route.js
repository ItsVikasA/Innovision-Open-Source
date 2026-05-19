import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateAndReserveCoupon, computeDiscountPaise } from "@/lib/coupons";
import Razorpay from "razorpay";
import { z } from "zod";

const PLAN_AMOUNTS = {
  premium: 10000,
  education: 5000,
};

const orderSchema = z.object({
  planType: z.enum(["premium", "education"]).default("premium"),
  couponCode: z.string().optional().nullable(),
});

export async function POST(req) {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Payment gateway not configured", details: "Missing Razorpay API keys" },
        { status: 500 }
      );
    }

    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", details: "Please login to continue" },
        { status: 401 }
      );
    }

    const parsed = orderSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { planType } = parsed.data;
    const couponCode = parsed.data.couponCode?.toUpperCase()?.trim() || null;
    const baseAmount = PLAN_AMOUNTS[planType];

    let couponValid = false;
    let discountApplied = 0;

    if (couponCode) {
      const adminDb = getAdminDb();
      if (!adminDb) {
        return NextResponse.json(
          { error: "Coupon validation unavailable", details: "Database not initialized" },
          { status: 503 }
        );
      }

      const result = await validateAndReserveCoupon(adminDb, couponCode, session.user.email);
      if (result.valid) {
        couponValid = true;
        discountApplied = computeDiscountPaise(baseAmount, result.coupon);
      }
    }

    const finalAmount = Math.max(baseAmount - discountApplied, 100);
    const planLabel = planType === "education" ? "edu" : "prem";
    const receipt = `${planLabel}_${Date.now()}`;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: finalAmount,
      currency: "INR",
      receipt,
      notes: {
        email: session.user.email,
        type: planType === "education" ? "education_subscription" : "premium_subscription",
        planType,
        couponCode: couponValid ? couponCode : "none",
        originalAmount: baseAmount,
        discountApplied,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      originalAmount: baseAmount,
      discountApplied,
      couponValid,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      planType,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error.message);
    return NextResponse.json(
      { error: "Failed to create order", details: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
