
import { getNextCustomer, negotiate, getAutopsy, pingAI } from './ai.js';


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

const HEAT_TREAT_OUTCOMES = {
  martensite: { yieldMult: 1.7, ductMult: 0.25, name: 'Martensite',
    desc: 'Hard, strong, brittle — water-quenched from austenite.' },
  pearlite:   { yieldMult: 1.0, ductMult: 1.0, name: 'Pearlite',
    desc: 'Balanced layered structure — air-cooled.' },
  ferrite:    { yieldMult: 0.75, ductMult: 1.45, name: 'Ferrite + Pearlite',
    desc: 'Soft, very ductile — slow-annealed.' },
  raw:        { yieldMult: 1.0, ductMult: 1.0, name: 'As-Received',
    desc: 'No phase transformation occurred.' },
  burnt:      { yieldMult: 0.55, ductMult: 0.4, name: 'Burnt / Grain-Grown',
    desc: 'Overheated — large grains, brittle and weak.' },
  solutioned: { yieldMult: 1.2, ductMult: 0.95, name: 'Solution-Treated + Aged',
    desc: 'Aluminum precipitation hardening.' },
  cured:      { yieldMult: 1.0, ductMult: 1.0, name: 'Cured Composite',
    desc: 'Polymer matrix cross-linked at the cure window.' }
};

// ═══════════════════════════════════════════════════════════
// DEVICE DETECTION
// ═══════════════════════════════════════════════════════════
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const IS_MOBILE = IS_TOUCH && Math.min(window.innerWidth, window.innerHeight) < 900;


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

// ─── Superficial character names ────────────────────────────
// Customers wear an animal persona; the AI-generated job-title becomes
// their `type` (subtitle), while their visible name reflects the animal.
function characterDisplayName(character) {
  if (character === 'bird')   return 'Dr. Bird';
  if (character === 'bobcat') return 'Rufus';
  // rabbit
  return Math.random() < 0.5 ? 'Mr. Hop' : 'Miss Hop';
}

// The AI sometimes returns "Marcus Webb, Drone Racing Engineer" — pull off
// the personal-name half so we only display the position title.
function extractJobTitle(s) {
  if (!s) return s;
  const parts = String(s).split(/\s*[,—–|·]\s*|\s+-\s+/).map(p => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : String(s).trim();
}

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
const state = {
  day: 1, maxDays: 5, money: 200, reputation: 50, dailyRent: 75,
  startMoney: 200, startRep: 50, served: 0, totalServed: 0,
  timeMinutes: 360, gameInterval: null,
  activeTab: 'lobby',

  customer: null,            // single customer currently at counter
  customerSpawnTimer: null,
  pendingTickets: [],        // tickets the player has accepted; customer waiting offstage
  inventory: [],             // [{id, material, ticketId, microstructure, htMods, ...}]

  selectedInvId: null,

  // furnace state
  heatingItem: null,
  heatingHeld: false,
  heatLoop: null,
  holdRequired: 2.0,         // seconds in austenite needed (was 4)

  // forge state
  designItem: null,
  thickness: 3,
  simulatedDesign: null,
  forgingItem: null,
  forgeStrokes: 0, forgeRequired: 4,
  forgeMistakes: 0, forgeFractures: 0,
  workpieceTemp: 0,
  workpieceCoolInterval: null,

  // timing-bar pointer
  timingPos: 0, timingDir: 1, timingSpeed: 2.4,
  targetStart: 40, targetWidth: 22,
  timingInterval: null,

  motionEnabled: false,
  paused: false,

  ticketCounter: 1, itemCounter: 1
};

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function showToast(msg, ms = 2200) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), ms);
}

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  const el = $(id); if (el) el.classList.add('active');
}
function openModal(id)  { $(id).classList.add('active'); }
function closeModal(id) { $(id).classList.remove('active'); }

$$('[data-close]').forEach(b =>
  b.addEventListener('click', e => {
    closeModal(e.target.dataset.close);
    if (e.target.dataset.close === 'modal-negotiate' && negState && negState.resolve) {
      const r = negState.resolve; negState = null; r(false);
    }
  })
);

function formatTime(min) {
  const h = Math.floor(min / 60), m = min % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

let _ac = null;
const SETTINGS = {
  soundOn: (() => {
    try { return localStorage.getItem('ff_sound') !== 'off'; } catch { return true; }
  })()
};
function setSoundOn(on) {
  SETTINGS.soundOn = !!on;
  try { localStorage.setItem('ff_sound', on ? 'on' : 'off'); } catch {}
}
function audioBeep(freq = 440, dur = 0.08) {
  if (!SETTINGS.soundOn) return;
  try {
    if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === 'suspended') _ac.resume().catch(() => {});
    const o = _ac.createOscillator(), g = _ac.createGain();
    o.type = 'square'; o.frequency.value = freq;
    o.connect(g); g.connect(_ac.destination);
    g.gain.value = 0.06; o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, _ac.currentTime + dur);
    o.stop(_ac.currentTime + dur);
  } catch {}
}

// ═══════════════════════════════════════════════════════════
// AI STATUS
// ═══════════════════════════════════════════════════════════
async function checkAIStatus() {
  const ok = await pingAI();
  const el = $('ai-status'), txt = $('ai-status-text');
  if (ok) {
    el.className = 'online';
    txt.textContent = 'AI online';
  } else {
    el.className = 'offline';
    txt.textContent = 'AI offline';
  }
}
function aiStatusBusy(label = 'AI working…') {
  const el = $('ai-status'), txt = $('ai-status-text');
  el.className = ''; txt.textContent = label;
}

// ═══════════════════════════════════════════════════════════
// DESIGN MATH
// ═══════════════════════════════════════════════════════════
function computeDesign(item, thickness) {
  const m = item.material;
  const ht = item.htMods || HEAT_TREAT_OUTCOMES.raw;
  const t = thickness;
  return {
    materialName: m.name,
    materialId: m.id,
    thickness: t,
    strength:   +(m.yieldStrength * ht.yieldMult * t).toFixed(0),
    ultimate:   +(m.ultimate * ht.yieldMult * t).toFixed(0),
    weight:     +(m.density * t).toFixed(2),
    cost:       +(m.cost * t).toFixed(0),
    ductility:  +(m.ductility * ht.ductMult).toFixed(3),
    thermalLimit: m.thermalLimit,
    microstructure: item.microstructure || 'raw'
  };
}

function evaluateDesign(design, ticket) {
  const c = ticket.constraints || {};
  const checks = [], fail = [];
  const add = (label, ok, want, got) => {
    checks.push({ label, ok, want, got });
    if (!ok) fail.push(`${label}: need ${want}, got ${got}`);
  };
  if (c.minStrength != null)  add('Strength',    design.strength >= c.minStrength,    `≥ ${c.minStrength} MPa`,  `${design.strength} MPa`);
  if (c.maxWeight   != null)  add('Weight',      design.weight   <= c.maxWeight,      `≤ ${c.maxWeight} g/cm²`,  `${design.weight} g/cm²`);
  if (c.maxCost     != null)  add('Cost',        design.cost     <= c.maxCost,        `≤ $${c.maxCost}`,         `$${design.cost}`);
  if (c.minDuctility!= null)  add('Ductility',   design.ductility>= c.minDuctility,   `≥ ${c.minDuctility}`,     `${design.ductility}`);
  if (c.minThermal  != null)  add('Thermal Lim.',design.thermalLimit >= c.minThermal, `≥ ${c.minThermal} °C`,    `${design.thermalLimit} °C`);
  return { checks, fail, pass: fail.length === 0 };
}

function formatConstraints(c) {
  const parts = [];
  if (c.minStrength) parts.push(`σ ≥ <code>${c.minStrength} MPa</code>`);
  if (c.maxWeight)   parts.push(`W ≤ <code>${c.maxWeight} g/cm²</code>`);
  if (c.maxCost)     parts.push(`$ ≤ <code>$${c.maxCost}</code>`);
  if (c.minDuctility)parts.push(`ε_f ≥ <code>${c.minDuctility}</code>`);
  if (c.minThermal)  parts.push(`T ≥ <code>${c.minThermal}°C</code>`);
  return parts.join(' · ') || '<em>(no specific constraints)</em>';
}

function constraintList(c) {
  const items = [];
  if (c.minStrength) items.push(`Strength ≥ <strong>${c.minStrength} MPa</strong>`);
  if (c.maxWeight)   items.push(`Weight ≤ <strong>${c.maxWeight} g/cm²</strong>`);
  if (c.maxCost)     items.push(`Cost ≤ <strong>$${c.maxCost}</strong>`);
  if (c.minDuctility)items.push(`Ductility ε_f ≥ <strong>${c.minDuctility}</strong>`);
  if (c.minThermal)  items.push(`Thermal ≥ <strong>${c.minThermal}°C</strong>`);
  return items.map(i => `<li>${i}</li>`).join('') || '<li><em>no hard constraints</em></li>';
}

// ═══════════════════════════════════════════════════════════
// BANKRUPTCY + TIPS
// ═══════════════════════════════════════════════════════════
const MIN_UPFRONT = Math.min(...MATERIALS.map(m => m.cost * 2));

function tipCost() {
  return Math.max(1, Math.ceil(state.dailyRent / 10));
}

