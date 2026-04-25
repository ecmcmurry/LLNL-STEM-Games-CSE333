//UI: TELEMETRY, CHART, MATCH, MODAL, UTILITIES 

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function updateTelemetry(P) {
    const speed = ballVel.length();
    const ke    = 0.5 * P.mass * speed * speed;
    setText('tel-speed',  speed.toFixed(2));
    setText('tel-accel',  currentAccelMag.toFixed(2));
    setText('tel-tiltx',  tiltX.toFixed(1));
    setText('tel-tiltz',  tiltZ.toFixed(1));
    setText('tel-normal', F.normal.length().toFixed(2));
    setText('tel-ke',     ke.toFixed(3));

    const sEl = document.getElementById('tel-speed');
    if (sEl) sEl.style.color = Math.abs(speed - targetSpeed) < MATCH_TOLERANCE ? '#4ade80' : '#22d3ee';

    const badge = document.getElementById('tel-state');
    if (badge) {
        badge.textContent = onSurface ? 'ON SURFACE' : 'AIRBORNE';
        badge.className   = 'state-badge' + (onSurface ? '' : ' airborne');
    }

    //live phone accelerometer — only active in mobile mode
    if (controlMethod === 'mobile') {
        const phoneValEl = document.getElementById('tel-phone-accel');
        const phoneRowEl = document.getElementById('tel-phone-row');
        if (phoneValEl) {
            phoneValEl.textContent = phoneAccelMag.toFixed(2);
            //color: green → near freefall, purple → active, dim handled by freefall class
        }
        if (phoneRowEl) {
            //freefall class lights up green when phone reads near 0g
            phoneRowEl.classList.toggle('freefall', phoneAccelMag < 1.5);
        }
    }
}

//chart utilized from char.js
function initChart() {
    const ctx = document.getElementById('physicsChart')?.getContext('2d');
    if (!ctx) return;
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(CHART_LEN).fill(''),
            datasets: [
                { label: 'Speed',  borderColor: '#4ade80', data: [...chartSpeed], borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false },
                { label: 'Accel',  borderColor: '#ef4444', data: [...chartAccel], borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false },
                { label: 'Target', borderColor: '#fbbf24', data: Array(CHART_LEN).fill(targetSpeed), borderWidth: 1, borderDash: [5,5], pointRadius: 0, fill: false }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            scales: {
                y: { min: 0, max: 12, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 9 } } },
                x: { display: false }
            },
            plugins: { legend: { display: true, position: 'top', labels: { color: '#94a3b8', boxWidth: 12, font: { size: 9 } } } }
        }
    });
}

function updateChart() {
    if (!chart) return;
    const speed = ballVel.length();
    chartSpeed.push(speed);           chartSpeed.shift();
    chartAccel.push(currentAccelMag); chartAccel.shift();
    chart.data.datasets[0].data = [...chartSpeed];
    chart.data.datasets[1].data = [...chartAccel];
    // Show target line in sandbox (level 0) and W4 speed ramp (level 4)
    chart.data.datasets[2].data = Array(CHART_LEN).fill(
        (currentLevel === 0 || currentLevel === 4) ? targetSpeed : 0
    );
    const maxVal = Math.max(...chartSpeed, ...chartAccel, targetSpeed, 5);
    chart.options.scales.y.max = Math.ceil(maxVal * 1.3);
    chart.update('none');
}

//Sandbox mode
function generateTarget() {
    targetSpeed = Math.random() * 5 + 0.5;
    const el = document.getElementById('target-val');
    if (el) el.textContent = targetSpeed.toFixed(2) + ' m/s';
}
//needed update for each different match
function updateMatch(dt) {
    const diff = Math.abs(ballVel.length() - targetSpeed);
    matchTimer = diff < MATCH_TOLERANCE
        ? matchTimer + dt
        : Math.max(0, matchTimer - dt * 0.8);
    const bar = document.getElementById('match-progress');
    if (bar) bar.style.width = (Math.min(matchTimer / MATCH_HOLD_TIME, 1) * 100) + '%';
    if (matchTimer >= MATCH_HOLD_TIME) { matchTimer = 0; generateTarget(); }
}

//Matching ayour for each different level
function showModal({ badge, title, body, choices, onChoice, btnLabel = 'Continue', onBtn }) {
    document.getElementById('bloom-modal').classList.remove('hidden');
    levelPhase = 'question';
    setText('bm-badge', badge || '');
    setText('bm-title', title  || '');
    const bodyEl = document.getElementById('bm-body');
    if (bodyEl) bodyEl.textContent = body || '';

    const choicesEl = document.getElementById('bm-choices');
    choicesEl.innerHTML = '';
    document.getElementById('bm-explanation').classList.add('hidden');

    const btn = document.getElementById('bm-btn');
    btn.textContent = btnLabel;
    btn.classList.remove('hidden');
    btn.onclick = () => { hideModal(); if (onBtn) onBtn(); };

    if (choices && choices.length) {
        btn.classList.add('hidden');
        const letters = 'ABCDEFGH';
        choices.forEach((c, i) => {
            const b = document.createElement('button');
            b.className = 'bm-choice-btn';

            const badge = document.createElement('span');
            badge.className   = 'choice-letter';
            badge.textContent = letters[i] ?? String(i + 1);

            const text = document.createElement('span');
            text.className   = 'choice-text';
            text.textContent = c;

            b.appendChild(badge);
            b.appendChild(text);
            b.onclick = () => { if (onChoice) onChoice(i, b); };
            choicesEl.appendChild(b);
        });
    }
}

function showExplanation(correct, explanation, onContinue) {
    const expEl = document.getElementById('bm-explanation');
    expEl.classList.remove('hidden');
    expEl.innerHTML = `<span class="${correct ? 'correct' : 'incorrect'}">${correct ? '✓ Correct!' : '✗ Not quite.'}</span> ${explanation}`;
    document.querySelectorAll('.bm-choice-btn').forEach(b => b.disabled = true);
    const btn = document.getElementById('bm-btn');
    btn.textContent = 'Continue';
    btn.classList.remove('hidden');
    btn.onclick = () => { hideModal(); if (onContinue) onContinue(); };
}

function hideModal() {
    document.getElementById('bloom-modal')?.classList.add('hidden');
    if (levelPhase === 'question') levelPhase = 'active';
}

function setLevelHUD(badge, task, progress, score) {
    setText('level-badge-text', badge);
    setText('level-task-text',  task);
    setText('level-score-text', score);
    const bar = document.getElementById('level-progress-bar');
    if (bar) bar.style.width = (Math.min(Math.max(progress, 0), 1) * 100) + '%';
}

//refactors map accordingly
function adj(id, delta) {
    const input = document.getElementById(id);
    if (!input || input.disabled) return;
    const decimals = (delta.toString().split('.')[1] || '').length;
    const factor   = Math.pow(10, decimals);
    let val = Math.round((parseFloat(input.value) + delta) * factor) / factor;
    const min = parseFloat(input.min), max = parseFloat(input.max);
    if (!isNaN(min)) val = Math.max(min, val);
    if (!isNaN(max)) val = Math.min(max, val);
    input.value = val;
}
