import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// Carbon Calculation Logic
const ELECTRICITY_FACTOR = 0.385; // kg CO2 per kWh
const TRANSPORT_FACTORS: Record<string, number> = {
  Petrol: 0.17,
  Diesel: 0.15,
  EV: 0.05,
};
const DIET_FACTORS: Record<string, number> = {
  Meat: 250,
  Vegetarian: 150,
  Vegan: 100,
};

// --- API ROUTES ---

app.post("/api/calculate", (req, res) => {
  const { electricity, distance, fuelType, dietType, distanceUnit, localSourced } = req.body;

  try {
    const electricityScore = (parseFloat(electricity) || 0) * ELECTRICITY_FACTOR;
    let dist = parseFloat(distance) || 0;
    if (distanceUnit === "mi") dist = dist * 1.60934;
    
    const transportScore = dist * (TRANSPORT_FACTORS[fuelType] || 0.17) * 4.33;
    const baseDietScore = DIET_FACTORS[dietType] || 250;
    const sourcingFactor = 1 - ((parseFloat(localSourced) || 50) / 100) * 0.15;
    const dietScore = baseDietScore * sourcingFactor;

    const totalScore = electricityScore + transportScore + dietScore;

    res.json({
      success: true,
      data: {
        electricityScore,
        transportScore,
        dietScore,
        totalScore,
        breakdown: { electricity: electricityScore, transport: transportScore, diet: dietScore },
      },
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
    let systemInstruction = `You are EcoTrace AI, a sustainability consultant.
    Your goal is to help users reduce their carbon footprint with facts.
    - Use bullet points (•).
    - Keep paragraphs short.
    - Use markdown for bolding.`;
    
    if (context && context.totalScore) {
      systemInstruction += `\n\nContext: Monthly Footprint ${context.totalScore.toFixed(2)} kg CO2.
      Energy: ${context.electricityScore.toFixed(2)} kg, Transport: ${context.transportScore.toFixed(2)} kg, Diet: ${context.dietScore.toFixed(2)} kg.`;
    }

    const stream = await ai.interactions.create({
      model: "gemini-2.0-flash",
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

