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

    drawGear(       ctx,    40,     40,     5,   20); // 5 tooth gear
    drawGear(       ctx,    130,    40,     10,  20); // 10 tooth gear
    drawGear(       ctx,    210,    40,     20,  20); // 20 tooth gear
    drawGear(       ctx,    300,    40,     40,  20); // 40 tooth gear
    drawOldGear(    ctx,    40,     130,    5,   20); // 5 tooth gear
    drawOldGear(    ctx,    130,    130,    10,  20); // 10 tooth gear
    drawOldGear(    ctx,    210,    130,    20,  20); // 20 tooth gear
    drawOldGear(    ctx,    300,    130,    40,  20); // 40 tooth gear
    drawOlderGear(  ctx,    40,     215,    5,   30); // 5 tooth gear
    drawOlderGear(  ctx,    130,    215,    10,  30); // 10 tooth gear
    drawOlderGear(  ctx,    210,    215,    20,  30); // 20 tooth gear
    drawOlderGear(  ctx,    300,    215,    40,  30); // 40 tooth gear
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

function drawGear(ctx, x, y, teeth, radius) {
    if (teeth >= 20) {
        drawLargeGear(ctx, x, y, teeth, radius);
    } else {
        drawSmallGear(ctx, x, y, teeth, radius);
    }
}

function drawSmallGear(ctx, x, y, teeth, radius) {
    const toothHeight = Math.max(5, radius * 0.15);
    const innerRadius = radius - toothHeight;
    const outerRadius = radius + toothHeight;
    const angleStep = (2 * Math.PI) / teeth;
    const toothWidth = angleStep * 0.3;
    const toothFlat = angleStep * 0.2;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const angle = i * angleStep - Math.PI / 2;
        ctx.lineTo(
            x + innerRadius * Math.cos(angle - toothWidth),
            y + innerRadius * Math.sin(angle - toothWidth)
        );
        ctx.lineTo(
            x + outerRadius * Math.cos(angle - toothFlat),
            y + outerRadius * Math.sin(angle - toothFlat)
        );
        ctx.lineTo(
            x + outerRadius * Math.cos(angle + toothFlat),
            y + outerRadius * Math.sin(angle + toothFlat)
        );
        ctx.lineTo(
            x + innerRadius * Math.cos(angle + toothWidth),
            y + innerRadius * Math.sin(angle + toothWidth)
        );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, innerRadius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000000";
}

function drawLargeGear(ctx, x, y, teeth, radius) {
    radius = radius*1.75;
    //const toothHeight = Math.max(8, radius * 0.15);
    const angleStep = (2 * Math.PI) / teeth;
    const toothHalfWidth = Math.min(angleStep * 0.4, 0.05);
    const toothHeight = Math.max(8, radius * 0.2) * (teeth / 20);
    console.log(`teeth: ${teeth}, radius: ${radius}, toothHeight: ${toothHeight}, angleStep: ${angleStep}, toothHalfWidth: ${toothHalfWidth}`);

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const angle = i * angleStep - Math.PI / 2;

        // Flat base at radius
        ctx.arc(x, y, radius, angle + toothHalfWidth, angle + angleStep - toothHalfWidth);

        // Rise up to tooth
        ctx.lineTo(
            x + (radius + toothHeight) * Math.cos(angle + angleStep - toothHalfWidth),
            y + (radius + toothHeight) * Math.sin(angle + angleStep - toothHalfWidth)
        );

        // Flat tooth top
        ctx.lineTo(
            x + (radius + toothHeight) * Math.cos(angle + angleStep + toothHalfWidth),
            y + (radius + toothHeight) * Math.sin(angle + angleStep + toothHalfWidth)
        );

        // Drop back down
        ctx.lineTo(
            x + radius * Math.cos(angle + angleStep + toothHalfWidth),
            y + radius * Math.sin(angle + angleStep + toothHalfWidth)
        );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner hole
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000000";
}

function drawOldGear(ctx, x, y, teeth, radius) {
    if (teeth >= 20) {
        drawOldLargeGear(ctx, x, y, teeth, radius);
    } else {
        drawOldSmallGear(ctx, x, y, teeth, radius);
    }
}

