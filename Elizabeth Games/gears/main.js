// main.js needs to grab the canvas, create the grid, and draw the grid

import { Grid } from "./grid.js";
import { Inventory } from "./inventory.js";
import { Block } from "./components/block.js";
import { Gear, Motor, Output } from "./components/index.js";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const w = canvas.width;
const h = canvas.height;

//This is temporary until I work on the loading system
let grid = new Grid("5,5,80,,,,,,,,,,,,,,,,,,,,,,,,,,");
//"3,3,80,M10/10,B,E,G20,h,G20,E,B,O10/10"
//Test level that demonstrates all features

//"3,3,80,,,,,,,,,,"
//Empty 3 by 3 grid

//"3,3,80,,,,,,,,,,"
//Empty 5 by 5 grid

let inventory = new Inventory("1,10,80,E,B,G5,G10,G15,G20,M10/10/10,O10/10,h,v");

function draw() {
    ctx.clearRect(0, 0, w, h);
    grid.draw(ctx);

    //To offset the inventory vertically, we must first save the context as is, shift it for drawing the inventory, then restore it to what it was
    ctx.save()
    //TODO: Update to shift dynamically
    ctx.translate(0, 500);
    inventory.draw(ctx);
    ctx.restore();
}

//need to implement cell selection
//The user clicks, the position is recorded and then converted into grid coordinates
//Then run the actual selection code within that cell

 
//Allows the user to click the screen
//TODO: test if this works on mobile
canvas.addEventListener("click", handleClick);

let selectedGridCell = null;
let selectedInventoryCell = null;

function handleClick(event) {
    //Currently this is relative to the screen, not the canvas
    //TODO: Update to use canvas coordinates if possible
    const x = event.clientX;
    const y = event.clientY;

    inventory.handleClick(x, y);
    selectedInventoryCell = inventory.selectedCell;
    //Again this is temporary until I have a better placing system
    //I just want to test if this idea works (the idea being placing blocks from inventory onto the grid, and having them inherit block logic)
    //This will need to be revamped once the components are actually introduced
    if (selectedInventoryCell.component != null) {
        grid.handleClick(x, y, selectedInventoryCell.component);
    } else {
        grid.handleClick(x, y);
    }

    selectedGridCell = grid.selectedCell;

    draw();
}

draw();