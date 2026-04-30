// Vercel serverless function — proxies Claude API requests server-side
// so the key is never exposed in the browser bundle and CORS is not an issue.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { system, userMessage } = req.body;

  if (!system || !userMessage) {
    res.status(400).json({ error: 'Missing system or userMessage' });
    return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('[report] upstream error', upstream.status, body);
      res.status(upstream.status).json({ error: 'Upstream API error' });
      return;
    }

    const data = await upstream.json();
    const text = data?.content?.[0]?.text?.trim() ?? null;
    res.status(200).json({ text });
  } catch (err) {
    console.error('[report] fetch failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
