import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inviteId } = await req.json();
  if (!inviteId) return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });

  const inviteSnap = await adminDb.collection("invitations").doc(inviteId).get();
  if (!inviteSnap.exists) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  const invite = inviteSnap.data();

  if (invite.toEmail !== session.user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Add user to room members array
  await adminDb.collection("rooms").doc(invite.roomId).update({
    members: FieldValue.arrayUnion(invite.toEmail),
  });

  // Mark invite as accepted
  await adminDb.collection("invitations").doc(inviteId).update({
    status: "accepted",
  });

  return NextResponse.json({ roomId: invite.roomId });
}
