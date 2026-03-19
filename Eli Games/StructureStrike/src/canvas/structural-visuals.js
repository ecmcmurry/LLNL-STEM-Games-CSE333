import { ELEMENT_TYPE, SUPPORT_TYPE } from '../utils/constants.js';
import { gridToCanvas } from '../utils/math.js';

// ─── Pin joint node ───────────────────────────────────────────────────────────

// [SIMULATION] Draws a mechanical pin-joint node: a metallic ring with a
// recessed centre hole, like a real bolted connection plate.
export function drawPinJoint(ctx, node, cellPx) {
  const { x, y } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });
  const r      = Math.max(5, cellPx * 0.16);
  const innerR = r * 0.36;

  ctx.save();

  // Drop shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur    = 5;
  ctx.shadowOffsetY = 2;

  // Outer plate — off-centre radial gradient gives a convex metal look
  const plate = ctx.createRadialGradient(x - r * 0.28, y - r * 0.28, r * 0.05, x, y, r);
  plate.addColorStop(0,    '#d0d0d0');
  plate.addColorStop(0.35, '#909090');
  plate.addColorStop(0.75, '#484848');
  plate.addColorStop(1,    '#1e1e1e');

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = plate;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Outer edge
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth   = 0.7;
  ctx.stroke();

  // Recessed pin hole — dark fill with a subtle inner shadow ring
  ctx.beginPath();
  ctx.arc(x, y, innerR + 1.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#0e0e0e';
  ctx.fill();

  // Tiny specular highlight in the hole to keep it readable
  ctx.beginPath();
  ctx.arc(x - innerR * 0.3, y - innerR * 0.3, innerR * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();

  ctx.restore();
}

// ─── Concrete support symbol ──────────────────────────────────────────────────

// [SIMULATION] Draws the support symbol for an anchor node using a realistic
// concrete look: grey gradient body, formwork lines, and a heavy ground line.
export function drawConcreteSupport(ctx, node, cellPx) {
  const { x, y } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });
  const size = cellPx * 0.35;

  ctx.save();

  // Shared concrete fill gradient (top-light, bottom-dark, slight warm tint)
  function makeConcreteFill(x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0,    '#b0aca8');
    g.addColorStop(0.35, '#8e8a86');
    g.addColorStop(0.7,  '#706c68');
    g.addColorStop(1,    '#504c48');
    return g;
  }

  // Shared ground block helper — fills a thick concrete slab below the support
  function drawGroundSlab(baseY, halfW) {
    const slabH = size * 0.45;
    const grad  = ctx.createLinearGradient(0, baseY, 0, baseY + slabH);
    grad.addColorStop(0,   '#585450');
    grad.addColorStop(0.5, '#484440');
    grad.addColorStop(1,   '#302e2c');
    ctx.fillStyle = grad;
    ctx.fillRect(x - halfW, baseY, halfW * 2, slabH);
    // Formwork seam line across the top of the slab
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - halfW, baseY + 1);
    ctx.lineTo(x + halfW, baseY + 1);
    ctx.stroke();
    // Bottom edge shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - halfW, baseY + slabH);
    ctx.lineTo(x + halfW, baseY + slabH);
    ctx.stroke();
  }

  // Horizontal formwork line helper — etched panel marks on flat concrete faces
  function drawFormworkLines(rx, ry, rw, rh, lineCount) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth   = 0.6;
    const gap = rh / (lineCount + 1);
    for (let i = 1; i <= lineCount; i++) {
      const ly = ry + gap * i;
      ctx.beginPath();
      ctx.moveTo(rx, ly);
      ctx.lineTo(rx + rw, ly);
      ctx.stroke();
    }
    ctx.restore();
  }

  switch (node.supportType) {

    case SUPPORT_TYPE.PINNED: {
      // Concrete triangle
      ctx.shadowColor   = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur    = 6;
      ctx.shadowOffsetY = 3;
      ctx.beginPath();
      ctx.moveTo(x,          y);
      ctx.lineTo(x - size,   y + size);
      ctx.lineTo(x + size,   y + size);
      ctx.closePath();
      ctx.fillStyle = makeConcreteFill(x, y, x, y + size);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Etched lines on the triangle face
      ctx.save();
      ctx.clip(); // clip to triangle shape
      drawFormworkLines(x - size, y, size * 2, size, 2);
      ctx.restore();

      // Outline
      ctx.strokeStyle = '#2e2c2a';
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      ctx.stroke();

      // Ground slab
      drawGroundSlab(y + size, size * 1.3);
      break;
    }

    case SUPPORT_TYPE.FIXED: {
      // Concrete block
      const bw = size * 2;
      const bh = size * 0.85;
      ctx.shadowColor   = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur    = 6;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = makeConcreteFill(x - size, y, x - size, y + bh);
      ctx.fillRect(x - size, y, bw, bh);
      ctx.shadowColor = 'transparent';

      drawFormworkLines(x - size, y, bw, bh, 2);

      ctx.strokeStyle = '#2e2c2a';
      ctx.lineWidth   = 1.2;
      ctx.strokeRect(x - size, y, bw, bh);

      // Ground slab
      drawGroundSlab(y + bh, size * 1.3);
      break;
    }

    case SUPPORT_TYPE.ROLLER_H:
    case SUPPORT_TYPE.ROLLER_V: {
      // Three concrete cylinder caps (rollers)
      const rr = Math.max(3, size * 0.2);
      for (let i = -1; i <= 1; i++) {
        const cx = x + i * rr * 2.6;
        const cy = y + size;
        ctx.shadowColor   = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur    = 4;
        ctx.shadowOffsetY = 2;
        const rGrad = ctx.createRadialGradient(cx - rr * 0.3, cy - rr * 0.3, rr * 0.1, cx, cy, rr);
        rGrad.addColorStop(0,   '#c0bcb8');
        rGrad.addColorStop(0.5, '#888480');
        rGrad.addColorStop(1,   '#484440');
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fillStyle = rGrad;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#2e2c2a';
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }
      // Ground slab
      drawGroundSlab(y + size + rr * 1.1, size * 1.1);
      break;
    }
  }

  ctx.restore();
}