// Returns true if game-over was triggered. Skipped during tutorial.
function checkBankruptcy() {
  if (state.tutorialActive) return false;
  if (state.money < 0) {
    setTimeout(() => gameOver(`Bankrupt — you went into the red and can't pay your bills.`), 200);
    return true;
  }
  // If there's an order on the counter that still needs more money to push
  // through (e.g. extra-thick forge cost), and the player can't cover it,
  // the shift collapses immediately — no way to finish the order.
  const stuckItem = state.inventory.find(it => {
    const minNeeded = (it.material && it.material.cost) ? it.material.cost : 0;
    return state.money < minNeeded;
  });
  if (stuckItem) {
    setTimeout(() => gameOver(`Bankrupt — not enough money to finish the order on the counter.`), 200);
    return true;
  }
  if (state.money < MIN_UPFRONT && state.inventory.length === 0) {
    setTimeout(() => gameOver(`Bankrupt — you can't afford even the cheapest material ($${MIN_UPFRONT}).`), 200);
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// HUD + TABS
// ═══════════════════════════════════════════════════════════
function updateHud() {
  $('hud-day').textContent = state.day;
  const overtime = state.timeMinutes >= DAY_END_MIN;
  const displayMin = overtime ? DAY_END_MIN : state.timeMinutes;
  $('hud-time').textContent = formatTime(displayMin) + (overtime ? '  · CLOSING' : '');
  $('hud-time').classList.toggle('hud-overtime', overtime);
  $('hud-cust').textContent = state.served;
  $('hud-money').textContent = state.money;
  $('hud-rep').textContent = state.reputation;
  $('hud-rent').textContent = state.dailyRent;
}

function switchTab(tab) {
  state.activeTab = tab;
  $$('.tab-btn, .sign-btn').forEach(b => b.classList.toggle('active-tab', b.dataset.tab === tab));
  $$('.workspace').forEach(w => w.classList.remove('active'));
  $('workspace-' + tab).classList.add('active');
  // body-level tab class lets CSS hide things like #counter-orders /
  // #room-dropoff outside the lobby so they don't bleed into the forge.
  document.body.classList.remove('tab-lobby', 'tab-melt', 'tab-forge');
  document.body.classList.add('tab-' + tab);
  if (tab === 'lobby') renderLobby();
  if (tab === 'melt')  renderFurnace();
  if (tab === 'forge') renderForge();
}
$$('.tab-btn, .sign-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

// Wire the painted drop-off box on the counter to the existing handler.
{
  const rdrop = document.getElementById('room-dropoff');
  if (rdrop) rdrop.addEventListener('click', () => handleDropOffClick());
}

// ═══════════════════════════════════════════════════════════
// LOBBY: single customer + counter
// ═══════════════════════════════════════════════════════════
let customerArrivalInProgress = false;

async function spawnCustomer() {
  if (state.tutorialActive || state.paused) return;
  if (state.customer || customerArrivalInProgress) return;
  if (state.timeMinutes >= DAY_END_MIN) return;  // don't pull new customers in overtime
  if (typeof isReviewModalOpen === 'function' && isReviewModalOpen()) return; // mid-review
  if (checkBankruptcy()) return;
  customerArrivalInProgress = true;
  aiStatusBusy('AI: customer…');
  try {
    const c = await getNextCustomer({ day: state.day, reputation: state.reputation });
    c.character = pickCharacter();
    // Move the AI-generated job title to a subtitle and use a superficial
    // animal-themed name for the visible label. Strip any personal name
    // off the AI persona so we only show the position itself.
    if (!c.jobTitle) c.jobTitle = c.customerName;
    c.jobTitle = extractJobTitle(c.jobTitle);
    c.customerName = characterDisplayName(c.character);
    state.customer = c;
    renderLobby();
    showToast(`${c.emoji} ${c.customerName} walks in.`);
    audioBeep(540, 0.1);
    checkAIStatus();
  } finally {
    customerArrivalInProgress = false;
  }
}

function renderLobby() {
  const slot = $('customer-slot');
  slot.innerHTML = '';
  if (!state.customer) {
    slot.classList.add('empty');
    const m = document.createElement('div');
    m.id = 'customer-empty-msg';
    m.textContent = customerArrivalInProgress ? 'A customer is on their way…' : 'No customer at the counter… ⏳';
    slot.appendChild(m);
    return;
  }
  slot.classList.remove('empty');

  const c = state.customer;
  // No nameplate — the customer's identity / brief is revealed by clicking
  // the portrait, which opens the full intake modal.
  const wrap = document.createElement('div');
  wrap.id = 'customer-image-wrap';
  const portrait = characterImage(c.character || 'rabbit', 'regular');
  wrap.innerHTML = `<img id="customer-image" src="${portrait}" alt="${c.customerName}" title="${c.customerName} — click to hear them out" />`;
  slot.appendChild(wrap);

  slot.onclick = () => openCustomerIntake();
}

function openCustomerIntake() {
  const c = state.customer; if (!c) return;
  $('intake-img').src = characterImage(c.character || 'rabbit', 'regular');
  $('intake-name').textContent = c.customerName;
  $('intake-type').textContent = c.jobTitle || c.type;
  $('intake-text').textContent = c.text;
  $('intake-reward').textContent = c.reward;
  $('intake-reqs').innerHTML = constraintList(c.constraints);
  renderTipRow(c);
  populateMaterialsGrid(c);
  openModal('modal-customer');
}

function renderTipRow(c) {
  const el = $('intake-hint');
  if (!c.hint) { el.style.display = 'none'; return; }
  el.style.display = '';
  if (c.tipPurchased) {
    el.innerHTML = `<strong>💡 Engineering tip:</strong> ${c.hint}`;
    el.style.fontStyle = 'normal';
    return;
  }
  const cost = tipCost();
  const can = state.money >= cost;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <span style="font-style:italic;color:#5a3c08;">An engineer's tip is available — costs <strong>$${cost}</strong> (10% of today's rent).</span>
      <button class="btn btn-small btn-info" id="btn-buy-tip" ${can ? '' : 'disabled'}>💡 Get tip ($${cost})</button>
    </div>`;
  el.style.fontStyle = 'normal';
  const btn = document.getElementById('btn-buy-tip');
  if (btn) btn.onclick = () => {
    if (state.money < cost) { showToast('Not enough money for the tip.'); return; }
    state.money -= cost;
    c.tipPurchased = true;
    updateHud();
    renderTipRow(c);
    showToast(`💡 ${c.hint}`, 4500);
    audioBeep(540, 0.08);
    checkBankruptcy();
  };
}

function populateMaterialsGrid(customer) {
  const grid = $('materials-grid'); grid.innerHTML = '';
  MATERIALS.forEach(m => {
    const upfront = m.cost * 2;
    const can = state.money >= upfront;
    const card = document.createElement('div');
    card.className = 'material-card' + (can ? '' : ' disabled');
    card.dataset.mat = m.id;
    card.innerHTML = `
      <button class="mat-info-btn" title="More info about ${m.name}">i</button>
      <div class="mat-surface mat-surface-${m.id}">
        <span class="mat-emoji">${m.emoji}</span>
      </div>
      <div class="mat-card-body">
        <div class="mat-card-name">${m.name}</div>
        <div class="mat-stats">
          <strong>σ_y</strong>: ${m.yieldStrength} MPa<br>
          <strong>ρ</strong>: ${m.density} g/cm³<br>
          <strong>ε_f</strong>: ${m.ductility}<br>
          <strong>T_max</strong>: ${m.thermalLimit} °C
        </div>
        <div class="mat-cost">$${m.cost}/mm <span style="color:var(--text-soft);font-weight:normal;font-size:0.7rem;">(start: $${upfront})</span></div>
      </div>`;
    // (i) button opens a deeper info modal without selecting the material
    card.querySelector('.mat-info-btn').addEventListener('click', e => {
      e.stopPropagation();
      openMatInfo(m.id);
    });
    if (can) card.onclick = () => acceptOrderWith(customer, m);
    grid.appendChild(card);
  });
}

function acceptOrderWith(customer, mat) {
  const upfront = mat.cost * 2;
  if (state.money < upfront) { showToast('Not enough money.'); return; }
  state.money -= upfront;
  // create ticket
  const ticketId = state.ticketCounter++;
  const ticket = {
    id: ticketId,
    orderNumber: ticketId,
    customerName: customer.customerName, emoji: customer.emoji, type: customer.type,
    jobTitle: customer.jobTitle || customer.type,
    text: customer.text, hint: customer.hint, constraints: customer.constraints, reward: customer.reward,
    character: customer.character || 'rabbit'
  };
  state.pendingTickets.push(ticket);
  // create work item
  const item = {
    id: state.itemCounter++, material: mat, ticketId: ticket.id,
    microstructure: 'raw', htMods: HEAT_TREAT_OUTCOMES.raw,
    peakTemp: mat.phase.ambient, currentTemp: mat.phase.ambient,
    flaws: [], hadOverheat: false, holdInAustenite: 0,
    state: 'raw', // raw → heating → heated → finished
  };
  state.inventory.push(item);
  // customer leaves
  state.customer = null;
  closeModal('modal-customer');
  updateHud();
  renderLobby(); renderTray();
  showToast(`Bought ${mat.name}. Head to the furnace.`);
  audioBeep(660, 0.1);
  // schedule next customer
  // Slower cadence — give the player time to actually work on the order before
  // the next walk-in interrupts. (≈ 22-36 real seconds.)
  scheduleNextCustomer(22 + Math.random() * 14);
  // bankruptcy check (after spending)
  checkBankruptcy();
}

function scheduleNextCustomer(delaySec) {
  if (state.customerSpawnTimer) clearTimeout(state.customerSpawnTimer);
  state.customerSpawnTimer = setTimeout(() => {
    state.customerSpawnTimer = null;
    spawnCustomer();
  }, delaySec * 1000);
}

// ═══════════════════════════════════════════════════════════
// INVENTORY TRAY (click-to-move)
// ═══════════════════════════════════════════════════════════
function renderTray() {
  const tray = $('inventory-tray'); tray.innerHTML = '';
  if (state.inventory.length === 0) {
    tray.innerHTML = '<div class="inv-empty-msg">Tray empty — accept an order from a customer to start working.</div>';
    refreshDropOffBox();
    renderCounterOrders(); // clear stale order art from the counter
    return;
  }
  state.inventory.forEach(it => {
    const div = document.createElement('div');
    const isArmed = state.deliveryReadyId === it.id && it.state === 'finished';
    div.className = `inv-item ${it.state}`
      + (state.selectedInvId === it.id ? ' selected' : '')
      + (isArmed ? ' delivery-armed' : '');
    const ticket = state.pendingTickets.find(t => t.id === it.ticketId);
    const stageLabel = {
      raw: 'RAW',
      heating: 'HEATING',
      heated: it.microstructure && it.microstructure !== 'raw' ? HEAT_TREAT_OUTCOMES[it.microstructure].name : 'HEATED',
      forging: 'FORGING',
      finished: 'READY TO DELIVER'
    }[it.state] || it.state.toUpperCase();
    const orderNum = ticket ? ticket.orderNumber : '?';
    div.innerHTML = `
      <div class="inv-order-num" title="Order #${orderNum}">#${orderNum}</div>
      <div class="inv-emoji">${it.material.emoji}</div>
      <div>${it.material.name.split(' ')[0]}</div>
      <div class="inv-state">${stageLabel}</div>
      ${ticket ? `<div class="inv-customer-tag" title="${ticket.customerName}">${ticket.emoji}</div>` : ''}
    `;
    bindTrayClick(div, it);
    bindTrayDraggable(div, it);
    tray.appendChild(div);
  });
  refreshDropOffBox();
  renderCounterOrders();
}

// ─── Counter orders (lobby visualisation) ────────────────────
// Each accepted order also appears as an Order#.svg sitting on the lobby
// counter, exactly like the ExampleLobby reference.  The counter widgets
// share the tray's click semantics: single click → next station, double
// click → details modal.
const ORDER_ART = [
  'assets/New Art/Order1.svg',
  'assets/New Art/Order2.svg',
  'assets/New Art/Order3.svg',
  'assets/New Art/Order4.svg'
];
function renderCounterOrders() {
  const counter = $('counter-orders');
  if (!counter) return;
  counter.innerHTML = '';
  state.inventory.forEach((it, idx) => {
    const ticket = state.pendingTickets.find(t => t.id === it.ticketId);
    const isArmed = state.deliveryReadyId === it.id && it.state === 'finished';
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `counter-order ${it.state}`
      + (state.selectedInvId === it.id ? ' selected' : '')
      + (isArmed ? ' delivery-armed' : '');
    const stageLabel = {
      raw: 'RAW',
      heating: 'HEATING',
      heated: it.microstructure && it.microstructure !== 'raw'
        ? HEAT_TREAT_OUTCOMES[it.microstructure].name.toUpperCase()
        : 'HEATED',
      forging: 'FORGING',
      finished: 'READY'
    }[it.state] || it.state.toUpperCase();
    slot.innerHTML = `
      <img class="co-art" src="${ORDER_ART[idx % ORDER_ART.length]}" alt="" />
      <span class="co-num">#${ticket ? ticket.orderNumber : '?'}</span>
      <span class="co-state">${stageLabel}</span>
    `;
    bindTrayClick(slot, it);   // same single/double-click handling as tray
    counter.appendChild(slot);
  });
}

// ─── Drag-and-drop ───────────────────────────────────────────
let _draggingId = null;

function bindTrayDraggable(div, item) {
  div.draggable = true;
  div.addEventListener('dragstart', e => {
    _draggingId = item.id;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', String(item.id));
      e.dataTransfer.effectAllowed = 'move';
    }
    div.classList.add('inv-dragging');
    document.body.classList.add('is-dragging');
    // arm hint targets so the player can see where this piece is allowed
    armDropHints(item);
  });
  div.addEventListener('dragend', () => {
    _draggingId = null;
    div.classList.remove('inv-dragging');
    document.body.classList.remove('is-dragging');
    clearDropHints();
  });
}

function armDropHints(item) {
  const fur = $('furnace'), anv = $('visual-anvil'), drop = $('drop-off-box');
  if (item.state === 'raw' || item.state === 'heating') fur && fur.classList.add('drop-eligible');
  if (item.state === 'heated')                          anv && anv.classList.add('drop-eligible');
  if (item.state === 'finished')                       drop && drop.classList.add('drop-eligible');
}
function clearDropHints() {
  ['furnace','visual-anvil','drop-off-box'].forEach(id => {
    const el = $(id); if (!el) return;
    el.classList.remove('drop-hover', 'drop-eligible');
  });
}

function attachDropTarget(elId, kind) {
  const el = $(elId); if (!el) return;
  el.addEventListener('dragover', e => {
    if (_draggingId == null) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    el.classList.add('drop-hover');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop-hover'));
  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drop-hover');
    const idStr = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || '';
    const id = parseInt(idStr, 10);
    const fallback = _draggingId;
    const finalId = Number.isFinite(id) ? id : fallback;
    const item = state.inventory.find(x => x.id === finalId);
    if (!item) return;
    handleDropOnto(kind, item);
  });
}

function handleDropOnto(kind, item) {
  if (kind === 'furnace') {
    if (item.state === 'raw' || item.state === 'heating') {
      state.heatingItem = item;
      item.state = 'heating';
      state.deliveryReadyId = null;
      switchTab('melt');
      renderTray();
      audioBeep(440, 0.07);
    } else {
      showToast(`${item.material.emoji} can't go in the furnace from "${item.state}".`);
    }
  } else if (kind === 'anvil') {
    if (item.state === 'heated') {
      state.designItem = item;
      state.thickness = 3;
      state.simulatedDesign = null;
      state.deliveryReadyId = null;
      switchTab('forge');
      renderTray();
      audioBeep(440, 0.07);
    } else if (item.state === 'forging') {
      state.designItem = item;
      switchTab('forge');
    } else {
      showToast('Heat-treat the piece in the furnace first.');
    }
  } else if (kind === 'dropoff') {
    if (item.state === 'finished') {
      state.deliveryReadyId = null;
      refreshDropOffBox();
      audioBeep(540, 0.08); audioBeep(720, 0.10);
      deliverFinishedItem(item);
    } else {
      showToast("That order isn't finished yet.");
    }
  }
}

