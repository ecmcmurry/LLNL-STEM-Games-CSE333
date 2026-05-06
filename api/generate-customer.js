// Vercel serverless function — generates AI customers for Forge & Fortune.
// API key lives server-side only (process.env.ELLA), never in the browser bundle.

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

function buildCustomerPrompt(day, recentPersonas, reputation) {
  return `You are a generator for an educational engineering game called "Forge & Fortune". Create ONE unique customer who walks into a small custom-fabrication shop with a part order.

Player day: ${day}
Player reputation: ${reputation} / 100
Recently used personas (avoid repeating): ${recentPersonas.join(', ') || '(none)'}

The shop's catalog has 5 materials:
- AISI 1020 Mild Steel (yield 210 MPa, density 7.85, ductility 0.25, thermal limit 420 C, cost $8/mm) — cheap workhorse
- 316L Stainless Steel (yield 290, density 8.0, ductility 0.4, thermal 800, $30/mm) — corrosion / heat
- Aluminum 6061-T6 (yield 276, density 2.71, ductility 0.12, thermal 170, $22/mm) — light all-rounder
- Ti-6Al-4V (yield 880, density 4.43, ductility 0.14, thermal 315, $95/mm) — premium strength-to-weight
- CFRP (yield 600, density 1.6, ductility 0.015, thermal 250, $180/mm) — brittle, ultralight

Final part stats are computed as:
  strength_MPa = yield * yieldMultiplier * thickness_mm
  weight = density * thickness   (g per cm^2 of plate)
  cost = cost_per_mm * thickness
  ductility = base ductility * heat-treatment multiplier
  thermal = material thermal limit

Constraints you may set (ALL OPTIONAL — pick 2-4 that make engineering sense for the part):
  minStrength (MPa, 200-3500)
  maxWeight   (g/cm^2, 3-30)
  maxCost     ($, 60-1500)
  minDuctility (0.05-0.4)
  minThermal  (C, 150-900)

Make the persona, backstory, and use-case feel real and specific. Vary industries (aerospace, biomedical, marine, automotive, civil, art, robotics, jewelry, energy, sport, etc). Higher reputation can attract harder / more lucrative jobs.

Respond with ONLY this JSON, no other text:
{
  "customerName": "Job title or short persona name (≤ 30 chars)",
  "emoji": "ONE emoji that fits",
  "type": "industry tag (one word)",
  "text": "First-person ask, 2-3 sentences, conversational. Mention WHY constraints matter for THEIR use-case.",
  "hint": "One short engineering hint (≤ 20 words). Do NOT name a specific material.",
  "constraints": { "minStrength": 0, "maxWeight": 0, "maxCost": 0, "minDuctility": 0, "minThermal": 0 },
  "reward": 120
}

Only INCLUDE keys in "constraints" you actually want enforced — omit the others entirely. "reward" is the dollar payout on success: 80-300, scale with difficulty.`;
}

function sanitizeCustomer(raw) {
  const c = {};
  c.customerName = String(raw.customerName || 'Anonymous Client').slice(0, 60);
  c.emoji = String(raw.emoji || '👤').slice(0, 4);
  c.type = String(raw.type || 'general').slice(0, 24);
  c.text = String(raw.text || '').slice(0, 600);
  c.hint = String(raw.hint || '').slice(0, 200);
  c.reward = Math.max(60, Math.min(400, Math.round(Number(raw.reward) || 120)));

  const incoming = raw.constraints || {};
  const out = {};
  const num = (v, lo, hi) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.max(lo, Math.min(hi, n));
  };
  if (incoming.minStrength  != null) { const v = num(incoming.minStrength, 100, 4000);  if (v) out.minStrength  = v; }
  if (incoming.maxWeight    != null) { const v = num(incoming.maxWeight, 1, 60);         if (v) out.maxWeight    = v; }
  if (incoming.maxCost      != null) { const v = num(incoming.maxCost, 50, 2000);        if (v) out.maxCost      = v; }
  if (incoming.minDuctility != null) { const v = num(incoming.minDuctility, 0.01, 0.5);  if (v) out.minDuctility = v; }
  if (incoming.minThermal   != null) { const v = num(incoming.minThermal, 100, 1000);    if (v) out.minThermal   = v; }
  c.constraints = out;
  return c;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { day = 1, recentPersonas = [], reputation = 50 } = req.body || {};
  const prompt = buildCustomerPrompt(day, recentPersonas, reputation);

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
        max_tokens: 800,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('[generate-customer] upstream error', upstream.status, body);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data = await upstream.json();
    const raw = data?.content?.[0]?.text?.trim() ?? '';
    const customer = sanitizeCustomer(JSON.parse(extractJson(raw)));
    res.status(200).json(customer);
  } catch (err) {
    console.error('[generate-customer] error', err);
    res.status(500).json({ error: 'failed to generate customer' });
  }
}
