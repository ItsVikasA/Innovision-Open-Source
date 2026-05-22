import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth-server";

/**
 * GET /api/ingested-courses - List all ingested courses for the current user
 */
export async function GET(request) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: "Database not available" },
                { status: 503 }
            );
        }

        const user = await getAuthenticatedUserFromRequest(request);
        const userId = user?.email || user?.uid;

        if (!userId) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        let snapshot;
        try {
            // Try with orderBy first (requires composite index)
            snapshot = await db
                .collection("ingested_courses")
                .where("userId", "==", userId)
                .orderBy("createdAt", "desc")
                .get();
        } catch (queryError) {
            console.log("OrderBy query failed, fetching without orderBy:", queryError.message);
            // If orderBy fails (missing index), fetch without it
            snapshot = await db
                .collection("ingested_courses")
                .where("userId", "==", userId)
                .get();
        }

        const courses = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const courseId = doc.id;

            let progress = 0;
            try {
                const progressRef = db
                    .collection("ingested_courses")
                    .doc(courseId)
                    .collection("progress")
                    .doc(userId);
                const progressSnap = await progressRef.get();
                if (progressSnap.exists) {
                    progress = progressSnap.data().progress || 0;
                }
            } catch (err) {
                console.error(`Error fetching progress for course ${courseId}:`, err);
            }

            return {
                id: courseId,
                title: data.title,
                description: data.description,
                chapterCount: data.metadata?.chapterCount || 0,
                totalWords: data.metadata?.totalWords || 0,
                estimatedReadingTime: data.metadata?.estimatedReadingTime || 0,
                progress,
                source: {
                    fileName: data.source?.fileName || "",
                    fileType: data.source?.fileType || "",
                },
                status: data.status,
                createdAt: data.createdAt?.toDate?.() || null,
            };
        }));

        // Sort in memory by createdAt (newest first)
        courses.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });

        return NextResponse.json({ courses });
    } catch (error) {
        console.error("Error fetching ingested courses:", error);
        return NextResponse.json(
            { error: "Failed to fetch courses", details: error.message },
            { status: 500 }
        );
    }
}