// single-click → onTrayItemClick (move to next station / deliver)
// double-click → showOrderDescription
const _trayClickTimers = new Map();
const _DBL_CLICK_MS = 280;
function bindTrayClick(el, item) {
  el.addEventListener('click', () => {
    if (_trayClickTimers.has(item.id)) {
      clearTimeout(_trayClickTimers.get(item.id));
      _trayClickTimers.delete(item.id);
      showOrderDescription(item);
    } else {
      const tid = setTimeout(() => {
        _trayClickTimers.delete(item.id);
        onTrayItemClick(item);
      }, _DBL_CLICK_MS);
      _trayClickTimers.set(item.id, tid);
    }
  });
  el.addEventListener('dblclick', e => e.preventDefault());
}

function refreshDropOffBox() {
  const box = $('drop-off-box');
  const overlay = $('counter-dropoff');
  const roomDrop = $('room-dropoff');
  const armedItem = state.deliveryReadyId
    ? state.inventory.find(x => x.id === state.deliveryReadyId && x.state === 'finished')
    : null;
  if (armedItem) {
    if (box) box.classList.add('armed');
    if (overlay) overlay.classList.add('armed');
    if (roomDrop) roomDrop.classList.add('armed');
    const ticket = state.pendingTickets.find(t => t.id === armedItem.ticketId);
    if ($('drop-off-hint')) {
      $('drop-off-hint').textContent = ticket
        ? `Order #${ticket.orderNumber} — tap to deliver`
        : 'tap to deliver';
    }
    if (overlay) {
      overlay.title = ticket
        ? `Drop off Order #${ticket.orderNumber}`
        : 'Drop off the selected finished order';
    }
    if (roomDrop) {
      roomDrop.title = ticket
        ? `Drop off Order #${ticket.orderNumber}`
        : 'Drop off the selected finished order';
    }
  } else {
    if (box) box.classList.remove('armed');
    if (overlay) {
      overlay.classList.remove('armed');
      overlay.title = 'Tap a finished order on the counter first';
    }
    if (roomDrop) {
      roomDrop.classList.remove('armed');
      roomDrop.title = 'Tap a finished order on the counter first';
    }
    if ($('drop-off-hint')) $('drop-off-hint').textContent = 'tap a finished order first';
    state.deliveryReadyId = null;
  }
}

function handleDropOffClick() {
  const armedItem = state.deliveryReadyId
    ? state.inventory.find(x => x.id === state.deliveryReadyId && x.state === 'finished')
    : null;
  if (!armedItem) {
    showToast('Pick up a finished order from the counter first.');
    audioBeep(200, 0.06);
    return;
  }
  state.deliveryReadyId = null;
  refreshDropOffBox();
  audioBeep(540, 0.08); audioBeep(720, 0.10);
  deliverFinishedItem(armedItem);
}

function showOrderDescription(item) {
  const ticket = state.pendingTickets.find(t => t.id === item.ticketId);
  const m = item.material;
  const ht = item.htMods || HEAT_TREAT_OUTCOMES.raw;
  const stageWord = {
    raw: 'Raw stock — needs heating', heating: 'In the furnace',
    heated: 'Heat-treated — ready for the forge',
    forging: 'On the anvil', finished: 'Forged — ready to deliver'
  }[item.state] || item.state;

  let liveStats = '';
  if (item.state === 'heated' || item.state === 'forging' || item.state === 'finished') {
    const t = item.lockedThickness || +state.thickness || 3;
    const d = computeDesign(item, t);
    liveStats = `
      <strong style="color:var(--primary);font-family:'Cinzel',serif;letter-spacing:1px;">CURRENT NUMBERS</strong>
      <ul style="margin:4px 0 0;padding-left:20px;font-family:'Special Elite',monospace;font-size:0.88rem;">
        <li>Thickness t = ${t} mm</li>
        <li>Strength σ = ${d.strength} MPa</li>
        <li>Weight W = ${d.weight} g/cm²</li>
        <li>Cost = $${d.cost}</li>
        <li>Ductility ε_f = ${d.ductility}</li>
      </ul>`;
  }

  $('order-modal-title').textContent = ticket ? `Order #${ticket.orderNumber}` : 'Order #—';
  $('order-modal-body').innerHTML = `
    <div style="margin-bottom:10px;">
      <div style="font-family:'Cinzel',serif;font-size:1.15rem;color:var(--primary);letter-spacing:1px;">${ticket ? ticket.customerName : 'Unknown customer'}</div>
      <div style="font-size:0.78rem;color:var(--text-soft);text-transform:uppercase;letter-spacing:1.5px;">${ticket ? (ticket.jobTitle || ticket.type) : '—'} · Reward $${ticket ? ticket.reward : 0}</div>
    </div>
    <p style="font-family:'Crimson Text',Georgia,serif;font-size:1rem;line-height:1.55;margin:0 0 10px;">${ticket ? ticket.text : '(brief lost)'}</p>
    <div style="background:rgba(255,255,255,0.55);border:2px solid var(--text-soft);border-radius:6px;padding:10px;margin-bottom:8px;">
      <strong style="font-family:'Cinzel',serif;letter-spacing:1.5px;color:var(--ink);">REQUIREMENTS</strong>
      <div style="margin-top:4px;font-size:0.92rem;">${ticket ? formatConstraints(ticket.constraints) : '—'}</div>
    </div>
    <div style="background:rgba(255,255,255,0.4);border-left:4px solid var(--secondary);padding:8px 10px;border-radius:4px;margin-bottom:8px;">
      <div style="font-family:'Cinzel',serif;font-size:0.78rem;letter-spacing:1.5px;color:var(--primary);">CURRENT STATE</div>
      <div style="font-family:'Special Elite',monospace;font-size:0.92rem;margin-top:2px;">${m.emoji} ${m.name} · ${ht.name} · <em>${stageWord}</em></div>
    </div>
    ${liveStats}`;
  openModal('modal-order');
}

function onTrayItemClick(item) {
  state.selectedInvId = item.id;
  if (item.state === 'raw' || item.state === 'heating') {
    state.heatingItem = item;
    item.state = 'heating';
    state.deliveryReadyId = null;
    switchTab('melt');
  } else if (item.state === 'heated') {
    state.designItem = item;
    state.thickness = 3;
    state.simulatedDesign = null;
    state.deliveryReadyId = null;
    switchTab('forge');
  } else if (item.state === 'finished') {
    if (state.deliveryReadyId === item.id) {
      // Second tap on the same armed order → deliver immediately (no need to
      // hunt for the drop-off box; clicking the order a second time also works).
      state.deliveryReadyId = null;
      refreshDropOffBox();
      renderTray();
      audioBeep(540, 0.08); audioBeep(720, 0.10);
      deliverFinishedItem(item);
      return; // skip the renderTray() at the bottom
    } else {
      state.deliveryReadyId = item.id;
      const ticket = state.pendingTickets.find(t => t.id === item.ticketId);
      showToast(`Order #${ticket ? ticket.orderNumber : '—'} picked up — tap the DROP-OFF BOX or tap this order again to deliver.`);
      switchTab('lobby');
    }
    refreshDropOffBox();
  } else if (item.state === 'forging') {
    state.designItem = item;
    switchTab('forge');
  }
  renderTray();
}

// ═══════════════════════════════════════════════════════════
// FURNACE (single furnace, phase diagram on the bar itself)
// ═══════════════════════════════════════════════════════════
function renderFurnace() {
  const item = state.heatingItem;
  const fur = $('furnace');
  if (!item) {
    fur.classList.add('empty');
    $('furnace-mat-emoji').textContent = '';
    $('furnace-fill').style.height = '0%';
    $('furnace-temp-text').textContent = '— °C';
    $('furnace-label').textContent = 'No piece loaded';
    $('furnace-zone-target').style.height = '0%';
    $('furnace-zone-overheat').style.height = '0%';
    $('btn-heat').disabled = true;
    setCoolingButtonsEnabled(false);
    $('hold-meter-fill').style.width = '0%';
    $('phase-warnings').innerHTML = '';
    return;
  }
  fur.classList.remove('empty');
  const m = item.material;
  $('furnace-mat-emoji').textContent = m.emoji;
  $('furnace-label').textContent = `${m.name} · ${m.phase.name}`;

  const max = m.phase.max;
  const pct = (t) => clamp((t / max) * 100, 0, 100);

  // green target band (austenite)
  const targetBottom = pct(m.phase.austLo);
  const targetHeight = pct(m.phase.austHi) - pct(m.phase.austLo);
  const z = $('furnace-zone-target');
  z.style.bottom = targetBottom + '%';
  z.style.height = targetHeight + '%';

  // red overheat band
  const overheatBottom = pct(m.phase.overheat);
  const overheatHeight = 100 - overheatBottom;
  const oz = $('furnace-zone-overheat');
  oz.style.bottom = overheatBottom + '%';
  oz.style.height = overheatHeight + '%';

  $('furnace-fill').style.height = pct(item.currentTemp) + '%';
  $('furnace-temp-text').textContent = `${Math.round(item.currentTemp)} °C`;

  $('btn-heat').disabled = false;
  const reachedAust = item.peakTemp >= m.phase.austLo;
  setCoolingButtonsEnabled(reachedAust);

  $('hold-meter-fill').style.width = clamp((item.holdInAustenite / state.holdRequired) * 100, 0, 100) + '%';

  const warn = $('phase-warnings'); warn.innerHTML = '';
  if (item.hadOverheat) {
    const w = document.createElement('div'); w.className = 'warn-strip';
    w.textContent = '⚠️ Grain growth detected — part will be brittle.';
    warn.appendChild(w);
  }
  if (item.holdInAustenite >= state.holdRequired && !item.hadOverheat) {
    const w = document.createElement('div'); w.className = 'warn-strip';
    w.style.background = '#d4f5e9'; w.style.borderLeftColor = 'var(--pass)'; w.style.color = '#1e6b4d';
    w.textContent = '✓ Phase transformation complete. Ready to cool.';
    warn.appendChild(w);
  }
}

function setCoolingButtonsEnabled(en) {
  $('btn-quench').disabled = !en;
  $('btn-air').disabled = !en;
  $('btn-anneal').disabled = !en;
}

// HOLD-TO-HEAT
function bindHeatButton() {
  const btn = $('btn-heat');
  const start = (e) => { e.preventDefault?.(); if (!btn.disabled) startHeating(); };
  const stop = () => stopHeating();
  btn.addEventListener('mousedown', start);
  btn.addEventListener('mouseup', stop);
  btn.addEventListener('mouseleave', stop);
  btn.addEventListener('touchstart', start, { passive: false });
  btn.addEventListener('touchend', stop);
  btn.addEventListener('touchcancel', stop);
}

function startHeating() {
  if (!state.heatingItem) return;
  state.heatingHeld = true;
  if (state.heatLoop) return;
  state.heatLoop = setInterval(heatTick, 100);
  audioBeep(220, 0.05);
}
function stopHeating() { state.heatingHeld = false; }

function heatTick() {
  if (state.paused) return;
  const item = state.heatingItem;
  if (!item) { clearInterval(state.heatLoop); state.heatLoop = null; return; }
  const m = item.material;
  if (state.heatingHeld) {
    const headroom = m.phase.max - item.currentTemp;
    const dT = clamp(headroom * 0.028, 4, 40);
    item.currentTemp += dT;
  } else {
    item.currentTemp += (m.phase.ambient - item.currentTemp) * 0.015;
  }
  item.currentTemp = clamp(item.currentTemp, m.phase.ambient, m.phase.max);
  item.peakTemp = Math.max(item.peakTemp, item.currentTemp);

  if (item.currentTemp >= m.phase.austLo && item.currentTemp <= m.phase.austHi) {
    item.holdInAustenite += 0.1;
  }
  if (item.currentTemp >= m.phase.overheat && !item.hadOverheat) {
    item.hadOverheat = true;
    showToast('⚠️ Overheated — grain growth!');
    audioBeep(180, 0.2);
  }
  renderFurnace();
}

function showMicroPopup(out) {
  const pop = $('micro-popup');
  if (!pop) return;
  $('mp-title').textContent = out.name;
  $('mp-desc').textContent = out.desc;
  const dY = out.yieldMult, dD = out.ductMult;
  const yEl = $('mp-yield'), dEl = $('mp-duct');
  yEl.textContent = `×${dY}`;
  dEl.textContent = `×${dD}`;
  yEl.className = 'mp-mod-value ' + (dY > 1.05 ? 'good' : dY < 0.95 ? 'bad' : 'neutral');
  dEl.className = 'mp-mod-value ' + (dD > 1.05 ? 'good' : dD < 0.95 ? 'bad' : 'neutral');
  pop.classList.remove('show');
  // restart the CSS animation by forcing a reflow
  void pop.offsetWidth;
  pop.classList.add('show');
  clearTimeout(showMicroPopup._t);
  showMicroPopup._t = setTimeout(() => pop.classList.remove('show'), 1000);
}

