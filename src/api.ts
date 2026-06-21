import express from "express";
import rateLimit from "express-rate-limit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateCarbonFootprint } from "./lib/calculations";

const app = express();

// High-Performance Security & Production Logging Layer
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    const timestamp = new Date().toISOString();
    console.log(`[PRODUCTION LOG - ${timestamp}] ${req.method} request initiated on path: ${req.url}`);
    next();
});

// Production rate limiter to prevent potential API abuse vectors
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Security Alert: Too many requests from this IP. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.set("trust proxy", 1);
app.use("/api/", limiter);
app.use(express.json());

// Access API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Secure input validation middleware to ensure High-Fidelity processing
function validateMetrics(req: express.Request, res: express.Response, next: express.NextFunction) {
  const metrics = req.body;
  
  if (!metrics || Object.keys(metrics).length === 0) {
      return res.status(400).json({ error: "Missing environmental payload metrics structure." });
  }
  
  const electricity = parseFloat(metrics.electricity);
  const transport = parseFloat(metrics.distance);
  
  // Strict non-negative check
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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(500).json({ error: "API key is missing. Please add GEMINI_API_KEY to your secrets." });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    // Robust safety fallback for breakdown data
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
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: system_instruction,
    });
    
    const result = await model.generateContentStream(message);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(chunkText);
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

export default app;
