import { el } from '../ui/components.js';
import { LEVELS } from '../data/levels.js';
import { ELEMENT_TYPE, SUPPORT_TYPE, ELEMENT_PROPERTIES } from '../utils/constants.js';
import {
  getCurrentLevelIndex, getStructure, getBudgetRemaining,
  deductBudget, refundBudget, setStructure,
} from '../state.js';
import { saveStructure, loadStructure } from '../utils/storage.js';
import {
  initialiseBlueprintCanvas, drawBlueprintGrid, drawElement, drawNode,
  drawSupportSymbol, drawLoadArrow, drawSnapPreview, drawConnectionPreview,
} from '../canvas/blueprint-canvas.js';
import {
  findNodeAtCanvasPoint, findElementAtCanvasPoint,
  snapToGrid, placePlayerNode, connectNodes, removeElement, undoLastElement,
  isStructureSimulatable, getElementCostOptions,
} from '../canvas/build-tools.js';
import {
  createBudgetDisplay, updateBudgetDisplay, createElementToolbar,
  createUndoButton, createDeleteButton, createRunSimulationButton, createResetButton,
  setSimulateButtonEnabled, createLevelInfoStrip, createCostPreviewTooltip,
  updateCostPreviewTooltip, hideCostPreviewTooltip,
} from '../ui/hud.js';
import {
  mountNotificationContainer, unmountNotificationContainer,
  showPatternRecognisedNotification, showWarningNotification,
} from '../ui/notifications.js';
import { showElementPickerModal, showMuseumModal, closeModal } from '../ui/modals.js';
import { detectAllPatterns } from '../recognition/pattern-detector.js';
import { computeElementCost } from '../physics/elements.js';

