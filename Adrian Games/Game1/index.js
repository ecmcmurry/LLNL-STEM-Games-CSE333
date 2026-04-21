/* --- GLOBAL DATA & STATE --- */
let scene, camera, renderer, ball, platformGroup;
let arrowG, arrowF, arrowN; 
let px = 0, pz = 0, vx = 0, vz = 0; 
let tiltX = 0, tiltY = 0, calibBeta = null, calibGamma = null;

let mass = 0.5, mu = 0.15, g = 9.81;

// Physics Vector Clamping
const MAX_VECTOR_LENGTH = 5.0; 
const VECTOR_SCALE = 1.2;

let chart;
let targetSpeed = 2.50;
let targetAccel = 1.50; 
let matchType = 'velocity'; 
let matchTimerCount = 0;
let ghostLineData = Array(40).fill(2.50);

let controlMethod = 'pc';
let gameActive = false;

const velocityTolerance = 0.20;
const accelTolerance = 0.15; 
const keys = { 
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, 
    w: false, a: false, s: false, d: false 
};

/* --- INITIALIZATION & INPUT --- */
document.getElementById('choose-mobile').onclick = () => { controlMethod = 'mobile'; hideSelector(); };
document.getElementById('choose-pc').onclick = () => { controlMethod = 'pc'; hideSelector(); };

function hideSelector() {
    document.getElementById('device-selector').style.opacity = '0';
    setTimeout(() => document.getElementById('device-selector').classList.add('hidden'), 500);
}

window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

function updateKeyboardTilt() {
    const sensitivity = 1.3;
    const returnSpeed = 0.90;
    if (keys.ArrowLeft || keys.a) tiltX -= sensitivity;
    if (keys.ArrowRight || keys.d) tiltX += sensitivity;
    if (keys.ArrowUp || keys.w) tiltY -= sensitivity;
    if (keys.ArrowDown || keys.s) tiltY += sensitivity;
    
    if (!keys.ArrowLeft && !keys.ArrowRight && !keys.a && !keys.d) tiltX *= returnSpeed;
    if (!keys.ArrowUp && !keys.ArrowDown && !keys.w && !keys.s) tiltY *= returnSpeed;
    
    tiltX = THREE.MathUtils.clamp(tiltX, -25, 25);
    tiltY = THREE.MathUtils.clamp(tiltY, -25, 25);
}

/* --- GRAPHING --- */
function initGraph() {
    const ctx = document.getElementById('physicsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(40).fill(''),
            datasets: [
                { label: 'Speed', borderColor: '#4ade80', data: Array(40).fill(0), borderWidth: 2, pointRadius: 0 },
                { label: 'Accel', borderColor: '#ef4444', data: Array(40).fill(0), borderWidth: 2, pointRadius: 0 },
                { label: 'Target', borderColor: '#fbbf24', data: ghostLineData, borderWidth: 1, borderDash: [5, 5], pointRadius: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            scales: { 
                y: { min: 0, max: 10, grid: { color: '#334155' }, ticks: { display: false } },
                x: { display: false } 
            },
            plugins: { legend: { display: false } }
        }
    });
}

function generateNewSandboxTarget() {
    matchType = Math.random() > 0.5 ? 'velocity' : 'acceleration';
    const targetDisplay = document.getElementById('target-val');
    const matchLabel = document.getElementById('match-label');
    
    if (matchType === 'velocity') {
        targetSpeed = (Math.random() * 4 + 1);
        if(targetDisplay) targetDisplay.innerText = targetSpeed.toFixed(2) + " m/s";
        if(matchLabel) matchLabel.innerText = "VELOCITY MATCH";
        chart.data.datasets[2].borderColor = '#fbbf24'; 
        ghostLineData.fill(targetSpeed);
    } else {
        targetAccel = (Math.random() * 2 + 0.5); 
        if(targetDisplay) targetDisplay.innerText = targetAccel.toFixed(2) + " m/s²";
        if(matchLabel) matchLabel.innerText = "ACCEL MATCH";
        chart.data.datasets[2].borderColor = '#ef4444'; 
        ghostLineData.fill(targetAccel);
    }
    if(chart) chart.data.datasets[2].data = [...ghostLineData];
}

/* --- THREE.JS SETUP --- */
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(22, 25, 22);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    platformGroup = new THREE.Group();
    scene.add(platformGroup);

    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 22), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
    base.position.y = -0.5;
    base.receiveShadow = true;
    platformGroup.add(base);
    platformGroup.add(new THREE.GridHelper(22, 22, 0x4ade80, 0x1e293b));

    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 80 }));
    ball.castShadow = true;
    platformGroup.add(ball);

    arrowG = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0xef4444);
    arrowF = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x3b82f6);
    arrowN = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, 0x4ade80);
    scene.add(arrowG, arrowF, arrowN);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20);
    light.castShadow = true;
    scene.add(light);

    initGraph();
    resetGame();
    if (controlMethod === 'mobile') window.addEventListener('deviceorientation', handleOrientation);
    gameActive = true;
    animate();
}

