import { el } from '../ui/components.js';
import { LEVELS } from '../data/levels.js';
import {
  getCurrentLevelIndex, getStructure,
  getBuildScreenSnapshot, getBuildCanvasTransform,
  setSimulationResult,
} from '../state.js';
import { mountNotificationContainer, unmountNotificationContainer } from '../ui/notifications.js';
import { closeModal } from '../ui/modals.js';
import { runGlassShatterAnimation } from '../canvas/glass-shatter.js';
import { drawElement, drawNode, drawLoadArrow } from '../canvas/blueprint-canvas.js';
import { drawStructuralMember, drawStructuralMemberAt, drawPinJoint, drawPinJointAt, drawConcreteSupport } from '../canvas/structural-visuals.js';
import {
  drawElementFailureBurst,
  applySeismicShake,
  drawWindEffect,
  drawFloodOverlay,
} from '../canvas/sim-renderer.js';
import { runPlanckSimulation } from '../physics/sim-engine.js';
import { DEFORMATION_SCALE, CELL_METERS } from '../utils/constants.js';
import { gridToCanvas } from '../utils/math.js';

const WARMUP_SECS  = 1.5;
const ACTIVE_SECS  = 4.0;
const TOTAL_SECS   = WARMUP_SECS + ACTIVE_SECS;

