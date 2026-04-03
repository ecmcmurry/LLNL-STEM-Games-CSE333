const params = new URLSearchParams(window.location.search);
const game = params.get('game');
const author = params.get('author');
const title = params.get('title');
const frame = document.getElementById('game-frame');
frame.src = game;

document.getElementById('game-title').innerText = title;
document.getElementById('gameAuthor').innerText = author;