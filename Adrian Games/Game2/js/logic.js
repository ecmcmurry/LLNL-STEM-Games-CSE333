//Pure logic functions extracted from stats.js and game.js
//These have no DOM dependencies so they can be imported and tested by Jest
//The game files remain unchanged and continue to use their own browser globals
//mirrors the formula engine inside checkAnswer() in stats.js
//drops = array of { type, value } objects representing what the student placed
function calculateResult(level, drops) {
    const getVal = (type) => {
        const found = drops.find(d => d.type === type);
        return found ? parseFloat(found.value) : null;
    };

    let result;

    if (level.goalType === 'current') {
        const V = level.voltage    ?? getVal('battery');
        const R = level.resistance ?? getVal('resistor');
        if (V !== null && R !== null) result = V / R;

    } else if (level.goalType === 'voltage') {
        const I = level.fixedCurrent ?? getVal('battery');
        const R = level.resistance   ?? getVal('resistor');
        if (I !== null && R !== null) result = I * R;

    } else if (level.goalType === 'series') {
        const fixed = (level.fixedR1 ?? 0) + (level.fixedR2 ?? 0);
        result = fixed + drops.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);

    } else if (level.goalType === 'parallel') {
        const values = drops.map(d => parseFloat(d.value) || 0);
        if (values.length === 3) {
            const series = values[0] + values[2];
            if (series + values[1] > 0) result = (series * values[1]) / (series + values[1]);
        } else if (values.length === 2) {
            const [r1, r2] = values;
            if (r1 + r2 > 0) result = (r1 * r2) / (r1 + r2);
        }

    } else if (level.goalType === 'tau') {
        const S = getVal('switch');
        const C = getVal('capacitor');
        const L = getVal('inductor');
        const R = level.fixedResistor ?? getVal('resistor');
        if (S !== null) result = S;
        else if (C !== null && R !== null) result = R * C;
        else if (L !== null && R !== null) result = L / R;

    } else if (level.goalType === 'switch') {
        result = getVal('switch');

    } else if (level.goalType === 'voltageDivider') {
        const R2  = level.fixedR2 ?? getVal('resistor');
        const R1  = level.fixedR1 ?? getVal('resistor');
        const Vin = level.voltage;
        if (R2 !== null && R1 !== null && Vin !== null) result = Vin * R2 / (R1 + R2);
    }

    return result;
}

//mirrors the tolerance check in checkAnswer() in stats.js
function isCorrectAnswer(result, answer) {
    return result !== undefined && Math.abs(result - answer) < 0.1;
}

//mirrors resetStats() in game.js
function createInitialStats() {
    return {
        ohmsLaw: { correct: 0, incorrect: 0 },
        resistor: { correct: 0, incorrect: 0 },
        complexLevel: { correct: 0, incorrect: 0 },
    };
}

//mirrors the counter logic inside nextLevel() in game.js
function getNextLevel(currentLevel, totalLevels) {
    const next = currentLevel + 1;
    return next >= totalLevels ? null : next; // null means game is won
}

//mirrors the prompt building logic inside askAI() in ai.js
//drops = array of dropped values as strings e.g. ['10', 'empty']
function buildPrompt(level, drops, lives) {
    const allEmpty = drops.every(d => d === 'empty');
    if (allEmpty) {
        return `Student is on level ${level.level}.
        Goal: ${level.goalType}
        Formula: ${level.hint}
        They have not tried anything yet. Give them a starting nudge.`;
    } else if (lives < 3) {
        return `Student is on level ${level.level}.
        Goal: ${level.goalType}
        Formula: ${level.hint}
        They have lost ${3 - lives} lives. Be more helpful but dont give the answer.`;
    } else {
        return `Student is on level ${level.level}.
        Goal: ${level.goalType}
        Formula: ${level.hint}
        They dropped: ${drops.join(', ')}. Guide them.`;
    }
}

//mirrors the best/worst category logic inside showStats() in stats.js
function findBestWorst(stats) {
    const played = Object.keys(stats).filter(cat => stats[cat].correct > 0 || stats[cat].incorrect > 0);
    if (played.length === 0) return null;
    const best  = played.reduce((a, b) => stats[a].correct   > stats[b].correct   ? a : b);
    const worst = played.reduce((a, b) => stats[a].incorrect > stats[b].incorrect ? a : b);
    return { best, worst };
}

module.exports = { calculateResult, isCorrectAnswer, createInitialStats, getNextLevel, buildPrompt, findBestWorst };
