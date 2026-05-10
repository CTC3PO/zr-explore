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
    vectorStore = await HNSWLib.load(vectorStorePath, embeddings);
    return vectorStore;
  } catch (error) {
    console.error("Failed to load vector store:", error);
    return null;
  }
}

async function callGeminiRaw(prompt: string, modelName: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.1 }
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
    const { message, zoningDistricts } = await request.json();
    if (!zoningDistricts || zoningDistricts.length === 0) {
      return NextResponse.json({ error: "Zoning districts are required" }, { status: 400 });
    }

    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
    if (!googleKey) return NextResponse.json({ error: "No Google AI API key found." }, { status: 500 });

    const store = await getVectorStore(googleKey);
    let context = "";

    if (store) {
      const query = `${zoningDistricts.join(", ")} ${message || "zoning regulations"}`;
      const results = await store.similaritySearch(query, 10);
      context = results.map(r => r.pageContent).join("\n\n---\n\n");
    } else {
      return NextResponse.json({ error: "Vector store not initialized." }, { status: 500 });
    }

    const prompt = `
      You are the "NYC Zoning Consultant Agent". Your goal is to help an average property owner or potential developer understand their lot's potential. 
      Unlike ZoLa (which just shows data), you provide actionable insights and explain the "Why" and "How".
      
      Lot Zoning Districts: ${zoningDistricts.join(", ")}
      
      CONTEXT FROM ZONING RESOLUTION:
      ${context}
      
      USER QUESTION: ${message || "Please provide a 'Discovery Summary' for this lot."}
      
      CONSULTANT GUIDELINES:
      1. SIMPLIFY: Explain terms like FAR, Setbacks, and Use Groups in simple English.
      2. DEVELOPMENT PATH: Include a brief "Next Steps" section.
      3. CITATIONS: Cite specific Section numbers (e.g., Section 23-145) from the context provided.
      4. FORMATTING: Use bold headers and clean bullet points.
      5. LIMITS: Always remind the user to consult a professional for a final Zoning Analysis.
    `;

    try {
      const text = await callGeminiRaw(prompt, "gemini-2.0-flash", googleKey);
      return NextResponse.json({ response: text });
    } catch (e) {
      console.warn("Gemini 2.0 Flash failed, falling back to 1.5 Flash...");
      const text = await callGeminiRaw(prompt, "gemini-1.5-flash", googleKey);
      return NextResponse.json({ response: text });
    }
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
