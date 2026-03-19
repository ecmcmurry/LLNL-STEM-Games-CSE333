import planck from 'planck';
import { ELEMENT_PROPERTIES, CELL_METERS, GRID_ROWS, GRAVITY_MS2 } from '../utils/constants.js';
import { elementLengthMetres } from '../utils/math.js';

// How much to multiply raw Planck node positions (metres) before handing to the renderer.
// The renderer already applies DEFORMATION_SCALE (×80), so this sits on top of that.
// Tune this if deformation looks too subtle or too dramatic.
export const PLANCK_DISP_AMPLIFY = 30;

// Scale applied to all external forces before feeding into Planck.
// Structural loads are hundreds of kN; Planck bodies have masses of ~10–100 kg.
// Without scaling the sim blows up in one step.
// Yield thresholds are scaled by the same factor, so stress ratios stay correct.
export const PHYSICS_FORCE_SCALE = 1e-3;

// [PHYSICS] Converts a grid (col, row) to Planck world coordinates (metres, Y-up).
function gridToWorld(col, row) {
  return planck.Vec2(col * CELL_METERS, (GRID_ROWS - 1 - row) * CELL_METERS);
}

// [PHYSICS] Creates the Planck world with downward gravity.
export function createPhysicsWorld() {
  return planck.World({ gravity: planck.Vec2(0, -GRAVITY_MS2 * PHYSICS_FORCE_SCALE) });
}

// [PHYSICS] Creates one Planck body per structural node.
// Anchor nodes are static (immovable); free nodes are dynamic.
// Returns Map<nodeId, body>.
export function createNodeBodies(world, nodes, elements) {
  const bodies = new Map();

  for (const node of nodes) {
    const pos = gridToWorld(node.col, node.row);
    const body = world.createBody({
      type: node.isAnchor ? 'static' : 'dynamic',
      position: pos,
      linearDamping: 1.5,
      angularDamping: 1.0,
    });

    // Tiny sensor fixture — needed by Planck but we don't want collision response
    body.createFixture(planck.Circle(0.05), {
      density: 1,
      isSensor: true,
    });

    bodies.set(node.id, body);
  }

  _assignLumpedMasses(bodies, nodes, elements);
  return bodies;
}

// [PHYSICS] Sets each dynamic node's mass to the lumped half-mass of its connected elements.
// Heavier elements → heavier nodes → more inertia and slower response (realistic).
function _assignLumpedMasses(bodies, nodes, elements) {
  for (const node of nodes) {
    if (node.isAnchor) continue;
    const body = bodies.get(node.id);
    if (!body) continue;

    let massKg = 10; // minimum so isolated nodes still respond

    for (const elem of elements) {
      if (elem.nodeAId !== node.id && elem.nodeBId !== node.id) continue;
      const nodeA = nodes.find(n => n.id === elem.nodeAId);
      const nodeB = nodes.find(n => n.id === elem.nodeBId);
      if (!nodeA || !nodeB) continue;
      const lengthM = elementLengthMetres(nodeA, nodeB, CELL_METERS);
      const { A } = ELEMENT_PROPERTIES[elem.type];
      massKg += A * 7850 * lengthM / 2;
    }

    body.setMassData({
      mass: massKg,
      center: planck.Vec2(0, 0),
      I: massKg * 0.05,
    });
  }
}

// [PHYSICS] Creates one DistanceJoint per structural element.
// Cables use a softer, more heavily damped spring so they visibly sag.
// Returns Map<elemId, { joint, restLength, isCable }>.
export function createElementJoints(world, elements, bodies, nodes) {
  const joints = new Map();

  for (const elem of elements) {
    const bodyA = bodies.get(elem.nodeAId);
    const bodyB = bodies.get(elem.nodeBId);
    if (!bodyA || !bodyB) continue;

    const nodeA = nodes.find(n => n.id === elem.nodeAId);
    const nodeB = nodes.find(n => n.id === elem.nodeBId);
    if (!nodeA || !nodeB) continue;

    const restLength = elementLengthMetres(nodeA, nodeB, CELL_METERS);
    if (restLength < 1e-6) continue; // skip degenerate zero-length elements
    const isCable    = elem.type === 'cable';

    const joint = world.createJoint(planck.DistanceJoint({
      bodyA,
      bodyB,
      localAnchorA: planck.Vec2(0, 0),
      localAnchorB: planck.Vec2(0, 0),
      length:        restLength,
      frequencyHz:   isCable ? 1.5 : 3.0,
      dampingRatio:  isCable ? 0.7 : 0.4,
    }));

    joints.set(elem.id, { joint, restLength, isCable });
  }

  return joints;
}

// [PHYSICS] Applies a load map (nodeId → { fx, fy }) to dynamic bodies.
// Forces are pre-scaled by PHYSICS_FORCE_SCALE so the sim stays numerically stable.
export function applyNodeForces(bodies, forceMap) {
  for (const [nodeId, force] of Object.entries(forceMap)) {
    const body = bodies.get(nodeId);
    if (!body || body.isStatic()) continue;
    body.applyForce(
      planck.Vec2((force.fx ?? 0) * PHYSICS_FORCE_SCALE, (force.fy ?? 0) * PHYSICS_FORCE_SCALE),
      body.getWorldCenter(),
      true,
    );
  }
}

// [PHYSICS] Steps the world forward one 60 Hz frame.
export function stepWorld(world) {
  world.step(1 / 60, 8, 3);
}

// [PHYSICS] Returns the reaction-force magnitude (Newtons, in Planck-scaled units)
// for every active joint. Used to check element yield each step.
export function getJointForces(joints) {
  const forces = {};
  for (const [elemId, { joint }] of joints.entries()) {
    try {
      const f = joint.getReactionForce(60);
      forces[elemId] = (f && isFinite(f.x) && isFinite(f.y))
        ? Math.sqrt(f.x * f.x + f.y * f.y)
        : 0;
    } catch (_) {
      forces[elemId] = 0;
    }
  }
  return forces;
}

// [PHYSICS] Checks cable joints for compression (distance < restLength).
// Destroys and removes any slack cable joints. Returns the removed elemIds.
export function removeSlackCables(world, joints) {
  const slackIds = [];
  for (const [elemId, { joint, restLength, isCable }] of joints.entries()) {
    if (!isCable) continue;
    const posA = joint.getBodyA().getPosition();
    const posB = joint.getBodyB().getPosition();
    const dx   = posB.x - posA.x;
    const dy   = posB.y - posA.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < restLength - 0.02) {
      world.destroyJoint(joint);
      joints.delete(elemId);
      slackIds.push(elemId);
    }
  }
  return slackIds;
}

// [PHYSICS] Extracts final node displacements from Planck body positions.
// Returns Float64Array[nodes.length * 3]: [u, v, θ, u, v, θ, ...]
//   u = X displacement (m, amplified for visual), v = Y displacement (m, Y-up), θ = 0.
export function extractDisplacements(bodies, nodes) {
  const disp = new Float64Array(nodes.length * 3);
  nodes.forEach((node, i) => {
    const body = bodies.get(node.id);
    if (!body) return;
    const pos   = body.getPosition();
    const restX = node.col * CELL_METERS;
    const restY = (GRID_ROWS - 1 - node.row) * CELL_METERS;
    disp[3 * i]     = (pos.x - restX) * PLANCK_DISP_AMPLIFY;
    disp[3 * i + 1] = (pos.y - restY) * PLANCK_DISP_AMPLIFY; // Y-up
    disp[3 * i + 2] = 0;
  });
  return disp;
}
