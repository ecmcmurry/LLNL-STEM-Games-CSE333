let hintVisible = false;
//Timer function
let timeLeft = 30;
let timerInterval = null;
let droppedValue = null;
let categoryLevel = [];
let categoryStats = {
    ohmsLaw: { correct: 0, incorrect: 0 },
    resistor: { correct: 0, incorrect: 0 },
    complexLevel: { correct: 0, incorrect: 0 }
};
let currentLevel = 0;
let lives = 3; 
//onclick function when the game is started it will close the previous screen and activate the game screen
function startGame() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelScreen').style.display = 'none';
    document.getElementById('play-screen').style.display  = 'flex';
    document.querySelector('.draggables').style.visibility = 'visible';
    categoryStats = {
        ohmsLaw: { correct: 0, incorrect: 0 },
        resistor: { correct: 0, incorrect: 0 },
        complexLevel: { correct: 0, incorrect: 0 }
    };
    categoryLevel = [...levels];
    currentLevel = 0;
    lives = 3;
    loadLevel();
    startTimer();
    updateHearts();
}

//Home screen is prompted when clicked on
function homeScreen() {
    document.getElementById('howToPlay').style.display = 'none';
    document.getElementById('play-screen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelScreen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'flex';
    document.querySelector('.draggables').style.visibility = 'hidden';
}

//How to play screen is prompted when clicked on
function howToPlay() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelScreen').style.display = 'none';
    document.getElementById('howToPlay').style.display = 'flex';
    document.querySelector('.draggables').style.visibility = 'hidden';
}

//result screen is prompted when the player 
function resultScreen() {
    document.getElementById('howToPlay').style.display = 'none';
    document.getElementById('play-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'flex';
}

//Timer function for game
function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 30;
    document.getElementById('timer').innerText = timeLeft;
    timerInterval = setInterval(function() {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft == 0){
            clearInterval(timerInterval);
            gameOver();
        }
 
    }, 1000);
}

function levelScreen(){
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('levelScreen').style.display  = 'flex';
}

//Game finished functions
function gameOver(){
    clearInterval(timerInterval);
    document.getElementById('resultTitle').innerText = 'Game Over!';
    showStats();  // 👈 replaces the static message
    document.getElementById('play-screen').style.display = 'none';
    document.querySelector('.draggables').style.visibility = 'hidden';
    resultScreen();
}

function nextLevel(){
    currentLevel++;
    if(currentLevel >= categoryLevel.length){
        clearInterval(timerInterval);
        WinScreen();
    } else {
        loadLevel();
        startTimer();
    }
}

