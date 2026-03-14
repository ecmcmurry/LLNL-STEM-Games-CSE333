import { el } from '../ui/components.js';
import { LEVELS } from '../data/levels.js';
import { getCurrentLevelIndex, getStructure, getBuildScreenSnapshot } from '../state.js';
import { mountNotificationContainer, unmountNotificationContainer } from '../ui/notifications.js';
import { closeModal } from '../ui/modals.js';
import { runGlassShatterAnimation } from '../canvas/glass-shatter.js';

// [SIMULATION] Simulation screen. Mounts a full-screen overlay on top of the
// existing build screen (no flash), shatters the snapshot of the build screen
// away to reveal the world background, then clears the old DOM underneath.
// Returns a cleanup function per the router contract.
export function render(container) {
  // NOTE: intentionally do NOT clear the container yet — the build screen
  // stays in the DOM as the visual backdrop during the shatter animation.
  // We clear it only after the shatter completes.

  const levelIndex = getCurrentLevelIndex();
  const level      = LEVELS[levelIndex];
  const structure  = getStructure();
  if (!level || !structure) { container.innerHTML = ''; location.hash = '#build'; return () => {}; }

  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const dpr = window.devicePixelRatio ?? 1;

  // ── Build overlay DOM ─────────────────────────────────────────────────────
  const worldCanvasEl   = el('canvas', { class: 'sim-world-canvas' });
  const shatterCanvasEl = el('canvas', { class: 'sim-shatter-canvas' });
  const backBtn = el('button', {
    class: 'sim-rebuild-btn',
    style: 'display:none',
    onClick: () => { location.hash = '#build'; },
  }, '← Rebuild');

  // Overlay sits on top of the existing build screen (position:fixed in CSS)
  const overlay = el('div', { class: 'sim-overlay' }, worldCanvasEl, shatterCanvasEl, backBtn);
  container.appendChild(overlay);
  mountNotificationContainer(overlay);

  // ── Canvas sizing ─────────────────────────────────────────────────────────
  for (const c of [worldCanvasEl, shatterCanvasEl]) {
    c.width        = vw * dpr;
    c.height       = vh * dpr;
    c.style.width  = `${vw}px`;
    c.style.height = `${vh}px`;
  }

  const worldCtx   = worldCanvasEl.getContext('2d');
  const shatterCtx = shatterCanvasEl.getContext('2d');
  worldCtx.scale(dpr, dpr);
  shatterCtx.scale(dpr, dpr);

  // ── Draw world background ─────────────────────────────────────────────────
  // Fill with a dark colour immediately so there's never a transparent gap.
  worldCtx.fillStyle = '#0d1424';
  worldCtx.fillRect(0, 0, vw, vh);
  const cityImg = new Image();
  cityImg.src = '/cityscape.png';
  cityImg.onload = () => worldCtx.drawImage(cityImg, 0, 0, vw, vh);

  // ── Draw snapshot onto shatter canvas (synchronous, no flash) ────────────
  const snapshot = getBuildScreenSnapshot();
  if (snapshot) {
    shatterCtx.drawImage(snapshot, 0, 0, vw, vh);
  }

  // ── Run shatter immediately ───────────────────────────────────────────────
  let cancelShatter = runGlassShatterAnimation(
    shatterCtx, vw, vh,
    snapshot ?? shatterCanvasEl,
    () => {},
    _onShatterComplete,
  );

  // [ANIMATION] Shatter done — clear old build DOM, hide shatter canvas, show rebuild btn.
  function _onShatterComplete() {
    // Remove everything except our overlay, then replace container contents
    container.innerHTML = '';
    container.appendChild(overlay);
    shatterCanvasEl.style.display = 'none';
    backBtn.style.display = '';
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    if (cancelShatter) cancelShatter();
    overlay.remove();
    unmountNotificationContainer();
    closeModal();
  };
}
