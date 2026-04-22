/* ─── CONSTANTS ─────────────────────────────────────────────── */
const BALL_RADIUS    = 0.5;
const PLATFORM_HALF  = 10;
const MAX_SPEED      = 20;
const MAX_TILT_DEG   = 25;
const RESPAWN_Y      = -30;
const FIXED_DT       = 1 / 120;
const DT_CAP         = 1 / 20;
const ROLLING_MU     = 0.005;
const RESTITUTION    = 0.3;
const BALL_AREA      = Math.PI * BALL_RADIUS * BALL_RADIUS;
const FORCE_SCALE    = 0.25;
const STATIC_THRESH  = 0.02;

/* ─── STATE ──────────────────────────────────────────────────── */
let scene, camera, renderer, platformGroup, ballMesh;

let ballPos = new THREE.Vector3(0, BALL_RADIUS + 0.01, 0);
let ballVel = new THREE.Vector3(0, 0, 0);

let tiltX = 0, tiltZ = 0;
let controlMethod = 'pc';
let calibBeta = null, calibGamma = null;
let gameActive = false;
let lastTimestamp = null, accumulator = 0;
let onSurface = true, currentAccelMag = 0;

const keys = { w: false, a: false, s: false, d: false };

let arrowGravSurf, arrowNormal, arrowFriction, arrowDrag;
const F = {
    gravity:  new THREE.Vector3(),
    gravSurf: new THREE.Vector3(),
    normal:   new THREE.Vector3(),
    friction: new THREE.Vector3(),
    rolling:  new THREE.Vector3(),
    drag:     new THREE.Vector3(),
    net:      new THREE.Vector3()
};

/* ─── TRAIL ──────────────────────────────────────────────────── */
let trailMesh;
const TRAIL_LENGTH = 40;
let trailPositions, trailColors;

/* ─── CHART ──────────────────────────────────────────────────── */
let chart;
const CHART_LEN = 60;
let chartSpeed = Array(CHART_LEN).fill(0);
let chartAccel = Array(CHART_LEN).fill(0);

/* ─── SANDBOX MATCH ──────────────────────────────────────────── */
let targetSpeed = 2.5, matchTimer = 0;
const MATCH_TOLERANCE = 0.25;
const MATCH_HOLD_TIME = 3;

/* ─── LEVEL SYSTEM ───────────────────────────────────────────── */
let selectedLevel = 0, currentLevel = 0;
let levelPhase = 'sandbox', levelState = {};
let paramsOverride = null, tiltLocked = false;

/* ─── DEVICE SELECTOR ────────────────────────────────────────── */
document.getElementById('choose-mobile').onclick = () => { controlMethod = 'mobile'; hideSelector(); };
document.getElementById('choose-pc').onclick    = () => { controlMethod = 'pc';     hideSelector(); };

function hideSelector() {
    const s = document.getElementById('device-selector');
    s.style.opacity = '0';
    setTimeout(() => s.classList.add('hidden'), 500);
}

/* ─── START ──────────────────────────────────────────────────── */
document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud-left').classList.remove('hidden');
    document.getElementById('hud-right').classList.remove('hidden');
    document.getElementById('force-legend').classList.remove('hidden');

    if (controlMethod === 'mobile' &&
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') boot(); });
    } else {
        boot();
    }
};

document.getElementById('reset-ball-btn').onclick = resetBall;

function boot() {
    initThreeScene();
    initTrail();
    initChart();
    generateTarget();
    if (controlMethod === 'mobile') window.addEventListener('deviceorientation', handleOrientation);
    gameActive = true;
    lastTimestamp = null;
    accumulator = 0;
    requestAnimationFrame(gameLoop);
    startLevel(selectedLevel);
}

/* ─── THREE.JS SCENE ─────────────────────────────────────────── */
function createBallTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i*64,0); ctx.lineTo(i*64,256); ctx.stroke(); }
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0,i*64); ctx.lineTo(512,i*64); ctx.stroke(); }
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(0, 120, 512, 16);
    return new THREE.CanvasTexture(c);
}

function initThreeScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.Fog(0x020617, 50, 90);

    camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(18, 22, 18);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    platformGroup = new THREE.Group();
    scene.add(platformGroup);

    const platMesh = new THREE.Mesh(
        new THREE.BoxGeometry(PLATFORM_HALF*2, 0.3, PLATFORM_HALF*2),
        new THREE.MeshPhongMaterial({ color: 0x1e293b, transparent: true, opacity: 0.92 })
    );
    platMesh.position.y = -0.15;
    platMesh.receiveShadow = true;
    platformGroup.add(platMesh);
    platformGroup.add(new THREE.GridHelper(PLATFORM_HALF*2, 20, 0x4ade80, 0x162030));

    const edgeLines = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(PLATFORM_HALF*2, 0.3, PLATFORM_HALF*2)),
        new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 })
    );
    edgeLines.position.y = -0.15;
    platformGroup.add(edgeLines);

    ballMesh = new THREE.Mesh(
        new THREE.SphereGeometry(BALL_RADIUS, 32, 32),
        new THREE.MeshPhongMaterial({ map: createBallTexture(), shininess: 80 })
    );
    ballMesh.castShadow = true;
    scene.add(ballMesh);
    resetBall();

    const o = new THREE.Vector3(), d = new THREE.Vector3(0, 1, 0);
    arrowGravSurf = new THREE.ArrowHelper(d, o, 0.01, 0xef4444, 0.2, 0.1);
    arrowNormal   = new THREE.ArrowHelper(d, o, 0.01, 0x4ade80, 0.2, 0.1);
    arrowFriction = new THREE.ArrowHelper(d, o, 0.01, 0x3b82f6, 0.2, 0.1);
    arrowDrag     = new THREE.ArrowHelper(d, o, 0.01, 0xfbbf24, 0.2, 0.1);
    [arrowGravSurf, arrowNormal, arrowFriction, arrowDrag].forEach(a => { a.visible = false; scene.add(a); });

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(15, 30, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
    sun.shadow.camera.top  =  22; sun.shadow.camera.bottom = -22;
    scene.add(sun);

    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });
}

/* ─── TRAIL ──────────────────────────────────────────────────── */
function initTrail() {
    const geo = new THREE.BufferGeometry();
    trailPositions = new Float32Array(TRAIL_LENGTH * 3);
    trailColors    = new Float32Array(TRAIL_LENGTH * 4);
    for (let i = 0; i < TRAIL_LENGTH; i++) {
        trailPositions.set([ballPos.x, ballPos.y, ballPos.z], i * 3);
        trailColors.set([0.13, 0.83, 0.93, 0], i * 4);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(trailColors, 4));
    trailMesh = new THREE.Line(geo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(trailMesh);
}

function updateTrail() {
    const intensity = Math.min(ballVel.length() / 8, 1.0);
    for (let i = 0; i < TRAIL_LENGTH - 1; i++) {
        trailPositions[i*3]   = trailPositions[(i+1)*3];
        trailPositions[i*3+1] = trailPositions[(i+1)*3+1];
        trailPositions[i*3+2] = trailPositions[(i+1)*3+2];
    }
    const last = (TRAIL_LENGTH - 1) * 3;
    trailPositions[last] = ballPos.x; trailPositions[last+1] = ballPos.y; trailPositions[last+2] = ballPos.z;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
        const t = i / (TRAIL_LENGTH - 1);
        trailColors[i*4]   = 0.13 + 0.87 * intensity * t;
        trailColors[i*4+1] = 0.83 + 0.17 * intensity * t;
        trailColors[i*4+2] = 0.93 + 0.07 * intensity * t;
        trailColors[i*4+3] = t * t * intensity * 0.7;
    }
    trailMesh.geometry.attributes.position.needsUpdate = true;
    trailMesh.geometry.attributes.color.needsUpdate    = true;
}

/* ─── INPUT ──────────────────────────────────────────────────── */
window.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (k in keys) keys[k] = true; });
window.addEventListener('keyup',   e => { const k = e.key.toLowerCase(); if (k in keys) keys[k] = false; });

function updateKeyboardTilt(dt) {
    if (tiltLocked) return;
    const sens = 80, decay = 4.0;
    if (keys.d) tiltX -= sens * dt;
    if (keys.a) tiltX += sens * dt;
    if (keys.s) tiltZ -= sens * dt;
    if (keys.w) tiltZ += sens * dt;
    if (!keys.a && !keys.d) tiltX += -tiltX * Math.min(decay * dt, 1);
    if (!keys.w && !keys.s) tiltZ += -tiltZ * Math.min(decay * dt, 1);
    tiltX = THREE.MathUtils.clamp(tiltX, -MAX_TILT_DEG, MAX_TILT_DEG);
    tiltZ = THREE.MathUtils.clamp(tiltZ, -MAX_TILT_DEG, MAX_TILT_DEG);
}

