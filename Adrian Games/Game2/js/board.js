/*This function loads the game screen with the correct level as needed*/
function loadLevel() {
    //the correct level and category will be chosen for the level shown
    const level = categoryLevel[currentLevel];
    hintVisible = false;
    // the board image is displayed once the level data has been retrieved
    document.getElementById('speechBubble').style.display = 'none';
    document.getElementById('hintText').innerText = '';
    document.getElementById('circuitBoardImg').src = level.boardImg;
    //goals are displayed accordingly tot he levels needs and are dynamic based on the levels needs using itenary operators
    const goalText = document.getElementById('goalText');
    const target = (typeof level.goal === 'number') ? level.goal : '?';
    if(level.goalType === 'current'){
        goalText.innerHTML = `V: <span>${level.voltage ?? '?'}</span>V &nbsp;|&nbsp; R: <span>${level.resistance ?? '?'}</span>&Omega; &nbsp;|&nbsp; Target I: <span class="unknown">${target}</span>A`;
    } else if(level.goalType === 'voltage'){
        goalText.innerHTML = `I: <span>${level.fixedCurrent ?? '?'}</span>A &nbsp;|&nbsp; R: <span>${level.resistance ?? '?'}</span>&Omega; &nbsp;|&nbsp; Target V: <span class="unknown">${target}</span>V`;
    } else if(level.goalType === 'series'){
        goalText.innerHTML = `Series: R_total = <span>${level.Answer}</span>&Omega;`;
    } else if(level.goalType === 'parallel'){
        goalText.innerHTML = `Parallel: R_total = <span>${level.Answer}</span>&Omega;`;
    } else if(level.goalType === 'tau'){
        if(level.fixedCapacitor){
            goalText.innerHTML = `R: <span>${level.fixedResistor}</span>&Omega; &nbsp;|&nbsp; C: <span class="unknown">?</span>F &nbsp;|&nbsp; &tau;: <span>${level.goal}</span>s`;
        } else {
            goalText.innerHTML = `R: <span>${level.fixedResistor}</span>&Omega; &nbsp;|&nbsp; L: <span class="unknown">?</span>H &nbsp;|&nbsp; &tau;: <span>${level.goal}</span>s`;
        }
    } else if(level.goalType === 'switch'){
        goalText.innerHTML = `R: <span>${level.fixedResistor}</span>&Omega; &nbsp;|&nbsp; C: <span>${level.fixedCapacitor}</span>F &nbsp;|&nbsp; &tau;: <span class="unknown">?</span>s`;
    } else if(level.goalType === 'voltageDivider'){
        if(level.fixedR1){
            goalText.innerHTML = `V_in: <span>${level.voltage}</span>V &nbsp;|&nbsp; R1: <span>${level.fixedR1}</span>&Omega; &nbsp;|&nbsp; R2: <span class="unknown">?</span>&Omega; &nbsp;|&nbsp; V_out: <span>${level.Answer}</span>V`;
        } else {
            goalText.innerHTML = `V_in: <span>${level.voltage}</span>V &nbsp;|&nbsp; R1: <span class="unknown">?</span>&Omega; &nbsp;|&nbsp; R2: <span class="unknown">?</span>&Omega; &nbsp;|&nbsp; V_out: <span>${level.Answer}</span>V`;
        }
    } else if(level.goalType === 'frequency'){
        goalText.innerHTML = `Target Frequency f: <span>${level.goal}</span>Hz`;
    }

    renderBoard(level);
    //Components are put in their respective levels for the student to drag and drop on the correct levels board
    const slots = document.getElementById('componentSlots');
    slots.innerHTML = '';
    level.components.forEach(component => {
        const p = document.createElement('p');
        p.classList.add('slotDesign');
        p.draggable = true;
        p.dataset.type = component.type;
        p.dataset.value = component.value;

        const img = document.createElement('img');
        img.src = component.img || componentTypes.playerComponents[component.type] || 'assets/horizontal-resistor.png';
        img.classList.add('component-img');

        const label = document.createElement('span');
        label.classList.add('component-label');
        label.innerText = component.label;

        p.appendChild(img);
        p.appendChild(label);
        slots.appendChild(p);
    });
}
/*This function attempts to Allow the API to attempt to make a board on its own through prompting*/
function renderBoard(level) {
    const overlay = document.querySelector('.boardOverlay');
    overlay.innerHTML = '';

    if(level.board){
        level.board.forEach(cell => {
            const el = document.createElement('div');
            el.style.position = 'absolute';
            //this puts the correct components at the correct positions respective to the board
            const coords = cell.coords || (() => {
                const [row, col] = cell.position.split('x').map(Number);
                return {
                    top:  `${5.4 + (row - 1) * 11}%`,
                    left: `${5.5 + (col - 1) * 11}%`
                };
            })();
            //each coordinate it in the respect distance from top and left because it uses css for drop zones
            el.style.top = coords.top;
            el.style.left = coords.left;
            el.style.width = '11%';
            el.style.height = '11%';
            //adding the correct corresponding image or dropzone
            if(cell.isDropZone){
                el.classList.add('dropZone');
                el.dataset.accepts = cell.accepts;
            } else {
                const img = document.createElement('img');
                img.src = componentTypes.aiComponents[cell.type] || '';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                if(cell.label) img.title = cell.label;
                if(cell.type === 'VerticalSwitch') img.style.transform = 'rotate(90deg)';
                el.appendChild(img);
            }

            overlay.appendChild(el);
        });

    } else {
        level.dropZones.forEach((zone, index) => {
            const dropZone = document.createElement('div');
            dropZone.classList.add('dropZone');
            dropZone.id = `slot${index + 1}`;
            dropZone.style.top  = zone.top;
            dropZone.style.left = zone.left;
            overlay.appendChild(dropZone);
        });
    }
    dragMethod();
}
/*the drag method utilizes basic html drag and drop methods which is a big part of the game concept*/
function dragMethod() {
    //slots and dropzones are needed for the drag function for a full interaction
    const dropZones = document.querySelectorAll('.dropZone');
    const slots = document.getElementById('componentSlots');
    let selectedComponent = null;
    //this method allows the whole component card to pull the components respective value
    slots.ondragstart = function(e) {
        selectedComponent = e.target.closest('.slotDesign');
    };
    //dropzones are the respective css spots that are made above or hardcoded from the levels data
    dropZones.forEach(dropZone => {
        dropZone.addEventListener('dragover', e => e.preventDefault());
        dropZone.addEventListener('drop', function(e) {
            if(!selectedComponent) return;

            const img = selectedComponent.querySelector('.component-img').cloneNode(true);
            dropZone.innerHTML = '';
            dropZone.appendChild(img);
            dropZone.dataset.value = selectedComponent.dataset.value;
            dropZone.dataset.type  = selectedComponent.dataset.type;
            //makes sure the expected value is correctly matches the levels answer
            const level = categoryLevel[currentLevel];
            const expectedZones = level.board ? level.board.filter(cell => cell.isDropZone).length : level.dropZones.length;

            const filledZones = document.querySelectorAll('.dropZone[data-value]');
            if(filledZones.length === expectedZones){
                setTimeout(checkAnswer, 150);
            }
            selectedComponent = null;
        });
    });
    slots.addEventListener('dragover', e => e.preventDefault());
    slots.addEventListener('drop', function(e) {
        if(selectedComponent){
            slots.appendChild(selectedComponent);
            selectedComponent = null;
        }
    });
}