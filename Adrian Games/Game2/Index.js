let hintVisible = false;
//Timer function
let timeLeft = 30;
let timerInterval = null;

//onclick function when the game is started it will close the previous screen and activate the game screen
function startGame() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('play-screen').style.display  = 'flex';
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
    document.getElementById('home-screen').style.display = 'flex';
}

//How to play screen is prompted when clicked on
function howToPlay() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('howToPlay').style.display = 'flex';
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
    alert('Boom! Time is up!');
    homeScreen();
}

//Various levels with certain objectives or changes needed
const levels = [
    { 
        level: 1, 
        voltage: 9,
        goalCurrent: 3, 
        hint: "Ohm's Law: I = V / R",
        boardImg: 'assets/CircuitBoard_blank (1).png',
        accepts: { 'zone-0': 'resistor-3' }, 
        components: [
            {type: 'resistor-3', label: '3Ω', img: 'assets/horizontal-resistor.png'},
            {type: 'resistor-5', label: '5Ω', img: 'assets/horizontal-resistor.png'},
            {type: 'resistor-8', label: '8Ω', img: 'assets/horizontal-resistor.png'},
        ]   
    }
];

//base resistors with assets connected
const componentImages = {
    'resistor-2': 'assets/horizontal-resistor.png',
    'resistor-3': 'assets/horizontal-resistor.png',
    'resistor-4': 'assets/horizontal-resistor.png',
    'resistor-5': 'assets/horizontal-resistor.png',
    'resistor-6': 'assets/horizontal-resistor.png',
    'resistor-8': 'assets/horizontal-resistor.png',
    'resistor-9': 'assets/horizontal-resistor.png',
};

"function updateHearts()"


"function toggleHint()"

function loadLevel() {
    //Loading the correct level and the correct level map with needed data from levels[]
    const level = levels[currentLevel];
    //Dunamically changing the board according to the level
    hintVisible = false;
    document.getElementById('circuitBoardImg').src = level.boardImg;
    document.getElementById('goalVoltage').innerText = level.voltage;
    document.getElementById('goalValue').innerText = level.goalCurrent;

}


// Drag and dropping actions 
//function dragStart() 
//function allowDrop()
//function dragEnter()
//function dragLeave()
//function dropComponent()



//function checkWin()