function handleOrientation(e) {
    if (tiltLocked) return;
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = THREE.MathUtils.clamp(e.gamma - calibGamma, -MAX_TILT_DEG, MAX_TILT_DEG);
    tiltZ = THREE.MathUtils.clamp(e.beta  - calibBeta,  -MAX_TILT_DEG, MAX_TILT_DEG);
}

/* ─── READ PARAMS ────────────────────────────────────────────── */
function readParams() {
    if (paramsOverride) return { ...paramsOverride };
    const v = id => { const x = parseFloat(document.getElementById(id)?.value); return isNaN(x) ? null : x; };
    return {
        mass: Math.max(0.1, v('ctrl-mass') ?? 0.5),
        mu:   Math.max(0,   v('ctrl-mu')   ?? 0.3),
        gx: 0, gy: v('ctrl-gy') ?? -9.81, gz: 0,
        cd:   Math.max(0,   v('ctrl-cd')   ?? 0.47),
        rho:  Math.max(0,   v('ctrl-rho')  ?? 1.225)
    };
}

/* ─── PHYSICS ENGINE ─────────────────────────────────────────── */
function getPlatformNormal() {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(platformGroup.quaternion);
}

function isWithinPlatformBounds(worldPos) {
    const local = worldPos.clone().applyMatrix4(
        new THREE.Matrix4().copy(platformGroup.matrixWorld).invert()
    );
    return Math.abs(local.x) <= PLATFORM_HALF && Math.abs(local.z) <= PLATFORM_HALF;
}

function physicsStep(dt, P) {
    const gravity = new THREE.Vector3(P.gx, P.gy, P.gz);
    const n = getPlatformNormal();
    F.gravity.copy(gravity).multiplyScalar(P.mass);

    const dist = n.dot(ballPos);
    onSurface = dist <= BALL_RADIUS + 0.01 && dist >= -BALL_RADIUS - 1.0 && isWithinPlatformBounds(ballPos);

    F.normal.set(0,0,0); F.friction.set(0,0,0); F.rolling.set(0,0,0); F.gravSurf.set(0,0,0);

    if (onSurface) {
        const gDotN = gravity.dot(n);
        const normalMag = gDotN < 0 ? -P.mass * gDotN : 0;
        F.normal.copy(n).multiplyScalar(normalMag);
        F.gravSurf.copy(F.gravity).addScaledVector(n, -F.gravity.dot(n));

        const vDotN  = ballVel.dot(n);
        const vSurf  = ballVel.clone().addScaledVector(n, -vDotN);
        const surfSpeed = vSurf.length();

        if (surfSpeed < STATIC_THRESH) {
            const tangMag = F.gravSurf.length();
            if (tangMag <= P.mu * normalMag) {
                F.friction.copy(F.gravSurf).negate();
            } else {
                F.friction.copy(F.gravSurf).normalize().multiplyScalar(-P.mu * normalMag);
            }
        } else {
            F.friction.copy(vSurf).normalize().multiplyScalar(-P.mu * normalMag);
            F.rolling.copy(vSurf).normalize().multiplyScalar(-ROLLING_MU * normalMag);
        }

        if (dist < BALL_RADIUS) {
            ballPos.addScaledVector(n, BALL_RADIUS - dist);
            if (vDotN < 0) ballVel.addScaledVector(n, -vDotN * (1 + RESTITUTION));
        }
    }

    const speed = ballVel.length();
    F.drag.set(0,0,0);
    if (speed > 0.001) {
        const dragMag = 0.5 * P.rho * P.cd * BALL_AREA * speed * speed;
        F.drag.copy(ballVel).normalize().multiplyScalar(-dragMag);
    }

    F.net.copy(F.gravity).add(F.normal).add(F.friction).add(F.rolling).add(F.drag);
    const accel = F.net.clone().divideScalar(P.mass);
    currentAccelMag = accel.length();

    ballVel.addScaledVector(accel, dt);
    if (ballVel.length() > MAX_SPEED) ballVel.normalize().multiplyScalar(MAX_SPEED);
    ballPos.addScaledVector(ballVel, dt);
    if (ballPos.y < RESPAWN_Y) resetBall();
}

