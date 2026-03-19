import { ELEMENT_TYPE } from '../utils/constants.js';
import { gridToCanvas } from '../utils/math.js';

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
