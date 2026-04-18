// Unit tests for Game1 pure physics functions (js/physics.js)
// These run through the real game physics — no DOM, no Three.js needed

const {
    computeForces, updateVelocity, computeSpeed, computeAccel,
    distToGoal, checkBoundary, checkPillarCollision,
    applyKeyTilt, isMatchingTarget, degToRad, clamp
} = require('../js/physics.js');

// ─── Physics Helpers ──────────────────────────────────────────────────────────

describe('degToRad and clamp helpers', () => {
    test('degToRad converts 180 degrees to PI', () => {
        expect(degToRad(180)).toBeCloseTo(Math.PI);
    });

    test('clamp keeps value within range', () => {
        expect(clamp(30, -25, 25)).toBe(25);
        expect(clamp(-30, -25, 25)).toBe(-25);
        expect(clamp(10, -25, 25)).toBe(10);
    });
});

// ─── Force Calculation ────────────────────────────────────────────────────────

describe('computeForces() — mirrors animate() force block', () => {
    test('zero tilt produces zero gravity force components', () => {
        const { fgX, fgZ } = computeForces(0.5, 9.81, 0.15, 0, 0);
        expect(fgX).toBeCloseTo(0);
        expect(fgZ).toBeCloseTo(0);
    });

    test('positive tilt produces positive gravity force', () => {
        const { fgX } = computeForces(0.5, 9.81, 0.15, 15, 0);
        expect(fgX).toBeGreaterThan(0);
    });

    test('high friction with low tilt produces zero net force (ball stays still)', () => {
        const { nFX, nFZ } = computeForces(0.5, 9.81, 0.9, 2, 0);
        expect(nFX).toBeCloseTo(0);
        expect(nFZ).toBeCloseTo(0);
    });

    test('steep tilt with low friction produces non-zero net force (ball moves)', () => {
        const { nFX } = computeForces(0.5, 9.81, 0.05, 25, 0);
        expect(Math.abs(nFX)).toBeGreaterThan(0);
    });

    test('tilt beyond 25 degrees is clamped — same result as 25', () => {
        const a = computeForces(0.5, 9.81, 0.15, 25, 0);
        const b = computeForces(0.5, 9.81, 0.15, 40, 0);
        expect(a.fgX).toBeCloseTo(b.fgX);
    });
});

// ─── Velocity Update ──────────────────────────────────────────────────────────

describe('updateVelocity() — mirrors velocity lines in animate()', () => {
    test('zero net force causes velocity to decay by factor 0.92', () => {
        const { vx } = updateVelocity(1.0, 0, 0, 0, 0.5);
        expect(vx).toBeCloseTo(0.92);
    });

    test('non-zero net force accelerates the ball', () => {
        const { vx } = updateVelocity(0, 0, 2.0, 0, 0.5);
        expect(vx).toBeGreaterThan(0);
    });

    test('ball at rest with no force stays near zero', () => {
        const { vx, vz } = updateVelocity(0, 0, 0, 0, 0.5);
        expect(vx).toBeCloseTo(0);
        expect(vz).toBeCloseTo(0);
    });
});

// ─── Speed & Acceleration ─────────────────────────────────────────────────────

describe('computeSpeed() and computeAccel()', () => {
    test('speed is zero when ball is at rest', () => {
        expect(computeSpeed(0, 0)).toBeCloseTo(0);
    });

    test('speed matches Pythagorean theorem', () => {
        expect(computeSpeed(3, 4)).toBeCloseTo(5);
    });

    test('acceleration is zero when no net force', () => {
        expect(computeAccel(0, 0, 0.5)).toBeCloseTo(0);
    });

    test('acceleration scales correctly with force and mass', () => {
        // a = F/m — net force 5N, mass 0.5kg → accel = 10
        expect(computeAccel(5, 0, 0.5)).toBeCloseTo(10);
    });
});

// ─── Goal Distance ────────────────────────────────────────────────────────────

describe('distToGoal() — challenge mode goal detection', () => {
    test('ball on top of goal returns zero distance', () => {
        expect(distToGoal(3, 4, 3, 4)).toBeCloseTo(0);
    });

    test('distance matches 3-4-5 triangle', () => {
        expect(distToGoal(0, 0, 3, 4)).toBeCloseTo(5);
    });

    test('ball far from goal returns large distance', () => {
        expect(distToGoal(0, 0, 10, 10)).toBeGreaterThan(10);
    });
});