function applyCooling(method) {
  const item = state.heatingItem; if (!item) return;
  const m = item.material;
  const sufficientHold = item.holdInAustenite >= state.holdRequired;
  const reachedAust = item.peakTemp >= m.phase.austLo;
  if (!reachedAust) { showToast('Reach the austenite zone first.'); return; }

  let outcomeKey = 'raw';
  if (m.type === 'composite') {
    outcomeKey = sufficientHold ? 'cured' : 'raw';
  } else if (item.hadOverheat) {
    outcomeKey = 'burnt';
  } else if (m.type === 'nonferrous') {
    if (method === 'quench') outcomeKey = 'solutioned';
    else if (method === 'air') outcomeKey = 'pearlite';
    else if (method === 'anneal') outcomeKey = 'ferrite';
  } else {
    if (method === 'quench') outcomeKey = 'martensite';
    else if (method === 'air')      outcomeKey = 'pearlite';
    else if (method === 'anneal')   outcomeKey = 'ferrite';
  }

  const out = HEAT_TREAT_OUTCOMES[outcomeKey];
  item.microstructure = outcomeKey;
  item.htMods = out;
  item.currentTemp = method === 'quench' ? m.phase.ambient : m.phase.ambient + 50;
  item.holdInAustenite = 0;
  item.state = 'heated';

  showMicroPopup(out);
  showToast(`${out.name} formed. Send to forge.`);
  audioBeep(method === 'quench' ? 320 : 220, 0.2);
  state.heatingItem = null;
  renderFurnace(); renderTray();
}

// ═══════════════════════════════════════════════════════════
// FORGE — design panel + simulate, then anvil
// ═══════════════════════════════════════════════════════════
function renderForge() {
  const item = state.designItem;
  if (!item) {
    $('forge-empty-msg').style.display = 'flex';
    $('forge-active').style.display = 'none';
    $('anvil-empty').style.display = 'flex';
    $('anvil-active').style.display = 'none';
    return;
  }
  $('forge-empty-msg').style.display = 'none';
  $('forge-active').style.display = 'flex';

  const m = item.material;
  const ticket = state.pendingTickets.find(t => t.id === item.ticketId);
  $('design-mat-emoji').textContent = m.emoji;
  $('design-mat-name').textContent = `${m.name} · ${HEAT_TREAT_OUTCOMES[item.microstructure || 'raw'].name}`;
  $('design-mat-stats').innerHTML = `σ_y=${m.yieldStrength} · ρ=${m.density} · ε_f=${m.ductility} · k_HT=×${item.htMods.yieldMult.toFixed(2)}/${item.htMods.ductMult.toFixed(2)}`;
  $('design-ticket').innerHTML = ticket
    ? `<strong>${ticket.customerName} · ${ticket.jobTitle || ticket.type}:</strong><br>${formatConstraints(ticket.constraints)}`
    : '<em>(no ticket)</em>';
  $('thickness-slider').value = state.thickness;
  $('thickness-value').textContent = state.thickness;
  refreshEquationDisplay();

  // anvil panel
  if (state.forgingItem) {
    $('anvil-empty').style.display = 'none';
    $('anvil-active').style.display = 'flex';
    $('btn-to-anvil').style.display = 'none';
    if (IS_MOBILE) {
      $('anvil-mode-desktop').style.display = 'none';
      $('anvil-mode-mobile').style.display = 'block';
      $('anvil-prompt').textContent = '📱 SHAKE WHEN MARKER HITS GREEN';
    } else {
      $('anvil-mode-desktop').style.display = 'block';
      $('anvil-mode-mobile').style.display = 'none';
      $('anvil-prompt').textContent = 'TAP / SPACE WHEN MARKER HITS GREEN';
    }
    updateAnvilUI();
  } else {
    $('anvil-empty').style.display = 'flex';
    $('anvil-active').style.display = 'none';
  }
}

function refreshEquationDisplay() {
  const item = state.designItem; if (!item) return;
  const t = +state.thickness;
  const d = computeDesign(item, t);
  $('eq-strength').textContent = `${d.strength} MPa`;
  $('eq-weight').textContent   = `${d.weight} g/cm²`;
  $('eq-cost').textContent     = `$${d.cost}`;
  $('eq-duct').textContent     = `${d.ductility}`;
  $('eq-thermal').textContent  = `${d.thermalLimit} °C`;
}

$('thickness-slider').addEventListener('input', e => {
  state.thickness = +e.target.value;
  $('thickness-value').textContent = state.thickness;
  refreshEquationDisplay();
  state.simulatedDesign = null;
  $('btn-to-anvil').style.display = 'none';
  $('btn-continue-anyway').style.display = 'none';
  $('sim-results').innerHTML = 'Thickness changed — re-run the simulation.';
});
$('thick-minus').onclick = () => { changeThickness(-0.5); };
$('thick-plus').onclick  = () => { changeThickness(+0.5); };
function changeThickness(d) {
  state.thickness = clamp(+(state.thickness + d).toFixed(1), 1, 12);
  $('thickness-slider').value = state.thickness;
  $('thickness-value').textContent = state.thickness;
  refreshEquationDisplay();
  state.simulatedDesign = null;
  $('btn-to-anvil').style.display = 'none';
  $('btn-continue-anyway').style.display = 'none';
}

$('btn-simulate').onclick = runSimulation;
function runSimulation() {
  const item = state.designItem; if (!item) return;
  const ticket = state.pendingTickets.find(t => t.id === item.ticketId); if (!ticket) return;
  const d = computeDesign(item, +state.thickness);
  const ev = evaluateDesign(d, ticket);
  state.simulatedDesign = { design: d, eval: ev };
  animateStressSim(d, ev);
  renderSimResults(d, ev);
  if (ev.pass) {
    $('btn-to-anvil').style.display = 'inline-block';
    $('btn-continue-anyway').style.display = 'none';
  } else {
    $('btn-to-anvil').style.display = 'none';
    $('btn-continue-anyway').style.display = 'inline-block';
  }
  audioBeep(ev.pass ? 540 : 240, 0.12);
}

function renderSimResults(d, ev) {
  const div = $('sim-results');
  let html = ev.pass
    ? '<div class="result-pass">✓ Simulation passed — design meets all constraints.</div>'
    : '<div class="result-fail">✗ Simulation failed — review the breakdown.</div>';
  html += '<ul>';
  ev.checks.forEach(c => {
    html += `<li>${c.ok ? '✅' : '❌'} <strong>${c.label}</strong>: need ${c.want}, got ${c.got}</li>`;
  });
  html += '</ul>';
  if (!ev.pass) html += '<div style="margin-top:4px;font-size:0.78rem;color:var(--text-soft);font-style:italic;">Adjust thickness, scrap and pick a different material — or push through with <strong>Continue Anyway</strong> and risk the grade.</div>';
  div.innerHTML = html;
}

function animateStressSim(d, ev) {
  const cv = $('sim-canvas');
  const ctx = cv.getContext('2d');
  // honor displayed size for crisp drawing
  const W = cv.width = cv.clientWidth || 600;
  const H = cv.height = 180;
  let frame = 0;
  const totalFrames = 60;
  const failureFrame = ev.pass ? Infinity : 38 + Math.floor(Math.random() * 14);
  cancelAnimationFrame(animateStressSim._raf);

  function tick() {
    frame++;
    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const barW = Math.min(380, W * 0.6);
    const barH = clamp(d.thickness * 5, 14, 60);
    const t = Math.min(frame, failureFrame) / totalFrames;
    let bend = t * 22;
    let fractured = false, fractureX = null;
    if (frame > failureFrame) { fractured = true; fractureX = cx + (Math.random() - 0.5) * 40; bend = 0; }

    ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - barW/2 - 18, cy - 30); ctx.lineTo(cx - barW/2 - 18, cy + 30);
    ctx.moveTo(cx + barW/2 + 18, cy - 30); ctx.lineTo(cx + barW/2 + 18, cy + 30);
    ctx.stroke();

    ctx.save(); ctx.translate(cx, cy);
    if (!fractured) {
      ctx.fillStyle = ev.pass ? '#3498db' : (frame > failureFrame * 0.7 ? '#e74c3c' : '#e67e22');
      ctx.beginPath();
      ctx.moveTo(-barW/2, -barH/2);
      ctx.quadraticCurveTo(0, -barH/2 + bend, barW/2, -barH/2);
      ctx.lineTo(barW/2, barH/2);
      ctx.quadraticCurveTo(0, barH/2 + bend, -barW/2, barH/2);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-barW/2, -barH/2, barW, barH);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      const fx = fractureX - cx;
      ctx.beginPath();
      ctx.moveTo(fx, -barH/2 - 4); ctx.lineTo(fx + 6, 0); ctx.lineTo(fx - 4, barH/2 + 4);
      ctx.stroke();
    }
    ctx.restore();

    const loadY = cy - 50 - t * 8;
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('▼ APPLIED LOAD', cx, loadY);

    ctx.fillStyle = ev.pass ? '#2ecc71' : '#e74c3c'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`Load: ${Math.round(t * 100)}%   σ vs σ_y`, 10, H - 8);

    if (fractured) {
      ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚠ FRACTURE', cx, 24);
    } else if (frame >= totalFrames && ev.pass) {
      ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('✓ HOLDS', cx, 24);
    }
    if (frame < totalFrames + 10) animateStressSim._raf = requestAnimationFrame(tick);
  }
  tick();
}

function proceedToForge(simWasFailed) {
  if (!state.simulatedDesign) return;
  const item = state.designItem; if (!item) return;
  const extraMm = Math.max(0, +state.thickness - 2);
  const extraCost = Math.round(extraMm * item.material.cost);
  if (state.money < extraCost) {
    showToast('Not enough money to forge that thickness.');
    setTimeout(() => gameOver('Bankrupt — could not afford to finish the order.'), 200);
    return;
  }
  state.money -= extraCost;
  updateHud();
  state.forgingItem = item;
  item.state = 'forging';
  item.lockedThickness = +state.thickness;
  item.forcedDespiteFailure = !!simWasFailed;
  state.forgeStrokes = 0; state.forgeMistakes = 0; state.forgeFractures = 0;
  state.workpieceTemp = item.material.forgeWindow.hot + 50;
  startWorkpieceCooling();
  startTimingLoop();
  randomizeTargetZone();
  // collapse the design panel — anvil takes the stage
  $('workspace-forge').classList.add('forging-active');
  $('workspace-forge').classList.remove('design-open');
  if (IS_MOBILE) ensureMotionPermission();
  renderForge(); renderTray();
  if (simWasFailed) showToast('⚠ Forging anyway — the customer will judge the result.');
}
$('btn-to-anvil').onclick       = () => proceedToForge(false);
$('btn-continue-anyway').onclick = () => proceedToForge(true);

// ═══════════════════════════════════════════════════════════
// FORGING — swipe (desktop) or device motion (mobile)
// ═══════════════════════════════════════════════════════════
function startWorkpieceCooling() {
  if (state.workpieceCoolInterval) clearInterval(state.workpieceCoolInterval);
  state.workpieceCoolInterval = setInterval(() => {
    if (state.paused) return;
    if (!state.forgingItem) { clearInterval(state.workpieceCoolInterval); state.workpieceCoolInterval = null; return; }
    state.workpieceTemp -= 5;
    if (state.workpieceTemp <= 25) state.workpieceTemp = 25;
    updateAnvilUI();
  }, 700);
}

function updateAnvilUI() {
  const item = state.forgingItem; if (!item) return;
  const m = item.material;
  const min = m.phase.ambient, max = m.phase.max;
  const tempPct = clamp(((state.workpieceTemp - min) / (max - min)) * 100, 0, 100);
  $('anvil-temp-fill').style.width = tempPct + '%';
  const zoneLo = clamp(((m.forgeWindow.cold - min) / (max - min)) * 100, 0, 100);
  const zoneHi = clamp(((m.forgeWindow.hot  - min) / (max - min)) * 100, 0, 100);
  $('anvil-temp-zone').style.left  = zoneLo + '%';
  $('anvil-temp-zone').style.width = (zoneHi - zoneLo) + '%';
  $('hammer-progress-fill').style.width = (state.forgeStrokes / state.forgeRequired * 100) + '%';
  $('anvil-glow').classList.toggle('hot', state.workpieceTemp >= m.forgeWindow.cold);
}

// ─── Timing-bar mini-game ─────────────────────────────────
function startTimingLoop() {
  if (state.timingInterval) clearInterval(state.timingInterval);
  state.timingPos = 0; state.timingDir = 1;
  state.timingInterval = setInterval(() => {
    if (state.paused) return;
    if (!state.forgingItem) { stopTimingLoop(); return; }
    state.timingPos += state.timingDir * state.timingSpeed;
    if (state.timingPos >= 100) { state.timingPos = 100; state.timingDir = -1; }
    if (state.timingPos <= 0)   { state.timingPos = 0;   state.timingDir = +1; }
    const ptr = $('timing-pointer');
    if (ptr) ptr.style.left = state.timingPos + '%';
  }, 30);
}
function stopTimingLoop() {
  if (state.timingInterval) { clearInterval(state.timingInterval); state.timingInterval = null; }
}
function randomizeTargetZone() {
  state.targetWidth = 16 + Math.random() * 12;          // 16–28% wide
  state.targetStart = Math.random() * (100 - state.targetWidth);
  // ramp the speed slightly with each successful strike for difficulty
  state.timingSpeed = 2.4 + state.forgeStrokes * 0.45;
  const t = $('timing-target');
  if (t) {
    t.style.left = state.targetStart + '%';
    t.style.width = state.targetWidth + '%';
  }
}

