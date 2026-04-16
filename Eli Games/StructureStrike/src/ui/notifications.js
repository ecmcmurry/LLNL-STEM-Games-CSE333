import { el, rarityBadge } from './components.js';
import { getPatternById } from '../recognition/patterns.js';

let notificationContainer = null;

// [RECOGNITION] Creates the persistent notification container that toasts stack into.
// Must be called once per screen mount.
export function mountNotificationContainer(parentEl) {
  notificationContainer = el('div', { class: 'notification-stack' });
  parentEl.appendChild(notificationContainer);
  return notificationContainer;
}

// [RECOGNITION] Removes the notification container on screen cleanup.
export function unmountNotificationContainer() {
  notificationContainer?.remove();
  notificationContainer = null;
}

// ─── Pattern notification ─────────────────────────────────────────────────────

// [RECOGNITION] Fires a toast notification when a structural pattern is recognised.
// patternId must match an entry in patterns.js.
export function showPatternRecognisedNotification(patternId) {
  const pattern = getPatternById(patternId);
  if (!pattern || !notificationContainer) return;

  const toast = el('div', { class: `notification notification--pattern notification--${pattern.rarity}` },
    el('div', { class: 'notification__header' },
      el('span', { class: 'notification__icon' }, pattern.icon),
      el('div', { class: 'notification__title' }, pattern.name),
      rarityBadge(pattern.rarity),
    ),
    el('div', { class: 'notification__body' },
      el('p', { class: 'notification__purpose' }, pattern.engineeringPurpose),
      el('p', { class: 'notification__example' },
        el('span', { class: 'notification__example-label' }, 'Real world: '),
        pattern.realWorldExample,
      ),
    ),
  );

  notificationContainer.prepend(toast);
  requestAnimationFrame(() => toast.classList.add('notification--visible'));

  // Auto-dismiss after 5 s
  setTimeout(() => dismissNotification(toast), 5000);
}

// ─── General toasts ───────────────────────────────────────────────────────────

// [BUILD-PHASE] Shows a short warning toast (insufficient budget, disconnected structure, etc.)
export function showWarningNotification(message) {
  _showSimpleToast(message, 'warning', 3000);
}

// [SIMULATION] Shows a brief success toast (structure validated, win condition met)
export function showSuccessNotification(message) {
  _showSimpleToast(message, 'success', 3000);
}

// [UI] Internal helper that mounts a simple text toast and auto-dismisses it
function _showSimpleToast(message, variant, durationMs) {
  if (!notificationContainer) return;
  const toast = el('div', { class: `notification notification--simple notification--${variant}` }, message);
  notificationContainer.prepend(toast);
  requestAnimationFrame(() => toast.classList.add('notification--visible'));
  setTimeout(() => dismissNotification(toast), durationMs);
}

// ─── Dismiss helpers ──────────────────────────────────────────────────────────

// [UI] Animates a single notification out and removes it from the DOM
function dismissNotification(toastEl) {
  toastEl.classList.remove('notification--visible');
  toastEl.classList.add('notification--leaving');
  toastEl.addEventListener('transitionend', () => toastEl.remove(), { once: true });
}

// [UI] Immediately clears all active notifications (used on screen transitions)
export function dismissAllNotifications() {
  notificationContainer?.querySelectorAll('.notification').forEach(n => n.remove());
}