//Various levels with certain objectives or changes needed
const levels = [

    {
        category: 'ohmsLaw',
        level: 1, 
        voltage: 12,
        goal: 3,
        goalType: 'current', 
        resistance: null,
        dropZones: [
            {top: '49%', left: '60.5%'},
        ],
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_blank1.1.png',
        Answer: 3, 
        components: [
            {type: 'resistor', label: '4Ω', img: 'assets/horizontal-resistor.png', value: 4},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]   
    },

    {
        category: 'ohmsLaw',
        level: 2,
        fixedCurrent: 2,
        resistance: 4,
        voltage: null,
        goal: '(?)',
        goalType: 'voltage', 
        dropZones: [
            {top: '49%', left: '38.25%'},
        ],
        hint: "Ohm's Law: V = I × R",
        boardImg: 'assets/CircuitBoard_level2.png',
        Answer: 8,
        components: [
            {type: 'battery', label: '8V', img: 'assets/Horizontal-Battery.png', value: 8},
            {type: 'battery', label: '3V', img: 'assets/Horizontal-Battery.png', value: 3},
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },
    
    {
        category: 'ohmsLaw',
        level: 3,
        fixedCurrent: 3,
        goal: 3,
        goalType: 'current',
        resistance: null,
        voltage: null,
        dropZones: [
            {top: '60%', left: '38.26%'},
            {top: '27.2%', left: '38.26%'},
        ],
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_level3.png',
        Answer: 3,
        components: [
            {type: 'resistor', label: '2Ω', img: 'assets/horizontal-resistor.png', value: 2},
            {type: 'resistor', label: '6Ω', img: 'assets/horizontal-resistor.png', value: 6}, 
            {type: 'battery', label: '6v', img: 'assets/Horizontal-Battery.png', value: 6},
            {type: 'battery', label: '3V', img: 'assets/Horizontal-Battery.png', value: 3},
        ]
    },

    {
        category: 'resistor',
        level: 4,
        voltage: 15,
        fixedCurrent: 1,
        goalType: 'series',
        goal: 5,
        dropZones: [
            {top: '60%', left: '38.26%'},
            {top: '27.2%', left: '38.26%'},
        ],
        hint: "Series resistors: R_total = R1 + R2",
        boardImg: 'assets/CircuitBoard_level4.png',
        Answer: 13,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },

    {
        category: 'resistor',
        level: 5,
        voltage: 15,
        goal: 5,
        goalType: 'series',
        dropZones: [
            {top: '60%', left: '38.26%'},
            {top: '38%', left: '38.26%'},
            {top: '16%', left: '38.26%'},
        ],
        hint: "Series resistors: R_total = R1 + R2 + R3",
        boardImg: 'assets/CircuitBoard_level5.png',
        Answer: 16,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    }, 

    {   
        category: 'resistor',
        level: 6,
        voltage: 15,
        goal: 5,
        goalType: 'parallel',
        dropZones: [
            {top: '27.3%', left: '38.26%'},
            {top: '38%', left: '60.26%'},
            {top: '60%', left: '38.26%'},
        ],
        hint: "Parallel: 1/R_total = 1/R1 + 1/R2",
        boardImg: 'assets/CircuitBoard_level6.png',
        Answer: 5,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
            {type: 'resistor', label: '10Ω', img: 'assets/horizontal-resistor.png', value: 10},
        ]
    },

    {
        category: 'complexLevel', 
        goalType: 'tau',
        level: 7,
        voltage: 15,
        fixedResistor: 10,
        resistance: 10,
        goal: 5,
        dropZones: [
            {top: '27.3%', left: '38.26%'},
        ],
        hint: "RC Circuit: τ = R × C",
        boardImg: 'assets/CircuitBoard_level7.png',
        Answer: 5,
        components: [
        {type: 'capacitor', label: '0.2F', img: 'assets/Capacitor.png', value: 0.2},
        {type: 'capacitor', label: '0.5F', img: 'assets/Capacitor.png', value: 0.5}, 
        {type: 'capacitor', label: '1.0F', img: 'assets/Capacitor.png', value: 1.0},
        {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
        ]
    },
    {
        category: 'complexLevel',
        level: 8,
        fixedResistor: 5,      
        fixedCapacitor: 1,    
        goalType: 'switch',    
        hint: "τ = R × C — calculate the time constant then pick the right switch!",
        boardImg: 'assets/CircuitBoard_level8.png',
        Answer: 5,             
        dropZones: [
            {top: '71%', left: '60.26%'},
        ],
        components: [
            {type: 'switch', label: '3s', img: 'assets/switch.gif', value: 3},
            {type: 'switch', label: '5s', img: 'assets/switch.gif', value: 5},  
            {type: 'switch', label: '8s', img: 'assets/switch.gif', value: 8},
        ]
    },
    {
        category: 'complexLevel',
        level: 9,
        fixedResistor: 1000,    // 👈 fixed on board
        goalType: 'tau',
        goal: 5,                // target τ = 5 seconds
        hint: "RL Circuit: τ = L / R — pick the inductor that gives τ = 5s!",
        boardImg: 'assets/CircuitBoard_level9.png',
        Answer: 5,
        dropZones: [
            {top: '27.3%', left: '38.26%'},
        ],
        components: [
            {type: 'inductor', label: '2000H', img: 'assets/Inductor.png', value: 2000},
            {type: 'inductor', label: '5000H', img: 'assets/Inductor.png', value: 5000}, 
            {type: 'inductor', label: '8000H', img: 'assets/Inductor.png', value: 8000},
        ]
    },

    {
        category: 'complexLevel',
        level: 10,
        voltage: 12,          
        fixedR1: 8,             
        goalType: 'voltageDivider',
        hint: "Voltage Divider: V_out = V_in × R2 / (R1 + R2) — pick R2!",
        boardImg: 'assets/CircuitBoard_level10.png',
        Answer: 4,             
        dropZones: [
            {top: '27.3%', left: '38.26%'},  
        ],
        components: [
            {type: 'resistor', label: '2Ω',  img: 'assets/horizontal-resistor.png', value: 2},
            {type: 'resistor', label: '4Ω',  img: 'assets/horizontal-resistor.png', value: 4},  
            {type: 'resistor', label: '6Ω',  img: 'assets/horizontal-resistor.png', value: 6},
            {type: 'resistor', label: '10Ω', img: 'assets/horizontal-resistor.png', value: 10},
        ]
    },

     /* {
         category: 'complexLevel',
         level: 11,
         voltage: 15,
         goal: 5,
         dropZones: [
             {top: '49%', left: '38.26%'},
         ],
         hint: "Ohm's Law: V = I * R",
         boardImg: 'assets/CircuitBoard_level11.png',
         Answer: 5,
         components: [
             {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
             {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
             {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
         ]
     } */


];

//checking the value connected to the dropped resistor and checking if it is the correct answer for the level
function checkAnswer() {
    const level = categoryLevel[currentLevel];
    const dropZones = Array.from(document.querySelectorAll('.dropZone'));

    const getVal = (type) => {
        const found = dropZones.find(z => z.dataset.type === type);
        return found ? parseFloat(found.dataset.value) : null;
    };

    let result;

    if (level.goalType === 'current') {
        const V = level.voltage ?? getVal('battery');
        const R = level.resistance ?? getVal('resistor');
        if (V !== null && R !== null) {
            result = V / R;
        }

    } else if (level.goalType === 'voltage') {
        const I = level.fixedCurrent ?? getVal('battery'); 
        const R = level.resistance ?? getVal('resistor');
        if (I !== null && R !== null) {
            result = I * R;
        }

    } else if (level.goalType === 'series') {
        result = dropZones.reduce((sum, z) => sum + (parseFloat(z.dataset.value) || 0), 0);

    } else if (level.goalType === 'parallel') {
        const values = dropZones.map(z => parseFloat(z.dataset.value) || 0);

        if (values.length === 3) {
            const r1 = values[0];
            const r2 = values[1];
            const r3 = values[2];
            const seriesBranch = r1 + r3;
            if (seriesBranch + r2 > 0) {
                result = (seriesBranch * r2) / (seriesBranch + r2);
            }
        } else if (values.length === 2) {
            const r1 = values[0];
            const r2 = values[1];
            if (r1 + r2 > 0) {
                result = (r1 * r2) / (r1 + r2);
            }
        }

    } else if (level.goalType === 'tau') {
        const S = getVal('switch');
        const C = getVal('capacitor');
        const L = getVal('inductor');  
        const R = level.fixedResistor ?? getVal('resistor');

        if(S !== null){
            result = S;                    
        } else if(C !== null && R !== null){
            result = R * C;                
        } else if(L !== null && R !== null){
            result = L / R;                
        }
    } else if (level.goalType === 'switch') {
        result = getVal('switch'); 
    } else if (level.goalType === 'voltageDivider') {
        const R2 = getVal('resistor');
        const R1 = level.fixedR1;
        const Vin = level.voltage;

        if(R2 !== null && R1 !== null && Vin !== null){
            result = Vin * R2 / (R1 + R2);  
        }
    }

    // FINAL VALIDATION
    if (result !== undefined && Math.abs(result - level.Answer) < 0.1) {
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

        if (lives < 1) gameOver();
    }
}
//heart function that updates the hearts accordingly to the answers
function updateHearts(){
    const heartsContainer = document.getElementById('hearts');
    heartsContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        if (i < lives) {
        const heart = document.createElement('img');
        heart.src = 'assets/Heart.png';
        heart.classList.add('heart');
        heartsContainer.appendChild(heart);
        } else {
        const emptyHeart = document.createElement('img');
        emptyHeart.src = 'assets/Empty-Heart.png';
        emptyHeart.classList.add('heart');
        heartsContainer.appendChild(emptyHeart);
        }
    }
}

