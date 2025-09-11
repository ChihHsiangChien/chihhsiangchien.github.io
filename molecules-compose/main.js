
document.addEventListener('DOMContentLoaded', () => {
    // 顯示/隱藏快速生成分子區塊
    const toggleBtn = document.getElementById('toggle-preset-panel');
    const presetPanel = document.getElementById('preset-molecule-panel');
    toggleBtn.addEventListener('click', () => {
        if (presetPanel.style.display === 'none') {
            presetPanel.style.display = '';
            toggleBtn.textContent = '隱藏快速生成分子';
        } else {
            presetPanel.style.display = 'none';
            toggleBtn.textContent = '顯示快速生成分子';
        }
    });
    // 預設分子快速生成
    document.querySelectorAll('.preset-molecule-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const molName = btn.getAttribute('data-molecule');
            createDraggableMolecule(molName);
        });
    });
    const atoms = document.querySelectorAll('.atom-container');
    const synthesisArea = document.getElementById('synthesis-area');
    const combineBtn = document.getElementById('combine-btn');
    const moleculeDisplay = document.getElementById('molecule-display');
    let droppedAtoms = [];


    // 拖曳開始事件（滑鼠）
    atoms.forEach(atom => {
        atom.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', atom.querySelector('.atom').textContent);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    // 觸控支援
    let touchDraggingAtom = null;
    let touchDragGhost = null;

    atoms.forEach(atom => {
        atom.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchDraggingAtom = atom;
            // 建立拖曳預覽
            touchDragGhost = atom.cloneNode(true);
            touchDragGhost.style.position = 'fixed';
            touchDragGhost.style.pointerEvents = 'none';
            touchDragGhost.style.opacity = '0.7';
            touchDragGhost.style.zIndex = '9999';
            document.body.appendChild(touchDragGhost);
            moveTouchGhost(e.touches[0]);
        });
    });

    document.addEventListener('touchmove', (e) => {
        if (touchDragGhost) {
            moveTouchGhost(e.touches[0]);
        }
    });

    document.addEventListener('touchend', (e) => {
        if (touchDragGhost) {
            // 判斷是否在合成區
            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && (target.id === 'synthesis-area' || target.closest('#synthesis-area'))) {
                const atomType = touchDraggingAtom.querySelector('.atom').textContent;
                droppedAtoms.push(atomType);
                updateSynthesisAreaDisplay();
            }
            document.body.removeChild(touchDragGhost);
            touchDragGhost = null;
            touchDraggingAtom = null;
        }
    });

    function moveTouchGhost(touch) {
        if (touchDragGhost) {
            touchDragGhost.style.left = (touch.clientX - 40) + 'px';
            touchDragGhost.style.top = (touch.clientY - 40) + 'px';
        }
    }

    // 拖曳經過事件
    synthesisArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        synthesisArea.classList.add('dragging');
    });

    synthesisArea.addEventListener('dragleave', () => {
        synthesisArea.classList.remove('dragging');
    });

    // 拖曳放置事件
    synthesisArea.addEventListener('drop', (e) => {
        e.preventDefault();
        synthesisArea.classList.remove('dragging');

        const atomType = e.dataTransfer.getData('text/plain');
        if (atomType) {
            droppedAtoms.push(atomType);
            updateSynthesisAreaDisplay();
        }
    });

    // 更新合成區的顯示
    function updateSynthesisAreaDisplay() {
        synthesisArea.innerHTML = '';
        const counts = droppedAtoms.reduce((acc, atom) => {
            acc[atom] = (acc[atom] || 0) + 1;
            return acc;
        }, {});

        if (Object.keys(counts).length === 0) {
            synthesisArea.innerHTML = '<p class="no-result-text">拖曳原子至此合成區</p>';
        } else {
            Object.keys(counts).forEach(atomType => {
                const count = counts[atomType];
                const atomStack = document.createElement('div');
                atomStack.className = 'synthesis-atom-stack';
                atomStack.dataset.atom = atomType;

                const atomElement = document.createElement('div');
                atomElement.className = `atom atom-${atomType.toLowerCase()}`;
                atomElement.textContent = atomType;
                atomStack.appendChild(atomElement);

                if (count > 1) {
                    const countDisplay = document.createElement('span');
                    countDisplay.className = 'synthesis-atom-count';
                    countDisplay.textContent = count;
                    atomStack.appendChild(countDisplay);
                }

                // 點擊移除功能
                atomStack.addEventListener('click', () => {
                    const index = droppedAtoms.indexOf(atomType);
                    if (index > -1) {
                        droppedAtoms.splice(index, 1);
                    }
                    updateSynthesisAreaDisplay();
                });

                synthesisArea.appendChild(atomStack);
            });
        }
    }


    // 組合按鈕點擊事件
    combineBtn.addEventListener('click', () => {
        if (droppedAtoms.length === 0) {
            displayResult('請先拖曳原子到合成區！');
            return;
        }

        const counts = droppedAtoms.reduce((acc, atom) => {
            acc[atom] = (acc[atom] || 0) + 1;
            return acc;
        }, {});
        
        let result = { title: '', image: null };

        // 檢查 H2O
        if (counts['O'] === 1 && counts['H'] === 2 && Object.keys(counts).length === 2) {
            result = { title: '水分子 ($H_2O$)', image: 'canvas' };
        }
        // 檢查 CO2
        else if (counts['C'] === 1 && counts['O'] === 2 && Object.keys(counts).length === 2) {
            result = { title: '二氧化碳 ($CO_2$)', image: 'canvas' };
        }
        // 檢查 CO
        else if (counts['C'] === 1 && counts['O'] === 1 && Object.keys(counts).length === 2) {
            result = { title: '一氧化碳 ($CO$)', image: 'canvas' };
        }
        // 檢查葡萄糖 (C6H12O6)
        else if (counts['C'] === 6 && counts['H'] === 12 && counts['O'] === 6 && Object.keys(counts).length === 3) {
            result = { title: '葡萄糖 ($C_6H_{12}O_6$)', image: 'canvas' };
        }
        // 檢查氧氣 (O2)
        else if (counts['O'] === 2 && Object.keys(counts).length === 1) {
            result = { title: '氧氣 ($O_2$)', image: 'canvas' };
        }
        // 檢查氫氣 (H2)
        else if (counts['H'] === 2 && Object.keys(counts).length === 1) {
            result = { title: '氫氣 ($H_2$)', image: 'canvas' };
        }
        // 檢查氮氣 (N2)
        else if (counts['N'] === 2 && Object.keys(counts).length === 1) {
            result = { title: '氮氣 ($N_2$)', image: 'canvas' };
        }
        // 其他未定義的組合
        else {
            const formula = Object.keys(counts).map(atom => {
                const count = counts[atom];
                return count > 1 ? `${atom}${count}` : atom;
            }).join('');
            result = { title: `無法組合出已知的分子：${formula}`, image: null };
        }

        // 新功能：生成可拖曳分子
        if (result.image === 'canvas') {
            createDraggableMolecule(result.title);
        }

        displayResult(result);
    });

    // 生成可拖曳分子並可任意擺放
    function createDraggableMolecule(moleculeName) {
    const structure = getMoleculeStructureByName(moleculeName);
    if (!structure) return;
    const molDiv = document.createElement('div');
    molDiv.className = 'draggable-molecule';
    molDiv.style.position = 'absolute';
    // 取得合成區位置，讓分子出現在合成區下方
    const rect = synthesisArea.getBoundingClientRect();
    // 捲動偏移修正（避免視窗捲動時位置錯誤）
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    molDiv.style.left = (rect.left + scrollLeft) + 'px';
    molDiv.style.top = (rect.bottom + scrollTop + 20) + 'px'; // 20px 為下方間距
    molDiv.style.cursor = 'move';
    molDiv.style.zIndex = 1000;
        // 畫分子
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        canvas.style.width = '120px';
        canvas.style.height = '120px';
        molDiv.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        drawMolecule(structure, ctx, 100, 100);
        document.body.appendChild(molDiv);

        // 拖曳事件
        let offsetX, offsetY, dragging = false;
        molDiv.addEventListener('mousedown', (e) => {
            dragging = true;
            offsetX = e.offsetX;
            offsetY = e.offsetY;
        });
        document.addEventListener('mousemove', (e) => {
            if (dragging) {
                molDiv.style.left = (e.clientX - offsetX) + 'px';
                molDiv.style.top = (e.clientY - offsetY) + 'px';
            }
        });
        document.addEventListener('mouseup', () => {
            dragging = false;
        });

        // 觸控支援
        molDiv.addEventListener('touchstart', (e) => {
            dragging = true;
            const touch = e.touches[0];
            offsetX = touch.clientX - molDiv.getBoundingClientRect().left;
            offsetY = touch.clientY - molDiv.getBoundingClientRect().top;
        });
        document.addEventListener('touchmove', (e) => {
            if (dragging) {
                const touch = e.touches[0];
                molDiv.style.left = (touch.clientX - offsetX) + 'px';
                molDiv.style.top = (touch.clientY - offsetY) + 'px';
            }
        });
        document.addEventListener('touchend', () => {
            dragging = false;
        });
    }

    // 顯示結果到分子顯示區
    function displayResult(result) {
        moleculeDisplay.innerHTML = '';

        if (typeof result === 'string') {
            const p = document.createElement('p');
            p.className = 'no-result-text';
            p.textContent = result;
            moleculeDisplay.appendChild(p);
        } else {
            const title = document.createElement('h2');
            title.className = 'molecule-title';
            title.textContent = result.title;
            moleculeDisplay.appendChild(title);

            if (result.image === 'canvas') {
                // 依名稱取得分子結構
                const structure = getMoleculeStructureByName(result.title);
                renderMoleculeTo(moleculeDisplay, structure);
            } else if (result.image) {
                const img = document.createElement('div');
                img.className = `molecule-image ${result.image}`;
                moleculeDisplay.appendChild(img);
            } else {
                const p = document.createElement('p');
                p.className = 'no-result-text';
                p.textContent = `無法組合出已知的分子`;
                moleculeDisplay.appendChild(p);
            }
        }

        // 重置合成區
        droppedAtoms = [];
        updateSynthesisAreaDisplay();
    }
});