// Single entry point for both desktop tap and mobile shake.
function attemptHammerStroke() {
  if (state.paused) return;
  const item = state.forgingItem; if (!item) return;
  if (state.forgeStrokes >= state.forgeRequired) return;
  const m = item.material;

  const tooCold = state.workpieceTemp < m.forgeWindow.cold;
  const inZone = state.timingPos >= state.targetStart &&
                 state.timingPos <= state.targetStart + state.targetWidth;
  const r = anvil.getBoundingClientRect();
  const sx = r.left + r.width / 2;
  const sy = r.top  + r.height / 2;

  if (tooCold) {
    flashMiss('TOO COLD');
    audioBeep(200, 0.08);
    $('hammer-feedback').textContent = `❄ Too cold — re-heat to forge.   ${state.forgeStrokes}/${state.forgeRequired}`;
    return;
  }
  if (inZone) {
    state.forgeStrokes++;
    state.workpieceTemp += 2;
    spawnSpark(sx, sy);
    audioBeep(440, 0.08);
    flashMiss('PERFECT');
    $('hammer-feedback').textContent = `🔨 Clean strike!   ${state.forgeStrokes}/${state.forgeRequired}`;
    randomizeTargetZone();
  } else {
    state.forgeMistakes++;
    state.workpieceTemp -= 8;
    audioBeep(220, 0.1);
    flashMiss('MISS');
    $('hammer-feedback').textContent = `✗ Off-target — metal bruised.   ${state.forgeStrokes}/${state.forgeRequired}`;
  }
  updateAnvilUI();
  if (state.forgeStrokes >= state.forgeRequired) setTimeout(finishForging, 350);
}

// ─── Desktop: tap the anvil (or press SPACE) ──────────────
const anvil = $('visual-anvil');
function attachAnvilDesktop() {
  anvil.addEventListener('pointerdown', e => {
    e.preventDefault();
    attemptHammerStroke();
  });
}
attachAnvilDesktop();
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && state.forgingItem) {
    e.preventDefault();
    attemptHammerStroke();
  }
});

// ─── Mobile: shake the phone like a hammer (motion sensor) ─
async function ensureMotionPermission() {
  if (state.motionEnabled) return;
  const need = typeof DeviceMotionEvent !== 'undefined' &&
               typeof DeviceMotionEvent.requestPermission === 'function';
  try {
    if (need) {
      const r = await DeviceMotionEvent.requestPermission();
      if (r !== 'granted') { showToast('Motion denied — tap the anvil instead.'); return; }
    }
    enableMotionListener();
  } catch (err) {
    // permission requires a user gesture — re-arm on next anvil tap
    const onceOnTap = async () => {
      anvil.removeEventListener('touchstart', onceOnTap);
      try {
        if (need) {
          const r = await DeviceMotionEvent.requestPermission();
          if (r === 'granted') enableMotionListener();
        } else enableMotionListener();
      } catch {}
    };
    anvil.addEventListener('touchstart', onceOnTap, { once: true, passive: true });
  }
}

function enableMotionListener() {
  if (state.motionEnabled) return;
  state.motionEnabled = true;
  showToast('📱 Motion on — shake when the marker hits the green!');
  let lastShake = 0;
  window.addEventListener('devicemotion', e => {
    if (!state.forgingItem) return;
    const a = e.acceleration || e.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    const now = performance.now();
    // a hammer-like shake gates the strike; the green-zone check happens inside
    if (mag > 14 && now - lastShake > 320) {
      lastShake = now;
      attemptHammerStroke();
    }
  });
}

function flashMiss(text) {
  const m = document.createElement('div');
  m.className = 'miss-text'; m.textContent = text;
  anvil.appendChild(m);
  setTimeout(() => m.remove(), 700);
}

function spawnSpark(x, y) {
  const r = anvil.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.textContent = ['✨', '⭐', '🟡'][Math.floor(Math.random() * 3)];
    s.style.left = clamp(x - r.left, 10, r.width - 10) + 'px';
    s.style.top  = clamp(y - r.top,  10, r.height - 10) + 'px';
    s.style.setProperty('--dx', ((Math.random() - 0.5) * 120) + 'px');
    s.style.setProperty('--dy', (-Math.random() * 80) + 'px');
    anvil.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }
}

function finishForging() {
  const item = state.forgingItem; if (!item) return;
  if (state.workpieceCoolInterval) { clearInterval(state.workpieceCoolInterval); state.workpieceCoolInterval = null; }
  stopTimingLoop();
  if (state.forgeFractures > 0) {
    const penalty = 1 - (0.06 * state.forgeFractures);
    item.htMods = {
      yieldMult: item.htMods.yieldMult * penalty,
      ductMult: item.htMods.ductMult * (penalty * penalty),
      name: item.htMods.name + ' (cracked)',
      desc: item.htMods.desc
    };
  }
  item.state = 'finished';
  state.forgingItem = null;
  state.designItem = null;
  // restore the design panel for the next piece
  $('workspace-forge').classList.remove('forging-active', 'design-open');
  showToast('🔨 Part forged — deliver from the tray!');
  audioBeep(660, 0.2);
  renderForge(); renderTray();
}

// design panel slide-in/slide-out tab handle
$('design-handle').addEventListener('click', () => {
  $('workspace-forge').classList.toggle('design-open');
});

// ═══════════════════════════════════════════════════════════
// DELIVERY
// ═══════════════════════════════════════════════════════════
let lastGradeContext = null;

function deliverFinishedItem(item) {
  const ticket = state.pendingTickets.find(t => t.id === item.ticketId);
  if (!ticket) { showToast('No matching ticket.'); return; }
  const d = computeDesign(item, item.lockedThickness || +state.thickness || 3);
  const ev = evaluateDesign(d, ticket);
  showGradeModal(item, ticket, d, ev);
}

function pickGradeRabbit(letter, character) {
  const ch = character || 'rabbit';
  if (letter === 'A' || letter === 'B') return characterImage(ch, 'happy');
  if (letter === 'D' || letter === 'F') return characterImage(ch, 'upset');
  return characterImage(ch, 'regular'); // C
}

// Strict scoring: any visible mistake drops below A.
// Returns { score 0..100, letter A|B|C|D|F (skipping E), issues[] }.
function computeGradeAndScore(item, design, ev) {
  let score = 100;
  const issues = [];

  ev.checks.forEach(c => {
    if (c.ok) return;
    const wantNum = parseFloat(String(c.want).replace(/[^0-9.\-]/g, ''));
    const gotNum  = parseFloat(String(c.got ).replace(/[^0-9.\-]/g, ''));
    const isMin = String(c.want).includes('≥');
    let pctMiss = 0;
    if (Number.isFinite(wantNum) && wantNum > 0 && Number.isFinite(gotNum)) {
      pctMiss = isMin
        ? Math.max(0, (wantNum - gotNum) / wantNum * 100)
        : Math.max(0, (gotNum - wantNum) / wantNum * 100);
    }
    const deduction = 20 + Math.min(50, pctMiss);
    score -= deduction;
    issues.push(`${c.label} off by ${pctMiss.toFixed(1)}% (−${Math.round(deduction)})`);
  });

  if (state.forgeFractures > 0) {
    const ded = state.forgeFractures * 10;
    score -= ded;
    issues.push(`${state.forgeFractures} micro-fracture${state.forgeFractures>1?'s':''} from over-hard hammering (−${ded})`);
  }
  if (state.forgeMistakes > 0) {
    const ded = state.forgeMistakes * 5;
    score -= ded;
    issues.push(`${state.forgeMistakes} weak strike${state.forgeMistakes>1?'s':''} (−${ded})`);
  }
  if (item.forcedDespiteFailure) {
    score -= 10;
    issues.push('Forged despite failed simulation (−10)');
  }

  score = Math.max(0, Math.min(100, score));
  let letter;
  if      (score >= 97) letter = 'A';
  else if (score >= 85) letter = 'B';
  else if (score >= 72) letter = 'C';
  else if (score >= 55) letter = 'D';
  else                  letter = 'F';
  return { score: Math.round(score), letter, issues };
}

const REWARD_SCALE = { A: 1.0, B: 0.85, C: 0.6, D: 0.3, F: 0 };
const REP_DELTA    = { A: +6,  B: +3,   C: 0,   D: -4, F: -8 };

function showGradeModal(item, ticket, d, ev) {
  lastGradeContext = { item, ticket, design: d, eval: ev };
  const grade = computeGradeAndScore(item, d, ev);
  lastGradeContext.grade = grade;

  const stamp = $('grade-stamp');
  const detail = $('grade-detail');
  stamp.textContent = grade.letter;

  const colorMap = {
    A: 'var(--money)', B: 'var(--money)',
    C: 'var(--warn)',
    D: 'var(--fail)', F: 'var(--fail)'
  };
  stamp.style.color = colorMap[grade.letter];
  stamp.style.borderColor = colorMap[grade.letter];

  const title = (grade.letter === 'A' || grade.letter === 'B')
    ? '✓ DELIVERY ACCEPTED'
    : grade.letter === 'C' ? '~ DELIVERY MARGINAL'
    : '✗ DELIVERY REJECTED';
  $('grade-title').textContent = title;

  const checks = ev.checks.map(c => `<li>${c.ok ? '✅' : '❌'} ${c.label}: ${c.got} (need ${c.want})</li>`).join('');
  const issuesBlock = grade.issues.length
    ? `<div class="grade-issues"><strong>Score breakdown — ${grade.score}/100</strong><ul>${grade.issues.map(i => `<li>${i}</li>`).join('')}</ul></div>`
    : `<div class="grade-issues"><strong>Score: ${grade.score}/100</strong> — flawless work, smith.</div>`;

  const reward = Math.round(ticket.reward * (REWARD_SCALE[grade.letter] || 0));
  const repDelta = REP_DELTA[grade.letter] || 0;

  // Big, prominent EARNED block — visible whether the order passes or fails.
  const earnedBlock = `
    <div class="grade-earnings ${ev.pass ? '' : 'failed'}">
      <div class="ge-label">${ev.pass ? 'EARNED' : 'NO PAYMENT'}</div>
      <div class="ge-amount">${ev.pass ? `$${reward}` : '$0'}</div>
      <div class="ge-rep">Reputation ${repDelta >= 0 ? '+' : ''}${repDelta}${ev.pass && reward !== ticket.reward ? `  ·  asked $${ticket.reward}` : ''}</div>
    </div>`;

  if (ev.pass) {
    detail.innerHTML = `
      <div><strong>${ticket.customerName}</strong> takes the part.</div>
      <ul style="margin:6px 0 0;padding-left:18px;">${checks}</ul>
      ${issuesBlock}
      ${earnedBlock}`;
    $('btn-negotiate').style.display = 'none';
    $('btn-autopsy').style.display   = 'none';
    completeTicket(item, ticket, reward, repDelta);
  } else {
    const note = item.forcedDespiteFailure
      ? '<div style="margin-top:6px;font-size:0.95rem;color:var(--fail);font-style:italic;">You forged it despite a failed simulation — that prediction was correct.</div>'
      : '';
    detail.innerHTML = `
      <div><strong>${ticket.customerName}</strong> is unhappy:</div>
      <ul style="margin:6px 0 0;padding-left:18px;">${checks}</ul>
      ${issuesBlock}
      ${note}
      ${earnedBlock}
      <div style="margin-top:8px;font-size:0.95rem;color:var(--text-soft);">Negotiate to justify the trade-off, or take the autopsy and the rep hit.</div>`;
    $('btn-negotiate').style.display = '';
    $('btn-autopsy').style.display   = '';
  }
  $('grade-rabbit').src = pickGradeRabbit(grade.letter, ticket && ticket.character);
  openModal('modal-grade');
}

function completeTicket(item, ticket, payment, repDelta) {
  state.money += payment;
  state.reputation = clamp(state.reputation + repDelta, 0, 100);
  state.served++; state.totalServed++;
  state.inventory = state.inventory.filter(x => x !== item);
  state.pendingTickets = state.pendingTickets.filter(t => t !== ticket);
  flashCounterMood('happy', ticket && ticket.character);
  updateHud(); renderTray();
  checkBankruptcy();
}

