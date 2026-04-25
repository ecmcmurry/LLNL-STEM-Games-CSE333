const reactionDropdown = document.getElementById('reactionDropdown');
const predictionCards = document.getElementById('predictionCards');

let reaction = null;
let reactants = null;
let products = null;
let predictions = null;

let visitedSafety = false;
let visitedStorage = false;
let visitedMeasure = false;
let visitedReact = false;
let visitedAnalyze = false;
let visitedDispose = false;

let moles = null;
let volumes = [];

//Variables necessary for Reaction screen
const canvas = document.getElementById('reactionCanvas');
const ctx    = canvas.getContext('2d'); 
let beakers;
let animId = null;
let scale = 1;

//Constants used for drawing the beakers and reaction vessel
const BEAKER_W    = 70;
const BEAKER_H    = 110;
const BEAKER_WALL = 3;
const MAX_FILL    = 80;

const VESSEL_W   = 135;
const VESSEL_H   = 150;
const VESSEL_MAX = 95;
const VESSEL_X   = (canvas.width - VESSEL_W) / 2;
const VESSEL_Y   = 195;

let vesselFill = 0;
let vesselColor = "";

let idleCount = 0;
let doneStirring = false;
let stirMode = false;
let stirring = false;
let stirDistAccum = 0;
let stirTrail = [];
let reactionComplete = false;

//Changes from the Title Screen to the Pre-Lab Screen
//This is included in main and NOT swapScreen because of the added functionality when you press the button
//Though I should probably be consistent and any time a button switches screens it should be in swapScreen
document.getElementById('titleToPreLabBtn').addEventListener('click', () => {
    //resets variables
    reaction = null;
    reactants = null;
    products = null;
    predictions = null;

    visitedSafety = false;
    visitedStorage = false;
    visitedMeasure = false;
    visitedReact = false;
    visitedAnalyze = false;
    visitedDispose = false;

    moles = null;
    volumes = [];

    beakers;
    animId = null;
    scale = 1;
    vesselFill = 0;
    vesselColor = "";
    idleCount = 0;
    doneStirring = false;
    stirMode = false;
    stirring = false;
    stirDistAccum = 0;
    stirTrail = [];
    reactionComplete = false;


    document.getElementById('preLabToPredictionsBtn').classList.remove('hidden');
    document.getElementById('preLabToLabBtn').classList.add('hidden');

    swapScreen("prelab")

    //pulls the value from the reaction dropdown and stores that as the current reaction
    reaction = reactionDropdown.value;
    reactants = REACTIONS[reaction].reactants;
    products = REACTIONS[reaction].products;

    document.getElementById('preLabBriefing').innerHTML = REACTIONS[reaction].prelab;
});

//Changes from the Pre-Lab to the Predictions Screen
document.getElementById('preLabToPredictionsBtn').addEventListener('click', () => {
    swapScreen("prediction");
    //This is essentially the first-time-setup for the prediction screen. Maybe move to a specific file for screen management if this gets out of hand
    //This runs here INSTEAD of the swapScreen function since that would undo player inputs I think?
    //If this isn't the case, move this code there instead?

    //uses the reaction to pull the prediction questionss from reactions.js
    predictions = REACTIONS[reaction].predictions;
    
    //finds the cards that will hold the prediction questions and answers
    let cards = document.getElementById('predictionCards');
    //clears the cards so that if the user backs out and re-enters, it doesn't duplicate
    cards.innerHTML = "";
    
    //For each prediction we want to make a new card, show the question has a header 2 and give the multiple choice answers as radio buttons
    predictions.forEach((prediction, cardIndex) => {
        //create the card
        let card = document.createElement('article');
        card.classList.add('card');

        //create the header, this will hold the question
        let header = document.createElement('header');
        //create the h2 which will actually have the text
        let h2 = document.createElement('h2');
        h2.textContent = prediction.question;
        header.appendChild(h2);

        //create the content section of the card, this will hold the answers
        let content = document.createElement('div');
        content.classList.add('content');
        
        //For each option, we want to create a button and label, then append them to the contents of the card
        prediction.options.forEach((option, optionIndex) => {

            //Create a new wrapper to contain the button and label
            const wrapper = document.createElement('div');

            //Create and define the button, a unique name and id are needed for referencing them later
            let optionButton = document.createElement('input');
            optionButton.type = 'radio';
            optionButton.name = `option${cardIndex}`;
            optionButton.value = option;
            optionButton.id = `card${cardIndex}_option${optionIndex}`;
            if (optionIndex === 0) {
                optionButton.checked = true;
            }

            //Create the label and fill it with the text of the answer
            let label = document.createElement('label');
            label.htmlFor = optionButton.id;
            label.textContent = option;

            //attach both to the wrapper
            wrapper.appendChild(optionButton);
            wrapper.appendChild(label);

            //attach the wrapper to the contents of the card
            content.appendChild(wrapper);
        });

        //attach the header and content to the card
        card.appendChild(header);
        card.appendChild(content);

        //add the card to the list of cards
        cards.appendChild(card);
    });
});

