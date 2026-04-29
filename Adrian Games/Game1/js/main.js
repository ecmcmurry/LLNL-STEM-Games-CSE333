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

//real phone accelerometer — updates phoneAccelMag each sensor frame
function handleMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (a && a.x !== null && a.y !== null && a.z !== null) {
        phoneAccelMag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    }
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

// How To Play open / back
// #how-to-play is z-index 1001 so it covers everything instantly — no need to touch device-selector
document.getElementById('htp-open-btn').onclick = () => {
    document.getElementById('how-to-play').classList.remove('hidden');
};
document.getElementById('htp-back-btn').onclick = () => {
    document.getElementById('how-to-play').classList.add('hidden');
};

function hideSelector() {
    const s = document.getElementById('device-selector');
    s.style.opacity = '0';
    setTimeout(() => s.classList.add('hidden'), 500);
}

// Level select → device selector
// No need to hide #ui or #ui-bg — device-selector is z-index 1000 and covers them.
// Leaving them intact means they're still there when the user picks a device and
// the selector fades out, so the level select appears immediately underneath.
document.getElementById('back-to-device-btn').onclick = () => {
    const sel = document.getElementById('device-selector');
    sel.style.opacity = '1';
    sel.classList.remove('hidden');
};

// Shared helper — used by game-back-btn AND the level-complete menu
function goToLevelSelect() {
    gameActive = false;
    ['hud-left', 'hud-right', 'force-legend', 'snapshot-btn', 'game-back-btn']
        .forEach(id => document.getElementById(id)?.classList.add('hidden'));
    hideAllLevelPanels();
    const uiBg = document.getElementById('ui-bg');
    if (uiBg) {
        uiBg.classList.remove('hidden');
        uiBg.getBoundingClientRect(); // force reflow so CSS transition fires
        uiBg.style.opacity = '1';
    }
    document.getElementById('ui').classList.remove('hidden');
}

// In-game → level select
document.getElementById('game-back-btn').onclick = goToLevelSelect;

document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud-left').classList.remove('hidden');
    document.getElementById('hud-right').classList.remove('hidden');
    document.getElementById('force-legend').classList.remove('hidden');

    if (renderer) {
        // Scene already initialized — resume without re-booting
        const uiBg = document.getElementById('ui-bg');
        if (uiBg) { uiBg.style.opacity = '0'; setTimeout(() => uiBg.classList.add('hidden'), 420); }
        gameActive = true;
        lastTimestamp = null;
        accumulator = 0;
        requestAnimationFrame(gameLoop);
        startLevel(selectedLevel);
        return;
    }

    if (controlMethod === 'mobile') {
        const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
                                typeof DeviceOrientationEvent.requestPermission === 'function';
        if (needsPermission) {
            //iOS 13+: request orientation + motion permissions from the same user-gesture call stack
            const orientP = DeviceOrientationEvent.requestPermission();
            const motionP = typeof DeviceMotionEvent !== 'undefined' &&
                            typeof DeviceMotionEvent.requestPermission === 'function'
                            ? DeviceMotionEvent.requestPermission()
                            : Promise.resolve('granted');
            Promise.all([orientP, motionP]).then(([oRes, mRes]) => {
                if (oRes === 'granted') boot(mRes === 'granted');
            });
        } else {
            boot(true); //Android / non-iOS — devicemotion fires without permission
        }
    } else {
        boot(false); //PC — no motion sensor
    }
};

document.getElementById('reset-ball-btn').onclick = resetBall;

document.getElementById('snapshot-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    w1TakeSnapshot();
});

//the initializer for the engine for both devices
function boot(motionGranted = false) {
    // fade out the level-select background so the canvas shows through
    const uiBg = document.getElementById('ui-bg');
    if (uiBg) { uiBg.style.opacity = '0'; setTimeout(() => uiBg.classList.add('hidden'), 420); }

    initThreeScene();
    initTrail();
    initChart();
    generateTarget();

    if (controlMethod === 'mobile') {
        window.addEventListener('deviceorientation', handleOrientation);
        if (motionGranted) {
            window.addEventListener('devicemotion', handleMotion);
            //reveal the phone accelerometer row in the analytics HUD
            const row = document.getElementById('tel-phone-row');
            if (row) row.style.display = 'block';
        }
    }

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
    ballMesh.scale.setScalar(currentLevel === 0 ? Math.cbrt(P.mass / 0.5) : 1);
    updateBallRolling(frameDt);
    updateTrail();
    updateForceArrows();
    updateTelemetry(P);

    if (currentLevel === 0) updateMatch(frameDt);
    if (currentLevel === 1) updateW1(frameDt);
    if (currentLevel === 2) updateW2(frameDt);
    if (currentLevel === 3) updateW3(frameDt);
    if (currentLevel === 4) updateW4(frameDt);
    if (currentLevel === 5) updateW5(frameDt);
    if (currentLevel === 6) updateW6(frameDt);

    updateChart();

    // Soft-track the ball's height only — X/Z stay centred so the platform stays square
    camera.lookAt(new THREE.Vector3(0, Math.max(ballPos.y * 0.08, 0), 0));
    renderer.render(scene, camera);
}

initLevelUI();
