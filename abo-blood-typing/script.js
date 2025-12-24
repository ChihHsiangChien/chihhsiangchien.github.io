document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Show corresponding tab pane
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // RBC View Logic (Placeholder)
    const typeBtns = document.querySelectorAll('.type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateRBCView(btn.getAttribute('data-type'));
        });
    });
});
document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Show corresponding tab pane
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // RBC View Logic (Placeholder)
    const typeBtns = document.querySelectorAll('.type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateRBCView(btn.getAttribute('data-type'));
        });
    });
});

function updateRBCView(type) {
    const title = document.getElementById('type-title');
    const desc = document.getElementById('type-desc');
    const canvas = document.getElementById('rbc-canvas');
    
    title.textContent = `${type} 型`;
    
    let description = '';
    let hasAntigenA = false;
    let hasAntigenB = false;
    let hasAntiA = false;
    let hasAntiB = false;

    switch(type) {
        case 'A':
            description = '紅血球表面有 A 抗原。血漿中有抗 B 抗體。';
            hasAntigenA = true;
            hasAntiB = true;
            break;
        case 'B':
            description = '紅血球表面有 B 抗原。血漿中有抗 A 抗體。';
            hasAntigenB = true;
            hasAntiA = true;
            break;
        case 'AB':
            description = '紅血球表面同時有 A 和 B 抗原。血漿中沒有抗體。';
            hasAntigenA = true;
            hasAntigenB = true;
            break;
        case 'O':
            description = '紅血球表面沒有抗原。血漿中同時有抗 A 和抗 B 抗體。';
            hasAntiA = true;
            hasAntiB = true;
            break;
    }
    desc.textContent = description;
    
    // Generate SVG
    const svgContent = generateRBCSVG(hasAntigenA, hasAntigenB, hasAntiA, hasAntiB);
    canvas.innerHTML = svgContent;
}