//Changes from the Lab to the Storage Screen
document.getElementById('toStorageScreenBtn').addEventListener('click', () => {
    
    //finds the cards that will hold the reactant information
    let cards = document.getElementById('storageCards');
    //clears the cards so that if the user backs out and re-enters, it doesn't duplicate
    cards.innerHTML = "";

    
    //For each prediction we want to make a new card and populate it with the reactant information
    reactants.forEach((reactant) => {
        //create the card
        let card = document.createElement('article');
        card.classList.add('card');

        //create the header, this will hold the name of the reactant
        let header = document.createElement('header');
        //create the h2 which will actually have the text
        let h2 = document.createElement('h2');
        h2.textContent = reactant.name;
        header.appendChild(h2);

        //create the content section of the card, this will hold the answers
        let content = document.createElement('div');
        content.classList.add('content');

        //create the content section of the card, this will hold the remaining information
        //far more elegant solution thanks to claude
        const fields = [
            { key: 'symbol', label: 'Symbol' },
            { key: 'state', label: 'State' },
            { key: 'concentration', label: 'Concentration' },
            { key: 'appearance', label: 'Appearance' },
            { key: 'pH', label: 'pH' },
            { key: 'hazards', label: 'Hazards', transform: v => v.join(', ') },
            { key: 'ghs', label: 'GHS', transform: v => v.join(', ') }
        ];

        fields.forEach(field => {
            let p = document.createElement('p');
            p.textContent = `${field.label}: ${reactant[field.key]}`;
            content.appendChild(p);
        });

        //attach the header and content to the card
        card.appendChild(header);
        card.appendChild(content);

        //add the card to the list of cards
        cards.appendChild(card);
    });
});

//Takes in a list of answers and compares them to the correct responses
//Refactored with support from Claude to enable easier testing
function checkPPEAnswers(selected, reactionSafety) {
    let correctSum = 0;
    if (selected.eye == reactionSafety.eyeAndFace) {
        correctSum++;
    }
    if (selected.hands == reactionSafety.hands) {
        correctSum++;
    }
    if (selected.body == reactionSafety.body) {
        correctSum++;
    }
    if (selected.foot == reactionSafety.foot) {
        correctSum++;
    }
    if (selected.respiratory == reactionSafety.respiratory) {
        correctSum++;
    }
    return correctSum;
}

//Verifies that the PPE options chosen by the player line up with the reaction
document.getElementById('verifyPPE').addEventListener('click', () => {
    //pulls answer from each category
    const selected = {
        eye:     document.querySelector('input[name="eyeAndFaceProtection"]:checked').value,
        hands:   document.querySelector('input[name="handProtection"]:checked').value,
        body:    document.querySelector('input[name="bodyProtection"]:checked').value,
        foot:    document.querySelector('input[name="footProtection"]:checked').value,
        respiratory: document.querySelector('input[name="respiratoryProtection"]:checked').value
    }
    //checks which of these answers are correct
    let correctSum = checkPPEAnswers(selected, REACTIONS[reaction].safety);

    if (correctSum == 5) {
        //if correct display this
        document.getElementById('PPEFeedback').innerText = "Good job!";
        document.getElementById('safetyScreen').querySelector('.toLabBtn').classList.remove('hidden');
        visitedSafety = true;
        document.getElementById('verifyPPE').classList.add('hidden');
    } else {
        //if incorrect display this
        document.getElementById('PPEFeedback').innerText = "Include an API call here so the AI can guide you to the right answers? Anyways, you got it wrong somehow";
        //Redundancy
        document.getElementById('safetyScreen').querySelector('.toLabBtn').classList.add('hidden');
    }
});

