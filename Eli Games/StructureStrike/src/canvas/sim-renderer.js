import { DEFORMATION_SCALE } from '../utils/constants.js';
import { gridToCanvas } from '../utils/math.js';
import { drawWorldSceneBackground, drawWorldStructure } from './world-canvas.js';

// ─── Force effect renderers ───────────────────────────────────────────────────

// [SIMULATION] Draws animated wind streaks blowing across the canvas.
// timeSec drives the particle positions — call on every rAF frame.
function drawWindEffect(ctx, w, h, windSpeedKmh, timeSec) {
  const numStreaks = Math.floor(windSpeedKmh / 10);
  ctx.save();
  ctx.strokeStyle = '#90caf966';
  ctx.lineWidth = 1.2;

  for (let i = 0; i < numStreaks; i++) {
    const seed  = (i * 137.5) % 1;
    const y     = seed * h;
    const speed = (windSpeedKmh / 3.6) * 0.06; // scaled for canvas px/s
    const x     = ((timeSec * speed * (0.8 + seed * 0.4) + seed * w) % (w * 1.2)) - w * 0.1;
    const len   = 20 + seed * 40;

    ctx.globalAlpha = 0.3 + seed * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (seed - 0.5) * 4);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// [SIMULATION] Shakes the canvas context to simulate ground motion during seismic events.
// Returns the translation {dx, dy} applied so the caller can draw structure at offset.
function applySeismicShake(ctx, peakAccelerationG, timeSec, frequencyHz) {
  const amplitude = peakAccelerationG * 12; // pixels
  const dx = amplitude * Math.sin(2 * Math.PI * frequencyHz * timeSec);
  const dy = amplitude * 0.3 * Math.sin(2 * Math.PI * frequencyHz * 1.3 * timeSec + 0.7);
  ctx.translate(dx, dy);
  return { dx, dy };
}

// [SIMULATION] Draws rising floodwater overlay.
// waterRiseFraction: 0 = no water, 1 = full flood depth reached.
function drawFloodOverlay(ctx, w, h, waterRiseFraction) {
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
