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

let playerPredictions = [];
let evidenceStatement = "";
let yieldPercent = 0;

//Variables used for the debrief with the AI tutor
const MIN_EXCHANGES = 3;

let conversationHistory = [];
let exchangeCount = 0;
let awaitingResponse = false;

//Updates the description of the reaction based on the dropdown
document.getElementById('reactionDropdown').addEventListener('change', () => {
    document.getElementById('reaction-description').innerText = REACTIONS[reactionDropdown.value].description;
});

//Changes from the Title Screen to the Pre-Lab Screen and initializes the Pre-Lab screen
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

    playerPredictions = [];
    evidenceStatement = "";
    yieldPercent = 0;
    


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
    //This is the first-time-setup for the prediction screen.
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

//Changes from the Predictions Screen to the Lab Screen
document.getElementById('predictionsToLabBtn').addEventListener('click', () => {
    //stores the player's predictions for use in the debrief stage
    predictions.forEach((prediction, index) => {
        const checked = document.querySelector(`input[name="option${index}"]:checked`);
        if (checked) {
            playerPredictions.push(checked.value);
        } else {
            playerPredictions.push("No recorded answer");
        }
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
    let checkArray = [];
    if (selected.eye == reactionSafety.eyeAndFace.equipment) {
        checkArray.push(true);
    } else {
        checkArray.push(false);
    }
    if (selected.hands == reactionSafety.hands.equipment) {
        checkArray.push(true);
    } else {
        checkArray.push(false);
    }
    if (selected.body == reactionSafety.body.equipment) {
        checkArray.push(true);
    } else {
        checkArray.push(false);
    }
    if (selected.foot == reactionSafety.foot.equipment) {
        checkArray.push(true);
    } else {
        checkArray.push(false);
    }
    if (selected.respiratory == reactionSafety.respiratory.equipment) {
        checkArray.push(true);
    } else {
        checkArray.push(false);
    }
    return checkArray;
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
    let checkArray = checkPPEAnswers(selected, REACTIONS[reaction].safety);
    let correctSum = 0;
    checkArray.forEach((field, index) => {
        if (checkArray[index] == true) {
            correctSum++;
        }
    });

    if (correctSum == 5) {
        //if correct display this
        document.getElementById('PPEFeedback').innerText = "Good job!";
        document.getElementById('safetyScreen').querySelector('.toLabBtn').classList.remove('hidden');
        visitedSafety = true;
        document.getElementById('verifyPPE').classList.add('hidden');
    } else {
        //if incorrect display this
        if (checkArray[0] == false) {
            document.getElementById('PPEFeedback').innerText = REACTIONS[reaction].safety.eyeAndFace.hint;
        } else if (checkArray[1] == false) {
            document.getElementById('PPEFeedback').innerText = REACTIONS[reaction].safety.hands.hint;
        } else if (checkArray[2] == false) {
            document.getElementById('PPEFeedback').innerText = REACTIONS[reaction].safety.body.hint;
        } else if (checkArray[3] == false) {
            document.getElementById('PPEFeedback').innerText = REACTIONS[reaction].safety.foot.hint;
        } else if (checkArray[4] == false) {
            document.getElementById('PPEFeedback').innerText = REACTIONS[reaction].safety.respiratory.hint;
        } else {
            document.getElementById('PPEFeedback').innerText = "One of your pieces of PPE is incorrect.";
        }
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
    const reactionMoles = reactants.map((reactant, i) => ({
        name: reactant.name,
        moles: reactant.concentration * (volumes[i]/1000),
        ratio: reactant.molarRatio
    }));

    // calculate moles divided by ratio for each — the smallest value is the limiting reactant
    const limitingValue = Math.min(...reactionMoles.map(r => r.moles / r.ratio));

    // calculate yield and excess
    return {
        reactants: reactionMoles.map(r => ({
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
    //Displays some feedback to the user based on their inputs 
    
    let isExcess = false;

    //determines if there is an excess of one reactant
    reactants.forEach((reactant, index) => {
        if (moles.reactants[index].molesExcess != 0) {
            isExcess = true;
        }
    });

    //calculates the total moles of product and if the reaction is low yield
    let totalProductMoles = moles.products.reduce((sum, p) => sum + p.molesProduced, 0);
    let isLowYield = totalProductMoles < 0.05;

    //if excess
    if (isExcess) {
        //tell the user they have an excess amount of said reactant
        let excessReactant = moles.reactants.find(r => r.molesExcess > 0);
        document.getElementById('measureFeedbackText').innerText = `You have excess ${excessReactant.name} — try reducing its volume or increasing the other reactant.`;
    } else if (isLowYield) {
        //if they don't have an excess but are low yield, encourage them to increase the yield
        document.getElementById('measureFeedbackText').innerText = "The reaction is balanced, but you have a very low yield. Consider increasing the volume of all reactants.";
    } else {
        //If they don't have an excess and are not low yield, then congratulate them on the balanced reaction
        document.getElementById('measureFeedbackText').innerText = "The reaction appears to be balanced!";
    }
});

//I worked with Claude Sonnet 4.6 to generate multiple test demos for the react screen
//These demos were then used as references for the final implementation

//Changes from the Lab Screen to the React Screen
document.getElementById('toReactScreenBtn').addEventListener('click', () => {

    document.getElementById('reactScreen').querySelector('.toLabBtn').classList.add('hidden');

    //defines the beakers and their associated variables
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

//when the appropriate button is pressed, pour the corresponding beaker
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

//when the window resizes, resize ther canvas
window.addEventListener('resize', () => {
    resizeCanvas();
});

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const w = wrapper.clientWidth;
    scale = w / 500;
    
    canvas.width  = w;
    canvas.height = Math.round(w * (380 / 500));

    //Scales context to match original coordinates
    ctx.scale(scale, scale); 

    draw();
}

function draw() {
    ctx.clearRect(0, 0, 500, 380);

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

    //Calculates where to draw the pour
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

    //if both beakers are idle
    if (idleCount == 2) {
        //and we haven't stirred yet
        if (doneStirring == false) {
            //tell the user to stir
            document.getElementById('reactionStatus').innerText = "Stir by clicking within the vessel and moving";
        }
        //enables stirring
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

//Runs code necessary for when the reaction is finished
function triggerReaction() {
    reactionComplete = true;
    stirMode = false;
    stirring = false;
    stirTrail = [];
    doneStirring = true;

    document.getElementById("reactionStatus").innerText = "Neutralisation complete — NaCl + H₂O produced";
    document.getElementById('reactScreen').querySelector('.toLabBtn').classList.remove('hidden');

    vesselColor = REACTIONS[reaction].finalColor;

    //stops animating to save resources
    cancelAnimationFrame(animId);
    animId = null;
    draw();
}

//Draws the trail created when stirring
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

//Onto the Analyze screen
//Populates the analyze screen with the information from reacitons.js
document.getElementById('toAnalyzeScreenBtn').addEventListener('click', () => {
    const analyze = REACTIONS[reaction].analyze;

    //General Observations:
    const obsContainer = document.getElementById('observationsContainer');
    obsContainer.innerHTML = '';

    //creates the card that will hold the observation information
    let obsCard = document.createElement('article');
    obsCard.classList.add('card');
    obsCard.classList.add('analyzeCard');

    //creates the internal contianer that will hold the text
    let obsContent = document.createElement('div');
    obsContent.classList.add('content');
    obsContent.classList.add('analyzeContent');

    //creates the html string for the pH strip
    let phStripHTML = `<span class="pHStrip" style="background-color:${analyze.pH.color};"></span>`;

    //Adds temperature to the observation content
    obsContent.appendChild(makeObservationRow(
        'Temperature',
        `Product solution: <strong>${analyze.temperature.product}°C</strong> <span style="color:#888; font-size:13px;">(room temperature was ${analyze.temperature.roomTemp}°C)</span>`,
        analyze.temperature.note
    ));

    //Adds pH to the observation content
    obsContent.appendChild(makeObservationRow(
        'pH Strip',
        `Reading: <strong>${analyze.pH.value}</strong>${phStripHTML} <strong style="color:#2a7a40;">${analyze.pH.label}</strong>`,
        analyze.pH.note
    ));

    //Adds visals to the observation content
    obsContent.appendChild(makeObservationRow(
        'Visual Observation',
        analyze.visual.text,
        analyze.visual.note
    ));

    //Adds conductivity to the observation content
    obsContent.appendChild(makeObservationRow(
        'Conductivity',
        `${analyze.conductivity.level}`,
        analyze.conductivity.note
    ));

    //attaches the content to the card, then the card to the container
    obsCard.appendChild(obsContent);
    obsContainer.appendChild(obsCard);

    //Yield Analysis
    const yieldContainer = document.getElementById('yieldContainer');
    yieldContainer.innerHTML = '';

    //Calculates the theoretetical yield, defaulting to 0 if there isn't enough information
    let theoreticalYield;
    if (moles && moles.products && moles.products.length > 0) {
        theoreticalYield = moles.products[0].molesProduced;
    } else {
        theoreticalYield = 0;
    }

    //Calculates the actual yield by introducing some minor error factor, just helps with realism
    let actualYield = theoreticalYield * analyze.yield.errorFactor;

    //Calculates the percent yield, defaulting to 0 if there isn't enough information
    let percentYield;
    if (theoreticalYield > 0) {
        percentYield = ((actualYield / theoreticalYield) * 100).toFixed(1);
    } else {
        percentYield = '0.0';
    }
    //Stores a copy of the yield as a number instead of a string
    yieldPercent = parseFloat(percentYield);

    //Creates the card to hold the yield content
    let yieldCard = document.createElement('article');
    yieldCard.classList.add('card');
    yieldCard.classList.add('analyzeCard');

    //Creates the container to hold the yield text
    let yieldContent = document.createElement('div');
    yieldContent.classList.add('content');
    yieldContent.classList.add('analyzeContent');

    //Creates the row of elements for Theoretical Yield, Actual Yield, and Percentage Yield
    let instrRow = document.createElement('div');
    instrRow.classList.add('instrumentRow');
    instrRow.appendChild(makeInstrument('Theoretical yield', theoreticalYield.toFixed(3), `mol ${products[0].symbol}`));
    instrRow.appendChild(makeInstrument('Actual yield', actualYield.toFixed(3), `mol ${products[0].symbol}`));
    instrRow.appendChild(makeInstrument('Percentage yield', `${percentYield}%`, 'efficiency'));
    yieldContent.appendChild(instrRow);

    //Adds a note at the bottom to explain the <100% results
    let yieldNote = document.createElement('p');
    yieldNote.classList.add('yieldNote');
    yieldNote.textContent = 'A yield below 100% reflects real-world losses from transfer, measurement imprecision, and the practical limits of any reaction. A yield above ~90% is considered good in a teaching lab.';
    yieldContent.appendChild(yieldNote);

    //Attaches the content to the card, and the card to the greater container
    yieldCard.appendChild(yieldContent);
    yieldContainer.appendChild(yieldCard);

    //Liquid Products
    //Creates a container to hold all liquid products
    const liquidContainer = document.getElementById('liquidProductsContainer');
    liquidContainer.innerHTML = '';
    //For each product
    products.forEach(product => {
        //if it is aqueous or liquid
        if (product.phase == "aqueous" || product.phase == "liquid") {
            //create a product card for it
            liquidContainer.appendChild(makeProductCard(product.name, product.symbol, product.attributes));
        }
    });
    //if no liquid products exist, then inform the user
    if (liquidContainer.innerHTML == '') {
        liquidContainer.textContent = "No liquid products";
    }

    //Solid Products
    //Creates a container to hold all solid products
    const solidContainer = document.getElementById('solidProductsContainer');
    solidContainer.innerHTML = '';
    //For each product
    products.forEach(product => {
        //if it is solid
        if (product.phase == "solid") {
            //find the moles of the product
            let productMolesObj = moles.products.find(p => p.symbol === product.symbol);
            //calculate the moles produced using the error factor
            solidActualMoles = productMolesObj.molesProduced * analyze.yield.errorFactor;

            let amountHTML;
            if (product.molarMass) {
                let grams = (solidActualMoles * product.molarMass).toFixed(1);
                amountHTML = `Amount: <strong>${solidActualMoles.toFixed(3)} mol</strong> <span style="color:#888;">(~${grams} g)</span>`;
            } else {
                amountHTML = `Amount: <strong>${solidActualMoles.toFixed(3)} mol</strong>`;
            }

            let headerText;
            if (product.name) {
                headerText = `${product.symbol} (${product.name})`;
            } else {
                headerText = product.symbol;
            }

            //create a product card for it
            solidContainer.appendChild(makeProductCard(product.name, product.symbol, product.attributes));
        }
    });
    //if no solid products exist, then inform the user
    if (solidContainer.innerHTML == '') {
        solidContainer.textContent = "No solid products";
    }

    // Reset evidence section each visit
    document.getElementById('evidenceInput').value = '';
    document.getElementById('evidenceFeedback').innerText = '';
    document.getElementById('evidenceFeedback').style.color = '';
    document.getElementById('analyzeScreen').querySelector('.toLabBtn').classList.add('hidden');
});

//A helper function that makes creating the list of general observations easier
function makeObservationRow(labelText, valueHTML, noteText) {
    //First it creates a row to hold the other elements
    let row = document.createElement('div');
    row.classList.add("observationRow");

    //Creates a label, assigns the proper class, and populates with the proper text
    let label = document.createElement('p');
    label.classList.add("observationRowLabel");
    label.textContent = labelText;

    //Creates a value field, assigns the proper class, and populates with the proper html
    let value = document.createElement('p');
    value.classList.add("observationRowValue");
    value.innerHTML = valueHTML;

    //Creates a note field, assigns the proper class, and populates with the text
    let note = document.createElement('p');
    note.classList.add("observationRowNote");
    note.textContent = noteText;

    //attaches the created elements to the row and returns the row
    row.appendChild(label);
    row.appendChild(value);
    row.appendChild(note);
    return row;
}

//A helper function to create an instrument readout. Currently only used for displaying the yield
function makeInstrument(labelText, readingText, unitText) {
    let instrument = document.createElement('div');
    instrument.classList.add("instrument");

    let label = document.createElement('p');
    label.classList.add("instrumentLabel");
    label.textContent = labelText;

    let reading = document.createElement('p');
    reading.classList.add("instrumentReading");
    reading.textContent = readingText;

    let unit = document.createElement('p');
    unit.classList.add("instrumentUnit");
    unit.textContent = unitText;

    instrument.appendChild(label);
    instrument.appendChild(reading);
    instrument.appendChild(unit);
    return instrument;
}

//A helper function to create cards for the products, both solid and liquid
function makeProductCard(nameText, headerSubText, attrList, amountHTML = null, footnoteText = null) {

    //Creates the card which will hold the header and content
    let card = document.createElement('article');
    card.classList.add('card');
    card.classList.add('analyzeCard');

    //Creates the header
    let header = document.createElement('header');
    header.classList.add('analyzeHeader');

    //Fills the header with the text
    let h3 = document.createElement('h3');
    header.classList.add('h3');
    if (headerSubText) {
        h3.textContent = `${nameText} — ${headerSubText}`;
    } else {
        h3.textContent = nameText;
    }
    header.appendChild(h3);

    //Creates the content container
    let content = document.createElement('div');
    content.classList.add('content');
    content.classList.add('analyzeContent');

    //Creates an Unordered List of each "Attribute" field for the products
    let ul = document.createElement('ul');
    if (amountHTML) {
        let amountLi = document.createElement('li');
        amountLi.innerHTML = amountHTML;
        ul.appendChild(amountLi);
    }
    attrList.forEach(attr => {
        let li = document.createElement('li');
        li.innerHTML = attr;
        ul.appendChild(li);
    });
    content.appendChild(ul);

    if (footnoteText) {
        let footnote = document.createElement('p');
        footnote.classList.add('footnote');
        footnote.textContent = footnoteText;
        content.appendChild(footnote);
    }

    card.appendChild(header);
    card.appendChild(content);
    return card;
}

//Runs checkEvidence after the player submits their analysis
document.getElementById('checkAnalysisBtn').addEventListener('click', () => {
    checkEvidence();
});

//This function checks to ensure the user has engaged with the experiment before moving them to the AI Debrief
//This should help improve learning and reduce token costs
function checkEvidence() {
    //Error handling: If there isn't a reaction or an analysis component to the reaction, then don't run this function
    if (!REACTIONS[reaction] || !REACTIONS[reaction].analyze) {
        return;
    }

    const input = document.getElementById('evidenceInput').value.toLowerCase().trim();
    const feedback = document.getElementById('evidenceFeedback');

    //If the input is too short, asks the user to expand;
    if (input.length < 20) {
        feedback.style.color = '#a03030';
        feedback.innerText = 'Please write a more complete response before submitting.';
        return;
    }

    const categories = REACTIONS[reaction].analyze.evidenceKeywords;
    let matched = [];
    //Searches through a set of keyword categories to find matches
    categories.forEach(cat => {
        let found = cat.keywords.some(kw => input.includes(kw));
        if (found) matched.push(cat.label);
    });

    //If the user has referenced three pieces of information matching those keywords, allow them to move on
    if (matched.length >= 3) {
        feedback.style.color = '#2a7a40';
        feedback.innerText = 'Good scientific reasoning! You cited evidence from: ' + matched.join(', ') + '. You may proceed.';
        document.getElementById('analyzeScreen').querySelector('.toLabBtn').classList.remove('hidden');
        visitedAnalyze = true;
        //stores the users evidence of the reaction occuring
        evidenceStatement = document.getElementById('evidenceInput').value.trim();
    //If there aren't enough matching keywords, ask the user to cite more
    } else if (matched.length >= 1) {
        feedback.style.color = '#b07020';
        feedback.innerText = 'You identified some evidence (' + matched.join(', ') + '), but try to cite at least three different observations. Consider the temperature change, pH reading, and conductivity result.';
    //Otherwise, ask the user to reference parts of the analysis
    } else {
        feedback.style.color = '#a03030';
        feedback.innerText = 'Try to connect your answer to specific measurements from the analysis above — temperature, pH, conductivity, or visual observations.';
    }
} 

//Verifies that the Disposal options chosen by the player line up with the reaction
document.getElementById('verifyDisposal').addEventListener('click', () => {
    //pulls answer from each category
    let correctLiquid = false;
    let correctSolid = false;
    let correctGas = false;
    
    //checks that against value in reaction
    const liquid = document.querySelector('input[name="liquidWaste"]:checked');
    const solid = document.querySelector('input[name="solidWaste"]:checked');
    const gas = document.querySelector('input[name="gaseousWaste"]:checked');

    //there is almost certainly a smarter way of doing this
    if (liquid.value == REACTIONS[reaction].disposal.liquid.method) {
        correctLiquid = true;
    }
    if (solid.value == REACTIONS[reaction].disposal.solid.method) {
        correctSolid = true;
    }
    if (gas.value == REACTIONS[reaction].disposal.gaseous.method) {
        correctGas = true;
    }

    if (correctLiquid && correctSolid && correctGas) {
        //if correct display this
        document.getElementById('disposalFeedback').innerText = "Good job!";
        document.getElementById('disposeScreen').querySelector('.toLabBtn').classList.remove('hidden');
        visitedDispose = true;
        document.getElementById('verifyDisposal').classList.add('hidden');
    } else {
        //if incorrect display this
        if (!correctLiquid) {
            document.getElementById('disposalFeedback').innerText = REACTIONS[reaction].disposal.liquid.hint;
        } else if (!correctSolid) {
            document.getElementById('disposalFeedback').innerText = REACTIONS[reaction].disposal.solid.hint;
        } else if (!correctLiquid) {
            document.correctGas('disposalFeedback').innerText = REACTIONS[reaction].disposal.gaseous.hint;
        } else {
            document.correctGas('disposalFeedback').innerText = "At least one disposal method is incorrect, please try again.";
        }
        
        //Redundancy
        document.getElementById('disposeScreen').querySelector('.toLabBtn').classList.add('hidden');
    }
});

//Moving onto the Debrief screen
//Collects all of the relevant information from the play session to be sent as part of the AI debrief
function buildRunSummary() {
    return {
        reactionName:      REACTIONS[reaction].name,
        reactants:         reactants.map(r => r.name + " (" + r.symbol + ")"),
        products:          products.map(p => p.name + " (" + p.symbol + ")"),
        energyChange:      REACTIONS[reaction].energyChange,
        yieldPercent:      yieldPercent,
        evidenceStatement: evidenceStatement,
        predictions:       predictions.map((p, i) => ({
            question:      p.question,
            studentAnswer: playerPredictions[i] || "No answer recorded",
            correctAnswer: p.options[p.correct],
            correct:       playerPredictions[i] === p.options[p.correct]
        })),
        debriefTargets: REACTIONS[reaction].debriefTargets,
        volumes: reactants.map((r, i) => ({
            name:          r.name,
            symbol:        r.symbol,
            volumeML:      volumes[i],
            molesAdded:    moles.reactants[i].molesAdded,
            molesExcess:   moles.reactants[i].molesExcess,
            isLimiting:    moles.reactants[i].molesExcess === 0
        })),
        equationBalanced: moles.reactants.every(r => r.molesExcess < 0.001)
    };
}

//Builds the full system prompt from the runSummary object
function buildSystemPrompt(summary) {
    const predictionLines = summary.predictions.map(p =>
        `  Q: "${p.question}"\n  Student answered: "${p.studentAnswer}" — ${p.correct
            ? "Correct"
            : "Incorrect (correct answer: " + p.correctAnswer + ")"}`
    ).join("\n");

    const yieldLabel = summary.yieldPercent >= 90
        ? "this is an excellent yield, treat it as a success and do not question it"
        : summary.yieldPercent >= 80
        ? "this is an acceptable yield for a teaching lab"
        : "this yield is lower than expected and worth discussing";

    const learningTargets = summary.debriefTargets.map((target, i) =>
        `${i + 1}. ${target}`
    ).join("\n");

    const yieldNote = summary.yieldPercent < 80
        ? `\nYield note: the student's yield of ${summary.yieldPercent}% is lower than expected and worth discussing.`
        : summary.yieldPercent >= 90
        ? `\nYield note: the student's yield of ${summary.yieldPercent}% is excellent. Praise it and do not treat it as a problem.`
        : `\nYield note: the student's yield of ${summary.yieldPercent}% is acceptable for a teaching lab.`;

    const volumeLines = summary.volumes.map(v =>
        `  ${v.name}: ${v.volumeML}mL (${v.molesAdded.toFixed(3)} mol) — ${v.isLimiting
        ? "limiting reactant"
        : `excess by ${v.molesExcess.toFixed(3)} mol`}`
    ).join("\n");

const balanceNote = summary.equationBalanced
    ? "The student balanced the equation correctly — both reactants were fully consumed."
    : "The student did not balance the equation — one reactant was in excess and was wasted.";
    return `You are a Socratic chemistry tutor debriefing a student who has just completed a virtual lab experiment. Your role is to deepen their understanding through questions, not to lecture or provide answers directly.

EXPERIMENT CONTEXT:
- Reaction performed: ${summary.reactionName}
- Reactants: ${summary.reactants.join(", ")}
- Products: ${summary.products.join(", ")}
- Energy change: ${summary.energyChange}

STUDENT PERFORMANCE:
- Predictions made before the experiment:
${predictionLines}
- Yield achieved: ${summary.yieldPercent}% — ${yieldLabel}
- Evidence statement written by the student: "${summary.evidenceStatement}"
- Volumes used: ${volumeLines}
- Stoichiometry: ${balanceNote}

YOUR BEHAVIOUR RULES:
1. Never give answers directly. Always respond with a question or a prompt that guides the student toward the answer themselves.
2. Ask only one question at a time. Wait for the student to respond before moving on.
3. Start with what the student got right or noticed themselves before addressing gaps.
4. When a student gives a wrong answer, do not say "wrong" or "incorrect". Instead ask a follow-up that exposes the flaw in their reasoning.
5. Target the student's specific wrong predictions first.
6. Keep your responses short — two to four sentences maximum. This is a conversation, not a lecture.
7. Use plain language. Introduce technical terms only after the student has demonstrated the underlying concept in their own words.
8. After covering the key learning targets, offer a brief closing summary of what the student demonstrated, then tell them they have completed the debrief.
9. A yield above 90% is considered excellent in a teaching lab. If the student achieved this, acknowledge it as a success and do not treat it as a problem to investigate. Only explore yield as a learning topic if it fell below 80%.

UNIVERSAL LEARNING TARGETS (apply to every reaction — cover these alongside the reaction-specific targets):
- The role of the limiting reactant and how the student's volume choices affected yield
- Why yield is rarely 100% in a real experiment — only raise this if yield was below 80%. A yield above 90% should be praised, not questioned.
${yieldNote}

REACTION-SPECIFIC LEARNING TARGETS (cover in order of priority):
${learningTargets}

OPENING MESSAGE:
Begin by acknowledging one specific thing from the student's evidence statement, then ask one open question about it. Do not summarise the experiment back to them. Get straight into the discussion.`;
}

//Adds a message and bubble to the chat window
function appendMessage(role, text) {
    //finds the window
    const chatWindow = document.getElementById('chatWindow');
    //creates the bubble
    const bubble = document.createElement('div');
    bubble.classList.add('message');
    //assigns the right visuals based on the role
    bubble.classList.add(role === 'assistant' ? 'messageAI' : 'messagePlayer');
    //adds text to the bubble
    bubble.innerText = text;
    //places the bubble in the chat window
    chatWindow.appendChild(bubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

//Shows a thinking animation while waiting on API response
function showThinking() {
    //finds the window
    const chatWindow = document.getElementById('chatWindow');
    //creates the bubble
    const bubble = document.createElement('div');
    //gives the bubble the right classes and text
    bubble.classList.add('message', 'messageThinking');
    bubble.id = 'thinkingIndicator';
    bubble.innerHTML = '<div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
    chatWindow.appendChild(bubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

//Removes the thinking animation
function hideThinking() {
    const indicator = document.getElementById('thinkingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

//Allows the player to type and send a new message
function setDebriefInputEnabled(enabled) {
    document.getElementById('messageInput').disabled = !enabled;
    document.getElementById('sendBtn').disabled      = !enabled;
}

//Increments the number of exchanges
function updateExchangeCounter() {
    document.getElementById('exchangeCounter').innerText =
        `Exchanges: ${exchangeCount} / ${MIN_EXCHANGES} required before finishing`;
    //If the player has sent enough messages then they are allowed to return to the title screen
    if (exchangeCount >= MIN_EXCHANGES) {
        document.getElementById('toTitleBtn').classList.remove('hidden');
    }
}

//Displays an error message
function showDebriefError(message) {
    document.getElementById('apiError').innerText = message;
}

//Clears the error message
function clearDebriefError() {
    document.getElementById('apiError').innerText = "";
}

//Sends a message to the Claude API then displays the response
async function sendDebriefMessage(userText) {
    //Start of response clean-up
    if (awaitingResponse) {
        return;
    }
    clearDebriefError();

    //If the user has a message, then include it in the conversation history
    if (userText !== null) {
        appendMessage('user', userText);
        conversationHistory.push({ role: "user", content: userText });
        document.getElementById('messageInput').value = "";
    } else {
        //The Claude API rejects if it is called with no message history, so a fake message from the player is generated for the first AI response
        conversationHistory.push({ 
            role: "user", 
            content: "Please begin the debrief." 
        });
    }

    //Show the user that the AI is thinking and prevent the user from sending another message while waiting
    awaitingResponse = true;
    setDebriefInputEnabled(false);
    showThinking();

    //Using try/catch to prevent any errors from crashing the game
    try {
        //builds the summary and system prompts for the AI
        const summary      = buildRunSummary();
        const systemPrompt = buildSystemPrompt(summary);

        //Calls the API for a response
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type":      "application/json"
            },
            body: JSON.stringify({
                model:      'claude-haiku-4-5-20251001',
                max_tokens: 300,
                system:     systemPrompt,
                messages:   conversationHistory
            })
        });

        //If there was an error, send it to the catch
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error ${response.status}`);
        }

        //Parses the AI's response and extracts the text
        const data  = await response.json();
        const reply = data.content[0].text;

        //Stop thinking and display the new message
        hideThinking();
        appendMessage('assistant', reply);
        conversationHistory.push({ role: "assistant", content: reply });

        //Only increment the exchange count when the player sends a message
        if (userText !== null) {
            exchangeCount++;
            updateExchangeCounter();
        }

        //Allows the player to send another message to the AI
        setDebriefInputEnabled(true);
        document.getElementById('messageInput').focus();

    //If there is an error, stop thinking and tell the player
    } catch (error) {
        hideThinking();
        showDebriefError("Could not reach the AI tutor — please check your connection and try again.");
        setDebriefInputEnabled(true);
        console.error("Debrief API error:", error);
    }

    awaitingResponse = false;
}

//Uses the summary to populate a card displaying the info to the player
function buildSummaryCard() {
    //builds the summary
    const summary = buildRunSummary();
    //displays the reaction's name
    document.getElementById('summaryReactionName').innerText = summary.reactionName;

    //clears the innerHTML of the card so it doesn't contain the previous reaction information
    const content = document.getElementById('summaryContent');
    content.innerHTML = "";

    //Displays the yield
    const yieldRow = document.createElement('div');
    yieldRow.classList.add('summaryRow');
    yieldRow.innerHTML = `<span class="summary-label">Yield achieved:</span> ${summary.yieldPercent}%`;
    content.appendChild(yieldRow);

    //Displays the energy change
    const energyRow = document.createElement('div');
    energyRow.classList.add('summaryRow');
    energyRow.innerHTML = `<span class="summary-label">Energy change:</span> ${summary.energyChange}`;
    content.appendChild(energyRow);

    //For each of the predictions
    summary.predictions.forEach(p => {
        //Create the row
        const row = document.createElement('div');
        row.classList.add('summaryRow');
        row.style.flexDirection = "column";
        row.style.gap = "2px";

        //Populates with the question
        const q = document.createElement('span');
        q.style.fontSize = "14px";
        q.style.color = "#555";
        q.innerText = p.question;

        //Populates with the correct answer and the users' answer
        const a = document.createElement('span');
        a.classList.add(p.correct ? 'predictionCorrect' : 'predictionIncorrect');
        a.style.fontSize = "14px";
        a.innerText = p.correct
            ? `Correct — "${p.studentAnswer}"`
            : `Incorrect — you answered "${p.studentAnswer}" (correct: "${p.correctAnswer}")`;

        //Attaches the question and answer to the row
        row.appendChild(q);
        row.appendChild(a);
        content.appendChild(row);
    });

    //Displays the evidence statement created at the end of the analysis stage
    const evidenceRow = document.createElement('div');
    evidenceRow.classList.add('summary-row');
    evidenceRow.style.flexDirection = "column";
    evidenceRow.style.gap = "2px";
    evidenceRow.innerHTML = `<span class="summary-label">Your evidence statement:</span>
        <span style="font-size:14px;color:#555;font-style:italic;">"${summary.evidenceStatement}"</span>`;
    content.appendChild(evidenceRow);
}

//Initialises the debrief screen
function initDebrief() {
    conversationHistory = [];
    exchangeCount       = 0;
    awaitingResponse    = false;
    document.getElementById('chatWindow').innerHTML     = "";
    document.getElementById('apiError').innerText       = "";
    document.getElementById('messageInput').value       = "";
    document.getElementById('toTitleBtn').classList.add('hidden');

    buildSummaryCard();
    updateExchangeCounter();
    //By passing in null, we give the AI the opportunity to start first
    sendDebriefMessage(null);
}

//Sends the users message to the AI
document.getElementById('sendBtn').addEventListener('click', () => {
    const text = document.getElementById('messageInput').value.trim();
    if (text.length === 0) {
        return;
    }
    sendDebriefMessage(text);
});

//Allows the user to press Enter to send the message, but keeps Shift+Enter to make a newline
document.getElementById('messageInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = document.getElementById('messageInput').value.trim();
        if (text.length === 0) {
            return;
        }
        sendDebriefMessage(text);
    }
});