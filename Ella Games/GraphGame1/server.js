require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

let lastCallTime = 0;
const MIN_INTERVAL_MS = 1500;

app.post('/api/generate-function', async (req, res) => {
  const now = Date.now();
  if (now - lastCallTime < MIN_INTERVAL_MS) {
    return res.status(429).json({ error: 'too many requests, slow down' });
  }
  lastCallTime = now;

  try {
    const { difficulty, selectedTypes, weakCategories, recentFunctions } = req.body;
    const prompt = buildPrompt(difficulty || 'novice', selectedTypes, weakCategories, recentFunctions);

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = message.content[0].text.trim();
    const data = JSON.parse(raw);

    if (!data.expression || typeof data.expression !== 'string') {
      throw new Error('response missing expression field');
    }

    res.json({
      expression: data.expression,
      category: data.category || 'unknown',
      hint: data.hint || ''
    });
  } catch (err) {
    console.error('generate-function error:', err.message);
    res.status(500).json({ error: 'failed to generate function' });
  }
});

function buildPrompt(difficulty, selectedTypes, weakCategories, recentFunctions) {
  let prompt = `You are part of a graphing game that teaches students to visually recognize function shapes. Generate one function for the student to identify.

Difficulty: ${difficulty}
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
Function types and examples (valid mathjs syntax):

linear:      x, 2*x, -x, x+3, -2*x+1, 0.5*x
  identity is a subset of linear: f(x) = x

polynomial:  x^2, -x^2+3, x^3, x^3-3*x, 2*x^2, x^4-2
  includes quadratic and cubic

rational:    1/x, -1/x, 1/x^2, x/(x^2+1), (x-1)/(x+1)

absolute:    abs(x), abs(x)-2, -abs(x)+3, abs(x-1), 2*abs(x)

exponential: exp(x/2), exp(-x), 2^x, exp(x)-1, 3^x

sine:        sin(x), sin(2*x), 2*sin(x), sin(x)+1, sin(x-1)

cosine:      cos(x), cos(2*x), -cos(x), cos(x)+1, 2*cos(x)

signum:      sign(x), 2*sign(x), sign(x)+1, sign(x-1), -sign(x)


Rules:
1. expression must be valid mathjs syntax (use * for multiply, abs() not |x|, exp() or e^x, sign() for signum)
2. make the shape visually distinct so a student can recognize it by looking, not by calculating
3. use simple whole-number coefficients, nothing obscure
4. the hint should describe the visual shape in a few words without naming the function type, and be more descriptive when the skill level is lower
5. When the skill level increases, increase the difficuly of the functions that need to be matched, but not incresing past y-intercepts of 6.

Respond with ONLY this JSON, no other text:
{"expression": "...", "category": "linear|polynomial|rational|absolute|exponential|sine|cosine|signum", "hint": "short visual description"}`;

  return prompt;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`game running on http://localhost:${PORT}`);
});