/* ─── BALL ROLLING VISUALIZATION ────────────────────────────── */
function updateBallRolling(dt) {
    if (!onSurface || ballVel.length() < 0.001) return;
    const n = getPlatformNormal();
    const vSurf = ballVel.clone().addScaledVector(n, -ballVel.dot(n));
    const surfSpeed = vSurf.length();
    if (surfSpeed < 0.001) return;
    const axis = new THREE.Vector3().crossVectors(n, vSurf.normalize());
    if (axis.lengthSq() > 0.0001) {
        ballMesh.rotateOnWorldAxis(axis.normalize(), (surfSpeed / BALL_RADIUS) * dt);
    }
}

/* ─── FORCE ARROWS ───────────────────────────────────────────── */
function updateForceArrows() {
    const show = document.getElementById('ctrl-arrows')?.checked ?? true;
    const pos  = ballMesh.position.clone();
    setArrow(arrowGravSurf, F.gravSurf,                      pos, show && onSurface);
    setArrow(arrowNormal,   F.normal,                        pos, show && onSurface);
    setArrow(arrowFriction, F.friction.clone().add(F.rolling), pos, show && onSurface);
    setArrow(arrowDrag,     F.drag,                          pos, show);
}

function setArrow(arrow, forceVec, origin, show) {
    const len = forceVec.length() * FORCE_SCALE;
    if (!show || len < 0.03) { arrow.visible = false; return; }
    arrow.setDirection(forceVec.clone().normalize());
    arrow.setLength(Math.min(len, 6), Math.min(len * 0.25, 0.35), 0.12);
    arrow.position.copy(origin);
    arrow.visible = true;
}

/* ─── TELEMETRY ──────────────────────────────────────────────── */
function updateTelemetry(P) {
    const speed = ballVel.length();
    const ke    = 0.5 * P.mass * speed * speed;
    setText('tel-speed',  speed.toFixed(2));
    setText('tel-accel',  currentAccelMag.toFixed(2));
    setText('tel-tiltx',  tiltX.toFixed(1));
    setText('tel-tiltz',  tiltZ.toFixed(1));
    setText('tel-normal', F.normal.length().toFixed(2));
    setText('tel-ke',     ke.toFixed(3));

    const sEl = document.getElementById('tel-speed');
    if (sEl) sEl.style.color = Math.abs(speed - targetSpeed) < MATCH_TOLERANCE ? '#4ade80' : '#22d3ee';

    const badge = document.getElementById('tel-state');
    if (badge) {
        badge.textContent = onSurface ? 'ON SURFACE' : 'AIRBORNE';
        badge.className   = 'state-badge' + (onSurface ? '' : ' airborne');
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

/* ─── CHART ──────────────────────────────────────────────────── */
function initChart() {
    const ctx = document.getElementById('physicsChart')?.getContext('2d');
    if (!ctx) return;
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(CHART_LEN).fill(''),
            datasets: [
                { label: 'Speed',   borderColor: '#4ade80', data: [...chartSpeed], borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false },
                { label: 'Accel',   borderColor: '#ef4444', data: [...chartAccel], borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false },
                { label: 'Target',  borderColor: '#fbbf24', data: Array(CHART_LEN).fill(targetSpeed), borderWidth: 1, borderDash: [5,5], pointRadius: 0, fill: false }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            scales: {
                y: { min: 0, max: 12, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 9 } } },
                x: { display: false }
            },
            plugins: { legend: { display: true, position: 'top', labels: { color: '#94a3b8', boxWidth: 12, font: { size: 9 } } } }
        }
    });
}

function updateChart() {
    if (!chart) return;
    const speed = ballVel.length();
    chartSpeed.push(speed);        chartSpeed.shift();
    chartAccel.push(currentAccelMag); chartAccel.shift();
    chart.data.datasets[0].data = [...chartSpeed];
    chart.data.datasets[1].data = [...chartAccel];
    chart.data.datasets[2].data = Array(CHART_LEN).fill(currentLevel === 0 ? targetSpeed : 0);
    const maxVal = Math.max(...chartSpeed, ...chartAccel, targetSpeed, 5);
    chart.options.scales.y.max = Math.ceil(maxVal * 1.3);
    chart.update('none');
}

