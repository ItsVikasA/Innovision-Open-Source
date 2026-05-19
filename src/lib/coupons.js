import { FieldValue } from "@/lib/firebase-admin";

export async function validateAndReserveCoupon(adminDb, couponCode, userEmail) {
  if (!couponCode) return { valid: false, coupon: null };

  const couponRef = adminDb.collection("coupons").doc(couponCode);

  return await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(couponRef);
    if (!snap.exists) return { valid: false, coupon: null };

    const data = snap.data();
    const now = new Date();

    if (data.active === false) return { valid: false, coupon: null };

    if (data.validFrom && typeof data.validFrom.toDate === "function" && now < data.validFrom.toDate()) {
      return { valid: false, coupon: null };
    }

    if (data.validUntil && typeof data.validUntil.toDate === "function" && now > data.validUntil.toDate()) {
      return { valid: false, coupon: null };
    }

    const totalUsed = (data.usesCount || 0) + (data.reservedCount || 0);
    if (typeof data.maxUses === "number" && totalUsed >= data.maxUses) {
      return { valid: false, coupon: null };
    }

    const allowed = data.allowedEmails;
    if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(userEmail)) {
      return { valid: false, coupon: null };
    }

    transaction.update(couponRef, { reservedCount: FieldValue.increment(1) });

    return {
      valid: true,
      coupon: { discount: data.discount, type: data.type },
    };
  });
}

export async function consumeCoupon(adminDb, couponCode) {
  if (!couponCode || couponCode === "none") return;

  const couponRef = adminDb.collection("coupons").doc(couponCode);

  await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(couponRef);
    if (!snap.exists) return;

    transaction.update(couponRef, {
      usesCount: FieldValue.increment(1),
      reservedCount: FieldValue.increment(-1),
    });
  });
}

export function computeDiscountPaise(baseAmount, coupon) {
  if (!coupon) return 0;
  if (coupon.type === "percent") {
    return Math.round((baseAmount * coupon.discount) / 100);
  }
  return Math.round(coupon.discount * 100);
}
