import { el, formatBudget } from './components.js';
import { STRESS_COLORS, ELEMENT_PROPERTIES } from '../utils/constants.js';

let activeModal = null;

// ─── Modal shell ──────────────────────────────────────────────────────────────

// [UI] Creates and mounts a modal overlay with a content container.
// Returns { modal, contentEl, close } so callers can populate contentEl.
function openModal(parentEl, className = '') {
  const contentEl = el('div', { class: `modal__content ${className}` });
  const overlay = el('div', { class: 'modal-overlay' },
    el('div', { class: 'modal' },
      el('button', { class: 'modal__close', onClick: closeModal }, '✕'),
      contentEl,
    ),
  );

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  activeModal = overlay;
  parentEl.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('modal-overlay--visible'));

  return { overlay, contentEl, close: closeModal };
}

// [UI] Dismisses the currently active modal with a fade-out animation.
export function closeModal() {
  if (!activeModal) return;
  activeModal.classList.remove('modal-overlay--visible');
  activeModal.addEventListener('transitionend', () => {
    activeModal?.remove();
    activeModal = null;
  }, { once: true });
}

// ─── Failure debrief modal ────────────────────────────────────────────────────

// [SIMULATION] Opens the post-simulation failure debrief modal.
// Explains which elements failed, why, and gives the player insight before rebuilding.
// simulationResult: { failureSequence, finalStressRatios, isMechanism }
// structure: { nodes, elements }
export function showFailureDebriefModal(parentEl, simulationResult, structure, level) {
  const { overlay, contentEl } = openModal(parentEl, 'modal__content--failure');

  contentEl.appendChild(el('h2', { class: 'modal__title modal__title--fail' }, 'Structure Failed'));

  if (simulationResult.isMechanism) {
    contentEl.appendChild(
      el('p', { class: 'modal__body' },
        'Your structure is a mechanism — it has no path to carry load to the supports. ' +
        'Make sure every part of the structure is connected to an anchor node.',
      ),
    );
  } else {
    const { failureSequence, finalStressRatios } = simulationResult;
    const waveCount = failureSequence.length;

    contentEl.appendChild(
      el('p', { class: 'modal__body' },
        waveCount === 0
          ? 'Deflection exceeded the limit. Your structure survived loading but deformed too much.'
          : `${waveCount} wave${waveCount > 1 ? 's' : ''} of progressive collapse occurred.`,
      ),
    );

    // List the first failure wave elements with their utilisation
    if (failureSequence[0]?.length > 0) {
      const firstWaveIds = failureSequence[0];
      const list = el('ul', { class: 'failure-list' });
      for (const elemId of firstWaveIds) {
        const elem = structure.elements.find(e => e.id === elemId);
        const ratio = finalStressRatios[elemId] ?? 0;
        if (!elem) continue;
        const props = ELEMENT_PROPERTIES[elem.type];
        list.appendChild(
          el('li', { class: 'failure-list__item' },
            el('span', { class: 'failure-list__type' }, props.displayName),
            el('span', { class: 'failure-list__ratio', style: { color: STRESS_COLORS.failed } },
              `${(ratio * 100).toFixed(0)}% of yield`,
            ),
          ),
        );
      }
      contentEl.appendChild(el('p', { class: 'modal__section-label' }, 'Elements that failed first:'));
      contentEl.appendChild(list);
    }
  }

  // Real-world reference
  if (level.realWorldRef) {
    contentEl.appendChild(
      el('div', { class: 'modal__ref' },
        el('span', { class: 'modal__ref-label' }, 'Learn from history: '),
        el('strong', {}, level.realWorldRef.name),
        el('span', {}, ` — ${level.realWorldRef.note}`),
      ),
    );
  }

  contentEl.appendChild(
    el('button', { class: 'modal__cta modal__cta--rebuild', onClick: closeModal }, 'Rebuild'),
  );

  return overlay;
}

// ─── Element type picker modal ────────────────────────────────────────────────

// [BUILD-PHASE] Opens the element type picker that appears after the player selects
// two nodes to connect. Shows cost for each type at that span length.
// onSelect(elementType) is called when the player picks a type.
export function showElementPickerModal(parentEl, cost, elementTypes, onSelect) {
  const { overlay, contentEl } = openModal(parentEl, 'modal__content--picker');
  contentEl.appendChild(el('h3', { class: 'modal__title' }, 'Connect with…'));

  for (const { type, cost: typeCost, props } of elementTypes) {
    const btn = el('button', {
      class: 'element-picker__btn',
      onClick: () => { closeModal(); onSelect(type); },
    },
      el('span', { class: 'element-picker__name',  style: { color: props.blueprintColor } }, props.displayName),
      el('span', { class: 'element-picker__desc'  }, props.description),
      el('span', { class: 'element-picker__cost'  }, `−${formatBudget(typeCost)}`),
    );

    // Disable types the player can't afford
    if (typeCost > cost.remaining) {
      btn.disabled = true;
      btn.classList.add('element-picker__btn--unaffordable');
    }

    contentEl.appendChild(btn);
  }

  contentEl.appendChild(
    el('button', { class: 'modal__cta modal__cta--cancel', onClick: closeModal }, 'Cancel'),
  );

  return overlay;
}

// ─── Museum reference modal ───────────────────────────────────────────────────

// [BUILD-PHASE] Opens the civil engineering museum reference panel for a level.
// Shown via the museum button during the build phase.
export function showMuseumModal(parentEl, level) {
  const { overlay, contentEl } = openModal(parentEl, 'modal__content--museum');

  contentEl.appendChild(el('h2', { class: 'modal__title' }, 'Civil Engineering Museum'));
  contentEl.appendChild(el('h3', { class: 'museum__threat-title' }, level.threat.label));
  contentEl.appendChild(el('p',  { class: 'museum__threat-desc'  }, level.threat.description));

  if (level.realWorldRef) {
    contentEl.appendChild(
      el('div', { class: 'museum__ref-card' },
        el('h4', { class: 'museum__ref-name' }, level.realWorldRef.name),
        el('p',  { class: 'museum__ref-note' }, level.realWorldRef.note),
      ),
    );
  }

  contentEl.appendChild(
    el('button', { class: 'modal__cta', onClick: closeModal }, 'Close'),
  );

  return overlay;
}