async function toggleHint(){
    const level = categoryLevel[currentLevel];
    const hintText = document.getElementById('hintText');
    const speechBubble = document.getElementById('speechBubble');

    if(!hintVisible){
        speechBubble.style.display = 'block';
        hintText.innerText = 'Thinking...';
        try {
            const response = await askAI();
            hintText.innerText = response;
        } catch(err) {
            hintText.innerText = level.hint;  
            console.error(err);
        }
        hintVisible = true;
    } else {
        speechBubble.style.display = 'none';
        hintText.innerText = '';
        hintVisible = false;
    }
}

async function askAI() {
    const level = categoryLevel[currentLevel];
    const dropZones = document.querySelectorAll('.dropZone');
    const currentDrops = [...dropZones].map(zone => zone.dataset.value || 'empty');
    const allEmpty = [...dropZones].every(zone => !zone.dataset.value);

    let prompt = '';
    if(allEmpty){
        prompt = `Student is on level ${level.level}.
                  Goal: ${level.goalType}
                  Formula: ${level.hint}
                  They have not tried anything yet. Give them a starting nudge.`;
    } else if(lives < 3){
        prompt = `Student is on level ${level.level}.
                  Goal: ${level.goalType}
                  Formula: ${level.hint}
                  They have lost ${3 - lives} lives. Be more helpful but dont give the answer.`;
    } else {
        prompt = `Student is on level ${level.level}.
                  Goal: ${level.goalType}
                  Formula: ${level.hint}
                  They dropped: ${currentDrops.join(', ')}. Guide them.`;
    }

    const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: prompt })
    });

    if(!response.ok){
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.hint;
}

