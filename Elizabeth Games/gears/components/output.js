//Output is going to extend Gear

import { Gear } from "./gear.js";

export class Output extends Gear {
    constructor(teeth, targetRPM) {
        super(teeth, 0);
        this.targetRPM = targetRPM;
    }

    isSatisfied() {
        if (this.rpm != null && this.rpm == this.targetRPM) {
            return true;
        }
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
            (`${this.rpm} / ${this.targetRPM}`),
            x + 80 / 2,
            y + (80 + 16) / 2
        );
    }
}