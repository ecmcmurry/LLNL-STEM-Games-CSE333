// game.js contains main game loop, graph rendering, scoring, UI

import {
  getNextFunction,
  reportResult,
  pickFallback,
  getPersonalizedHint,
  getGameAnalysis,
  getPerformanceLog,
  resetPerformanceLog,
} from './ai.js';

const math = window.math;

// ---- settings ----
let selectedTypes = [
  'linear', 'polynomial', 'rational', 'absolute',
  'exponential', 'sine', 'cosine', 'signum'
];
let maxRounds = 0; // 0 = endless
let currentRound = 0;

// ---- game state ----
let currentDifficulty = 'novice';
let currentTargetExpr = 'x^2';
let currentTargetCategory = 'unknown';
let currentAIHint = '';
let currentScore = 0;
let timerSeconds = 60;
let timerInterval = null;
let gameActive = false;
let paused = false;
let pastScores = [];

// per-graph tracking
let attemptCount = 0;
let revealed = false;            // set true after reveal at attempt 5
let graphStartTime = null;
let userGuessHistory = [];       // the normalized strings the user tried on this graph
let lastUserExpr = null;

// game-wide tracking (used for skill gauging + analysis)
let gameStats = {
  totalGraphs: 0,
  solved: 0,
  solvedFirstTry: 0,
  revealedCount: 0,
  byCategory: {}, //  [cat]: {seen, solved, firstTry, reveals, avgTimeSec}
  skillScore: 0,   // numeric skill, drives difficulty
  avgSolveTime: 0,
};

// AI preloading
let pendingFunction = null;

// audio
let audioCtx = null;
let soundEnabled = false;
let audioInitialized = false;

// DOM refs
const homeScreen       = document.getElementById('homeScreen');
const settingsScreen   = document.getElementById('settingsScreen');
const howToScreen      = document.getElementById('howToScreen');
const gameScreen       = document.getElementById('gameScreen');

const startBtn         = document.getElementById('startBtn');
const settingsBtn      = document.getElementById('settingsBtn');
const howToBtn         = document.getElementById('howToBtn');
const settingsDoneBtn  = document.getElementById('settingsDoneBtn');
const howToDoneBtn     = document.getElementById('howToDoneBtn');
const roundBtns        = document.querySelectorAll('.round-btn');

const canvas           = document.getElementById('graphCanvas');
const ctx              = canvas.getContext('2d');
const timerEl          = document.getElementById('timer');
const scoreEl          = document.getElementById('score');
const accuracyEl       = document.getElementById('accuracyPercent');
const earnedCoinsEl    = document.getElementById('earnedCoins');
const functionInput    = document.getElementById('functionInput');
const submitBtn        = document.getElementById('submitBtn');
const playAgainBtn     = document.getElementById('playAgainBtn');
const menuBtn          = document.getElementById('menuBtn');
const pauseBtn         = document.getElementById('pauseBtn');
const scoreHistoryDiv  = document.getElementById('scoreHistory');
const skillLevelText   = document.getElementById('skillLevelText');
const coinContainer    = document.getElementById('coinContainer');
const hintArea         = document.getElementById('hintArea');
const hintText         = document.getElementById('hintText');
const roundBlock       = document.getElementById('roundBlock');
const roundDisplay     = document.getElementById('roundDisplay');
const gameoverTab      = document.getElementById('gameoverTab');
const gameoverTitle    = document.getElementById('gameoverTitle');
const gameoverScoreSpan= document.getElementById('gameoverScore');
const closeGameoverTab = document.getElementById('closeGameoverTab');
const gameoverMenuBtn  = document.getElementById('gameoverMenuBtn');
const gameoverRetryBtn = document.getElementById('gameoverRetryBtn');
const aiAnalysisBtn    = document.getElementById('aiAnalysisBtn');
const analysisTab      = document.getElementById('analysisTab');
const analysisBody     = document.getElementById('analysisBody');
const analysisDoneBtn  = document.getElementById('analysisDoneBtn');
const closeAnalysisTab = document.getElementById('closeAnalysisTab');
const bonusContainer   = document.getElementById('bonusContainer');


