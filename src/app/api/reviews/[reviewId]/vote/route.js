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
    const { voteType } = await request.json(); 

    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    if (!voteType || !["helpful", "not_helpful"].includes(voteType)) {
      return NextResponse.json(
        { error: "Vote type must be 'helpful' or 'not_helpful'" },
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
        { error: "You cannot vote on your own review" },
        { status: 400 }
      );
    }

    const helpfulVotes = reviewData.helpfulVotes || [];
    const notHelpfulVotes = reviewData.notHelpfulVotes || [];

    let updateData = {};

    if (voteType === "helpful") {
      
      if (helpfulVotes.includes(userEmail)) {
        
        updateData.helpfulVotes = helpfulVotes.filter((email) => email !== userEmail);
        updateData.helpfulCount = (reviewData.helpfulCount || 0) - 1;
      } else {
        
        updateData.helpfulVotes = [...helpfulVotes, userEmail];
        updateData.helpfulCount = (reviewData.helpfulCount || 0) + 1;

        if (notHelpfulVotes.includes(userEmail)) {
          updateData.notHelpfulVotes = notHelpfulVotes.filter(
            (email) => email !== userEmail
          );
          updateData.notHelpfulCount = Math.max(
            (reviewData.notHelpfulCount || 0) - 1,
            0
          );
        }
      }
    } else if (voteType === "not_helpful") {
      
      if (notHelpfulVotes.includes(userEmail)) {
        
        updateData.notHelpfulVotes = notHelpfulVotes.filter(
          (email) => email !== userEmail
        );
        updateData.notHelpfulCount = Math.max(
          (reviewData.notHelpfulCount || 0) - 1,
          0
        );
      } else {
        
        updateData.notHelpfulVotes = [...notHelpfulVotes, userEmail];
        updateData.notHelpfulCount = (reviewData.notHelpfulCount || 0) + 1;

        if (helpfulVotes.includes(userEmail)) {
          updateData.helpfulVotes = helpfulVotes.filter(
            (email) => email !== userEmail
          );
          updateData.helpfulCount = Math.max(
            (reviewData.helpfulCount || 0) - 1,
            0
          );
        }
      }
    }

    await reviewRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "Vote recorded successfully",
      helpfulCount: updateData.helpfulCount ?? reviewData.helpfulCount,
      notHelpfulCount: updateData.notHelpfulCount ?? reviewData.notHelpfulCount,
    });
  } catch (error) {
    console.error("Error voting on review:", error);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}
