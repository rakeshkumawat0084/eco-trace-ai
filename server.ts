import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

export default app;

async function startServer() {
  app.use(express.json());

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
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

  app.post("/api/calculate", (req, res) => {
    const { electricity, distance, fuelType, dietType, distanceUnit, localSourced } = req.body;

    try {
      const electricityScore = (parseFloat(electricity) || 0) * ELECTRICITY_FACTOR;
      
      let dist = parseFloat(distance) || 0;
      if (distanceUnit === "mi") {
        dist = dist * 1.60934; // Convert miles to km for base calculation
      }
      
      const transportScore = dist * (TRANSPORT_FACTORS[fuelType] || 0.17) * 4.33;
      
      // Granular Dietary logic: Base diet score adjusted by sourcing preference
      // We assume locally sourced food reduces the dietary emissions by up to 15% 
      // compared to standard imported heavy diets.
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
          breakdown: {
            electricity: electricityScore,
            transport: transportScore,
            diet: dietScore,
          },
        },
      });
    } catch (error) {
      res.status(400).json({ success: false, error: "Invalid input data" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { message, context, history } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured." });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      let systemInstruction = `You are EcoTrace AI, a friendly and expert sustainability consultant. 
      Your goal is to help users understand and reduce their carbon footprint with actual, real-world facts and data.
      
      CRITICAL FORMATTING RULES:
      - Use bullet points (•) for lists and steps.
      - Keep paragraphs short (maximum 3 sentences).
      - Avoid long theoretical introductions; get straight to the facts.
      - Use markdown for bolding key terms.
      - If giving advice, make it actionable and specific.
      - Always respond in a structured, easy-to-read way.`;
      
      if (context && context.totalScore) {
        systemInstruction += `\n\nSpecifically, the user has a monthly carbon footprint of ${context.totalScore.toFixed(2)} kg CO2.
        Breakdown:
        - Energy: ${context.electricityScore.toFixed(2)} kg CO2
        - Transport: ${context.transportScore.toFixed(2)} kg CO2
        - Diet: ${context.dietScore.toFixed(2)} kg CO2 (with ${context.dietarySourcing}% local sourcing preference)
        
        The user has refined their 'Dietary Habits' with granular options: they source ${context.dietarySourcing}% of their food locally versus importing. 
        If their local sourcing is low (e.g., <30%), advise on the high carbon cost of global food logistics (air freight, shipping).
        If high (e.g., >70%), congratulate them on reducing their 'food miles'.`;
      } else {
        systemInstruction += `\n\nThe user hasn't calculated their footprint yet. Encourage them to use the calculator on the left while answering their general questions about sustainability and eco-friendly living.`;
      }

      const contents = history || [];
      const streamingResult = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: [...contents, { role: "user", parts: [{ text: message }] }],
        config: {
          systemInstruction,
        }
      });

      for await (const chunk of streamingResult) {
        const chunkText = chunk.text;
        res.write(chunkText);
      }

      res.end();
    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      const errorMessage = error.message || "Unknown Gemini Error";
      
      // If we haven't started streaming yet, we can send a 500
      if (!res.headersSent) {
          res.status(500).json({ error: `Failed to communicate with AI agent: ${errorMessage}` });
      } else {
          // If we are already streaming, we can't change status, just end
          res.write(`\n\n[Error: ${errorMessage}]`);
          res.end();
      }
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}

