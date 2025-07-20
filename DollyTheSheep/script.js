document.addEventListener('DOMContentLoaded', () => {
    // Get DOM Elements
    const somaticDonor = document.getElementById('somatic-donor');
    const eggDonor = document.getElementById('egg-donor');
    const surrogateMother = document.getElementById('surrogate-mother');
    const dollyContainer = document.getElementById('dolly-container');
    const dolly = document.getElementById('dolly');
    const dollyLabel = document.getElementById('dolly-label');

    const somaticCell = document.getElementById('somatic-cell');
    const somaticNucleusInCell = document.getElementById('somatic-nucleus-in-cell');
    const eggCell = document.getElementById('egg-cell');
    const eggNucleusInCell = document.getElementById('egg-nucleus-in-cell');
    const somaticNucleusExtracted = document.getElementById('somatic-nucleus-extracted');
    const enucleatedEgg = document.getElementById('enucleated-egg');
    const fusedCell = document.getElementById('fused-cell');
    const somaticNucleusFused = document.getElementById('somatic-nucleus-fused');

    const btnGetSomatic = document.getElementById('btn-get-somatic');
    const btnGetEgg = document.getElementById('btn-get-egg');
    const btnEnucleate = document.getElementById('btn-enucleate');
    const btnExtractNucleus = document.getElementById('btn-extract-nucleus');
    const btnFuse = document.getElementById('btn-fuse');
    const btnImplant = document.getElementById('btn-implant');
    const btnBirth = document.getElementById('btn-birth');
    const btnReset = document.getElementById('btn-reset');

    const statusMessage = document.getElementById('status-message');

    // State Variables
    let hasSomaticCell = false;
    let hasEggCell = false;
    let isEggEnucleated = false;
    let hasSomaticNucleus = false;
    let isFused = false;
    let isImplanted = false;
    let isBorn = false;

    // --- Event Listeners ---
    btnGetSomatic.addEventListener('click', getSomaticCell);
    btnGetEgg.addEventListener('click', getEggCell);
    btnEnucleate.addEventListener('click', enucleateEgg);
    btnExtractNucleus.addEventListener('click', extractSomaticNucleus);
    btnFuse.addEventListener('click', fuseCells);
    btnImplant.addEventListener('click', implantEmbryo);
    btnBirth.addEventListener('click', birthDolly);
    btnReset.addEventListener('click', resetSimulation);

    // --- Functions ---
    function updateStatus(message) {
        statusMessage.textContent = message;
    }

    function getSomaticCell() {
        somaticCell.classList.remove('hidden');
        hasSomaticCell = true;
        btnGetSomatic.disabled = true;
        btnExtractNucleus.disabled = false; // Enable next possible step
        updateStatus("從白面羊取得體細胞。");
        checkFusionReady();
    }

    function getEggCell() {
        eggCell.classList.remove('hidden');
        hasEggCell = true;
        btnGetEgg.disabled = true;
        btnEnucleate.disabled = false; // Enable next possible step
        updateStatus("從黑面羊取得卵細胞。");
        checkFusionReady();
    }

    function enucleateEgg() {
        if (!hasEggCell) return;
        eggNucleusInCell.classList.add('hidden'); // Hide the nucleus visually
        eggCell.classList.add('hidden');         // Hide original egg cell
        enucleatedEgg.classList.remove('hidden'); // Show enucleated representation
        isEggEnucleated = true;
        btnEnucleate.disabled = true;
        updateStatus("移除卵細胞核，得到去核卵細胞。");
        checkFusionReady();
    }

    function extractSomaticNucleus() {
        if (!hasSomaticCell) return;
        somaticNucleusInCell.classList.add('hidden'); // Hide nucleus within the cell
        somaticCell.classList.add('hidden');          // Hide the original cell body
        somaticNucleusExtracted.classList.remove('hidden'); // Show extracted nucleus
        hasSomaticNucleus = true;
        btnExtractNucleus.disabled = true;
        updateStatus("提取體細胞的細胞核。");
        checkFusionReady();
    }

     function checkFusionReady() {
        if (isEggEnucleated && hasSomaticNucleus) {
            btnFuse.disabled = false;
        }
    }

    function fuseCells() {
        if (!isEggEnucleated || !hasSomaticNucleus) return;

        somaticNucleusExtracted.classList.add('hidden'); // Hide extracted nucleus
        enucleatedEgg.classList.add('hidden');           // Hide enucleated egg

        fusedCell.classList.remove('hidden'); // Show the fused cell
        fusedCell.classList.add('fusing'); // Add flash animation

        // Remove animation class after it finishes
        setTimeout(() => {
            fusedCell.classList.remove('fusing');
        }, 500);

        isFused = true;
        btnFuse.disabled = true;
        btnImplant.disabled = false; // Enable next step
        updateStatus("將體細胞核注入去核卵細胞，電擊融合。");
    }

    function implantEmbryo() {
        if (!isFused) return;

        fusedCell.classList.add('implanting'); // Start implant animation

        // Hide after animation
        setTimeout(() => {
             fusedCell.classList.add('hidden');
             fusedCell.classList.remove('implanting'); // Reset for next time
        }, 1000);

        isImplanted = true;
        btnImplant.disabled = true;
        btnBirth.disabled = false; // Enable next step
        updateStatus("將重組胚胎植入代理孕母子宮。");
    }

    function birthDolly() {
        if (!isImplanted) return;
        dollyContainer.classList.add('visible'); // Make container visible first
        dolly.classList.remove('hidden');
        dollyLabel.classList.remove('hidden');
        isBorn = true;
        btnBirth.disabled = true;
        updateStatus("成功！代理孕母生下了桃莉羊 (白面)！");
    }

    function resetSimulation() {
        // Reset state variables
        hasSomaticCell = false;
        hasEggCell = false;
        isEggEnucleated = false;
        hasSomaticNucleus = false;
        isFused = false;
        isImplanted = false;
        isBorn = false;

        // Reset visual elements
        somaticCell.classList.add('hidden');
        somaticNucleusInCell.classList.remove('hidden'); // Ensure nucleus is visible inside cell if cell shown
        eggCell.classList.add('hidden');
        eggNucleusInCell.classList.remove('hidden'); // Ensure nucleus is visible inside cell if cell shown
        somaticNucleusExtracted.classList.add('hidden');
        enucleatedEgg.classList.add('hidden');
        fusedCell.classList.add('hidden');
        fusedCell.classList.remove('implanting'); // Ensure implanting class is removed
        dollyContainer.classList.remove('visible');
        dolly.classList.add('hidden');
        dollyLabel.classList.add('hidden');


        // Reset buttons
        btnGetSomatic.disabled = false;
        btnGetEgg.disabled = false;
        btnEnucleate.disabled = true;
        btnExtractNucleus.disabled = true;
        btnFuse.disabled = true;
        btnImplant.disabled = true;
        btnBirth.disabled = true;

        // Reset status message
        updateStatus("請按步驟操作。");
    }

    // Initial state
    resetSimulation(); // Call reset initially to set up the correct state
});