//measure screen goes here
document.getElementById('toMeasureScreenBtn').addEventListener('click', () => {
    //Loads some default values into the calculateReaction function so that we can proceed with intial setup
    volumes = [];
    reactants.forEach(reactant => {
        volumes.push((Math.floor(Math.random() * 5) + 1) * 20);
    });
    moles = calculateReaction(volumes);

    //dynamically populate measureInputs
    // - needs to display the current volume for each reactant, as well as the names of each reactant and buttons to increase or decrease the volume in 10mL increments
    //For each reactant we want to make a new card, show the volume of the reactant and create the increase and decrease buttons
    document.getElementById('measureInputs').innerHTML = "";
    reactants.forEach((reactant, cardIndex) => {
        //create the card
        let card = document.createElement('article');
        card.classList.add('card');

        //create the header, this displays which reactant we are controlling the volume of
        let reactantLabel = document.createElement('h2');
        reactantLabel.textContent = reactant.name;

        //create the volume label
        let volumeDisplay = document.createElement('p');
        volumeDisplay.textContent = "placeholder";
        volumeDisplay.classList.add('volumeDisplay');
        volumeDisplay.id = `volumeDisplay-${cardIndex}`;

        //create the inputs section of the card, this will hold the buttons
        let userInputs = document.createElement('div');
        userInputs.classList.add('volumeControls');

        let increaseBtn = document.createElement('button');
        increaseBtn.textContent = '+';
        increaseBtn.addEventListener('click', () => {
            volumes[cardIndex] += 10; 
            moles = calculateReaction(volumes);
            updateReactionText();
        });

        let decreaseBtn = document.createElement('button');
        decreaseBtn.textContent = '-';
        decreaseBtn.addEventListener('click', () => {
            if (volumes[cardIndex] > 0) {
                volumes[cardIndex] -= 10;
            } 
            moles = calculateReaction(volumes);
            updateReactionText();
        });

        userInputs.appendChild(reactantLabel);

        userInputs.appendChild(decreaseBtn);
        userInputs.appendChild(volumeDisplay);
        userInputs.appendChild(increaseBtn);

        card.appendChild(userInputs);
        document.getElementById('measureInputs').appendChild(card);
    });
    
    updateReactionText();
    
});

//Changes from the Lab subscreens to the Lab Screen
document.querySelectorAll('.measureVolumeBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        calculateReaction();
        updateReactionText();
    });
});

function updateReactionText() {
    let equationText = "";
    let excessText = "";
    //For each reactant: list the number of mols in solution followed by it's symbol, for any reactant past the first a plus sign is included between entries
    reactants.forEach((reactant, index) => {
        document.getElementById(`volumeDisplay-${index}`).innerText = volumes[index] + " ml";

        if (index != 0) {
            equationText = equationText + " + ";
        }
        equationText = equationText + moles.reactants[index].molesAdded.toFixed(2) + " mol " + reactant.symbol;

        if (moles.reactants[index].molesExcess != 0) {
            excessText = excessText + " + " + moles.reactants[index].molesExcess.toFixed(2) + " mol " + reactant.symbol;
        }
    });
    equationText = equationText + " → ";
    //For each product: list the number of mols produced followed by it's symbole, for any product past the first a plus sign is included between the,m
    products.forEach((product, index) => {
        if (index != 0) {
            equationText = equationText + " + ";
        }
        equationText = equationText + moles.products[index].molesProduced.toFixed(2) + " mol " + product.symbol;
    });
    equationText = equationText + excessText;
    document.getElementById('measureEquationText').innerText = equationText;
}

