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
    apiKey,
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
      generationConfig: { maxOutputTokens: 4096, temperature: 0.15 },
    }),
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
    const {
      message,
      zoningDistricts,
      context: personaContext,
      lotContext,       // ← new: full lot metadata object
      history,          // ← new: prior conversation turns [{role,text}]
    } = await request.json();

    const districts: string[] = zoningDistricts || [];
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
    if (!googleKey) return NextResponse.json({ error: "No Google AI API key found." }, { status: 500 });

    const store = await getVectorStore(googleKey);
    let ragContext = "";
    if (store) {
      const query = `${districts.join(", ")} ${message || "zoning regulations"}`;
      const results = await store.similaritySearch(query, 10);
      ragContext = results.map((r) => r.pageContent).join("\n\n---\n\n");
    } else {
      return NextResponse.json({ error: "Vector store not initialized." }, { status: 500 });
    }

    // ── Build the lot snapshot from lotContext ──────────────────────────────
    let lotSnapshot = "";
    if (lotContext) {
      const { address, zoningDistricts: zd, metadata } = lotContext;
      const parts: string[] = [];
      if (address) parts.push(`Address: ${address}`);
      if (zd?.length) parts.push(`Zoning: ${zd.join(" / ")}`);
      if (metadata?.lotArea) parts.push(`Lot area: ${parseInt(metadata.lotArea).toLocaleString()} sq ft`);
      if (metadata?.maxResidFAR) parts.push(`Max residential FAR: ${metadata.maxResidFAR}`);
      if (metadata?.maxCommFAR && parseFloat(metadata.maxCommFAR) > 0) parts.push(`Max commercial FAR: ${metadata.maxCommFAR}`);
      if (metadata?.builtFAR) parts.push(`Current built FAR: ${metadata.builtFAR}`);
      if (metadata?.numFloors && metadata.numFloors !== "0") parts.push(`Existing building: ${metadata.numFloors} floors`);
      if (metadata?.yearBuilt && metadata.yearBuilt !== "0") parts.push(`Year built: ${metadata.yearBuilt}`);
      lotSnapshot = parts.join(" · ");
    }

    // ── Build conversation history block ───────────────────────────────────
    let historyBlock = "";
    if (history && history.length > 0) {
      // Keep last 6 turns to stay within token budget
      const recent = history.slice(-6);
      historyBlock = recent
        .map((m: { role: string; text: string }) =>
          m.role === "user" ? `USER: ${m.text}` : `ZR-SCOUT: ${m.text}`
        )
        .join("\n");
    }

    // ── Compose full prompt ────────────────────────────────────────────────
    const prompt = `You are "ZR-Scout", an expert NYC Zoning consultant embedded in ZR-Explore.
You speak like a sharp, helpful colleague — not a legal document.

PERSONA: ${personaContext || "Balanced professional advice."}

${lotSnapshot ? `THIS LOT:\n${lotSnapshot}\n` : ""}
${historyBlock ? `CONVERSATION SO FAR:\n${historyBlock}\n` : ""}
RELEVANT ZONING RESOLUTION EXCERPTS:
${ragContext}

USER'S LATEST QUESTION: ${message || "Give a quick summary of this lot's zoning."}

STRICT RESPONSE FORMAT:
1. LEAD WITH THE ANSWER — first sentence answers the question directly. Zero preamble.
2. CITE THE ZR — reference specific ZR §section numbers whenever quoting a rule.
3. USE REAL NUMBERS — always include the actual FAR, height, or setback figure for this lot.
4. TRANSLATE JARGON — define terms inline: "FAR 3.44 = you can build up to 3.44× the lot area".
5. SCALE IT — compare big numbers to real things: "6 floors ≈ 3 brownstones stacked".
6. TARGET 150–200 WORDS — use bullets for lists, **bold** for key figures.
7. ONE DISCLAIMER — add "consult a licensed professional" only if the question involves legal compliance or construction, once at the end if at all.
8. FOLLOW-UPS — end every response with exactly this format on its own line:
   [FOLLOW_UPS: ["Question 1?", "Question 2?", "Question 3?"]]
   Make follow-ups specific to THIS lot and what the user JUST asked — never generic.`;

    try {
      const text = await callGeminiRaw(prompt, "gemini-2.5-flash", googleKey);
      return NextResponse.json({ response: text });
    } catch {
      try {
        const text = await callGeminiRaw(prompt, "gemini-2.0-flash", googleKey);
        return NextResponse.json({ response: text });
      } catch {
        const text = await callGeminiRaw(prompt, "gemini-1.5-flash", googleKey);
        return NextResponse.json({ response: text });
      }
    }
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
