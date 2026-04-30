//Pure physics functions extracted from index.js for unit testing.
//Jest can run these directly.

function degToRad(deg) { return deg * Math.PI / 180; }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

//Mirrors the force block in animate() — given tilt angles, returns all force components
function computeForces(mass, g, mu, tiltX, tiltZ) {
    const radX = degToRad(clamp(tiltX, -25, 25));
    const radZ = degToRad(clamp(tiltZ, -25, 25));
    const fgX  = mass * g * Math.sin(radX);
    const fgZ  = mass * g * Math.sin(radZ);
    const norm = mass * g * Math.cos(Math.sqrt(radX ** 2 + radZ ** 2));
    const fMax = mu * norm;
    const nFX  = (Math.abs(fgX) > fMax) ? fgX - Math.sign(fgX) * fMax : 0;
    const nFZ  = (Math.abs(fgZ) > fMax) ? fgZ - Math.sign(fgZ) * fMax : 0;
    return { fgX, fgZ, fMax, nFX, nFZ };
}

//Mirrors the velocity update lines in animate()
function updateVelocity(vx, vz, nFX, nFZ, mass, dt = 0.016) {
    return {
        vx: (nFX === 0) ? vx * 0.92 : vx + (nFX / mass) * dt,
        vz: (nFZ === 0) ? vz * 0.92 : vz + (nFZ / mass) * dt,
    };
}

//Speed and acceleration magnitudes shown on HUD
function computeSpeed(vx, vz) { return Math.sqrt(vx * vx + vz * vz); }
function computeAccel(nFX, nFZ, mass) { return Math.sqrt(nFX ** 2 + nFZ ** 2) / mass; }

//Distance from ball to goal ring — used in challenge mode
function distToGoal(px, pz, goalX, goalZ) {
    return Math.sqrt((px - goalX) ** 2 + (pz - goalZ) ** 2);
}

//Mirrors boundary clamping block in animate()
function checkBoundary(px, pz, vx, vz, mode) {
    let npx = px, npz = pz, nvx = vx, nvz = vz;
    if (mode === 'sandbox') {
        if (Math.abs(npx) > 11) npx = -Math.sign(npx) * 11;
        if (Math.abs(npz) > 11) npz = -Math.sign(npz) * 11;
    } else {
        if (Math.abs(npx) > 10.5) { npx = Math.sign(npx) * 10.5; nvx *= -0.5; }
        if (Math.abs(npz) > 10.5) { npz = Math.sign(npz) * 10.5; nvz *= -0.5; }
    }
    return { px: npx, pz: npz, vx: nvx, vz: nvz };
}

//Mirrors pillar collision block in animate()
function checkPillarCollision(px, pz, vx, vz) {
    const dist = Math.sqrt(px * px + pz * pz);
    if (dist < 3.5) {
        const angle = Math.atan2(pz, px);
        return { px: Math.cos(angle) * 3.5, pz: Math.sin(angle) * 3.5, vx: vx * -0.3, vz: vz * -0.3, hit: true };
    }
    return { px, pz, vx, vz, hit: false };
}

// Mirrors updateKeyboardTilt() in index.js — applies key presses to tilt values
function applyKeyTilt(tiltX, tiltY, keys, sensitivity = 1.3, returnSpeed = 0.90) {
    let newTiltX = tiltX;
    let newTiltY = tiltY;
    if (keys.ArrowLeft || keys.a)  newTiltX -= sensitivity;
    if (keys.ArrowRight || keys.d) newTiltX += sensitivity;
    if (keys.ArrowUp || keys.w)    newTiltY -= sensitivity;
    if (keys.ArrowDown || keys.s)  newTiltY += sensitivity;
    if (!keys.ArrowLeft && !keys.ArrowRight && !keys.a && !keys.d) newTiltX *= returnSpeed;
    if (!keys.ArrowUp && !keys.ArrowDown && !keys.w && !keys.s)    newTiltY *= returnSpeed;
    newTiltX = clamp(newTiltX, -25, 25);
    newTiltY = clamp(newTiltY, -25, 25);
    return { tiltX: newTiltX, tiltY: newTiltY };
}

// Mirrors sandbox match check in animate() — is the value within tolerance of the target?
function isMatchingTarget(value, target, tolerance) {
    return Math.abs(value - target) < tolerance;
}

module.exports = { computeForces, updateVelocity, computeSpeed, computeAccel, distToGoal, checkBoundary, checkPillarCollision, applyKeyTilt, isMatchingTarget, degToRad, clamp };
