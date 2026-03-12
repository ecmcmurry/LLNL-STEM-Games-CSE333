// main.js needs to grab the canvas, create the grid, and draw the grid

import { Grid } from "./grid.js";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const w = canvas.width;
const h = canvas.height;

//This is temporary until I work on the loading system
let grid = new Grid(3, 3);

let inventory = new Grid(1, 5);

function draw() {
    ctx.clearRect(0, 0, w, h);
    grid.draw(ctx);

    //To offset the inventory vertically, we must first save the context as is, shift it for drawing the inventory, then restore it to what it was
    ctx.save()
    //TODO: Update to shift dynamically
    ctx.translate(0,600);
    inventory.draw(ctx);
    ctx.restore();
}

//need to implement cell selection
//The user clicks, the position is recorded and then converted into grid coordinates
//Then run the actual selection code within that cell

 
//Allows the user to click the screen
//TODO: test if this works on mobile
canvas.addEventListener("click", handleClick);

function handleClick(event) {
    //Currently this is relative to the screen, not the canvas
    //TODO: Update to use canvas coordinates if possible
    const x = event.clientX;
    const y = event.clientY;
    grid.handleClick(x, y);

    draw();
}

draw();