// briefly swap the lobby customer portrait to a mood image when something happens.
// Uses whatever character is currently at the counter (or stored on the ticket).
function flashCounterMood(mood, character) {
  const img = document.getElementById('customer-image');
  if (!img) return;
  const ch = character || (state.customer && state.customer.character) || 'rabbit';
  const original = img.src;
  if (mood === 'happy' || mood === 'upset') img.src = characterImage(ch, mood);
  setTimeout(() => { img.src = original; }, 1400);
}

function failTicket(item, ticket, repDelta = -8) {
  state.reputation = clamp(state.reputation + repDelta, 0, 100);
  state.served++; state.totalServed++;
  state.inventory = state.inventory.filter(x => x !== item);
  state.pendingTickets = state.pendingTickets.filter(t => t !== ticket);
  flashCounterMood('upset', ticket && ticket.character);
  updateHud(); renderTray();
  checkBankruptcy();
}

$('btn-grade-close').onclick = () => {
  // if it failed and player did neither negotiate nor autopsy, take the rep hit now
  if (lastGradeContext && !lastGradeContext.eval.pass && !lastGradeContext.resolved) {
    failTicket(lastGradeContext.item, lastGradeContext.ticket);
    lastGradeContext.resolved = true;
  }
  closeModal('modal-grade');
};

$('btn-autopsy').onclick = async () => {
  if (!lastGradeContext) return;
  const { item, ticket, design, eval: ev } = lastGradeContext;
  failTicket(item, ticket);
  lastGradeContext.resolved = true;
  closeModal('modal-grade');
  showAutopsy(item, design, ticket, ev);
};

$('btn-negotiate').onclick = async () => {
  if (!lastGradeContext) return;
  const { item, ticket, design, eval: ev } = lastGradeContext;
  closeModal('modal-grade');
  const accepted = await offerNegotiation(item, ticket, design, ev);
  if (accepted) {
    lastGradeContext.resolved = true;
  } else {
    // negotiation failed → autopsy + reputation hit
    failTicket(item, ticket);
    lastGradeContext.resolved = true;
    showAutopsy(item, design, ticket, ev);
  }
};

// ═══════════════════════════════════════════════════════════
// NEGOTIATION
// ═══════════════════════════════════════════════════════════
let negState = null;

function offerNegotiation(item, ticket, design, ev) {
  return new Promise(resolve => {
    negState = {
      item, ticket, design,
      failedConstraints: ev.fail,
      history: [], resolve
    };
    $('neg-title').textContent = `Negotiate with ${ticket.customerName}`;
    const log = $('chat-log'); log.innerHTML = '';
    addChat('system', 'The customer is unhappy. Justify your engineering trade-offs.');
    addChat('customer', firstNegOpening(ticket, ev));
    openModal('modal-negotiate');
    $('chat-input').value = '';
    $('chat-input').focus();
  });
}

function firstNegOpening(ticket, ev) {
  return `Hey — your part misses on ${ev.fail.length} point${ev.fail.length === 1 ? '' : 's'}: ${ev.fail.join('; ')}. Why should I accept this?`;
}

