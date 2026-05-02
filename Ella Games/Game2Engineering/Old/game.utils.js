/**
 * game.utils.js — pure business-logic helpers extracted from game.js.
 * No browser globals; safe to require in Node / Jest.
 */

// ═══════════════════════════════════════════════════════════
// MATERIALS
// ═══════════════════════════════════════════════════════════
const MATERIALS = [
  {
    id: 'steel_mild', emoji: '🔩', name: 'AISI 1020 Mild Steel',
    desc: 'Cheap, weldable, very ductile workhorse.',
    type: 'ferrous',
    yieldStrength: 210, ductility: 0.25, ultimate: 380,
    density: 7.85, cost: 8, thermalLimit: 420,
    phase: { ambient: 25, austLo: 723, austHi: 870, overheat: 1100, max: 1300, name: 'Iron-Carbon' },
    forgeWindow: { hot: 950, cold: 720 }
  },
  {
    id: 'steel_stainless', emoji: '🌊', name: '316L Stainless Steel',
    desc: 'Corrosion-resistant, highly ductile.',
    type: 'ferrous',
    yieldStrength: 290, ductility: 0.4, ultimate: 580,
    density: 8.0, cost: 30, thermalLimit: 800,
    phase: { ambient: 25, austLo: 1050, austHi: 1150, overheat: 1300, max: 1450, name: 'Austenitic' },
    forgeWindow: { hot: 1180, cold: 950 }
  },
  {
    id: 'aluminum', emoji: '✈️', name: 'Aluminum 6061-T6',
    desc: 'Light, affordable aerospace alloy.',
    type: 'nonferrous',
    yieldStrength: 276, ductility: 0.12, ultimate: 310,
    density: 2.71, cost: 22, thermalLimit: 170,
    phase: { ambient: 25, austLo: 480, austHi: 540, overheat: 620, max: 700, name: 'Solution-Treat' },
    forgeWindow: { hot: 510, cold: 380 }
  },
  {
    id: 'titanium', emoji: '🚀', name: 'Ti-6Al-4V (Grade 5)',
    desc: 'Premium strength-to-weight, expensive.',
    type: 'nonferrous',
    yieldStrength: 880, ductility: 0.14, ultimate: 950,
    density: 4.43, cost: 95, thermalLimit: 315,
    phase: { ambient: 25, austLo: 950, austHi: 1050, overheat: 1200, max: 1400, name: 'β-Transus' },
    forgeWindow: { hot: 1020, cold: 870 }
  },
  {
    id: 'cfrp', emoji: '🏎️', name: 'CFRP (Carbon Fibre)',
    desc: 'Highest strength-to-weight; brittle. Cure window only.',
    type: 'composite',
    yieldStrength: 600, ductility: 0.015, ultimate: 620,
    density: 1.6, cost: 180, thermalLimit: 250,
    phase: { ambient: 25, austLo: 130, austHi: 170, overheat: 220, max: 280, name: 'Cure Window' },
    forgeWindow: { hot: 200, cold: 100 }
  }
];

// ═══════════════════════════════════════════════════════════
// HEAT TREATMENT OUTCOMES
// ═══════════════════════════════════════════════════════════
const HEAT_TREAT_OUTCOMES = {
  martensite: { yieldMult: 1.7, ductMult: 0.25, name: 'Martensite',
    desc: 'Hard, strong, brittle — water-quenched from austenite.' },
  pearlite:   { yieldMult: 1.0, ductMult: 1.0,  name: 'Pearlite',
    desc: 'Balanced layered structure — air-cooled.' },
  ferrite:    { yieldMult: 0.75, ductMult: 1.45, name: 'Ferrite + Pearlite',
    desc: 'Soft, very ductile — slow-annealed.' },
  raw:        { yieldMult: 1.0, ductMult: 1.0,  name: 'As-Received',
    desc: 'No phase transformation occurred.' },
  burnt:      { yieldMult: 0.55, ductMult: 0.4, name: 'Burnt / Grain-Grown',
    desc: 'Overheated — large grains, brittle and weak.' },
  solutioned: { yieldMult: 1.2, ductMult: 0.95, name: 'Solution-Treated + Aged',
    desc: 'Aluminum precipitation hardening.' },
  cured:      { yieldMult: 1.0, ductMult: 1.0,  name: 'Cured Composite',
    desc: 'Polymer matrix cross-linked at the cure window.' }
};

// ═══════════════════════════════════════════════════════════
// CORE DESIGN COMPUTATION
// ═══════════════════════════════════════════════════════════

/**
 * Computes all derived properties for an inventory item at a given thickness.
 * strength = yieldStrength * htYieldMult * thickness  (MPa)
 * cost     = material.cost * thickness                ($)
 */
