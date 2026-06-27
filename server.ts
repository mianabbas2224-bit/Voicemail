import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DATA_DIR = path.join(process.cwd(), "data");
const VOICEMAILS_FILE = path.join(DATA_DIR, "voicemails.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read voicemails metadata
const readVoicemailsMetadata = (): any[] => {
  if (!fs.existsSync(VOICEMAILS_FILE)) {
    return [];
  }
  try {
    const content = fs.readFileSync(VOICEMAILS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading voicemails file:", err);
    return [];
  }
};

// Helper to write voicemails metadata
const writeVoicemailsMetadata = (data: any[]) => {
  try {
    fs.writeFileSync(VOICEMAILS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing voicemails file:", err);
  }
};

// GET list of voicemails
app.get("/api/voicemails", (req, res) => {
  const list = readVoicemailsMetadata();
  res.json(list);
});

// POST a new voicemail
app.post("/api/voicemails", (req, res) => {
  try {
    const { id, senderName, chapter, title, dateString, duration, noteText, timestamp, audioBase64, activeProfileId } = req.body;
    
    if (!id || !senderName || !audioBase64) {
      res.status(400).json({ error: "id, senderName, and audioBase64 are required." });
      return;
    }

    // 1. Save audio binary to disk
    const audioPath = path.join(DATA_DIR, `audio_${id}.webm`);
    const audioBuffer = Buffer.from(audioBase64, "base64");
    fs.writeFileSync(audioPath, audioBuffer);

    // 2. Save metadata (excluding audioBase64)
    const list = readVoicemailsMetadata();
    const newLetter = {
      id,
      senderName,
      chapter: chapter || undefined,
      category: 'Today',
      title: title || 'A new recording',
      dateString,
      duration,
      noteText,
      timestamp: timestamp || Date.now(),
      isFavorite: false,
      isArchived: false,
      listenedBy: [activeProfileId || ""].filter(Boolean),
      reactions: [],
    };
    
    list.unshift(newLetter);
    writeVoicemailsMetadata(list);

    console.log(`[Voicemails] Added new voicemail ${id} from ${senderName}`);
    res.json({ success: true, voicemail: newLetter });
  } catch (err: any) {
    console.error("Error creating voicemail:", err);
    res.status(500).json({ error: err.message || "Failed to save voicemail." });
  }
});

// GET audio stream for a voicemail
app.get("/api/voicemails/:id/audio", (req, res) => {
  try {
    const { id } = req.params;
    const audioPath = path.join(DATA_DIR, `audio_${id}.webm`);
    
    if (!fs.existsSync(audioPath)) {
      res.status(404).json({ error: "Audio recording not found." });
      return;
    }

    res.setHeader("Content-Type", "audio/webm");
    const stream = fs.createReadStream(audioPath);
    stream.pipe(res);
  } catch (err: any) {
    console.error("Error streaming audio:", err);
    res.status(500).json({ error: err.message || "Failed to stream audio." });
  }
});

// POST update a voicemail's properties (reactions, favorite, archive, listenedBy)
app.post("/api/voicemails/:id/update", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const list = readVoicemailsMetadata();
    const index = list.findIndex((item) => item.id === id);
    
    if (index === -1) {
      res.status(404).json({ error: "Voicemail not found." });
      return;
    }

    list[index] = {
      ...list[index],
      ...updates
    };
    
    writeVoicemailsMetadata(list);
    res.json({ success: true, voicemail: list[index] });
  } catch (err: any) {
    console.error("Error updating voicemail:", err);
    res.status(500).json({ error: err.message || "Failed to update voicemail." });
  }
});

// DELETE a voicemail
app.delete("/api/voicemails/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    const audioPath = path.join(DATA_DIR, `audio_${id}.webm`);
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    const list = readVoicemailsMetadata();
    const filtered = list.filter((item) => item.id !== id);
    writeVoicemailsMetadata(filtered);

    console.log(`[Voicemails] Deleted voicemail ${id}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting voicemail:", err);
    res.status(500).json({ error: err.message || "Failed to delete voicemail." });
  }
});

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