//function generated by claude, but I have taken the time to understand it
function calculateReaction(volumes) {

    // calculate moles for each reactant
    const moles = reactants.map((reactant, i) => ({
        name: reactant.name,
        moles: reactant.concentration * (volumes[i]/1000),
        ratio: reactant.molarRatio
    }));

    // calculate moles divided by ratio for each — the smallest value is the limiting reactant
    const limitingValue = Math.min(...moles.map(r => r.moles / r.ratio));

    // calculate yield and excess
    return {
        reactants: moles.map(r => ({
            name: r.name,
            molesAdded: r.moles,
            molesUsed: limitingValue * r.ratio,
            molesExcess: r.moles - (limitingValue * r.ratio)
        })),
        products: products.map(product => ({
            name: product.name,
            symbol: product.symbol,
            molesProduced: limitingValue * product.molarRatio
        }))
    };
}

//Displays a hint on how to balance the reaction if the player is stuck
document.getElementById('measureBalanceBtn').addEventListener('click', () => {
    //Displays some canned feedback to the user based on their inputs
    //First calculates 
    //generated using Claude but I've taken the time to understand it. Will likely refactor later
    let isExcess = false;

    reactants.forEach((reactant, index) => {
        if (moles.reactants[index].molesExcess != 0) {
            isExcess = true;
        }
    });

    let totalProductMoles = moles.products.reduce((sum, p) => sum + p.molesProduced, 0);
    let isLowYield = totalProductMoles < 0.05;

    if (isExcess) {
        let excessReactant = moles.reactants.find(r => r.molesExcess > 0);
        document.getElementById('measureFeedbackText').innerText = `You have excess ${excessReactant.name} — try reducing its volume or increasing the other reactant.`;
    } else if (isLowYield) {
        document.getElementById('measureFeedbackText').innerText = "The reaction is balanced, but you have a very low yield. Consider increasing the volume of all reactants.";
    } else {
        document.getElementById('measureFeedbackText').innerText = "The reaction appears to be balanced!";
        //document.getElementById('measureBalanceBtn').classList.add('hidden');
    }
});

//I worked with Claude Sonnet 4.6 to generate multiple test demos for the react screen
//These demos were then used as references for the final implementation

//Changes from the Lab Screen to the React Screen
document.getElementById('toReactScreenBtn').addEventListener('click', () => {

    document.getElementById('reactScreen').querySelector('.toLabBtn').classList.add('hidden');

    beakers = [{
        fill: 80,
        angle: 0,
        pouring: false,
        returning: false,
        hasMixed: false,
        color: reactants[0].color
    }, {
        fill: 80,
        angle: 0,
        pouring: false,
        returning: false,
        hasMixed: false,
        color: reactants[1].color
    }];

    resizeCanvas();
    document.getElementById('reactionStatus').innerText = "Pour both Reactants";

    document.getElementById('pourReactant1').innerText = "Pour " + reactants[0].symbol;
    document.getElementById('pourReactant2').innerText = "Pour " + reactants[1].symbol;
});

document.getElementById('pourReactant1').addEventListener('click', () => {
    beakers[0].pouring = true;
    if (!animId) {
        animId = requestAnimationFrame(animate);
    };
    document.getElementById('pourReactant1').classList.add('hidden');
});

document.getElementById('pourReactant2').addEventListener('click', () => {
    beakers[1].pouring = true;
    if (!animId) {
        animId = requestAnimationFrame(animate);
    };
    document.getElementById('pourReactant2').classList.add('hidden');
});

window.addEventListener('resize', () => {
    resizeCanvas();
});

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const w = wrapper.clientWidth;
    scale = w / 500;
    
    canvas.width  = w;
    canvas.height = Math.round(w * (380 / 500));
    
    ctx.scale(scale, scale); // scale context to match original coordinate space

    draw();
}

