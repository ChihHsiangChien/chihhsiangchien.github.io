/**
 * Ecosystem Energy Pyramid & 10% Transfer Law Simulation
 * Interactive educational module for Taiwanese secondary biology curriculum.
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. Web Audio API Sound Synthesizer
    // -------------------------------------------------------------------------
    let audioCtx = null;
    let soundEnabled = true;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playTone(freq, type, duration, delay = 0, gainLevel = 0.15) {
        if (!soundEnabled) return;
        try {
            initAudio();
            if (!audioCtx) return;
            const now = audioCtx.currentTime + delay;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(gainLevel, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.warn('Audio playback not supported:', e);
        }
    }

    function playChime() {
        // Ascending two-tone chime for correct placement
        playTone(587.33, 'sine', 0.18, 0, 0.2); // D5
        playTone(880.00, 'sine', 0.35, 0.15, 0.25); // A5
    }

    function playBuzz() {
        // Low double buzz for incorrect placement
        playTone(180, 'sawtooth', 0.12, 0, 0.2);
        playTone(130, 'sawtooth', 0.2, 0.1, 0.25);
    }

    function playFanfare() {
        // Triumphant arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((f, idx) => {
            playTone(f, 'triangle', 0.25, idx * 0.1, 0.25);
        });
    }

    // -------------------------------------------------------------------------
    // 2. Toast Notifications
    // -------------------------------------------------------------------------
    const toastBox = document.getElementById('toastBox');

    function showToast(message, type = 'info') {
        if (!toastBox) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastBox.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // -------------------------------------------------------------------------
    // 3. Tab Switcher
    // -------------------------------------------------------------------------
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabSections = document.querySelectorAll('.tab-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabSections.forEach(s => s.classList.remove('active-section'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetSec = document.getElementById(targetId);
            if (targetSec) {
                targetSec.classList.add('active-section');
            }
        });
    });

    // Sound toggle
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundToggleBtn.textContent = soundEnabled ? '🔊 音效: 開' : '🔇 音效: 關';
            soundToggleBtn.style.opacity = soundEnabled ? '1' : '0.6';
            if (soundEnabled) {
                initAudio();
                playTone(440, 'sine', 0.1);
            }
        });
    }

    // -------------------------------------------------------------------------
    // 4. Fallback Card Data (In case data/cards.json fetch fails offline)
    // -------------------------------------------------------------------------
    const defaultCards = [
        { id: "c1", name: "水稻", tier: "producers", tierName: "生產者", icon: "🌾", role: "生產者", description: "行光合作用製造有機養分，為農田濕地基礎能量來源" },
        { id: "c2", name: "台灣水韭", tier: "producers", tierName: "生產者", icon: "🌿", role: "生產者", description: "台灣特有種挺水植物，行光合作用自營製造養分" },
        { id: "c3", name: "綠藻", tier: "producers", tierName: "生產者", icon: "🟢", role: "生產者", description: "水生自營單細胞微藻，吸收陽光行光合作用" },
        { id: "c4", name: "浮萍", tier: "producers", tierName: "生產者", icon: "🍃", role: "生產者", description: "漂浮水生植物，高繁殖力，提供水生生態初級能量" },
        { id: "c5", name: "蝗蟲", tier: "primary", tierName: "初級消費者", icon: "🦗", role: "初級消費者（草食性）", description: "以水稻與禾本科植物葉片為食" },
        { id: "c6", name: "紋白蝶幼蟲", tier: "primary", tierName: "初級消費者", icon: "🐛", role: "初級消費者（草食性）", description: "咀嚼十字花科與綠色嫩葉，攝取植物能量" },
        { id: "c7", name: "蝌蚪", tier: "primary", tierName: "初級消費者", icon: "🫧", role: "初級消費者（藻食性）", description: "在水中刮食綠藻與水生植物有機碎屑" },
        { id: "c8", name: "梅花鹿", tier: "primary", tierName: "初級消費者", icon: "🦌", role: "初級消費者（草食性）", description: "草食性哺乳動物，以樹葉嫩芽為主食" },
        { id: "c9", name: "赤蛙", tier: "secondary", tierName: "次級消費者", icon: "🐸", role: "次級消費者（肉食性）", description: "以蝗蟲、蚊蠅等草食性初級昆蟲為食" },
        { id: "c10", name: "水蠆", tier: "secondary", tierName: "次級消費者", icon: "🪲", role: "次級消費者（肉食性）", description: "蜻蜓幼蟲，水棲肉食性掠食者，捕食蝌蚪" },
        { id: "c11", name: "螳螂", tier: "secondary", tierName: "次級消費者", icon: "🦗", role: "次級消費者（肉食性）", description: "具捕捉前足，伏擊捕食蝗蟲與蝴蝶" },
        { id: "c12", name: "攀木蜥蜴", tier: "secondary", tierName: "次級消費者", icon: "🦎", role: "次級消費者（肉食性）", description: "樹棲爬蟲類，捕食各類中小型草食性昆蟲" },
        { id: "c13", name: "熊鷹", tier: "tertiary", tierName: "三級/頂級消費者", icon: "🦅", role: "三級/頂級消費者", description: "台灣森林頂級猛禽，獵食小型哺乳類、鳥類與蛇" },
        { id: "c14", name: "石虎", tier: "tertiary", tierName: "三級/頂級消費者", icon: "🐆", role: "三級/頂級消費者", description: "台灣原生肉食性貓科動物，捕食赤蛙與鼠類" },
        { id: "c15", name: "台灣眼鏡蛇", tier: "tertiary", tierName: "三級/頂級消費者", icon: "🐍", role: "三級/頂級消費者", description: "肉食性爬蟲類，捕食赤蛙、蜥蜴與鳥類" },
        { id: "c16", name: "斑龜", tier: "tertiary", tierName: "三級/頂級消費者", icon: "🐢", role: "三級/頂級消費者", description: "淡水水域高階肉食/雜食性掠食者，捕食水蠆與蛙類" }
    ];

    let allCards = [];
    let selectedCard = null;
    let placedCardsCount = 0;

    const cardsPoolEl = document.getElementById('cardsPool');
    const placedCountEl = document.getElementById('placedCount');
    const totalCardsCountEl = document.getElementById('totalCardsCount');
    const selectedCardTipEl = document.getElementById('selectedCardTip');
    const pyramidTiers = document.querySelectorAll('.pyramid-tier');

    // -------------------------------------------------------------------------
    // 5. Initialize Game & Card Rendering
    // -------------------------------------------------------------------------
    async function loadCards() {
        try {
            const resp = await fetch('data/cards.json');
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) {
                    allCards = data;
                } else {
                    allCards = defaultCards;
                }
            } else {
                allCards = defaultCards;
            }
        } catch (e) {
            allCards = defaultCards;
        }

        renderCardsPool();
    }

    function renderCardsPool() {
        if (!cardsPoolEl) return;
        cardsPoolEl.innerHTML = '';
        selectedCard = null;
        updateSelectedCardTip();

        // Clear all dropzones
        document.querySelectorAll('.tier-dropzone').forEach(dz => {
            dz.innerHTML = '<div class="drop-hint">拖曳或點選卡牌放置於此</div>';
        });

        // Shuffle cards
        const shuffled = [...allCards].sort(() => Math.random() - 0.5);
        placedCardsCount = 0;
        updateScore();

        shuffled.forEach(card => {
            const cardEl = createCardElement(card);
            cardsPoolEl.appendChild(cardEl);
        });
    }

    function createCardElement(card) {
        const div = document.createElement('div');
        div.className = 'organism-card';
        div.setAttribute('draggable', 'true');
        div.dataset.id = card.id;
        div.dataset.tier = card.tier;

        div.innerHTML = `
            <div class="card-top">
                <span class="card-icon">${card.icon}</span>
                <span class="card-name">${card.name}</span>
            </div>
            <div class="card-role">${card.role || card.tierName}</div>
            <div class="card-desc">${card.description || ''}</div>
        `;

        // Tap-to-select support (Mobile-friendly)
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            if (div.classList.contains('placed')) return;
            initAudio();

            if (selectedCard === div) {
                // Deselect
                div.classList.remove('selected');
                selectedCard = null;
                pyramidTiers.forEach(t => t.classList.remove('target-ready'));
            } else {
                if (selectedCard) selectedCard.classList.remove('selected');
                selectedCard = div;
                div.classList.add('selected');
                pyramidTiers.forEach(t => t.classList.add('target-ready'));
            }
            updateSelectedCardTip();
        });

        // Drag and Drop support
        div.addEventListener('dragstart', (e) => {
            if (div.classList.contains('placed')) return;
            initAudio();
            e.dataTransfer.setData('text/plain', card.id);
            div.classList.add('selected');
            selectedCard = div;
            updateSelectedCardTip();
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('selected');
            pyramidTiers.forEach(t => t.classList.remove('drag-over', 'target-ready'));
        });

        return div;
    }

    function updateSelectedCardTip() {
        if (!selectedCardTipEl) return;
        if (selectedCard) {
            const cardName = selectedCard.querySelector('.card-name')?.textContent || '卡牌';
            selectedCardTipEl.textContent = `已選取:「${cardName}」請點選目標金字塔階層！`;
            selectedCardTipEl.style.color = '#e65100';
        } else {
            selectedCardTipEl.textContent = '尚未選取卡牌（可點擊或拖曳）';
            selectedCardTipEl.style.color = '#78909c';
        }
    }

    function updateScore() {
        if (placedCountEl) placedCountEl.textContent = placedCardsCount;
        if (totalCardsCountEl) totalCardsCountEl.textContent = allCards.length;

        // Legacy compatibility sync
        const legacyProducers = document.querySelectorAll('#dropzone-producers .organism-card').length;
        const legacyPrimary = document.querySelectorAll('#dropzone-primary .organism-card').length;
        const legacySecondary = document.querySelectorAll('#dropzone-secondary .organism-card').length;
        const legacyTertiary = document.querySelectorAll('#dropzone-tertiary .organism-card').length;

        const pEl = document.getElementById('producersCount');
        const priEl = document.getElementById('primaryConsumersCount');
        const secEl = document.getElementById('secondaryConsumersCount');
        const terEl = document.getElementById('tertiaryConsumersCount');

        if (pEl) pEl.textContent = legacyProducers;
        if (priEl) priEl.textContent = legacyPrimary;
        if (secEl) secEl.textContent = legacySecondary;
        if (terEl) terEl.textContent = legacyTertiary;
    }

    // -------------------------------------------------------------------------
    // 6. Placement Logic (Drag & Drop + Tap-to-Place)
    // -------------------------------------------------------------------------
    pyramidTiers.forEach(tierEl => {
        const tierType = tierEl.dataset.tier;
        const dropzone = tierEl.querySelector('.tier-dropzone');

        // Drag over
        tierEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            tierEl.classList.add('drag-over');
        });

        tierEl.addEventListener('dragleave', () => {
            tierEl.classList.remove('drag-over');
        });

        // Drop
        tierEl.addEventListener('drop', (e) => {
            e.preventDefault();
            tierEl.classList.remove('drag-over');
            const cardId = e.dataTransfer.getData('text/plain');
            const cardEl = document.querySelector(`.organism-card[data-id="${cardId}"]`);
            if (cardEl) {
                handleCardPlacement(cardEl, tierType, dropzone, tierEl);
            }
        });

        // Tap-to-place on tier
        tierEl.addEventListener('click', () => {
            if (selectedCard && !selectedCard.classList.contains('placed')) {
                handleCardPlacement(selectedCard, tierType, dropzone, tierEl);
            }
        });
    });

    function handleCardPlacement(cardEl, targetTier, dropzone, tierEl) {
        const cardTier = cardEl.dataset.tier;
        const cardName = cardEl.querySelector('.card-name')?.textContent || '卡牌';

        if (cardTier === targetTier) {
            // Correct placement
            playChime();
            cardEl.classList.remove('selected', 'animate-incorrect');
            cardEl.classList.add('placed', 'animate-correct');
            cardEl.setAttribute('draggable', 'false');

            // Remove hint if present
            const hint = dropzone.querySelector('.drop-hint');
            if (hint) hint.remove();

            dropzone.appendChild(cardEl);
            placedCardsCount++;
            updateScore();

            tierEl.classList.remove('target-ready');
            tierEl.classList.add('animate-correct');
            setTimeout(() => tierEl.classList.remove('animate-correct'), 600);

            showToast(`✅ 正確！「${cardName}」放置成功！`, 'success');
            selectedCard = null;
            updateSelectedCardTip();
            pyramidTiers.forEach(t => t.classList.remove('target-ready'));

            // Check completion
            if (placedCardsCount === allCards.length) {
                setTimeout(() => {
                    playFanfare();
                    showToast('🎉 太棒了！你已成功完成所有營養階層卡牌放置挑戰！', 'success');
                }, 400);
            }
        } else {
            // Incorrect placement
            playBuzz();
            cardEl.classList.add('animate-incorrect');
            setTimeout(() => cardEl.classList.remove('animate-incorrect'), 600);

            const tierNames = {
                producers: '生產者',
                primary: '初級消費者',
                secondary: '次級消費者',
                tertiary: '三級/頂級消費者'
            };
            const correctTierName = tierNames[cardTier] || cardTier;
            const targetTierName = tierNames[targetTier] || targetTier;

            showToast(`❌ 「${cardName}」屬於【${correctTierName}】，不是【${targetTierName}】喔！`, 'error');
        }
    }

    // Reset button
    const resetGameBtn = document.getElementById('resetGameBtn');
    if (resetGameBtn) {
        resetGameBtn.addEventListener('click', () => {
            initAudio();
            renderCardsPool();
            showToast('🔄 挑戰已重設，卡牌已重新洗牌！', 'info');
        });
    }

    // Auto hint button
    const autoHintBtn = document.getElementById('autoHintBtn');
    if (autoHintBtn) {
        autoHintBtn.addEventListener('click', () => {
            initAudio();
            const unplaced = Array.from(document.querySelectorAll('#cardsPool .organism-card:not(.placed)'));
            if (unplaced.length === 0) {
                showToast('💡 所有卡牌均已就位！', 'info');
                return;
            }
            const card = unplaced[0];
            const cardTier = card.dataset.tier;
            const cardName = card.querySelector('.card-name')?.textContent || '';
            const targetTierEl = document.getElementById(`tier-${cardTier}`);

            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            card.classList.add('selected');
            selectedCard = card;
            updateSelectedCardTip();

            if (targetTierEl) {
                targetTierEl.classList.add('target-ready');
                setTimeout(() => targetTierEl.classList.remove('target-ready'), 2000);
            }

            const tierNames = {
                producers: '生產者（最底層）',
                primary: '初級消費者（第2階）',
                secondary: '次級消費者（第3階）',
                tertiary: '三級消費者（頂層）'
            };
            showToast(`💡 提示：「${cardName}」屬於【${tierNames[cardTier]}】`, 'info');
        });
    }

    // -------------------------------------------------------------------------
    // 7. Dynamic 10% Energy Transfer Law Calculator
    // -------------------------------------------------------------------------
    const baseEnergyInput = document.getElementById('baseEnergyInput');
    const baseEnergySlider = document.getElementById('baseEnergySlider');
    const efficiencyInput = document.getElementById('efficiencyInput');
    const effDisplay = document.getElementById('effDisplay');
    const unitSelect = document.getElementById('unitSelect');

    // Values to update
    const valProducers = document.getElementById('val-producers');
    const valPrimary = document.getElementById('val-primary');
    const valSecondary = document.getElementById('val-secondary');
    const valTertiary = document.getElementById('val-tertiary');

    // Losses to update
    const lossPrimary = document.getElementById('loss-primary');
    const lossSecondary = document.getElementById('loss-secondary');
    const lossTertiary = document.getElementById('loss-tertiary');

    // Visual bars
    const barProducers = document.getElementById('bar-producers');
    const barPrimary = document.getElementById('bar-primary');
    const barSecondary = document.getElementById('bar-secondary');
    const barTertiary = document.getElementById('bar-tertiary');

    // Table elements
    const tableValProducers = document.getElementById('table-val-producers');
    const tableTransPrimary = document.getElementById('table-trans-primary');
    const tableLossPrimary = document.getElementById('table-loss-primary');

    const tableValPrimary = document.getElementById('table-val-primary');
    const tableTransSecondary = document.getElementById('table-trans-secondary');
    const tableLossSecondary = document.getElementById('table-loss-secondary');

    const tableValSecondary = document.getElementById('table-val-secondary');
    const tableTransTertiary = document.getElementById('table-trans-tertiary');
    const tableLossTertiary = document.getElementById('table-loss-tertiary');

    const tableValTertiary = document.getElementById('table-val-tertiary');
    const tableTransApex = document.getElementById('table-trans-apex');
    const tableLossApex = document.getElementById('table-loss-apex');

    // Summary stats
    const apexRemainingPercentEl = document.getElementById('apexRemainingPercent');
    const totalHeatLostValEl = document.getElementById('totalHeatLostVal');
    const totalLostPercentEl = document.getElementById('totalLostPercent');

    function formatNumber(num) {
        if (num >= 1000) {
            return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
        } else if (num >= 1) {
            return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
        } else {
            return num.toFixed(3);
        }
    }

    function calculateEnergy() {
        if (!baseEnergyInput) return;

        let baseEnergy = parseFloat(baseEnergyInput.value);
        if (isNaN(baseEnergy) || baseEnergy < 0) baseEnergy = 10000;

        const effPercent = efficiencyInput ? parseFloat(efficiencyInput.value) : 10;
        const eta = effPercent / 100;
        const unit = unitSelect ? unitSelect.value : 'J';

        if (effDisplay) {
            effDisplay.textContent = `${effPercent}%`;
        }

        // Trophic assimilation calculations
        const e0 = baseEnergy; // Producers
        const e1 = e0 * eta;   // Primary
        const e2 = e1 * eta;   // Secondary
        const e3 = e2 * eta;   // Tertiary
        const eApex = e3 * eta; // Remains beyond apex

        // Heat loss calculations
        const l1 = e0 * (1 - eta); // Loss from producers to primary
        const l2 = e1 * (1 - eta); // Loss from primary to secondary
        const l3 = e2 * (1 - eta); // Loss from secondary to tertiary
        const lApex = e3 * (1 - eta);

        const totalLost = l1 + l2 + l3 + lApex;
        const apexPercent = (e3 / e0) * 100;
        const lostPercent = ((e0 - e3) / e0) * 100;

        // Update DOM values
        if (valProducers) valProducers.textContent = `${formatNumber(e0)} ${unit}`;
        if (valPrimary) valPrimary.textContent = `${formatNumber(e1)} ${unit}`;
        if (valSecondary) valSecondary.textContent = `${formatNumber(e2)} ${unit}`;
        if (valTertiary) valTertiary.textContent = `${formatNumber(e3)} ${unit}`;

        if (lossPrimary) lossPrimary.textContent = `${formatNumber(l1)} ${unit}`;
        if (lossSecondary) lossSecondary.textContent = `${formatNumber(l2)} ${unit}`;
        if (lossTertiary) lossTertiary.textContent = `${formatNumber(l3)} ${unit}`;

        // Table updates
        if (tableValProducers) tableValProducers.textContent = `${formatNumber(e0)} ${unit} (100%)`;
        if (tableTransPrimary) tableTransPrimary.textContent = `${formatNumber(e1)} ${unit}`;
        if (tableLossPrimary) tableLossPrimary.textContent = `${formatNumber(l1)} ${unit} (${(100 - effPercent)}%)`;

        if (tableValPrimary) tableValPrimary.textContent = `${formatNumber(e1)} ${unit} (${effPercent}%)`;
        if (tableTransSecondary) tableTransSecondary.textContent = `${formatNumber(e2)} ${unit}`;
        if (tableLossSecondary) tableLossSecondary.textContent = `${formatNumber(l2)} ${unit} (${((100 - effPercent) * eta).toFixed(2)}%)`;

        if (tableValSecondary) tableValSecondary.textContent = `${formatNumber(e2)} ${unit} (${(effPercent * eta).toFixed(2)}%)`;
        if (tableTransTertiary) tableTransTertiary.textContent = `${formatNumber(e3)} ${unit}`;
        if (tableLossTertiary) tableLossTertiary.textContent = `${formatNumber(l3)} ${unit} (${((100 - effPercent) * eta * eta).toFixed(3)}%)`;

        if (tableValTertiary) tableValTertiary.textContent = `${formatNumber(e3)} ${unit} (${(effPercent * eta * eta).toFixed(3)}%)`;
        if (tableTransApex) tableTransApex.textContent = `${formatNumber(eApex)} ${unit}`;
        if (tableLossApex) tableLossApex.textContent = `${formatNumber(lApex)} ${unit} (${((100 - effPercent) * eta * eta * eta).toFixed(4)}%)`;

        // Summary stats
        if (apexRemainingPercentEl) apexRemainingPercentEl.textContent = `${apexPercent.toFixed(3)}%`;
        if (totalHeatLostValEl) totalHeatLostValEl.textContent = `${formatNumber(totalLost)} ${unit}`;
        if (totalLostPercentEl) totalLostPercentEl.textContent = `${lostPercent.toFixed(2)}%`;

        // Update graphic bars (using power scale to preserve visual perception while maintaining hierarchy)
        // Level 0 is 100%, each step drops by eta
        if (barProducers) barProducers.style.width = '100%';
        if (barPrimary) barPrimary.style.width = `${Math.max(12, Math.min(85, Math.pow(eta, 0.45) * 100))}%`;
        if (barSecondary) barSecondary.style.width = `${Math.max(8, Math.min(65, Math.pow(eta * eta, 0.45) * 100))}%`;
        if (barTertiary) barTertiary.style.width = `${Math.max(5, Math.min(45, Math.pow(eta * eta * eta, 0.45) * 100))}%`;

        // Sync legacy inputs
        const legP = document.getElementById('producersInput');
        const legPri = document.getElementById('primaryConsumersInput');
        const legSec = document.getElementById('secondaryConsumersInput');
        const legTer = document.getElementById('tertiaryConsumersInput');
        if (legP) legP.value = Math.round(e0);
        if (legPri) legPri.value = Math.round(e1);
        if (legSec) legSec.value = Math.round(e2);
        if (legTer) legTer.value = Math.round(e3);
    }

    if (baseEnergyInput && baseEnergySlider) {
        baseEnergyInput.addEventListener('input', () => {
            baseEnergySlider.value = baseEnergyInput.value;
            calculateEnergy();
        });

        baseEnergySlider.addEventListener('input', () => {
            baseEnergyInput.value = baseEnergySlider.value;
            calculateEnergy();
        });
    }

    if (efficiencyInput) {
        efficiencyInput.addEventListener('input', calculateEnergy);
    }

    if (unitSelect) {
        unitSelect.addEventListener('change', calculateEnergy);
    }

    // -------------------------------------------------------------------------
    // 8. Backward Compatibility: updateTower & Global Methods
    // -------------------------------------------------------------------------
    window.updateTower = function () {
        calculateEnergy();
        const baseEnergy = parseFloat(baseEnergyInput?.value || 10000);
        showToast(`⚡ 能量塔數值已更新！基底能量：${baseEnergy} J`, 'info');
    };

    // User gesture listener to unlock Web Audio API seamlessly
    document.addEventListener('click', function initOnce() {
        initAudio();
        document.removeEventListener('click', initOnce);
    }, { once: true });

    // Bootstrapping
    loadCards();
    calculateEnergy();

})();
