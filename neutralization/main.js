let initialH = 50; // Initial number of H+ ions
let initialCl = 50; // Initial number of Cl- ions
let ph = 7.0; // Initial pH
let ions = []; // Array to hold all ion objects
let isAnimating = false; // To prevent multiple animations

const beaker = document.getElementById('beaker');
const liquid = document.getElementById('liquid');

const beakerBottom = beaker.offsetHeight;
const liquidBottom = liquid.offsetHeight;
const phDisplay = document.getElementById('ph-display');
const hclAmountSlider = document.getElementById('hcl-amount');
const hclAmountValueSpan = document.getElementById('hcl-amount-value');
const naohAmountSlider = document.getElementById('naoh-amount');
const naohAmountValueSpan = document.getElementById('naoh-amount-value');
const addBtn = document.getElementById('add-btn');
const resetBtn = document.getElementById('reset-btn');
const toggleIonBtn = document.getElementById('toggle-btn');
const dropElement = document.getElementById('drop');


// 新增：切換 Cl- 和 Na+ 透明度的按鈕

let ionsDimmed = false;

toggleIonBtn.addEventListener('click', () => {
    ionsDimmed = !ionsDimmed;
    ions.forEach(ion => {
        if (ion.type === 'Cl' || ion.type === 'Na' || ion.type === 'H2O') {
            ion.element.style.opacity = ionsDimmed ? '0.2' : '1';
        }
    });
});


const ionSize = 15;
const liquidHeight = 100;

const ionSizes = {
    'H': 15,
    'Cl': 15,
    'Na': 15,
    'OH': 25,
    'H2O': 25
};

// Function to create an ion element
function createIon(type, isNew = false) {
    const ion = document.createElement('div');
    // Use CSS class names that match style.css: OH uses .OH-ion, H2O styles use .H2O-molecule
    ion.classList.add('ion');
    if (type === 'H2O') {
        ion.classList.add('H2O-molecule');
    } else {
        ion.classList.add(`${type}-ion`);
    }
    if (type === 'OH') {
        ion.innerHTML = '<div class="O-atom"></div><div class="H-atom"></div>';
    } else if (type === 'H2O') {
        ion.innerHTML = '<div class="O-atom"></div><div class="H-atom-1"></div><div class="H-atom-2"></div>';
    }

    const size = ionSizes[type] || 15;
    const sizeXPercent = (size / 200) * 100;
    const sizeYPercent = (size / 300) * 100;

    let startX, startY;

    const dropTargetY = beakerBottom - liquidBottom;
    //const dropTargetY = liquidBottom; 
    if (isNew) {
        // Start near the top inside the liquid (use bottom % so 80% is near top)
        // Use a safer top margin (80%) and account for ion height (sizeYPercent)
        startX = 50; // Center horizontally
        // place within bounds so larger ions won't overflow visually
        // keep a bit of margin from the top and ensure the whole element stays inside
        startY = Math.min(100 - sizeYPercent - 1, 80);
    } else {
        // Random position within the liquid for initial ions
        startX = Math.random() * (100 - sizeXPercent) + sizeXPercent / 2;
        startY = Math.random() * (100 - sizeYPercent) + sizeYPercent / 2;
    }

    ion.style.left = `${startX}%`;
    ion.style.bottom = `${startY}%`;

    // 根據 ionsDimmed 狀態自動設置 Na+ 和 Cl- 透明度
    if ((type === 'Na' || type === 'Cl' || type === 'H2O') && typeof ionsDimmed !== 'undefined') {
        ion.style.opacity = ionsDimmed ? '0.2' : '1';
    }

    // Add initial random velocity. For newly created ions prefer a small downward
    // y velocity so they don't immediately move above the liquid surface.
    ion.velocity = {
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5
    };
    if (isNew) {
        // ensure downward movement (negative bottom-percent velocity)
        ion.velocity.y = -Math.abs(ion.velocity.y) || -0.1;
        // make downward velocity gentle
        ion.velocity.y *= 0.6;
    }

    return ion;
}

