/* Game constants and physics refactored */
const BALL_RADIUS = 0.5;
const PLATFORM_HALF= 10;
const MAX_SPEED = 20;
const MAX_TILT_DEG = 25;
const RESPAWN_Y = -30;
const FIXED_DT = 1 / 120;
const DT_CAP = 1 / 20;
const ROLLING_MU = 0.005;
const RESTITUTION = 0.3;
const BALL_AREA = Math.PI * BALL_RADIUS * BALL_RADIUS;
const FORCE_SCALE = 0.25;
const STATIC_THRESH = 0.02;
const TRAIL_LENGTH  = 40;
const CHART_LEN = 60;
const MATCH_TOLERANCE = 0.25;
const MATCH_HOLD_TIME = 3;
const W1_SNAPSHOTS_REQUIRED = 8;
const W2_GOAL_RADIUS        = 1.0; // metres — how close ball must get to the gold pole
const W3_GOAL_RADIUS        = 1.2; // metres — entry radius for W3 goal ring
const W3_MIN_SPEED          = 1.5; // m/s — ball must be moving at least this fast on entry
const W3_AIM_TOL_DEG        = 30;  // degrees — velocity must point within this angle of the goal
const W4_TILT_DEG           = 15;  // forced tilt angle that produces constant acceleration
const W4_DURATION           = 4.0; // seconds the trial runs for
const W4_SAMPLES            = 5;   // velocity samples taken at t = 0,1,2,3,4 s
const PLAYER_FORCE_SCALE = 10; //m/s² equivalent applied to ball from WASD
const JUMP_IMPULSE = 7;  //m/s upward velocity applied on jump
