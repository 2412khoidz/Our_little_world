// Get references to our HTML elements
const cat = document.getElementById('cat');
const park = document.querySelector('.park');
const grass = document.querySelector('.grass');
const instructions = document.getElementById('instructions');
const catTail = document.getElementById('cat-tail');
const catEye = document.getElementById('cat-eye');
const catMouth = document.getElementById('cat-mouth');
const emotionDisplay = document.getElementById('emotion-display');
const energyDisplay = document.getElementById('energy-display');
const catLegFront = document.getElementById('cat-leg-front');
const catLegBack = document.getElementById('cat-leg-back');
const catHead = document.getElementById('cat-head');

// Toy elements and selector buttons
const toys = {
    mouse: document.getElementById('mouse-toy'),
    yarn: document.getElementById('yarn-toy')
};
const toySelectorButtons = {
    mouse: document.getElementById('select-mouse'),
    yarn: document.getElementById('select-yarn')
};

// --- STATE MANAGEMENT ---
let catState = 'idle';
let energy = 100;
let cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let catPos = { x: cat.offsetLeft, y: cat.offsetTop };
let toyPositions = { mouse: { x: 0, y: 0 }, yarn: { x: 0, y: 0 } };
let activeToy = toys.mouse;
let activeToyName = 'mouse';
let hasToy = false;
let idleTimer, sadnessTimer;
let isDraggingToy = false;

// --- Central function to set state and update UI ---
function setCatState(newState) {
    if (catState === newState) return;
    
    catState = newState;
    let emotionText = '';

    // Reverted emotions back to the original friendly ones
    switch(newState) {
        case 'idle': emotionText = 'Napping 😴'; break;
        case 'following': emotionText = 'Curious 👀'; break;
        case 'fetching': emotionText = 'Pouncing! 🐁'; break;
        case 'celebrating': emotionText = 'Pleased ❤️'; break;
        case 'tired': emotionText = 'Tired 🥱'; break;
        case 'sad': emotionText = 'Lonely 😔'; break;
        case 'petting': emotionText = 'Purring... 🥰'; break;
    }
    emotionDisplay.textContent = `Emotion: ${emotionText}`;
    animateFace(newState);
}

// --- EVENT LISTENERS ---
document.addEventListener('mousemove', (e) => {
    cursor.x = e.clientX;
    cursor.y = e.clientY;

    if (isDraggingToy) {
        toyPositions[activeToyName].x = cursor.x - activeToy.offsetWidth / 2;
        toyPositions[activeToyName].y = cursor.y - activeToy.offsetHeight / 2;
        activeToy.style.left = `${toyPositions[activeToyName].x}px`;
        activeToy.style.top = `${toyPositions[activeToyName].y}px`;
        return;
    }

    const catRect = cat.getBoundingClientRect();
    const isOverCat = (cursor.x > catRect.left && cursor.x < catRect.right && cursor.y > catRect.top && cursor.y < catRect.bottom);

    if (isOverCat && !['petting', 'fetching'].includes(catState)) {
        setCatState('petting');
        setTimeout(() => { if (catState === 'petting') setCatState('celebrating'); }, 1500);
    }

    clearTimeout(idleTimer);
    clearTimeout(sadnessTimer);
    if (!isOverCat && ['idle', 'sad', 'tired'].includes(catState)) {
        setCatState(energy > 20 ? 'following' : 'tired');
    }
    idleTimer = setTimeout(() => { 
        setCatState('idle'); 
        sadnessTimer = setTimeout(() => setCatState('sad'), 8000);
    }, 3000);

    if (instructions) {
        instructions.style.opacity = '0';
        setTimeout(() => instructions.remove(), 500);
    }
});

Object.values(toys).forEach(toyEl => {
    toyEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (catState !== 'fetching' && energy > 20 && activeToy === toyEl) {
            isDraggingToy = true;
            activeToy.classList.add('dragging');
        }
    });
});

