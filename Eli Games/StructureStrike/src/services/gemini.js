// [AI] Anthropic Claude API integration for post-simulation engineering reports.
// Key is loaded from VITE_CLAUDE_API_KEY in .env (never committed).

const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
const API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT =
  'You are a dry, precise structural engineer reviewing a student\'s design exercise. ' +
  'Write 2-3 sentences debriefing this simulation. Be specific — reference the element types, ' +
  'stress levels, and failure mode. Speak directly to the student in second person. ' +
  'No bullet points or headers.';

// [AI] Builds a rich engineering debrief prompt from simulation data.
function _buildPrompt(level, structure, simResult, budgetUsed, totalBudget, stars) {
  const survived   = simResult.survived;
  const budgetPct  = Math.round((budgetUsed / totalBudget) * 100);

  // ── Element type distribution ──────────────────────────────────────────────
  const typeCounts = {};
  for (const elem of structure.elements) {
    typeCounts[elem.type] = (typeCounts[elem.type] ?? 0) + 1;
  }
  const typeStr = Object.entries(typeCounts)
    .map(([t, n]) => `${n} ${t}${n !== 1 ? 's' : ''}`)
    .join(', ');

  // ── Stress histogram ───────────────────────────────────────────────────────
  const stresses = Object.values(simResult.elementStressRatios ?? {});
  const hist = { low: 0, medium: 0, high: 0, failed: 0 };
  for (const s of stresses) {
    if      (s > 1.0) hist.failed++;
    else if (s > 0.9) hist.high++;
    else if (s > 0.5) hist.medium++;
    else              hist.low++;
  }
  const histStr = [
    hist.low    ? `${hist.low} well under load (<50% capacity)` : '',
    hist.medium ? `${hist.medium} moderately stressed (50-90%)` : '',
    hist.high   ? `${hist.high} near yield (90-100%)` : '',
    hist.failed ? `${hist.failed} yielded/failed (>100%)` : '',
  ].filter(Boolean).join(', ');

  // ── Failed element types ───────────────────────────────────────────────────
  const failedCounts = {};
  for (const elem of structure.elements) {
    if (simResult.failedElementIds?.has(elem.id)) {
      failedCounts[elem.type] = (failedCounts[elem.type] ?? 0) + 1;
    }
  }
  const failedTypeStr = Object.keys(failedCounts).length
    ? Object.entries(failedCounts).map(([t, n]) => `${n} ${t}${n !== 1 ? 's' : ''}`).join(', ')
    : 'none';

  // ── Failure wave analysis ──────────────────────────────────────────────────
  const waves = simResult.failureSequence ?? [];
  const failureModeStr = (() => {
    if (!waves.length) return 'no element failures recorded';
    if (waves.length === 1) {
      const n = waves[0].length;
      return `single catastrophic event — ${n} element${n !== 1 ? 's' : ''} failed simultaneously`;
    }
    const firstN = waves[0].length;
    return `progressive collapse across ${waves.length} failure waves (first wave took down ${firstN} element${firstN !== 1 ? 's' : ''})`;
  })();

  return [
    `Level: "${level.name}" (${level.threat.label})`,
    `Threat: ${level.threat.description}`,
    `Result: ${survived ? `Survived — ${stars}/3 stars` : 'Collapsed'}`,
    `Budget used: ${budgetPct}% of $${(totalBudget / 1_000).toFixed(0)}k`,
    ``,
    `Structure composition: ${structure.elements.length} elements (${typeStr}), ${structure.nodes.length} nodes`,
    `Stress distribution: ${histStr || 'no data'}`,
    `Failed element types: ${failedTypeStr}`,
    `Failure mode: ${failureModeStr}`,
    simResult.isMechanism ? `Mechanism flag: true — structure had no valid load path to ground.` : '',
  ].filter(Boolean).join('\n');
}

// [AI] Calls Claude and returns a plain-text report string.
// Returns null if no API key is set or the request fails.
// True if a key is configured — lets callers decide whether to show the section at all.
export const AI_REPORT_ENABLED = !!API_KEY;

export async function getSimulationReport(level, structure, simResult, budgetUsed, totalBudget, stars) {
  if (!API_KEY) return null;

  const userMessage = _buildPrompt(level, structure, simResult, budgetUsed, totalBudget, stars);

  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[Claude] API error', res.status, body);
      return null;
    }

    const data = await res.json();
    return data?.content?.[0]?.text?.trim() ?? null;
  } catch (err) {
    console.warn('[Claude] Request failed:', err);
    return null;
  }
}
