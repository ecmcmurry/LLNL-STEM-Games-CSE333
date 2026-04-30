# Physics Game Lab

An interactive 3D kinematics game built for CSE 333. Students roll a ball across a tilting platform to explore real physics concepts — each world introduces one idea, lets you measure it directly, then quizzes you on it.

---

## How to Run

Open `index.html` in any modern browser. No build step or server required — all dependencies load from CDN.

```
Adrian Games/Game1/index.html
```

To run the optional local server:

```bash
node server.js
```

---

## Controls

| Device | Move | Jump |
|--------|------|------|
| **Keyboard** | `W A S D` — tilt the platform | Hold `Space` to charge, release to jump |
| **Mobile** | Physically tilt your device (gyroscope) | Hold finger on screen to charge, lift to jump |

### Spring Jump
Holding the jump input charges a spring mechanic — the longer you hold, the stronger the launch (up to 1.5 s for full power). A glowing ring appears at the ball's base and grows from cyan → yellow → red as charge builds. Tapping briefly gives a small hop; a full charge launches the ball much higher.

On mobile, iOS 13+ will prompt for motion/orientation permission on first launch.

---

## Worlds

| Level | Name | Physics Concept |
|-------|------|-----------------|
| **W1** | Position | Position vs Time — place 8 snapshot markers as you roll |
| **W2** | Path vs Arrow | Distance vs Displacement — reach the goal pole |
| **W3** | Velocity Aim | Velocity vs Speed — `v = Δx/t`, signed direction; three runs: negative gate, positive gate, circle lap |
| **W4** | Accelerator | Rolling acceleration — `a = g·sin(θ)/(1 + k)`, k = 2/5 for a solid ball; three ramp angles |
| **W5** | Drop Tower | Free fall — measure `g` by timing drops from known heights |
| **W6** | Sandbox | Endless random challenges with full parameter control |

Every world follows the same flow: **intro modal → active physics challenge → result modal → quiz → bonus question → level complete**.

---

## Sandbox (W6) — Endless Challenges

Random challenges cycle continuously. Score as many as you can.

| Challenge | Goal |
|-----------|------|
| 🟡→🎯 **Jump to Ring** | Roll to the yellow start square, then jump and land inside the orange ring |
| 🏀 **Bounce Count** | Press jump and bounce exactly N times before the ball settles |
| 🚀 **Reach Height** | Jump and reach a target height (m) |
| ⚡ **Go Fast** | Hold a speed *over* the target for 3 seconds |
| 🐢 **Go Slow** | Hold a speed *under* the target for 3 seconds (must actually be moving) |

Every completed challenge adds to your score shown in the HUD.

---

## Sandbox Lab Controls

Available in the left HUD panel during Sandbox (W6):

| Parameter | Symbol | Default | Effect |
|-----------|--------|---------|--------|
| Friction | μ | 0.30 | Surface grip on the ball |
| Mass | m | 0.5 kg | Resistance to acceleration — ball visually scales with mass |
| Gravity | gY | −9.81 m/s² | Vertical pull (lower = Moon/Mars feel) |
| Drag coefficient | Cd | 0.47 | Air resistance shape factor |
| Air density | ρ | 1.225 kg/m³ | Scales how much drag the ball feels |
| Bounciness | e | 0.30 | Restitution coefficient — 0 = dead stop, 1 = full elastic bounce |

Force arrows (gravity component, normal, friction, drag) can be toggled on/off via the checkbox.

---

## Analytics HUD

The right panel shows a live `Chart.js` line graph of:
- **Speed** (green) — `|v|` in m/s
- **Acceleration** (red) — `|a|` in m/s²
- **Target** (yellow dashed) — shown in W4 and W6 speed challenges

Telemetry readouts below the chart: speed, acceleration magnitude, tilt angles, normal force, and kinetic energy.

---

## Physics Engine

`js/physics-engine.js` runs a fixed-timestep integrator at **120 Hz** (`FIXED_DT = 1/120 s`).

