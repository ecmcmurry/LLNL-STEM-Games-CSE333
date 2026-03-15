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
}