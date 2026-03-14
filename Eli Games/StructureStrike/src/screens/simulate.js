import { el } from '../ui/components.js';
import { LEVELS } from '../data/levels.js';
import { getCurrentLevelIndex, getStructure, setSimulationResult } from '../state.js';
import { initialiseBlueprintCanvas, drawBlueprintGrid, drawElement, drawNode, drawSupportSymbol, drawLoadArrow } from '../canvas/blueprint-canvas.js';
import { drawWorldSceneBackground, drawWorldStructure, transitionToWorldView } from '../canvas/world-canvas.js';
import { runPlanckSimulation } from '../physics/sim-engine.js';
import { mountNotificationContainer, unmountNotificationContainer } from '../ui/notifications.js';
import { showFailureDebriefModal, closeModal } from '../ui/modals.js';
import { runGlassShatterAnimation } from '../canvas/glass-shatter.js';

// [SIMULATION] Simulation screen. Shows blueprint → world transition, runs the
// Planck.js physics analysis, then waits for the user to trigger the glass-shatter
// animation that breaks away the background, revealing the structure's result.
// Returns a cleanup function per the router contract.
export function render(container) {
  container.innerHTML = '';

  const levelIndex = getCurrentLevelIndex();
  const level      = LEVELS[levelIndex];
  const structure  = getStructure();
  if (!level || !structure) { location.hash = '#build'; return () => {}; }

  // ── Build DOM ─────────────────────────────────────────────────────────────
  // World canvas is behind; blueprint canvas is on top and will shatter away.
  const worldCanvasEl     = el('canvas', { class: 'sim-canvas sim-canvas--world' });
  const blueprintCanvasEl = el('canvas', { class: 'sim-canvas sim-canvas--blueprint' });
  const statusBar = el('div',    { class: 'sim-status' }, '');
  const backBtn   = el('button', { class: 'hud-btn hud-btn--back', onClick: () => { location.hash = '#build'; } }, '← Rebuild');

  const screen = el('div', { class: 'screen screen--simulate' },
    el('div', { class: 'sim-canvas-stack' }, worldCanvasEl, blueprintCanvasEl),
    el('div', { class: 'sim-hud' }, statusBar, backBtn),
  );
  container.appendChild(screen);
  mountNotificationContainer(screen);

  // ── Canvas init ───────────────────────────────────────────────────────────
  const rect = screen.querySelector('.sim-canvas-stack').getBoundingClientRect();
  const containerW = rect.width  || window.innerWidth;
  const containerH = rect.height || window.innerHeight * 0.8;

  const { ctx: bpCtx, cellPx, canvasW, canvasH } = initialiseBlueprintCanvas(blueprintCanvasEl, containerW, containerH);

  worldCanvasEl.width        = blueprintCanvasEl.width;
  worldCanvasEl.height       = blueprintCanvasEl.height;
  worldCanvasEl.style.width  = blueprintCanvasEl.style.width;
  worldCanvasEl.style.height = blueprintCanvasEl.style.height;

  const worldCtx = worldCanvasEl.getContext('2d');
  const dpr = window.devicePixelRatio ?? 1;
  worldCtx.scale(dpr, dpr);

  // Logical (CSS-pixel) canvas dimensions used for all draw calls
  const w = canvasW;
  const h = canvasH;

  let cancelShatter = null;
  let simResult     = null;

  // ── Draw both canvases immediately ───────────────────────────────────────
  // World scene sits behind; blueprint is on top and will shatter away on click.
  worldCtx.clearRect(0, 0, w, h);
  const cityImg = new Image();
  cityImg.src = '/cityscape.png';
  cityImg.onload = () => worldCtx.drawImage(cityImg, 0, 0, w, h);
  _drawBlueprintStatic(bpCtx, structure, cellPx);

  // Start the shatter automatically after a brief pause so the blueprint is visible first.
  setTimeout(_runShatterAnimation, 600);

  // [ANIMATION] Captures the blueprint canvas as a texture, then shatters it —
  // the blueprint tiles break away revealing the world scene underneath.
  function _runShatterAnimation() {
    // Snapshot the blueprint canvas at its current physical resolution.
    const bgCanvas   = document.createElement('canvas');
    bgCanvas.width   = blueprintCanvasEl.width;
    bgCanvas.height  = blueprintCanvasEl.height;
    bgCanvas.getContext('2d').drawImage(blueprintCanvasEl, 0, 0);

    cancelShatter = runGlassShatterAnimation(
      bpCtx, w, h,
      bgCanvas,
      () => {},
      _onShatterComplete,
    );
  }

  // [ANIMATION] Called when all shards have fallen away.
  function _onShatterComplete() {
    statusBar.textContent = 'done!';
    // worldCtx.clearRect(0, 0, w, h);
    // drawWorldStructure(…);
    // _showResult();
  }

  // // [SIMULATION] Shows pass/fail result and routes to the appropriate next screen.
  // function _showResult() {
  //   if (simResult.survived) { … } else { … }
  // }

  // ── Static blueprint draw ─────────────────────────────────────────────────

  // [BUILD-CANVAS] Draws the static blueprint frame shown briefly before the transition.
  function _drawBlueprintStatic(ctx, structure, cellPx) {
    drawBlueprintGrid(ctx, cellPx);
    const nodeMap = Object.fromEntries(structure.nodes.map(n => [n.id, n]));
    for (const elem of structure.elements) {
      const nodeA = nodeMap[elem.nodeAId];
      const nodeB = nodeMap[elem.nodeBId];
      if (nodeA && nodeB) drawElement(ctx, nodeA, nodeB, elem.type, cellPx);
    }
    for (const node of structure.nodes) {
      drawNode(ctx, node, cellPx, false, false);
      if (node.isAnchor) drawSupportSymbol(ctx, node, cellPx);
      if (node.isLoadNode && node.load) drawLoadArrow(ctx, node, node.load, cellPx);
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    if (cancelShatter) cancelShatter();
    unmountNotificationContainer();
    closeModal();
  };
}
