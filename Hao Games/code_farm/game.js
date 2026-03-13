const $ = (sel) => document.querySelector(sel);

const homeEl = $("#home");
const farmEl = $("#farm");

const startBtn = $("#startBtn");
const nextDayBtn = $("#nextDayBtn");
const editBtn = $("#editBtn");
const resetBtn = $("#resetBtn");

const coinsText = $("#coinsText");
const dayText = $("#dayText");

const farmStage = $("#farmStage");
const farmImg = $("#farmImg");

// Modal
const modalBackdrop = $("#modalBackdrop");
const modalTitle = $("#modalTitle");
const modalDesc = $("#modalDesc");
const plantChoices = $("#plantChoices");
const harvestChoice = $("#harvestChoice");
const plantA = $("#plantA");
const plantB = $("#plantB");
const harvestBtn = $("#harvestBtn");
const closeModal = $("#closeModal");

const codeBugArea = $("#codeBugArea");
const codeEditor = $("#codeEditor");
const finishFixBtn = $("#finishFixBtn");
const bugHint = $("#bugHint");

// terminal
const terminalInput = $("#terminalInput");
const terminalOutput = $("#terminalOutput");

// inventory
const inventoryBackdrop = $("#inventoryBackdrop");
const inventoryA = $("#inventoryA");
const inventoryB = $("#inventoryB");
const closeInventoryBtn = $("#closeInventoryBtn");

// store
const storeBackdrop = $("#storeBackdrop");
const buyA = $("#buyA");
const buyB = $("#buyB");
const closeStoreBtn = $("#closeStoreBtn");
const storeMessage = $("#storeMessage");

// 9 plots
const PLOT_COUNT = 9;

// flower data (two types of flowers for testing)
const FLOWERS = {
  A: {
    name: "Flower A",
    seedCost: 5,
    basePrice: 10,
    daysToGrow: 5,
    images: ["assets/flowerAB_1.jpg", "assets/flowerA_2.jpg", "assets/flowerA_3.jpg"],
    bugImages: ["assets/flowerAB_bug1.jpg", "assets/flowerA_bug2.jpg", "assets/flowerA_bug3.jpg"],
  },
  B: {
    name: "Flower B",
    seedCost: 7,
    basePrice: 14,
    daysToGrow: 5,
    images: ["assets/flowerAB_1.jpg", "assets/flowerB_2.jpg", "assets/flowerB_3.jpg"],
    bugImages: ["assets/flowerAB_bug1.jpg", "assets/flowerB_bug2.jpg", "assets/flowerB_bug3.jpg"],
  },
};

// stores the bug fixing puzzles
const PUZZLES = [
  {
    id: 0,
    title: "Bug Repel: Fix the IF statement",
    buggy: `flower_type = "A"
day_require = 5
position = 3

if (flower_type = "A") {
  cost = 5
} else {
  cost = 7
}
`,
    // simplest checking: look for the key fix token
    isCorrect: (text) => text.includes('if (flower_type == "A")'),
    hint: 'Hint: Use "==" in the if condition.',
  },
  {
    id: 1,
    title: "Bug Repel: Fix the FOR loop",
    buggy: `day_require = 5
growth = 0

for (day = 1; day < day_require; day++) {
  growth = growth + 1
}
`,
    isCorrect: (text) => text.includes("day <= day_require"),
    hint: "Hint: The loop should run 5 times.",
  },
  {
    id: 2,
    title: "Bug Repel: Fix the WHILE loop",
    buggy: `day_require = 5
day = 0

while (day < day_require) {
  day = day - 1
}
`,
    isCorrect: (text) => text.includes("day = day + 1") || text.includes("day += 1") || text.includes("day++"),
    hint: "Hint: day should move toward day_require.",
  },
];

// choose the random puzzle
function randomPuzzleId() {
  return Math.floor(Math.random() * PUZZLES.length); // 0,1,2
}

// local storage keys: save the data in the browser
const STORAGE_KEY = "farm_game_state_v1";
const PLOTS_KEY = "farm_plot_layout_v1";

// State
let state = {
  day: 1,
  coins: 50,

  inventory: {
    A: 0,
    B: 0,
  },

  plots: Array.from({ length: PLOT_COUNT }, () => ({
    planted: false,
    flowerType: null,
    plantedDay: null,

    bugged: false,
    bugPuzzleId: null,
    bugStartDay: null,
  })),
};

let layout = null; // array of 9 plot rects in % units: {x,y,w,h}


// save and load state
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") state = parsed;
  } catch {
  }
}