function draw() {
    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, 500, 380);

    //drawHotplate();

    //draws the stream while the beaker is pouring
    if (beakers[0].pouring == true) {
        drawStream(90, 110,  beakers[0].angle, reactants[0].color,  "left");
    }
    if (beakers[1].pouring == true) {
        drawStream(410, 110, beakers[1].angle, reactants[1].color, "right");
    }

    drawBeaker(90, 110, beakers[0].angle,  beakers[0].fill,  reactants[0].color,  "left");
    drawBeaker(410, 110, beakers[1].angle, beakers[1].fill, reactants[1].color, "right");

    drawVessel();
    drawStirTrail();
    //drawStirProgress();
    //drawRod();
    //drawThermometer();
    //drawLabels();
    //drawBanner();
}

//This function draws the beakers for each reactant
function drawBeaker(pivotX, pivotY, angle, fillH, color, direction) {
    ctx.save();

    //translates the canvas to the pivot point for the beaker, this is so the beaker can rotate when pouring
    ctx.translate(pivotX, pivotY);
    
    //Rotatest the beaker by the angle depending on if it rotates clockwise or counter clockwise
    if (direction == "left") {
        ctx.rotate(angle);
    } else {
        ctx.rotate(-angle);
    }

    let bx = 0;
    if (direction == "left") {
        bx = -BEAKER_W;
    }
    let by = -BEAKER_H;

    //Draws the beaker
    ctx.strokeStyle = "rgb(10, 60, 60)";
    ctx.lineWidth   = BEAKER_WALL;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, 0);
    ctx.lineTo(bx + BEAKER_W, 0);
    ctx.lineTo(bx + BEAKER_W, by);
    ctx.stroke();

    //draws the contents of the beaker if it isn't empty
    if (fillH > 0) {
        //Since we translated the canvas, 0 is the bottom of the beaker, so the top of the liquid is fillHeight units above the bottom
        let liquidTopY = -fillH;
        //Fills the beaker with a rectangle of the color of the reactant
        ctx.fillStyle = color;
        ctx.fillRect(bx + BEAKER_WALL, liquidTopY, BEAKER_W - BEAKER_WALL * 2, fillH);
        //Replaces the alpha 
        let darkColor = setAlpha(color, 0.95);
        //Draws a darker line across the top of the liquid to help show where it ends
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + BEAKER_WALL, liquidTopY);
        ctx.lineTo(bx + BEAKER_W - BEAKER_WALL, liquidTopY);
        ctx.stroke();
    }

    ctx.restore();
}

//Draws the "reaction vessel" where the reactants are mixed
function drawVessel() {
    let x = VESSEL_X;
    let y = VESSEL_Y;
    let w = VESSEL_W;
    let h = VESSEL_H;

    //Draws the vessel
    ctx.strokeStyle = "rgb(10, 60, 60)";
    ctx.lineWidth   = BEAKER_WALL;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    //fills the vessel
    if (vesselFill > 0) {
        let liquidY = y + h - vesselFill;
        ctx.fillStyle = vesselColor;
        ctx.fillRect(x + BEAKER_WALL, liquidY, w - BEAKER_WALL * 2, vesselFill);

        ctx.strokeStyle = setAlpha(vesselColor, 0.9);
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + BEAKER_WALL, liquidY);
        ctx.lineTo(x + w - BEAKER_WALL, liquidY);
        ctx.stroke();
    }

}

//Draws the stream that pours from the vessel when pouring
function drawStream(pivotX, pivotY, angle, color, direction) {
    //This prevents the stream from being drawn prematurely
    if (angle < 45 * Math.PI / 180) {
        return;
    }

    let dir = 1;
    if (direction == "right") {
        dir = -1;
    }

    // the spout is the near top corner — the one that swings toward the vessel
    // in beaker-local space this is always (0, -BEAKER_H) for both sides,
    // because the pivot sits at that bottom corner and the near top corner
    // is directly above it at x=0 in local coordinates
    let rawX = 0;
    let rawY = -BEAKER_H;

    let spoutX = pivotX + rawX * Math.cos(angle * dir) - rawY * Math.sin(angle * dir);
    let spoutY = pivotY + rawX * Math.sin(angle * dir) + rawY * Math.cos(angle * dir);

    let vesselCX = VESSEL_X + VESSEL_W / 2;

    ctx.strokeStyle = setAlpha(color, 0.65);
    ctx.lineWidth   = 5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(spoutX, spoutY);
    let cpX = (spoutX + vesselCX) / 2;
    let cpY = spoutY + (VESSEL_Y - spoutY) * 0.35;
    ctx.quadraticCurveTo(cpX, cpY, vesselCX, VESSEL_Y);
    ctx.stroke();

    ctx.fillStyle = setAlpha(color, 0.5);
    ctx.beginPath();
    ctx.arc(vesselCX, VESSEL_Y + 3, 4, 0, Math.PI * 2);
    ctx.fill();
}