// BUTTON PRESS ANIMATION HELPER

function pressAndRun(btn, handler) {
  if (!btn) return;
  const targetId = btn.dataset ? btn.dataset.target : null;
  const animTarget = targetId ? document.getElementById(targetId) : btn;

  const press = () => {
    if (btn.disabled) return;
    if (animTarget) animTarget.classList.add('pressed');
  };
  const release = () => {
    if (animTarget) animTarget.classList.remove('pressed');
  };

  btn.addEventListener('mousedown', press);
  btn.addEventListener('touchstart', press, { passive: true });
  btn.addEventListener('mouseleave', release);
  btn.addEventListener('touchend', release);
  btn.addEventListener('touchcancel', release);

  btn.addEventListener('click', (e) => {
    if (btn.disabled) return;
    if (animTarget) animTarget.classList.add('pressed');
    setTimeout(() => {
      if (animTarget) animTarget.classList.remove('pressed');
      try { handler(e); } catch (err) { console.error(err); }
    }, 130);
  });
}


// NAVIGATION
function showScreen(screen) {
  [homeScreen, settingsScreen, howToScreen, gameScreen].forEach(s => {
    if (s) s.style.display = 'none';
  });
  if (screen) screen.style.display = 'flex';
}

pressAndRun(settingsBtn, () => showScreen(settingsScreen));
pressAndRun(howToBtn, () => showScreen(howToScreen));
pressAndRun(settingsDoneBtn, () => showScreen(homeScreen));
pressAndRun(howToDoneBtn, () => showScreen(homeScreen));

// round selector
roundBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    roundBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

pressAndRun(startBtn, () => {
  const checked = document.querySelectorAll('.type-checkbox:checked');
  selectedTypes = Array.from(checked).map(cb => cb.value);
  if (selectedTypes.length === 0) {
    showBonusMessage('PICK A TYPE IN SETTINGS');
    return;
  }
  const activeRound = document.querySelector('.round-btn.active');
  maxRounds = activeRound ? parseInt(activeRound.dataset.rounds) || 0 : 0;
  showScreen(gameScreen);
  startGame();
});

pressAndRun(menuBtn, goToMenu);
pressAndRun(gameoverMenuBtn, () => {
  gameoverTab.style.display = 'none';
  goToMenu();
});

function goToMenu() {
  if (timerInterval) clearInterval(timerInterval);
  gameActive = false;
  gameoverTab.style.display = 'none';
  analysisTab.style.display = 'none';
  showScreen(homeScreen);
}

