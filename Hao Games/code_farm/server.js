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

app.post("/api/bug-puzzle", async (req, res) => {
  try {
    const { flowerType = "A" } = req.body;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Generate one short beginner-friendly buggy JavaScript puzzle for a farming game.

Return JSON only with exactly these keys:
title, buggy, hint, fixCheck

Rules:
- The code should be 5 to 10 lines.
- Include exactly one bug.
- The bug should be beginner-friendly.
- Use one of these bug types:
  1. wrong comparison operator
  2. off-by-one loop condition
  3. wrong increment/decrement
- Theme it around flower type ${flowerType}.
- "fixCheck" should be a short string that I can test with text.includes(...).
- Return valid JSON only.
- Do not use markdown.
- Do not use code fences.
- Do not write \`\`\`json.`
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