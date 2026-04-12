const reactionDropdown = document.getElementById('reactionDropdown');
const predictionCards = document.getElementById('predictionCards');

let reaction = null;
let predictions = null;

//Changes from the Title Screen to the Predictions Screen
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

//I feel like there has to be a better way of doing this. Maybe I can call the functions directly within index.html?
//Changes from the Title Screen to the Pre-Lab Screen
document.getElementById('titleToPreLabBtn').addEventListener('click', () => {
    swapScreen("prelab")

    //pulls the value from the reaction dropdown and stores that as the current reaction
    reaction = reactionDropdown.value;

    document.getElementById('preLabBriefing').innerHTML = REACTIONS[reaction].prelab;
});