// Initialize ions in the solution
function initializeSolution() {
    ions.forEach(ion => ion.element.remove());
    ions = [];
    
    initialH = parseInt(hclAmountSlider.value, 10);
    initialCl = initialH;

    for (let i = 0; i < initialH; i++) {
        const hIon = createIon('H');
        liquid.appendChild(hIon);
    ions.push({ type: 'H', element: hIon, state: 'active', x: parseFloat(hIon.style.left), y: parseFloat(hIon.style.bottom), velocity: hIon.velocity, birth: performance.now() });
    }
    for (let i = 0; i < initialCl; i++) {
        const clIon = createIon('Cl');
        liquid.appendChild(clIon);
    ions.push({ type: 'Cl', element: clIon, state: 'active', x: parseFloat(clIon.style.left), y: parseFloat(clIon.style.bottom), velocity: clIon.velocity, birth: performance.now() });
    }
    
    updateDisplay();
}

// Update pH based on the number of H+ and OH- ions
function updatepH() {
    const hCount = ions.filter(ion => ion.type === 'H' && ion.state === 'active').length;
    const ohCount = ions.filter(ion => ion.type === 'OH' && ion.state === 'active').length;
    
    if (hCount > ohCount) {
        const hConcentration = (hCount - ohCount) / initialH;
        ph = -Math.log10(hConcentration) + 1; // Adjusting for visual representation
    } else if (ohCount > hCount) {
        const ohConcentration = (ohCount - hCount) / initialH;
        const pOH = -Math.log10(ohConcentration) + 1; // Adjusting for visual representation
        ph = 14 - pOH;
    } else {
        ph = 7.0;
    }
}

// Update liquid color based on pH
function updateColor() {
    if (ph < 7) {
        liquid.style.backgroundColor = '#f0f4f8';
    } else {
        const pinkOpacity = Math.min(1, Math.max(0, (ph - 7) / 2));
        liquid.style.backgroundColor = `rgba(239, 68, 68, ${pinkOpacity * 0.5 + 0.1})`;
    }
}

// Update all display elements
function updateDisplay() {
    updatepH();
    phDisplay.textContent = `pH值: ${ph.toFixed(2)}`;
    updateColor();
}

// Add animation for the drop
addBtn.addEventListener('click', () => {
    if (isAnimating) return;
    animateDrop();
    const amountToAdd = parseInt(naohAmountSlider.value, 10);
    setTimeout(() => {
        for (let i = 0; i < amountToAdd; i++) {
            const naIon = createIon('Na', true);
            const ohIon = createIon('OH', true);            
            // Align OH with Na to ensure they start together and avoid OH
            // randomly spawning above the surface.
            ohIon.style.left = naIon.style.left;
            ohIon.style.bottom = naIon.style.bottom;
            ohIon.velocity = { ...naIon.velocity };

            liquid.appendChild(naIon);
            liquid.appendChild(ohIon);
            // Parse and clamp coordinates so ions never start outside liquid bounds
            const x = Math.max(0, Math.min(100, parseFloat(naIon.style.left) || 50));
            const yRaw = parseFloat(naIon.style.bottom) || 80;
            const size = ionSizes['OH'] || 15;
            const sizeYPercent = (size / 300) * 100;
            const y = Math.max(sizeYPercent / 2, Math.min(100 - sizeYPercent / 2, yRaw));
            const now = performance.now();
            ions.push({ type: 'Na', element: naIon, state: 'active', x, y, velocity: naIon.velocity, birth: now });
            ions.push({ type: 'OH', element: ohIon, state: 'active', x, y, velocity: ohIon.velocity, birth: now });
        }
        updateDisplay();
    }, 1000);
});
function animateDrop() {
    isAnimating = true;
    dropElement.style.transition = 'transform 1s ease-in, opacity 1s ease-in';
    dropElement.style.opacity = '1';
    const dropTargetY = beakerBottom - liquidBottom;
    dropElement.style.transform = `translate(-50%, ${dropTargetY}px)`;

    // 1秒後開始淡出
    setTimeout(() => {
        dropElement.style.opacity = '0';
    }, 1000);

    // 動畫結束後隱藏
    dropElement.addEventListener('transitionend', function handler(e) {
        if (e.propertyName === 'opacity') {
            dropElement.style.transform = '';
            isAnimating = false;
            dropElement.removeEventListener('transitionend', handler);
        }
    });
}
// Handle the "Reset" button click
resetBtn.addEventListener('click', () => {
    hclAmountSlider.value = 50;
    hclAmountValueSpan.textContent = '50 個';
    naohAmountSlider.value = 5;
    naohAmountValueSpan.textContent = '5 個';
    initializeSolution();
});

