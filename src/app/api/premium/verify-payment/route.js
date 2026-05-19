import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { activatePremium } from "@/lib/premium";
import { consumeCoupon } from "@/lib/coupons";
import Razorpay from "razorpay";
import crypto from "crypto";

export async function POST(req) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    const success = await activatePremium(session.user.email, 1, razorpay_payment_id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to activate premium" },
        { status: 500 }
      );
    }

    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      const order = await razorpay.orders.fetch(razorpay_order_id);
      const couponCode = order?.notes?.couponCode;
      const adminDb = getAdminDb();
      if (adminDb && couponCode && couponCode !== "none") {
        await consumeCoupon(adminDb, couponCode);
      }
    } catch (couponError) {
      console.error("Coupon consumption failed (non-blocking):", couponError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Premium activated successfully!",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
