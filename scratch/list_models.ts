import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
  const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // dummy
  
  // Actually use the REST API via fetch since GenAI SDK might not have listModels easily exposed
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

listModels();
