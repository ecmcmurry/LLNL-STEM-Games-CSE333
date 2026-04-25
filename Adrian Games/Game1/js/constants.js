/* Game constants and physics refactored */
const BALL_RADIUS = 0.5;
const PLATFORM_HALF = 14;
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
const W3_GATE_X             = 7.0; // ±X position of the negative / positive gates
const W3_GATE_W             = 5.0; // Z half-span of each gate opening
const W3_MIN_ENTRY_V        = 0.5; // m/s — minimum speed to count as a valid gate crossing
const W3_CIRCLE_R           = 6.0; // radius of the circular lap track
// W4 angles are defined inline in W4_RAMPS in levels.js
const W5_HEIGHTS            = [1, 2, 3, 5, 10]; // drop heights in metres
const W5_G_ACCEPTED         = 9.81;              // reference g shown to students
const W5_PAD_RADIUS         = 0.9;               // roll-in detection radius for launch pads
const W5_PAD_DWELL          = 0.6;               // seconds the ball must dwell on a pad to commit

//W6 · CREATE — preset planets the student can drop a ball on
const W6_PLANETS = [
    { name: 'Moon',    g: 1.62,  color: 0xcbd5e1 },
    { name: 'Mars',    g: 3.71,  color: 0xf97316 },
    { name: 'Earth',   g: 9.81,  color: 0x22d3ee },
    { name: 'Jupiter', g: 24.79, color: 0xfbbf24 },
    { name: 'Pluto',   g: 0.62,  color: 0xa78bfa }
];
const W6_HEIGHT_CHOICES     = [2, 5, 10, 15, 20]; // drop heights available in Create mode
const PLAYER_FORCE_SCALE = 10; //m/s² equivalent applied to ball from WASD
const JUMP_IMPULSE = 7;  //m/s upward velocity applied on jump
