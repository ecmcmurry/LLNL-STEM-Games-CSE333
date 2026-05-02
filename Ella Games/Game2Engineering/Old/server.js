require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// FIFO queue + light spacing so back-to-back calls don't 429
let _queue = Promise.resolve();
const MIN_INTERVAL_MS = 250;
function enqueue(fn) {
  const next = _queue.then(async () => {
    const start = Date.now();
    try { return await fn(); }
    finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_INTERVAL_MS) await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }
  });
  _queue = next.catch(() => {});
  return next;
}

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

// simple liveness probe
app.get('/api/ping', (_req, res) => res.json({ ok: true, model: 'claude-haiku-4-5-20251001' }));

// ── 1. Generative customer ───────────────────────────────────────────────
app.post('/api/generate-customer', async (req, res) => {
  try {
    const { day = 1, recentPersonas = [], reputation = 50 } = req.body;
    const prompt = buildCustomerPrompt(day, recentPersonas, reputation);

    const message = await enqueue(() => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    }));
    const raw = message.content[0].text.trim();
    const data = JSON.parse(extractJson(raw));
    res.json(sanitizeCustomer(data));
  } catch (err) {
    console.error('generate-customer error:', err.message);
    res.status(500).json({ error: 'failed to generate customer' });
  }
});

// ── 2. Negotiation chatbot ───────────────────────────────────────────────
app.post('/api/negotiate', async (req, res) => {
  try {
    const { customer, design, history = [], playerMessage = '' } = req.body;
    const prompt = buildNegotiatePrompt(customer, design, history, playerMessage);

    const message = await enqueue(() => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    }));
    const raw = message.content[0].text.trim();
    const data = JSON.parse(extractJson(raw));

    res.json({
      reply: String(data.reply || '').slice(0, 600),
      decision: ['accept', 'reject', 'continue'].includes(data.decision) ? data.decision : 'continue',
      concession: typeof data.concession === 'number' ? data.concession : 0
    });
  } catch (err) {
    console.error('negotiate error:', err.message);
    res.status(500).json({ error: 'failed to negotiate' });
  }
});

// ── 3. Failure autopsy commentary ────────────────────────────────────────
app.post('/api/autopsy', async (req, res) => {
  try {
    const { material, design, ticket, failures = [], microstructure = 'unknown' } = req.body;
    const prompt = buildAutopsyPrompt(material, design, ticket, failures, microstructure);

    const message = await enqueue(() => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    }));
    const raw = message.content[0].text.trim();
    let analysis = raw;
    try {
      const maybe = JSON.parse(extractJson(raw));
      if (maybe && maybe.analysis) analysis = maybe.analysis;
    } catch {}
    res.json({ analysis: String(analysis).slice(0, 900) });
  } catch (err) {
    console.error('autopsy error:', err.message);
    res.status(500).json({ error: 'failed to generate autopsy' });
  }
});

// ── Prompt builders ──────────────────────────────────────────────────────
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

