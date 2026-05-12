# ZR-Explore: NYC Zoning Navigator

ZR-Explore is an interactive platform designed to make New York City's complex zoning regulations accessible to everyone. While traditional tools focus primarily on looking up data, this application allows users to simulate building potential, visualize density in 3D, and consult an AI assistant grounded in the official Zoning Resolution text.

## Project Goal

The primary objective of ZR-Explore is to demystify the 4,000-page NYC Zoning Resolution. It translates abstract legal text and floor area ratios into visual building models and plain-English explanations. Whether you are a developer looking for a site's potential, an architect sketching a preliminary massing, or a citizen curious about neighborhood changes, this tool provides a clear path from data to understanding.

## Beyond the Map: How This Differs from ZoLa

Most zoning tools function as simple digital maps (Explorers). ZR-Explore expands this into a multi-dimensional workflow:

1. Explorer: Search any address or tax lot in NYC to view live zoning districts, commercial overlays, and active building permits.
2. Builder: Unlike static maps, you can "play" with the site. Add floors, change use types (Residential vs. Commercial), and instantly see how much square footage you can fit.
3. Visualizer: Every input in the Builder is rendered as a 3D building on the map. It also shows a "Theoretical Max" wireframe, helping you see the volume limit allowed by law.
4. AI Consultant: A built-in expert that answers questions like "Can I build a cafe here?" or "What are the height rules for this area?" It provides specific citations and decodes technical jargon into relatable terms.

## Stakeholders

- Developers: Quickly assess the buildable area and investment potential of a tax lot.
- Architects: Generate rapid massing studies and verify zoning compliance during early discovery.
- Citizens: Understand what could be built on a nearby empty lot using simple, relatable language and visual comparisons.

## Technical Summary

### The Stack

- Framework: Next.js with React and TypeScript.
- Styling: Tailwind CSS for a modern, responsive interface.
- Mapping Engine: MapLibre GL JS for high-performance 3D rendering.
- Geospatial Logic: Turf.js for calculating lot areas and managing complex geometry.

### Data and Intelligence

- Mapping Layers: Real-time data streams from the NYC Planning ArcGIS MapServers.
- AI Core: Google Gemini 2.0 Flash.
- RAG Pipeline: A local vector database (HNSWLib) containing thousands of indexed chunks of the NYC Zoning Resolution. This ensures the AI provides grounded, cited answers rather than general guesses.
- Spatial Calculations: Custom logic to handle FAR (Floor Area Ratio) utilization, MIH (Mandatory Inclusionary Housing) bonuses, and transit-oriented development incentives.

## Getting Started

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Set up your `.env` file with a Google Generative AI API key.
4. Run the development server with `npm run dev`.
5. Access the app at `http://localhost:3000`.
