const titleScreen = document.getElementById('titleScreen');
const predictionScreen = document.getElementById('predictionScreen');
const preLabScreen = document.getElementById('preLabScreen');
const labScreen = document.getElementById('labScreen');
const safetyScreen = document.getElementById('safetyScreen');
const storageScreen = document.getElementById('storageScreen');
const measureScreen = document.getElementById('measureScreen');
const reactScreen = document.getElementById('reactScreen');
const analyzeScreen = document.getElementById('analyzeScreen');
const disposeScreen = document.getElementById('disposeScreen');
const resultsScreen = document.getElementById('resultsScreen');

//Changes from the Predictions Screen to the Pre-Lab Screen
document.getElementById('predictionsToPreLabBtn').addEventListener('click', () => {
    swapScreen("prelab");
});

//Changes from the Pre-Lab Screen to the Title Screen
document.getElementById('preLabToTitleBtn').addEventListener('click', () => {
    swapScreen("title");
});

//Changes from the Pre-Lab Screen to the Predictions Screen
document.getElementById('preLabToPredictionsBtn').addEventListener('click', () => {
    swapScreen("prediction");
});

//Changes from the Predictions Screen to the Lab Screen
document.getElementById('predictionsToLabBtn').addEventListener('click', () => {
    swapScreen("lab");
    document.getElementById('preLabToPredictionsBtn').classList.add('hidden');
    document.getElementById('preLabToLabBtn').classList.remove('hidden');
});

//Changes from the Lab Screen to the Safety Screen
document.getElementById('toSafetyScreenBtn').addEventListener('click', () => {
    if (visitedSafety == true) {
        document.getElementById('labFeedback').innerText = "You are already wearing the proper PPE.";
    } else {
        swapScreen("safety");
        document.getElementById('labFeedback').innerText = "";
    }
});

//Changes from the Lab Screen to the Storage Screen
document.getElementById('toStorageScreenBtn').addEventListener('click', () => {
    if (visitedStorage == true) {
        document.getElementById('labFeedback').innerText = "You have already retrieved the reactants.";
    } else if (visitedSafety == true) {
        swapScreen("storage");
        visitedStorage = true;
        document.getElementById('labFeedback').innerText = "";
    } else {
        document.getElementById('labFeedback').innerText = "You must have the proper Personal Protective Equipment before you can enter the lab.";
    }
});

//Changes from the Lab Screen to the Measure Screen
document.getElementById('toMeasureScreenBtn').addEventListener('click', () => {
    if (visitedMeasure == true) {
        // Maybe allow the player to go back and edit their weighed values, assuming they haven't performed the reaction yet
        document.getElementById('labFeedback').innerText = "You have already weighed the reactants.";
    } else if (visitedStorage == true) {
        swapScreen("measure");
        document.getElementById('labFeedback').innerText = "";
    } else {
        document.getElementById('labFeedback').innerText = "You must have retrieved the reactants from storage before you can measure them.";
    }
});

//Changes from the Lab Screen to the React Screen
document.getElementById('toReactScreenBtn').addEventListener('click', () => {
    if (visitedReact == true) {
        document.getElementById('labFeedback').innerText = "You have already performed the reaction.";
    } else if (visitedMeasure == true) {
        swapScreen("react");
        resizeCanvas();
        visitedReact = true;
        document.getElementById('labFeedback').innerText = "";
    } else {
        document.getElementById('labFeedback').innerText = "You must have the proper quantities before beginning the reaction.";
    }
});

//Changes from the Lab Screen to the Analyze Screen
document.getElementById('toAnalyzeScreenBtn').addEventListener('click', () => {
    if (visitedReact == true) {
        swapScreen("analyze");
        document.getElementById('labFeedback').innerText = "";
    } else { //While the other screens have an "you already performed this step" response here, the player should be able to review their analysis
        document.getElementById('labFeedback').innerText = "You must perform the reaction before you can analyze it.";
    }
});

//Changes from the Lab Screen to the Dispose Screen
document.getElementById('toDisposeScreenBtn').addEventListener('click', () => {
    if (visitedAnalyze == true) {
        swapScreen("dispose");
        document.getElementById('labFeedback').innerText = "";
    } else {
        document.getElementById('labFeedback').innerText = "You must analyze the product before you can dispose of it.";
    }
    
});

//Changes from the Lab subscreens to the Lab Screen
document.querySelectorAll('.toLabBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        swapScreen("lab");
    });
});

//Changes from the Lab Screen to the Pre-Lab Screen
document.getElementById('labToPreLabBtn').addEventListener('click', () => {
    swapScreen("prelab");
});

//Changes from the Pre-Lab to the Lab Screen
document.getElementById('preLabToLabBtn').addEventListener('click', () => {
    swapScreen("lab");
});

//Changes from the Measure subscreen to the Lab Screen
document.getElementById('measureToLabBtn').addEventListener('click', () => {
    visitedMeasure = true
    swapScreen("lab");
});

function swapScreen(screenName) {
    titleScreen.style.display = 'none';
    preLabScreen.style.display = 'none';
    predictionScreen.style.display = 'none';
    labScreen.style.display = 'none';
    safetyScreen.style.display = 'none';
    storageScreen.style.display = 'none';
    measureScreen.style.display = 'none';
    reactScreen.style.display = 'none';
    analyzeScreen.style.display = 'none';
    disposeScreen.style.display = 'none';
    resultsScreen.style.display = 'none';

    if (screenName == "title") {
        titleScreen.style.display = 'block';
    } else if (screenName == "prelab") {
        preLabScreen.style.display = 'block';
    } else if (screenName == "prediction") {
        predictionScreen.style.display = 'block';
    } else if (screenName == "lab") {
        labScreen.style.display = 'block';
    } else if (screenName == "safety") {
        safetyScreen.style.display = 'block';
    } else if (screenName == "storage") {
        storageScreen.style.display = 'block';
    } else if (screenName == "measure") {
        measureScreen.style.display = 'block';
    } else if (screenName == "react") {
        reactScreen.style.display = 'block';
    } else if (screenName == "analyze") {
        analyzeScreen.style.display = 'block';
    } else if (screenName == "dispose") {
        disposeScreen.style.display = 'block';
    } else if (screenName == "results") {
        resultsScreen.style.display = 'block';
    }
}