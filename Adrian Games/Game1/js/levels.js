/* ─── LEVEL SYSTEM ───────────────────────────────────────────── */

//This functions send the user to the appropriate level selected on the main menu
function initLevelUI() {
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lvl = parseInt(btn.dataset.level);
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLevel = lvl;
            if (lvl > 4) {
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

    //clear level-specific visuals when switching away from them
    if (n !== 1) w1ClearVisuals();
    if (n !== 2) w2ClearVisuals();
    if (n !== 3) w3ClearVisuals();
    if (n !== 4) w4ClearVisuals();

    if (n === 0) {
        document.getElementById('match-hud').classList.remove('hidden');
        return;
    }
    document.getElementById('match-hud').classList.add('hidden');
    document.getElementById('level-hud').classList.remove('hidden');

    if (n === 1) startW1();
    if (n === 2) startW2();
    if (n === 3) startW3();
    if (n === 4) startW4();
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

/* ─── WORLD 2 · PATH vs ARROW (Distance vs Displacement) ─────── */

//builds a coloured pole + sphere marker — reused for both start (cyan) and goal (gold)
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

//lazy-creates the two poles and the displacement arrow, then makes them visible
function w2EnsureVisuals() {
    if (!w2StartMesh) { w2StartMesh = w2MakePole(0x22d3ee); scene.add(w2StartMesh); }
    if (!w2GoalMesh)  { w2GoalMesh  = w2MakePole(0xfbbf24); scene.add(w2GoalMesh); }
    if (!w2DispArrow) {
        w2DispArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.05, 0),
            0.01, 0x22d3ee, 0.3, 0.2
        );
        w2DispArrow.visible = false;
        scene.add(w2DispArrow);
    }
    w2StartMesh.visible = true;
    w2GoalMesh.visible  = true;
}

//hides w2 scene objects without destroying them (keeps GPU memory)
function w2ClearVisuals() {
    if (w2StartMesh) w2StartMesh.visible = false;
    if (w2GoalMesh)  w2GoalMesh.visible  = false;
    if (w2DispArrow) w2DispArrow.visible  = false;
}

//places the start/goal poles, positions the ball at the start, shows intro modal
function startW2() {
    w2EnsureVisuals();
    const start = { x: -7, z: -7 };
    const goal  = { x:  7, z:  7 };
    w2StartMesh.position.set(start.x, 0, start.z);
    w2GoalMesh.position.set(goal.x,  0, goal.z);
    ballPos.set(start.x, BALL_RADIUS + 0.01, start.z);
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);

    const straightLine = Math.hypot(goal.x - start.x, goal.z - start.z);
    levelState = {
        start, goal,
        straight: straightLine,
        distance: 0,
        lastX: ballPos.x, lastZ: ballPos.z,
        phase: 'intro',
        reached: false
    };

    showModal({
        badge: 'WORLD 2 · PATH vs ARROW',
        title: 'Distance vs Displacement',
        body: `Roll from the CYAN pole to the GOLD pole.\n\nStraight-line distance: ${straightLine.toFixed(2)} m.\n\nThe game tracks two things: the TOTAL path you actually roll (distance) and the STRAIGHT line from start to ball (displacement). See if you can feel the difference.`,
        btnLabel: 'Start Rolling',
        onBtn: () => { levelState.phase = 'rolling'; w2HUD(); }
    });
}

//updates the level HUD with live distance, displacement, and straightness ratio
function w2HUD() {
    const disp  = w2CurrentDisp();
    const ratio = levelState.distance > 0.01 ? disp / levelState.distance : 1;
    const progress = Math.min(1,
        1 - Math.hypot(ballPos.x - levelState.goal.x, ballPos.z - levelState.goal.z) / levelState.straight
    );
    setLevelHUD(
        'W2 · PATH vs ARROW',
        `Reach the gold pole — ${levelState.straight.toFixed(2)} m away`,
        progress,
        `Distance: ${levelState.distance.toFixed(2)} m  ·  Displacement: ${disp.toFixed(2)} m  ·  Straightness: ${(ratio * 100).toFixed(0)}%`
    );
}

//straight-line magnitude from the starting pole to the current ball position
function w2CurrentDisp() {
    return Math.hypot(ballPos.x - levelState.start.x, ballPos.z - levelState.start.z);
}