//save and load plot position
function saveLayout() {
  localStorage.setItem(PLOTS_KEY, JSON.stringify(layout));
}

function loadLayout() {
  const raw = localStorage.getItem(PLOTS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === PLOT_COUNT) return parsed;
  } catch {
    // ignore
  }
  return null;
}

function updateTopUI() {
  coinsText.textContent = String(state.coins);
  dayText.textContent = String(state.day);
}

function updateInventoryUI() {
  inventoryA.textContent = state.inventory.A;
  inventoryB.textContent = state.inventory.B;
}

function openInventory() {
  updateInventoryUI();
  inventoryBackdrop.classList.remove("hidden");
}

function closeInventory() {
  inventoryBackdrop.classList.add("hidden");
}

function openStore() {
  storeMessage.textContent = "";
  storeBackdrop.classList.remove("hidden");
}

function closeStore() {
  storeBackdrop.classList.add("hidden");
}

function buySeed(type) {
  const flower = FLOWERS[type];

  if (state.coins < flower.seedCost) {
    storeMessage.textContent = 'Not enough coins!';
    return;
  }
  state.coins -= flower.seedCost;
  state.inventory[type] += 1;

  saveState();
  updateTopUI();
  updateInventoryUI();
  storeMessage.textContent = `${flower.name} seed purchased!`;
}

function runTerminal(command) {
  const text = command.trim().toLowerCase();

  if (text === 'cd farm') {
    closeInventory();
    closeStore();
    terminalOutput.textContent = "Switched to farm.";
    return;
  }

  if (text === 'cd farm/inventory') {
    closeStore();
    openInventory();
    terminalOutput.textContent = "Switched to inventory.";
    return;
  }

  if (text === 'cd store') {
    closeInventory();
    openStore();
    terminalOutput.textContent = "Switched to store.";
    return;
  }

  terminalOutput.textContent = `Unknown command: ${command}`;

}

function showFarm() {
  homeEl.classList.add("hidden");
  farmEl.classList.remove("hidden");
}

function showHome() {
  farmEl.classList.add("hidden");
  homeEl.classList.remove("hidden");
}

function openModal() {
  modalBackdrop.classList.remove("hidden");
}

function closeModalFn() {
  modalBackdrop.classList.add("hidden");
  codeBugArea.classList.add("hidden");
}

// Growth stage:
// dayPlanted = Dp
// if currentDay - Dp < 3 => stage 1
// if < 5 => stage 2
// else => stage 3 grown
function getStage(plot) {
  if (!plot.planted) return 0;
  const effectiveDay = plot.bugged ? plot.bugStartDay : state.day;
  const age = effectiveDay - plot.plantedDay;
  if (age < 3) return 1;
  if (age < 5) return 2;
  return 3;
}

function getCropImage(plot) {
  if (!plot.planted) return null;
  const f = FLOWERS[plot.flowerType];
  const stage = getStage(plot);
  const index = stage - 1;
  if (plot.bugged) {
    return f.bugImages[index];
  } else {
    return f.images[index];
  }
}


function createDefaultLayout() {
  return [
    {
        "x": 38.09948668187978,
        "y": 24.610414916011344,
        "w": 7.338435114646444,
        "h": 10.24876685800824},
    {
        "x": 46.6482450524155,
        "y": 24.97768025924203,
        "w": 7.1400225892358895,
        "h": 9.918025638867329},
    {
        "x": 55.12471413125797,
        "y": 24.912750712270018,
        "w": 7.205218101034359,
        "h": 10.177744941349182},
    {
        "x": 38.25254790636958,
        "y": 36.77055743421578,
        "w": 7.220814763283243,
        "h": 10.409057706355004},
    {
        "x": 46.6695077078683,
        "y": 36.76243873300824,
        "w": 7.097508955974968,
        "h": 10.504423466104935},
    {
        "x": 55.13888300681601,
        "y": 36.93693507928061,
        "w": 7.20804720508809,
        "h": 10.13107689912516},
    {
        "x": 38.161845304528065,
        "y": 48.79271324051828,
        "w": 7.434804488201531,
        "h": 10.715445051060879},
    {
        "x": 46.85374045858578,
        "y": 48.65678183957554,
        "w": 7.130098926777742,
        "h": 10.741823027828822},
    {
        "x": 55.04676351741868,
        "y": 48.74401440839858,
        "w": 7.37953808842873,
        "h": 10.480075164638878}
    ];
}