function animate() {
    //For each beaker
    beakers.forEach(beaker => {
        //If the beaker is pouring
        if (beaker.pouring == true) {
            //Sets the angle of the beaker
            beaker.angle = Math.min((110 * (Math.PI / 180)), beaker.angle + 0.022);
            //If the beaker is tipped beyond the threshold
            if (beaker.angle > 45 * Math.PI / 180) {
                //degin to drain the beaker
                let drain = Math.min(0.55, beaker.fill);
                beaker.fill  -= drain;
                vesselFill = Math.min(VESSEL_MAX, vesselFill + drain * (VESSEL_MAX / (MAX_FILL * 2)));
                if (beaker.hasMixed == false) {
                    if (vesselColor == "") {
                        vesselColor = beaker.color;
                    } else {
                        vesselColor = mixColors(vesselColor, beaker.color);
                    }
                    beaker.hasMixed = true;
                }
                //if the beaker is empty
                if (beaker.fill <= 0) {
                    //begin moving the beaker back
                    beaker.fill  = 0;
                    beaker.pouring = false;
                    beaker.returning = true;
                }
            }
        //If the beaker is returning to it's original position
        } else if (beaker.returning == true) {
            //begin changing the angle back to normal
            beaker.angle = Math.max(0, beaker.angle - 0.028);
            //if the beaker is upright
            if (beaker.angle <= 0) {
                //the beaker is no longer returning to it's original positon
                beaker.returning = false;
                //If the beaker is not pouring or returning, it must be idle
                idleCount += 1;
            }
        }
    });

    draw();
    animId = requestAnimationFrame(animate);

    if (idleCount == 2) {
        if (doneStirring == false) {
            document.getElementById('reactionStatus').innerText = "Stir by clicking within the vessel and moving";
        }
        stirMode = true;
    }
    
}

//These allow the user to click and hold to stir the contents of the vessel
//This occurs when the user presses the mouse button within the canvas
canvas.addEventListener('mousedown', event => {
    if (!stirMode) {
        return;
    }
    let rect = canvas.getBoundingClientRect();
    //calculates the coordinates of the mouse cursor
    let stirX = (event.clientX - rect.left) / scale;
    let stirY = (event.clientY - rect.top) / scale;
    //if the mouse is within the vessel, start stirring
    if (inVessel(stirX, stirY)) {
        stirring = true;
        stirTrail = [{x: stirX, y: stirY}];
    }
});

//This occurs when the mouse moves inside the canvas
canvas.addEventListener('mousemove', event => {
    if (!stirMode) {
        return;
    }

    let rect = canvas.getBoundingClientRect();
    let stirX = (event.clientX - rect.left) / scale;
    let stirY = (event.clientY - rect.top) / scale;

    //If we have started stirring and the mouse remains inside the vessel
    if (stirring && inVessel(stirX, stirY)) {
        //Find the previous recorded position
        let last = stirTrail[stirTrail.length - 1];
        //Calculate the distance between that position and where the cursor currently is
        let d = distance(last.x, last.y, stirX, stirY);

        //This threshold allows us to control how much movement is necessary for stirring
        if (d > 2) {
            //Add the current position to the trail
            stirTrail.push({x: stirX, y: stirY});
            //If the trail is greater than 30 elements, remove the oldest one
            if (stirTrail.length > 30) {
                stirTrail.shift();
            }

            //Accumulates the distance stirred
            stirDistAccum += d;
            //Checks that progress against the necessary amount of stirring, capping out at 1
            stirProgress = Math.min(1, stirDistAccum / REACTIONS[reaction].stirNeeded);

            //If the stirring is completed and the reaction isnt yet marked as finished, trigger the reaction
            if (stirProgress >= 1 && !reactionComplete) {
                triggerReaction();
            }
        }
    } else if (stirring) {
        //If you're outside of the vessel, you can't be stirring
        stirring = false;
    }
});

