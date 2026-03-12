//Grid needs to import cell, and define a 2D array structure of cells

import { Cell } from "./cell.js";

//let selectedCell = null;

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
                if (columnIndex == 1 && rowIndex == 1) {
                    currentRow.push(new Cell(rowIndex, columnIndex, size, true));
                    continue;
                }
                currentRow.push(new Cell(rowIndex, columnIndex, size));
            }

            //After the row list is filled, it is pushed into the cells list
            //This creates a 2D array of cells for the grid to reference
            this.cells.push(currentRow);
            
        }
    }

    draw(ctx) {
        //for each cell in the cell list, they call their own draw function
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.cells[r][c].draw(ctx);
            }
        }
    }

    handleClick(x,y) {
        //I had to update the grid and cells so that the grid can now define the size of the cells
        //This is important because it means that I can have the decoding from screen/canvas coord -> row/col here, so that the cell only has to worry about it's actual logic
        
        let offsetSize = this.size + 5;

        if (x > offsetSize*this.rows) {
            return;
        }
        if (y > offsetSize*this.cols) {
            return;
        }

        //This is currently hard-coded to use the line width of 5 that is used for drawing cells
        //TODO: Update to be more dynamic
        let selCol = Math.floor((x-2.5) / offsetSize);
        let selRow = Math.floor((y-2.5) / offsetSize);

        // //Checks if there is a cell that was previously selected before selecting a new cell
        // if (selectedCell != null && selectedCell.isSelected == true) {
        //     //if so, unselect that cell
        //     selectedCell.isSelected = false;
        //     selectedCell = null;
        // }

        if (this.selectedCell && this.selectedCell.isSelected) {
            this.selectedCell.isSelected = false;
        }

        //We use our newly translated coordinates to identify the proper cell
        this.selectedCell = this.cells[selRow][selCol]
        //Then we call the select function of that cell
        this.selectedCell.isSelected = true;
        console.log("selected a cell");
    }
}