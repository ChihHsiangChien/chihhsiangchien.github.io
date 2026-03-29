document.addEventListener('DOMContentLoaded', () => {
    const maleToggleBtns = document.querySelectorAll('#male-selector .toggle-btn');
    const femaleToggleBtns = document.querySelectorAll('#female-selector .toggle-btn');
    const maleDisplay = document.getElementById('male-display');
    const femaleDisplay = document.getElementById('female-display');
    const runBtn = document.getElementById('run-abo');
    const resetBtn = document.getElementById('reset-abo');
    const arena = document.getElementById('arena');
    const offspringView = document.getElementById('offspring-view');
    const totalOffspringEl = document.getElementById('total-offspring');

    let stats = { A: 0, B: 0, AB: 0, O: 0 };
    let maleGenotype = 'Ai';
    let femaleGenotype = 'Bi';
    let isAnimating = false;

    const phenotypeMap = {
        'AA': 'A', 'Ai': 'A',
        'BB': 'B', 'Bi': 'B',
        'AB': 'AB',
        'ii': 'O'
    };

    const formatGT = (gt) => {
        return gt.replace(/A/g, 'Iᴬ').replace(/B/g, 'Iᴮ').replace(/i/g, 'i');
    };

    const resetStatistics = () => {
        stats = { A: 0, B: 0, AB: 0, O: 0 };
        updateStats();
        offspringView.classList.remove('show');
    };

    const setupToggle = (btns, display, gender) => {
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (isAnimating) return;
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const gt = btn.getAttribute('data-genotype');
                display.textContent = formatGT(gt);
                if (gender === 'male') maleGenotype = gt;
                else femaleGenotype = gt;

                resetStatistics();
            });
        });
    };

    setupToggle(maleToggleBtns, maleDisplay, 'male');
    setupToggle(femaleToggleBtns, femaleDisplay, 'female');

    const createGamete = (allele, type) => {
        const el = document.createElement('div');
        el.className = `gamete ${type}`;
        el.style.fontSize = '1.1rem';
        el.textContent = allele === 'i' ? 'i' : `I${allele === 'A' ? 'ᴬ' : 'ᴮ'}`;
        arena.appendChild(el);
        return el;
    };

    const runReproduction = () => {
        if (isAnimating) return;
        isAnimating = true;
        runBtn.disabled = true;

        offspringView.classList.remove('show');
        offspringView.innerHTML = '';

        const mAlleles = maleGenotype.split('');
        const fAlleles = femaleGenotype.split('');

        const mAllele = mAlleles[Math.floor(Math.random() * 2)];
        const fAllele = fAlleles[Math.floor(Math.random() * 2)];

        const mEl = createGamete(mAllele, 'male');
        const fEl = createGamete(fAllele, 'female');

        mEl.style.animation = 'glideDownMale 0.8s ease-in-out forwards';
        fEl.style.animation = 'glideDownFemale 0.8s ease-in-out forwards';

        setTimeout(() => {
            const sorted = [mAllele, fAllele].sort((a,b) => {
                const order = { 'A': 0, 'B': 1, 'i': 2 };
                return order[a] - order[b];
            });
            const genotype = sorted.join('');
            const phenotype = phenotypeMap[genotype];
            stats[phenotype]++;
            
            offspringView.innerHTML = `<div>${phenotype} 型</div><div style="font-size: 0.9rem; color: var(--text-muted)">(${formatGT(genotype)})</div>`;
            offspringView.classList.add('show');

            mEl.remove();
            fEl.remove();

            updateStats();
            isAnimating = false;
            runBtn.disabled = false;
        }, 850);
    };

    const updateStats = () => {
        const total = stats.A + stats.B + stats.AB + stats.O;
        totalOffspringEl.textContent = total;

        ['A', 'B', 'AB', 'O'].forEach(type => {
            const item = document.querySelector(`#blood-chart [data-id="${type}"]`);
            if (!item) return;
            const bar = item.querySelector('.chart-bar-fill');
            const val = item.querySelector('.chart-value');
            const count = stats[type];
            const percent = total > 0 ? (count / total * 100).toFixed(1) : 0;
            
            bar.style.width = `${percent}%`;
            val.textContent = `${count} (${percent}%)`;
        });
    };

    const runBulk = () => {
        if (isAnimating) return;
        runBtn.disabled = true;
        document.getElementById('run-abo-100').disabled = true;

        const mAlleles = maleGenotype.split('');
        const fAlleles = femaleGenotype.split('');

        for (let i = 0; i < 100; i++) {
            const mAllele = mAlleles[Math.floor(Math.random() * 2)];
            const fAllele = fAlleles[Math.floor(Math.random() * 2)];

            const sorted = [mAllele, fAllele].sort((a,b) => {
                const order = { 'A': 0, 'B': 1, 'i': 2 };
                return order[a] - order[b];
            });
            const genotype = sorted.join('');
            const phenotype = phenotypeMap[genotype];
            stats[phenotype]++;
        }

        updateStats();
        offspringView.innerHTML = `<span style="font-size: 1rem; text-align: center; line-height: 1.2;">已產生<br>100個小孩</span>`;
        offspringView.classList.add('show');

        runBtn.disabled = false;
        document.getElementById('run-abo-100').disabled = false;
    };

    runBtn.addEventListener('click', runReproduction);
    document.getElementById('run-abo-100').addEventListener('click', runBulk);
    resetBtn.addEventListener('click', resetStatistics);

    updateStats();
});
