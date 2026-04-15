// global variables to control the games state respectively
let hintVisible  = false;
let timeLeft = 30;
let timerInterval = null;
let droppedValue = null;
let categoryLevel = [];
let currentLevel = 0;
let lives = 3;
let isTestMode = false;
//being able to track the metric through the players free play experience
let categoryStats = {
    ohmsLaw: { correct: 0, incorrect: 0 },
    resistor: { correct: 0, incorrect: 0 },
    complexLevel: { correct: 0, incorrect: 0 }};
//stats willbe reseted as needed
function resetStats() {
    categoryStats = {
        ohmsLaw: { correct: 0, incorrect: 0 },
        resistor: { correct: 0, incorrect: 0 },
        complexLevel: { correct: 0, incorrect: 0 }};
}
//each game will have its basic level loaded and respective functions called for any interactions with a level
function startGame() {
    isTestMode = true;
    resetStats();
    categoryLevel = [...levels];
    currentLevel = 0;
    lives = 3;
    showPlayScreen();
    updateHearts();
    loadLevel();
    startTimer();
}
//Category selection allows the user to pick a topic that they would like to try out
function categorySelection(category) {
    isTestMode = false;
    resetStats();
    categoryLevel = levels.filter(l => l.category === category);
    currentLevel  = 0;
    lives = 3;
    updateHearts();
    showPlayScreen();
    loadLevel();
    startTimer();
}
//this function just checks whether or not their is even a next level for the student
function nextLevel() {
    currentLevel++;
    if(currentLevel >= categoryLevel.length){
        clearInterval(timerInterval);
        WinScreen();
    } else {
        loadLevel();
        startTimer();
    }
}
/*startTimer is just a basic 30 second interval function that will reset each level or
call the gameOver() function if the user takes longer than 30 seconds to solve the level*/
function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 30;
    document.getElementById('timer').innerText = timeLeft;
    timerInterval = setInterval(function() {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if(timeLeft === 0){
            clearInterval(timerInterval);
            gameOver();
        }
    }, 1000);
}
/*updateHearts just checks whether or not the user lost a life or not and updates the hearts 
as needed*/
function updateHearts() {
    const heartsContainer = document.getElementById('hearts');
    heartsContainer.innerHTML = '';
    for(let i = 0; i < 3; i++){
        const img = document.createElement('img');
        img.src = i < lives ? 'assets/Heart.png' : 'assets/Empty-Heart.png';
        img.classList.add('heart');
        heartsContainer.appendChild(img);
    }
}