import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = params;
    const { reason } = await request.json();

    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Report reason is required" },
        { status: 400 }
      );
    }

    const userEmail = session.user.email;

    const reviewRef = adminDb.collection("reviews").doc(reviewId);
    const reviewDoc = await reviewRef.get();

    if (!reviewDoc.exists) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    const reviewData = reviewDoc.data();

    if (reviewData.userId === userEmail) {
      return NextResponse.json(
        { error: "You cannot report your own review" },
        { status: 400 }
      );
    }

    const reportData = {
      reviewId,
      courseId: reviewData.courseId,
      reportedBy: userEmail,
      reportedByName: session.user.name || "Anonymous",
      reason,
      status: "pending", 
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("reviewReports").add(reportData);

    const reportCount = (reviewData.reportCount || 0) + 1;
    const updateData = {
      reportCount,
    };

    if (reportCount >= 3) {
      updateData.reported = true;
    }

    await reviewRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "Review reported successfully. Our team will review it.",
      reportCount,
    });
  } catch (error) {
    console.error("Error reporting review:", error);
    return NextResponse.json(
      { error: "Failed to report review" },
      { status: 500 }
    );
  }
}
