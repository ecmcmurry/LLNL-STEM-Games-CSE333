let hintVisible = false;
//Timer function
let timeLeft = 30;
let timerInterval = null;
let droppedValue = null;
let categoryLevel = [];
//onclick function when the game is started it will close the previous screen and activate the game screen
function startGame() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelScreen').style.display = 'none';
    document.getElementById('play-screen').style.display  = 'flex';
    document.querySelector('.draggables').style.visibility = 'visible';
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
    document.getElementById('resultMessage').innerText = 'Better luck next time!';
    document.getElementById('play-screen').style.display = 'none';
    document.querySelector('.draggables').style.visibility = 'hidden';
    resultScreen();
}

function nextLevel(){
    currentLevel++;
    if(currentLevel >= categoryLevel.length){
        clearInterval(timerInterval);
        document.getElementById('resultTitle').innerText = 'Congratulations!';
        document.getElementById('resultMessage').innerText = 'You have completed all levels!';
        document.getElementById('play-screen').style.display = 'none';
        document.querySelector('.draggables').style.visibility = 'hidden';
        resultScreen();
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
        boardImg: 'assets/CircuitBoard_blank (1).png',
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
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_level2.png',
        Answer: 8,
        components: [
            {type: 'battery', label: '8V', img: 'assets/Horizontal-Battery.png', value: 8},
            {type: 'battery', label: '3V', img: 'assets/Horizontal-Battery.png', value: 3},
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 0},
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
            {type: 'resistor', label: '6Ω', img: 'assets/horizontal-resistor.png', value: 5},
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
        hint: "Ohm's Law: V = I * R",
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
        hint: "Ohm's Law: V = I * R",
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
        hint: "Ohm's Law: V = I * R",
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
        hint: "Ohm's Law: V = I * R",
        boardImg: 'assets/CircuitBoard_level7.png',
        Answer: 5,
        components: [
        {type: 'capacitor', label: '0.2F', img: 'assets/Capacitor.png', value: 0.2},
        {type: 'capacitor', label: '0.5F', img: 'assets/Capacitor.png', value: 0.5}, 
        {type: 'capacitor', label: '1.0F', img: 'assets/Capacitor.png', value: 1.0},
        {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
        ]
    },
    // {
    //     category: 'complexLevel',
    //     level: 8,
    //     voltage: 15,
    //     goal: 5,
    //     dropZones: [
    //         {top: '71%', left: '60.26%'},
    //     ],
    //     hint: "Ohm's Law: V = I * R",
    //     boardImg: 'assets/CircuitBoard_level8.png',
    //     Answer: 5,
    //     components: [
    //         {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
    //         {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
    //         {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
    //     ]
    // },

    // {
    //     category: 'complexLevel',
    //     level: 9,
    //     voltage: 15,
    //     goal: 5,
    //     dropZones: [
    //         {top: '27.3%', left: '38.26%'},
    //     ],
    //     hint: "Ohm's Law: V = I * R",
    //     boardImg: 'assets/CircuitBoard_level9.png',
    //     Answer: 5,
    //     components: [
    //         {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
    //         {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
    //         {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
    //     ]
    // },

    // {
    //     category: 'complexLevel',
    //     level: 10,
    //     voltage: 15,
    //     goal: 5,
    //     dropZones: [
    //         {top: '27.3%', left: '38.26%'},
    //     ],
    //     hint: "Ohm's Law: V = I * R",
    //     boardImg: 'assets/CircuitBoard_level10.png',
    //     Answer: 5,
    //     components: [
    //         {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
    //         {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
    //         {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
    //     ]
    // },

    // {
    //     category: 'complexLevel',
    //     level: 11,
    //     voltage: 15,
    //     goal: 5,
    //     dropZones: [
    //         {top: '49%', left: '38.26%'},
    //     ],
    //     hint: "Ohm's Law: V = I * R",
    //     boardImg: 'assets/CircuitBoard_level11.png',
    //     Answer: 5,
    //     components: [
    //         {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
    //         {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
    //         {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
    //     ]
    // }


];

//checking the value connected to the dropped resistor and checking if it is the correct answer for the level
function checkAnswer() {
    const level = levels[currentLevel];
    const dropZones = Array.from(document.querySelectorAll('.dropZone'));

    //finds the data type through the dataset
    const getVal = (type) => {
        const found = dropZones.find(z => z.dataset.type === type);
        return found ? parseFloat(found.dataset.value) : null;
    };

    let result;

    //allows the drop of the component to be in any order
    if (level.goalType === 'current') {
        //if there is a value for the goaltype then we add those specific values
        const V = level.voltage ?? getVal('battery');
        const R = level.resistance ?? getVal('resistor');
        //proceed to the appropriate formula
        if (V !== null && R !== null) {
            result = V / R;
        }

    } else if (level.goalType === 'voltage') {
        //if there is a value for the goaltype then we add those specific values
        const I = level.fixedCurrent ?? getVal('battery'); 
        const R = level.resistance ?? getVal('resistor');
        //proceed to the appropriate formula
        if (I !== null && R !== null) {
            result = I * R;
        }
    } else if (level.goalType === 'series') {
        //sums all resistors in series
        result = dropZones.reduce((sum, z) => sum + (parseFloat(z.dataset.value) || 0), 0);

    } else if (level.goalType === 'parallel') {
        const values = dropZones.map(z => parseFloat(z.dataset.value) || 0);

        if (values.length === 3) {
            //adds and divides certain zones
            const r1 = values[0];
            const r2 = values[1];
            const r3 = values[2];

            const seriesBranch = r1 + r3;
            if (seriesBranch + r2 > 0) {
                result = (seriesBranch * r2) / (seriesBranch + r2);
            }
        } else if (values.length === 2) {
            //standard 2 resistor parallel
            const r1 = values[0];
            const r2 = values[1];
            if (r1 + r2 > 0) {
                result = (r1 * r2) / (r1 + r2);
            }
        }

    } else if (level.goalType === 'tau') {
        const R = level.fixedResistor ?? getVal('resistor');
        const C = level.fixedCapacitor ?? getVal('capacitor');
        if (R !== null && C !== null) result = R * C;
    }

    // FINAL VALIDATION
    if (result !== undefined && Math.abs(result - level.Answer) < 0.1) {
        nextLevel();
    } else {
        lives--;
        updateHearts();
        
        // Clear board on failure
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

function toggleHint(){
    const level = categoryLevel[currentLevel];
    const hintText = document.getElementById('hintText');
    const speechBubble = document.getElementById('speechBubble');

    if(!hintVisible){
        speechBubble.style.display = 'block';
        hintText.innerText = level.hint;  
        hintVisible = true;
    } else {
        speechBubble.style.display = 'none';
        hintText.innerText = '';
        hintVisible = false;
    }
}

function loadLevel() {

    const level = categoryLevel[currentLevel];
    hintVisible = false;
    document.getElementById('circuitBoardImg').src = level.boardImg;
    
    const goalText = document.getElementById('goalText');
    if (level.goalType === 'current') {
        goalText.innerHTML = `Circuit V: <span>${level.voltage}</span>V &nbsp; Resistance <span>(${level.resistance ?? '?'})</span> Current Goal I: <span>${level.goal}</span>A`;
    } else if (level.goalType === 'voltage') {
        goalText.innerHTML = `Current I: <span>${level.fixedCurrent}</span>A &nbsp; Resistance <span>(${level.resistance ?? '?'})</span> Voltage Goal V: <span>${level.goal}</span>V`;
    } else if (level.goalType === 'resistance' || level.goalType === 'parallel' || level.goalType === 'series') {
        goalText.innerHTML = `Target Total Resistance: <span>${level.Answer}</span>Ω`;
    } else if (level.goalType === 'tau') {
        goalText.innerHTML = `Fixed Resistance: <span>${level.resistance}</span>Ω &nbsp; Target τ: <span>${level.goal}</span>s`;
    } else if (level.goalType === 'frequency') {
        goalText.innerHTML = `Target Frequency f: <span>${level.goal}</span>Hz`;
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
    document.getElementById('resultMessage').innerText = 'You have completed all levels!';
    document.getElementById('play-screen').style.display = 'none';
    document.querySelector('.draggables').style.visibility = 'hidden';
    resultScreen();
}

function categorySelection(category){
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