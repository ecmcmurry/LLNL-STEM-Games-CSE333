//texture refactored from previous code
function createBallTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i*64, 0); ctx.lineTo(i*64, 256); ctx.stroke(); }
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i*64); ctx.lineTo(512, i*64); ctx.stroke(); }
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, 120, 512, 16);
    return new THREE.CanvasTexture(c);
}
//initialization refactored
function initThreeScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.Fog(0x020617, 70, 120);

    camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 250);
    camera.position.set(0, 32, 30);   // pulled back to frame the larger platform; no X offset = square not diamond
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
        new THREE.BoxGeometry(PLATFORM_HALF * 2, 0.3, PLATFORM_HALF * 2),
        new THREE.MeshPhongMaterial({ color: 0x1e293b, transparent: true, opacity: 0.92 })
    );
    platMesh.position.y = -0.15;
    platMesh.receiveShadow = true;
    platformGroup.add(platMesh);
    platformGroup.add(new THREE.GridHelper(PLATFORM_HALF * 2, 20, 0x4ade80, 0x162030));

    const edgeLines = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(PLATFORM_HALF * 2, 0.3, PLATFORM_HALF * 2)),
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
    arrowNormal  = new THREE.ArrowHelper(d, o, 0.01, 0x4ade80, 0.2, 0.1);
    arrowFriction = new THREE.ArrowHelper(d, o, 0.01, 0x3b82f6, 0.2, 0.1);
    arrowDrag = new THREE.ArrowHelper(d, o, 0.01, 0xfbbf24, 0.2, 0.1);
    [arrowGravSurf, arrowNormal, arrowFriction, arrowDrag].forEach(a => { a.visible = false; scene.add(a); });

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(15, 30, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
    sun.shadow.camera.top  =  30; sun.shadow.camera.bottom = -30;
    scene.add(sun);

    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });
}

//Trail refactored
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

//trail utilized for the students to tell the difference between distance and
function updateTrail() {
    const intensity = Math.min(ballVel.length() / 8, 1.0);
    for (let i = 0; i < TRAIL_LENGTH - 1; i++) {
        trailPositions[i*3] = trailPositions[(i+1)*3];
        trailPositions[i*3+1] = trailPositions[(i+1)*3+1];
        trailPositions[i*3+2] = trailPositions[(i+1)*3+2];
    }
    const last = (TRAIL_LENGTH - 1) * 3;
    trailPositions[last]   = ballPos.x;
    trailPositions[last+1] = ballPos.y;
    trailPositions[last+2] = ballPos.z;
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

//Creates basic ball rolling visual effect for the game utilizing basic three.js
function updateBallRolling(dt) {
    if (!onSurface || ballVel.length() < 0.001) return;
    const n = getPlatformNormal();
    const vSurf = ballVel.clone().addScaledVector(n, -ballVel.dot(n));
    const surfSpeed = vSurf.length();
    if (surfSpeed < 0.001) return;
    const axis = new THREE.Vector3().crossVectors(n, vSurf.normalize());
    if (axis.lengthSq() > 0.0001) {
        const r = currentLevel === 0 ? BALL_RADIUS * ballMesh.scale.x : BALL_RADIUS;
        ballMesh.rotateOnWorldAxis(axis.normalize(), (surfSpeed / r) * dt);
    }
}

//Basic function force arrows organized already had this just refactored
function updateForceArrows() {
    const show = document.getElementById('ctrl-arrows')?.checked ?? true;
    const pos = ballMesh.position.clone();
    setArrow(arrowGravSurf, F.gravSurf, pos, show && onSurface);
    setArrow(arrowNormal, F.normal, pos, show && onSurface);
    setArrow(arrowFriction, F.friction.clone().add(F.rolling), pos, show && onSurface);
    setArrow(arrowDrag, F.drag, pos, show);
}
//organized into this file basic force vectors for the rigid body
function setArrow(arrow, forceVec, origin, show) {
    const len = forceVec.length() * FORCE_SCALE;
    if (!show || len < 0.03) { arrow.visible = false; return; }
    arrow.setDirection(forceVec.clone().normalize());
    arrow.setLength(Math.min(len, 6), Math.min(len * 0.25, 0.35), 0.12);
    arrow.position.copy(origin);
    arrow.visible = true;
}
