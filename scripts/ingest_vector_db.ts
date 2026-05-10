import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { TaskType } from "@google/generative-ai";

const PDF_PATH = path.join(process.cwd(), "_progress files/_zoning-text/Zoning Resolution Complete.pdf");
const VECTOR_STORE_PATH = path.join(process.cwd(), "data/vector_store");

async function ingest() {
  try {
    console.log("🚀 Starting Vector Ingestion...");
    
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

    console.log("📄 Loading PDF...");
    const loader = new PDFLoader(PDF_PATH);
    const rawDocs = await loader.load();
    
    console.log("✂️ Splitting text...");
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const docs = (await splitter.splitDocuments(rawDocs)).filter(d => d.pageContent.trim().length > 0);
    console.log(`✅ ${docs.length} valid chunks.`);

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: googleKey,
      modelName: "gemini-embedding-001",
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    console.log("🛠️ Initializing HNSWLib with 3072 dimensions...");
    const vectorStore = new HNSWLib(embeddings, {
        space: "cosine",
        numDimensions: 3072
    });

    console.log("🧠 Adding documents to index (this will take a few mins)...");
    await vectorStore.addDocuments(docs);
    
    if (!fs.existsSync(path.join(process.cwd(), "data"))) fs.mkdirSync(path.join(process.cwd(), "data"));
    await vectorStore.save(VECTOR_STORE_PATH);
    console.log(`✨ Success! Saved to: ${VECTOR_STORE_PATH}`);

  } catch (error) {
    console.error("❌ Ingestion failed:", error);
  }
}

ingest();
