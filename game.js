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

//How to play
//Each game gets exactly 3 cards: Controls, Objective, Tips
const HTP = {
    'Adrian Games/Game1/index.html': {
        controls: {title: 'Controls', body: 'Explain Controls...' },
        objective: {title: 'Objective', body: 'Objective of game...' },
        tips: {title: 'Tips', body: 'Explain Tips...' },
    },
    'Adrian Games/Game2/Home.html': {
        controls: {title: 'Controls', body: 'Explain Controls...' },
        objective: {title: 'Objective', body: 'Objective of game...' },
        tips: {title: 'Tips', body: 'Explain Tips...' },
    },
    'Eli Games/Sound and Valid/dist/index.html': {
        controls: {title: 'Controls', body: 'Explain Controls...' },
        objective: {title: 'Objective', body: 'Objective of game...' },
        tips: {title: 'Tips', body: 'Explain Tips...' },
    },
    'Hao Games/code_farm/index.html': {
        controls: {title: 'Controls', body: 'Explain Controls...' },
        objective: {title: 'Objective', body: 'Objective of game...' },
        tips: {title: 'Tips', body: 'Explain Tips...' },
    },
    'Ella Games/Game2Engineering/index.html': {
        controls: {title: 'Controls', body: 'Explain Controls...' },
        objective: {title: 'Objective', body: 'Objective of game...' },
        tips: {title: 'Tips', body: 'Explain Tips...' },
    },
    'Eli Games/StructureStrike/dist/index.html': {
        controls: {title: 'Controls', body: 'Explain Controls...' },
        objective: {title: 'Objective', body: 'Objective of game...' },
        tips: {title: 'Tips', body: 'Explain Tips...' },
    },
    'Elizabeth Games/fourier/index.html': {
        controls: { title: 'Controls',  body: 'Explain Controls...' },
        objective: { title: 'Objective',  body: 'Objective of game...' },
        tips: { title: 'Tips',       body: 'Explain Tips...' },
    },
    'Ella Games/GraphGame1/index.html': {
        controls:  { title: 'Controls', body: 'Explain Controls...' },
        objective: { title: 'Objective', body: 'Objective of game...' },
        tips: { title: 'Tips', body: 'Explain Tips...' },
    },
};

const CARD_META = {
    controls:  { tag: 'Controls',  accent: '#2d86c8' },   // UCM blue family
    objective: { tag: 'Objective', accent: '#dbaa00' },   // UCM gold
    tips:      { tag: 'Tips',      accent: '#e2e8f0' },   // soft white
};

const htpData = HTP[game];
if (htpData) {
    const section = document.getElementById('how-to-play');
    const grid    = document.getElementById('htp-content');
    ['controls', 'objective', 'tips'].forEach(key => {
        const {title, body } = htpData[key];
        const { tag, accent } = CARD_META[key];
        const card = document.createElement('div');
        card.className = 'htp-card';
        card.style.setProperty('--card-accent', accent);
        card.innerHTML = `
            <div class="htp-card-title">${title}</div>
            <div class="htp-card-tag">${tag}</div>
            <p class="htp-card-body">${body}</p>`;
        grid.appendChild(card);
    });
    section.classList.remove('hidden');
}
