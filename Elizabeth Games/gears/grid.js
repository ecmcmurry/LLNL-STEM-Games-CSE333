//Grid needs to import cell, and define a 2D array structure of cells

import { Cell } from "./cell.js";
import { Gear, Motor, Output } from "./components/index.js";

export class Grid {
    //maybe update to be rowNum or rowCount?
    constructor(rows, cols, size = 80) {
        this.rows = rows;
        this.cols = cols;
        this.size = size;

        //need some way for the game to pass in a defined set of cells
        //such as loading from a string
        //TODO: Look into optional parameters
        this.cells = [];

        //For now, the grid always generates a list of empty cells
        for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
            let currentRow = [];

            //Adds a new cell to the current row for each column
            //The rowIndex and columnIndex information is passed into cells as they are created
            for (let columnIndex = 0; columnIndex < cols; columnIndex++) {
                //currentRow.push(new Cell(rowIndex, columnIndex, size));
                if (columnIndex == 1 && rowIndex == 0) {
                    currentRow.push(new Cell(rowIndex, columnIndex, size, false, new Motor(10, 10)));
                } else if (columnIndex == 1) {
                    currentRow.push(new Cell(rowIndex, columnIndex, size, false, new Gear(10, 10)));
                } else {
                    currentRow.push(new Cell(rowIndex, columnIndex, size));
                }
            }

            //After the row list is filled, it is pushed into the cells list
            //This creates a 2D array of cells for the grid to reference
            this.cells.push(currentRow);
            
        }

        this.selectedCell = null;
    }

    draw(ctx) {
        //for each cell in the cell list, they call their own draw function
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.cells[r][c].draw(ctx);
            }
        }
    }

    handleClick(x,y, component = "none") {
        //I had to update the grid and cells so that the grid can now define the size of the cells
        //This is important because it means that I can have the decoding from screen/canvas coord -> row/col here, so that the cell only has to worry about it's actual logic
        
        let offsetSize = this.size + 5;

        //This prevents clicks from being handled outside of the grid
        if (x > offsetSize*this.cols) {
            return;
        }
        if (y > offsetSize*this.rows) {
            return;
        }

        //This is currently hard-coded to use the line width of 5 that is used for drawing cells
        //TODO: Update to be more dynamic
        let selCol = Math.floor((x-2.5) / offsetSize);
        let selRow = Math.floor((y-2.5) / offsetSize);

        //Checks if there is a cell that was previously selected before selecting a new cell
        if (this.selectedCell != null && this.selectedCell.isSelected == true) {
            //if so, unselect that cell
            this.selectedCell.isSelected = false;
        }

        //We use our newly translated coordinates to identify the proper cell
        this.selectedCell = this.cells[selRow][selCol]
        //Then we call the select function of that cell
        if (this.selectedCell.canSelect) {
            this.selectedCell.isSelected = true;
            //console.log("selected a cell");
        }

        //Just reiterating (mainly for myself in case I forget): This is a temporary solution meant for testing
        if (component == "block") {
            this.selectedCell.isBlocked = true;
        }

        //TEMPORARY
        this.propagateRPM();
    }

    //Copied from ChatGPT, refactor later
    propagateRPM() {
        let queue = [];

        // Reset all non-motor gears
        for (let row of this.cells) {
            for (let cell of row) {
                let comp = cell.component;

                if (comp && !(comp instanceof Motor)) {
                    comp.rpm = null;
                }

                if (comp instanceof Motor) {
                    queue.push(cell);
                }
            }
        }

        while (queue.length > 0) {
            let cell = queue.shift();
            let gear = cell.component;

            let neighbors = this.getNeighbors(cell.row, cell.col);

            for (let [r, c] of neighbors) {
                let neighborCell = this.cells[r]?.[c];
                if (!neighborCell) continue;

                let neighborGear = neighborCell.component;
                if (!neighborGear) continue;

                let newRPM = -gear.rpm * (gear.teeth / neighborGear.teeth);

                // If RPM not assigned yet
                if (neighborGear.rpm === null) {
                    neighborGear.rpm = newRPM;
                    queue.push(neighborCell);
                }
                // Detect contradictions
                else if (Math.abs(neighborGear.rpm - newRPM) > 0.01) {
                    console.log("Invalid gear configuration detected");
                }
            }
        }
    }

    //Copied from ChatGPT, refactor later
    getNeighbors(row, col) {
        return [
            [row-1, col],
            [row+1, col],
            [row, col-1],
            [row, col+1]
        ];
    }
}