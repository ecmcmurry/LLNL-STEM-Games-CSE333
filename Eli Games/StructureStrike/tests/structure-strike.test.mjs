/**
 * Unit tests for StructureStrike pure logic.
 *
 * Run with:  node --test tests/structure-strike.test.mjs
 *
 * Functions are inlined from src/ to avoid browser/canvas imports.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ─── Inlined constants (from src/utils/constants.js) ─────────────────────────

const CELL_METERS = 5.0;
const GRID_ROWS = 15;
const GRAVITY_MS2 = 9.81;
const STEEL_DENSITY = 7850;

const ELEMENT_PROPERTIES = {
  beam:   { E: 200e9, A: 0.0076,  I: 1.29e-4,  yieldStress: 7e6,  tensionOnly: false, costPerMeter: 1_500 },
  column: { E: 200e9, A: 0.0127,  I: 2.13e-4,  yieldStress: 4e6,  tensionOnly: false, costPerMeter: 2_000 },
  truss:  { E: 200e9, A: 0.003,   I: 1e-7,     yieldStress: 18e6, tensionOnly: false, costPerMeter: 500   },
  cable:  { E: 160e9, A: 0.002,   I: 0,        yieldStress: 25e6, tensionOnly: true,  costPerMeter: 300   },
};

// ─── Inlined math utilities (from src/utils/math.js) ─────────────────────────

function elementLengthMetres(nodeA, nodeB, cellMetres) {
  const dx = (nodeB.col - nodeA.col) * cellMetres;
  const dy = (nodeB.row - nodeA.row) * cellMetres;
  return Math.sqrt(dx * dx + dy * dy);
}

function gridToMetres(col, row, gridRows, cellMetres) {
  return {
    x: col * cellMetres,
    y: (gridRows - 1 - row) * cellMetres,
  };
}

// ─── Inlined physics functions (from src/physics/elements.js) ─────────────────

function computeElementLengthM(nodeA, nodeB) {
  return elementLengthMetres(nodeA, nodeB, CELL_METERS);
}

function computeElementCost(nodeA, nodeB, elementType) {
  const lengthM = computeElementLengthM(nodeA, nodeB);
  return Math.round(lengthM * ELEMENT_PROPERTIES[elementType].costPerMeter);
}

function elementSelfWeightPerMetre(type) {
  const { A } = ELEMENT_PROPERTIES[type];
  return A * STEEL_DENSITY * GRAVITY_MS2;
}

// ─── Inlined load map builders (from src/physics/loads.js) ───────────────────

function mergeLoadMaps(...maps) {
  const merged = {};
  for (const map of maps) {
    for (const [nodeId, load] of Object.entries(map)) {
      if (!merged[nodeId]) merged[nodeId] = { fx: 0, fy: 0, mz: 0 };
      merged[nodeId].fx += load.fx ?? 0;
      merged[nodeId].fy += load.fy ?? 0;
      merged[nodeId].mz += load.mz ?? 0;
    }
  }
  return merged;
}

function buildGravityLoadMap(nodes, elements, levelLoadNodes) {
  const loadMap = {};
  for (const elem of elements) {
    const nodeA = nodes.find(n => n.id === elem.nodeAId);
    const nodeB = nodes.find(n => n.id === elem.nodeBId);
    if (!nodeA || !nodeB) continue;
    const lengthM = computeElementLengthM(nodeA, nodeB);
    const totalWeightN = elementSelfWeightPerMetre(elem.type) * lengthM;
    const halfWeight = totalWeightN / 2;
    if (!loadMap[nodeA.id]) loadMap[nodeA.id] = { fx: 0, fy: 0, mz: 0 };
    if (!loadMap[nodeB.id]) loadMap[nodeB.id] = { fx: 0, fy: 0, mz: 0 };
    loadMap[nodeA.id].fy -= halfWeight;
    loadMap[nodeB.id].fy -= halfWeight;
  }
  for (const ln of (levelLoadNodes ?? [])) {
    const node = nodes.find(n => n.col === ln.col && n.row === ln.row);
    if (!node) continue;
    if (!loadMap[node.id]) loadMap[node.id] = { fx: 0, fy: 0, mz: 0 };
    loadMap[node.id].fx += ln.load?.fx ?? 0;
    loadMap[node.id].fy += ln.load?.fy ?? 0;
  }
  return loadMap;
}

function buildWindLoadMap(nodes, elements, windSpeedKmh, windAngleDeg) {
  const loadMap = {};
  const windSpeedMs = windSpeedKmh / 3.6;
  const airDensity = 1.225;
  const cd = 1.3;
  const dynamicPressure = 0.5 * airDensity * windSpeedMs * windSpeedMs * cd;
  const angleRad = (windAngleDeg * Math.PI) / 180;
  const fx_dir = Math.cos(angleRad);
  const fy_dir = Math.sin(angleRad);
  for (const node of nodes) {
    if (node.isAnchor) continue;
    let tributaryM = 0;
    for (const elem of elements) {
      if (elem.nodeAId === node.id || elem.nodeBId === node.id) {
        const nodeA = nodes.find(n => n.id === elem.nodeAId);
        const nodeB = nodes.find(n => n.id === elem.nodeBId);
        if (nodeA && nodeB) tributaryM += computeElementLengthM(nodeA, nodeB) / 2;
      }
    }
    const exposedArea = tributaryM * 1.0;
    const windForce = dynamicPressure * exposedArea;
    loadMap[node.id] = { fx: windForce * fx_dir, fy: windForce * fy_dir, mz: 0 };
  }
  return loadMap;
}

function buildFloodLoadMap(nodes, elements, floodDepthM, waterDensity) {
  const loadMap = {};
  const g = GRAVITY_MS2;
  for (const node of nodes) {
    const { y: elevationM } = gridToMetres(node.col, node.row, GRID_ROWS, CELL_METERS);
    const depthBelowSurface = floodDepthM - elevationM;
    if (depthBelowSurface <= 0) continue;
    const pressure = waterDensity * g * depthBelowSurface;
    let tributaryM = 0;
    for (const elem of elements) {
      if (elem.nodeAId === node.id || elem.nodeBId === node.id) {
        const nodeA = nodes.find(n => n.id === elem.nodeAId);
        const nodeB = nodes.find(n => n.id === elem.nodeBId);
        if (nodeA && nodeB) tributaryM += computeElementLengthM(nodeA, nodeB) / 2;
      }
    }
    const force = pressure * tributaryM * 1.0;
    loadMap[node.id] = { fx: force, fy: 0, mz: 0 };
  }
  return loadMap;
}

function buildBallisticLoadMap(nodes, targetCol, targetRow, impactForceN) {
  const loadMap = {};
  const targetNode = nodes.find(n => n.col === targetCol && n.row === targetRow);
  if (!targetNode) return loadMap;
  loadMap[targetNode.id] = { fx: 0, fy: -impactForceN, mz: 0 };
  return loadMap;
}

// ─── Inlined star-rating (from src/physics/sim-engine.js) ────────────────────

function computeStarRating(level, nodes, elements, simulationResult, budgetUsed, totalBudget) {
  const { survived, failureSequence, elementStressRatios } = simulationResult;
  if (!survived) return 0;
  const anyFailure = failureSequence.some(wave => wave.length > 0);
  const maxUtil = Math.max(0, ...Object.values(elementStressRatios ?? {}));
  const budgetEfficiency = 1 - budgetUsed / totalBudget;
  const elemBonus = elements.length >= ((level.requirements?.minElements ?? 0) * 1.5);
  if (!anyFailure && maxUtil < 0.75 && budgetEfficiency > 0.2 && elemBonus) return 3;
  if (!anyFailure && maxUtil < 0.9) return 2;
  return 1;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Tolerance for floating point comparisons
const APPROX = (a, b, eps = 0.001) => Math.abs(a - b) <= eps;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("elementLengthMetres", () => {
  test("horizontal element — 1 cell wide", () => {
    const a = { col: 0, row: 0 };
    const b = { col: 1, row: 0 };
    assert.equal(elementLengthMetres(a, b, CELL_METERS), 5.0);
  });

  test("vertical element — 1 cell tall", () => {
    const a = { col: 0, row: 0 };
    const b = { col: 0, row: 1 };
    assert.equal(elementLengthMetres(a, b, CELL_METERS), 5.0);
  });

  test("diagonal element — 3-4-5 triangle (3×5 m, 4×5 m cells)", () => {
    const a = { col: 0, row: 0 };
    const b = { col: 3, row: 4 };
    // sqrt((3*5)^2 + (4*5)^2) = sqrt(225+400) = 25
    assert.equal(elementLengthMetres(a, b, CELL_METERS), 25);
  });

  test("zero-length (same node)", () => {
    const a = { col: 2, row: 3 };
    assert.equal(elementLengthMetres(a, a, CELL_METERS), 0);
  });
});

describe("computeElementCost", () => {
  const nodeA = { col: 0, row: 0 };
  const nodeB = { col: 1, row: 0 }; // 5 m apart

  test("beam cost for 1-cell horizontal element (5 m × $1500/m = $7500)", () => {
    assert.equal(computeElementCost(nodeA, nodeB, "beam"), 7500);
  });

  test("column cost for 1-cell element (5 m × $2000/m = $10 000)", () => {
    assert.equal(computeElementCost(nodeA, nodeB, "column"), 10_000);
  });

  test("truss cost for 1-cell element (5 m × $500/m = $2500)", () => {
    assert.equal(computeElementCost(nodeA, nodeB, "truss"), 2_500);
  });

  test("cable cost for 1-cell element (5 m × $300/m = $1500)", () => {
    assert.equal(computeElementCost(nodeA, nodeB, "cable"), 1_500);
  });

  test("diagonal element has higher cost than horizontal", () => {
    const diag = { col: 1, row: 1 };
    const straightCost = computeElementCost(nodeA, nodeB, "beam");
    const diagCost = computeElementCost(nodeA, diag, "beam");
    assert.ok(diagCost > straightCost, `diagonal $${diagCost} should exceed horizontal $${straightCost}`);
  });

  test("2-cell element costs exactly double a 1-cell element", () => {
    const nodeC = { col: 2, row: 0 };
    assert.equal(
      computeElementCost(nodeA, nodeC, "truss"),
      2 * computeElementCost(nodeA, nodeB, "truss"),
    );
  });
});

describe("elementSelfWeightPerMetre", () => {
  test("beam self-weight > 0", () => {
    assert.ok(elementSelfWeightPerMetre("beam") > 0);
  });

  test("column heavier than truss per metre (larger cross-section)", () => {
    assert.ok(elementSelfWeightPerMetre("column") > elementSelfWeightPerMetre("truss"));
  });

  test("beam self-weight matches formula: A × ρ × g", () => {
    const expected = ELEMENT_PROPERTIES.beam.A * STEEL_DENSITY * GRAVITY_MS2;
    assert.equal(elementSelfWeightPerMetre("beam"), expected);
  });
});

describe("gridToMetres", () => {
  test("col 0, row 0 maps to x=0, y=(GRID_ROWS-1)*CELL_METERS (top of grid = highest Y)", () => {
    const { x, y } = gridToMetres(0, 0, GRID_ROWS, CELL_METERS);
    assert.equal(x, 0);
    assert.equal(y, (GRID_ROWS - 1) * CELL_METERS);
  });

  test("bottom-left corner (col 0, last row) maps to y=0", () => {
    const { y } = gridToMetres(0, GRID_ROWS - 1, GRID_ROWS, CELL_METERS);
    assert.equal(y, 0);
  });

  test("col 2, row 0 maps to x = 2 * CELL_METERS", () => {
    const { x } = gridToMetres(2, 0, GRID_ROWS, CELL_METERS);
    assert.equal(x, 2 * CELL_METERS);
  });

  test("row increases → y decreases (grid Y is inverted)", () => {
    const { y: y0 } = gridToMetres(0, 0, GRID_ROWS, CELL_METERS);
    const { y: y1 } = gridToMetres(0, 1, GRID_ROWS, CELL_METERS);
    assert.ok(y0 > y1);
  });
});

describe("mergeLoadMaps", () => {
  test("merges two disjoint maps without overlap", () => {
    const mapA = { n1: { fx: 10, fy: 0, mz: 0 } };
    const mapB = { n2: { fx: 0, fy: -5, mz: 0 } };
    const merged = mergeLoadMaps(mapA, mapB);
    assert.equal(merged.n1.fx, 10);
    assert.equal(merged.n2.fy, -5);
  });

  test("sums forces on shared node", () => {
    const mapA = { n1: { fx: 10, fy:  0, mz: 0 } };
    const mapB = { n1: { fx:  5, fy: -3, mz: 0 } };
    const merged = mergeLoadMaps(mapA, mapB);
    assert.equal(merged.n1.fx, 15);
    assert.equal(merged.n1.fy, -3);
  });

  test("three maps merge correctly", () => {
    const a = { n1: { fx: 1, fy: 0, mz: 0 } };
    const b = { n1: { fx: 2, fy: 0, mz: 0 } };
    const c = { n1: { fx: 3, fy: 0, mz: 0 } };
    assert.equal(mergeLoadMaps(a, b, c).n1.fx, 6);
  });

  test("empty maps return empty object", () => {
    assert.deepEqual(mergeLoadMaps({}, {}), {});
  });
});

describe("buildGravityLoadMap", () => {
  // Simple 2-node, 1-element truss structure
  const nodeA = { id: "n1", col: 0, row: 7, isAnchor: false };
  const nodeB = { id: "n2", col: 1, row: 7, isAnchor: false };
  const elem = { id: "e1", nodeAId: "n1", nodeBId: "n2", type: "truss" };
  const nodes = [nodeA, nodeB];
  const elements = [elem];

  test("both end nodes receive equal downward force", () => {
    const map = buildGravityLoadMap(nodes, elements, []);
    assert.ok(map.n1.fy < 0, "nodeA should have downward (negative fy) force");
    assert.ok(map.n2.fy < 0, "nodeB should have downward (negative fy) force");
    assert.ok(APPROX(map.n1.fy, map.n2.fy), "forces should be equal");
  });

  test("total gravity force equals full element self-weight", () => {
    const map = buildGravityLoadMap(nodes, elements, []);
    const lengthM = computeElementLengthM(nodeA, nodeB);
    const expected = elementSelfWeightPerMetre("truss") * lengthM;
    const actual = Math.abs(map.n1.fy) + Math.abs(map.n2.fy);
    assert.ok(APPROX(actual, expected), `expected ${expected.toFixed(1)} N, got ${actual.toFixed(1)} N`);
  });

  test("dead load from levelLoadNodes is applied to matching node", () => {
    const map = buildGravityLoadMap(nodes, elements, [
      { col: 0, row: 7, load: { fx: 0, fy: -1000 } },
    ]);
    // n1 should have the extra -1000 N on top of self-weight
    const selfWeightHalf = (elementSelfWeightPerMetre("truss") * 5) / 2;
    assert.ok(APPROX(map.n1.fy, -selfWeightHalf - 1000, 1));
  });

  test("missing node in element pair is skipped gracefully", () => {
    const badElem = { id: "e2", nodeAId: "ghost", nodeBId: "n1", type: "beam" };
    assert.doesNotThrow(() => buildGravityLoadMap(nodes, [badElem], []));
  });

  test("no elements → only load-node forces applied", () => {
    const map = buildGravityLoadMap(nodes, [], [
      { col: 0, row: 7, load: { fx: 500, fy: -200 } },
    ]);
    assert.equal(map.n1.fx, 500);
    assert.equal(map.n1.fy, -200);
    assert.equal(map.n2, undefined);
  });
});

describe("buildWindLoadMap", () => {
  const freeNode = { id: "n1", col: 5, row: 7, isAnchor: false };
  const anchorNode = { id: "n2", col: 6, row: 7, isAnchor: true };
  const elem = { id: "e1", nodeAId: "n1", nodeBId: "n2", type: "beam" };
  const nodes = [freeNode, anchorNode];
  const elements = [elem];

  test("anchor nodes receive no wind load", () => {
    const map = buildWindLoadMap(nodes, elements, 100, 0);
    assert.equal(map.n2, undefined, "anchor node should not appear in wind load map");
  });

  test("wind blowing east (0°) produces positive fx, zero fy", () => {
    const map = buildWindLoadMap(nodes, elements, 100, 0);
    assert.ok(map.n1.fx > 0);
    assert.ok(APPROX(map.n1.fy, 0, 0.001));
  });

  test("wind blowing north (90°) produces positive fy, near-zero fx", () => {
    const map = buildWindLoadMap(nodes, elements, 100, 90);
    assert.ok(map.n1.fy > 0);
    assert.ok(Math.abs(map.n1.fx) < 0.01);
  });

  test("doubling wind speed quadruples wind force (Bernoulli ∝ v²)", () => {
    const map50  = buildWindLoadMap(nodes, elements, 50,  0);
    const map100 = buildWindLoadMap(nodes, elements, 100, 0);
    assert.ok(APPROX(map100.n1.fx / map50.n1.fx, 4, 0.01));
  });

  test("no elements → zero tributary area → zero wind load", () => {
    const map = buildWindLoadMap([freeNode], [], 100, 0);
    assert.ok(APPROX(map.n1.fx, 0, 0.001));
  });
});

describe("buildBallisticLoadMap", () => {
  const nodes = [
    { id: "n1", col: 3, row: 2 },
    { id: "n2", col: 5, row: 5 },
  ];

  test("applies downward force to target node", () => {
    const map = buildBallisticLoadMap(nodes, 3, 2, 50_000);
    assert.equal(map.n1.fy, -50_000);
    assert.equal(map.n1.fx, 0);
  });

  test("does not affect non-target node", () => {
    const map = buildBallisticLoadMap(nodes, 3, 2, 50_000);
    assert.equal(map.n2, undefined);
  });

  test("missing target returns empty map", () => {
    const map = buildBallisticLoadMap(nodes, 99, 99, 50_000);
    assert.deepEqual(map, {});
  });

  test("zero force produces zero-magnitude load entry", () => {
    const map = buildBallisticLoadMap(nodes, 3, 2, 0);
    // -(0) === -0 in JS; treat as numerically zero
    assert.equal(Math.abs(map.n1.fy), 0);
  });
});

describe("buildFloodLoadMap", () => {
  // Grid row 14 = bottom row → y = 0 m (ground level)
  // Grid row 12 → y = 2 * 5 = 10 m elevation
  const lowNode  = { id: "n1", col: 0, row: 14 }; // y=0 → below any flood depth
  const highNode = { id: "n2", col: 0, row: 12 }; // y=10 m → above 5 m flood depth
  const elem = { id: "e1", nodeAId: "n1", nodeBId: "n2", type: "truss" };

  test("node above flood depth receives no force", () => {
    const map = buildFloodLoadMap([lowNode, highNode], [elem], 5, 1000);
    assert.equal(map.n2, undefined, "high node (y=10m) should be above 5m flood");
  });

  test("node below flood depth receives positive horizontal force", () => {
    const map = buildFloodLoadMap([lowNode, highNode], [elem], 5, 1000);
    assert.ok(map.n1 !== undefined);
    assert.ok(map.n1.fx > 0, "flood force should be horizontal (+x)");
    assert.equal(map.n1.fy, 0);
  });

  test("deeper flood depth → greater force on same node", () => {
    const map5  = buildFloodLoadMap([lowNode, highNode], [elem], 5,  1000);
    const map10 = buildFloodLoadMap([lowNode, highNode], [elem], 10, 1000);
    assert.ok(map10.n1.fx > map5.n1.fx, "deeper flood → more pressure");
  });

  test("denser water → greater force on same node", () => {
    const mapFresh = buildFloodLoadMap([lowNode, highNode], [elem], 5, 1000);
    const mapSalt  = buildFloodLoadMap([lowNode, highNode], [elem], 5, 1025);
    assert.ok(mapSalt.n1.fx > mapFresh.n1.fx);
  });
});

describe("computeStarRating", () => {
  const level = { requirements: { minElements: 4 } };
  const nodes = [];
  const elements = new Array(8).fill(null).map((_, i) => ({ id: `e${i}` }));

  const goodResult = {
    survived: true,
    failureSequence: [],
    elementStressRatios: { e0: 0.4, e1: 0.5, e2: 0.6, e3: 0.3 },
  };

  test("collapse → 0 stars", () => {
    const result = { survived: false, failureSequence: [], elementStressRatios: {} };
    assert.equal(computeStarRating(level, nodes, elements, result, 0, 10_000), 0);
  });

  test("survived with low stress, good budget efficiency, enough elements → 3 stars", () => {
    // budgetEfficiency = 1 - 6000/10000 = 0.4 > 0.2 ✓
    // maxUtil = 0.6 < 0.75 ✓
    // elemBonus: 8 >= 4*1.5=6 ✓
    assert.equal(computeStarRating(level, nodes, elements, goodResult, 6_000, 10_000), 3);
  });

  test("survived but used almost entire budget → drops to 2 stars", () => {
    // budgetEfficiency = 1 - 9900/10000 = 0.01 < 0.2 → no 3-star
    assert.equal(computeStarRating(level, nodes, elements, goodResult, 9_900, 10_000), 2);
  });

  test("survived with high stress (>0.75 but <0.9) → 2 stars", () => {
    const highStress = { ...goodResult, elementStressRatios: { e0: 0.8 } };
    assert.equal(computeStarRating(level, nodes, elements, highStress, 5_000, 10_000), 2);
  });

  test("survived with very high stress (>0.9) → 1 star", () => {
    const criticalStress = { ...goodResult, elementStressRatios: { e0: 0.95 } };
    assert.equal(computeStarRating(level, nodes, elements, criticalStress, 5_000, 10_000), 1);
  });

  test("survived with a failure wave in sequence → at most 2 stars", () => {
    const withFailure = { ...goodResult, failureSequence: [["e0"]] };
    const stars = computeStarRating(level, nodes, elements, withFailure, 5_000, 10_000);
    assert.ok(stars <= 2, `expected ≤2 stars with failure, got ${stars}`);
  });

  test("barely enough elements (exactly minElements) → no elemBonus, misses 3-star", () => {
    const bareMin = new Array(4).fill(null).map((_, i) => ({ id: `e${i}` }));
    // 4 elements, minElements=4, need 1.5*4=6 for bonus → won't qualify for 3 stars
    assert.ok(computeStarRating(level, nodes, bareMin, goodResult, 5_000, 10_000) < 3);
  });

  test("no elements in stressRatios still returns valid rating", () => {
    const emptyRatios = { ...goodResult, elementStressRatios: {} };
    assert.ok(computeStarRating(level, nodes, elements, emptyRatios, 5_000, 10_000) >= 1);
  });
});
