document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Update buttons
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === tabId) tab.classList.add('active');
            });
        });
    });

    // --- Monohybrid (Aa) Logic ---
    const maleGenotypeBtns = document.querySelectorAll('#male-genotype .allele-btn');
    const femaleGenotypeBtns = document.querySelectorAll('#female-genotype .allele-btn');
    const maleDisplay = document.getElementById('male-display');
    const femaleDisplay = document.getElementById('female-display');
    const runBtn = document.getElementById('run-monohybrid');
    const resetBtn = document.getElementById('reset-monohybrid');
    const stats = {
        AA: { count: 0, el: document.querySelector('[data-genotype="AA"]') },
        Aa: { count: 0, el: document.querySelector('[data-genotype="Aa"]') },
        aa: { count: 0, el: document.querySelector('[data-genotype="aa"]') }
    };
    const totalOffspringEl = document.getElementById('total-offspring');

    let maleGenotype = "Aa";
    let femaleGenotype = "Aa";

    const updateGenotypeDisplay = () => {
        maleDisplay.textContent = maleGenotype;
        femaleDisplay.textContent = femaleGenotype;
    };

    const handleGenotypeSelection = (btns, type) => {
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const allele = btn.getAttribute('data-allele');
                // Simple toggle logic or multi-click? 
                // Let's make it simpler: first click sets both to that, second click makes it hetero?
                // Actually, let's just cycle through AA, Aa, aa for each parent box.
            });
        });
    };

    // Refined selection: Click to cycle or just provide direct options
    // Let's change the UI to radio-like buttons for AA, Aa, aa.
    // For now, I'll just hardcode a simple selector in JS since I already built the HTML buttons.
    
    // Simple state management for parent clicks
    let maleAlleles = ['A', 'a'];
    let femaleAlleles = ['A', 'a'];

    maleGenotypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const allele = btn.getAttribute('data-allele');
            maleAlleles.push(allele);
            if (maleAlleles.length > 2) maleAlleles.shift();
            maleGenotype = maleAlleles.slice().sort().join('');
            updateGenotypeDisplay();
        });
    });

    femaleGenotypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const allele = btn.getAttribute('data-allele');
            femaleAlleles.push(allele);
            if (femaleAlleles.length > 2) femaleAlleles.shift();
            femaleGenotype = femaleAlleles.slice().sort().join('');
            updateGenotypeDisplay();
        });
    });

    const simulateOffspring = (iterations = 100) => {
        const malePool = maleGenotype.split('');
        const femalePool = femaleGenotype.split('');
        
        for (let i = 0; i < iterations; i++) {
            const m = malePool[Math.floor(Math.random() * 2)];
            const f = femalePool[Math.floor(Math.random() * 2)];
            
            const genotype = [m, f].sort().join('');
            if (stats[genotype]) {
                stats[genotype].count++;
            }
        }
        updateStats();
    };

    const updateStats = () => {
        let total = 0;
        Object.values(stats).forEach(s => total += s.count);
        totalOffspringEl.textContent = total;

        Object.entries(stats).forEach(([gt, data]) => {
            const countEl = data.el.querySelector('.count');
            const percentEl = data.el.querySelector('.percent');
            countEl.textContent = data.count;
            const percentage = total > 0 ? ((data.count / total) * 100).toFixed(1) : 0;
            percentEl.textContent = `${percentage}%`;
        });
    };

    runBtn.addEventListener('click', () => simulateOffspring(100));
    resetBtn.addEventListener('click', () => {
        Object.values(stats).forEach(s => s.count = 0);
        updateStats();
    });

    // --- ABO Blood Type Logic ---
    const maleBloodSelect = document.getElementById('male-blood');
    const femaleBloodSelect = document.getElementById('female-blood');
    const bloodResults = document.getElementById('blood-results');

    const bloodGenotypes = {
        'A': ['AA', 'Ai'],
        'B': ['BB', 'Bi'],
        'AB': ['AB'],
        'O': ['ii']
    };

    const calculateBloodCross = () => {
        const p1 = maleBloodSelect.value;
        const p2 = femaleBloodSelect.value;
        
        const g1 = bloodGenotypes[p1];
        const g2 = bloodGenotypes[p2];
        
        let possibleGenotypes = new Set();
        
        g1.forEach(gen1 => {
            g2.forEach(gen2 => {
                const alleles1 = gen1.split('');
                const alleles2 = gen2.split('');
                
                alleles1.forEach(a1 => {
                    alleles2.forEach(a2 => {
                        const combo = [a1, a2].sort().join('');
                        possibleGenotypes.add(combo);
                    });
                });
            });
        });

        // Map genotypes to phenotypes
        const phenotypeMap = {
            'AA': 'A', 'Ai': 'A',
            'BB': 'B', 'Bi': 'B',
            'AB': 'AB',
            'ii': 'O'
        };

        let results = {}; // phenotype -> [genotypes]
        possibleGenotypes.forEach(gt => {
            const pt = phenotypeMap[gt];
            if (!results[pt]) results[pt] = [];
            results[pt].push(gt.replace(/A/g, 'Iᴬ').replace(/B/g, 'Iᴮ').replace(/i/g, 'i'));
        });

        displayBloodResults(results);
    };

    const displayBloodResults = (results) => {
        bloodResults.innerHTML = '';
        Object.entries(results).forEach(([pt, genotypes]) => {
            const card = document.createElement('div');
            card.className = 'blood-card';
            card.innerHTML = `
                <div class="blood-type">${pt} 型</div>
                <div class="genotypes">${genotypes.join(', ')}</div>
            `;
            bloodResults.appendChild(card);
        });
    };

    maleBloodSelect.addEventListener('change', calculateBloodCross);
    femaleBloodSelect.addEventListener('change', calculateBloodCross);
    calculateBloodCross(); // Initial call

    // --- Punnett Square Tool Logic ---
    const punnettMaleInput = document.getElementById('punnett-male');
    const punnettFemaleInput = document.getElementById('punnett-female');
    const generatePunnettBtn = document.getElementById('generate-punnett');
    const punnettDisplay = document.getElementById('punnett-display');

    const generatePunnett = () => {
        const male = punnettMaleInput.value.trim().split(/\s+/);
        const female = punnettFemaleInput.value.trim().split(/\s+/);

        if (male.length < 1 || female.length < 1) return;

        let html = `<table class="punnett-table">`;
        
        // Header row
        html += `<tr><th class="corner"></th>`;
        male.forEach(m => html += `<th>${m}</th>`);
        html += `</tr>`;

        // Data rows
        female.forEach(f => {
            html += `<tr><th>${f}</th>`;
            male.forEach(m => {
                const genotype = [f, m].sort((a,b) => {
                    // Custom sort to put uppercase first
                    if (a === a.toUpperCase() && b === b.toLowerCase()) return -1;
                    if (a === a.toLowerCase() && b === b.toUpperCase()) return 1;
                    return a.localeCompare(b);
                }).join('');
                html += `<td>${genotype}</td>`;
            });
            html += `</tr>`;
        });

        html += `</table>`;
        punnettDisplay.innerHTML = html;
    };

    generatePunnettBtn.addEventListener('click', generatePunnett);
});
