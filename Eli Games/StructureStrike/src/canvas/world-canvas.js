import { GRID_COLS, GRID_ROWS, ELEMENT_PROPERTIES } from '../utils/constants.js';
import { gridToCanvas } from '../utils/math.js';
import { stressRatioToColor, drawDeformedElement } from './blueprint-canvas.js';

// ─── Scene background renderers ───────────────────────────────────────────────
// Each scene is drawn entirely with Canvas 2D primitives — no image assets.

// [SIMULATION] Draws the warehouse/industrial background for Level 1 (dead load).
function drawWarehouseScene(ctx, w, h) {
  // Sky / industrial ceiling
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  skyGrad.addColorStop(0, '#1a1a2e');
  skyGrad.addColorStop(1, '#2d2d44');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.5);

  // Background wall panels
  ctx.fillStyle = '#252535';
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  // Corrugated roof beams (horizontal dark lines)
  ctx.strokeStyle = '#1a1a2a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const y = h * 0.12 + i * h * 0.06;
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Ground / concrete floor
  const floorGrad = ctx.createLinearGradient(0, h * 0.82, 0, h);
  floorGrad.addColorStop(0, '#3a3a4a');
  floorGrad.addColorStop(1, '#2a2a38');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, h * 0.82, w, h * 0.18);

  // Floor seams
  ctx.strokeStyle = '#2a2a36';
  ctx.lineWidth = 1.5;
  for (let x = w * 0.1; x < w; x += w * 0.12) {
    ctx.beginPath();
    ctx.moveTo(x, h * 0.82); ctx.lineTo(x, h);
    ctx.stroke();
  }
}

// [SIMULATION] Draws the coastal/city background for Level 2 (wind load).
function drawCoastalScene(ctx, w, h) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  skyGrad.addColorStop(0, '#0d2137');
  skyGrad.addColorStop(1, '#1a3a5c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.65);

  // Distant city silhouette
  ctx.fillStyle = '#142a40';
  _drawCitySilhouette(ctx, w, h * 0.65, h * 0.55);

  // Water / sea
  const waterGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
  waterGrad.addColorStop(0, '#1a4060');
  waterGrad.addColorStop(1, '#0d2030');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);

  // Water surface shimmer
  ctx.strokeStyle = '#2a6090';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = h * 0.66 + i * h * 0.03;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, y);
    ctx.bezierCurveTo(w * 0.3, y - 3, w * 0.7, y + 3, w * 0.95, y);
    ctx.stroke();
  }
}

// [SIMULATION] Draws the urban/street background for Level 3 (seismic).
function drawUrbanSeismicScene(ctx, w, h) {
  // Night sky
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0, 0, w, h * 0.6);

  // Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.sin(i * 137.5) * w * 0.4 + w * 0.5,
      Math.sin(i * 73.1) * h * 0.25 + h * 0.15,
      0.7, 0, Math.PI * 2,
    );
    ctx.fill();
  }

  // Background city blocks
  ctx.fillStyle = '#141422';
  _drawCitySilhouette(ctx, w, h * 0.6, h * 0.45);

  // Street / ground
  const groundGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
  groundGrad.addColorStop(0, '#2a2a20');
  groundGrad.addColorStop(1, '#1a1a14');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);

  // Road markings
  ctx.strokeStyle = '#3a3a28';
  ctx.lineWidth = 2;
  ctx.setLineDash([w * 0.04, w * 0.04]);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.lineTo(w, h * 0.78);
  ctx.stroke();
  ctx.setLineDash([]);
}

// [SIMULATION] Draws the harbor/floodgate background for Level 4 (flood).
function drawHarborFloodScene(ctx, w, h, waterRiseFraction = 1.0) {
  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  skyGrad.addColorStop(0, '#0d1a2d');
  skyGrad.addColorStop(1, '#1a3048');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.5);

  // Ground / harbor walls
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  // Flood water (rises with waterRiseFraction 0–1)
  const waterTop = h * (0.95 - waterRiseFraction * 0.45);
  const waterGrad = ctx.createLinearGradient(0, waterTop, 0, h);
  waterGrad.addColorStop(0, '#1a5080cc');
  waterGrad.addColorStop(1, '#0d2840aa');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, waterTop, w, h - waterTop);

  // Water surface ripple line
  ctx.strokeStyle = '#3a80b0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, waterTop);
  ctx.lineTo(w, waterTop);
  ctx.stroke();
}

// [SIMULATION] Draws the hardened bunker/military facility background for Level 5 (ballistic).
function drawBunkerScene(ctx, w, h) {
  // Sky — overcast
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
  skyGrad.addColorStop(0, '#1a1a20');
  skyGrad.addColorStop(1, '#2a2a30');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.45);

  // Barren ground
  const groundGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
  groundGrad.addColorStop(0, '#2a2010');
  groundGrad.addColorStop(1, '#1a1408');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);

  // Rubble / dirt texture lines
  ctx.strokeStyle = '#201808';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const y = h * 0.5 + i * h * 0.04;
    ctx.beginPath();
    ctx.moveTo(w * (i % 3) * 0.1, y);
    ctx.lineTo(w * 0.3 + w * (i % 5) * 0.1, y + 2);
    ctx.stroke();
  }
}