function generateRBCSVG(hasA, hasB, antiA, antiB) {
    const width = 400;
    const height = 300;
    const cx = width / 2;
    const cy = height / 2;
    const rbcRadius = 80;

    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <!-- Antigen A (Large Blue Square) -->
            <rect id="antigen-a" x="-12" y="-12" width="24" height="24" fill="#457b9d" stroke="#1d3557" stroke-width="2" />
            <!-- Antigen B (Large Yellow Circle) -->
            <circle id="antigen-b" cx="0" cy="0" r="12" fill="#fca311" stroke="#e85d04" stroke-width="2" />
            
            <!-- Antibody Anti-A (Y-shape with Square Receptor) -->
            <g id="antibody-a">
                <!-- Y-body -->
                <path d="M0,0 L0,30 M0,30 L-20,10 M0,30 L20,10" stroke="#457b9d" stroke-width="6" fill="none" stroke-linecap="round" />
                <!-- Square Receptor (Left) -->
                <path d="M-20,10 L-20,0 L-10,0 L-10,10" fill="none" stroke="#457b9d" stroke-width="4" />
                <!-- Square Receptor (Right) -->
                <path d="M20,10 L20,0 L10,0 L10,10" fill="none" stroke="#457b9d" stroke-width="4" />
            </g>
            
            <!-- Antibody Anti-B (Y-shape with Round Receptor) -->
            <g id="antibody-b">
                <!-- Y-body -->
                <path d="M0,0 L0,30 M0,30 L-20,10 M0,30 L20,10" stroke="#fca311" stroke-width="6" fill="none" stroke-linecap="round" />
                <!-- Round Receptor (Left) -->
                <path d="M-25,10 A 12,12 0 0,1 -15,10" fill="none" stroke="#fca311" stroke-width="4" />
                <!-- Round Receptor (Right) -->
                <path d="M15,10 A 12,12 0 0,1 25,10" fill="none" stroke="#fca311" stroke-width="4" />
            </g>
        </defs>
        
        <!-- Background Plasma -->
        <rect width="100%" height="100%" fill="#fff9db" opacity="0.3"/>
    `;

    // Draw Antibodies (Floating in background)
    if (antiA) {
        for (let i = 0; i < 6; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            if (Math.hypot(x - cx, y - cy) > rbcRadius + 50) {
                svg += `<use href="#antibody-a" x="${x}" y="${y}" transform="rotate(${Math.random() * 360} ${x} ${y})" class="floating" style="animation-delay: ${Math.random()}s" />`;
            }
        }
    }
    if (antiB) {
        for (let i = 0; i < 6; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
             if (Math.hypot(x - cx, y - cy) > rbcRadius + 50) {
                svg += `<use href="#antibody-b" x="${x}" y="${y}" transform="rotate(${Math.random() * 360} ${x} ${y})" class="floating" style="animation-delay: ${Math.random()}s" />`;
            }
        }
    }

    // Draw RBC
    svg += `<circle cx="${cx}" cy="${cy}" r="${rbcRadius}" fill="#e63946" stroke="#c92a2a" stroke-width="4" />
            <circle cx="${cx}" cy="${cy}" r="${rbcRadius * 0.7}" fill="none" stroke="#c92a2a" stroke-width="10" opacity="0.3" />`;

    // Draw Antigens on RBC surface
    const antigenCount = 8; // Reduce count for clarity
    for (let i = 0; i < antigenCount; i++) {
        const angle = (i / antigenCount) * Math.PI * 2;
        // Position slightly outside the RBC radius
        const x = cx + Math.cos(angle) * (rbcRadius - 5); 
        const y = cy + Math.sin(angle) * (rbcRadius - 5);
        const rotation = (angle * 180 / Math.PI) + 90;

        if (hasA && hasB) {
            if (i % 2 === 0) {
                svg += `<use href="#antigen-a" x="${x}" y="${y}" transform="rotate(${rotation} ${x} ${y})" />`;
            } else {
                svg += `<use href="#antigen-b" x="${x}" y="${y}" transform="rotate(${rotation} ${x} ${y})" />`;
            }
        } else if (hasA) {
            svg += `<use href="#antigen-a" x="${x}" y="${y}" transform="rotate(${rotation} ${x} ${y})" />`;
        } else if (hasB) {
            svg += `<use href="#antigen-b" x="${x}" y="${y}" transform="rotate(${rotation} ${x} ${y})" />`;
        }
    }

    svg += `</svg>`;
    return svg;
}


// Blood Typing Game Logic
let unknownSampleType = 'A'; // Default
let wellAStatus = false; // false = normal, true = agglutinated
let wellBStatus = false;

function initBloodTyping() {
    const types = ['A', 'B', 'AB', 'O'];
    unknownSampleType = types[Math.floor(Math.random() * types.length)];
    
    // Reset UI
    document.getElementById('well-a').querySelector('.liquid').classList.remove('agglutinated');
    document.getElementById('well-b').querySelector('.liquid').classList.remove('agglutinated');
    document.getElementById('typing-feedback').textContent = '';
    document.getElementById('typing-feedback').className = 'feedback';
    
    wellAStatus = false;
    wellBStatus = false;
    
    console.log(`New sample generated: ${unknownSampleType} (Hidden)`);
}

// Drag and Drop Setup
const droppers = document.querySelectorAll('.dropper');
const wells = document.querySelectorAll('.well');

droppers.forEach(dropper => {
    dropper.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', dropper.dataset.reagent);
    });
});

wells.forEach(well => {
    well.addEventListener('dragover', (e) => {
        e.preventDefault();
        well.classList.add('drag-over');
    });

    well.addEventListener('dragleave', () => {
        well.classList.remove('drag-over');
    });

    well.addEventListener('drop', (e) => {
        e.preventDefault();
        well.classList.remove('drag-over');
        const reagent = e.dataTransfer.getData('text/plain');
        const wellId = well.dataset.well; // 'A' or 'B'
        
        // Logic: Anti-A goes to Well A, Anti-B goes to Well B (usually)
        // But user can drop anywhere. Let's assume Well A is for Anti-A testing.
        // Actually, the well ID is just a container. The reaction depends on what was dropped.
        // But typically Well A is for Anti-A. Let's enforce that or just check reaction.
        
        // Simplified: Well A is for Anti-A, Well B is for Anti-B
        if ((wellId === 'A' && reagent === 'anti-a') || (wellId === 'B' && reagent === 'anti-b')) {
            testSample(wellId, reagent);
        } else {
            // Wrong reagent for the well (optional: show error or just allow it)
            // Let's allow it but it might be confusing. Let's strictly enforce for simplicity.
            const reagentName = reagent === 'anti-a' ? '抗 A 血清' : '抗 B 血清';
            const wellName = reagent === 'anti-a' ? 'A' : 'B';
            alert(`請將 ${reagentName} 加入 ${wellName} 試管。`);
        }
    });
});

function testSample(wellId, reagent) {
    const liquid = document.getElementById(`well-${wellId.toLowerCase()}`).querySelector('.liquid');
    let isAgglutinated = false;

    if (reagent === 'anti-a') {
        if (unknownSampleType === 'A' || unknownSampleType === 'AB') {
            isAgglutinated = true;
        }
    } else if (reagent === 'anti-b') {
        if (unknownSampleType === 'B' || unknownSampleType === 'AB') {
            isAgglutinated = true;
        }
    }

    if (isAgglutinated) {
        liquid.classList.add('agglutinated');
        if (wellId === 'A') wellAStatus = true;
        if (wellId === 'B') wellBStatus = true;
    }
}

// Guess Buttons
document.querySelectorAll('.guess-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const guess = btn.dataset.guess;
        const feedback = document.getElementById('typing-feedback');
        
        if (guess === unknownSampleType) {
            feedback.textContent = '答對了！做得好。';
            feedback.className = 'feedback success';
        } else {
            feedback.textContent = '答錯了，再試一次。';
            feedback.className = 'feedback error';
        }
    });
});

document.getElementById('new-sample-btn').addEventListener('click', initBloodTyping);



// Transfusion Simulation Logic
let currentPatientType = 'A';
let isPatientTested = false;
let miniWellAStatus = false;
let miniWellBStatus = false;
let hasBloodInWellA = false;
let hasBloodInWellB = false;

function initTransfusion() {
    const types = ['A', 'B', 'AB', 'O'];
    currentPatientType = types[Math.floor(Math.random() * types.length)];
    isPatientTested = false;
    
    // Reset UI
    document.getElementById('patient-id').textContent = Math.floor(Math.random() * 900) + 100;
    const typeDisplay = document.getElementById('patient-blood-display');
    typeDisplay.classList.add('hidden');
    typeDisplay.querySelector('.val').textContent = '?';
    typeDisplay.style.display = 'none'; 
    
    document.getElementById('draw-blood-btn').disabled = false;
    document.getElementById('draw-blood-btn').textContent = '抽血';
    
    // Reset Mini Lab
    document.getElementById('mini-lab').style.display = 'none';
    document.getElementById('patient-sample').style.display = 'none';
    resetMiniWell('mini-well-a');
    resetMiniWell('mini-well-b');
    document.getElementById('manual-type-select').value = '';
    document.getElementById('manual-type-select').disabled = false;
    document.getElementById('confirm-type-btn').disabled = false;
    
    hideTransfusionFeedback();
    
    console.log(`New patient: Type ${currentPatientType} (Hidden)`);
}

function resetMiniWell(id) {
    const well = document.getElementById(id);
    const liquid = well.querySelector('.liquid');
    liquid.className = 'liquid';
    liquid.style.backgroundColor = '#f0f0f0'; // Empty
    hasBloodInWellA = false;
    hasBloodInWellB = false;
    miniWellAStatus = false;
    miniWellBStatus = false;
}

document.getElementById('draw-blood-btn').addEventListener('click', () => {
    const btn = document.getElementById('draw-blood-btn');
    btn.disabled = true;
    btn.textContent = '已抽血';
    
    // Show Mini Lab
    const miniLab = document.getElementById('mini-lab');
    miniLab.style.display = 'flex';
    document.getElementById('patient-sample').style.display = 'flex';
    showTransfusionFeedback('請將病人血液拖曳至試管中，並加入抗血清進行檢測。', 'success');
    
    // Scroll to mini lab to ensure visibility
    setTimeout(() => {
        miniLab.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
});

// Mini Lab Drag and Drop
const patientSample = document.getElementById('patient-sample');
const miniWells = document.querySelectorAll('.mini-well');
const miniTools = document.querySelectorAll('.mini-lab .tool');

patientSample.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', 'patient-blood');
});

miniTools.forEach(tool => {
    tool.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', tool.dataset.reagent);
    });
});

miniWells.forEach(well => {
    well.addEventListener('dragover', (e) => {
        e.preventDefault();
        well.style.borderColor = '#457b9d';
    });

    well.addEventListener('dragleave', () => {
        well.style.borderColor = '#ccc';
    });

    well.addEventListener('drop', (e) => {
        e.preventDefault();
        well.style.borderColor = '#ccc';
        const data = e.dataTransfer.getData('text/plain');
        const wellId = well.dataset.well; // A or B
        
        if (data === 'patient-blood') {
            addBloodToMiniWell(wellId);
        } else if (data === 'anti-a' || data === 'anti-b') {
            addReagentToMiniWell(wellId, data);
        }
    });
});

function addBloodToMiniWell(wellId) {
    const well = document.getElementById(`mini-well-${wellId.toLowerCase()}`);
    const liquid = well.querySelector('.liquid');
    liquid.style.backgroundColor = '#e63946'; // Red
    
    if (wellId === 'A') hasBloodInWellA = true;
    if (wellId === 'B') hasBloodInWellB = true;
}

function addReagentToMiniWell(wellId, reagent) {
    // Check if blood is present
    if ((wellId === 'A' && !hasBloodInWellA) || (wellId === 'B' && !hasBloodInWellB)) {
        alert('請先加入血液！');
        return;
    }

    const liquid = document.getElementById(`mini-well-${wellId.toLowerCase()}`).querySelector('.liquid');
    let isAgglutinated = false;

    // Check Agglutination
    if (reagent === 'anti-a') {
        if (currentPatientType === 'A' || currentPatientType === 'AB') {
            isAgglutinated = true;
        }
    } else if (reagent === 'anti-b') {
        if (currentPatientType === 'B' || currentPatientType === 'AB') {
            isAgglutinated = true;
        }
    }

    if (isAgglutinated) {
        liquid.classList.add('agglutinated');
        if (wellId === 'A') miniWellAStatus = true;
        if (wellId === 'B') miniWellBStatus = true;
    }
}

// Confirm Type
document.getElementById('confirm-type-btn').addEventListener('click', () => {
    const selectedType = document.getElementById('manual-type-select').value;
    if (!selectedType) {
        alert('請選擇血型！');
        return;
    }
    
    if (selectedType === currentPatientType) {
        showTransfusionFeedback('判定正確！請選擇適合的血袋進行輸血。', 'success');
        isPatientTested = true;
        
        // Reveal on card
        const typeDisplay = document.getElementById('patient-blood-display');
        typeDisplay.style.display = 'block';
        typeDisplay.querySelector('.val').textContent = currentPatientType;
        typeDisplay.classList.remove('hidden');
        
        // Disable controls
        document.getElementById('manual-type-select').disabled = true;
        document.getElementById('confirm-type-btn').disabled = true;
    } else {
        showTransfusionFeedback('判定錯誤！請重新觀察凝集反應。', 'error');
    }
});

// Blood Bag Drag and Drop (Transfusion)
const bloodBags = document.querySelectorAll('.blood-bag');
const transfusionArea = document.getElementById('transfusion-target');

bloodBags.forEach(bag => {
    bag.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', bag.dataset.type);
    });
});

transfusionArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    transfusionArea.classList.add('drag-over');
});

transfusionArea.addEventListener('dragleave', () => {
    transfusionArea.classList.remove('drag-over');
});

transfusionArea.addEventListener('drop', (e) => {
    e.preventDefault();
    transfusionArea.classList.remove('drag-over');
    
    if (!isPatientTested) {
        showTransfusionFeedback('請先完成病人血型檢測！', 'error');
        return;
    }
    
    const donorType = e.dataTransfer.getData('text/plain');
    checkTransfusionCompatibility(currentPatientType, donorType);
});

function checkTransfusionCompatibility(patient, donor) {
    let compatible = false;
    
    if (patient === 'AB') {
        compatible = true; // Universal recipient
    } else if (patient === 'A') {
        compatible = (donor === 'A' || donor === 'O');
    } else if (patient === 'B') {
        compatible = (donor === 'B' || donor === 'O');
    } else if (patient === 'O') {
        compatible = (donor === 'O');
    }
    
    if (compatible) {
        showTransfusionFeedback(`成功！捐贈者 ${donor} 型血與病人 ${patient} 型血相容。`, 'success');
        setTimeout(initTransfusion, 3000); // Next patient
    } else {
        showTransfusionFeedback(`危險！捐贈者 ${donor} 型血與病人 ${patient} 型血不相容。將發生溶血反應！`, 'error');
    }
}

function showTransfusionFeedback(msg, type) {
    const overlay = document.getElementById('transfusion-feedback');
    overlay.textContent = msg;
    overlay.className = `feedback-overlay show ${type}`;
    
    setTimeout(hideTransfusionFeedback, 3000);
}

function hideTransfusionFeedback() {
    const overlay = document.getElementById('transfusion-feedback');
    overlay.classList.remove('show');
}

// Initialize Transfusion Sim
initTransfusion();

// Initialize game on load
initBloodTyping();
