import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateCarbonFootprint } from "./lib/calculations";

const app = express();

// 1. Basic Health Check (Early Response)
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "online", 
    timestamp: new Date().toISOString(),
    ai_status: !!process.env.GEMINI_API_KEY ? "key_configured" : "key_missing"
  });
});

app.use(express.json());

// 2. Logging & Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

// AI Initialization
const getAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    return new GoogleGenerativeAI(key);
};

// --- API ROUTES ---

app.post("/api/calculate", (req, res) => {
  try {
    const data = calculateCarbonFootprint(req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: "Calculation failed" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, context } = req.body;
    const ai = getAI();
    if (!ai) {
        return res.status(500).send("AI Configuration Missing: Please set GEMINI_API_KEY in Vercel environment variables.");
    }

    const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: "You are EcoTrace AI, a carbon emissions expert consultant."
    });

    const result = await model.generateContentStream(message);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    for await (const chunk of result.stream) {
      const text = chunk.text();
      res.write(text);
    }
    res.end();
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).send(`AI Error: ${error.message}`);
  }
});

export default app;