//If the mouse is not being held or is outside of the canvas, disable stirring
canvas.addEventListener('mouseup',    () => {
    stirring = false; 
});
canvas.addEventListener('mouseleave', () => {
    stirring = false; 
});

//Adds stirring support for touch screens
canvas.addEventListener('touchstart', event => {
    //We need to disable default interactions to prevent stirring from scrolling the screen
    event.preventDefault();
    let rect = canvas.getBoundingClientRect();
    //identifies the first touch point, since you can touch in multiple places at once
    let touch = event.touches[0];
    let stirX = (touch.clientX - rect.left) / scale;
    let stirY = (touch.clientY - rect.top) / scale;
    //If stirMode is enabled and the touch is within the vessel
    if (stirMode && inVessel(stirX, stirY)) {
        //enable stirring and record the touch point
        stirring = true;
        stirTrail = [{x: stirX, y: stirY}];
    }
}, 
//This is necessary to allow preventDefault() to work, as a passive event listener cannot call preventDefault()
{ passive: false });

//This is the equivalent of mousemove for touch screens
canvas.addEventListener('touchmove', event => {
    //We need to disable default interactions to prevent stirring from scrolling the screen
    event.preventDefault();
    //if we aren't stirring or ready to stir, then return early
    if (!stirring || !stirMode) {
        return;
    }

    let rect = canvas.getBoundingClientRect();
    //identifies the first touch point, since you can touch in multiple places at once
    let touch = event.touches[0];
    let stirX = (touch.clientX - rect.left) / scale;
    let stirY = (touch.clientY - rect.top) / scale;

    //If the touch point is within the vessel
    if (inVessel(stirX, stirY)) {
        //Find the previous recorded position
        let last = stirTrail[stirTrail.length - 1];
        //Calculate the distance between that position and where the cursor currently is
        let d = distance(last.x, last.y, stirX, stirY);
        
        //This threshold allows us to control how much movement is necessary for stirring
        if (d > 2) {
            //Add the current position to the trail
            stirTrail.push({x: stirX, y: stirY});
            
            //If the trail is greater than 30 elements, remove the oldest one
            if (stirTrail.length > 30) {
                stirTrail.shift();
            }

            //Accumulates the distance stirred
            stirDistAccum += d;
            //Checks that progress against the necessary amount of stirring, capping out at 1
            stirProgress = Math.min(1, stirDistAccum / REACTIONS[reaction].stirNeeded);
            
            //If the stirring is completed and the reaction isnt yet marked as finished, trigger the reaction
            if (stirProgress >= 1 && !reactionComplete) {
                triggerReaction();
            }
        }
    }
}, 
//This is necessary to allow preventDefault() to work, as a passive event listener cannot call preventDefault()
{ passive: false });

//If the canvas is not being touched, disable stirring
canvas.addEventListener('touchend', () => {
    stirring = false;
});

function triggerReaction() {
    reactionComplete = true;
    stirMode = false;
    stirring = false;
    stirTrail = [];
    doneStirring = true;

    document.getElementById("reactionStatus").innerText = "Neutralisation complete — NaCl + H₂O produced";
    document.getElementById('reactScreen').querySelector('.toLabBtn').classList.remove('hidden');

    vesselColor = REACTIONS[reaction].finalColor;

    
    cancelAnimationFrame(animId);
    animId = null;
    draw();
}

function drawStirTrail() {
    //if we aren't stirring, then we don't need to draw the trail
    if (!stirMode && !stirring) {
        return;
    }

    //if there are elements in the trail,  begin to draw them
    if (stirTrail.length > 1) {
        //draw a series of lines between the trail points
        let trailColor = setAlpha(vesselColor, 0.3);
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(stirTrail[0].x, stirTrail[0].y);
        for (let i = 1; i < stirTrail.length; i++) {
            ctx.lineTo(stirTrail[i].x, stirTrail[i].y);
        }
        ctx.stroke();
    }
}

