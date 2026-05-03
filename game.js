const params = new URLSearchParams(window.location.search);
const game = params.get('game');
const author = params.get('author');
const title = params.get('title');
const from = params.get('from');
const frame = document.getElementById('game-frame');
frame.src = game;

document.getElementById('game-title').innerText = title;
document.getElementById('gameAuthor').innerText = author;

const backLink = document.getElementById('back-link');
backLink.href = from ? from : 'index.html';

const fullscreenBtn = document.getElementById('fullscreen-btn');
const gameContainer = document.getElementById('gameContainer');

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        gameContainer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenBtn.textContent = '✕';
        fullscreenBtn.title = 'Exit Fullscreen';
    } else {
        fullscreenBtn.innerHTML = '&#x26F6;';
        fullscreenBtn.title = 'Fullscreen';
    }
});

//How to play
//Each game gets exactly 3 cards: Controls, Objective, Tips
const HTP = {
    'Adrian Games/Game1/index.html': {
        controls: {
            title: 'Controls',
            body: '<strong>Desktop:</strong> Hold <kbd>W A S D</kbd> to tilt the platform and roll the ball. Hold <kbd>Space</kbd> to charge a jump, release to launch.<br><br><strong>Mobile:</strong> Tilt your device — the gyroscope drives the ball. Tap and hold the screen to charge a jump, release to launch.'
        },
        objective: {
            title: 'Objective',
            body: 'Roll the ball through 6 physics levels — each one teaches a real concept: Position, Displacement, Velocity, Acceleration, Free Fall, and a Sandbox. Complete the on-screen challenge to unlock a short quiz, then move to the next world.'
        },
        tips: {
            title: 'Tips',
            body: 'Use the <strong>Lab Controls</strong> panel to tweak mass, friction, gravity, drag, and bounciness. Watch the <strong>Analytics</strong> strip to track speed and acceleration in real time. In Sandbox (W6), random challenges keep coming — tune the parameters to score as many as you can!'
        },
    },
    'Adrian Games/Game2/Home.html': {
        controls: {
            title: 'Controls',
            body: '<strong>Drag</strong> components (Resistors, Wires, Capacitors, Inductors, Switches) from the tray on the left onto the <strong>glowing slots</strong> on the circuit board. Tap the <strong>AI Tutor</strong> button for a hint if you get stuck.'
        },
        objective: {
            title: 'Objective',
            body: 'Defuse the circuit before the 30-second timer hits zero! Place the correct components in the right slots to complete the circuit. A <strong>green signal</strong> means the slot is solved — a <strong>dark signal</strong> costs you a heart. Choose from Ohm\'s Law, Resistors, or Complex Circuits levels.'
        },
        tips: {
            title: 'Tips',
            body: 'Read the slot color carefully before placing a component — wrong placements cost hearts. Use the <strong>AI Tutor</strong> sparingly for hints. Study the circuit layout before the timer starts. Completing levels unlocks harder circuit challenges!'
        },
    },
    'Eli Games/Sound and Valid/dist/index.html': {
        controls: {
            title: 'Controls',
            body: 'Click or tap an object in the catalog to enter play mode. Use your <strong>microphone</strong> to match the target pitch by singing or humming. The frequency meter shows how close your voice is to the target in real time.'
        },
        objective: {
            title: 'Objective',
            body: 'Match the correct sound frequencies for different materials based on their physical properties. Each material produces a unique tone determined by its density and stiffness — nail the pitch to score points and unlock new objects.'
        },
        tips: {
            title: 'Tips',
            body: 'Watch the frequency meter for visual feedback — small adjustments matter. Start with single-object puzzles before attempting race mode. The tutorial explains the material science behind why different objects produce different frequencies.'
        },
    },
    'Hao Games/code_farm/index.html': {
        controls: {
            title: 'Controls',
            body: 'Use the on-screen <strong>terminal</strong> to navigate (e.g. "cd store", "cd farm/stats"). Click farm plots to plant seeds and again to check growth. When a bug appears on a crop, fix the code in the editor to keep it growing.'
        },
        objective: {
            title: 'Objective',
            body: 'Run a virtual flower farm — buy seeds, plant and harvest flowers for coins, and fix coding bugs (IF statements, FOR loops, WHILE loops) that randomly appear in your crops. Reach harvest milestones to unlock new flower types.'
        },
        tips: {
            title: 'Tips',
            body: 'Harvest regularly to keep coins in reserve. More expensive flowers yield higher profits but take longer to grow. Fix bugs quickly — an unfixed bug wastes days of growth. Check the stats page to track progress toward unlocking new seeds.'
        },
    },
    'Ella Games/Game2Engineering/index.html': {
        controls: {
            title: 'Controls',
            body: '<strong>Hold</strong> the heat button to warm metal to the target temperature shown on the gauge. <strong>Click</strong> the anvil when the pointer enters the green zone during hammering. Choose a cooling method (Anneal, Normalize, or Quench) on the heat treatment screen.'
        },
        objective: {
            title: 'Objective',
            body: 'Run a metal forging shop for 5 days. Forge custom parts that meet customer specs for yield strength and ductility, earn reputation for quality work, and cover your $75 daily rent. End the week with positive funds and solid reputation to win.'
        },
        tips: {
            title: 'Tips',
            body: 'Study the Materials Handbook — different metals have different target temperatures. Quenching maximizes strength but makes parts brittle; annealing increases flexibility but reduces strength. Hammer accuracy matters: missed strikes reduce your final grade. High reputation (80+) earns better tips.'
        },
    },
    'Eli Games/StructureStrike/dist/index.html': {
        controls: {
            title: 'Controls',
            body: '<strong>Click or drag</strong> structural elements (beams, triangulated panels, supports) from the toolbar onto the grid. Select a placed element to move or delete it. Use the simulate button to test your structure against the level\'s applied forces.'
        },
        objective: {
            title: 'Objective',
            body: 'Build a structure that survives real engineering forces — wind loads, vertical loads, and seismic events — without collapsing. Stay within your budget and meet the minimum element requirements to earn stars and unlock harder levels.'
        },
        tips: {
            title: 'Tips',
            body: 'Triangulated panels resist forces far better than straight beams alone. Anchor your structure at the base with fixed supports. Check the requirements post-it before building. The more efficiently you use your budget, the higher your star rating.'
        },
    },
    'Elizabeth Games/fourier/index.html': {
        controls: {
            title: 'Controls',
            body: 'Drag the <strong>A</strong> (amplitude), <strong>f</strong> (frequency), and <strong>φ</strong> (phase) sliders to adjust each wave component. Your composite wave (green) updates live on the canvas alongside the target wave (red dashed line).'
        },
        objective: {
            title: 'Objective',
            body: 'Match your composite wave to the hidden target wave by tuning the individual sine wave components. Difficulty increases with each correct match — starting with 1 wave and amplitude only, up to 4 waves with all three parameters unlocked.'
        },
        tips: {
            title: 'Tips',
            body: 'A composite wave is the sum of its parts — adjust each component independently. Roughly match the overall shape first, then fine-tune. As more waves unlock, work on one at a time to avoid undoing previous progress. Landscape orientation gives more slider space on mobile.'
        },
    },
    'Ella Games/GraphGame1/index.html': {
        controls: {
            title: 'Controls',
            body: 'Type a function expression (e.g. <code>x^2+1</code>, <code>sin(x)</code>, <code>2/x</code>) into the input field and press <strong>Submit</strong>. The graph updates live showing your guess vs. the target. Use <strong>Pause</strong> to stop the timer and <strong>Settings</strong> to choose function types.'
        },
        objective: {
            title: 'Objective',
            body: 'Identify as many randomly generated mathematical functions as possible within the time limit (60 seconds). Each correct match scores points and advances to the next function. Fewer attempts and faster answers boost your skill score.'
        },
        tips: {
            title: 'Tips',
            body: 'Supported types include linear, polynomial, rational, absolute value, exponential, sine, cosine, and signum — disable unfamiliar ones in Settings to start. Up to 5 hints are available per round but cost points. First-try correct answers boost your skill level the most.'
        },
    },
};