//called every frame while W2 is active — accumulates path distance and updates arrow + HUD
function w2UpdateVisuals() {
    if (!levelState || levelState.phase !== 'rolling') {
        if (w2DispArrow) w2DispArrow.visible = false;
        return;
    }

    //accumulate total path length
    const dx = ballPos.x - levelState.lastX;
    const dz = ballPos.z - levelState.lastZ;
    levelState.distance += Math.hypot(dx, dz);
    levelState.lastX = ballPos.x;
    levelState.lastZ = ballPos.z;

    //draw displacement arrow from start pole to current ball position
    const from = new THREE.Vector3(levelState.start.x, 0.05, levelState.start.z);
    const to   = new THREE.Vector3(ballPos.x, 0.05, ballPos.z);
    const dir  = to.clone().sub(from);
    const len  = dir.length();
    if (len > 0.05) {
        w2DispArrow.position.copy(from);
        w2DispArrow.setDirection(dir.normalize());
        w2DispArrow.setLength(len, Math.min(0.35, len * 0.25), Math.min(0.22, len * 0.18));
        w2DispArrow.visible = true;
    } else {
        w2DispArrow.visible = false;
    }

    w2HUD();

    //check if ball has reached the goal pole
    const distToGoal = Math.hypot(ballPos.x - levelState.goal.x, ballPos.z - levelState.goal.z);
    if (!levelState.reached && distToGoal < W2_GOAL_RADIUS) {
        levelState.reached = true;
        levelState.phase   = 'review';
        w2Review();
    }
}

//game-loop hook — delegates to w2UpdateVisuals which does the real work
function updateW2(dt) {
    w2UpdateVisuals();
}

//shown once the student reaches the gold pole — summarises path vs displacement
function w2Review() {
    const disp  = w2CurrentDisp();
    const extra = levelState.distance - disp;
    showModal({
        badge: 'GOAL REACHED',
        title: `You rolled ${levelState.distance.toFixed(2)} m, displaced ${disp.toFixed(2)} m`,
        body: `You traveled ${extra.toFixed(2)} m MORE than the straight line.\n\nThat extra path is real — wheels spun, energy was spent — but your displacement only cares about start and end.\n\nDistance is a scalar. Displacement is a vector.`,
        btnLabel: 'Quiz',
        onBtn: () => { w2Quiz(); }
    });
}

//first quiz question after reaching the goal
function w2Quiz() {
    showModal({
        badge: 'QUIZ · W2',
        title: 'When does distance equal displacement?',
        body: 'Think about when the two numbers would match.',
        choices: [
            'When the ball moves in a perfectly straight line',
            'When the ball moves faster',
            'When the ball returns to its start'
        ],
        onChoice: (i) => {
            const ok = i === 0;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 0 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                "Displacement = straight-line vector from start to end. Distance = total path length. They're equal only when the ball moves in a straight line. If the ball returns to start, displacement is ZERO even though distance can be huge.",
                () => { w2Bonus(); }
            );
        }
    });
}

//bonus question — round-trip edge case
function w2Bonus() {
    showModal({
        badge: 'BONUS',
        title: 'If you rolled the ball in a full circle back to start…',
        body: 'Distance = circumference. What about displacement?',
        choices: [
            'Equal to distance',
            'Half the distance',
            'Zero'
        ],
        onChoice: (i) => {
            const ok = i === 2;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 2 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                'A round trip has zero displacement — you end where you started. This is why displacement is a vector: it carries direction, and a full loop cancels out.',
                () => { w2ClearVisuals(); startLevel(0); }
            );
        }
    });
}

/* ─── WORLD 3 · VELOCITY AIM (Velocity vs Speed) ─────────────── */

//lazy-creates the gold goal ring, the pink velocity arrow, and the aim-ring indicator
function w3EnsureVisuals() {
    if (!w3GoalMesh) { w3GoalMesh = w2MakePole(0xfbbf24); scene.add(w3GoalMesh); }
    if (!w3VelArrow) {
        w3VelArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.6, 0),
            0.01, 0xec4899, 0.35, 0.22
        );
        w3VelArrow.visible = false;
        scene.add(w3VelArrow);
    }
    if (!w3AimCone) {
        //flat ring on the ground showing the goal acceptance radius
        const ringGeo = new THREE.RingGeometry(W3_GOAL_RADIUS - 0.05, W3_GOAL_RADIUS, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.7
        });
        w3AimCone = new THREE.Mesh(ringGeo, ringMat);
        w3AimCone.rotation.x = -Math.PI / 2;
        w3AimCone.position.y = 0.02;
        scene.add(w3AimCone);
    }
    w3GoalMesh.visible = true;
    w3AimCone.visible  = true;
}

