//This file was generated using Claude Sonnet 4.6, but I have taken the time to understand what it means
/**
 * fourierGame.unit.test.js
 * Jest unit tests for all pure-logic functions in fourierGame.js
 */

const {
  randomRounded,
  generateWave,
  generateComposite,
  getDifficultyForScore,
  applyDifficulty,
  checkSolution,
  computeMaxAmplitude,
  makeSubwave,
  makeRealwave,
} = require('../src/fourierGame');

// ─── randomRounded ────────────────────────────────────────────────────────────

describe('randomRounded', () => {
  test('always returns a value within [min, max]', () => {
    for (let i = 0; i < 200; i++) {
      const v = randomRounded(0, 1, 0.05);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('returns a value that is a multiple of the rnd increment', () => {
    for (let i = 0; i < 200; i++) {
      const v = randomRounded(0, 1, 0.05);
      // Multiply by 20 (1/0.05) and check it is (close to) an integer
      expect(Math.round(v * 20)).toBeCloseTo(v * 20, 8);
    }
  });

  test('respects a custom rnd increment (0.1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = randomRounded(0.5, 5, 0.1);
      expect(Math.round(v * 10)).toBeCloseTo(v * 10, 8);
    }
  });

  test('works when min === max', () => {
    const v = randomRounded(0.5, 0.5, 0.05);
    expect(v).toBeCloseTo(0.5);
  });
});

// ─── generateWave ────────────────────────────────────────────────────────────

describe('generateWave', () => {
  const wave = { amplitude: 1, frequency: 1, phase: 0, enabled: 1 };

  test('returns 0 at t=0 for a sine wave with phase=0', () => {
    expect(generateWave(wave, 0)).toBeCloseTo(0);
  });

  test('returns 1 at t=0.25 for A=1, f=1 (quarter period peak)', () => {
    expect(generateWave(wave, 0.25)).toBeCloseTo(1);
  });

  test('returns 0 at t=0.5 for A=1, f=1 (half period zero crossing)', () => {
    expect(generateWave(wave, 0.5)).toBeCloseTo(0);
  });

  test('returns -1 at t=0.75 for A=1, f=1 (three-quarter period trough)', () => {
    expect(generateWave(wave, 0.75)).toBeCloseTo(-1);
  });

  test('scales correctly with amplitude', () => {
    const w2 = { ...wave, amplitude: 0.5 };
    expect(generateWave(w2, 0.25)).toBeCloseTo(0.5);
  });

  test('returns 0 when wave is disabled (enabled=0)', () => {
    const disabled = { ...wave, enabled: 0 };
    expect(generateWave(disabled, 0.25)).toBe(0);
  });

  test('phase shift moves the wave correctly (φ = π/2 → cosine)', () => {
    const cosWave = { amplitude: 1, frequency: 1, phase: Math.PI / 2, enabled: 1 };
    // sin(2π·1·0 + π/2) = cos(0) = 1
    expect(generateWave(cosWave, 0)).toBeCloseTo(1);
  });

  test('frequency doubles the oscillation rate', () => {
    const fastWave = { amplitude: 1, frequency: 2, phase: 0, enabled: 1 };
    // Peak at t = 1/(2·2) = 0.125
    expect(generateWave(fastWave, 0.125)).toBeCloseTo(1);
  });
});

// ─── generateComposite ───────────────────────────────────────────────────────

describe('generateComposite', () => {
  const w1 = { amplitude: 1, frequency: 1, phase: 0, enabled: 1 };
  const w2 = { amplitude: 1, frequency: 2, phase: 0, enabled: 1 };

  test('returns 0 for an empty wave array', () => {
    expect(generateComposite([], 0.25)).toBe(0);
  });

  test('matches generateWave for a single enabled wave', () => {
    expect(generateComposite([w1], 0.25)).toBeCloseTo(1);
  });

  test('sums two enabled waves', () => {
    // At t=0.25: sin(2π·1·0.25)=1, sin(2π·2·0.25)=sin(π)=0 → sum=1
    expect(generateComposite([w1, w2], 0.25)).toBeCloseTo(1);
  });

  test('ignores disabled waves', () => {
    const disabledW2 = { ...w2, enabled: 0 };
    expect(generateComposite([w1, disabledW2], 0.25)).toBeCloseTo(generateComposite([w1], 0.25));
  });

  test('all disabled returns 0', () => {
    const d1 = { ...w1, enabled: 0 };
    const d2 = { ...w2, enabled: 0 };
    expect(generateComposite([d1, d2], 0.25)).toBe(0);
  });

  test('composite is the algebraic sum (superposition principle)', () => {
    const t = 0.3;
    const expected = generateWave(w1, t) + generateWave(w2, t);
    expect(generateComposite([w1, w2], t)).toBeCloseTo(expected);
  });
});

// ─── getDifficultyForScore ───────────────────────────────────────────────────

describe('getDifficultyForScore', () => {
  const cases = [
    { score: 1,  waveCount: 1, freEnabled: false, phaEnabled: false },
    { score: 2,  waveCount: 1, freEnabled: true,  phaEnabled: false },
    { score: 4,  waveCount: 1, freEnabled: true,  phaEnabled: true  },
    { score: 6,  waveCount: 2, freEnabled: true,  phaEnabled: false },
    { score: 9,  waveCount: 2, freEnabled: true,  phaEnabled: true  },
    { score: 12, waveCount: 3, freEnabled: true,  phaEnabled: false },
    { score: 15, waveCount: 3, freEnabled: true,  phaEnabled: true  },
    { score: 18, waveCount: 4, freEnabled: true,  phaEnabled: false },
    { score: 21, waveCount: 4, freEnabled: true,  phaEnabled: true  },
  ];

  test.each(cases)(
    'score=$score → waveCount=$waveCount, freq=$freEnabled, phase=$phaEnabled',
    ({ score, waveCount, freEnabled, phaEnabled }) => {
      const d = getDifficultyForScore(score);
      expect(d.waveCount).toBe(waveCount);
      expect(d.freEnabled).toBe(freEnabled);
      expect(d.phaEnabled).toBe(phaEnabled);
      expect(d.ampEnabled).toBe(true); // amplitude is always enabled
    }
  );

  test('amplitude is always enabled at every defined score', () => {
    [1,2,4,6,9,12,15,18,21].forEach(s => {
      expect(getDifficultyForScore(s).ampEnabled).toBe(true);
    });
  });

  test('returns a valid object for un-triggered score (e.g. 3)', () => {
    const d = getDifficultyForScore(3);
    expect(d).toHaveProperty('waveCount');
    expect(d).toHaveProperty('ampEnabled');
  });
});

// ─── applyDifficulty ─────────────────────────────────────────────────────────

describe('applyDifficulty', () => {
  function freshWaves() {
    const colors = ['#00ff2f','#fff200','#74c0fc','#da77f2'];
    const sub  = colors.map(c => makeSubwave(c));
    const real = [0,1,2,3].map(() => makeRealwave());
    return { sub, real };
  }

  test('enables exactly waveCount subwaves and realwaves', () => {
    const { sub, real } = freshWaves();
    applyDifficulty(sub, real, { waveCount: 2, ampEnabled: true, freEnabled: true, phaEnabled: false });
    expect(sub.filter(w => w.enabled).length).toBe(2);
    expect(real.filter(w => w.enabled).length).toBe(2);
  });

  test('disables all waves that are beyond waveCount', () => {
    const { sub, real } = freshWaves();
    applyDifficulty(sub, real, { waveCount: 1, ampEnabled: true, freEnabled: false, phaEnabled: false });
    expect(sub[1].enabled).toBe(0);
    expect(sub[2].enabled).toBe(0);
    expect(sub[3].enabled).toBe(0);
  });

  test('sets realwave frequency to 2.5 when freEnabled=false', () => {
    const { sub, real } = freshWaves();
    applyDifficulty(sub, real, { waveCount: 1, ampEnabled: true, freEnabled: false, phaEnabled: false });
    expect(real[0].frequency).toBe(2.5);
  });

  test('sets realwave phase to 0 when phaEnabled=false', () => {
    const { sub, real } = freshWaves();
    applyDifficulty(sub, real, { waveCount: 1, ampEnabled: true, freEnabled: false, phaEnabled: false });
    expect(real[0].phase).toBe(0);
  });

  test('randomises frequency when freEnabled=true', () => {
    const { sub, real } = freshWaves();
    const frequencies = new Set();
    for (let i = 0; i < 30; i++) {
      applyDifficulty(sub, real, { waveCount: 1, ampEnabled: true, freEnabled: true, phaEnabled: false });
      frequencies.add(real[0].frequency);
    }
    // Over 30 rolls there should be at least 2 distinct values
    expect(frequencies.size).toBeGreaterThan(1);
  });

  test('randomises phase when phaEnabled=true', () => {
    const { sub, real } = freshWaves();
    const phases = new Set();
    for (let i = 0; i < 30; i++) {
      applyDifficulty(sub, real, { waveCount: 1, ampEnabled: true, freEnabled: false, phaEnabled: true });
      phases.add(real[0].phase);
    }
    expect(phases.size).toBeGreaterThan(1);
  });

  test('amplitude stays at 0.5 when ampEnabled=false', () => {
    const { sub, real } = freshWaves();
    applyDifficulty(sub, real, { waveCount: 1, ampEnabled: false, freEnabled: false, phaEnabled: false });
    expect(real[0].amplitude).toBe(0.5);
  });

  test('realwave amplitude is within [0.05, 1] when ampEnabled=true', () => {
    const { sub, real } = freshWaves();
    for (let i = 0; i < 50; i++) {
      applyDifficulty(sub, real, { waveCount: 1, ampEnabled: true, freEnabled: false, phaEnabled: false });
      expect(real[0].amplitude).toBeGreaterThanOrEqual(0.05);
      expect(real[0].amplitude).toBeLessThanOrEqual(1);
    }
  });
});

// ─── checkSolution ───────────────────────────────────────────────────────────

describe('checkSolution', () => {
  function wave(amp, freq, phase = 0, enabled = 1) {
    return { amplitude: amp, frequency: freq, phase, enabled };
  }

  test('returns true when single subwave exactly matches single realwave', () => {
    const sub  = [wave(0.5, 2.5)];
    const real = [wave(0.5, 2.5)];
    expect(checkSolution(sub, real, 1)).toBe(true);
  });

  test('returns false when amplitude does not match', () => {
    const sub  = [wave(0.4, 2.5)];
    const real = [wave(0.5, 2.5)];
    expect(checkSolution(sub, real, 1)).toBe(false);
  });

  test('returns false when frequency does not match', () => {
    const sub  = [wave(0.5, 2.0)];
    const real = [wave(0.5, 2.5)];
    expect(checkSolution(sub, real, 1)).toBe(false);
  });

  test('returns false when phase difference >= 0.05π', () => {
    const sub  = [wave(0.5, 2.5, 0)];
    const real = [wave(0.5, 2.5, 0.05 * Math.PI)];
    expect(checkSolution(sub, real, 1)).toBe(false);
  });

  test('returns true when phase difference < 0.05π (within tolerance)', () => {
    const sub  = [wave(0.5, 2.5, 0)];
    const real = [wave(0.5, 2.5, 0.04 * Math.PI)];
    expect(checkSolution(sub, real, 1)).toBe(true);
  });

  test('requires all waveCount waves to match (2-wave case, partial match fails)', () => {
    const sub  = [wave(0.5, 2.5), wave(0.3, 1.5)];
    const real = [wave(0.5, 2.5), wave(0.8, 3.0)];
    expect(checkSolution(sub, real, 2)).toBe(false);
  });

  test('returns true when all waves in a 2-wave scenario match', () => {
    const sub  = [wave(0.5, 2.5), wave(0.3, 1.5)];
    const real = [wave(0.5, 2.5), wave(0.3, 1.5)];
    expect(checkSolution(sub, real, 2)).toBe(true);
  });

  test('ignores disabled subwaves', () => {
    const sub  = [wave(0.5, 2.5, 0, 1), wave(0.9, 4.0, 0, 0)];
    const real = [wave(0.5, 2.5, 0, 1), wave(0.9, 4.0, 0, 0)];
    // waveCount=1, only the first enabled pair should count
    expect(checkSolution(sub, real, 1)).toBe(true);
  });

  test('returns false when subwave is disabled but realwave is enabled', () => {
    const sub  = [wave(0.5, 2.5, 0, 0)]; // disabled
    const real = [wave(0.5, 2.5, 0, 1)]; // enabled
    expect(checkSolution(sub, real, 1)).toBe(false);
  });
});

// ─── computeMaxAmplitude ─────────────────────────────────────────────────────

describe('computeMaxAmplitude', () => {
  test('returns 0 for an empty array', () => {
    expect(computeMaxAmplitude([])).toBe(0);
  });

  test('returns 0 when all waves are disabled', () => {
    const waves = [{ amplitude: 0.5, enabled: 0 }, { amplitude: 0.8, enabled: 0 }];
    expect(computeMaxAmplitude(waves)).toBe(0);
  });

  test('sums amplitudes of enabled waves only', () => {
    const waves = [
      { amplitude: 0.5, enabled: 1 },
      { amplitude: 0.8, enabled: 0 },
      { amplitude: 0.3, enabled: 1 },
    ];
    expect(computeMaxAmplitude(waves)).toBeCloseTo(0.8);
  });

  test('returns full sum when all waves are enabled', () => {
    const waves = [
      { amplitude: 0.5, enabled: 1 },
      { amplitude: 0.5, enabled: 1 },
    ];
    expect(computeMaxAmplitude(waves)).toBeCloseTo(1.0);
  });
});

// ─── Integration: score → difficulty → solution check ────────────────────────

describe('Integration: full round trip', () => {
  function freshWaves() {
    const colors = ['#00ff2f','#fff200','#74c0fc','#da77f2'];
    const sub  = colors.map(c => makeSubwave(c));
    const real = [0,1,2,3].map(() => makeRealwave());
    return { sub, real };
  }

  test('copying realwave params to subwave causes checkSolution to return true', () => {
    const { sub, real } = freshWaves();
    const diff = getDifficultyForScore(2); // 1 wave, amp + freq
    applyDifficulty(sub, real, diff);

    // "Player" solves by copying params
    sub[0].amplitude = real[0].amplitude;
    sub[0].frequency = real[0].frequency;
    sub[0].phase     = real[0].phase;

    expect(checkSolution(sub, real, diff.waveCount)).toBe(true);
  });

  test('checkSolution returns false before player adjusts sliders', () => {
    const { sub, real } = freshWaves();
    const diff = getDifficultyForScore(6); // 2 waves
    applyDifficulty(sub, real, diff);
    // Sub waves start at defaults (amplitude=0.5, freq=2.5) - very unlikely to match
    // We force them to known wrong values to make the test deterministic
    sub[0].amplitude = 0.0;
    sub[1].amplitude = 0.0;
    expect(checkSolution(sub, real, diff.waveCount)).toBe(false);
  });

  test('waveCount increases correctly across difficulty transitions', () => {
    const milestones = [6, 9, 12, 15, 18, 21];
    milestones.forEach(score => {
      const { waveCount } = getDifficultyForScore(score);
      expect(waveCount).toBeGreaterThanOrEqual(2);
    });
  });

  test('generateComposite of matched waves equals generateComposite of realwaves at multiple time points', () => {
    const { sub, real } = freshWaves();
    const diff = getDifficultyForScore(4);
    applyDifficulty(sub, real, diff);

    sub[0].amplitude = real[0].amplitude;
    sub[0].frequency = real[0].frequency;
    sub[0].phase     = real[0].phase;

    [0, 0.1, 0.5, 1.0, 1.9].forEach(t => {
      const playerVal = generateComposite(sub.filter(w => w.enabled), t);
      const targetVal = generateComposite(real.filter(w => w.enabled), t);
      expect(playerVal).toBeCloseTo(targetVal, 10);
    });
  });
});
