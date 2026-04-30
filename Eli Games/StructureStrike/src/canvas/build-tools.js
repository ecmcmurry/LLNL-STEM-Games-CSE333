import { NODE_HIT_RADIUS, GRID_COLS, GRID_ROWS, ELEMENT_PROPERTIES, ELEMENT_TYPE } from '../utils/constants.js';
import { gridToCanvas, canvasToGrid } from '../utils/math.js';
import { computeElementCost } from '../physics/elements.js';

// ─── Node hit-testing ─────────────────────────────────────────────────────────

// [BUILD-PHASE] Finds the node whose visual position is within NODE_HIT_RADIUS pixels
// of the canvas tap/click coordinate. Returns the node or null.
export function findNodeAtCanvasPoint(x, y, nodes, cellPx) {
  let closest = null;
  // Scale hit radius with cell size so tapping works on all screen sizes
  let closestDist = Math.max(NODE_HIT_RADIUS, cellPx * 0.6);

  for (const node of nodes) {
    const { x: nx, y: ny } = gridToCanvas(node.col, node.row, cellPx, { col: 0, row: 0 });
    const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
    if (dist < closestDist) {
      closestDist = dist;
      closest = node;
    }
  }
  return closest;
}

// [BUILD-PHASE] Finds the structural element closest to a canvas tap.
// Used for selecting and deleting elements. Returns the element or null.
// Taps within the node hit radius of either endpoint are excluded — those belong to the node.
export function findElementAtCanvasPoint(x, y, nodes, elements, cellPx) {
  const nodeMap    = Object.fromEntries(nodes.map(n => [n.id, n]));
  const nodeRadius = Math.max(NODE_HIT_RADIUS, cellPx * 0.6);
  let closest = null;
  let closestDist = 10; // px tolerance for tapping a line

  for (const elem of elements) {
    const nodeA = nodeMap[elem.nodeAId];
    const nodeB = nodeMap[elem.nodeBId];
    if (!nodeA || !nodeB) continue;

    const { x: ax, y: ay } = gridToCanvas(nodeA.col, nodeA.row, cellPx, { col: 0, row: 0 });
    const { x: bx, y: by } = gridToCanvas(nodeB.col, nodeB.row, cellPx, { col: 0, row: 0 });

    // Reject taps that are inside either endpoint's node hit zone
    const distA = Math.sqrt((x - ax) ** 2 + (y - ay) ** 2);
    const distB = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
    if (distA < nodeRadius || distB < nodeRadius) continue;

    // Distance from point (x,y) to line segment AB
    const dist = pointToSegmentDist(x, y, ax, ay, bx, by);
    if (dist < closestDist) {
      closestDist = dist;
      closest = elem;
    }
  }
  return closest;
}

// [BUILD-PHASE] Perpendicular distance from point P to line segment AB.
function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

// ─── Grid snap ────────────────────────────────────────────────────────────────

// [BUILD-CANVAS] Converts a raw canvas pixel coordinate to the nearest valid grid position.
// Clamps to the grid bounds.
export function snapToGrid(x, y, cellPx) {
  const col = Math.max(0, Math.min(GRID_COLS - 1, Math.round(x / cellPx - 0.5)));
  const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.round(y / cellPx - 0.5)));
  return { col, row };
}

// ─── Node operations ──────────────────────────────────────────────────────────

// [BUILD-PHASE] Creates a new free node at the given grid position, assigns it a unique ID,
// and adds it to the structure's node list. Returns the new node.
export function placePlayerNode(col, row, structure) {
  // Don't duplicate an existing node at the same position
  const existing = structure.nodes.find(n => n.col === col && n.row === row);
  if (existing) return existing;

  const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newNode = { id, col, row, isAnchor: false, supportType: null };
  structure.nodes.push(newNode);
  return newNode;
}

// ─── Element operations ───────────────────────────────────────────────────────

