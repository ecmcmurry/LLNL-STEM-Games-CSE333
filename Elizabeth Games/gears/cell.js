//Cell needs to define the basic components of a cell

const size = 80;
const lineWidth = 5;

export class Cell {
    //Expand to include more information like contents
    //Maybe change names to be like, rowIndex?
    constructor(row, col, isBlocked = false) {
        this.row = row;
        this.col = col;
        //I might change this into a component
        this.isBlocked = isBlocked;
    }

    draw(ctx) {
        //This shifts each cell over by the length of a cell. Without this they would all be on top of each other
        let x = this.col * size;
        let y = this.row * size;

        //Draws the rectangle for the cell
        ctx.lineWidth = lineWidth;

        //This offsets the first rows and columns just a little bit to prevent them from getting clipped by the canvas
        if (this.row == 0) {
            y = y + (lineWidth/2);
        }
        if (this.col == 0) {
            x = x + (lineWidth/2);
        }

        if (!this.isBlocked) {
            ctx.strokeRect(x, y, size, size);
        } else {
            ctx.fillRect(x, y, size, size);
        }
        //This should also call the draw for the components when they are implemented.
    }
}