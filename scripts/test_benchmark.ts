import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TEST_CASES = [
  {
    name: "R6 Residential FAR",
    zoningDistricts: ["R6"],
    message: "What is the maximum FAR for a quality housing building on a wide street in an R6 district?",
  },
  {
    name: "C4-4 Commercial/Residential",
    zoningDistricts: ["C4-4"],
    message: "Can I build a residential building in a C4-4 district? If so, what is the residential FAR equivalent?",
  },
  {
    name: "M1-1 Manufacturing Limits",
    zoningDistricts: ["M1-1"],
    message: "Is residential use allowed in an M1-1 district? What about community facilities?",
  }
];

async function runBenchmark() {
  console.log("🧪 Starting AI Consultant Benchmark...");
  
  for (const test of TEST_CASES) {
    console.log(`\n--- Testing: ${test.name} ---`);
    console.log(`Question: ${test.message}`);
    
    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: test.message,
          zoningDistricts: test.zoningDistricts
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error(`❌ Error: ${data.error}`);
      } else {
        console.log("✅ AI Response Snapshot:");
        console.log(data.response.substring(0, 500) + "...");
        
        // Basic Verification
        const hasSection = /Section \d+-\d+/i.test(data.response);
        console.log(`\n🔍 Quality Check:`);
        console.log(`- Contains Citations: ${hasSection ? "YES" : "NO"}`);
      }
    } catch (error) {
      console.error(`❌ Failed to connect to API: ${error}`);
    }
  }
}

runBenchmark();