// draw all 9 farm plots
function renderPlots() {
  // clear existing
  farmStage.querySelectorAll(".plot").forEach((n) => n.remove());

  layout.forEach((rect, idx) => {
    const plotEl = document.createElement("div");
    plotEl.className = "plot";
    plotEl.dataset.index = String(idx);

    plotEl.style.left = rect.x + "%";
    plotEl.style.top = rect.y + "%";
    plotEl.style.width = rect.w + "%";
    plotEl.style.height = rect.h + "%";

    const cropImg = document.createElement("img");
    cropImg.className = "cropImg";
    cropImg.alt = "crop";
    const plot = state.plots[idx];
    const imgSrc = getCropImage(plot);
    if (imgSrc) {
      cropImg.src = imgSrc;
      cropImg.style.display = "block";
    } else {
      cropImg.style.display = "none";
    }
    plotEl.appendChild(cropImg);

    // resize handle (only for getting the position of the plot)
    const handle = document.createElement("div");
    handle.className = "handle";
    plotEl.appendChild(handle);

    plotEl.addEventListener("click", (e) => {
      // In edit mode, clicks are handled by drag logic; avoid opening modal
      if (farmStage.classList.contains("editMode")) return;

      const i = Number(plotEl.dataset.index);
      onPlotClicked(i);
    });

    farmStage.appendChild(plotEl);
  });
}

function refreshCropsOnly() {
  farmStage.querySelectorAll(".plot").forEach((plotEl) => {
    const idx = Number(plotEl.dataset.index);
    const plot = state.plots[idx];
    const imgEl = plotEl.querySelector(".cropImg");
    const src = getCropImage(plot);
    if (src) {
      imgEl.src = src;
      imgEl.style.display = "block";
    } else {
      imgEl.style.display = "none";
    }
  });
}

let activePlotIndex = null;

function onPlotClicked(i) {
  activePlotIndex = i;
  const plot = state.plots[i];

  if (plot.planted && plot.bugged) {
    const puzzle = PUZZLES[plot.bugPuzzleId];

    modalTitle.textContent = puzzle.title;
    modalDesc.textContent = "A bug appeared! Fix the code to keep the flower growing.";
    plantChoices.classList.add("hidden");
    harvestChoice.classList.add("hidden");

    codeBugArea.classList.remove("hidden");
    bugHint.textContent = puzzle.hint;
    codeEditor.value = puzzle.buggy;

    openModal();
    return;
  }

  if (!plot.planted) {
    modalTitle.textContent = `Plot ${i + 1}`;
    modalDesc.textContent = `Choose a seed to plant.`;

    plantA.textContent = `Plant Flower A (Remaining seeds: ${state.inventory.A}`;
    plantB.textContent = `Plant Flower B (Remaining seeds: ${state.inventory.B}`;

    plantChoices.classList.remove("hidden");
    harvestChoice.classList.add("hidden");
    codeBugArea.classList.add("hidden");
    openModal();
    return;
  }

  const stage = getStage(plot);
  const flower = FLOWERS[plot.flowerType];

  if (stage < 3) {
    modalTitle.textContent = `Plot ${i + 1} - ${flower.name}`;
    modalDesc.textContent = `Growing... Stage ${stage}/3. Planted on Day ${plot.plantedDay}.`;
    plantChoices.classList.add("hidden");
    harvestChoice.classList.add("hidden");
    codeBugArea.classList.add("hidden");
    openModal();
    return;
  }

  // stage 3: harvest
  modalTitle.textContent = `Plot ${i + 1} - ${flower.name}`;
  const earn = flower.basePrice + 5;
  modalDesc.textContent = `Ready to harvest! You will earn ${earn} coins (price ${flower.basePrice} + 5).`;
  plantChoices.classList.add("hidden");
  harvestChoice.classList.remove("hidden");
  codeBugArea.classList.add("hidden");
  openModal();
}

function plantFlower(type) {
  if (activePlotIndex === null) return;
  const plot = state.plots[activePlotIndex];
  if (plot.planted) return;

  if (state.inventory[type] <= 0) {
    modalDesc.textContent = `You do not have any ${FLOWERS[type].name} seeds.`;
    return;
  }

  state.inventory[type] -= 1;

  plot.planted = true;
  plot.flowerType = type;
  plot.plantedDay = state.day;

  plot.bugged = false;
  plot.bugPuzzleId = null;
  plot.bugStartDay = null;

  saveState();
  updateTopUI();
  updateInventoryUI();
  refreshCropsOnly();
  closeModalFn();
}