// GRAPH RENDERING
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

  // target function evaluation
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
    } catch { targetVals[idx] = NaN; }
  });

  const Y_VIEW_LIMIT = 4;
  const Y_VIEW_MIN_RANGE = 6;
  const validTargets = targetVals.filter(v => Number.isFinite(v));
  let minY = Math.min(...validTargets, -3);
  let maxY = Math.max(...validTargets, 3);
  minY = Math.max(minY, -Y_VIEW_LIMIT);
  maxY = Math.min(maxY,  Y_VIEW_LIMIT);
  let rangeY = maxY - minY;
  if (rangeY < Y_VIEW_MIN_RANGE) {
    const mid = (minY + maxY) / 2;
    minY = mid - Y_VIEW_MIN_RANGE / 2;
    maxY = mid + Y_VIEW_MIN_RANGE / 2;
    rangeY = Y_VIEW_MIN_RANGE;
  }
  const pad = rangeY * 0.10;
  minY -= pad;
  maxY += pad;
  targetVals = targetVals.map(v => Number.isFinite(v) ? Math.max(minY, Math.min(maxY, v)) : v);

  const mapX = x => (x - xMin) / (xMax - xMin) * w;
  const mapY = y => h - (y - minY) / (maxY - minY) * h;

  // grid
  ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(mapX(i), 0);
    ctx.lineTo(mapX(i), h);
    ctx.strokeStyle = 'rgba(216, 204, 236, 0.28)';
    ctx.stroke();
  }
  for (let i = Math.floor(minY); i <= Math.ceil(maxY); i++) {
    ctx.beginPath();
    ctx.moveTo(0, mapY(i));
    ctx.lineTo(w, mapY(i));
    ctx.strokeStyle = 'rgba(216, 204, 236, 0.28)';
    ctx.stroke();
  }

  // axes
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(230, 220, 245, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.moveTo(mapX(0), 0);
  ctx.lineTo(mapX(0), h);
  ctx.moveTo(0, mapY(0));
  ctx.lineTo(w, mapY(0));
  ctx.stroke();

  // user guess in green with error-band shading
  if (userExpr && gameActive) {
    let userVals = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const x = xs[i];
      try {
        const y = math.evaluate(userExpr, { x });
        userVals[i] = Number.isFinite(y) ? y : NaN;
      } catch { userVals[i] = NaN; }

      if (Number.isFinite(userVals[i]) && Number.isFinite(targetVals[i])) {
        const cx = mapX(x);
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
      const cx = mapX(xs[i]);
      const cy = mapY(userVals[i]);
      if (!started) { ctx.moveTo(cx, cy); started = true; }
      else { ctx.lineTo(cx, cy); }
    }
    ctx.stroke();
  }

  // target line - dotted yellow (MainPageEx style)
  ctx.beginPath();
  ctx.strokeStyle = '#f0e68c';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([8, 8]);
  let first = true;
  for (let idx of validIndices) {
    const x = xs[idx];
    const y = targetVals[idx];
    if (!Number.isFinite(y)) continue;
    const cx = mapX(x);
    const cy = mapY(y);
    if (first) { ctx.moveTo(cx, cy); first = false; }
    else { ctx.lineTo(cx, cy); }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

// MATCH EVALUATION
function evaluateMatch(userExpr) {
  const SAMPLES = 200;
  const xMin = -5, xMax = 5;
  let errorSum = 0;
  let count = 0;

  for (let i = 0; i <= SAMPLES; i++) {
    const x = xMin + (xMax - xMin) * i / SAMPLES;
    let targetVal, userVal;
    try {
      targetVal = math.evaluate(currentTargetExpr, { x });
      userVal = math.evaluate(userExpr, { x });
    } catch { continue; }
    if (Number.isFinite(targetVal) && Number.isFinite(userVal)) {
      const diff = targetVal - userVal;
      errorSum += diff * diff;
      count++;
    }
  }

  if (count < 10) return { accuracy: 0 };

  const rmse = Math.sqrt(errorSum / count);
  let accuracy = Math.max(0, Math.min(100, 100 * Math.exp(-0.5 * rmse)));
  if (rmse < 0.05) accuracy = 100;
  return { accuracy: Math.round(accuracy * 10) / 10 };
}

// INPUT NORMALIZATION
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
    submitBtn.disabled = false;
    return;
  }
  try {
    math.parse(normalizeFunctionString(rawExpr));
    functionInput.style.boxShadow = '0 0 0 2px var(--play)';
    submitBtn.disabled = false;
  } catch {
    functionInput.style.boxShadow = '0 0 0 2px #d44';
    submitBtn.disabled = true;
  }
});

// AUDIO
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

