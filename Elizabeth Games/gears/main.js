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

draw();