// [SIMULATION] Helper that draws a random-but-deterministic city block silhouette.
function _drawCitySilhouette(ctx, w, baseY, buildingMaxH) {
  const buildingCount = 14;
  const bw = w / buildingCount;
  for (let i = 0; i < buildingCount; i++) {
    const seed = Math.sin(i * 9.301) * 0.5 + 0.5;
    const bh = buildingMaxH * (0.3 + seed * 0.7);
    const bx = i * bw;
    ctx.fillRect(bx + bw * 0.05, baseY - bh, bw * 0.9, bh);

    // Window grid
    ctx.fillStyle = '#ffffff18';
    const rows = Math.floor(bh / 14);
    const cols = Math.floor(bw * 0.8 / 10);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.sin(i * 3.7 + r * 1.3 + c * 2.1) > 0.3) {
          ctx.fillRect(bx + bw * 0.1 + c * 10 + 1, baseY - bh + r * 14 + 2, 7, 9);
        }
      }
    }
    ctx.fillStyle = '#142a40';
  }
}

// ─── Scene dispatcher ─────────────────────────────────────────────────────────

// [SIMULATION] Draws the background scene for the given level scene key.
// waterRiseFraction (0–1) is used for animated flood level in the harbor scene.
export function drawWorldSceneBackground(ctx, scene, w, h, waterRiseFraction = 1.0) {
  switch (scene) {
    case 'warehouse': drawWarehouseScene(ctx, w, h);            break;
    case 'coastal':   drawCoastalScene(ctx, w, h);              break;
    case 'urban':     drawUrbanSeismicScene(ctx, w, h);         break;
    case 'harbor':    drawHarborFloodScene(ctx, w, h, waterRiseFraction); break;
    case 'bunker':    drawBunkerScene(ctx, w, h);               break;
    default:          ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h);
  }
}

// ─── World-mode structure renderer ───────────────────────────────────────────

// [SIMULATION] Draws the structural elements in world mode — thicker, shaded,
// coloured by stress — optionally with deformation applied.
export function drawWorldStructure(ctx, nodes, elements, cellPx, displacements, elementStressRatios, deformScale) {
  const nodeMap = Object.fromEntries(nodes.map((n, i) => [n.id, { node: n, index: i }]));

  // Draw in back-to-front order: cables behind, trusses, columns, beams on top
  const drawOrder = ['cable', 'truss', 'column', 'beam'];

  for (const type of drawOrder) {
    for (const elem of elements) {
      if (elem.type !== type) continue;
      const entryA = nodeMap[elem.nodeAId];
      const entryB = nodeMap[elem.nodeBId];
      if (!entryA || !entryB) continue;

      const stressRatio = elementStressRatios?.[elem.id] ?? 0;

      if (displacements) {
        drawDeformedElement(
          ctx,
          entryA.node, entryB.node,
          entryA.index, entryB.index,
          elem.type, displacements,
          deformScale ?? 0,
          cellPx,
          stressRatio,
        );
      } else {
        // Static world render (no deformation)
        const { x: ax, y: ay } = gridToCanvas(entryA.node.col, entryA.node.row, cellPx, { col: 0, row: 0 });
        const { x: bx, y: by } = gridToCanvas(entryB.node.col, entryB.node.row, cellPx, { col: 0, row: 0 });
        const props = ELEMENT_PROPERTIES[type];
        ctx.save();
        ctx.strokeStyle = props.worldColor;
        ctx.lineWidth   = props.lineWidthPx + 2;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Draw anchor indicators
  for (const node of nodes) {
    if (!node.isAnchor) continue;
    const { x, y } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });
    ctx.save();
    ctx.fillStyle = '#90caf9cc';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Blueprint → world transition ────────────────────────────────────────────

// [SIMULATION] Animates the transition from the blueprint build phase to the
// world simulation view by cross-fading between two canvas elements.
// Returns a cleanup function.
export function transitionToWorldView(blueprintCanvasEl, worldCanvasEl, durationMs, onComplete) {
  worldCanvasEl.style.opacity = '0';
  worldCanvasEl.style.transition = `opacity ${durationMs}ms ease`;

  requestAnimationFrame(() => {
    blueprintCanvasEl.style.transition = `opacity ${durationMs}ms ease`;
    blueprintCanvasEl.style.opacity    = '0';
    worldCanvasEl.style.opacity        = '1';
  });

  const timer = setTimeout(() => {
    blueprintCanvasEl.style.display = 'none';
    onComplete?.();
  }, durationMs + 50);

  return () => {
    clearTimeout(timer);
    blueprintCanvasEl.style.opacity    = '';
    blueprintCanvasEl.style.transition = '';
    blueprintCanvasEl.style.display    = '';
    worldCanvasEl.style.opacity        = '';
    worldCanvasEl.style.transition     = '';
  };
}
