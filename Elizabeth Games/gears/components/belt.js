// Belt.js
// Generated from Claude, minor refactors by self
export class Belt {
    constructor(direction) {
        this.direction = direction;
        this.rpm = null;
    }

    get isHorizontal() {
        return this.direction == "H";
    }

    get isVertical() {
        return this.direction == "V";
    }

    draw(ctx, x, y) {

        //This TEMPORARY set of code displays the letter h for hortizonal belts and v for vertical belts
        ctx.font = "16px Arial";
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (this.isHorizontal) {
            ctx.fillText(
                ("h"),
                x + 80 / 2,
                y + 80 / 2
            );
        }
        if (this.isVertical) {
            ctx.fillText(
                ("v"),
                x + 80 / 2,
                y + 80 / 2
            );
        }
        
    }
}

export class HorizontalBelt extends Belt {
    constructor() {
        super("H");
    }

    clone() {
        return new HorizontalBelt();
    }
}

export class VerticalBelt extends Belt {
    constructor() {
        super("V");
    }

    clone() {
        return new VerticalBelt();
    }
}