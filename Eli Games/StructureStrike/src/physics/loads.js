import { GRAVITY_MS2, STEEL_DENSITY, CELL_METERS } from '../utils/constants.js';
import { GRID_ROWS } from '../utils/constants.js';
import { elementSelfWeightPerMetre, computeElementLengthM } from './elements.js';
import { gridToMetres } from '../utils/math.js';

// All load builders return a loadMap: { nodeId → { fx, fy, mz } }
// that can be passed directly to runFEMAnalysis().

// [PHYSICS] Merges two load maps, summing forces on shared nodes
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

// ─── Dead load (gravity) ──────────────────────────────────────────────────────

// [SIMULATION] Builds the gravity load map by lumping each element's self-weight
// equally onto its two end nodes. Also applies any explicit per-node dead loads
// from the level definition (loadNodes).
export function buildGravityLoadMap(nodes, elements, levelLoadNodes) {
  const loadMap = {};

  // Self-weight: distribute element weight equally to both end nodes
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

  // Explicit dead loads from the level definition (platform weights, etc.)
  for (const ln of (levelLoadNodes ?? [])) {
    const node = nodes.find(n => n.col === ln.col && n.row === ln.row);
    if (!node) continue;
    if (!loadMap[node.id]) loadMap[node.id] = { fx: 0, fy: 0, mz: 0 };
    loadMap[node.id].fx += ln.load?.fx ?? 0;
    loadMap[node.id].fy += ln.load?.fy ?? 0;
  }

  return loadMap;
}

// ─── Wind load ────────────────────────────────────────────────────────────────

// [SIMULATION] Builds a lateral wind load map. The wind force per exposed node
// is derived from the Bernoulli pressure equation using wind speed.
// windSpeedKmh: wind velocity; windAngleDeg: direction the wind BLOWS TOWARD (deg).
export function buildWindLoadMap(nodes, elements, windSpeedKmh, windAngleDeg) {
  const loadMap = {};
  const windSpeedMs = windSpeedKmh / 3.6;
  const airDensity = 1.225; // kg/m³
  const cd = 1.3; // drag coefficient for a bluff building face
  const dynamicPressure = 0.5 * airDensity * windSpeedMs * windSpeedMs * cd; // Pa

  const angleRad = (windAngleDeg * Math.PI) / 180;
  const fx_dir = Math.cos(angleRad);
  const fy_dir = Math.sin(angleRad);

  // Exposed area per node = half of adjacent element tributary lengths × 1 m depth
  for (const node of nodes) {
    if (node.isAnchor) continue;

    // Sum tributary length from connected elements
    let tributaryM = 0;
    for (const elem of elements) {
      if (elem.nodeAId === node.id || elem.nodeBId === node.id) {
        const nodeA = nodes.find(n => n.id === elem.nodeAId);
        const nodeB = nodes.find(n => n.id === elem.nodeBId);
        if (nodeA && nodeB) tributaryM += computeElementLengthM(nodeA, nodeB) / 2;
      }
    }

    const exposedArea = tributaryM * 1.0; // assume 1 m depth into page
    const windForce = dynamicPressure * exposedArea;

    loadMap[node.id] = {
      fx: windForce * fx_dir,
      fy: windForce * fy_dir,
      mz: 0,
    };
  }

  return loadMap;
}

// ─── Seismic load ─────────────────────────────────────────────────────────────

// [SIMULATION] Builds a seismic equivalent static load map (simplified ASCE 7 approach).
// Applies F = mass × Sa horizontally to each node, where Sa = peakAccelerationG × 9.81.
// timeSec is used to produce a sinusoidal variation for animated playback.
export function buildSeismicLoadMap(nodes, elements, peakAccelerationG, timeSec, frequencyHz) {
  const loadMap = {};
  const Sa = peakAccelerationG * GRAVITY_MS2;
  const phase = Math.sin(2 * Math.PI * frequencyHz * timeSec);

  for (const node of nodes) {
    if (node.isAnchor) continue;

    // Estimate lumped mass: half the self-weight of connected elements / g
    let massKg = 0;
    for (const elem of elements) {
      if (elem.nodeAId === node.id || elem.nodeBId === node.id) {
        const nodeA = nodes.find(n => n.id === elem.nodeAId);
        const nodeB = nodes.find(n => n.id === elem.nodeBId);
        if (nodeA && nodeB) {
          const lengthM = computeElementLengthM(nodeA, nodeB);
          const { A } = { A: 0.006 }; // average section area approximation
          massKg += (A * STEEL_DENSITY * lengthM) / 2;
        }
      }
    }

    const seismicForce = massKg * Sa * phase; // oscillates during simulation
    loadMap[node.id] = { fx: seismicForce, fy: 0, mz: 0 };
  }

  return loadMap;
}

