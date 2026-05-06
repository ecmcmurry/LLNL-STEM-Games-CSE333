// Vercel serverless function — failure autopsy commentary for Forge & Fortune.
// API key lives server-side only (process.env.ELLA), never in the browser bundle.

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { material, design, ticket, failures = [], microstructure = 'unknown' } = req.body || {};

  try {
    const prompt = buildAutopsyPrompt(material, design, ticket, failures, microstructure);
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
      console.error('[autopsy] upstream error', upstream.status, body);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data = await upstream.json();
    const raw = data?.content?.[0]?.text?.trim() ?? '';
    let analysis = raw;
    try {
      const maybe = JSON.parse(extractJson(raw));
      if (maybe && maybe.analysis) analysis = maybe.analysis;
    } catch {}
    res.status(200).json({ analysis: String(analysis).slice(0, 900) });
  } catch (err) {
    console.error('[autopsy] error', err);
    res.status(500).json({ error: 'failed to generate autopsy' });
  }
}