// Update slider value displays
hclAmountSlider.addEventListener('input', () => {
    hclAmountValueSpan.textContent = `${hclAmountSlider.value} 個`;
});
naohAmountSlider.addEventListener('input', () => {
    naohAmountValueSpan.textContent = `${naohAmountSlider.value} 個`;
});

// Animation loop for ion movement and neutralization
function animate() {
    const liquidRect = liquid.getBoundingClientRect();
    
    // Neutralization logic
    let hIons = ions.filter(ion => ion.type === 'H' && ion.state === 'active');
    let ohIons = ions.filter(ion => ion.type === 'OH' && ion.state === 'active');

    // Neutralization: require a short grace period after creation so newly
    // spawned OH/Na are visible before immediately neutralizing.
    const NEUTRALIZE_MIN_DISTANCE = 12; // smaller threshold for cleaner visuals
    const NEUTRALIZE_GRACE_MS = 150; // ms
    for (let hIon of hIons) {
        for (let ohIon of ohIons) {
            if (hIon.state === 'active' && ohIon.state === 'active') {
                const now = performance.now();
                if ((now - (hIon.birth || 0)) < NEUTRALIZE_GRACE_MS) continue;
                if ((now - (ohIon.birth || 0)) < NEUTRALIZE_GRACE_MS) continue;

                const dx = hIon.x - ohIon.x;
                const dy = hIon.y - ohIon.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < NEUTRALIZE_MIN_DISTANCE) {
                    hIon.state = 'neutralized';
                    ohIon.state = 'neutralized';

                    // Create H2O at the midpoint and position it there
                    const midX = (hIon.x + ohIon.x) / 2;
                    const midY = (hIon.y + ohIon.y) / 2;
                    const h2o = createIon('H2O');
                    h2o.style.left = `${midX}%`;
                    h2o.style.bottom = `${midY}%`;
                    // ensure H2O doesn't immediately drift
                    h2o.velocity = { 
                        x: (Math.random() - 0.5) * 0.5,
                        y: (Math.random() - 0.5) * 0.5 
                    };
                    // make sure it's visually above background
                    h2o.style.zIndex = '5';
                    h2o.style.pointerEvents = 'none';
                    console.log('H2O created at', midX, midY);
                    liquid.appendChild(h2o);
                    ions.push({ type: 'H2O', element: h2o, state: 'active', x: Number(midX), y: Number(midY), velocity: h2o.velocity, birth: now });

                    hIon.element.remove();
                    ohIon.element.remove();
                    updateDisplay();
                }
            }
        }
    }

    // Move remaining ions
    ions.forEach(ion => {
        if (ion.state === 'active') {
            const size = ionSizes[ion.type] || 15;
            const sizeXPercent = (size / 200) * 100;
            const sizeYPercent = (size / 300) * 100;
            
            // Update position
            ion.x += ion.velocity.x;
            ion.y += ion.velocity.y;
            
            // Bounce off walls of the liquid container
            if (ion.x <= sizeXPercent / 2 || ion.x >= 100 - sizeXPercent / 2) {
                ion.velocity.x *= -1;
            }
            if (ion.y <= sizeYPercent / 2 || ion.y >= 100 - sizeYPercent / 2) {
                ion.velocity.y *= -1;
            }

            // Clamp to ensure ion never visually exceeds liquid bounds
            ion.x = Math.max(sizeXPercent / 2, Math.min(100 - sizeXPercent / 2, ion.x));
            ion.y = Math.max(sizeYPercent / 2, Math.min(100 - sizeYPercent / 2, ion.y));
                        
            
            // Apply new position
            ion.element.style.left = `${ion.x}%`;
            ion.element.style.bottom = `${ion.y}%`;
        }
    });
    requestAnimationFrame(animate);
}

// Initial setup
// Ensure ions can't visually overflow the liquid element
liquid.style.overflow = 'hidden';

initializeSolution();
animate();
