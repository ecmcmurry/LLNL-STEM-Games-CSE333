import {
  GRID_COLS, GRID_ROWS,
  NODE_VISUAL_RADIUS, NODE_HIT_RADIUS,
  ELEMENT_PROPERTIES,
  STRESS_COLORS, STRESS_UTILISATION,
  SUPPORT_TYPE,
  MIN_CELL_PX, MAX_CELL_PX,
} from '../utils/constants.js';
import { gridToCanvas } from '../utils/math.js';

// ─── Canvas sizing ────────────────────────────────────────────────────────────

// [BUILD-CANVAS] Computes the exact cell pixel size so the grid fills the container width
// with no leftover gap. No minimum enforced — every screen size works correctly.
export function computeCellPx(containerWidth) {
  return containerWidth / GRID_COLS;
}

// [BUILD-CANVAS] Sets up the canvas element to exactly fill the container width.
// Height follows naturally from the number of rows × cellPx.
// Device pixel ratio is applied to the internal buffer for crisp rendering on retina screens.
export function initialiseBlueprintCanvas(canvasEl, containerWidth, containerHeight) {
  const dpr = window.devicePixelRatio ?? 1;
  // Apply 5% margin to each axis independently, then take the tightest cell size.
  // This gives uniform breathing room from whichever edge is the constraint,
  // without over-shrinking the other axis.
  const cellPx = 0.95 * Math.min(containerWidth / GRID_COLS, containerHeight / GRID_ROWS);
  const w = Math.round(GRID_COLS * cellPx);
  const h = Math.round(GRID_ROWS * cellPx);

  canvasEl.width  = w * dpr;
  canvasEl.height = h * dpr;
  canvasEl.style.width  = `${w}px`;
  canvasEl.style.height = `${h}px`;

  const ctx = canvasEl.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, cellPx, canvasW: w, canvasH: h };
}

// ─── Background grid ──────────────────────────────────────────────────────────

