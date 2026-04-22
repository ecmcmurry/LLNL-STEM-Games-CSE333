/* ─── LEVEL SYSTEM ───────────────────────────────────────────── */

//This functions send the user to the appropriate level selected on the main menu
function initLevelUI() {
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lvl = parseInt(btn.dataset.level);
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLevel = lvl;
            if (lvl > 1) {
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

    if (n === 0) {
        document.getElementById('match-hud').classList.remove('hidden');
        return;
    }
    document.getElementById('match-hud').classList.add('hidden');
    document.getElementById('level-hud').classList.remove('hidden');

    if (n === 1) startW1();
}

//this is a helper function for startlevel
function hideAllLevelPanels() {
    ['level-hud', 'match-hud', 'snapshot-btn'].forEach(id =>
        document.getElementById(id)?.classList.add('hidden')
    );
    hideModal();
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
        body: 'Tilt the platform (WASD or gyroscope) to roll the ball.\n\nPress SNAPSHOT to record your position and time. After 8 snapshots we\'ll review the data together.\n\nThe cyan arrow shows displacement from your last snapshot.',
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
        'Roll freely — tap SNAPSHOT to record position + time',
        n / W1_SNAPSHOTS_REQUIRED,
        `${n} / ${W1_SNAPSHOTS_REQUIRED} snapshots recorded`
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
                () => { w1ClearVisuals(); startLevel(0); }
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
