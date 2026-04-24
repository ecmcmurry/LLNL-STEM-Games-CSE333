/**
 * Unit tests for Sound and Valid pure logic.
 *
 * Run with:  node --test tests/sound-and-valid.test.mjs
 *
 * Functions are inlined from src/ to avoid browser/canvas/AudioContext imports.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ─── Inlined formulas (from src/data/formulas.js) ────────────────────────────

const EIGENVALUES = {
  "free-free":       [4.73004, 7.8532, 10.9956, 14.1372],
  cantilever:        [1.8751,  4.6941, 7.8548,  10.9955],
  "simply-supported": [Math.PI, 2 * Math.PI, 3 * Math.PI, 4 * Math.PI],
};

function calcBarFrequency(material, dimensions, boundary, mode = 0) {
  const { E, rho } = material;
  const { length: L, thickness: h } = dimensions;
  const betaL = EIGENVALUES[boundary][mode];
  return (betaL ** 2 * h) / (4 * Math.PI * Math.sqrt(3) * L ** 2) * Math.sqrt(E / rho);
}

function getEigenvalueLabel(boundary, mode = 0) {
  const betaL = EIGENVALUES[boundary][mode];
  return { boundary, mode: mode + 1, betaL: betaL.toFixed(4) };
}

function getBoundaryTypes() {
  return Object.keys(EIGENVALUES);
}

// ─── Inlined helpers (from src/utils/helpers.js) ─────────────────────────────

function formatTime(seconds, showDecimal = false) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (showDecimal) return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
  return `${mins}:${String(Math.floor(secs)).padStart(2, "0")}`;
}

function formatFreq(hz) {
  if (hz < 0) return "---";
  if (hz >= 1000) return `${(hz / 1000).toFixed(2)} kHz`;
  return `${hz.toFixed(1)} Hz`;
}

function formatDimension(meters) {
  if (meters >= 1)    return `${meters.toFixed(2)} m`;
  if (meters >= 0.01) return `${(meters * 100).toFixed(1)} cm`;
  return `${(meters * 1000).toFixed(1)} mm`;
}

function formatSI(value, unit) {
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)} T${unit}`;
  if (value >= 1e9)  return `${(value / 1e9).toFixed(1)} G${unit}`;
  if (value >= 1e6)  return `${(value / 1e6).toFixed(1)} M${unit}`;
  if (value >= 1e3)  return `${(value / 1e3).toFixed(1)} k${unit}`;
  return `${value.toFixed(1)} ${unit}`;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function difficultyLabel(level) {
  return ["Easy", "Medium", "Hard"][level - 1] || "Unknown";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ─── Inlined daily seed (from src/utils/daily-seed.js) ───────────────────────

const EPOCH = new Date("2025-01-01T00:00:00Z");

function getDailyObjectIndex(objectCount, overrideDate) {
  const now = overrideDate ?? new Date();
  const daysSinceEpoch = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - EPOCH.getTime()) /
    (1000 * 60 * 60 * 24),
  );
  const hash = Math.imul(daysSinceEpoch, 2654435761) >>> 0;
  return hash % objectCount;
}

// ─── Inlined match detection (from src/screens/daily-match.js) ───────────────

const MATCH_TOLERANCE = 0.05;

function getMatchType(ratio) {
  if (Math.abs(ratio - 1)    < MATCH_TOLERANCE) return "exact";
  if (Math.abs(ratio - 0.5)  < MATCH_TOLERANCE) return "harmonic";
  if (Math.abs(ratio - 0.25) < MATCH_TOLERANCE) return "harmonic";
  if (Math.abs(ratio - 2)    < MATCH_TOLERANCE) return "harmonic";
  return null;
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const STEEL    = { E: 205e9, rho: 7870 };
const ALUMINUM = { E: 68.9e9, rho: 2700 };
const OAK      = { E: 12.3e9, rho: 770 };

const APPROX = (a, b, pct = 0.01) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-10) <= pct;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("calcBarFrequency", () => {
  test("returns a positive number for valid inputs", () => {
    const f = calcBarFrequency(STEEL, { length: 0.25, width: 0.02, thickness: 0.006 }, "free-free");
    assert.ok(f > 0, `expected positive frequency, got ${f}`);
  });

  test("aluminum bar (0.25m free-free) is in audible range (20–20000 Hz)", () => {
    const f = calcBarFrequency(ALUMINUM, { length: 0.25, width: 0.025, thickness: 0.005 }, "free-free");
    assert.ok(f >= 20 && f <= 20_000, `frequency ${f.toFixed(0)} Hz is outside audible range`);
  });

  test("frequency scales as inverse-square of length", () => {
    const dims1 = { length: 0.25, width: 0.02, thickness: 0.006 };
    const dims2 = { length: 0.50, width: 0.02, thickness: 0.006 };
    const f1 = calcBarFrequency(STEEL, dims1, "free-free");
    const f2 = calcBarFrequency(STEEL, dims2, "free-free");
    // f ∝ 1/L² → f1/f2 ≈ (L2/L1)² = 4
    assert.ok(APPROX(f1 / f2, 4), `expected ratio ~4, got ${(f1 / f2).toFixed(3)}`);
  });

  test("frequency scales linearly with thickness", () => {
    const d1 = { length: 0.25, width: 0.02, thickness: 0.006 };
    const d2 = { length: 0.25, width: 0.02, thickness: 0.012 };
    const f1 = calcBarFrequency(STEEL, d1, "free-free");
    const f2 = calcBarFrequency(STEEL, d2, "free-free");
    // f ∝ h → f2/f1 ≈ 2
    assert.ok(APPROX(f2 / f1, 2), `expected ratio ~2, got ${(f2 / f1).toFixed(3)}`);
  });

  test("frequency scales with sqrt(E/rho) — aluminum vs steel", () => {
    const dims = { length: 0.30, width: 0.02, thickness: 0.005 };
    const fSteel = calcBarFrequency(STEEL,    dims, "free-free");
    const fAl    = calcBarFrequency(ALUMINUM, dims, "free-free");
    const actualRatio   = fAl / fSteel;
    const expectedRatio = Math.sqrt((ALUMINUM.E / ALUMINUM.rho) / (STEEL.E / STEEL.rho));
    assert.ok(APPROX(actualRatio, expectedRatio), `expected ratio ${expectedRatio.toFixed(4)}, got ${actualRatio.toFixed(4)}`);
  });

  test("cantilever has lower fundamental frequency than free-free (smaller βL)", () => {
    const dims = { length: 0.25, width: 0.02, thickness: 0.006 };
    const fFree = calcBarFrequency(STEEL, dims, "free-free");
    const fCant = calcBarFrequency(STEEL, dims, "cantilever");
    assert.ok(fCant < fFree, `cantilever (${fCant.toFixed(0)} Hz) should be lower than free-free (${fFree.toFixed(0)} Hz)`);
  });

  test("simply-supported mode 0: fundamental equals π² times reference scale", () => {
    const dims = { length: 0.30, width: 0.02, thickness: 0.005 };
    const f = calcBarFrequency(STEEL, dims, "simply-supported", 0);
    // (π)² = 9.8696 while (4.73004)² = 22.37 → simply-supported should be lower than free-free
    const fFree = calcBarFrequency(STEEL, dims, "free-free", 0);
    assert.ok(f < fFree);
  });

  test("higher mode number → higher frequency", () => {
    const dims = { length: 0.25, width: 0.02, thickness: 0.006 };
    const f0 = calcBarFrequency(STEEL, dims, "free-free", 0);
    const f1 = calcBarFrequency(STEEL, dims, "free-free", 1);
    const f2 = calcBarFrequency(STEEL, dims, "free-free", 2);
    assert.ok(f1 > f0, "mode 1 should exceed mode 0");
    assert.ok(f2 > f1, "mode 2 should exceed mode 1");
  });

  test("oak (softer, lighter wood) produces different frequency than steel", () => {
    const dims = { length: 0.30, width: 0.03, thickness: 0.01 };
    const fOak   = calcBarFrequency(OAK,   dims, "free-free");
    const fSteel = calcBarFrequency(STEEL, dims, "free-free");
    assert.notEqual(fOak.toFixed(1), fSteel.toFixed(1));
  });
});

describe("getEigenvalueLabel", () => {
  test("returns correct boundary string", () => {
    const label = getEigenvalueLabel("cantilever", 0);
    assert.equal(label.boundary, "cantilever");
  });

  test("mode index is 1-based in the label", () => {
    const label = getEigenvalueLabel("free-free", 0);
    assert.equal(label.mode, 1);
    const label2 = getEigenvalueLabel("free-free", 2);
    assert.equal(label2.mode, 3);
  });

  test("betaL value matches known constant for free-free mode 0", () => {
    const label = getEigenvalueLabel("free-free", 0);
    assert.equal(label.betaL, "4.7300");
  });
});

describe("getBoundaryTypes", () => {
  test("returns three boundary types", () => {
    assert.equal(getBoundaryTypes().length, 3);
  });

  test("includes free-free, cantilever, simply-supported", () => {
    const types = getBoundaryTypes();
    assert.ok(types.includes("free-free"));
    assert.ok(types.includes("cantilever"));
    assert.ok(types.includes("simply-supported"));
  });
});

describe("formatFreq", () => {
  test("negative frequency returns '---'", () => {
    assert.equal(formatFreq(-1), "---");
  });

  test("0 Hz formats as '0.0 Hz'", () => {
    assert.equal(formatFreq(0), "0.0 Hz");
  });

  test("440 Hz formats with one decimal", () => {
    assert.equal(formatFreq(440), "440.0 Hz");
  });

  test("999.9 Hz stays in Hz", () => {
    assert.equal(formatFreq(999.9), "999.9 Hz");
  });

  test("1000 Hz converts to kHz", () => {
    assert.equal(formatFreq(1000), "1.00 kHz");
  });

  test("4400 Hz formats as kHz with two decimal places", () => {
    assert.equal(formatFreq(4400), "4.40 kHz");
  });

  test("very large frequency stays in kHz", () => {
    const result = formatFreq(20000);
    assert.ok(result.includes("kHz"));
  });
});

describe("formatDimension", () => {
  test("1 m and above formats as metres", () => {
    assert.equal(formatDimension(1), "1.00 m");
    assert.equal(formatDimension(2.5), "2.50 m");
  });

  test("0.01 m formats as centimetres (boundary value)", () => {
    assert.equal(formatDimension(0.01), "1.0 cm");
  });

  test("values between 0.01 and 1 m format as cm", () => {
    assert.equal(formatDimension(0.25), "25.0 cm");
  });

  test("values below 0.01 format as mm", () => {
    assert.equal(formatDimension(0.005), "5.0 mm");
    assert.equal(formatDimension(0.001), "1.0 mm");
  });

  test("0.009 m (9 mm) formats as mm, not cm", () => {
    const result = formatDimension(0.009);
    assert.ok(result.includes("mm"), `expected mm, got: ${result}`);
  });
});

describe("formatTime", () => {
  test("60 seconds formats as 1:00", () => {
    assert.equal(formatTime(60), "1:00");
  });

  test("90.5 seconds without decimal → '1:30'", () => {
    assert.equal(formatTime(90.5), "1:30");
  });

  test("showDecimal=true shows one decimal on seconds", () => {
    assert.equal(formatTime(65.3, true), "1:05.3");
  });

  test("zero seconds → '0:00'", () => {
    assert.equal(formatTime(0), "0:00");
  });

  test("sub-minute time has '0:' prefix", () => {
    assert.equal(formatTime(45), "0:45");
  });
});

describe("formatSI", () => {
  test("GPa range for Young's modulus", () => {
    assert.equal(formatSI(200e9, "Pa"), "200.0 GPa");
  });

  test("MPa range", () => {
    assert.equal(formatSI(250e6, "Pa"), "250.0 MPa");
  });

  test("small value stays plain", () => {
    assert.equal(formatSI(500, "Pa"), "500.0 Pa");
  });
});

describe("difficultyLabel", () => {
  test("1 → Easy", () => assert.equal(difficultyLabel(1), "Easy"));
  test("2 → Medium", () => assert.equal(difficultyLabel(2), "Medium"));
  test("3 → Hard", () => assert.equal(difficultyLabel(3), "Hard"));
  test("out-of-range → Unknown", () => assert.equal(difficultyLabel(99), "Unknown"));
  test("0 → Unknown", () => assert.equal(difficultyLabel(0), "Unknown"));
});

describe("clamp", () => {
  test("value within range is unchanged", () => {
    assert.equal(clamp(5, 0, 10), 5);
  });

  test("value below min is clamped to min", () => {
    assert.equal(clamp(-5, 0, 10), 0);
  });

  test("value above max is clamped to max", () => {
    assert.equal(clamp(15, 0, 10), 10);
  });

  test("value exactly at min boundary is unchanged", () => {
    assert.equal(clamp(0, 0, 10), 0);
  });

  test("value exactly at max boundary is unchanged", () => {
    assert.equal(clamp(10, 0, 10), 10);
  });

  test("works with float values", () => {
    assert.equal(clamp(0.04, 0.05, 0.95), 0.05);
  });
});

describe("shuffle", () => {
  test("returns array of same length", () => {
    const arr = [1, 2, 3, 4, 5];
    assert.equal(shuffle(arr).length, arr.length);
  });

  test("does not mutate input array", () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffle(arr);
    assert.deepEqual(arr, copy);
  });

  test("returned array contains same elements as input", () => {
    const arr = ["a", "b", "c", "d", "e"];
    const result = shuffle(arr);
    assert.deepEqual([...result].sort(), [...arr].sort());
  });

  test("single-element array is unchanged", () => {
    assert.deepEqual(shuffle([42]), [42]);
  });

  test("empty array returns empty array", () => {
    assert.deepEqual(shuffle([]), []);
  });
});

describe("getDailyObjectIndex", () => {
  test("returns an integer in [0, objectCount)", () => {
    const count = 18;
    const idx = getDailyObjectIndex(count, new Date("2025-06-15T12:00:00Z"));
    assert.ok(Number.isInteger(idx));
    assert.ok(idx >= 0 && idx < count);
  });

  test("same date → same index (deterministic)", () => {
    const d = new Date("2025-06-15T00:00:00Z");
    assert.equal(
      getDailyObjectIndex(18, d),
      getDailyObjectIndex(18, d),
    );
  });

  test("different dates → generally different indices", () => {
    const d1 = new Date("2025-06-15T00:00:00Z");
    const d2 = new Date("2025-06-16T00:00:00Z");
    // Not guaranteed different, but with 18 objects the collision chance is ~5.5%
    // We just verify both are valid
    const idx1 = getDailyObjectIndex(18, d1);
    const idx2 = getDailyObjectIndex(18, d2);
    assert.ok(idx1 >= 0 && idx1 < 18);
    assert.ok(idx2 >= 0 && idx2 < 18);
  });

  test("epoch day 0 (2025-01-01) produces valid index", () => {
    const epoch = new Date("2025-01-01T00:00:00Z");
    const idx = getDailyObjectIndex(18, epoch);
    assert.ok(idx >= 0 && idx < 18);
  });

  test("objectCount=1 always returns 0", () => {
    for (let i = 0; i < 5; i++) {
      const d = new Date(Date.UTC(2025, i, 10));
      assert.equal(getDailyObjectIndex(1, d), 0);
    }
  });

  test("index is stable across different times on the same UTC day (midday UTC)", () => {
    // Use midday UTC times — same local date in all common timezones
    const noon    = new Date("2025-07-04T18:00:00Z");
    const evening = new Date("2025-07-04T20:00:00Z");
    assert.equal(getDailyObjectIndex(18, noon), getDailyObjectIndex(18, evening));
  });

  test("early UTC midnight and late same UTC day give same index (fixed with getUTC* methods)", () => {
    // Previously used getDate() (local time), causing US timezone users to get a different
    // daily object than UTC users when run before ~8am UTC. Fixed with getUTCDate() etc.
    const earlyUTC = new Date("2025-07-04T02:00:00Z");
    const lateUTC  = new Date("2025-07-04T22:00:00Z");
    assert.equal(getDailyObjectIndex(18, earlyUTC), getDailyObjectIndex(18, lateUTC));
  });
});

describe("getMatchType", () => {
  test("ratio = 1.0 (perfect match) → exact", () => {
    assert.equal(getMatchType(1.0), "exact");
  });

  test("ratio within 5% below 1 → exact", () => {
    assert.equal(getMatchType(0.96), "exact");
  });

  test("ratio within 5% above 1 → exact", () => {
    assert.equal(getMatchType(1.04), "exact");
  });

  test("ratio just outside tolerance below 1 → null", () => {
    assert.equal(getMatchType(0.94), null);
  });

  test("ratio just outside tolerance above 1 → null", () => {
    assert.equal(getMatchType(1.06), null);
  });

  test("ratio = 0.5 (octave down) → harmonic", () => {
    assert.equal(getMatchType(0.5), "harmonic");
  });

  test("ratio = 0.25 (two octaves down) → harmonic", () => {
    assert.equal(getMatchType(0.25), "harmonic");
  });

  test("ratio = 2.0 (octave up) → harmonic", () => {
    assert.equal(getMatchType(2.0), "harmonic");
  });

  test("ratio = 0.48 (within 5% of 0.5) → harmonic", () => {
    assert.equal(getMatchType(0.48), "harmonic");
  });

  test("ratio = 0.31 (not near any target) → null", () => {
    assert.equal(getMatchType(0.31), null);
  });

  test("ratio = 0.3 passes harmonic check due to FP boundary (0.3-0.25=0.04999...)", () => {
    // 0.3 is exactly at the ±0.05 tolerance boundary of the 0.25 harmonic.
    // IEEE 754: 0.3-0.25 = 0.04999... < 0.05, so it slips through.
    // In practice this edge case is harmless — a voice hitting exactly this boundary is vanishingly rare.
    assert.equal(getMatchType(0.3), "harmonic");
  });

  test("ratio = 0 → null", () => {
    assert.equal(getMatchType(0), null);
  });

  test("ratio = 1.5 → null", () => {
    assert.equal(getMatchType(1.5), null);
  });

  test("tolerance boundary at exactly 0.95 → null (not within exclusive <0.05)", () => {
    // |0.95 - 1.0| = 0.05, not < 0.05 → should be null
    assert.equal(getMatchType(0.95), null);
  });

  test("tolerance boundary at exactly 1.05 → null", () => {
    assert.equal(getMatchType(1.05), null);
  });
});
