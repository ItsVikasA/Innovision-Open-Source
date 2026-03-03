import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "@/lib/auth-server";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// POST - Classify a note using AI
export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, action } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Fallback classification when no API key
      return NextResponse.json({ category: "general" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    if (action === "cheatsheet") {
      // Generate a master cheat sheet from notes
      const { notes, chapterTitle } = JSON.parse(content);

      const prompt = `You are a study assistant. Create a concise, well-organized cheat sheet/summary from these student notes for the chapter "${chapterTitle || "this chapter"}".

Notes:
${notes.map((n, i) => `${i + 1}. [${n.category}] ${n.content}`).join("\n")}

Format the cheat sheet in Markdown with:
- A brief overview
- Key definitions
- Important concepts grouped by category
- Quick reference points
- Any formulas or key facts

Keep it concise and exam-ready. Use bullet points and headers for easy scanning.`;

      const result = await model.generateContent(prompt);
      const cheatsheet = result.response.text();

      return NextResponse.json({ cheatsheet });
    }

    // Default: classify a note
    const prompt = `Classify the following study note into exactly ONE of these categories: definition, concept, example, formula, important, question, general.

Note: "${content}"

Respond with ONLY the category name in lowercase, nothing else.`;

    const result = await model.generateContent(prompt);
    const category = result.response.text().trim().toLowerCase();

    // Validate the category
    const validCategories = ["definition", "concept", "example", "formula", "important", "question", "general"];
    const finalCategory = validCategories.includes(category) ? category : "general";

    return NextResponse.json({ category: finalCategory });
  } catch (error) {
    console.error("Error in AI notes:", error);
    return NextResponse.json({ category: "general" });
  }
}