const CARD_META = {
    controls:  { tag: 'Controls',  accent: '#2d86c8' },   // UCM blue family
    objective: { tag: 'Objective', accent: '#dbaa00' },   // UCM gold
    tips:      { tag: 'Tips',      accent: '#e2e8f0' },   // soft white
};

function openHTPOverlay() {
    document.getElementById('htp-overlay').classList.remove('hidden');
    document.getElementById('game-frame').style.pointerEvents = 'none';
}

function closeHTPOverlay() {
    document.getElementById('htp-overlay').classList.add('hidden');
    document.getElementById('game-frame').style.pointerEvents = '';
}

function handleOverlayClick(e) {
    if (e.target === document.getElementById('htp-overlay')) closeHTPOverlay();
}

const htpData = HTP[game];
if (htpData) {
    document.getElementById('htp-btn').classList.remove('hidden');
    const section = document.getElementById('how-to-play');
    const grid    = document.getElementById('htp-content');
    ['controls', 'objective', 'tips'].forEach(key => {
        const {title, body } = htpData[key];
        const { tag, accent } = CARD_META[key];
        const card = document.createElement('div');
        card.className = 'htp-card';
        card.style.setProperty('--card-accent', accent);
        card.innerHTML = `
            <div class="htp-card-title">${title}</div>
            <div class="htp-card-tag">${tag}</div>
            <p class="htp-card-body">${body}</p>`;
        grid.appendChild(card);
    });
    section.classList.remove('hidden');
}

