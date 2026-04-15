//Check answer function just checks answers based on basic formulas of circuit theory
//It also is dynamic to user selection so the components and value matters 
function checkAnswer() {
    //makes sure the user is using the appropriate level constants
    const level = categoryLevel[currentLevel];
    const dropZones = Array.from(document.querySelectorAll('.dropZone'));
    //grabbing the values that are dropped from the user
    const getVal = (type) => {
        const found = dropZones.find(z => z.dataset.type === type);
        return found ? parseFloat(found.dataset.value) : null;
    };

    let result;
    /*Each value will be assumed to have a hard code if it doesnt then it will check
    the dropped value with getVal*/
    if(level.goalType === 'current'){
        const V = level.voltage ?? getVal('battery');
        const R = level.resistance ?? getVal('resistor');
        if(V !== null && R !== null) result = V / R;

    } else if(level.goalType === 'voltage'){
        const I = level.fixedCurrent ?? getVal('battery');
        const R = level.resistance ?? getVal('resistor');
        if(I !== null && R !== null) result = I * R;

    } else if(level.goalType === 'series'){
        const fixed = (level.fixedR1 ?? 0) + (level.fixedR2 ?? 0);
        result = fixed + dropZones.reduce((sum, z) => sum + (parseFloat(z.dataset.value) || 0), 0);

    } else if(level.goalType === 'parallel'){
        const values = dropZones.map(z => parseFloat(z.dataset.value) || 0);
        if(values.length === 3){
            const series = values[0] + values[2];
            if(series + values[1] > 0) result = (series * values[1]) / (series + values[1]);
        } else if(values.length === 2){
            const [r1, r2] = values;
            if(r1 + r2 > 0) result = (r1 * r2) / (r1 + r2);
        }

    } else if(level.goalType === 'tau'){
        const S = getVal('switch');
        const C = getVal('capacitor');
        const L = getVal('inductor');
        const R = level.fixedResistor ?? getVal('resistor');
        if(S !== null) result = S;
        else if(C !== null && R !== null) result = R * C;
        else if(L !== null && R !== null) result = L / R;

    } else if(level.goalType === 'switch'){
        result = getVal('switch');

    } else if(level.goalType === 'voltageDivider'){
        const R2  = level.fixedR2 ?? getVal('resistor');
        const R1  = level.fixedR1 ?? getVal('resistor');
        const Vin = level.voltage;
        if(R2 !== null && R1 !== null && Vin !== null){
            result = Vin * R2 / (R1 + R2);
        }
    }
    //If results are correct it will go to the next level other wise minus one heart and if your at your
    //final heart it goes to game over
    if(result !== undefined && Math.abs(result - level.Answer) < 0.1){
        categoryStats[level.category].correct++;
        nextLevel();
    } else {
        categoryStats[level.category].incorrect++;
        lives--;
        updateHearts();
        dropZones.forEach(zone => {
            zone.innerHTML = '';
            delete zone.dataset.value;
            delete zone.dataset.type;
        });
        if(lives < 1) gameOver();
    }
}
//basic game over screen that displays student metrics and displays either home or retry button
function gameOver() {
    clearInterval(timerInterval);
    document.getElementById('resultTitle').innerText = 'Game Over!';
    showStats();
    document.getElementById('play-screen').style.display   = 'none';
    document.querySelector('.draggables').style.visibility = 'hidden';
    resultScreen();
}
//basic win screen that displays student metrics and either a home or retry button
function WinScreen() {
    document.getElementById('resultTitle').innerText = 'Congratulations!';
    showStats();
    document.getElementById('play-screen').style.display   = 'none';
    document.querySelector('.draggables').style.visibility = 'hidden';
    resultScreen();
}

/*Show stats show the main key metrics that are tracked throughout the game and gives the students
AI recommendation for what to focus for studying*/
async function showStats() {
    //basic category levels 
    const stats = categoryStats;
    const categoryNames = {
        ohmsLaw: "Ohm's Law",
        resistor: 'Resistors',
        complexLevel: 'Complex Circuits'
    };
    //checks if any categorical levels have been played to display metrics of the student
    const played = Object.keys(stats).filter(cat => stats[cat].correct > 0 || stats[cat].incorrect > 0);
    if(played.length === 0){
        document.getElementById('resultMessage').innerHTML = '<p>No levels completed yet!</p>';
        return;
    }
    //checks for best and worse through the corrects and incorrect metrics
    const best = played.reduce((a, b) => stats[a].correct > stats[b].correct ? a : b);
    const worst = played.reduce((a, b) => stats[a].incorrect > stats[b].incorrect ? a : b);
    /*Below this comment the code utilizes the AI for a recommendation based on the
    categorical results of the students performance */

    const rows = played.map(cat =>
        `<p>${categoryNames[cat]}: ${stats[cat].correct} correct ${stats[cat].incorrect} incorrect</p>`
    ).join('');

    const header = isTestMode ? '<p>Full Circuit Results:</p>' : '<p>Your Performance:</p>';

    document.getElementById('resultMessage').innerHTML = `
        ${header}
        ${rows}
        <p id="aiRecommendation">Generating recommendation...</p>
    `;

    try {
        const prompt = `A student just finished a circuit theory game.
        Performance:
        ${played.map(cat => `${categoryNames[cat]}: ${stats[cat].correct} correct, ${stats[cat].incorrect} incorrect`).join('\n')}
        Best: ${categoryNames[best]}
        Worst: ${categoryNames[worst]}
        Give a 2 sentence personalized study recommendation.
        Be specific about ${categoryNames[worst]}.
        Be encouraging about their strength in ${categoryNames[best]}.`;

        const response = await fetch('/api/hint', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ context: prompt })
        });
        const data = await response.json();
        document.getElementById('aiRecommendation').innerHTML = `${data.hint}`;
    } catch(err) {
        document.getElementById('aiRecommendation').innerHTML =
            `Focus on studying ${categoryNames[worst]}`;
        console.error(err);
    }
}