/* ─── SANDBOX MATCH ──────────────────────────────────────────── */
function generateTarget() {
    targetSpeed = Math.random() * 5 + 0.5;
    const el = document.getElementById('target-val');
    if (el) el.textContent = targetSpeed.toFixed(2) + ' m/s';
}

function updateMatch(dt) {
    const diff = Math.abs(ballVel.length() - targetSpeed);
    matchTimer = diff < MATCH_TOLERANCE
        ? matchTimer + dt
        : Math.max(0, matchTimer - dt * 0.8);
    const bar = document.getElementById('match-progress');
    if (bar) bar.style.width = (Math.min(matchTimer / MATCH_HOLD_TIME, 1) * 100) + '%';
    if (matchTimer >= MATCH_HOLD_TIME) { matchTimer = 0; generateTarget(); }
}

/* ─── GAME LOOP ──────────────────────────────────────────────── */
function gameLoop(timestamp) {
    if (!gameActive) return;
    requestAnimationFrame(gameLoop);
    if (lastTimestamp === null) { lastTimestamp = timestamp; return; }

    let frameDt = Math.min((timestamp - lastTimestamp) / 1000, DT_CAP);
    lastTimestamp = timestamp;

    const P = readParams();
    if (controlMethod === 'pc') updateKeyboardTilt(frameDt);

    platformGroup.rotation.z = -THREE.MathUtils.degToRad(tiltX);
    platformGroup.rotation.x =  THREE.MathUtils.degToRad(tiltZ);
    platformGroup.updateMatrixWorld(true);

    if (levelPhase !== 'question') {
        accumulator += frameDt;
        while (accumulator >= FIXED_DT) {
            physicsStep(FIXED_DT, P);
            accumulator -= FIXED_DT;
        }
    }

    ballMesh.position.copy(ballPos);
    updateBallRolling(frameDt);
    updateTrail();
    updateForceArrows();
    updateTelemetry(P);

    if (currentLevel === 0) updateMatch(frameDt);
    if (currentLevel === 1) updateW1(frameDt);

    updateChart();

    camera.lookAt(new THREE.Vector3(ballPos.x * 0.15, Math.max(ballPos.y * 0.1, 0), ballPos.z * 0.15));
    renderer.render(scene, camera);
}

/* ─── RESET ──────────────────────────────────────────────────── */
function resetBall() {
    ballPos.set(0, BALL_RADIUS + 0.01, 0);
    ballVel.set(0, 0, 0);
    tiltX = 0; tiltZ = 0;
    matchTimer = 0;
    if (ballMesh) { ballMesh.position.copy(ballPos); ballMesh.rotation.set(0, 0, 0); }
}

/* ─── LEVEL SYSTEM ───────────────────────────────────────────── */
function initLevelUI() {
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lvl = parseInt(btn.dataset.level);
            if (lvl > 1) {
                document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedLevel = lvl;
                // Show coming soon note without alert
                btn.textContent = btn.textContent.replace(' (soon)', '') + ' (soon)';
                setTimeout(() => { btn.textContent = btn.textContent.replace(' (soon)', ''); }, 1500);
                return;
            }
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLevel = lvl;
        });
    });
}

function startLevel(n) {
    currentLevel  = n;
    levelPhase    = n === 0 ? 'sandbox' : 'intro';
    levelState    = {};
    paramsOverride = null;
    tiltLocked    = false;
    resetBall();
    hideAllLevelPanels();

    if (n === 0) {
        document.getElementById('match-hud').classList.remove('hidden');
        return;
    }

    document.getElementById('match-hud').classList.add('hidden');
    document.getElementById('level-hud').classList.remove('hidden');

    if (n === 1) startW1();
}

function hideAllLevelPanels() {
    ['level-hud', 'match-hud', 'snapshot-btn'].forEach(id =>
        document.getElementById(id)?.classList.add('hidden')
    );
    hideModal();
}