//hides W3 scene objects without disposing GPU memory
function w3ClearVisuals() {
    if (w3GoalMesh) w3GoalMesh.visible = false;
    if (w3VelArrow) w3VelArrow.visible = false;
    if (w3AimCone)  w3AimCone.visible  = false;
}

//places goal pole, spawns ball at opposite corner, shows intro modal
function startW3() {
    w3EnsureVisuals();
    const goal = { x: 7, z: -7 };
    w3GoalMesh.position.set(goal.x, 0, goal.z);
    w3AimCone.position.set(goal.x, 0.02, goal.z);
    ballPos.set(-7, BALL_RADIUS + 0.01, 7);
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);

    levelState = { goal, phase: 'intro', scored: false, warned: false };

    showModal({
        badge: 'WORLD 3 · VELOCITY AIM',
        title: 'Velocity vs Speed',
        body: `Reach the GOLD pole — but here's the catch:\n\nYou must arrive moving TOWARD it, not sideways or away.\n\n• Speed (|v|) must be at least ${W3_MIN_SPEED} m/s\n• Velocity direction must point within ${W3_AIM_TOL_DEG}° of the goal\n\nThe PINK arrow on the ball shows your live velocity direction.`,
        btnLabel: 'Start',
        onBtn: () => { levelState.phase = 'rolling'; }
    });
}

//called every frame draws the pink velocity arrow and checks goal entry conditions
function w3UpdateVisuals() {
    if (!levelState || levelState.phase !== 'rolling') {
        if (w3VelArrow) w3VelArrow.visible = false;
        return;
    }

    const speed = ballVel.length();

    //draw pink velocity arrow above the ball
    if (speed > 0.1) {
        w3VelArrow.position.set(ballPos.x, BALL_RADIUS + 0.05, ballPos.z);
        const dir = new THREE.Vector3(ballVel.x, 0, ballVel.z);
        if (dir.length() > 0.01) {
            dir.normalize();
            w3VelArrow.setDirection(dir);
            const len = Math.min(3, speed * 0.6);
            w3VelArrow.setLength(len, Math.min(0.4, len * 0.25), Math.min(0.25, len * 0.2));
            w3VelArrow.visible = true;
        }
    } else {
        w3VelArrow.visible = false;
    }

    //compute angle between velocity and goal direction
    const toGoal = new THREE.Vector3(levelState.goal.x - ballPos.x, 0, levelState.goal.z - ballPos.z);
    const dist   = toGoal.length();
    let angleDeg = 999;
    if (speed > 0.1 && dist > 0.01) {
        const velFlat = new THREE.Vector3(ballVel.x, 0, ballVel.z).normalize();
        const goalDir = toGoal.clone().normalize();
        const cosA    = THREE.MathUtils.clamp(velFlat.dot(goalDir), -1, 1);
        angleDeg      = THREE.MathUtils.radToDeg(Math.acos(cosA));
    }

    const aimOk  = angleDeg <= W3_AIM_TOL_DEG;
    const fastOk = speed >= W3_MIN_SPEED;

    //ring glows green when both conditions are met, gold otherwise
    w3AimCone.material.color.setHex(aimOk && fastOk ? 0x4ade80 : 0xfbbf24);

    setLevelHUD(
        'W3 · VELOCITY AIM',
        'Enter the ring heading AT the goal',
        Math.min(1, 1 - dist / 20),
        `|v|: ${speed.toFixed(2)} m/s  ·  aim: ${angleDeg < 900 ? angleDeg.toFixed(0) + '°' : '—'}  ·  need ≥${W3_MIN_SPEED} m/s & ≤${W3_AIM_TOL_DEG}°`
    );

    if (!levelState.scored && dist < W3_GOAL_RADIUS) {
        if (fastOk && aimOk) {
            //success — freeze the final stats and move to review
            levelState.scored     = true;
            levelState.phase      = 'review';
            levelState.finalSpeed = speed;
            levelState.finalAngle = angleDeg;
            w3Review();
        } else {
            //crossed the ring but failed the speed/aim check — warn once per crossing
            if (!levelState.warned) {
                levelState.warned = true;
                setLevelHUD('W3 · VELOCITY AIM',
                    `Too ${!fastOk ? 'slow' : 'off-angle'} — keep rolling and line up again`,
                    Math.min(1, 1 - dist / 20),
                    `|v|: ${speed.toFixed(2)}  ·  aim: ${angleDeg.toFixed(0)}°`
                );
            }
        }
    } else if (levelState.warned && dist > W3_GOAL_RADIUS * 2) {
        levelState.warned = false; //reset warning once ball clears the ring
    }
}

