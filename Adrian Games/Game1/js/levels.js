/* ─── LEVEL SYSTEM ───────────────────────────────────────────── */

//This functions send the user to the appropriate level selected on the main menu
function initLevelUI() {
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lvl = parseInt(btn.dataset.level);
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLevel = lvl;
            if (lvl > 6) {
                const orig = btn.textContent;
                btn.textContent = orig + ' (soon)';
                setTimeout(() => { btn.textContent = orig; }, 1500);
            }
        });
    });
}
//added specifc level huds accordingly so a level has specific panels
function startLevel(n) {
    currentLevel = n;
    levelPhase = n === 0 ? 'sandbox' : 'intro';
    levelState = {};
    paramsOverride = null;
    tiltLocked = false;
    resetBall();
    hideAllLevelPanels();
    document.getElementById('game-back-btn')?.classList.remove('hidden');

    //clear level-specific visuals when switching away from them
    if (n !== 1) w1ClearVisuals();
    if (n !== 2) w2ClearVisuals();
    if (n !== 3) w3ClearVisuals();
    if (n !== 4) w4ClearVisuals();
    if (n !== 5) w5ClearVisuals();
    if (n !== 6) w6ClearVisuals();

    const isSandbox = (n === 0 || n === 6);
    if (controlMethod === 'mobile') {
        document.getElementById('jump-btn')?.classList.toggle('hidden', !isSandbox);
    }

    if (n === 0) {
        document.getElementById('hud-left').classList.remove('hidden');
        document.getElementById('match-hud').classList.remove('hidden');
        return;
    }
    document.getElementById('hud-left').classList.add('hidden');
    document.getElementById('match-hud').classList.add('hidden');
    document.getElementById('level-hud').classList.remove('hidden');

    if (n === 1) startW1();
    if (n === 2) startW2();
    if (n === 3) startW3();
    if (n === 4) startW4();
    if (n === 5) startW5();
    if (n === 6) startW6();
}

//this is a helper function for startlevel
function hideAllLevelPanels() {
    ['level-hud', 'match-hud', 'snapshot-btn'].forEach(id =>
        document.getElementById(id)?.classList.add('hidden')
    );
    hideModal();
}

// Shown at the end of every level — lets the student go back or advance
function showLevelComplete(clearFn, nextLevel) {
    const isLast = nextLevel > 6;
    showModal({
        badge: isLast ? 'ALL WORLDS COMPLETE' : 'LEVEL COMPLETE',
        title: isLast ? "You've mastered every world!" : 'Challenge done!',
        body: isLast
            ? 'Incredible work. Head back to replay any world, or run W6 again to test a new planet.'
            : 'Jump straight to the next world, or head back to the level select to choose your own path.',
        choices: [
            '← LEVELS',
            isLast ? '↺ PLAY AGAIN' : 'NEXT WORLD →'
        ],
        onChoice: (i) => {
            clearFn();
            if (i === 0) {
                goToLevelSelect();
            } else {
                hideModal();
                startLevel(isLast ? currentLevel : nextLevel);
            }
        }
    });
}

//this function is the basic vector arrow checkpoints for position vs time 
//shows the displacement of the ball in respect to the recorded spot
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
//clearing any unnecessary visuals once the game round is finished
function w1ClearVisuals() {
    if (w1Checkpoints) {
        while (w1Checkpoints.children.length) {
            const g = w1Checkpoints.children.pop();
            g.children.forEach(c => { c.geometry?.dispose(); c.material?.dispose(); });
        }
    }
    if (w1DispArrow) w1DispArrow.visible = false;
}
//The check points are placed once the user clicks on snapshot
function w1PlaceCheckpoint(pos) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x4ade80, emissiveIntensity: 0.5 });
    const pole  = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), mat);
    pole.position.y = 0.6;
    const flag  = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x4ade80, emissiveIntensity: 0.9 }));
    flag.position.y = 1.25;
    group.add(pole, flag);
    group.position.set(pos.x, 0, pos.z);
    w1Checkpoints.add(group);
}
//starts the level and tells the student what they need to do
function startW1() {
    levelState = { snapshots: [], startTime: 0, phase: 'intro' };
    document.getElementById('snapshot-btn').classList.remove('hidden');
    w1EnsureVisuals();
    w1ClearVisuals();

    showModal({
        badge: 'WORLD 1 · CORRIDOR',
        title: 'Position vs Time',
        body: 'Tilt the platform (WASD or gyroscope) to roll the ball.\n\nTap 📸 SNAPSHOT to place a point — each tap pins your exact position and time to the map. Place 8 points and we\'ll review the data together.\n\nThe cyan arrow shows your displacement from the last placed point.',
        btnLabel: 'Start Rolling',
        onBtn: () => {
            levelState.phase     = 'recording';
            levelState.startTime = performance.now() / 1000;
            levelState.snapshots = [];
            w1UpdateHUD();
        }
    });
}
//goal hud basically showing the students what they need to do
function w1UpdateHUD() {
    const n = levelState.snapshots.length;
    setLevelHUD(
        'W1 · CORRIDOR',
        'Roll freely — tap 📸 SNAPSHOT to place a point',
        n / W1_SNAPSHOTS_REQUIRED,
        `${n} / ${W1_SNAPSHOTS_REQUIRED} points placed`
    );
}
//take a snapshot records the stats of the starting position to the end postion for displacement respect to time
function w1TakeSnapshot() {
    if (currentLevel !== 1 || levelState.phase !== 'recording') return;
    const t = performance.now() / 1000 - levelState.startTime;
    levelState.snapshots.push({ t, x: ballPos.x, z: ballPos.z, speed: ballVel.length() });
    w1PlaceCheckpoint(ballPos);
    w1UpdateHUD();
    if (levelState.snapshots.length >= W1_SNAPSHOTS_REQUIRED) w1FinishRecording();
}
//once the recording of the stats is finalized the students will be prompted with the stats
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
        `${i+1}. t=${s.t.toFixed(2)}s  |pos|=${Math.sqrt(s.x*s.x + s.z*s.z).toFixed(2)}m  |v|=${s.speed.toFixed(2)}m/s`
    ).join('\n');

    showModal({
        badge: 'DATA COLLECTED',
        title: `Avg speed ≈ ${avgSpeed.toFixed(2)} m/s`,
        body: `Displacement: ${displacement.toFixed(2)} m over ${dt.toFixed(2)} s\n\nSlope of position vs time = speed — you just measured it by tapping.\n\n${table}`,
        btnLabel: 'Take the Quiz →',
        onBtn: () => { w1Quiz(); }
    });
}
//basic questions for the student before starting the game planning on adding more
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
                'Slope = Δposition / Δtime = speed. Steeper slope = faster ball. Flat line = ball is stopped.',
                () => showLevelComplete(w1ClearVisuals, 2)
            );
        }
    });
}
//updates everything as the user is playing the game so it becomes visually useful (basically the rendering for basic components)
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

/* ─── WORLD 2 · THREE PATHS (Distance vs Displacement) ─────────── */
// Three sequential paths — squiggly, curved, straight — teaching that
// distance depends on the route while displacement only cares about endpoints.

let w2Group     = null;   // group holding the permanent path-line visuals
let w2ActiveWps = [];     // [{mesh, x, z, collected}] waypoints for current segment
let w2CpMesh    = null;   // current checkpoint pole
let w2Results   = [];     // [{label, dist, disp}] per completed segment
let w2SegDist   = 0;      // distance accumulated in current segment
let w2SegStartX = 0, w2SegStartZ = 0;
let w2LastX = 0, w2LastZ = 0;

const W2_WP_R = 1.5;  // collection radius (metres) for waypoints + checkpoints

// Three path segments. Each has a CatmullRom curve for visuals, intermediate
// waypoints the student must collect in order, a start position, and a checkpoint.
const W2_SEGS = [
    {
        label: 'Squiggly', color: 0xef4444,
        curve: [[-8,0],[-5,-5],[-2,5],[1,-5],[0,0]],
        wps:   [[-5,-5],[-2,5],[1,-5]],
        start: [-8, 0], cp: [0, 0]
    },
    {
        label: 'Curved', color: 0xa855f7,
        curve: [[0,0],[3,-5],[7,-4],[8,0]],
        wps:   [[3,-5],[7,-4]],
        start: [0, 0], cp: [8, 0]
    },
    {
        label: 'Straight', color: 0x22d3ee,
        curve: [[8,0],[-4,-7]],
        wps:   [],   // no intermediate stops — direct shot
        start: [8, 0], cp: [-4, -7]
    }
];

// Coloured checkpoint pole — pole + glowing sphere on top
function w2MakePole(color) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.4, 10),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 })
    );
    pole.position.y = 0.7;
    const flag = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 14, 14),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 })
    );
    flag.position.y = 1.45;
    group.add(pole, flag);
    return group;
}

// Build glowing CatmullRom path lines — created once, shown/hidden thereafter
function w2EnsureVisuals() {
    if (w2Group) { w2Group.visible = true; return; }
    w2Group = new THREE.Group();
    W2_SEGS.forEach(seg => {
        const pts3d = seg.curve.map(([x, z]) => new THREE.Vector3(x, 0.04, z));
        const crv   = new THREE.CatmullRomCurve3(pts3d);
        const pts   = crv.getPoints(120);
        const geo   = new THREE.BufferGeometry().setFromPoints(pts);
        const mat   = new THREE.LineBasicMaterial({ color: seg.color, transparent: true, opacity: 0.45 });
        w2Group.add(new THREE.Line(geo, mat));
    });
    scene.add(w2Group);
}

// Hide all W2 visuals and clean up dynamic objects
function w2ClearVisuals() {
    if (w2Group) w2Group.visible = false;

    w2ActiveWps.forEach(wp => {
        scene.remove(wp.mesh);
        wp.mesh.geometry.dispose();
        wp.mesh.material.dispose();
    });
    w2ActiveWps = [];

    if (w2CpMesh) {
        scene.remove(w2CpMesh);
        w2CpMesh.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
        w2CpMesh = null;
    }

    if (w2DispArrow) w2DispArrow.visible = false;
}

function startW2() {
    w2EnsureVisuals();
    w2Results  = [];
    levelState = { phase: 'intro' };

    showModal({
        badge: 'WORLD 2 · PATH vs ARROW',
        title: 'Distance vs Displacement',
        body: "You'll roll along THREE paths — squiggly, curved, and straight.\n\nFor each path the game records:\n• Distance — the total length you actually rolled\n• Displacement — the straight-line gap from start to finish\n\nAfter all three, a quiz asks you to compare them.",
        btnLabel: 'Begin Path 1 →',
        onBtn: () => w2BeginSegment(0)
    });
}