// Half-widths as a fraction of cellPx
const STEEL_HW_RATIO  = 0.11;  // beam / column / truss
const CABLE_HW_RATIO  = 0.055; // cable

// ─── Public ───────────────────────────────────────────────────────────────────

// [SIMULATION] Draws one structural element with a realistic material look.
// progress 0→1 reveals the element from nodeA toward nodeB (build animation).
// At progress=1 the full member is drawn.
export function drawStructuralMember(ctx, nodeA, nodeB, elementType, cellPx, progress = 1) {
  if (progress <= 0) return;

  const posA = gridToCanvas(nodeA.col, nodeA.row, cellPx, { col: 0, row: 0 });
  const posB = gridToCanvas(nodeB.col, nodeB.row, cellPx, { col: 0, row: 0 });

  const dx      = posB.x - posA.x;
  const dy      = posB.y - posA.y;
  const fullLen = Math.sqrt(dx * dx + dy * dy);
  if (fullLen < 1) return;

  const angle   = Math.atan2(dy, dx);
  const drawLen = fullLen * Math.min(progress, 1);

  ctx.save();
  ctx.translate(posA.x, posA.y);
  ctx.rotate(angle);

  // Clip so nothing draws beyond the built tip
  ctx.beginPath();
  ctx.rect(-1, -9999, drawLen + 1, 19998);
  ctx.clip();

  if (elementType === ELEMENT_TYPE.CABLE) {
    _drawCable(ctx, fullLen, cellPx);
  } else {
    _drawSteelMember(ctx, fullLen, cellPx);
  }

  ctx.restore();

  // Welding spark at the advancing tip
  if (progress > 0.02 && progress < 0.98) {
    const tipX = posA.x + dx * progress;
    const tipY = posA.y + dy * progress;
    _drawWeldSpark(ctx, tipX, tipY);
  }
}

// ─── Steel member (beam / column / truss) ─────────────────────────────────────

