import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// flower mapping
const flowerMap = {
  A: "Tulip",
  B: "Daisy",
  C: "Crimson Rose",
  D: "Violet Star",
  E: "Emberblossom",
  F: "Moonflower",
};

app.post("/api/bug-puzzle", async (req, res) => {
  try {
    const { flowerType = "A" } = req.body;
    const flowerName = flowerMap[flowerType] || "Tulip";

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Generate one buggy JavaScript puzzle for a farming game.

Return JSON only with exactly these keys:
title, buggy, hint, fixCheck

The puzzle must follow a difficulty level based on flower type:

EASY (Tulip, Daisy):
- Code length: 4–7 lines
- Only 1 simple bug
- Bug types:
  - wrong comparison operator (== vs ===)
  - off-by-one loop error
  - missing increment/decrement
- Very obvious bug

MEDIUM (Crimson Rose, Violet Star):
- Code length: 6–10 lines
- 1–2 bugs
- Bug types:
  - incorrect loop condition
  - wrong variable used
  - misplaced return
  - logic mistake
- Requires careful reading

HARD (Emberblossom, Moonflower):
- Code length: 8–14 lines
- 2–3 bugs
- Bug types:
  - nested loop mistake
  - wrong variable scope
  - incorrect condition logic
  - subtle logic errors
- Not immediately obvious

Rules:
- Theme the code around flower type ${flowerName}
- The bug must be fixable by editing the code
- "fixCheck" must be a short string that can be checked using text.includes(...)
- Return valid JSON only
- Do NOT include markdown
- Do NOT use code fences
`
        }
      ]
    });

    const text = response.content[0].text.trim();

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    console.log("RAW CLAUDE RESPONSE:", text);
    console.log("CLEANED RESPONSE:", cleaned);

    const puzzle = JSON.parse(cleaned);

    res.json(puzzle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate puzzle" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});