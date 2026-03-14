import { GRID_COLS, GRID_ROWS } from './constants.js';

// ─── Vector helpers ───────────────────────────────────────────────────────────

// [PHYSICS] Returns the Euclidean distance between two 2D points.
export function dist2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// [PHYSICS] Returns the angle (radians) from point A to point B, measured from +X axis.
export function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// ─── Grid / canvas coordinate helpers ────────────────────────────────────────

// [BUILD-CANVAS] Converts grid column/row integers to canvas pixel coordinates.
export function gridToCanvas(col, row, cellPx, panOffset) {
  return {
    x: (col - panOffset.col) * cellPx,
    y: (row - panOffset.row) * cellPx,
  };
}

// [BUILD-CANVAS] Converts canvas pixel coordinates to the nearest grid intersection.
export function canvasToGrid(x, y, cellPx, panOffset) {
  return {
    col: Math.round(x / cellPx + panOffset.col),
    row: Math.round(y / cellPx + panOffset.row),
  };
}

// [PHYSICS] Converts grid node position to world coordinates in metres (Y-up).
// Row 0 (top of grid) maps to the highest Y value.
export function gridToMetres(col, row, gridRows, cellMetres) {
  return {
    x: col * cellMetres,
    y: (gridRows - 1 - row) * cellMetres,
  };
}

// [BUILD-CANVAS] Clamps a grid column index to the valid grid range.
export function clampCol(col) {
  return Math.max(0, Math.min(GRID_COLS - 1, col));
}

// [BUILD-CANVAS] Clamps a grid row index to the valid grid range.
export function clampRow(row) {
  return Math.max(0, Math.min(GRID_ROWS - 1, row));
}

// [PHYSICS] Returns element length in metres given two grid-position nodes.
export function elementLengthMetres(nodeA, nodeB, cellMetres) {
  const dx = (nodeB.col - nodeA.col) * cellMetres;
  const dy = (nodeB.row - nodeA.row) * cellMetres;
  return Math.sqrt(dx * dx + dy * dy);
}
