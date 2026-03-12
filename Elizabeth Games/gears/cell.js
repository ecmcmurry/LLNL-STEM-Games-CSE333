//Cell needs to define the basic components of a cell

export class Cell {
    //Expand to include more information like contents
    //Maybe change names to be like, rowIndex?
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    draw(ctx) {
        //This shifts each cell over by the length of a cell. Without this they would all be on top of each other
        const size = 80;
        let x = this.col * size;
        let y = this.row * size;

        //Draws the rectangle for the cell
        ctx.strokeRect(x, y, size, size);
        //This should also call the draw for the components when they are implemented.
    }
}