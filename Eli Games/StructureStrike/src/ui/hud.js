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

// ─── Action buttons ───────────────────────────────────────────────────────────

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