function setLevelHUD(badge, task, progress, score) {
    setText('level-badge-text', badge);
    setText('level-task-text',  task);
    setText('level-score-text', score);
    const bar = document.getElementById('level-progress-bar');
    if (bar) bar.style.width = (Math.min(Math.max(progress, 0), 1) * 100) + '%';
}

/* ─── MODAL ──────────────────────────────────────────────────── */
function showModal({ badge, title, body, choices, onChoice, btnLabel = 'Continue', onBtn }) {
    document.getElementById('bloom-modal').classList.remove('hidden');
    levelPhase = 'question';
    setText('bm-badge', badge || '');
    setText('bm-title', title  || '');
    const bodyEl = document.getElementById('bm-body');
    if (bodyEl) bodyEl.textContent = body || '';

    const choicesEl = document.getElementById('bm-choices');
    choicesEl.innerHTML = '';
    document.getElementById('bm-explanation').classList.add('hidden');

    const btn = document.getElementById('bm-btn');
    btn.textContent = btnLabel;
    btn.classList.remove('hidden');
    btn.onclick = () => { hideModal(); if (onBtn) onBtn(); };

    if (choices && choices.length) {
        btn.classList.add('hidden');
        choices.forEach((c, i) => {
            const b = document.createElement('button');
            b.className   = 'bm-choice-btn';
            b.textContent = c;
            b.onclick = () => { if (onChoice) onChoice(i, b); };
            choicesEl.appendChild(b);
        });
    }
}

function showExplanation(correct, explanation, onContinue) {
    const expEl = document.getElementById('bm-explanation');
    expEl.classList.remove('hidden');
    expEl.innerHTML = `<span class="${correct ? 'correct' : 'incorrect'}">${correct ? '✓ Correct!' : '✗ Not quite.'}</span> ${explanation}`;
    document.querySelectorAll('.bm-choice-btn').forEach(b => b.disabled = true);
    const btn = document.getElementById('bm-btn');
    btn.textContent = 'Continue';
    btn.classList.remove('hidden');
    btn.onclick = () => { hideModal(); if (onContinue) onContinue(); };
}

function hideModal() {
    document.getElementById('bloom-modal')?.classList.add('hidden');
    if (levelPhase === 'question') levelPhase = 'active';
}

/* ─── W1 — CORRIDOR (Position vs Time) ──────────────────────── */
const W1_SNAPSHOTS_REQUIRED = 8;
let w1Checkpoints = null, w1DispArrow = null;

function w1EnsureVisuals() {
    if (!w1Checkpoints) { w1Checkpoints = new THREE.Group(); scene.add(w1Checkpoints); }
    if (!w1DispArrow) {
        w1DispArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.05, 0), 0.01, 0x22d3ee, 0.3, 0.2
        );
        w1DispArrow.visible = false;
        scene.add(w1DispArrow);
    }
}

function w1ClearVisuals() {
    if (w1Checkpoints) {
        while (w1Checkpoints.children.length) {
            const g = w1Checkpoints.children.pop();
            g.children.forEach(c => { c.geometry?.dispose(); c.material?.dispose(); });
        }
    }
    if (w1DispArrow) w1DispArrow.visible = false;
}

function w1PlaceCheckpoint(pos) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x4ade80, emissiveIntensity: 0.5 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), mat);
    pole.position.y = 0.6;
    const flag = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x4ade80, emissiveIntensity: 0.9 }));
    flag.position.y = 1.25;
    group.add(pole, flag);
    group.position.set(pos.x, 0, pos.z);
    w1Checkpoints.add(group);
}

function startW1() {
    levelState = { snapshots: [], startTime: 0, phase: 'intro' };
    document.getElementById('snapshot-btn').classList.remove('hidden');
    w1EnsureVisuals();
    w1ClearVisuals();

    showModal({
        badge: 'WORLD 1 · CORRIDOR',
        title: 'Position vs Time',
        body: 'Tilt the platform (WASD or gyroscope) to roll the ball.\n\nPress 📸 SNAPSHOT to record your position and time. After 8 snapshots we\'ll review the data together.\n\nThe cyan arrow shows displacement from your last snapshot.',
        btnLabel: 'Start Rolling',
        onBtn: () => {
            levelState.phase     = 'recording';
            levelState.startTime = performance.now() / 1000;
            levelState.snapshots = [];
            w1UpdateHUD();
        }
    });
}

