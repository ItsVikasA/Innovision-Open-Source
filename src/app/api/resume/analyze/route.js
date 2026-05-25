import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key-if-not-set");

export async function POST(request) {
  try {
    const { content, role } = await request.json();

    if (!content || !role) {
      return NextResponse.json(
        { error: "Content and role are required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      // Mock response for fallback/development if GEMINI_API_KEY is not configured
      const mockResult = generateMockAnalysis(content, role);
      return NextResponse.json(mockResult);
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const prompt = `
Analyze the following resume details for suitability in a "${role}" role.

Resume Content:
Summary: ${content.summary || "None provided"}
Skills: ${(content.skills || []).join(", ") || "None listed"}
Experience: ${JSON.stringify(content.experience || [])}
Education: ${JSON.stringify(content.education || [])}

Perform the following:
1. Grade the overall suitability as an ATS Score out of 100 (where 0 is completely off-topic and 100 is perfectly aligned).
2. Extract the keywords & technical skills already present in the resume that are highly relevant to a "${role}" role.
3. Identify crucial missing keywords, libraries, processes, or technologies expected of a "${role}" that are absent from this resume.
4. Provide 3 to 5 highly actionable, smart, and specific optimization recommendations to improve the resume (e.g. phrasing, formatting, adding missing metrics).

Return the response ONLY as a valid JSON object matching this schema:
{
  "atsScore": number, // integer between 0 and 100
  "keywords": string[], // array of found key terms/skills
  "missingKeywords": string[], // array of missing key terms/skills
  "recommendations": string[] // array of actionable suggestions
}

Ensure there is no surrounding markdown, no backticks, and it is strictly valid parsable JSON.
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Resilient JSON parsing
    if (text.startsWith("```json")) {
      text = text.substring(7);
    }
    if (text.startsWith("```")) {
      text = text.substring(3);
    }
    if (text.endsWith("```")) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON output:", text, parseError);
      // Fallback in case of parsing failures
      const mockResult = generateMockAnalysis(content, role);
      return NextResponse.json(mockResult);
    }
  } catch (error) {
    console.error("❌ Error in resume analyze API:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume" },
      { status: 500 }
    );
  }
}

function generateMockAnalysis(content, role) {
  // Safe fallback analyzer that estimates scores based on matching terms
  const resumeText = JSON.stringify(content).toLowerCase();
  
  const roleKeywords = {
    frontend: ["react", "javascript", "css", "html", "next.js", "tailwind", "typescript", "redux", "web"],
    backend: ["node", "express", "mongodb", "postgresql", "sql", "api", "rest", "python", "docker", "server"],
    fullstack: ["react", "node", "express", "mongodb", "api", "javascript", "database", "next.js", "typescript"],
    aiml: ["python", "pytorch", "tensorflow", "machine learning", "deep learning", "nlp", "ai", "model", "numpy"],
    mobile: ["react native", "flutter", "swift", "kotlin", "android", "ios", "mobile", "app"],
    devops: ["docker", "kubernetes", "aws", "ci/cd", "jenkins", "linux", "git", "cloud", "terraform"]
  };

  const cleanRole = role.toLowerCase().replace(/[^a-z0-9]/g, "");
  let matchedRole = "frontend";
  for (const k of Object.keys(roleKeywords)) {
    if (cleanRole.includes(k) || k.includes(cleanRole)) {
      matchedRole = k;
      break;
    }
  }

  const targetKeywords = roleKeywords[matchedRole];
  const found = [];
  const missing = [];

  targetKeywords.forEach(kw => {
    if (resumeText.includes(kw)) {
      found.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    } else {
      missing.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  });

  // Basic scoring: percentage of keywords found
  const baseScore = found.length > 0 ? Math.round((found.length / targetKeywords.length) * 40) + 50 : 45;
  const finalScore = Math.min(baseScore + (content.summary ? 5 : 0) + (content.experience?.length ? 5 : 0), 98);

  const recs = [
    `Highlight your target role "${role}" explicitly in your professional summary.`,
    `Incorporate missing skills like ${missing.slice(0, 2).join(" or ") || "relevant technical patterns"} directly into your skills block.`,
    "Add measurable outcomes in your experience bullet points, such as percentage increases in speed or engagement.",
    "Detail key milestones or technical hurdles you resolved during your course projects."
  ];

  return {
    atsScore: finalScore,
    keywords: found.length > 0 ? found : ["Communication", "Problem Solving"],
    missingKeywords: missing.length > 0 ? missing : ["System Architecture", "Continuous Integration"],
    recommendations: recs
  };
}
