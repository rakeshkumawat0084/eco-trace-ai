import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import app from "./src/api";

dotenv.config();

const PORT = 3000;

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

