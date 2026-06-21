import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

import { calculateCarbonFootprint } from "./src/lib/calculations";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// Secure input validation middleware to ensure High-Fidelity processing
function validateMetrics(req: express.Request, res: express.Response, next: express.NextFunction) {
  const metrics = req.body;
  if (!metrics || Object.keys(metrics).length === 0) {
      return res.status(400).json({ error: "Missing environmental payload metrics structure." });
  }
  
  const electricity = parseFloat(metrics.electricity);
  const transport = parseFloat(metrics.distance);
  
  if ((metrics.electricity && (isNaN(electricity) || electricity < 0)) || 
      (metrics.distance && (isNaN(transport) || transport < 0))) {
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
  const { message, context, history } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(500).json({ error: "API key is missing. Please add GEMINI_API_KEY to your secrets." });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    let systemInstruction = `You are EcoTrace AI, an elite environmental consultant and sustainability agent. 
    Your goal is to provide high-fidelity, actionable roadmap directives to help users reduce their carbon footprint.
    
    Guidelines:
    1. Actively reference the provided user metrics (Energy, Transport, Diet) in your recommendations.
    2. Be highly professional, actionable, and structured.
    3. Keep solutions practical but scientifically grounded.
    4. Use markdown: **bold** key terms, use bullet points (•), and keep sections distinct.
    5. If the user asks general questions, provide facts about climate change and sustainability.
    6. Maintain a supportive yet authoritative tone.`;
    
    if (context && context.totalScore) {
      systemInstruction += `\n\nContext: Monthly Footprint ${context.totalScore.toFixed(2)} kg CO2.
      Energy: ${context.electricityScore.toFixed(2)} kg, Transport: ${context.transportScore.toFixed(2)} kg, Diet: ${context.dietScore.toFixed(2)} kg.`;
    }

    const stream = await ai.interactions.create({
      model: "gemini-2.5-flash",
      input: message,
      system_instruction: systemInstruction,
      stream: true,
    });

    for await (const event of stream) {
      if (event.event_type === "step.delta" && event.delta.type === "text") {
        res.write(event.delta.text);
      }
    }

    res.end();
  } catch (error: any) {
    console.error("AI Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: `AI Engine Error: ${error.message}` });
    } else {
      res.write(`\n\n[Error: ${error.message}]`);
      res.end();
    }
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- SERVER INITIALIZATION ---

async function startServer() {
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  
  if (!isProd) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite failed to start, falling back to static:", e);
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Only start the server if we're not on Vercel (Vercel handles the execution via exported app)
if (!process.env.VERCEL) {
  startServer();
}

export default app;

