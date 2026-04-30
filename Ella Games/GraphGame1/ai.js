// ai.js -- client side helpers that talk to the backend (/api/*)

// fallback pool for when the API is unavailable
const FALLBACK_BY_TYPE = {
  linear:      ['x', '2*x', '-x', 'x + 3', '-2*x + 1', '3*x - 2'],
  polynomial:  ['x^2', '-x^2 + 3', 'x^3', 'x^3 - 3*x', '2*x^2 - 1', '-x^3 + 2*x', '2*x^3'],
  rational:    ['1/x', '-1/x', '1/x^2', 'x/(x^2 + 1)'],
  absolute:    ['abs(x)', 'abs(x) - 2', '-abs(x) + 3', 'abs(x - 1)', '2*abs(x)'],
  exponential: ['exp(x/2)', 'exp(-x)', '2^x', 'exp(x) - 1'],
  sine:        ['sin(x)', 'sin(2*x)', '2*sin(x)', 'sin(x) + 1'],
  cosine:      ['cos(x)', 'cos(2*x)', '-cos(x)', 'cos(x) + 1'],
  signum:      ['sign(x)', '2*sign(x)', 'sign(x) + 1', 'sign(x - 1)']
};

// performance tracking by function category (per game)
let performanceLog = {};
Object.keys(FALLBACK_BY_TYPE).forEach(t => {
  performanceLog[t] = { attempts: 0, totalAccuracy: 0 };
});

let currentCategory = null;
let recentExpressions = [];
let lastFallback = '';

export function reportResult(accuracy) {
  if (!currentCategory || !performanceLog[currentCategory]) return;
  performanceLog[currentCategory].attempts++;
  performanceLog[currentCategory].totalAccuracy += accuracy;
}

export function getPerformanceLog() {
  return JSON.parse(JSON.stringify(performanceLog));
}

export function resetPerformanceLog() {
  performanceLog = {};
  Object.keys(FALLBACK_BY_TYPE).forEach(t => {
    performanceLog[t] = { attempts: 0, totalAccuracy: 0 };
  });
  recentExpressions = [];
}

function getWeakCategories(selectedTypes) {
  const weak = [];
  const types = selectedTypes && selectedTypes.length > 0
    ? selectedTypes
    : Object.keys(performanceLog);
  for (const cat of types) {
    const data = performanceLog[cat];
    if (!data || data.attempts < 2) continue;
    if (data.totalAccuracy / data.attempts < 60) weak.push(cat);
  }
  return weak;
}

export function pickFallback(selectedTypes) {
  const types = selectedTypes && selectedTypes.length > 0
    ? selectedTypes
    : Object.keys(FALLBACK_BY_TYPE);
  const type = types[Math.floor(Math.random() * types.length)];
  const pool = FALLBACK_BY_TYPE[type] || FALLBACK_BY_TYPE.linear;
  let pick = lastFallback;
  while (pick === lastFallback && pool.length > 1) {
    pick = pool[Math.floor(Math.random() * pool.length)];
  }
  lastFallback = pick;
  return pick;
}

// backend calls

export async function getNextFunction(difficulty, selectedTypes) {
  try {
    const resp = await fetch('/api/generate-function', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        difficulty,
        selectedTypes: selectedTypes || [],
        weakCategories: getWeakCategories(selectedTypes),
        recentFunctions: recentExpressions.slice(-5)
      })
    });
    if (!resp.ok) throw new Error('server returned ' + resp.status);
    const data = await resp.json();
    if (!data.expression) throw new Error('no expression in response');

    window.math.parse(data.expression);

    currentCategory = data.category || 'unknown';
    recentExpressions.push(data.expression);
    if (recentExpressions.length > 10) recentExpressions.shift();

    return data;
  } catch (err) {
    console.warn('ai generation unavailable, falling back:', err.message);
    const expr = pickFallback(selectedTypes);
    currentCategory = 'unknown';
    return { expression: expr, category: 'unknown', hint: '' };
  }
}

/**
 * Personalized progression hint.
 * Takes the target, the user's guess history (latest last), their skill level,
 * and the attempt number. Returns a short hint string.
 */
export async function getPersonalizedHint({ target, guesses, skill, attempt, previousHint }) {
  try {
    const resp = await fetch('/api/generate-hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, guesses, skill, attempt, previousHint })
    });
    if (!resp.ok) throw new Error('server returned ' + resp.status);
    const data = await resp.json();
    return (data && data.hint) ? data.hint : '';
  } catch (err) {
    console.warn('hint unavailable:', err.message);
    return localHintFallback({ target, guesses, attempt, previousHint });
  }
}

