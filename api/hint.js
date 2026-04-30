// Vercel serverless function — proxies Claude API hint requests for Adrian's 8-Bit Circuit game.
// The API key lives server-side only (process.env.ADRIAN), never in the browser bundle.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { context } = req.body;
  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         process.env.ADRIAN,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are a friendly circuit tutor in an educational game for students.
The student is learning circuit theory through drag and drop puzzles.

For hints:
NEVER give the direct answer.
Ask guiding questions instead.
Keep responses under 2 sentences.
Be encouraging and positive.

For performance reviews:
Give a 2 sentence personalized study recommendation.
Be specific about what to study.
Be encouraging and mention their strengths.`,
        messages: [{ role: 'user', content: context }],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('[hint] upstream error', upstream.status, body);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data = await upstream.json();
    res.status(200).json({ hint: data?.content?.[0]?.text?.trim() ?? null });
  } catch (err) {
    console.error('[hint] fetch failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
