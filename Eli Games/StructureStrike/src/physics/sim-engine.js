import { ELEMENT_PROPERTIES } from '../utils/constants.js';
import {
  createPhysicsWorld, createNodeBodies, createElementJoints,
  applyNodeForces, stepWorld, getJointForces,
  removeSlackCables, extractDisplacements,
  PHYSICS_FORCE_SCALE,
} from './world.js';
import { buildLevelLoadMap } from './loads.js';

const STEPS_PER_SECOND = 60;
const WARMUP_STEPS     = 90;  // ~1.5 s: loads ramp in gradually, structure settles
const SIM_SECONDS      = 4;   // active threat simulation window
const TOTAL_STEPS      = WARMUP_STEPS + SIM_SECONDS * STEPS_PER_SECOND;

// [SIMULATION] Runs the full Planck.js simulation for a level and returns a
// result object compatible with simulate.js and results.js.
//
// Returns:
//   survived:             boolean
//   displacements:        Float64Array [u,v,θ per node, metres amplified for display]
//   elementStressRatios:  { elemId → 0–∞ }  (≥1.0 = failed)
//   failedElementIds:     Set<string>
//   failureSequence:      [[elemId,...], ...]  (one inner array per failure wave)
//   isMechanism:          boolean
export function runPlanckSimulation(nodes, elements, level) {
  const world          = createPhysicsWorld();
  const bodies         = createNodeBodies(world, nodes, elements);
  const joints         = createElementJoints(world, elements, bodies, nodes);
  const failureSequence = [];
  const failedElemIds   = new Set();
  let   activeElements  = [...elements];
  let   isMechanism     = false;

  for (let step = 0; step < TOTAL_STEPS; step++) {
    // timeSec relative to when the threat starts (negative during warmup)
    const threatTimeSec = Math.max(0, (step - WARMUP_STEPS) / STEPS_PER_SECOND);

    // Build and apply load forces for this timestep
    const forceMap = buildLevelLoadMap(level, nodes, activeElements, threatTimeSec);
    applyNodeForces(bodies, forceMap);

    // Advance physics
    stepWorld(world);

    // Cables that go slack are silently removed (not counted as failures)
    removeSlackCables(world, joints);

    // Check remaining joints for yield failure
    const jointForces = getJointForces(joints);
    const newFailures  = [];

    for (const elem of activeElements) {
      if (failedElemIds.has(elem.id)) continue;
      const forceN     = jointForces[elem.id] ?? 0;
      const props      = ELEMENT_PROPERTIES[elem.type];
      const yieldForce = props.A * props.yieldStress * PHYSICS_FORCE_SCALE;

      if (forceN > yieldForce) {
        newFailures.push(elem.id);
        failedElemIds.add(elem.id);
        const entry = joints.get(elem.id);
        if (entry) {
          world.destroyJoint(entry.joint);
          joints.delete(elem.id);
        }
      }
    }

    if (newFailures.length > 0) {
      failureSequence.push(newFailures);
      activeElements = activeElements.filter(e => !failedElemIds.has(e.id));
    }

    // Total-collapse detection: a free node has fallen far below the grid
    if (step > WARMUP_STEPS && _detectCollapse(bodies, nodes)) {
      isMechanism = true;
      break;
    }
  }

  // Extract final positions as display-ready displacements
  const displacements = extractDisplacements(bodies, nodes);

  // Build stress ratios: failed → 1.5 (past yield), active → force / threshold
  const elementStressRatios = {};
  const finalForces = getJointForces(joints);
  for (const elem of elements) {
    if (failedElemIds.has(elem.id)) {
      elementStressRatios[elem.id] = 1.5;
    } else {
      const forceN     = finalForces[elem.id] ?? 0;
      const props      = ELEMENT_PROPERTIES[elem.type];
      const yieldForce = props.A * props.yieldStress * PHYSICS_FORCE_SCALE;
      elementStressRatios[elem.id] = yieldForce > 0 ? forceN / yieldForce : 0;
    }
  }

  const survived =
    !isMechanism &&
    failureSequence.length === 0 &&
    _checkWinCondition(level, nodes, displacements);

  return {
    survived,
    displacements,
    elementStressRatios,
    failedElementIds: failedElemIds,
    failureSequence,
    isMechanism,
  };
}

// [SIMULATION] Returns true if any free node has fallen off the bottom of the world,
// indicating the structure has completely collapsed.
function _detectCollapse(bodies, nodes) {
  for (const node of nodes) {
    if (node.isAnchor) continue;
    const body = bodies.get(node.id);
    if (!body) continue;
    const pos = body.getPosition();
    if (pos.y < -30) return true; // well below the grid floor
    const vel = body.getLinearVelocity();
    if (Math.sqrt(vel.x ** 2 + vel.y ** 2) > 200) return true;
  }
  return false;
}

// [SIMULATION] Evaluates whether the structure passes the level's win condition.
function _checkWinCondition(level, nodes, displacements) {
  if (!displacements) return false;
  const { winCondition } = level;

  switch (winCondition.type) {
    case 'max_deflection': {
      const targetIds = level.loadNodes
        .map(ln => nodes.find(n => n.col === ln.col && n.row === ln.row)?.id)
        .filter(Boolean);
      let maxDispM = 0;
      for (const nodeId of targetIds) {
        const idx = nodes.findIndex(n => n.id === nodeId);
        if (idx === -1) continue;
        const u = displacements[3 * idx];
        const v = displacements[3 * idx + 1];
        const d = Math.sqrt(u * u + v * v);
        if (d > maxDispM) maxDispM = d;
      }
      return maxDispM * 1000 <= winCondition.maxDeflectionMm;
    }

    case 'no_collapse':
      return true;

    case 'protected_node': {
      const { protectedCols, protectedRow } = winCondition;
      for (const col of protectedCols) {
        const node = nodes.find(n => n.col === col && n.row === protectedRow);
        if (!node) continue;
        const idx = nodes.findIndex(n => n.id === node.id);
        const v = displacements[3 * idx + 1];
        if (Math.abs(v) * 1000 > 100) return false;
      }
      return true;
    }

    default:
      return true;
  }
}

// [SIMULATION] Computes the star rating (1–3) for a completed level.
// Signature matches what results.js expects — drop-in replacement for the old failure.js version.
export function computeStarRating(level, nodes, elements, simulationResult, budgetUsed, totalBudget) {
  const { survived, failureSequence, elementStressRatios } = simulationResult;
  if (!survived) return 0;

  const anyFailure       = failureSequence.some(wave => wave.length > 0);
  const maxUtil          = Math.max(0, ...Object.values(elementStressRatios ?? {}));
  const budgetEfficiency = 1 - budgetUsed / totalBudget;

  if (!anyFailure && maxUtil < 0.7 && budgetEfficiency > 0.3) return 3;
  if (!anyFailure && maxUtil < 0.9) return 2;
  return 1;
}
