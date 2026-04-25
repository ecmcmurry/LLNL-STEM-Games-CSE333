/* refactored game states to match engine */

//Three.js scene objects
let scene, camera, renderer, platformGroup, ballMesh;

//Ball physics
let ballPos = new THREE.Vector3(0, BALL_RADIUS + 0.01, 0);
let ballVel = new THREE.Vector3(0, 0, 0);

//Tilt & control
let tiltX = 0, tiltZ = 0;
let controlMethod = 'pc';
let calibBeta = null, calibGamma = null;

//Real phone accelerometer magnitude (m/s²) — 0 on PC, ~9.81 at rest on mobile
let phoneAccelMag = 9.81;

//Game loop timing
let gameActive = false;
let lastTimestamp = null, accumulator = 0;
let onSurface = true, currentAccelMag = 0;

//Keyboard state
const keys = { w: false, a: false, s: false, d: false };
let jumpQueued = false;

//Force arrows (Three.js ArrowHelpers)
let arrowGravSurf, arrowNormal, arrowFriction, arrowDrag;

//Force vectors (reused each frame)
const F = {
    gravity:  new THREE.Vector3(),
    gravSurf: new THREE.Vector3(),
    normal:   new THREE.Vector3(),
    friction: new THREE.Vector3(),
    rolling:  new THREE.Vector3(),
    drag:     new THREE.Vector3(),
    net:      new THREE.Vector3()
};

//Trail for visual effects
let trailMesh;
let trailPositions, trailColors;

//Chart
let chart;
let chartSpeed = Array(CHART_LEN).fill(0);
let chartAccel = Array(CHART_LEN).fill(0);

//Sandbox velocity match
let targetSpeed = 2.5, matchTimer = 0;

//Level system
let selectedLevel = 0, currentLevel = 0;
let levelPhase = 'sandbox', levelState = {};
let paramsOverride = null, tiltLocked = false;

//W1 scene objects
let w1Checkpoints = null, w1DispArrow = null;

//W2 scene objects
let w2StartMesh = null, w2GoalMesh = null, w2DispArrow = null;

//W3 scene objects
let w3NegGate = null, w3PosGate = null, w3VelArrow = null, w3NumberLine = null, w3CircleRing = null;

//W4 scene objects
let w4Group = null;

//W5 tower & trial data
let w5TowerGroup = null, w5PlatformRings = [];
let w5Building = null, w5Elevator = null;
let w5TrialLog = [], w5Falling = false, w5FallStart = 0;
let w5AccelDisplay = 9.81, w5ScatterChart = null;
let w5LaunchPads = [], w5ActivePad = null, w5PadDwellT = 0;

//W6 create-mode scene objects + scenario config
let w6Group = null, w6Elevator = null, w6GuideWire = null;
let w6Scenario = null;
let w6Falling = false, w6FallStart = 0;
