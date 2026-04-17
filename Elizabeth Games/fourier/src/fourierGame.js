//The initial draft/framework was generated using Claude Sonnet 4.6, but has been mostly reworked
//This is a version of the fourier game but without any of the html canvas elements
//This makes it easier for Jest to test all of the functions

//Wave helper functions

//Generates a random number between min and max, then rounds according to rnd
function randomRounded(min, max, rnd) {
    let value = Math.random() * (max - min) + min;
    let scalingFactor = 100/(rnd*100)
    return Math.round(value * scalingFactor) / scalingFactor;
}

//Returns the amplitude of a wave at a given time(t) based on it's components
function generateWave(wave, t) {
  if(wave.enabled) {
    //y(t) = Asin(2pi*frequency*t + phase)
    return wave.amplitude * Math.sin(2 * Math.PI * wave.frequency * t + wave.phase);
  } else {
    return 0;
  }
}

//Returns the amplitude of a compositve wave at a given time(t) based on the component waves
function generateComposite(waves, t) {
  let sum = 0;
  //for each enabled wave in waves, generate the wave and add it to the sum
  waves.forEach(wave => {
    if(wave.enabled) {
      sum += generateWave(wave, t);
    }
  });
  return sum;
}

//Difficulty and Game State

//While I reused the previous functions, I think this table and the new get difficulty function from Claude is just a smarter approach than I used in the real game
//I may possibly update the real games code to use this new format
/** Canonical difficulty table (score → settings) */
const DIFFICULTY_TABLE = [
  { minScore: 0,  waveCount: 1, amp: true,  freq: false, phase: false },
  { minScore: 1,  waveCount: 1, amp: true,  freq: false, phase: false },
  { minScore: 2,  waveCount: 1, amp: true,  freq: true,  phase: false },
  { minScore: 4,  waveCount: 1, amp: true,  freq: true,  phase: true  },
  { minScore: 6,  waveCount: 2, amp: true,  freq: true,  phase: false },
  { minScore: 9,  waveCount: 2, amp: true,  freq: true,  phase: true  },
  { minScore: 12, waveCount: 3, amp: true,  freq: true,  phase: false },
  { minScore: 15, waveCount: 3, amp: true,  freq: true,  phase: true  },
  { minScore: 18, waveCount: 4, amp: true,  freq: true,  phase: false },
  { minScore: 21, waveCount: 4, amp: true,  freq: true,  phase: true  },
];

//As stated above, this is from Claude
/**
 * Return the difficulty settings that apply at a given score.
 * Uses the switch-case logic from the original game.
 */
function getDifficultyForScore(score) {
  // Mirror the original switch exactly (only specific scores trigger changes)
  const triggers = new Set([1, 2, 4, 6, 9, 12, 15, 18, 21]);
  if (!triggers.has(score)) {
    // Return current defaults (1 wave, amp only) for un-triggered scores
    return { waveCount: 1, ampEnabled: true, freEnabled: false, phaEnabled: false };
  }
  switch (score) {
    case 1:  return { waveCount: 1, ampEnabled: true,  freEnabled: false, phaEnabled: false };
    case 2:  return { waveCount: 1, ampEnabled: true,  freEnabled: true,  phaEnabled: false };
    case 4:  return { waveCount: 1, ampEnabled: true,  freEnabled: true,  phaEnabled: true  };
    case 6:  return { waveCount: 2, ampEnabled: true,  freEnabled: true,  phaEnabled: false };
    case 9:  return { waveCount: 2, ampEnabled: true,  freEnabled: true,  phaEnabled: true  };
    case 12: return { waveCount: 3, ampEnabled: true,  freEnabled: true,  phaEnabled: false };
    case 15: return { waveCount: 3, ampEnabled: true,  freEnabled: true,  phaEnabled: true  };
    case 18: return { waveCount: 4, ampEnabled: true,  freEnabled: true,  phaEnabled: false };
    case 21: return { waveCount: 4, ampEnabled: true,  freEnabled: true,  phaEnabled: true  };
    default: return { waveCount: 1, ampEnabled: true,  freEnabled: false, phaEnabled: false };
  }
}

//This is also from Claude
/**
 * Apply difficulty settings to a set of wave arrays in place.
 * Mirrors changeDifficulty() from the original game.
 */
function applyDifficulty(subwaves, realwaves, { waveCount, ampEnabled, freEnabled, phaEnabled }) {
  // Disable all first
  subwaves.forEach(w => { w.enabled = 0; });
  realwaves.forEach(w => { w.enabled = 0; });

  // Enable the required number
  for (let i = 0; i < waveCount; i++) {
    subwaves[i].enabled = 1;
    realwaves[i].enabled = 1;
  }

  // Reroll realwave parameters
  realwaves.forEach(wave => {
    if (!wave.enabled) return;
    wave.amplitude = ampEnabled  ? randomRounded(0.05, 1, 0.05) : 0.5;
    wave.frequency = freEnabled  ? randomRounded(0.5,  5, 0.1)  : 2.5;
    wave.phase     = phaEnabled  ? Math.PI * randomRounded(0, 2, 0.05) : 0;
  });

  return { subwaves, realwaves };
}

//Checks the current list of subwaves against the list of realwaves to determine if they match
function checkSolution(){
  //Simply need to check each of the subwaves against each of the real waves, incrementing a "correctness" score for each match
  //if the correctness equals or exceeds the number of active waves, then the player correctly identified the wave
  //upon properly identifying the wave, the player's score increases and a new wave is generated

  let correctness = 0;
  subwaves.forEach(swave => {
    //only runs for each relevant sub wave
    if (swave.enabled) {
      realwaves.forEach(rwave => {
        //only runs for each relevant real wave
        if (rwave.enabled) {
          //Theres probably a better way to see if they are matching
          if ((swave.amplitude == rwave.amplitude) && (swave.frequency == rwave.frequency) && ((rwave.phase/Math.PI)-(swave.phase/Math.PI) < 0.05)) {
            correctness++;
          }
        }
      });
    }
  });
  //Claude initially generated an altered version of this function
  //I decided to reuse my original one but I needed to change the output so that the tests could perform as expected
  return (correctness >= waveCount);
}

//Claude took a "function" used in scaling the screen and pulled it out for testing
/**
 * Compute the maximum possible amplitude of an array of waves.
 * (Used for canvas scaling — but exposed here so it can be unit-tested.)
 */
function computeMaxAmplitude(waves) {
  return waves.reduce((sum, w) => sum + (w.enabled ? w.amplitude : 0), 0);
}

//"Factory" Helpers

//These functions are wholly original to Claude
/** Create a default subwave object */
function makeSubwave(color = '#ffffff') {
  return { amplitude: 0.5, frequency: 2.5, phase: 0, color, enabled: 0 };
}

/** Create a default realwave object */
function makeRealwave() {
  return { amplitude: randomRounded(0, 1, 0.05), frequency: 2.5, phase: 0, enabled: 0 };
}

//Exports

module.exports = {
  randomRounded,
  generateWave,
  generateComposite,
  getDifficultyForScore,
  applyDifficulty,
  checkSolution,
  computeMaxAmplitude,
  makeSubwave,
  makeRealwave,
};