// [SIMULATION] Simulation screen. Shatters the build snapshot, runs a build
// animation, executes the Planck physics simulation, then replays the result
// as an animated sequence with deformation, stress colours, and force effects.
export function render(container) {
  const levelIndex = getCurrentLevelIndex();
  const level      = LEVELS[levelIndex];
  const structure  = getStructure();
  if (!level || !structure) { container.innerHTML = ''; location.hash = '#build'; return () => {}; }

  const nodes    = structure.nodes;
  const elements = structure.elements;

  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const dpr = window.devicePixelRatio ?? 1;

  // ── DOM ───────────────────────────────────────────────────────────────────
  const worldCanvasEl   = el('canvas', { class: 'sim-world-canvas' });
  const shatterCanvasEl = el('canvas', { class: 'sim-shatter-canvas' });
  const backBtn = el('button', {
    class: 'sim-rebuild-btn',
    style: 'display:none',
    onClick: () => { location.hash = '#build'; },
  }, '← Rebuild');

  const overlay = el('div', { class: 'sim-overlay' }, worldCanvasEl, shatterCanvasEl, backBtn);
  container.appendChild(overlay);
  mountNotificationContainer(overlay);

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

  // ── Background capture ────────────────────────────────────────────────────
  worldCtx.fillStyle = '#0d1424';
  worldCtx.fillRect(0, 0, vw, vh);
  _drawBlueprintStructure();

  let bgSnapshot = null;
  const cityImg = new Image();
  cityImg.src = '/cityscape.png';
  cityImg.onload = () => {
    // Draw with CSS "cover" behavior — scale to fill, preserve aspect ratio
    const imgAR = cityImg.naturalWidth / cityImg.naturalHeight;
    const canAR = vw / vh;
    let sx = 0, sy = 0, sw = cityImg.naturalWidth, sh = cityImg.naturalHeight;
    if (imgAR > canAR) {
      // image wider than canvas — crop sides
      sw = cityImg.naturalHeight * canAR;
      sx = (cityImg.naturalWidth - sw) / 2;
    } else {
      // image taller than canvas — crop top/bottom
      sh = cityImg.naturalWidth / canAR;
      sy = (cityImg.naturalHeight - sh) / 2;
    }
    worldCtx.drawImage(cityImg, sx, sy, sw, sh, 0, 0, vw, vh);
    bgSnapshot = document.createElement('canvas');
    bgSnapshot.width  = worldCanvasEl.width;
    bgSnapshot.height = worldCanvasEl.height;
    bgSnapshot.getContext('2d').drawImage(worldCanvasEl, 0, 0);
    _drawBlueprintStructure();
  };

  const snapshot = getBuildScreenSnapshot();
  if (snapshot) shatterCtx.drawImage(snapshot, 0, 0, vw, vh);

  // ── Blueprint overlay (visible during shatter) ────────────────────────────
  function _drawBlueprintStructure() {
    const transform = getBuildCanvasTransform();
    if (!transform) return;
    const { rect, cellPx } = transform;
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    worldCtx.save();
    worldCtx.translate(rect.left, rect.top);
    for (const elem of elements) {
      const nA = nodeMap[elem.nodeAId], nB = nodeMap[elem.nodeBId];
      if (nA && nB) drawElement(worldCtx, nA, nB, elem.type, cellPx);
    }
    for (const node of nodes) {
      if (node.isAnchor) drawConcreteSupport(worldCtx, node, cellPx);
      if (node.isLoadNode && node.load) drawLoadArrow(worldCtx, node, node.load, cellPx);
    }
    for (const node of nodes) {
      if (!node.isAnchor && !node.isLoadNode) drawNode(worldCtx, node, cellPx, false, false);
    }
    for (const node of nodes) {
      if (node.isAnchor || !node.isLoadNode) drawPinJoint(worldCtx, node, cellPx);
    }
    worldCtx.restore();
  }

  // ── Shatter → build animation → physics ──────────────────────────────────
  let animRafId   = null;
  let physicsRafId = null;

  let cancelShatter = runGlassShatterAnimation(
    shatterCtx, vw, vh,
    snapshot ?? shatterCanvasEl,
    () => {},
    _onShatterComplete,
  );

  function _onShatterComplete() {
    container.innerHTML = '';
    container.appendChild(overlay);
    shatterCanvasEl.style.display = 'none';
    if (bgSnapshot) worldCtx.drawImage(bgSnapshot, 0, 0, vw, vh);
    else { worldCtx.fillStyle = '#0d1424'; worldCtx.fillRect(0, 0, vw, vh); }
    _runBuildAnimation();
  }

  // ── Build animation ───────────────────────────────────────────────────────
  function _runBuildAnimation() {
    const transform = getBuildCanvasTransform();
    if (!transform || !elements.length) {
      _startPhysics();
      return;
    }
    const { rect, cellPx } = transform;
    const nodeMap    = Object.fromEntries(nodes.map(n => [n.id, n]));
    const ELEM_MS    = 260;
    const STAGGER_MS = 70;
    const start      = performance.now();

    function frame(now) {
      const elapsed = now - start;

      if (bgSnapshot) worldCtx.drawImage(bgSnapshot, 0, 0, vw, vh);
      else { worldCtx.fillStyle = '#0d1424'; worldCtx.fillRect(0, 0, vw, vh); }

      worldCtx.save();
      worldCtx.translate(rect.left, rect.top);

      // Layer 1: blueprint lines
      for (const elem of elements) {
        const nA = nodeMap[elem.nodeAId], nB = nodeMap[elem.nodeBId];
        if (nA && nB) drawElement(worldCtx, nA, nB, elem.type, cellPx);
      }

      // Layer 2: concrete support bodies + load arrows
      for (const node of nodes) {
        if (node.isAnchor) drawConcreteSupport(worldCtx, node, cellPx);
        if (node.isLoadNode && node.load) drawLoadArrow(worldCtx, node, node.load, cellPx);
      }

      // Layer 3: structural members animating in
      let allDone = true;
      elements.forEach((elem, i) => {
        const progress = Math.min(1, Math.max(0, (elapsed - i * STAGGER_MS) / ELEM_MS));
        if (progress < 1) allDone = false;
        if (progress <= 0) return;
        const nA = nodeMap[elem.nodeAId], nB = nodeMap[elem.nodeBId];
        if (nA && nB) drawStructuralMember(worldCtx, nA, nB, elem.type, cellPx, progress);
      });

      // Layer 4: all pin joints on top
      for (const node of nodes) {
        if (node.isAnchor || !node.isLoadNode) drawPinJoint(worldCtx, node, cellPx);
      }

      worldCtx.restore();

      if (!allDone) {
        animRafId = requestAnimationFrame(frame);
      } else {
        _startPhysics();
      }
    }
    animRafId = requestAnimationFrame(frame);
  }

  // ── Physics: run synchronously then replay visually ───────────────────────
  function _startPhysics() {
    // Tiny delay so the final build frame paints before the (brief) blocking call
    setTimeout(() => {
      let simResult;
      try {
        simResult = runPlanckSimulation(nodes, elements, level);
      } catch (err) {
        console.error('[StructureStrike] Physics simulation failed:', err);
        // Fallback: treat as collapsed so the player can see results
        simResult = {
          survived: false,
          displacements: null,
          elementStressRatios: {},
          failedElementIds: new Set(),
          failureSequence: [],
          isMechanism: true,
        };
      }
      setSimulationResult(simResult);
      _runPhysicsPlayback(simResult);
    }, 80);
  }

  function _runPhysicsPlayback(simResult) {
    const transform = getBuildCanvasTransform();
    if (!transform) { _finish(simResult); return; }
    const { rect, cellPx } = transform;
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

    // Spread failure waves evenly across the active threat window
    const failureBursts = [];
    simResult.failureSequence.forEach((wave, i) => {
      const t = WARMUP_SECS +
        (i + 0.5) * (ACTIVE_SECS / Math.max(simResult.failureSequence.length, 1));
      for (const elemId of wave) {
        const elem = elements.find(e => e.id === elemId);
        if (!elem) continue;
        failureBursts.push({
          nodeA: nodeMap[elem.nodeAId],
          nodeB: nodeMap[elem.nodeBId],
          startTimeSec: t,
        });
      }
    });

    // Ballistic impact flash position (absolute canvas coords)
    let impactEvent = null;
    if (level.threat?.type === 'ballistic' && level.loadNodes?.length) {
      const ln = level.loadNodes[0];
      const node = nodes.find(n => n.col === ln.col && n.row === ln.row);
      if (node) {
        const { x, y } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });
        impactEvent = { x: rect.left + x, y: rect.top + y, startTimeSec: WARMUP_SECS };
      }
    }

    const start = performance.now();

    function frame(now) {
      const timeSec      = Math.min((now - start) / 1000, TOTAL_SECS);
      const activeTimeSec = Math.max(0, timeSec - WARMUP_SECS);
      const deformRamp   = Math.min(1, activeTimeSec / 2.0);
      const deformScale  = DEFORMATION_SCALE * deformRamp;

      // Background
      if (bgSnapshot) worldCtx.drawImage(bgSnapshot, 0, 0, vw, vh);
      else { worldCtx.fillStyle = '#0d1424'; worldCtx.fillRect(0, 0, vw, vh); }

      // Full-screen force effects (no canvas offset needed)
      if (level.threat?.type === 'wind' && activeTimeSec > 0) {
        drawWindEffect(worldCtx, vw, vh, level.threat.windSpeedKmh, timeSec);
      }
      if (level.threat?.type === 'flood') {
        const wrf = Math.min(1, Math.max(0, activeTimeSec / ACTIVE_SECS));
        drawFloodOverlay(worldCtx, vw, vh, wrf);
      }

      // Structure block — translated to match build canvas position
      worldCtx.save();
      worldCtx.translate(rect.left, rect.top);

      // Seismic shake applied only to the structure block
      if (level.threat?.type === 'seismic' && activeTimeSec > 0) {
        applySeismicShake(worldCtx, level.threat.peakAccelerationG, timeSec, level.threat.frequencyHz);
      }

      // Helper: get deformed canvas position for a node
      const metresToPx = cellPx / CELL_METERS;
      const deformedPos = (node, idx) => {
        const { x, y } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });
        if (!simResult.displacements || idx === undefined) return { x, y };
        return {
          x: x +  simResult.displacements[3 * idx]     * metresToPx * deformScale,
          y: y + -simResult.displacements[3 * idx + 1] * metresToPx * deformScale,
        };
      };

      // Layer 1: blueprint element lines (undeformed, visual reference)
      for (const elem of elements) {
        const nA = nodeMap[elem.nodeAId], nB = nodeMap[elem.nodeBId];
        if (nA && nB) drawElement(worldCtx, nA, nB, elem.type, cellPx);
      }

      // Layer 2: concrete bases + load arrows (anchored — no deformation)
      for (const node of nodes) {
        if (node.isAnchor) drawConcreteSupport(worldCtx, node, cellPx);
        if (node.isLoadNode && node.load) drawLoadArrow(worldCtx, node, node.load, cellPx);
      }

      // Layer 3: steel/cable members at deformed positions with stress tint
      for (const elem of elements) {
        const nA = nodeMap[elem.nodeAId], nB = nodeMap[elem.nodeBId];
        if (!nA || !nB) continue;
        const iA = nodes.indexOf(nA), iB = nodes.indexOf(nB);
        const pA = deformedPos(nA, iA), pB = deformedPos(nB, iB);
        const stress = simResult.elementStressRatios?.[elem.id] ?? 0;
        drawStructuralMemberAt(worldCtx, pA.x, pA.y, pB.x, pB.y, elem.type, cellPx, stress);
      }

      // Layer 4: pin joints at deformed positions
      for (const node of nodes) {
        if (node.isAnchor || !node.isLoadNode) {
          const idx = nodes.indexOf(node);
          const p = deformedPos(node, idx);
          drawPinJointAt(worldCtx, p.x, p.y, cellPx);
        }
      }

      // Failure bursts
      for (const burst of failureBursts) {
        const t = (timeSec - burst.startTimeSec) / 0.6;
        if (t >= 0 && t <= 1) {
          drawElementFailureBurst(worldCtx, burst.nodeA, burst.nodeB, t, cellPx);
        }
      }

      worldCtx.restore();

      // Ballistic impact flash (absolute coords, outside translate)
      if (impactEvent) {
        const t = (timeSec - impactEvent.startTimeSec) / 0.8;
        if (t >= 0 && t <= 1) _drawImpactFlash(worldCtx, impactEvent.x, impactEvent.y, t);
      }

      if (timeSec < TOTAL_SECS) {
        physicsRafId = requestAnimationFrame(frame);
      } else {
        backBtn.style.display = '';
        _finish(simResult);
      }
    }

    physicsRafId = requestAnimationFrame(frame);
  }

  function _finish(_simResult) {
    // Brief pause, then navigate to results (handles both pass and fail)
    setTimeout(() => { location.hash = '#results'; }, 1200);
  }

  // ── Ballistic impact flash (inline — not in sim-renderer exports) ─────────
  function _drawImpactFlash(ctx, x, y, progress) {
    const radius = progress * 60;
    const alpha  = (1 - progress) * 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth   = 3 * (1 - progress);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.5);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, '#ff9800');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    if (cancelShatter)  cancelShatter();
    if (animRafId)      cancelAnimationFrame(animRafId);
    if (physicsRafId)   cancelAnimationFrame(physicsRafId);
    overlay.remove();
    unmountNotificationContainer();
    closeModal();
  };
}
