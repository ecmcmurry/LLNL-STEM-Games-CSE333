//Grid needs to import cell, and define a 2D array structure of cells

import { Cell } from "./cell.js";
import { Gear, Motor, Output } from "./components/index.js";
import { Belt, HorizontalBelt, VerticalBelt } from './components/belt.js';
import { Block } from "./components/block.js";

export class Grid {
    constructor(levelString) {
        let loadedValues = levelString.split(",");

        //This is just loading the values I previously had as parameters of the constructor
        this.rows = Number(loadedValues[0]);
        this.cols = Number(loadedValues[1]);
        this.size = Number(loadedValues[2]);

        //Now we get to the actual level loading
        //This might need to be offloaded into a separate function so that I can alter the grid with a new level string rather than deleting and recreating it
        this.cells = [];

        let loadIndex = 3;
        //For now, the grid always generates a list of empty cells
        for (let rowIndex = 0; rowIndex < this.rows; rowIndex++) {
            let currentRow = [];

            //establishing some variables necessary for filling the grid
            let teeth = 0;
            let rpm = 0;
            let torque = 0;
            //Adds a new cell to the current row for each column
            //The rowIndex and columnIndex information is passed into cells as they are created
            for (let columnIndex = 0; columnIndex < this.cols; columnIndex++) {
                //Checks if the first character of the chunk is a specific letter, indicating what goes into the cell
                // G for Gear
                if (loadedValues[loadIndex][0] == "G") {
                    //The remaining numbers in the chunk are the teeth count of the gear
                    //They are originally strings and must be converted into integers
                    teeth = Number(loadedValues[loadIndex].substring(1));
                    currentRow.push(new Cell(rowIndex, columnIndex, this.size, false, new Gear(teeth)));
                // M for Motor
                } else if (loadedValues[loadIndex][0] == "M") {
                    //Motors are more complex than gears as they have teeth, rpm, and torque
                    //We take our input chunk in the format "M10/20/20" and first turn it into a substring of "10/20/20", which is then split into chunks "10", "20", and "20"
                    let loadValueSubstrings = loadedValues[loadIndex].substring(1).split("/");
                    teeth = Number(loadValueSubstrings[0]);
                    rpm = Number(loadValueSubstrings[1]);
                    torque = Number(loadValueSubstrings[2]);
                    currentRow.push(new Cell(rowIndex, columnIndex, this.size, false, new Motor(teeth, rpm, torque)));
                // O for Output
                } else if (loadedValues[loadIndex][0] == "O") {
                    //Outputs function the same way as Motors, at least in their construction
                    let loadValueSubstrings = loadedValues[loadIndex].substring(1).split("/");
                    teeth = Number(loadValueSubstrings[0]);
                    rpm = Number(loadValueSubstrings[1]);
                    currentRow.push(new Cell(rowIndex, columnIndex, this.size, false, new Output(teeth, rpm)));
                // B for Blocked
                // TODO: Update blocked cells to be components
                } else if (loadedValues[loadIndex][0] == "B") {
                    currentRow.push(new Cell(rowIndex, columnIndex, this.size, false, new Block(this.size)));
                // lowercase h indicates a short hortizontal belt
                // belts send over RPM while maintaining direction and don't care about teeth count
                // long belts don't exist, but I'm future-proofing
                } else if (loadedValues[loadIndex][0] == "h") {
                    currentRow.push(new Cell(rowIndex, columnIndex, this.size, false, new HorizontalBelt()));
                // lowercase v indicates a short vertical belt
                } else if (loadedValues[loadIndex][0] == "v") {
                    currentRow.push(new Cell(rowIndex, columnIndex, this.size, false, new VerticalBelt()));
                // otherwise, the cell is empty
                // proper formatting is to use E to indicate an Empty Cell, but leaving this as a catch-all is better in my opinion
                } else {
                    currentRow.push(new Cell(rowIndex, columnIndex, this.size, true));
                }

                loadIndex++;
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

    handleClick(x,y, component = null) {
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
        //If we cannot select a cell, then we exit the function
        if (!this.selectedCell.canSelect) {
            return;
        }
        
        this.selectedCell.isSelected = true;
        //console.log("selected a cell");

        //Just reiterating (mainly for myself in case I forget): This is a temporary solution meant for testing
        //If the component being placed is not null 
        if (component != null) {
            //create a clone of the component and place it in the selected cell
            this.selectedCell.component = component.clone();
        //otherwise
        } else {
            //set the contents of  the selected cell to nothing
            this.selectedCell.component = null;
        }
        

        //TEMPORARY
        this.propagateRPM();
    }

    //Copied from GPT -> Claude
    //Refactor later
    propagateRPM() {
        let queue = [];

        for (let row of this.cells) {
            for (let cell of row) {
                let comp = cell.component;

                if (comp && !(comp instanceof Motor)) {
                    comp.rpm = null;
                    comp.torque = null;
                }

                if (comp instanceof Motor) {
                    queue.push(cell);
                }
            }
        }

        while (queue.length > 0) {
            let cell = queue.shift();
            let comp = cell.component;

            for (let [r, c] of this.getNeighbors(cell.row, cell.col)) {
                let neighborCell = this.cells[r]?.[c];
                if (!neighborCell) continue;

                let neighborComp = neighborCell.component;
                if (!neighborComp) continue;

                if (neighborComp instanceof Block) continue;  // Blocks don't transmit RPM

                let newRPM;
                let newTorque;

                if (comp instanceof Belt || neighborComp instanceof Belt) {
                    // Belts transmit RPM directly — no inversion, no teeth ratio
                    newRPM = comp.rpm;
                    newTorque = comp.torque;
                } else {
                    // Gear-to-gear: invert direction and apply teeth ratio
                    newRPM = -comp.rpm * (comp.teeth / neighborComp.teeth);
                    newTorque = comp.torque * (neighborComp.teeth / comp.teeth);
                }

                if (neighborComp.rpm === null) {
                    neighborComp.rpm = newRPM;
                    neighborComp.torque = newTorque;
                    //console.log(`  Assigned RPM ${newRPM} to (${r}, ${c}) — ${neighborComp.constructor.name}`);
                    queue.push(neighborCell);
                } else if (Math.abs(neighborComp.rpm - newRPM) > 0.01) {
                    console.log(`  CONFLICT at (${r}, ${c}) — existing: ${neighborComp.rpm}, calculated: ${newRPM}`);
                }
            }
        }
    }

    getNeighbors(row, col) {
        const comp = this.cells[row]?.[col]?.component;

        //console.log(`getNeighbors called on (${row}, ${col}) — component: ${comp?.constructor.name}`);

        if (comp instanceof HorizontalBelt) {
            const neighbors = [[row, col - 1], [row, col + 1]];
            //console.log(`  HorizontalBelt: returning only left/right`, neighbors);
            return neighbors;
        }

        if (comp instanceof VerticalBelt) {
            const neighbors = [[row - 1, col], [row + 1, col]];
            //console.log(`  VerticalBelt: returning only up/down`, neighbors);
            return neighbors;
        }

        const all = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];

        const filtered = all.filter(([r, c]) => {
            const neighborComp = this.cells[r]?.[c]?.component;
            const name = neighborComp?.constructor.name ?? 'empty';

            if (neighborComp instanceof HorizontalBelt) {
                const allowed = c !== col;
                //console.log(`  Neighbor (${r}, ${c}) is HorizontalBelt — allowed: ${allowed} (c !== col: ${c} !== ${col})`);
                return allowed;
            }
            if (neighborComp instanceof VerticalBelt) {
                const allowed = r !== row;
                //console.log(`  Neighbor (${r}, ${c}) is VerticalBelt — allowed: ${allowed} (r !== row: ${r} !== ${row})`);
                return allowed;
            }

            //console.log(`  Neighbor (${r}, ${c}) is ${name} — allowed: true`);
            return true;
        });

        //console.log(`  Final neighbors:`, filtered);
        return filtered;
    }
}