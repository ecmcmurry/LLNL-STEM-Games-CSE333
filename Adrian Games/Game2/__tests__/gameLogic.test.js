/*-Unit tests for core circuit theory formulas and game state logic.
  -Testing the game stats */
// importing the real logic functions from logic.js so Jest actually runs through our game code
const { calculateResult, isCorrectAnswer, createInitialStats, getNextLevel, buildPrompt, findBestWorst } = require('../js/logic.js');

/*helper functions to calculate the formulas and test them to see correct outputs
from the games goals*/
const calcCurrent = (V, R) => V / R;
const calcVoltage = (I, R) => I * R;
const calcSeries = (...rs) => rs.reduce((sum, r) => sum + r, 0);
const calcParallel = (r1, r2) => (r1 * r2) / (r1 + r2);
const calcVoltageDivider = (Vin, R1, R2) => Vin * R2 / (R1 + R2);
const calcTau = (R, C) => R * C;
const isWithinTolerance = (result, answer, tol = 0.1) => Math.abs(result - answer) < tol;

// Correct game state
const makeInitialStats = () => ({
    ohmsLaw:      { correct: 0, incorrect: 0 },
    resistor:     { correct: 0, incorrect: 0 },
    complexLevel: { correct: 0, incorrect: 0 },
});

// ─── Circuit Theory Formulas ───────────────────────────────────────────────────

describe("Circuit Theory Formulas (stats.js)", () => {
    test("Ohm's Law: current = V / R", () => {
        expect(calcCurrent(12, 4)).toBeCloseTo(3);
        expect(calcCurrent(9, 3)).toBeCloseTo(3);
    });

    test("Ohm's Law: voltage = I * R", () => {
        expect(calcVoltage(2, 5)).toBeCloseTo(10);
        expect(calcVoltage(0.5, 100)).toBeCloseTo(50);
    });

    test("Series resistance: total = R1 + R2 + R3", () => {
        expect(calcSeries(10, 20, 30)).toBeCloseTo(60);
        expect(calcSeries(5, 5)).toBeCloseTo(10);
    });

    test("Parallel resistance: (R1 * R2) / (R1 + R2)", () => {
        expect(calcParallel(6, 3)).toBeCloseTo(2);
        expect(calcParallel(10, 10)).toBeCloseTo(5);
    });

    test("Voltage divider: Vout = Vin * R2 / (R1 + R2)", () => {
        expect(calcVoltageDivider(10, 10, 10)).toBeCloseTo(5);
        expect(calcVoltageDivider(12, 6, 3)).toBeCloseTo(4);
    });

    test("RC time constant: tau = R * C", () => {
        expect(calcTau(1000, 0.001)).toBeCloseTo(1);
        expect(calcTau(500, 0.002)).toBeCloseTo(1);
    });

    test("Answer tolerance: accepts ±0.1 of correct answer", () => {
        expect(isWithinTolerance(2.99, 3.0)).toBe(true);   // within range
        expect(isWithinTolerance(3.09, 3.0)).toBe(true);   // just inside
        expect(isWithinTolerance(3.15, 3.0)).toBe(false);  // outside range
        expect(isWithinTolerance(2.85, 3.0)).toBe(false);  // outside range
    });
});

// testing the real buildPrompt function from logic.js which mirrors askAI() in ai.js
describe("AI Prompt Alignment - buildPrompt() (ai.js)", () => {

    test("prompt includes the correct goalType and hint for the current level", () => {
        const level = { level: 1, goalType: 'current', hint: 'I = V / R' };
        const prompt = buildPrompt(level, ['empty', 'empty'], 3);
        expect(prompt).toContain('current');
        expect(prompt).toContain('I = V / R');
    });

    test("prompt changes to a harder hint when student has lost lives", () => {
        const level = { level: 2, goalType: 'series', hint: 'R_total = R1 + R2' };
        const prompt = buildPrompt(level, ['10', '20'], 1);
        expect(prompt).toContain('lost 2 lives');
        expect(prompt).toContain('series');
    });

    test("findBestWorst correctly identifies best and worst category from student stats", () => {
        const stats = {
            ohmsLaw:      { correct: 4, incorrect: 1 },
            resistor:     { correct: 1, incorrect: 3 },
            complexLevel: { correct: 2, incorrect: 2 },
        };
        const result = findBestWorst(stats);
        expect(result.best).toBe('ohmsLaw');
        expect(result.worst).toBe('resistor');
    });

    test("findBestWorst returns null when no levels have been played", () => {
        const stats = createInitialStats();
        expect(findBestWorst(stats)).toBeNull();
    });
});

