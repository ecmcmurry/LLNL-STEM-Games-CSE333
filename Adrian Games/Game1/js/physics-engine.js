/*  PHYSICS ENGINE created by OPUS  */

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
        const gDotN    = gravity.dot(n);
        const normalMag = gDotN < 0 ? -P.mass * gDotN : 0;
        F.normal.copy(n).multiplyScalar(normalMag);
        F.gravSurf.copy(F.gravity).addScaledVector(n, -F.gravity.dot(n));

        const vDotN   = ballVel.dot(n);
        const vSurf   = ballVel.clone().addScaledVector(n, -vDotN);
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
    F.drag.set(0, 0, 0);
    if (speed > 0.001) {
        const dragMag = 0.5 * P.rho * P.cd * BALL_AREA * speed * speed;
        F.drag.copy(ballVel).normalize().multiplyScalar(-dragMag);
    }

    F.net.copy(F.gravity).add(F.normal).add(F.friction).add(F.rolling).add(F.drag);

    // WASD applies force directly to the ball on the flat platform
    if (onSurface && (tiltX !== 0 || tiltZ !== 0)) {
        const inputScale = PLAYER_FORCE_SCALE * P.mass;
        F.net.x += (-tiltX / MAX_TILT_DEG) * inputScale;
        F.net.z += (-tiltZ / MAX_TILT_DEG) * inputScale;
    }
    const accel = F.net.clone().divideScalar(P.mass);
    currentAccelMag = accel.length();

    ballVel.addScaledVector(accel, dt);
    if (ballVel.length() > MAX_SPEED) ballVel.normalize().multiplyScalar(MAX_SPEED);
    ballPos.addScaledVector(ballVel, dt);

    if (ballPos.y < RESPAWN_Y) resetBall();
}

function resetBall() {
    ballPos.set(0, BALL_RADIUS + 0.01, 0);
    ballVel.set(0, 0, 0);
    tiltX = 0; tiltZ = 0;
    matchTimer = 0;
    if (ballMesh) { ballMesh.position.copy(ballPos); ballMesh.rotation.set(0, 0, 0); }
}