// Set up a new path segment: spawn waypoints, place checkpoint, reset tracking
function w2BeginSegment(idx) {
    const seg = W2_SEGS[idx];
    levelState = { phase: 'rolling', segIdx: idx };

    ballPos.set(seg.start[0], BALL_RADIUS + 0.01, seg.start[1]);
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);

    w2SegDist   = 0;
    w2SegStartX = seg.start[0];
    w2SegStartZ = seg.start[1];
    w2LastX     = seg.start[0];
    w2LastZ     = seg.start[1];

    // Spawn coloured waypoint spheres for this segment
    w2ActiveWps.forEach(wp => { scene.remove(wp.mesh); wp.mesh.geometry.dispose(); wp.mesh.material.dispose(); });
    w2ActiveWps = seg.wps.map(([wx, wz]) => {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 14, 14),
            new THREE.MeshStandardMaterial({
                color: seg.color, emissive: seg.color, emissiveIntensity: 0.3,
                transparent: true, opacity: 0.7
            })
        );
        mesh.position.set(wx, 0.35, wz);
        scene.add(mesh);
        return { mesh, x: wx, z: wz, collected: false };
    });

    // Place checkpoint pole
    if (w2CpMesh) {
        scene.remove(w2CpMesh);
        w2CpMesh.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    }
    w2CpMesh = w2MakePole(seg.color);
    w2CpMesh.position.set(seg.cp[0], 0, seg.cp[1]);
    scene.add(w2CpMesh);

    // Displacement arrow — create once if needed, recolour each segment
    if (!w2DispArrow) {
        w2DispArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.05, 0), 0.01, seg.color, 0.3, 0.2
        );
        scene.add(w2DispArrow);
    }
    w2DispArrow.setColor(new THREE.Color(seg.color));
    w2DispArrow.visible = false;

    w2HUD(idx);
}

function w2HUD(idx) {
    const seg      = W2_SEGS[idx];
    const wpDone   = w2ActiveWps.filter(w => w.collected).length;
    const wpTotal  = w2ActiveWps.length;
    const disp     = Math.hypot(ballPos.x - w2SegStartX, ballPos.z - w2SegStartZ);
    const toCp     = Math.hypot(ballPos.x - seg.cp[0], ballPos.z - seg.cp[1]);
    const allDone  = wpTotal === 0 || wpDone === wpTotal;
    const task     = allDone
        ? 'Reach the checkpoint!'
        : `Follow the ${seg.label.toLowerCase()} route — hit waypoint ${wpDone + 1} / ${wpTotal}`;
    const prog     = wpTotal > 0
        ? (wpDone / wpTotal) * 0.8 + (allDone ? Math.max(0, 1 - toCp / 15) * 0.2 : 0)
        : Math.max(0, 1 - toCp / 15);

    setLevelHUD(
        `W2 · PATH ${idx + 1}/3 · ${seg.label.toUpperCase()}`,
        task,
        Math.min(1, prog),
        `Dist: ${w2SegDist.toFixed(2)} m  ·  Disp: ${disp.toFixed(2)} m`
    );
}

function updateW2(dt) {
    if (!levelState || levelState.phase !== 'rolling') return;
    const idx = levelState.segIdx;
    const seg = W2_SEGS[idx];

    // Accumulate distance rolled this frame
    const dx = ballPos.x - w2LastX;
    const dz = ballPos.z - w2LastZ;
    w2SegDist += Math.hypot(dx, dz);
    w2LastX = ballPos.x;
    w2LastZ = ballPos.z;

    // Draw displacement arrow from segment start to ball
    const disp = Math.hypot(ballPos.x - w2SegStartX, ballPos.z - w2SegStartZ);
    if (disp > 0.3 && w2DispArrow) {
        const from = new THREE.Vector3(w2SegStartX, 0.05, w2SegStartZ);
        const to   = new THREE.Vector3(ballPos.x, 0.05, ballPos.z);
        const dir  = to.clone().sub(from).normalize();
        w2DispArrow.position.copy(from);
        w2DispArrow.setDirection(dir);
        w2DispArrow.setLength(disp, Math.min(0.35, disp * 0.2), Math.min(0.22, disp * 0.15));
        w2DispArrow.visible = true;
    } else if (w2DispArrow) {
        w2DispArrow.visible = false;
    }

    // Pulse the next uncollected waypoint to guide the student
    const nextWp = w2ActiveWps.find(w => !w.collected);
    if (nextWp) {
        const t = performance.now() / 1000;
        nextWp.mesh.material.emissiveIntensity = 0.4 + 0.8 * Math.abs(Math.sin(t * 3));
        nextWp.mesh.scale.setScalar(0.85 + 0.2 * Math.abs(Math.sin(t * 2.5)));

        if (Math.hypot(ballPos.x - nextWp.x, ballPos.z - nextWp.z) < W2_WP_R) {
            nextWp.collected = true;
            nextWp.mesh.visible = false;
        }
    }

    // Checkpoint — only reachable once all waypoints in this segment are collected
    const allWpDone = w2ActiveWps.every(w => w.collected);
    if (allWpDone && Math.hypot(ballPos.x - seg.cp[0], ballPos.z - seg.cp[1]) < W2_WP_R) {
        levelState.phase = 'checkpoint';
        const segDisp = Math.hypot(seg.cp[0] - seg.start[0], seg.cp[1] - seg.start[1]);
        w2Results.push({ label: seg.label, dist: w2SegDist, disp: segDisp });
        w2OnCheckpoint(idx);
        return;
    }

    w2HUD(idx);
}

// Show stats for the completed segment, then advance to next path or quiz
function w2OnCheckpoint(idx) {
    const seg    = W2_SEGS[idx];
    const r      = w2Results[idx];
    const isLast = idx === W2_SEGS.length - 1;

    const body = `${seg.label} route:\n• Distance rolled:  ${r.dist.toFixed(2)} m\n• Displacement:      ${r.disp.toFixed(2)} m`
        + (isLast ? '\n\n── All three paths ──\n' + w2BuildSummary() : '');

    showModal({
        badge: `PATH ${idx + 1} · ${seg.label.toUpperCase()} COMPLETE`,
        title: isLast ? 'All paths done!' : `Checkpoint ${idx + 1} reached!`,
        body,
        btnLabel: isLast ? 'See the Quiz →' : `Start Path ${idx + 2} →`,
        onBtn: () => isLast ? w2Quiz() : w2BeginSegment(idx + 1)
    });
}

function w2BuildSummary() {
    return w2Results.map((r, i) =>
        `Path ${i + 1} (${r.label}): dist ${r.dist.toFixed(2)} m, disp ${r.disp.toFixed(2)} m`
    ).join('\n');
}

// Q1 — which path had the greatest distance?
function w2Quiz() {
    const maxIdx = w2Results.reduce((best, r, i) => r.dist > w2Results[best].dist ? i : best, 0);

    showModal({
        badge: 'QUIZ · W2',
        title: 'Which path covered the greatest DISTANCE?',
        body: `Your data:\n${w2BuildSummary()}`,
        choices: W2_SEGS.map((s, i) => `Path ${i + 1} — ${s.label}`),
        onChoice: (i) => {
            const ok = i === maxIdx;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === maxIdx ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                `The ${W2_SEGS[maxIdx].label.toLowerCase()} path covered the most ground (${w2Results[maxIdx].dist.toFixed(2)} m) because it zigzagged. Distance is a scalar that adds up every twist and turn — it never cancels.`,
                () => w2Quiz2()
            );
        }
    });
}

// Q2 — for which path did distance ≈ displacement?
function w2Quiz2() {
    const straightIdx = W2_SEGS.length - 1;   // always the last segment

    showModal({
        badge: 'QUIZ · W2',
        title: 'For which path did distance ≈ displacement?',
        body: `Displacement = straight-line gap from start to finish.\n\nYour data:\n${w2BuildSummary()}`,
        choices: W2_SEGS.map((s, i) => `Path ${i + 1} — ${s.label}`),
        onChoice: (i) => {
            const ok = i === straightIdx;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === straightIdx ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                'The straight path is the only route where you moved directly from start to finish — total distance equals displacement. Any curve or zigzag racks up extra distance beyond its displacement.',
                () => showLevelComplete(w2ClearVisuals, 3)
            );
        }
    });
}

/* ─── WORLD 3 · VELOCITY VS SPEED (Negative & Positive Direction) ── */

// Builds a glowing gate: vertical panel + ground stripe + edge poles
function w3MakeGate(color) {
    const group = new THREE.Group();
    const span  = W3_GATE_W * 2;

    // Translucent vertical panel
    const panelGeo = new THREE.BoxGeometry(0.1, 1.4, span);
    const panelMat = new THREE.MeshPhongMaterial({
        color, transparent: true, opacity: 0.45,
        emissive: color, emissiveIntensity: 0.4
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.y = 0.7;
    group.add(panel);

    // Bright ground line
    const lineGeo = new THREE.BoxGeometry(0.06, 0.02, span);
    const lineMat = new THREE.MeshBasicMaterial({ color });
    group.add(new THREE.Mesh(lineGeo, lineMat));

    // Edge poles
    [-W3_GATE_W, W3_GATE_W].forEach(z => {
        const pGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8);
        const pMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.55 });
        const pole = new THREE.Mesh(pGeo, pMat);
        pole.position.set(0, 0.75, z);
        group.add(pole);
    });
    return group;
}

// Thin coloured ground strips that mark the negative (red) and positive (green) halves
function w3MakeNumberLine() {
    const group = new THREE.Group();
    const halfW = PLATFORM_HALF;

    [[-1, 0xef4444], [1, 0x4ade80]].forEach(([sign, col]) => {
        const geo = new THREE.PlaneGeometry(halfW, 0.35);
        const mat = new THREE.MeshBasicMaterial({
            color: col, transparent: true, opacity: 0.11, side: THREE.DoubleSide
        });
        const strip = new THREE.Mesh(geo, mat);
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(sign * halfW / 2, 0.005, 0);
        group.add(strip);
    });

    // Tick marks at ±2, ±4, ±6, ±8
    for (let x = -8; x <= 8; x += 2) {
        if (x === 0) continue;
        const tGeo = new THREE.BoxGeometry(0.04, 0.02, 0.28);
        const tMat = new THREE.MeshBasicMaterial({
            color: x < 0 ? 0xef4444 : 0x4ade80, transparent: true, opacity: 0.55
        });
        const tick = new THREE.Mesh(tGeo, tMat);
        tick.position.set(x, 0.012, 0);
        group.add(tick);
    }

    // Centre divider
    const cGeo = new THREE.BoxGeometry(0.05, 0.02, 0.45);
    group.add(new THREE.Mesh(cGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })));
    return group;
}

