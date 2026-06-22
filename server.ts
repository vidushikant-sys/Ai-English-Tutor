import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini client to avoid startup crashes if key is omitted initially
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `You are a friendly, elegant, and highly supportive humanoid AI English Tutor named Serena.
When the user speaks or types to you in English:
1. Analyze their input for spelling, grammar, vocabulary, and phrasing errors.
2. Formulate a short, warm, and highly engaging response in English (1 to 2 spoken sentences) that answers them naturally and keeps the context going. This will be spoken aloud, so keep it conversational and quick, without markdown symbols of any kind.
3. Be encouraging! Act like a cheerful, friendly human tutor who genuinely wants them to learn.
4. Correct grammar and vocabulary politely and suggest better/alternate phrasings.

Provide your response in JSON matching this exact structure:
{
  "speechText": "The direct, short, friendly verbal reply (to be read aloud). Example: 'Excellent start! Yes, you should say: I would like to go. What did you do today?' Keep it under 20-30 words, with no markdown, asterisks or bullet points.",
  "analysis": {
    "isCorrect": true/false indicator whether their input has room for correction/improvement,
    "corrections": "Polite explanation of any grammatical errors, or 'Perfect English!' if they were fully accurate.",
    "suggestions": "A cleaner, more natural, or advanced alternative way they can say their phrase.",
    "encouragement": "A warm phrase of motivation pushing them to keep trying!"
  }
}`;

// Conversation endpoint
app.post("/api/coach/respond", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Missing or invalid 'message' search in request body." });
      return;
    }

    const ai = getGeminiClient();

    // Construct history with appropriate turn structure
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((turn: any) => {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      });
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            speechText: {
              type: Type.STRING,
              description: "The direct verbal response to be spoken aloud. Clean text without markdown."
            },
            analysis: {
              type: Type.OBJECT,
              properties: {
                isCorrect: {
                  type: Type.BOOLEAN,
                  description: "True if the user's sentence was grammatically correct and fluent, false otherwise."
                },
                corrections: {
                  type: Type.STRING,
                  description: "Polite correction of mistakes or confirmation of beautiful phrasing."
                },
                suggestions: {
                  type: Type.STRING,
                  description: "Alternative natural/native pathways to state their thought."
                },
                encouragement: {
                  type: Type.STRING,
                  description: "Positive motivational boost."
                }
              },
              required: ["isCorrect", "corrections", "suggestions", "encouragement"]
            }
          },
          required: ["speechText", "analysis"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini.");
    }

    const data = JSON.parse(text);
    res.json(data);
  } catch (error: any) {
    console.error("Gemini Coach response error:", error);
    res.status(500).json({
      error: error.message || "An error occurred while generating the coaching response."
    });
  }
});

// Vite Dev Server / Static files
async function startServer() {
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
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
