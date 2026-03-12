//Inventory used to just be a grid, but I think it would be easier if it was it's own separate class

import { Grid } from "./grid.js";

//Inventory is an extension of grid, because I want to reuse that code when possible
export class Inventory extends Grid {
    //maybe update to be rowNum or rowCount?
    constructor(rows, cols, size = 80) {
        //This calls the constructor for Grid using the values passed into Inventory's construction
        super(rows, cols, size);
    }

    //The draw function is not needed, as the inventory should be drawn just like a grid
    //This will probably change once components are added, so that the inventory cells can display certain numbers of gears
    //But that assumes each cell in the inventory can hold multiple things, since I might maintain the single content


    //The inventory does need a new handleClick system, because the rules are little different
    handleClick(x,y) {
        //console.log("found an inventory cell");
        let offsetSize = this.size + 5;

        //This prevents clicks from being handled outside of the inventory
        if (x > offsetSize*this.cols) {
            //console.log("returning due to x");
            return;
        }
        //This currently uses the hardcoded offset introduced in main
        //TODO: Update to make it dynamic? Or just not a Magic Number
        if (y > 600 + (offsetSize*this.rows) || y < (600 - offsetSize)) {
            //console.log("returning due to y");
            return;
        }

        //This is currently hard-coded to use the line width of 5 that is used for drawing cells
        //TODO: Update to be more dynamic aka remove magic numbers
        let selCol = Math.floor((x-2.5) / offsetSize);
        let selRow = Math.floor((y-602.5) / offsetSize);

        //Checks if there is a cell that was previously selected before selecting a new cell
        if (this.selectedCell != null && this.selectedCell.isSelected == true) {
            //if so, unselect that cell
            this.selectedCell.isSelected = false;
        }

        //We use our newly translated coordinates to identify the proper cell
        this.selectedCell = this.cells[selRow][selCol]
        //Then we call the select function of that cell
        this.selectedCell.isSelected = true;
        //console.log("selected an inventory cell");
    }
}