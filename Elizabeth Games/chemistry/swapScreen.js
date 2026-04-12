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
    swapScreen("prelab")
});

//Changes from the Pre-Lab Screen to the Title Screen
document.getElementById('preLabToTitleBtn').addEventListener('click', () => {
    swapScreen("title")
});

//Changes from the Pre-Lab Screen to the Title Screen
document.getElementById('labToTitleBtn').addEventListener('click', () => {
    swapScreen("title")
});

//Changes from the Pre-Lab Screen to the Title Screen
document.getElementById('preLabToPredictionsBtn').addEventListener('click', () => {
    swapScreen("prediction")
});

document.getElementById('predictionsToLabBtn').addEventListener('click', () => {
    swapScreen("lab")
});

//Changes from the Lab Screen to the Safety Screen
document.getElementById('toSafetyScreenBtn').addEventListener('click', () => {
    swapScreen("safety")
});

//Changes from the Lab Screen to the Storage Screen
document.getElementById('toStorageScreenBtn').addEventListener('click', () => {
    swapScreen("storage")
});

//Changes from the Lab Screen to the Measure Screen
document.getElementById('toMeasureScreenBtn').addEventListener('click', () => {
    swapScreen("measure")
});

//Changes from the Lab Screen to the React Screen
document.getElementById('toReactScreenBtn').addEventListener('click', () => {
    swapScreen("react")
});

//Changes from the Lab Screen to the Analyze Screen
document.getElementById('toAnalyzeScreenBtn').addEventListener('click', () => {
    swapScreen("analyze")
});

//Changes from the Lab Screen to the Dispose Screen
document.getElementById('toDisposeScreenBtn').addEventListener('click', () => {
    swapScreen("dispose")
});

//Changes from the Lab subscreens to the Lab Screen
document.querySelectorAll('.toLabBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        swapScreen("lab");
    });
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