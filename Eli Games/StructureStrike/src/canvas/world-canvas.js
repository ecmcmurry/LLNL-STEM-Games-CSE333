import { GRID_COLS, GRID_ROWS, ELEMENT_PROPERTIES } from '../utils/constants.js';
import { gridToCanvas } from '../utils/math.js';
import { stressRatioToColor, drawDeformedElement } from './blueprint-canvas.js';

// ─── Scene background renderers ───────────────────────────────────────────────
// Each scene is drawn entirely with Canvas 2D primitives — no image assets.
// Parameters:
//   ctx        – 2D context
//   w, h       – full canvas size in CSS pixels
//   gl, gt     – grid left / grid top (screen position of cell [0,0])
//   gw, gh     – grid pixel width / height  (GRID_COLS*cp, GRID_ROWS*cp)
//   cp         – cell size in pixels
//   timeSec    – elapsed wall-clock seconds (for animation)
//   extras     – scene-specific (waterRiseFraction, activeTimeSec, …)

// ─── Level 1 ──────────────────────────────────────────────────────────────────
// Industrial warehouse interior. Structure holds up a suspended roof platform.
// Anchor row=12, load nodes at row=3.
function drawWarehouseScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec) {
  const floorY   = gt + gh;
  const lightCols = [3, 7, 10, 13, 17];

  // ── Dark steel background ──
  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, w, h);

  // Back wall: dark corrugated steel panels
  for (let col = 0; col < 20; col++) {
    const shade = col % 2 === 0 ? '#0d1018' : '#0b0e14';
    ctx.fillStyle = shade;
    ctx.fillRect(gl + col * cp, gt, cp, gh);
  }

  // Side walls (outside grid)
  ctx.fillStyle = '#0c0f14';
  ctx.fillRect(0, 0, gl, h);
  ctx.fillRect(gl + gw, 0, w - gl - gw, h);

  // Vertical structural columns every 4 grid-columns
  for (let col = 0; col <= 20; col += 4) {
    const cx = gl + col * cp;
    // Column body
    ctx.fillStyle = '#181e28';
    ctx.fillRect(cx - cp * 0.15, gt - cp * 3, cp * 0.3, gh + cp * 3 + (h - floorY));
    // Reflective edge highlight
    ctx.fillStyle = '#222d3a';
    ctx.fillRect(cx - cp * 0.15, gt - cp * 3, cp * 0.055, gh + cp * 3 + (h - floorY));
  }

  // ── Ceiling steel framework ──
  for (let i = 0; i < 5; i++) {
    const by = gt - cp * (0.5 + i * 0.7);
    const beamH = cp * 0.28;
    // Web (I-beam body)
    ctx.fillStyle = '#141c26';
    ctx.fillRect(0, by - beamH / 2, w, beamH);
    // Top flange
    ctx.fillStyle = '#1e2a36';
    ctx.fillRect(0, by - beamH / 2 - cp * 0.07, w, cp * 0.07);
    // Bottom flange
    ctx.fillStyle = '#1a2430';
    ctx.fillRect(0, by + beamH / 2, w, cp * 0.06);
    // Warren truss diagonals between adjacent beams
    if (i < 4) {
      const nextY = gt - cp * (0.5 + (i + 1) * 0.7);
      ctx.strokeStyle = '#1a2230';
      ctx.lineWidth = 1.2;
      for (let x = 0; x < w; x += cp * 3) {
        ctx.beginPath();
        ctx.moveTo(x,          by - beamH / 2);
        ctx.lineTo(x + cp * 3, nextY + beamH / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + cp * 3, by - beamH / 2);
        ctx.lineTo(x,          nextY + beamH / 2);
        ctx.stroke();
      }
    }
  }

  // ── Overhead crane gantry ──
  const craneY = gt - cp * 0.25;
  // Runway rails
  ctx.fillStyle = '#2a3848';
  ctx.fillRect(gl - cp * 0.4, craneY - cp * 0.12, gw + cp * 0.8, cp * 0.18);
  ctx.fillRect(gl - cp * 0.4, craneY + cp * 0.05, gw + cp * 0.8, cp * 0.06);

  // Trolley — slow back-and-forth
  const trolleyX = gl + gw * (0.5 + 0.32 * Math.sin(timeSec * 0.18));
  ctx.fillStyle = '#d4820a';
  ctx.fillRect(trolleyX - cp * 0.55, craneY - cp * 0.5, cp * 1.1, cp * 0.5);
  ctx.fillStyle = '#f5a623';
  ctx.fillRect(trolleyX - cp * 0.42, craneY - cp * 0.44, cp * 0.84, cp * 0.38);
  // Wheels on rail
  for (const side of [-0.38, 0.38]) {
    ctx.fillStyle = '#1a222e';
    ctx.beginPath();
    ctx.arc(trolleyX + side * cp, craneY, cp * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hoist chain
  const hookLen = cp * 2.2;
  ctx.strokeStyle = '#344050';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([cp * 0.12, cp * 0.1]);
  ctx.beginPath();
  ctx.moveTo(trolleyX, craneY + cp * 0.05);
  ctx.lineTo(trolleyX, craneY + hookLen);
  ctx.stroke();
  ctx.setLineDash([]);
  // Hook
  ctx.strokeStyle = '#5a6878';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(trolleyX, craneY + hookLen + cp * 0.17, cp * 0.17, Math.PI * 0.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // ── High-bay light fixtures ──
  for (const col of lightCols) {
    const lx     = gl + col * cp;
    const fixY   = gt - cp * 2.6;
    const flicker = 0.96 + 0.04 * Math.sin(timeSec * 14.3 + col * 6.7);

    // Suspension wire
    ctx.strokeStyle = '#2a3848';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, fixY);
    ctx.stroke();

    // Reflector bowl (light grey aluminium)
    ctx.fillStyle = '#c8cdd4';
    ctx.beginPath();
    ctx.ellipse(lx, fixY + cp * 0.3, cp * 0.55, cp * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a0a8b0';
    ctx.fillRect(lx - cp * 0.38, fixY, cp * 0.76, cp * 0.32);

    // Bulb — bright white-amber
    ctx.fillStyle = `rgba(255,245,200,${flicker})`;
    ctx.beginPath();
    ctx.arc(lx, fixY + cp * 0.28, cp * 0.16, 0, Math.PI * 2);
    ctx.fill();
    // Inner hotspot
    ctx.fillStyle = `rgba(255,255,240,${flicker})`;
    ctx.beginPath();
    ctx.arc(lx, fixY + cp * 0.28, cp * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Volumetric light cone (3 transparent triangle passes)
    const coneH = cp * 8;
    const coneW = cp * 3.8;
    for (let pass = 0; pass < 3; pass++) {
      const a = (0.10 - pass * 0.028) * flicker;
      const spreadW = coneW * (1 + pass * 0.35);
      const grad = ctx.createLinearGradient(lx, fixY + cp * 0.3, lx, fixY + coneH);
      grad.addColorStop(0,   `rgba(255,230,160,${a * 1.6})`);
      grad.addColorStop(0.5, `rgba(255,210,130,${a})`);
      grad.addColorStop(1,   `rgba(255,200,100,0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(lx - cp * 0.25, fixY + cp * 0.3);
      ctx.lineTo(lx - spreadW,   fixY + coneH);
      ctx.lineTo(lx + spreadW,   fixY + coneH);
      ctx.closePath();
      ctx.fill();
    }

    // Light pool on floor
    const poolGrad = ctx.createRadialGradient(lx, floorY, 0, lx, floorY, coneW * 0.75);
    poolGrad.addColorStop(0, `rgba(255,230,150,${0.14 * flicker})`);
    poolGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.ellipse(lx, floorY, coneW * 0.75, cp * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Factory floor ──
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
  floorGrad.addColorStop(0,   '#1e2228');
  floorGrad.addColorStop(0.4, '#191c22');
  floorGrad.addColorStop(1,   '#14171c');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, w, h - floorY);

  // Concrete expansion joints
  ctx.strokeStyle = '#252930';
  ctx.lineWidth = 1;
  for (let x = gl % (cp * 2.5); x < w; x += cp * 2.5) {
    ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = floorY + cp * 0.5; y < h; y += cp) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Yellow safety lane lines
  ctx.strokeStyle = '#c8880044';
  ctx.lineWidth = cp * 0.12;
  for (const laneX of [gl + cp * 0.8, gl + gw - cp * 0.8]) {
    ctx.beginPath();
    ctx.moveTo(laneX, floorY);
    ctx.lineTo(laneX, h);
    ctx.stroke();
  }

  // Hazard stripes beneath anchor columns
  for (const anchorCol of [3, 17]) {
    const ax    = gl + anchorCol * cp;
    const sW    = cp * 1.8;
    const sH    = cp * 0.9;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax - sW / 2, floorY, sW, sH);
    ctx.clip();
    ctx.lineWidth = cp * 0.22;
    for (let sx = ax - sW * 1.5; sx < ax + sW * 2; sx += cp * 0.42) {
      ctx.strokeStyle = (Math.floor((sx - ax + sW * 1.5) / (cp * 0.42)) % 2 === 0)
        ? '#c8880055' : '#08080a55';
      ctx.beginPath();
      ctx.moveTo(sx,           floorY);
      ctx.lineTo(sx + cp * 0.75, floorY + sH);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Warning beacons at anchor columns ──
  for (const anchorCol of [3, 17]) {
    const bx    = gl + anchorCol * cp;
    const by    = gt + 10.5 * cp;
    const pulse = 0.45 + 0.45 * Math.sin(timeSec * 2.8 + (anchorCol === 3 ? 0 : Math.PI));
    // Housing
    ctx.fillStyle = '#1a1c1e';
    ctx.fillRect(bx - cp * 0.12, by - cp * 0.28, cp * 0.24, cp * 0.28);
    // Glow
    const bglow = ctx.createRadialGradient(bx, by, 0, bx, by, cp * 0.9);
    bglow.addColorStop(0, `rgba(255,100,20,${pulse * 0.7})`);
    bglow.addColorStop(0.5, `rgba(255,80,10,${pulse * 0.25})`);
    bglow.addColorStop(1, 'transparent');
    ctx.fillStyle = bglow;
    ctx.beginPath();
    ctx.arc(bx, by, cp * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Skylights on side walls ──
  const sideGap = Math.min(gl, w - gl - gw);
  if (sideGap > cp * 1.2) {
    for (const [wallX, dir] of [[gl * 0.35, 1], [gl + gw + sideGap * 0.35, -1]]) {
      for (let i = 0; i < 2; i++) {
        const wy = gt + cp * (1.5 + i * 3);
        const ww = Math.min(sideGap * 0.7, cp * 2.2);
        const wh = cp * 1.8;
        // Frame
        ctx.fillStyle = '#1a2030';
        ctx.fillRect(wallX - ww / 2, wy, ww, wh);
        ctx.strokeStyle = '#2a3848';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wallX - ww / 2, wy, ww, wh);
        // Dim daylight glow inside
        const winGrad = ctx.createLinearGradient(wallX - ww / 2, wy, wallX + ww / 2, wy);
        winGrad.addColorStop(dir === 1 ? 0 : 1, '#3a5a7818');
        winGrad.addColorStop(dir === 1 ? 1 : 0, '#1a2a3808');
        ctx.fillStyle = winGrad;
        ctx.fillRect(wallX - ww / 2 + 2, wy + 2, ww - 4, wh - 4);
        // Cross frame
        ctx.strokeStyle = '#243040';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wallX, wy); ctx.lineTo(wallX, wy + wh);
        ctx.moveTo(wallX - ww / 2, wy + wh / 2); ctx.lineTo(wallX + ww / 2, wy + wh / 2);
        ctx.stroke();
      }
    }
  }

  // ── Floating dust motes in light beams ──
  for (let i = 0; i < 22; i++) {
    const col    = lightCols[i % lightCols.length];
    const lx     = gl + col * cp;
    const moteX  = lx + Math.sin(i * 9.7 + timeSec * 0.25) * cp * 1.6;
    const moteY  = gt + cp * 0.5 + ((timeSec * cp * 0.12 + i * cp * 2.7) % (gh * 1.05));
    const inCone = Math.abs(moteX - lx) < ((moteY - (gt - cp * 2.6)) * 0.45 + cp * 0.2);
    if (inCone) {
      const alpha = 0.12 + 0.1 * Math.sin(i * 2.3 + timeSec * 1.4);
      ctx.fillStyle = `rgba(255,230,160,${alpha})`;
      ctx.beginPath();
      ctx.arc(moteX, moteY, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ─── Level 2 ──────────────────────────────────────────────────────────────────
// Coastal observation tower in a storm from the right.
// Anchor row=13, tower rises to row=2.
function drawCoastalScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec) {
  // Full stormy sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#0a0f1c');
  skyGrad.addColorStop(1, '#1a2030');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Storm clouds — 6 large dark masses moving left (wind from right)
  const clouds = [
    { bx: w * 0.05, by: h * 0.04, rx: w * 0.28, ry: h * 0.09, spd: 18, seed: 0 },
    { bx: w * 0.35, by: h * 0.02, rx: w * 0.22, ry: h * 0.07, spd: 13, seed: 1 },
    { bx: w * 0.60, by: h * 0.06, rx: w * 0.30, ry: h * 0.11, spd: 22, seed: 2 },
    { bx: w * 0.15, by: h * 0.14, rx: w * 0.25, ry: h * 0.08, spd: 16, seed: 3 },
    { bx: w * 0.50, by: h * 0.15, rx: w * 0.20, ry: h * 0.07, spd: 20, seed: 4 },
    { bx: w * 0.80, by: h * 0.09, rx: w * 0.26, ry: h * 0.10, spd: 14, seed: 5 },
  ];
  for (const c of clouds) {
    const cx = ((c.bx - timeSec * c.spd) % (w + c.rx * 2) + (w + c.rx * 2)) % (w + c.rx * 2) - c.rx;
    const cy = c.by;
    // Shadow layer
    ctx.fillStyle = '#0d1a28';
    ctx.beginPath();
    ctx.ellipse(cx + c.rx * 0.1, cy + c.ry * 0.2, c.rx * 0.95, c.ry * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Main cloud
    ctx.fillStyle = '#1a2535';
    ctx.beginPath();
    ctx.ellipse(cx, cy, c.rx, c.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight top edge
    ctx.fillStyle = '#1f2d3e';
    ctx.beginPath();
    ctx.ellipse(cx - c.rx * 0.05, cy - c.ry * 0.1, c.rx * 0.75, c.ry * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant city lights — faint scattered pixels
  for (let i = 0; i < 30; i++) {
    const lx = (Math.sin(i * 17.3) * 0.45 + 0.5) * w;
    const ly = gt + gh * 0.65 + Math.sin(i * 5.7) * cp * 1.5;
    ctx.fillStyle = '#ffcc4408';
    ctx.fillRect(lx, ly, 2, 1);
  }

  // Ocean fill (from anchor row down to screen bottom)
  const oceanTop = gt + 13 * cp;
  const oceanGrad = ctx.createLinearGradient(0, oceanTop, 0, h);
  oceanGrad.addColorStop(0, '#0d2840');
  oceanGrad.addColorStop(1, '#091820');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, oceanTop, w, h - oceanTop);

  // Rocky cliff/ground at base of tower
  ctx.fillStyle = '#1a1e24';
  ctx.beginPath();
  ctx.moveTo(0, oceanTop);
  for (let x = 0; x <= w; x += cp * 0.5) {
    const bumpY = oceanTop + cp * 0.4 * (Math.sin(x / (cp * 1.8) + 2.3) * 0.5 + 0.5);
    ctx.lineTo(x, bumpY);
  }
  ctx.lineTo(w, oceanTop + cp);
  ctx.lineTo(0, oceanTop + cp);
  ctx.closePath();
  ctx.fill();

  // Animated waves — 8 sine lines on ocean surface
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(26,74,112,${0.55 - i * 0.04})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const waveY = oceanTop + i * 8;
    for (let x = 0; x <= w; x += 4) {
      const y = waveY + Math.sin(x / 80 + timeSec * 2 + i) * 5;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Wave foam — lighter dashes on crests
  ctx.strokeStyle = '#4a8ab055';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const waveY = oceanTop + i * 11 + 2;
    ctx.beginPath();
    for (let x = 0; x < w; x += 18) {
      const y = waveY + Math.sin(x / 80 + timeSec * 2 + i) * 5;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 + Math.sin(x + i) * 3, y + 0.5);
    }
    ctx.stroke();
  }

  // Driving rain streaks — 30 diagonal lines, top-right to bottom-left
  ctx.save();
  for (let i = 0; i < 30; i++) {
    const baseX = (Math.sin(i * 11.7) * 0.5 + 0.5) * w;
    const baseY = (Math.sin(i * 7.3) * 0.5 + 0.5) * h * 0.7;
    const speed = 180 + Math.sin(i * 3.1) * 40;
    const len   = 15 + Math.sin(i * 5.9) * 10;
    const phase = (timeSec * speed * 0.001 + i * 0.14) % 1;
    const rx = baseX - phase * w * 0.4;
    const ry = baseY + phase * h * 0.9;
    const alpha = 0.18 + Math.sin(i * 4.2) * 0.085;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#a0c0e0';
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + len * 0.4, ry + len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Level 3 ──────────────────────────────────────────────────────────────────
// Urban night scene with seismic ground cracks.
// Anchor row=13, multi-story building with nodes at rows 5 and 9.
function drawUrbanSeismicScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec, activeTimeSec = 0) {
  const groundY = gt + 13 * cp;

  // Night sky
  ctx.fillStyle = '#060610';
  ctx.fillRect(0, 0, w, groundY);

  // Stars — 50 deterministic dots, some flickering during seismic
  const flickerRate = activeTimeSec > 0 ? 8 : 0.5;
  for (let i = 0; i < 50; i++) {
    const sx = (Math.sin(i * 137.508) * 0.45 + 0.5) * w;
    const sy = (Math.sin(i * 73.137) * 0.45 + 0.15) * groundY;
    const alpha = 0.5 + 0.5 * Math.sin(i * 2.3 + timeSec * flickerRate);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Background buildings — 12 dark rectangles with lit windows
  for (let i = 0; i < 12; i++) {
    const bseed = Math.sin(i * 9.301) * 0.5 + 0.5;
    const bw    = w / 12;
    const bh    = groundY * (0.25 + bseed * 0.5);
    const bx    = i * bw - bw * 0.05;
    const by    = groundY - bh;
    ctx.fillStyle = '#0e0e1e';
    ctx.fillRect(bx, by, bw * 1.05, bh);
    // Window grid
    const wCols = Math.max(1, Math.floor(bw * 0.8 / 10));
    const wRows = Math.max(1, Math.floor(bh / 14));
    for (let r = 0; r < wRows; r++) {
      for (let c = 0; c < wCols; c++) {
        const lit = Math.sin(i * 3.7 + r * 1.3 + c * 2.1) > 0.25;
        if (lit) {
          ctx.fillStyle = '#ffcc4420';
          ctx.fillRect(bx + bw * 0.1 + c * 10 + 1, by + r * 14 + 3, 7, 9);
        }
      }
    }
  }

  // Street ground (groundY → screen bottom)
  const streetGrad = ctx.createLinearGradient(0, groundY, 0, h);
  streetGrad.addColorStop(0, '#141418');
  streetGrad.addColorStop(1, '#0e0e14');
  ctx.fillStyle = streetGrad;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Road markings — dashed center line
  ctx.strokeStyle = '#2a2a1e';
  ctx.lineWidth = 2;
  ctx.setLineDash([w * 0.04, w * 0.04]);
  ctx.beginPath();
  ctx.moveTo(0, groundY + (h - groundY) * 0.45);
  ctx.lineTo(w, groundY + (h - groundY) * 0.45);
  ctx.stroke();
  ctx.setLineDash([]);

  // Street lamps — 4 tall thin posts with circular glow halos
  const lampXs = [gl * 0.3, gl + gw * 0.25, gl + gw * 0.75, gl + gw + (w - gl - gw) * 0.7];
  for (const lx of lampXs) {
    // Post
    ctx.fillStyle = '#1e1e28';
    ctx.fillRect(lx - 2, groundY - cp * 3, 4, cp * 3);
    // Arm
    ctx.fillRect(lx - 2, groundY - cp * 3, cp * 0.6, 3);
    // Glow halo
    const glow = ctx.createRadialGradient(lx + cp * 0.3, groundY - cp * 3, 0, lx + cp * 0.3, groundY - cp * 3, cp * 1.4);
    glow.addColorStop(0, '#ffee8830');
    glow.addColorStop(0.4, '#ffcc4414');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx + cp * 0.3, groundY - cp * 3, cp * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Seismic: ground cracks emanating from anchor positions
  if (activeTimeSec > 0) {
    const crackGrow = Math.min(1, activeTimeSec / 1.5);
    // Anchor cols at grid positions (anchors on anchor row=13 → ground level)
    for (const anchorCol of [3, 17]) {
      const ax = gl + anchorCol * cp;
      const ay = groundY;
      // 6 jagged crack arms spreading outward on the ground plane
      for (let arm = 0; arm < 6; arm++) {
        const baseAngle = (arm / 6) * Math.PI; // spread along ground (horizontal only roughly)
        const armAngle  = baseAngle + (Math.sin(arm * 3.7 + anchorCol) * 0.4);
        const armLen    = crackGrow * (cp * (1.2 + Math.sin(arm * 2.1) * 0.6));
        ctx.strokeStyle = '#28180888';
        ctx.lineWidth = 1.2 - arm * 0.1;
        ctx.beginPath();
        let cx2 = ax, cy2 = ay;
        ctx.moveTo(cx2, cy2);
        const segs = 5;
        for (let s = 0; s < segs; s++) {
          const frac = ((s + 1) / segs) * armLen;
          const jitter = (Math.sin(arm * 7.1 + s * 3.3) * 0.3);
          cx2 = ax + Math.cos(armAngle + jitter) * frac;
          cy2 = ay + Math.abs(Math.sin(armAngle + jitter) * frac) * 0.4;
          ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
      }
      // Dust cloud rising from crack base
      for (let d = 0; d < 6; d++) {
        const dustX = ax + (Math.sin(d * 5.9 + anchorCol) * cp * 0.8);
        const dustRise = ((timeSec * cp * 0.6 + d * cp * 1.2) % (cp * 3)) * crackGrow;
        const dustY    = ay - dustRise;
        const dustA    = (1 - dustRise / (cp * 3)) * 0.18 * crackGrow;
        ctx.fillStyle  = `rgba(40,24,8,${dustA})`;
        ctx.beginPath();
        ctx.arc(dustX, dustY, cp * (0.3 + Math.sin(d * 2.1) * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ─── Level 4 ──────────────────────────────────────────────────────────────────
// Harbor floodgate. Flood water on the left, protected area on the right.
// Structure spans between walls at col 3 and col 17.
function drawHarborFloodScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec, waterRiseFraction = 1.0) {
  // Heavy overcast sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, gt + 13 * cp);
  skyGrad.addColorStop(0, '#0e1218');
  skyGrad.addColorStop(1, '#1a2028');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, gt + 13 * cp);

  // Right side protected ground/dock (#1e1c18) — drawn first as base
  ctx.fillStyle = '#1e1c18';
  ctx.fillRect(gl + 10 * cp, gt + 13 * cp, w - (gl + 10 * cp), h - (gt + 13 * cp));

  // Harbor walls: concrete vertical structures at left and right screen edges
  const wallColor = '#262420';
  const wallHighlight = '#302e2a';
  // Left wall
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, gt + 6 * cp, gl + 3 * cp, h - (gt + 6 * cp));
  ctx.fillStyle = wallHighlight;
  ctx.fillRect(gl + 3 * cp - cp * 0.25, gt + 6 * cp, cp * 0.25, h - (gt + 6 * cp));
  // Right wall
  ctx.fillStyle = wallColor;
  ctx.fillRect(gl + 17 * cp, gt + 6 * cp, w - (gl + 17 * cp), h - (gt + 6 * cp));
  ctx.fillStyle = wallHighlight;
  ctx.fillRect(gl + 17 * cp, gt + 6 * cp, cp * 0.25, h - (gt + 6 * cp));

  // Flood water on the left side
  const gateX    = gl + 10 * cp;
  const groundY  = gt + 13 * cp;
  const waterTop = groundY - waterRiseFraction * 8 * cp;
  if (waterRiseFraction > 0) {
    // Depth pressure gradient — vertical bands of increasingly dark blue-green
    for (let band = 0; band < 6; band++) {
      const bandTop = waterTop + (groundY - waterTop) * (band / 6);
      const bandBot = waterTop + (groundY - waterTop) * ((band + 1) / 6);
      const alpha   = 0.55 + band * 0.07;
      const blue    = Math.max(20, 50 - band * 5);
      ctx.fillStyle = `rgba(10,${blue},${40 + band * 3},${alpha})`;
      ctx.fillRect(0, bandTop, gateX, bandBot - bandTop);
    }

    // Animated wave surface line
    ctx.strokeStyle = '#2a6a9044';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let x = 0; x <= gateX; x += 4) {
      const y = waterTop + Math.sin(x / 60 + timeSec * 1.8) * 3 * waterRiseFraction;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Animated pressure ripples — arcs moving from left toward gate center
    for (let r = 0; r < 4; r++) {
      const phase = (timeSec * 0.6 + r * 0.7) % 2.5;
      const rippleX = gateX * (0.2 + phase * 0.32);
      const rippleY = waterTop + (groundY - waterTop) * 0.35;
      const rippleR = phase * gateX * 0.18;
      const alpha   = Math.max(0, (1.2 - phase) * 0.15);
      ctx.strokeStyle = `rgba(40,100,150,${alpha})`;
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.arc(rippleX, rippleY, rippleR, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
    }
  }

  // Rain streaks — 40 thin near-vertical lines falling downward
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const baseX  = (Math.sin(i * 13.7) * 0.5 + 0.5) * w;
    const speed  = 220 + Math.sin(i * 4.7) * 40;
    const len    = 20 + Math.sin(i * 6.3) * 8;
    const phase  = (timeSec * speed * 0.0008 + i * 0.12) % 1;
    const rx     = baseX + phase * w * 0.04;
    const ry     = phase * h;
    ctx.globalAlpha = 0.18 + Math.sin(i * 3.1) * 0.07;
    ctx.strokeStyle = '#a0b0c0';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + len * 0.08, ry + len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Level 5 ──────────────────────────────────────────────────────────────────
// Hardened bunker/military facility with ballistic impact.
// Anchors row=13, impact at row=2.
function drawBunkerScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec) {
  const groundY = gt + 13 * cp;

  // Sky: near-black with smoke haze
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, '#060608');
  skyGrad.addColorStop(1, '#0e0e10');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, groundY);

  // Above structure top: dark smoke haze gradient, denser toward impact
  const impactY = gt + 2 * cp;
  const hazeGrad = ctx.createLinearGradient(0, 0, 0, gt + 6 * cp);
  hazeGrad.addColorStop(0, '#14140e22');
  hazeGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = hazeGrad;
  ctx.fillRect(0, 0, w, gt + 6 * cp);

  // Smoke clouds — 4 dark grey masses slowly drifting
  const smokeClouds = [
    { bx: w * 0.30, by: gt * 0.4, rx: w * 0.18, ry: cp * 2.2, driftX:  8, driftY: 2, seed: 0 },
    { bx: w * 0.55, by: gt * 0.25, rx: w * 0.14, ry: cp * 1.6, driftX: -5, driftY: 3, seed: 1 },
    { bx: w * 0.45, by: gt * 0.55, rx: w * 0.20, ry: cp * 2.4, driftX: 11, driftY:-2, seed: 2 },
    { bx: w * 0.20, by: gt * 0.70, rx: w * 0.15, ry: cp * 1.8, driftX: -7, driftY: 1, seed: 3 },
  ];
  for (const sc of smokeClouds) {
    const scx = sc.bx + Math.sin(timeSec * 0.08 + sc.seed * 2.1) * sc.driftX;
    const scy = sc.by + Math.sin(timeSec * 0.05 + sc.seed * 1.7) * sc.driftY;
    const shadowGrad = ctx.createRadialGradient(scx, scy + sc.ry * 0.2, 0, scx, scy, sc.rx);
    shadowGrad.addColorStop(0, '#12120e');
    shadowGrad.addColorStop(0.6, '#1a1a1e');
    shadowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(scx, scy, sc.rx, sc.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Desert ground
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
  groundGrad.addColorStop(0, '#1e1408');
  groundGrad.addColorStop(1, '#140e06');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Subtle ground texture lines
  ctx.strokeStyle = '#1a120608';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    const lx = (Math.sin(i * 5.7) * 0.4 + 0.5) * w;
    const ly = groundY + (Math.sin(i * 3.2) * 0.4 + 0.5) * (h - groundY) * 0.7;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + cp * (0.5 + Math.sin(i * 2.1) * 0.3), ly + 1.5);
    ctx.stroke();
  }

  // Blast craters on the ground near impact zone (col ~10)
  const craterData = [
    { cx: gl + 10 * cp,           cy: groundY + cp * 0.4, rx: cp * 1.1, ry: cp * 0.4 },
    { cx: gl + 10 * cp - cp * 2,  cy: groundY + cp * 0.6, rx: cp * 0.7, ry: cp * 0.25 },
    { cx: gl + 10 * cp + cp * 1.6, cy: groundY + cp * 0.35, rx: cp * 0.85, ry: cp * 0.3 },
  ];
  for (const cr of craterData) {
    // Rim (slightly lighter)
    ctx.fillStyle = '#201810';
    ctx.beginPath();
    ctx.ellipse(cr.cx, cr.cy, cr.rx * 1.15, cr.ry * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dark center
    ctx.fillStyle = '#0e0a06';
    ctx.beginPath();
    ctx.ellipse(cr.cx, cr.cy, cr.rx, cr.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blast walls at left and right screen edges
  const bwColor = '#1c1a18';
  const bwTop   = '#2a2826';
  // Left blast wall
  ctx.fillStyle = bwColor;
  ctx.fillRect(0, groundY - cp * 3, gl + cp, cp * 3);
  ctx.fillStyle = bwTop;
  ctx.fillRect(0, groundY - cp * 3 - 3, gl + cp, 5);
  // Right blast wall
  ctx.fillStyle = bwColor;
  ctx.fillRect(gl + gw - cp, groundY - cp * 3, w - (gl + gw - cp), cp * 3);
  ctx.fillStyle = bwTop;
  ctx.fillRect(gl + gw - cp, groundY - cp * 3 - 3, w - (gl + gw - cp), 5);

  // Barbed wire silhouette across tops of blast walls
  ctx.strokeStyle = '#1e1e1e';
  ctx.lineWidth = 1.2;
  // Left wall barbed wire
  ctx.beginPath();
  for (let x = 0; x <= gl + cp; x += 8) {
    const wy = groundY - cp * 3 - 3 + Math.sin(x * 0.8) * 2;
    if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
    if (x % 16 < 8) {
      ctx.moveTo(x, wy); ctx.lineTo(x + 4, wy - 4);
      ctx.moveTo(x, wy); ctx.lineTo(x + 4, wy + 4);
    }
  }
  ctx.stroke();
  // Right wall barbed wire
  ctx.beginPath();
  for (let x = gl + gw - cp; x <= w; x += 8) {
    const wy = groundY - cp * 3 - 3 + Math.sin(x * 0.8) * 2;
    if (x === gl + gw - cp) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
    if ((x - Math.floor(gl + gw - cp)) % 16 < 8) {
      ctx.moveTo(x, wy); ctx.lineTo(x + 4, wy - 4);
      ctx.moveTo(x, wy); ctx.lineTo(x + 4, wy + 4);
    }
  }
  ctx.stroke();

  // Scattered rubble — small irregular dark shapes on the ground
  for (let i = 0; i < 18; i++) {
    const rx = gl + (Math.sin(i * 7.3) * 0.45 + 0.5) * gw;
    const ry = groundY + cp * (0.1 + (Math.sin(i * 4.1) * 0.5 + 0.5) * 0.55);
    const rs = cp * (0.08 + Math.sin(i * 2.7) * 0.04);
    ctx.fillStyle = '#16120a';
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(Math.sin(i * 3.1) * Math.PI);
    ctx.beginPath();
    for (let v = 0; v < 5; v++) {
      const angle = (v / 5) * Math.PI * 2 + Math.sin(i + v) * 0.5;
      const rad   = rs * (0.7 + Math.sin(i * 1.3 + v) * 0.3);
      if (v === 0) ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
      else ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ─── Scene dispatcher ─────────────────────────────────────────────────────────

// [SIMULATION] Draws the background scene for the given level scene key.
// transform = { rectLeft, rectTop, cellPx } gives the grid's screen position and cell size.
// waterRiseFraction (0–1) is used for animated flood level in the harbor scene.
export function drawWorldSceneBackground(ctx, scene, w, h, waterRiseFraction = 1.0, transform = null, timeSec = 0) {
  const gl = transform?.rectLeft ?? w * 0.1;
  const gt = transform?.rectTop  ?? h * 0.1;
  const cp = transform?.cellPx   ?? 20;
  const gw = cp * 20;  // GRID_COLS = 20
  const gh = cp * 15;  // GRID_ROWS = 15

  switch (scene) {
    case 'warehouse': drawWarehouseScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec);                              break;
    case 'coastal':   drawCoastalScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec);                                break;
    case 'urban':     drawUrbanSeismicScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec, 0);                        break;
    case 'harbor':    drawHarborFloodScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec, waterRiseFraction);         break;
    case 'bunker':    drawBunkerScene(ctx, w, h, gl, gt, gw, gh, cp, timeSec);                                 break;
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
