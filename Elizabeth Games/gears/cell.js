//Cell needs to define the basic components of a cell

const lineWidth = 5;

export class Cell {
    //Expand to include more information like contents
    //Maybe change names to be like, rowIndex?
    constructor(row, col, size = 80, isBlocked = false) {
        this.row = row;
        this.col = col;
        this.size = size;
        //I might change this into a component
        this.isBlocked = isBlocked;
        this.isSelected = false;
    }

    draw(ctx) {
        //This shifts each cell over by the length of a cell. Without this they would all be on top of each other
        //They are further shifted by the width of their border, to prevent any overlap
        //And finally have an offset of half their width to prevent the grid from getting cutoff from the canvas
        let x = (this.col * (this.size + lineWidth)) + (lineWidth/2);
        let y = (this.row * (this.size + lineWidth)) + (lineWidth/2);

        //Draws the rectangle for the cell
        ctx.lineWidth = lineWidth;

        //If the cell is selected, it should be drawn in a different color
        if (this.isSelected == true) {
            ctx.strokeStyle = "rgb(255, 0, 0)";
        } else {
            ctx.strokeStyle = "rgb(0, 0, 0)";
        }

        //if a cell is blocked, draw it as a solid rectangle
        if (!this.isBlocked) {
            ctx.strokeRect(x, y, this.size, this.size);
        //otherwise, draw a hollow rectangle
        } else {
            ctx.fillRect(x, y, this.size, this.size);
        }
        //This should also call the draw for the components when they are implemented.
    }
}