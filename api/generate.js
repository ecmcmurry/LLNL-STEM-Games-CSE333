// Vercel serverless function — generates a personalised circuit level for Adrian's 8-Bit Circuit game.
// Called by generateWeakLevel() when a student needs targeted practice on their weakest topic.
// Uses process.env.ADRIAN — never exposed to the browser.

// Board templates: map number of drop zones → existing board image + drop zone positions.
// These match the pre-drawn circuit board images already in /assets/.
const BOARD_TEMPLATES = {
  1: {
    boardImg: 'assets/CircuitBoard_blank1.1.png',
    dropZones: [{ top: '49.4%', left: '60.5%' }],
  },
  2: {
    boardImg: 'assets/CircuitBoard_level3.png',
    dropZones: [
      { top: '60%',  left: '38.26%' },
      { top: '27.2%', left: '38.26%' },
    ],
  },
  3: {
    boardImg: 'assets/CircuitBoard_level5.png',
    dropZones: [
      { top: '60%', left: '38.26%' },
      { top: '38%', left: '38.26%' },
      { top: '16%', left: '38.26%' },
    ],
  },
};

// Component image paths available for resistors and batteries.
const COMPONENT_IMGS = {
  resistor: 'assets/horizontal-resistor-actual.png',
  battery:  'assets/Horizontal-Battery.png',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { category, categoryName, correct, incorrect, accuracy } = req.body;
  if (!category || !categoryName) {
    return res.status(400).json({ error: 'Missing category or categoryName' });
  }

  // Build a prompt that asks Claude to output only a JSON level object.
  const prompt = `You are generating a circuit puzzle level for an educational game.

Student stats for "${categoryName}":
- Correct answers: ${correct ?? 0}
- Incorrect answers: ${incorrect ?? 0}
- Accuracy: ${accuracy ?? 0}%

Generate ONE circuit puzzle level for the category "${category}".
Rules:
- category must be exactly: "${category}"
- goalType must be one of: "current", "voltage", "series", "parallel" — pick one that fits the category
- For ohmsLaw: use goalType "current" or "voltage"
- For resistor: use goalType "series" or "parallel"
- For complexLevel: use goalType "current" or "voltage" with a more complex circuit
- dropZoneCount must be 1, 2, or 3 (how many components the student needs to place)
- components is an array of 3–4 objects with type ("resistor" or "battery"), a label like "4Ω" or "9V", and a numeric value
- exactly ONE component in the array should be the correct answer to place; others are distractors
- goal is the numeric answer the student needs to reach
- Answer is the same numeric value as goal
- hint is the relevant formula as a short string, e.g. "Ohm's Law: I = V / R"
- voltage, resistance, fixedCurrent are numeric values or null

Respond with ONLY a valid JSON object — no markdown, no explanation:
{
  "category": "...",
  "goalType": "...",
  "voltage": <number or null>,
  "resistance": <number or null>,
  "fixedCurrent": <number or null>,
  "goal": <number>,
  "Answer": <number>,
  "hint": "...",
  "dropZoneCount": <1|2|3>,
  "components": [
    {"type": "resistor"|"battery", "label": "...", "value": <number>},
    ...
  ]
}`;

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
        max_tokens: 512,
        system: 'You are a JSON API. Output only valid JSON, no markdown, no explanation.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('[generate] upstream error', upstream.status, body);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data   = await upstream.json();
    const raw    = data?.content?.[0]?.text?.trim() ?? '';

    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed  = JSON.parse(cleaned);

    // Attach board template and component images — Claude only picks the count/types
    const template = BOARD_TEMPLATES[parsed.dropZoneCount] ?? BOARD_TEMPLATES[1];
    const level = {
      category:     parsed.category     ?? category,
      level:        0,                   // dynamically generated, no fixed number
      voltage:      parsed.voltage       ?? null,
      resistance:   parsed.resistance    ?? null,
      fixedCurrent: parsed.fixedCurrent  ?? null,
      goal:         parsed.goal,
      goalType:     parsed.goalType,
      hint:         parsed.hint,
      boardImg:     template.boardImg,
      dropZones:    template.dropZones,
      Answer:       parsed.Answer ?? parsed.goal,
      components:   (parsed.components ?? []).map(c => ({
        type:  c.type,
        label: c.label,
        img:   COMPONENT_IMGS[c.type] ?? COMPONENT_IMGS.resistor,
        value: c.value,
      })),
    };

    res.status(200).json({ level });
  } catch (err) {
    console.error('[generate] failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
