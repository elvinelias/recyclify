// server.js
import express from "express";
import cors from "cors";
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Warn if missing key
if (!process.env.GOOGLE_API_KEY) {
  console.error("❌ Missing GOOGLE_API_KEY. Put it in .env and restart.");
}

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const MODEL_ID = "gemini-1.5-flash-latest"; // or "gemini-pro" if flash-latest fails

// ✅ MAIN CHAT ENDPOINT
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages[] required" });
  }
  if (!process.env.GOOGLE_API_KEY) {
    return res.status(500).json({ error: "Missing GOOGLE_API_KEY on server" });
  }

  try {
    const system =
      "You are Recyclify Assistant. Answer questions about recycling and how to use the site. Be concise and practical.";
    const conversation = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");
    const prompt = `${system}\n\n${conversation}\n\nASSISTANT:`;

    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400 },
    });

    const text =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.response?.text() ||
      "Sorry, I couldn't generate an answer.";

    return res.json({ answer: text });
  } catch (err) {
    console.error("Gemini call failed:", err?.message || err);
    console.error(
      "Troubleshoot: (1) internet access, (2) MODEL_ID supports your SDK, (3) GOOGLE_API_KEY valid, (4) key restrictions."
    );
    return res.json({
      answer:
        "⚠️ I couldn’t reach the Gemini service just now. Please try again in a minute. " +
        "Tip: network/firewall or invalid key can cause this.",
    });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`✅ API listening on http://localhost:${PORT}`);
});