function w3EnsureVisuals() {
    if (!w3NegGate) {
        w3NegGate = w3MakeGate(0xef4444);
        w3NegGate.position.set(-W3_GATE_X, 0, 0);
        scene.add(w3NegGate);
    }
    if (!w3PosGate) {
        w3PosGate = w3MakeGate(0x4ade80);
        w3PosGate.position.set(W3_GATE_X, 0, 0);
        scene.add(w3PosGate);
    }
    if (!w3VelArrow) {
        w3VelArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.6, 0),
            0.01, 0xec4899, 0.35, 0.22
        );
        scene.add(w3VelArrow);
    }
    if (!w3NumberLine) {
        w3NumberLine = w3MakeNumberLine();
        scene.add(w3NumberLine);
    }
    // Show gates; circle ring starts hidden until phase 3
    w3NegGate.visible    = true;
    w3PosGate.visible    = true;
    w3VelArrow.visible   = false;
    w3NumberLine.visible = true;
    if (w3CircleRing) w3CircleRing.visible = false;
}

function w3ClearVisuals() {
    if (w3NegGate)    w3NegGate.visible    = false;
    if (w3PosGate)    w3PosGate.visible    = false;
    if (w3VelArrow)   w3VelArrow.visible   = false;
    if (w3NumberLine) w3NumberLine.visible  = false;
    if (w3CircleRing) w3CircleRing.visible  = false;
}

// Sets the emissive pulse intensity on a gate's panel and poles
function w3SetGatePulse(gate, intensity) {
    gate.children.forEach(c => {
        if (c.material && c.material.emissiveIntensity !== undefined)
            c.material.emissiveIntensity = intensity;
    });
}

// Builds the purple circular lap track (a flat ring on the floor)
function w3MakeCircleRing() {
    const group = new THREE.Group();

    // Glowing track band
    const trackGeo = new THREE.RingGeometry(W3_CIRCLE_R - 0.22, W3_CIRCLE_R + 0.22, 80);
    const trackMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.55
    });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.008;
    group.add(track);

    // Outer glow ring (wider, more transparent)
    const glowGeo = new THREE.RingGeometry(W3_CIRCLE_R - 0.6, W3_CIRCLE_R + 0.6, 80);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.12
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.006;
    group.add(glow);

    // Start marker — a bright dot at angle 0 (positive X side)
    const dotGeo = new THREE.CircleGeometry(0.3, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(W3_CIRCLE_R, 0.012, 0);
    group.add(dot);

    return group;
}

function startW3() {
    w3EnsureVisuals();
    ballPos.set(0, BALL_RADIUS + 0.01, 0);
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);
    tiltX = 0; tiltZ = 0;

    levelState = { phase: 'intro', negResult: null, posResult: null, circleResult: null, pulseT: 0 };

    showModal({
        badge: 'WORLD 3 · VELOCITY VS SPEED',
        title: 'Velocity = Displacement ÷ Time',
        body: 'The formula is:  v = Δx / t\n\nDisplacement (Δx) is SIGNED — left is negative, right is positive.\nTime (t) is always positive.\nSo velocity can be negative, zero, or positive.\n\nSpeed = distance / t  →  always ≥ 0 (no direction)\nVelocity = Δx / t    →  can be negative (has direction)\n\nThree runs to feel the difference:\n  ① Roll LEFT through the red gate\n  ② Roll RIGHT through the green gate\n  ③ Roll a full lap around the purple ring',
        btnLabel: '① Start — Roll LEFT',
        onBtn: () => {
            levelState.phase     = 'neg';
            levelState.phaseTime = 0;
            levelState.startX    = ballPos.x;
            setLevelHUD('W3 · VELOCITY', '① Roll LEFT through the RED gate  (A key / tilt left)', 0,
                'Δx: 0.00 m  |  t: 0.0 s  |  v = Δx/t');
        }
    });
}

function updateW3(dt) {
    const activePhases = ['neg', 'pos', 'circle'];
    if (!levelState || !activePhases.includes(levelState.phase)) {
        if (w3VelArrow) w3VelArrow.visible = false;
        return;
    }

    const speed   = ballVel.length();
    const velFlat = new THREE.Vector3(ballVel.x, 0, ballVel.z);

    // ── Accumulate phase time ─────────────────────────────────────────
    levelState.phaseTime = (levelState.phaseTime || 0) + dt;

    // ── 1-D constraint: lock Z during the two gate runs only ──────────
    if (levelState.phase === 'neg' || levelState.phase === 'pos') tiltZ = 0;

    // ── Gate pulse animation ──────────────────────────────────────────
    levelState.pulseT += dt;
    const pulse = 0.28 + 0.28 * Math.abs(Math.sin(levelState.pulseT * 2.8));
    if (levelState.phase === 'neg') {
        w3SetGatePulse(w3NegGate, pulse);
        w3SetGatePulse(w3PosGate, 0.08);
    } else if (levelState.phase === 'pos') {
        w3SetGatePulse(w3PosGate, pulse);
        w3SetGatePulse(w3NegGate, 0.08);
    } else {
        w3SetGatePulse(w3NegGate, 0.06);
        w3SetGatePulse(w3PosGate, 0.06);
    }

    // ── Pink velocity arrow (all phases) ──────────────────────────────
    if (speed > 0.12 && velFlat.length() > 0.01) {
        w3VelArrow.position.set(ballPos.x, BALL_RADIUS + 0.12, ballPos.z);
        w3VelArrow.setDirection(velFlat.clone().normalize());
        const len = Math.min(3.2, speed * 0.65);
        w3VelArrow.setLength(len, Math.min(0.42, len * 0.25), Math.min(0.26, len * 0.15));
        w3VelArrow.visible = true;
    } else {
        w3VelArrow.visible = false;
    }

    // ── HUD ───────────────────────────────────────────────────────────
    const t = levelState.phaseTime;

    if (levelState.phase === 'neg' || levelState.phase === 'pos') {
        const dispX = ballPos.x - levelState.startX;
        const avgV  = t > 0.05 ? (dispX / t).toFixed(2) : '—';
        const sign  = parseFloat(avgV) >= 0 ? '+' : '';
        const rawProg = levelState.phase === 'neg'
            ? Math.max(0, -ballPos.x) / W3_GATE_X
            : Math.max(0,  ballPos.x) / W3_GATE_X;
        const prog = levelState.phase === 'neg' ? rawProg * 0.34 : 0.34 + rawProg * 0.34;
        const task = levelState.phase === 'neg'
            ? '① Roll LEFT through the RED gate  (A key / tilt left)'
            : '② Roll RIGHT through the GREEN gate  (D key / tilt right)';
        setLevelHUD('W3 · VELOCITY', task, Math.min(0.68, prog),
            `Δx: ${dispX >= 0 ? '+' : ''}${dispX.toFixed(2)} m  |  t: ${t.toFixed(1)} s  |  v = ${avgV === '—' ? '—' : sign + avgV} m/s`);
    } else {
        // circle phase — show avg speed and displacement magnitude back to start
        const lapPct  = Math.min(1, levelState.accAngle / (2 * Math.PI));
        const sPos    = levelState.circleStartPos;
        const dispMag = sPos ? Math.sqrt(
            (ballPos.x - sPos.x) ** 2 + (ballPos.z - sPos.z) ** 2
        ).toFixed(2) : '0.00';
        setLevelHUD('W3 · VELOCITY',
            '③ Roll a full lap around the PURPLE ring  (use all keys / tilt freely)',
            0.68 + lapPct * 0.32,
            `dist: ${(levelState.distTraveled || 0).toFixed(1)} m  |  |Δr|: ${dispMag} m  |  lap: ${Math.round(lapPct * 100)}%`);
    }

    // ── Gate crossing — negative run ──────────────────────────────────
    if (levelState.phase === 'neg' && ballPos.x <= -W3_GATE_X && ballVel.x < -W3_MIN_ENTRY_V) {
        const dispX = ballPos.x - levelState.startX;
        const avgV  = (dispX / t).toFixed(2);
        levelState.phase     = 'wait';
        levelState.negResult = { disp: dispX.toFixed(2), time: t.toFixed(2), avgV, speed: speed.toFixed(2) };
        w3VelArrow.visible   = false;
        tiltX = 0;
        showModal({
            badge: 'NEGATIVE VELOCITY ✓',
            title: `v = Δx/t = ${dispX.toFixed(2)} / ${t.toFixed(2)} = ${avgV} m/s`,
            body: `You rolled LEFT — displacement was NEGATIVE.\n\nΔx = ${dispX.toFixed(2)} m  (leftward = negative)\nt  = ${t.toFixed(2)} s  (always positive)\nv  = Δx / t = ${avgV} m/s  ← NEGATIVE\n\nSpeed = distance / t = ${speed.toFixed(2)} m/s  (always positive)\n\nSame trip — speed is positive, velocity is negative.\nThe sign comes from displacement being negative.`,
            btnLabel: '② Next — Roll RIGHT',
            onBtn: () => {
                ballPos.set(0, BALL_RADIUS + 0.01, 0);
                ballVel.set(0, 0, 0);
                ballMesh.position.copy(ballPos);
                tiltX = 0; tiltZ = 0;
                levelState.phase     = 'pos';
                levelState.phaseTime = 0;
                levelState.startX    = ballPos.x;
                setLevelHUD('W3 · VELOCITY', '② Roll RIGHT through the GREEN gate  (D key / tilt right)', 0.34,
                    'Δx: 0.00 m  |  t: 0.0 s  |  v = Δx/t');
            }
        });
    }

    // ── Gate crossing — positive run ──────────────────────────────────
    if (levelState.phase === 'pos' && ballPos.x >= W3_GATE_X && ballVel.x > W3_MIN_ENTRY_V) {
        const dispX = ballPos.x - levelState.startX;
        const avgV  = (dispX / t).toFixed(2);
        levelState.phase     = 'wait2';
        levelState.posResult = { disp: dispX.toFixed(2), time: t.toFixed(2), avgV, speed: speed.toFixed(2) };
        w3VelArrow.visible   = false;
        tiltX = 0;
        showModal({
            badge: 'POSITIVE VELOCITY ✓',
            title: `v = Δx/t = +${dispX.toFixed(2)} / ${t.toFixed(2)} = +${avgV} m/s`,
            body: `You rolled RIGHT — displacement was POSITIVE.\n\nΔx = +${dispX.toFixed(2)} m  (rightward = positive)\nt  = ${t.toFixed(2)} s\nv  = Δx / t = +${avgV} m/s  → POSITIVE\n\nSpeed = ${speed.toFixed(2)} m/s  (positive, as always)\n\nNow the twist: what if you travel in a circle and return to where you started?\n\nGuess: what will average velocity be after a full lap?`,
            btnLabel: '③ Next — Circle lap',
            onBtn: () => {
                if (!w3CircleRing) {
                    w3CircleRing = w3MakeCircleRing();
                    scene.add(w3CircleRing);
                }
                w3CircleRing.visible = true;

                ballPos.set(W3_CIRCLE_R, BALL_RADIUS + 0.01, 0);
                ballVel.set(0, 0, 0);
                ballMesh.position.copy(ballPos);
                tiltX = 0; tiltZ = 0;

                levelState.phase           = 'circle';
                levelState.phaseTime       = 0;
                levelState.accAngle        = 0;
                levelState.lastAng         = Math.atan2(ballPos.z, ballPos.x);
                levelState.distTraveled    = 0;
                levelState.circleStartPos  = ballPos.clone();
                levelState.speedSum        = 0;
                levelState.speedN          = 0;
                setLevelHUD('W3 · VELOCITY',
                    '③ Roll a full lap around the PURPLE ring  (use all keys / tilt freely)',
                    0.68, 'dist: 0.0 m  |  |Δr|: 0.00 m  |  lap: 0%');
            }
        });
    }

    // ── Circle lap tracking ───────────────────────────────────────────
    if (levelState.phase === 'circle') {
        const curAng = Math.atan2(ballPos.z, ballPos.x);
        let dAng = curAng - levelState.lastAng;
        if (dAng >  Math.PI) dAng -= 2 * Math.PI;
        if (dAng < -Math.PI) dAng += 2 * Math.PI;

        const distFromCentre = Math.sqrt(ballPos.x * ballPos.x + ballPos.z * ballPos.z);
        if (distFromCentre > W3_CIRCLE_R * 0.4) levelState.accAngle += Math.abs(dAng);
        levelState.lastAng = curAng;

        // Accumulate distance and speed samples
        levelState.distTraveled = (levelState.distTraveled || 0) + speed * dt;
        if (speed > 0.1) { levelState.speedSum += speed; levelState.speedN += 1; }

        if (levelState.accAngle >= 2 * Math.PI) {
            levelState.phase = 'done';

            const sPos    = levelState.circleStartPos;
            const dispX   = ballPos.x - sPos.x;
            const dispZ   = ballPos.z - sPos.z;
            const dispMag = Math.sqrt(dispX * dispX + dispZ * dispZ);
            const avgVMag = (dispMag / t).toFixed(2);   // ≈ 0
            const avgSpeed = levelState.speedN > 0
                ? (levelState.speedSum / levelState.speedN).toFixed(2) : '—';
            const dist = levelState.distTraveled.toFixed(1);

            levelState.circleResult = { dispMag: dispMag.toFixed(2), avgVMag, avgSpeed, dist, time: t.toFixed(2) };
            w3VelArrow.visible = false;
            tiltX = 0; tiltZ = 0;
            w3Summary();
        }
    }
}

