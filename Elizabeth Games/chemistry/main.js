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
        eye:     document.querySelector('input[name="eyeAndFaceProtection"]:checked'),
        hands:   document.querySelector('input[name="handProtection"]:checked'),
        body:    document.querySelector('input[name="bodyProtection"]:checked'),
        foot:    document.querySelector('input[name="footProtection"]:checked'),
        respiratory: document.querySelector('input[name="respiratoryProtection"]:checked')
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