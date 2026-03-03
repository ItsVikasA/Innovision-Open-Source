import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  },
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
  ],
});

function cleanJsonResponse(text) {
  return text
    .replace(/^```json\s?/, "")
    .replace(/^```\s?/, "")
    .replace(/\s?```$/, "")
    .trim();
}

export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;

    // Fetch all user roadmaps
    const roadmapsSnap = await adminDb
      .collection("users")
      .doc(email)
      .collection("roadmaps")
      .get();

    const roadmaps = roadmapsSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          courseTitle: data.courseTitle || "",
          courseDescription: data.courseDescription || "",
          difficulty: data.difficulty || "balanced",
          completed: data.completed || false,
          archived: data.archived || false,
          process: data.process,
          chapters: (data.chapters || []).map((ch) => ({
            chapterTitle: ch.chapterTitle,
            completed: ch.completed || false,
          })),
        };
      })
      .filter((r) => r.process === "completed" && !r.archived);

    if (roadmaps.length === 0) {
      return NextResponse.json(
        {
          message: "No courses found. Complete at least one course to get career path suggestions.",
          careerPaths: [],
          summary: null,
        },
        { status: 200 }
      );
    }

    // Build a summary of user's learning
    const completedCourses = roadmaps.filter((r) => r.completed);
    const inProgressCourses = roadmaps.filter((r) => !r.completed);

    const courseSummary = roadmaps
      .map((r) => {
        const completedChapters = r.chapters.filter((ch) => ch.completed).length;
        const totalChapters = r.chapters.length;
        const progress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
        return `- "${r.courseTitle}" (${r.difficulty}, ${progress}% complete): ${r.courseDescription}`;
      })
      .join("\n");

    const prompt = `You are an expert career counselor and tech industry analyst. Analyze the user's completed and in-progress courses to suggest realistic career paths.

The user has ${completedCourses.length} completed courses and ${inProgressCourses.length} in-progress courses:

${courseSummary}

Return ONLY valid JSON with this exact structure:
{
  "careerPaths": [
    {
      "title": "Job Role Title (e.g., Full Stack Web Developer)",
      "description": "2-3 sentence description of the role and why the user is a good fit",
      "matchPercentage": 65,
      "level": "Beginner | Intermediate | Advanced",
      "coveredSkills": ["Skill 1", "Skill 2"],
      "missingSkills": ["Skill 3", "Skill 4"],
      "nextSteps": ["Actionable next step 1", "Actionable next step 2", "Actionable next step 3"],
      "estimatedTimeToComplete": "2-3 months",
      "salaryRange": "$XX,000 - $XX,000",
      "demandLevel": "High | Medium | Low"
    }
  ],
  "overallAnalysis": {
    "strengths": ["Strength 1", "Strength 2"],
    "gaps": ["Gap 1", "Gap 2"],
    "recommendation": "A 2-3 sentence personalized recommendation for the user's learning journey"
  }
}

Guidelines:
- Suggest 3-5 career paths ranked by match percentage (highest first)
- Match percentage should reflect how much of the career's required skills the user has covered
- coveredSkills should be skills the user has already learned from their courses
- missingSkills should be specific, actionable skills the user needs to learn
- nextSteps should be concrete learning actions (e.g., "Learn Node.js fundamentals and build a REST API")
- Be realistic about match percentages based on actual course coverage
- Focus on tech/software careers that align with the user's learning direction
- estimatedTimeToComplete is how long to become job-ready in this role from current state`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleanedText = cleanJsonResponse(rawText);

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Career path JSON parse failed:", cleanedText);
      return NextResponse.json(
        { message: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...parsed,
      summary: {
        totalCourses: roadmaps.length,
        completedCourses: completedCourses.length,
        inProgressCourses: inProgressCourses.length,
        totalChaptersCompleted: roadmaps.reduce(
          (acc, r) => acc + r.chapters.filter((ch) => ch.completed).length,
          0
        ),
        totalChapters: roadmaps.reduce((acc, r) => acc + r.chapters.length, 0),
      },
    });
  } catch (error) {
    console.error("Career path analysis error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
