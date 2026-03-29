document.addEventListener('DOMContentLoaded', () => {
    const punnettMaleInput = document.getElementById('punnett-male');
    const punnettFemaleInput = document.getElementById('punnett-female');
    const generatePunnettBtn = document.getElementById('generate-punnett');
    const punnettDisplay = document.getElementById('punnett-display');

    let lastSelectedHeader = null;

    const generatePunnett = () => {
        const maleInput = punnettMaleInput.value.trim();
        const femaleInput = punnettFemaleInput.value.trim();

        const male = maleInput ? maleInput.split(/\s+/) : ['B', 'b'];
        const female = femaleInput ? femaleInput.split(/\s+/) : ['B', 'b'];

        lastSelectedHeader = null;

        let html = `<table class="punnett-table">`;
        html += `<tr><th class="corner"></th>`;
        male.forEach((m, idx) => {
            html += `<th class="interactive col-header" data-allele="${m}" id="col-${idx}">${m}</th>`;
        });
        html += `</tr>`;

        female.forEach((f, rIdx) => {
            html += `<tr><th class="interactive row-header" data-allele="${f}" id="row-${rIdx}">${f}</th>`;
            male.forEach((m, cIdx) => {
                html += `<td class="cell" data-row="${rIdx}" data-col="${cIdx}">?</td>`;
            });
            html += `</tr>`;
        });

        html += `</table>`;
        punnettDisplay.innerHTML = html;

        attachListeners();
    };

    const attachListeners = () => {
        const headers = document.querySelectorAll('.interactive');
        const cells = document.querySelectorAll('.cell');
        
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const isCol = header.classList.contains('col-header');
                
                // Clear previous of same type
                const sameType = isCol ? '.col-header' : '.row-header';
                document.querySelectorAll(sameType).forEach(h => h.classList.remove('selected'));
                
                header.classList.add('selected');

                checkIntersection();
            });
        });

        // Add direct click listener to cells
        cells.forEach(td => {
            td.addEventListener('click', () => {
                const r = td.getAttribute('data-row');
                const c = td.getAttribute('data-col');
                const rowHead = document.getElementById(`row-${r}`);
                const colHead = document.getElementById(`col-${c}`);
                const rAllele = rowHead.getAttribute('data-allele');
                const cAllele = colHead.getAttribute('data-allele');

                // Visual feedback on headers
                rowHead.classList.add('selected');
                colHead.classList.add('selected');

                animateCombine(td, rowHead, colHead, rAllele, cAllele);

                // Clear highlights after animation starts
                setTimeout(() => {
                    rowHead.classList.remove('selected');
                    colHead.classList.remove('selected');
                }, 800);
            });
        });
    };

    const checkIntersection = () => {
        const selCol = document.querySelector('.col-header.selected');
        const selRow = document.querySelector('.row-header.selected');

        if (selCol && selRow) {
            const r = selRow.id.split('-')[1];
            const c = selCol.id.split('-')[1];
            const td = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            
            if (td) {
                animateCombine(td, selRow, selCol, selRow.getAttribute('data-allele'), selCol.getAttribute('data-allele'));
            }
            
            // Clear selections after trigger to allow re-trigger on same or different pair
            setTimeout(() => {
                selCol.classList.remove('selected');
                selRow.classList.remove('selected');
            }, 600);
        }
    };

    const animateCombine = (td, rowHead, colHead, rAllele, cAllele) => {
        const tdRect = td.getBoundingClientRect();
        const rowRect = rowHead.getBoundingClientRect();
        const colRect = colHead.getBoundingClientRect();
        
        const g1 = document.createElement('div');
        g1.className = 'gamete';
        g1.style.position = 'fixed';
        g1.style.left = `${rowRect.left + rowRect.width/2 - 25}px`;
        g1.style.top = `${rowRect.top + rowRect.height/2 - 25}px`;
        g1.textContent = rAllele;
        g1.style.zIndex = '100';
        g1.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        
        const g2 = document.createElement('div');
        g2.className = 'gamete';
        g2.style.position = 'fixed';
        g2.style.left = `${colRect.left + colRect.width/2 - 25}px`;
        g2.style.top = `${colRect.top + colRect.height/2 - 25}px`;
        g2.textContent = cAllele;
        g2.style.zIndex = '100';
        g2.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        
        document.body.appendChild(g1);
        document.body.appendChild(g2);
        
        g1.offsetHeight;
        
        g1.style.left = `${tdRect.left + tdRect.width/2 - 35}px`;
        g1.style.top = `${tdRect.top + tdRect.height/2 - 25}px`;
        
        g2.style.left = `${tdRect.left + tdRect.width/2 - 5}px`;
        g2.style.top = `${tdRect.top + tdRect.height/2 - 25}px`;
        
        setTimeout(() => {
            const sorted = [rAllele, cAllele].sort((a,b) => {
                if (a === a.toUpperCase() && b === b.toLowerCase()) return -1;
                if (a === a.toLowerCase() && b === b.toUpperCase()) return 1;
                return a.localeCompare(b);
            });
            
            td.textContent = sorted.join('');
            td.classList.add('filled');
            
            g1.style.opacity = '0';
            g2.style.opacity = '0';
            g1.style.transform = 'scale(0.5)';
            g2.style.transform = 'scale(0.5)';
            
            setTimeout(() => {
                g1.remove();
                g2.remove();
            }, 600);
        }, 600);
    };

    const autoFill = async () => {
        const cells = Array.from(document.querySelectorAll('.cell:not(.filled)'));
        if (cells.length === 0) return;
        
        generatePunnettBtn.disabled = true;
        document.getElementById('auto-punnett').disabled = true;

        for (const td of cells) {
            const r = td.getAttribute('data-row');
            const c = td.getAttribute('data-col');
            const rowHead = document.getElementById(`row-${r}`);
            const colHead = document.getElementById(`col-${c}`);
            const rAllele = rowHead.getAttribute('data-allele');
            const cAllele = colHead.getAttribute('data-allele');

            // Highlight headers briefly
            rowHead.classList.add('selected');
            colHead.classList.add('selected');
            
            await new Promise(resolve => {
                animateCombine(td, rowHead, colHead, rAllele, cAllele);
                setTimeout(resolve, 800); // Wait for animation combo
            });

            rowHead.classList.remove('selected');
            colHead.classList.remove('selected');
        }

        generatePunnettBtn.disabled = false;
        document.getElementById('auto-punnett').disabled = false;
    };

    generatePunnettBtn.addEventListener('click', generatePunnett);
    document.getElementById('auto-punnett').addEventListener('click', autoFill);
    generatePunnett();
});
