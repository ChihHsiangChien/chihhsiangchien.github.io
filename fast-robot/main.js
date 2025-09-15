
document.addEventListener('DOMContentLoaded', () => {
    const variablesContainer = document.getElementById('variables-container');
    const slots = [document.getElementById('slot1'), document.getElementById('slot2')];
    const droppedCardsSlots = [document.getElementById('dropped-cards-slot1'), document.getElementById('dropped-cards-slot2')];
    const startButton = document.getElementById('startButton');
    const resetButton = document.getElementById('resetButton');
    const toggleHistoryButton = document.getElementById('toggleHistory');
    const historyContainer = document.getElementById('history-container');
    const historyList = document.getElementById('history-list');
    const messageEl = document.getElementById('message');
    const resultsSection = document.getElementById('results-section');
    const timeAEl = document.getElementById('timeA');
    const timeBEl = document.getElementById('timeB');
    //const analysisEl = document.getElementById('analysis');
    const robotA_anim = document.getElementById('robotA_anim');
    const robotB_anim = document.getElementById('robotB_anim');

    const robotVariables = [{}, {}];
    const experimentHistory = [];
    
    // SVG assets for robot visualization
    const robotSVG = {
        // Base robot body
        'base': `
            <svg viewBox="0 0 100 100" class="robot-svg w-full h-full">
                <rect x="15" y="30" width="70" height="40" rx="10" ry="10" stroke="#4a5568" stroke-width="3" fill="#6b7280"/>
                <circle cx="50" cy="25" r="10" fill="#4a5568"/>
                <rect x="40" y="5" width="20" height="20" rx="5" ry="5" fill="#e2e8f0"/>
            </svg>
        `,
        // Robot colors
        'color': {
            'Red': '#ef4444',
            'Blue': '#3b82f6',
        },
        // Tires
        'tires': {
            'Rubber': `
                <g transform="translate(0, 70)">
                    <circle cx="30" cy="0" r="15" fill="#4a5568" stroke="#cbd5e1" stroke-width="5"/>
                    <circle cx="70" cy="0" r="15" fill="#4a5568" stroke="#cbd5e1" stroke-width="2"/>
                </g>
            `,
            'Metal': `
                <g transform="translate(0, 70)">
                    <circle cx="30" cy="0" r="15" fill="#a0aec0" stroke="#4a5568" stroke-width="2"/>
                    <circle cx="70" cy="0" r="15" fill="#a0aec0" stroke="#4a5568" stroke-width="2"/>
                    <line x1="22" y1="8" x2="38" y2="-8" stroke="#4a5568" stroke-width="2"/>
                    <line x1="62" y1="8" x2="78" y2="-8" stroke="#4a5568" stroke-width="2"/>
                </g>
            `
        },
        // Packages
        'package': {
            '1': `
                <g transform="translate(35, -10)">
                    <rect x="0" y="0" width="30" height="30" rx="3" ry="3" fill="#a0522d" stroke="#8b4513" stroke-width="2"/>
                    <line x1="0" y1="15" x2="30" y2="15" stroke="#8b4513" stroke-width="2"/>
                    <line x1="15" y1="0" x2="15" y2="30" stroke="#8b4513" stroke-width="2"/>
                </g>
            `,
            '2': `
                <g transform="translate(30, -20)">
                    <rect x="0" y="0" width="40" height="40" rx="5" ry="5" fill="#654321" stroke="#4a2e1d" stroke-width="2"/>
                    <line x1="0" y1="20" x2="40" y2="20" stroke="#4a2e1d" stroke-width="2"/>
                    <line x1="20" y1="0" x2="20" y2="40" stroke="#4a2e1d" stroke-width="2"/>
                </g>
            `
        },
        // Power (battery) SVGs
        'power': {
            'Lightspeed': `
                <g transform="translate(85, 50)">
                    <rect x="-10" y="-15" width="20" height="30" rx="4" ry="4" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
                    <rect x="-4" y="-20" width="8" height="6" rx="2" ry="2" fill="#fde68a" stroke="#b45309" stroke-width="1"/>
                    <text x="0" y="5" text-anchor="middle" alignment-baseline="middle" font-size="12" font-weight="bold" fill="#b45309">⚡</text>
                </g>
            `,
            'Endurance': `
                <g transform="translate(85, 50)">
                    <rect x="-10" y="-15" width="20" height="30" rx="4" ry="4" fill="#60a5fa" stroke="#1e40af" stroke-width="2"/>
                    <rect x="-4" y="-20" width="8" height="6" rx="2" ry="2" fill="#dbeafe" stroke="#1e40af" stroke-width="1"/>
                    <text x="0" y="5" text-anchor="middle" alignment-baseline="middle" font-size="12" font-weight="bold" fill="#1e40af">🔋</text>
                </g>
            `
        }
    };
    
    // Define the base speed and distance
    const baseSpeed = 100; // units/second
    const distance = 500; // units

    // Define variable effects on speed
    const speedModifiers = {
        'package': { '1': 0, '2': -40 },
        'conveyor': { 'A': 0, 'B': 20 },
        'power': { 'Lightspeed': 20, 'Endurance': 10 },
        'tires': { 'Rubber': 0, 'Metal': -10 },
        'color': { 'Red': 10, 'Blue': -15 }
    };
    
    // Chinese names for variable types
    const variableNames = {
        'robot': '機器人',
        'package': '包裹',
        'conveyor': '傳送帶',
        'power': '電池品牌',
        'tires': '輪胎材質',
        'color': '機器人顏色'
    };

        // Chinese names for variable values

    const valueNames = {
        'robot': {
            'A': '機器人A',
            'B': '機器人B'
        },
        'package': {
            '1': '包裹1',
            '2': '包裹2'
        },
        'conveyor': {
            'A': '傳送帶A',
            'B': '傳送帶B'
        },
        'power': {
            'Lightspeed': '光速電池',
            'Endurance': '耐力電池'
        },
        'tires': {
            'Rubber': '橡膠',
            'Metal': '金屬'
        },
        'color': {
            'Red': '紅色',
            'Blue': '藍色'
        }
    };
    

    // Common variables for touch and mouse drag
    let draggedItem = null;
    let floatingCard = null;
    
    // Set up drag-and-drop listeners for variable cards
    variablesContainer.querySelectorAll('.draggable-card').forEach(card => {
        // Mouse events
        card.addEventListener('dragstart', (e) => {
            draggedItem = e.target;
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.id);
        });

        card.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            draggedItem = null;
        });

        // Touch events
        card.addEventListener('touchstart', (e) => {
            e.preventDefault();
            draggedItem = e.target.closest('.draggable-card');
            draggedItem.classList.add('dragging');

            // 建立浮動卡片
            floatingCard = draggedItem.cloneNode(true);
            floatingCard.style.position = 'fixed';
            floatingCard.style.pointerEvents = 'none';
            floatingCard.style.zIndex = 9999;
            floatingCard.style.opacity = 0.8;
            floatingCard.classList.add('dragging');
            document.body.appendChild(floatingCard);
        });

        // 讓浮動卡片跟隨手指移動
        card.addEventListener('touchmove', (e) => {
            if (!floatingCard) return;
            const touch = e.touches[0];
            floatingCard.style.left = (touch.clientX - floatingCard.offsetWidth / 2) + 'px';
            floatingCard.style.top = (touch.clientY - floatingCard.offsetHeight / 2) + 'px';
        });

        // 放開時自動判斷落點並 drop
        card.addEventListener('touchend', (e) => {
            if (!draggedItem) {
                if (floatingCard) {
                    floatingCard.remove();
                    floatingCard = null;
                }
                return;
            }
            const touch = e.changedTouches[0];
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            if (dropTarget && dropTarget.closest('.experiment-slot')) {
                const dropSlot = dropTarget.closest('.experiment-slot');
                const droppedCardId = draggedItem.id;
                const slotsArr = [document.getElementById('slot1'), document.getElementById('slot2')];
                const dropSlotIndex = slotsArr.indexOf(dropSlot);
                if (dropSlotIndex !== -1) {
                    handleDrop(droppedCardId, dropSlotIndex);
                }
            }
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            if (floatingCard) {
                floatingCard.remove();
                floatingCard = null;
            }
        });
    });

    // Set up drag-and-drop listeners for experiment slots
    slots.forEach((slot, slotIndex) => {
        // Mouse events
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('dragover');
        });

        slot.addEventListener('dragleave', () => {
            slots.forEach(s => s.classList.remove('dragover'));
        });

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            const droppedCardId = e.dataTransfer.getData('text/plain');
            handleDrop(droppedCardId, slotIndex);
            slots.forEach(s => s.classList.remove('dragover'));
        });

        // Touch events
        // Touch移動時讓浮動卡片跟隨手指
        slot.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (floatingCard) {
                floatingCard.style.left = (touch.clientX - floatingCard.offsetWidth / 2) + 'px';
                floatingCard.style.top = (touch.clientY - floatingCard.offsetHeight / 2) + 'px';
            }
            const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
            slots.forEach(s => s.classList.remove('dragover'));
            if (targetElement && targetElement.closest('.experiment-slot')) {
                targetElement.closest('.experiment-slot').classList.add('dragover');
            }
        });

        slot.addEventListener('touchend', (e) => {
            e.preventDefault();
            slots.forEach(s => s.classList.remove('dragover'));
            if (!draggedItem) {
                if (floatingCard) {
                    floatingCard.remove();
                    floatingCard = null;
                }
                return;
            }
            const touch = e.changedTouches[0];
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            if (dropTarget && dropTarget.closest('.experiment-slot')) {
                const dropSlot = dropTarget.closest('.experiment-slot');
                const droppedCardId = draggedItem.id;
                const dropSlotIndex = slots.indexOf(dropSlot);
                handleDrop(droppedCardId, dropSlotIndex);
            }
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            if (floatingCard) {
                floatingCard.remove();
                floatingCard = null;
            }
        });
    });

    // Handles a card drop event
    function handleDrop(droppedCardId, slotIndex) {
        const droppedCard = document.getElementById(droppedCardId);
        if (!droppedCard) return;

        const droppedContainer = droppedCardsSlots[slotIndex];
        const existingCard = droppedContainer.querySelector(`[data-type="${droppedCard.dataset.type}"]`);
        
        if (existingCard) {
            existingCard.remove();
        }
        
        const clonedCard = droppedCard.cloneNode(true);
        clonedCard.removeAttribute('id'); // 避免多個相同 id 影響原卡片
        clonedCard.classList.remove('dragging');
        clonedCard.draggable = false;
        clonedCard.style.cursor = 'pointer';
        clonedCard.classList.add('w-24');

        clonedCard.addEventListener('click', () => {
            clonedCard.remove();
            updateSlotVariables(slotIndex);
            checkExperimentReadiness();
        });

        droppedContainer.appendChild(clonedCard);
        updateSlotVariables(slotIndex);
        checkExperimentReadiness();
    }

    // Handle start button click
    startButton.addEventListener('click', runSimulation);

    // Handle reset button click
    resetButton.addEventListener('click', () => {
        droppedCardsSlots.forEach(slot => {
            slot.innerHTML = '';
        });

        slots.forEach(slot => {
            slot.querySelector('.robot-visual-container').innerHTML = ''; // Clear SVG
        });

        robotA_anim.style.transitionDuration = '0s';
        robotB_anim.style.transitionDuration = '0s';
        robotA_anim.style.transform = 'translateX(0)';
        robotB_anim.style.transform = 'translateX(0)';
        
        robotVariables[0] = {};
        robotVariables[1] = {};

        resultsSection.classList.add('hidden');
        messageEl.textContent = '請將所有變因卡片拖曳到兩個實驗槽中。';
        messageEl.className = 'mt-4 font-semibold text-gray-700';
        
        startButton.disabled = true;

        experimentHistory.length = 0;
        renderHistory();
    });

    // Toggle history section visibility
    toggleHistoryButton.addEventListener('click', () => {
        const isHidden = historyContainer.classList.contains('hidden');
        if (isHidden) {
            historyContainer.classList.remove('hidden');
            toggleHistoryButton.textContent = '隱藏';
        } else {
            historyContainer.classList.add('hidden');
            toggleHistoryButton.textContent = '顯示';
        }
    });

    // Update variables and check for valid setup
    function updateSlotVariables(slotIndex) {
        const variables = {};
        droppedCardsSlots[slotIndex].querySelectorAll('.draggable-card').forEach(card => {
            variables[card.dataset.type] = card.dataset.value;
        });
        robotVariables[slotIndex] = variables;
        
        // Update the SVG visualization for the current slot
        updateRobotVisual(slotIndex);
    }
    
    // Check if all variables are selected and enable the start button
    function checkExperimentReadiness() {
        const [vars1, vars2] = [robotVariables[0], robotVariables[1]];
        const types = ['robot', 'package', 'conveyor', 'power', 'tires', 'color'];
        
        let populated = true;
        if (!vars1 || !vars2) {
            populated = false;
        } else {
            for (let type of types) {
                if (!vars1[type] || !vars2[type]) {
                    populated = false;
                    break;
                }
            }
        }
        
        if (populated) {
            startButton.disabled = false;
            messageEl.textContent = '實驗配置完成！請點擊「開始實驗」按鈕。';
        } else {
            startButton.disabled = true;
            messageEl.textContent = '請將所有變因卡片拖曳到兩個實驗槽中。';
        }
    }


    // Function to update the SVG visualization
    function updateRobotVisual(slotIndex) {
        const slot = slots[slotIndex];
        const variables = robotVariables[slotIndex] || {};
        const svgContainer = slot.querySelector('.robot-visual-container');

        if (!svgContainer) return;

        // 有機器人卡片時顯示完整機器人
        if (variables.robot === 'A' || variables.robot === 'B') {
            let combinedSVG = `<svg viewBox="0 0 100 100" class="robot-svg w-full h-full">`;
            // Draw base robot
            const robotBase = `<rect x="15" y="30" width="70" height="40" rx="10" ry="10" stroke="#4a5568" stroke-width="3" fill="${robotSVG.color[variables.color] || '#6b7280'}"/>`;
            const robotHead = `<circle cx="50" cy="25" r="10" fill="#4a5568"/>`;
            const robotAntenna = `<rect x="40" y="5" width="20" height="20" rx="5" ry="5" fill="#e2e8f0"/>`;
            const tiresSVG = variables.tires ? robotSVG.tires[variables.tires] : '';
            const packageSVG = variables.package ? robotSVG.package[variables.package] : '';
            const powerSVG = variables.power ? robotSVG.power[variables.power] : '';
            let robotLabel = `<text x="50" y="55" text-anchor="middle" alignment-baseline="middle" font-size="28" font-weight="bold" fill="#fff">${variables.robot}</text>`;
            combinedSVG += robotBase + robotHead + robotAntenna + tiresSVG + powerSVG + packageSVG + robotLabel + `</svg>`;
            svgContainer.innerHTML = combinedSVG;
        } else {
            // 非機器人狀態下，彈性組合多個圖示
            let hasAny = variables.package || variables.tires || variables.power;
            if (hasAny) {
                let combinedSVG = `<svg viewBox="0 0 100 100" class="robot-svg w-full h-full">`;
                if (variables.package) combinedSVG += robotSVG.package[variables.package];
                if (variables.tires) combinedSVG += robotSVG.tires[variables.tires];
                if (variables.power) combinedSVG += robotSVG.power[variables.power];
                // 其他變因可依需求加入
                combinedSVG += `</svg>`;
                svgContainer.innerHTML = combinedSVG;
            } else {
                svgContainer.innerHTML = '';
            }
        }
    }


    // Run the simulation
    function runSimulation() {
        // Clear old results before running a new simulation
        timeAEl.textContent = '';
        timeBEl.textContent = '';
        //analysisEl.textContent = '';

        messageEl.textContent = '實驗進行中...';
        resultsSection.classList.remove('hidden');

        const robots = [robotVariables[0], robotVariables[1]];
        const results = [];

        let completedCount = 0;

        robots.forEach((robot, index) => {
            let totalSpeed = baseSpeed;
            
            // Calculate total speed based on selected variables
            for (const type in speedModifiers) {
                const value = robot[type];
                if (value) {
                        totalSpeed += speedModifiers[type][value];
                }
            }
            
            // Prevent division by zero
            if (totalSpeed <= 0) totalSpeed = 1;

            const time = distance / totalSpeed;
            results.push({ robotId: index, time: time, vars: robot });
            
            // Animate the robot
            const robotAnimEl = index === 0 ? robotA_anim : robotB_anim;
            const pathEl = index === 0 ? document.getElementById('pathA') : document.getElementById('pathB');
            const travelDistance = pathEl.clientWidth - robotAnimEl.clientWidth;
            
            robotAnimEl.style.transform = `translateX(${travelDistance}px)`;
            robotAnimEl.style.transitionDuration = `${time}s`;
            
            // When the animation ends, log the result
            robotAnimEl.addEventListener('transitionend', () => {
                completedCount++;
                if (completedCount === 2) {
                    displayResults(results);
                }
            }, { once: true });
        });
    }

    // Display results and analysis
    function displayResults(results) {
        const [result1, result2] = results;
        
        timeAEl.textContent = `完成時間: ${result1.time.toFixed(2)} 秒`;
        timeBEl.textContent = `完成時間: ${result2.time.toFixed(2)} 秒`;
        
        // Reset animation properties for the next run
        robotA_anim.style.transitionDuration = '0s';
        robotB_anim.style.transitionDuration = '0s';
        robotA_anim.style.transform = 'translateX(0)';
        robotB_anim.style.transform = 'translateX(0)';

        const vars1 = result1.vars;
        const vars2 = result2.vars;
        const types = ['robot', 'package', 'conveyor', 'power', 'tires', 'color'];
        const diffVariable = types.find(type => vars1[type] !== vars2[type]);
        const diffCount = types.filter(type => vars1[type] !== vars2[type]).length;

        let analysisText = '';
        /*        
        if (diffCount === 1) {
            if (speedModifiers[diffVariable][vars1[diffVariable]] !== speedModifiers[diffVariable][vars2[diffVariable]]) {
                analysisText = `恭喜！你的實驗設計得很好。因為你只改變了**${variableNames[diffVariable]}**這個變因，所以我們可以確定速度的差異是由此造成的。`;
            } else {
                analysisText = `你改變了**${variableNames[diffVariable]}**這個變因，但結果顯示它對機器人的速度沒有影響。這提醒我們，並非所有變因都會影響實驗結果！`;
            }

        } else {
            analysisText = `你同時改變了多個變因，所以很難確定是哪個因素影響了結果。例如，雖然機器人A可能帶了較重的包裹，但如果它的傳送帶更快，最終時間可能反而更短。這就是為什麼科學實驗需要**單一變因控制**。`;
        }
        
        analysisEl.innerHTML = analysisText;
        */
        messageEl.textContent = '實驗完成！';
        startButton.disabled = true;

        // Save and display history
        saveAndDisplayHistory(result1, result2, analysisText);
    }

    function saveAndDisplayHistory(result1, result2, analysisText) {
        const historyItem = {
            config1: result1.vars,
            config2: result2.vars,
            time1: result1.time.toFixed(2),
            time2: result2.time.toFixed(2),
            analysis: analysisText,
            timestamp: new Date().toLocaleTimeString()
        };
        experimentHistory.push(historyItem);
        renderHistory();
    }

    function renderHistory() {
        console.log('Rendering history:', experimentHistory);
        historyList.innerHTML = ''; // Clear previous history
        if (experimentHistory.length === 0) {
            historyList.innerHTML = '<p class="text-center text-gray-500 mt-4">尚無歷史記錄。</p>';
            return;
        }

        experimentHistory.forEach((item, index) => {
            const historyCard = document.createElement('div');
            historyCard.className = 'bg-gray-50 p-4 rounded-lg shadow-sm border-2 border-gray-200';
            
            const timeDiff = parseFloat(item.time1) - parseFloat(item.time2);
            /*
            let config1Html = '';
            for (const type in item.config1) {
                config1Html += `<p class="text-sm"><span class="font-bold">${variableNames[type]}</span>: ${valueNames[item.config1[type]]}</p>`;
            }

            let config2Html = '';
            for (const type in item.config2) {
                config2Html += `<p class="text-sm"><span class="font-bold">${variableNames[type]}</span>: ${valueNames[item.config2[type]]}</p>`;
            }
            */
        let config1Html = '';
        for (const type in item.config1) {
            const value = item.config1[type];
            const name = valueNames[type] && valueNames[type][value] ? valueNames[type][value] : value;
            const typeName = variableNames[type] ? variableNames[type] : type;
            config1Html += `<p class="text-sm"><span class="font-bold">${typeName}</span>: ${name}</p>`;
        }

        let config2Html = '';
        for (const type in item.config2) {
            const value = item.config2[type];
            const name = valueNames[type] && valueNames[type][value] ? valueNames[type][value] : value;
            const typeName = variableNames[type] ? variableNames[type] : type;
            config2Html += `<p class="text-sm"><span class="font-bold">${typeName}</span>: ${name}</p>`;
        }

                        // 以表格方式呈現兩組變因
                        const types = ['robot', 'package', 'conveyor', 'power', 'tires', 'color'];
                        let tableRows = '';
                        for (const type of types) {
                                const value1 = item.config1[type] ? (valueNames[type] && valueNames[type][item.config1[type]] ? valueNames[type][item.config1[type]] : item.config1[type]) : '-';
                                const value2 = item.config2[type] ? (valueNames[type] && valueNames[type][item.config2[type]] ? valueNames[type][item.config2[type]] : item.config2[type]) : '-';
                                const typeName = variableNames[type] ? variableNames[type] : type;
                                // 若不同則標色
                                const diff = value1 !== value2 ? 'bg-yellow-100 font-bold' : '';
                                tableRows += `<tr><td class="border px-2 py-1">${typeName}</td><td class="border px-2 py-1 ${diff}">${value1}</td><td class="border px-2 py-1 ${diff}">${value2}</td></tr>`;
                        }
                        const summary = `
                                <p class="font-bold text-lg mb-2">實驗 #${index + 1} <span class="text-sm font-normal text-gray-500">(${item.timestamp})</span></p>
                                <p class="text-gray-700">結果：第一組花費 ${item.time1} 秒，第二組花費 ${item.time2} 秒。時間差：${timeDiff.toFixed(2)} 秒。</p>
                                <div class="overflow-x-auto mt-2">
                                    <table class="min-w-full border text-sm text-center bg-white">
                                        <thead><tr class="bg-gray-100"><th class="border px-2 py-1">變因</th><th class="border px-2 py-1">第一組</th><th class="border px-2 py-1">第二組</th></tr></thead>
                                        <tbody>${tableRows}</tbody>
                                    </table>
                                </div>
                                <!-- <p class="text-gray-700 mt-2">分析：${item.analysis}</p> -->
                        `;
            historyCard.innerHTML = summary;
            historyList.prepend(historyCard); // Add to the top of the list
        });
    }
});