// All-three-runs summary using the v = Δx/t formula throughout
function w3Summary() {
    const n = levelState.negResult;
    const p = levelState.posResult;
    const c = levelState.circleResult;
    showModal({
        badge: 'ALL THREE RUNS COMPLETE',
        title: 'v = Δx / t  —  The Full Picture',
        body: `① LEFT:    Δx = ${n.disp} m,  t = ${n.time} s  →  v = ${n.avgV} m/s  ←\n② RIGHT:   Δx = +${p.disp} m,  t = ${p.time} s  →  v = +${p.avgV} m/s  →\n③ CIRCLE:  Δx ≈ ${c.dispMag} m,  t = ${c.time} s  →  v ≈ ${c.avgVMag} m/s  !\n           (distance = ${c.dist} m,  avg speed = ${c.avgSpeed} m/s)\n\nThe circle result is the key insight:\n  You moved ${c.dist} m — but ended near where you started.\n  Displacement ≈ 0  →  average velocity ≈ 0\n  Even though average speed = ${c.avgSpeed} m/s\n\n  Speed = distance / t   (always > 0)\n  Velocity = Δx / t      (zero if you return to start!)`,
        btnLabel: 'Quiz →',
        onBtn: () => w3Quiz()
    });
}

function w3Quiz() {
    showModal({
        badge: 'QUIZ · W3',
        title: 'A runner jogs 400 m around a track and returns to the start in 80 s. What is their average velocity?',
        body: 'Use v = Δx / t. Think about what displacement is after a full lap.',
        choices: [
            '5 m/s — distance (400 m) ÷ time (80 s)',
            '0 m/s — displacement is zero, so velocity is zero',
            '400 m/s — they covered a lot of ground'
        ],
        onChoice: (i) => {
            const ok = i === 1;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 1 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                'After a full lap the runner is back at the start — displacement = 0. So average velocity = 0/80 = 0 m/s. Average speed = 400/80 = 5 m/s. You just measured this yourself in the circle run!',
                () => w3Bonus()
            );
        }
    });
}

function w3Bonus() {
    showModal({
        badge: 'BONUS · W3',
        title: 'During your circle lap the pink arrow kept rotating. Does that mean velocity was changing?',
        body: 'Your speed stayed roughly constant — but watch what the formula says.',
        choices: [
            'No — speed was constant so velocity was constant',
            'Yes — direction kept changing, so Δx/t points a different way every instant',
            'Only if the radius of the circle changed'
        ],
        onChoice: (i) => {
            const ok = i === 1;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 1 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                'Velocity is a vector: v = Δx/t. Even at constant speed, the direction of Δx rotates continuously around the circle — so velocity is always changing. That changing velocity IS acceleration (centripetal). Speed constant ≠ velocity constant.',
                () => showLevelComplete(w3ClearVisuals, 4)
            );
        }
    });
}

/* ─── WORLD 4 · INCLINED RAMP  (a = Δv/Δt) ──────────────────────
   Platform physically tilts — gravity's slope component drives the ball.
   Ball ALWAYS starts from the high end (back / "A side").
   Angle label + arc indicator displayed beside the platform board.
   ---------------------------------------------------------------- */

// k = 2/5 for a solid uniform ball (I_cm = 2/5 · mR²)
// Rolling-without-slipping formula: a = g·sin(θ) / (1 + k) = 5g·sin(θ) / 7
const W4_K = 2 / 5;

const W4_RAMPS = [
    {
        label: 'GENTLE SLOPE', num: '①', angleDeg: 20,
        intro: 'Platform tilts to 20°. Ball rolls from the high (left) end without slipping.\nRotational inertia means it accelerates slower than a sliding block.\na = 5g·sin(20°)/7 ≈ 2.40 m/s²',
        slopeNote: 'Rolling ball: a = 5g·sin(θ)/7 — only 5/7 of the sliding-block value.\nThe other 2/7 of gravity\'s pull goes into spinning the ball.'
    },
    {
        label: 'STEEP SLOPE',  num: '②', angleDeg: 30,
        intro: '30°. sin(30°) = 0.5 exactly — clean numbers throughout.\na = 5 × 9.81 × 0.5 / 7 ≈ 3.50 m/s²\n\nCompare the v(t) slope to the 20° run.',
        slopeNote: 'Steeper angle → bigger sin(θ) → bigger acceleration.\nThe 5/7 factor is the same for every angle — it comes from the ball\'s shape, not the ramp.'
    },
    {
        label: 'SHARP SLOPE',  num: '③', angleDeg: 40,
        intro: '40° — much larger sin(θ), clearly faster roll.\na = 5g·sin(40°)/7 ≈ 4.50 m/s²\n\nWatch the v(t) chart — steepest line yet.',
        slopeNote: 'All three gave straight v(t) lines — constant acceleration throughout.\nSteeper ramp = larger sin(θ) = faster acceleration, always scaled by 5/7.'
    }
];

// ── Angle-arc indicator — X-Y plane, left-up / right-down tilt ────────
function w4MakeAngleArc(deg) {
    const group = new THREE.Group();
    const R   = 3.0;
    const rad = THREE.MathUtils.degToRad(deg);

    // Gray horizontal reference going LEFT (−X) — the ground level baseline
    const hPts = [new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(-(R + 0.5), 0.04, 0)];
    group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(hPts),
        new THREE.LineBasicMaterial({ color: 0x475569 })
    ));

    // Cyan ramp line: rotation.z = −θ  →  local −X in world = (−cosθ, sinθ, 0)
    // This goes up-left, matching the actual tilted platform surface
    const rPts = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-Math.cos(rad) * (R + 0.5), Math.sin(rad) * (R + 0.5), 0)
    ];
    group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(rPts),
        new THREE.LineBasicMaterial({ color: 0x22d3ee })
    ));

    // Yellow arc sweeping in X-Y plane from horizontal (a=0) up to ramp angle
    const arcR   = R * 0.58;
    const arcPts = [];
    for (let a = 0; a <= deg; a++) {
        const ar = THREE.MathUtils.degToRad(a);
        arcPts.push(new THREE.Vector3(-Math.cos(ar) * arcR, Math.sin(ar) * arcR, 0));
    }
    group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(arcPts),
        new THREE.LineBasicMaterial({ color: 0xfbbf24 })
    ));

    return group;
}

// ── Build / rebuild the angle arc for a given degree ─────────────────
function w4BuildVisuals(deg) {
    if (w4Group) { scene.remove(w4Group); w4Group = null; }
    w4Group = new THREE.Group();

    // Arc only — at the front-right corner (low/right end), visible from camera
    const arc = w4MakeAngleArc(deg);
    arc.position.set(PLATFORM_HALF - 2, 0, PLATFORM_HALF - 2);
    w4Group.add(arc);

    scene.add(w4Group);
}

// ── Ball starts from the HIGH (left) end of the tilted ramp ──────────
function w4PlaceBallOnRamp() {
    platformGroup.updateMatrixWorld(true);
    // Local −X is the left side; with rotation.z = −θ this becomes the HIGH end
    const topLocal = new THREE.Vector3(-9, BALL_RADIUS + 0.08, 0);
    ballPos.copy(platformGroup.localToWorld(topLocal));
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);
}

function w4SetRampAngle(deg) {
    // Negative rotation.z → left side rises, right side drops
    platformGroup.rotation.z = -THREE.MathUtils.degToRad(deg);
    platformGroup.updateMatrixWorld(true);
}

function w4ClearVisuals() {
    platformGroup.rotation.z = 0;
    platformGroup.updateMatrixWorld(true);
    tiltLocked = false;
    tiltX = 0; tiltZ = 0;
    paramsOverride = null;   // restore normal friction
    if (w4Group) { scene.remove(w4Group); w4Group = null; }
}

function startW4() {
    platformGroup.rotation.z = 0;
    tiltX = 0; tiltZ = 0;
    tiltLocked = true;   // gravity drives the ball — WASD/gyro locked out

    // Low friction so the ball slides cleanly on all ramps
    // Default mu=0.3 would stop the ball at angles below ~17°
    paramsOverride = { mass: 0.5, mu: 0.05, gx: 0, gy: -9.81, gz: 0, cd: 0, rho: 0 };

    levelState = {
        phase: 'intro', rIdx: 0, results: [],
        phaseTime: 0, prevSpeed: 0, aSmooth: 0
    };

    showModal({
        badge: 'WORLD 4 · INCLINED RAMP',
        title: 'a = g · sin(θ) / (1 + k)',
        body: 'A ball rolling WITHOUT SLIPPING down a ramp accelerates at:\n\n    a = g · sin(θ) / (1 + k)\n\nwhere  I_cm = k·mR²  is the moment of inertia.\nFor a solid uniform ball:  k = 2/5\n\nSo:  a = g · sin(θ) / (1 + 2/5)  =  5g · sin(θ) / 7\n\nThis is LESS than g·sin(θ) because part of gravity\'s pull\ngoes into spinning the ball instead of translating it.\n\nConstant slope → constant a → v(t) is a straight line.\nThe SLOPE of that line = Δv/Δt = acceleration.\n\nThree ramps — ball always starts from the high (left) end:\n  ① 20° gentle slope\n  ② 30° steep slope\n  ③ 40° sharp slope',
        btnLabel: '① Tilt to 20° →',
        onBtn: () => w4BeginRamp(0)
    });
}

