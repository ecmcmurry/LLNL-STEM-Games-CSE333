//Motor is going to extend Gear

import { Gear } from "./gear.js";

export class Motor extends Gear {
    constructor(teeth, rpm) {
        super(teeth);
        this.rpm = rpm;
    }
}