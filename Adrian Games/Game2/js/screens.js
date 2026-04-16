/*Each function will dynamically change the html and css as needed by using hidden
or flex/visible and will display the appropriate screen needed for the program*/
function homeScreen() {
    document.getElementById('howToPlay').style.display    = 'none';
    document.getElementById('play-screen').style.display  = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelScreen').style.display  = 'none';
    document.getElementById('home-screen').style.display  = 'flex';
    document.querySelector('.draggables').style.visibility = 'hidden';
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
}

function showPlayScreen() {
    document.getElementById('home-screen').style.display   = 'none';
    document.getElementById('resultScreen').style.display  = 'none';
    document.getElementById('levelScreen').style.display   = 'none';
    document.getElementById('play-screen').style.display   = 'flex';
    document.querySelector('.draggables').style.visibility = 'visible';
}