function w4BeginRamp(idx) {
    const ramp = W4_RAMPS[idx];

    w4SetRampAngle(ramp.angleDeg);
    w4PlaceBallOnRamp();
    w4BuildVisuals(ramp.angleDeg);

    targetSpeed = 8;

    levelState.phase     = 'rolling';
    levelState.rIdx      = idx;
    levelState.phaseTime = 0;
    levelState.prevSpeed = 0;
    levelState.aSmooth   = 0;
    levelState.vStart    = 0;
    levelState.done      = false;

    const theoryA = (9.81 * Math.sin(THREE.MathUtils.degToRad(ramp.angleDeg)) / (1 + W4_K)).toFixed(2);
    showModal({
        badge: `RAMP ${idx + 1}/3 · ${ramp.label}  (${ramp.angleDeg}°)`,
        title: `θ = ${ramp.angleDeg}°  →  a = 5g·sin(${ramp.angleDeg}°)/7 ≈ ${theoryA} m/s²`,
        body: ramp.intro,
        btnLabel: 'Drop it! →',
        onBtn: () => { /* ball already on ramp — physics resumes automatically */ }
    });
}

function updateW4(dt) {
    if (!levelState || levelState.phase !== 'rolling' || levelState.done) return;

    const ramp = W4_RAMPS[levelState.rIdx];

    levelState.phaseTime += dt;

    // Project velocity onto the downhill slope direction (local +X in world space
    // when tilted with rotation.z = −θ).  This gives the true along-slope speed
    // rather than the full 3-D scalar speed which includes any lateral drift.
    const rad       = THREE.MathUtils.degToRad(ramp.angleDeg);
    const slopeHat  = new THREE.Vector3(Math.cos(rad), -Math.sin(rad), 0); // downhill world dir
    const vSlope    = ballVel.dot(slopeHat);   // signed speed along slope (+ = downhill)
    const speed     = Math.max(0, vSlope);     // only the downhill component

    // Smoothed live acceleration estimate (along slope only)
    const rawA = dt > 0 ? (speed - levelState.prevSpeed) / dt : 0;
    levelState.aSmooth   = 0.9 * levelState.aSmooth + 0.1 * rawA;
    levelState.prevSpeed = speed;

    const t = levelState.phaseTime;

    // Local position — used for progress bar and edge detection
    const localPos  = ballPos.clone().applyMatrix4(
        new THREE.Matrix4().copy(platformGroup.matrixWorld).invert()
    );
    const boardFrac = Math.min(1, (localPos.x + 9) / (PLATFORM_HALF - 1 + 9));
    const prog      = (levelState.rIdx + boardFrac) / 3;
    const theoryA   = 9.81 * Math.sin(rad) / (1 + W4_K);

    // Distance cross-check: Δx = ½·a·t² (local X travelled)
    const distLocal = localPos.x - (-9);  // metres from start along ramp
    setLevelHUD(
        `W4 · ${ramp.label}`,
        `Ball rolling down the ${ramp.angleDeg}° slope — watch the v(t) line rise`,
        Math.min(1, prog),
        `θ=${ramp.angleDeg}°  v=${speed.toFixed(2)} m/s  a≈${Math.abs(levelState.aSmooth).toFixed(2)} m/s²  Δx=${distLocal.toFixed(1)} m  theory=${theoryA.toFixed(2)} m/s²`
    );

    // Finish once the ball reaches the right edge of the board
    const finished = localPos.x >= PLATFORM_HALF - 1.0;

    if (finished) {
        levelState.done  = true;
        levelState.phase = 'between';
        tiltX = 0; tiltZ = 0;

        const vEnd      = speed;
        const elapsed   = Math.max(0.1, t);
        const measuredA = vEnd / elapsed;   // vStart = 0, so a = Δv/t

        // Cross-check distance: compare measured Δx to ½·a·t²
        const dxMeasured  = distLocal.toFixed(1);
        const dxFromKin   = (0.5 * measuredA * elapsed * elapsed).toFixed(1);

        levelState.results.push({
            label:      ramp.label,
            deg:        ramp.angleDeg,
            vEnd:       vEnd.toFixed(2),
            t:          elapsed.toFixed(2),
            a:          measuredA.toFixed(2),
            theory:     theoryA.toFixed(2),
            dxMeasured,
            dxFromKin
        });

        w4ShowResult(levelState.rIdx, measuredA, ramp);
    }
}

function w4ShowResult(idx, a, ramp) {
    const r      = levelState.results[idx];
    const isLast = idx + 1 >= W4_RAMPS.length;
    const nextR  = !isLast ? W4_RAMPS[idx + 1] : null;

    showModal({
        badge: `${ramp.num} ${ramp.label} COMPLETE`,
        title: `a = Δv/Δt = ${r.vEnd} / ${r.t} s = ${r.a} m/s²`,
        body: `Measured:\n  vStart = 0,  vEnd = ${r.vEnd} m/s,  t = ${r.t} s\n  a = Δv/Δt = ${r.vEnd} / ${r.t} = ${r.a} m/s²\n\nDistance cross-check:\n  Δx measured along ramp = ${r.dxMeasured} m\n  Δx from kinematics ½·a·t² = ${r.dxFromKin} m\n\nTheory  (rolling without slipping, k = 2/5):\n  a = 5 × 9.81 × sin(${r.deg}°) / 7 = ${r.theory} m/s²\n\n${ramp.slopeNote}`,
        btnLabel: isLast ? 'Summary →' : `${nextR.num} ${nextR.label} (${nextR.angleDeg}°) →`,
        onBtn: () => {
            if (isLast) {
                platformGroup.rotation.z = 0;
                platformGroup.updateMatrixWorld(true);
                if (w4Group) { scene.remove(w4Group); w4Group = null; }
                targetSpeed = 0;
                w4Summary();
            } else {
                w4BeginRamp(idx + 1);
            }
        }
    });
}

function w4Summary() {
    const r = levelState.results;
    const rows = r.map((ri, i) =>
        `${W4_RAMPS[i].num} ${ri.label} (${ri.deg}°):  a = ${ri.a} m/s²  (theory ${ri.theory} m/s²)`
    ).join('\n');
    showModal({
        badge: 'ALL THREE RAMPS COMPLETE',
        title: 'a = 5g · sin(θ) / 7  =  Δv/Δt',
        body: `${rows}\n\nAll three gave straight v(t) lines — constant acceleration throughout.\nSteeper angle → bigger sin(θ) → faster acceleration.\n\nThe 5/7 factor comes from rolling without slipping:\n  Part of gravity accelerates the ball forward (translation).\n  Part spins it (rotation). The 2/5 moment of inertia splits it.\n\nA sliding block (no spin) would reach a = g·sin(θ) — faster.\nA rolling ball always lags behind by the factor 1/(1 + k) = 5/7.`,
        btnLabel: 'Quiz →',
        onBtn: () => w4Quiz()
    });
}

function w4Quiz() {
    showModal({
        badge: 'QUIZ · W4',
        title: 'A solid ball and a hollow ball roll down the same ramp. Which reaches the bottom first?',
        body: 'Both have the same mass and radius. Use:  a = g·sin(θ) / (1 + k)\n\nSolid ball:  k = 2/5\nHollow ball: k = 2/3',
        choices: [
            'The hollow ball — its mass is distributed farther from the centre',
            'The solid ball — it has a smaller k so a larger acceleration',
            'They tie — same mass, same ramp, same angle'
        ],
        onChoice: (i) => {
            const ok = i === 1;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 1 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                'Solid ball: a = g·sin(θ)/(1 + 2/5) = 5g·sin(θ)/7 ≈ 0.714·g·sin(θ)\nHollow ball: a = g·sin(θ)/(1 + 2/3) = 3g·sin(θ)/5 = 0.600·g·sin(θ)\n\nThe solid ball wins every time — less rotational inertia means more of gravity\'s pull goes into forward motion. Shape matters more than mass!',
                () => w4Bonus()
            );
        }
    });
}

function w4Bonus() {
    showModal({
        badge: 'BONUS · W4',
        title: 'Why does a rolling ball accelerate slower than a sliding block on the same ramp?',
        body: 'A sliding block: all of g·sin(θ) goes into translation.\nA rolling ball: gravity must also spin the ball.',
        choices: [
            'The ball is heavier because it is spinning',
            'Some of gravity\'s force is "used up" giving the ball rotational kinetic energy',
            'Friction slows the rolling ball more than the sliding block'
        ],
        onChoice: (i) => {
            const ok = i === 1;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 1 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                'Energy is conserved. At the bottom, a rolling ball has both translational KE (½mv²) AND rotational KE (½Iω²). With the same height drop, the rolling ball\'s v is lower because some energy went into spin. This is why a = g·sin(θ)/(1 + k) — the (1+k) denominator accounts for the rotational energy share.',
                () => showLevelComplete(w4ClearVisuals, 5)
            );
        }
    });
}

/* ─── WORLD 5 · DROP TOWER (Free Fall — Measuring g) ────────────
   The student selects a height, predicts fall time using d=½gt²,
   drops the ball, then plots all their (t², h) points to extract g.
   ---------------------------------------------------------------- */

//canvas-textured sprite used for "1 m" / "2 m" / etc. floating labels on each pad
function w5MakeLabelSprite(text, hex = '#fbbf24') {
    const canvas = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    //dark slate background with colored border
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = hex;
    ctx.lineWidth   = 6;
    ctx.strokeRect(3, 3, 250, 122);

    //big monospace height text
    ctx.fillStyle    = hex;
    ctx.font         = 'bold 72px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(1.6, 0.8, 1);
    return spr;
}

