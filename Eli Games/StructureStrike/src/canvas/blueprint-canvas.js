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
const LEGEND_ROWS = 1.5; // extra rows of height reserved for the element legend strip

export function initialiseBlueprintCanvas(canvasEl, containerWidth, containerHeight) {
  const dpr = window.devicePixelRatio ?? 1;
  const cellPx = 0.95 * Math.min(containerWidth / GRID_COLS, containerHeight / (GRID_ROWS + LEGEND_ROWS));
  const w = Math.round(GRID_COLS * cellPx);
  const h = Math.round((GRID_ROWS + LEGEND_ROWS) * cellPx);

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

  // Grid lines — offset by half a cell so col=0 and col=GRID_COLS-1 have equal margins
  const inset = cellPx * 0.5;
  ctx.strokeStyle = 'rgba(0, 25, 80, 0.35)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let col = 0; col < GRID_COLS; col++) {
    const x = inset + col * cellPx;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let row = 0; row < GRID_ROWS; row++) {
    const y = inset + row * cellPx;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Grid intersection dots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  const dotR = 1.5;
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      ctx.beginPath();
      ctx.arc(inset + col * cellPx, inset + row * cellPx, dotR, 0, Math.PI * 2);
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

// [BUILD-CANVAS] Draws the element colour key in the strip below the grid,
// seamlessly continuing the blueprint aesthetic.
export function drawElementLegend(ctx, cellPx) {
  const gridW   = GRID_COLS * cellPx;
  const legendY = GRID_ROWS * cellPx;
  const stripH  = LEGEND_ROWS * cellPx;
  const totalH  = legendY + stripH;

  // ── Continue the blueprint background (dark-edge blue, same as grid corners) ──
  ctx.fillStyle = '#013c8a';
  ctx.fillRect(0, legendY, gridW, stripH);

  // Continue grid lines into legend strip
  ctx.strokeStyle = 'rgba(0, 25, 80, 0.35)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let col = 0; col <= GRID_COLS; col++) {
    ctx.moveTo(col * cellPx, legendY);
    ctx.lineTo(col * cellPx, totalH);
  }
  // One horizontal grid line at the bottom
  ctx.moveTo(0, totalH - cellPx * 0.5);
  ctx.lineTo(gridW, totalH - cellPx * 0.5);
  ctx.stroke();

  // Continue dots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  for (let col = 0; col <= GRID_COLS; col++) {
    ctx.beginPath();
    ctx.arc(col * cellPx, legendY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Dashed cutoff line — "no build below" boundary ────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([cellPx * 0.35, cellPx * 0.18]);
  ctx.beginPath();
  ctx.moveTo(0, legendY);
  ctx.lineTo(gridW, legendY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── KEY label ─────────────────────────────────────────────────────────────
  const fontSize = Math.max(13, Math.round(cellPx * 0.38));
  ctx.font         = `${fontSize}px EngineerHand, Jost, sans-serif`;
  ctx.textBaseline = 'middle';
  const cy         = legendY + stripH * 0.5;

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'left';
  ctx.fillText('KEY', cellPx * 0.3, cy);

  // ── Items ─────────────────────────────────────────────────────────────────
  const items = Object.values(ELEMENT_PROPERTIES).map(p => ({
    color: p.blueprintColor,
    name: p.displayName,
  }));

  const sqSize = Math.max(10, Math.round(cellPx * 0.27));
  const gap    = Math.round(cellPx * 0.18);
  const startX = cellPx * 2.2;
  const spacing = (gridW - startX - cellPx * 0.5) / items.length;

  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px EngineerHand, Jost, sans-serif`;

  items.forEach((item, i) => {
    const x = startX + i * spacing;

    // Filled square swatch
    ctx.fillStyle = item.color;
    ctx.fillRect(x, cy - sqSize / 2, sqSize, sqSize);

    // Thin white outline on square
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(x, cy - sqSize / 2, sqSize, sqSize);

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(item.name, x + sqSize + gap, cy);
  });

  // ── Bottom edge shadow (matches grid) ─────────────────────────────────────
  const botG = ctx.createLinearGradient(0, totalH - cellPx * 0.12, 0, totalH);
  botG.addColorStop(0, 'transparent');
  botG.addColorStop(1, 'rgba(0, 5, 30, 0.72)');
  ctx.fillStyle = botG;
  ctx.fillRect(0, totalH - cellPx * 0.12, gridW, cellPx * 0.12);
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

// ─── Requirements post-it note ───────────────────────────────────────────────

// [BUILD-CANVAS] Draws a sticky-note card in the top-left corner of the canvas
// listing the level's minimum structural requirements so the player always knows
// what they need to build before running the simulation.
export function drawRequirementsPostIt(ctx, level, cellPx) {
  const req = level.requirements;
  if (!req) return;

  const fs   = Math.max(9, Math.min(13, cellPx * 0.30)); // body font size
  const PAD  = fs * 1.0;
  const noteW = Math.max(150, cellPx * 3.6);

  // Word-wrap a string to fit inside the note width
  function wrapText(text, maxChars) {
    const words  = text.split(' ');
    const result = [];
    let   line   = '';
    for (const word of words) {
      if (line.length + word.length + 1 > maxChars) {
        if (line) result.push(line.trimEnd());
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    if (line.trim()) result.push(line.trimEnd());
    return result;
  }

  const charsPerLine = Math.floor((noteW - PAD * 2) / (fs * 0.58));

  // Build bullet list
  const bullets = [
    `Place ≥ ${req.minElements} elements`,
    'Connect every load\nnode to a support',
    'Each load node needs\nenough capacity',
  ];

  // Flatten bullets + optional hint (separated by a rule)
  const rows = []; // { text, bold, rule }
  for (const b of bullets) {
    const sub = b.split('\n');
    rows.push({ text: sub[0], bullet: true });
    for (let i = 1; i < sub.length; i++) rows.push({ text: sub[i], bullet: false, indent: true });
  }

  if (req.hint) {
    rows.push({ rule: true });
    for (const line of wrapText(req.hint, charsPerLine)) {
      rows.push({ text: line, italic: true });
    }
  }

  const headerH = fs * 2.0;
  const lineH   = fs * 1.55;
  const noteH   = headerH + PAD * 0.6 + rows.length * lineH + PAD * 0.8;

  // Place in top-left with a small margin
  const noteX = cellPx * 0.22;
  const noteY = cellPx * 0.22;

  ctx.save();

  // Tilt slightly for sticky-note feel
  ctx.translate(noteX + noteW / 2, noteY + noteH / 2);
  ctx.rotate(-0.025);
  ctx.translate(-(noteX + noteW / 2), -(noteY + noteH / 2));

  // Drop shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur    = 8;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 5;

  // Paper body — warm yellow
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(noteX, noteY, noteW, noteH);

  // Clear shadow before drawing text/details
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Header strip — darker amber
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(noteX, noteY, noteW, headerH);

  // Subtle horizontal ruled lines on the body (like real notepaper)
  ctx.strokeStyle = 'rgba(180,140,40,0.25)';
  ctx.lineWidth   = 0.7;
  for (let ry = noteY + headerH + lineH; ry < noteY + noteH - 4; ry += lineH) {
    ctx.beginPath();
    ctx.moveTo(noteX + PAD * 0.5, ry);
    ctx.lineTo(noteX + noteW - PAD * 0.5, ry);
    ctx.stroke();
  }

  // Header label
  ctx.fillStyle    = '#78350f';
  ctx.font         = `bold ${fs + 1}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('REQUIREMENTS', noteX + noteW / 2, noteY + headerH / 2);

  // Bullet rows
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  let ry = noteY + headerH + PAD * 0.6;

  for (const row of rows) {
    if (row.rule) {
      ctx.strokeStyle = 'rgba(120,90,20,0.35)';
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(noteX + PAD, ry + lineH * 0.45);
      ctx.lineTo(noteX + noteW - PAD, ry + lineH * 0.45);
      ctx.stroke();
      ry += lineH;
      continue;
    }

    const indent = row.indent ? PAD * 1.2 : 0;
    ctx.fillStyle = '#1c1c1c';
    ctx.font      = row.italic
      ? `italic ${fs - 1}px sans-serif`
      : row.bullet
        ? `bold ${fs}px sans-serif`
        : `${fs}px sans-serif`;

    const prefix = row.bullet ? '• ' : row.indent ? '' : '';
    ctx.fillText(prefix + row.text, noteX + PAD + indent, ry);
    ry += lineH;
  }

  // Folded bottom-right corner (page-curl effect)
  const fold = Math.max(10, cellPx * 0.28);
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.moveTo(noteX + noteW - fold, noteY + noteH);
  ctx.lineTo(noteX + noteW,        noteY + noteH - fold);
  ctx.lineTo(noteX + noteW,        noteY + noteH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth   = 0.8;
  ctx.stroke();
  // Shadow under fold
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.moveTo(noteX + noteW - fold, noteY + noteH);
  ctx.lineTo(noteX + noteW,        noteY + noteH - fold);
  ctx.lineTo(noteX + noteW - fold * 0.3, noteY + noteH - fold * 0.3);
  ctx.closePath();
  ctx.fill();

  // Thin border around the whole note
  ctx.strokeStyle = 'rgba(180,140,40,0.5)';
  ctx.lineWidth   = 0.8;
  ctx.strokeRect(noteX, noteY, noteW, noteH);

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