//Probably not the best way to do this, but it was the first that came to mind
function setAlpha(rgbaString, newAlpha, hasAlpha = true) {
    let channels = rgbaString.split(",");
    if (hasAlpha == true) {
        return (channels[0] + "," + channels[1] + "," + channels[2] + "," + newAlpha + ")");
    } else {
        let splitOpen = channels[0].split("(");
        let end = channels[2].replace(")", "");
        return ("rgba(" + splitOpen[1] + "," + channels[1] + "," + end[0] + "," + newAlpha + ")");
    }
}

//Averages each channel of two supplied rgba colors
function mixColors(rgbaString1, rgbaString2) {
    //If the supplied first color is actually in rgb format
    if (!rgbaString1.startsWith("rgba")) {
        //convert it to rgba with an alpha channel
        rgbaString1 = setAlpha(rgbaString1, 1, false);
    }
    //If the supplied second color is actually in rgb format
    if (!rgbaString2.startsWith("rgba")) {
        //convert it to rgba with an alpha channel
        rgbaString2 = setAlpha(rgbaString2, 1, false);
    }

    let color1 = rgbaString1.split(",");
    color1[0] = color1[0].replace("rgba(", "");
    color1[3] = color1[3].replace(")", "");
    color1 = color1.map(color => Number(color));

    let color2 = rgbaString2.split(",");
    color2[0] = color2[0].replace("rgba(", "");
    color2[3] = color2[3].replace(")", "");
    color2 = color2.map(color => Number(color));

    let avgR = (color1[0] + color2[0])/2;
    let avgG = (color1[1] + color2[1])/2;
    let avgB = (color1[2] + color2[2])/2;
    let avgA = (color1[3] + color2[3])/2;

    if (avgA == 1) {
        //Return an rgb string since the alpha channel is max
        return ("rgb(" + avgR + "," + avgG + "," + avgB + ")");
    } else {
        return ("rgba(" + avgR + "," + avgG + "," + avgB + "," + avgA + ")");
    }
}

//returns the distance between two coordinate pairs
function distance(x1, y1, x2, y2) {
    let dist = Math.hypot(x2-x1, y2-y1);
    return dist;
}

//Checks if the x and y coordinates are within the bounds of the vessel
function inVessel(x ,y) {
    if ((x > VESSEL_X + BEAKER_WALL) && (x < VESSEL_X + VESSEL_W - BEAKER_WALL) && (y > VESSEL_Y) && (y < VESSEL_Y + VESSEL_H)) {
        return true;
    } else {
        return false;
    }
}


//Verifies that the Disposal options chosen by the player line up with the reaction
document.getElementById('verifyDisposal').addEventListener('click', () => {
    //pulls answer from each category
    //checks that against value in reaction
    let correctSum = 0;

    const liquid = document.querySelector('input[name="liquidWaste"]:checked');
    const solid = document.querySelector('input[name="solidWaste"]:checked');
    const gas = document.querySelector('input[name="gaseousWaste"]:checked');

    //there is almost certainly a smarter way of doing this
    if (liquid.value == REACTIONS[reaction].disposal.liquid) {
        correctSum++;
    }
    if (solid.value == REACTIONS[reaction].disposal.solid) {
        correctSum++;
    }
    if (gas.value == REACTIONS[reaction].disposal.gaseous) {
        correctSum++;
    }

    if (correctSum == 3) {
        //if correct display this
        document.getElementById('disposalFeedback').innerText = "Good job!";
        document.getElementById('disposalScreen').querySelector('.toLabBtn').classList.remove('hidden');
        visitedDispose = true;
    } else {
        //if incorrect display this
        //Maybe include some canned responses just in case?
        document.getElementById('disposalFeedback').innerText = "Include an API call here so the AI can guide you to the right answers? Anyways, you got it wrong somehow";
        //Redundancy
        document.getElementById('disposalScreen').querySelector('.toLabBtn').classList.add('hidden');
    }
});