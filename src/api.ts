import express from "express";
import { GoogleGenAI } from "@google/genai";
import { calculateCarbonFootprint } from "./lib/calculations";
import "dotenv/config";

const app = express();

// High-Performance Security & Production Logging Layer
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

app.use(express.json());

// 1. Health check BEFORE any middleware or limiter for Maximum Availability
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "online", 
    timestamp: new Date().toISOString(),
    ai_status: !!process.env.GEMINI_API_KEY ? "key_configured" : "key_missing"
  });
});

// Access API key from environment lazily
let aiClient: any = null;
function getAI() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy_key",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Secure input validation middleware to ensure High-Fidelity processing
function validateMetrics(req: express.Request, res: express.Response, next: express.NextFunction) {
  const metrics = req.body;
  
  if (!metrics || Object.keys(metrics).length === 0) {
      return res.status(400).json({ error: "Missing environmental payload metrics structure." });
  }
  
  const electricity = parseFloat(metrics.electricity);
  const transport = parseFloat(metrics.distance);
  
  if ((metrics.electricity !== undefined && (isNaN(electricity) || electricity < 0)) || 
      (metrics.distance !== undefined && (isNaN(transport) || transport < 0))) {
      return res.status(400).json({ error: "Metrics validation error: Numerical values must be non-negative numbers." });
  }
  next();
}

// --- API ROUTES ---

app.post("/api/calculate", validateMetrics, (req, res) => {
  try {
    const data = calculateCarbonFootprint(req.body);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: "Invalid input" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message, context } = req.body;
  const ai = getAI();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    const breakdown = context?.breakdown || { electricity: 0, transport: 0, diet: 0 };
    const totalScore = context?.totalScore || 0;

    const system_instruction = `You are EcoTrace AI, the premier expert carbon emissions consultant. 
    Analyze the user's primary carbon footprint data carefully.
    
    Current Carbon Profile: 
    - Monthly Electricity: ${(breakdown.electricity || 0).toFixed(2)} kg CO2
    - Transport Logistics: ${(breakdown.transport || 0).toFixed(2)} kg CO2
    - Dietary Footprint: ${(breakdown.diet || 0).toFixed(2)} kg CO2
    - Total Footprint: ${(totalScore || 0).toFixed(2)} kg CO2/month.
    
    Provide structured, actionable advice targeting their highest carbon emitter source. Respond using clean markdown formatting rules with bold key terms and bullet points. Maintain a high-fidelity, authoritative yet encouraging tone.`;
    
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction: system_instruction,
      }
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(text);
      }
    }
    res.end();
  } catch (error: any) {
    console.error("AI Error:", error);
    if (!res.headersSent) {
      res.status(500).write(`AI Engine Error: ${error.message}`);
      res.end();
    } else {
      res.write(`\n\n[Error: ${error.message}]`);
      res.end();
    }
  }
});

export default app;
