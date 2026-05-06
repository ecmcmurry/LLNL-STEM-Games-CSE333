// ai.js — client-side helpers for the Forge & Fortune backend.
// Every call has a procedural fallback so the game still plays offline.

const FALLBACK_PERSONAS = [
  {
    customerName: 'Aerospace Engineer', emoji: '🚁', type: 'aerospace',
    text: "I'm building a racing quadcopter and need replacement arms. Strong enough for crashes but every gram kills flight time. Stay in budget.",
    hint: 'Light material, moderate strength. Think weight-to-strength ratio.',
    constraints: { minStrength: 500, maxWeight: 6.0, maxCost: 200 },
    reward: 160
  },
  {
    customerName: 'Automotive Designer', emoji: '🚗', type: 'automotive',
    text: "Front crumple-zone bracket. It must absorb energy on impact — if it shatters instead of bends, people get hurt. Keep cost down.",
    hint: 'High ductility is the key here.',
    constraints: { minDuctility: 0.22, maxCost: 250 },
    reward: 140
  },
  {
    customerName: 'Chemical Plant Engineer', emoji: '🏭', type: 'industrial',
    text: "Reactor vessel wall section. Process runs hot — temperatures that destroy most metals — under constant internal pressure. Cannot fail.",
    hint: 'High thermal limit AND high strength required.',
    constraints: { minThermal: 700, minStrength: 1500 },
    reward: 280
  },
  {
    customerName: 'Civil Engineer', emoji: '🏗️', type: 'construction',
    text: "Structural column base. Carries enormous compressive loads. I'm not worried about weight or cost — just don't let it buckle.",
    hint: 'Maximum strength is the only objective.',
    constraints: { minStrength: 1500 },
    reward: 220
  },
  {
    customerName: 'Orthopaedic Surgeon', emoji: '⚕️', type: 'medical',
    text: "Femur fixation plate — it goes inside a patient's leg. Light, biocompatible, absolutely cannot be brittle.",
    hint: 'Biocompatible, ductile, lightweight.',
    constraints: { maxWeight: 5.0, minDuctility: 0.1, minStrength: 400 },
    reward: 240
  },
  {
    customerName: 'Product Designer', emoji: '💻', type: 'electronics',
    text: "Ultrabook chassis base. Super thin, super light, must survive a 1m drop test. Strict unit cost target.",
    hint: 'Balance weight, strength, and cost.',
    constraints: { maxWeight: 4.0, minStrength: 200, maxCost: 100 },
    reward: 130
  },
  {
    customerName: 'Stonemason', emoji: '⛏️', type: 'artisan',
    text: "New chisel tip — wide base narrowing to a sharp edge. Hammered all day. Can't snap, can't deform.",
    hint: 'Hard and impact-resistant, strong but not brittle.',
    constraints: { minStrength: 1200, minDuctility: 0.08 },
    reward: 180
  },
  {
    customerName: 'Prop Maker', emoji: '⚔️', type: 'creative',
    text: "Sword blade for a stage production — long, narrow, sharp on both edges. Holds shape under stage combat.",
    hint: 'Strong enough to hold form, not too heavy.',
    constraints: { minStrength: 600, maxWeight: 8.0 },
    reward: 150
  },
  {
    customerName: 'Marine Architect', emoji: '⚓', type: 'marine',
    text: "Hull reinforcement plate for a sailboat keel. Constant saltwater, constant flex. Failure means a sinking.",
    hint: 'Corrosion + ductility matter together.',
    constraints: { minDuctility: 0.18, minStrength: 600 },
    reward: 170
  },
  {
    customerName: 'Robotics Lead', emoji: '🤖', type: 'robotics',
    text: "Six-axis arm linkage. Must be light to keep payload high, but rigid. Mass-production cost matters.",
    hint: 'Light, strong, manageable cost.',
    constraints: { maxWeight: 5.5, minStrength: 700, maxCost: 220 },
    reward: 200
  }
];

