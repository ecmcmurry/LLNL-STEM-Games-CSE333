import { ELEMENT_TYPE } from '../utils/constants.js';
import { STRUCTURAL_PATTERNS } from './patterns.js';

// ─── Topology helpers ─────────────────────────────────────────────────────────

// [RECOGNITION] Builds an adjacency map: { nodeId → Set of connected nodeIds }
function buildAdjacency(nodes, elements) {
  const adj = {};
  for (const node of nodes) adj[node.id] = new Set();
  for (const elem of elements) {
    adj[elem.nodeAId]?.add(elem.nodeBId);
    adj[elem.nodeBId]?.add(elem.nodeAId);
  }
  return adj;
}

// [RECOGNITION] Returns all elements that include a given node
function elementsAtNode(nodeId, elements) {
  return elements.filter(e => e.nodeAId === nodeId || e.nodeBId === nodeId);
}

// [RECOGNITION] Returns the other node ID in an element relative to a given node
function otherNode(elem, nodeId) {
  return elem.nodeAId === nodeId ? elem.nodeBId : elem.nodeAId;
}

// [RECOGNITION] Returns the angle (degrees, 0–180) of a structural element
// between two grid nodes. Used for orientation checks.
function elementAngleDeg(nodeA, nodeB) {
  const dx = nodeB.col - nodeA.col;
  const dy = nodeB.row - nodeA.row;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return ((angleDeg % 180) + 180) % 180; // normalize 0–180
}

// [RECOGNITION] Returns true if a grid element is roughly horizontal (±20°)
function isHorizontal(nodeA, nodeB) {
  const angle = elementAngleDeg(nodeA, nodeB);
  return angle < 20 || angle > 160;
}

// [RECOGNITION] Returns true if a grid element is roughly vertical (±20°)
function isVertical(nodeA, nodeB) {
  const angle = elementAngleDeg(nodeA, nodeB);
  return angle > 70 && angle < 110;
}

// [RECOGNITION] Returns true if a grid element is diagonal (not within ±20° of horizontal or vertical)
function isDiagonal(nodeA, nodeB) {
  return !isHorizontal(nodeA, nodeB) && !isVertical(nodeA, nodeB);
}

// ─── Individual detectors ─────────────────────────────────────────────────────

// [RECOGNITION] Detects any closed triangle of three connected nodes
function detectTriangle(nodes, elements) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  for (const elemA of elements) {
    for (const elemB of elements) {
      if (elemB.id === elemA.id) continue;
      if (elemB.nodeAId !== elemA.nodeAId && elemB.nodeBId !== elemA.nodeAId &&
          elemB.nodeAId !== elemA.nodeBId && elemB.nodeBId !== elemA.nodeBId) continue;

      // Find shared node between elemA and elemB
      let sharedId, aFree, bFree;
      if (elemA.nodeAId === elemB.nodeAId) {
        sharedId = elemA.nodeAId; aFree = elemA.nodeBId; bFree = elemB.nodeBId;
      } else if (elemA.nodeAId === elemB.nodeBId) {
        sharedId = elemA.nodeAId; aFree = elemA.nodeBId; bFree = elemB.nodeAId;
      } else if (elemA.nodeBId === elemB.nodeAId) {
        sharedId = elemA.nodeBId; aFree = elemA.nodeAId; bFree = elemB.nodeBId;
      } else {
        sharedId = elemA.nodeBId; aFree = elemA.nodeAId; bFree = elemB.nodeAId;
      }

      // Check if there's a third element closing the triangle
      const closing = elements.find(e =>
        (e.nodeAId === aFree && e.nodeBId === bFree) ||
        (e.nodeBId === aFree && e.nodeAId === bFree),
      );
      if (closing && closing.id !== elemA.id && closing.id !== elemB.id) {
        return true;
      }
    }
  }
  return false;
}