function drawOldSmallGear(ctx, x, y, teeth, radius) {
    const toothHeight = Math.max(5, radius * 0.15);
    const innerRadius = radius - toothHeight;
    const outerRadius = radius + toothHeight;
    const angleStep = (2 * Math.PI) / teeth;
    const toothWidth = angleStep * 0.3;
    const toothFlat = angleStep * 0.2;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const angle = i * angleStep - Math.PI / 2;
        ctx.lineTo(
            x + innerRadius * Math.cos(angle - toothWidth),
            y + innerRadius * Math.sin(angle - toothWidth)
        );
        ctx.lineTo(
            x + outerRadius * Math.cos(angle - toothFlat),
            y + outerRadius * Math.sin(angle - toothFlat)
        );
        ctx.lineTo(
            x + outerRadius * Math.cos(angle + toothFlat),
            y + outerRadius * Math.sin(angle + toothFlat)
        );
        ctx.lineTo(
            x + innerRadius * Math.cos(angle + toothWidth),
            y + innerRadius * Math.sin(angle + toothWidth)
        );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, innerRadius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000000";
}

function drawOldLargeGear(ctx, x, y, teeth, radius) {
    radius = radius*1.75;
    //const toothHeight = Math.max(8, radius * 0.15);
    const angleStep = (2 * Math.PI) / teeth;
    const toothHalfWidth = Math.min(angleStep * 0.4, 0.05);
    const toothHeight = Math.max(8, radius * 0.2) * (teeth / 20);
    console.log(`teeth: ${teeth}, radius: ${radius}, toothHeight: ${toothHeight}, angleStep: ${angleStep}, toothHalfWidth: ${toothHalfWidth}`);

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const angle = i * angleStep - Math.PI / 2;

        // Flat base at radius
        ctx.arc(x, y, radius, angle + toothHalfWidth, angle + angleStep - toothHalfWidth);

        // Rise up to tooth
        ctx.lineTo(
            x + (radius + toothHeight) * Math.cos(angle + angleStep - toothHalfWidth),
            y + (radius + toothHeight) * Math.sin(angle + angleStep - toothHalfWidth)
        );

        // Flat tooth top
        ctx.lineTo(
            x + (radius + toothHeight) * Math.cos(angle + angleStep + toothHalfWidth),
            y + (radius + toothHeight) * Math.sin(angle + angleStep + toothHalfWidth)
        );

        // Drop back down
        ctx.lineTo(
            x + radius * Math.cos(angle + angleStep + toothHalfWidth),
            y + radius * Math.sin(angle + angleStep + toothHalfWidth)
        );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner hole
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000000";
}

function drawOlderGear(ctx, x, y, teeth, radius) {
    if (teeth >= 20) {
        drawOlderLargeGear(ctx, x, y, teeth, radius);
    } else {
        drawOlderSmallGear(ctx, x, y, teeth, radius);
    }
}

function drawOlderSmallGear(ctx, x, y, teeth, radius) {
    const toothHeight = Math.max(5, radius * 0.15);
    const innerRadius = radius - toothHeight;
    const outerRadius = radius + toothHeight;
    const angleStep = (2 * Math.PI) / teeth;
    const toothWidth = angleStep * 0.3;
    const toothFlat = angleStep * 0.2;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const angle = i * angleStep - Math.PI / 2;
        ctx.lineTo(
            x + innerRadius * Math.cos(angle - toothWidth),
            y + innerRadius * Math.sin(angle - toothWidth)
        );
        ctx.lineTo(
            x + outerRadius * Math.cos(angle - toothFlat),
            y + outerRadius * Math.sin(angle - toothFlat)
        );
        ctx.lineTo(
            x + outerRadius * Math.cos(angle + toothFlat),
            y + outerRadius * Math.sin(angle + toothFlat)
        );
        ctx.lineTo(
            x + innerRadius * Math.cos(angle + toothWidth),
            y + innerRadius * Math.sin(angle + toothWidth)
        );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, innerRadius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000000";
}

function drawOlderLargeGear(ctx, x, y, teeth, radius) {
    //radius = radius*1.75;
    const toothHeight = Math.max(8, radius * 0.15);
    const angleStep = (2 * Math.PI) / teeth;
    const toothHalfWidth = angleStep * 0.2;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const angle = i * angleStep - Math.PI / 2;

        // Flat base at radius
        ctx.arc(x, y, radius, angle + toothHalfWidth, angle + angleStep - toothHalfWidth);

        // Rise up to tooth
        ctx.lineTo(
            x + (radius + toothHeight) * Math.cos(angle + angleStep - toothHalfWidth),
            y + (radius + toothHeight) * Math.sin(angle + angleStep - toothHalfWidth)
        );

        // Flat tooth top
        ctx.lineTo(
            x + (radius + toothHeight) * Math.cos(angle + angleStep + toothHalfWidth),
            y + (radius + toothHeight) * Math.sin(angle + angleStep + toothHalfWidth)
        );

        // Drop back down
        ctx.lineTo(
            x + radius * Math.cos(angle + angleStep + toothHalfWidth),
            y + radius * Math.sin(angle + angleStep + toothHalfWidth)
        );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner hole
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000000";
}

draw();