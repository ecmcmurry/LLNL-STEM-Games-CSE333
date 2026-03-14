import { el, formatBudget } from '../ui/components.js';
import { LEVELS } from '../data/levels.js';
import {
  getCurrentLevelIndex, getStructure, getBudgetRemaining, getSimulationResult,
  setCurrentLevel,
} from '../state.js';
import { loadProgress, completeLevel } from '../utils/storage.js';
import { computeStarRating } from '../physics/sim-engine.js';

// [SIMULATION] Results screen shown after a successful simulation.
// Displays star rating, budget breakdown, and a "next level" prompt.
// Returns a cleanup function per the router contract.
export function render(container) {
  container.innerHTML = '';

  const levelIndex = getCurrentLevelIndex();
  const level      = LEVELS[levelIndex];
  const structure  = getStructure();
  const simResult  = getSimulationResult();

  if (!level || !simResult) { location.hash = ''; return () => {}; }

  // ── Compute stars ─────────────────────────────────────────────────────────
  const totalBudget = level.budget;
  const budgetUsed  = totalBudget - getBudgetRemaining();
  const stars       = computeStarRating(
    level, structure.nodes, structure.elements, simResult, budgetUsed, totalBudget,
  );

  // Persist progress
  const progress = completeLevel(levelIndex, stars);
  const nextLevel = LEVELS[levelIndex + 1];
  const nextUnlocked = nextLevel && progress.unlockedLevels.includes(nextLevel.id);

  // ── DOM ───────────────────────────────────────────────────────────────────
  const starsStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);

  const screen = el('div', { class: 'screen screen--results' },
    el('div', { class: 'results-card' },
      el('div', { class: 'results-card__header' },
        el('h2', { class: 'results-title' }, 'Structure Survived'),
        el('div', { class: 'results-stars' }, starsStr),
      ),
      el('div', { class: 'results-breakdown' },
        el('div', { class: 'results-row' },
          el('span', {}, 'Level'),
          el('span', {}, `${level.id + 1} — ${level.name}`),
        ),
        el('div', { class: 'results-row' },
          el('span', {}, 'Threat survived'),
          el('span', {}, level.threat.label),
        ),
        el('div', { class: 'results-row' },
          el('span', {}, 'Budget used'),
          el('span', {}, `${formatBudget(budgetUsed)} / ${formatBudget(totalBudget)}`),
        ),
        el('div', { class: 'results-row' },
          el('span', {}, 'Efficiency'),
          el('span', { style: { color: budgetUsed / totalBudget < 0.6 ? '#4caf50' : '#ff9800' } },
            `${((1 - budgetUsed / totalBudget) * 100).toFixed(0)}% budget remaining`,
          ),
        ),
      ),

      // Elements count summary
      el('div', { class: 'results-elements' },
        el('span', { class: 'results-elements__label' }, 'Your structure'),
        el('span', {}, `${structure.nodes.length} nodes · ${structure.elements.length} elements`),
      ),

      // Pattern notifications replay list (already shown during build, but nice to recap)
      level.realWorldRef
        ? el('div', { class: 'results-ref' },
            el('span', { class: 'results-ref__label' }, 'Engineering note: '),
            el('strong', {}, level.realWorldRef.name),
            el('span', {}, ` — ${level.realWorldRef.note}`),
          )
        : null,

      // CTA buttons
      el('div', { class: 'results-cta' },
        nextLevel
          ? el('button', {
              class: 'results-btn results-btn--next' + (nextUnlocked ? '' : ' results-btn--locked'),
              onClick: nextUnlocked ? () => _startNextLevel(nextLevel) : null,
              disabled: !nextUnlocked,
            },
            nextUnlocked ? `Next: Level ${nextLevel.id + 1} →` : 'Locked',
          )
          : el('div', { class: 'results-complete' }, 'All levels complete!'),
        el('button', {
          class: 'results-btn results-btn--retry',
          onClick: () => { location.hash = '#build'; },
        }, 'Try again'),
        el('button', {
          class: 'results-btn results-btn--home',
          onClick: () => { location.hash = ''; },
        }, 'Level select'),
      ),
    ),
  );

  container.appendChild(screen);

  // Entrance animation
  requestAnimationFrame(() =>
    screen.querySelector('.results-card')?.classList.add('results-card--visible'),
  );

  return () => {};
}

// [LEVEL-PROGRESS] Sets up state and routes to the next level's build screen.
function _startNextLevel(nextLevel) {
  setCurrentLevel(nextLevel.id, nextLevel.budget);
  location.hash = '#build';
}
