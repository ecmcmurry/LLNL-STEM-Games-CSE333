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
let w3GoalMesh = null, w3VelArrow = null, w3AimCone = null;

//W4 trial data
let w4Samples = [], w4StartT = 0;