// COIN / BONUS FX
function spawnCoins(amount, fromX = 300, fromY = 300) {
  const coinCount = Math.min(12, Math.max(1, amount));
  for (let i = 0; i < coinCount; i++) {
    const coin = document.createElement('div');
    coin.className = 'floating-coin';
    coin.textContent = '$';
    coin.style.left = (fromX + Math.random() * 60 - 30) + 'px';
    coin.style.top  = (fromY + Math.random() * 60 - 30) + 'px';
    coin.style.animationDelay = (i * 0.05) + 's';
    coinContainer.appendChild(coin);
    setTimeout(() => { if (coin.parentNode) coin.remove(); }, 900);
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

// UI UPDATERS
function updateTimerDisplay() {
  timerEl.textContent = timerSeconds;
  timerEl.classList.remove('timer-warning', 'timer-critical');
  if (timerSeconds <= 15) timerEl.classList.add('timer-critical');
  else if (timerSeconds <= 30) timerEl.classList.add('timer-warning');
}

function updateRoundDisplay() {
  if (maxRounds > 0) {
    roundBlock.style.display = 'flex';
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
    if (timerSeconds <= 0) endGame("TIME'S UP");
  }, 1000);
}

function updateHistory() {
  scoreHistoryDiv.innerText = pastScores.length === 0 ? '—' : pastScores.join('  ·  ');
}

// Skill level is now driven by `gameStats.skillScore` which is adjusted by
// answer correctness, speed, and whether the reveal was needed.
function updateSkillLevel() {
  const s = gameStats.skillScore;
  if (s < 4) {
    currentDifficulty = 'novice';
    skillLevelText.innerText = 'Novice';
  } else if (s < 10) {
    currentDifficulty = 'apprentice';
    skillLevelText.innerText = 'Apprentice';
  } else if (s < 20) {
    currentDifficulty = 'skilled';
    skillLevelText.innerText = 'Pro';
  } else {
    currentDifficulty = 'expert';
    skillLevelText.innerText = 'Master';
  }
}

// GAME FLOW
function resetForNewGraph() {
  attemptCount = 0;
  revealed = false;
  graphStartTime = performance.now();
  userGuessHistory = [];
  hintArea.style.display = 'none';
  hintText.innerText = '';
  accuracyEl.textContent = '0%';
  earnedCoinsEl.textContent = '0';
  functionInput.value = '';
  functionInput.style.boxShadow = 'none';
  submitBtn.disabled = false;
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
  currentTargetCategory = result.category || 'unknown';
  currentAIHint = result.hint || '';
  resetForNewGraph();
  updateRoundDisplay();
  drawGraph(null);
  preloadNext();
}

function categoryStatsBucket(cat) {
  if (!gameStats.byCategory[cat]) {
    gameStats.byCategory[cat] = {
      seen: 0, solved: 0, firstTry: 0, reveals: 0, totalTimeSec: 0
    };
  }
  return gameStats.byCategory[cat];
}

/**
 * Compute coins for this round based on the attempt number and time taken.
 * Rules (per spec):
 *   attempt 1 -> 5 coins (+ 1 bonus if within 2 sec)
 *   attempt 2 -> 4 coins
 *   attempt 3 -> 3 coins
 *   attempt 4 -> 2 coins
 *   attempt 5 -> 1 coin
 *   after reveal -> 0 coins
 */
function computeCoins(attempt, timeTakenSec, wasRevealed) {
  if (wasRevealed) return { coins: 0, bonus: 0 };
  const table = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
  const base = table[attempt] ?? 0;
  const bonus = (attempt === 1 && timeTakenSec <= 2.0) ? 1 : 0;
  return { coins: base, bonus };
}

async function handleSubmit() {
  if (!gameActive || paused) return;
  const rawExpr = functionInput.value.trim();
  if (rawExpr === '') return;

  const normalizedUser = normalizeFunctionString(rawExpr);
  attemptCount++;
  userGuessHistory.push(normalizedUser);

  const { accuracy } = evaluateMatch(normalizedUser);
  accuracyEl.textContent = accuracy + '%';

  reportResult(accuracy);

  const normalizedTarget = normalizeFunctionString(currentTargetExpr);
  const isExactMatch = normalizedUser === normalizedTarget || accuracy === 100;

  // for correctness
  if (isExactMatch) {
    if (soundEnabled) playSound('correct');

    const timeTaken = graphStartTime ? (performance.now() - graphStartTime) / 1000 : 99;
    const { coins, bonus } = computeCoins(attemptCount, timeTaken, revealed);
    const coinAward = coins + bonus;

    currentScore += coinAward;
    scoreEl.textContent = currentScore;

    // pop the appropriate bonus message
    if (attemptCount === 1 && bonus > 0) {
      showBonusMessage(`First Try! +${coins}  (+${bonus} Quick)`);
    } else if (attemptCount === 1) {
      showBonusMessage(`First Try! +${coins}`);
    } else if (!revealed && coinAward > 0) {
      showBonusMessage(`+${coinAward}`);
    } else if (revealed) {
      showBonusMessage('Answer shown — 0 coins');
    }

    // coin visuals
    const rect = canvas.getBoundingClientRect();
    if (coinAward > 0) spawnCoins(coinAward, rect.left + rect.width / 2, rect.top + rect.height / 3);

    // stats
    gameStats.totalGraphs++;
    gameStats.solved++;
    if (attemptCount === 1) gameStats.solvedFirstTry++;
    if (revealed) gameStats.revealedCount++;

    const bucket = categoryStatsBucket(currentTargetCategory);
    bucket.seen++;
    bucket.solved++;
    if (attemptCount === 1) bucket.firstTry++;
    if (revealed) bucket.reveals++;
    bucket.totalTimeSec += timeTaken;

    // skill adjustment: reward correctness; weight by speed and attempts used
    if (!revealed) {
      const speedFactor = timeTaken <= 2 ? 1.5 : timeTaken <= 5 ? 1.2 : timeTaken <= 10 ? 1.0 : 0.7;
      const attemptFactor = attemptCount === 1 ? 1.5 : attemptCount === 2 ? 1.1 : attemptCount === 3 ? 0.8 : 0.4;
      gameStats.skillScore += speedFactor * attemptFactor;
    } else {
      // revealed: don't increase skill, but also don't tank it on first occurrence
      gameStats.skillScore = Math.max(0, gameStats.skillScore - 0.5);
    }

    // refresh time bank
    timerSeconds = Math.min(60, timerSeconds + 15);
    updateTimerDisplay();

    currentRound++;
    if (maxRounds > 0 && currentRound >= maxRounds) {
      endGame('ALL ROUNDS DONE');
      return;
    }

    updateSkillLevel();
    await advanceToNewTarget();
    return;
  }

  // if incorrect
  if (soundEnabled) playSound('wrong');
  drawGraph(normalizedUser);

  // Hint progression:
  //   attempt 1: nothing (give them a try)
  //   attempt 2: personalized hint from AI (nudge toward target)
  //   attempt 3: second personalized hint (progression aware)
  //   attempt 4: another personalized hint (very targeted)
  //   attempt 5 (this wrong guess was the 5th): reveal answer
  if (attemptCount >= 2 && attemptCount <= 4) {
    // call AI for personalized hint (previous hint + guess history goes in)
    hintArea.style.display = 'block';
    hintText.innerText = 'Thinking...';
    try {
      const hint = await getPersonalizedHint({
        target: currentTargetExpr,
        guesses: userGuessHistory,
        skill: currentDifficulty,
        attempt: attemptCount,
        previousHint: currentAIHint,
      });
      if (hint) {
        hintText.innerText = hint;
        currentAIHint = hint;
      } else {
        hintText.innerText = 'Close ; look carefully at the shape.';
      }
    } catch {
      hintText.innerText = 'Close ; look carefully at the shape.';
    }
  }

  if (attemptCount >= 5 && !revealed) {
    revealed = true;
    hintArea.style.display = 'block';
    hintText.innerText = `Answer: f(x) = ${currentTargetExpr}`;

    // count the reveal in stats and force a skill adjustment
    gameStats.totalGraphs++;
    gameStats.revealedCount++;
    const bucket = categoryStatsBucket(currentTargetCategory);
    bucket.seen++;
    bucket.reveals++;
    gameStats.skillScore = Math.max(0, gameStats.skillScore - 1.0);
    updateSkillLevel();

    // give the user a moment, then advance
    submitBtn.disabled = true;
    setTimeout(async () => {
      currentRound++;
      if (maxRounds > 0 && currentRound >= maxRounds) {
        endGame('ALL ROUNDS DONE');
        return;
      }
      await advanceToNewTarget();
      submitBtn.disabled = false;
    }, 2600);
  }
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
  gameoverTab.style.display = 'flex';
}

function startGame() {
  currentRound = 0;
  currentScore = 0;
  scoreEl.textContent = '0';
  timerSeconds = 60;
  gameActive = true;
  paused = false;

  // reset per-game stats
  gameStats = {
    totalGraphs: 0, solved: 0, solvedFirstTry: 0, revealedCount: 0,
    byCategory: {}, skillScore: gameStats.skillScore ?? 0, avgSolveTime: 0,
  };
  resetPerformanceLog();

  const pauseLabel = pauseBtn.querySelector('.btn-label');
  if (pauseLabel) pauseLabel.textContent = '||';

  submitBtn.disabled = false;
  updateTimerDisplay();
  updateSkillLevel();
  updateRoundDisplay();

  // first function from fallback for instant display, AI takes over next
  currentTargetExpr = pickFallback(selectedTypes);
  currentTargetCategory = 'unknown';
  resetForNewGraph();
  drawGraph(null);
  startTimer();
  updateHistory();
  gameoverTab.style.display = 'none';
  analysisTab.style.display = 'none';

  preloadNext();

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
  pauseBtn.classList.toggle('is-paused', paused);
  pauseBtn.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
}

// =====================================================
// AI GAME ANALYSIS
// =====================================================
async function runGameAnalysis() {
  analysisTab.style.display = 'flex';
  analysisBody.textContent = 'Analyzing your game...';
  try {
    const perfLog = getPerformanceLog();
    const analysis = await getGameAnalysis({
      finalScore: currentScore,
      skillLevel: currentDifficulty,
      skillScore: gameStats.skillScore,
      selectedTypes,
      byCategory: gameStats.byCategory,
      perfLog,
      totalGraphs: gameStats.totalGraphs,
      solved: gameStats.solved,
      solvedFirstTry: gameStats.solvedFirstTry,
      revealed: gameStats.revealedCount,
    });
    analysisBody.textContent = analysis || buildLocalAnalysis();
  } catch {
    analysisBody.textContent = buildLocalAnalysis();
  }
}

// Simple local fallback so the analysis button never looks broken.
function buildLocalAnalysis() {
  const s = gameStats;
  const lines = [];
  lines.push(`Score: ${currentScore}   Skill: ${skillLevelText.innerText}`);
  lines.push(`Graphs shown: ${s.totalGraphs}. Solved: ${s.solved}. First-try: ${s.solvedFirstTry}. Reveals: ${s.revealedCount}.`);
  const cats = Object.entries(s.byCategory).filter(([, v]) => v.seen > 0);
  if (cats.length) {
    const scored = cats.map(([k, v]) => ({ k, rate: (v.solved - v.reveals) / v.seen }));
    scored.sort((a, b) => b.rate - a.rate);
    lines.push(`Strongest: ${scored.slice(0, 2).map(x => x.k).join(', ') || '-'}.`);
    lines.push(`Needs work: ${scored.slice(-2).map(x => x.k).join(', ') || '-'}.`);
    const weak = scored.filter(x => x.rate < 0.3).map(x => x.k);
    if (weak.length) lines.push(`Consider removing from settings until ready: ${weak.join(', ')}.`);
  }
  lines.push(`Tip: Practice the types you reveal on most. Speed + first-try success pushes your skill up.`);
  return lines.join('\n\n');
}

// =====================================================
// EVENT LISTENERS
// =====================================================
pressAndRun(submitBtn, () => handleSubmit());
functionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !submitBtn.disabled) {
    e.preventDefault();
    submitBtn.classList.add('pressed');
    setTimeout(() => { submitBtn.classList.remove('pressed'); handleSubmit(); }, 120);
  }
});
pressAndRun(playAgainBtn, () => resetGame());
pressAndRun(gameoverRetryBtn, () => { gameoverTab.style.display = 'none'; resetGame(); });
pressAndRun(pauseBtn, togglePause);
pressAndRun(aiAnalysisBtn, runGameAnalysis);
pressAndRun(analysisDoneBtn, () => { analysisTab.style.display = 'none'; });

// Audio toggle (settings panel)
const audioToggle = document.getElementById('audioToggle');
if (audioToggle) {
  audioToggle.addEventListener('change', () => {
    soundEnabled = audioToggle.checked;
    if (soundEnabled && !audioCtx) initAudio();
  });
}

closeGameoverTab.addEventListener('click', () => { gameoverTab.style.display = 'none'; });
closeAnalysisTab.addEventListener('click', () => { analysisTab.style.display = 'none'; });

// initial screen
showScreen(homeScreen);