function handleOrientation(e) {
    if (calibBeta === null) { calibBeta = e.beta; calibGamma = e.gamma; return; }
    tiltX = e.gamma - calibGamma;
    tiltY = e.beta - calibBeta;
}

function resetGame() {
    px = 0; pz = 0; vx = 0; vz = 0;
    matchTimerCount = 0;
    ball.rotation.set(0, 0, 0);
    generateNewSandboxTarget();
}

/* --- ANIMATION LOOP --- */
function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    if (controlMethod === 'pc') updateKeyboardTilt();

    mass = parseFloat(document.getElementById('live-mass')?.value || 0.5);
    mu = parseFloat(document.getElementById('live-mu')?.value || 0.15);
    g = parseFloat(document.getElementById('live-g')?.value || 9.81);

    const radX = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltX, -25, 25));
    const radZ = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(tiltY, -25, 25));
    platformGroup.rotation.z = -radX;
    platformGroup.rotation.x = radZ;

    const fgX = mass * g * Math.sin(radX);
    const fgZ = mass * g * Math.sin(radZ);
    const norm = mass * g * Math.cos(Math.sqrt(radX**2 + radZ**2));
    const fMax = mu * norm;

    let nFX = (Math.abs(fgX) > fMax) ? fgX - (Math.sign(fgX) * fMax) : 0;
    let nFZ = (Math.abs(fgZ) > fMax) ? fgZ - (Math.sign(fgZ) * fMax) : 0;

    vx = (nFX === 0) ? vx * 0.92 : vx + (nFX / mass) * 0.016;
    vz = (nFZ === 0) ? vz * 0.92 : vz + (nFZ / mass) * 0.016;
    px += vx; pz += vz;

    // Boundary Logic
    if (Math.abs(px) > 11) px = -Math.sign(px) * 11;
    if (Math.abs(pz) > 11) pz = -Math.sign(pz) * 11;

    ball.position.set(px, 0.5, pz);
    ball.rotation.z -= vx / 0.5;
    ball.rotation.x += vz / 0.5;

    const speed = Math.sqrt(vx*vx + vz*vz);
    const accel = Math.sqrt(nFX**2 + nFZ**2) / mass;

    document.getElementById('rot-x').innerText = (tiltY).toFixed(1); 
    document.getElementById('rot-z').innerText = (tiltX).toFixed(1); 
    document.getElementById('v-total').innerText = speed.toFixed(2);
    document.getElementById('a-total').innerText = accel.toFixed(2);

    /* --- SANDBOX LOGIC --- */
    let diff = (matchType === 'velocity') ? Math.abs(speed - targetSpeed) : Math.abs(accel - targetAccel);
    let tolerance = (matchType === 'velocity') ? velocityTolerance : accelTolerance;

    if (matchType === 'velocity') {
        document.getElementById('v-total').style.color = (diff < tolerance) ? "#4ade80" : "var(--accent-cyan)";
    } else {
        document.getElementById('a-total').style.color = (diff < tolerance) ? "#ef4444" : "var(--text-main)";
    }

    if (diff < tolerance) matchTimerCount += 0.016;
    else matchTimerCount = Math.max(0, matchTimerCount - 0.01);
    document.getElementById('match-progress').style.width = (matchTimerCount / 3 * 100) + "%";
    if (matchTimerCount >= 3) { matchTimerCount = 0; generateNewSandboxTarget(); }

    if (chart) {
        chart.data.datasets[0].data.push(speed); chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.push(accel); chart.data.datasets[1].data.shift();
        chart.update('none');
    }

    const wPos = new THREE.Vector3(); ball.getWorldPosition(wPos);
    updateArrow(arrowG, fgX, fgZ, wPos, 0.5); 
    updateArrow(arrowF, -vx * 10, -vz * 10, wPos, 0.6); 
    updateArrow(arrowN, nFX, nFZ, wPos, 0.7); 

    renderer.render(scene, camera);
}

function updateArrow(arrow, fx, fz, pos, height) {
    const dir = new THREE.Vector3(fx, 0, fz);
    let len = dir.length() * VECTOR_SCALE;
    len = Math.min(len, MAX_VECTOR_LENGTH);
    if (len > 0.05) {
        arrow.setDirection(dir.normalize());
        arrow.setLength(len, 0.3, 0.15);
        arrow.position.copy(pos);
        arrow.position.y += height;
        arrow.visible = true;
    } else arrow.visible = false;
}

/* --- UI ACTIONS --- */
document.getElementById('start-button').onclick = () => {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('hud-left').classList.remove('hidden');
    document.getElementById('hud-right').classList.remove('hidden');
    document.getElementById('match-hud').classList.remove('hidden');
    if (controlMethod === 'mobile' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res => { if (res === 'granted') initThree(); });
    } else initThree();
};

document.getElementById('reset-ball-btn').onclick = resetGame;

window.addEventListener('resize', () => {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});