Each step:
1. Computes platform normal from `platformGroup.quaternion` — so tilting the platform group automatically gives correct inclined-plane physics.
2. Applies gravity, normal force, kinetic/rolling friction, and aerodynamic drag.
3. Adds WASD force input (bypassed when `tiltLocked = true`, e.g. in W4).
4. Integrates velocity and position with Euler integration.
5. Resolves ball–platform penetration and applies restitution on bounce. Impacts below 0.15 m/s are absorbed without a bounce to prevent micro-hops.

Key constants (`js/constants.js`):

```
BALL_RADIUS        = 0.5 m
PLATFORM_HALF      = 14 m        (28 × 28 m board)
ROLLING_MU         = 0.005       (rolling resistance)
RESTITUTION        = 0.3         (default — overridable via Bounciness slider in W6)
MAX_SPEED          = 20 m/s
FIXED_DT           = 1/120 s
JUMP_IMPULSE       = 7 m/s       (uncharged tap)
MAX_CHARGE_TIME    = 1.5 s       (hold time for full charge)
MAX_CHARGE_IMPULSE = 22 m/s      (full-charge jump velocity)
```

### W4 — Inclined Ramp Physics

The platform physically tilts via `platformGroup.rotation.z`. The correct rolling-without-slipping formula is used throughout:

```
a = g · sin(θ) / (1 + k)     where k = I_cm / (mR²) = 2/5 for a solid ball
  = 5g · sin(θ) / 7
```

Air drag is disabled in W4 (`cd = 0, rho = 0`) so the measured `a = Δv/Δt` matches theory and the kinematics cross-check `Δx = ½·a·t²` holds.

A sliding block would reach `a = g·sin(θ)` — the rolling ball is slower because part of gravity's pull goes into spinning it.

---

## File Structure

```
Game1/
├── index.html          — Shell, HUD markup, level select UI
├── index.css           — Retro terminal visual style
├── server.js           — Optional local HTTP server
├── js/
│   ├── constants.js    — All tunable numbers in one place
│   ├── state.js        — All global mutable state
│   ├── physics-engine.js — Fixed-step physics, force accumulation
│   ├── scene.js        — Three.js scene, ball, trails, force arrows, charge ring
│   ├── ui.js           — Telemetry, chart, modal, HUD helpers
│   ├── levels.js       — All 6 worlds: intro, update loop, quiz, W6 challenge system
│   └── main.js         — Game loop, input handling, spring-jump, boot sequence
└── __tests__/
    ├── physics.test.js — Unit tests for physics engine
    └── e2e.test.js     — End-to-end browser tests
```

---

## Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| [Three.js](https://threejs.org/) | r160 | 3D rendering — scene, meshes, shadows, arrow helpers |
| [Chart.js](https://www.chartjs.org/) | latest | Live speed/acceleration line chart |

Both load from CDN — no `npm install` needed.

---

## Tech Notes

- **No build system.** Plain ES5-compatible JavaScript across all files.
- **Mobile support.** `DeviceOrientationEvent` and `DeviceMotionEvent` with iOS 13+ permission flow. Touch hold charges the jump; lift fires it.
- **Spring jump.** Charge time is tracked in `spaceDown` / `jumpChargeTime`. Impulse interpolates linearly from `JUMP_IMPULSE` (tap) to `MAX_CHARGE_IMPULSE` (full hold). A `chargeRing` mesh in the scene scales and colour-shifts as charge builds.
- **Micro-bounce fix.** Restitution only fires when impact normal velocity exceeds 0.15 m/s — soft grazes zero out the normal component instead, eliminating chart noise and false bounce counts.
- **Camera.** Fixed at `(0, 32, 30)` looking at origin — zero X offset keeps the square platform square (not diamond).
- **Platform tilt.** `platformGroup.rotation` drives all inclined-plane levels. `getPlatformNormal()` reads the quaternion so physics automatically adjusts.
- **Level isolation.** Each world stores state in a plain `levelState` object. `startLevel(n)` resets it and calls the appropriate `startWn()` function.
- **Modal system.** `showModal()` / `showExplanation()` / `hideModal()` in `ui.js` handle all quiz and info dialogs. Physics is paused while `levelPhase === 'question'`.
- **Ball scaling.** In W6, the ball mesh and physics radius both scale by `∛(mass / 0.5)` — doubling mass grows the ball by ≈ 26% visually and physically.
