require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// very light rate limiting across all AI endpoints
let lastCallTime = 0;
const MIN_INTERVAL_MS = 800;

function throttle(res) {
  const now = Date.now();
  if (now - lastCallTime < MIN_INTERVAL_MS) {
    res.status(429).json({ error: 'too many requests, slow down' });
    return false;
  }
  lastCallTime = now;
  return true;
}


app.post('/api/generate-function', async (req, res) => {
  if (!throttle(res)) return;

  try {
    const { difficulty, selectedTypes, weakCategories, recentFunctions } = req.body;
    const prompt = buildFunctionPrompt(difficulty || 'novice', selectedTypes, weakCategories, recentFunctions);

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = message.content[0].text.trim();
    const data = JSON.parse(extractJson(raw));

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


app.post('/api/generate-hint', async (req, res) => {
  if (!throttle(res)) return;

  try {
    const { target, guesses = [], skill = 'novice', attempt = 2, previousHint = '' } = req.body;
    const prompt = buildHintPrompt(target, guesses, skill, attempt, previousHint);

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = message.content[0].text.trim();
    let hint = raw;
    try {
      const maybe = JSON.parse(extractJson(raw));
      if (maybe && maybe.hint) hint = maybe.hint;
    } catch {}
    hint = cleanHint(hint);

    res.json({ hint });
  } catch (err) {
    console.error('generate-hint error:', err.message);
    res.status(500).json({ error: 'failed to generate hint' });
  }
});


app.post('/api/game-analysis', async (req, res) => {
  if (!throttle(res)) return;

  try {
    const stats = req.body || {};
    const prompt = buildAnalysisPrompt(stats);

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = message.content[0].text.trim();
    let analysis = raw;
    try {
      const maybe = JSON.parse(extractJson(raw));
      if (maybe && maybe.analysis) analysis = maybe.analysis;
    } catch {}

    res.json({ analysis });
  } catch (err) {
    console.error('game-analysis error:', err.message);
    res.status(500).json({ error: 'failed to generate analysis' });
  }
});

// Prompting
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

function buildHintPrompt(target, guesses, skill, attempt, previousHint) {
  const guessList = (guesses && guesses.length > 0) ? guesses.join(', ') : '(none yet)';

  // Hints lean more obvious at lower skill levels
  const obviousness = {
    novice:     'Be quite direct. Point to a concrete piece of the formula (e.g. "try a coefficient in front" or "try raising x to a higher power"), but do NOT write the full answer.',
    apprentice: 'Be clear. Hint at the next missing component based on what the student has tried, without giving the answer.',
    skilled:    'Be subtle. Nudge toward what is missing but stay indirect.',
    expert:     'Be brief and subtle. One short observation only.'
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

function buildAnalysisPrompt(stats) {
  const {
    finalScore = 0, skillLevel = 'novice', skillScore = 0,
    selectedTypes = [], byCategory = {}, perfLog = {},
    totalGraphs = 0, solved = 0, solvedFirstTry = 0, revealed = 0
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

// helper makes sure to pluck a JSON object out of noisy model response
function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

function cleanHint(s) {
  if (!s) return '';
  s = String(s).trim();
  // strip surrounding quotes if present
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s.length > 220 ? s.slice(0, 220) + '…' : s;
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`game running on http://localhost:${PORT}`);
});
