/*Shared helper for one-off tutor messages (non-AI) so every screen that wants to speak
through the AI tutor uses the same speech bubble plumbing. Auto-dismisses after durationMs
and plays nice with toggleHint by syncing hintVisible.*/
function showTutorNudge(message, durationMs = 4000) {
    const speechBubble = document.getElementById('speechBubble');
    const hintText     = document.getElementById('hintText');
    if(!speechBubble || !hintText) return;
    hintText.innerText = message;
    speechBubble.style.display = 'block';
    hintVisible = true;
    clearTimeout(window._tutorNudgeTimer);
    window._tutorNudgeTimer = setTimeout(hideTutorNudge, durationMs);
}

function hideTutorNudge() {
    const speechBubble = document.getElementById('speechBubble');
    const hintText     = document.getElementById('hintText');
    if(!speechBubble || !hintText) return;
    clearTimeout(window._tutorNudgeTimer);
    speechBubble.style.display = 'none';
    hintText.innerText = '';
    hintVisible = false;
}

/*This function calls on the functions askAI to retreave the LLMs response and utilize the text when clicked on
When it is clicked on after wards it will then hide the text and display nothing.*/
async function toggleHint() {

    const hintText    = document.getElementById('hintText');
    const speechBubble = document.getElementById('speechBubble');

    // On the home screen just remind the student to pick a mode — no API call needed
    const onHomeScreen = document.getElementById('home-screen').style.display !== 'none';
    if (onHomeScreen) {
        if (!hintVisible) {
            hintText.innerText = 'Select a category to get started!';
            speechBubble.style.display = 'block';
            hintVisible = true;
        } else {
            speechBubble.style.display = 'none';
            hintText.innerText = '';
            hintVisible = false;
        }
        return;
    }

    const level = categoryLevel[currentLevel]; //has the correlating hint to the correct level

    if(!hintVisible){
        //if the onclick function is activated the LLM will give the student help as prompted too
        speechBubble.style.display = 'block';
        hintText.innerText = 'Thinking...';
        try {
            const response = await askAI();
            hintText.innerText = response;
        } catch(err) {
            hintText.innerText = level.hint;//Students will be given a hard coded hint if the LLM fails
            console.error(err);
        }
        hintVisible = true;
    } else {
        speechBubble.style.display = 'none';
        hintText.innerText = '';
        hintVisible = false;
    }
}

/*The AI is prompted to give the student a guided answer but nothing that will give 
them a direct answer.*/
async function askAI() {
    //Const level guides the AI with the correct goals of whats expected out of the student per level
    const level = categoryLevel[currentLevel];
    const dropZones = document.querySelectorAll('.dropZone');
    const drops = [...dropZones].map(z => z.dataset.value || 'empty');
    const allEmpty = [...dropZones].every(z => !z.dataset.value);

    //here are some simple prompts that guide the students
    let prompt = '';
    if(allEmpty){
        prompt = `Student is on level ${level.level}.
        Goal: ${level.goalType}
        Formula: ${level.hint}
        They have not tried anything yet. Give them a starting nudge.`;
    } else if(lives < 3){
        prompt = `Student is on level ${level.level}.
        Goal: ${level.goalType}
        Formula: ${level.hint}
        They have lost ${3 - lives} lives. Be more helpful but dont give the answer.`;
    } else {
        prompt = `Student is on level ${level.level}.
        Goal: ${level.goalType}
        Formula: ${level.hint}
        They dropped: ${drops.join(', ')}. Guide them.`;
    }
    //fetching from the api hint folder
    const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: prompt })
    });

    if(!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.hint;
}

/*This function tracks the students metric when they are playing the game on free play
Key metrics are tracked on dynamic arrays that are not saved and the AI will come to
A conclusion on the based on the students weakest performance*/
async function generateWeakLevel(weakCategory) {
    //basic categorynames listed
    const categoryNames = {
        ohmsLaw:"Ohm's Law",
        resistor:'Series and Parallel Resistors',
        complexLevel:'Complex Circuits'
    };
    //based on stats the AI will look at each incorrect and correct inputs for each level
    const stats = categoryStats[weakCategory];
    const totalAttempts = stats.correct + stats.incorrect;
    const accuracy = totalAttempts > 0 ? Math.round((stats.correct / totalAttempts) * 100) : 0;

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            category: weakCategory,
            categoryName: categoryNames[weakCategory],
            correct: stats.correct,
            incorrect: stats.incorrect,
            accuracy,
            engine: 'sonnet'
        })
    });
    //possible generation of a new board correlating to the topic the student is the weakest at

    if(!response.ok) throw new Error('Generation failed');
    const data = await response.json();
    return data;
}
//students will be able to access suported learning once they have attempted to get results from the freeplay mode
async function supportedLearning() {
    const hasHistory = Object.values(categoryStats).some(cat => cat.correct > 0 || cat.incorrect > 0);
    //if students have not attempted free play mode they will be asked to before the function can even push the necessary
    //levels to generateWeakLevel()
    if(!hasHistory){
        //route the nudge through the AI tutor speech bubble instead of a browser alert
        showTutorNudge('Play Full Circuit first so I can learn your weak areas!', 4000);
        return;
    }
    //basic function to track weakest or worse topic for the student based on performance
    const weakest = Object.keys(categoryStats).reduce((a, b) =>
        categoryStats[a].incorrect > categoryStats[b].incorrect ? a : b
    );
    
    isTestMode = false;
    showPlayScreen();
    document.getElementById('goalText').innerText = 'Generating your personalized levels...';
    //levels will be generated and passing into generateWeakLevel
    try {
        const [level1, level2, level3] = await Promise.all([generateWeakLevel(weakest), generateWeakLevel(weakest), generateWeakLevel(weakest),]);
        categoryLevel = [level1, level2, level3].filter(Boolean);
        if(categoryLevel.length === 0){
            categoryLevel = levels.filter(l => l.category === weakest);
        }
        //will automatically load games just in the weak area if the function fails.
    } catch(err) {
        console.error(err);
        categoryLevel = levels.filter(l => l.category === weakest);
    }
    //added the correct and necessary reset to constants for the game
    currentLevel = 0;
    lives = 3;
    updateHearts();
    loadLevel();
    startTimer();
}