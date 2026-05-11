import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { TaskType } from "@google/generative-ai";
import { Document } from "@langchain/core/documents";

const PDF_PATH = path.join(process.cwd(), "_progress files/_zoning-text/Zoning Resolution Complete.pdf");
const VECTOR_STORE_PATH = path.join(process.cwd(), "data/vector_store");

async function ingest() {
  try {
    console.log("🚀 Starting Resilient Vector Ingestion...");
    
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const loader = new PDFLoader(PDF_PATH);
    const rawDocs = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const docs = (await splitter.splitDocuments(rawDocs)).filter(d => d.pageContent.trim().length > 0);
    console.log(`✅ ${docs.length} valid chunks.`);

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: googleKey,
      modelName: "gemini-embedding-001", // Or text-embedding-004
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    // Detect dimension dynamically
    console.log("🧪 Detecting embedding dimensions...");
    const testVec = await embeddings.embedQuery("test dimension");
    const detectedDim = testVec.length;
    console.log(`📏 Detected dimension: ${detectedDim}`);

    const validVectors: number[][] = [];
    const validDocs: Document[] = [];
    const batchSize = 50;
    
    console.log("🧠 Generating embeddings and filtering invalid ones...");
    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        try {
            const batchVectors = await embeddings.embedDocuments(batch.map(d => d.pageContent));
            for (let j = 0; j < batchVectors.length; j++) {
                if (batchVectors[j] && batchVectors[j].length === detectedDim) {
                    validVectors.push(batchVectors[j]);
                    validDocs.push(batch[j]);
                } else {
                    console.warn(`⚠️ Skipping chunk at ${i + j} due to invalid dimension: ${batchVectors[j]?.length} (expected ${detectedDim})`);
                }
            }
            if (i % 500 === 0) console.log(`Processed ${i}/${docs.length}...`);
        } catch (e: any) {
            console.error(`❌ Batch at ${i} failed: ${e.message}. Retrying individually...`);
            for (const doc of batch) {
                try {
                    const vec = await embeddings.embedQuery(doc.pageContent);
                    if (vec.length === detectedDim) {
                        validVectors.push(vec);
                        validDocs.push(doc);
                    }
                } catch (inner) {
                    console.error(`   - Individual doc failed, skipping.`);
                }
            }
        }
    }

    console.log(`✅ Final count: ${validVectors.length}/${docs.length} documents embedded.`);

    console.log(`🛠️ Initializing HNSWLib with ${detectedDim} dimensions...`);
    const vectorStore = new HNSWLib(embeddings, {
        space: "cosine",
        numDimensions: detectedDim
    });

    console.log("🏗️ Adding valid vectors to index...");
    await vectorStore.addVectors(validVectors, validDocs);
    
    if (!fs.existsSync(path.join(process.cwd(), "data"))) fs.mkdirSync(path.join(process.cwd(), "data"));
    await vectorStore.save(VECTOR_STORE_PATH);
    console.log(`✨ Success! Saved to: ${VECTOR_STORE_PATH}`);

  } catch (error) {
    console.error("❌ Ingestion failed:", error);
  }
}

ingest();