// [RECOGNITION] Detects a portal frame: two roughly vertical elements connected
// at their tops by a horizontal element, with the two bases acting as supports.
function detectPortalFrame(nodes, elements) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const horizontalElems = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isHorizontal(a, b);
  });
  const verticalElems = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isVertical(a, b);
  });

  for (const hElem of horizontalElems) {
    const leftId = hElem.nodeAId;
    const rightId = hElem.nodeBId;
    const leftCol = nodeMap[leftId].col;
    const rightCol = nodeMap[rightId].col;
    const topRow = nodeMap[leftId].row;

    // Look for a vertical dropping from hElem's left node
    const leftCol_v = verticalElems.find(e => {
      const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
      if (!a || !b) return false;
      const topNode = a.row < b.row ? a : b;
      const botNode = a.row < b.row ? b : a;
      return topNode.id === leftId && botNode.row > topRow;
    });

    // Look for a vertical dropping from hElem's right node
    const rightCol_v = verticalElems.find(e => {
      const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
      if (!a || !b) return false;
      const topNode = a.row < b.row ? a : b;
      const botNode = a.row < b.row ? b : a;
      return topNode.id === rightId && botNode.row > topRow;
    });

    if (leftCol_v && rightCol_v) return true;
  }
  return false;
}

// [RECOGNITION] Detects a cantilever: a free-end node sequence attached only to
// a fixed/anchor node on one side, with no far support.
function detectCantilever(nodes, elements) {
  const adj = buildAdjacency(nodes, elements);
  for (const node of nodes) {
    if (node.isAnchor) continue;
    // A leaf node (degree 1) whose single connection is not back to a leaf = cantilever tip
    if (adj[node.id]?.size === 1) {
      const connectedId = [...adj[node.id]][0];
      const connectedNode = nodes.find(n => n.id === connectedId);
      if (connectedNode && adj[connectedId]?.size >= 2) return true;
    }
  }
  return false;
}

// [RECOGNITION] Detects a Pratt truss pattern: two parallel horizontal chords
// separated by verticals, with diagonals all slanting in a consistent direction.
function detectPrattTruss(nodes, elements) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const horizontal = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isHorizontal(a, b);
  });
  const vertical = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isVertical(a, b);
  });
  const diagonal = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isDiagonal(a, b);
  });

  if (horizontal.length < 4 || vertical.length < 2 || diagonal.length < 2) return false;

  // Find two distinct row levels for chords
  const rowLevels = [...new Set(
    horizontal.flatMap(e => [nodeMap[e.nodeAId]?.row, nodeMap[e.nodeBId]?.row]),
  )].filter(r => r !== undefined).sort((a, b) => a - b);

  if (rowLevels.length < 2) return false;
  const topRow = rowLevels[0];
  const botRow = rowLevels[rowLevels.length - 1];
  if (botRow - topRow < 2) return false;

  // Verticals must connect topRow to botRow
  const goodVerticals = vertical.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    const rows = [a.row, b.row].sort((x, y) => x - y);
    return rows[0] === topRow && rows[1] === botRow;
  });

  return goodVerticals.length >= 2 && diagonal.length >= 2;
}

// [RECOGNITION] Detects a Warren truss: horizontal chords with only alternating
// diagonals (no vertical posts).
function detectWarrenTruss(nodes, elements) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const horizontal = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isHorizontal(a, b);
  });
  const vertical = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isVertical(a, b);
  });
  const diagonal = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isDiagonal(a, b);
  });

  // Warren: many diagonals, multiple horizontals, no verticals
  return horizontal.length >= 4 && diagonal.length >= 4 && vertical.length === 0;
}

// [RECOGNITION] Detects an X-brace pattern: two diagonal elements that cross
// inside a rectangular frame (crossing at roughly the mid-point).
function detectXBrace(nodes, elements) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const diagonals = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isDiagonal(a, b);
  });

  // Look for two diagonals that share a bounding box (cross each other)
  for (let i = 0; i < diagonals.length; i++) {
    const eA = diagonals[i];
    const a1 = nodeMap[eA.nodeAId]; const a2 = nodeMap[eA.nodeBId];
    for (let j = i + 1; j < diagonals.length; j++) {
      const eB = diagonals[j];
      const b1 = nodeMap[eB.nodeAId]; const b2 = nodeMap[eB.nodeBId];
      if (!a1 || !a2 || !b1 || !b2) continue;

      // Bounding boxes must overlap (i.e. they cross)
      const aMinCol = Math.min(a1.col, a2.col); const aMaxCol = Math.max(a1.col, a2.col);
      const aMinRow = Math.min(a1.row, a2.row); const aMaxRow = Math.max(a1.row, a2.row);
      const bMinCol = Math.min(b1.col, b2.col); const bMaxCol = Math.max(b1.col, b2.col);
      const bMinRow = Math.min(b1.row, b2.row); const bMaxRow = Math.max(b1.row, b2.row);

      const colOverlap = aMinCol < bMaxCol && aMaxCol > bMinCol;
      const rowOverlap = aMinRow < bMaxRow && aMaxRow > bMinRow;

      if (colOverlap && rowOverlap) return true;
    }
  }
  return false;
}