/**
 * Varied local hint fallback. Samples target and the latest guess at multiple
 * x-values and emits a specific observation. Cycles through different
 * observation kinds across attempts so consecutive hints don't repeat.
 */
function localHintFallback({ target, guesses, attempt, previousHint }) {
  const m = (typeof window !== 'undefined' && window.math) ? window.math : null;
  const last = guesses && guesses.length ? guesses[guesses.length - 1] : null;
  const samples = [-2, -1, -0.5, 0.5, 1, 2];
  const t = {}, u = {};
  if (m) {
    for (const x of samples) {
      try { t[x] = m.evaluate(target, { x }); } catch {}
      if (last) { try { u[x] = m.evaluate(last, { x }); } catch {} }
    }
  }
  const fin = v => Number.isFinite(v);
  const observations = [];

  // sign / parity
  if (fin(t[1]) && fin(t[-1])) {
    if (Math.abs(t[1] - t[-1]) < 1e-6 && Math.abs(t[1]) > 0.1)
      observations.push('The target is symmetric around the y-axis — try an even-powered or absolute-value form.');
    if (Math.abs(t[1] + t[-1]) < 1e-6 && Math.abs(t[1]) > 0.1)
      observations.push('The target flips sign across the y-axis — odd symmetry.');
  }

  if (fin(t[-2]) && fin(t[2])) {
    if (t[2] > t[-2] + 0.3) observations.push('The target rises overall from left to right.');
    else if (t[2] < t[-2] - 0.3) observations.push('The target falls overall from left to right.');
  }
  if (fin(t[-1]) && fin(t[1]) && fin(t[0.5]) && fin(t[-0.5])) {
    const diffs = [t[-1], t[-0.5], t[0.5], t[1]];
    let signChanges = 0;
    for (let i = 1; i < diffs.length - 1; i++) {
      if ((diffs[i] - diffs[i-1]) * (diffs[i+1] - diffs[i]) < 0) signChanges++;
    }
    if (signChanges >= 1) observations.push('The shape wiggles — think periodic (sine/cosine).');
  }

  // amplitude / coefficient
  if (last && fin(t[1]) && fin(u[1])) {
    const r = u[1] === 0 ? Infinity : t[1] / u[1];
    if (Number.isFinite(r)) {
      if (r > 1.6) observations.push('Your curve is too small — multiply by a larger coefficient.');
      else if (r < 0.6 && r > 0) observations.push('Your curve is too large — try a smaller coefficient.');
      else if (r < 0) observations.push('Your curve is the wrong sign — try negating it.');
    }
  }

  // vertical shift
  if (last && fin(t[0]) && fin(u[0])) {
    const d = t[0] - u[0];
    if (Math.abs(d) > 0.6) observations.push(d > 0
      ? `Try shifting the graph up by about ${Math.round(d)}.`
      : `Try shifting the graph down by about ${Math.round(-d)}.`);
  }

  // growth rate
  if (fin(t[2]) && fin(t[1]) && Math.abs(t[1]) > 0.1) {
    const ratio = Math.abs(t[2] / t[1]);
    if (ratio > 4) observations.push('The target grows fast — think exponentials or higher powers.');
    else if (ratio < 1.4 && Math.abs(t[2] - t[1]) > 0.1) observations.push('The change between x=1 and x=2 is small — think gentle growth.');
  }

  // asymptote / undefined regions
  const undefAt0 = !fin(t[0]);
  if (undefAt0) observations.push('The target is undefined near x = 0 — think rational form (1/x).');

  // Generic encouragements only if nothing else and as least preference
  const generic = [
    'Compare the slope at x = -1 vs x = 1.',
    'Check what happens at x = 0 first, then the overall shape.',
    'Look at where the curve crosses zero.',
    'Notice how steep it gets near the edges of the graph.'
  ];

  const seed = (attempt | 0) + (guesses ? guesses.length : 0);
  const pool = observations.length ? observations : generic;
  let pick = pool[seed % pool.length];
  if (pick === previousHint && pool.length > 1) pick = pool[(seed + 1) % pool.length];
  return pick;
}

/**
 * End-of-game analysis. Returns a short/medium review string.
 */
export async function getGameAnalysis(stats) {
  try {
    const resp = await fetch('/api/game-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats)
    });
    if (!resp.ok) throw new Error('server returned ' + resp.status);
    const data = await resp.json();
    return (data && data.analysis) ? data.analysis : '';
  } catch (err) {
    console.warn('analysis unavailable:', err.message);
    return '';
  }
}
