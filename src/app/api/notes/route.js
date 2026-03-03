import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";

export const runtime = "nodejs";

// GET - Fetch notes for a chapter
export async function GET(request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roadmapId = searchParams.get("roadmapId");
    const chapter = searchParams.get("chapter");

    if (!roadmapId) {
      return NextResponse.json({ error: "roadmapId is required" }, { status: 400 });
    }

    const notesRef = adminDb
      .collection("users")
      .doc(session.user.email)
      .collection("notes");

    let query = notesRef.where("roadmapId", "==", roadmapId);
    if (chapter) {
      query = query.where("chapter", "==", chapter);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const notes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// POST - Create or update a note
export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roadmapId, chapter, content, category, noteId } = await request.json();

    if (!roadmapId || !chapter || !content) {
      return NextResponse.json(
        { error: "roadmapId, chapter, and content are required" },
        { status: 400 }
      );
    }

    const notesRef = adminDb
      .collection("users")
      .doc(session.user.email)
      .collection("notes");

    if (noteId) {
      // Update existing note
      await notesRef.doc(noteId).update({
        content,
        category: category || "general",
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, noteId });
    }

    // Create new note
    const noteData = {
      roadmapId,
      chapter,
      content,
      category: category || "general",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await notesRef.add(noteData);

    return NextResponse.json({
      success: true,
      noteId: docRef.id,
      note: { id: docRef.id, ...noteData },
    });
  } catch (error) {
    console.error("Error saving note:", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}

// DELETE - Delete a note
export async function DELETE(request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");

    if (!noteId) {
      return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    }

    await adminDb
      .collection("users")
      .doc(session.user.email)
      .collection("notes")
      .doc(noteId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
