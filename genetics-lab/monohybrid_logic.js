document.addEventListener('DOMContentLoaded', () => {
    const maleToggleBtns = document.querySelectorAll('#male-selector .toggle-btn');
    const femaleToggleBtns = document.querySelectorAll('#female-selector .toggle-btn');
    const maleDisplay = document.getElementById('male-display');
    const femaleDisplay = document.getElementById('female-display');
    const runBtn = document.getElementById('run-monohybrid');
    const resetBtn = document.getElementById('reset-monohybrid');
    const arena = document.getElementById('arena');
    const offspringView = document.getElementById('offspring-view');
    const totalOffspringEl = document.getElementById('total-offspring');

    let stats = { AA: 0, Aa: 0, aa: 0 };
    let maleGenotype = 'Aa';
    let femaleGenotype = 'Aa';
    let isAnimating = false;

    // Reset function
    const resetStatistics = () => {
        stats = { AA: 0, Aa: 0, aa: 0 };
        updateStats();
        offspringView.classList.remove('show');
    };

    // Direct selection handler
    const setupToggle = (btns, display, updateVar) => {
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (isAnimating) return; // Prevent change during animation
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const gt = btn.getAttribute('data-genotype');
                display.textContent = gt;
                if (updateVar === 'male') maleGenotype = gt;
                else femaleGenotype = gt;

                // Requirement: Reset statistics when parent changes
                resetStatistics();
            });
        });
    };

    setupToggle(maleToggleBtns, maleDisplay, 'male');
    setupToggle(femaleToggleBtns, femaleDisplay, 'female');

    const createGamete = (allele, type) => {
        const el = document.createElement('div');
        el.className = `gamete ${type}`;
        el.textContent = allele;
        arena.appendChild(el);
        return el;
    };

    const runReproduction = () => {
        if (isAnimating) return;
        isAnimating = true;
        runBtn.disabled = true;

        offspringView.classList.remove('show');
        offspringView.textContent = '';

        // Extract alleles from chosen genotypes (constant 2 alleles)
        const malePool = maleGenotype.split('');
        const femalePool = femaleGenotype.split('');

        const mAllele = malePool[Math.floor(Math.random() * 2)];
        const fAllele = femalePool[Math.floor(Math.random() * 2)];

        const mEl = createGamete(mAllele, 'male');
        const fEl = createGamete(fAllele, 'female');

        mEl.style.animation = 'glideDownMale 0.8s ease-in-out forwards';
        fEl.style.animation = 'glideDownFemale 0.8s ease-in-out forwards';

        setTimeout(() => {
            // FIX: Always put uppercase first for uniform display
            const sorted = [mAllele, fAllele].sort((a, b) => {
                if (a === a.toUpperCase() && b === b.toLowerCase()) return -1;
                if (a === a.toLowerCase() && b === b.toUpperCase()) return 1;
                return a.localeCompare(b);
            });
            const genotype = sorted.join('');
            
            stats[genotype]++;
            
            offspringView.textContent = genotype;
            offspringView.classList.add('show');

            mEl.remove();
            fEl.remove();

            updateStats();
            isAnimating = false;
            runBtn.disabled = false;
        }, 850);
    };

    const updateStats = () => {
        const total = stats.AA + stats.Aa + stats.aa;
        totalOffspringEl.textContent = total;

        ['AA', 'Aa', 'aa'].forEach(gt => {
            const item = document.querySelector(`#genotype-chart [data-id="${gt}"]`);
            if (!item) return;
            const bar = item.querySelector('.chart-bar-fill');
            const val = item.querySelector('.chart-value');
            const count = stats[gt];
            const percent = total > 0 ? (count / total * 100).toFixed(1) : 0;
            
            bar.style.width = `${percent}%`;
            val.textContent = `${count} (${percent}%)`;
        });

        const dominantCount = stats.AA + stats.Aa;
        const recessiveCount = stats.aa;
        
        const domItem = document.querySelector(`#phenotype-chart [data-id="dominant"]`);
        const recItem = document.querySelector(`#phenotype-chart [data-id="recessive"]`);
        
        const domPercent = total > 0 ? (dominantCount / total * 100).toFixed(1) : 0;
        const recPercent = total > 0 ? (recessiveCount / total * 100).toFixed(1) : 0;

        if (domItem) {
            domItem.querySelector('.chart-bar-fill').style.width = `${domPercent}%`;
            domItem.querySelector('.chart-value').textContent = `${dominantCount} (${domPercent}%)`;
        }
        if (recItem) {
            recItem.querySelector('.chart-bar-fill').style.width = `${recPercent}%`;
            recItem.querySelector('.chart-value').textContent = `${recessiveCount} (${recPercent}%)`;
        }
    };

    const runBulk = () => {
        if (isAnimating) return;
        runBtn.disabled = true;
        document.getElementById('run-monohybrid-100').disabled = true;

        const malePool = maleGenotype.split('');
        const femalePool = femaleGenotype.split('');

        for (let i = 0; i < 100; i++) {
            const mAllele = malePool[Math.floor(Math.random() * 2)];
            const fAllele = femalePool[Math.floor(Math.random() * 2)];

            const sorted = [mAllele, fAllele].sort((a, b) => {
                if (a === a.toUpperCase() && b === b.toLowerCase()) return -1;
                if (a === a.toLowerCase() && b === b.toUpperCase()) return 1;
                return a.localeCompare(b);
            });
            const genotype = sorted.join('');
            stats[genotype]++;
        }

        updateStats();
        offspringView.innerHTML = `<span style="font-size: 1rem; text-align: center; line-height: 1.2;">已產生<br>100個小孩</span>`;
        offspringView.classList.add('show');

        runBtn.disabled = false;
        document.getElementById('run-monohybrid-100').disabled = false;
    };

    runBtn.addEventListener('click', runReproduction);
    document.getElementById('run-monohybrid-100').addEventListener('click', runBulk);
    resetBtn.addEventListener('click', resetStatistics);

    updateStats();
});