function addChat(role, text) {
  const log = $('chat-log');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

$('btn-send-chat').onclick = sendNegMessage;
$('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendNegMessage(); });

// During negotiation the player can pop open the order brief or the handbook
// without the negotiate modal closing — the order/handbook modals have a
// higher z-index so they paint on top.
$('btn-neg-order').onclick = () => {
  if (negState && negState.item) showOrderDescription(negState.item);
  else showToast('No active order to show.');
};
$('btn-neg-handbook').onclick = () => openModal('modal-handbook');

async function sendNegMessage() {
  if (!negState) return;
  const txt = $('chat-input').value.trim(); if (!txt) return;
  $('chat-input').value = '';
  addChat('player', txt);
  negState.history.push({ role: 'player', text: txt });
  $('chat-thinking').style.display = 'block';
  aiStatusBusy('AI: negotiating…');

  const resp = await negotiate({
    customer: negState.ticket,
    design: { ...negState.design, failedConstraints: negState.failedConstraints },
    history: negState.history,
    playerMessage: txt
  });
  $('chat-thinking').style.display = 'none';
  checkAIStatus();
  addChat('customer', resp.reply);
  negState.history.push({ role: 'customer', text: resp.reply });

  if (resp.decision === 'accept') {
    const reward = Math.round(negState.ticket.reward * (1 - (resp.concession || 0) / 100));
    completeTicket(negState.item, negState.ticket, reward, +2);
    addChat('system', `Accepted at $${reward}.`);
    audioBeep(660, 0.12);
    setTimeout(() => {
      closeModal('modal-negotiate');
      if (negState && negState.resolve) { negState.resolve(true); negState = null; }
    }, 1100);
  } else if (resp.decision === 'reject') {
    addChat('system', 'The customer walked.');
    setTimeout(() => {
      closeModal('modal-negotiate');
      if (negState && negState.resolve) { negState.resolve(false); negState = null; }
    }, 1100);
  }
}

// ═══════════════════════════════════════════════════════════
// AUTOPSY
// ═══════════════════════════════════════════════════════════
async function showAutopsy(item, design, ticket, ev) {
  openModal('modal-autopsy');
  drawStressStrainCurve(item.material, item.htMods, design, ticket);
  $('autopsy-text').textContent = 'Loading analysis…';
  aiStatusBusy('AI: autopsy…');
  const analysis = await getAutopsy({
    material: item.material, design, ticket, failures: ev.fail,
    microstructure: HEAT_TREAT_OUTCOMES[item.microstructure || 'raw'].name
  });
  checkAIStatus();
  $('autopsy-text').textContent = analysis;
}

function drawStressStrainCurve(material, htMods, design, ticket) {
  const cv = $('autopsy-canvas');
  const ctx = cv.getContext('2d');
  const W = cv.width = cv.clientWidth || 700;
  const H = cv.height = 280;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const padL = 60, padR = 30, padT = 30, padB = 50;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();
  ctx.fillStyle = '#000'; ctx.font = '12px sans-serif';
  ctx.fillText('Strain (ε)', padL + plotW/2 - 25, H - 16);
  ctx.save(); ctx.translate(18, padT + plotH/2); ctx.rotate(-Math.PI/2);
  ctx.fillText('Stress σ (MPa)', -40, 0); ctx.restore();

  const sy = material.yieldStrength * htMods.yieldMult;
  const sUlt = material.ultimate * htMods.yieldMult;
  const ef = clamp(material.ductility * htMods.ductMult, 0.005, 0.5);
  const eY = sy / 200000;
  const yMax = sUlt * 1.15;
  const xMax = ef * 1.2;
  const xToPx = (x) => padL + (x / xMax) * plotW;
  const yToPx = (y) => padT + plotH - (y / yMax) * plotH;

  ctx.strokeStyle = '#2980b9'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xToPx(0), yToPx(0));
  ctx.lineTo(xToPx(eY), yToPx(sy));
  for (let i = 1; i <= 30; i++) {
    const x = eY + (ef - eY) * (i / 30);
    const y = sy + (sUlt - sy) * Math.sin((i / 30) * Math.PI / 2);
    ctx.lineTo(xToPx(x), yToPx(y));
  }
  ctx.lineTo(xToPx(ef * 1.05), yToPx(sUlt * 0.75));
  ctx.stroke();

  ctx.strokeStyle = '#27ae60'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, yToPx(sy)); ctx.lineTo(padL + plotW, yToPx(sy)); ctx.stroke();
  ctx.fillStyle = '#27ae60'; ctx.fillText(`σ_y = ${Math.round(sy)} MPa`, padL + plotW - 130, yToPx(sy) - 4);
  ctx.setLineDash([]);

  const reqPerMM = ticket.constraints.minStrength ? (ticket.constraints.minStrength / design.thickness) : null;
  if (reqPerMM != null) {
    ctx.strokeStyle = '#c0392b'; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(padL, yToPx(reqPerMM)); ctx.lineTo(padL + plotW, yToPx(reqPerMM)); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.fillText(`required σ = ${Math.round(reqPerMM)} MPa/mm`, padL + 6, yToPx(reqPerMM) - 4);
    ctx.setLineDash([]);
  }

  const appliedStress = reqPerMM != null ? reqPerMM : sy * 1.1;
  let failStrain;
  if (appliedStress < sy) failStrain = appliedStress / 200000;
  else if (appliedStress < sUlt) {
    const t = (appliedStress - sy) / (sUlt - sy);
    failStrain = eY + (ef - eY) * (Math.asin(t) * 2 / Math.PI);
  } else failStrain = ef;
  const fx = xToPx(failStrain), fy = yToPx(Math.min(appliedStress, sUlt));
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath(); ctx.arc(fx, fy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.font = 'bold 12px sans-serif';
  const verdict = appliedStress > sUlt ? 'BRITTLE FRACTURE' : appliedStress > sy ? 'PLASTIC DEFORMATION' : 'SAFE in stress';
  ctx.fillText(verdict, Math.min(fx + 12, W - 180), fy + 4);
}

// ═══════════════════════════════════════════════════════════
// DAY LOOP
// ═══════════════════════════════════════════════════════════
function startDay() {
  state.timeMinutes = 360;
  state.startMoney = state.money;
  state.startRep = state.reputation;
  state.served = 0;
  if (state.gameInterval) clearInterval(state.gameInterval);
  state.gameInterval = setInterval(gameLoop, 1000);
  updateHud();
  showScreen(null);
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('hud').classList.add('active');
  $('game-ui').classList.add('active');
  switchTab('lobby');
  spawnCustomer();
}

const DAY_END_MIN = 360 + 12 * 60;
const OVERTIME_CAP_SEC = 90;   // hard cap: force-end day after 90 real seconds past close

// True when the player is reading / acting on a delivery review screen — the
// grade summary, negotiation chat, or failure autopsy.  In-game time and
// customer arrivals freeze while one of these is open so the player can read
// and reply without the clock pressuring them.
function isReviewModalOpen() {
  return ['modal-grade','modal-negotiate','modal-autopsy'].some(id => {
    const el = document.getElementById(id);
    return el && el.classList.contains('active');
  });
}

// "Busy" means something the player is *actively* in the middle of and that
// would be ruined by force-closing. Plain inventory (raw / heated / finished
// pieces just sitting on the counter) is NOT busy — those carry into the next
// day so the day always advances on schedule.
function isBusy() {
  if (state.customer) return true;
  if (state.heatingItem || state.forgingItem || state.designItem) return true;
  if (state.deliveryReadyId) return true;            // mid drop-off animation
  if (customerArrivalInProgress) return true;
  if (document.querySelectorAll('.modal-overlay.active').length > 0) return true;
  return false;
}

function gameLoop() {
  if (state.tutorialActive || state.paused) return;
  // Freeze the clock and customer flow while the player is on a delivery
  // review screen so they can read/respond without time pressure.
  if (isReviewModalOpen()) { updateHud(); return; }
  if (state.timeMinutes < DAY_END_MIN) {
    // 720 in-game minutes (6 AM → 6 PM) compressed into 180 real seconds.
    // 720 / 180 = 4 in-game minutes per real-time second.
    state.timeMinutes += 4;
    state.overtimeStart = null;
    // periodically nudge a new customer to arrive when none is at the counter
    if (!state.customer && !customerArrivalInProgress && state.timeMinutes % 16 === 0) {
      if (!state.customerSpawnTimer) scheduleNextCustomer(4 + Math.random() * 4);
    }
  }
  if (state.timeMinutes >= DAY_END_MIN) {
    // Day ends the moment the clock hits 6 PM — no overtime grace, no busy
    // check. Anything mid-flight gets gracefully stowed and orders that
    // weren't delivered roll over to the next day's inventory.
    forceCloseDayState();
    endDay();
    return;
  }
  updateHud();
}

// Tear down anything that would block a clean day-rollover. Inventory and
// pending tickets are intentionally preserved so unfinished work resumes
// tomorrow exactly where the player left off.
function forceCloseDayState() {
  state.customer = null;
  state.heatingItem = null;
  state.designItem = null;
  state.forgingItem = null;
  state.simulatedDesign = null;
  state.deliveryReadyId = null;
  if (state.heatLoop)              { clearInterval(state.heatLoop);              state.heatLoop = null; }
  if (state.workpieceCoolInterval) { clearInterval(state.workpieceCoolInterval); state.workpieceCoolInterval = null; }
  if (state.timingInterval)        { clearInterval(state.timingInterval);        state.timingInterval = null; }
  if (state.customerSpawnTimer)    { clearTimeout(state.customerSpawnTimer);     state.customerSpawnTimer = null; }
  ['modal-customer','modal-handbook','modal-mat-info','modal-order'].forEach(id => closeModal(id));
  if (negState && negState.resolve) {
    const r = negState.resolve; negState = null; r(false);
    closeModal('modal-negotiate');
  }
  // Items still in 'heating' or 'forging' aren't physically delivered yet —
  // roll them back so they're picked up cleanly on the next day.
  state.inventory.forEach(it => {
    if (it.state === 'heating') it.state = 'raw';
    if (it.state === 'forging') it.state = 'heated';
  });
  renderLobby();
  if (typeof renderTray === 'function') renderTray();
}

function endDay() {
  if (state.gameInterval) clearInterval(state.gameInterval);
  state.gameInterval = null;
  if (state.customerSpawnTimer) { clearTimeout(state.customerSpawnTimer); state.customerSpawnTimer = null; }
  state.money -= state.dailyRent;
  const dProfit = state.money - state.startMoney;
  const dRep = state.reputation - state.startRep;
  $('day-end-title').textContent = `END OF DAY ${state.day}`;
  $('day-summary').innerHTML = `
    <div class="summary-row"><span>👥 Customers served:</span><strong>${state.served}</strong></div>
    <div class="summary-row"><span>💰 Net profit (after rent):</span><strong>$${dProfit}</strong></div>
    <div class="summary-row"><span>🏠 Rent paid:</span><strong>$${state.dailyRent}</strong></div>
    <div class="summary-row"><span>⭐ Rep change:</span><strong>${dRep >= 0 ? '+' : ''}${dRep}</strong></div>
    <div class="summary-row"><span>💼 Cash on hand:</span><strong>$${state.money}</strong></div>
    <div class="summary-row"><span>⭐ Reputation:</span><strong>${state.reputation}/100</strong></div>
  `;
  $('hud').classList.remove('active');
  $('game-ui').classList.remove('active');
  showScreen('screen-day');
  if (state.money < 0) return gameOver('You went bankrupt.');
  if (state.reputation <= 0) return gameOver('Your reputation collapsed.');
}

$('btn-next-day').onclick = () => {
  state.day++;
  if (state.day > state.maxDays) return gameOver('You completed the contract season!');
  startDay();
};

function gameOver(reason) {
  $('over-title').textContent = state.reputation > 0 && state.money >= 0 ? '🏆 SEASON COMPLETE' : '☠ GAME OVER';
  $('over-text').textContent = `${reason}  Final cash: $${state.money}, reputation: ${state.reputation}/100, customers served: ${state.totalServed}.`;
  $('hud').classList.remove('active');
  $('game-ui').classList.remove('active');
  showScreen('screen-over');
}

$('btn-restart').onclick = () => location.reload();

// ═══════════════════════════════════════════════════════════
// TITLE / HOWTO
// ═══════════════════════════════════════════════════════════
// Wrap a click on a stone-style home button so cracks visibly draw across
// it before the underlying action runs. Falls through immediately if the
// button is missing the .home-btn marker (e.g. plain back buttons).
function crackedClick(el, fn) {
  if (!el || !el.classList.contains('home-btn')) { fn(); return; }
  if (el.classList.contains('cracking')) return;
  el.classList.add('cracking');
  audioBeep(180, 0.08);
  setTimeout(() => audioBeep(120, 0.12), 180);
  setTimeout(() => {
    el.classList.remove('cracking');
    fn();
  }, 600);
}
$('btn-start').onclick    = (e) => crackedClick(e.currentTarget, () => startDay());
$('btn-settings').onclick = (e) => crackedClick(e.currentTarget, () => { renderSettings(); showScreen('screen-settings'); });
$('btn-settings-back').onclick = () => showScreen('screen-title');
$('btn-handbook').onclick = () => openModal('modal-handbook');

function renderSettings() {
  const btn = $('btn-volume-toggle');
  if (!btn) return;
  const on = SETTINGS.soundOn;
  btn.dataset.on = on ? 'true' : 'false';
  btn.classList.toggle('on', on);
  btn.classList.toggle('off', !on);
  btn.querySelector('.toggle-state').textContent = on ? 'ON' : 'OFF';
}
$('btn-volume-toggle').onclick = () => {
  setSoundOn(!SETTINGS.soundOn);
  renderSettings();
  if (SETTINGS.soundOn) audioBeep(660, 0.07);
};

$('btn-main-menu').onclick = () => {
  // Stop all running game loops and return to the title screen.
  if (state.paused) setPaused(false);
  if (state.tutorialActive) {
    TUT.active = false;
    state.tutorialActive = false;
    $('tutorial-overlay').classList.remove('active');
    $('tutorial-spotlight').classList.remove('active');
    $('tutorial-pointer').classList.remove('active');
  }
  if (state.gameInterval)          { clearInterval(state.gameInterval);          state.gameInterval = null; }
  if (state.customerSpawnTimer)    { clearTimeout(state.customerSpawnTimer);     state.customerSpawnTimer = null; }
  if (state.heatLoop)              { clearInterval(state.heatLoop);              state.heatLoop = null; }
  if (state.workpieceCoolInterval) { clearInterval(state.workpieceCoolInterval); state.workpieceCoolInterval = null; }
  if (state.timingInterval)        { clearInterval(state.timingInterval);        state.timingInterval = null; }
  $$('.modal-overlay').forEach(m => m.classList.remove('active'));
  $('hud').classList.remove('active');
  $('game-ui').classList.remove('active');
  showScreen('screen-title');
};

// init
bindHeatButton();
$('drop-off-box').addEventListener('click', handleDropOffClick);
attachDropTarget('furnace',     'furnace');
attachDropTarget('visual-anvil','anvil');
attachDropTarget('drop-off-box','dropoff');
$('btn-quench').onclick = () => applyCooling('quench');
$('btn-air').onclick    = () => applyCooling('air');
$('btn-anneal').onclick = () => applyCooling('anneal');
checkAIStatus();

// ═══════════════════════════════════════════════════════════
// TUTORIAL — guided one-customer walkthrough
// ═══════════════════════════════════════════════════════════
const TUT = {
  active: false,
  step: 0,
  steps: [],
  fakeItem: null,
  fakeTicket: null
};

const TUTORIAL_CUSTOMER = {
  customerName: 'Mr. Hop',
  jobTitle: 'Apprentice Smith',
  emoji: '🎓',
  type: 'tutorial',
  text: "I'm just learning the trade — could you make me a sturdy little bracket? Strong enough to hold weight, but keep the cost reasonable. Nothing fancy.",
  hint: 'Mild Steel will do nicely. Moderate strength, low cost.',
  constraints: { minStrength: 600, maxCost: 200 },
  reward: 150,
  character: 'rabbit'
};

function tutorialSetup() {
  // freeze normal game flow
  state.tutorialActive = true;
  if (state.gameInterval) { clearInterval(state.gameInterval); state.gameInterval = null; }
  if (state.customerSpawnTimer) { clearTimeout(state.customerSpawnTimer); state.customerSpawnTimer = null; }
  if (state.heatLoop) { clearInterval(state.heatLoop); state.heatLoop = null; }
  if (state.workpieceCoolInterval) { clearInterval(state.workpieceCoolInterval); state.workpieceCoolInterval = null; }
  // clean state
  state.day = 1;
  state.money = 200; state.reputation = 50;
  state.served = 0; state.totalServed = 0;
  state.timeMinutes = 360;
  state.customer = null;
  state.pendingTickets = [];
  state.inventory = [];
  state.heatingItem = null;
  state.designItem = null;
  state.forgingItem = null;
  state.simulatedDesign = null;
  state.thickness = 3;
  state.ticketCounter = 1; state.itemCounter = 1;
  // show game UI on lobby
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('hud').classList.add('active');
  $('game-ui').classList.add('active');
  switchTab('lobby');
  updateHud(); renderTray(); renderLobby();
}

function tutorialEnd() {
  TUT.active = false;
  state.tutorialActive = false;
  $('tutorial-overlay').classList.remove('active');
  $('tutorial-spotlight').classList.remove('active');
  $('tutorial-pointer').classList.remove('active');
  // close any open modal
  $$('.modal-overlay').forEach(m => m.classList.remove('active'));
  // clear scripted game state
  state.customer = null;
  state.pendingTickets = [];
  state.inventory = [];
  state.heatingItem = null;
  state.designItem = null;
  state.forgingItem = null;
  state.simulatedDesign = null;
  if (state.heatLoop) { clearInterval(state.heatLoop); state.heatLoop = null; }
  if (state.workpieceCoolInterval) { clearInterval(state.workpieceCoolInterval); state.workpieceCoolInterval = null; }
  if (state.customerSpawnTimer) { clearTimeout(state.customerSpawnTimer); state.customerSpawnTimer = null; }
  // back to title
  $('hud').classList.remove('active');
  $('game-ui').classList.remove('active');
  showScreen('screen-title');
  // reset money/rep so a new shift starts fresh
  state.money = 200; state.reputation = 50;
  state.served = 0; state.totalServed = 0;
  showToast('Tutorial complete — try the real shift!');
}

function tutorialAdvance() {
  TUT.step++;
  if (TUT.step >= TUT.steps.length) { tutorialEnd(); return; }
  tutorialRenderStep();
}

function tutorialRenderStep() {
  const s = TUT.steps[TUT.step];
  if (s.before) {
    try { s.before(); } catch (err) { console.warn('tutorial step setup error', err); }
  }
  // give the DOM a frame to settle (especially after tab switches)
  setTimeout(() => {
    $('tut-step-num').textContent = `Step ${TUT.step + 1} / ${TUT.steps.length}`;
    $('tut-title').textContent = s.title || '';
    $('tut-text').textContent = s.text;
    $('tut-next').textContent = TUT.step === TUT.steps.length - 1 ? 'Finish ✓' : 'Next →';
    positionTutorialUI(s.target);
  }, s.delay || 80);
}

function positionTutorialUI(targetSel) {
  const overlay = $('game-container').getBoundingClientRect();
  const spot = $('tutorial-spotlight');
  const bubble = $('tutorial-bubble');
  const pointer = $('tutorial-pointer');
  const maskTop = $('tut-mask-top');
  const maskBot = $('tut-mask-bottom');
  const maskL = $('tut-mask-left');
  const maskR = $('tut-mask-right');

  let target = null;
  if (targetSel) {
    if (typeof targetSel === 'string') target = document.querySelector(targetSel);
    else target = targetSel;
  }

  if (!target) {
    // no spotlight — center bubble; full dark overlay
    spot.classList.remove('active');
    pointer.classList.remove('active');
    maskTop.style.cssText  = 'top:0;left:0;right:0;bottom:0;';
    maskBot.style.cssText  = 'display:none;';
    maskL.style.cssText    = 'display:none;';
    maskR.style.cssText    = 'display:none;';
    bubble.style.left = '50%';
    bubble.style.top  = '50%';
    bubble.style.transform = 'translate(-50%, -50%)';
    return;
  }
  bubble.style.transform = 'none';

  // Scroll the target into view before reading its position so that elements
  // inside a scrollable workspace report correct viewport coordinates on mobile.
  try { target.scrollIntoView({ block: 'nearest', behavior: 'instant' }); } catch (_) {}

  const r = target.getBoundingClientRect();
  // convert to overlay-relative coords
  const x = r.left - overlay.left;
  const y = r.top - overlay.top;
  const w = r.width;
  const h = r.height;
  const pad = 8;

  spot.classList.add('active');
  spot.style.left = (x - pad) + 'px';
  spot.style.top  = (y - pad) + 'px';
  spot.style.width  = (w + pad * 2) + 'px';
  spot.style.height = (h + pad * 2) + 'px';

  // 4-rect mask around the spotlight
  maskTop.style.cssText  = `top:0;left:0;width:100%;height:${Math.max(0, y - pad)}px;`;
  maskBot.style.cssText  = `top:${y + h + pad}px;left:0;width:100%;bottom:0;`;
  maskL.style.cssText    = `top:${Math.max(0, y - pad)}px;left:0;width:${Math.max(0, x - pad)}px;height:${h + pad * 2}px;`;
  maskR.style.cssText    = `top:${Math.max(0, y - pad)}px;left:${x + w + pad}px;right:0;height:${h + pad * 2}px;`;

  // place bubble — try below first, else above; clamp horizontally
  const bubbleW = Math.min(340, overlay.width - 40);
  bubble.style.maxWidth = bubbleW + 'px';
  // measure after maxWidth so height is current
  const bh = bubble.offsetHeight || 200;
  let bx = x + w / 2 - bubbleW / 2;
  bx = Math.max(16, Math.min(overlay.width - bubbleW - 16, bx));
  let by;
  if (y + h + pad + 24 + bh < overlay.height - 12) {
    by = y + h + pad + 24;
    pointer.style.left = (x + w / 2 - 18) + 'px';
    pointer.style.top  = (y + h + pad + 2) + 'px';
    pointer.textContent = '👆';
  } else if (y - bh - 24 > 12) {
    by = y - bh - 24;
    pointer.style.left = (x + w / 2 - 18) + 'px';
    pointer.style.top  = (y - 36) + 'px';
    pointer.textContent = '👇';
  } else {
    // sidebar fallback
    by = Math.max(12, Math.min(overlay.height - bh - 12, y + h / 2 - bh / 2));
    if (x > overlay.width / 2) {
      bx = Math.max(16, x - bubbleW - 24);
      pointer.style.left = (x - 36) + 'px';
      pointer.textContent = '👉';
    } else {
      bx = Math.min(overlay.width - bubbleW - 16, x + w + 24);
      pointer.style.left = (x + w + 4) + 'px';
      pointer.textContent = '👈';
    }
    pointer.style.top = (y + h / 2 - 18) + 'px';
  }
  bubble.style.left = bx + 'px';
  bubble.style.top  = by + 'px';
  pointer.classList.add('active');
}

function tutorialStart() {
  tutorialSetup();
  // build the script
  const STEEL = MATERIALS.find(m => m.id === 'steel_mild');

  TUT.steps = [
    {
      title: 'Welcome to the Forge', target: null,
      text: "I'll walk you through one full order — pick a material, heat it, forge it, deliver it. You won't be able to fail; just follow along."
    },
    {
      title: 'The Lobby', target: '#customer-slot',
      text: "Customers arrive here at the front counter. Right now it's empty — let's bring one in.",
      before: () => { state.customer = TUTORIAL_CUSTOMER; renderLobby(); }
    },
    {
      title: 'Read the Brief', target: '.intake-brief',
      text: "Here's the apprentice's request. The 'Customer Wants' box lists the engineering constraints — strength, weight, cost, etc.",
      before: () => { openCustomerIntake(); }, delay: 200
    },
    {
      title: 'Pick a Material', target: '#materials-grid',
      text: "Each card looks like the metal it represents — brushed steel, polished aluminum, woven carbon fibre. The numbers are real material properties: σ_y is yield strength, ρ is density, ε_f is ductility. Tap the small brass i in the corner of any card to read more about that material — its uses, forging behaviour, pros and cons."
    },
    {
      title: 'Choose Mild Steel', target: '.material-card[data-mat="steel_mild"]',
      text: "For this order we'll pick AISI 1020 Mild Steel — cheap, strong enough, very ductile."
    },
    {
      title: 'Order in the Tray', target: '#inventory-tray',
      text: "Your work piece is here, marked RAW. The brass medallion shows the order number. Click items to send them between stations.",
      before: () => { acceptOrderWith(TUTORIAL_CUSTOMER, STEEL); state.customer = null; renderLobby(); }
    },
    {
      title: 'Double-Click for Stats', target: '#inventory-tray',
      text: "Double-click (or double-tap on mobile) any piece in the tray to open its order card — you'll see the customer brief, the requirements, and a live readout of how your heat treatment and forging have changed its yield strength, ductility, weight, and cost. Use it to check a part before you deliver."
    },
    {
      title: 'Furnace Time', target: '#furnace',
      text: "Now we head to the FURNACE. The bar shows temperature; the green band is the austenite zone — the phase where the metal can be heat-treated.",
      before: () => {
        state.heatingItem = state.inventory[0];
        state.heatingItem.state = 'heating';
        switchTab('melt');
        renderTray();
      }, delay: 200
    },
    {
      title: 'Heat to Austenite', target: '#btn-heat',
      text: "Hold the heat button to raise the temperature. We'll fast-forward into the green band so you can see what happens.",
      before: () => {
        const it = state.heatingItem; if (!it) return;
        const m = it.material;
        it.currentTemp = (m.phase.austLo + m.phase.austHi) / 2;
        it.peakTemp = it.currentTemp;
        it.holdInAustenite = state.holdRequired;
        renderFurnace();
      }
    },
    {
      title: 'Choose Your Cool', target: '#btn-air',
      text: "Once you've held it in austenite long enough, the cooling buttons unlock. Water = hard brittle martensite. Air = balanced pearlite. Anneal = soft ductile ferrite. We'll Air Cool."
    },
    {
      title: 'On to the Forge', target: '.tab-btn[data-tab="forge"]',
      text: "The piece is now PEARLITE. Click it in the tray to send it to the FORGE for shaping.",
      before: () => {
        applyCooling('air');
        // applyCooling switches tab automatically; stay synced
        const item = state.inventory[0];
        if (item) {
          state.designItem = item;
          state.thickness = 3;
          state.simulatedDesign = null;
          switchTab('forge');
          renderForge();
        }
      }, delay: 250
    },
    {
      title: 'The Equations', target: '.equation-card',
      text: "These are the real engineering relationships. σ = σ_y · k_HT · t means strength scales linearly with thickness. Ductility comes from the heat treatment. Read these — there are no green pass/fail bars to spoon-feed you."
    },
    {
      title: 'Tune the Thickness', target: '#thickness-slider',
      text: "Slide to adjust thickness. We'll set 4 mm — strong enough for the customer's 600 MPa requirement.",
      before: () => {
        state.thickness = 4;
        $('thickness-slider').value = 4;
        $('thickness-value').textContent = '4';
        refreshEquationDisplay();
      }
    },
    {
      title: 'Run the Simulation', target: '#btn-simulate',
      text: "Before you commit, simulate the load. You'll see an animated stress test on the right and a constraint breakdown.",
      before: () => { runSimulation(); }
    },
    {
      title: 'Pass or Continue Anyway', target: '#forge-action-row',
      text: "If the sim passes, ACCEPT and forge. If it fails, you can adjust thickness, scrap and start over — or push through with CONTINUE ANYWAY and risk the grade."
    },
    {
      title: 'To the Anvil', target: '#visual-anvil',
      text: "On desktop, tap the anvil (or press SPACE) the moment the white marker crosses the green band. On mobile, shake the phone instead. Misses bruise the metal; the design panel slid aside — use the 📐 DESIGN tab on the left to peek at the brief while you work. We'll auto-finish the strokes.",
      before: () => { proceedToForge(false); }, delay: 500
    },
    {
      title: 'Forged!', target: '#inventory-tray',
      text: "The piece is now READY TO DELIVER. The brass medallion still shows the order number so you can match it to the customer.",
      before: () => {
        // auto-complete forging cleanly
        if (state.forgingItem) {
          state.forgeStrokes = state.forgeRequired;
          state.forgeFractures = 0;
          state.forgeMistakes = 0;
          finishForging();
        }
      }
    },
    {
      title: 'Deliver and Get Graded', target: '#modal-grade .grade-stamp',
      text: "Delivery opens a grade modal showing the rabbit's reaction (happy = pass, upset = fail), the letter grade, and which constraints you hit. Real games would also offer a Negotiate or Autopsy if the part failed.",
      before: () => {
        const item = state.inventory[0];
        if (item) deliverFinishedItem(item);
      }, delay: 250
    },
    {
      title: "That's the Loop!", target: null,
      text: "Customer → material → heat → cool → design → simulate → forge → deliver → grade. You'll do this for real customers across 5 days. Good luck, smith."
    }
  ];

  TUT.active = true;
  TUT.step = 0;
  $('tutorial-overlay').classList.add('active');
  tutorialRenderStep();
}

$('btn-tutorial').onclick = (e) => crackedClick(e.currentTarget, tutorialStart);
$('tut-next').onclick = tutorialAdvance;
$('tut-skip').onclick = tutorialEnd;

// reposition on resize so the spotlight follows the target
window.addEventListener('resize', () => {
  if (TUT.active) {
    const s = TUT.steps[TUT.step];
    if (s) positionTutorialUI(s.target);
  }
});

// ═══════════════════════════════════════════════════════════
// PAUSE
// ═══════════════════════════════════════════════════════════
function togglePause() {
  if (state.tutorialActive) { showToast('Pause disabled during the tutorial.'); return; }
  setPaused(!state.paused);
}
function setPaused(p) {
  state.paused = p;
  document.body.classList.toggle('paused', p);
  $('pause-overlay').classList.toggle('active', p);
  $('btn-pause').classList.toggle('active-pause', p);
  $('btn-pause').textContent = p ? '▶ Resume' : '⏸ Pause';
  if (p) {
    // freeze the customer-spawn timer too — clearing it is fine, the gameLoop
    // will re-schedule once we resume.
    if (state.customerSpawnTimer) {
      clearTimeout(state.customerSpawnTimer);
      state.customerSpawnTimer = null;
    }
    showToast('⏸ Time paused.');
  } else {
    showToast('▶ Back to work.');
  }
}
$('btn-pause').onclick = togglePause;
$('btn-resume').onclick = () => setPaused(false);

// ═══════════════════════════════════════════════════════════
// MATERIAL INFO (ⓘ button on each material card)
// ═══════════════════════════════════════════════════════════
const MATERIAL_INFO = {
  steel_mild: {
    title: 'AISI 1020 Mild Steel',
    summary: "A low-carbon plain steel — the workhorse of structural fabrication. Cheap, weldable, very forgiving to work.",
    uses: "Beams, rebar, automotive bodies, machine frames, ship plate. Anywhere you need ductility and weldability over raw strength.",
    forging: "Hot-forged at 950–1250 °C. Will not harden much from quenching due to its low carbon content; you can normalize or anneal it but martensite barely forms.",
    pros: "Cheap, ductile, very weldable, easy to machine.",
    cons: "Rusts readily, low yield strength, not for high-temperature service."
  },
  steel_stainless: {
    title: '316L Stainless Steel',
    summary: "An austenitic chromium-nickel-molybdenum stainless. Corrosion-resistant in seawater, body fluids and many acids.",
    uses: "Marine fittings, food and pharma equipment, surgical tools, chemical reactor walls, jewelry posts.",
    forging: "Forge between 1050 °C and 1250 °C. Cannot be hardened by heat treatment — strength comes from cold work. Slow-cooled for maximum corrosion resistance.",
    pros: "Excellent corrosion resistance, retains toughness from cryogenic up to 800 °C, biocompatible.",
    cons: "Expensive, dense, harder to machine, gummy when cutting."
  },
  aluminum: {
    title: 'Aluminum 6061-T6',
    summary: "A precipitation-hardened aluminum alloy (Mg + Si). The T6 temper is solution-treated and artificially aged.",
    uses: "Aircraft skins, bicycle frames, marine hardware, structural extrusions, high-end consumer hardware.",
    forging: "Hot-formed near 480–540 °C. Reheating past about 250 °C will over-age the alloy and ruin its T6 strength.",
    pros: "About 1/3 the density of steel, naturally corrosion-resistant, easy to machine.",
    cons: "Loses strength quickly above 170 °C, fatigue limit lower than steel, galvanic issues with steel fasteners."
  },
  titanium: {
    title: 'Ti-6Al-4V (Grade 5)',
    summary: "An α+β titanium alloy — the most-used titanium alloy in industry, prized for its strength-to-weight and inertness.",
    uses: "Jet engine fan blades and discs, aerospace fasteners, racing bicycle frames, dental and orthopedic implants.",
    forging: "Forge near the β-transus (~1000 °C) for fine grains; faster cool gives higher strength. Avoid contamination from oxygen above ~600 °C — α-case forms and embrittles the surface.",
    pros: "Roughly twice the strength of mild steel at half the density. Biocompatible, almost immune to seawater.",
    cons: "Very expensive raw stock, hard to machine (galls), fire-hazardous as fine chips."
  },
  cfrp: {
    title: 'Carbon-Fibre Reinforced Polymer',
    summary: "Anisotropic composite: woven carbon-fibre cloth in a thermoset epoxy matrix. Strongest along the fibre direction.",
    uses: "Formula-1 chassis, satellite frames, racing bicycle frames, helicopter rotor blades, prosthetics.",
    forging: "Cannot be forged — it's cured in a mould between 130 °C and 170 °C and held there until cross-linking is complete. Overheating burns the resin.",
    pros: "Highest specific strength of any common structural material, near-zero thermal expansion, won't corrode.",
    cons: "Brittle (no plastic deformation), expensive, fails by fibre breakage or matrix cracking, repair is hard."
  }
};

function openMatInfo(matId) {
  const m = MATERIALS.find(x => x.id === matId); if (!m) return;
  const info = MATERIAL_INFO[matId] || { title: m.name, summary: m.desc, uses: '', forging: '', pros: '', cons: '' };
  $('mat-info-title').textContent = info.title;
  const surface = $('mat-info-surface');
  surface.className = 'mat-surface-' + matId;
  surface.id = 'mat-info-surface';
  surface.textContent = m.emoji;
  $('mat-info-body').innerHTML = `
    <div class="props">
      <span>σ_y</span> ${m.yieldStrength} MPa  ·  <span>σ_ult</span> ${m.ultimate} MPa<br>
      <span>ρ</span> ${m.density} g/cm³  ·  <span>ε_f</span> ${m.ductility}<br>
      <span>T_max</span> ${m.thermalLimit} °C  ·  <span>cost</span> $${m.cost}/mm
    </div>
    <p style="margin-top:12px;">${info.summary}</p>
    <h3>Typical uses</h3><p>${info.uses}</p>
    <h3>Forging &amp; heat treatment</h3><p>${info.forging}</p>
    <h3>Pros</h3><p>${info.pros}</p>
    <h3>Cons</h3><p>${info.cons}</p>
  `;
  openModal('modal-mat-info');
}