//game-loop hook — delegates to w3UpdateVisuals which does the real work
function updateW3(dt) {
    w3UpdateVisuals();
}

//shown after a valid goal entry — recaps the run and bridges to the quiz
function w3Review() {
    showModal({
        badge: 'TAGGED',
        title: `Hit at ${levelState.finalSpeed.toFixed(2)} m/s, aim ${levelState.finalAngle.toFixed(0)}°`,
        body: 'Speed and velocity are different things. Speed is just the magnitude — |v|. Velocity is speed PLUS direction. You can move fast in the wrong direction and still miss the physics of the problem.',
        btnLabel: 'Quiz',
        onBtn: () => { w3Quiz(); }
    });
}

//first quiz question after scoring
function w3Quiz() {
    showModal({
        badge: 'QUIZ · W3',
        title: 'Two cars drive at 30 m/s — one north, one east. Are their velocities equal?',
        body: 'Think about what velocity includes.',
        choices: [
            'Yes — same 30 m/s speed means same velocity',
            'No — same speed but different directions = different velocities',
            "Only if they're on the same road"
        ],
        onChoice: (i) => {
            const ok = i === 1;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 1 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                "Velocity is a vector — it needs BOTH magnitude (speed) and direction. Same speed, different direction = different velocities. That's why the pink arrow shows direction, not just a number.",
                () => { w3Bonus(); }
            );
        }
    });
}

//bonus question — circular motion edge case
function w3Bonus() {
    showModal({
        badge: 'BONUS',
        title: 'A ball moves in a perfect circle at constant speed. Is its velocity constant?',
        body: 'Speed never changes. But what about velocity?',
        choices: [
            'Yes, velocity is constant',
            'No, velocity changes because direction keeps changing',
            'Only if the circle is small'
        ],
        onChoice: (i) => {
            const ok = i === 1;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 1 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                'Speed is constant, but velocity changes every instant because the direction changes. This is why circular motion has acceleration even at constant speed — the velocity VECTOR is rotating.',
                () => { w3ClearVisuals(); startLevel(0); }
            );
        }
    });
}

/* WORLD 4 · ACCELERATOR (Constant Acceleration / slope of v(t)) ── */

//no 3D objects needed — just unlock tilt and reset state
function w4ClearVisuals() {
    tiltLocked = false;
    tiltX = 0; tiltZ = 0;
}

//spawn ball, show intro + prediction prompt
function startW4() {
    ballPos.set(-8, BALL_RADIUS + 0.01, 0);
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);
    tiltX = 0; tiltZ = 0;
    levelState = { phase: 'intro', prediction: null };

    showModal({
        badge: 'WORLD 4 · ACCELERATOR',
        title: 'Constant Acceleration',
        body: `The ball will receive a constant force for ${W4_DURATION}s — you don't tilt.\n\nFirst: predict. With constant acceleration, how does SPEED change with time?`,
        btnLabel: 'Predict →',
        onBtn: () => { w4Predict(); }
    });
}

//make the student commit to a prediction before seeing the data
function w4Predict() {
    showModal({
        badge: 'PREDICT',
        title: 'If acceleration is constant, speed over time looks like…',
        body: 'Commit before you observe.',
        choices: [
            'A flat line (speed stays the same)',
            'A straight ramp (speed grows linearly)',
            'A curve that steepens (speed grows faster over time)'
        ],
        onChoice: (i) => {
            levelState.prediction = i;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === i ? '#fbbf24' : '';
            });
            showExplanation(true,
                "Your prediction is saved. Now run the trial — we'll see if the data matches.",
                () => { w4RunTrial(); }
            );
        }
    });
}