function harvest() {
  if (activePlotIndex === null) return;
  const plot = state.plots[activePlotIndex];
  if (!plot.planted) return;

  const stage = getStage(plot);
  if (stage < 3) return;

  const flower = FLOWERS[plot.flowerType];
  const earn = flower.basePrice + 5;

  state.coins += earn;

  // clear plot
  plot.planted = false;
  plot.flowerType = null;
  plot.plantedDay = null;

  plot.bugged = false;
  plot.bugPuzzleId = null;
  plot.bugStartDay = null;

  saveState();
  updateTopUI();
  refreshCropsOnly();
  closeModalFn();
}

function nextDay() {
  state.day += 1;
  for (const plot of state.plots){
    if (!plot.planted) continue;
    if (plot.bugged) continue;

    const stageNow = getStage(plot);
    if (stageNow >= 3) continue;

    if (Math.random() < 0.30) {
        plot.bugged = true;
        plot.bugPuzzleId = randomPuzzleId();
        plot.bugStartDay = state.day;
    }
  }
  saveState();
  updateTopUI();
  refreshCropsOnly();
}


// Plot edit mode: drag + resize
// Stored as % units so it scales with the image.
let isEditMode = false;

function toggleEditMode() {
  isEditMode = !isEditMode;
  farmStage.classList.toggle("editMode", isEditMode);
  editBtn.textContent = isEditMode ? "Done Editing" : "Edit Plots";
}

function pxToPercent(xPx, yPx, wPx, hPx) {
  const rect = farmStage.getBoundingClientRect();
  return {
    x: (xPx / rect.width) * 100,
    y: (yPx / rect.height) * 100,
    w: (wPx / rect.width) * 100,
    h: (hPx / rect.height) * 100,
  };
}

// check if n in range of (a,b), return the max
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// function attachDragResize() {
// }


function init() {
  loadState();

  // const ALLOW_EDIT_MODE = false; // set true only while developing

    layout = createDefaultLayout();

    // if (ALLOW_EDIT_MODE) {
    //     const saved = loadLayout();
    //     if (saved) layout = saved;
    //     editBtn.style.display = "inline-block";
    // } else {
    //     editBtn.style.display = "none";
    // }

  updateTopUI();
  updateInventoryUI();

  // Wait for image to load so stage has correct size
  farmImg.addEventListener("load", () => {
    renderPlots();
  });

  // If cached and already complete
  if (farmImg.complete) renderPlots();

  // attachDragResize();

  // Buttons
  startBtn.addEventListener("click", () => {
    showFarm();
  });

  resetBtn.addEventListener("click", () => {
    const confirmReset = confirm("Restart the game?");

    if (confirmReset) {
        localStorage.removeItem("farm_game_state_v1");
        location.reload();
    }
  });

  finishFixBtn.addEventListener("click", () => {
    if (activePlotIndex === null) return;
    const plot = state.plots[activePlotIndex];
    if (!plot.bugged) return;

    const puzzle = PUZZLES[plot.bugPuzzleId];
    const text = codeEditor.value;

    if (puzzle.isCorrect(text)) {
        plot.bugged = false;
        plot.bugPuzzleId = null;
        plot.bugStartDay = null;

        saveState();
        refreshCropsOnly();
        closeModalFn();
    } else {
        bugHint.textContent = "Not quite. " + puzzle.hint;
    }
  });

  nextDayBtn.addEventListener("click", nextDay);

  // editBtn.addEventListener("click", () => {
  //   toggleEditMode();
  // });

  closeModal.addEventListener("click", closeModalFn);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModalFn();
  });

  plantA.addEventListener("click", () => plantFlower("A"));
  plantB.addEventListener("click", () => plantFlower("B"));
  harvestBtn.addEventListener("click", harvest);

  buyA.addEventListener("click", () => buySeed("A"));
  buyB.addEventListener("click", () => buySeed("B"));

  closeInventoryBtn.addEventListener("click", closeInventory);
  closeStoreBtn.addEventListener("click", closeStore);

  inventoryBackdrop.addEventListener("click", (e) => {
    if (e.target === inventoryBackdrop) closeInventory();
  });

  storeBackdrop.addEventListener("click", (e) => {
    if (e.target === storeBackdrop) closeStore();
  });

  terminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runTerminal(terminalInput.value);
      terminalInput.value = "";
    }
  });

}

init();

// window.exportPlotLayout = function () {
//   const raw = localStorage.getItem("farm_plot_layout_v1");
//   if (!raw) {
//     console.log("No saved layout found yet. Use Edit Plots first.");
//     return;
//   }
//   const layout = JSON.parse(raw);
//   console.log("Copy this into createDefaultLayout():");
//   console.log(JSON.stringify(layout, null, 2));
// };