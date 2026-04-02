//Motor is going to extend Gear

import { Gear } from "./gear.js";

export class Motor extends Gear {
    constructor(teeth, rpm, torque) {
        super(teeth);
        this.rpm = rpm;
        this.torque = torque;
        this.angle = 0;
    }

    clone() {
        return new Motor(this.teeth, this.rpm, this.torque);
    }
}