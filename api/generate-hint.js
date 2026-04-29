// Vercel serverless function — generates a personalized hint for Ella's GraphGame1.
// API key lives server-side only (process.env.ELLA), never in the browser bundle.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { target, guesses = [], skill = 'novice', attempt = 2, previousHint = '' } = req.body;

  if (!target) {
    return res.status(400).json({ error: 'Missing target' });
  }

  const prompt = buildHintPrompt(target, guesses, skill, attempt, previousHint);

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
        max_tokens: 150,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('[generate-hint] upstream error', upstream.status, body);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data = await upstream.json();
    const raw  = data?.content?.[0]?.text?.trim() ?? '';
    let hint = raw;
    try {
      const maybe = JSON.parse(extractJson(raw));
      if (maybe && maybe.hint) hint = maybe.hint;
    } catch {}
    hint = cleanHint(hint);

    res.status(200).json({ hint });
  } catch (err) {
    console.error('[generate-hint] failed', err);
    res.status(500).json({ error: 'Failed to generate hint' });
  }
}

function buildHintPrompt(target, guesses, skill, attempt, previousHint) {
  const guessList = guesses.length > 0 ? guesses.join(', ') : '(none yet)';

  const obviousness = {
    novice:     'Be quite direct. Point to a concrete piece of the formula (e.g. "try a coefficient in front" or "try raising x to a higher power"), but do NOT write the full answer.',
    apprentice: 'Be clear. Hint at the next missing component based on what the student has tried, without giving the answer.',
    skilled:    'Be subtle. Nudge toward what is missing but stay indirect.',
    expert:     'Be brief and subtle. One short observation only.',
  };

  return `You are a math tutor in a graphing game. The student is trying to match a function shown on a graph.

Target (hidden from student): ${target}
Skill level: ${skill}
Attempt number: ${attempt}
Previous guesses (in order): ${guessList}
Previous hint you gave (if any): ${previousHint || '(none)'}

Your job: give ONE short hint (max ~18 words) that gently corrects the most recent guess toward the target. Use the progression of their guesses - if they went from "x" to "x^3" and the target is "2*x^3", nudge them toward the coefficient of 2. Do NOT repeat the previous hint verbatim; build on it.

${obviousness[skill] || obviousness.apprentice}

Rules:
- Never write the full target formula.
- Never name the function category ("it's a polynomial", etc.).
- Focus on one specific next step: coefficient, sign, exponent, shift, period, amplitude, asymptote.
- Keep it encouraging but direct.

Respond with ONLY this JSON, no other text:
{"hint": "..."}`;
}

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

function cleanHint(s) {
  if (!s) return '';
  s = String(s).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s.length > 220 ? s.slice(0, 220) + '…' : s;
}