//lazy-creates the labelled launch pads and the shared elevator disc
function w5EnsureVisuals() {
    if (!w5TowerGroup) w5TowerGroup = new THREE.Group();
    w5TowerGroup.visible = true;
    if (!w5TowerGroup.parent) scene.add(w5TowerGroup);

    //build pads the first time only
    if (w5LaunchPads.length === 0) {
        const n = W5_HEIGHTS.length;
        W5_HEIGHTS.forEach((h, i) => {
            // Row of pads across the front half of the board (all at positive Z, fully visible)
            const x = (i / (n - 1) - 0.5) * 20;  // spread from x=-10 to x=10
            const z = 6;                            // front half of platform, near camera

            //flat glowing disc on the floor
            const padGeo = new THREE.CylinderGeometry(W5_PAD_RADIUS, W5_PAD_RADIUS, 0.04, 32);
            const padMat = new THREE.MeshStandardMaterial({
                color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.35,
                transparent: true, opacity: 0.75, metalness: 0.2, roughness: 0.5
            });
            const padMesh = new THREE.Mesh(padGeo, padMat);
            padMesh.position.set(x, 0.02, z);
            w5TowerGroup.add(padMesh);

            //floating "N m" label just above the pad
            const label = w5MakeLabelSprite(`${h} m`, '#22d3ee');
            label.position.set(x, 1.3, z);
            w5TowerGroup.add(label);

            //thin guide wire showing the drop column (scaled to h) so student sees "how tall"
            const wireGeo = new THREE.CylinderGeometry(0.03, 0.03, h, 6);
            const wireMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.3 });
            const wire    = new THREE.Mesh(wireGeo, wireMat);
            wire.position.set(x, h / 2, z);
            w5TowerGroup.add(wire);

            w5LaunchPads.push({ h, mesh: padMesh, label, wire, pos: { x, z } });
        });
    }

    //reveal all pad props
    w5LaunchPads.forEach(p => {
        p.mesh.visible  = true;
        p.label.visible = true;
        p.wire.visible  = true;
    });

    //elevator: gold glowing disc that carries the ball up the drop column
    if (!w5Elevator) {
        const elGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.1, 32);
        const elMat = new THREE.MeshStandardMaterial({
            color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.8,
            metalness: 0.4, roughness: 0.3
        });
        w5Elevator = new THREE.Mesh(elGeo, elMat);
        scene.add(w5Elevator);
    }
    w5Elevator.visible = false; //only shown during the ride
}

//helper — paint pad visuals based on completion and which pad (if any) the ball is dwelling on
function w5PaintPads(hoveredPad, dwellProgress = 0) {
    w5LaunchPads.forEach(pad => {
        const done     = !!w5TrialLog.find(r => r.h === pad.h);
        const hovering = pad === hoveredPad;
        let hex, opac, emi;
        if (done) {
            hex = 0x334155; opac = 0.25; emi = 0.1;
        } else if (hovering) {
            //lerp cyan → gold as dwell progress fills
            const mix = Math.min(1, dwellProgress);
            hex = mix < 0.5 ? 0x22d3ee : 0xfbbf24;
            opac = 0.55 + mix * 0.4;
            emi  = 0.4 + mix * 1.0;
        } else {
            hex = 0x22d3ee; opac = 0.75; emi = 0.35;
        }
        pad.mesh.material.color.setHex(hex);
        pad.mesh.material.opacity = opac;
        pad.mesh.material.emissiveIntensity = emi;
        pad.mesh.material.emissive.setHex(hex === 0x334155 ? 0x0f172a : hex);
    });
}

//hide tower without disposing GPU objects
function w5ClearVisuals() {
    if (w5TowerGroup) w5TowerGroup.visible = false;
    if (w5Elevator)   w5Elevator.visible   = false;
    w5LaunchPads.forEach(p => {
        if (p.mesh)  p.mesh.visible  = false;
        if (p.label) p.label.visible = false;
        if (p.wire)  p.wire.visible  = false;
    });
    w5ActivePad  = null;
    w5PadDwellT  = 0;
    w5Falling    = false;
    tiltLocked   = false;
    paramsOverride = null;
    if (w5ScatterChart) { w5ScatterChart.destroy(); w5ScatterChart = null; }
}

//entry point — builds pads, shows intro modal, then unlocks roll-to-pick mode
function startW5() {
    w5TrialLog     = [];
    w5Falling      = false;
    w5ActivePad    = null;
    w5PadDwellT    = 0;
    w5AccelDisplay = 9.81;
    w5EnsureVisuals();

    //brief freeze until the student dismisses the intro
    paramsOverride = { mass: 1.0, mu: 0, gx: 0, gy: 0, gz: 0, cd: 0, rho: 0 };
    tiltLocked = true;
    tiltX = 0; tiltZ = 0;
    levelState = { phase: 'intro' };

    showModal({
        badge: 'WORLD 5 · DROP TOWER',
        title: 'Free Fall — Measure g',
        body: "You're about to become an experimental physicist.\n\nRoll onto a LAUNCH PAD — each one is labelled with a drop height.\nStay on the pad for a moment to lock in your choice.\n\nThe elevator rises, you predict the fall time, then the ball drops.\nDo all five heights to plot h vs t² and measure Earth's gravity.",
        btnLabel: 'Start Rolling',
        onBtn: () => { w5PickHeight(); }
    });
}

//enter roll-to-pick mode: tilt unlocked, normal physics, student drives the ball onto a labelled pad
function w5PickHeight() {
    const remaining = W5_HEIGHTS.filter(h => !w5TrialLog.find(r => r.h === h));
    if (remaining.length === 0) { w5ShowScatter(); return; }

    //normal gameplay physics — student's own slider values, WASD/gyro enabled
    paramsOverride = null;
    tiltLocked     = false;

    //ball starts at center of platform so every pad is equally reachable
    if (w5Elevator) w5Elevator.visible = false;
    ballPos.set(0, BALL_RADIUS + 0.01, 0);
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);

    w5ActivePad  = null;
    w5PadDwellT  = 0;
    w5PaintPads(null, 0);

    levelState = { phase: 'picking' };

    setLevelHUD(
        'W5 · DROP TOWER',
        'Roll onto a labelled launch pad — hold to commit',
        w5TrialLog.length / W5_HEIGHTS.length,
        `${w5TrialLog.length} / ${W5_HEIGHTS.length} heights completed`
    );
}

//animate the elevator (and ball riding on top of it) from ground up to height h at pad (padX, padZ)
function w5RideElevator(h, padX = 0, padZ = 0) {
    //suppress gravity so our manual ballPos updates aren't fought by the integrator
    paramsOverride = { mass: 1.0, mu: 0, gx: 0, gy: 0, gz: 0, cd: 0, rho: 0 };
    tiltLocked = true;
    tiltX = 0; tiltZ = 0;

    //park the elevator directly under the ball at the chosen pad
    if (w5Elevator) {
        w5Elevator.position.set(padX, 0.05, padZ);
        w5Elevator.visible = true;
    }
    ballPos.set(padX, 0.1 + BALL_RADIUS, padZ);
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);

    const duration = 1.2 + h * 0.08;   //taller ride = longer animation (1.28s .. 2.0s)
    levelState = {
        phase: 'elevating',
        h, padX, padZ,
        startT: performance.now() / 1000,
        duration
    };

    if (navigator.vibrate) navigator.vibrate(15); //soft "elevator starting" buzz

    setLevelHUD(
        'W5 · DROP TOWER',
        `Elevator ascending to ${h} m…`,
        0,
        `Hold on — preparing drop from ${h} m`
    );
}

//pre-position (visual only — elevator already put the ball there) then ask for a prediction
function w5Predict(h, padX = 0, padZ = 0) {
    const tTrue = Math.sqrt(2 * h / W5_G_ACCEPTED);

    //four shuffled options: correct × 1.0, plus ×0.5, ×0.75, ×1.45 (common errors)
    const mults = [0.5, 0.75, 1.0, 1.45].sort(() => Math.random() - 0.5);
    const opts  = mults.map(m => Math.max(0.05, tTrue * m));
    const ci    = mults.indexOf(1.0); //correct index after shuffle

    showModal({
        badge: 'PREDICT',
        title: `Drop from ${h} m — how long until impact?`,
        body: `Formula:  d = ½g t²   →   t = √(2d / g)\n\ng ≈ 9.81 m/s²,   d = ${h} m`,
        choices: opts.map(t => `${t.toFixed(2)} s`),
        onChoice: (i) => {
            const ok = i === ci;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === ci ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                `t = √(2 × ${h} / 9.81) = ${tTrue.toFixed(3)} s.  Now watch the real drop.`,
                () => { w5RunDrop(h, opts[i], padX, padZ); }
            );
        }
    });
}

//arm the drop: hide elevator, restore gravity, place ball, fire release vibration
function w5RunDrop(h, tPred, padX = 0, padZ = 0) {
    levelState     = { phase: 'dropping', h, tPred, padX, padZ };
    w5Falling      = true;
    w5FallStart    = performance.now() / 1000;
    w5AccelDisplay = 9.81;

    //restore real gravity now that the ride is over
    paramsOverride = { mass: 1.0, mu: 0, gx: 0, gy: -W5_G_ACCEPTED, gz: 0, cd: 0, rho: 0 };

    //elevator drops out from under the ball
    if (w5Elevator) w5Elevator.visible = false;

    ballPos.set(padX, h + BALL_RADIUS, padZ);
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);

    if (navigator.vibrate) navigator.vibrate(40); //release buzz

    const mobileHint = controlMethod === 'mobile' ? 'Try dropping your phone!' : 'Timing fall…';
    const phoneStr   = controlMethod === 'mobile' ? `  ·  PHONE: ${phoneAccelMag.toFixed(2)} m/s²` : '';
    setLevelHUD(
        'W5 · DROP TOWER',
        `Dropped from ${h} m — ${mobileHint}`,
        0,
        `SIM: 9.81 m/s²${phoneStr}  ·  t = 0.000 s`
    );
}

