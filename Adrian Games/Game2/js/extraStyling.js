/* ====== JUICE ANIMATIONS ======
 * Self-contained animation helpers. Flip JUICE_ENABLED to false to disable
 * all animations without deleting anything. Delete this file + juice.css +
 * their <link>/<script> tags in Home.html to remove completely — stats.js
 * guards the calls so removing this file will not break the game.
 */

const JUICE_ENABLED = true;

/* ── Portrait mobile scaling ──
 * The briefcase is a fixed 620px wide. On a portrait phone we zoom it down
 * so it fits the viewport without clipping. zoom (unlike transform:scale)
 * affects layout so the tray below slots in naturally underneath it.        */
function applyPortraitScale() {
    const wrapper = document.querySelector('.briefcase-wrapper');
    if (!wrapper) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const isPortrait        = h > w && w < 900;
    const isLandscapeMobile = w < 900 && w > h && h < 600;

    if (isPortrait) {
        // Portrait mobile: scale down to fit width
        wrapper.style.zoom = Math.min(1, (w * 0.95) / 620);

    } else if (isLandscapeMobile) {
        // Landscape mobile: scale to fit height (tray sidebar eats ~90px)
        wrapper.style.zoom = Math.min(1, (h * 0.88) / 520);

    } else {
        // Desktop / large iframe: scale briefcase to fill the container.
        //
        // Width budget: subtract ~200px for tray + AI guide in play mode.
        // Height budget: 82% of the iframe height.
        //   game.html's top bar (~76px) + gameContainer margin (20px) + author
        //   badge below the iframe eat into the visible area even though the
        //   iframe itself reports the full parent viewport height. 0.82 keeps
        //   the briefcase comfortably inside the visible region on all screens.
        //
        // Briefcase design size: 620px wide × 520px tall (lid included).
        const BRIEF_W = 620;
        const BRIEF_H = 520;
        const scaleW  = (w - 200) / BRIEF_W;
        const scaleH  = (h * 0.82) / BRIEF_H;
        // Use the smaller axis so it never clips, cap at 1.6 to avoid oversizing
        const scale   = Math.min(scaleW, scaleH, 1.6);
        wrapper.style.zoom = scale > 0.5 ? scale : 0.5; // never shrink below 50%
    }
}

window.addEventListener('resize', applyPortraitScale);
window.addEventListener('orientationchange', applyPortraitScale);
document.addEventListener('DOMContentLoaded', applyPortraitScale);

/* ── Landscape lock ──────────────────────────────────────────────────────────
 * On supported browsers (Android Chrome, most PWAs) this locks the viewport
 * to landscape so the OS rotates the screen automatically when the device is
 * turned. On iOS and desktop it silently fails — the rotate overlay handles
 * those cases via CSS instead.
 * Only fires on clearly-mobile viewports to avoid affecting desktop DevTools.
 */
function tryLockLandscape() {
    const isMobile = window.innerWidth < 900 || window.innerHeight < 600;
    if (!isMobile) return;
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('landscape').catch(() => {
            // Lock rejected (iOS, desktop) — rotate overlay CSS takes over
        });
    }
}

document.addEventListener('DOMContentLoaded', tryLockLandscape);

/* Glowing pulse around the circuit happens when the user correctly picks the answer */
function juiceCorrectAnswer() {
    if(!JUICE_ENABLED) return 0;

    const overlay = document.querySelector('.boardOverlay');
    if(!overlay) return 0;

    const cells = [...overlay.children].filter(el => !el.classList.contains('dropZone'));
    const step  = 45;
    const pulse = 380;

    cells.forEach((cell, i) => {
        setTimeout(() => {
            cell.classList.add('board-currentFlow');
            setTimeout(() => cell.classList.remove('board-currentFlow'), pulse);}, i * step);
    });
    return cells.length * step + pulse;
}

//Board will shake if the answer is incorrect.
function juiceWrongAnswer() {
    if(!JUICE_ENABLED) return;
    const target = document.querySelector('.boardOverlay')?.parentElement || document.getElementById('circuitBoardImg')?.parentElement;
    if(!target) return;
    target.classList.remove('board-shake');
    void target.offsetWidth;
    target.classList.add('board-shake');
    setTimeout(() => target.classList.remove('board-shake'), 450);
}
