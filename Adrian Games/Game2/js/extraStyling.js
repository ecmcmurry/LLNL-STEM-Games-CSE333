/* ====== JUICE ANIMATIONS ======
 * Self-contained animation helpers. Flip JUICE_ENABLED to false to disable
 * all animations without deleting anything. Delete this file + juice.css +
 * their <link>/<script> tags in Home.html to remove completely — stats.js
 * guards the calls so removing this file will not break the game.
 */

const JUICE_ENABLED = true;

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
