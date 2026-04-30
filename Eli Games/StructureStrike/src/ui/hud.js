import { el, elementTypeIcon, formatBudget } from './components.js';
import { ELEMENT_TYPE, ELEMENT_PROPERTIES } from '../utils/constants.js';

// ─── Budget display ───────────────────────────────────────────────────────────

let budgetValueEl = null;
let budgetBarEl   = null;
let totalBudget   = 0;

// [BUDGET-COUNTER] Creates the budget display widget shown in the top bar during build phase.
// Returns the container element; call updateBudgetDisplay() to update values.
export function createBudgetDisplay(initialBudget) {
  totalBudget = initialBudget;
  budgetValueEl = el('span', { class: 'budget__value' }, formatBudget(initialBudget));
  budgetBarEl   = el('div',  { class: 'budget__bar-fill' });

  return el('div', { class: 'budget' },
    el('span', { class: 'budget__label' }, 'Budget'),
    el('div',  { class: 'budget__bar' }, budgetBarEl),
    budgetValueEl,
  );
}

// [BUDGET-COUNTER] Updates the budget display to reflect the current remaining amount.
// Turns amber below 30 %, red below 10 %, and pulses when a cost is deducted.
export function updateBudgetDisplay(remaining) {
  if (!budgetValueEl) return;
  budgetValueEl.textContent = formatBudget(remaining);

  const pct = totalBudget > 0 ? remaining / totalBudget : 0;
  if (budgetBarEl) {
    budgetBarEl.style.width = `${Math.max(0, pct * 100)}%`;
    budgetBarEl.className = 'budget__bar-fill' +
      (pct < 0.10 ? ' budget__bar-fill--critical' : pct < 0.30 ? ' budget__bar-fill--low' : '');
  }

  // Brief pulse animation on the number
  budgetValueEl.classList.remove('budget__value--pulse');
  requestAnimationFrame(() => budgetValueEl.classList.add('budget__value--pulse'));
}

// ─── Requirements post-it ─────────────────────────────────────────────────────

// [BUILD-PHASE] Renders a sticky-note card listing the level's minimum structural
// requirements. Placed below the budget in the left sidebar (desktop) and below
// the budget row in the mobile top bar.
export function createRequirementsPostIt(level) {
  const req = level.requirements;
  if (!req) return el('div');

  const items = [
    `Place ≥ ${req.minElements} elements`,
    'Connect load nodes to anchors',
  ];

  const children = [
    el('div', { class: 'postit__header' }, 'REQUIREMENTS'),
    el('ul',  { class: 'postit__list' },
      ...items.map(text => el('li', {}, text)),
    ),
  ];

  if (req.hint) {
    children.push(el('div', { class: 'postit__divider' }));
    children.push(el('p',   { class: 'postit__hint' }, req.hint));
  }

  return el('div', { class: 'requirements-postit' }, ...children);
}

// ─── History photo post-it ────────────────────────────────────────────────────

// [BUILD-PHASE] Renders a sticky-note card with a black-and-white historical
// photo of the real-world structure referenced by this level.
// Clicking the post-it opens a lightbox; clicking the lightbox closes it.
export function createHistoryPostIt(level) {
  const ref = level.realWorldRef;
  if (!ref || !ref.photo) return el('div');

  const captionText = ref.photoCaption || ref.name;

  const postit = el('div', { class: 'history-postit' },
    el('div', { class: 'postit__header' }, 'REFERENCE'),
    el('div', { class: 'history-postit__frame' },
      el('img', { class: 'history-postit__photo', src: ref.photo, alt: ref.name, loading: 'lazy' }),
    ),
    el('div', { class: 'history-postit__caption' }, captionText),
    el('div', { class: 'history-postit__expand-hint' }, 'click to enlarge'),
  );

  postit.addEventListener('click', () => _openHistoryLightbox(ref.photo, ref.name, captionText, ref.note));

  return postit;
}

function _openHistoryLightbox(src, alt, caption, note) {
  if (document.querySelector('.history-lightbox')) return; // already open

  const backdrop = el('div', { class: 'history-lightbox' });

  const noteEl = note ? el('p', { class: 'history-lightbox__note' }, note) : null;

  const inner = el('div', { class: 'history-lightbox__postit' },
    el('div', { class: 'postit__header' }, 'REFERENCE'),
    el('div', { class: 'history-lightbox__frame' },
      el('img', { class: 'history-lightbox__photo', src, alt }),
    ),
    el('div', { class: 'history-postit__caption' }, caption),
    ...(noteEl ? [noteEl] : []),
  );

  backdrop.appendChild(inner);
  document.body.appendChild(backdrop);

  // Animate in
  requestAnimationFrame(() => backdrop.classList.add('history-lightbox--visible'));

  const close = () => {
    backdrop.classList.remove('history-lightbox--visible');
    backdrop.addEventListener('transitionend', () => backdrop.remove(), { once: true });
  };

  backdrop.addEventListener('click', close);
  // Also close on Escape
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}

// ─── Element type toolbar ─────────────────────────────────────────────────────