// ─── Boundary Clamping ────────────────────────────────────────────────────────

describe('checkBoundary() — mirrors boundary block in animate()', () => {
    test('sandbox mode wraps ball to opposite side when it exits', () => {
        const { px } = checkBoundary(12, 0, 1, 0, 'sandbox');
        expect(px).toBe(-11);
    });

    test('non-sandbox mode clamps ball and reverses velocity on wall hit', () => {
        const { px, vx } = checkBoundary(11, 0, 2, 0, 'challenge');
        expect(px).toBe(10.5);
        expect(vx).toBeCloseTo(-1);
    });

    test('ball within bounds is unchanged', () => {
        const { px, pz } = checkBoundary(3, 3, 1, 1, 'challenge');
        expect(px).toBe(3);
        expect(pz).toBe(3);
    });
});

// ─── Pillar Collision ─────────────────────────────────────────────────────────

describe('checkPillarCollision() — racing mode pillar', () => {
    test('ball inside pillar radius is pushed out to edge', () => {
        const { px, pz, hit } = checkPillarCollision(1, 0, 1, 0);
        expect(hit).toBe(true);
        expect(Math.sqrt(px * px + pz * pz)).toBeCloseTo(3.5);
    });

    test('velocity reverses and dampens on pillar hit', () => {
        const { vx, hit } = checkPillarCollision(1, 0, 2, 0);
        expect(hit).toBe(true);
        expect(vx).toBeCloseTo(-0.6); // 2 * -0.3
    });

    test('ball outside pillar radius passes through unchanged', () => {
        const { hit } = checkPillarCollision(5, 5, 1, 0);
        expect(hit).toBe(false);
    });
});

// ─── Keyboard Tilt ────────────────────────────────────────────────────────────

describe('applyKeyTilt() — mirrors updateKeyboardTilt() in index.js', () => {
    const noKeys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

    test('pressing ArrowLeft decreases tiltX', () => {
        const { tiltX } = applyKeyTilt(0, 0, { ...noKeys, ArrowLeft: true });
        expect(tiltX).toBeLessThan(0);
    });

    test('pressing ArrowRight increases tiltX', () => {
        const { tiltX } = applyKeyTilt(0, 0, { ...noKeys, ArrowRight: true });
        expect(tiltX).toBeGreaterThan(0);
    });

    test('pressing ArrowUp decreases tiltY', () => {
        const { tiltY } = applyKeyTilt(0, 0, { ...noKeys, ArrowUp: true });
        expect(tiltY).toBeLessThan(0);
    });

    test('releasing all keys causes tilt to decay toward zero', () => {
        const { tiltX } = applyKeyTilt(10, 0, noKeys);
        expect(tiltX).toBeLessThan(10);
    });

    test('tilt is clamped at 25 even when key held at max', () => {
        const { tiltX } = applyKeyTilt(25, 0, { ...noKeys, ArrowRight: true });
        expect(tiltX).toBe(25);
    });

    test('WASD works the same as arrow keys', () => {
        const arrow = applyKeyTilt(0, 0, { ...noKeys, ArrowRight: true });
        const wasd  = applyKeyTilt(0, 0, { ...noKeys, d: true });
        expect(arrow.tiltX).toBeCloseTo(wasd.tiltX);
    });
});

// ─── Sandbox Match Detection ──────────────────────────────────────────────────

describe('isMatchingTarget() — mirrors sandbox tolerance check in animate()', () => {
    test('value exactly on target returns true', () => {
        expect(isMatchingTarget(2.50, 2.50, 0.20)).toBe(true);
    });

    test('value just inside tolerance returns true', () => {
        expect(isMatchingTarget(2.35, 2.50, 0.20)).toBe(true);
    });

    test('value just outside tolerance returns false', () => {
        expect(isMatchingTarget(2.10, 2.50, 0.20)).toBe(false);
    });

    test('accel tolerance of 0.15 is tighter than velocity tolerance of 0.20', () => {
        expect(isMatchingTarget(1.60, 1.50, 0.15)).toBe(false); // outside accel tolerance
        expect(isMatchingTarget(1.60, 1.50, 0.20)).toBe(true);  // inside velocity tolerance
    });
});
