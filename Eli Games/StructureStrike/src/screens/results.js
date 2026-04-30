import { el, formatBudget } from '../ui/components.js';
import { LEVELS } from '../data/levels.js';
import {
  getCurrentLevelIndex, getStructure, getBudgetRemaining, getSimulationResult,
  setCurrentLevel,
} from '../state.js';
import { loadProgress, completeLevel } from '../utils/storage.js';
import { computeStarRating } from '../physics/sim-engine.js';
import { getSimulationReport, AI_REPORT_ENABLED } from '../services/gemini.js';

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

  const stars = computeStarRating(
    level, structure.nodes, structure.elements, simResult, budgetUsed, totalBudget,
  );

  const progress     = survived ? completeLevel(levelIndex, stars) : loadProgress();
  const nextLevel    = LEVELS[levelIndex + 1];
  const nextUnlocked = survived && nextLevel && progress.unlockedLevels.includes(nextLevel.id);

  const starsStr   = survived ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '✕';
  const titleText  = survived ? 'Structure Survived' : 'Structure Collapsed';
  const titleColor = survived ? 'var(--accent-green)' : 'var(--accent-red)';

  function _ctaButtons() {
    return el('div', { class: 'results-cta' },
      survived && nextLevel
        ? el('button', {
            class: 'results-btn results-btn--next' + (nextUnlocked ? '' : ' results-btn--locked'),
            onClick: nextUnlocked ? () => _startNextLevel(nextLevel) : null,
            disabled: !nextUnlocked,
          }, nextUnlocked ? `Next: Level ${nextLevel.id + 1} →` : 'Locked')
        : survived ? el('div', { class: 'results-complete' }, 'All levels complete!') : null,
      el('button', {
        class: 'results-btn results-btn--retry',
        onClick: () => { location.hash = '#build'; },
      }, 'Try again'),
      el('button', {
        class: 'results-btn results-btn--home',
        onClick: () => { location.hash = ''; },
      }, 'Level select'),
    );
  }

  // ── Page 1: stats ─────────────────────────────────────────────────────────
  const page1 = el('div', { class: 'results-page results-page--front' },
    el('div', { class: 'results-page-num' }, '1'),
    el('div', { class: 'results-card__header' },
      el('h2', { class: 'results-title', style: { color: titleColor } }, titleText),
      el('div', { class: 'results-stars', style: { color: survived ? '' : 'var(--accent-red)' } }, starsStr),
    ),
    el('div', { class: 'results-breakdown' },
      el('div', { class: 'results-row' },
        el('span', {}, 'Level'),
        el('span', {}, `${level.id + 1}: ${level.name}`),
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
        el('span', { style: { color: budgetUsed / totalBudget < 0.6 ? '#4caf50' : '#b8780a' } },
          `${((1 - budgetUsed / totalBudget) * 100).toFixed(0)}% budget remaining`,
        ),
      ) : null,
      !survived && simResult.failureSequence?.length ? el('div', { class: 'results-row' },
        el('span', {}, 'Elements failed'),
        el('span', { style: { color: '#c0392b' } },
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
          el('span', {}, `: ${level.realWorldRef.note}`),
        )
      : null,
    _ctaButtons(),
  );

  // ── Page 2: AI review ─────────────────────────────────────────────────────
  const page2 = el('div', { class: 'results-page results-page--back' },
    el('div', { class: 'results-page-num' }, '2'),
    el('div', { class: 'results-card__header results-card__header--page2' },
      el('span', { class: 'results-page2-title' }, "Engineer's Assessment"),
    ),
    el('div', { class: 'results-ai-report' },
      el('p', { class: 'results-ai-report__text results-ai-report__text--loading' }, 'Analysing your design...'),
    ),
    _ctaButtons(),
  );

  // ── Layered papers wrapper ────────────────────────────────────────────────
  // p2 in DOM first so p1 renders on top without needing higher z-index tricks
  const papersEl = el('div', { class: 'results-papers' }, page2, page1);

  let activePage = 1;

  function goToPage(n) {
    if (n === activePage) return;
    activePage = n;
    const front = n === 1 ? page1 : page2;
    const back  = n === 1 ? page2 : page1;
    // Measure new front height before class swap
    papersEl.style.height = front.offsetHeight + 'px';
    front.classList.replace('results-page--back',  'results-page--front');
    back.classList.replace('results-page--front', 'results-page--back');
  }

  // Clicking anywhere on the back page (the peeking strip) flips to it
  page1.addEventListener('click', () => { if (activePage === 2) goToPage(1); });
  page2.addEventListener('click', () => { if (activePage === 1) goToPage(2); });

  const screen = el('div', { class: 'screen screen--results' },
    el('div', { class: 'clipboard' },
      el('div', { class: 'clipboard__clip' }),
      el('div', { class: 'results-card' }, papersEl),
    ),
  );

  container.appendChild(screen);

  // Entrance animation + set initial height from page 1
  requestAnimationFrame(() => {
    screen.querySelector('.results-card')?.classList.add('results-card--visible');
    papersEl.style.height = page1.offsetHeight + 'px';
  });

  // AI report — fills page 2 when ready
  if (AI_REPORT_ENABLED) {
    const reportEl = screen.querySelector('.results-ai-report__text');
    getSimulationReport(level, structure, simResult, budgetUsed, totalBudget, stars)
      .then(text => {
        console.log('[Claude] Full response:\n', text);
        if (!reportEl) return;
        reportEl.classList.remove('results-ai-report__text--loading');
        reportEl.textContent = text ?? 'Analysis unavailable.';
        // If page 1 is still active, update container height in case p2 grew
        if (activePage === 2) papersEl.style.height = page2.offsetHeight + 'px';
      });
  }

  return () => {};
}

function _startNextLevel(nextLevel) {
  setCurrentLevel(nextLevel.id, nextLevel.budget);
  location.hash = '#build';
}
