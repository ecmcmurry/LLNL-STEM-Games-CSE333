import { ELEMENT_PROPERTIES, GRAVITY_MS2, STEEL_DENSITY, CELL_METERS } from '../utils/constants.js';
import { elementLengthMetres } from '../utils/math.js';

// [PHYSICS] Returns the material/section properties object for a given element type.
export function getElementProps(type) {
  return ELEMENT_PROPERTIES[type];
}

// [PHYSICS] Returns the real-world length (metres) of an element between two nodes.
export function computeElementLengthM(nodeA, nodeB) {
  return elementLengthMetres(nodeA, nodeB, CELL_METERS);
}

// [BUDGET-COUNTER] Returns the game-dollar cost of placing a specific element between two nodes.
export function computeElementCost(nodeA, nodeB, elementType) {
  const lengthM = computeElementLengthM(nodeA, nodeB);
  return Math.round(lengthM * ELEMENT_PROPERTIES[elementType].costPerMeter);
}

// [PHYSICS] Returns the distributed self-weight (N/m) of an element type.
// Used by loads.js to build gravity load maps.
export function elementSelfWeightPerMetre(type) {
  const { A } = getElementProps(type);
  return A * STEEL_DENSITY * GRAVITY_MS2;
}
