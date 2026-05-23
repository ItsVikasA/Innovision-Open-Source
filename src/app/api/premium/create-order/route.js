import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import Razorpay from "razorpay";
import { z } from "zod";

// Secret coupons - don't expose these publicly
const COUPONS = {
  VICKY1: { discount: 100, type: "percent" }, // 100% off = FREE
  SANJANA04: { discount: 100, type: "percent" }, // FREE
  VILAS16: { discount: 100, type: "percent" }, // FREE
  BHUMI07: { discount: 100, type: "percent" }, // FREE
  SNEHA07: { discount: 100, type: "percent" }, // FREE
  SANIYA07: { discount: 100, type: "percent" }, // FREE
  RAKESH01: { discount: 100, type: "percent" }, // FREE
  VICKY15: { discount: 15, type: "percent" },
  VICKY20: { discount: 20, type: "percent" },
  VICKY50: { discount: 50, type: "percent" },
  LAUNCH10: { discount: 10, type: "percent" },
  STUDENT25: { discount: 25, type: "percent" },
};

export async function POST(req) {
  try {
    // Check if Razorpay keys are configured — this is a gateway config issue, not a server bug
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay keys not configured");
      return NextResponse.json(
        { error: "Payment gateway not configured", details: "Missing Razorpay API keys" },
        { status: 502 }
      );
    }

    let razorpay;
    try {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    } catch (initError) {
      console.error("Razorpay initialization failed:", initError.message);
      return NextResponse.json(
        { error: "Payment gateway initialization failed", details: initError.message },
        { status: 502 }
      );
    }

    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", details: "Please login to continue" },
        { status: 401 }
      );
    }

    // Get plan type and coupon from request body
    const body = await req.json();

    // Define validation schema
    const orderSchema = z.object({
      planType: z.enum(["premium", "education"]).default("premium"),
      couponCode: z.string().optional().nullable(),
    });

    const result = orderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.format() },
        { status: 400 }
      );
    }

    const { planType, couponCode: rawCoupon } = result.data;
    const couponCode = rawCoupon?.toUpperCase()?.trim() || null;

    // Set base amount based on plan type
    // Premium: ₹100 (10000 paise)
    // Education: ₹50 (5000 paise) - 50% off
    let baseAmount = planType === "education" ? 5000 : 10000;
    let discountApplied = 0;
    let couponValid = false;

    // Apply coupon if provided
    if (couponCode && COUPONS[couponCode]) {
      const coupon = COUPONS[couponCode];
      if (coupon.type === "percent") {
        discountApplied = Math.round((baseAmount * coupon.discount) / 100);
      } else {
        discountApplied = coupon.discount * 100; // Convert to paise
      }
      couponValid = true;
    }

    const finalAmount = Math.max(baseAmount - discountApplied, 100); // Minimum ₹1 (100 paise)
    const currency = "INR";

    // Validate payload before dispatching to Razorpay SDK
    if (!Number.isInteger(finalAmount) || finalAmount < 100) {
      return NextResponse.json(
        { error: "Invalid order amount", details: "Amount must be at least ₹1 (100 paise)" },
        { status: 400 }
      );
    }

    if (currency !== "INR") {
      return NextResponse.json(
        { error: "Invalid currency", details: "Only INR is supported" },
        { status: 400 }
      );
    }

    const planLabel = planType === "education" ? "edu" : "prem";

    // Receipt must be max 40 characters
    const receipt = `${planLabel}_${Date.now()}`;

    let order;
    try {
      order = await razorpay.orders.create({
        amount: finalAmount,
        currency,
        receipt,
        notes: {
          email: session.user.email,
          type: planType === "education" ? "education_subscription" : "premium_subscription",
          planType: planType,
          couponCode: couponCode || "none",
          originalAmount: baseAmount,
          discountApplied: discountApplied,
        },
      });
    } catch (razorpayError) {
      console.error("Razorpay order creation failed:", razorpayError.message, razorpayError);
      return NextResponse.json(
        {
          error: "Payment gateway error",
          details: razorpayError.error?.description || razorpayError.message || "Razorpay rejected the order request",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      originalAmount: baseAmount,
      discountApplied: discountApplied,
      couponValid: couponValid,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      planType: planType,
    });
  } catch (error) {
    console.error("Unexpected error in create-order:", error.message, error);
    return NextResponse.json(
      { error: "Failed to create order", details: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
