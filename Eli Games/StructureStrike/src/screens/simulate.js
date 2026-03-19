import { el } from '../ui/components.js';
import { LEVELS } from '../data/levels.js';
import { getCurrentLevelIndex, getStructure, getBuildScreenSnapshot, getBuildCanvasTransform } from '../state.js';
import { mountNotificationContainer, unmountNotificationContainer } from '../ui/notifications.js';
import { closeModal } from '../ui/modals.js';
import { runGlassShatterAnimation } from '../canvas/glass-shatter.js';
import { drawNode, drawSupportSymbol, drawLoadArrow } from '../canvas/blueprint-canvas.js';
import { drawStructuralMember } from '../canvas/structural-visuals.js';

// [SIMULATION] Simulation screen. Mounts a full-screen overlay on top of the
// existing build screen (no flash), shatters the snapshot of the build screen
// away to reveal the world background, then runs a build animation that
// materialises the structure as realistic steel members over the cityscape.
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

  // ── Draw world background + blueprint structure (visible during shatter) ──
  worldCtx.fillStyle = '#0d1424';
  worldCtx.fillRect(0, 0, vw, vh);
  _drawBlueprintStructure(); // show structure immediately on dark bg

  // Background-only snapshot for the build animation redraws
  let bgSnapshot = null;

  const cityImg = new Image();
  cityImg.src = '/cityscape.png';
  cityImg.onload = () => {
    worldCtx.drawImage(cityImg, 0, 0, vw, vh);
    // Capture city without structure so the animation can restore it each frame
    bgSnapshot = document.createElement('canvas');
    bgSnapshot.width  = worldCanvasEl.width;
    bgSnapshot.height = worldCanvasEl.height;
    bgSnapshot.getContext('2d').drawImage(worldCanvasEl, 0, 0);
    _drawBlueprintStructure(); // redraw blueprint on top for shatter visibility
  };

  // ── Draw snapshot onto shatter canvas (synchronous, no flash) ────────────
  const snapshot = getBuildScreenSnapshot();
  if (snapshot) {
    shatterCtx.drawImage(snapshot, 0, 0, vw, vh);
  }

  // ── Blueprint structure helper (shown during shatter) ─────────────────────
  // Draws the structure in blueprint style so it's visible below the shatter.
  function _drawBlueprintStructure() {
    const transform = getBuildCanvasTransform();
    if (!transform) return;
    const { rect, cellPx } = transform;
    const nodeMap = Object.fromEntries(structure.nodes.map(n => [n.id, n]));

    worldCtx.save();
    worldCtx.translate(rect.left, rect.top);
    for (const node of structure.nodes) {
      drawNode(worldCtx, node, cellPx, false, false);
      if (node.isAnchor) drawSupportSymbol(worldCtx, node, cellPx);
      if (node.isLoadNode && node.load) drawLoadArrow(worldCtx, node, node.load, cellPx);
    }
    worldCtx.restore();
  }

  // ── Build animation ───────────────────────────────────────────────────────
  // After the shatter, each structural element animates in from node A→B
  // with a realistic steel / cable material look, with a welding spark at tip.
  let animRafId = null;

  function _runBuildAnimation() {
    const transform = getBuildCanvasTransform();
    if (!transform || !structure.elements.length) {
      // Nothing to animate — just show static structural view and unhide back btn
      _drawFinalStructure();
      backBtn.style.display = '';
      return;
    }

    const { rect, cellPx } = transform;
    const nodeMap    = Object.fromEntries(structure.nodes.map(n => [n.id, n]));
    const ELEM_MS    = 260;  // ms to build each single element
    const STAGGER_MS = 70;   // ms delay between each element starting
    const start      = performance.now();

    function frame(now) {
      const elapsed = now - start;

      // Restore clean cityscape background each frame
      if (bgSnapshot) {
        worldCtx.drawImage(bgSnapshot, 0, 0, vw, vh);
      } else {
        worldCtx.fillStyle = '#0d1424';
        worldCtx.fillRect(0, 0, vw, vh);
      }

      worldCtx.save();
      worldCtx.translate(rect.left, rect.top);

      // Hardpoints + load arrows always visible (they never animate away)
      for (const node of structure.nodes) {
        if (node.isAnchor) {
          drawNode(worldCtx, node, cellPx, false, false);
          drawSupportSymbol(worldCtx, node, cellPx);
        }
        if (node.isLoadNode && node.load) drawLoadArrow(worldCtx, node, node.load, cellPx);
      }

      // Build each element progressively
      let allDone = true;
      structure.elements.forEach((elem, i) => {
        const elemStart = i * STAGGER_MS;
        const progress  = Math.min(1, Math.max(0, (elapsed - elemStart) / ELEM_MS));
        if (progress < 1) allDone = false;
        if (progress <= 0) return;

        const nodeA = nodeMap[elem.nodeAId];
        const nodeB = nodeMap[elem.nodeBId];
        if (nodeA && nodeB) {
          drawStructuralMember(worldCtx, nodeA, nodeB, elem.type, cellPx, progress);
        }
      });

      // Free nodes drawn on top of elements (connection joints)
      for (const node of structure.nodes) {
        if (!node.isAnchor && !node.isLoadNode) {
          drawNode(worldCtx, node, cellPx, false, false);
        }
      }

      worldCtx.restore();

      if (!allDone) {
        animRafId = requestAnimationFrame(frame);
      } else {
        backBtn.style.display = '';
      }
    }

    animRafId = requestAnimationFrame(frame);
  }

  // Draw the fully-built structural style without animation (used when no elements)
  function _drawFinalStructure() {
    const transform = getBuildCanvasTransform();
    if (!transform) return;
    const { rect, cellPx } = transform;
    const nodeMap = Object.fromEntries(structure.nodes.map(n => [n.id, n]));

    if (bgSnapshot) worldCtx.drawImage(bgSnapshot, 0, 0, vw, vh);

    worldCtx.save();
    worldCtx.translate(rect.left, rect.top);

    for (const elem of structure.elements) {
      const nodeA = nodeMap[elem.nodeAId];
      const nodeB = nodeMap[elem.nodeBId];
      if (nodeA && nodeB) drawStructuralMember(worldCtx, nodeA, nodeB, elem.type, cellPx, 1);
    }
    for (const node of structure.nodes) {
      drawNode(worldCtx, node, cellPx, false, false);
      if (node.isAnchor) drawSupportSymbol(worldCtx, node, cellPx);
      if (node.isLoadNode && node.load) drawLoadArrow(worldCtx, node, node.load, cellPx);
    }

    worldCtx.restore();
  }

  // ── Run shatter immediately ───────────────────────────────────────────────
  let cancelShatter = runGlassShatterAnimation(
    shatterCtx, vw, vh,
    snapshot ?? shatterCanvasEl,
    () => {},
    _onShatterComplete,
  );

  // [ANIMATION] Shatter done — clear old build DOM, hide shatter canvas,
  // restore clean background, then start the structural build animation.
  function _onShatterComplete() {
    container.innerHTML = '';
    container.appendChild(overlay);
    shatterCanvasEl.style.display = 'none';

    // Restore clean background (no blueprint structure) before building
    if (bgSnapshot) {
      worldCtx.drawImage(bgSnapshot, 0, 0, vw, vh);
    } else {
      worldCtx.fillStyle = '#0d1424';
      worldCtx.fillRect(0, 0, vw, vh);
    }

    _runBuildAnimation();
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    if (cancelShatter) cancelShatter();
    if (animRafId) cancelAnimationFrame(animRafId);
    overlay.remove();
    unmountNotificationContainer();
    closeModal();
  };
}