// ── What You'll Learn ──────────────────────────────────────────────────────────
const WTL = {
    'Adrian Games/Game1/index.html': {
        concepts: {
            title: 'Key Concepts',
            body: "Newton's laws of motion, kinematics (position, velocity, acceleration), free fall, drag force, friction, and the relationship between force, mass, and acceleration."
        },
        stem: {
            title: 'STEM Connection',
            body: 'Physics & Engineering — the same equations govern real vehicle dynamics, spacecraft trajectories, and sports science. Every level is built on equations used by engineers daily.'
        },
        realworld: {
            title: 'Real-World Application',
            body: 'Why heavier objects don\'t fall faster, how friction affects braking distance, and how engineers tune drag coefficients to maximize fuel efficiency in cars and aircraft.'
        },
    },
    'Adrian Games/Game2/Home.html': {
        concepts: {
            title: 'Key Concepts',
            body: "Ohm's Law (V = IR), series and parallel resistor networks, capacitors, inductors, switches, and how to analyze a complete circuit to identify missing or incorrect components."
        },
        stem: {
            title: 'STEM Connection',
            body: 'Electrical Engineering — the foundational circuit principles behind every electronic device, from smartphones and laptops to power grids and medical equipment.'
        },
        realworld: {
            title: 'Real-World Application',
            body: 'How household wiring is laid out, why circuits have fuses and breakers, and how engineers design safe and efficient electronics through systematic circuit analysis.'
        },
    },
    'Eli Games/Sound and Valid/dist/index.html': {
        concepts: {
            title: 'Key Concepts',
            body: 'Sound frequency, wave properties (amplitude, wavelength), material density and stiffness, and resonance — why different materials vibrate at different natural frequencies.'
        },
        stem: {
            title: 'STEM Connection',
            body: 'Physics & Materials Science — acoustic engineers and instrument makers use these same principles to design concert halls, musical instruments, and industrial vibration sensors.'
        },
        realworld: {
            title: 'Real-World Application',
            body: 'Why a crystal glass rings differently than a plastic cup, how ultrasound detects cracks in metal, and how noise engineers design quieter engines and buildings.'
        },
    },
    'Hao Games/code_farm/index.html': {
        concepts: {
            title: 'Key Concepts',
            body: 'Conditional logic (IF/ELSE), iteration (FOR and WHILE loops), debugging strategies, and algorithmic thinking — the fundamental building blocks of all programming languages.'
        },
        stem: {
            title: 'STEM Connection',
            body: 'Computer Science — these control structures are universal across Python, Java, C++, and every other language. Mastering them unlocks the ability to write any program.'
        },
        realworld: {
            title: 'Real-World Application',
            body: 'Automation in precision agriculture (sensors that trigger irrigation loops), software debugging in professional development, and how algorithms drive everything from search engines to self-driving cars.'
        },
    },
    'Ella Games/Game2Engineering/index.html': {
        concepts: {
            title: 'Key Concepts',
            body: 'Stress-strain relationships, yield strength, ductility, and heat treatment processes — annealing, normalizing, and quenching — and how they alter a metal\'s microstructure and mechanical properties.'
        },
        stem: {
            title: 'STEM Connection',
            body: 'Materials Science & Mechanical Engineering — the same principles engineers use to select and process metals for bridges, aircraft frames, surgical tools, and automotive components.'
        },
        realworld: {
            title: 'Real-World Application',
            body: 'Why kitchen knives are quenched for hardness, how car frames are designed to crumple safely in crashes (controlled ductility), and how aerospace engineers choose alloys for jet engines.'
        },
    },
    'Eli Games/StructureStrike/dist/index.html': {
        concepts: {
            title: 'Key Concepts',
            body: 'Structural loads (dead, live, wind, seismic), beam bending and shear, triangulation as a load-distribution strategy, and support reactions in fixed vs. simply-supported structures.'
        },
        stem: {
            title: 'STEM Connection',
            body: 'Civil & Structural Engineering — every bridge, skyscraper, and stadium uses these exact principles. Engineers run simulations like the one in this game before any construction begins.'
        },
        realworld: {
            title: 'Real-World Application',
            body: 'Why triangles dominate bridge and tower design, how buildings are engineered to flex during earthquakes without collapsing, and how budget constraints shape real-world structural decisions.'
        },
    },
    'Elizabeth Games/fourier/index.html': {
        concepts: {
            title: 'Key Concepts',
            body: 'Sine waves, amplitude, frequency, phase, the principle of superposition, and Fourier decomposition — the idea that any complex wave can be broken into simple sine wave components.'
        },
        stem: {
            title: 'STEM Connection',
            body: 'Mathematics & Signal Processing — Fourier analysis is used in audio engineering, medical imaging (MRI and CT scans), communications, and data compression algorithms like MP3 and JPEG.'
        },
        realworld: {
            title: 'Real-World Application',
            body: 'How your phone compresses audio files, how doctors interpret EKG heart signals, how noise-canceling headphones generate inverse waves, and how radio towers transmit multiple channels simultaneously.'
        },
    },
    'Ella Games/GraphGame1/index.html': {
        concepts: {
            title: 'Key Concepts',
            body: 'Function families (linear, polynomial, rational, absolute value, trigonometric, exponential), graph interpretation, domain and range, and how parameter changes transform a function\'s shape.'
        },
        stem: {
            title: 'STEM Connection',
            body: 'Mathematics — functions are the universal language of STEM. Every physics equation, engineering formula, and data model is a function. Fluency here transfers directly to calculus and beyond.'
        },
        realworld: {
            title: 'Real-World Application',
            body: 'How scientists model population growth (exponential), how engineers design gear ratios (sinusoidal), how economists model supply and demand (rational), and how GPS calculates position (polynomial interpolation).'
        },
    },
};

const WTL_CARD_META = {
    concepts:   { tag: 'Concepts',    accent: '#4ade80' },  // green
    stem:       { tag: 'STEM Link',   accent: '#a78bfa' },  // purple
    realworld:  { tag: 'Real World',  accent: '#fb923c' },  // orange
};

const wtlData = WTL[game];
if (wtlData) {
    const section = document.getElementById('what-youll-learn');
    const grid    = document.getElementById('wtl-content');
    ['concepts', 'stem', 'realworld'].forEach(key => {
        const { title, body } = wtlData[key];
        const { tag, accent } = WTL_CARD_META[key];
        const card = document.createElement('div');
        card.className = 'htp-card';
        card.style.setProperty('--card-accent', accent);
        card.innerHTML = `
            <div class="htp-card-title">${title}</div>
            <div class="htp-card-tag">${tag}</div>
            <p class="htp-card-body">${body}</p>`;
        grid.appendChild(card);
    });
    section.classList.remove('hidden');
}