document.addEventListener('mouseup', () => {
    if (isDraggingToy) {
        isDraggingToy = false;
        activeToy.classList.remove('dragging');
        const grassRect = grass.getBoundingClientRect();
        if (toyPositions[activeToyName].y > grassRect.top) {
            setCatState('fetching');
            hasToy = false;
        }
    }
});

// --- GAME LOOP ---
function gameLoop() {
    if (['following', 'fetching'].includes(catState)) {
        energy = Math.max(0, energy - 0.1);
        if (energy <= 0) setCatState('tired');
    } else if (['idle', 'petting'].includes(catState)) {
        energy = Math.min(100, energy + 0.2);
    }
    energyDisplay.textContent = `Energy: ${Math.round(energy)}%`;
    
    animateTail();
    animateLegs();
    animateHead();

    let speed = 3;
    switch (catState) {
        case 'following': moveCat(cursor.x, cursor.y, speed); break;
        case 'tired': moveCat(cursor.x, cursor.y, 1); if (energy > 30) setCatState('idle'); break;
        case 'fetching':
            speed = 6;
            let currentToyPos = toyPositions[activeToyName];
            // REVERTED: Logic to fetch the toy properly
            if (!hasToy) {
                moveCat(currentToyPos.x, currentToyPos.y, speed);
                if (getDistance(catPos.x, catPos.y, currentToyPos.x, currentToyPos.y) < 20) hasToy = true;
            } else {
                moveCat(cursor.x, cursor.y, speed - 1);
                activeToy.style.display = 'none';
                if (getDistance(catPos.x, catPos.y, cursor.x, cursor.y) < 60) {
                    toyPositions[activeToyName].x = cursor.x - activeToy.offsetWidth / 2;
                    toyPositions[activeToyName].y = cursor.y - activeToy.offsetHeight / 2;
                    activeToy.style.left = `${toyPositions[activeToyName].x}px`;
                    activeToy.style.top = `${toyPositions[activeToyName].y}px`;
                    activeToy.style.display = 'block';
                    hasToy = false;
                    setCatState('celebrating');
                }
            }
            break;
        case 'celebrating': setTimeout(() => { if (catState === 'celebrating') setCatState('following'); }, 1500); break;
    }

    cat.style.left = `${catPos.x}px`;
    cat.style.top = `${catPos.y}px`;
    requestAnimationFrame(gameLoop);
}

// --- HELPER FUNCTIONS ---
function getDistance(x1, y1, x2, y2) { return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2); }