function computeDesign(item, thickness) {
  const m = item.material;
  const ht = item.htMods || HEAT_TREAT_OUTCOMES.raw;
  const t = thickness;
  return {
    materialName:  m.name,
    materialId:    m.id,
    thickness:     t,
    strength:      +(m.yieldStrength * ht.yieldMult * t).toFixed(0),
    ultimate:      +(m.ultimate      * ht.yieldMult * t).toFixed(0),
    weight:        +(m.density * t).toFixed(2),
    cost:          +(m.cost * t).toFixed(0),
    ductility:     +(m.ductility * ht.ductMult).toFixed(3),
    thermalLimit:  m.thermalLimit,
    microstructure: item.microstructure || 'raw'
  };
}

// ═══════════════════════════════════════════════════════════
// DESIGN EVALUATION
// ═══════════════════════════════════════════════════════════

function evaluateDesign(design, ticket) {
  const c = ticket.constraints || {};
  const checks = [], fail = [];
  const add = (label, ok, want, got) => {
    checks.push({ label, ok, want, got });
    if (!ok) fail.push(`${label}: need ${want}, got ${got}`);
  };
  if (c.minStrength  != null) add('Strength',    design.strength    >= c.minStrength,  `≥ ${c.minStrength} MPa`,   `${design.strength} MPa`);
  if (c.maxWeight    != null) add('Weight',       design.weight      <= c.maxWeight,    `≤ ${c.maxWeight} g/cm²`,   `${design.weight} g/cm²`);
  if (c.maxCost      != null) add('Cost',         design.cost        <= c.maxCost,      `≤ $${c.maxCost}`,          `$${design.cost}`);
  if (c.minDuctility != null) add('Ductility',    design.ductility   >= c.minDuctility, `≥ ${c.minDuctility}`,      `${design.ductility}`);
  if (c.minThermal   != null) add('Thermal Lim.', design.thermalLimit>= c.minThermal,   `≥ ${c.minThermal} °C`,     `${design.thermalLimit} °C`);
  return { checks, fail, pass: fail.length === 0 };
}

// ═══════════════════════════════════════════════════════════
// CONSTRAINT FORMATTING
// ═══════════════════════════════════════════════════════════

function formatConstraints(c) {
  const parts = [];
  if (c.minStrength)  parts.push(`σ ≥ <code>${c.minStrength} MPa</code>`);
  if (c.maxWeight)    parts.push(`W ≤ <code>${c.maxWeight} g/cm²</code>`);
  if (c.maxCost)      parts.push(`$ ≤ <code>$${c.maxCost}</code>`);
  if (c.minDuctility) parts.push(`ε_f ≥ <code>${c.minDuctility}</code>`);
  if (c.minThermal)   parts.push(`T ≥ <code>${c.minThermal}°C</code>`);
  return parts.join(' · ') || '<em>(no specific constraints)</em>';
}

function constraintList(c) {
  const items = [];
  if (c.minStrength)  items.push(`Strength ≥ <strong>${c.minStrength} MPa</strong>`);
  if (c.maxWeight)    items.push(`Weight ≤ <strong>${c.maxWeight} g/cm²</strong>`);
  if (c.maxCost)      items.push(`Cost ≤ <strong>$${c.maxCost}</strong>`);
  if (c.minDuctility) items.push(`Ductility ε_f ≥ <strong>${c.minDuctility}</strong>`);
  if (c.minThermal)   items.push(`Thermal ≥ <strong>${c.minThermal}°C</strong>`);
  return items.map(i => `<li>${i}</li>`).join('') || '<li><em>no hard constraints</em></li>';
}

// ═══════════════════════════════════════════════════════════
// CHARACTER HELPERS
// ═══════════════════════════════════════════════════════════

const CHARACTERS = ['rabbit', 'bird', 'bobcat'];

function pickCharacter() {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

function characterImage(character, mood = 'regular') {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const folder =
    character === 'bird'   ? 'Bird'   :
    character === 'bobcat' ? 'Bobcat' :
                             'Rabbit';
  const m = (mood === 'happy' || mood === 'upset') ? cap(mood) : 'Regular';
  return `assets/${folder}${m}.png`;
}

function characterDisplayName(character) {
  if (character === 'bird')   return 'Dr. Bird';
  if (character === 'bobcat') return 'Rufus';
  return Math.random() < 0.5 ? 'Mr. Hop' : 'Miss Hop';
}

// ═══════════════════════════════════════════════════════════
// JOB TITLE EXTRACTION
// ═══════════════════════════════════════════════════════════

function extractJobTitle(s) {
  if (!s) return s;
  const parts = String(s).split(/\s*[,—–|·]\s*|\s+-\s+/).map(p => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : String(s).trim();
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  MATERIALS,
  HEAT_TREAT_OUTCOMES,
  computeDesign,
  evaluateDesign,
  formatConstraints,
  constraintList,
  pickCharacter,
  characterImage,
  characterDisplayName,
  extractJobTitle,
  CHARACTERS
};
