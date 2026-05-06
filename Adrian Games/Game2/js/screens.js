/*Each function will dynamically change the html and css as needed by using hidden
or flex/visible and will display the appropriate screen needed for the program*/
function homeScreen() {
    document.getElementById('howToPlay').style.display    = 'none';
    document.getElementById('play-screen').style.display  = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelScreen').style.display  = 'none';
    document.getElementById('home-screen').style.display  = 'flex';
    document.querySelector('.draggables').style.visibility = 'hidden';
    // Clear any previous message then prompt the student to pick a mode
    if (typeof hideTutorNudge === 'function') hideTutorNudge();
    if (typeof showTutorNudge === 'function') {
        showTutorNudge(
            "Welcome! Pick FULL CIRCUIT to play all levels, LEVELS to choose a topic, or SUPPORTED LEARNING for a personalised challenge.",
            7000
        );
    }
}

function howToPlay() {
    document.getElementById('home-screen').style.display  = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelScreen').style.display  = 'none';
    document.getElementById('howToPlay').style.display    = 'flex';
    document.querySelector('.draggables').style.visibility = 'hidden';
}

function resultScreen() {
    document.getElementById('howToPlay').style.display   = 'none';
    document.getElementById('play-screen').style.display = 'none';
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'flex';
}

function levelScreen() {
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('levelScreen').style.display = 'flex';
    //tutor summarizes the categories on display so students know what each topic covers
    if(typeof showTutorNudge === 'function'){
        showTutorNudge(
            "Pick a topic! OHM'S LAW drills V=IR. RESISTORS covers series & parallel combos. COMPLEX CIRCUITS adds dividers, capacitors, inductors, and switches.",
            8000
        );
    }
}

// Fire the welcome prompt automatically on first page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof showTutorNudge === 'function') {
        showTutorNudge(
            "Welcome! Pick FULL CIRCUIT to play all levels, LEVELS to choose a topic, or SUPPORTED LEARNING for a personalised challenge.",
            7000
        );
    }
});

function showPlayScreen() {
    document.getElementById('home-screen').style.display   = 'none';
    document.getElementById('resultScreen').style.display  = 'none';
    document.getElementById('levelScreen').style.display   = 'none';
    document.getElementById('play-screen').style.display   = 'flex';
    document.querySelector('.draggables').style.visibility = 'visible';
    //drop any category summary so the in-game hint flow starts with a clean bubble
    if(typeof hideTutorNudge === 'function') hideTutorNudge();
}