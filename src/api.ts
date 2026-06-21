import express from "express";
import { GoogleGenAI } from "@google/genai";
import { calculateCarbonFootprint } from "./lib/calculations";

const app = express();

// --- LOGGING MIDDLEWARE ---
app.use((req, res, next) => {
    console.log(`[VERCEL API]: ${req.method} ${req.url}`);
    next();
});

// --- ROBUST HEALTH CHECK HANDLERS ---

// Endpoint for /api/health (Standard)
app.get("/api/health", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json({ 
    status: "online", 
    timestamp: new Date().toISOString(),
    ai_status: !!process.env.GEMINI_API_KEY ? "key_configured" : "key_missing",
    mode: "path_api_health"
  });
});

// Endpoint for /health (Fallback if mapped differently)
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "online", 
    timestamp: new Date().toISOString(),
    ai_status: !!process.env.GEMINI_API_KEY ? "key_configured" : "key_missing",
    mode: "path_health"
  });
});

app.use(express.json());

// 2. Logging & Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// --- API ROUTES ---

app.post("/api/calculate", (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ success: false, error: "Missing environmental payload" });
    }

    const electricityState = req.body.electricity !== undefined && req.body.electricity !== "" ? parseFloat(req.body.electricity) : null;
    const distanceState = req.body.distance !== undefined && req.body.distance !== "" ? parseFloat(req.body.distance) : null;
    const localSourcedState = req.body.localSourced !== undefined && req.body.localSourced !== "" ? parseFloat(req.body.localSourced) : null;

    if (
      (electricityState !== null && !isNaN(electricityState) && electricityState < 0) ||
      (distanceState !== null && !isNaN(distanceState) && distanceState < 0) ||
      (localSourcedState !== null && !isNaN(localSourcedState) && localSourcedState < 0)
    ) {
      return res.status(400).json({ success: false, error: "Metrics validation error: Negative values are not permitted." });
    }

    const data = calculateCarbonFootprint(req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: "Calculation failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        return res.status(200).send("EcoTrace AI: GEMINI_API_KEY is missing. Analysis features may be limited.");
    }

    // Lazy initialization of the Gemini client inside the route handler
    const aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const responseStream = await aiClient.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction: "You are EcoTrace AI, a carbon emissions expert consultant. Analyze the user's footprint data carefully and provide structured, actionable advice."
      }
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).send(`AI Error: ${error.message}`);
  }
});

export default app;
