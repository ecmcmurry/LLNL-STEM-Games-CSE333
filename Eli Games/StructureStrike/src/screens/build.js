import { el } from '../ui/components.js';
import { LEVELS } from '../data/levels.js';
import { ELEMENT_TYPE, SUPPORT_TYPE, ELEMENT_PROPERTIES } from '../utils/constants.js';
import {
  getCurrentLevelIndex, getStructure, getBudgetRemaining,
  deductBudget, refundBudget, setStructure, setBuildScreenSnapshot, setBuildCanvasTransform,
} from '../state.js';
import { saveStructure, loadStructure } from '../utils/storage.js';
import {
  initialiseBlueprintCanvas, drawBlueprintGrid, drawElement, drawNode,
  drawSupportSymbol, drawLoadArrow, drawSnapPreview, drawConnectionPreview,
  drawElementLegend,
} from '../canvas/blueprint-canvas.js';
import { drawThreatDirectionArrows } from '../canvas/sim-renderer.js';
import {
  findNodeAtCanvasPoint, findElementAtCanvasPoint,
  snapToGrid, placePlayerNode, connectNodes, removeElement, removeNode,
  isStructureSimulatable, getElementCostOptions,
} from '../canvas/build-tools.js';
import {
  createBudgetDisplay, updateBudgetDisplay,
  createUndoButton, createDeleteButton, createRunSimulationButton, createResetButton,
  setSimulateButtonEnabled, createLevelInfoStrip, createCostPreviewTooltip,
  updateCostPreviewTooltip, hideCostPreviewTooltip,
  createRequirementsPostIt,
  createHistoryPostIt,
  createBackButton,
  createModeToggle,
} from '../ui/hud.js';
import {
  mountNotificationContainer, unmountNotificationContainer,
  showPatternRecognisedNotification, showWarningNotification,
} from '../ui/notifications.js';
import { showElementPickerModal, closeModal } from '../ui/modals.js';
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
  let { ctx, cellPx, canvasW, canvasH } = initialiseBlueprintCanvas(
    canvasEl,
    canvasWrap.clientWidth || window.innerWidth,
    canvasWrap.clientHeight || window.innerHeight,
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
  const backBtn     = createBackButton(() => { location.hash = ''; });
  const resetBtn    = createResetButton(handleReset);
  const modeTgl     = createModeToggle('build', handleBuildMode, handleEditMode);
  const undoBtn     = createUndoButton(handleUndo);
  const deleteBtn   = createDeleteButton(handleDeleteSelected);
  const simBtn      = createRunSimulationButton(handleRunSimulation);
  const costTooltip = createCostPreviewTooltip();

  const selectedElementType = ELEMENT_TYPE.BEAM;

  // Delete starts hidden; _syncDeleteButton manages its visibility
  deleteBtn.classList.add('hud-btn--hidden');

  const requirementsPostIt = createRequirementsPostIt(level);
  const historyPostIt      = createHistoryPostIt(level);
  hudLeftEl.append(levelStrip, budgetEl, requirementsPostIt, historyPostIt);
  hudRightEl.append(backBtn, resetBtn, modeTgl, undoBtn, deleteBtn, simBtn);
  hudRightEl.classList.add('mode--build');
  canvasWrap.appendChild(costTooltip);

  mountNotificationContainer(screen);

  // ── Interaction state ─────────────────────────────────────────────────────
  let selectedNodeId  = null; // first node of a pending connection
  let selectedElemId  = null; // currently selected element (for delete)
  let buildMode       = 'build'; // 'build' | 'edit'
  let cursorCanvasPos = null;
  let alreadyDetectedPatterns = new Set();
  // Stack of player actions for undo. Each entry is one of:
  //   { type: 'node', nodeId }
  //   { type: 'element', elementId, cost }
  let undoHistory = [];

  // ── Initial render ────────────────────────────────────────────────────────
  renderCanvas();
  updateBudgetDisplay(getBudgetRemaining());
  setSimulateButtonEnabled(simBtn, isStructureSimulatable(getStructure()));
  // Re-render once fonts are ready so EngineerHand shows in the legend
  document.fonts.ready.then(() => renderCanvas());

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
      if (buildMode === 'edit') {
        // In edit mode, tapping a node clears any element selection
        selectedNodeId = null;
        selectedElemId = null;
        _syncDeleteButton();
        renderCanvas();
        return;
      }
      // Build mode: node tap logic
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
      if (buildMode === 'edit') {
        // Edit mode: toggle element selection
        selectedNodeId = null;
        selectedElemId = selectedElemId === tappedElem.id ? null : tappedElem.id;
        _syncDeleteButton();
        renderCanvas();
        return;
      }
      // Build mode: ignore the element hit — fall through to place a node at this position
    }

    // Tapping empty grid space (or over an element in build mode)
    if (buildMode === 'edit') {
      // In edit mode, clear selection and do nothing else
      selectedNodeId = null;
      selectedElemId = null;
      _syncDeleteButton();
      renderCanvas();
      return;
    }

    // Build mode: place a new node
    const snapped = snapToGrid(x, y, cellPx);
    const prevNodeCount = structure.nodes.length;
    const placedNode = placePlayerNode(snapped.col, snapped.row, structure);
    if (structure.nodes.length > prevNodeCount) {
      undoHistory.push({ type: 'node', nodeId: placedNode.id });
    }
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
    undoHistory.push({ type: 'element', elementId: result.element.id, cost: result.cost });
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
    undoHistory    = [];
    alreadyDetectedPatterns = new Set();
    _syncDeleteButton();
    updateBudgetDisplay(getBudgetRemaining());
    saveStructure(levelIndex, structure);
    renderCanvas();
    setSimulateButtonEnabled(simBtn, isStructureSimulatable(structure));
  }

  // [BUILD-PHASE] Undoes the last player action (node placement or element placement),
  // one step at a time. Nodes and elements are each their own undo step.
  function handleUndo() {
    if (undoHistory.length === 0) return;
    const structure = getStructure();
    const action    = undoHistory.pop();

    if (action.type === 'node') {
      removeNode(action.nodeId, structure);
    } else if (action.type === 'element') {
      // Remove element without orphan cleanup so explicitly-placed nodes survive
      removeElement(action.elementId, structure, false);
      refundBudget(action.cost);
      updateBudgetDisplay(getBudgetRemaining());
    }

    selectedNodeId = null;
    selectedElemId = null;
    _syncDeleteButton();
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

  // [SIMULATION] Captures the full build screen as an offscreen canvas, stores it,
  // then navigates to the simulation screen.
  function handleRunSimulation() {
    const structure = getStructure();
    if (!isStructureSimulatable(structure)) {
      showWarningNotification('Connect your structure to a support before simulating.');
      return;
    }
    const dpr = window.devicePixelRatio ?? 1;
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const snap = document.createElement('canvas');
    snap.width  = vw * dpr;
    snap.height = vh * dpr;
    const snapCtx = snap.getContext('2d');
    snapCtx.scale(dpr, dpr);

    // Draw the background image (now fills full screen).
    // Use a relative path so it resolves correctly whether running via dev server
    // or served from dist/ inside an iframe on the platform.
    const isLandscape = canvasWrap.classList.contains('build-canvas-wrap--landscape');
    const bgSrc = isLandscape ? './background-horizontal.png' : './background-vertical.png';
    const bgImg = new Image();
    bgImg.src = bgSrc;
    const _doSnap = () => {
      // Guard: only draw the bg image if it loaded successfully.
      // drawImage on a broken/errored image throws, which would silently
      // prevent location.hash = '#simulate' from ever running.
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        snapCtx.drawImage(bgImg, 0, 0, vw, vh);
      }
      // Blueprint canvas on top
      const canvasRect = canvasEl.getBoundingClientRect();
      snapCtx.drawImage(canvasEl, canvasRect.left, canvasRect.top, canvasRect.width, canvasRect.height);
      setBuildScreenSnapshot(snap);
      location.hash = '#simulate';
    };

    // Save canvas position + cell size so the sim screen can re-draw the structure
    setBuildCanvasTransform(canvasEl.getBoundingClientRect(), cellPx);

    if (bgImg.complete) {
      _doSnap();
    } else {
      bgImg.onload = _doSnap;
      bgImg.onerror = _doSnap;
    }
  }

  // ── Mode switching ────────────────────────────────────────────────────────

  // [BUILD-PHASE] Switches to Build mode: only node/element placement is active.
  function handleBuildMode() {
    buildMode = 'build';
    hudRightEl.classList.replace('mode--edit', 'mode--build');
    selectedNodeId = null;
    selectedElemId = null;
    _syncDeleteButton();
    renderCanvas();
  }

  // [BUILD-PHASE] Switches to Edit mode: only element selection/deletion is active.
  function handleEditMode() {
    buildMode = 'edit';
    hudRightEl.classList.replace('mode--build', 'mode--edit');
    selectedNodeId = null;
    selectedElemId = null;
    _syncDeleteButton();
    renderCanvas();
  }

  // ── Delete button sync ────────────────────────────────────────────────────

  // [BUILD-PHASE] Shows/enables or hides/disables the delete button based on
  // current mode and element selection.
  function _syncDeleteButton() {
    if (buildMode === 'edit') {
      deleteBtn.classList.remove('hud-btn--hidden');
      if (selectedElemId) {
        deleteBtn.disabled = false;
        deleteBtn.classList.remove('hud-btn--disabled');
      } else {
        deleteBtn.disabled = true;
        deleteBtn.classList.add('hud-btn--disabled');
      }
    } else {
      deleteBtn.classList.add('hud-btn--hidden');
      deleteBtn.disabled = false;
      deleteBtn.classList.remove('hud-btn--disabled');
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

    // Element legend below the grid
    drawElementLegend(ctx, cellPx);

    // Snap preview and connection preview (build mode only)
    if (cursorCanvasPos) {
      const snapped = snapToGrid(cursorCanvasPos.x, cursorCanvasPos.y, cellPx);
      const overNode = findNodeAtCanvasPoint(cursorCanvasPos.x, cursorCanvasPos.y, structure.nodes, cellPx);
      if (!overNode && buildMode === 'build') drawSnapPreview(ctx, snapped.col, snapped.row, cellPx);

      if (selectedNodeId) {
        const fromNode = structure.nodes.find(n => n.id === selectedNodeId);
        if (fromNode) {
          drawConnectionPreview(ctx, fromNode, cursorCanvasPos.x, cursorCanvasPos.y, selectedElementType, cellPx);
        }
      }
    }

    // Threat direction indicator — static preview so player knows what to design against
    drawThreatDirectionArrows(ctx, canvasW, canvasH, level.threat, 0);
  }

  // ── Resize handler ────────────────────────────────────────────────────────
  function handleResize() {
    const reinit = initialiseBlueprintCanvas(canvasEl, canvasWrap.clientWidth || window.innerWidth, canvasWrap.clientHeight || window.innerHeight);
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