//called every frame while W5 is active — drives pick / elevator ride / drop
function w5UpdateVisuals(dt) {
    if (!levelState) return;

    //pick mode: student rolls onto a labelled pad to choose a height
    if (levelState.phase === 'picking') {
        //find the closest pad the ball is inside (if any) — skip already-completed pads
        let hovered = null;
        for (const pad of w5LaunchPads) {
            if (w5TrialLog.find(r => r.h === pad.h)) continue;
            const dx = ballPos.x - pad.pos.x;
            const dz = ballPos.z - pad.pos.z;
            if (Math.hypot(dx, dz) < W5_PAD_RADIUS) { hovered = pad; break; }
        }

        //changed pads? reset dwell timer
        if (hovered !== w5ActivePad) {
            w5ActivePad = hovered;
            w5PadDwellT = 0;
        }

        //slow rolls commit, fast rolls don't — prevents flyby selections
        const slow = ballVel.length() < 3.0;
        if (hovered && slow) {
            w5PadDwellT += dt;
        } else if (hovered && !slow) {
            w5PadDwellT = Math.max(0, w5PadDwellT - dt * 2);
        }

        const dwellProg = w5PadDwellT / W5_PAD_DWELL;
        w5PaintPads(hovered, dwellProg);

        if (hovered) {
            setLevelHUD(
                'W5 · DROP TOWER',
                `Holding on ${hovered.h} m pad — ${slow ? 'steady…' : 'slow down!'}`,
                Math.min(1, dwellProg),
                `${w5TrialLog.length} / ${W5_HEIGHTS.length} heights completed`
            );
        } else {
            setLevelHUD(
                'W5 · DROP TOWER',
                'Roll onto a labelled launch pad — hold to commit',
                w5TrialLog.length / W5_HEIGHTS.length,
                `${w5TrialLog.length} / ${W5_HEIGHTS.length} heights completed`
            );
        }

        //commit once dwell target reached
        if (hovered && w5PadDwellT >= W5_PAD_DWELL) {
            if (navigator.vibrate) navigator.vibrate(30);
            const h = hovered.h, px = hovered.pos.x, pz = hovered.pos.z;
            w5ActivePad = null;
            w5PadDwellT = 0;
            w5RideElevator(h, px, pz);
        }
        return;
    }

    //elevator ride: ease ball + platform from ground up to target height
    if (levelState.phase === 'elevating') {
        const t    = (performance.now() / 1000 - levelState.startT) / levelState.duration;
        const tc   = Math.min(1, Math.max(0, t));
        const ease = tc * tc * (3 - 2 * tc);    //smoothstep for soft start/stop
        const y    = ease * levelState.h;
        const px   = levelState.padX, pz = levelState.padZ;

        if (w5Elevator) w5Elevator.position.set(px, y + 0.05, pz);
        ballPos.set(px, y + 0.1 + BALL_RADIUS, pz);
        ballVel.set(0, 0, 0);
        ballMesh.position.copy(ballPos);

        setLevelHUD(
            'W5 · DROP TOWER',
            `Elevator ascending to ${levelState.h} m…`,
            tc,
            `y = ${y.toFixed(2)} m  ·  arriving in ${((1 - tc) * levelState.duration).toFixed(1)} s`
        );

        //arrived — hand off to the prediction modal
        if (tc >= 1) {
            levelState.phase = 'arrived';
            if (navigator.vibrate) navigator.vibrate([0, 20, 40, 20]); //ping-ping "arrived"
            w5Predict(levelState.h, px, pz);
        }
        return;
    }

    if (!w5Falling || levelState.phase !== 'dropping') return;

    const elapsed = performance.now() / 1000 - w5FallStart;

    //virtual accelerometer: real phone in freefall reads ≈ 0 (weightlessness)
    w5AccelDisplay = THREE.MathUtils.lerp(w5AccelDisplay, 0.0, Math.min(1, dt * 5));

    const tExpected  = Math.sqrt(2 * levelState.h / W5_G_ACCEPTED);
    const phoneStr   = controlMethod === 'mobile'
        ? `  ·  PHONE: ${phoneAccelMag.toFixed(2)} m/s²`
        : '';
    setLevelHUD(
        'W5 · DROP TOWER',
        `Falling from ${levelState.h} m…`,
        Math.min(1, elapsed / tExpected),
        `SIM: ${w5AccelDisplay.toFixed(2)} m/s²${phoneStr}  ·  t = ${elapsed.toFixed(3)} s`
    );

    //landing: ball reaches ground level (within 2 cm tolerance for bouncing)
    if (elapsed > 0.1 && ballPos.y <= BALL_RADIUS + 0.02) {
        w5OnLand(elapsed);
    }
}

//game-loop hook
function updateW5(dt) { w5UpdateVisuals(dt); }

//process impact: vibrate, log trial, show result modal
function w5OnLand(tMeas) {
    w5Falling      = false;  //disarm before modal so no re-trigger on bounce
    w5AccelDisplay = 9.81;

    if (navigator.vibrate) navigator.vibrate([0, 30, 100]); //impact bump

    const h         = levelState.h;
    const tPred     = levelState.tPred;
    const tExpected = Math.sqrt(2 * h / W5_G_ACCEPTED);
    const gImplied  = 2 * h / (tMeas * tMeas);
    const pctErr    = Math.abs(gImplied - W5_G_ACCEPTED) / W5_G_ACCEPTED * 100;

    w5TrialLog.push({ h, tPred, tMeas, gImplied });

    const allDone = w5TrialLog.length >= W5_HEIGHTS.length;

    showModal({
        badge: 'IMPACT',
        title: `${h} m  →  ${tMeas.toFixed(3)} s`,
        body: `Your prediction:    ${tPred.toFixed(2)} s\nTheory (d=½gt²):   ${tExpected.toFixed(3)} s\nMeasured:          ${tMeas.toFixed(3)} s\n\nImplied g = 2h / t² = ${gImplied.toFixed(3)} m/s²\nAccepted:  9.81 m/s²  (${pctErr.toFixed(1)}% error)`,
        btnLabel: allDone ? 'Plot My Data' : 'Next Height',
        onBtn: () => {
            if (allDone) w5ShowScatter();
            else w5PickHeight();
        }
    });
}

//scatter plot of student's own (t², h) data + best-fit line → displays measured g
function w5ShowScatter() {
    //best-fit through origin: h = (g/2)·t²   so slope = g/2
    const pts   = w5TrialLog.map(r => ({ x: r.tMeas * r.tMeas, y: r.h }));
    const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0);
    const slope     = sumXY / sumX2;
    const gMeasured = 2 * slope;
    const pctErr    = Math.abs(gMeasured - W5_G_ACCEPTED) / W5_G_ACCEPTED * 100;

    const maxX    = Math.max(...pts.map(p => p.x)) * 1.15;
    const fitLine = [{ x: 0, y: 0 }, { x: maxX, y: slope * maxX }];

    showModal({
        badge: 'YOUR GRAPH',
        title: `Your g = ${gMeasured.toFixed(2)} m/s²`,
        body: `Accepted: 9.81 m/s²   ·   Error: ${pctErr.toFixed(1)}%\n\nSlope of h vs t² = ${slope.toFixed(3)}\ng = 2 × slope = ${gMeasured.toFixed(2)} m/s²\n\nYou just measured Earth's gravity with a timer.`,
        btnLabel: 'Done',
        onBtn: () => showLevelComplete(w5ClearVisuals, 6)
    });

    //inject the scatter chart into the modal body once it's in the DOM
    setTimeout(() => {
        const bodyEl = document.getElementById('bm-body');
        if (!bodyEl) return;

        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'width:100%;height:180px;margin-top:14px;display:block;';
        bodyEl.appendChild(canvas);

        if (w5ScatterChart) { w5ScatterChart.destroy(); w5ScatterChart = null; }
        w5ScatterChart = new Chart(canvas.getContext('2d'), {
            data: {
                datasets: [
                    {
                        type: 'scatter',
                        label: 'Your drops',
                        data: pts,
                        backgroundColor: '#4ade80',
                        pointRadius: 7,
                        pointHoverRadius: 9
                    },
                    {
                        type: 'line',
                        label: `Best fit  g = ${gMeasured.toFixed(2)} m/s²`,
                        data: fitLine,
                        borderColor: '#fbbf24',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    x: {
                        title: { display: true, text: 't²  (s²)', color: '#94a3b8', font: { size: 10 } },
                        ticks: { color: '#94a3b8', font: { size: 9 } },
                        grid:  { color: '#1e293b' },
                        min: 0
                    },
                    y: {
                        title: { display: true, text: 'h  (m)', color: '#94a3b8', font: { size: 10 } },
                        ticks: { color: '#94a3b8', font: { size: 9 } },
                        grid:  { color: '#1e293b' },
                        min: 0
                    }
                },
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 } }
                }
            }
        });
    }, 50);
}

/* ─── WORLD 6 · SANDBOX — Endless random challenges ─── */

// W6 challenge state (module-level so updateW6 can read it each frame)
let w6Score        = 0;
let w6Challenge    = null;   // current challenge object
let w6TargetRing   = null;   // Three.js ring mesh — landing target
let w6StartSquare  = null;   // Three.js Line mesh — launch zone outline
let w6WasOnSurface = true;   // onSurface value from the previous frame
let w6Busy         = false;  // true while a setTimeout is pending (prevents double-fire)

// ── helpers ──────────────────────────────────────────────────────────────────

function w6EnsureGroup() {
    if (!w6Group) { w6Group = new THREE.Group(); scene.add(w6Group); }
    w6Group.visible = true;
}

function w6ClearMesh(ref) {
    if (ref) {
        if (w6Group) w6Group.remove(ref);
        ref.geometry.dispose();
        ref.material.dispose();
    }
}

function w6ClearRing()   { w6ClearMesh(w6TargetRing);  w6TargetRing  = null; }
function w6ClearSquare() { w6ClearMesh(w6StartSquare); w6StartSquare = null; }

function w6MakeRing(tx, tz, radius, color) {
    w6EnsureGroup();
    const geo  = new THREE.RingGeometry(radius - 0.22, radius, 64);
    const mat  = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(tx, 0.06, tz);
    w6Group.add(ring);
    return ring;
}

// Glowing square outline (LineLoop) flat on the platform — marks the launch zone
function w6MakeStartSquare(cx, cz, half, color) {
    w6EnsureGroup();
    const pts = [
        new THREE.Vector3(-half, 0.07, -half),
        new THREE.Vector3( half, 0.07, -half),
        new THREE.Vector3( half, 0.07,  half),
        new THREE.Vector3(-half, 0.07,  half),
        new THREE.Vector3(-half, 0.07, -half),  // close it
    ];
    const geo  = new THREE.BufferGeometry().setFromPoints(pts);
    const mat  = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    line.position.set(cx, 0, cz);
    w6Group.add(line);
    return line;
}

// ── clear everything when leaving W6 ─────────────────────────────────────────

function w6ClearVisuals() {
    if (w6Group) w6Group.visible = false;
    w6ClearRing();
    w6ClearSquare();
    tiltLocked     = false;
    paramsOverride = null;
    w6Scenario     = null;
    w6Challenge    = null;
    w6Busy         = false;
}

// ── challenge generation ──────────────────────────────────────────────────────

