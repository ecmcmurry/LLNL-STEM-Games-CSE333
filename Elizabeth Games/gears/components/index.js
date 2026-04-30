//This just exports all components from a single spot
//It's not super necessary and only saves a few lines of code, but I think it's an elegant solution

export { Gear } from "./gear.js";
export { Motor } from "./motor.js";
export { Output } from "./output.js";

//imported as: import { Gear, Motor, Output } from "./components/index.js";