function loadLevel() {

    const level = categoryLevel[currentLevel];
    hintVisible = false;
    document.getElementById('circuitBoardImg').src = level.boardImg;
    
    const goalText = document.getElementById('goalText');
    if (level.goalType === 'current') {
        goalText.innerHTML = `Circuit V: <span>${level.voltage ?? '?'}</span>V &nbsp; Resistance <span>(${level.resistance ?? '?'})</span> Current Goal I: <span>${level.goal}</span>A`;
    } else if (level.goalType === 'voltage') {
        goalText.innerHTML = `Current I: <span>${level.fixedCurrent ?? '?'}</span>A &nbsp; Resistance <span>(${level.resistance ?? '?'})</span> Voltage Goal V: <span class="unknown">?</span>V`;
    } else if (level.goalType === 'resistance' || level.goalType === 'parallel' || level.goalType === 'series') {
        goalText.innerHTML = `Target Total Resistance: <span>${level.Answer}</span>Ω`;
    } else if (level.goalType === 'tau') {
    if(level.fixedCapacitor){
        // RC circuit — find capacitor
        goalText.innerHTML = `R: <span>${level.fixedResistor}</span>&Omega; &nbsp;|&nbsp; C: <span class="unknown">?</span>F &nbsp;|&nbsp; &tau;: <span>${level.goal}</span>s`;
    } else if(level.fixedResistor && !level.fixedCapacitor){
        // RL circuit — find inductor
        goalText.innerHTML = `R: <span>${level.fixedResistor}</span>&Omega; &nbsp;|&nbsp; L: <span class="unknown">?</span>H &nbsp;|&nbsp; &tau;: <span>${level.goal}</span>s`;
    }
    } else if (level.goalType === 'frequency') {
        goalText.innerHTML = `Target Frequency f: <span>${level.goal}</span>Hz`;
    } else if (level.goalType === 'switch') {
    goalText.innerHTML = `R: <span>${level.fixedResistor}</span>&Omega; &nbsp;|&nbsp; C: <span>${level.fixedCapacitor}</span>F &nbsp;|&nbsp; &tau; = <span class="unknown">?</span>s`;
    } else if (level.goalType === 'voltageDivider') {
    goalText.innerHTML = `V_in: <span>${level.voltage}</span>V &nbsp;|&nbsp; R1: <span>${level.fixedR1}</span>&Omega; &nbsp;|&nbsp; R2: <span class="unknown">?</span>&Omega; &nbsp;|&nbsp; V_out: <span>${level.Answer}</span>V`;
    }


    const overlay = document.querySelector('.boardOverlay'); 
    overlay.innerHTML = '';
    level.dropZones.forEach((zone, index) => {
        const dropZone = document.createElement('div');
        dropZone.classList.add('dropZone');
        dropZone.id = `slot${index + 1}`;
        dropZone.style.top = zone.top;
        dropZone.style.left = zone.left;
        overlay.appendChild(dropZone);
    });


    const slots = document.getElementById('componentSlots');
    slots.innerHTML = '';
    level.components.forEach(component => {
        const p = document.createElement('p');
        p.classList.add('slotDesign');
        p.draggable = true;
        
        p.dataset.type = component.type; 
        p.dataset.value = component.value;
        
        const img = document.createElement('img');
        img.src = component.img;
        img.classList.add('component-img');
        
        const label = document.createElement('span');
        label.classList.add('component-label');
        label.innerText = component.label;
        
        p.appendChild(img);
        p.appendChild(label);
        slots.appendChild(p);
    });

    dragMethod();
}

