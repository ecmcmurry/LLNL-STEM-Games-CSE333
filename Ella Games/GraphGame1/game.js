// game.js -- main game loop, graph rendering, scoring, UI

import { getNextFunction, reportResult, pickFallback } from './ai.js';

const math = window.math;

// ---- settings (read from title screen before game starts) ----
let selectedTypes = ['linear', 'polynomial', 'rational', 'absolute', 'exponential', 'sine', 'cosine', 'signum'];
let maxRounds = 0; // 0 = endless (timer only)
let currentRound = 0;

// ---- game state ----
let currentDifficulty = 'novice';
let currentTargetExpr = 'x^2';
let currentAIHint = '';
let currentScore = 0;
let timerSeconds = 60;
let timerInterval = null;
let gameActive = false;
let paused = false;
let pastScores = [];

// per-graph tracking
let attemptCount = 0;
let hintShown = false;
let bestAccuracyThisGraph = 0;
let graphStartTime = null;
let firstTryBonusUsed = false;
let quickBonusUsed = false;
let lastUserExpr = null;

// AI preloading
let pendingFunction = null;

// audio
let audioCtx = null;
let soundEnabled = false;
let audioInitialized = false;

// ---- DOM refs: title screen ----
const titleScreen = document.getElementById('titleScreen');
const gameContainer = document.getElementById('gameContainer');
const startBtn = document.getElementById('startBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const settingsDoneBtn = document.getElementById('settingsDoneBtn');
const roundBtns = document.querySelectorAll('.round-btn');

// ---- DOM refs: game ----
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const accuracyEl = document.getElementById('accuracyPercent');
const earnedCoinsEl = document.getElementById('earnedCoins');
const functionInput = document.getElementById('functionInput');
const submitBtn = document.getElementById('submitBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const menuBtn = document.getElementById('menuBtn');
const pauseBtn = document.getElementById('pauseBtn');
const scoreHistoryDiv = document.getElementById('scoreHistory');
const skillLevelText = document.getElementById('skillLevelText');
const coinContainer = document.getElementById('coinContainer');
const hintArea = document.getElementById('hintArea');
const hintText = document.getElementById('hintText');
const roundBlock = document.getElementById('roundBlock');
const roundDisplay = document.getElementById('roundDisplay');
const gameoverTab = document.getElementById('gameoverTab');
const gameoverTitle = document.getElementById('gameoverTitle');
const gameoverScoreSpan = document.getElementById('gameoverScore');
const closeGameoverTab = document.getElementById('closeGameoverTab');
const gameoverMenuBtn = document.getElementById('gameoverMenuBtn');
const gameoverRetryBtn = document.getElementById('gameoverRetryBtn');
const bonusContainer = document.getElementById('bonusContainer');


// ===============================
// TITLE SCREEN + SETTINGS
// ===============================

settingsBtn.addEventListener('click', () => {
  settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
});

settingsDoneBtn.addEventListener('click', () => {
  settingsPanel.style.display = 'none';
});

// round selector buttons
roundBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    roundBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// reads settings from the UI and starts the game
startBtn.addEventListener('click', () => {
  // gather selected types from checkboxes
  const checked = document.querySelectorAll('.type-checkbox:checked');
  selectedTypes = Array.from(checked).map(cb => cb.value);

  if (selectedTypes.length === 0) {
    // need at least one type
    startBtn.textContent = 'pick at least one type';
    setTimeout(() => { startBtn.textContent = 'START'; }, 1500);
    return;
  }

  // read round count
  const activeRound = document.querySelector('.round-btn.active');
  maxRounds = activeRound ? parseInt(activeRound.dataset.rounds) || 0 : 0;

  titleScreen.style.display = 'none';
  gameContainer.style.display = 'block';
  startGame();
});

// back to title from game
menuBtn.addEventListener('click', goToMenu);
gameoverMenuBtn.addEventListener('click', goToMenu);

function goToMenu() {
  if (timerInterval) clearInterval(timerInterval);
  gameActive = false;
  gameContainer.style.display = 'none';
  gameoverTab.style.display = 'none';
  titleScreen.style.display = 'flex';
}


// ===============================
// GRAPH RENDERING
// ===============================

function drawGraph(userExpr = null) {
  lastUserExpr = userExpr;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const SAMPLES = 300;
  const xMin = -5, xMax = 5;
  const xs = [];
  for (let i = 0; i <= SAMPLES; i++) {
    xs.push(xMin + (xMax - xMin) * i / SAMPLES);
  }

  // evaluate target function
  let targetVals = [];
  let validIndices = [];
  xs.forEach((x, idx) => {
    try {
      const val = math.evaluate(currentTargetExpr, { x });
      if (Number.isFinite(val)) {
        targetVals[idx] = val;
        validIndices.push(idx);
      } else {
        targetVals[idx] = NaN;
      }
    } catch {
      targetVals[idx] = NaN;
    }
  });

  let validTargets = targetVals.filter(v => Number.isFinite(v));
  let minY = Math.min(...validTargets, -3);
  let maxY = Math.max(...validTargets, 3);
  let rangeY = maxY - minY;
  if (rangeY < 1e-6) rangeY = 6;
  const pad = rangeY * 0.15;
  minY -= pad;
  maxY += pad;

  function mapX(x) { return (x - xMin) / (xMax - xMin) * w; }
  function mapY(y) { return h - (y - minY) / (maxY - minY) * h; }

  // grid
  ctx.lineWidth = 0.7;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(mapX(i), 0);
    ctx.lineTo(mapX(i), h);
    ctx.strokeStyle = '#2d2d55';
    ctx.stroke();
  }
  for (let i = Math.floor(minY); i <= Math.ceil(maxY); i++) {
    ctx.beginPath();
    ctx.moveTo(0, mapY(i));
    ctx.lineTo(w, mapY(i));
    ctx.strokeStyle = '#2d2d55';
    ctx.stroke();
  }

  // axes
  ctx.beginPath();
  ctx.strokeStyle = '#5a5a80';
  ctx.lineWidth = 2.5;
  ctx.moveTo(mapX(0), 0);
  ctx.lineTo(mapX(0), h);
  ctx.moveTo(0, mapY(0));
  ctx.lineTo(w, mapY(0));
  ctx.stroke();

  // user guess (solid green) + error shading
  if (userExpr && gameActive) {
    let userVals = [];
    ctx.fillStyle = 'rgba(255, 60, 60, 0.15)';

    for (let i = 0; i <= SAMPLES; i++) {
      let x = xs[i];
      try {
        let y = math.evaluate(userExpr, { x });
        userVals[i] = Number.isFinite(y) ? y : NaN;
      } catch {
        userVals[i] = NaN;
      }

      if (Number.isFinite(userVals[i]) && Number.isFinite(targetVals[i])) {
        let cx = mapX(x);
        ctx.beginPath();
        ctx.moveTo(cx, mapY(targetVals[i]));
        ctx.lineTo(cx, mapY(userVals[i]));
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.strokeStyle = '#7af0a3';
    ctx.lineWidth = 3;
    let started = false;
    for (let i = 0; i <= SAMPLES; i++) {
      if (!Number.isFinite(userVals[i])) continue;
      let cx = mapX(xs[i]);
      let cy = mapY(userVals[i]);
      if (!started) { ctx.moveTo(cx, cy); started = true; }
      else { ctx.lineTo(cx, cy); }
    }
    ctx.stroke();
  }

  // target line (dotted yellow)
  ctx.beginPath();
  ctx.strokeStyle = '#f0e68c';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([8, 8]);
  let first = true;
  for (let idx of validIndices) {
    let x = xs[idx];
    let y = targetVals[idx];
    if (!Number.isFinite(y)) continue;
    let cx = mapX(x);
    let cy = mapY(y);
    if (first) { ctx.moveTo(cx, cy); first = false; }
    else { ctx.lineTo(cx, cy); }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}


// ===============================
// MATCH EVALUATION
// ===============================

function evaluateMatch(userExpr) {
  const SAMPLES = 200;
  const xMin = -5, xMax = 5;
  let errorSum = 0;
  let count = 0;

  for (let i = 0; i <= SAMPLES; i++) {
    let x = xMin + (xMax - xMin) * i / SAMPLES;
    let targetVal, userVal;
    try {
      targetVal = math.evaluate(currentTargetExpr, { x });
      userVal = math.evaluate(userExpr, { x });
    } catch { continue; }
    if (Number.isFinite(targetVal) && Number.isFinite(userVal)) {
      let diff = targetVal - userVal;
      errorSum += diff * diff;
      count++;
    }
  }

  if (count < 10) return { accuracy: 0, coins: 0 };

  let rmse = Math.sqrt(errorSum / count);
  let accuracy = Math.max(0, Math.min(100, 100 * Math.exp(-0.5 * rmse)));
  if (rmse < 0.05) accuracy = 100;
  let coinsEarned = Math.floor(accuracy);
  return {
    accuracy: Math.round(accuracy * 10) / 10,
    coins: coinsEarned
  };
}


// ===============================
// HINTS
// ===============================

function generateLocalHint(targetExpr, userExpr) {
  try {
    const targetNode = math.compile(targetExpr);
    const userNode = math.compile(userExpr);

    let targetY0 = targetNode.evaluate({ x: 0 });
    let userY0 = userNode.evaluate({ x: 0 });

    if (Number.isFinite(targetY0) && Number.isFinite(userY0)) {
      let diff = targetY0 - userY0;
      if (Math.abs(diff) > 0.1) {
        return userY0 > targetY0
          ? 'Too high at the center -- check your y-intercept.'
          : 'Too low at the center -- check your y-intercept.';
      }
    }

    let targetY1 = targetNode.evaluate({ x: 1 });
    let userY1 = userNode.evaluate({ x: 1 });
    if (Number.isFinite(targetY1) && Number.isFinite(userY1)) {
      if (Math.abs(targetY1 + userY1) < 0.1 && Math.abs(targetY1) > 0.1) {
        return 'Looks flipped -- double-check positive/negative signs.';
      }
    }

    let targetY2 = targetNode.evaluate({ x: 2 });
    let userY2 = userNode.evaluate({ x: 2 });
    if (Number.isFinite(targetY2) && Number.isFinite(userY2) && userY2 !== 0 && targetY2 !== 0) {
      let ratio = Math.abs(targetY2) / Math.abs(userY2);
      if (ratio > 1.2) return 'Not steep enough -- try a larger coefficient.';
      if (ratio < 0.8) return 'Too steep -- try a smaller coefficient.';
    }

    return 'Close -- check exponents or horizontal shifts.';
  } catch {
    return 'Keep adjusting.';
  }
}


// ===============================
// INPUT NORMALIZATION
// ===============================

function normalizeFunctionString(expr) {
  let s = expr.toLowerCase();
  s = s.replace(/\s+/g, '');
  s = s.replace(/sgn\(/g, 'sign(');
  s = s.replace(/sgnx/g, 'sign(x)');
  s = s.replace(/signx/g, 'sign(x)');
  s = s.replace(/sinx/g, 'sin(x)');
  s = s.replace(/cosx/g, 'cos(x)');
  s = s.replace(/tanx/g, 'tan(x)');
  s = s.replace(/e\^\(([^)]+)\)/g, 'exp($1)');
  s = s.replace(/e\^([a-zA-Z0-9]+)/g, 'exp($1)');
  s = s.replace(/(\d)([a-zA-Z\(])/g, '$1*$2');
  return s;
}

// live validation
functionInput.addEventListener('input', (e) => {
  const rawExpr = e.target.value.trim();
  if (rawExpr === '') {
    functionInput.style.boxShadow = 'none';
    return;
  }
  try {
    math.parse(normalizeFunctionString(rawExpr));
    functionInput.style.boxShadow = '0 0 0 2px var(--green)';
    submitBtn.disabled = false;
  } catch {
    functionInput.style.boxShadow = '0 0 0 2px #d44';
    submitBtn.disabled = true;
  }
});


// ===============================
// AUDIO
// ===============================

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => playSound(type)).catch(() => {});
    return;
  }
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  let freq = 600, duration = 0.12;
  if (type === 'correct')     { freq = 880;  duration = 0.2; }
  else if (type === 'wrong')  { freq = 240;  duration = 0.2; }
  else if (type === 'tick')   { freq = 420;  duration = 0.05; gain.gain.value = 0.15; }
  else if (type === 'collect'){ freq = 1400; duration = 0.1;  gain.gain.value = 0.3; }
  osc.frequency.value = freq;
  gain.gain.value = 0.2;
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}


// ===============================
// UI HELPERS
// ===============================

function spawnCoins(amount, fromX = 300, fromY = 300) {
  const coinCount = Math.min(12, Math.max(1, Math.floor(amount / 7) + 1));
  for (let i = 0; i < coinCount; i++) {
    const coin = document.createElement('div');
    coin.className = 'floating-coin';
    coin.textContent = '$';
    coin.style.left = (fromX + Math.random() * 60 - 30) + 'px';
    coin.style.top = (fromY + Math.random() * 60 - 30) + 'px';
    coin.style.animationDelay = (i * 0.03) + 's';
    coinContainer.appendChild(coin);
    setTimeout(() => { if (coin.parentNode) coin.remove(); }, 800);
  }
  if (soundEnabled) playSound('collect');
}

function showBonusMessage(text) {
  const popup = document.createElement('div');
  popup.className = 'bonus-popup';
  popup.textContent = text;
  bonusContainer.appendChild(popup);
  setTimeout(() => popup.remove(), 1900);
}

function updateTimerDisplay() {
  timerEl.textContent = timerSeconds;
  if (timerSeconds <= 15) timerEl.className = 'timer-critical';
  else if (timerSeconds <= 30) timerEl.className = 'timer-warning';
  else timerEl.className = '';
}

function updateRoundDisplay() {
  if (maxRounds > 0) {
    roundBlock.style.display = 'block';
    roundDisplay.textContent = (currentRound + 1) + ' / ' + maxRounds;
  } else {
    roundBlock.style.display = 'none';
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (paused || !gameActive) return;
    timerSeconds = Math.max(0, timerSeconds - 1);
    updateTimerDisplay();

    if (timerSeconds <= 15 && timerSeconds > 0 && soundEnabled) playSound('tick');
    if (timerSeconds <= 0) {
      endGame("TIME'S UP");
    }
  }, 1000);
}

function endGame(reason) {
  gameActive = false;
  if (timerInterval) clearInterval(timerInterval);
  submitBtn.disabled = true;
  if (currentScore > 0) pastScores.push(currentScore);
  updateHistory();
  updateSkillLevel();
  playSound('wrong');
  gameoverTitle.textContent = reason || 'GAME OVER';
  gameoverScoreSpan.textContent = currentScore;
  gameoverTab.style.display = 'block';
}

function updateHistory() {
  scoreHistoryDiv.innerText = pastScores.length === 0
    ? '—'
    : pastScores.join('  ·  ');
}

function updateSkillLevel() {
  let avg = pastScores.length > 0
    ? pastScores.reduce((a, b) => a + b, 0) / pastScores.length
    : currentScore;
  if (avg < 250) {
    currentDifficulty = 'novice';
    skillLevelText.innerText = 'Novice';
  } else if (avg < 600) {
    currentDifficulty = 'apprentice';
    skillLevelText.innerText = 'Apprentice';
  } else if (avg < 1200) {
    currentDifficulty = 'skilled';
    skillLevelText.innerText = 'Pro';
  } else {
    currentDifficulty = 'expert';
    skillLevelText.innerText = 'Master';
  }
}


// ===============================
// GAME FLOW
// ===============================

function resetForNewGraph() {
  attemptCount = 0;
  hintShown = false;
  bestAccuracyThisGraph = 0;
  graphStartTime = performance.now();
  firstTryBonusUsed = false;
  quickBonusUsed = false;
  hintArea.style.display = 'none';
  hintText.innerText = '';
  accuracyEl.textContent = '0%';
  earnedCoinsEl.textContent = '0';
  functionInput.value = '';
  functionInput.style.boxShadow = 'none';
}

function preloadNext() {
  pendingFunction = getNextFunction(currentDifficulty, selectedTypes);
}

async function advanceToNewTarget() {
  let result;
  try {
    result = pendingFunction
      ? await pendingFunction
      : await getNextFunction(currentDifficulty, selectedTypes);
  } catch {
    const expr = pickFallback(selectedTypes);
    result = { expression: expr, category: 'unknown', hint: '' };
  }
  pendingFunction = null;

  currentTargetExpr = result.expression;
  currentAIHint = result.hint || '';
  resetForNewGraph();
  updateRoundDisplay();
  drawGraph(null);
  preloadNext();
}

async function handleSubmit() {
  if (!gameActive || paused) return;
  const rawExpr = functionInput.value.trim();
  if (rawExpr === '') return;

  const normalizedUser = normalizeFunctionString(rawExpr);
  attemptCount++;

  const { accuracy, coins } = evaluateMatch(normalizedUser);
  accuracyEl.textContent = accuracy + '%';
  earnedCoinsEl.textContent = coins;

  if (attemptCount <= 5 && accuracy > bestAccuracyThisGraph) {
    bestAccuracyThisGraph = accuracy;
  }

  reportResult(accuracy);

  // hint progression
  if (attemptCount === 3 && currentAIHint) {
    hintText.innerText = currentAIHint;
    hintArea.style.display = 'block';
  } else if (attemptCount === 4) {
    const localHint = generateLocalHint(currentTargetExpr, normalizedUser);
    hintText.innerText = localHint;
    hintArea.style.display = 'block';
  }

  if (!hintShown && attemptCount >= 5) {
    hintShown = true;
    hintText.innerText = 'Answer: f(x) = ' + currentTargetExpr;
    hintArea.style.display = 'block';
  }

  const normalizedTarget = normalizeFunctionString(currentTargetExpr);
  const isExactMatch = normalizedUser === normalizedTarget || accuracy === 100;

  if (isExactMatch) {
    if (soundEnabled) playSound('correct');
    let coinAward = Math.min(100, Math.max(0, Math.floor(bestAccuracyThisGraph)));
    if (coinAward === 0 && accuracy === 100) coinAward = 100;

    if (graphStartTime) {
      const timeTaken = (performance.now() - graphStartTime) / 1000;
      if (attemptCount === 1 && !firstTryBonusUsed) {
        coinAward += 10;
        showBonusMessage('First Try! +10');
        firstTryBonusUsed = true;
      }
      if (timeTaken <= 5.0 && !quickBonusUsed) {
        coinAward += 10;
        showBonusMessage('Quick Try! +10');
        quickBonusUsed = true;
      }
    }

    currentScore += coinAward;
    scoreEl.textContent = currentScore;

    const rect = canvas.getBoundingClientRect();
    spawnCoins(coinAward, rect.left + rect.width / 2, rect.top + rect.height / 3);

    timerSeconds = Math.min(60, timerSeconds + 15);
    updateTimerDisplay();

    currentRound++;

    // check if round limit reached
    if (maxRounds > 0 && currentRound >= maxRounds) {
      endGame('ALL ROUNDS DONE');
      return;
    }

    await advanceToNewTarget();
    updateSkillLevel();
    return;
  }

  if (soundEnabled) playSound('wrong');
  drawGraph(normalizedUser);
}

function startGame() {
  currentRound = 0;
  currentScore = 0;
  scoreEl.textContent = '0';
  timerSeconds = 60;
  gameActive = true;
  paused = false;
  pauseBtn.textContent = '||';
  submitBtn.disabled = false;
  updateTimerDisplay();
  updateSkillLevel();
  updateRoundDisplay();

  // load the first function from fallback (instant), AI takes over next round
  currentTargetExpr = pickFallback(selectedTypes);
  resetForNewGraph();
  drawGraph(null);
  startTimer();
  updateHistory();
  gameoverTab.style.display = 'none';

  preloadNext();

  // enable audio on first click
  if (!audioInitialized) {
    document.body.addEventListener('click', function enableAudio() {
      if (!soundEnabled) {
        soundEnabled = true;
        initAudio();
        playSound('correct');
      }
    }, { once: true });
    audioInitialized = true;
  }
}

async function resetGame() {
  if (timerInterval) clearInterval(timerInterval);
  gameoverTab.style.display = 'none';
  startGame();
}

function togglePause() {
  if (!gameActive) return;
  paused = !paused;
  pauseBtn.textContent = paused ? '▶' : '||';
}


// ===============================
// EVENT LISTENERS
// ===============================

submitBtn.addEventListener('click', () => handleSubmit());
functionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !submitBtn.disabled) {
    e.preventDefault();
    handleSubmit();
  }
});
playAgainBtn.addEventListener('click', () => resetGame());
gameoverRetryBtn.addEventListener('click', () => resetGame());
pauseBtn.addEventListener('click', togglePause);
closeGameoverTab.addEventListener('click', () => {
  gameoverTab.style.display = 'none';
});
