const $ = (sel) => document.querySelector(sel);

const homeEl = $("#home");
const farmEl = $("#farm");

const startBtn = $("#startBtn");
const nextDayBtn = $("#nextDayBtn");
const resetBtn = $("#resetBtn");

const coinsText = $("#coinsText");
const dayText = $("#dayText");
const progressText = $("#progressText");
const barFill = $("#barFill");
const unlockText = $("#unlockText");

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
const plantC = $("#plantC");
const plantD = $("#plantD");
const plantE = $("#plantE");
const plantF = $("#plantF");
const plantSeedA = $("#plantSeedA");
const plantSeedB = $("#plantSeedB");
const plantSeedC = $("#plantSeedC");
const plantSeedD = $("#plantSeedD");
const plantSeedE = $("#plantSeedE");
const plantSeedF = $("#plantSeedF");
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
const inventoryC = $("#inventoryC");
const inventoryD = $("#inventoryD");
const inventoryE = $("#inventoryE");
const inventoryF = $("#inventoryF");
const invTerminalInput = $("#invTerminalInput");
const invTerminalOutput = $("#invTerminalOutput");

// store
const storeBackdrop = $("#storeBackdrop");
const buyA = $("#buyA");
const buyB = $("#buyB");
const buyC = $("#buyC");
const buyD = $("#buyD");
const buyE = $("#buyE");
const buyF = $("#buyF");
const storeMessage = $("#storeMessage");
const storeTerminalInput = $("#storeTerminalInput");
const storeTerminalOutput = $("#storeTerminalOutput");

// stat
const statsBackdrop = $("#statsBackdrop");
const statsTotalHarvest = $("#statsTotalHarvest");
const statsHarvestA = $("#statsHarvestA");
const statsHarvestB = $("#statsHarvestB");
const statsHarvestC = $("#statsHarvestC");
const statsHarvestD = $("#statsHarvestD");
const statsHarvestE = $("#statsHarvestE");
const statsHarvestF = $("#statsHarvestF");
const statsTotalCoins = $("#statsTotalCoins");
const statsCurrentDay = $("#statsCurrentDay");
const statsTotalBugsFixed = $("#statsTotalBugsFixed");
const statsTerminalInput = $("#statsTerminalInput");
const statsTerminalOutput = $("#statsTerminalOutput");

// help
const helpBackdrop = $("#helpBackdrop");
const helpTerminalInput = $("#helpTerminalInput");
const helpTerminalOutput = $("#helpTerminalOutput");
// first-time help guide
const terminalGuide = $("#terminalGuide");

// loading page
const loading = $("#loading");

// 9 plots
const PLOT_COUNT = 9;

// flower data (two types of flowers for testing)
const FLOWERS = {
  A: {
    name: "Tulip",
    seedCost: 5,
    price: 10,
    daysToGrow: 5,
    mid: 2,
    images: ["assets/flowerA_1.jpg", "assets/flowerA_2.jpg", "assets/flowerA_3.jpg"],
    bugImages: ["assets/flowerA_bug1.jpg", "assets/flowerA_bug2.jpg", "assets/flowerA_bug3.jpg"],
  },
  B: {
    name: "Daisy",
    seedCost: 7,
    price: 13,
    daysToGrow: 7,
    mid: 3,
    images: ["assets/flowerB_1.jpg", "assets/flowerB_2.jpg", "assets/flowerB_3.jpg"],
    bugImages: ["assets/flowerB_bug1.jpg", "assets/flowerB_bug2.jpg", "assets/flowerB_bug3.jpg"],
  },
  C: {
    name: "Crimson Rose",
    seedCost: 10,
    price: 17,
    daysToGrow: 9,
    mid: 4,
    images: ["assets/flowerC_1.jpg", "assets/flowerC_2.jpg", "assets/flowerC_3.jpg"],
    bugImages: ["assets/flowerC_bug1.jpg", "assets/flowerC_bug2.jpg", "assets/flowerC_bug3.jpg"],
  },
  D: {
    name: "Violet Star",
    seedCost: 10,
    price: 18,
    daysToGrow: 5,
    mid: 2,
    images: ["assets/flowerD_1.jpg", "assets/flowerD_2.jpg", "assets/flowerD_3.jpg"],
    bugImages: ["assets/flowerD_bug1.jpg", "assets/flowerD_bug2.jpg", "assets/flowerD_bug3.jpg"],
  },
  E: {
    name: "Emberblossom",
    seedCost: 15,
    price: 24,
    daysToGrow: 7,
    mid: 3,
    images: ["assets/flowerE_1.jpg", "assets/flowerE_2.jpg", "assets/flowerE_3.jpg"],
    bugImages: ["assets/flowerE_bug1.jpg", "assets/flowerE_bug2.jpg", "assets/flowerE_bug3.jpg"],
  },
  F: {
    name: "Moonflower",
    seedCost: 20,
    price: 30,
    daysToGrow: 9,
    mid: 4,
    images: ["assets/flowerF_1.jpg", "assets/flowerF_2.jpg", "assets/flowerF_3.jpg"],
    bugImages: ["assets/flowerF_bug1.jpg", "assets/flowerF_bug2.jpg", "assets/flowerF_bug3.jpg"],
  },
};

