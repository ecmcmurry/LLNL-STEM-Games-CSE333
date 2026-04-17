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