function moveCat(targetX, targetY, speed) {
    const dx = targetX - (catPos.x + cat.offsetWidth / 2);
    const dy = targetY - (catPos.y + cat.offsetHeight / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // REVERSED: Face away from the direction of movement (Kept from previous version)
    if (dx > 0) { // If target is to the right
        cat.style.transform = 'scaleX(-1)'; // Face left
    } else if (dx < 0) { // If target is to the left
        cat.style.transform = 'scaleX(1)'; // Face right
    }

    if (distance > 1) {
        // REVERTED: Move TOWARDS the target instead of away
        catPos.x += (dx / distance) * speed;
        catPos.y += (dy / distance) * speed;

        // Boundary logic remains the same to keep the cat on the grass
        let newY = catPos.y;
        const grassTop = park.offsetHeight * 0.7;
        const catFeetY = newY + cat.offsetHeight;
        if (catFeetY > park.offsetHeight) newY = park.offsetHeight - cat.offsetHeight;
        else if (newY < grassTop - cat.offsetHeight * 0.8) newY = grassTop - cat.offsetHeight * 0.8;
        catPos.y = newY;
    }
}

function animateTail() {
    const time = new Date().getTime();
    let rotation = 0;
    // REVERSED: Tail wags in the opposite direction (Kept from previous version)
    switch(catState) {
        case 'following': rotation = -Math.sin(time * 0.002) * 20; break;
        case 'fetching': rotation = -Math.sin(time * 0.008) * 15; break;
        case 'celebrating': rotation = -Math.sin(time * 0.01) * 30; break;
        case 'petting': rotation = -Math.sin(time * 0.015) * 35; break;
        case 'idle': rotation = -Math.sin(time * 0.0005) * 15; break;
        case 'tired': rotation = -Math.sin(time * 0.0005) * 5; break;
        case 'sad': rotation = 10; break; // Droopy tail is now perky
    }
    catTail.style.transform = `rotate(${rotation}deg)`;
}

function animateLegs() {
    const time = new Date().getTime();
    let legOffset = 0;
    
    // REVERSED: Legs animate when the cat is supposed to be still (Kept from previous version)
    if (!['following', 'fetching', 'tired'].includes(catState)) {
        let speedMultiplier = 0.005;
        legOffset = Math.sin(time * speedMultiplier) * 3;
    }
    
    catLegFront.style.transform = `translateY(${legOffset}px)`;
    catLegBack.style.transform = `translateY(${-legOffset}px)`;
}

function animateHead() {
    const catRect = cat.getBoundingClientRect();
    const catCenterX = catRect.left + (catRect.width / 2);
    const catCenterY = catRect.top + (catRect.height / 2);

    const dx = cursor.x - catCenterX;
    const dy = cursor.y - catCenterY;
    
    // REVERSED: Add 180 degrees to the angle to look away (Kept from previous version)
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 180;

    const isFlipped = cat.style.transform.includes('scaleX(-1)');
    if (isFlipped) {
        angle = 180 - angle;
    }

    const clampedAngle = Math.max(-50, Math.min(50, angle));
    
    catHead.style.transform = `rotate(${clampedAngle}deg)`;
}

function animateFace(state) {
    // Face animations are reverted to normal
    switch(state) {
        case 'celebrating': case 'petting':
            catMouth.setAttribute('d', 'M23,42 C25,46 27,46 29,42');
            catEye.setAttribute('d', 'M19,33 C21,31 23,31 25,33');
            catEye.setAttribute('r', '0'); break;
        case 'following':
            catMouth.setAttribute('d', 'M23,42 C25,45 27,45 29,42');
            catEye.setAttribute('d', ''); catEye.setAttribute('r', '3'); break;
        case 'sad':
            catMouth.setAttribute('d', 'M23,44 C25,42 27,42 29,44');
            catEye.setAttribute('d', ''); catEye.setAttribute('r', '3'); break;
        case 'tired':
            catEye.setAttribute('d', 'M19,34 h6'); catEye.setAttribute('r', '0'); break;
        default:
            catMouth.setAttribute('d', 'M23,42 C25,44 27,42 29,42');
            catEye.setAttribute('d', ''); catEye.setAttribute('r', '3');
    }
}

// --- INITIALIZATION ---
function setActiveToy(toyName) {
    activeToyName = toyName;
    activeToy = toys[toyName];
    Object.keys(toySelectorButtons).forEach(name => {
        toySelectorButtons[name].classList.toggle('active', name === toyName);
        toys[name].style.display = (name === toyName) ? 'block' : 'none';
    });
}

toySelectorButtons.mouse.addEventListener('click', () => setActiveToy('mouse'));
toySelectorButtons.yarn.addEventListener('click', () => setActiveToy('yarn'));

toyPositions.mouse.x = window.innerWidth * 0.7;
toyPositions.mouse.y = window.innerHeight * 0.8;
toys.mouse.style.left = `${toyPositions.mouse.x}px`;
toys.mouse.style.top = `${toyPositions.mouse.y}px`;

toyPositions.yarn.x = window.innerWidth * 0.3;
toyPositions.yarn.y = window.innerHeight * 0.85;
toys.yarn.style.left = `${toyPositions.yarn.x}px`;
toys.yarn.style.top = `${toyPositions.yarn.y}px`;

setActiveToy('mouse');
setCatState('idle');
gameLoop();