//lock tilt to a constant angle and start the timed run
function w4RunTrial() {
    levelState.phase = 'running';
    w4Samples = [];
    w4StartT  = performance.now() / 1000;
    tiltX = 0; tiltZ = W4_TILT_DEG;   // constant +Z tilt → constant acceleration toward -Z
    tiltLocked = true;
    ballPos.set(-8, BALL_RADIUS + 0.01, 8);
    ballVel.set(0, 0, 0);
    ballMesh.position.copy(ballPos);
}

//called every frame while the trial is running — records one v sample per second
function w4UpdateVisuals() {
    if (!levelState || levelState.phase !== 'running') return;
    const t = performance.now() / 1000 - w4StartT;
    //record a sample at each whole-second mark
    if (w4Samples.length < W4_SAMPLES && t >= w4Samples.length) {
        w4Samples.push({ t: w4Samples.length, v: ballVel.length() });
    }
    setLevelHUD(
        'W4 · ACCELERATOR',
        'Recording v(t) — trial running',
        Math.min(1, t / W4_DURATION),
        `t = ${t.toFixed(2)}s  ·  |v| = ${ballVel.length().toFixed(2)} m/s  ·  samples: ${w4Samples.length}/${W4_SAMPLES}`
    );
    if (t >= W4_DURATION && w4Samples.length >= W4_SAMPLES) {
        tiltLocked = false;
        tiltX = 0; tiltZ = 0;
        levelState.phase = 'review';
        w4Review();
    }
}

//game-loop hook
function updateW4(dt) {
    w4UpdateVisuals();
}

//summarise the collected v(t) data and compute the slope (= acceleration)
function w4Review() {
    const first = w4Samples[0], last = w4Samples[w4Samples.length - 1];
    const slope = (last.v - first.v) / (last.t - first.t || 1);

    const predictOk = levelState.prediction === 1;
    const verdict   = predictOk
        ? 'Your prediction matched — speed grew linearly.'
        : 'Your prediction differed. Speed actually grew linearly (a straight ramp).';

    //build the data table as an HTML string (injected after the modal renders)
    const tableHTML = `
<div style="font-family:'Courier New',monospace;font-size:12px;margin:10px 0;">
  <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:6px 16px;">
    <b>#</b><b>t (s)</b><b>|v| (m/s)</b>
    ${w4Samples.map((s, i) =>
        `<span>${i+1}</span><span>${s.t.toFixed(2)}</span><span>${s.v.toFixed(2)}</span>`
    ).join('')}
  </div>
</div>`;

    showModal({
        badge: 'TRIAL COMPLETE',
        title: `Measured acceleration ≈ ${slope.toFixed(2)} m/s²`,
        body: `${verdict}\n\nThe slope of your v(t) data = ${slope.toFixed(2)} m/s². That IS the acceleration.`,
        btnLabel: 'Quiz',
        onBtn: () => { w4Quiz(); }
    });
    //inject the table once the modal DOM exists
    setTimeout(() => {
        const bodyEl = document.getElementById('bm-body');
        if (bodyEl) bodyEl.insertAdjacentHTML('beforeend', tableHTML);
    }, 0);
}

//quiz question — slope of v(t)
function w4Quiz() {
    showModal({
        badge: 'QUIZ · W4',
        title: 'On a velocity-vs-time graph, what does the slope equal?',
        body: 'Think about rise over run when rise is Δv and run is Δt.',
        choices: ['Position', 'Acceleration', 'Displacement'],
        onChoice: (i) => {
            const ok = i === 1;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 1 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                'Slope of v(t) = Δv/Δt = acceleration. Constant acceleration → straight line on v(t). The steeper the line, the bigger the acceleration.',
                () => { w4Bonus(); }
            );
        }
    });
}

//bonus — zero acceleration → flat v(t) line
function w4Bonus() {
    showModal({
        badge: 'BONUS',
        title: 'If the ball had ZERO acceleration, what would v(t) look like?',
        body: 'No change in velocity over time.',
        choices: [
            'A rising straight line',
            'A flat horizontal line',
            'A curve'
        ],
        onChoice: (i) => {
            const ok = i === 1;
            document.querySelectorAll('.bm-choice-btn').forEach((b, j) => {
                b.style.borderColor = j === 1 ? '#4ade80' : (j === i && !ok ? '#ef4444' : '');
            });
            showExplanation(ok,
                "a = 0 means Δv = 0 — velocity never changes. v(t) is a flat horizontal line at whatever speed the ball already had. This is Newton's first law in graph form.",
                () => { w4ClearVisuals(); startLevel(0); }
            );
        }
    });
}