// liveness probe — short timeout so the UI status badge never stalls
export async function pingAI() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch('/api/ping', { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

let recentPersonas = [];
function rememberPersona(name) {
  recentPersonas.push(name);
  if (recentPersonas.length > 5) recentPersonas.shift();
}

export function pickFallbackCustomer() {
  let pool = FALLBACK_PERSONAS.filter(p => !recentPersonas.includes(p.customerName));
  if (pool.length === 0) pool = FALLBACK_PERSONAS;
  const c = JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]));
  rememberPersona(c.customerName);
  return c;
}

export async function getNextCustomer({ day = 1, reputation = 50 } = {}) {
  try {
    const resp = await fetch('/api/generate-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, reputation, recentPersonas })
    });
    if (!resp.ok) throw new Error('server returned ' + resp.status);
    const data = await resp.json();
    if (!data.text || !data.constraints) throw new Error('malformed response');
    rememberPersona(data.customerName);
    return data;
  } catch (err) {
    console.warn('AI customer unavailable, using fallback:', err.message);
    return pickFallbackCustomer();
  }
}

export async function negotiate({ customer, design, history, playerMessage }) {
  try {
    const resp = await fetch('/api/negotiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, design, history, playerMessage })
    });
    if (!resp.ok) throw new Error('server returned ' + resp.status);
    return await resp.json();
  } catch (err) {
    console.warn('negotiate unavailable:', err.message);
    return localNegotiateFallback({ customer, design, history });
  }
}

function localNegotiateFallback({ design, history }) {
  const turns = (history || []).length;
  const failed = (design.failedConstraints || []).length;
  if (turns >= 4) return { reply: "We've gone back and forth enough. I can't accept it. We'll have to part ways.", decision: 'reject', concession: 0 };
  if (failed === 0) return { reply: "Looks fine to me — but I can't shave more off the price than this.", decision: 'accept', concession: 5 };
  if (turns >= 2) return { reply: "Alright, I hear you on the trade-off. I'll take it at a discount.", decision: 'accept', concession: 15 };
  return { reply: "Convince me. Why does this trade-off actually make engineering sense for what I asked for?", decision: 'continue', concession: 0 };
}

export async function getAutopsy({ material, design, ticket, failures, microstructure }) {
  try {
    const resp = await fetch('/api/autopsy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material, design, ticket, failures, microstructure })
    });
    if (!resp.ok) throw new Error('server returned ' + resp.status);
    const data = await resp.json();
    return data.analysis || localAutopsy({ material, design, ticket, failures });
  } catch (err) {
    console.warn('autopsy unavailable:', err.message);
    return localAutopsy({ material, design, ticket, failures });
  }
}

function localAutopsy({ material, design, ticket, failures }) {
  const c = ticket.constraints || {};
  const lines = [];
  if (c.minStrength && design.strength < c.minStrength) {
    const gap = c.minStrength - design.strength;
    lines.push(`At ${design.thickness} mm, ${material.name} delivers ${design.strength} MPa — ${gap} MPa short of the required ${c.minStrength} MPa. The applied load exceeded yield (σ_y), so the part underwent plastic deformation. Either thicken the section or step up to a higher-σ_y material like Ti-6Al-4V.`);
  }
  if (c.maxWeight && design.weight > c.maxWeight) {
    lines.push(`The part weighs ${design.weight} g/cm² vs the ${c.maxWeight} target — density (ρ) of ${material.name} is too high for this thickness. A lower-ρ material (CFRP, aluminum) or a thinner section would close the gap.`);
  }
  if (c.maxCost && design.cost > c.maxCost) {
    lines.push(`Cost ran $${design.cost - c.maxCost} over budget. The material choice is the dominant factor here, not thickness — a cheaper substitute with adequate σ_y would save the order.`);
  }
  if (c.minDuctility && design.ductility < c.minDuctility) {
    lines.push(`Ductility ε_f = ${design.ductility} is below the ${c.minDuctility} requirement — the part fractured brittlely instead of absorbing energy. Avoid quenched microstructures here, or pick a more ductile alloy.`);
  }
  if (c.minThermal && material.thermalLimit < c.minThermal) {
    lines.push(`Thermal limit ${material.thermalLimit} °C is below the ${c.minThermal} °C operating point — the part softened or crept under load. You need a higher-T alloy (stainless, titanium).`);
  }
  return lines.join(' ') || 'The part missed spec but no single dominant cause — review each constraint vs the equations.';
}