// [BUILD-PHASE] Creates the element toolbar that lets the player choose which
// type of structural element to place next (beam, column, truss, cable).
// onTypeChange is called with the new ELEMENT_TYPE string when selection changes.
export function createElementToolbar(initialType, onTypeChange) {
  const buttons = {};

  const toolbar = el('div', { class: 'element-toolbar' },
    el('span', { class: 'element-toolbar__label' }, 'Element'),
    ...Object.values(ELEMENT_TYPE).map(type => {
      const props = ELEMENT_PROPERTIES[type];
      const btn = el('button', {
        class: 'element-toolbar__btn' + (type === initialType ? ' element-toolbar__btn--active' : ''),
        title: `${props.displayName}\n${props.description}`,
        onClick: () => {
          Object.values(buttons).forEach(b => b.classList.remove('element-toolbar__btn--active'));
          btn.classList.add('element-toolbar__btn--active');
          onTypeChange(type);
        },
      },
        elementTypeIcon(type, props.blueprintColor),
        el('span', { class: 'element-toolbar__name' }, props.displayName),
      );
      buttons[type] = btn;
      return btn;
    }),
  );

  return toolbar;
}

// ─── Mode toggle ──────────────────────────────────────────────────────────────

// [BUILD-PHASE] Creates a paired Build / Edit mode toggle. Returns a wrapper div
// containing both buttons. Visually marks the active button as "pressed down".
export function createModeToggle(initialMode, onBuild, onEdit) {
  let buildBtn, editBtn;

  buildBtn = el('button', {
    class: `hud-btn hud-btn--mode${initialMode === 'build' ? ' hud-btn--mode--active' : ''}`,
    onClick: () => {
      buildBtn.classList.add('hud-btn--mode--active');
      editBtn.classList.remove('hud-btn--mode--active');
      onBuild();
    },
  }, el('span', {}, 'Build'));

  editBtn = el('button', {
    class: `hud-btn hud-btn--mode${initialMode === 'edit' ? ' hud-btn--mode--active' : ''}`,
    onClick: () => {
      editBtn.classList.add('hud-btn--mode--active');
      buildBtn.classList.remove('hud-btn--mode--active');
      onEdit();
    },
  }, el('span', {}, 'Edit'));

  return el('div', { class: 'mode-toggle' }, buildBtn, editBtn);
}

// ─── Action buttons ───────────────────────────────────────────────────────────

// [BUILD-PHASE] Creates the Back button that returns the player to level select.
export function createBackButton(onBack) {
  return el('button', { class: 'hud-btn hud-btn--back', onClick: onBack },
    el('span', { class: 'hud-btn__icon' }, '←'),
    el('span', {}, 'Back'),
  );
}

// [BUILD-PHASE] Creates the Reset button that wipes the canvas and refunds all budget.
export function createResetButton(onReset) {
  return el('button', { class: 'hud-btn hud-btn--reset', onClick: onReset },
    el('span', { class: 'hud-btn__icon' }, '⚠️'),
    el('span', {}, 'Reset'),
  );
}

// [BUILD-PHASE] Creates the Undo button that removes the last placed element.
export function createUndoButton(onUndo) {
  return el('button', { class: 'hud-btn hud-btn--undo', onClick: onUndo },
    el('span', { class: 'hud-btn__icon' }, '↩'),
    el('span', {}, 'Undo'),
  );
}

// [BUILD-PHASE] Creates the Delete button shown when an element is selected.
export function createDeleteButton(onDelete) {
  return el('button', { class: 'hud-btn hud-btn--delete', onClick: onDelete },
    el('span', { class: 'hud-btn__icon' }, '✕'),
    el('span', {}, 'Delete'),
  );
}

// [SIMULATION] Creates the Run Simulation button.
// isEnabled controls whether the button is interactive.
export function createRunSimulationButton(onRun) {
  const btn = el('button', { class: 'hud-btn hud-btn--simulate', onClick: onRun },
    el('span', { class: 'hud-btn__icon' }, '▶'),
    el('span', {}, 'Simulate'),
  );
  return btn;
}

// [SIMULATION] Enables or disables the run simulation button.
export function setSimulateButtonEnabled(btn, enabled) {
  btn.disabled = !enabled;
  btn.classList.toggle('hud-btn--disabled', !enabled);
}

// ─── Level info strip ─────────────────────────────────────────────────────────

// [BUILD-PHASE] Creates the level info strip at the top of the build screen.
// Shows only the level name.
export function createLevelInfoStrip(level) {
  return el('div', { class: 'level-strip' },
    el('span', { class: 'level-strip__name' }, level.name),
  );
}

// ─── Element cost tooltip ─────────────────────────────────────────────────────

// [BUDGET-COUNTER] Creates a floating cost preview tooltip shown while the player
// is drawing a new element between two nodes.
export function createCostPreviewTooltip() {
  const tooltip = el('div', { class: 'cost-tooltip cost-tooltip--hidden' });
  return tooltip;
}

// [BUDGET-COUNTER] Updates the cost preview tooltip with the calculated cost for
// the pending element and positions it on screen.
export function updateCostPreviewTooltip(tooltip, cost, x, y) {
  tooltip.textContent = `−${formatBudget(cost)}`;
  tooltip.className = 'cost-tooltip';
  tooltip.style.left = `${x + 12}px`;
  tooltip.style.top  = `${y - 24}px`;
}

// [BUDGET-COUNTER] Hides the cost preview tooltip when no element is being drawn.
export function hideCostPreviewTooltip(tooltip) {
  tooltip.className = 'cost-tooltip cost-tooltip--hidden';
}