function buildNegotiatePrompt(customer, design, history, playerMessage) {
  const histText = (history || [])
    .map(h => `${h.role === 'player' ? 'PLAYER' : 'CUSTOMER'}: ${h.text}`)
    .join('\n') || '(no prior turns)';

  // Two visible character species in the game: rabbit + bird.
  // They negotiate with very different temperaments.
  const character = (customer && customer.character) || 'rabbit';
  const demeanorBlock = (character === 'bird')
    ? `Your demeanour is FIRM and EASILY AGGRAVATED. You are not rude or insulting, but you have little patience for hand-waving or vague claims. When the player gives a sloppy, evasive, or technically wrong answer, react with visible irritation — sharper, shorter sentences, exasperated phrases ("That's not an answer.", "Try again."), and a hint of "I told you what I needed". When the player gives a real, technically grounded engineering reason, your tone becomes curt approval rather than warmth ("Fine. That holds up. I'll take it."). You walk away faster than other customers if the player keeps deflecting — be willing to reject after only 2-3 weak turns.`
    : `Your demeanour is KIND and PATIENT. You are reasonable, polite, and willing to listen. When the player explains a real engineering reason you become sympathetic and warm ("That makes sense — I appreciate you explaining it that way."). When the player is hand-waving you push back gently rather than with anger ("Hmm, I'm not sure that addresses what I asked for. Could you say more?"). Even when you eventually reject, you do so with regret and respect, not annoyance.`;

  return `You are role-playing as a customer in an engineering game. You requested a custom part. The player engineer has delivered a design that does NOT fully meet your spec, and is now trying to convince you to accept it anyway by justifying their engineering trade-offs.

CHARACTER PROFILE — IMPORTANT, follow this voice in every reply:
${demeanorBlock}


Customer persona: ${customer.customerName} (${customer.type})
Original ask: "${customer.text}"
Original constraints: ${JSON.stringify(customer.constraints)}
Reward offered: $${customer.reward || 0}

Player's actual delivered design:
- material: ${design.materialName}
- thickness: ${design.thickness} mm
- strength: ${design.strength} MPa
- weight: ${design.weight} g/cm^2
- cost-to-shop: $${design.cost}
- ductility: ${design.ductility}
- thermal limit: ${design.thermalLimit} C
- microstructure: ${design.microstructure || 'unspecified'}
- failed constraints: ${design.failedConstraints && design.failedConstraints.length ? design.failedConstraints.join(', ') : '(none — they probably want a discount)'}

Conversation so far:
${histText}

PLAYER's new message: "${playerMessage}"

Your job: respond IN CHARACTER as the customer. Be skeptical but fair. If the player gives a real, technically sound engineering reason (e.g. "I used titanium because thermal load would have caused mild steel to creep at your operating temp"), you may accept — possibly with a price concession. If they're hand-waving or wrong on the physics, push back and ask specific questions. Reject after 3-4 turns of weak justification.

Respond with ONLY this JSON, no other text:
{
  "reply": "Your in-character response (2-4 sentences).",
  "decision": "accept | reject | continue",
  "concession": 0
}

"concession" is a percentage (0-30) reduction off the reward you accept if decision == "accept". Only nonzero if the player asked for that or if the part is meaningfully under-spec.`;
}

function buildAutopsyPrompt(material, design, ticket, failures, microstructure) {
  return `You are an experienced materials-engineering instructor doing a post-mortem on a failed part for a student.

Part details:
- Material: ${material.name} (yield σ_y = ${material.yieldStrength} MPa, ductility ε_f = ${material.ductility}, thermal limit ${material.thermalLimit} °C)
- Thickness: ${design.thickness} mm
- Final strength: ${design.strength} MPa
- Final weight: ${design.weight} g/cm²
- Final ductility: ${design.ductility}
- Microstructure produced: ${microstructure}

Customer required: ${JSON.stringify(ticket.constraints)}
Specific constraint failures: ${failures.join('; ') || '(general under-spec)'}

Write a 100-150 word autopsy in plain English directed AT the student ("you"). Cover:
1. Which constraint failed and BY HOW MUCH (use the σ_y or ε_f notation when relevant).
2. The PHYSICAL mechanism — e.g. plastic deformation past yield, brittle fracture from low ductility, creep from over-temperature, grain growth from overheating.
3. ONE concrete corrective action for next time (different material? thicker section? different heat treatment?).

Plain prose only, no bullets, no headers, no markdown.

Respond with ONLY this JSON, no other text:
{"analysis": "..."}`;
}

// sanitize generated customer payload
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
  if (incoming.minStrength != null)  { const v = num(incoming.minStrength, 100, 4000);  if (v) out.minStrength = v; }
  if (incoming.maxWeight   != null)  { const v = num(incoming.maxWeight, 1, 60);         if (v) out.maxWeight = v; }
  if (incoming.maxCost     != null)  { const v = num(incoming.maxCost, 50, 2000);        if (v) out.maxCost = v; }
  if (incoming.minDuctility!= null)  { const v = num(incoming.minDuctility, 0.01, 0.5);  if (v) out.minDuctility = v; }
  if (incoming.minThermal  != null)  { const v = num(incoming.minThermal, 100, 1000);    if (v) out.minThermal = v; }
  c.constraints = out;
  return c;
}

const PORT = process.env.PORT || 3003;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Forge & Fortune running at http://localhost:${PORT}`);
  });
}

module.exports = { app, extractJson, buildNegotiatePrompt, buildCustomerPrompt, buildAutopsyPrompt, sanitizeCustomer };