// [RECOGNITION] Detects a cable-stayed system: a tall vertical tower (column/beam)
// with at least two cable elements attached near its top, angling outward.
function detectCableStayed(nodes, elements) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const cables = elements.filter(e => e.type === ELEMENT_TYPE.CABLE);
  if (cables.length < 2) return false;

  // Find cable attachment nodes, group by proximity to identify a tower top
  const cableNodeIds = new Set(cables.flatMap(e => [e.nodeAId, e.nodeBId]));
  for (const nodeId of cableNodeIds) {
    const node = nodeMap[nodeId];
    if (!node) continue;
    // Count cables attached to this node
    const attachedCables = cables.filter(e => e.nodeAId === nodeId || e.nodeBId === nodeId);
    if (attachedCables.length >= 2) {
      // Check that the cables angle away on both sides (opposite horizontal directions)
      const angles = attachedCables.map(e => {
        const other = nodeMap[otherNode(e, nodeId)];
        return other ? Math.sign(other.col - node.col) : 0;
      });
      const hasLeft  = angles.some(a => a < 0);
      const hasRight = angles.some(a => a > 0);
      if (hasLeft && hasRight) return true;
    }
  }
  return false;
}

// [RECOGNITION] Detects a tensegrity structure: at least one set of compression
// struts (beams/columns) that are not directly connected to each other,
// surrounded by a network of cables in tension.
function detectTensegrity(nodes, elements) {
  const cables = elements.filter(e => e.type === ELEMENT_TYPE.CABLE);
  const struts  = elements.filter(e =>
    e.type === ELEMENT_TYPE.BEAM || e.type === ELEMENT_TYPE.COLUMN,
  );
  if (cables.length < 6 || struts.length < 2) return false;

  // Struts must not share nodes with each other (floating in tension net)
  const strutNodeIds = new Set(struts.flatMap(e => [e.nodeAId, e.nodeBId]));
  let sharedStrutNodes = 0;
  for (const strut of struts) {
    const otherStruts = struts.filter(s => s.id !== strut.id);
    for (const other of otherStruts) {
      if (other.nodeAId === strut.nodeAId || other.nodeBId === strut.nodeBId ||
          other.nodeAId === strut.nodeBId || other.nodeBId === strut.nodeAId) {
        sharedStrutNodes++;
      }
    }
  }
  return sharedStrutNodes === 0 && cables.length >= struts.length * 3;
}

// [RECOGNITION] Detects a diagrid: a repeating pattern of crossing diagonal elements
// forming a lattice (at least 4 crossing diagonal pairs across multiple rows/cols).
function detectDiagrid(nodes, elements) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const diagonals = elements.filter(e => {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    return a && b && isDiagonal(a, b);
  });
  if (diagonals.length < 8) return false;

  // Look for alternating slope directions (positive and negative) in adjacent spans
  let posSlope = 0, negSlope = 0;
  for (const e of diagonals) {
    const a = nodeMap[e.nodeAId]; const b = nodeMap[e.nodeBId];
    if (!a || !b) continue;
    const slope = (b.row - a.row) / (b.col - a.col || 1);
    if (slope > 0) posSlope++;
    else negSlope++;
  }
  return posSlope >= 4 && negSlope >= 4;
}

// ─── Main detector ────────────────────────────────────────────────────────────

// [RECOGNITION] Scans the current structure for all known structural patterns
// and returns an array of pattern IDs that are currently present.
// Called after every build action; new detections trigger notification toasts.
export function detectAllPatterns(nodes, elements) {
  if (nodes.length < 2 || elements.length < 1) return [];

  const detected = [];

  if (detectTriangle(nodes, elements))       detected.push('triangle');
  if (detectCantilever(nodes, elements))     detected.push('cantilever');
  if (detectPortalFrame(nodes, elements))    detected.push('portal_frame');
  if (detectPrattTruss(nodes, elements))     detected.push('pratt_truss');
  if (detectWarrenTruss(nodes, elements))    detected.push('warren_truss');
  if (detectXBrace(nodes, elements))         detected.push('x_brace');
  if (detectCableStayed(nodes, elements))    detected.push('cable_stayed');
  if (detectTensegrity(nodes, elements))     detected.push('tensegrity');
  if (detectDiagrid(nodes, elements))        detected.push('diagrid');

  return detected;
}
