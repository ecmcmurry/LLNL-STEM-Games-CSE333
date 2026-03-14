// Shared in-memory game state. Imported by screens and canvases that need it.
// Nothing here is persisted — use storage.js for that.

const state = {
  currentLevelIndex: 0,

  // The player's working structure for the current level.
  // Populated during the build phase and read during simulation.
  structure: {
    nodes: [],     // Array of { id, col, row, isAnchor, supportType }
    elements: [],  // Array of { id, nodeAId, nodeBId, type }
  },

  // Remaining budget counter shown in the HUD
  budgetRemaining: 0,

  // Full result object set after running the FEM simulation
  simulationResult: null, // { passed, displacements, elementStresses, failedElementIds, failureSequence }
};

// [LEVEL-PROGRESS] Sets the active level index and resets build-phase state
export function setCurrentLevel(index, levelBudget) {
  state.currentLevelIndex = index;
  state.budgetRemaining = levelBudget;
  state.structure = { nodes: [], elements: [] };
  state.simulationResult = null;
}

// [LEVEL-PROGRESS] Returns the index of the level the player is currently on
export function getCurrentLevelIndex() {
  return state.currentLevelIndex;
}

// [BUILD-PHASE] Replaces the entire working structure (used when loading a save)
export function setStructure(structure) {
  state.structure = structure;
}

// [BUILD-PHASE] Returns the current working structure
export function getStructure() {
  return state.structure;
}

// [BUDGET-COUNTER] Returns the remaining build budget
export function getBudgetRemaining() {
  return state.budgetRemaining;
}

// [BUDGET-COUNTER] Deducts an amount from the remaining build budget
export function deductBudget(amount) {
  state.budgetRemaining = Math.max(0, state.budgetRemaining - amount);
}

// [BUDGET-COUNTER] Refunds an amount back to the remaining build budget
export function refundBudget(amount) {
  state.budgetRemaining += amount;
}

// [SIMULATION] Stores the result object produced after the FEM simulation runs
export function setSimulationResult(result) {
  state.simulationResult = result;
}

// [SIMULATION] Returns the last simulation result, or null if not yet run
export function getSimulationResult() {
  return state.simulationResult;
}