function _drawSteelMember(ctx, len, cellPx) {
  const hw = Math.max(4, cellPx * STEEL_HW_RATIO);

  // Drop shadow
  ctx.shadowColor    = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur     = 6;
  ctx.shadowOffsetX  = 1;
  ctx.shadowOffsetY  = 3;

  // Main body — brushed-metal gradient across the width
  const body = ctx.createLinearGradient(0, -hw, 0, hw);
  body.addColorStop(0,    '#111111');
  body.addColorStop(0.08, '#363636');
  body.addColorStop(0.28, '#6c6c6c');
  body.addColorStop(0.46, '#b4b4b4');
  body.addColorStop(0.50, '#d6d6d6'); // specular peak
  body.addColorStop(0.54, '#b4b4b4');
  body.addColorStop(0.72, '#6c6c6c');
  body.addColorStop(0.92, '#363636');
  body.addColorStop(1,    '#111111');

  ctx.fillStyle = body;
  ctx.fillRect(0, -hw, len, hw * 2);

  ctx.shadowColor = 'transparent';

  // Lengthwise sheen (fades in and out at ends)
  const sheen = ctx.createLinearGradient(0, 0, len, 0);
  sheen.addColorStop(0,    'rgba(255,255,255,0)');
  sheen.addColorStop(0.06, 'rgba(255,255,255,0.14)');
  sheen.addColorStop(0.94, 'rgba(255,255,255,0.14)');
  sheen.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, -hw, len, hw * 0.38);

  // Hard outer edge
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth   = 0.8;
  ctx.strokeRect(0, -hw, len, hw * 2);

  // Bolt rows — two bolts per spacing interval, top and bottom flanges
  const boltStep = Math.max(18, cellPx * 0.44);
  const boltR    = Math.max(1.2, hw * 0.27);
  const flangeY  = hw * 0.53;

  for (let x = boltStep; x < len - boltStep * 0.3; x += boltStep) {
    for (const fy of [-flangeY, flangeY]) {
      // Recessed shadow
      ctx.beginPath();
      ctx.arc(x, fy, boltR + 1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fill();

      // Bolt head
      ctx.beginPath();
      ctx.arc(x, fy, boltR, 0, Math.PI * 2);
      ctx.fillStyle = '#484848';
      ctx.fill();

      // Tiny specular dot on bolt
      ctx.beginPath();
      ctx.arc(x - boltR * 0.3, fy - boltR * 0.3, boltR * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();
    }
  }
}

// ─── Cable ────────────────────────────────────────────────────────────────────

function _drawCable(ctx, len, cellPx) {
  const cr      = Math.max(2.5, cellPx * CABLE_HW_RATIO); // cable radius
  const wrapGap = Math.max(6, cellPx * 0.15);             // spacing between wrap marks

  // Outer shadow / thickness illusion
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth   = cr * 2 + 4;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Core — cylindrical gradient (dark bottom, bright highlight near top)
  const core = ctx.createLinearGradient(0, -cr, 0, cr);
  core.addColorStop(0,    '#4a4a4a');
  core.addColorStop(0.22, '#8a8a8a');
  core.addColorStop(0.40, '#b8b8b8');
  core.addColorStop(0.48, '#d4d4d4');
  core.addColorStop(0.55, '#9c9c9c');
  core.addColorStop(0.75, '#585858');
  core.addColorStop(1,    '#282828');

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.strokeStyle = core;
  ctx.lineWidth   = cr * 2;
  ctx.stroke();

  // Helical wrap marks — alternating diagonal ticks simulate twisted strands
  ctx.lineCap  = 'butt';
  ctx.lineWidth = Math.max(0.8, cr * 0.28);
  const half    = cr * 0.88;

  for (let x = wrapGap * 0.4; x < len - 1; x += wrapGap) {
    const dir = (Math.floor(x / wrapGap) % 2 === 0) ? 1 : -1;

    // Dark strand shadow
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(15,15,15,0.75)';
    ctx.moveTo(x - half * dir * 0.55, -half);
    ctx.lineTo(x + half * dir * 0.55,  half);
    ctx.stroke();

    // Bright strand highlight
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(240,240,240,0.28)';
    ctx.moveTo(x - half * dir * 0.55 - 0.6, -half);
    ctx.lineTo(x + half * dir * 0.55 - 0.6,  half);
    ctx.stroke();
  }

  // End ferrules — short bright cylinders where the cable terminates
  for (const ex of [0, len]) {
    const ferruleW = Math.max(4, cr * 1.2);
    const ferruleH = cr * 2;
    const ferGrad = ctx.createLinearGradient(0, -cr, 0, cr);
    ferGrad.addColorStop(0,   '#888');
    ferGrad.addColorStop(0.5, '#ddd');
    ferGrad.addColorStop(1,   '#555');
    ctx.fillStyle = ferGrad;
    ctx.fillRect(ex - ferruleW * 0.5, -cr, ferruleW, ferruleH);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(ex - ferruleW * 0.5, -cr, ferruleW, ferruleH);
  }
}

// ─── Welding spark ────────────────────────────────────────────────────────────

function _drawWeldSpark(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Bright molten core
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur  = 16;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fffde0';
  ctx.fill();

  // Flying sparks
  const count = 5 + Math.floor(Math.random() * 4);
  ctx.shadowBlur = 6;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * 10;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, ${180 + Math.floor(Math.random() * 75)}, 20, ${0.6 + Math.random() * 0.4})`;
    ctx.lineWidth   = 0.8 + Math.random() * 0.8;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }

  ctx.restore();
}