// [BUILD-CANVAS] Draws the blueprint-style background grid.
// Radial gradient fill from #016dc8 (centre) to #013c8a (edges), white grid lines and dots.
export function drawBlueprintGrid(ctx, cellPx) {
  const w = GRID_COLS * cellPx;
  const h = GRID_ROWS * cellPx;

  // Radial gradient background
  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.65);
  gradient.addColorStop(0, '#016dc8');
  gradient.addColorStop(1, '#013c8a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Grid lines — subtle dark-blue on bright blue
  ctx.strokeStyle = 'rgba(0, 25, 80, 0.35)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let col = 0; col <= GRID_COLS; col++) {
    const x = col * cellPx;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let row = 0; row <= GRID_ROWS; row++) {
    const y = row * cellPx;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Grid intersection dots — white so they pop on blue
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  const dotR = 1.5;
  for (let col = 0; col <= GRID_COLS; col++) {
    for (let row = 0; row <= GRID_ROWS; row++) {
      ctx.beginPath();
      ctx.arc(col * cellPx, row * cellPx, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Edge shadow — quick dark-blue fade inward from each edge to simulate
  // depth cast by the surrounding silver frame.
  const shadow    = 'rgba(0, 5, 30, 0.72)';
  const fadeDepth = Math.min(w, h) * 0.01;

  const topG   = ctx.createLinearGradient(0, 0,             0, fadeDepth);
  const botG   = ctx.createLinearGradient(0, h - fadeDepth, 0, h);
  const leftG  = ctx.createLinearGradient(0, 0,             fadeDepth, 0);
  const rightG = ctx.createLinearGradient(w - fadeDepth, 0, w, 0);

  topG.addColorStop(0, shadow);       topG.addColorStop(1, 'transparent');
  botG.addColorStop(0, 'transparent'); botG.addColorStop(1, shadow);
  leftG.addColorStop(0, shadow);      leftG.addColorStop(1, 'transparent');
  rightG.addColorStop(0, 'transparent'); rightG.addColorStop(1, shadow);

  ctx.fillStyle = topG;   ctx.fillRect(0, 0,             w, fadeDepth);
  ctx.fillStyle = botG;   ctx.fillRect(0, h - fadeDepth, w, fadeDepth);
  ctx.fillStyle = leftG;  ctx.fillRect(0, 0,             fadeDepth, h);
  ctx.fillStyle = rightG; ctx.fillRect(w - fadeDepth, 0, fadeDepth, h);
}

// ─── Structural element drawing ───────────────────────────────────────────────

// [BUILD-CANVAS] Draws a structural element as a styled line between two node positions.
// stressRatio: 0–∞ (0 = unstressed, ≥1 = failed). Pass undefined during build phase
// to use the element's blueprint color instead.
export function drawElement(ctx, nodeA, nodeB, elementType, cellPx, stressRatio) {
  const props = ELEMENT_PROPERTIES[elementType];
  const posA = gridToCanvas(nodeA.col, nodeA.row, cellPx, { col: 0, row: 0 });
  const posB = gridToCanvas(nodeB.col, nodeB.row, cellPx, { col: 0, row: 0 });

  let strokeColor = props.blueprintColor;
  if (stressRatio !== undefined) {
    strokeColor = stressRatioToColor(stressRatio);
  }

  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth   = props.lineWidthPx;
  ctx.lineCap     = 'round';

  if (elementType === 'cable') {
    // Cables drawn as dashed lines
    ctx.setLineDash([4, 4]);
  }

  ctx.beginPath();
  ctx.moveTo(posA.x, posA.y);
  ctx.lineTo(posB.x, posB.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// [BUILD-CANVAS] Draws the element label (type name + length) at the midpoint.
// Only shown when hovering or selected, controlled by the caller.
export function drawElementLabel(ctx, nodeA, nodeB, elementType, lengthM, cellPx) {
  const props = ELEMENT_PROPERTIES[elementType];
  const posA  = gridToCanvas(nodeA.col, nodeA.row, cellPx, { col: 0, row: 0 });
  const posB  = gridToCanvas(nodeB.col, nodeB.row, cellPx, { col: 0, row: 0 });
  const mx = (posA.x + posB.x) / 2;
  const my = (posA.y + posB.y) / 2;

  ctx.save();
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = props.blueprintColor;
  ctx.fillText(`${props.displayName} · ${lengthM.toFixed(1)}m`, mx, my - 10);
  ctx.restore();
}

// ─── Node drawing ─────────────────────────────────────────────────────────────

// [BUILD-CANVAS] Draws a single structural node circle.
// isSelected: player has tapped this node as the first connection point.
// isHighlighted: snap preview or hover state.
export function drawNode(ctx, node, cellPx, isSelected, isHighlighted) {
  const { x, y } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });

  const baseColor = node.isAnchor ? '#e0e0e0' : '#00e5ff';
  const nodeR  = Math.max(4, cellPx * 0.18);
  const outerR = isSelected ? nodeR + cellPx * 0.12 : nodeR;

  if (isSelected) {
    // Selection ring
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, outerR + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (isHighlighted) {
    // Hover glow
    ctx.save();
    ctx.shadowColor = baseColor;
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(x, y, outerR + 2, 0, Math.PI * 2);
    ctx.fillStyle = baseColor + '44';
    ctx.fill();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();
}

// ─── Support symbol drawing ───────────────────────────────────────────────────

// [BUILD-CANVAS] Draws the engineering support symbol for an anchor node below it.
// Triangle = pinned, box = fixed, small square = roller.
export function drawSupportSymbol(ctx, node, cellPx) {
  const { x, y } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });
  const size = cellPx * 0.35;

  ctx.save();
  ctx.strokeStyle = '#90caf9';
  ctx.fillStyle   = '#1a2540';
  ctx.lineWidth   = 1.5;

  switch (node.supportType) {
    case SUPPORT_TYPE.FIXED: {
      // Filled box below node
      ctx.fillStyle = '#90caf9';
      ctx.fillRect(x - size, y, size * 2, size * 0.8);
      // Hatch lines below box
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * size * 0.5 - size * 0.3, y + size * 0.8);
        ctx.lineTo(x + i * size * 0.5 + size * 0.3, y + size * 0.8 + size * 0.4);
        ctx.stroke();
      }
      break;
    }
    case SUPPORT_TYPE.PINNED: {
      // Triangle below node
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      ctx.fillStyle = '#90caf9';
      ctx.fill();
      ctx.stroke();
      // Ground line
      ctx.beginPath();
      ctx.moveTo(x - size * 1.3, y + size);
      ctx.lineTo(x + size * 1.3, y + size);
      ctx.stroke();
      break;
    }
    case SUPPORT_TYPE.ROLLER_H:
    case SUPPORT_TYPE.ROLLER_V: {
      // Small circles below node representing rollers
      const rr = size * 0.18;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(x + i * rr * 2.5, y + size, rr, 0, Math.PI * 2);
        ctx.fillStyle = '#90caf9';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(x - size, y + size + rr * 2);
      ctx.lineTo(x + size, y + size + rr * 2);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

// ─── Load arrow drawing ───────────────────────────────────────────────────────

// [BUILD-CANVAS] Draws a force arrow at a load node indicating the applied load direction.
// These are called "load arrows" or "nodal force indicators" in structural engineering.
export function drawLoadArrow(ctx, node, load, cellPx) {
  const { x, y } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });
  const arrowLen = cellPx * 1.1;
  const mag = Math.sqrt((load.fx ?? 0) ** 2 + (load.fy ?? 0) ** 2);
  if (mag === 0) return;

  // In canvas coordinates Y is downward; FEM fy negative = downward
  const canvasDx = (load.fx ?? 0) / mag * arrowLen;
  const canvasDy = -(load.fy ?? 0) / mag * arrowLen; // flip Y

  const tipX = x + canvasDx;
  const tipY = y + canvasDy;
  const angle = Math.atan2(canvasDy, canvasDx);
  const headLen = Math.max(8, cellPx * 0.4);

  ctx.save();

  // White glow pass so the arrow reads clearly on the blue background
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillStyle   = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth   = Math.max(3, cellPx * 0.18);
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Main coloured arrow on top
  ctx.strokeStyle = '#ff4444';
  ctx.fillStyle   = '#ff4444';
  ctx.lineWidth   = 3;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - headLen * Math.cos(angle - 0.4), tipY - headLen * Math.sin(angle - 0.4));
  ctx.lineTo(tipX - headLen * Math.cos(angle + 0.4), tipY - headLen * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ─── Snap preview ────────────────────────────────────────────────────────────

// [BUILD-CANVAS] Draws the ghost circle showing where a new node would snap to.
export function drawSnapPreview(ctx, col, row, cellPx) {
  const { x, y } = gridToCanvas(col, row, cellPx, { col: 0, row: 0 });
  ctx.save();
  // Solid white ring — clearly readable on any shade of the blue gradient
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1.5, cellPx * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, Math.max(5, cellPx * 0.38), 0, Math.PI * 2);
  ctx.stroke();
  // Subtle white fill so the target point is unmistakable
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fill();
  ctx.restore();
}

// [BUILD-CANVAS] Draws the ghost line preview from a selected node to the cursor position.
export function drawConnectionPreview(ctx, fromNode, toCursorX, toCursorY, elementType, cellPx) {
  const { x: fx, y: fy } = gridToCanvas(fromNode.col, fromNode.row, cellPx, { col: 0, row: 0 });
  const props = ELEMENT_PROPERTIES[elementType];

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = props.lineWidthPx;
  ctx.setLineDash([6, 4]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(toCursorX, toCursorY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Deformation overlay (used during simulation) ────────────────────────────

// [SIMULATION] Draws structural elements with visual deformation applied.
// displacements: Float64Array from FEM solve. nodes must have matching index order.
// scale: exaggeration multiplier for visibility.
export function drawDeformedElement(ctx, nodeA, nodeB, nodeAIndex, nodeBIndex, elementType, displacements, scale, cellPx, stressRatio) {
  const { x: ax, y: ay } = gridToCanvas(nodeA.col, nodeA.row, cellPx, { col: 0, row: 0 });
  const { x: bx, y: by } = gridToCanvas(nodeB.col, nodeB.row, cellPx, { col: 0, row: 0 });

  // Convert FEM displacements (metres) to canvas pixels
  // FEM Y is up, canvas Y is down — flip vertical displacement
  const metresToPx = cellPx / 5; // CELL_METERS = 5
  const dxA =  (displacements[3 * nodeAIndex]     ?? 0) * metresToPx * scale;
  const dyA = -(displacements[3 * nodeAIndex + 1] ?? 0) * metresToPx * scale;
  const dxB =  (displacements[3 * nodeBIndex]     ?? 0) * metresToPx * scale;
  const dyB = -(displacements[3 * nodeBIndex + 1] ?? 0) * metresToPx * scale;

  const props = ELEMENT_PROPERTIES[elementType];
  ctx.save();
  ctx.strokeStyle = stressRatioToColor(stressRatio ?? 0);
  ctx.lineWidth = props.lineWidthPx + 1;
  ctx.lineCap = 'round';
  if (elementType === 'cable') ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(ax + dxA, ay + dyA);
  ctx.lineTo(bx + dxB, by + dyB);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Colour helpers ────────────────────────────────────────────────────────────

// [SIMULATION] Maps a stress utilisation ratio to the appropriate display colour.
export function stressRatioToColor(ratio) {
  if (ratio >= 1.0)                         return STRESS_COLORS.failed;
  if (ratio >= STRESS_UTILISATION.CRITICAL) return STRESS_COLORS.critical;
  if (ratio >= STRESS_UTILISATION.MODERATE) return STRESS_COLORS.moderate;
  return STRESS_COLORS.safe;
}
