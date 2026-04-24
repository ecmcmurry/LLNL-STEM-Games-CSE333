const params = new URLSearchParams(window.location.search);
const game = params.get('game');
const author = params.get('author');
const title = params.get('title');
const from = params.get('from');
const frame = document.getElementById('game-frame');
frame.src = game;

document.getElementById('game-title').innerText = title;
document.getElementById('gameAuthor').innerText = author;

const backLink = document.getElementById('back-link');
backLink.href = from ? from : 'index.html';

const fullscreenBtn = document.getElementById('fullscreen-btn');
const gameContainer = document.getElementById('gameContainer');

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        gameContainer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenBtn.textContent = '✕';
        fullscreenBtn.title = 'Exit Fullscreen';
    } else {
        fullscreenBtn.innerHTML = '&#x26F6;';
        fullscreenBtn.title = 'Fullscreen';
    }
});
