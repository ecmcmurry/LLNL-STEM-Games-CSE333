// [ANIMATION] Glass shatter animation — fragments the background into irregular
// polygon shards that explode outward and fall away, while the structure stays visible.

// [ANIMATION] Generates a set of irregular quads that tile the canvas by jittering
// a grid of vertices. Each shard is given initial physics state (velocity, spin, etc.).
function generateShards(w, h) {
  const cols = 18;
  const rows = 12;
  const cellW = w / cols;
  const cellH = h / rows;

  // Build a jittered grid of vertices — edges stay flush, interior points randomised.
  const pts = [];
  for (let gy = 0; gy <= rows; gy++) {
    pts.push([]);
    for (let gx = 0; gx <= cols; gx++) {
      const onEdgeX = gx === 0 || gx === cols;
      const onEdgeY = gy === 0 || gy === rows;
      const jx = onEdgeX ? 0 : (Math.random() - 0.5) * cellW * 0.6;
      const jy = onEdgeY ? 0 : (Math.random() - 0.5) * cellH * 0.55;
      pts[gy].push({ x: gx * cellW + jx, y: gy * cellH + jy });
    }
  }

  const shards = [];
  const originX = w / 2;
  const originY = h / 2;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const tl = pts[gy][gx];
      const tr = pts[gy][gx + 1];
      const br = pts[gy + 1][gx + 1];
      const bl = pts[gy + 1][gx];

      const cx = (tl.x + tr.x + br.x + bl.x) / 4;
      const cy = (tl.y + tr.y + br.y + bl.y) / 4;

      const dx = cx - originX;
      const dy = cy - originY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 220 + Math.random() * 320;
      const vx = (dx / dist) * speed * (0.35 + Math.random() * 0.65) + (Math.random() - 0.5) * 120;
      const vy = (dy / dist) * speed * 0.2 - Math.random() * 60;

      shards.push({
        poly: [tl, tr, br, bl],
        cx, cy,
        tx: 0, ty: 0,
        vx, vy,
        gravity: 900 + Math.random() * 600,
        spin: (Math.random() - 0.5) * 7,
        angle: 0,
        alpha: 1,
      });
    }
  }

  return shards;
}

// [ANIMATION] Runs the glass shatter animation.
//
//   ctx           — Canvas 2D context (already scaled for DPR) to render into
//   w, h          — Logical (CSS-pixel) canvas dimensions
//   bgCanvas      — HTMLCanvasElement with the background at the same physical resolution
//                   as the target canvas (i.e. w*dpr × h*dpr physical pixels)
//   drawStructure — (ctx) => void — draws the user's structure on top each frame
//   onComplete    — called when all shards have disappeared
//
// Returns a cancel function.
export function runGlassShatterAnimation(ctx, w, h, bgCanvas, drawStructure, onComplete) {
  const shards  = generateShards(w, h);
  const dpr     = window.devicePixelRatio ?? 1;

  let rafId    = null;
  let prevTime = null;

  function frame(ts) {
    if (prevTime === null) prevTime = ts;
    const dt = Math.min((ts - prevTime) / 1000, 0.05);
    prevTime = ts;

    ctx.clearRect(0, 0, w, h);

    let anyVisible = false;

    for (const s of shards) {
      s.vy    += s.gravity * dt;
      s.tx    += s.vx * dt;
      s.ty    += s.vy * dt;
      s.angle += s.spin * dt;

      if (s.cy + s.ty > h + 200 || s.cx + s.tx < -400 || s.cx + s.tx > w + 400) continue;
      anyVisible = true;

      ctx.save();

      // ── Step 1: move the shard polygon to its current position ──
      // Translate so the centroid is at its new screen position, rotate around it.
      ctx.translate(s.cx + s.tx, s.cy + s.ty);
      ctx.rotate(s.angle);
      ctx.translate(-s.cx, -s.cy);

      // ── Step 2: clip to the shard polygon ──
      // The polygon is in original (resting) coordinates; the transform above
      // moves it to the current screen position. The clip region is recorded in
      // device-pixel space and persists even after we change the transform below.
      ctx.beginPath();
      ctx.moveTo(s.poly[0].x, s.poly[0].y);
      for (let i = 1; i < s.poly.length; i++) ctx.lineTo(s.poly[i].x, s.poly[i].y);
      ctx.closePath();
      ctx.clip();

      // ── Step 3: reset to the base DPR transform ──
      // This makes drawImage draw the background at its true screen position.
      // The clip (already in device space) stays in place, so only the shard's
      // new screen area is visible — creating the "window into the scene" look
      // where background content is revealed correctly through each moving shard.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(bgCanvas, 0, 0, w, h);

      ctx.restore();
    }

    // ── Glass-edge highlights ──
    // Drawn in a separate pass (without clip) so the full stroke width is visible.
    for (const s of shards) {
      if (s.cy + s.ty > h + 200 || s.cx + s.tx < -400 || s.cx + s.tx > w + 400) continue;

      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.translate(s.cx + s.tx, s.cy + s.ty);
      ctx.rotate(s.angle);
      ctx.translate(-s.cx, -s.cy);

      ctx.beginPath();
      ctx.moveTo(s.poly[0].x, s.poly[0].y);
      for (let i = 1; i < s.poly.length; i++) ctx.lineTo(s.poly[i].x, s.poly[i].y);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(200, 230, 255, 0.7)';
      ctx.lineWidth   = 1;
      ctx.stroke();

      ctx.restore();
    }

    // ── Structure always on top ──
    ctx.save();
    drawStructure(ctx);
    ctx.restore();

    if (!anyVisible) {
      onComplete?.();
    } else {
      rafId = requestAnimationFrame(frame);
    }
  }

  rafId = requestAnimationFrame(frame);
  return () => { if (rafId) cancelAnimationFrame(rafId); };
}
