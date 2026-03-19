//Cell needs to define the basic components of a cell

import { Gear, Motor, Output } from "./components/index.js";
import { Block } from "./components/block.js";

const lineWidth = 5;

export class Cell {
    //Expand to include more information like contents
    //Maybe change names to be like, rowIndex?
    constructor(row, col, size = 80, canSelect = false, component = null) {
        this.row = row;
        this.col = col;
        this.size = size;
        this.isSelected = false;
        //Controls whether or not the player should be able to select certain cells
        this.canSelect = canSelect;
        this.component = component;
    }

    draw(ctx) {
        //This shifts each cell over by the length of a cell. Without this they would all be on top of each other
        //They are further shifted by the width of their border, to prevent any overlap
        //And finally have an offset of half their width to prevent the grid from getting cutoff from the canvas
        let x = (this.col * (this.size + lineWidth)) + (lineWidth/2);
        let y = (this.row * (this.size + lineWidth)) + (lineWidth/2);
        //console.log("x:", x, " y:", y, " size:", this.size, " col:", this.col, " row:", this.row);

        //Draws the rectangle for the cell
        ctx.lineWidth = lineWidth;

        //If the cell is selected, it should be drawn in a different color
        if (this.isSelected == true) {
            ctx.strokeStyle = "rgb(255, 0, 0)";
        } else {
            ctx.strokeStyle = "rgb(0, 0, 0)";
        }

        //Code for drawing blocks has been moved to block.js now that they are components
        // If the cell is selected, draw it in red
        if (this.isSelected) {
            ctx.strokeStyle = "rgb(255, 0, 0)";
            ctx.strokeRect(x, y, this.size, this.size);
            ctx.strokeStyle = "rgb(0, 0, 0)";
        // Otherwise draw it in black
        } else {
            ctx.strokeStyle = "rgb(0, 0, 0)";
            ctx.strokeRect(x, y, this.size, this.size);
        }
        
        //This should also call the draw for the components when they are implemented.
        if (this.component != null) {
            this.component.draw(ctx, x, y);
        }
    }
}