// [BUILD-PHASE] Main build screen. Mounts a blueprint canvas, element toolbar,
// budget HUD, and handles all node/element placement interactions.
// Returns a cleanup function per the router contract.
export function render(container) {
  container.innerHTML = '';

  const levelIndex = getCurrentLevelIndex();
  const level      = LEVELS[levelIndex];
  if (!level) { location.hash = ''; return () => {}; }

  // ── Restore or initialise structure ──────────────────────────────────────
  const saved = loadStructure(levelIndex);
  if (saved) {
    setStructure(saved);
    // Recompute budget spent on saved elements so undoing doesn't create excess money.
    // setCurrentLevel already reset budgetRemaining to the full level budget,
    // so we deduct the total cost of what was previously built.
    const spentBudget = saved.elements.reduce((total, elem) => {
      const nodeA = saved.nodes.find(n => n.id === elem.nodeAId);
      const nodeB = saved.nodes.find(n => n.id === elem.nodeBId);
      return total + (nodeA && nodeB ? computeElementCost(nodeA, nodeB, elem.type) : 0);
    }, 0);
    deductBudget(spentBudget);
  } else {
    // Seed the structure with the level's pre-placed anchor nodes and load nodes
    const structure = getStructure();
    for (const an of level.anchorNodes) {
      structure.nodes.push({
        id: `anchor_${an.col}_${an.row}`,
        col: an.col, row: an.row,
        isAnchor: true,
        supportType: an.supportType,
        label: an.label,
      });
    }
    for (const ln of level.loadNodes) {
      // Load nodes are free (not anchors) but pre-placed at fixed positions
      structure.nodes.push({
        id: `load_${ln.col}_${ln.row}`,
        col: ln.col, row: ln.row,
        isAnchor: false,
        supportType: null,
        isLoadNode: true,
        load: ln.load,
      });
    }
  }

  // ── Build DOM layout ──────────────────────────────────────────────────────
  const canvasEl      = el('canvas', { class: 'build-canvas' });
  const silverBorderEl = el('div', { class: 'canvas-silver-border' });
  const hudLeftEl  = el('div', { class: 'hud-side hud-side--left' });
  const hudRightEl = el('div', { class: 'hud-side hud-side--right' });
  const canvasWrap = el('div', { class: 'build-canvas-wrap' }, silverBorderEl, canvasEl);
  const screen     = el('div', { class: 'screen screen--build' }, hudLeftEl, canvasWrap, hudRightEl);
  container.appendChild(screen);

  // ── Canvas init ───────────────────────────────────────────────────────────
  // On mobile subtract a small gap so the silver border never touches screen edges.
  const _mobileGap = () => window.innerWidth < 768 ? 16 : 0;
  let { ctx, cellPx, canvasW, canvasH } = initialiseBlueprintCanvas(
    canvasEl,
    (canvasWrap.clientWidth  || window.innerWidth)  - _mobileGap(),
    (canvasWrap.clientHeight || window.innerHeight) - _mobileGap(),
  );

  // [BUILD-CANVAS] Sizes the silver border div to surround the canvas, and
  // switches the background scene image based on orientation.
  function updateCanvasFrame() {
    const cw = canvasWrap.clientWidth;
    const ch = canvasWrap.clientHeight;
    const dominant  = Math.max(cw, ch);
    const borderPx  = Math.round(dominant * 0.015);
    silverBorderEl.style.width  = `${canvasW + borderPx * 2}px`;
    silverBorderEl.style.height = `${canvasH + borderPx * 2}px`;

    if (cw >= ch) {
      canvasWrap.classList.add('build-canvas-wrap--landscape');
      canvasWrap.classList.remove('build-canvas-wrap--portrait');
    } else {
      canvasWrap.classList.add('build-canvas-wrap--portrait');
      canvasWrap.classList.remove('build-canvas-wrap--landscape');
    }
  }
  updateCanvasFrame();

  // ── HUD widgets ───────────────────────────────────────────────────────────
  const levelStrip  = createLevelInfoStrip(level);
  const budgetEl    = createBudgetDisplay(level.budget);
  const museumBtn   = el('button', { class: 'hud-btn hud-btn--museum', onClick: () => showMuseumModal(screen, level) }, 'History');
  const undoBtn     = createUndoButton(handleUndo);
  const resetBtn    = createResetButton(handleReset);
  const simBtn      = createRunSimulationButton(handleRunSimulation);
  const costTooltip = createCostPreviewTooltip();

  let selectedElementType = ELEMENT_TYPE.BEAM;
  const toolbar = createElementToolbar(selectedElementType, type => {
    selectedElementType = type;
  });

  // Left panel: level title + budget + element picker
  // Right panel: history, undo, reset, simulate
  hudLeftEl.append(levelStrip, budgetEl, toolbar);
  hudRightEl.append(museumBtn, undoBtn, resetBtn, simBtn);
  canvasWrap.appendChild(costTooltip);

  mountNotificationContainer(screen);

  // ── Interaction state ─────────────────────────────────────────────────────
  let selectedNodeId  = null; // first node of a pending connection
  let selectedElemId  = null; // currently selected element (for delete)
  let deleteBtn       = null;
  let cursorCanvasPos = null;
  let alreadyDetectedPatterns = new Set();

  // ── Initial render ────────────────────────────────────────────────────────
  renderCanvas();
  updateBudgetDisplay(getBudgetRemaining());
  setSimulateButtonEnabled(simBtn, isStructureSimulatable(getStructure()));

  // ── Canvas pointer handlers ───────────────────────────────────────────────

  function getCanvasPoint(e) {
    const r = canvasEl.getBoundingClientRect();
    const touch = e.touches?.[0] ?? e;
    return { x: touch.clientX - r.left, y: touch.clientY - r.top };
  }

  function handlePointerDown(e) {
    e.preventDefault();
    const { x, y } = getCanvasPoint(e);
    const structure = getStructure();

    // Nodes are checked FIRST — a tap near a node always selects the node,
    // even if it also lands on a beam drawn between two nodes.
    const tappedNode = findNodeAtCanvasPoint(x, y, structure.nodes, cellPx);
    if (tappedNode) {
      if (!selectedNodeId) {
        // First tap: select node as connection start
        selectedNodeId = tappedNode.id;
        selectedElemId = null;
        _syncDeleteButton();
      } else if (selectedNodeId === tappedNode.id) {
        // Tapping the same node: deselect
        selectedNodeId = null;
      } else {
        // Second tap: attempt to connect
        const fromNode = structure.nodes.find(n => n.id === selectedNodeId);
        _openElementPicker(fromNode, tappedNode);
        selectedNodeId = null;
      }
      renderCanvas();
      return;
    }

    // No node hit — check if tapping an existing element (for selection/delete)
    const tappedElem = findElementAtCanvasPoint(x, y, structure.nodes, structure.elements, cellPx);
    if (tappedElem) {
      selectedNodeId = null;
      selectedElemId = selectedElemId === tappedElem.id ? null : tappedElem.id;
      _syncDeleteButton();
      renderCanvas();
      return;
    }

    // Tapping empty grid space: place a new node
    const snapped = snapToGrid(x, y, cellPx);
    placePlayerNode(snapped.col, snapped.row, structure);
    selectedNodeId = null;
    selectedElemId = null;
    _syncDeleteButton();
    saveStructure(levelIndex, structure);
    renderCanvas();
    setSimulateButtonEnabled(simBtn, isStructureSimulatable(structure));
  }

  function handlePointerMove(e) {
    const { x, y } = getCanvasPoint(e);
    cursorCanvasPos = { x, y };

    if (selectedNodeId) {
      const fromNode = getStructure().nodes.find(n => n.id === selectedNodeId);
      const snapped  = snapToGrid(x, y, cellPx);
      const cost     = fromNode
        ? computeElementCost(fromNode, { col: snapped.col, row: snapped.row }, selectedElementType)
        : 0;
      updateCostPreviewTooltip(costTooltip, cost, x, y);
    } else {
      hideCostPreviewTooltip(costTooltip);
    }

    renderCanvas();
  }

  function handlePointerUp() {
    // No drag-to-place in this version
  }

  canvasEl.addEventListener('mousedown',  handlePointerDown);
  canvasEl.addEventListener('touchstart', handlePointerDown, { passive: false });
  canvasEl.addEventListener('mousemove',  handlePointerMove);
  canvasEl.addEventListener('touchmove',  handlePointerMove, { passive: false });
  canvasEl.addEventListener('mouseup',    handlePointerUp);
  canvasEl.addEventListener('touchend',   handlePointerUp);

  // ── Build actions ─────────────────────────────────────────────────────────

  // [BUDGET-COUNTER] Opens the element picker modal so the player can choose
  // which element type to connect two nodes with.
  function _openElementPicker(fromNode, toNode) {
    const costOptions = getElementCostOptions(fromNode, toNode, getBudgetRemaining());
    showElementPickerModal(screen, { remaining: getBudgetRemaining() }, costOptions, (type) => {
      _placeElement(fromNode, toNode, type);
    });
  }

  // [BUILD-PHASE] Places a structural element between two nodes and updates budget.
  function _placeElement(fromNode, toNode, elementType) {
    const structure = getStructure();
    const result    = connectNodes(fromNode, toNode, elementType, structure, getBudgetRemaining());
    if (!result) {
      showWarningNotification('Insufficient budget or duplicate element.');
      return;
    }
    deductBudget(result.cost);
    updateBudgetDisplay(getBudgetRemaining());
    saveStructure(levelIndex, structure);
    _checkForNewPatterns(structure);
    renderCanvas();
    setSimulateButtonEnabled(simBtn, isStructureSimulatable(structure));
  }

  // [BUILD-PHASE] Wipes all player-placed elements and nodes, refunds the full budget.
  function handleReset() {
    const structure = getStructure();
    const spent     = level.budget - getBudgetRemaining();
    // Remove all player-placed elements and free nodes; keep anchors and load nodes
    structure.elements = [];
    structure.nodes    = structure.nodes.filter(n => n.isAnchor || n.isLoadNode);
    refundBudget(spent);
    selectedNodeId = null;
    selectedElemId = null;
    alreadyDetectedPatterns = new Set();
    _syncDeleteButton();
    updateBudgetDisplay(getBudgetRemaining());
    saveStructure(levelIndex, structure);
    renderCanvas();
    setSimulateButtonEnabled(simBtn, isStructureSimulatable(structure));
  }

  // [BUILD-PHASE] Removes the last placed element and refunds its cost.
  function handleUndo() {
    const structure = getStructure();
    const refund    = undoLastElement(structure);
    refundBudget(refund);
    updateBudgetDisplay(getBudgetRemaining());
    saveStructure(levelIndex, structure);
    renderCanvas();
    setSimulateButtonEnabled(simBtn, isStructureSimulatable(structure));
  }

  // [BUILD-PHASE] Deletes the currently selected element and refunds its cost.
  function handleDeleteSelected() {
    if (!selectedElemId) return;
    const structure = getStructure();
    const refund    = removeElement(selectedElemId, structure);
    refundBudget(refund);
    selectedElemId = null;
    _syncDeleteButton();
    updateBudgetDisplay(getBudgetRemaining());
    saveStructure(levelIndex, structure);
    renderCanvas();
    setSimulateButtonEnabled(simBtn, isStructureSimulatable(structure));
  }

  // [SIMULATION] Navigates to the simulation screen.
  function handleRunSimulation() {
    const structure = getStructure();
    if (!isStructureSimulatable(structure)) {
      showWarningNotification('Connect your structure to a support before simulating.');
      return;
    }
    location.hash = '#simulate';
  }

  // ── Delete button sync ────────────────────────────────────────────────────

  // [BUILD-PHASE] Shows or hides the delete button based on whether an element is selected.
  function _syncDeleteButton() {
    if (selectedElemId && !deleteBtn) {
      deleteBtn = createDeleteButton(handleDeleteSelected);
      hudRightEl.insertBefore(deleteBtn, simBtn);
    } else if (!selectedElemId && deleteBtn) {
      deleteBtn.remove();
      deleteBtn = null;
    }
  }

  // ── Pattern recognition ───────────────────────────────────────────────────

  // [RECOGNITION] Runs the pattern detector and fires notifications for any
  // newly-detected patterns since the last build action.
  function _checkForNewPatterns(structure) {
    const detected = detectAllPatterns(structure.nodes, structure.elements);
    for (const patternId of detected) {
      if (!alreadyDetectedPatterns.has(patternId)) {
        alreadyDetectedPatterns.add(patternId);
        showPatternRecognisedNotification(patternId);
      }
    }
  }

  // ── Canvas render ─────────────────────────────────────────────────────────

  // [BUILD-CANVAS] Full redraw of the blueprint canvas. Called on every interaction.
  function renderCanvas() {
    const structure = getStructure();
    drawBlueprintGrid(ctx, cellPx);

    // Elements
    const nodeMap = Object.fromEntries(structure.nodes.map(n => [n.id, n]));
    for (const elem of structure.elements) {
      const nodeA = nodeMap[elem.nodeAId];
      const nodeB = nodeMap[elem.nodeBId];
      if (!nodeA || !nodeB) continue;
      const isSelected = elem.id === selectedElemId;
      if (isSelected) {
        // Highlight selected element
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = ELEMENT_PROPERTIES[elem.type].lineWidthPx + 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(nodeA.col * cellPx, nodeA.row * cellPx);
        ctx.lineTo(nodeB.col * cellPx, nodeB.row * cellPx);
        ctx.stroke();
        ctx.restore();
      }
      drawElement(ctx, nodeA, nodeB, elem.type, cellPx);
    }

    // Nodes
    for (const node of structure.nodes) {
      const isSelected    = node.id === selectedNodeId;
      const isHighlighted = cursorCanvasPos
        ? findNodeAtCanvasPoint(cursorCanvasPos.x, cursorCanvasPos.y, [node], cellPx) !== null
        : false;
      drawNode(ctx, node, cellPx, isSelected, isHighlighted);
      if (node.isAnchor) drawSupportSymbol(ctx, node, cellPx);
      if (node.isLoadNode && node.load) drawLoadArrow(ctx, node, node.load, cellPx);
    }

    // Snap preview and connection preview
    if (cursorCanvasPos) {
      const snapped = snapToGrid(cursorCanvasPos.x, cursorCanvasPos.y, cellPx);
      const overNode = findNodeAtCanvasPoint(cursorCanvasPos.x, cursorCanvasPos.y, structure.nodes, cellPx);
      if (!overNode) drawSnapPreview(ctx, snapped.col, snapped.row, cellPx);

      if (selectedNodeId) {
        const fromNode = structure.nodes.find(n => n.id === selectedNodeId);
        if (fromNode) {
          drawConnectionPreview(ctx, fromNode, cursorCanvasPos.x, cursorCanvasPos.y, selectedElementType, cellPx);
        }
      }
    }
  }

  // ── Resize handler ────────────────────────────────────────────────────────
  function handleResize() {
    const reinit = initialiseBlueprintCanvas(canvasEl, canvasWrap.clientWidth - _mobileGap(), canvasWrap.clientHeight - _mobileGap());
    ctx = reinit.ctx; cellPx = reinit.cellPx; canvasW = reinit.canvasW; canvasH = reinit.canvasH;
    updateCanvasFrame();
    renderCanvas();
  }
  window.addEventListener('resize', handleResize);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    canvasEl.removeEventListener('mousedown',  handlePointerDown);
    canvasEl.removeEventListener('touchstart', handlePointerDown);
    canvasEl.removeEventListener('mousemove',  handlePointerMove);
    canvasEl.removeEventListener('touchmove',  handlePointerMove);
    canvasEl.removeEventListener('mouseup',    handlePointerUp);
    canvasEl.removeEventListener('touchend',   handlePointerUp);
    window.removeEventListener('resize', handleResize);
    unmountNotificationContainer();
    closeModal();
  };
}
