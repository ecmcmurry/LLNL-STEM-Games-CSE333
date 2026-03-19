//Going to be the foundation class for Motors and Outputs as well

export class Gear {
    //Technically the rpm shouldn't be included in the gear constructor but I'm just testing for now
    constructor(teeth) {
        this.teeth = teeth;
        this.rpm = null;
    }

    draw(ctx, x, y) {

        //This TEMPORARY set of code displays the rpm as text in the center of the cell
        ctx.font = "16px Arial";
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            //Updated using Claude
            (`${this.teeth}`),
            x + 80 / 2,
            y + (80 - 16) / 2
        );

        ctx.fillText(
            //Updated using Claude
            (`${this.rpm}`),
            x + 80 / 2,
            y + (80 + 16) / 2
        );
    }

    changeDirection() {
        this.rpm *= -1;
    }
}