import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI client lazily (fails gracefully if key is missing)
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined.");
  }
  return new GoogleGenAI({ apiKey });
};

// API: Check config availability
app.get("/api/config", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    veoEnabled: hasKey,
    message: hasKey
      ? "Veo Cinema Studio is fully loaded and ready."
      : "Veo API key not detected. Operating in High-Fidelity Local Simulation mode.",
  });
});

// API Step 1: Start video generation
app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
       res.status(400).json({ error: "Prompt is required." });
       return;
    }

    const ai = getAiClient();
    console.log(`[Veo] Starting video generation with prompt: "${prompt}"`);

    const operation = await ai.models.generateVideos({
      model: "veo-3.1-lite-generate-preview",
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio: "16:9",
      },
    });

    console.log(`[Veo] Generation operation started. Name: ${operation.name}`);
    res.json({ operationName: operation.name });
  } catch (error: any) {
    console.error("[Veo] Generation error:", error);
    res.status(500).json({
      error: error.message || "Failed to initiate video generation.",
    });
  }
});

// API Step 2: Poll operation status
app.post("/api/video-status", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
       res.status(400).json({ error: "operationName is required." });
       return;
    }

    const ai = getAiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({
      done: updated.done || false,
      error: updated.error || null,
    });
  } catch (error: any) {
    console.error("[Veo] Status polling error:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch video generation status.",
    });
  }
});

// API Step 3: Stream generated video back to client
app.post("/api/video-download", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
       res.status(400).json({ error: "operationName is required." });
       return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not defined." });
      return;
    }

    const ai = getAiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
       res.status(404).json({ error: "Video URI not found on completed operation." });
       return;
    }

    console.log(`[Veo] Downloading generated video from: ${uri}`);
    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": apiKey },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to fetch video binary. Status: ${videoRes.status}`);
    }

    res.setHeader("Content-Type", "video/mp4");
    if (videoRes.body) {
      Readable.fromWeb(videoRes.body as any).pipe(res);
    } else {
      res.status(500).json({ error: "Response body stream is empty." });
    }
  } catch (error: any) {
    console.error("[Veo] Download streaming error:", error);
    res.status(500).json({
      error: error.message || "Failed to download and stream video.",
    });
  }
});

// Vite server middleware integration
async function main() {
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
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
});