// [BUILD-PHASE] Checks whether a valid element connection can be made between two nodes.
// Rejects if: same node, element already exists between them, or zero-length.
export function canConnectNodes(nodeA, nodeB, elements) {
  if (nodeA.id === nodeB.id) return false;
  const alreadyExists = elements.some(e =>
    (e.nodeAId === nodeA.id && e.nodeBId === nodeB.id) ||
    (e.nodeBId === nodeA.id && e.nodeAId === nodeB.id),
  );
  return !alreadyExists;
}

// [BUILD-PHASE] Creates a new structural element between two nodes, deducts its cost
// from the budget, and adds it to the structure. Returns { element, cost } or null
// if the connection is not valid or budget is insufficient.
export function connectNodes(nodeA, nodeB, elementType, structure, budgetRemaining) {
  if (!canConnectNodes(nodeA, nodeB, structure.elements)) return null;

  const cost = computeElementCost(nodeA, nodeB, elementType);
  if (cost > budgetRemaining) return null;

  const id = `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newElement = {
    id,
    nodeAId: nodeA.id,
    nodeBId: nodeB.id,
    type: elementType,
  };

  structure.elements.push(newElement);
  return { element: newElement, cost };
}

// [BUILD-PHASE] Removes an element from the structure by ID and returns its cost
// so the caller can refund the budget. Pass cleanupOrphans=false when undoing
// to preserve explicitly-placed nodes.
export function removeElement(elementId, structure, cleanupOrphans = true) {
  const index = structure.elements.findIndex(e => e.id === elementId);
  if (index === -1) return 0;

  const elem = structure.elements[index];
  const nodeA = structure.nodes.find(n => n.id === elem.nodeAId);
  const nodeB = structure.nodes.find(n => n.id === elem.nodeBId);
  const cost = (nodeA && nodeB) ? computeElementCost(nodeA, nodeB, elem.type) : 0;

  structure.elements.splice(index, 1);

  if (cleanupOrphans) _removeOrphanNodes(structure);

  return cost;
}

// [BUILD-PHASE] Removes a single node by ID. Used by undo to remove an explicitly
// placed snap-point node without touching any other nodes or elements.
export function removeNode(nodeId, structure) {
  structure.nodes = structure.nodes.filter(n => n.id !== nodeId);
}

// [BUILD-PHASE] Removes player-placed nodes that are no longer connected to any element.
// Preserves anchors and load nodes (which carry force indicators).
function _removeOrphanNodes(structure) {
  const connectedNodeIds = new Set(
    structure.elements.flatMap(e => [e.nodeAId, e.nodeBId]),
  );
  structure.nodes = structure.nodes.filter(
    n => n.isAnchor || n.isLoadNode || connectedNodeIds.has(n.id),
  );
}

// ─── Structure validation ─────────────────────────────────────────────────────

// [SIMULATION] Returns true if the structure has at least one element and at least one
// path connecting a free node to an anchor node. Used to gate the simulate button.
export function isStructureSimulatable(structure) {
  if (structure.elements.length === 0) return false;

  const anchorIds = new Set(
    structure.nodes.filter(n => n.isAnchor).map(n => n.id),
  );

  // BFS: check any element-connected node can reach an anchor
  const adj = {};
  for (const n of structure.nodes) adj[n.id] = [];
  for (const e of structure.elements) {
    adj[e.nodeAId]?.push(e.nodeBId);
    adj[e.nodeBId]?.push(e.nodeAId);
  }

  const visited = new Set();
  const queue = [...anchorIds];
  visited.add(...anchorIds);

  while (queue.length > 0) {
    const current = queue.shift();
    for (const neighbour of (adj[current] ?? [])) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push(neighbour);
      }
    }
  }

  // At least one non-anchor node must be reachable from an anchor
  return structure.nodes.some(n => !n.isAnchor && visited.has(n.id));
}

// ─── Cost preview ─────────────────────────────────────────────────────────────

// [BUDGET-COUNTER] Returns a list of { type, props, cost } objects for all element types
// at a given span, used to populate the element picker modal.
export function getElementCostOptions(nodeA, nodeB, budgetRemaining) {
  return Object.values(ELEMENT_TYPE).map(type => ({
    type,
    props: ELEMENT_PROPERTIES[type],
    cost: computeElementCost(nodeA, nodeB, type),
  }));
}
