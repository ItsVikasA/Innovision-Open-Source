import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2048,
  },
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
  ],
});

export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI is not configured. Please set GEMINI_API_KEY." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { message, chapterContent, chapterTitle, history, selectedText } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Truncate chapter content to avoid token limits
    const truncatedContent = (chapterContent || "").slice(0, 15000);

    // Build conversation history
    const conversationHistory = (history || [])
      .slice(-8)
      .map((msg) => `${msg.role === "user" ? "Student" : "Study Buddy"}: ${msg.text}`)
      .join("\n");

    // Build the system prompt
    let systemPrompt = `You are an AI Study Buddy — a friendly, knowledgeable tutor helping a student understand their current chapter. Your responses should be:
- Clear and easy to understand
- Focused on the chapter content provided below
- Using simple language with real-world analogies when helpful
- Formatted in concise markdown (use headers, bullet points, bold for key terms)
- Encouraging and supportive in tone

IMPORTANT RULES:
1. Base your answers primarily on the chapter content provided below
2. If asked about something not in the chapter, you may use general knowledge but clearly note it
3. Keep responses concise — aim for 2-4 paragraphs unless a longer explanation is needed
4. Use examples and analogies to explain difficult concepts
5. If the student seems confused, break things down into simpler steps`;

    if (truncatedContent) {
      systemPrompt += `

--- CHAPTER CONTENT ---
Chapter: ${chapterTitle || "Current Chapter"}

${truncatedContent}
--- END CHAPTER CONTENT ---`;
    }

    // Handle selected text context
    let userMessage = message;
    if (selectedText) {
      userMessage = `The student has highlighted the following text from the chapter and wants help understanding it:

> "${selectedText}"

Their question: ${message}`;
    }

    const fullPrompt = `${systemPrompt}

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ""}
Student's message: ${userMessage}`;

    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Study Buddy API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response." },
      { status: 500 }
    );
  }
}
