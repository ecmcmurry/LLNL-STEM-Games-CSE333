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

  const survived    = simResult.survived ?? false;
  const totalBudget = level.budget;
  const budgetUsed  = totalBudget - getBudgetRemaining();

  // ── Stars (0 if collapsed) ────────────────────────────────────────────────
  const stars = computeStarRating(
    level, structure.nodes, structure.elements, simResult, budgetUsed, totalBudget,
  );

  // Only persist progress on a pass
  const progress     = survived ? completeLevel(levelIndex, stars) : loadProgress();
  const nextLevel    = LEVELS[levelIndex + 1];
  const nextUnlocked = survived && nextLevel && progress.unlockedLevels.includes(nextLevel.id);

  // ── DOM ───────────────────────────────────────────────────────────────────
  const starsStr = survived
    ? '★'.repeat(stars) + '☆'.repeat(3 - stars)
    : '✕';

  const titleText  = survived ? 'Structure Survived' : 'Structure Collapsed';
  const titleColor = survived ? 'var(--accent-green)' : 'var(--accent-red)';

  const screen = el('div', { class: 'screen screen--results' },
    el('div', { class: 'results-card' },
      el('div', { class: 'results-card__header' },
        el('h2', { class: 'results-title', style: { color: titleColor } }, titleText),
        el('div', { class: 'results-stars', style: { color: survived ? '' : 'var(--accent-red)' } }, starsStr),
      ),
      el('div', { class: 'results-breakdown' },
        el('div', { class: 'results-row' },
          el('span', {}, 'Level'),
          el('span', {}, `${level.id + 1} — ${level.name}`),
        ),
        el('div', { class: 'results-row' },
          el('span', {}, survived ? 'Threat survived' : 'Failed against'),
          el('span', {}, level.threat.label),
        ),
        survived ? el('div', { class: 'results-row' },
          el('span', {}, 'Budget used'),
          el('span', {}, `${formatBudget(budgetUsed)} / ${formatBudget(totalBudget)}`),
        ) : null,
        survived ? el('div', { class: 'results-row' },
          el('span', {}, 'Efficiency'),
          el('span', { style: { color: budgetUsed / totalBudget < 0.6 ? '#4caf50' : '#ff9800' } },
            `${((1 - budgetUsed / totalBudget) * 100).toFixed(0)}% budget remaining`,
          ),
        ) : null,
        !survived && simResult.failureSequence?.length ? el('div', { class: 'results-row' },
          el('span', {}, 'Elements failed'),
          el('span', { style: { color: 'var(--accent-red)' } },
            simResult.failureSequence.reduce((n, w) => n + w.length, 0).toString(),
          ),
        ) : null,
      ),

      el('div', { class: 'results-elements' },
        el('span', { class: 'results-elements__label' }, 'Your structure'),
        el('span', {}, `${structure.nodes.length} nodes · ${structure.elements.length} elements`),
      ),

      level.realWorldRef
        ? el('div', { class: 'results-ref' },
            el('span', { class: 'results-ref__label' }, 'Engineering note: '),
            el('strong', {}, level.realWorldRef.name),
            el('span', {}, ` — ${level.realWorldRef.note}`),
          )
        : null,

      // CTA buttons
      el('div', { class: 'results-cta' },
        survived && nextLevel
          ? el('button', {
              class: 'results-btn results-btn--next' + (nextUnlocked ? '' : ' results-btn--locked'),
              onClick: nextUnlocked ? () => _startNextLevel(nextLevel) : null,
              disabled: !nextUnlocked,
            },
            nextUnlocked ? `Next: Level ${nextLevel.id + 1} →` : 'Locked',
          )
          : survived
            ? el('div', { class: 'results-complete' }, 'All levels complete!')
            : null,
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
