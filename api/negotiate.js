// Vercel serverless function — negotiation chatbot for Forge & Fortune.
// API key lives server-side only (process.env.ELLA), never in the browser bundle.

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : text;
}

function buildNegotiatePrompt(customer, design, history, playerMessage) {
  const histText = (history || [])
    .map(h => `${h.role === 'player' ? 'PLAYER' : 'CUSTOMER'}: ${h.text}`)
    .join('\n') || '(no prior turns)';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customer, design, history = [], playerMessage = '' } = req.body || {};

  try {
    const prompt = buildNegotiatePrompt(customer, design, history, playerMessage);
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
      console.error('[negotiate] upstream error', upstream.status, body);
      return res.status(upstream.status).json({ error: 'Upstream API error' });
    }

    const data = await upstream.json();
    const raw = data?.content?.[0]?.text?.trim() ?? '';
    const parsed = JSON.parse(extractJson(raw));

    res.status(200).json({
      reply:      String(parsed.reply || '').slice(0, 600),
      decision:   ['accept', 'reject', 'continue'].includes(parsed.decision) ? parsed.decision : 'continue',
      concession: typeof parsed.concession === 'number' ? parsed.concession : 0,
    });
  } catch (err) {
    console.error('[negotiate] error', err);
    res.status(500).json({ error: 'failed to negotiate' });
  }
}
