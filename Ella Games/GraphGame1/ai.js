// handles AI function generation and student performance tracking

// fallback in case API isn't working
const FALLBACK_BY_TYPE = {
  linear:      ['x', '2*x', '-x', 'x + 3', '-2*x + 1', '3*x - 2'],
  polynomial:  ['x^2', '-x^2 + 3', 'x^3', 'x^3 - 3*x', '2*x^2 - 1', '-x^3 + 2*x'],
  rational:    ['1/x', '-1/x', '1/x^2', 'x/(x^2 + 1)'],
  absolute:    ['abs(x)', 'abs(x) - 2', '-abs(x) + 3', 'abs(x - 1)', '2*abs(x)'],
  exponential: ['exp(x/2)', 'exp(-x)', '2^x', 'exp(x) - 1'],
  sine:        ['sin(x)', 'sin(2*x)', '2*sin(x)', 'sin(x) + 1'],
  cosine:      ['cos(x)', 'cos(2*x)', '-cos(x)', 'cos(x) + 1'],
  signum:      ['sign(x)', '2*sign(x)', 'sign(x) + 1', 'sign(x - 1)']
};

// performance tracking by type of function
const performanceLog = {};
Object.keys(FALLBACK_BY_TYPE).forEach(t => {
  performanceLog[t] = { attempts: 0, totalAccuracy: 0 };
});

let currentCategory = null;
let recentExpressions = [];
let lastFallback = '';

// called after each student attempt to log accuracy
export function reportResult(accuracy) {
  if (!currentCategory || !performanceLog[currentCategory]) return;
  performanceLog[currentCategory].attempts++;
  performanceLog[currentCategory].totalAccuracy += accuracy;
}

// finds types where the student averages below 60%
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

// picks a random expression from the selected types (fallback when API is down)
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

// asks the backend for the AI generated function
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

    // make sure mathjs can actually parse it
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

export function getPerformanceLog() {
  return { ...performanceLog };
}