// ─── Hydrostatic flood pressure ───────────────────────────────────────────────

// [SIMULATION] Builds a flood pressure load map applied to exposed nodes.
// Pressure = ρgh where h is the water depth above that node's elevation.
// Only nodes below the flood water level receive pressure.
export function buildFloodLoadMap(nodes, elements, floodDepthM, waterDensity) {
  const loadMap = {};
  const g = GRAVITY_MS2;

  for (const node of nodes) {
    // Node elevation in metres (Y-up coordinate: row 0 = top, highest elevation)
    const { y: elevationM } = gridToMetres(node.col, node.row, GRID_ROWS, CELL_METERS);
    // Ground is at y=0; flood depth is from y=0 upward
    const depthBelowSurface = floodDepthM - elevationM;
    if (depthBelowSurface <= 0) continue; // above water line

    const pressure = waterDensity * g * depthBelowSurface; // Pa

    // Tributary area per node for pressure calculation
    let tributaryM = 0;
    for (const elem of elements) {
      if (elem.nodeAId === node.id || elem.nodeBId === node.id) {
        const nodeA = nodes.find(n => n.id === elem.nodeAId);
        const nodeB = nodes.find(n => n.id === elem.nodeBId);
        if (nodeA && nodeB) tributaryM += computeElementLengthM(nodeA, nodeB) / 2;
      }
    }

    const force = pressure * tributaryM * 1.0; // N (1 m depth)
    loadMap[node.id] = {
      fx: force, // horizontal flood pressure (pushes +X)
      fy: 0,
      mz: 0,
    };
  }

  return loadMap;
}

// ─── Ballistic impact ─────────────────────────────────────────────────────────

// [SIMULATION] Builds a ballistic impact load applied to a single target node.
// impactForceN is the impulse force magnitude; direction is straight down (–Y).
export function buildBallisticLoadMap(nodes, targetCol, targetRow, impactForceN) {
  const loadMap = {};
  const targetNode = nodes.find(n => n.col === targetCol && n.row === targetRow);
  if (!targetNode) return loadMap;

  loadMap[targetNode.id] = {
    fx: 0,
    fy: -impactForceN,
    mz: 0,
  };
  return loadMap;
}

// ─── Level load dispatcher ────────────────────────────────────────────────────

// [SIMULATION] Returns the correct load map for a level's threat type.
// timeSec is used only for animated seismic loads; pass 0 for static analysis.
export function buildLevelLoadMap(level, nodes, elements, timeSec = 0) {
  const gravityMap = buildGravityLoadMap(nodes, elements, level.loadNodes);

  switch (level.threat.type) {
    case 'gravity':
      return gravityMap;

    case 'wind': {
      const windMap = buildWindLoadMap(
        nodes, elements,
        level.threat.windSpeedKmh,
        level.threat.windAngleDeg,
      );
      return mergeLoadMaps(gravityMap, windMap);
    }

    case 'seismic': {
      const seismicMap = buildSeismicLoadMap(
        nodes, elements,
        level.threat.peakAccelerationG,
        timeSec,
        level.threat.frequencyHz,
      );
      return mergeLoadMaps(gravityMap, seismicMap);
    }

    case 'flood': {
      const floodMap = buildFloodLoadMap(
        nodes, elements,
        level.threat.floodDepthM,
        level.threat.waterDensity,
      );
      return mergeLoadMaps(gravityMap, floodMap);
    }

    case 'ballistic': {
      // Find the level's impact target node
      const impactLoadNode = level.loadNodes[0];
      const ballisticMap = buildBallisticLoadMap(
        nodes,
        impactLoadNode.col,
        impactLoadNode.row,
        level.threat.impactForceKN * 1000,
      );
      return mergeLoadMaps(gravityMap, ballisticMap);
    }

    default:
      return gravityMap;
  }
}