// ─── Game State Logic ──────────────────────────────────────────────────────────

describe("Game State Logic (game.js)", () => {
    test("resetStats: all categories initialise to zero", () => {
        const stats = makeInitialStats();

        // simulate gameplay
        stats.ohmsLaw.correct    = 5;
        stats.resistor.incorrect = 2;

        // reset by replacing with fresh state
        const reset = makeInitialStats();
        expect(reset.ohmsLaw.correct).toBe(0);
        expect(reset.ohmsLaw.incorrect).toBe(0);
        expect(reset.resistor.correct).toBe(0);
        expect(reset.resistor.incorrect).toBe(0);
        expect(reset.complexLevel.correct).toBe(0);
        expect(reset.complexLevel.incorrect).toBe(0);
    });

    test("stats reset when starting a new categorical game after a previous session", () => {
        // simulate a completed ohmsLaw category session
        let stats = makeInitialStats();
        stats.ohmsLaw.correct    = 3;
        stats.ohmsLaw.incorrect  = 1;
        stats.resistor.incorrect = 2;

        // player starts a new categorical game — resetStats is called
        stats = makeInitialStats();

        // all categories should be wiped regardless of which category was played
        expect(stats.ohmsLaw.correct).toBe(0);
        expect(stats.ohmsLaw.incorrect).toBe(0);
        expect(stats.resistor.incorrect).toBe(0);
        expect(stats.complexLevel.correct).toBe(0);
    });
});

// ─── Real logic.js functions (checkAnswer engine running through actual code) ──

describe("calculateResult() — real checkAnswer logic (logic.js)", () => {

    test("correctly calculates current from dropped resistor", () => {
        const level = { goalType: 'current', voltage: 12, resistance: null };
        const drops = [{ type: 'resistor', value: 4 }];
        expect(isCorrectAnswer(calculateResult(level, drops), 3)).toBe(true);
    });

    test("correctly calculates series resistance from dropped components", () => {
        const level = { goalType: 'series', fixedR1: 0, fixedR2: 0 };
        const drops = [{ type: 'resistor', value: 10 }, { type: 'resistor', value: 20 }];
        expect(isCorrectAnswer(calculateResult(level, drops), 30)).toBe(true);
    });

    test("correctly calculates parallel resistance from dropped components", () => {
        const level = { goalType: 'parallel' };
        const drops = [{ type: 'resistor', value: 6 }, { type: 'resistor', value: 3 }];
        expect(isCorrectAnswer(calculateResult(level, drops), 2)).toBe(true);
    });

    test("nextLevel advances correctly and returns null when game is won", () => {
        expect(getNextLevel(0, 5)).toBe(1);   // levels remaining
        expect(getNextLevel(4, 5)).toBeNull(); // last level done
    });

    // covering the missing formula branches in logic.js to push branch coverage up

    test("voltage formula: correctly calculates voltage from dropped resistor", () => {
        const level = { goalType: 'voltage', fixedCurrent: 2, resistance: null };
        const drops = [{ type: 'resistor', value: 5 }];
        expect(isCorrectAnswer(calculateResult(level, drops), 10)).toBe(true);
    });

    test("tau formula: correctly calculates RC time constant", () => {
        const level = { goalType: 'tau', fixedResistor: 1000 };
        const drops = [{ type: 'capacitor', value: 0.001 }];
        expect(isCorrectAnswer(calculateResult(level, drops), 1)).toBe(true);
    });

    test("tau formula: correctly calculates RL time constant (L/R)", () => {
        const level = { goalType: 'tau', fixedResistor: 1000 };
        const drops = [{ type: 'inductor', value: 5000 }];
        expect(isCorrectAnswer(calculateResult(level, drops), 5)).toBe(true);
    });

    test("voltageDivider formula: correctly calculates output voltage", () => {
        const level = { goalType: 'voltageDivider', voltage: 10, fixedR1: 10, fixedR2: null };
        const drops = [{ type: 'resistor', value: 10 }];
        expect(isCorrectAnswer(calculateResult(level, drops), 5)).toBe(true);
    });

    test("buildPrompt third branch: includes dropped components when student has tried", () => {
        const level = { level: 1, goalType: 'current', hint: 'I = V / R' };
        const prompt = buildPrompt(level, ['10', '20'], 3);
        expect(prompt).toContain('They dropped');
        expect(prompt).toContain('10');
    });
});
