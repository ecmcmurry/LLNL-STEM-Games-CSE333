//Going to be the foundation class for Motors and Outputs as well

export class Gear {
    //Technically the rpm shouldn't be included in the gear constructor but I'm just testing for now
    constructor(teeth) {
        this.teeth = teeth;
        this.rpm = null;
        this.torque = null;
        this.angle = 0;
    }

    draw(ctx, x, y) {

        this.drawGear(ctx, x, y, this.teeth, 20, this.angle);

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
        
        ctx.fillText(
            //Updated using Claude
            (`${this.torque}`),
            x + 80 / 2,
            y + (80 + 48) / 2
        );
    }

    changeDirection() {
        this.rpm *= -1;
    }

    clone() {
        return new Gear(this.teeth);
    }

    //drawGear, drawSmallGear, and drawLargeGear all generated using Claude
    drawGear(ctx, x, y, teeth, radius, angle) {
        if (teeth >= 14) {
            this.drawLargeGear(ctx, x+40, y+40, teeth, radius, angle);
        } else {
            this.drawSmallGear(ctx, x+40, y+40, teeth, radius, angle);
        }
    }

    drawSmallGear(ctx, x, y, teeth, radius, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.translate(-x, -y);

        const toothHeight = Math.max(5, radius * 0.15);
        const innerRadius = radius - toothHeight;
        const outerRadius = radius + toothHeight;
        const angleStep = (2 * Math.PI) / teeth;
        const toothWidth = angleStep * 0.3;
        const toothFlat = angleStep * 0.2;

        ctx.beginPath();
        //it might be a little cringe but maybe hardcode colors based on tooth count?
        //Just so that both small gears aren't the same color, maybe pass in a color to these functions?
        //Use colors to show difference between motors, outputs, and gears? Like Motors are black and Outputs are gold?
        //Maybe alter the drawing code for motors to change the white hole in the middle?
        //Or have an additional lightning symbol or something on the motor?
        //Or maybe different border colors for Motors and Outputs?
        //The only issue with coloring being different for motors and outputs means that the gear function would have to know that info
        //which isn't good encapsulation
        //so probably instead do the additional symbol drawn on top.
        ctx.fillStyle = "#7f4f33";
        ctx.strokeStyle = "#7f4f33";
        for (let i = 0; i < teeth; i++) {
            const angle = i * angleStep - Math.PI / 2;
            ctx.lineTo(
                x + innerRadius * Math.cos(angle - toothWidth),
                y + innerRadius * Math.sin(angle - toothWidth)
            );
            ctx.lineTo(
                x + outerRadius * Math.cos(angle - toothFlat),
                y + outerRadius * Math.sin(angle - toothFlat)
            );
            ctx.lineTo(
                x + outerRadius * Math.cos(angle + toothFlat),
                y + outerRadius * Math.sin(angle + toothFlat)
            );
            ctx.lineTo(
                x + innerRadius * Math.cos(angle + toothWidth),
                y + innerRadius * Math.sin(angle + toothWidth)
            );
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, innerRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.stroke();
        //ctx.fillStyle = "#7f4f33";
        ctx.restore();
    }

    drawLargeGear(ctx, x, y, teeth, radius, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.translate(-x, -y);

        radius = radius*1.5;
        //const toothHeight = Math.max(8, radius * 0.15);
        const angleStep = (2 * Math.PI) / teeth;
        const toothHalfWidth = Math.min(angleStep * 0.4, 0.05);
        const toothHeight = Math.max(8, radius * 0.2) * (teeth / 20);
        //console.log(`teeth: ${teeth}, radius: ${radius}, toothHeight: ${toothHeight}, angleStep: ${angleStep}, toothHalfWidth: ${toothHalfWidth}`);

        ctx.beginPath();
        ctx.fillStyle = "#7f4f33";
        ctx.strokeStyle = "#7f4f33";
        for (let i = 0; i < teeth; i++) {
            const angle = i * angleStep - Math.PI / 2;

            // Flat base at radius
            ctx.arc(x, y, radius, angle + toothHalfWidth, angle + angleStep - toothHalfWidth);

            // Rise up to tooth
            ctx.lineTo(
                x + (radius + toothHeight) * Math.cos(angle + angleStep - toothHalfWidth),
                y + (radius + toothHeight) * Math.sin(angle + angleStep - toothHalfWidth)
            );

            // Flat tooth top
            ctx.lineTo(
                x + (radius + toothHeight) * Math.cos(angle + angleStep + toothHalfWidth),
                y + (radius + toothHeight) * Math.sin(angle + angleStep + toothHalfWidth)
            );

            // Drop back down
            ctx.lineTo(
                x + radius * Math.cos(angle + angleStep + toothHalfWidth),
                y + radius * Math.sin(angle + angleStep + toothHalfWidth)
            );
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner hole
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.stroke();
        //ctx.fillStyle = "#7f4f33";
        ctx.restore();
    }

}