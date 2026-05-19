import "dotenv/config";
import { readFileSync } from "fs";
import { adminDb, FieldValue } from "../lib/firebase-admin.js";

async function seedCoupons() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node src/scripts/seed_coupons.js <path-to-coupons.json>");
    console.error("The JSON file must NOT be committed. Keep it outside the repo.");
    process.exit(1);
  }

  if (!adminDb) {
    console.error("Firebase Admin not initialized. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.");
    process.exit(1);
  }

  let coupons;
  try {
    coupons = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (err) {
    console.error(`Failed to read or parse ${inputPath}:`, err.message);
    process.exit(1);
  }

  if (!Array.isArray(coupons)) {
    console.error("Input JSON must be an array of coupon objects.");
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const c of coupons) {
    if (!c.code || typeof c.code !== "string") {
      console.warn("Skipping entry without valid 'code' string:", c);
      skipped += 1;
      continue;
    }
    if (typeof c.discount !== "number" || c.discount <= 0) {
      console.warn(`Skipping ${c.code}: 'discount' must be a positive number`);
      skipped += 1;
      continue;
    }
    if (c.type !== "percent" && c.type !== "flat") {
      console.warn(`Skipping ${c.code}: 'type' must be 'percent' or 'flat'`);
      skipped += 1;
      continue;
    }

    const code = c.code.toUpperCase().trim();
    const docRef = adminDb.collection("coupons").doc(code);
    const existing = await docRef.get();

    const payload = {
      discount: c.discount,
      type: c.type,
      validFrom: c.validFrom ? new Date(c.validFrom) : null,
      validUntil: c.validUntil ? new Date(c.validUntil) : null,
      maxUses: typeof c.maxUses === "number" ? c.maxUses : null,
      allowedEmails: Array.isArray(c.allowedEmails) ? c.allowedEmails : [],
      active: c.active !== false,
    };

    if (!existing.exists) {
      payload.usesCount = 0;
      payload.reservedCount = 0;
      payload.createdAt = FieldValue.serverTimestamp();
      await docRef.set(payload);
      created += 1;
      console.log(`Created: ${code}`);
    } else {
      payload.updatedAt = FieldValue.serverTimestamp();
      await docRef.set(payload, { merge: true });
      updated += 1;
      console.log(`Updated: ${code}`);
    }
  }

  console.log(`Done. Created ${created}, updated ${updated}, skipped ${skipped}.`);
  process.exit(0);
}

seedCoupons().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