const UNLOCK_REQ = {
  A: 0,
  B: 5,
  C: 10,
  D: 20,
  E: 30,
  F: 40,
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
const GUIDE_KEY = "farm_help_guide_done";

// State
let state = {
  day: 1,
  coins: 50,
  harCount: 0,
  totalCoinsEarned: 0,
  totalBugsFixed: 0,

  flowerHarvests: {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    F: 0,
  },

  inventory: {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    F: 0,
  },

  plots: Array.from({ length: PLOT_COUNT }, () => ({
    planted: false,
    flowerType: null,
    plantedDay: null,

    bugged: false,
    bugPuzzleId: null,
    bugData: null,
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
    if (parsed && typeof parsed === "object") {
      state = parsed;

      if (Array.isArray(state.plots)) {
        for (const plot of state.plots) {
          if (!("bugData" in plot)) {
            plot.bugData = null;
          }
        }
      }
      
      if (typeof state.harCount !== "number") {
        state.harCount = 0;
      }

      if (typeof state.totalCoinsEarned !== "number") {
        state.totalCoinsEarned = 0;
      }

      if (typeof state.totalBugsFixed !== "number") {
        state.totalBugsFixed = 0;
      }

      if (!state.flowerHarvests || typeof state.flowerHarvests !== "object" ) {
        state.flowerHarvests = {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          E: 0,
          F: 0,
        };
      }
    }
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

function shouldShowGuide() {
  return localStorage.getItem(GUIDE_KEY) !== "true";
}

function showGuide() {
  terminalGuide.classList.remove("hidden");
}

function hideGuide() {
  terminalGuide.classList.add("hidden");
}

function completeGuide() {
  localStorage.setItem(GUIDE_KEY, "true");
  hideGuide();
}

function updateTopUI() {
  coinsText.textContent = String(state.coins);
  dayText.textContent = String(state.day);
}

function updateProgressUI() {
  const next = nextUnlock();

  if (!next) {
    progressText.textContent = "All unlocked!";
    barFill.style.width = "100%";
    unlockText.textContent = "All flower seeds have been unlocked!";
    return;
  }

  const previousNeeded = (() => {
    const order = ["A", "B", "C", "D", "E", "F"];
    const idx = order.indexOf(next.type);
    if (idx <= 0) return 0;
    return UNLOCK_REQ[order[idx-1]];
  })();

  const current = state.harCount;
  const target = next.needed;
  const progress = current - previousNeeded;
  const totalNeeded = target - previousNeeded;

  const percent = Math.max(
    0,
    Math.min(100, (progress / totalNeeded) * 100)
  );

  progressText.textContent = `${current} / ${target}`;
  barFill.style.width = percent + "%";
  unlockText.textContent = `Next unlock: ${next.name} at ${target} harvests`;
}

function updateInventoryUI() {
  inventoryA.textContent = state.inventory.A;
  inventoryB.textContent = state.inventory.B;
  inventoryC.textContent = state.inventory.C;
  inventoryD.textContent = state.inventory.D;
  inventoryE.textContent = state.inventory.E;
  inventoryF.textContent = state.inventory.F;
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
  updateStore();
  storeBackdrop.classList.remove("hidden");
}

function closeStore() {
  storeBackdrop.classList.add("hidden");
}

function buySeed(type) {
  const flower = FLOWERS[type];

  if (!isUnlocked(type)) {
    storeMessage.textContent = `${flower.name} is locked.`;
    return;
  }

  if (state.coins < flower.seedCost) {
    storeMessage.textContent = 'Not enough coins!';
    return;
  }
  state.coins -= flower.seedCost;
  state.inventory[type] += 1;

  saveState();
  updateTopUI();
  updateInventoryUI();
  updateStore();
  storeMessage.textContent = `${flower.name} seed purchased!`;
}



function runTerminal(command, outputEl = terminalOutput) {
  const text = command.trim().toLowerCase();

  if (text === 'cd farm') {
    closeInventory();
    closeStore();
    closeStats();
    closeHelp();
    terminalOutput.textContent = "Switched to farm.";
    storeTerminalOutput.textContent = "";
    invTerminalOutput.textContent = "";
    statsTerminalOutput.textContent = "";
    helpTerminalOutput.textContent = "";
    return;
  }

  if (text === 'cd farm/inventory') {
    closeStore();
    closeStats();
    closeHelp();
    openInventory();
    invTerminalOutput.textContent = "Switched to inventory.";
    terminalOutput.textContent = "";
    storeTerminalOutput.textContent = "";
    statsTerminalOutput.textContent = "";
    helpTerminalOutput.textContent = "";
    return;
  }

  if (text === 'cd store') {
    closeInventory();
    closeStats();
    closeHelp();
    openStore();
    storeTerminalOutput.textContent = "Switched to store.";
    terminalOutput.textContent = "";
    invTerminalOutput.textContent = "";
    statsTerminalOutput.textContent = "";
    helpTerminalOutput.textContent = "";
    return;
  }

  if (text === 'cd farm/stats') {
    closeInventory();
    closeStore();
    closeHelp();
    openStats();
    statsTerminalOutput.textContent = "Switched to statistics.";
    terminalOutput.textContent = "";
    storeTerminalOutput.textContent = "";
    invTerminalOutput.textContent = "";
    helpTerminalOutput.textContent = "";
    return;
  }

  if (text === 'cd help') {
    closeInventory();
    closeStore();
    closeStats();
    openHelp();
    completeGuide();
    helpTerminalOutput.textContent = "Switched to help page.";
    terminalOutput.textContent = "";
    storeTerminalOutput.textContent = "";
    invTerminalOutput.textContent = "";
    statsTerminalOutput.textContent = "";
    return;
  }

  outputEl.textContent = `Unknown command: ${command}`;

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
  const flower = FLOWERS[plot.flowerType];
  // note: add different cases for different flowers
  if (age < flower.mid) return 1;
  if (age < flower.daysToGrow) return 2;
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

function isUnlocked(type) {
  return state.harCount >= UNLOCK_REQ[type];
}

function nextUnlock() {
  const order = ["A", "B", "C", "D", "E", "F"];

  for (const type of order) {
    const needed = UNLOCK_REQ[type];
    if (state.harCount < needed) {
      return {
        type,
        needed,
        name: FLOWERS[type].name,
      };
    }
  }

  return null;
}

function updateStore() {
  const buybtn = {
    A:buyA,
    B:buyB,
    C:buyC,
    D:buyD,
    E:buyE,
    F:buyF,
  };
  
  for (const type in buybtn) {
    const btn = buybtn[type];
    const flower = FLOWERS[type];
    const unlocked = isUnlocked(type);

    if (unlocked) {
      btn.disabled = false;
      btn.textContent = `Buy (Cost ${flower.seedCost})`;
    } else {
      btn.disabled = true;
      btn.textContent = `Locked!`;
    }
  }
}

function updateStatsUI() {
  statsTotalHarvest.textContent = state.harCount;
  statsHarvestA.textContent = state.flowerHarvests.A;
  statsHarvestB.textContent = state.flowerHarvests.B;
  statsHarvestC.textContent = state.flowerHarvests.C;
  statsHarvestD.textContent = state.flowerHarvests.D;
  statsHarvestE.textContent = state.flowerHarvests.E;
  statsHarvestF.textContent = state.flowerHarvests.F;
  statsTotalCoins.textContent = state.totalCoinsEarned;
  statsCurrentDay.textContent = state.day;
  statsTotalBugsFixed.textContent = state.totalBugsFixed;
}

function openStats() {
  updateStatsUI();
  statsBackdrop.classList.remove("hidden");
}

function closeStats() {
  statsBackdrop.classList.add("hidden");
}

function openHelp() {
  helpBackdrop.classList.remove("hidden");
}

function closeHelp() {
  helpBackdrop.classList.add("hidden");
}


function createDefaultLayout() {
  return [
    {
        "x": 38.09948668187978,
        "y": 35.210414916011344,
        "w": 7.434804488201531,
        "h": 10.715445051060879},
    {
        "x": 46.4695077078683,
        "y": 35.210414916011344,
        "w": 7.434804488201531,
        "h": 10.715445051060879},
    {
        "x": 55.03888300681601,
        "y": 35.210414916011344,
        "w": 7.434804488201531,
        "h": 10.715445051060879},
    {
        "x": 38.09948668187978,
        "y": 47.37055743421578,
        "w": 7.434804488201531,
        "h": 10.715445051060879},
    {
        "x": 46.4695077078683,
        "y": 47.37055743421578,
        "w": 7.434804488201531,
        "h": 10.715445051060879},
    {
        "x": 55.03888300681601,
        "y": 47.37055743421578,
        "w": 7.434804488201531,
        "h": 10.715445051060879},
    {
        "x": 38.09948668187978,
        "y": 59.39271324051828,
        "w": 7.434804488201531,
        "h": 10.715445051060879},
    {
        "x": 46.4695077078683,
        "y": 59.39271324051828,
        "w": 7.434804488201531,
        "h": 10.715445051060879},
    {
        "x": 55.03888300681601,
        "y": 59.39271324051828,
        "w": 7.434804488201531,
        "h": 10.715445051060879}
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

    plotEl.addEventListener("click", (e) => {
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
    const puzzle = plot.bugData;

    if (!puzzle) {
      modalTitle.textContent = "Bug Error";
      modalDesc.textContent = "This bug puzzle failed to load.";
      plantChoices.classList.add("hidden");
      harvestChoice.classList.add("hidden");
      codeBugArea.classList.add("hidden");
      openModal();
      return;
    }

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

    plantSeedA.textContent = state.inventory.A;
    plantSeedB.textContent = state.inventory.B;
    plantSeedC.textContent = state.inventory.C;
    plantSeedD.textContent = state.inventory.D;
    plantSeedE.textContent = state.inventory.E;
    plantSeedF.textContent = state.inventory.F;

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
  const earn = flower.price;
  modalDesc.textContent = `Ready to harvest! You will earn ${earn} coins.`;
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
  plot.bugData = null;
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
  const earn = flower.price;

  state.coins += earn;
  state.harCount += 1;
  state.totalCoinsEarned += earn;
  state.flowerHarvests[plot.flowerType] += 1;

  // clear plot
  plot.planted = false;
  plot.flowerType = null;
  plot.plantedDay = null;

  plot.bugged = false;
  plot.bugPuzzleId = null;
  plot.bugData = null;
  plot.bugStartDay = null;

  saveState();
  updateTopUI();
  updateProgressUI();
  refreshCropsOnly();
  closeModalFn();
}

async function fetchAIPuzzle(flowerType) {
  const response = await fetch("http://localhost:3000/api/bug-puzzle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ flowerType }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch AI puzzle");
  }

  return await response.json();
}

function isPuzzleCorrect(text, puzzle) {
  return text.includes(puzzle.fixCheck);
}

function showLoadingPage() {
  loading.classList.remove("hidden");
  nextDayBtn.disabled = true;
}

function hideLoadingPage() {
  loading.classList.add("hidden");
  nextDayBtn.disabled = false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function nextDay() {
  showLoadingPage();
  const lonadingStart = Date.now();

  state.day += 1;
  for (const plot of state.plots){
    if (!plot.planted) continue;
    if (plot.bugged) continue;

    const stageNow = getStage(plot);
    if (stageNow >= 3) continue;

    if (Math.random() < 0.30) {
      try {
        const aiPuzzle = await fetchAIPuzzle(plot.flowerType);

        plot.bugged = true;
        plot.bugPuzzleId = null;
        plot.bugData = aiPuzzle;
        plot.bugStartDay = state.day;
      } catch (error) {
        console.error("Failed to fetch AI puzzle:", error);
      }
    }
  }
  saveState();
  updateTopUI();
  updateStatsUI();
  refreshCropsOnly();

  const elapsed = Date.now() - lonadingStart;
  if (elapsed < 1200) {
    await delay(1200 - elapsed);
  }

  hideLoadingPage();
}


function init() {
  loadState();
    layout = createDefaultLayout();


  updateTopUI();
  updateInventoryUI();
  updateProgressUI();
  updateStatsUI();

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

    if (shouldShowGuide()) {
      showGuide();
    }
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

    const puzzle = plot.bugData;
    const text = codeEditor.value;

    if (!puzzle) {
      bugHint.textContent = "Puzzle data is missing.";
      return;
    }

    if (isPuzzleCorrect(text, puzzle)) {
        plot.bugged = false;
        plot.bugPuzzleId = null;
        plot.bugData = null;
        plot.bugStartDay = null;

        state.totalBugsFixed += 1;

        saveState();
        updateStatsUI();
        refreshCropsOnly();
        closeModalFn();
    } else {
        bugHint.textContent = "Not quite. " + puzzle.hint;
    }
  });

  nextDayBtn.addEventListener("click", nextDay);

  closeModal.addEventListener("click", closeModalFn);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModalFn();
  });

  plantA.addEventListener("click", () => plantFlower("A"));
  plantB.addEventListener("click", () => plantFlower("B"));
  plantC.addEventListener("click", () => plantFlower("C"));
  plantD.addEventListener("click", () => plantFlower("D"));
  plantE.addEventListener("click", () => plantFlower("E"));
  plantF.addEventListener("click", () => plantFlower("F"));
  harvestBtn.addEventListener("click", harvest);

  buyA.addEventListener("click", () => buySeed("A"));
  buyB.addEventListener("click", () => buySeed("B"));
  buyC.addEventListener("click", () => buySeed("C"));
  buyD.addEventListener("click", () => buySeed("D"));
  buyE.addEventListener("click", () => buySeed("E"));
  buyF.addEventListener("click", () => buySeed("F"));


  terminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runTerminal(terminalInput.value);
      terminalInput.value = "";
    }
  });

  storeTerminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runTerminal(storeTerminalInput.value, storeTerminalOutput);
      storeTerminalInput.value = "";
    }
  });

  invTerminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runTerminal(invTerminalInput.value, invTerminalOutput);
      invTerminalInput.value = "";
    }
  });

  statsTerminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runTerminal(statsTerminalInput.value, statsTerminalOutput);
      statsTerminalInput.value = "";
    }
  });

  helpTerminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runTerminal(helpTerminalInput.value, helpTerminalOutput);
      helpTerminalInput.value = "";
    }
  });

}

init();

window.exportPlotLayout = function () {
  const raw = localStorage.getItem("farm_plot_layout_v1");
  if (!raw) {
    console.log("No saved layout found yet. Use Edit Plots first.");
    return;
  }
  const layout = JSON.parse(raw);
  console.log("Copy this into createDefaultLayout():");
  console.log(JSON.stringify(layout, null, 2));
};