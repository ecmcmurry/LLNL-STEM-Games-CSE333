// Vercel serverless function — generates a math function for Ella's GraphGame1.
// API key lives server-side only (process.env.ELLA), never in the browser bundle.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { difficulty, selectedTypes, weakCategories, recentFunctions } = req.body;

  const prompt = buildFunctionPrompt(difficulty || 'novice', selectedTypes, weakCategories, recentFunctions);

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
        max_tokens: 200,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('[generate-function] upstream error', upstream.status, body);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data = await upstream.json();
    const raw  = data?.content?.[0]?.text?.trim() ?? '';
    const parsed = JSON.parse(extractJson(raw));

    if (!parsed.expression || typeof parsed.expression !== 'string') {
      throw new Error('response missing expression field');
    }

    res.status(200).json({
      expression: parsed.expression,
      category:   parsed.category || 'unknown',
      hint:       parsed.hint || '',
    });
  } catch (err) {
    console.error('[generate-function] failed', err);
    res.status(500).json({ error: 'Failed to generate function' });
  }
}

function buildFunctionPrompt(difficulty, selectedTypes, weakCategories, recentFunctions) {
  let prompt = `You are part of a graphing game that teaches students to visually recognize function shapes. Generate one function for the student to identify.

Difficulty: ${difficulty}

Difficulty scaling rules:
- novice:      simple shapes, coefficients in {-2..2}, minimal shifts. ex: x, x^2, sin(x), abs(x)
- apprentice:  one transformation or one non-unit coefficient. ex: 2*x+1, -x^2+3, sin(2*x), abs(x-1)
- skilled:     up to two transformations, cubic or combined coefficients. ex: 2*x^3, -x^3+2*x, 2*sin(x)+1, 1/x^2
- expert:      compound/harder shapes, still human-recognizable. ex: x^3 - 3*x, x/(x^2+1), 3^x - 1, 2*abs(x-1)

Absolute hard limits (across ALL difficulties):
- the x and y intercept must be less than 6
- coefficients must be small whole numbers (or simple halves like 0.5)
- shape must still be visually distinct
`;

  if (selectedTypes && selectedTypes.length > 0) {
    prompt += `\nThe student selected ONLY these types: ${selectedTypes.join(', ')}. Do not generate anything outside these types.\n`;
  }
  if (weakCategories && weakCategories.length > 0) {
    prompt += `\nThe student is weaker in: ${weakCategories.join(', ')}. Lean toward those.\n`;
  }
  if (recentFunctions && recentFunctions.length > 0) {
    prompt += `\nRecently used (avoid repeats): ${recentFunctions.join(', ')}\n`;
  }

  prompt += `
Valid mathjs examples per type:

linear:      x, 2*x, -x, x+3, -2*x+1, 0.5*x
polynomial:  x^2, -x^2+3, x^3, x^3-3*x, 2*x^2, 2*x^3
rational:    1/x, -1/x, 1/x^2, x/(x^2+1), (x-1)/(x+1)
absolute:    abs(x), abs(x)-2, -abs(x)+3, abs(x-1), 2*abs(x)
exponential: exp(x/2), exp(-x), 2^x, exp(x)-1, 3^x
sine:        sin(x), sin(2*x), 2*sin(x), sin(x)+1, sin(x-1)
cosine:      cos(x), cos(2*x), -cos(x), cos(x)+1, 2*cos(x)
signum:      sign(x), 2*sign(x), sign(x)+1, sign(x-1), -sign(x)

Rules:
1. expression MUST be valid mathjs syntax (use * for multiply, abs() not |x|, exp() or e^x, sign() for signum)
2. shape must be visually distinct - students recognize by LOOK, not calculation
3. the "hint" is a short visual description, more descriptive at lower skill levels
4. the hint must NOT name the function type or give the formula
5. respect the difficulty scaling rules above

Respond with ONLY this JSON, no other text:
{"expression": "...", "category": "linear|polynomial|rational|absolute|exponential|sine|cosine|signum", "hint": "short visual description"}`;

  return prompt;
}

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}
