let hintVisible = false;
//Timer function
let timeLeft = 30;
let timerInterval = null;
let droppedValue = null;
//onclick function when the game is started it will close the previous screen and activate the game screen
function startGame() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('play-screen').style.display  = 'flex';
    document.querySelector('.draggables').style.visibility = 'visible';
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
    document.getElementById('home-screen').style.display = 'flex';
    document.querySelector('.draggables').style.visibility = 'hidden';
}

//How to play screen is prompted when clicked on
function howToPlay() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('howToPlay').style.display = 'flex';
    document.querySelector('.draggables').style.visibility = 'hidden';
}

//result screen is prompted when the player 
function resultScreen() {
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
    if(currentLevel >= levels.length){
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
        level: 1, 
        voltage: 9,
        goalCurrent: 3, 
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_blank (1).png',
        Answer: 3, 
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]   
    },
    {
        level: 2,
        voltage: 12,
        goalCurrent: 1.5,
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_blank (2).png',
        Answer: 8,
        components: [
            {type: 'resistor', label: '3Ω', img: 'assets/horizontal-resistor.png', value: 3},
            {type: 'resistor', label: '5Ω', img: 'assets/horizontal-resistor.png', value: 5},
            {type: 'resistor', label: '8Ω', img: 'assets/horizontal-resistor.png', value: 8},
        ]
    }
];

//base resistors with assets connected
const componentImages = {
    'resistor': 'assets/horizontal-resistor.png',
};

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

function gameGrid() {
    
}

function loadLevel() {
    //Loading the correct level and the correct level map with needed data from levels[]
    const level = levels[currentLevel];
    //Dunamically changing the board according to the level
    hintVisible = false;
    document.getElementById('circuitBoardImg').src = level.boardImg;
    document.getElementById('goalVoltage').innerText = level.voltage;
    document.getElementById('goalValue').innerText = level.goalCurrent;

    const slots = document.getElementById('componentSlots');
    slots.innerHTML = '';

    const dropZone = document.getElementById('slot1');
    dropZone.innerHTML = '';

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
    let dropZone = document.getElementById('slot1');
    let slots = document.getElementById('componentSlots');
    let selectedComponent = null;


    for(let component of components){
        component.addEventListener('dragstart', function(e){
            selectedComponent = e.target.closest('.slotDesign');
        });
    }
    dropZone.addEventListener('dragover', function(e){
            e.preventDefault();
    });
    dropZone.addEventListener('drop', function(e){
        if (selectedComponent) {
            const img = selectedComponent.querySelector('.component-img').cloneNode(true);
            dropZone.innerHTML = '';
            dropZone.appendChild(img);
            droppedValue = parseInt(selectedComponent.dataset.value);
            checkAnswer();
            selectedComponent = null;
        }
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
