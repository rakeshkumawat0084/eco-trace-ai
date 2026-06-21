import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return res.status(200).send("EcoTrace AI: GEMINI_API_KEY is missing. Please configure it in your environment settings to enable AI audits.");
    }

    // Lazy initialization of the Gemini client within the request handler
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Use the modern SDK pattern with the recommended gemini-3.5-flash model
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction: "You are EcoTrace AI, the premier carbon emissions consultant. Analyze the user's footprint data carefully and provide structured, actionable advice targeting their highest carbon emitter source. Respond using clean markdown formatting with bold key terms. Be authoritative yet encouraging."
      }
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (error: any) {
    console.error('[API CHAT ERROR]:', error);
    const statusCode = error.status || 500;
    if (!res.headersSent) {
      res.status(statusCode).send(`AI Error: ${error.message}`);
    }
  }
}
