import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

async function testDimension() {
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: googleKey,
    modelName: "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });

  try {
    const vec = await embeddings.embedQuery("Hello world");
    console.log(`Dimension: ${vec.length}`);
  } catch (e) {
    console.error(e);
  }
}

testDimension();
