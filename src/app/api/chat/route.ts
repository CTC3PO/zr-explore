import { NextResponse } from "next/server";
import path from "path";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { TaskType } from "@google/generative-ai";

let vectorStore: HNSWLib | null = null;

async function getVectorStore(apiKey: string) {
  if (vectorStore) return vectorStore;
  
  const vectorStorePath = path.join(process.cwd(), "data/vector_store");
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: apiKey,
    modelName: "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  try {
    console.log("📂 Loading vector store from:", vectorStorePath);
    vectorStore = await HNSWLib.load(vectorStorePath, embeddings);
    console.log("✅ Vector store loaded successfully.");
    return vectorStore;
  } catch (error) {
    console.error("❌ Failed to load vector store:", error);
    return null;
  }
}

async function callGeminiRaw(prompt: string, modelName: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096, temperature: 0.1 }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
}

export async function POST(request: Request) {
  try {
    const { message, zoningDistricts, context: personaContext } = await request.json();
    const districts = zoningDistricts || [];

    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
    if (!googleKey) return NextResponse.json({ error: "No Google AI API key found." }, { status: 500 });

    const store = await getVectorStore(googleKey);
    let context = "";

    if (store) {
      const query = `${districts.join(", ")} ${message || "zoning regulations"}`;
      const results = await store.similaritySearch(query, 10);
      context = results.map(r => r.pageContent).join("\n\n---\n\n");
    } else {
      return NextResponse.json({ error: "Vector store not initialized." }, { status: 500 });
    }

    const prompt = `
      You are the "NYC Zoning Consultant Agent". Your goal is to help users understand their lot's potential or generic NYC zoning rules by providing actionable insights and explaining the "Why" and "How".
      
      PERSONA CONTEXT:
      ${personaContext || "Focus on professional and balanced advice."}
      
      ${districts.length > 0 ? `Target Zoning Districts: ${districts.join(", ")}` : "Topic: General NYC Zoning Regulations"}
      
      CONTEXT FROM ZONING RESOLUTION:
      ${context}
      
      USER QUESTION: ${message || "Please provide a 'Discovery Summary' for the selected districts or general NYC zoning."}
      
      CONSULTANT GUIDELINES:
      1. SIMPLIFY & TRANSLATE: 
         - Always decode "Use Groups" (1-18) into real-world examples (e.g., Use Group 6 = Local Retail like cafes).
         - Use "Community Landmarks" for scale: Compare heights to "brownstones" (approx 12ft/floor) or "stories".
         - Explain technical terms (FAR, Setbacks, Bulk) in simple English.
      2. DEVELOPMENT PATH: Include a brief "Next Steps" section.
      3. CITATIONS: Cite specific Section numbers (e.g., Section 23-145) from the context provided.
      4. FORMATTING: Use bold headers and clean bullet points.
      5. LIMITS: Always remind the user to consult a professional for a final Zoning Analysis.
      6. FOLLOW-UPS: At the very end of your response, provide exactly 3 follow-up questions the user might ask next. Format them as a JSON array at the end of the text like this: [FOLLOW_UPS: ["Question 1?", "Question 2?", "Question 3?"]]
    `;

    try {
      const text = await callGeminiRaw(prompt, "gemini-2.5-flash", googleKey);
      return NextResponse.json({ response: text });
    } catch (e) {
      console.warn("Gemini 2.5 Flash failed, falling back to 1.5 Flash (if available)...");
      try {
        const text = await callGeminiRaw(prompt, "gemini-1.5-flash", googleKey);
        return NextResponse.json({ response: text });
      } catch (e2) {
        const text = await callGeminiRaw(prompt, "gemini-2.0-flash", googleKey);
        return NextResponse.json({ response: text });
      }
    }
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
