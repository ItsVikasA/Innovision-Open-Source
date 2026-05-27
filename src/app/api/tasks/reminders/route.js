import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendInactivityReminderEmail } from "@/lib/brevo";

/**
 * GET /api/tasks/reminders
 * This endpoint should be called by a cron job once a day.
 * It scans users who haven't been active for > 3 days and sends a reminder.
 */
export async function GET(request) {
    try {
        // Simple security check (could be an API key in headers)
        const authHeader = request.headers.get("x-cron-key");
        if (process.env.CRON_SECRET && authHeader !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 503 });
        }

        const usersSnapshot = await adminDb.collection("gamification")
            .where("lastActive", "<", threeDaysAgo.toISOString())
            .get();

        const results = [];

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userEmail = userDoc.id;

            // Find an active course for this user
            // 1. Check Roadmaps
            const roadmapsSnap = await adminDb.collection("users")
                .doc(userEmail)
                .collection("roadmaps")
                .where("completed", "==", false)
                .limit(1)
                .get();

            let targetCourse = null;

            if (!roadmapsSnap.empty) {
                const roadmapDoc = roadmapsSnap.docs[0];
                targetCourse = {
                    title: roadmapDoc.data().courseTitle || "your roadmap",
                    type: "roadmap"
                };
            } else {
                // 2. Check YouTube courses
                const ytSnap = await adminDb.collection("users")
                    .doc(userEmail)
                    .collection("youtube-courses")
                    .where("progress", "<", 100)
                    .limit(1)
                    .get();

                if (!ytSnap.empty) {
                    const ytDoc = ytSnap.docs[0];
                    targetCourse = {
                        title: ytDoc.data().title || "your YouTube course",
                        type: "youtube"
                    };
                } else {
                    // 3. Check Ingested courses
                    const ingestedSnap = await adminDb.collection("ingested_courses")
                        .where("userId", "==", userEmail)
                        .limit(10) // Check first few
                        .get();

                    for (const courseDoc of ingestedSnap.docs) {
                        const progressSnap = await adminDb.collection("ingested_courses")
                            .doc(courseDoc.id)
                            .collection("progress")
                            .doc(userEmail)
                            .get();

                        const progress = progressSnap.exists ? (progressSnap.data().progress || 0) : 0;
                        if (progress < 100) {
                            targetCourse = {
                                title: courseDoc.data().title || "your ingested course",
                                type: "ingested"
                            };
                            break;
                        }
                    }
                }
            }

            if (targetCourse) {
                try {
                    await sendInactivityReminderEmail(userEmail, userData.userName || "Learner", targetCourse.title);
                    results.push({ email: userEmail, status: "sent", course: targetCourse.title });

                    // Update lastActive to avoid spamming the next day
                    await userDoc.ref.update({
                        lastActive: new Date().toISOString(), // Reset the clock
                        lastReminderSentAt: new Date().toISOString()
                    });
                } catch (emailError) {
                    console.error(`Failed to send reminder to ${userEmail}:`, emailError);
                    results.push({ email: userEmail, status: "failed", error: emailError.message });
                }
            } else {
                results.push({ email: userEmail, status: "no_active_courses" });
            }
        }

        return NextResponse.json({
            processedCount: usersSnapshot.size,
            results
        });

    } catch (error) {
        console.error("Reminder task error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
