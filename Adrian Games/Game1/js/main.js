/* Basic input intake from the game, Utilizes both keyboard and phone sensors based on what device the student chooses to use*/
window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = true;
    if (e.code === 'Space') { e.preventDefault(); jumpQueued = true; }
});
window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k in keys) keys[k] = false; });

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
//correct orientation handler for the ball moving in respect to other movement
function handleOrientation(e) {
    if (tiltLocked) return;
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = THREE.MathUtils.clamp(e.gamma - calibGamma, -MAX_TILT_DEG, MAX_TILT_DEG);
    tiltZ = THREE.MathUtils.clamp(e.beta  - calibBeta,  -MAX_TILT_DEG, MAX_TILT_DEG);
}

//Reads new constant changes that the user utilizes
function readParams() {
    if (paramsOverride) return { ...paramsOverride };
    const v = id => { const x = parseFloat(document.getElementById(id)?.value); return isNaN(x) ? null : x; };
    return {
        mass: Math.max(0.1, v('ctrl-mass') ?? 0.5),
        mu: Math.max(0, v('ctrl-mu')   ?? 0.3),
        gx: 0, gy: v('ctrl-gy') ?? -9.81, gz: 0,
        cd: Math.max(0, v('ctrl-cd')   ?? 0.47),
        rho: Math.max(0, v('ctrl-rho')  ?? 1.225)
    };
}

//Basic choice between mobile or pc
document.getElementById('choose-mobile').onclick = () => { controlMethod = 'mobile'; hideSelector(); };
document.getElementById('choose-pc').onclick    = () => { controlMethod = 'pc'; hideSelector(); };

function hideSelector() {
    const s = document.getElementById('device-selector');
    s.style.opacity = '0';
    setTimeout(() => s.classList.add('hidden'), 500);
}

//Jump method added to the game
const jumpBtn = document.getElementById('jump-btn');
if (jumpBtn) {
    jumpBtn.addEventListener('click', () => { jumpQueued = true; });
    jumpBtn.addEventListener('touchstart', e  => { e.preventDefault(); jumpQueued = true; }, { passive: false });
}

document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud-left').classList.remove('hidden');
    document.getElementById('hud-right').classList.remove('hidden');
    document.getElementById('force-legend').classList.remove('hidden');
    document.getElementById('jump-btn')?.classList.remove('hidden');

    if (controlMethod === 'mobile' &&
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') boot(); });
    } else {
        boot();
    }
};

document.getElementById('reset-ball-btn').onclick = resetBall;

document.getElementById('snapshot-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    w1TakeSnapshot();
});

//the initializer for the engine for both devices
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

//a 60 second iteration of th egame to make sure its updating properly
function gameLoop(timestamp) {
    if (!gameActive) return;
    requestAnimationFrame(gameLoop);
    if (lastTimestamp === null) { lastTimestamp = timestamp; return; }

    let frameDt = Math.min((timestamp - lastTimestamp) / 1000, DT_CAP);
    lastTimestamp = timestamp;

    const P = readParams();
    if (controlMethod === 'pc') updateKeyboardTilt(frameDt);

    //Platform stays flat tiltX/tiltZ are used as force inputs, not visual rotation
    platformGroup.updateMatrixWorld(true);

    //Apply jump impulse before physics ticks
    if (jumpQueued && onSurface) {
        ballVel.y = JUMP_IMPULSE;
        jumpQueued = false;
    } else {
        jumpQueued = false; //clear if airborne (can't jump mid-air)
    }

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

initLevelUI();