function w1UpdateHUD() {
    const n = levelState.snapshots.length;
    setLevelHUD(
        'W1 · CORRIDOR',
        'Roll freely — tap SNAPSHOT to record position + time',
        n / W1_SNAPSHOTS_REQUIRED,
        `${n} / ${W1_SNAPSHOTS_REQUIRED} snapshots recorded`
    );
}

function w1TakeSnapshot() {
    if (currentLevel !== 1 || levelState.phase !== 'recording') return;
    const t = performance.now() / 1000 - levelState.startTime;
    levelState.snapshots.push({ t, x: ballPos.x, z: ballPos.z, speed: ballVel.length() });
    w1PlaceCheckpoint(ballPos);
    w1UpdateHUD();
    if (levelState.snapshots.length >= W1_SNAPSHOTS_REQUIRED) w1FinishRecording();
}

function w1FinishRecording() {
    levelState.phase = 'review';
    document.getElementById('snapshot-btn').classList.add('hidden');

    const snaps = levelState.snapshots;
    const first = snaps[0], last = snaps[snaps.length - 1];
    const dx = last.x - first.x, dz = last.z - first.z;
    const displacement = Math.sqrt(dx*dx + dz*dz);
    const dt = last.t - first.t;
    const avgSpeed = displacement / dt;

    const table = snaps.map((s, i) =>
        `${i+1}. t=${s.t.toFixed(2)}s   |pos|=${Math.sqrt(s.x*s.x + s.z*s.z).toFixed(2)}m   |v|=${s.speed.toFixed(2)}m/s`
    ).join('\n');

    showModal({
        badge: 'DATA COLLECTED',
        title: `Avg speed ≈ ${avgSpeed.toFixed(2)} m/s`,
        body: `Displacement: ${displacement.toFixed(2)} m over ${dt.toFixed(2)} s\n\nSlope of position vs time = speed — you just measured it by tapping.\n\n${table}`,
        btnLabel: 'Take the Quiz →',
        onBtn: () => { w1Quiz(); }
    });
}

function w1Quiz() {
    showModal({
        badge: 'QUIZ · W1',
        title: 'On a position-vs-time graph, what does the slope represent?',
        body: 'You just built your own position-time dataset. Think: rise / run.',
        choices: ['Acceleration', 'Speed (magnitude of velocity)', 'Total distance traveled'],
        onChoice: (i) => {
            const ok = i === 1;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 1 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                'Slope = Δposition / Δtime = speed. Steeper slope = faster ball. Flat line = ball is stopped. This is the core of kinematics.',
                () => { w1ClearVisuals(); startLevel(0); }
            );
        }
    });
}

function updateW1(dt) {
    if (levelState.phase !== 'recording' || !w1DispArrow || !w1Checkpoints) return;
    const last = w1Checkpoints.children[w1Checkpoints.children.length - 1];
    if (!last) { w1DispArrow.visible = false; return; }
    const from = new THREE.Vector3(last.position.x, 0.05, last.position.z);
    const to   = new THREE.Vector3(ballPos.x, 0.05, ballPos.z);
    const dir  = to.clone().sub(from);
    const len  = dir.length();
    if (len < 0.05) { w1DispArrow.visible = false; return; }
    w1DispArrow.position.copy(from);
    w1DispArrow.setDirection(dir.normalize());
    w1DispArrow.setLength(len, Math.min(0.3, len * 0.3), Math.min(0.2, len * 0.2));
    w1DispArrow.visible = true;
}

/* ─── SNAPSHOT BUTTON ────────────────────────────────────────── */
document.getElementById('snapshot-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    w1TakeSnapshot();
});

/* ─── INIT ───────────────────────────────────────────────────── */
initLevelUI();

/* ─── UI UTILITY ─────────────────────────────────────────────── */
function adj(id, delta) {
    const input = document.getElementById(id);
    if (!input || input.disabled) return;
    const decimals = (delta.toString().split('.')[1] || '').length;
    const factor   = Math.pow(10, decimals);
    let val = Math.round((parseFloat(input.value) + delta) * factor) / factor;
    const min = parseFloat(input.min), max = parseFloat(input.max);
    if (!isNaN(min)) val = Math.max(min, val);
    if (!isNaN(max)) val = Math.min(max, val);
    input.value = val;
}
