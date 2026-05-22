import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserFromSessionCookie } from "@/lib/auth-server";

export async function PATCH(request, { params }) {
    try {
        const user = await getAuthenticatedUserFromSessionCookie();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = user.email || user.uid;

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const { read } = body;

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
        }

        const docRef = adminDb.collection("notifications").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }
        if (docSnap.data().userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const newReadState = read !== undefined ? read : !docSnap.data().read;
        await docRef.update({ read: newReadState });

        return NextResponse.json({ success: true, id, read: newReadState });
    } catch (error) {
        console.error("Error updating notification:", error);
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const user = await getAuthenticatedUserFromSessionCookie();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = user.email || user.uid;

        const { id } = await params;

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
        }

        const docRef = adminDb.collection("notifications").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        if (docSnap.data().userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await docRef.delete();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting notification:", error);
        return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
    }
}
