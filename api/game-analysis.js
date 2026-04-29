// Vercel serverless function — generates end-of-game analysis for Ella's GraphGame1.
// API key lives server-side only (process.env.ELLA), never in the browser bundle.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stats  = req.body || {};
  const prompt = buildAnalysisPrompt(stats);

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         process.env.ELLA,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('[game-analysis] upstream error', upstream.status, body);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data = await upstream.json();
    const raw  = data?.content?.[0]?.text?.trim() ?? '';
    let analysis = raw;
    try {
      const maybe = JSON.parse(extractJson(raw));
      if (maybe && maybe.analysis) analysis = maybe.analysis;
    } catch {}

    res.status(200).json({ analysis });
  } catch (err) {
    console.error('[game-analysis] failed', err);
    res.status(500).json({ error: 'Failed to generate analysis' });
  }
}

function buildAnalysisPrompt(stats) {
  const {
    finalScore = 0, skillLevel = 'novice', skillScore = 0,
    selectedTypes = [], byCategory = {},
    totalGraphs = 0, solved = 0, solvedFirstTry = 0, revealed = 0,
  } = stats;

  const catLines = Object.entries(byCategory)
    .filter(([, v]) => v && v.seen > 0)
    .map(([k, v]) => `  ${k}: seen=${v.seen}, solved=${v.solved}, firstTry=${v.firstTry || 0}, reveals=${v.reveals || 0}, avgSec=${(v.totalTimeSec / Math.max(1, v.seen)).toFixed(1)}`)
    .join('\n') || '  (no category data)';

  return `You are a friendly math coach. Write a 120-180 words review of the player's game.

Game summary:
- Final score: ${finalScore}
- Final skill: ${skillLevel} (internal score ${skillScore.toFixed(1)})
- Graphs shown: ${totalGraphs}; solved: ${solved}; first-try: ${solvedFirstTry}; answers revealed: ${revealed}
- Function types active in settings: ${selectedTypes.join(', ') || '(none)'}

Per-category stats:
${catLines}

In your review, cover:
1. How many questions were answered overall.
2. Which function TYPES the player did BEST at and which they struggled with (only name types with at least 1 data point).
3. Concrete suggestions for what to practice next.
4. A recommendation on which function types to KEEP or REMOVE from Settings based on performance (only recommend removing types they clearly struggled with, and only temporarily).
5. End with one short encouraging sentence.

Write in plain paragraphs with no JSON, no bullet lists, no markdown headers. Direct second-person voice ("you").

Respond with ONLY this JSON, no other text:
{"analysis": "your review here"}`;
}

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}
