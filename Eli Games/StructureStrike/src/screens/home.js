import { el } from '../ui/components.js';
import { LEVELS } from '../data/levels.js';
import { loadProgress, saveProgress } from '../utils/storage.js';
import { setCurrentLevel } from '../state.js';

// [LEVEL-PROGRESS] Renders the home/level-select screen.
// The player sees a grid of level cards, with locked/unlocked/starred states.
// Returns a cleanup function per the router contract.
export function render(container) {
  container.innerHTML = '';
  const progress = loadProgress();

  const screen = el('div', { class: 'screen screen--home' },
    el('header', { class: 'home-header' },
      // Corner bolts
      el('div', { class: 'home-bolt home-bolt--tl' }),
      el('div', { class: 'home-bolt home-bolt--tr' }),
      el('div', { class: 'home-bolt home-bolt--bl' }),
      el('div', { class: 'home-bolt home-bolt--br' }),
      // Top I-beam (below hazard stripe)
      el('div', { class: 'home-beam home-beam--top' }),
      el('h1', { class: 'home-title' },
        el('span', { class: 'home-title__structure' }, 'Structure'),
        el('span', { class: 'home-title__strike' }, 'Strike'),
      ),
      el('p',  { class: 'home-subtitle' }, 'Build · Survive · Engineer'),
      el('button', {
        class: 'home-beta-btn',
        onClick: () => {
          const p = loadProgress();
          p.unlockedLevels = LEVELS.map(l => l.id);
          saveProgress(p);
          render(container);
        },
      }, 'Unlock All (Beta)'),
      // Bottom I-beam
      el('div', { class: 'home-beam home-beam--bot' }),
    ),
    el('main', { class: 'home-levels' },
      el('h2', { class: 'home-levels__heading' }, 'Select Level'),
      el('div', { class: 'level-grid' },
        ...LEVELS.map(level => _buildLevelCard(level, progress)),
      ),
    ),
  );

  container.appendChild(screen);

  // Staggered card entrance animation
  const cards = screen.querySelectorAll('.level-card');
  cards.forEach((card, i) => {
    setTimeout(() => card.classList.add('level-card--visible'), i * 80);
  });

  return () => {
    // No persistent state to clean up
  };
}

// [LEVEL-PROGRESS] Builds a single level card element.
// Locked levels show a padlock and are not interactive.
function _buildLevelCard(level, progress) {
  const isUnlocked = progress.unlockedLevels.includes(level.id);
  const stars      = progress.starsPerLevel[level.id] ?? 0;

  const num = String(level.id + 1).padStart(2, '0');
  const starsStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);

  const card = el('div', {
    class: `level-card ${isUnlocked ? 'level-card--unlocked' : 'level-card--locked'}`,
    onClick: isUnlocked ? () => _startLevel(level.id) : null,
  },
    el('div', { class: 'level-card__number' }, num),
    el('div', { class: 'level-card__body' },
      el('h3', { class: 'level-card__name' }, level.name),
      el('div', { class: 'level-card__meta' },
        el('span', { class: 'level-card__subtitle' }, level.tagline),
        el('span', { class: `level-card__threat-badge level-card__threat-badge--${level.threat.type}` }, level.threat.label),
      ),
    ),
    el('div', { class: 'level-card__right' },
      el('div', { class: 'level-card__stars' }, starsStr),
      !isUnlocked ? el('div', { class: 'level-card__lock' }, '⬛ LOCKED') : null,
    ),
  );

  return card;
}

// [LEVEL-PROGRESS] Navigates to the build screen for the selected level.
function _startLevel(levelId) {
  const level = LEVELS.find(l => l.id === levelId);
  if (!level) return;
  setCurrentLevel(levelId, level.budget);
  location.hash = '#build';
}