function dragMethod() {
    let components = document.getElementsByClassName('slotDesign');
    let dropZones = document.querySelectorAll('.dropZone');
    let slots = document.getElementById('componentSlots');
    let selectedComponent = null;

    slots.ondragstart = function(e) {
        selectedComponent = e.target.closest('.slotDesign');
    };

    dropZones.forEach(dropZone => {
        dropZone.addEventListener('dragover', (e) => e.preventDefault());
        
        dropZone.addEventListener('drop', function(e) {
            if (selectedComponent) {
                const img = selectedComponent.querySelector('.component-img').cloneNode(true);
                dropZone.innerHTML = '';
                dropZone.appendChild(img);

                dropZone.dataset.value = selectedComponent.dataset.value;
                dropZone.dataset.type = selectedComponent.dataset.type;

                const level = categoryLevel[currentLevel]; 
                
                const filledZones = document.querySelectorAll('.dropZone[data-value]');
                
                if (filledZones.length === level.dropZones.length) {
                    setTimeout(checkAnswer, 150);
                }
                
                selectedComponent = null;
            }
        });
    });

    slots.addEventListener('dragover', (e) => e.preventDefault());
    slots.addEventListener('drop', function(e) {
        if (selectedComponent) {
            slots.appendChild(selectedComponent);
            selectedComponent = null;
        }
    });
}
function WinScreen(){
    document.getElementById('resultTitle').innerText = 'Congratulations!';
    showStats();
    document.getElementById('play-screen').style.display = 'none';
    document.querySelector('.draggables').style.visibility = 'hidden';
    resultScreen();
}
async function showStats(){
    const stats = categoryStats;
    
    const categoryNames = {
        ohmsLaw: "Ohm's Law",
        resistor: 'Resistors',
        complexLevel: 'Complex Circuits'
    };

    const playedCategories = Object.keys(stats).filter(cat => 
        stats[cat].correct > 0 || stats[cat].incorrect > 0
    );

    if(playedCategories.length === 0){
        document.getElementById('resultMessage').innerHTML = `<p>No levels completed yet!</p>`;
        return;
    }

    const best = playedCategories.reduce((a, b) => 
        stats[a].correct > stats[b].correct ? a : b
    );
    const worst = playedCategories.reduce((a, b) => 
        stats[a].incorrect > stats[b].incorrect ? a : b
    );

    const statsRows = playedCategories.map(cat => 
        `<p>${categoryNames[cat]}: ${stats[cat].correct}✅ ${stats[cat].incorrect}❌</p>`
    ).join('');

    // show stats immediately while AI loads
    document.getElementById('resultMessage').innerHTML = `
        <p>Your Performance:</p>
        ${statsRows}
        <p id="aiRecommendation">🤔 Generating study recommendation...</p>
    `;

    // get AI recommendation
    try {
        const prompt = `A student just finished a circuit theory game.
                        Their performance:
                        ${playedCategories.map(cat => 
                            `${categoryNames[cat]}: ${stats[cat].correct} correct, ${stats[cat].incorrect} incorrect`
                        ).join('\n')}
                        
                        Best category: ${categoryNames[best]}
                        Worst category: ${categoryNames[worst]}
                        
                        Give a 2 sentence personalized study recommendation.
                        Be specific about what to study in ${categoryNames[worst]}.
                        Be encouraging and mention their strength in ${categoryNames[best]}.`;

        const response = await fetch('/api/hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: prompt })
        });

        const data = await response.json();
        document.getElementById('aiRecommendation').innerHTML = `${data.hint}`;

    } catch(err) {
        // fallback to static recommendation
        document.getElementById('aiRecommendation').innerHTML = 
            `Focus on studying ${categoryNames[worst]} — especially the formulas!`;
        console.error(err);
    }
}

function categorySelection(category){
    categoryStats = {
        ohmsLaw: { correct: 0, incorrect: 0 },
        resistor: { correct: 0, incorrect: 0 },
        complexLevel: { correct: 0, incorrect: 0 }
    };
    categoryLevel = levels.filter(level => level.category === category);
    currentLevel = 0;
    lives = 3;
    updateHearts();

    document.getElementById('levelScreen').style.display = 'none';
    document.getElementById('play-screen').style.display = 'flex';
    document.querySelector('.draggables').style.visibility = 'visible';

    loadLevel();
    startTimer();

}