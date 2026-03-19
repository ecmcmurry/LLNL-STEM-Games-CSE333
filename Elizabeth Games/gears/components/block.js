//It made more sense to have blocks as components than a special flag for cells
export class Block {
    constructor(size = 80) {
        this.size = size;
    }

    draw(ctx, x, y) {
        ctx.strokeStyle = "rgb(0, 0, 0)";
        ctx.fillRect(x, y, this.size, this.size);
    }
}