function w6GenChallenge() {
    if (currentLevel !== 6) return;
    w6ClearRing();
    w6ClearSquare();
    w6Busy = false;

    const types = ['jump', 'bounce', 'height', 'speed'];
    const type  = types[Math.floor(Math.random() * types.length)];
    const c     = { type };

    if (type === 'jump') {
        // Start square — random position on the board (avoid centre & edges)
        const sa  = Math.random() * Math.PI * 2;
        const sd  = 4 + Math.random() * 5;
        c.sx      = Math.cos(sa) * sd;
        c.sz      = Math.sin(sa) * sd;
        c.sHalf   = 1.8;   // half-size of the launch square

        // Target ring — at least 5 m away from start, clamped inside the board
        const ta  = sa + Math.PI * (0.4 + Math.random() * 0.8);  // roughly across
        const td  = 5 + Math.random() * 5;
        c.tx      = Math.max(-10, Math.min(10, Math.cos(ta) * td));
        c.tz      = Math.max(-10, Math.min(10, Math.sin(ta) * td));
        c.radius  = 2.2;
        c.phase   = 'approach';   // approach → ready → airborne → (success / retry)

        w6StartSquare = w6MakeStartSquare(c.sx, c.sz, c.sHalf, 0xfbbf24);  // yellow
        w6TargetRing  = w6MakeRing(c.tx, c.tz, c.radius, 0xf97316);        // orange
        c.desc = '🟡 GET TO THE YELLOW SQUARE\nThen JUMP to the orange ring!';

    } else if (type === 'bounce') {
        c.target     = Math.floor(Math.random() * 4) + 2;  // 2–5 bounces
        c.count      = 0;
        c.active     = false;
        c.settleTimer = 0;
        w6TargetRing = w6MakeRing(0, 0, 1.6, 0x22d3ee);
        c.desc = `🏀 BOUNCE ${c.target} TIMES\nStand on the ring, press Space — bounce exactly ${c.target} times!`;

    } else if (type === 'height') {
        c.target = Math.floor(Math.random() * 4) + 2;  // 2–5 m
        c.maxH   = 0;
        c.active = false;
        w6TargetRing = w6MakeRing(0, 0, 1.6, 0xa78bfa);
        c.desc = `🚀 REACH ${c.target} m HIGH\nAdjust bounciness & gravity, then jump!`;

    } else {  // speed
        c.dir         = Math.random() < 0.5 ? 'over' : 'under';
        // "over" picks a modest threshold (easy to exceed); "under" picks a low cap
        c.targetSpeed = c.dir === 'over'
            ? parseFloat((Math.random() * 4 + 1).toFixed(1))    // 1–5 m/s — roll faster than this
            : parseFloat((Math.random() * 3 + 1).toFixed(1));   // 1–4 m/s — stay slower than this
        c.holdTimer   = 0;
        targetSpeed   = c.targetSpeed;
        const el = document.getElementById('target-val');
        if (el) el.textContent = c.targetSpeed.toFixed(1) + ' m/s';
        c.desc = c.dir === 'over'
            ? `⚡ GO FAST!\nHold OVER ${c.targetSpeed.toFixed(1)} m/s for 3 seconds!`
            : `🐢 GO SLOW!\nHold UNDER ${c.targetSpeed.toFixed(1)} m/s for 3 seconds!`;
        document.getElementById('match-hud').classList.remove('hidden');
    }

    if (type !== 'speed') document.getElementById('match-hud').classList.add('hidden');

    w6Challenge    = c;
    w6WasOnSurface = onSurface;
    setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`, c.desc, 0, '');
}

// ── outcome helpers ───────────────────────────────────────────────────────────

function w6OnSuccess(msg) {
    if (w6Busy) return;
    w6Busy = true;
    w6Score++;
    w6ClearRing();
    w6ClearSquare();
    w6Challenge = null;
    setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`, `✅ ${msg}`, 1, 'Next challenge in 2 s…');
    setTimeout(w6GenChallenge, 2000);
}

function w6OnFail(msg) {
    if (w6Busy) return;
    w6Busy = true;
    const c = w6Challenge;
    setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`, `❌ ${msg}`, 0, 'Try again!');
    // Reset only the active-tracking fields so the player retries same challenge
    setTimeout(() => {
        w6Busy = false;
        if (currentLevel !== 6 || !c) return;
        if (c.type === 'bounce') { c.active = false; c.count = 0; c.settleTimer = 0; }
        if (c.type === 'height') { c.active = false; c.maxH = 0; }
        // jump: phase is already reset to 'approach' inside the update block
        setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`, c.desc, 0, '');
    }, 2200);
}

// ── entry point ───────────────────────────────────────────────────────────────

function startW6() {
    w6ClearVisuals();
    paramsOverride = null;
    tiltLocked     = false;
    w6Score        = 0;
    w6Challenge    = null;
    levelState     = { phase: 'sandbox' };

    document.getElementById('hud-left').classList.remove('hidden');
    document.getElementById('match-hud').classList.add('hidden');
    document.getElementById('level-hud').classList.remove('hidden');

    showModal({
        badge: 'W6 · SANDBOX',
        title: 'Endless Sandbox Challenges',
        body: 'Random challenges keep coming — score as many as you can!\n\n🟡 Get to the yellow square, then JUMP to the orange ring\n🏀 Bounce exactly N times from one jump\n🚀 Jump and reach a target height\n⚡ Hold a speed over / under a target for 3 s\n\nTweak friction, bounciness, gravity — anything goes!',
        choices: [],
        btnLabel: "LET'S GO!",
        onBtn: () => { w6GenChallenge(); }
    });
}

// ── per-frame update ──────────────────────────────────────────────────────────

function updateW6(dt) {
    const c = w6Challenge;
    if (!c || w6Busy) return;

    const wasOn     = w6WasOnSurface;
    w6WasOnSurface  = onSurface;
    const justLanded = !wasOn && onSurface;
    const justLeft   = wasOn && !onSurface;

    // ── 🟡→🎯 JUMP ──
    if (c.type === 'jump') {
        const t = performance.now();

        // Pulse both visuals
        if (w6TargetRing)  w6TargetRing.material.opacity  = 0.65 + 0.35 * Math.sin(t / 280);
        if (w6StartSquare) {
            // Pulse yellow→white when ball is inside the square
            const inSquare = Math.abs(ballPos.x - c.sx) < c.sHalf && Math.abs(ballPos.z - c.sz) < c.sHalf;
            w6StartSquare.material.color.set(inSquare ? 0xffffff : 0xfbbf24);
        }

        if (c.phase === 'approach') {
            // Check if ball is inside the launch square
            const inSq = Math.abs(ballPos.x - c.sx) < c.sHalf && Math.abs(ballPos.z - c.sz) < c.sHalf;
            if (inSq && onSurface) {
                c.phase = 'ready';
                setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`,
                            '✅ In position! Now JUMP to the orange ring!', 0.5, 'Hold Space to charge ↑');
            } else {
                const dSq = Math.hypot(ballPos.x - c.sx, ballPos.z - c.sz);
                setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`, c.desc, 0,
                            `${dSq.toFixed(1)} m to start`);
            }
        }

        if (c.phase === 'ready') {
            // Still inside square?
            const inSq = Math.abs(ballPos.x - c.sx) < c.sHalf && Math.abs(ballPos.z - c.sz) < c.sHalf;
            if (!inSq && onSurface) {
                // Rolled out without jumping — go back to approach
                c.phase = 'approach';
            }
            if (justLeft) {
                // Left the surface while inside (or just outside) the start zone — track landing
                c.phase = 'airborne';
            }
        }

        if (c.phase === 'airborne') {
            setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`, '🎯 LAND ON THE RING!', 1, 'airborne…');
            if (justLanded) {
                const dist = Math.hypot(ballPos.x - c.tx, ballPos.z - c.tz);
                if (dist < c.radius) {
                    w6OnSuccess('PERFECT JUMP LANDING! 🎯');
                } else {
                    w6OnFail(`Missed by ${dist.toFixed(1)} m — get to the square and try again!`);
                    c.phase = 'approach';
                }
            }
        }
    }

    // ── 🏀 BOUNCE ──
    if (c.type === 'bounce') {
        if (w6TargetRing) {
            w6TargetRing.material.opacity = 0.5 + 0.5 * Math.sin(performance.now() / 350);
        }
        // Activate on the first time ball leaves the surface
        if (justLeft && !c.active) { c.active = true; c.count = 0; c.settleTimer = 0; c.airborneT = 0; }

        if (c.active) {
            if (!onSurface) c.airborneT = (c.airborneT || 0) + dt;
            if (justLanded) {
                // Only count if the ball was truly airborne (> 80 ms) — filters micro-hops
                if ((c.airborneT || 0) > 0.08) { c.count++; }
                c.airborneT  = 0;
                c.settleTimer = 0;
            }

            // Settle = ball is on surface with near-zero vertical velocity (no more bouncing).
            // Use ballVel.y instead of total speed so a rolling ball still counts as settled.
            const vertSpd = Math.abs(ballVel.y);
            if (onSurface && vertSpd < 0.25 && c.count > 0) c.settleTimer += dt;
            else c.settleTimer = 0;

            setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`,
                        `Bounces: ${c.count}  /  target ${c.target}`,
                        Math.min(c.count / c.target, 1),
                        onSurface ? (c.count > 0 ? 'settling…' : 'jump!') : 'airborne');

            if (c.settleTimer > 1.3) {
                if (c.count === c.target)
                    w6OnSuccess(`${c.count} BOUNCES — EXACT! 🎯`);
                else
                    w6OnFail(`Got ${c.count} bounces — needed exactly ${c.target}. Try again!`);
            }
        }
    }

    // ── 🚀 HEIGHT ──
    if (c.type === 'height') {
        if (w6TargetRing) {
            w6TargetRing.material.opacity = 0.5 + 0.5 * Math.sin(performance.now() / 350);
        }
        if (justLeft && !c.active) { c.active = true; c.maxH = 0; }

        if (c.active) {
            if (!onSurface) {
                const h = Math.max(0, ballPos.y - BALL_RADIUS);
                if (h > c.maxH) c.maxH = h;
            }
            setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`,
                        `Peak: ${c.maxH.toFixed(1)} m  /  target ${c.target} m`,
                        Math.min(c.maxH / c.target, 1),
                        onSurface ? '' : `${Math.max(0, ballPos.y - BALL_RADIUS).toFixed(1)} m`);

            if (justLanded) {
                if (c.maxH >= c.target)
                    w6OnSuccess(`REACHED ${c.maxH.toFixed(1)} m!`);
                else
                    w6OnFail(`Only ${c.maxH.toFixed(1)} m — need ${c.target} m. More bounce!`);
            }
        }
    }

    // ── ⚡ SPEED ──
    if (c.type === 'speed') {
        const spd      = ballVel.length();
        // "under" requires the ball to actually be moving (> 0.4 m/s) — standing still doesn't count
        const passing  = c.dir === 'over'
            ? spd > c.targetSpeed
            : (spd > 0.4 && spd < c.targetSpeed);

        if (passing) c.holdTimer += dt;
        else c.holdTimer = Math.max(0, c.holdTimer - dt * 0.8);

        const prog = Math.min(c.holdTimer / MATCH_HOLD_TIME, 1);
        const bar  = document.getElementById('match-progress');
        if (bar) bar.style.width = (prog * 100) + '%';

        const arrow = c.dir === 'over' ? '▲ OVER' : '▼ UNDER';
        setLevelHUD(`W6 · SANDBOX  🏆 ${w6Score}`,
                    `${c.desc}\nCurrent: ${spd.toFixed(2)} m/s  ${passing ? '✅' : '❌'}`,
                    prog,
                    prog > 0 ? `${(prog * 3).toFixed(1)} / 3.0 s` : `Need ${arrow} ${c.targetSpeed.toFixed(1)} m/s`);

        if (c.holdTimer >= MATCH_HOLD_TIME)
            w6OnSuccess(`${c.dir === 'over' ? 'FAST ENOUGH' : 'SLOW ENOUGH'} — ${spd.toFixed(2)} m/s!`);
    }
}

function w6Finish() {
    showLevelComplete(w6ClearVisuals, 7);
}
