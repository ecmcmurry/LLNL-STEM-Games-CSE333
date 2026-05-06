// Vercel serverless function — proxies Claude API requests for Hao's code_farm game.
// API key lives server-side only (process.env.HAO_API_KEY), never in the browser bundle.

const flowerMap = {
  A: "Tulip",
  B: "Daisy",
  C: "Crimson Rose",
  D: "Violet Star",
  E: "Emberblossom",
  F: "Moonflower",
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { flowerType = 'A' } = req.body || {};
  const flowerName = flowerMap[flowerType] || 'Tulip';

  const prompt = `Generate one buggy JavaScript puzzle for a farming game.

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
- Do NOT use code fences`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         process.env.HAO_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('[bug-puzzle] upstream error', upstream.status, body);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data = await upstream.json();
    const raw = data?.content?.[0]?.text?.trim() ?? '';
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const puzzle = JSON.parse(cleaned);
    res.status(200).json(puzzle);
  } catch (err) {
    console.error('[bug-puzzle] error', err);
    res.status(500).json({ error: 'Failed to generate puzzle' });
  }
}
