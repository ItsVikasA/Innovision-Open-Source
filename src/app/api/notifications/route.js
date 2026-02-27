import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

async function getUserFromRequest() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;
        if (!sessionCookie) return null;

        const payload = JSON.parse(atob(sessionCookie.split(".")[1]));
        if (!payload?.email) return null;
        return { email: payload.email, uid: payload.uid || payload.sub };
    } catch {
        return null;
    }
}


export async function GET(request) {
    try {
        const user = await getUserFromRequest();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type"); // optional category filter
        const limit = parseInt(searchParams.get("limit") || "50", 10);

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ notifications: [], unreadCount: 0, _warning: "Firebase not configured" });
        }


        let baseQuery = adminDb.collection("notifications").where("userId", "==", user.email);
        if (type && type !== "all") {
            baseQuery = baseQuery.where("type", "==", type);
        }


        let snapshot;
        try {
            snapshot = await baseQuery.orderBy("createdAt", "desc").limit(limit).get();
        } catch {
            snapshot = await baseQuery.limit(limit).get();
        }

        let notifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        }));

        notifications.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const unreadCount = notifications.filter((n) => !n.read).length;

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, title, body: notifBody, type = "system", link = null } = body;

        if (!userId || !title || !notifBody) {
            return NextResponse.json({ error: "userId, title, and body are required" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
        }

        const notification = {
            userId,
            title,
            body: notifBody,
            type,
            link,
            read: false,
            createdAt: new Date(),
        };

        const docRef = await adminDb.collection("notifications").add(notification);

        return NextResponse.json({
            success: true,
            id: docRef.id,
            ...notification,
            createdAt: notification.createdAt.toISOString(),
        });
    } catch (error) {
        console.error("Error creating notification:", error);
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}

export async function PATCH() {
    try {
        const user = await getUserFromRequest();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
        }

        const snapshot = await adminDb
            .collection("notifications")
            .where("userId", "==", user.email)
            .where("read", "==", false)
            .get();

        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();

        return NextResponse.json({ success: true, updatedCount: snapshot.docs.length });
    } catch (error) {
        console.error("Error marking all as read:", error);
        return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
    }
}
