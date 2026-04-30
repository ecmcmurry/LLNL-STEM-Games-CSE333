// ─── DOM factory ──────────────────────────────────────────────────────────────

// [UI] Creates a DOM element with attributes and children in one call.
// attrs can contain class, id, style object, data-*, and event listeners (onClick etc).
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, value);
    } else {
      element[key] = value;
    }
  }

  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else {
      element.appendChild(child);
    }
  }

  return element;
}

// ─── Element type icons (SVG inline) ─────────────────────────────────────────

// [BUILD-PHASE] Returns an SVG icon element for a structural element type,
// used in the element toolbar and cost breakdown panels.
export function elementTypeIcon(type, color = 'currentColor') {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('fill', 'none');

  const iconPaths = {
    beam:   '<rect x="2" y="13" width="28" height="6" rx="1" fill="COLOR"/>',
    column: '<rect x="13" y="2" width="6" height="28" rx="1" fill="COLOR"/>',
    truss:  '<line x1="2" y1="28" x2="30" y2="4" stroke="COLOR" stroke-width="3" stroke-linecap="round"/><line x1="2" y1="4" x2="30" y2="28" stroke="COLOR" stroke-width="3" stroke-linecap="round"/>',
    cable:  '<path d="M2 22 Q16 6 30 22" stroke="COLOR" stroke-width="2.5" stroke-linecap="round" fill="none"/>',
  };

  const pathMarkup = (iconPaths[type] ?? '').replaceAll('COLOR', color);
  svg.innerHTML = pathMarkup;
  return svg;
}

// ─── Support symbols (canvas-drawn by blueprint-canvas.js, but also needed in modals) ─

// [BUILD-PHASE] Returns the human-readable label for a support type
export function supportTypeLabel(supportType) {
  const labels = {
    fixed:    'Fixed (Clamped)',
    pinned:   'Pinned Support',
    roller_h: 'Horizontal Roller',
    roller_v: 'Vertical Roller',
  };
  return labels[supportType] ?? supportType;
}

// ─── Budget formatter ─────────────────────────────────────────────────────────

// [BUDGET-COUNTER] Formats a dollar amount as a compact game currency string (e.g. "$1.2M")
export function formatBudget(amount) {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000)     return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount}`;
}

// ─── Rarity badge ─────────────────────────────────────────────────────────────

// [RECOGNITION] Creates a rarity badge element for pattern notification toasts
export function rarityBadge(rarity) {
  const labels = {
    common:    { text: 'COMMON',    class: 'badge--common'    },
    uncommon:  { text: 'UNCOMMON',  class: 'badge--uncommon'  },
    rare:      { text: 'RARE',      class: 'badge--rare'      },
    legendary: { text: 'LEGENDARY', class: 'badge--legendary' },
  };
  const { text, class: cls } = labels[rarity] ?? labels.common;
  return el('span', { class: `rarity-badge ${cls}` }, text);
}
