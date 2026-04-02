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
        goal: 4,
        goalType: 'current', 
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
        voltage: 15,
        goal: 3,
        goalType: 'current', 
        dropZones: [
            {top: '49%', left: '38.25%'},
        ],
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_level2.png',
        Answer: 3,
        components: [
            {type: 'battery', label: '8V', img: 'assets/Horizontal-Battery.png', value: 3},
            {type: 'battery', label: '3V', img: 'assets/Horizontal-Battery.png', value: 12},
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 8},//possibly turn into a divisible
            {type: 'battery', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },
    
    {
        category: 'ohmsLaw',
        level: 3,
        voltage: 15,
        goal: 3,
        goalType: 'voltage',
        dropZones: [
            {top: '60%', left: '38.26%'},
            {top: '27.2%', left: '38.26%'},
        ],
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_level3.png',
        Answer: 5,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },

    {
        category: 'resistor',
        level: 4,
        voltage: 15,
        goal: 5,
        dropZones: [
            {top: '60%', left: '38.26%'},
            {top: '27.2%', left: '38.26%'},
        ],
        hint: "Ohm's Law: V = I * R",
        boardImg: 'assets/CircuitBoard_level4.png',
        Answer: 5,
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
        dropZones: [
            {top: '60%', left: '38.26%'},
            {top: '38%', left: '38.26%'},
            {top: '16%', left: '38.26%'},
        ],
        hint: "Ohm's Law: V = I * R",
        boardImg: 'assets/CircuitBoard_level5.png',
        Answer: 5,
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
        ]
    },

    {
        category: 'complexLevel',
        level: 7,
        voltage: 15,
        goal: 5,
        dropZones: [
            {top: '27.3%', left: '38.26%'},
        ],
        hint: "Ohm's Law: V = I * R",
        boardImg: 'assets/CircuitBoard_level7.png',
        Answer: 5,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },

    {
        category: 'complexLevel',
        level: 8,
        voltage: 15,
        goal: 5,
        dropZones: [
            {top: '71%', left: '60.26%'},
        ],
        hint: "Ohm's Law: V = I * R",
        boardImg: 'assets/CircuitBoard_level8.png',
        Answer: 5,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },

    {
        category: 'complexLevel',
        level: 9,
        voltage: 15,
        goal: 5,
        dropZones: [
            {top: '27.3%', left: '38.26%'},
        ],
        hint: "Ohm's Law: V = I * R",
        boardImg: 'assets/CircuitBoard_level9.png',
        Answer: 5,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },

    {
        category: 'complexLevel',
        level: 10,
        voltage: 15,
        goal: 5,
        dropZones: [
            {top: '27.3%', left: '38.26%'},
        ],
        hint: "Ohm's Law: V = I * R",
        boardImg: 'assets/CircuitBoard_level10.png',
        Answer: 5,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    },

    {
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
    }

];

//checking the value connected to the dropped resistor and checking if it is the correct answer for the level
function checkAnswer(){
    const level = levels[currentLevel];

    if (droppedValue === level.Answer) {
            nextLevel();
    } else {
        lives--;
        updateHearts();
        if (lives < 1) {
            gameOver();
        } 
    }
}

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
    hintVisible = !hintVisible;

}

function loadLevel() {
    //Loading the correct level and the correct level map with needed data from levels[]
    const level = categoryLevel[currentLevel];
    //Dunamically changing the board according to the level
    hintVisible = false;
    document.getElementById('circuitBoardImg').src = level.boardImg;
    document.getElementById('goalVoltage').innerText = level.voltage;
    document.getElementById('goalValue').innerText = level.goal;

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

function dragMethod(){
    //one for the class which has all components
    let components = document.getElementsByClassName('slotDesign');
    //one for the ID of each slot either on the board or in the component tray
    let dropZones = document.querySelectorAll('.dropZone');
    let slots = document.getElementById('componentSlots');
    let selectedComponent = null;


    for(let component of components){
        component.addEventListener('dragstart', function(e){
            selectedComponent = e.target.closest('.slotDesign');
        });
    }
    dropZones.forEach(dropZone => {
        dropZone.addEventListener('dragover', function(e){
            e.preventDefault();
        });
        dropZone.addEventListener('drop', function(e){
            if (selectedComponent) {
                const img = selectedComponent.querySelector('.component-img').cloneNode(true);
                dropZone.innerHTML = '';
                dropZone.appendChild(img);
                droppedValue = parseInt(selectedComponent.dataset.value);
                dropZone.dataset.value = droppedValue;
                checkAnswer();
                selectedComponent = null;
            }
        });
    });
    slots.addEventListener('dragover', function(e){
        e.preventDefault();
    });
    slots.addEventListener('drop', function(e){
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