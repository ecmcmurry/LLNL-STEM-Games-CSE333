import { DEFORMATION_SCALE } from '../utils/constants.js';
import { gridToCanvas } from '../utils/math.js';
import { drawWorldSceneBackground, drawWorldStructure } from './world-canvas.js';

// ─── Force effect renderers ───────────────────────────────────────────────────

// [SIMULATION] Draws animated squiggly wind streaks crossing the full canvas.
// windAngleDeg: math-convention degrees (180 = blowing left, i.e. enters from right).
// Every streak spawns off the upwind edge and exits off the downwind edge.
export function drawWindEffect(ctx, w, h, windSpeedKmh, windAngleDeg, timeSec) {
  const COUNT  = 45;
  const rad    = (windAngleDeg * Math.PI) / 180;
  const wx     = Math.cos(rad); // unit vector wind blows TO (−1 for 180°)
  const wy     = Math.sin(rad);
  // Perpendicular to wind direction (for squiggle displacement)
  const px     = -wy;
  const py     =  wx;

  // Base travel distance for one full crossing (upwind edge → downwind edge)
  const travel = Math.abs(wx) >= Math.abs(wy) ? w : h;

  // Speed: how many full-screen widths per second
  const speedFactor = windSpeedKmh * 0.003; // ~0.36 screens/s at 120 km/h base

  ctx.save();
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < COUNT; i++) {
    const r1 = _fract(i * 0.6180339887); // golden-ratio spread
    const r2 = _fract(i * 0.3835180070);
    const r3 = _fract(i * 0.2346108960);

    // Per-streak variation
    const speedVar  = 0.65 + r2 * 0.70;           // 0.65–1.35× speed
    const len       = 120 + r1 * 220;              // streak length in px (large)
    const lw        = 2.5 + r3 * 3.5;             // lineWidth 2.5–6
    const alpha     = 0.50 + r2 * 0.40;
    const amp       = 8 + r1 * 14;                // squiggle amplitude px
    const freq      = 2.5 + r3 * 2.0;             // wave cycles per streak
    const phaseOff  = r3 * Math.PI * 2;           // each streak has its own wave phase

    // Stagger start time so streaks are spread across the canvas at t=0
    const startOffset = r1 * (travel + len);      // px offset along travel axis

    // Head position along the travel axis (wx/wy direction)
    // Moves from (travel + len) down to −len, then wraps
    const totalDist = travel + len;
    const dist = (startOffset + timeSec * speedVar * speedFactor * travel) % totalDist;
    const travelPos = totalDist - dist; // head starts at far edge, moves to near edge

    // Perpendicular lane (where in the other dimension this streak lives)
    const lanePos = r2 * (Math.abs(wx) >= Math.abs(wy) ? h : w);

    // Head world position
    let hx, hy;
    if (Math.abs(wx) >= Math.abs(wy)) {
      // Horizontal wind
      hx = wx < 0 ? travelPos - len          // entered from right, head moves left
                  : w - travelPos + len;
      hy = lanePos;
    } else {
      // Vertical wind
      hx = lanePos;
      hy = wy < 0 ? travelPos - len
                  : h - travelPos + len;
    }

    // Draw squiggly polyline from tail to head using sine displacement
    const SEGS = 18;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(200, 230, 255, 1)';
    ctx.lineWidth   = lw;
    ctx.beginPath();

    for (let s = 0; s <= SEGS; s++) {
      const t   = s / SEGS;
      // Point along the straight path from tail→head
      const ax  = hx - wx * len * (1 - t);
      const ay  = hy - wy * len * (1 - t);
      // Sine displacement perpendicular to wind direction
      // Also animate with timeSec so the squiggle "flows"
      const wave = amp * Math.sin(t * Math.PI * 2 * freq + phaseOff + timeSec * 6 * speedVar);
      const bx  = ax + px * wave;
      const by  = ay + py * wave;
      if (s === 0) ctx.moveTo(bx, by);
      else         ctx.lineTo(bx, by);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function _fract(x) { return x - Math.floor(x); }

// [SIMULATION] Draws threat-direction arrows on the canvas edge so players
// can see where the load is coming from (wind direction, quake side, etc.).
// timeSec drives a pulse animation; pass 0 for a static non-animated version.
export function drawThreatDirectionArrows(ctx, w, h, threat, timeSec) {
  if (!threat?.type) return;
  const pulse = 0.65 + 0.35 * Math.sin(timeSec * 2.5);

  switch (threat.type) {
    case 'wind': {
      const rad = (threat.windAngleDeg * Math.PI) / 180;
      const wx  = Math.cos(rad);
      const wy  = Math.sin(rad);
      _edgeArrows(ctx, w, h, wx, wy, '#64b5f6', pulse, 'WIND');
      break;
    }
    case 'gravity':
      _edgeArrows(ctx, w, h, 0, 1, '#ef5350', pulse, 'DEAD LOAD');
      break;
    case 'seismic': {
      // Arrows alternate sides with the shake frequency
      const dir = Math.sin(timeSec * (threat.frequencyHz ?? 1) * Math.PI * 2) >= 0 ? 1 : -1;
      _edgeArrows(ctx, w, h, dir, 0, '#ff9800', pulse, 'SEISMIC');
      break;
    }
    case 'flood':
      // Flood pressure pushes from the left in level 4
      _edgeArrows(ctx, w, h, 1, 0, '#42a5f5', pulse, 'FLOOD PRESSURE');
      break;
    case 'ballistic':
      _edgeArrows(ctx, w, h, 0, 1, '#f44336', pulse, 'IMPACT');
      break;
  }
}

// Draws a row of arrowheads on the edge the threat enters from,
// pointing in the direction (wx, wy) the threat travels.
function _edgeArrows(ctx, w, h, wx, wy, color, pulse, label) {
  const PAD     = 20;
  const SIZE    = 20;
  const SPACING = 72;

  ctx.save();
  ctx.fillStyle   = color;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.80 * pulse;

  const angle = Math.atan2(wy, wx); // direction arrowhead points

  if (Math.abs(wx) >= Math.abs(wy)) {
    // Horizontal threat — arrows on left or right edge
    const edgeX = wx < 0 ? w - PAD : PAD; // upwind edge
    const count = Math.max(3, Math.floor(h / SPACING));
    for (let i = 0; i < count; i++) {
      _arrowhead(ctx, edgeX, (h / (count + 1)) * (i + 1), angle, SIZE);
    }
    ctx.font         = 'bold 11px monospace';
    ctx.textAlign    = wx < 0 ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, wx < 0 ? w - PAD - SIZE - 6 : PAD + SIZE + 6, 8);
  } else {
    // Vertical threat — arrows on top or bottom edge
    const edgeY = wy < 0 ? h - PAD : PAD;
    const count = Math.max(3, Math.floor(w / SPACING));
    for (let i = 0; i < count; i++) {
      _arrowhead(ctx, (w / (count + 1)) * (i + 1), edgeY, angle, SIZE);
    }
    ctx.font         = 'bold 11px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = wy > 0 ? 'top' : 'bottom';
    ctx.fillText(label, w / 2, wy > 0 ? PAD - 2 : h - PAD + 2);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function _arrowhead(ctx, x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size * 0.85, 0);
  ctx.lineTo(-size * 0.45, -size * 0.45);
  ctx.lineTo(-size * 0.45,  size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// [SIMULATION] Shakes the canvas context to simulate ground motion during seismic events.
// Returns the translation {dx, dy} applied so the caller can draw structure at offset.
export function applySeismicShake(ctx, peakAccelerationG, timeSec, frequencyHz) {
  const amplitude = peakAccelerationG * 12; // pixels
  const dx = amplitude * Math.sin(2 * Math.PI * frequencyHz * timeSec);
  const dy = amplitude * 0.3 * Math.sin(2 * Math.PI * frequencyHz * 1.3 * timeSec + 0.7);
  ctx.translate(dx, dy);
  return { dx, dy };
}

// [SIMULATION] Draws rising floodwater overlay.
// waterRiseFraction: 0 = no water, 1 = full flood depth reached.
export function drawFloodOverlay(ctx, w, h, waterRiseFraction) {
  const waterTop = h * (0.95 - waterRiseFraction * 0.45);

  // Water body
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#1a5080';
  ctx.fillRect(0, waterTop, w, h - waterTop);
  ctx.globalAlpha = 1;

  // Animated surface ripple
  ctx.strokeStyle = '#3a90c0';
  ctx.lineWidth = 1.5;
  ctx.restore();
}

// [SIMULATION] Draws an impact flash and shockwave at the target node when a
// ballistic strike occurs. flashProgress: 0–1 (0 = just hit, 1 = faded out).
function drawBallisticImpact(ctx, impactX, impactY, flashProgress) {
  const radius = flashProgress * 60;
  const alpha  = (1 - flashProgress) * 0.9;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Shockwave ring
  ctx.strokeStyle = '#ff5252';
  ctx.lineWidth   = 3 * (1 - flashProgress);
  ctx.beginPath();
  ctx.arc(impactX, impactY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Central flash
  const flashGrad = ctx.createRadialGradient(impactX, impactY, 0, impactX, impactY, radius * 0.5);
  flashGrad.addColorStop(0, '#ffffff');
  flashGrad.addColorStop(0.3, '#ff9800');
  flashGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = flashGrad;
  ctx.beginPath();
  ctx.arc(impactX, impactY, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Dead load weight particles ──────────────────────────────────────────────

// [SIMULATION] Draws animated weight particles raining down onto each gravity load node.
// positions: array of {x, y} canvas coords (may be deformed positions).
export function drawDeadLoadParticles(ctx, positions, cellPx, activeTimeSec) {
  if (activeTimeSec <= 0) return;
  const fadeIn = Math.min(1, activeTimeSec / 0.4);

  for (const { x, y } of positions) {
    const COUNT = 16;
    for (let i = 0; i < COUNT; i++) {
      const r1 = _fract(i * 0.6180339887);
      const r2 = _fract(i * 0.3835180070);
      const r3 = _fract(i * 0.2346108960);

      const period = 0.6 + r2 * 0.7;
      const t = ((activeTimeSec + r1 * period) % period) / period;

      const dropH = cellPx * 2.4;
      const px    = x + (r2 - 0.5) * cellPx * 0.7;
      const py    = y - dropH * (1 - t);

      const fade = t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.65) / 0.35);
      const size = 3 + r3 * 4;

      ctx.save();
      ctx.globalAlpha = fadeIn * fade * 0.88;
      ctx.shadowColor = '#ff5252';
      ctx.shadowBlur  = 6;
      ctx.fillStyle   = r3 > 0.5 ? '#ff7043' : '#ef5350';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ─── Stress vibration lines ───────────────────────────────────────────────────

// [SIMULATION] Draws animated wavy lines radiating outward from stressed member midpoints.
// stressPoints: [{x, y, angle, stressRatio}] in canvas coords.
// Gives a visual "vibrating under load" feel at joints near yield.
export function drawStressLines(ctx, stressPoints, timeSec) {
  for (const { x, y, angle, stressRatio } of stressPoints) {
    if (stressRatio < 0.4) continue;
    const t = Math.min(1, (stressRatio - 0.4) / 0.6); // 0→1 as stress 40%→100%

    const baseLen  = 8 + t * 26;
    const waveAmp  = 2.5 + t * 6;
    const waveFreq = 7 + t * 14;          // vibrates faster when more stressed
    const pulse    = 0.5 + 0.5 * Math.abs(Math.sin(timeSec * (3 + t * 9)));
    const alpha    = (0.2 + t * 0.7) * pulse;
    const lw       = 1.2 + t * 1.4;
    const color    = stressRatio >= 1.0  ? '#ff1744'
                   : stressRatio >= 0.85 ? '#ff5722'
                   : stressRatio >= 0.65 ? '#ff9800'
                   :                       '#ffd600';

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    ctx.globalAlpha = alpha;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur  = 3 + t * 10;

    // 6 radiating directions: perpendicular + diagonal to member
    const DIRS = [
      angle + Math.PI * 0.5,
      angle - Math.PI * 0.5,
      angle + Math.PI * 0.25,
      angle - Math.PI * 0.25,
      angle + Math.PI * 0.75,
      angle - Math.PI * 0.75,
    ];

    for (let d = 0; d < DIRS.length; d++) {
      const a    = DIRS[d];
      const len  = baseLen * (0.6 + 0.4 * Math.sin(timeSec * 5.5 + d * 1.2));
      const perp = a + Math.PI / 2;
      const SEGS = 6;

      ctx.beginPath();
      for (let s = 0; s <= SEGS; s++) {
        const frac = s / SEGS;
        const wave = waveAmp * Math.sin(frac * Math.PI * 2.8 + timeSec * waveFreq + d * 0.8);
        const px = x + Math.cos(a) * len * frac + Math.cos(perp) * wave;
        const py = y + Math.sin(a) * len * frac + Math.sin(perp) * wave;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ─── Simulation force arrows ──────────────────────────────────────────────────

// [SIMULATION] Draws bold pulsing force arrows at deformed load node positions.
// arrowData: [{x, y, fx, fy}] — x,y in canvas coords, fx/fy in FEM force convention (fy- = down).
export function drawForceArrows(ctx, arrowData, cellPx, timeSec) {
  const pulse = 0.72 + 0.28 * Math.sin(timeSec * Math.PI * 2.2);

  for (const { x, y, fx, fy } of arrowData) {
    const mag = Math.sqrt((fx ?? 0) ** 2 + (fy ?? 0) ** 2);
    if (mag < 1e-6) continue;

    // FEM→canvas: flip Y (fy negative = downward in canvas = +Y)
    const cdx = (fx ?? 0) / mag;
    const cdy = -(fy ?? 0) / mag;

    const arrowLen = cellPx * 1.6 * pulse;
    const headLen  = cellPx * 0.55;
    const headW    = cellPx * 0.30;
    const stemW    = Math.max(4, cellPx * 0.14);

    // Arrow tip lands on the node; tail extends opposite the force direction
    const tailX = x - cdx * arrowLen;
    const tailY = y - cdy * arrowLen;
    const tipX  = x;
    const tipY  = y;

    const perp = Math.atan2(cdy, cdx) + Math.PI / 2;

    ctx.save();
    ctx.globalAlpha = 0.92 * pulse;
    ctx.shadowColor = '#ef5350';
    ctx.shadowBlur  = 20;

    // Stem
    ctx.strokeStyle = '#ef5350';
    ctx.lineWidth   = stemW;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tipX - cdx * headLen * 0.6, tipY - cdy * headLen * 0.6);
    ctx.stroke();

    // Arrowhead
    ctx.fillStyle = '#ef5350';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - cdx * headLen + Math.cos(perp) * headW,
      tipY - cdy * headLen + Math.sin(perp) * headW,
    );
    ctx.lineTo(
      tipX - cdx * headLen - Math.cos(perp) * headW,
      tipY - cdy * headLen - Math.sin(perp) * headW,
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// ─── Failed element burst ─────────────────────────────────────────────────────

// [SIMULATION] Draws a "snap" burst effect at the midpoint of a failed element.
// burstProgress: 0–1 (0 = just snapped, 1 = dissipated).
export function drawElementFailureBurst(ctx, nodeA, nodeB, burstProgress, cellPx) {
  const { x: ax, y: ay } = gridToCanvas(nodeA.col, nodeA.row, cellPx, { col: 0, row: 0 });
  const { x: bx, y: by } = gridToCanvas(nodeB.col, nodeB.row, cellPx, { col: 0, row: 0 });
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;

  const sparks = 8;
  const radius = burstProgress * 24;
  const alpha  = (1 - burstProgress) * 0.8;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ff5252';
  ctx.lineWidth   = 1.5;

  for (let i = 0; i < sparks; i++) {
    const angle = (i / sparks) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(mx + Math.cos(angle) * radius * 0.2, my + Math.sin(angle) * radius * 0.2);
    ctx.lineTo(mx + Math.cos(angle) * radius,       my + Math.sin(angle) * radius);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Gravity load arrows ──────────────────────────────────────────────────────

// [SIMULATION] Draws animated downward force arrows at load nodes for gravity levels.
// Arrows pulse in size and alpha with timeSec to convey load building up over time.
function drawGravityLoadArrows(ctx, nodes, cellPx, timeSec) {
  const pulse = 0.75 + 0.25 * Math.sin(timeSec * Math.PI * 1.5); // 0.75–1.0, 1.5 Hz
  const arrowH = 28 * pulse;
  const headH  = 10 * pulse;
  const headW  =  8 * pulse;

  ctx.save();
  ctx.strokeStyle = '#ef5350';
  ctx.fillStyle   = '#ef5350';
  ctx.globalAlpha = 0.55 + 0.35 * pulse;
  ctx.lineWidth   = 2.5;

  for (const node of nodes) {
    if (!node.isLoadNode || !node.load || node.load.fy >= 0) continue;
    const { x, y } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });

    // Stem
    ctx.beginPath();
    ctx.moveTo(x, y - arrowH);
    ctx.lineTo(x, y - headH);
    ctx.stroke();

    // Arrowhead pointing down
    ctx.beginPath();
    ctx.moveTo(x - headW / 2, y - headH);
    ctx.lineTo(x + headW / 2, y - headH);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Full simulation frame renderer ──────────────────────────────────────────

// [SIMULATION] Renders one complete frame of the simulation.
// All animation state is derived from timeSec and the simulation result —
// no mutable render state is stored here.
export function renderSimulationFrame(ctx, w, h, frameState) {
  const {
    level,
    nodes,
    elements,
    cellPx,
    timeSec,
    displacements,
    elementStressRatios,
    failureBursts,   // [{ nodeA, nodeB, startTimeSec }]
    impactEvent,     // { x, y, startTimeSec } | null
    waterRiseFraction,
  } = frameState;

  ctx.clearRect(0, 0, w, h);

  // ── Background scene ──
  ctx.save();
  if (level.threat.type === 'seismic') {
    applySeismicShake(ctx, level.threat.peakAccelerationG, timeSec, level.threat.frequencyHz);
  }
  drawWorldSceneBackground(ctx, level.scene, w, h, waterRiseFraction ?? 1);
  ctx.restore();

  // ── Wind streaks overlay ──
  if (level.threat.type === 'wind') {
    drawWindEffect(ctx, w, h, level.threat.windSpeedKmh, timeSec);
  }

  // ── Flood overlay ──
  if (level.threat.type === 'flood' && waterRiseFraction !== undefined) {
    drawFloodOverlay(ctx, w, h, waterRiseFraction);
  }

  // ── Structure (deformed and stress-coloured) ──
  // For gravity, ramp deformation in over 1.5 s so loading feels progressive.
  const deformScale = level.threat.type === 'gravity'
    ? DEFORMATION_SCALE * Math.min(1, timeSec / 1.5)
    : DEFORMATION_SCALE;
  drawWorldStructure(ctx, nodes, elements, cellPx, displacements, elementStressRatios, deformScale);

  // ── Gravity load arrows (animated) ──
  if (level.threat.type === 'gravity') {
    drawGravityLoadArrows(ctx, nodes, cellPx, timeSec);
  }

  // ── Failure bursts ──
  for (const burst of (failureBursts ?? [])) {
    const elapsed = (timeSec - burst.startTimeSec) / 0.6; // 0.6 s fade
    if (elapsed >= 0 && elapsed <= 1) {
      const { nodeA, nodeB } = burst;
      drawElementFailureBurst(ctx, nodeA, nodeB, elapsed, cellPx);
    }
  }

  // ── Ballistic impact flash ──
  if (impactEvent) {
    const elapsed = (timeSec - impactEvent.startTimeSec) / 0.8;
    if (elapsed >= 0 && elapsed <= 1) {
      drawBallisticImpact(ctx, impactEvent.x, impactEvent.y, elapsed);
    }
  }
}
